# Working Time - Face Check-in/Check-out App

แอพเช็คอินเข้างาน-ออกงานด้วยการจดจำใบหน้า

## Features

- 📸 **Face Registration** - ลงทะเบียนใบหน้าของผู้ใช้ใหม่
- ✅ **Face Quality Check** - ตรวจสอบคุณภาพใบหน้า (หน้าตรง, แสงดี, ขนาดเหมาะสม)
- 🔍 **Face Detection** - ใช้ Google ML Kit Face Detection
- 🕐 **Check-in/Check-out** - บันทึกเวลาเข้า-ออกงานด้วยใบหน้า

## Tech Stack

- React Native (Expo)
- react-native-vision-camera
- @react-native-ml-kit/face-detection
- expo-image-manipulator
- React Navigation

## Project Structure

```
src/
├── screens/
│   ├── HomeScreen.js         # หน้าหลัก
│   ├── CameraScreen.js       # หน้ากล้องถ่ายรูป + face detection
│   ├── RegisterScreen.js     # หน้าลงทะเบียนใบหน้า
│   └── CheckInOutScreen.js   # หน้าเช็คอิน/เช็คเอาท์
├── services/
│   └── api.js               # API calls
└── utils/
    └── faceQuality.js       # Face quality validation utilities
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Prebuild for Native Modules

เนื่องจากแอพใช้ native modules (Vision Camera, ML Kit) จึงต้อง prebuild:

```bash
npx expo prebuild
```

### 3. Run on Device/Emulator

```bash
# Android
npx expo run:android

# iOS
npx expo run:ios
```

> ⚠️ **Note**: แอพนี้ไม่สามารถใช้กับ Expo Go ได้ ต้องใช้ Development Build

## API Endpoints

แอพเชื่อมต่อกับ Backend API ที่ `http://localhost:8000`:

### Register Face
```
POST /face/register
Content-Type: multipart/form-data
Body: { username: string, file: File }
```

### Check-in/Check-out
```
POST /face/recognize
Content-Type: multipart/form-data
Body: { file: File }
```

## Face Quality Checks

ระบบจะตรวจสอบคุณภาพใบหน้าก่อนถ่ายรูป:

1. **Face Angle** - หน้าต้องตรง (yaw, pitch, roll < 15°)
2. **Face Size** - ขนาดใบหน้าเหมาะสม (15-85% ของเฟรม)
3. **Eyes Open** - ต้องลืมตา (> 50% probability)
4. **Face Centered** - ใบหน้าอยู่กลางเฟรม

## Configuration

### Change API Base URL

แก้ไขไฟล์ [src/services/api.js](src/services/api.js):

```javascript
const API_BASE_URL = 'http://your-api-server:8000';
```

### Adjust Face Quality Thresholds

แก้ไขไฟล์ [src/utils/faceQuality.js](src/utils/faceQuality.js):

```javascript
const QUALITY_THRESHOLDS = {
  MAX_HEAD_EULER_Y: 15, // ปรับมุมหน้าซ้าย-ขวา
  MAX_HEAD_EULER_Z: 15, // ปรับมุมเอียงหัว
  MIN_FACE_SIZE_RATIO: 0.15, // ขนาดใบหน้าขั้นต่ำ
  // ...
};
```

## Development Notes

- ใช้กล้องหน้า (front camera) สำหรับถ่ายใบหน้า
- รูปภาพจะถูก crop และ resize เป็น 112×112 pixels
- รองรับ Android และ iOS
