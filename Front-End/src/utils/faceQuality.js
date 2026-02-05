/**
 * Face Quality Validation Utilities
 * Uses ML Kit Face Detection results to validate face quality
 */

// Quality thresholds
const QUALITY_THRESHOLDS = {
  // Head angle thresholds (in degrees)
  MAX_HEAD_EULER_Y: 15, // Left/Right rotation
  MAX_HEAD_EULER_Z: 15, // Tilt
  MAX_HEAD_EULER_X: 15, // Up/Down
  
  // Minimum face size relative to frame
  MIN_FACE_SIZE_RATIO: 0.15,
  MAX_FACE_SIZE_RATIO: 0.85,
  
  // Eye open probability
  MIN_EYE_OPEN_PROBABILITY: 0.5,
  
  // Smile probability (optional, for liveness)
  MIN_SMILE_PROBABILITY: 0.0,
};

/**
 * Check if face is looking straight at camera
 * @param {object} face - ML Kit face detection result
 * @returns {{passed: boolean, message: string}}
 */
export const checkFaceAngle = (face) => {
  const { yawAngle, rollAngle, pitchAngle } = face;
  
  // Check yaw (left/right rotation)
  if (Math.abs(yawAngle) > QUALITY_THRESHOLDS.MAX_HEAD_EULER_Y) {
    const direction = yawAngle > 0 ? 'ซ้าย' : 'ขวา';
    return {
      passed: false,
      message: `กรุณาหันหน้าตรง (หน้าเอียงไป${direction}มากเกินไป)`,
    };
  }
  
  // Check roll (head tilt)
  if (Math.abs(rollAngle) > QUALITY_THRESHOLDS.MAX_HEAD_EULER_Z) {
    const direction = rollAngle > 0 ? 'ขวา' : 'ซ้าย';
    return {
      passed: false,
      message: `กรุณาตั้งหน้าตรง (หน้าเอียงไป${direction})`,
    };
  }
  
  // Check pitch (up/down)
  if (pitchAngle !== undefined && Math.abs(pitchAngle) > QUALITY_THRESHOLDS.MAX_HEAD_EULER_X) {
    const direction = pitchAngle > 0 ? 'บน' : 'ล่าง';
    return {
      passed: false,
      message: `กรุณาหันหน้าตรง (หน้าก้มไป${direction}มากเกินไป)`,
    };
  }
  
  return { passed: true, message: 'มุมหน้าผ่าน' };
};

/**
 * Check if face size is appropriate
 * @param {object} face - ML Kit face detection result
 * @param {number} frameWidth - Camera frame width
 * @param {number} frameHeight - Camera frame height
 * @returns {{passed: boolean, message: string}}
 */
export const checkFaceSize = (face, frameWidth, frameHeight) => {
  const { bounds } = face;
  const faceArea = bounds.width * bounds.height;
  const frameArea = frameWidth * frameHeight;
  const faceRatio = faceArea / frameArea;
  
  if (faceRatio < QUALITY_THRESHOLDS.MIN_FACE_SIZE_RATIO) {
    return {
      passed: false,
      message: 'กรุณาเข้าใกล้กล้องมากขึ้น',
    };
  }
  
  if (faceRatio > QUALITY_THRESHOLDS.MAX_FACE_SIZE_RATIO) {
    return {
      passed: false,
      message: 'กรุณาถอยห่างจากกล้อง',
    };
  }
  
  return { passed: true, message: 'ขนาดใบหน้าผ่าน' };
};

/**
 * Check if eyes are open
 * @param {object} face - ML Kit face detection result
 * @returns {{passed: boolean, message: string}}
 */
export const checkEyesOpen = (face) => {
  const { leftEyeOpenProbability, rightEyeOpenProbability } = face;
  
  // If probabilities are not available, skip this check
  if (leftEyeOpenProbability === undefined || rightEyeOpenProbability === undefined) {
    return { passed: true, message: 'ไม่สามารถตรวจสอบดวงตาได้' };
  }
  
  if (leftEyeOpenProbability < QUALITY_THRESHOLDS.MIN_EYE_OPEN_PROBABILITY ||
      rightEyeOpenProbability < QUALITY_THRESHOLDS.MIN_EYE_OPEN_PROBABILITY) {
    return {
      passed: false,
      message: 'กรุณาลืมตาให้เต็มที่',
    };
  }
  
  return { passed: true, message: 'ดวงตาเปิดผ่าน' };
};

/**
 * Check if face is centered in frame
 * @param {object} face - ML Kit face detection result
 * @param {number} frameWidth - Camera frame width
 * @param {number} frameHeight - Camera frame height
 * @returns {{passed: boolean, message: string}}
 */
export const checkFaceCentered = (face, frameWidth, frameHeight) => {
  const { bounds } = face;
  const faceCenterX = bounds.x + bounds.width / 2;
  const faceCenterY = bounds.y + bounds.height / 2;
  const frameCenterX = frameWidth / 2;
  const frameCenterY = frameHeight / 2;
  
  const toleranceX = frameWidth * 0.2;
  const toleranceY = frameHeight * 0.2;
  
  if (Math.abs(faceCenterX - frameCenterX) > toleranceX) {
    const direction = faceCenterX > frameCenterX ? 'ซ้าย' : 'ขวา';
    return {
      passed: false,
      message: `กรุณาขยับหน้าไป${direction}`,
    };
  }
  
  if (Math.abs(faceCenterY - frameCenterY) > toleranceY) {
    const direction = faceCenterY > frameCenterY ? 'บน' : 'ล่าง';
    return {
      passed: false,
      message: `กรุณาขยับหน้าไป${direction}`,
    };
  }
  
  return { passed: true, message: 'ตำแหน่งใบหน้าผ่าน' };
};

/**
 * Validate overall face quality
 * @param {object} face - ML Kit face detection result
 * @param {number} frameWidth - Camera frame width
 * @param {number} frameHeight - Camera frame height
 * @returns {{passed: boolean, message: string, details: object}}
 */
export const validateFaceQuality = (face, frameWidth, frameHeight) => {
  if (!face) {
    return {
      passed: false,
      message: 'ไม่พบใบหน้า กรุณาให้หน้าอยู่ในกรอบ',
      details: {},
    };
  }
  
  const checks = {
    angle: checkFaceAngle(face),
    size: checkFaceSize(face, frameWidth, frameHeight),
    eyes: checkEyesOpen(face),
    centered: checkFaceCentered(face, frameWidth, frameHeight),
  };
  
  // Find first failed check
  for (const [key, result] of Object.entries(checks)) {
    if (!result.passed) {
      return {
        passed: false,
        message: result.message,
        details: checks,
      };
    }
  }
  
  return {
    passed: true,
    message: 'คุณภาพใบหน้าผ่าน! กดปุ่มถ่ายรูป',
    details: checks,
  };
};

/**
 * Calculate crop bounds for face with padding
 * @param {object} face - ML Kit face detection result
 * @param {number} frameWidth - Original image width
 * @param {number} frameHeight - Original image height
 * @param {number} targetSize - Target output size (default 112)
 * @param {number} paddingRatio - Padding around face (default 0.3)
 * @returns {{x: number, y: number, width: number, height: number}}
 */
export const calculateCropBounds = (face, frameWidth, frameHeight, targetSize = 112, paddingRatio = 0.3) => {
  const { bounds } = face;
  
  // Add padding around the face
  const padding = Math.max(bounds.width, bounds.height) * paddingRatio;
  
  let x = bounds.x - padding;
  let y = bounds.y - padding;
  let size = Math.max(bounds.width, bounds.height) + padding * 2;
  
  // Make it square
  if (bounds.width > bounds.height) {
    y -= (bounds.width - bounds.height) / 2;
  } else {
    x -= (bounds.height - bounds.width) / 2;
  }
  
  // Ensure bounds are within frame
  x = Math.max(0, x);
  y = Math.max(0, y);
  
  // Adjust size if it exceeds frame boundaries
  if (x + size > frameWidth) {
    size = frameWidth - x;
  }
  if (y + size > frameHeight) {
    size = frameHeight - y;
  }
  
  return {
    originX: x,
    originY: y,
    width: size,
    height: size,
  };
};

export default {
  validateFaceQuality,
  calculateCropBounds,
  checkFaceAngle,
  checkFaceSize,
  checkEyesOpen,
  checkFaceCentered,
};
