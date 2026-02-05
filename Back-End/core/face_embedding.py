"""
Face Embedding Module
แปลงรูปหน้าเป็น face embedding vector
"""

import cv2
import numpy as np
from typing import Union
from config.settings import FACE_MODEL_PATH


# ==================================================
# Load model once (สำคัญมาก)
# ==================================================
_arcface_net = cv2.dnn.readNetFromONNX(FACE_MODEL_PATH)


def face_to_embedding(image: Union[str, np.ndarray]) -> np.ndarray:
    """
    รับรูปหน้าที่ crop มาแล้ว
    แปลงเป็น face embedding (512-d, L2-normalized)

    Args:
        image: path รูป หรือ numpy array (BGR)

    Returns:
        np.ndarray shape (512,) - normalized embedding
    """

    # -------------------------------
    # Load image
    # -------------------------------
    if isinstance(image, str):
        img = cv2.imread(image)
        if img is None:
            raise ValueError("ไม่พบไฟล์รูป")
    else:
        img = image.copy()

    # -------------------------------
    # Preprocess (InsightFace MBF)
    # -------------------------------
    img = cv2.resize(img, (112, 112))
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    img = img.astype(np.float32)
    img = (img - 127.5) / 128.0   # normalize [-1, 1]

    # HWC → CHW → NCHW
    blob = np.transpose(img, (2, 0, 1))
    blob = np.expand_dims(blob, axis=0)

    # -------------------------------
    # Inference
    # -------------------------------
    _arcface_net.setInput(blob)
    embedding = _arcface_net.forward()

    # -------------------------------
    # Postprocess
    # -------------------------------
    embedding = embedding.flatten()
    embedding = embedding / np.linalg.norm(embedding)

    return embedding
