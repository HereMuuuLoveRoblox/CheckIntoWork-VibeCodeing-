"""
Image Quality Service
ตรวจสอบคุณภาพรูปภาพด้วย OpenCV + Heuristics
"""

import cv2
import numpy as np
from typing import Tuple, Dict
from config.settings import (
    BRIGHTNESS_MIN,
    BRIGHTNESS_MAX,
    BLUR_THRESHOLD,
)


def check_brightness(image: np.ndarray) -> Tuple[bool, float, str]:
    """
    ตรวจสอบความสว่างของรูปภาพ
    
    Args:
        image: รูปภาพ BGR format (numpy array)
    
    Returns:
        tuple: (passed, brightness_value, message)
    """
    # แปลงเป็น grayscale แล้วคำนวณค่าเฉลี่ยความสว่าง
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    brightness = np.mean(gray)
    
    if brightness < BRIGHTNESS_MIN:
        return False, brightness, f"รูปภาพมืดเกินไป (ความสว่าง: {brightness:.1f}, ต้องการ: ≥{BRIGHTNESS_MIN})"
    
    if brightness > BRIGHTNESS_MAX:
        return False, brightness, f"รูปภาพสว่างเกินไป (ความสว่าง: {brightness:.1f}, ต้องการ: ≤{BRIGHTNESS_MAX})"
    
    return True, brightness, "ความสว่างผ่าน"


def check_blur(image: np.ndarray) -> Tuple[bool, float, str]:
    """
    ตรวจสอบความเบลอของรูปภาพด้วย Laplacian variance
    ค่า variance สูง = รูปคมชัด, ค่าต่ำ = รูปเบลอ
    
    Args:
        image: รูปภาพ BGR format (numpy array)
    
    Returns:
        tuple: (passed, sharpness_value, message)
    """
    # แปลงเป็น grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # คำนวณ Laplacian variance (วัดความคมชัด)
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    sharpness = laplacian.var()
    
    if sharpness < BLUR_THRESHOLD:
        return False, sharpness, f"รูปภาพเบลอเกินไป (ความคมชัด: {sharpness:.1f}, ต้องการ: ≥{BLUR_THRESHOLD})"
    
    return True, sharpness, "ความคมชัดผ่าน"


def check_contrast(image: np.ndarray, min_contrast: float = 30.0) -> Tuple[bool, float, str]:
    """
    ตรวจสอบ contrast ของรูปภาพ
    
    Args:
        image: รูปภาพ BGR format (numpy array)
        min_contrast: ค่า contrast ต่ำสุดที่ยอมรับ
    
    Returns:
        tuple: (passed, contrast_value, message)
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    contrast = gray.std()
    
    if contrast < min_contrast:
        return False, contrast, f"รูปภาพ contrast ต่ำเกินไป (contrast: {contrast:.1f}, ต้องการ: ≥{min_contrast})"
    
    return True, contrast, "Contrast ผ่าน"


def check_image_quality(image: np.ndarray) -> Dict:
    """
    ตรวจสอบคุณภาพรูปภาพทั้งหมด
    
    Args:
        image: รูปภาพ BGR format (numpy array)
    
    Returns:
        dict: ผลการตรวจสอบทั้งหมด
            - passed: bool - ผ่านทุกการตรวจสอบหรือไม่
            - checks: dict - รายละเอียดแต่ละการตรวจสอบ
            - message: str - ข้อความสรุป
    """
    results = {
        "passed": True,
        "checks": {},
        "message": "คุณภาพรูปภาพผ่านทั้งหมด",
        "failed_reasons": []
    }
    
    # 1. ตรวจสอบความสว่าง
    brightness_passed, brightness_val, brightness_msg = check_brightness(image)
    results["checks"]["brightness"] = {
        "passed": brightness_passed,
        "value": float(brightness_val),
        "message": brightness_msg
    }
    if not brightness_passed:
        results["passed"] = False
        results["failed_reasons"].append(brightness_msg)
    
    # 2. ตรวจสอบความเบลอ
    blur_passed, sharpness_val, blur_msg = check_blur(image)
    results["checks"]["blur"] = {
        "passed": blur_passed,
        "value": float(sharpness_val),
        "message": blur_msg
    }
    if not blur_passed:
        results["passed"] = False
        results["failed_reasons"].append(blur_msg)
    
    # 3. ตรวจสอบ contrast
    contrast_passed, contrast_val, contrast_msg = check_contrast(image)
    results["checks"]["contrast"] = {
        "passed": contrast_passed,
        "value": float(contrast_val),
        "message": contrast_msg
    }
    if not contrast_passed:
        results["passed"] = False
        results["failed_reasons"].append(contrast_msg)
    
    # สรุปผล
    if not results["passed"]:
        results["message"] = "คุณภาพรูปภาพไม่ผ่าน: " + "; ".join(results["failed_reasons"])
    
    return results
