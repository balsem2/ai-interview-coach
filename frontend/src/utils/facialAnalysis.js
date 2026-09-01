/**
 * Enhanced Facial Analysis Module
 * Provides detailed webcam indicators for interview quality assessment
 * 
 * Features:
 * - Precise eye contact with iris detection
 * - Real-time posture analysis
 * - Facial expression recognition (smile detection)
 * - Lighting quality assessment
 * - Audio-visual synchronization detection
 */

/**
 * Calculate Eye Aspect Ratio (EAR) from eye landmarks
 * Used to detect if eyes are open or closed
 * 
 * @param {Array} landmarks - MediaPipe face landmarks
 * @param {string} eye - 'left' or 'right'
 * @returns {number} Eye aspect ratio (0-1, where < 0.15 means closed)
 */
export const calculateEyeAspectRatio = (landmarks, eye = 'right') => {
  // Right eye landmarks: [33, 160, 158, 133, 153, 144]
  // Left eye landmarks: [263, 249, 390, 373, 374, 380]
  
  const eyeLandmarks = eye === 'right' 
    ? [33, 160, 158, 133, 153, 144]
    : [263, 249, 390, 373, 374, 380];
  
  if (!landmarks || landmarks.length === 0) return 0;
  
  try {
    const [p1, p2, p3, p4, p5, p6] = eyeLandmarks.map(i => landmarks[i]);
    
    if (!p1 || !p2 || !p3 || !p4 || !p5 || !p6) return 0;
    
    // Calculate distances
    const dist1 = Math.hypot(p2.x - p6.x, p2.y - p6.y);
    const dist2 = Math.hypot(p3.x - p5.x, p3.y - p5.y);
    const dist3 = Math.hypot(p1.x - p4.x, p1.y - p4.y);
    
    // Eye aspect ratio formula
    return (dist1 + dist2) / (2.0 * dist3);
  } catch (e) {
    console.error('Error calculating eye aspect ratio:', e);
    return 0;
  }
};

/**
 * Estimate gaze direction based on eye and iris position
 * 
 * @param {Array} landmarks - MediaPipe face landmarks
 * @returns {Object} { horizontalGaze: -1 to 1, verticalGaze: -1 to 1 }
 */
export const estimateGazeDirection = (landmarks) => {
  try {
    // Eye corners and iris
    const rightEyeLeft = landmarks[33];    // Right eye outer corner
    const rightEyeRight = landmarks[133];  // Right eye inner corner
    const rightEyeTop = landmarks[160];
    const rightEyeBottom = landmarks[158];
    
    const rightIriCenter = landmarks[471]; // Right iris center
    
    if (!rightEyeLeft || !rightEyeRight || !rightEyeTop || !rightEyeBottom || !rightIriCenter) {
      return { horizontal: 0, vertical: 0 };
    }
    
    // Calculate eye bounding box
    const eyeWidth = rightEyeRight.x - rightEyeLeft.x;
    const eyeHeight = rightEyeBottom.y - rightEyeTop.y;
    
    // Calculate iris position relative to eye center
    const irisX = (rightIriCenter.x - (rightEyeLeft.x + eyeWidth / 2)) / (eyeWidth / 2);
    const irisY = (rightIriCenter.y - (rightEyeTop.y + eyeHeight / 2)) / (eyeHeight / 2);
    
    return {
      horizontal: Math.max(-1, Math.min(1, irisX)),
      vertical: Math.max(-1, Math.min(1, irisY))
    };
  } catch (e) {
    console.error('Error estimating gaze direction:', e);
    return { horizontal: 0, vertical: 0 };
  }
};

/**
 * Calculate improved eye contact score based on iris position
 * 
 * @param {Array} landmarks - MediaPipe face landmarks
 * @param {number} videoWidth - Video frame width
 * @param {number} videoHeight - Video frame height
 * @returns {number} Eye contact score (0-100)
 */
export const calculateEnhancedEyeContact = (landmarks, videoWidth, videoHeight) => {
  const gaze = estimateGazeDirection(landmarks);
  
  // Check if eyes are open
  const rightEAR = calculateEyeAspectRatio(landmarks, 'right');
  const leftEAR = calculateEyeAspectRatio(landmarks, 'left');
  const avgEAR = (rightEAR + leftEAR) / 2;
  
  // If eyes are closed, score is 0
  if (avgEAR < 0.15) {
    return 0;
  }
  
  // Calculate gaze center score (looking at camera)
  // Optimal: looking straight ahead (gaze close to 0,0)
  const gazeDistance = Math.hypot(gaze.horizontal, gaze.vertical);
  const gazeCenterScore = Math.max(0, 100 - gazeDistance * 100);
  
  // Factor in head position (should be centered)
  const nose = landmarks[1];
  if (!nose) return gazeCenterScore;
  
  const headCenterX = nose.x;
  const headCenterDistance = Math.abs(headCenterX - 0.5) * 200;
  const headCenterScore = Math.max(0, 100 - headCenterDistance);
  
  // Combine scores
  return Math.round((gazeCenterScore * 0.7 + headCenterScore * 0.3));
};

/**
 * Analyze posture from shoulder and head landmarks
 * 
 * @param {Array} landmarks - MediaPipe face landmarks
 * @returns {Object} { posture: 0-100, headTilt: -30 to 30 degrees, alignment: string }
 */
export const analyzePosture = (landmarks) => {
  try {
    // Head landmarks
    const nose = landmarks[1];
    const leftEar = landmarks[234];
    const rightEar = landmarks[454];
    
    // Shoulder landmarks (optional, use if available)
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    
    if (!nose || !leftEar || !rightEar) {
      return { posture: 50, headTilt: 0, alignment: 'unknown' };
    }
    
    // Calculate head tilt angle
    const earDistance = Math.abs(rightEar.y - leftEar.y);
    const earHorizontalDistance = Math.abs(rightEar.x - leftEar.x);
    const headTilt = Math.atan2(earDistance, earHorizontalDistance) * (180 / Math.PI);
    
    // Normalize to -30 to 30 range
    const normalizedTilt = Math.max(-30, Math.min(30, headTilt - 90));
    
    // Calculate posture score
    const tiltPenalty = Math.abs(normalizedTilt) / 30 * 40; // Up to 40 points penalty
    let postureScore = 100 - tiltPenalty;
    
    // Check shoulder alignment if available
    let alignment = 'neutral';
    if (leftShoulder && rightShoulder) {
      const shoulderDifference = Math.abs(leftShoulder.y - rightShoulder.y);
      if (shoulderDifference > 0.1) {
        postureScore -= 20;
        alignment = shoulderDifference > 0.15 ? 'slouching' : 'tilted';
      } else {
        alignment = 'straight';
      }
    }
    
    return {
      posture: Math.max(0, Math.round(postureScore)),
      headTilt: Math.round(normalizedTilt),
      alignment
    };
  } catch (e) {
    console.error('Error analyzing posture:', e);
    return { posture: 50, headTilt: 0, alignment: 'unknown' };
  }
};

/**
 * Detect facial expressions (smile, frown, neutral)
 * 
 * @param {Array} landmarks - MediaPipe face landmarks
 * @returns {Object} { expression: string, intensity: 0-100, isSmiling: boolean }
 */
export const analyzeFacialExpression = (landmarks) => {
  try {
    // Mouth landmarks
    const mouthTop = landmarks[13];
    const mouthBottom = landmarks[14];
    const mouthLeft = landmarks[61];
    const mouthRight = landmarks[291];
    
    // Eyebrow landmarks for frown detection
    const leftBrow = landmarks[105];
    const rightBrow = landmarks[334];
    
    if (!mouthTop || !mouthBottom || !mouthLeft || !mouthRight) {
      return { expression: 'unknown', intensity: 0, isSmiling: false };
    }
    
    // Calculate mouth opening
    const mouthHeight = Math.abs(mouthBottom.y - mouthTop.y);
    const mouthWidth = Math.abs(mouthRight.x - mouthLeft.x);
    const mouthAspectRatio = mouthHeight / mouthWidth;
    
    // Calculate smile (corner movement)
    const mouthCornerHeight = Math.abs(mouthLeft.y - mouthTop.y) + 
                               Math.abs(mouthRight.y - mouthTop.y);
    const isSmiling = mouthCornerHeight < mouthTop.y && mouthHeight > 0.02;
    
    // Detect frown from eyebrows and mouth corners
    const isFrowning = leftBrow && rightBrow && 
                       (leftBrow.y > rightBrow.y || rightBrow.y > leftBrow.y) &&
                       mouthAspectRatio < 0.3;
    
    let expression = 'neutral';
    let intensity = 0;
    
    if (isSmiling) {
      expression = 'smiling';
      intensity = Math.min(100, Math.round((mouthHeight / 0.05) * 100));
    } else if (isFrowning) {
      expression = 'frowning';
      intensity = 40;
    } else if (mouthHeight > 0.03) {
      expression = 'speaking';
      intensity = 60;
    }
    
    return {
      expression,
      intensity,
      isSmiling,
      isFrowning: isFrowning || false,
      isSpeaking: mouthHeight > 0.03
    };
  } catch (e) {
    console.error('Error analyzing facial expression:', e);
    return { expression: 'unknown', intensity: 0, isSmiling: false };
  }
};

/**
 * Assess lighting quality from face brightness
 * 
 * @param {CanvasImageData} imageData - Canvas image data
 * @param {Array} landmarks - MediaPipe face landmarks
 * @param {number} videoWidth - Video frame width
 * @param {number} videoHeight - Video frame height
 * @returns {Object} { brightness: 0-255, quality: string, recommendation: string }
 */
export const assessLighting = (imageData, landmarks, videoWidth, videoHeight) => {
  try {
    if (!imageData || !landmarks || landmarks.length === 0) {
      return { brightness: 128, quality: 'unknown', recommendation: '' };
    }
    
    // Get face bounding box
    const minX = Math.min(...landmarks.map(p => p.x)) * videoWidth;
    const maxX = Math.max(...landmarks.map(p => p.x)) * videoWidth;
    const minY = Math.min(...landmarks.map(p => p.y)) * videoHeight;
    const maxY = Math.max(...landmarks.map(p => p.y)) * videoHeight;
    
    // Sample brightness from face region (centered pixels only)
    const data = imageData.data;
    const width = imageData.width;
    let totalBrightness = 0;
    let pixelCount = 0;
    
    for (let y = Math.max(0, minY); y < Math.min(videoHeight, maxY); y++) {
      for (let x = Math.max(0, minX); x < Math.min(videoWidth, maxX); x++) {
        const index = (y * width + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        
        // Calculate luminance
        const brightness = (r + g + b) / 3;
        totalBrightness += brightness;
        pixelCount++;
      }
    }
    
    const avgBrightness = pixelCount > 0 ? Math.round(totalBrightness / pixelCount) : 128;
    
    let quality = 'good';
    let recommendation = '';
    
    if (avgBrightness < 60) {
      quality = 'too-dark';
      recommendation = 'Improve lighting - environment is too dark';
    } else if (avgBrightness < 100) {
      quality = 'dim';
      recommendation = 'Consider brightening the environment';
    } else if (avgBrightness > 220) {
      quality = 'overexposed';
      recommendation = 'Reduce glare or move away from bright light sources';
    } else if (avgBrightness > 180) {
      quality = 'bright';
      recommendation = 'Good lighting, slight glare detected';
    }
    
    return {
      brightness: avgBrightness,
      quality,
      recommendation
    };
  } catch (e) {
    console.error('Error assessing lighting:', e);
    return { brightness: 128, quality: 'unknown', recommendation: '' };
  }
};

/**
 * Detect audio-visual synchronization (mouth movement vs audio)
 * 
 * @param {number} audioLevel - Current audio level (0-100)
 * @param {boolean} isMouthOpen - Is mouth open (from expression analysis)
 * @param {number} historyLength - History buffer length
 * @returns {Object} { sync: 0-100, status: string, confidence: 0-100 }
 */
export const detectAudioVisualSync = (audioLevel, isMouthOpen, historyLength = 1) => {
  try {
    let sync = 50; // Default neutral
    let status = 'neutral';
    let confidence = 50;
    
    // Audio present, mouth should be open
    if (audioLevel > 30 && !isMouthOpen) {
      sync = 20;
      status = 'desync';
      confidence = Math.max(50, audioLevel);
    }
    
    // Mouth moving, audio should be present
    if (isMouthOpen && audioLevel < 20) {
      sync = 30;
      status = 'muted';
      confidence = 70;
    }
    
    // Both synchronized
    if ((audioLevel > 30 && isMouthOpen) || (audioLevel < 20 && !isMouthOpen)) {
      sync = 90;
      status = 'synced';
      confidence = Math.max(70, (audioLevel + 50) / 2);
    }
    
    return {
      sync,
      status,
      confidence: Math.round(confidence)
    };
  } catch (e) {
    console.error('Error detecting audio-visual sync:', e);
    return { sync: 50, status: 'unknown', confidence: 0 };
  }
};

/**
 * Generate comprehensive feedback based on all metrics
 * 
 * @param {Object} metrics - All calculated metrics
 * @returns {Array<Object>} Feedback items with priority
 */
export const generateFeedback = (metrics) => {
  const feedback = [];
  
  if (!metrics) return feedback;
  
  const { lighting, posture, expression, eyeContact } = metrics;
  
  // Lighting feedback
  if (lighting?.recommendation) {
    feedback.push({
      priority: 'high',
      type: 'lighting',
      message: lighting.recommendation,
      severity: lighting.quality === 'too-dark' ? 'critical' : 'warning'
    });
  }
  
  // Posture feedback
  if (posture?.posture < 60) {
    feedback.push({
      priority: 'medium',
      type: 'posture',
      message: `Poor posture detected (${posture.alignment}). Sit straight and face the camera.`,
      severity: 'warning'
    });
  }
  
  // Eye contact feedback
  if (eyeContact < 50) {
    feedback.push({
      priority: 'high',
      type: 'eye-contact',
      message: 'Improve eye contact - look at the camera',
      severity: 'warning'
    });
  }
  
  // Expression feedback
  if (expression?.expression === 'neutral' && eyeContact > 70) {
    feedback.push({
      priority: 'low',
      type: 'expression',
      message: 'Try to show more expression and confidence',
      severity: 'info'
    });
  }
  
  return feedback.sort((a, b) => {
    const priorityMap = { high: 0, medium: 1, low: 2 };
    return priorityMap[a.priority] - priorityMap[b.priority];
  });
};

/**
 * Calculate comprehensive interview quality score
 * 
 * @param {Object} metrics - All metrics
 * @returns {Object} { overall: 0-100, breakdown: {...}, status: string }
 */
export const calculateOverallQualityScore = (metrics) => {
  if (!metrics) return { overall: 0, breakdown: {}, status: 'unknown' };
  
  const { eyeContact = 0, posture = 50, expression = {} } = metrics;
  const lighting = metrics.lighting?.quality || 'unknown';
  
  // Weight different components
  let score = 0;
  let components = 0;
  
  if (eyeContact > 0) {
    score += eyeContact * 0.35;
    components += 0.35;
  }
  
  if (posture > 0) {
    score += posture * 0.25;
    components += 0.25;
  }
  
  if (expression?.intensity > 0) {
    score += (expression.intensity * 0.4) * 0.2;
    components += 0.2;
  }
  
  // Lighting penalty
  let lightingScore = 100;
  if (lighting === 'too-dark') lightingScore = 40;
  else if (lighting === 'dim') lightingScore = 70;
  else if (lighting === 'overexposed') lightingScore = 60;
  else if (lighting === 'good') lightingScore = 100;
  
  score += lightingScore * 0.2;
  components += 0.2;
  
  const overall = components > 0 ? Math.round(score / components) : 0;
  
  let status = 'excellent';
  if (overall < 40) status = 'needs-improvement';
  else if (overall < 60) status = 'acceptable';
  else if (overall < 80) status = 'good';
  
  return {
    overall: Math.max(0, Math.min(100, overall)),
    breakdown: {
      eyeContact,
      posture,
      expression: expression?.intensity || 0,
      lighting: lightingScore
    },
    status
  };
};

export default {
  calculateEyeAspectRatio,
  estimateGazeDirection,
  calculateEnhancedEyeContact,
  analyzePosture,
  analyzeFacialExpression,
  assessLighting,
  detectAudioVisualSync,
  generateFeedback,
  calculateOverallQualityScore
};
