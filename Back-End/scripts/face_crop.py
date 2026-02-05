"""
Face Crop Utility Script
ตรวจจับและ crop หน้าจากรูปภาพ

Usage:
    python -m scripts.face_crop --input image.jpeg --output faces/
"""

import cv2
import os
import argparse
from config.settings import FACES_OUTPUT_DIR


def crop_faces(image_path: str, output_dir: str = None):
    """
    ตรวจจับและ crop หน้าจากรูปภาพ
    
    Args:
        image_path: path ของรูปภาพ input
        output_dir: โฟลเดอร์สำหรับเก็บรูปหน้าที่ crop
    """
    if output_dir is None:
        output_dir = FACES_OUTPUT_DIR
        
    os.makedirs(output_dir, exist_ok=True)

    # โหลด Haar Cascade
    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )

    # อ่านภาพ
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"ไม่พบไฟล์: {image_path}")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # ตรวจจับหน้า
    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(80, 80)
    )

    print(f"พบใบหน้า: {len(faces)}")

    # crop หน้า
    cropped_faces = []
    for i, (x, y, w, h) in enumerate(faces):
        face_crop = img[y:y+h, x:x+w]
        output_path = f"{output_dir}/face_{i}.jpg"
        cv2.imwrite(output_path, face_crop)
        cropped_faces.append(output_path)
        print(f"  บันทึก: {output_path}")

    print("เสร็จสิ้น")
    return cropped_faces


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Crop faces from image")
    parser.add_argument("--input", "-i", required=True, help="Input image path")
    parser.add_argument("--output", "-o", default=FACES_OUTPUT_DIR, help="Output directory")
    
    args = parser.parse_args()
    crop_faces(args.input, args.output)
