"""
Utility Functions
ฟังก์ชันช่วยเหลือทั่วไป
"""

import cv2
import numpy as np
from fastapi import UploadFile


async def read_image_from_upload(file: UploadFile) -> np.ndarray:
    """
    อ่านรูปจาก UploadFile (FastAPI)
    แล้ว return เป็น OpenCV image (numpy array)
    """

    # อ่านไฟล์เป็น bytes
    image_bytes = await file.read()

    # bytes -> numpy array
    np_arr = np.frombuffer(image_bytes, np.uint8)

    # decode เป็น image
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if img is None:
        raise ValueError("Invalid image file")

    return img
