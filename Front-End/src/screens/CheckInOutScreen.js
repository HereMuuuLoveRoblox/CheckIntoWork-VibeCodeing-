import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { checkInOut } from '../services/api';

export default function CheckInOutScreen({ navigation, route }) {
  const { imageUri, action = 'check_in', username = '' } = route.params || {};
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);

  // ขอ permission และดึง GPS เมื่อเปิดหน้า
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('ไม่ได้รับอนุญาตให้เข้าถึงตำแหน่ง');
        return;
      }

      try {
        let loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      } catch (err) {
        setLocationError('ไม่สามารถดึงตำแหน่งได้');
      }
    })();
  }, []);

  const handleCheckInOut = async () => {
    if (!imageUri) {
      Alert.alert('ไม่มีรูปภาพ', 'กรุณาถ่ายรูปใหม่');
      navigation.goBack();
      return;
    }

    // ตรวจสอบว่าได้ location หรือยัง
    if (!location) {
      Alert.alert(
        '📍 กำลังดึงตำแหน่ง',
        locationError || 'กรุณารอสักครู่...',
        [{ text: 'ลองใหม่', onPress: handleCheckInOut }]
      );
      return;
    }

    setIsLoading(true);

    try {
      const response = await checkInOut(imageUri, location, action, username);
      setResult(response);
    } catch (error) {
      // ไม่ใช้ console.error เพื่อไม่ให้ Expo แสดง error toast
      
      // แสดงข้อความตามประเภท error
      let title = 'เกิดข้อผิดพลาด';
      let message = error.message || 'ไม่สามารถเช็คอินได้ กรุณาลองใหม่';
      let buttons = [
        { text: 'ลองใหม่' },
        { text: 'ถ่ายรูปใหม่', onPress: () => navigation.goBack() },
      ];

      switch (error.errorCode) {
        case 'image_quality_failed':
          // แสดงรายละเอียดว่าไม่ผ่านตรงไหน
          if (error.checks) {
            const issues = [];
            if (!error.checks.brightness?.passed) {
              const brightnessVal = error.checks.brightness?.value || 0;
              if (brightnessVal < 40) {
                issues.push('🌙 แสงมืดเกินไป - หาที่สว่างกว่านี้');
                title = '🌙 แสงมืดเกินไป';
              } else {
                issues.push('☀️ แสงสว่างเกินไป - หลีกเลี่ยงแสงจ้า');
                title = '☀️ แสงสว่างเกินไป';
              }
            }
            if (!error.checks.blur?.passed) {
              issues.push('📷 รูปเบลอ - ถือมือถือให้นิ่ง');
              if (!title.includes('แสง')) title = '📷 รูปเบลอ';
            }
            if (!error.checks.contrast?.passed) {
              issues.push('🎨 ความคมชัดต่ำ');
            }
            message = issues.length > 0 
              ? `กรุณาถ่ายรูปใหม่:\n\n${issues.join('\n')}`
              : 'กรุณาถ่ายรูปในที่มีแสงเพียงพอ';
          } else {
            title = '📷 รูปภาพไม่ผ่าน';
            message = 'กรุณาถ่ายรูปในที่มีแสงเพียงพอ และถือมือถือให้นิ่ง';
          }
          buttons = [{ text: 'ถ่ายรูปใหม่', onPress: () => navigation.goBack() }];
          break;

        case 'face_detection_failed':
          title = '😕 ไม่พบใบหน้า';
          message = 'กรุณาหันหน้าตรงกล้อง และให้ใบหน้าอยู่ในกรอบ';
          buttons = [{ text: 'ถ่ายรูปใหม่', onPress: () => navigation.goBack() }];
          break;

        case 'user_not_found':
          title = '❓ ไม่พบข้อมูล';
          message = 'ไม่พบผู้ใช้ในระบบ กรุณาลงทะเบียนก่อนใช้งาน';
          buttons = [
            { text: 'ลงทะเบียน', onPress: () => navigation.navigate('Camera', { mode: 'register' }) },
            { text: 'ลองใหม่' },
          ];
          break;

        case 'verification_failed':
          title = '❌ ยืนยันตัวตนไม่สำเร็จ';
          message = `ใบหน้าไม่ตรงกับ "${username}"\nกรุณาตรวจสอบว่าพิมพ์ชื่อถูกต้อง\nหรือลองถ่ายรูปใหม่`;
          buttons = [
            { text: 'ถ่ายรูปใหม่', onPress: () => navigation.goBack() },
            { text: 'กลับหน้าหลัก', onPress: () => navigation.navigate('Home') },
          ];
          break;

        case 'location_not_allowed':
          title = '📍 อยู่นอกพื้นที่';
          message = `คุณอยู่ห่างจากที่ทำงาน ${error.distance} เมตร\n(ระยะที่อนุญาต: ${error.maxDistance} เมตร)`;
          buttons = [
            { text: 'ลองใหม่' },
            { text: 'กลับหน้าหลัก', onPress: () => navigation.navigate('Home') },
          ];
          break;

        default:
          title = '⚠️ เกิดข้อผิดพลาด';
          break;
      }

      Alert.alert(title, message, buttons);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto check-in when screen loads และมี location แล้ว
  useEffect(() => {
    if (imageUri && !result && location) {
      handleCheckInOut();
    }
  }, [imageUri, location]);

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getCurrentDate = () => {
    const now = new Date();
    return now.toLocaleDateString('th-TH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {isLoading ? 'กำลังตรวจสอบ...' : result ? 'บันทึกสำเร็จ!' : 'เช็คอิน/เช็คเอาท์'}
        </Text>
      </View>

      {/* Face preview */}
      <View style={styles.imageContainer}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.faceImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.noImageContainer}>
            <Text style={styles.noImageText}>ไม่มีรูปภาพ</Text>
          </View>
        )}
      </View>

      {/* Status */}
      <View style={styles.statusContainer}>
        {isLoading ? (
          <>
            <ActivityIndicator size="large" color="#00ff88" />
            <Text style={styles.loadingText}>กำลังตรวจสอบใบหน้า...</Text>
          </>
        ) : result ? (
          <>
            <View style={styles.successIcon}>
              <Text style={styles.successIconText}>✓</Text>
            </View>
            <Text style={styles.userName}>{result.username || 'ผู้ใช้'}</Text>
            <Text style={styles.actionText}>
              {result.action === 'check_in' ? 'เข้างาน' : 'ออกงาน'} ช่วง{result.time_period_thai || ''}
            </Text>
            <Text style={styles.similarityText}>
              ความเหมือน: {result.similarity_percent || Math.round(result.score * 100)}%
            </Text>
            {result.distance !== null && result.distance !== undefined && (
              <Text style={styles.distanceText}>
                📍 ห่างจากที่ทำงาน: {result.distance} เมตร
              </Text>
            )}
            <Text style={styles.timeText}>{result.timestamp || getCurrentTime()}</Text>
            <Text style={styles.dateText}>{getCurrentDate()}</Text>
          </>
        ) : (
          <Text style={styles.errorText}>รอการตรวจสอบ</Text>
        )}
      </View>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        {result && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.primaryButtonText}>กลับหน้าหลัก</Text>
          </TouchableOpacity>
        )}
        
        {!isLoading && !result && (
          <>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleCheckInOut}
            >
              <Text style={styles.primaryButtonText}>ลองใหม่</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.secondaryButtonText}>ถ่ายรูปใหม่</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 20,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  faceImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#00ff88',
  },
  noImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#2d2d44',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#666',
  },
  noImageText: {
    color: '#666',
    fontSize: 14,
  },
  statusContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#aaa',
    fontSize: 16,
    marginTop: 20,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#00ff88',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successIconText: {
    fontSize: 40,
    color: '#1a1a2e',
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  actionText: {
    fontSize: 20,
    color: '#00ff88',
    marginBottom: 10,
  },
  similarityText: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 5,
  },
  distanceText: {
    fontSize: 14,
    color: '#ffd700',
    marginBottom: 15,
  },
  timeText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  dateText: {
    fontSize: 16,
    color: '#aaa',
  },
  errorText: {
    fontSize: 16,
    color: '#ff6b6b',
  },
  buttonContainer: {
    gap: 15,
    marginTop: 20,
  },
  primaryButton: {
    backgroundColor: '#00ff88',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#1a1a2e',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#2d2d44',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});
