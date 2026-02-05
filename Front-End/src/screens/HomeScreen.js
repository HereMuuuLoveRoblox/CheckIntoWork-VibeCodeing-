import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  TextInput,
} from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USERNAME_KEY = '@working_time_username';

export default function HomeScreen({ navigation }) {
  const [username, setUsername] = useState('');
  
  // โหลด username จาก storage เมื่อเปิดแอป
  useEffect(() => {
    loadUsername();
  }, []);

  const loadUsername = async () => {
    try {
      const savedUsername = await AsyncStorage.getItem(USERNAME_KEY);
      if (savedUsername) {
        setUsername(savedUsername);
      }
    } catch (error) {
      // ไม่ต้องแสดง error ถ้าโหลดไม่ได้
    }
  };

  // บันทึก username เมื่อมีการเปลี่ยนแปลง
  const handleUsernameChange = async (text) => {
    setUsername(text);
    try {
      await AsyncStorage.setItem(USERNAME_KEY, text);
    } catch (error) {
      // ไม่ต้องแสดง error ถ้าบันทึกไม่ได้
    }
  };
  
  // ฟังก์ชันดึงพิกัด GPS
  const getMyLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('ไม่ได้รับอนุญาต', 'กรุณาอนุญาตการเข้าถึงตำแหน่ง');
        return;
      }

      Alert.alert('กำลังดึงพิกัด...', 'กรุณารอสักครู่');

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;
      
      // Log พิกัดใน console
      console.log('='.repeat(50));
      console.log('📍 พิกัดปัจจุบัน:');
      console.log(`   Latitude:  ${latitude}`);
      console.log(`   Longitude: ${longitude}`);
      console.log('='.repeat(50));
      console.log('👉 คัดลอกไปใส่ใน docker-compose.yml:');
      console.log(`   OFFICE_LATITUDE=${latitude}`);
      console.log(`   OFFICE_LONGITUDE=${longitude}`);
      console.log('='.repeat(50));

      Alert.alert(
        '📍 พิกัดปัจจุบัน',
        `Latitude: ${latitude}\nLongitude: ${longitude}\n\nดู console log เพื่อคัดลอกค่า`,
        [{ text: 'ตกลง' }]
      );
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Error', 'ไม่สามารถดึงพิกัดได้');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Working Time</Text>
        <Text style={styles.subtitle}>ระบบเช็คอินด้วยใบหน้า</Text>
      </View>

      <View style={styles.content}>
        {/* Username Input */}
        <View style={styles.usernameContainer}>
          <Text style={styles.usernameLabel}>👤 ชื่อผู้ใช้</Text>
          <TextInput
            style={styles.usernameInput}
            placeholder="กรอกชื่อของคุณ"
            placeholderTextColor="#666"
            value={username}
            onChangeText={handleUsernameChange}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Action buttons */}
        <View style={styles.buttonContainer}>
          {/* Register Face */}
          <TouchableOpacity
            style={[styles.button, styles.registerButton]}
            onPress={() => navigation.navigate('Camera', { mode: 'register' })}
          >
            <Text style={styles.buttonIcon}>👤</Text>
            <View style={styles.buttonTextContainer}>
              <Text style={styles.buttonTitle}>ลงทะเบียนใบหน้า</Text>
              <Text style={styles.buttonSubtitle}>สำหรับผู้ใช้ใหม่</Text>
            </View>
          </TouchableOpacity>

          {/* Check In */}
          <TouchableOpacity
            style={[styles.button, styles.checkInButton, !username.trim() && styles.buttonDisabled]}
            onPress={() => {
              if (!username.trim()) {
                Alert.alert('กรุณากรอกชื่อ', 'กรอกชื่อผู้ใช้ก่อนเข้างาน');
                return;
              }
              navigation.navigate('Camera', { mode: 'checkIn', username: username.trim() });
            }}
          >
            <Text style={styles.buttonIcon}>🟢</Text>
            <View style={styles.buttonTextContainer}>
              <Text style={styles.buttonTitle}>เข้างาน</Text>
              <Text style={styles.buttonSubtitle}>บันทึกเวลาเข้างาน</Text>
            </View>
          </TouchableOpacity>

          {/* Check Out */}
          <TouchableOpacity
            style={[styles.button, styles.checkOutButton, !username.trim() && styles.buttonDisabled]}
            onPress={() => {
              if (!username.trim()) {
                Alert.alert('กรุณากรอกชื่อ', 'กรอกชื่อผู้ใช้ก่อนออกงาน');
                return;
              }
              navigation.navigate('Camera', { mode: 'checkOut', username: username.trim() });
            }}
          >
            <Text style={styles.buttonIcon}>🔴</Text>
            <View style={styles.buttonTextContainer}>
              <Text style={styles.buttonTitle}>ออกงาน</Text>
              <Text style={styles.buttonSubtitle}>บันทึกเวลาออกงาน</Text>
            </View>
          </TouchableOpacity>

          {/* Get GPS Location (Demo) - ปิดไว้เผื่อใช้ภายหลัง */}
          {/* 
          <TouchableOpacity
            style={[styles.button, styles.locationButton]}
            onPress={getMyLocation}
          >
            <Text style={styles.buttonIcon}>📍</Text>
            <View style={styles.buttonTextContainer}>
              <Text style={styles.buttonTitleDark}>หาพิกัดตำแหน่ง</Text>
              <Text style={styles.buttonSubtitleDark}>สำหรับตั้งค่าที่ทำงาน</Text>
            </View>
          </TouchableOpacity>
          */}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          ระบบจดจำใบหน้าอัตโนมัติ
        </Text>
        <Text style={styles.versionText}>v1.0.0</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    paddingTop: 40,
    paddingBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00ff88',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  usernameContainer: {
    marginBottom: 20,
  },
  usernameLabel: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
  },
  usernameInput: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    color: '#fff',
    borderWidth: 2,
    borderColor: '#0f3460',
  },
  iconContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  clockIcon: {
    fontSize: 80,
  },
  buttonContainer: {
    gap: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 25,
    paddingHorizontal: 25,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  registerButton: {
    backgroundColor: '#16213e',
    borderWidth: 2,
    borderColor: '#0f3460',
  },
  checkInButton: {
    backgroundColor: '#00ff88',
  },
  checkOutButton: {
    backgroundColor: '#ff6b6b',
  },
  locationButton: {
    backgroundColor: '#ffd700',
  },
  buttonIcon: {
    fontSize: 40,
    marginRight: 20,
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  buttonSubtitle: {
    fontSize: 14,
    color: '#aaa',
  },
  buttonTitleDark: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  buttonSubtitleDark: {
    fontSize: 14,
    color: '#666',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  versionText: {
    fontSize: 12,
    color: '#444',
  },
});
