"""
Application Settings
รวม configuration ทั้งหมดไว้ที่เดียว
"""

import os
from dotenv import load_dotenv

# โหลด .env file
load_dotenv()

# Database Configuration (อ่านจาก environment variables ถ้ามี)
DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "face_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "face_pass")
DB_NAME = os.getenv("DB_NAME", "face_db")

# Face Recognition Configuration
FACE_MODEL_PATH = "models/w600k_mbf.onnx"
FACE_DETECTION_MODEL_PATH = "models/det_500m.onnx"

# Verification Threshold
VERIFY_THRESHOLD = 0.6

# Output Directories
FACES_OUTPUT_DIR = "faces"

# =====================================================
# Image Quality Thresholds (OpenCV Heuristics)
# =====================================================

# Brightness (ค่า 0-255)
# ค่าเฉลี่ย grayscale ของรูป
BRIGHTNESS_MIN = 40      # มืดเกินไปถ้าต่ำกว่านี้
BRIGHTNESS_MAX = 220     # สว่างเกินไปถ้าสูงกว่านี้

# Blur Detection (Laplacian Variance)
# ค่าสูง = คมชัด, ค่าต่ำ = เบลอ
BLUR_THRESHOLD = 30      # เบลอเกินไปถ้าต่ำกว่านี้

# Face Detection
FACE_DETECTION_CONFIDENCE = 0.5  # ค่า confidence ต่ำสุดสำหรับ face detection
FACE_CROP_MARGIN = 0.2           # เพิ่มขอบ 20% รอบใบหน้า

# =====================================================
# Location Settings (GPS)
# =====================================================

# พิกัดที่ทำงาน (Office Location)
OFFICE_LATITUDE = float(os.getenv("OFFICE_LATITUDE", "13.786888889"))
OFFICE_LONGITUDE = float(os.getenv("OFFICE_LONGITUDE", "100.499083333"))

# ระยะทางสูงสุดที่อนุญาต (เมตร)
MAX_DISTANCE_METERS = int(os.getenv("MAX_DISTANCE_METERS", "200"))
