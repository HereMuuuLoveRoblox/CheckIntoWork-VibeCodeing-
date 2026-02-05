import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerFace } from '../services/api';

const USERNAME_KEY = '@working_time_username';

export default function RegisterScreen({ navigation, route }) {
  const { imageUri } = route.params || {};
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // โหลด username จาก storage
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
      // ไม่ต้องแสดง error
    }
  };

  // บันทึก username เมื่อเปลี่ยน
  const handleUsernameChange = async (text) => {
    setUsername(text);
    try {
      await AsyncStorage.setItem(USERNAME_KEY, text);
    } catch (error) {
      // ไม่ต้องแสดง error
    }
  };

  const handleRegister = async () => {
    if (!username.trim()) {
      Alert.alert('กรุณากรอกชื่อ', 'กรุณากรอกชื่อผู้ใช้งาน');
      return;
    }

    if (!imageUri) {
      Alert.alert('ไม่มีรูปภาพ', 'กรุณาถ่ายรูปใหม่');
      navigation.goBack();
      return;
    }

    setIsLoading(true);

    try {
      const response = await registerFace(username.trim(), imageUri);
      
      Alert.alert(
        'ลงทะเบียนสำเร็จ! ✓',
        `ยินดีต้อนรับ ${response.username}`,
        [
          {
            text: 'ตกลง',
            onPress: () => navigation.navigate('Home'),
          },
        ]
      );
    } catch (error) {
      console.error('Registration error:', error);
      
      // แสดงข้อความตามประเภท error
      let title = 'ลงทะเบียนไม่สำเร็จ';
      let message = error.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
      let buttons = [
        { text: 'ลองใหม่' },
        { text: 'ถ่ายรูปใหม่', onPress: () => navigation.goBack() },
      ];

      switch (error.errorCode) {
        case 'image_quality_failed':
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

        default:
          title = '⚠️ ลงทะเบียนไม่สำเร็จ';
          break;
      }

      Alert.alert(title, message, buttons);
    } finally {
      setIsLoading(false);
    }
  };

  const retakePhoto = () => {
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>ลงทะเบียนใบหน้า</Text>
          <Text style={styles.subtitle}>
            กรอกชื่อของคุณเพื่อลงทะเบียน
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
          <TouchableOpacity
            style={styles.retakeButton}
            onPress={retakePhoto}
          >
            <Text style={styles.retakeButtonText}>📷 ถ่ายใหม่</Text>
          </TouchableOpacity>
        </View>

        {/* Username input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>ชื่อผู้ใช้งาน</Text>
          <TextInput
            style={styles.textInput}
            placeholder="กรอกชื่อของคุณ"
            placeholderTextColor="#666"
            value={username}
            onChangeText={handleUsernameChange}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
          />
        </View>

        {/* Register button */}
        <TouchableOpacity
          style={[styles.registerButton, isLoading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#1a1a2e" />
          ) : (
            <Text style={styles.registerButtonText}>ลงทะเบียน</Text>
          )}
        </TouchableOpacity>

        {/* Back to home */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Home')}
          disabled={isLoading}
        >
          <Text style={styles.backButtonText}>กลับหน้าหลัก</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  faceImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 4,
    borderColor: '#00ff88',
  },
  noImageContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
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
  retakeButton: {
    marginTop: 15,
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#2d2d44',
    borderRadius: 20,
  },
  retakeButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  inputContainer: {
    marginBottom: 25,
  },
  inputLabel: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 10,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#fff',
    borderWidth: 2,
    borderColor: '#3d3d5c',
  },
  registerButton: {
    backgroundColor: '#00ff88',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonDisabled: {
    backgroundColor: '#00aa5c',
    opacity: 0.7,
  },
  registerButtonText: {
    color: '#1a1a2e',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#aaa',
    fontSize: 16,
  },
});
