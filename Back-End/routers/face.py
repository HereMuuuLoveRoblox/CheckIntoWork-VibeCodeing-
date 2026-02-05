"""
Face Recognition API Routes
รวม endpoints ทั้งหมดที่เกี่ยวกับ face recognition
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
from core import face_to_embedding, save_user
from core.database import get_user_embedding_count, record_attendance, get_last_attendance
from services.face_user import verify_user, recognize_face
from services.utils import read_image_from_upload
from services.image_quality import check_image_quality
from services.face_detection import detect_and_crop_face
from services.location import check_location

router = APIRouter(prefix="/face", tags=["Face Recognition"])


@router.get("/users")
async def get_users():
    """ดึงรายชื่อ users ทั้งหมดในระบบ"""
    users = get_all_usernames()
    return {
        "users": users,
        "count": len(users)
    }


def process_image_with_validation(img):
    """
    ตรวจสอบคุณภาพรูปภาพและ detect/crop ใบหน้า
    
    Args:
        img: รูปภาพ BGR format (numpy array)
    
    Returns:
        tuple: (cropped_face, quality_result, detection_result)
    
    Raises:
        HTTPException: ถ้ารูปภาพไม่ผ่านการตรวจสอบ
    """
    # 1. ตรวจสอบคุณภาพรูปภาพ
    quality_result = check_image_quality(img)
    
    if not quality_result["passed"]:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "image_quality_failed",
                "message": quality_result["message"],
                "checks": quality_result["checks"]
            }
        )
    
    # 2. ตรวจจับและ crop ใบหน้า
    cropped_face, detection_result = detect_and_crop_face(img)
    
    if not detection_result["found"]:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "face_detection_failed",
                "message": detection_result["message"],
                "face_count": detection_result["face_count"]
            }
        )
    
    return cropped_face, quality_result, detection_result


@router.post("/check-quality")
async def check_quality(file: UploadFile = File(...)):
    """
    ตรวจสอบคุณภาพรูปภาพและการตรวจจับใบหน้า
    ใช้สำหรับทดสอบก่อนลงทะเบียนหรือ verify
    """
    img = await read_image_from_upload(file)
    
    # ตรวจสอบคุณภาพ
    quality_result = check_image_quality(img)
    
    # ตรวจจับใบหน้า
    cropped_face, detection_result = detect_and_crop_face(img)
    
    return {
        "quality": quality_result,
        "detection": detection_result,
        "passed": quality_result["passed"] and detection_result["found"]
    }


@router.post("/embedding")
async def create_embedding(file: UploadFile = File(...)):
    """สร้าง face embedding จากรูปภาพ"""
    img = await read_image_from_upload(file)
    
    # ตรวจสอบคุณภาพและ crop ใบหน้า
    cropped_face, quality_result, detection_result = process_image_with_validation(img)
    
    # สร้าง embedding จากรูปใบหน้าที่ crop แล้ว
    embedding = face_to_embedding(cropped_face)

    return {
        "embedding": embedding.tolist(),
        "dim": len(embedding),
        "quality": quality_result["checks"],
        "detection": {
            "confidence": detection_result["confidence"],
            "bbox": detection_result["bbox"]
        }
    }


@router.post("/register")
async def register(
    username: str = Form(...),
    file: UploadFile = File(...)
):
    """
    ลงทะเบียน user ด้วยรูปหน้า
    - ถ้า user ใหม่: สร้าง user และเพิ่ม embedding แรก
    - ถ้า user มีอยู่แล้ว: เพิ่ม embedding ใหม่ (รองรับหลายรูป)
    """
    img = await read_image_from_upload(file)
    
    # ตรวจสอบคุณภาพและ crop ใบหน้า
    cropped_face, quality_result, detection_result = process_image_with_validation(img)
    
    # สร้าง embedding และบันทึก
    embedding = face_to_embedding(cropped_face)
    save_user(username, embedding)
    
    # นับจำนวน embedding ทั้งหมดของ user
    embedding_count = get_user_embedding_count(username)
    
    return {
        "status": "registered",
        "username": username,
        "embedding_count": embedding_count,
        "message": f"เพิ่มรูปหน้าสำเร็จ (รวม {embedding_count} รูป)",
        "quality_passed": True,
        "face_detected": True,
        "detection_confidence": detection_result["confidence"]
    }


@router.post("/verify")
async def verify(
    username: str = Form(...),
    file: UploadFile = File(...)
):
    """ยืนยันตัวตนด้วยรูปหน้า"""
    img = await read_image_from_upload(file)
    
    # ตรวจสอบคุณภาพและ crop ใบหน้า
    cropped_face, quality_result, detection_result = process_image_with_validation(img)
    
    # verify ด้วยรูปใบหน้าที่ crop แล้ว
    ok, score = verify_user(username, cropped_face)

    return {
        "verified": ok,
        "username": username if ok else None,
        "score": score,
        "quality_passed": True,
        "detection_confidence": detection_result["confidence"]
    }


@router.post("/recognize")
async def recognize(
    file: UploadFile = File(...),
    action: Optional[str] = Form("check_in"),
    username: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None)
):
    """
    ยืนยันตัวตนและบันทึก Check-in/Check-out
    - ถ้าส่ง username มา: ใช้ verify เทียบกับ user นั้นโดยเฉพาะ (เร็วกว่า)
    - ถ้าไม่ส่ง username: ค้นหาจากทุกคนในระบบ (ช้ากว่า)
    บันทึก attendance ตาม action ที่ส่งมา (check_in หรือ check_out)
    ตรวจสอบระยะทางจากที่ทำงาน (ถ้าส่ง latitude/longitude มา)
    """
    # ตรวจสอบ action ที่ส่งมา
    if action not in ["check_in", "check_out"]:
        action = "check_in"
    
    # ตรวจสอบตำแหน่ง GPS ก่อน (ถ้ามี)
    if latitude is not None and longitude is not None:
        location_result = check_location(latitude, longitude)
        
        if not location_result["allowed"]:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "location_not_allowed",
                    "message": location_result["message"],
                    "distance": location_result["distance"],
                    "max_distance": location_result["max_distance"]
                }
            )
    
    img = await read_image_from_upload(file)
    
    # ตรวจสอบคุณภาพและ crop ใบหน้า
    cropped_face, quality_result, detection_result = process_image_with_validation(img)
    
    # ยืนยันตัวตน
    if username:
        # ถ้าส่ง username มา - verify เฉพาะ user นั้น (เร็วกว่า)
        ok, score = verify_user(username, cropped_face)
        
        if not ok:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "verification_failed",
                    "message": f"ไม่สามารถยืนยันตัวตนของ '{username}' ได้ กรุณาลองใหม่",
                    "username": username,
                    "score": score,
                    "similarity_percent": round(score * 100, 1) if score else 0
                }
            )
        
        matched_username = username
    else:
        # ถ้าไม่ส่ง username - ค้นหาจากทุกคนในระบบ
        matched_username, score = recognize_face(cropped_face)
        
        if matched_username is None:
            return {
                "recognized": False,
                "username": None,
                "score": score,
                "message": "ไม่พบผู้ใช้ในระบบ กรุณาลงทะเบียนก่อน",
                "quality_passed": True,
                "detection_confidence": detection_result["confidence"]
            }
    
    # บันทึก attendance ตาม action ที่ส่งมา
    attendance = record_attendance(matched_username, action, score)
    
    # แปลง similarity เป็น % (0-100)
    similarity_percent = round(score * 100, 1)
    
    # เตรียมข้อมูล location (ถ้ามี)
    distance_info = None
    if latitude is not None and longitude is not None:
        location_result = check_location(latitude, longitude)
        distance_info = round(location_result["distance"])
    
    # เตรียมข้อความช่วงเวลา
    time_period_thai = attendance.get("time_period_thai", "")
    action_text = "เข้างาน" if action == "check_in" else "ออกงาน"
    
    return {
        "recognized": True,
        "username": matched_username,
        "score": score,
        "similarity_percent": similarity_percent,
        "action": action,
        "timestamp": attendance["timestamp"].strftime("%Y-%m-%d %H:%M:%S"),
        "time_period": attendance.get("time_period"),
        "time_period_thai": time_period_thai,
        "distance": distance_info,
        "message": f"{action_text}ช่วง{time_period_thai}สำเร็จ (ความเหมือน {similarity_percent}%)",
        "quality_passed": True,
        "detection_confidence": detection_result["confidence"]
    }
