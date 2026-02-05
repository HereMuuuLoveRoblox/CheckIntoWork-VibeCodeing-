# 🚀 Cloud Deployment Guide

## ภาพรวม
- **Backend**: Deploy ไป Railway (ฟรี / ราคาถูก)
- **Frontend**: Build ด้วย EAS แล้วแจกจ่ายผ่าน App Store / TestFlight / APK

---

## 📦 Part 1: Deploy Backend ไป Railway

### Step 1: สมัคร Railway
1. ไปที่ https://railway.app
2. Sign up ด้วย GitHub

### Step 2: สร้าง Project ใหม่
1. Click "New Project"
2. เลือก "Deploy from GitHub repo"
3. เลือก repository ของคุณ
4. เลือก folder `Back-End`

### Step 3: เพิ่ม MySQL Database
1. Click "New" → "Database" → "MySQL"
2. Railway จะสร้าง MySQL ให้อัตโนมัติ

### Step 4: ตั้งค่า Environment Variables
ไปที่ Backend service → Variables → เพิ่ม:

```
DB_HOST=${{MySQL.MYSQL_HOST}}
DB_PORT=${{MySQL.MYSQL_PORT}}
DB_USER=${{MySQL.MYSQL_USER}}
DB_PASSWORD=${{MySQL.MYSQL_PASSWORD}}
DB_NAME=${{MySQL.MYSQL_DATABASE}}
OFFICE_LATITUDE=13.786888889
OFFICE_LONGITUDE=100.499083333
MAX_DISTANCE_METERS=200
```

### Step 5: Deploy
Railway จะ deploy อัตโนมัติเมื่อ push code ไป GitHub

### Step 6: ดู URL
หลัง deploy เสร็จ จะได้ URL เช่น:
`https://working-time-backend.railway.app`

---

## 📱 Part 2: Build Frontend ด้วย EAS

### Step 1: ติดตั้ง EAS CLI
```bash
npm install -g eas-cli
```

### Step 2: Login Expo
```bash
eas login
```
(สมัครฟรีที่ https://expo.dev ถ้ายังไม่มี account)

### Step 3: ตั้งค่า Project
```bash
cd Front-End
eas build:configure
```

### Step 4: แก้ไข .env.production
```
EXPO_PUBLIC_API_URL=https://your-backend.railway.app
```
(ใส่ URL จาก Railway ที่ได้ใน Part 1)

### Step 5: Build สำหรับ iOS

#### 5a. Build สำหรับ Simulator (ทดสอบ - ฟรี)
```bash
eas build --platform ios --profile preview
```

#### 5b. Build สำหรับ iPhone จริง (ต้องมี Apple Developer $99/ปี)
```bash
eas build --platform ios --profile production
```

### Step 6: Build สำหรับ Android
```bash
# Build APK (ทดสอบ)
eas build --platform android --profile preview

# Build AAB สำหรับ Play Store
eas build --platform android --profile production
```

### Step 7: ดาวน์โหลดและติดตั้ง
หลัง build เสร็จ:
- **iOS**: ได้ไฟล์ .ipa หรือ scan QR code ติดตั้งผ่าน TestFlight
- **Android**: ได้ไฟล์ .apk ติดตั้งตรงได้เลย

---

## ⚡ Quick Commands

```bash
# Deploy Backend (push to GitHub แล้ว Railway จะ deploy อัตโนมัติ)
git add .
git commit -m "Deploy to production"
git push origin main

# Build iOS app
cd Front-End
eas build --platform ios --profile production

# Build Android app
eas build --platform android --profile production

# Build ทั้งสอง platform
eas build --platform all --profile production
```

---

## 💰 ค่าใช้จ่าย

| Service | Free Tier | Paid |
|---------|-----------|------|
| Railway (Backend) | $5/month credit | ~$5-20/month |
| Railway MySQL | รวมใน Backend | รวมใน Backend |
| EAS Build | 30 builds/month | $99/month |
| Apple Developer | - | $99/year |
| Google Play | - | $25 (ครั้งเดียว) |

---

## 🔧 Troubleshooting

### Backend ไม่ทำงาน
1. ตรวจสอบ Logs ใน Railway
2. ตรวจสอบ Environment Variables

### App ต่อ Backend ไม่ได้
1. ตรวจสอบว่า EXPO_PUBLIC_API_URL ถูกต้อง
2. ตรวจสอบว่า Backend URL เป็น HTTPS

### Build ไม่ผ่าน
1. ตรวจสอบ eas.json configuration
2. ตรวจสอบ app.json (bundleIdentifier, package)
