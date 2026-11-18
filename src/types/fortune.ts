export type FaceShapeType =
  | '계란형'
  | '둥근형'
  | '각진형'
  | '긴형'
  | '하트형'
  | '역삼각형';

export type ExpressionType =
  | '활짝 웃음 (대길 표정)'
  | '온화한 미소 (밝음)'
  | '차분한 평온 (균형)'
  | '진지한 집중 (카리스마)'
  | '호기심 어린 표정 (생동감)'
  | '살짝 피곤/긴장 (휴식 필요)';

export type EyebrowShapeType =
  | '부드러운 아치형'
  | '곧은 일자형'
  | '기세 오른 상승형'
  | '순하고 완만한 눈썹';

export type EyeTiltType =
  | '살짝 올라간 도화·승부 눈매'
  | '부드럽게 내려간 선한 눈매'
  | '조화로운 수평 눈매';

export type NoseType =
  | '풍성하고 듬직한 재백궁 (재물 저장형)'
  | '오똑하고 곧은 준두 (명예·실속형)'
  | '단정하고 균형 잡힌 코 (안정형)';

export interface SamjeongRatio {
  upper: number; // 상정 (이마/초년운) %
  middle: number; // 중정 (눈썹~코끝/중년운) %
  lower: number; // 하정 (코끝~턱끝/말년운) %
  dominant: '상정' | '중정' | '하정' | '균형';
}

export interface FaceMetrics {
  // 핵심 수치 (0 ~ 100)
  smileScore: number; // 미소 지수
  vitalityScore: number; // 눈빛/표정 활력도
  symmetryScore: number; // 좌우 대칭 균형도
  wealthZoneScore: number; // 재백궁(코) 기운 지수
  charmScore: number; // 도화/매력 기운 지수
  tensionScore: number; // 미간/표정 긴장도

  // 기하학/관상 분류
  faceShape: FaceShapeType;
  faceRatioWH: number; // 가로/세로 비율
  jawToCheekRatio: number; // 턱/광대 비율
  foreheadToCheekRatio: number; // 이마/광대 비율
  samjeong: SamjeongRatio;
  expression: ExpressionType;
  eyebrowShape: EyebrowShapeType;
  eyeTilt: EyeTiltType;
  eyeTiltDeg: number; // 양수면 올라감, 음수면 내려감
  noseType: NoseType;

  // 캡처 정보
  capturedAt: string;
  snapshotDataUrl?: string;
  isDemo?: boolean;
}

export type FiveElement = '목(木)' | '화(火)' | '토(土)' | '금(金)' | '수(水)';

export interface MyeongriDay {
  dateText: string; // 예: 2026년 11월 18일 (수)
  isoDate: string; // YYYY-MM-DD
  yearGanji: string; // 예: 병오(丙午)년
  dayGanji: string; // 예: 기미(己未)일
  dayStem: string;
  dayBranch: string;
  element: FiveElement;
  elementColor: string;
  elementKeyword: string;
  energySummary: string;
  daySeed: number;
}

export interface FortuneCategory {
  id: 'wealth' | 'love' | 'career' | 'health';
  title: string;
  score: number;
  summary: string;
  detail: string;
}

export interface FortuneResultData {
  title: string; // 예: "웃음 끝에 황금이 맺히는 도화·재복상"
  subtitle: string; // 한줄 요약
  overallScore: number;
  overallReading: string; // 총운 + 관상/명리 융합 풀이
  gwansangPoints: string[]; // 관상 핵심 포인트 3개
  categories: FortuneCategory[];
  lucky: {
    color: string;
    colorHex: string;
    number: string;
    item: string;
    action: string;
    caution: string;
  };
  promptUsed: string;
  source: 'local-engine' | 'gemini-api';
  myeongri: MyeongriDay;
  metrics: FaceMetrics;
}

export interface AppSettings {
  engine: 'local' | 'gemini';
  geminiApiKey: string;
  geminiModel: string;
}
