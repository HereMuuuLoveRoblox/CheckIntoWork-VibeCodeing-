# Face Recognition API

ระบบ API สำหรับจดจำใบหน้า (Face Recognition)

## 📁 โครงสร้างโปรเจกต์

```
Back-End/
├── server.py              # Entry point - FastAPI app
├── config/
│   └── settings.py        # Configuration ทั้งหมด
├── core/
│   ├── database.py        # Database operations
│   └── face_embedding.py  # Face embedding model
├── routers/
│   └── face.py            # Face recognition endpoints
├── services/
│   ├── face_user.py       # User verification logic
│   └── utils.py           # Utility functions
├── scripts/
│   └── face_crop.py       # Face cropping utility
├── models/                # AI models
│   ├── det_500m.onnx
│   └── w600k_mbf.onnx
└── faces/                 # Output directory
```

## 🚀 การรัน

```bash
# รัน server
uvicorn server:app --reload

# หรือ
python -m uvicorn server:app --reload
```

Server จะรันที่: http://localhost:8000

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | หน้าแรก |
| GET | `/health` | Health check |
| GET | `/docs` | Swagger UI Documentation |
| POST | `/face/embedding` | สร้าง face embedding จากรูป |
| POST | `/face/register` | ลงทะเบียน user ใหม่ |
| POST | `/face/verify` | ยืนยันตัวตน |

---

## 📖 API Documentation

### 1. GET `/`
หน้าแรกของ API

**Response:**
```json
{
    "message": "Face Recognition API",
    "docs": "/docs"
}
```

---

### 2. GET `/health`
ตรวจสอบสถานะ server

**Response:**
```json
{
    "status": "healthy"
}
```

---

### 3. POST `/face/embedding`
สร้าง face embedding vector จากรูปภาพ

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  | Field | Type | Required | Description |
  |-------|------|----------|-------------|
  | `file` | File | ✅ | ไฟล์รูปภาพ (jpg, png) |

**Example (cURL):**
```bash
curl -X POST "http://localhost:8000/face/embedding" \
  -F "file=@face.jpg"
```

**Response:**
```json
{
    "embedding": [0.0123, -0.0456, 0.0789, ...],
    "dim": 512
}
```

| Field | Type | Description |
|-------|------|-------------|
| `embedding` | array | Face embedding vector (512 ค่า) |
| `dim` | int | มิติของ embedding (512) |

---

### 4. POST `/face/register`
ลงทะเบียน user ใหม่ด้วยรูปหน้า

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  | Field | Type | Required | Description |
  |-------|------|----------|-------------|
  | `username` | string | ✅ | ชื่อ user |
  | `file` | File | ✅ | ไฟล์รูปหน้า |

**Example (cURL):**
```bash
curl -X POST "http://localhost:8000/face/register" \
  -F "username=john" \
  -F "file=@john_face.jpg"
```

**Response:**
```json
{
    "status": "registered",
    "username": "john"
}
```

---

### 5. POST `/face/verify`
ยืนยันตัวตนด้วยรูปหน้า

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  | Field | Type | Required | Description |
  |-------|------|----------|-------------|
  | `username` | string | ✅ | ชื่อ user ที่ต้องการยืนยัน |
  | `file` | File | ✅ | ไฟล์รูปหน้าที่ต้องการตรวจสอบ |

**Example (cURL):**
```bash
curl -X POST "http://localhost:8000/face/verify" \
  -F "username=john" \
  -F "file=@verify_face.jpg"
```

**Response (สำเร็จ):**
```json
{
    "verified": true,
    "username": "john",
    "score": 0.85
}
```

**Response (ไม่ผ่าน):**
```json
{
    "verified": false,
    "username": null,
    "score": 0.42
}
```

| Field | Type | Description |
|-------|------|-------------|
| `verified` | bool | ผลการยืนยัน (true/false) |
| `username` | string/null | ชื่อ user (null ถ้าไม่ผ่าน) |
| `score` | float | คะแนนความเหมือน (0-1) |

> **Note:** ค่า threshold เริ่มต้นคือ `0.6` (แก้ไขได้ที่ `config/settings.py`)

---

## ⚙️ Configuration

แก้ไขค่า config ได้ที่ `config/settings.py`:

```python
# Database
DB_HOST = "127.0.0.1"
DB_PORT = 3306
DB_USER = "face_user"
DB_PASSWORD = "face_pass"
DB_NAME = "face_db"

# Face Recognition
VERIFY_THRESHOLD = 0.6
```

---

## 🛠️ Scripts

### Crop หน้าจากรูป
```bash
python -m scripts.face_crop --input image.jpeg --output faces/
```

---

## 🔗 Interactive Docs

เมื่อรัน server แล้ว สามารถเข้าถึง Interactive API Documentation ได้ที่:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
