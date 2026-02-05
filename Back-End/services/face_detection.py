"""
Face Detection Service
ตรวจจับและ crop ใบหน้าด้วย ONNX Runtime (det_500m.onnx)
"""

import cv2
import numpy as np
import onnxruntime as ort
from typing import Tuple, List, Optional, Dict
from config.settings import FACE_DETECTION_MODEL_PATH


# ==================================================
# Load detection model once with ONNX Runtime
# ==================================================
_det_session = ort.InferenceSession(FACE_DETECTION_MODEL_PATH, providers=['CPUExecutionProvider'])
_det_input_name = _det_session.get_inputs()[0].name


def _preprocess_for_detection(image: np.ndarray, input_size: Tuple[int, int] = (640, 640)) -> Tuple[np.ndarray, float, Tuple[int, int]]:
    """
    Preprocess รูปภาพสำหรับ face detection model
    
    Args:
        image: รูปภาพ BGR format
        input_size: ขนาด input ของ model
    
    Returns:
        tuple: (blob, scale, padding)
    """
    h, w = image.shape[:2]
    target_w, target_h = input_size
    
    # คำนวณ scale ratio (letterbox resize)
    scale = min(target_w / w, target_h / h)
    new_w = int(w * scale)
    new_h = int(h * scale)
    
    # Resize
    resized = cv2.resize(image, (new_w, new_h))
    
    # สร้าง canvas และวางรูปตรงกลาง
    canvas = np.full((target_h, target_w, 3), 128, dtype=np.uint8)
    pad_x = (target_w - new_w) // 2
    pad_y = (target_h - new_h) // 2
    canvas[pad_y:pad_y+new_h, pad_x:pad_x+new_w] = resized
    
    # Normalize และแปลงเป็น blob
    blob = cv2.dnn.blobFromImage(canvas, 1.0/128.0, input_size, (127.5, 127.5, 127.5), swapRB=True)
    
    return blob, scale, (pad_x, pad_y)


def detect_faces(image: np.ndarray, conf_threshold: float = 0.5) -> List[Dict]:
    """
    ตรวจจับใบหน้าในรูปภาพด้วย ONNX Runtime
    
    Args:
        image: รูปภาพ BGR format (numpy array)
        conf_threshold: ค่า confidence ต่ำสุด
    
    Returns:
        list: รายการใบหน้าที่ตรวจพบ พร้อม bounding box และ confidence
    """
    h, w = image.shape[:2]
    input_size = (640, 640)
    
    # Preprocess
    blob, scale, (pad_x, pad_y) = _preprocess_for_detection(image, input_size)
    
    # Inference with ONNX Runtime
    outputs = _det_session.run(None, {_det_input_name: blob})
    
    faces = []
    
    # Parse outputs (format อาจต่างกันตาม model)
    # สำหรับ det_500m.onnx จาก InsightFace
    for output in outputs:
        if output.ndim == 3:
            output = output[0]
        for detection in output:
            # detection format: [x1, y1, x2, y2, confidence, ...]
            if len(detection) >= 5:
                confidence = float(detection[4])
                
                if confidence >= conf_threshold:
                    # แปลงกลับเป็นพิกัดจริง
                    x1 = int((detection[0] - pad_x) / scale)
                    y1 = int((detection[1] - pad_y) / scale)
                    x2 = int((detection[2] - pad_x) / scale)
                    y2 = int((detection[3] - pad_y) / scale)
                    
                    # Clamp to image bounds
                    x1 = max(0, min(x1, w))
                    y1 = max(0, min(y1, h))
                    x2 = max(0, min(x2, w))
                    y2 = max(0, min(y2, h))
                    
                    if x2 > x1 and y2 > y1:
                        faces.append({
                            "bbox": [x1, y1, x2, y2],
                            "confidence": confidence,
                            "width": x2 - x1,
                            "height": y2 - y1
                        })
    
    # เรียงตามขนาด (ใบหน้าใหญ่สุดก่อน)
    faces.sort(key=lambda f: f["width"] * f["height"], reverse=True)
    
    return faces


def detect_faces_simple(image: np.ndarray, conf_threshold: float = 0.5) -> List[Dict]:
    """
    ตรวจจับใบหน้าด้วย OpenCV Haar Cascade (fallback method)
    ใช้ในกรณี ONNX model มีปัญหา
    
    Args:
        image: รูปภาพ BGR format
        conf_threshold: ไม่ใช้ใน Haar Cascade
    
    Returns:
        list: รายการใบหน้าที่ตรวจพบ
    """
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    detected = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
    
    faces = []
    for (x, y, w, h) in detected:
        faces.append({
            "bbox": [x, y, x + w, y + h],
            "confidence": 1.0,  # Haar cascade ไม่มี confidence
            "width": w,
            "height": h
        })
    
    # เรียงตามขนาด
    faces.sort(key=lambda f: f["width"] * f["height"], reverse=True)
    
    return faces


def crop_face(image: np.ndarray, bbox: List[int], margin: float = 0.2) -> np.ndarray:
    """
    Crop ใบหน้าจากรูปภาพพร้อม margin
    
    Args:
        image: รูปภาพ BGR format
        bbox: [x1, y1, x2, y2]
        margin: เพิ่มขอบเป็นสัดส่วนของขนาดใบหน้า (0.2 = 20%)
    
    Returns:
        np.ndarray: รูปใบหน้าที่ crop แล้ว
    """
    h, w = image.shape[:2]
    x1, y1, x2, y2 = bbox
    
    # คำนวณ margin
    face_w = x2 - x1
    face_h = y2 - y1
    margin_x = int(face_w * margin)
    margin_y = int(face_h * margin)
    
    # เพิ่ม margin และ clamp
    x1 = max(0, x1 - margin_x)
    y1 = max(0, y1 - margin_y)
    x2 = min(w, x2 + margin_x)
    y2 = min(h, y2 + margin_y)
    
    return image[y1:y2, x1:x2].copy()


def detect_and_crop_face(image: np.ndarray, conf_threshold: float = 0.5, margin: float = 0.2) -> Tuple[Optional[np.ndarray], Dict]:
    """
    ตรวจจับและ crop ใบหน้าจากรูปภาพ (รับเฉพาะใบหน้าที่ใหญ่ที่สุด)
    
    Args:
        image: รูปภาพ BGR format
        conf_threshold: ค่า confidence ต่ำสุด
        margin: เพิ่มขอบเป็นสัดส่วนของขนาดใบหน้า
    
    Returns:
        tuple: (cropped_face, detection_info)
            - cropped_face: รูปใบหน้าที่ crop แล้ว หรือ None ถ้าไม่พบ
            - detection_info: ข้อมูลการตรวจจับ
    """
    result = {
        "found": False,
        "face_count": 0,
        "message": "",
        "bbox": None,
        "confidence": None
    }
    
    # ใช้ Haar Cascade เป็นหลัก (เสถียรกว่า)
    faces = detect_faces_simple(image, conf_threshold)
    
    # ถ้า Haar Cascade ไม่พบ ลอง ONNX model
    if len(faces) == 0:
        try:
            faces = detect_faces(image, conf_threshold)
        except Exception as e:
            print(f"ONNX detection also failed: {e}")
    
    result["face_count"] = len(faces)
    
    if len(faces) == 0:
        result["message"] = "ไม่พบใบหน้าในรูปภาพ"
        return None, result
    
    if len(faces) > 1:
        result["message"] = f"พบใบหน้า {len(faces)} ใบหน้า กรุณาถ่ายรูปใหม่ให้มีใบหน้าเดียว"
        # ยังคง return ใบหน้าที่ใหญ่ที่สุด แต่แจ้งเตือน
    
    # ใช้ใบหน้าที่ใหญ่ที่สุด
    best_face = faces[0]
    cropped = crop_face(image, best_face["bbox"], margin)
    
    result["found"] = True
    result["bbox"] = best_face["bbox"]
    result["confidence"] = best_face["confidence"]
    result["message"] = "พบใบหน้าสำเร็จ" if len(faces) == 1 else result["message"]
    
    return cropped, result
