import {
  AppSettings,
  FaceMetrics,
  FortuneCategory,
  FortuneResultData,
  MyeongriDay,
  UserProfile,
} from '../types/fortune';
import { getUserBirthInfo } from './myeongri';
import {
  createPRNG,
  makeHash,
  LUCKY_ACTIONS_300,
  LUCKY_CAUTIONS_300,
  LUCKY_COLORS_POOL,
  TITLE_MODIFIERS,
  TITLE_NOUNS,
} from './fortuneDataPool';
import {
  BUSINESS_BANK,
  WEALTH_BANK,
  LOVE_BANK,
  STUDY_BANK,
  HEALTH_BANK,
  CategoryTextBank,
} from './fortuneKnowledge';

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// 스캔없는 운세 전용 기본 메트릭 생성
export function createNoScanMetrics(): FaceMetrics {
  return {
    smileScore: 75,
    vitalityScore: 80,
    symmetryScore: 85,
    wealthZoneScore: 80,
    charmScore: 78,
    tensionScore: 20,
    faceShape: '계란형',
    faceRatioWH: 0.78,
    jawToCheekRatio: 0.74,
    foreheadToCheekRatio: 0.82,
    samjeong: {
      upper: 33,
      middle: 34,
      lower: 33,
      dominant: '균형',
    },
    expression: '온화하고 편안한 미소',
    eyebrowShape: '부드러운 아치형 눈썹',
    eyeTilt: '안정되고 편안한 수평 눈매',
    eyeTiltDeg: 1.0,
    noseType: '균형 잡힌 단정한 코 (안정형)',
    capturedAt: new Date().toISOString(),
    isNoScan: true,
  };
}

// 프롬프트 생성 (Gemini API용)
export function buildFortunePrompt(
  user: UserProfile,
  metrics: FaceMetrics,
  myeongri: MyeongriDay,
  scanMode: 'camera' | 'photo' | 'no-scan'
): string {
  const birthInfo = getUserBirthInfo(user.birthDate);
  const name = user.name.trim() || '사용자';
  const gender = user.gender || '남성';

  const facePart =
    scanMode === 'no-scan'
      ? `[사주 명리학 분석 모드]
- 얼굴 스캔 없이 생년월일과 오늘 일진의 사주 궁합(십신: ${birthInfo.relationWithToday.sipshin}, ${birthInfo.relationWithToday.harmonyType})을 중심으로 분석합니다.`
      : `[오늘 스캔된 얼굴 상태]
- 표정: ${metrics.expression} (미소 지수: ${metrics.smileScore}%, 긴장도: ${metrics.tensionScore}%)
- 얼굴형: ${metrics.faceShape} / 눈매: ${metrics.eyeTilt} / 코: ${metrics.noseType}
- 활력도: ${metrics.vitalityScore}점 / 균형도: ${metrics.symmetryScore}점`;

  return `당신은 사람들의 하루를 기분 좋게 응원하고 실질적인 용기를 주는 친절하고 유쾌한 한국의 정통 운세·관상 마스터입니다.
어려운 한자나 복잡한 전문 용어(천정, 인당, 재백궁, 삼정 등)는 배제하고, 한국인들이 일상에서 자주 쓰는 자연스럽고 매끄러운 우리말 구어체로 작성해 주세요.

[사용자 정보]
- 성명: ${name} (${gender}, 만 ${birthInfo.age}세, ${birthInfo.ageGroup})
- 생년월일: ${birthInfo.formatted} (${birthInfo.zodiac}, 출생일: ${birthInfo.dayGanji})
- 오늘 일진: ${myeongri.dateText} (${myeongri.dayGanji}, ${myeongri.element} 기운)
- 오늘 사주 십신 관계: ${birthInfo.relationWithToday.sipshin} (${birthInfo.relationWithToday.sipshinDesc})

${facePart}

위 정보를 종합하여 오늘의 전체적인 총운과 5대 운세(사업·직장, 재물·금전, 연애·인연, 학업·성취, 건강·컨디션) 및 행운의 팁을 JSON 형식으로 작성해 주세요.`;
}

// 카테고리 텍스트 조합 헬퍼
function composeCategoryText(
  bank: CategoryTextBank,
  score: number,
  rand: () => number
): { summary: string; detail: string } {
  const opIdx = Math.floor(rand() * bank.openings.length);
  const sitIdx = Math.floor(rand() * bank.situations.length);
  const advIdx = Math.floor(rand() * bank.advices.length);

  const isHigh = score >= 85;
  const sumList = isHigh ? bank.summariesHigh : bank.summariesNormal;
  const sumIdx = Math.floor(rand() * sumList.length);

  const opening = bank.openings[opIdx];
  const situation = bank.situations[sitIdx];
  const advice = bank.advices[advIdx];
  const summary = sumList[sumIdx];

  const detail = `${opening} ${situation} ${advice}`;
  return { summary, detail };
}

// 로컬 정밀 운세 생성 엔진 (수만 가지 이상의 유니크한 조합)
export function generateLocalFortune(
  user: UserProfile,
  metrics: FaceMetrics,
  myeongri: MyeongriDay,
  scanMode: 'camera' | 'photo' | 'no-scan' = 'camera'
): FortuneResultData {
  const birthInfo = getUserBirthInfo(user.birthDate);
  const name = user.name.trim() || '고객';
  const gender = user.gender || '남성';

  // 시드 구성 (매일 날짜가 바뀌거나, 얼굴 수치/표정이 바뀌면 완전히 새로운 난수열 생성)
  const dateSeed = myeongri.daySeed;
  const userSeed = makeHash(`${name}_${gender}_${user.birthDate}`);
  
  // 표정 상태(미소, 긴장, 활력, 표정 텍스트 등)를 고감도로 반영하는 해시 시드
  // 같은 날이라도 표정을 다르게 스캔하면 완전히 다른 난수열이 생성됨
  const faceSeed =
    scanMode === 'no-scan'
      ? 88888881
      : makeHash(
          `${metrics.expression}_s${metrics.smileScore}_t${metrics.tensionScore}_v${metrics.vitalityScore}_c${metrics.charmScore}_sym${metrics.symmetryScore}`
        );

  const totalSeed = dateSeed ^ (userSeed << 1) ^ (faceSeed << 3);
  const rand = createPRNG(totalSeed);

  // 표정 아키타입 판별 (미소형, 집중형, 온화형, 활력형, 성찰형)
  type ExpressionArchetype = 'joyful' | 'calm' | 'focused' | 'vital' | 'reflective';
  let archetype: ExpressionArchetype = 'calm';

  if (metrics.smileScore >= 65) {
    archetype = 'joyful'; // 밝은 미소/기쁨
  } else if (metrics.tensionScore >= 45 || (metrics.smileScore < 40 && metrics.vitalityScore >= 60)) {
    archetype = 'focused'; // 진지/집중
  } else if (metrics.vitalityScore >= 82) {
    archetype = 'vital'; // 생기/활력
  } else if (metrics.tensionScore >= 60 || metrics.vitalityScore <= 55) {
    archetype = 'reflective'; // 차분/성찰
  } else {
    archetype = 'calm'; // 온화/평온
  }

  // 1. 타이틀 생성 (표정 아키타입별 특화 풀 + 기본 풀 조합)
  const JOYFUL_TITLES = [
    '환한 미소가 만복(萬福)을 부르는 대길(大吉)의 날',
    '빛나는 미소로 주변의 귀인을 사로잡는 하루',
    '웃음꽃 속에 뜻밖의 재물과 인연이 깃드는 날',
    '얼굴 가득 화기애애한 서광이 환하게 비추는 날',
    '입꼬리마다 금전과 행운이 풍성하게 담기는 날',
    '보는 이에게도 복을 전하는 눈부신 호감의 하루',
    '미소 하나로 닫힌 문도 활짝 열어젖히는 날',
    '밝은 웃음이 어두운 난관을 단숨에 물리치는 날',
    '사람 복과 재물 복이 미소를 타고 쏟아지는 하루',
    '마음도 얼굴도 활짝 피어 기쁨이 배가되는 날',
    '상서로운 미소가 뜻밖의 횡재수를 부르는 날',
    '매력 넘치는 입매로 행운을 끌어당기는 하루',
  ];

  const FOCUSED_TITLES = [
    '또렷한 눈빛과 깊은 집중으로 큰 결실을 맺는 날',
    '단단한 내면의 기운으로 난관을 돌파하는 하루',
    '침착한 지혜가 빛을 발해 확실한 실속을 챙기는 날',
    '흔들림 없는 집중력으로 목표를 정조준하는 날',
    '날카로운 통찰력으로 숨겨진 기회를 단숨에 낚아채는 날',
    '빈틈없는 결단력과 뚝심으로 승부수를 띄우는 하루',
    '묵직한 카리스마가 주변의 신뢰와 인정을 이끄는 날',
    '철저한 준비와 집중으로 시험과 과제를 압도하는 날',
    '위기를 기회로 바꾸는 냉철한 판단력의 하루',
    '단단한 기운이 새로운 성공의 초석을 다지는 날',
    '깊은 사색과 예리한 감각이 승리를 부르는 날',
    '뚝심 있는 추진력으로 난공불락을 뚫어내는 하루',
  ];

  const CALM_TITLES = [
    '온화한 인품과 평온한 기운이 만사를 순조롭게 이끄는 날',
    '부드러운 조화로움이 뜻밖의 순풍을 만나는 하루',
    '편안한 여유 속에 막혔던 일이 저절로 풀리는 날',
    '따뜻한 배려가 더 큰 귀인과 조력자를 부르는 날',
    '은은한 화합의 기운으로 가정이 평화롭고 일이 번창하는 날',
    '맑은 호수처럼 고요한 심경이 길운을 품는 하루',
    '유연한 처세술로 어려운 매듭도 부드럽게 푸는 날',
    '안정과 조화가 깃들어 실속을 꽉 채우는 날',
    '선한 영향력으로 주변 사람들의 마음을 얻는 하루',
    '순풍에 돛 단 듯 모든 흐름이 순조로운 날',
  ];

  const VITAL_TITLES = [
    '넘치는 활력과 당당한 기운으로 앞길을 활짝 여는 날',
    '역동적인 생기가 새로운 기회의 문을 박차고 나가는 하루',
    '자신감 넘치는 눈빛으로 원하는 목표를 쟁취하는 날',
    '생동하는 에너지로 정체된 흐름을 시원하게 뚫어내는 날',
    '거침없는 추진력으로 승승장구하는 도약의 날',
    '활기찬 기운이 사방으로 뻗어나가 행운을 부르는 하루',
    '젊은 기백과 열정으로 주위를 압도하는 날',
    '생기발랄한 발걸음마다 기분 좋은 성취가 따르는 날',
  ];

  const REFLECTIVE_TITLES = [
    '차분히 내실을 다지며 더 큰 도약을 준비하는 날',
    '서두르지 않는 지혜로 확실한 기반을 닦는 하루',
    '마음의 쉼표 속에 뜻밖의 묘안이 번뜩이는 날',
    '지친 기운을 충전하고 내면의 힘을 기르는 날',
    '신중한 한 걸음이 열 걸음의 전진을 낳는 날',
  ];

  let title: string;
  if (scanMode === 'no-scan') {
    const modIdx = Math.floor(rand() * TITLE_MODIFIERS.length);
    const nounIdx = Math.floor(rand() * TITLE_NOUNS.length);
    title = `${TITLE_MODIFIERS[modIdx]} ${TITLE_NOUNS[nounIdx]}`;
  } else {
    // 표정 상태에 따른 고유 타이틀 풀 우선 선정 (90% 확률로 특화 타이틀, 10%는 광범위 조합)
    if (rand() < 0.9) {
      let pool = CALM_TITLES;
      if (archetype === 'joyful') pool = JOYFUL_TITLES;
      else if (archetype === 'focused') pool = FOCUSED_TITLES;
      else if (archetype === 'vital') pool = VITAL_TITLES;
      else if (archetype === 'reflective') pool = REFLECTIVE_TITLES;
      title = pool[Math.floor(rand() * pool.length)];
    } else {
      const modIdx = Math.floor(rand() * TITLE_MODIFIERS.length);
      const nounIdx = Math.floor(rand() * TITLE_NOUNS.length);
      title = `${TITLE_MODIFIERS[modIdx]} ${TITLE_NOUNS[nounIdx]}`;
    }
  }

  const modeLabel =
    scanMode === 'no-scan' ? '사주 명리 일진 분석' : '실시간 관상 & 명리 일진 분석';
  const subtitle = `${name}님 (${gender} · ${birthInfo.zodiac}) | ${myeongri.dateText} ${modeLabel}`;

  // 2. 점수 산출 (표정 아키타입별 차별화 점수 다이나믹스 적용)
  let baseBonus = 0;
  if (birthInfo.relationWithToday.harmonyType === '대길합') baseBonus = 8;
  else if (birthInfo.relationWithToday.harmonyType === '상생') baseBonus = 5;
  else if (birthInfo.relationWithToday.harmonyType === '충돌주의') baseBonus = -2;

  const randScore = (base: number, range: number) =>
    clamp(Math.round(base + baseBonus + rand() * range), 60, 99);

  let businessScore: number;
  let wealthScore: number;
  let loveScore: number;
  let studyScore: number;
  let healthScore: number;

  if (scanMode === 'no-scan') {
    // 사주 기반 점수
    businessScore = randScore(76, 18);
    wealthScore = randScore(74, 20);
    loveScore = randScore(75, 19);
    studyScore = randScore(76, 18);
    healthScore = randScore(75, 17);
  } else {
    // 관상 표정 아키타입별 특화 점수 배분
    if (archetype === 'joyful') {
      // 미소/기쁨형: 연애·인연운 최고조, 재물운 대폭 상승
      loveScore = clamp(Math.round(86 + metrics.smileScore * 0.1 + baseBonus + rand() * 8), 85, 99);
      wealthScore = clamp(Math.round(83 + metrics.smileScore * 0.08 + baseBonus + rand() * 8), 82, 98);
      businessScore = clamp(Math.round(78 + metrics.vitalityScore * 0.12 + rand() * 10), 75, 95);
      healthScore = clamp(Math.round(79 + metrics.vitalityScore * 0.12 + rand() * 8), 76, 96);
      studyScore = clamp(Math.round(75 + rand() * 14), 72, 92);
    } else if (archetype === 'focused') {
      // 진지/집중형: 학업·성취운 최고조, 사업·직장운 대폭 상승
      studyScore = clamp(Math.round(88 + metrics.tensionScore * 0.1 + baseBonus + rand() * 7), 87, 99);
      businessScore = clamp(Math.round(85 + metrics.vitalityScore * 0.1 + baseBonus + rand() * 8), 84, 98);
      wealthScore = clamp(Math.round(78 + rand() * 12), 75, 92);
      healthScore = clamp(Math.round(72 + (100 - metrics.tensionScore) * 0.12 + rand() * 10), 70, 88);
      loveScore = clamp(Math.round(70 + rand() * 12), 68, 85);
    } else if (archetype === 'vital') {
      // 생기/활력형: 건강·컨디션 최고조, 사업 추진력 상승
      healthScore = clamp(Math.round(88 + metrics.vitalityScore * 0.08 + baseBonus + rand() * 7), 88, 99);
      businessScore = clamp(Math.round(85 + metrics.vitalityScore * 0.08 + baseBonus + rand() * 8), 84, 98);
      studyScore = clamp(Math.round(80 + rand() * 12), 78, 94);
      wealthScore = clamp(Math.round(79 + rand() * 11), 76, 92);
      loveScore = clamp(Math.round(78 + rand() * 12), 75, 92);
    } else if (archetype === 'reflective') {
      // 차분/성찰형: 내실과 보수적 관리
      studyScore = clamp(Math.round(82 + rand() * 10), 78, 93);
      wealthScore = clamp(Math.round(77 + rand() * 11), 74, 90);
      businessScore = clamp(Math.round(75 + rand() * 12), 72, 89);
      loveScore = clamp(Math.round(74 + rand() * 12), 70, 88);
      healthScore = clamp(Math.round(72 + rand() * 10), 68, 84);
    } else {
      // 온화/평온형: 전반적 균형과 원만한 조화
      businessScore = clamp(Math.round(80 + baseBonus + rand() * 12), 78, 94);
      wealthScore = clamp(Math.round(80 + baseBonus + rand() * 12), 78, 94);
      loveScore = clamp(Math.round(82 + baseBonus + rand() * 11), 80, 95);
      studyScore = clamp(Math.round(80 + baseBonus + rand() * 11), 78, 93);
      healthScore = clamp(Math.round(80 + baseBonus + rand() * 11), 78, 93);
    }
  }

  const overallScore = Math.round(
    (businessScore + wealthScore + loveScore + studyScore + healthScore) / 5
  );

  // 3. 얼굴/기운 피드백 작성 (표정 아키타입별 생생한 관상 피드백)
  let faceReading: string;
  let faceHighlights: string[];

  if (scanMode === 'no-scan') {
    faceReading = `오늘 ${name}님(${gender}, ${birthInfo.zodiac})의 일진은 사주 명리학의 '${birthInfo.relationWithToday.sipshin}' 기운과 맞물려 있습니다. ${birthInfo.relationWithToday.sipshinDesc} 오늘은 마음의 여유를 갖고 차분하게 중심을 잡을수록 좋은 기운이 배가되는 하루입니다.`;
    faceHighlights = [
      `사주 일진 · ${birthInfo.dayGanji} & 오늘 ${myeongri.dayGanji}: ${birthInfo.relationWithToday.harmonyType}의 조화로운 흐름`,
      `오행 에너지 · ${birthInfo.dayElement}과 오늘 ${myeongri.element}: ${myeongri.energySummary}`,
      `명리 십신 · ${birthInfo.relationWithToday.sipshin}: 적극적으로 역량을 펼치기 좋은 기운`,
    ];
  } else {
    if (archetype === 'joyful') {
      faceReading = `오늘 ${name}님의 얼굴 상태는 입꼬리가 시원하게 올라간 '밝고 환한 미소'(미소 지수 ${metrics.smileScore}%)를 띠고 있습니다. 관상학에서 미소 띤 입매는 '복을 담는 그릇'으로 불리며, 보는 사람에게도 편안함과 큰 호감을 선사합니다. 대인관계에서 막힌 벽이 허물어지고 금전과 귀인이 절로 깃드는 길상(吉祥)의 기운입니다.`;
      faceHighlights = [
        `입매 & 표정 · 미소 지수 ${metrics.smileScore}%: 사람과 재물을 끌어당기는 복록의 상`,
        `눈매 · ${metrics.eyeTilt}: 호감과 신뢰를 주는 맑고 밝은 눈빛`,
        `안면 균형 · ${metrics.faceShape} (${metrics.symmetryScore}점): 조화로운 인덕과 안정감`,
      ];
    } else if (archetype === 'focused') {
      faceReading = `오늘 ${name}님의 얼굴에서는 잡념이 사라진 '진지하고 또렷한 집중력'(긴장/집중도 ${metrics.tensionScore}%)이 돋보입니다. 눈매가 또렷하고 눈동자에 총기가 서려 있어, 복잡한 문제나 중요한 승부처를 단숨에 꿰뚫어 볼 수 있는 상입니다. 실속을 챙기고 시험이나 프로젝트를 성공으로 이끄는 강력한 추동력이 살아있습니다.`;
      faceHighlights = [
        `표정 & 집중 · ${metrics.expression} (${metrics.tensionScore}%): 목표를 정조준하는 예리한 통찰력`,
        `눈매 & 활력 · ${metrics.eyeTilt} (활력 ${metrics.vitalityScore}점): 흐트러짐 없는 결단력`,
        `재백궁 · ${metrics.noseType}: 실속과 기회를 꽉 쥐는 당당한 기운`,
      ];
    } else if (archetype === 'vital') {
      faceReading = `오늘 ${name}님의 얼굴에는 넘치는 활력과 생기(눈빛 활력도 ${metrics.vitalityScore}점)가 가득합니다. 얼굴 전반에 환한 혈색과 자신감이 감돌아, 침체되었던 일에 새로운 활로를 열고 적극적으로 기회를 쟁취할 수 있는 당당한 상입니다.`;
      faceHighlights = [
        `활력 지수 · ${metrics.vitalityScore}점: 역동적인 추진력과 강한 실행력`,
        `안면 기운 · ${metrics.faceShape}: 자신감과 친화력이 돋보이는 인상`,
        `눈매 & 코 · ${metrics.eyeTilt} & ${metrics.noseType}: 주도적인 성취운`,
      ];
    } else if (archetype === 'reflective') {
      faceReading = `오늘 ${name}님의 표정은 차분히 생각을 정리하고 내실을 다지는 '차분한 성찰의 상태'입니다. 무리한 확장보다는 자신이 가진 자산과 계획을 꼼꼼히 점검하기에 가장 좋은 날입니다. 따뜻한 차 한 잔과 함께 여유를 가지면 더 큰 행운의 문이 열립니다.`;
      faceHighlights = [
        `표정 상태 · ${metrics.expression}: 차분한 내면 관리와 안정감`,
        `심경 조절 · 여유 추구: 편안한 휴식과 재충전이 길운을 부름`,
        `안면 균형 · ${metrics.symmetryScore}점: 기본에 충실한 실속 관리`,
      ];
    } else {
      faceReading = `오늘 ${name}님의 얼굴 상태는 마음의 그늘이 없는 '온화하고 편안한 인상'(미소 지수 ${metrics.smileScore}%)입니다. 이목구비의 좌우 균형도(${metrics.symmetryScore}점)가 안정적이어서 주변과의 갈등 없이 부드러운 협력을 이끌어내는 화합의 상입니다. 급하게 서두르지 않아도 모든 일이 자연스럽게 순조롭게 풀려나갑니다.`;
      faceHighlights = [
        `표정 상태 · ${metrics.expression}: 원만한 대인관계와 화합`,
        `안면 조화 · ${metrics.faceShape}: 편안함과 신뢰를 주는 인상`,
        `눈빛 & 코 · ${metrics.eyeTilt} & ${metrics.noseType}: 실속과 안정을 다지는 하루`,
      ];
    }
  }

  // 4. 오늘의 종합 운세 풀이 (표정 기운과 사주 일진의 융합)
  let ovOp: string;
  let ovDet: string;
  let ovClose: string;

  if (scanMode === 'no-scan') {
    const overallOpenings = [
      `${myeongri.dateText}, 오늘은 60갑자 중 ${myeongri.dayGanji}로 ${myeongri.element} 기운이 활발하게 흐르는 날입니다.`,
      `${myeongri.dateText}, 오늘은 만물이 생동하는 ${myeongri.dayGanji}의 길운이 가득한 날입니다.`,
      `${myeongri.dateText}, 오늘은 중심을 잡고 성취를 이루기에 더없이 좋은 ${myeongri.dayGanji}입니다.`,
      `${myeongri.dateText}, 오늘은 사람과의 신뢰와 뜻밖의 기회가 어우러지는 ${myeongri.dayGanji}입니다.`,
    ];
    ovOp = overallOpenings[Math.floor(rand() * overallOpenings.length)];
    ovDet = `${name}님에게는 오늘 ${birthInfo.relationWithToday.sipshin}의 기운이 깃들어 있어, ${birthInfo.relationWithToday.sipshinDesc}`;
    ovClose = '차분하고 여유로운 마음으로 하루를 채워가면 큰 기쁨이 찾아옵니다.';
  } else {
    if (archetype === 'joyful') {
      ovOp = `${myeongri.dateText}(${myeongri.dayGanji}), 오늘 ${name}님의 얼굴에 번진 환한 미소(미소 지수 ${metrics.smileScore}%)는 만복을 부르는 최고의 관상입니다.`;
      ovDet = `오늘의 ${myeongri.element} 기운과 사주 십신(${birthInfo.relationWithToday.sipshin})이 조화를 이루어, 대인관계에서 큰 호감을 얻고 뜻밖의 금전적 횡재나 귀인을 만나기 매우 유리합니다.`;
      ovClose = '밝은 웃음을 잃지 않고 긍정적인 에너지를 전파할수록 더 큰 재물과 기회가 굴러들어옵니다!';
    } else if (archetype === 'focused') {
      ovOp = `${myeongri.dateText}(${myeongri.dayGanji}), 오늘 ${name}님이 보여주신 날카로운 집중력과 단단한 눈빛은 오늘의 진취적인 일진과 완벽히 부합합니다.`;
      ovDet = `사주 십신인 '${birthInfo.relationWithToday.sipshin}'의 결실을 맺기에 더없이 좋은 날로, 머뭇거리던 일을 단숨에 밀어붙여 기대 이상의 성과를 창출할 수 있습니다.`;
      ovClose = '탁월한 집중력으로 승부를 보되, 대화 시 부드러운 말투를 곁들이면 빈틈없는 완벽한 하루가 됩니다!';
    } else if (archetype === 'vital') {
      ovOp = `${myeongri.dateText}(${myeongri.dayGanji}), 오늘 ${name}님의 넘치는 생기와 당당한 눈빛 활력(${metrics.vitalityScore}점)이 새로운 운을 힘차게 열어젖히고 있습니다.`;
      ovDet = `오늘의 활발한 ${myeongri.element} 에너지와 ${birthInfo.zodiac} 기운이 상승 기류를 타며, 적극적으로 도전하고 발로 뛸수록 값진 수확을 거두게 됩니다.`;
      ovClose = '자신감 넘치는 발걸음으로 오늘의 멋진 주인공이 되어 보세요!';
    } else if (archetype === 'reflective') {
      ovOp = `${myeongri.dateText}(${myeongri.dayGanji}), 오늘 ${name}님의 차분한 표정은 내실을 다지고 에너지를 비축하기에 안성맞춤인 상입니다.`;
      ovDet = `사주 십신 '${birthInfo.relationWithToday.sipshin}'의 흐름 속에서 무리한 확장보다는 자신이 가진 자산과 계획을 꼼꼼히 점검할 때 안전한 결실이 맺어집니다.`;
      ovClose = '따뜻한 차 한 잔과 함께 마음의 여유를 챙기며 한 걸음씩 나아가 보세요!';
    } else {
      ovOp = `${myeongri.dateText}(${myeongri.dayGanji}), 오늘 ${name}님의 온화하고 편안한 표정은 주변에 따뜻한 조화와 화평을 전하는 상입니다.`;
      ovDet = `사주 십신 '${birthInfo.relationWithToday.sipshin}'의 기운과 맞물려 모나지 않고 유연하게 처세할수록 뜻밖의 귀인과 귀한 인연이 절로 다가옵니다.`;
      ovClose = '편안하고 자연스러운 흐름을 믿고 기분 좋은 하루를 누려보세요!';
    }
  }

  const overallReading = `${ovOp} ${ovDet} ${ovClose}`;

  // 5. 5대 핵심 운세 생성
  const bText = composeCategoryText(BUSINESS_BANK, businessScore, rand);
  const wText = composeCategoryText(WEALTH_BANK, wealthScore, rand);
  const lText = composeCategoryText(LOVE_BANK, loveScore, rand);
  const sText = composeCategoryText(STUDY_BANK, studyScore, rand);
  const hText = composeCategoryText(HEALTH_BANK, healthScore, rand);

  const categories: FortuneCategory[] = [
    {
      id: 'business',
      title: '사업·직장운',
      score: businessScore,
      summary: bText.summary,
      detail: bText.detail,
    },
    {
      id: 'wealth',
      title: '재물·금전운',
      score: wealthScore,
      summary: wText.summary,
      detail: wText.detail,
    },
    {
      id: 'love',
      title: '연애·인연운',
      score: loveScore,
      summary: lText.summary,
      detail: lText.detail,
    },
    {
      id: 'study',
      title: '학업·성취운',
      score: studyScore,
      summary: sText.summary,
      detail: sText.detail,
    },
    {
      id: 'health',
      title: '건강·컨디션',
      score: healthScore,
      summary: hText.summary,
      detail: hText.detail,
    },
  ];

  // 6. 행운의 팁 선정 (300개 풀에서 PRNG로 고유하게 인출)
  const actionIdx = Math.floor(rand() * LUCKY_ACTIONS_300.length);
  const cautionIdx = Math.floor(rand() * LUCKY_CAUTIONS_300.length);
  const colorIdx = Math.floor(rand() * LUCKY_COLORS_POOL.length);

  const luckyColorObj = LUCKY_COLORS_POOL[colorIdx];
  const luckyNum1 = Math.floor(rand() * 9) + 1;
  const luckyNum2 = Math.floor(rand() * 39) + 10;

  return {
    user,
    zodiac: birthInfo.zodiac,
    age: birthInfo.age,
    title,
    subtitle,
    overallScore,
    overallReading,
    faceReading,
    faceHighlights,
    categories,
    lucky: {
      color: luckyColorObj.name,
      colorHex: luckyColorObj.hex,
      number: `${luckyNum1}, ${luckyNum2}`,
      action: LUCKY_ACTIONS_300[actionIdx],
      caution: LUCKY_CAUTIONS_300[cautionIdx],
    },
    promptUsed: buildFortunePrompt(user, metrics, myeongri, scanMode),
    source: 'local-engine',
    myeongri,
    metrics,
    scanMode,
  };
}

// Gemini API 연동 (설정된 경우)
export async function generateFortune(
  user: UserProfile,
  metrics: FaceMetrics,
  myeongri: MyeongriDay,
  settings: AppSettings,
  scanMode: 'camera' | 'photo' | 'no-scan' = 'camera'
): Promise<FortuneResultData> {
  const prompt = buildFortunePrompt(user, metrics, myeongri, scanMode);
  const birthInfo = getUserBirthInfo(user.birthDate);
  const name = user.name.trim() || '고객';
  const gender = user.gender || '남성';

  if (settings.engine === 'gemini' && settings.geminiApiKey.trim().length > 10) {
    try {
      const model = settings.geminiModel || 'gemini-2.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(settings.geminiApiKey.trim())}`;

      const jsonInstruction = `${prompt}

반드시 아래 JSON 형식으로만 응답해 주세요 (어려운 한자나 관상 전문 용어 없이 일상적이고 친근한 우리말 구어체로 작성):
{
  "title": "${name}님의 오늘의 운세 타이틀 (12~20자)",
  "subtitle": "${name}님 (${gender} · ${birthInfo.zodiac}) · ${myeongri.dateText}",
  "overallScore": 88,
  "overallReading": "오늘의 전체적인 하루 종합 운세 풀이 (3문장)",
  "faceReading": "얼굴 표정 또는 사주 기운에 대한 친절한 해석 (2문장)",
  "faceHighlights": ["핵심 특징 1가지", "운세 포인트 1가지", "오늘의 기운 1가지"],
  "categories": [
    { "id": "business", "title": "사업·직장운", "score": 88, "summary": "한줄 요약", "detail": "상세 조언 3문장" },
    { "id": "wealth", "title": "재물·금전운", "score": 85, "summary": "한줄 요약", "detail": "상세 조언 3문장" },
    { "id": "love", "title": "연애·인연운", "score": 90, "summary": "한줄 요약", "detail": "상세 조언 3문장" },
    { "id": "study", "title": "학업·성취운", "score": 86, "summary": "한줄 요약", "detail": "상세 조언 3문장" },
    { "id": "health", "title": "건강·컨디션", "score": 84, "summary": "한줄 요약", "detail": "상세 조언 3문장" }
  ],
  "lucky": {
    "color": "행운의 색",
    "colorHex": "#10b981",
    "number": "7, 21",
    "action": "오늘 실천하면 좋은 현실적인 행동",
    "caution": "오늘 살짝 주의할 점"
  }
}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: jsonInstruction }] }],
          generationConfig: {
            temperature: 0.88,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const cleaned = text.replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(cleaned);
          if (parsed?.overallReading && Array.isArray(parsed?.categories)) {
            return {
              user,
              zodiac: birthInfo.zodiac,
              age: birthInfo.age,
              title: String(parsed.title || `${name}님의 오늘 운세`),
              subtitle: String(parsed.subtitle || `${myeongri.dateText}`),
              overallScore: clamp(Number(parsed.overallScore) || 85, 60, 99),
              overallReading: String(parsed.overallReading),
              faceReading: String(parsed.faceReading || '오늘 긍정적인 활력이 가득합니다.'),
              faceHighlights: Array.isArray(parsed.faceHighlights)
                ? parsed.faceHighlights.slice(0, 3).map(String)
                : [],
              categories: parsed.categories.slice(0, 5).map((c: FortuneCategory) => ({
                id: c.id,
                title: String(c.title),
                score: clamp(Number(c.score) || 80, 55, 99),
                summary: String(c.summary),
                detail: String(c.detail),
              })),
              lucky: {
                color: String(parsed.lucky?.color || '에메랄드 그린'),
                colorHex: String(parsed.lucky?.colorHex || '#10b981'),
                number: String(parsed.lucky?.number || '3, 17'),
                action: String(parsed.lucky?.action || '밝은 미소로 인사 나누기'),
                caution: String(parsed.lucky?.caution || '조급한 결정 피하기'),
              },
              promptUsed: prompt,
              source: 'gemini-api',
              myeongri,
              metrics,
              scanMode,
            };
          }
        }
      }
    } catch (err) {
      console.warn('Gemini API 호출 실패, 내장 정밀 엔진으로 생성합니다:', err);
    }
  }

  return generateLocalFortune(user, metrics, myeongri, scanMode);
}
