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
    // 모바일 일부 기기에서 WebGL GPU delegate 실패 시 CPU로 안전 폴백
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

export function extractFaceMetrics(
  landmarks: NormalizedLandmark[],
  blendshapes: Category[] | undefined,
  width: number,
  height: number,
  snapshotDataUrl?: string
): FaceMetrics {
  const p = (idx: number) => pt(landmarks[idx], width, height);

  // 주요 랜드마크 좌표 (실제 픽셀 비율 보정 적용)
  const foreheadTop = p(10);
  const chinBottom = p(152);
  const glabella = p(9); // 인당(눈썹 사이)
  const noseBase = p(2); // 코밑(인중 시작)
  const noseTip = p(1);
  const leftCheek = p(234);
  const rightCheek = p(454);
  const leftJaw = p(172);
  const rightJaw = p(397);
  const leftTemple = p(54);
  const rightTemple = p(284);
  const leftNoseWing = p(129);
  const rightNoseWing = p(358);

  // 눈 & 눈썹 랜드마크
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

  // 고개 기울기(Roll) 각도 계산해 눈꼬리/눈썹 측정 시 보정
  const eyeLineAngle = Math.atan2(
    rightEyeInner.y - leftEyeInner.y,
    rightEyeInner.x - leftEyeInner.x
  );

  // 1. 얼굴 크기 및 비율
  // MediaPipe 10번은 헤어라인보다 약간 아래인 경우가 많아 상정 보정계수(1.18) 적용
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

  // 삼정(三停) 비율
  const upperPct = Math.round((rawUpperH / totalH) * 100);
  const middlePct = Math.round((middleH / totalH) * 100);
  const lowerPct = Math.max(10, 100 - upperPct - middlePct);

  let dominant: SamjeongRatio['dominant'] = '균형';
  if (Math.max(upperPct, middlePct, lowerPct) - Math.min(upperPct, middlePct, lowerPct) >= 7) {
    if (upperPct >= middlePct && upperPct >= lowerPct) dominant = '상정';
    else if (middlePct >= upperPct && middlePct >= lowerPct) dominant = '중정';
    else dominant = '하정';
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

  // 3. 눈꼬리 각도 (고개 기울기 보정 후 양안 평균)
  // 이미지 좌표는 아래가 +y 이므로, 외안각이 내안각보다 위에 있으면 y가 작음 -> 양수 각도(올라간 눈매)
  const leftVecAngle =
    Math.atan2(leftEyeInner.y - leftEyeOuter.y, leftEyeInner.x - leftEyeOuter.x) -
    eyeLineAngle;
  const rightVecAngle =
    Math.atan2(rightEyeOuter.y - rightEyeInner.y, rightEyeOuter.x - rightEyeInner.x) -
    eyeLineAngle;
  // left: outer -> inner 방향이므로 올라가면 outer.y < inner.y => inner.y - outer.y > 0 (양수)
  // right: inner -> outer 방향이므로 올라가면 outer.y < inner.y => outer.y - inner.y < 0 (음수) -> 부호 반전
  const leftDeg = (leftVecAngle * 180) / Math.PI;
  const rightDeg = (-rightVecAngle * 180) / Math.PI;
  const eyeTiltDeg = Number(((leftDeg + rightDeg) / 2).toFixed(1));

  let eyeTilt: EyeTiltType = '조화로운 수평 눈매';
  if (eyeTiltDeg >= 3.2) {
    eyeTilt = '살짝 올라간 도화·승부 눈매';
  } else if (eyeTiltDeg <= -2.0) {
    eyeTilt = '부드럽게 내려간 선한 눈매';
  }

  // 4. 눈썹 형태 분석
  const leftArchHeight =
    (leftBrowInner.y + leftBrowOuter.y) / 2 - leftBrowMid.y;
  const rightArchHeight =
    (rightBrowInner.y + rightBrowOuter.y) / 2 - rightBrowMid.y;
  const avgArchRatio = ((leftArchHeight + rightArchHeight) / 2) / cheekWidth;

  const leftBrowSlope = (leftBrowInner.y - leftBrowOuter.y) / cheekWidth;
  const rightBrowSlope = (rightBrowInner.y - rightBrowOuter.y) / cheekWidth;
  const avgBrowSlope = (leftBrowSlope + rightBrowSlope) / 2;

  let eyebrowShape: EyebrowShapeType = '곧은 일자형';
  if (avgBrowSlope > 0.032) {
    eyebrowShape = '기세 오른 상승형';
  } else if (avgArchRatio > 0.036) {
    eyebrowShape = '부드러운 아치형';
  } else if (avgBrowSlope < -0.015) {
    eyebrowShape = '순하고 완만한 눈썹';
  }

  // 5. 코(재백궁) 비율 분석
  const noseWidth = dist(leftNoseWing, rightNoseWing);
  const noseLength = dist(glabella, noseTip);
  const noseWidthRatio = noseWidth / cheekWidth;
  const noseLengthRatio = noseLength / totalH;

  let noseType: NoseType = '단정하고 균형 잡힌 코 (안정형)';
  if (noseWidthRatio >= 0.255) {
    noseType = '풍성하고 듬직한 재백궁 (재물 저장형)';
  } else if (noseLengthRatio >= 0.285) {
    noseType = '오똑하고 곧은 준두 (명예·실속형)';
  }

  // 6. 블렌드셰이프 기반 표정 & 감정 수치
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

  let expression: ExpressionType = '차분한 평온 (균형)';
  if (smileScore >= 72) {
    expression = '활짝 웃음 (대길 표정)';
  } else if (smileScore >= 46) {
    expression = '온화한 미소 (밝음)';
  } else if (jawOpen > 0.22 || browUp > 0.35) {
    expression = '호기심 어린 표정 (생동감)';
  } else if (tensionScore >= 52) {
    expression = '진지한 집중 (카리스마)';
  } else if (eyeBlink > 0.42 || frown > 0.32) {
    expression = '살짝 피곤/긴장 (휴식 필요)';
  }

  // 7. 좌우 대칭도 & 관상 종합 지수
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

export function generateLiveCommentary(metrics: FaceMetrics): string[] {
  const lines: string[] = [];

  if (metrics.smileScore >= 72) {
    lines.push(`현재 미소 지수가 ${metrics.smileScore}%! 복이 굴러들어오는 대길 표정이에요 ✨`);
  } else if (metrics.smileScore >= 46) {
    lines.push(`미소 지수 ${metrics.smileScore}% — 입꼬리에 기분 좋은 복기(福氣)가 감도네요`);
  } else if (metrics.tensionScore >= 50) {
    lines.push(`미간에 진지한 카리스마가 잡히네요! 살짝 미소 지어보시면 복이 더 열려요`);
  } else {
    lines.push(`현재 미소 지수 ${metrics.smileScore}% — 차분하고 단정한 기운이 느껴집니다`);
  }

  if (metrics.eyeTiltDeg >= 3.0) {
    lines.push(`오늘 눈꼬리가 살짝 올라간(${metrics.eyeTiltDeg}°) 걸 보니 승부욕과 매력 지수가 상승 중!`);
  } else if (metrics.eyeTiltDeg <= -1.8) {
    lines.push(`눈꼬리가 부드럽게 내려간 선한 눈매! 주변 귀인을 끌어당기는 상이에요`);
  } else {
    lines.push(`눈매의 균형이 안정적이에요 · 눈빛 활력도 ${metrics.vitalityScore}% 측정 완료`);
  }

  lines.push(
    `얼굴형은 '${metrics.faceShape}' · 재백궁(코) 재물 기운 ${metrics.wealthZoneScore}점 포착!`
  );

  lines.push(
    `삼정 비율(상${metrics.samjeong.upper} : 중${metrics.samjeong.middle} : 하${metrics.samjeong.lower})과 눈썹(${metrics.eyebrowShape}) 분석 중...`
  );

  return lines;
}

// 얼굴 윤곽선 랜드마크 시퀀스 (MediaPipe Face Oval)
const FACE_OVAL_INDICES = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379,
  378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127,
  162, 21, 54, 103, 67, 109, 10,
];

const KEY_GWANSANG_POINTS = [
  { idx: 10, label: '천정' },
  { idx: 9, label: '인당' },
  { idx: 1, label: '재백궁' },
  { idx: 33, label: '' },
  { idx: 263, label: '' },
  { idx: 61, label: '' },
  { idx: 291, label: '' },
  { idx: 152, label: '지각' },
];

export function drawMysticalOverlay(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
  scanProgress: number, // 0 ~ 1
  isMirrored: boolean
) {
  ctx.clearRect(0, 0, width, height);
  ctx.save();

  const mapX = (nx: number) => (isMirrored ? (1 - nx) * width : nx * width);
  const mapY = (ny: number) => ny * height;

  // 1. 얼굴 윤곽 황금빛 라인
  ctx.beginPath();
  FACE_OVAL_INDICES.forEach((idx, i) => {
    const lm = landmarks[idx];
    const x = mapX(lm.x);
    const y = mapY(lm.y);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.strokeStyle = 'rgba(245, 208, 106, 0.72)';
  ctx.lineWidth = 2;
  ctx.shadowColor = 'rgba(212, 175, 55, 0.75)';
  ctx.shadowBlur = 10;
  ctx.stroke();

  // 2. 삼정(상정/중정/하정) 수평 가이드선
  ctx.shadowBlur = 0;
  const leftC = mapX(landmarks[234].x);
  const rightC = mapX(landmarks[454].x);
  const minX = Math.min(leftC, rightC) - 10;
  const maxX = Math.max(leftC, rightC) + 10;

  const glabellaY = mapY(landmarks[9].y);
  const noseBaseY = mapY(landmarks[2].y);

  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = 'rgba(247, 225, 153, 0.42)';
  ctx.lineWidth = 1.2;

  [glabellaY, noseBaseY].forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(minX, y);
    ctx.lineTo(maxX, y);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  // 3. 스캔 레이저 빔 애니메이션
  const topY = mapY(landmarks[10].y) - 18;
  const botY = mapY(landmarks[152].y) + 18;
  const sweepPhase = (Date.now() % 1800) / 1800;
  const sweepY = topY + (botY - topY) * Math.sin(sweepPhase * Math.PI);

  const grad = ctx.createLinearGradient(minX, sweepY - 14, minX, sweepY + 14);
  grad.addColorStop(0, 'rgba(212, 175, 55, 0)');
  grad.addColorStop(0.5, 'rgba(255, 232, 156, 0.75)');
  grad.addColorStop(1, 'rgba(212, 175, 55, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(minX, sweepY - 14, maxX - minX, 28);

  // 4. 핵심 관상 혈자리 포인트
  const pulse = 3.2 + Math.sin(Date.now() / 220) * 1.1;
  ctx.font = '600 11px "Noto Sans KR", sans-serif';
  KEY_GWANSANG_POINTS.forEach(({ idx, label }) => {
    const lm = landmarks[idx];
    const x = mapX(lm.x);
    const y = mapY(lm.y);

    ctx.beginPath();
    ctx.arc(x, y, pulse, 0, Math.PI * 2);
    ctx.fillStyle = '#fde68a';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, pulse + 3.5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(253, 230, 138, 0.45)';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (label) {
      ctx.fillStyle = 'rgba(11, 13, 23, 0.72)';
      const tw = ctx.measureText(label).width + 10;
      ctx.fillRect(x + 8, y - 10, tw, 18);
      ctx.fillStyle = '#fde68a';
      ctx.fillText(label, x + 13, y + 3);
    }
  });

  // 5. 스캔 진행도 원형 아크 (얼굴 중심)
  if (scanProgress > 0) {
    const cx = (minX + maxX) / 2;
    const cy = (topY + botY) / 2;
    const r = Math.max(maxX - minX, botY - topY) * 0.58;
    ctx.beginPath();
    ctx.arc(
      cx,
      cy,
      r,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * clamp(scanProgress, 0, 1)
    );
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  ctx.restore();
}

export function createDemoFaceMetrics(): FaceMetrics {
  return {
    smileScore: 82,
    vitalityScore: 87,
    symmetryScore: 91,
    wealthZoneScore: 88,
    charmScore: 86,
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
    expression: '활짝 웃음 (대길 표정)',
    eyebrowShape: '부드러운 아치형',
    eyeTilt: '살짝 올라간 도화·승부 눈매',
    eyeTiltDeg: 4.1,
    noseType: '풍성하고 듬직한 재백궁 (재물 저장형)',
    capturedAt: new Date().toISOString(),
    isDemo: true,
  };
}
