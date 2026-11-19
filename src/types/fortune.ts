export type FaceShapeType =
  | '계란형'
  | '둥근형'
  | '각진형'
  | '긴형'
  | '하트형'
  | '역삼각형';

export type ExpressionType =
  | '밝고 환한 미소'
  | '온화하고 편안한 미소'
  | '차분하고 안정된 표정'
  | '진지하고 또렷한 집중'
  | '생기 있고 호기심 어린 표정'
  | '살짝 피곤하거나 굳은 표정';

export type EyebrowShapeType =
  | '부드러운 아치형 눈썹'
  | '반듯하고 곧은 일자 눈썹'
  | '자신감 넘치는 상승형 눈썹'
  | '순하고 원만한 완만 눈썹';

export type EyeTiltType =
  | '자신감 있고 매력적인 눈매'
  | '선하고 부드러운 순한 눈매'
  | '안정되고 편안한 수평 눈매';

export type NoseType =
  | '도톰하고 듬직한 코 (재물 저장형)'
  | '오똑하고 곧은 코 (명예·실속형)'
  | '균형 잡힌 단정한 코 (안정형)';

export interface SamjeongRatio {
  upper: number; // 이마(생각/기획) %
  middle: number; // 코/눈(실행/추진) %
  lower: number; // 턱/입(마무리/결실) %
  dominant: '이마' | '코·눈' | '턱·입' | '균형';
}

export interface FaceMetrics {
  smileScore: number; // 미소 지수 (0~100)
  vitalityScore: number; // 눈빛 활력도 (0~100)
  symmetryScore: number; // 얼굴 좌우 균형도 (0~100)
  wealthZoneScore: number; // 코/재물 기운 점수 (0~100)
  charmScore: number; // 친근감/호감도 점수 (0~100)
  tensionScore: number; // 피로/긴장도 (0~100)

  faceShape: FaceShapeType;
  faceRatioWH: number;
  jawToCheekRatio: number;
  foreheadToCheekRatio: number;
  samjeong: SamjeongRatio;
  expression: ExpressionType;
  eyebrowShape: EyebrowShapeType;
  eyeTilt: EyeTiltType;
  eyeTiltDeg: number;
  noseType: NoseType;

  capturedAt: string;
  snapshotDataUrl?: string;
  isDemo?: boolean;
}

export type FiveElement = '목(木)' | '화(火)' | '토(土)' | '금(金)' | '수(水)';

export interface MyeongriDay {
  dateText: string;
  isoDate: string;
  yearGanji: string;
  dayGanji: string;
  dayStem: string;
  dayBranch: string;
  element: FiveElement;
  elementColor: string;
  elementKeyword: string;
  energySummary: string;
  daySeed: number;
}

export interface UserProfile {
  name: string;
  birthDate: string; // YYYY-MM-DD
}

export type FortuneCategoryId = 'business' | 'wealth' | 'love' | 'study' | 'health';

export interface FortuneCategory {
  id: FortuneCategoryId;
  title: string;
  score: number;
  summary: string;
  detail: string;
}

export interface FortuneResultData {
  user: UserProfile;
  zodiac: string; // 예: "돼지띠"
  age: number; // 만 나이
  title: string;
  subtitle: string;
  overallScore: number;
  overallReading: string; // 오늘의 종합 운세
  faceReading: string; // 오늘의 얼굴 상태 요약
  faceHighlights: string[]; // 얼굴 분석 핵심 3가지
  categories: FortuneCategory[]; // 사업, 재물, 연애, 학업, 건강
  lucky: {
    color: string;
    colorHex: string;
    number: string;
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
