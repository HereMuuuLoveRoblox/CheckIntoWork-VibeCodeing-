"""
Face User Services
บริการจัดการ user และการยืนยันตัวตน
"""

import numpy as np
from core import face_to_embedding, save_user, get_user_embedding
from core.database import load_all_users
from config.settings import VERIFY_THRESHOLD


def register_user(username: str, face_img):
    """ลงทะเบียน user ใหม่"""
    embedding = face_to_embedding(face_img)
    save_user(username, embedding)
    

def cosine_similarity(a, b):
    """คำนวณ cosine similarity ระหว่าง 2 vectors"""
    return float(np.dot(a, b))


def recognize_face(face_img, threshold=None):
    """
    ค้นหาว่ารูปหน้านี้เป็นใคร (เทียบกับทุก user ในระบบ)
    
    Args:
        face_img: รูปหน้า (numpy array)
        threshold: ค่า threshold สำหรับการยืนยัน (default จาก settings)
    
    Returns:
        tuple: (username, similarity_score) หรือ (None, None) ถ้าไม่พบ
    """
    if threshold is None:
        threshold = VERIFY_THRESHOLD
    
    # สร้าง embedding จากรูปที่ส่งมา
    input_emb = face_to_embedding(face_img)
    
    # โหลด users ทั้งหมด
    users = load_all_users()
    
    if not users:
        return None, None
    
    # หา user ที่ match มากที่สุด
    best_match = None
    best_score = -1
    
    # Group embeddings by username และหาค่าเฉลี่ย
    user_embeddings = {}
    for username, emb in users:
        if username not in user_embeddings:
            user_embeddings[username] = []
        user_embeddings[username].append(emb)
    
    for username, embeddings in user_embeddings.items():
        # คำนวณค่าเฉลี่ยของ embeddings
        avg_emb = np.mean(embeddings, axis=0)
        avg_emb = avg_emb / np.linalg.norm(avg_emb)
        
        score = cosine_similarity(input_emb, avg_emb)
        
        if score > best_score:
            best_score = score
            best_match = username
    
    # ตรวจสอบว่าผ่าน threshold หรือไม่
    if best_score >= threshold:
        return best_match, best_score
    
    return None, best_score


def verify_user(username: str, face_img, threshold=None):
    """
    ยืนยันตัวตนของ user ด้วยรูปหน้า
    
    Args:
        username: ชื่อ user ที่ต้องการยืนยัน
        face_img: รูปหน้า (numpy array)
        threshold: ค่า threshold สำหรับการยืนยัน (default จาก settings)
    
    Returns:
        tuple: (is_verified, similarity_score)
    """
    if threshold is None:
        threshold = VERIFY_THRESHOLD
        
    # 1. ดึง embedding จาก DB ของ user คนนี้
    db_emb = get_user_embedding(username)

    if db_emb is None:
        # ไม่พบ user
        return False, None

    # 2. สร้าง embedding จากรูปที่ส่งมา
    input_emb = face_to_embedding(face_img)

    # 3. เปรียบเทียบ
    score = cosine_similarity(input_emb, db_emb)

    # 4. ตัดสินใจ
    return score >= threshold, score