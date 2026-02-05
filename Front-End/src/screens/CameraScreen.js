import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Image,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CAMERA_HEIGHT = SCREEN_HEIGHT * 0.65;

export default function CameraScreen({ navigation, route }) {
  const { mode = 'register' } = route.params || {};
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);

  const takePhoto = async () => {
    if (!cameraRef.current || isProcessing) {
      return;
    }

    setIsProcessing(true);

    try {
      // Take photo
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        base64: false,
      });

      // Resize image for better performance
      const resizedImage = await ImageManipulator.manipulateAsync(
        photo.uri,
        [
          {
            resize: {
              width: 640,
            },
          },
        ],
        {
          compress: 0.9,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      setCapturedImage(resizedImage.uri);
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถถ่ายรูปได้ กรุณาลองใหม่');
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmPhoto = () => {
    if (!capturedImage) return;

    // Navigate based on mode
    if (mode === 'register') {
      navigation.navigate('Register', { imageUri: capturedImage });
    } else {
      // ส่ง action และ username ไปด้วย
      const action = mode === 'checkIn' ? 'check_in' : 'check_out';
      const username = route.params?.username || '';
      navigation.navigate('CheckInOut', { imageUri: capturedImage, action, username });
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#00ff88" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>กรุณาอนุญาตการใช้งานกล้อง</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>ขออนุญาตใช้กล้อง</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show preview if image captured
  if (capturedImage) {
    return (
      <View style={styles.container}>
        <View style={styles.previewContainer}>
          <Image
            source={{ uri: capturedImage }}
            style={styles.previewImage}
            resizeMode="cover"
          />
        </View>

        <View style={styles.previewInfo}>
          <Text style={styles.previewTitle}>ตรวจสอบรูปภาพ</Text>
          <Text style={styles.previewText}>
            กรุณาตรวจสอบว่ารูปถ่ายชัดเจน{'\n'}
            และเห็นใบหน้าครบถ้วน
          </Text>
        </View>

        <View style={styles.previewButtons}>
          <TouchableOpacity
            style={styles.retakeButton}
            onPress={retakePhoto}
          >
            <Text style={styles.retakeButtonText}>📷 ถ่ายใหม่</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.confirmButton}
            onPress={confirmPhoto}
          >
            <Text style={styles.confirmButtonText}>✓ ใช้รูปนี้</Text>
          </TouchableOpacity>
        </View>

        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← กลับ</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="front"
        />
        
        {/* Face guide overlay */}
        <View style={styles.overlay}>
          <View style={styles.faceGuide}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        </View>
      </View>

      {/* Status message */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          จัดใบหน้าให้อยู่ในกรอบ แล้วกดถ่ายรูป
        </Text>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionTitle}>
          {mode === 'register' ? 'ลงทะเบียนใบหน้า' : 'เช็คอิน/เช็คเอาท์'}
        </Text>
        <Text style={styles.instructionText}>
          • หันหน้าตรง{'\n'}
          • ให้แสงส่องหน้าชัดเจน{'\n'}
          • ไม่สวมหมวกหรือแว่นกันแดด
        </Text>
      </View>

      {/* Capture button */}
      <View style={styles.captureContainer}>
        <TouchableOpacity
          style={styles.captureButton}
          onPress={takePhoto}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#1a1a2e" size="large" />
          ) : (
            <View style={styles.captureInner} />
          )}
        </TouchableOpacity>
      </View>

      {/* Back button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>← กลับ</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraContainer: {
    height: CAMERA_HEIGHT,
    width: SCREEN_WIDTH,
    overflow: 'hidden',
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceGuide: {
    width: 220,
    height: 280,
    borderRadius: 110,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#00ff88',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 20,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 20,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 20,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 20,
  },
  statusContainer: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#16213e',
    width: '100%',
  },
  statusText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
    color: '#00ff88',
  },
  instructionsContainer: {
    padding: 15,
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 13,
    color: '#ccc',
    lineHeight: 20,
  },
  captureContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 75,
    height: 75,
    borderRadius: 40,
    backgroundColor: '#00ff88',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  captureInner: {
    width: 55,
    height: 55,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  permissionText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#00ff88',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    padding: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Preview styles
  previewContainer: {
    height: CAMERA_HEIGHT,
    width: SCREEN_WIDTH,
    overflow: 'hidden',
  },
  previewImage: {
    flex: 1,
    transform: [{ scaleX: -1 }], // Mirror for selfie
  },
  previewInfo: {
    padding: 20,
    alignItems: 'center',
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  previewText: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 22,
  },
  previewButtons: {
    flexDirection: 'row',
    gap: 20,
    paddingHorizontal: 20,
    marginTop: 10,
  },
  retakeButton: {
    flex: 1,
    backgroundColor: '#2d2d44',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  retakeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#00ff88',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#1a1a2e',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
