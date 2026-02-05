"""
Database Module
จัดการการเชื่อมต่อและ query ฐานข้อมูล
"""

import mysql.connector
import numpy as np
from config.settings import DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME


def get_conn():
    """สร้าง connection ไปยัง MySQL database"""
    return mysql.connector.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME
    )


def init_db():
    """สร้างตารางถ้ายังไม่มี"""
    conn = get_conn()
    cur = conn.cursor()
    
    # ตาราง users - เก็บข้อมูล user
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # ตาราง face_embeddings - เก็บ embedding หลายรูปต่อ user
    cur.execute("""
        CREATE TABLE IF NOT EXISTS face_embeddings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            embedding BLOB NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    
    # ตาราง attendance - เก็บ check-in/check-out
    cur.execute("""
        CREATE TABLE IF NOT EXISTS attendance (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            action ENUM('check_in', 'check_out') NOT NULL,
            similarity_score FLOAT NOT NULL,
            time_period VARCHAR(20) DEFAULT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    
    # เพิ่ม column time_period ถ้ายังไม่มี (สำหรับ database เก่า)
    try:
        cur.execute("""
            ALTER TABLE attendance ADD COLUMN time_period VARCHAR(20) DEFAULT NULL
        """)
    except:
        pass  # column มีอยู่แล้ว
    
    conn.commit()
    cur.close()
    conn.close()


def save_user(username: str, embedding: np.ndarray):
    """
    บันทึก user และ face embedding ลง database
    ถ้า user มีอยู่แล้ว จะเพิ่ม embedding ใหม่
    ถ้า user ยังไม่มี จะสร้าง user ใหม่พร้อม embedding
    """
    emb_blob = embedding.astype(np.float32).tobytes()

    conn = get_conn()
    cur = conn.cursor()

    # ตรวจสอบว่า user มีอยู่แล้วหรือไม่
    cur.execute("SELECT id FROM users WHERE username = %s", (username,))
    row = cur.fetchone()
    
    if row is None:
        # สร้าง user ใหม่
        cur.execute("INSERT INTO users (username) VALUES (%s)", (username,))
        user_id = cur.lastrowid
    else:
        user_id = row[0]
    
    # เพิ่ม embedding ใหม่
    cur.execute(
        "INSERT INTO face_embeddings (user_id, embedding) VALUES (%s, %s)",
        (user_id, emb_blob)
    )

    conn.commit()
    cur.close()
    conn.close()
    
    return user_id


def get_user_embedding_count(username: str) -> int:
    """นับจำนวน embedding ของ user"""
    conn = get_conn()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT COUNT(*) FROM face_embeddings fe
        JOIN users u ON fe.user_id = u.id
        WHERE u.username = %s
    """, (username,))
    
    count = cur.fetchone()[0]
    cur.close()
    conn.close()
    
    return count


def load_all_users():
    """โหลด users ทั้งหมดพร้อม embeddings"""
    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""
        SELECT u.username, fe.embedding 
        FROM users u
        JOIN face_embeddings fe ON u.id = fe.user_id
    """)

    users = []
    for username, emb_blob in cur.fetchall():
        emb = np.frombuffer(emb_blob, dtype=np.float32)
        users.append((username, emb))

    cur.close()
    conn.close()
    return users


def get_user_embeddings(username: str):
    """ดึง embeddings ทั้งหมดของ user ที่ระบุ (return list)"""
    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""
        SELECT fe.embedding FROM face_embeddings fe
        JOIN users u ON fe.user_id = u.id
        WHERE u.username = %s
    """, (username,))

    embeddings = []
    for (emb_blob,) in cur.fetchall():
        emb = np.frombuffer(emb_blob, dtype=np.float32)
        embeddings.append(emb)

    cur.close()
    conn.close()

    return embeddings if embeddings else None


def get_user_embedding(username: str):
    """ดึง embedding ของ user ที่ระบุ (return ค่าเฉลี่ยของทุก embedding)"""
    embeddings = get_user_embeddings(username)
    
    if embeddings is None or len(embeddings) == 0:
        return None
    
    # คำนวณค่าเฉลี่ยของ embeddings แล้ว normalize
    avg_embedding = np.mean(embeddings, axis=0)
    avg_embedding = avg_embedding / np.linalg.norm(avg_embedding)
    
    return avg_embedding


def get_time_period(hour: int) -> tuple:
    """
    คำนวณช่วงเวลาจากชั่วโมง
    
    Returns:
        tuple: (period_key, period_thai)
    """
    if 6 <= hour < 12:
        return "morning", "เช้า"
    elif 12 <= hour < 13:
        return "noon", "กลางวัน"
    elif 13 <= hour < 18:
        return "afternoon", "บ่าย"
    else:
        return "evening", "เย็น/ค่ำ"


def record_attendance(username: str, action: str, similarity_score: float):
    """
    บันทึก check-in/check-out ลง database
    
    Args:
        username: ชื่อผู้ใช้
        action: 'check_in' หรือ 'check_out'
        similarity_score: ค่าความเหมือน (0-1)
    
    Returns:
        dict: ข้อมูลการบันทึก
    """
    conn = get_conn()
    cur = conn.cursor()
    
    # หา user_id
    cur.execute("SELECT id FROM users WHERE username = %s", (username,))
    row = cur.fetchone()
    
    if row is None:
        cur.close()
        conn.close()
        return None
    
    user_id = row[0]
    
    # บันทึก attendance
    cur.execute(
        "INSERT INTO attendance (user_id, action, similarity_score) VALUES (%s, %s, %s)",
        (user_id, action, similarity_score)
    )
    
    attendance_id = cur.lastrowid
    
    # ดึงเวลาที่บันทึก
    cur.execute("SELECT timestamp FROM attendance WHERE id = %s", (attendance_id,))
    timestamp = cur.fetchone()[0]
    
    # คำนวณช่วงเวลา
    period_key, period_thai = get_time_period(timestamp.hour)
    
    # อัพเดท time_period
    cur.execute(
        "UPDATE attendance SET time_period = %s WHERE id = %s",
        (period_key, attendance_id)
    )
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        "username": username,
        "action": action,
        "similarity_score": similarity_score,
        "timestamp": timestamp,
        "time_period": period_key,
        "time_period_thai": period_thai
    }


def get_last_attendance(username: str):
    """ดึงข้อมูล attendance ล่าสุดของ user"""
    conn = get_conn()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT a.action, a.timestamp FROM attendance a
        JOIN users u ON a.user_id = u.id
        WHERE u.username = %s
        ORDER BY a.timestamp DESC
        LIMIT 1
    """, (username,))
    
    row = cur.fetchone()
    cur.close()
    conn.close()
    
    if row:
        return {"action": row[0], "timestamp": row[1]}
    return None
