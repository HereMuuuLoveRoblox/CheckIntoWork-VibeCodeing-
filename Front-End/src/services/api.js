// API Configuration
// อ่านจาก .env file (EXPO_PUBLIC_ prefix สำหรับ Expo)
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.197:8000';

/**
 * Register a new user with face image
 * @param {string} username - User's name
 * @param {string} imageUri - URI of the cropped face image
 * @returns {Promise<{status: string, username: string}>}
 */
export const registerFace = async (username, imageUri) => {
  try {
    const formData = new FormData();
    
    // Append username
    formData.append('username', username);
    
    // Append the image file
    const filename = imageUri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    formData.append('file', {
      uri: imageUri,
      name: filename || 'face.jpg',
      type: type,
    });

    const response = await fetch(`${API_BASE_URL}/face/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API Error Detail:', JSON.stringify(errorData, null, 2));
      const error = new Error(errorData.detail?.message || errorData.detail || `HTTP Error: ${response.status}`);
      error.errorCode = errorData.detail?.error || 'unknown_error';
      error.checks = errorData.detail?.checks || null;
      throw error;
    }

    return await response.json();
  } catch (error) {
    console.error('Register face error:', error);
    throw error;
  }
};

/**
 * Check-in/Check-out with face recognition
 * @param {string} imageUri - URI of the cropped face image
 * @param {object} location - { latitude, longitude } (optional)
 * @param {string} action - 'check_in' or 'check_out'
 * @param {string} username - ชื่อผู้ใช้ที่ต้องการยืนยัน
 * @returns {Promise<object>}
 */
export const checkInOut = async (imageUri, location = null, action = 'check_in', username = '') => {
  try {
    const formData = new FormData();
    
    const filename = imageUri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    formData.append('file', {
      uri: imageUri,
      name: filename || 'face.jpg',
      type: type,
    });

    // เพิ่ม action (check_in หรือ check_out)
    formData.append('action', action);

    // เพิ่ม username ที่ต้องการยืนยัน
    if (username) {
      formData.append('username', username);
    }

    // เพิ่มพิกัด GPS ถ้ามี
    if (location && location.latitude && location.longitude) {
      formData.append('latitude', location.latitude.toString());
      formData.append('longitude', location.longitude.toString());
    }

    const response = await fetch(`${API_BASE_URL}/face/recognize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // สร้าง error object พร้อมรายละเอียด
      const error = new Error(data.detail?.message || data.message || `HTTP Error: ${response.status}`);
      error.errorCode = data.detail?.error || 'unknown_error';
      error.checks = data.detail?.checks || null;
      error.distance = data.detail?.distance || null;
      error.maxDistance = data.detail?.max_distance || null;
      throw error;
    }

    // กรณี recognized = false (ไม่พบผู้ใช้ในระบบ)
    if (data.recognized === false) {
      const error = new Error(data.message || 'ไม่พบผู้ใช้ในระบบ');
      error.errorCode = 'user_not_found';
      throw error;
    }

    return data;
  } catch (error) {
    // ไม่ใช้ console.error เพื่อไม่ให้ Expo แสดง error toast
    throw error;
  }
};

export default {
  registerFace,
  checkInOut,
};
