"""
Location Service
คำนวณระยะทางระหว่างพิกัด GPS ด้วย Haversine formula
"""

import math
from config.settings import OFFICE_LATITUDE, OFFICE_LONGITUDE, MAX_DISTANCE_METERS


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    คำนวณระยะทางระหว่าง 2 จุดบนพื้นผิวโลกด้วย Haversine formula
    
    Args:
        lat1, lon1: พิกัดจุดที่ 1 (latitude, longitude)
        lat2, lon2: พิกัดจุดที่ 2 (latitude, longitude)
    
    Returns:
        ระยะทางเป็นเมตร
    """
    # รัศมีโลก (เมตร)
    R = 6371000
    
    # แปลงเป็น radians
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    # Haversine formula
    a = math.sin(delta_phi / 2) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    distance = R * c
    return distance


def check_location(user_lat: float, user_lon: float) -> dict:
    """
    ตรวจสอบว่าผู้ใช้อยู่ในระยะที่อนุญาตหรือไม่
    
    Args:
        user_lat: latitude ของผู้ใช้
        user_lon: longitude ของผู้ใช้
    
    Returns:
        dict: {
            "allowed": bool,
            "distance": float (เมตร),
            "max_distance": int,
            "message": str
        }
    """
    distance = haversine_distance(user_lat, user_lon, OFFICE_LATITUDE, OFFICE_LONGITUDE)
    distance_rounded = round(distance, 1)
    
    allowed = distance <= MAX_DISTANCE_METERS
    
    if allowed:
        message = f"อยู่ในระยะที่อนุญาต ({distance_rounded:.0f} ม.)"
    else:
        message = f"คุณอยู่ห่างจากที่ทำงาน {distance_rounded:.0f} เมตร (เกิน {MAX_DISTANCE_METERS} ม.)"
    
    return {
        "allowed": allowed,
        "distance": distance_rounded,
        "max_distance": MAX_DISTANCE_METERS,
        "office_location": {
            "latitude": OFFICE_LATITUDE,
            "longitude": OFFICE_LONGITUDE
        },
        "message": message
    }
