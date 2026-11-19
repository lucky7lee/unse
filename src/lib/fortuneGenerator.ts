import {
  AppSettings,
  FaceMetrics,
  FaceShapeType,
  FortuneCategory,
  FortuneResultData,
  MyeongriDay,
  UserProfile,
} from '../types/fortune';
import { getUserBirthInfo } from './myeongri';

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function seededPick<T>(arr: T[], seed: number): T {
  const idx = Math.abs(seed) % arr.length;
  return arr[idx];
}

const FACE_SHAPE_DESC: Record<
  FaceShapeType,
  {
    trait: string;
    businessTip: string;
    wealthTip: string;
    loveTip: string;
    studyTip: string;
  }
> = {
  계란형: {
    trait: '이목구비 균형이 잘 잡혀 호감과 신뢰를 주는 인상',
    businessTip: '주변 동료나 파트너와의 소통이 원활해 협력 업무나 제안에서 좋은 반응을 얻습니다.',
    wealthTip: '무리한 지출만 피한다면 계획한 대로 차분하게 실속을 챙길 수 있는 날입니다.',
    loveTip: '첫인상 호감도가 높아 가벼운 대화 속에서도 기분 좋은 호감을 이끌어냅니다.',
    studyTip: '머리가 맑고 집중력이 고르게 유지되어 새로운 정보를 빠르게 흡수합니다.',
  },
  둥근형: {
    trait: '부드럽고 친근한 인상으로 사람을 편안하게 만드는 얼굴형',
    businessTip: '특유의 친화력과 원만한 대화로 껄끄러운 문제도 부드럽게 풀어나갈 수 있습니다.',
    wealthTip: '사람들과의 만남이나 식사 자리에서 뜻밖의 유용한 정보나 기회가 찾아옵니다.',
    loveTip: '따뜻한 리액션과 밝은 표정 하나가 상대방의 마음을 편안하게 열어줍니다.',
    studyTip: '혼자 끙끙 앓기보다 스터디나 질의응답을 통해 훨씬 빠르게 이해할 수 있습니다.',
  },
  각진형: {
    trait: '턱선과 윤곽에 뚝심과 책임감이 돋보이는 듬직한 인상',
    businessTip: '결단력과 실행력이 강해 미뤄뒀던 프로젝트를 강력하게 밀어붙이기 좋은 날입니다.',
    wealthTip: '충동적인 구매를 자제하고 실속 있는 알짜 지출에 집중하면 금전운이 탄탄해집니다.',
    loveTip: '진중하고 한결같은 태도가 큰 매력 포인트로 작용해 깊은 신뢰를 얻습니다.',
    studyTip: '끈기와 엉덩이 힘이 필요한 고난도 과제나 시험 대비에서 두각을 나타냅니다.',
  },
  긴형: {
    trait: '사려 깊고 지적인 분위기를 풍기는 스마트한 인상',
    businessTip: '디테일을 짚어내는 기획력과 분석력이 뛰어나 회의나 문서 작업에서 인정받습니다.',
    wealthTip: '할인 정보나 꼼꼼한 비교 분석을 통해 알뜰하게 돈을 아낄 수 있는 날입니다.',
    loveTip: '취향이나 생각이 잘 통하는 사람과 깊이 있는 대화를 나누며 유대감이 깊어집니다.',
    studyTip: '논리적인 사고력이 최고조에 달해 체계적인 정리가 필요한 공부에 적합합니다.',
  },
  하트형: {
    trait: '시원한 이마와 생기 있는 턱선이 어우러진 매력적인 인상',
    businessTip: '톡톡 튀는 아이디어와 순발력으로 회의나 프레젠테이션에서 주목을 받습니다.',
    wealthTip: '트렌드를 읽는 감각이 좋아 소소한 이벤트나 부업 아이디어가 떠오를 수 있습니다.',
    loveTip: '자연스러운 눈웃음과 센스 있는 멘트로 인기가 급상승하는 날입니다.',
    studyTip: '창의적인 문제 해결이나 시각 자료를 활용한 학습에서 큰 효과를 봅니다.',
  },
  역삼각형: {
    trait: '넓은 이마와 날렵한 턱선에서 날카로운 직관이 느껴지는 인상',
    businessTip: '문제의 핵심을 꿰뚫는 빠른 판단력으로 비효율적인 과정을 단번에 개선합니다.',
    wealthTip: '순간의 감정에 휩쓸리지 않고 냉철하게 계산할 때 알짜 이득을 지킬 수 있습니다.',
    loveTip: '겉은 시크해 보여도 은근한 배려를 보여줄 때 반전 매력이 배가됩니다.',
    studyTip: '핵심 요점을 빠르게 파악해 단시간에 높은 학습 성과를 낼 수 있습니다.',
  },
};

export function buildFortunePrompt(
  user: UserProfile,
  metrics: FaceMetrics,
  myeongri: MyeongriDay
): string {
  const birthInfo = getUserBirthInfo(user.birthDate);
  const name = user.name.trim() || '사용자';

  return `당신은 사람들의 하루를 기분 좋게 응원하는 친절하고 유쾌한 운세 마스터입니다.
어려운 한자나 복잡한 관상학 전문 용어(예: 마의상법, 재백궁, 인당, 천정 등)는 절대 쓰지 말고, 누구나 쉽게 이해할 수 있는 일상적인 쉬운 우리말로 작성해 주세요.

[사용자 정보]
- 성명: ${name}
- 생년월일: ${birthInfo.formatted} (${birthInfo.zodiac}, 만 ${birthInfo.age}세)
- 오늘 날짜: ${myeongri.dateText} (${myeongri.dayGanji})

[오늘 스캔된 얼굴 상태]
- 표정: ${metrics.expression} (미소 지수: ${metrics.smileScore}%, 표정 긴장도: ${metrics.tensionScore}%)
- 얼굴형: ${metrics.faceShape}
- 눈매: ${metrics.eyeTilt}
- 눈빛 활력도: ${metrics.vitalityScore}점 / 얼굴 균형도: ${metrics.symmetryScore}점

위 사용자의 이름(${name}님), 생년월일(${birthInfo.zodiac}), 그리고 오늘 스캔된 얼굴 표정을 종합하여,
오늘의 종합 운세와 함께 5대 운세(사업·직장, 재물·금전, 연애·인연, 학업·성취, 건강·컨디션)를 알기 쉽게 풀어서 응답해 주세요.`;
}

export function generateLocalFortune(
  user: UserProfile,
  metrics: FaceMetrics,
  myeongri: MyeongriDay
): FortuneResultData {
  const birthInfo = getUserBirthInfo(user.birthDate);
  const name = user.name.trim() || '고객';
  const desc = FACE_SHAPE_DESC[metrics.faceShape];

  const seed =
    myeongri.daySeed +
    birthInfo.birthYear * 3 +
    metrics.smileScore * 7 +
    metrics.wealthZoneScore * 11;

  // 5개 분야 점수 산출
  const businessScore = clamp(
    Math.round(
      metrics.vitalityScore * 0.45 +
        metrics.symmetryScore * 0.35 +
        (metrics.smileScore >= 50 ? 12 : 6) +
        (seed % 6)
    ),
    65,
    98
  );

  const wealthScore = clamp(
    Math.round(
      metrics.wealthZoneScore * 0.5 +
        metrics.smileScore * 0.25 +
        metrics.symmetryScore * 0.15 +
        10 +
        (seed % 7)
    ),
    62,
    99
  );

  const loveScore = clamp(
    Math.round(
      metrics.charmScore * 0.5 +
        metrics.smileScore * 0.3 +
        (metrics.eyeTiltDeg > 2 ? 10 : 6) +
        8 +
        ((seed * 3) % 7)
    ),
    64,
    99
  );

  const studyScore = clamp(
    Math.round(
      metrics.vitalityScore * 0.5 +
        (100 - metrics.tensionScore) * 0.25 +
        metrics.symmetryScore * 0.15 +
        10 +
        ((seed * 5) % 6)
    ),
    63,
    98
  );

  const healthScore = clamp(
    Math.round(
      metrics.vitalityScore * 0.45 +
        (100 - metrics.tensionScore) * 0.4 +
        15 +
        ((seed * 7) % 5)
    ),
    60,
    98
  );

  const overallScore = Math.round(
    (businessScore + wealthScore + loveScore + studyScore + healthScore) / 5
  );

  // 얼굴 표정 한줄 요약
  const faceReading =
    metrics.smileScore >= 70
      ? `오늘 ${name}님의 표정은 미소 지수 ${metrics.smileScore}%로 매우 밝고 환합니다. 입꼬리가 기분 좋게 올라가 주변 사람들에게 긍정적인 에너지를 듬뿍 전하는 하루입니다.`
      : metrics.smileScore >= 45
      ? `오늘 ${name}님의 표정은 미소 지수 ${metrics.smileScore}%로 온화하고 안정되어 있습니다. 차분한 인상 덕분에 믿음직한 호감을 주는 상태입니다.`
      : metrics.tensionScore >= 50
      ? `오늘 ${name}님의 표정은 진지한 집중력이 돋보입니다. 중요한 일을 처리하기엔 좋지만, 거울을 보고 가볍게 미소를 지어주면 운이 한층 더 부드럽게 풀립니다.`
      : `오늘 ${name}님의 표정은 흔들림 없이 편안한 균형을 유지하고 있습니다. 감정 기복 없이 차분하게 하루를 이끌어갈 수 있는 좋은 상태입니다.`;

  // 얼굴 핵심 하이라이트 3개 (쉬운 말)
  const faceHighlights = [
    `얼굴형 · ${metrics.faceShape}: ${desc.trait}`,
    `눈매와 눈빛 · ${metrics.eyeTilt} (활력 ${metrics.vitalityScore}점): 호감과 자신감이 서려 있습니다.`,
    `표정 상태 · ${metrics.expression} (미소 ${metrics.smileScore}%): 긍정적인 기운이 감돕니다.`,
  ];

  // 총운 텍스트
  const overallReading = `${myeongri.dateText}, ${name}님(${birthInfo.zodiac})의 오늘은 ${myeongri.energySummary} 스캔된 ${metrics.faceShape} 얼굴과 밝은 표정 기운이 조화를 이루어, 대인관계와 업무 모두에서 편안하고 실속 있게 풀릴 하루입니다. 긍정적인 마음으로 하루를 시작해 보세요!`;

  const categories: FortuneCategory[] = [
    {
      id: 'business',
      title: '사업·직장운',
      score: businessScore,
      summary:
        businessScore >= 85
          ? '자신감 넘치는 추진력으로 좋은 성과를 낼 날!'
          : '차분하게 중심을 잡고 실속을 챙기기 좋은 날',
      detail: `${desc.businessTip} ${
        metrics.vitalityScore >= 80
          ? '눈빛에 생기가 넘쳐 중요한 미팅이나 발표에서 당당하게 의견을 전달하기 좋습니다.'
          : '무리한 결정보다는 한 번 더 검토하는 꼼꼼함이 성공의 열쇠가 됩니다.'
      }`,
    },
    {
      id: 'wealth',
      title: '재물·금전운',
      score: wealthScore,
      summary:
        wealthScore >= 85
          ? '금전 기운이 활짝 열려 뜻밖의 이득이 기대되는 날'
          : '새는 돈을 막고 알뜰하게 지키는 실속 재물운',
      detail: `${desc.wealthTip} 코와 입매의 균형이 안정적이어서 충동구매만 자제한다면 돈이 알차게 모이는 흐름입니다.`,
    },
    {
      id: 'love',
      title: '연애·인연운',
      score: loveScore,
      summary:
        loveScore >= 85
          ? '호감도 급상승! 밝은 미소로 매력이 폭발하는 날'
          : '편안한 대화 속에서 서로의 마음이 통하는 날',
      detail: `${desc.loveTip} ${
        metrics.smileScore >= 60
          ? '오늘의 따뜻한 미소가 상대방의 경계심을 풀어주니 먼저 밝게 인사를 건네보세요.'
          : '가벼운 안부 연락 한 통이 소중한 인연과의 관계를 더욱 돈독하게 만들어줍니다.'
      }`,
    },
    {
      id: 'study',
      title: '학업·성취운',
      score: studyScore,
      summary:
        studyScore >= 85
          ? '집중력 최고조! 새로운 지식과 기술이 쏙쏙 들어오는 날'
          : '차분하게 계획대로 목표 분량을 끝낼 수 있는 날',
      detail: `${desc.studyTip} 잡생각을 줄이고 우선순위 1번 과제부터 시작하면 기대 이상의 성취감을 맛볼 수 있습니다.`,
    },
    {
      id: 'health',
      title: '건강·컨디션',
      score: healthScore,
      summary:
        metrics.tensionScore >= 45
          ? '어깨와 눈의 긴장을 살짝 풀면 활력이 살아납니다'
          : '몸과 마음이 상쾌하고 에너지 순환이 원활한 날',
      detail:
        metrics.tensionScore >= 45
          ? '집중하다 보면 미간이나 목에 힘이 들어갈 수 있어요. 따뜻한 차 한 잔과 3분 목 스트레칭으로 리프레시해 주세요.'
          : '전반적인 얼굴 표정 근육이 편안하게 이완되어 있습니다. 가벼운 산책이나 스트레칭으로 좋은 컨디션을 유지하세요.',
    },
  ];

  const luckyColors = [
    { name: '편안한 네이비 블루', hex: '#3b82f6' },
    { name: '화사한 에메랄드 그린', hex: '#10b981' },
    { name: '따뜻한 로즈 베이지', hex: '#f472b6' },
    { name: '산뜻한 옐로우 골드', hex: '#f59e0b' },
    { name: '깔끔한 소프트 화이트', hex: '#cbd5e1' },
  ];
  const luckyPick = seededPick(luckyColors, seed);

  const luckyActions = [
    '거울을 보고 스스로에게 밝은 미소 짓기',
    '아침에 시원한 물 한 잔으로 기분 좋게 시작하기',
    '주변 사람에게 먼저 기분 좋은 인사 건네기',
    '책상이나 스마트폰 화면 1분 정리하기',
    '오후에 10분 가벼운 햇볕 쬐며 산책하기',
  ];

  const luckyCautions = [
    '조급하게 한꺼번에 여러 일 벌이지 않기',
    '충동적인 인터넷 쇼핑 결제 3분만 생각하기',
    '감정이 앞서 날카로운 말투 쓰지 않기',
    '밤늦게 스마트폰 오래 보며 수면 방해하지 않기',
  ];

  const luckyNum1 = (seed % 9) + 1;
  const luckyNum2 = ((seed * 3 + 7) % 39) + 10;

  return {
    user,
    zodiac: birthInfo.zodiac,
    age: birthInfo.age,
    title: `${name}님의 오늘 운세`,
    subtitle: `${birthInfo.formatted} (${birthInfo.zodiac}) · ${myeongri.dateText}`,
    overallScore,
    overallReading,
    faceReading,
    faceHighlights,
    categories,
    lucky: {
      color: luckyPick.name,
      colorHex: luckyPick.hex,
      number: `${luckyNum1}, ${luckyNum2}`,
      action: seededPick(luckyActions, seed + 1),
      caution: seededPick(luckyCautions, seed + 2),
    },
    promptUsed: buildFortunePrompt(user, metrics, myeongri),
    source: 'local-engine',
    myeongri,
    metrics,
  };
}

export async function generateFortune(
  user: UserProfile,
  metrics: FaceMetrics,
  myeongri: MyeongriDay,
  settings: AppSettings
): Promise<FortuneResultData> {
  const prompt = buildFortunePrompt(user, metrics, myeongri);
  const birthInfo = getUserBirthInfo(user.birthDate);
  const name = user.name.trim() || '고객';

  if (settings.engine === 'gemini' && settings.geminiApiKey.trim().length > 10) {
    try {
      const model = settings.geminiModel || 'gemini-2.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(settings.geminiApiKey.trim())}`;

      const jsonInstruction = `${prompt}

반드시 아래 JSON 형식으로만 응답해 주세요 (어려운 한자나 관상 전문 용어 없이 쉬운 우리말로 작성):
{
  "title": "${name}님의 오늘 운세",
  "subtitle": "${birthInfo.formatted} (${birthInfo.zodiac}) · ${myeongri.dateText}",
  "overallScore": 88,
  "overallReading": "오늘의 전체적인 하루 운세 풀이 (2~3문장)",
  "faceReading": "스캔된 오늘 얼굴 표정과 인상에 대한 친근한 피드백 (1~2문장)",
  "faceHighlights": ["얼굴형 특징 1가지", "눈매/표정 특징 1가지", "오늘의 기운 1가지"],
  "categories": [
    { "id": "business", "title": "사업·직장운", "score": 88, "summary": "한줄 요약", "detail": "상세 조언 2문장" },
    { "id": "wealth", "title": "재물·금전운", "score": 85, "summary": "한줄 요약", "detail": "상세 조언 2문장" },
    { "id": "love", "title": "연애·인연운", "score": 90, "summary": "한줄 요약", "detail": "상세 조언 2문장" },
    { "id": "study", "title": "학업·성취운", "score": 86, "summary": "한줄 요약", "detail": "상세 조언 2문장" },
    { "id": "health", "title": "건강·컨디션", "score": 84, "summary": "한줄 요약", "detail": "상세 조언 2문장" }
  ],
  "lucky": {
    "color": "행운의 색",
    "colorHex": "#10b981",
    "number": "7, 21",
    "action": "오늘 하면 좋은 행동",
    "caution": "오늘 주의할 점"
  }
}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: jsonInstruction }] }],
          generationConfig: {
            temperature: 0.85,
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
              faceReading: String(parsed.faceReading || '오늘 얼굴에 긍정적인 활력이 가득합니다.'),
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
            };
          }
        }
      }
    } catch (err) {
      console.warn('Gemini API 호출 실패, 내장 엔진으로 생성합니다:', err);
    }
  }

  return generateLocalFortune(user, metrics, myeongri);
}
