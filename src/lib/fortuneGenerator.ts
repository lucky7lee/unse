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

  // 시드 구성 (매일 날짜가 바뀌거나, 얼굴 수치가 바뀌면 완전히 새로운 난수열 생성)
  const dateSeed = myeongri.daySeed;
  const userSeed = makeHash(`${name}_${gender}_${user.birthDate}`);
  const faceSeed =
    scanMode === 'no-scan'
      ? 88888881
      : Math.round(
          metrics.smileScore * 1000 +
            metrics.vitalityScore * 100 +
            metrics.wealthZoneScore * 10 +
            metrics.charmScore
        );

  const totalSeed = dateSeed ^ (userSeed << 1) ^ (faceSeed << 3);
  const rand = createPRNG(totalSeed);

  // 1. 타이틀 생성 (수천 가지 조합)
  const modIdx = Math.floor(rand() * TITLE_MODIFIERS.length);
  const nounIdx = Math.floor(rand() * TITLE_NOUNS.length);
  const title = `${TITLE_MODIFIERS[modIdx]} ${TITLE_NOUNS[nounIdx]}`;

  const modeLabel =
    scanMode === 'no-scan' ? '사주 명리 일진 분석' : '실시간 관상 & 명리 일진 분석';
  const subtitle = `${name}님 (${gender} · ${birthInfo.zodiac}) | ${myeongri.dateText} ${modeLabel}`;

  // 2. 점수 산출
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
    // 관상 + 사주 복합 점수
    businessScore = clamp(
      Math.round(
        metrics.vitalityScore * 0.4 +
          metrics.symmetryScore * 0.3 +
          (metrics.smileScore >= 50 ? 10 : 4) +
          baseBonus +
          rand() * 12
      ),
      62,
      99
    );
    wealthScore = clamp(
      Math.round(
        metrics.wealthZoneScore * 0.45 +
          metrics.smileScore * 0.2 +
          metrics.symmetryScore * 0.15 +
          10 +
          baseBonus +
          rand() * 12
      ),
      60,
      99
    );
    loveScore = clamp(
      Math.round(
        metrics.charmScore * 0.45 +
          metrics.smileScore * 0.3 +
          (metrics.eyeTiltDeg > 2 ? 8 : 4) +
          8 +
          baseBonus +
          rand() * 14
      ),
      62,
      99
    );
    studyScore = clamp(
      Math.round(
        metrics.vitalityScore * 0.45 +
          (100 - metrics.tensionScore) * 0.25 +
          metrics.symmetryScore * 0.15 +
          10 +
          baseBonus +
          rand() * 12
      ),
      62,
      98
    );
    healthScore = clamp(
      Math.round(
        metrics.vitalityScore * 0.4 +
          (100 - metrics.tensionScore) * 0.4 +
          12 +
          baseBonus +
          rand() * 12
      ),
      60,
      98
    );
  }

  const overallScore = Math.round(
    (businessScore + wealthScore + loveScore + studyScore + healthScore) / 5
  );

  // 3. 얼굴/기운 피드백 작성
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
    const smileComment =
      metrics.smileScore >= 70
        ? `미소 지수 ${metrics.smileScore}%로 입꼬리가 밝게 올라가 있어, 복을 담는 기운이 가득합니다.`
        : metrics.smileScore >= 45
        ? `미소 지수 ${metrics.smileScore}%로 온화하고 단정한 인상을 유지하고 있습니다.`
        : `진지한 집중력이 돋보이는 표정입니다. 살짝 미소를 더해주면 운이 더욱 부드럽게 풀립니다.`;

    faceReading = `오늘 ${name}님의 얼굴 상태는 '${metrics.expression}'으로 분석되었습니다. ${smileComment} 이목구비의 균형도가 ${metrics.symmetryScore}점으로 안정적이며, 눈빛 활력도(${metrics.vitalityScore}점)가 높아 주변 사람들에게 신뢰와 긍정적인 호감을 전하는 상태입니다.`;
    faceHighlights = [
      `얼굴형 · ${metrics.faceShape}: 균형 잡힌 인상과 친화력이 돋보입니다.`,
      `눈매 & 표정 · ${metrics.eyeTilt} (미소 지수 ${metrics.smileScore}%): 맑고 호감 가는 기운이 감돕니다.`,
      `재백궁 & 활력 · ${metrics.noseType} (활력 ${metrics.vitalityScore}점): 실속과 자신감이 서려 있습니다.`,
    ];
  }

  // 4. 오늘의 종합 운세 풀이
  const overallOpenings = [
    `${myeongri.dateText}, 오늘은 60갑자 중 ${myeongri.dayGanji}로 ${myeongri.element} 기운이 활발하게 흐르는 날입니다.`,
    `${myeongri.dateText}, 오늘은 만물이 생동하는 ${myeongri.dayGanji}의 길운이 가득한 날입니다.`,
    `${myeongri.dateText}, 오늘은 중심을 잡고 성취를 이루기에 더없이 좋은 ${myeongri.dayGanji}입니다.`,
    `${myeongri.dateText}, 오늘은 사람과의 신뢰와 뜻밖의 기회가 어우러지는 ${myeongri.dayGanji}입니다.`,
  ];
  const ovOp = overallOpenings[Math.floor(rand() * overallOpenings.length)];

  const overallDetails = [
    `${name}님에게는 오늘 ${birthInfo.relationWithToday.sipshin}의 기운이 깃들어 있어, ${birthInfo.relationWithToday.sipshinDesc}`,
    `${name}님의 타고난 ${birthInfo.zodiac} 기운과 오늘의 ${myeongri.element} 에너지가 만나 시너지를 발휘하는 하루입니다.`,
    `어려운 난관이 있더라도 특유의 유연함과 성실함으로 지혜롭게 극복하고 알찬 성과를 거둘 수 있습니다.`,
    `대인관계에서 친절하고 따뜻한 태도를 유지할 때 기대 이상의 귀인과 행운이 문을 두드립니다.`,
  ];
  const ovDet = overallDetails[Math.floor(rand() * overallDetails.length)];

  const overallClosings = [
    '스스로를 믿고 가벼운 미소와 함께 활기찬 하루를 시작해 보세요!',
    '긍정적인 마음가짐과 당당한 발걸음으로 오늘의 멋진 주인공이 되어 보세요!',
    '차분하고 여유로운 마음으로 하루를 채워가면 큰 기쁨이 찾아옵니다.',
    '오늘 뿌린 작은 친절과 노력이 눈부신 결실로 되돌아올 것입니다.',
  ];
  const ovClose = overallClosings[Math.floor(rand() * overallClosings.length)];

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
