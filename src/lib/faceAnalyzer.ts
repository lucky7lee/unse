import {
  FaceLandmarker,
  FilesetResolver,
  NormalizedLandmark,
  Category,
} from '@mediapipe/tasks-vision';
import {
  ExpressionType,
  EyebrowShapeType,
  EyeTiltType,
  FaceMetrics,
  FaceShapeType,
  NoseType,
  SamjeongRatio,
} from '../types/fortune';

const WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

let videoLandmarker: FaceLandmarker | null = null;
let imageLandmarker: FaceLandmarker | null = null;
let loadingPromise: Promise<FaceLandmarker> | null = null;

async function createLandmarker(runningMode: 'VIDEO' | 'IMAGE'): Promise<FaceLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(WASM_URL);
  try {
    return await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: 'GPU',
      },
      outputFaceBlendshapes: true,
      runningMode,
      numFaces: 1,
    });
  } catch {
    // 모바일 GPU delegate 불가 시 CPU로 안전 폴백
    return await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: 'CPU',
      },
      outputFaceBlendshapes: true,
      runningMode,
      numFaces: 1,
    });
  }
}

export async function getVideoFaceLandmarker(): Promise<FaceLandmarker> {
  if (videoLandmarker) return videoLandmarker;
  if (!loadingPromise) {
    loadingPromise = createLandmarker('VIDEO').then((instance) => {
      videoLandmarker = instance;
      return instance;
    });
  }
  return loadingPromise;
}

export async function getImageFaceLandmarker(): Promise<FaceLandmarker> {
  if (imageLandmarker) return imageLandmarker;
  imageLandmarker = await createLandmarker('IMAGE');
  return imageLandmarker;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function pt(lm: NormalizedLandmark, w: number, h: number) {
  return { x: lm.x * w, y: lm.y * h };
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getBlendshape(categories: Category[] | undefined, name: string): number {
  if (!categories) return 0;
  const found = categories.find((c) => c.categoryName === name);
  return found ? found.score : 0;
}

export interface FaceFrontalStatus {
  isFrontal: boolean;
  message: string;
}

export function checkIsFaceFrontal(
  landmarks: NormalizedLandmark[]
): FaceFrontalStatus {
  if (!landmarks || landmarks.length < 468) {
    return { isFrontal: false, message: '얼굴을 찾는 중입니다...' };
  }

  const noseTip = landmarks[1];
  const glabella = landmarks[9];
  const chin = landmarks[152];
  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];
  const leftEyeOuter = landmarks[33];
  const rightEyeOuter = landmarks[263];

  // 1. 위치 검사 (화면 중앙 부근에 위치해야 함)
  if (noseTip.x < 0.22 || noseTip.x > 0.78 || noseTip.y < 0.2 || noseTip.y > 0.8) {
    return { isFrontal: false, message: '얼굴을 화면 중앙에 맞춰주세요' };
  }

  // 2. 크기 검사 (너무 멀리 있으면 안 됨)
  const faceHeightNorm = Math.hypot(chin.x - landmarks[10].x, chin.y - landmarks[10].y);
  if (faceHeightNorm < 0.25) {
    return { isFrontal: false, message: '카메라에 조금 더 가까이 다가와 주세요' };
  }

  // 3. 좌우 회전 (Yaw) 검사
  const distL = Math.abs(noseTip.x - leftCheek.x);
  const distR = Math.abs(rightCheek.x - noseTip.x);
  const yawRatio = distL / Math.max(0.0001, distR);
  if (yawRatio < 0.68 || yawRatio > 1.48) {
    return { isFrontal: false, message: '고개를 화면 정면으로 똑바로 돌려주세요' };
  }

  // 4. 기울기 (Roll) 검사
  const eyeDy = rightEyeOuter.y - leftEyeOuter.y;
  const eyeDx = rightEyeOuter.x - leftEyeOuter.x;
  const rollDeg = Math.abs((Math.atan2(eyeDy, eyeDx) * 180) / Math.PI);
  // 양안 각도는 0도(또는 180도)에 가까워야 함
  const tiltFromHorizon = Math.min(rollDeg, Math.abs(180 - rollDeg));
  if (tiltFromHorizon > 12) {
    return { isFrontal: false, message: '고개를 반듯하게 세워주세요' };
  }

  // 5. 상하 회전 (Pitch) 검사
  const upperY = Math.abs(glabella.y - noseTip.y);
  const lowerY = Math.abs(chin.y - noseTip.y);
  const pitchRatio = upperY / Math.max(0.0001, lowerY);
  if (pitchRatio < 0.4 || pitchRatio > 1.8) {
    return { isFrontal: false, message: '턱을 너무 들거나 숙이지 말고 정면을 봐주세요' };
  }

  return { isFrontal: true, message: '정면 포착 완료! 3초간 유지해 주세요' };
}

export function extractFaceMetrics(
  landmarks: NormalizedLandmark[],
  blendshapes: Category[] | undefined,
  width: number,
  height: number,
  snapshotDataUrl?: string
): FaceMetrics {
  const p = (idx: number) => pt(landmarks[idx], width, height);

  const foreheadTop = p(10);
  const chinBottom = p(152);
  const glabella = p(9);
  const noseBase = p(2);
  const noseTip = p(1);
  const leftCheek = p(234);
  const rightCheek = p(454);
  const leftJaw = p(172);
  const rightJaw = p(397);
  const leftTemple = p(54);
  const rightTemple = p(284);
  const leftNoseWing = p(129);
  const rightNoseWing = p(358);

  const leftEyeInner = p(133);
  const leftEyeOuter = p(33);
  const rightEyeInner = p(362);
  const rightEyeOuter = p(263);

  const leftBrowInner = p(107);
  const leftBrowMid = p(105);
  const leftBrowOuter = p(70);
  const rightBrowInner = p(336);
  const rightBrowMid = p(334);
  const rightBrowOuter = p(300);

  const eyeLineAngle = Math.atan2(
    rightEyeInner.y - leftEyeInner.y,
    rightEyeInner.x - leftEyeInner.x
  );

  // 1. 얼굴 크기 및 비율
  const rawUpperH = dist(foreheadTop, glabella) * 1.18;
  const middleH = dist(glabella, noseBase);
  const lowerH = dist(noseBase, chinBottom);
  const totalH = Math.max(1, rawUpperH + middleH + lowerH);

  const cheekWidth = Math.max(1, dist(leftCheek, rightCheek));
  const jawWidth = dist(leftJaw, rightJaw);
  const foreheadWidth = dist(leftTemple, rightTemple);

  const faceRatioWH = Number((cheekWidth / totalH).toFixed(2));
  const jawToCheekRatio = Number((jawWidth / cheekWidth).toFixed(2));
  const foreheadToCheekRatio = Number((foreheadWidth / cheekWidth).toFixed(2));

  // 3개 구역 (이마 / 코·눈 / 턱·입) 비율
  const upperPct = Math.round((rawUpperH / totalH) * 100);
  const middlePct = Math.round((middleH / totalH) * 100);
  const lowerPct = Math.max(10, 100 - upperPct - middlePct);

  let dominant: SamjeongRatio['dominant'] = '균형';
  if (Math.max(upperPct, middlePct, lowerPct) - Math.min(upperPct, middlePct, lowerPct) >= 7) {
    if (upperPct >= middlePct && upperPct >= lowerPct) dominant = '이마';
    else if (middlePct >= upperPct && middlePct >= lowerPct) dominant = '코·눈';
    else dominant = '턱·입';
  }

  const samjeong: SamjeongRatio = {
    upper: upperPct,
    middle: middlePct,
    lower: lowerPct,
    dominant,
  };

  // 2. 얼굴형 판별
  let faceShape: FaceShapeType = '계란형';
  if (faceRatioWH >= 0.87) {
    faceShape = jawToCheekRatio >= 0.8 ? '각진형' : '둥근형';
  } else if (faceRatioWH <= 0.72) {
    faceShape = '긴형';
  } else if (jawToCheekRatio >= 0.82) {
    faceShape = '각진형';
  } else if (jawToCheekRatio <= 0.7 && foreheadToCheekRatio >= 0.84) {
    faceShape = '역삼각형';
  } else if (jawToCheekRatio <= 0.73 && foreheadToCheekRatio >= 0.8) {
    faceShape = '하트형';
  } else {
    faceShape = '계란형';
  }

  // 3. 눈꼬리 각도
  const leftVecAngle =
    Math.atan2(leftEyeInner.y - leftEyeOuter.y, leftEyeInner.x - leftEyeOuter.x) -
    eyeLineAngle;
  const rightVecAngle =
    Math.atan2(rightEyeOuter.y - rightEyeInner.y, rightEyeOuter.x - rightEyeInner.x) -
    eyeLineAngle;
  const leftDeg = (leftVecAngle * 180) / Math.PI;
  const rightDeg = (-rightVecAngle * 180) / Math.PI;
  const eyeTiltDeg = Number(((leftDeg + rightDeg) / 2).toFixed(1));

  let eyeTilt: EyeTiltType = '안정되고 편안한 수평 눈매';
  if (eyeTiltDeg >= 3.2) {
    eyeTilt = '자신감 있고 매력적인 눈매';
  } else if (eyeTiltDeg <= -2.0) {
    eyeTilt = '선하고 부드러운 순한 눈매';
  }

  // 4. 눈썹 형태
  const leftArchHeight =
    (leftBrowInner.y + leftBrowOuter.y) / 2 - leftBrowMid.y;
  const rightArchHeight =
    (rightBrowInner.y + rightBrowOuter.y) / 2 - rightBrowMid.y;
  const avgArchRatio = ((leftArchHeight + rightArchHeight) / 2) / cheekWidth;

  const leftBrowSlope = (leftBrowInner.y - leftBrowOuter.y) / cheekWidth;
  const rightBrowSlope = (rightBrowInner.y - rightBrowOuter.y) / cheekWidth;
  const avgBrowSlope = (leftBrowSlope + rightBrowSlope) / 2;

  let eyebrowShape: EyebrowShapeType = '반듯하고 곧은 일자 눈썹';
  if (avgBrowSlope > 0.032) {
    eyebrowShape = '자신감 넘치는 상승형 눈썹';
  } else if (avgArchRatio > 0.036) {
    eyebrowShape = '부드러운 아치형 눈썹';
  } else if (avgBrowSlope < -0.015) {
    eyebrowShape = '순하고 원만한 완만 눈썹';
  }

  // 5. 코 비율
  const noseWidth = dist(leftNoseWing, rightNoseWing);
  const noseLength = dist(glabella, noseTip);
  const noseWidthRatio = noseWidth / cheekWidth;
  const noseLengthRatio = noseLength / totalH;

  let noseType: NoseType = '균형 잡힌 단정한 코 (안정형)';
  if (noseWidthRatio >= 0.255) {
    noseType = '도톰하고 듬직한 코 (재물 저장형)';
  } else if (noseLengthRatio >= 0.285) {
    noseType = '오똑하고 곧은 코 (명예·실속형)';
  }

  // 6. 표정 및 감정 점수
  const smileL = getBlendshape(blendshapes, 'mouthSmileLeft');
  const smileR = getBlendshape(blendshapes, 'mouthSmileRight');
  const cheekSquint =
    (getBlendshape(blendshapes, 'cheekSquintLeft') +
      getBlendshape(blendshapes, 'cheekSquintRight')) /
    2;
  const browDown =
    (getBlendshape(blendshapes, 'browDownLeft') +
      getBlendshape(blendshapes, 'browDownRight')) /
    2;
  const browUp =
    (getBlendshape(blendshapes, 'browInnerUp') +
      getBlendshape(blendshapes, 'browOuterUpLeft') +
      getBlendshape(blendshapes, 'browOuterUpRight')) /
    3;
  const frown =
    (getBlendshape(blendshapes, 'mouthFrownLeft') +
      getBlendshape(blendshapes, 'mouthFrownRight')) /
    2;
  const eyeWide =
    (getBlendshape(blendshapes, 'eyeWideLeft') +
      getBlendshape(blendshapes, 'eyeWideRight')) /
    2;
  const eyeBlink =
    (getBlendshape(blendshapes, 'eyeBlinkLeft') +
      getBlendshape(blendshapes, 'eyeBlinkRight')) /
    2;
  const jawOpen = getBlendshape(blendshapes, 'jawOpen');

  const rawSmile = (smileL + smileR) / 2;
  const smileScore = clamp(
    Math.round(rawSmile * 115 + cheekSquint * 25 + 12 - frown * 20),
    5,
    99
  );
  const tensionScore = clamp(
    Math.round(browDown * 90 + frown * 55 + 15 - rawSmile * 20),
    5,
    95
  );
  const vitalityScore = clamp(
    Math.round(
      62 +
        rawSmile * 28 +
        eyeWide * 22 +
        browUp * 15 -
        eyeBlink * 35 -
        browDown * 18
    ),
    35,
    99
  );

  let expression: ExpressionType = '차분하고 안정된 표정';
  if (smileScore >= 72) {
    expression = '밝고 환한 미소';
  } else if (smileScore >= 46) {
    expression = '온화하고 편안한 미소';
  } else if (jawOpen > 0.22 || browUp > 0.35) {
    expression = '생기 있고 호기심 어린 표정';
  } else if (tensionScore >= 52) {
    expression = '진지하고 또렷한 집중';
  } else if (eyeBlink > 0.42 || frown > 0.32) {
    expression = '살짝 피곤하거나 굳은 표정';
  }

  // 7. 좌우 균형도 및 기타 기운 지수
  const centerX = (glabella.x + noseTip.x + chinBottom.x) / 3;
  const leftDist = Math.abs(centerX - leftCheek.x);
  const rightDist = Math.abs(rightCheek.x - centerX);
  const cheekSym = 1 - Math.abs(leftDist - rightDist) / Math.max(1, leftDist + rightDist);
  const smileSym = 1 - Math.abs(smileL - smileR);
  const symmetryScore = clamp(Math.round((cheekSym * 0.65 + smileSym * 0.35) * 100), 62, 99);

  const wealthZoneScore = clamp(
    Math.round(
      65 +
        (noseWidthRatio - 0.22) * 190 +
        (middlePct >= 30 && middlePct <= 38 ? 10 : 4) +
        (smileScore > 50 ? 6 : 0)
    ),
    58,
    98
  );

  const charmScore = clamp(
    Math.round(
      60 +
        smileScore * 0.26 +
        (eyeTiltDeg > 1.5 ? 9 : 4) +
        (faceShape === '계란형' || faceShape === '하트형' ? 7 : 4)
    ),
    56,
    99
  );

  return {
    smileScore,
    vitalityScore,
    symmetryScore,
    wealthZoneScore,
    charmScore,
    tensionScore,
    faceShape,
    faceRatioWH,
    jawToCheekRatio,
    foreheadToCheekRatio,
    samjeong,
    expression,
    eyebrowShape,
    eyeTilt,
    eyeTiltDeg,
    noseType,
    capturedAt: new Date().toISOString(),
    snapshotDataUrl,
  };
}

const FACE_OVAL_INDICES = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379,
  378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127,
  162, 21, 54, 103, 67, 109, 10,
];

export function drawMysticalOverlay(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
  scanProgress: number, // 0 ~ 1
  isFrontal: boolean,
  isMirrored: boolean
) {
  ctx.clearRect(0, 0, width, height);
  ctx.save();

  const mapX = (nx: number) => (isMirrored ? (1 - nx) * width : nx * width);
  const mapY = (ny: number) => ny * height;

  // 1. 얼굴 윤곽선
  ctx.beginPath();
  FACE_OVAL_INDICES.forEach((idx, i) => {
    const lm = landmarks[idx];
    const x = mapX(lm.x);
    const y = mapY(lm.y);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();

  if (isFrontal) {
    ctx.strokeStyle = 'rgba(250, 228, 158, 0.85)';
    ctx.lineWidth = 2.4;
    ctx.shadowColor = 'rgba(212, 175, 55, 0.7)';
    ctx.shadowBlur = 12;
  } else {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.6;
    ctx.shadowBlur = 0;
  }
  ctx.stroke();

  // 2. 가로 가이드선 (이마, 눈썹, 코끝)
  ctx.shadowBlur = 0;
  const leftC = mapX(landmarks[234].x);
  const rightC = mapX(landmarks[454].x);
  const minX = Math.min(leftC, rightC) - 8;
  const maxX = Math.max(leftC, rightC) + 8;
  const glabellaY = mapY(landmarks[9].y);
  const noseBaseY = mapY(landmarks[2].y);

  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = isFrontal
    ? 'rgba(247, 225, 153, 0.5)'
    : 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1.2;

  [glabellaY, noseBaseY].forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(minX, y);
    ctx.lineTo(maxX, y);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  // 3. 스캔 빔 애니메이션 (정면일 때만)
  if (isFrontal) {
    const topY = mapY(landmarks[10].y) - 10;
    const botY = mapY(landmarks[152].y) + 10;
    const sweepPhase = (Date.now() % 1600) / 1600;
    const sweepY = topY + (botY - topY) * Math.sin(sweepPhase * Math.PI);

    const grad = ctx.createLinearGradient(minX, sweepY - 12, minX, sweepY + 12);
    grad.addColorStop(0, 'rgba(212, 175, 55, 0)');
    grad.addColorStop(0.5, 'rgba(255, 235, 160, 0.85)');
    grad.addColorStop(1, 'rgba(212, 175, 55, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(minX, sweepY - 12, maxX - minX, 24);
  }

  // 4. 스캔 진행도 원형 링
  if (scanProgress > 0) {
    const cx = mapX(landmarks[1].x);
    const cy = (mapY(landmarks[10].y) + mapY(landmarks[152].y)) / 2;
    const r = Math.max(maxX - minX, mapY(landmarks[152].y) - mapY(landmarks[10].y)) * 0.58;

    // 배경 트랙
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 4;
    ctx.stroke();

    // 채움 아크
    ctx.beginPath();
    ctx.arc(
      cx,
      cy,
      r,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * clamp(scanProgress, 0, 1)
    );
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(253, 230, 138, 0.8)';
    ctx.shadowBlur = 10;
    ctx.stroke();
  }

  ctx.restore();
}

export function createDemoFaceMetrics(): FaceMetrics {
  return {
    smileScore: 82,
    vitalityScore: 88,
    symmetryScore: 92,
    wealthZoneScore: 86,
    charmScore: 85,
    tensionScore: 18,
    faceShape: '계란형',
    faceRatioWH: 0.78,
    jawToCheekRatio: 0.74,
    foreheadToCheekRatio: 0.82,
    samjeong: {
      upper: 33,
      middle: 35,
      lower: 32,
      dominant: '균형',
    },
    expression: '밝고 환한 미소',
    eyebrowShape: '부드러운 아치형 눈썹',
    eyeTilt: '자신감 있고 매력적인 눈매',
    eyeTiltDeg: 3.5,
    noseType: '도톰하고 듬직한 코 (재물 저장형)',
    capturedAt: new Date().toISOString(),
    isDemo: true,
  };
}
