import {
  AppSettings,
  FaceMetrics,
  FaceShapeType,
  FiveElement,
  FortuneCategory,
  FortuneResultData,
  MyeongriDay,
} from '../types/fortune';

export function buildFortunePrompt(
  metrics: FaceMetrics,
  myeongri: MyeongriDay
): string {
  return `당신은 전통 관상학(마의상법)과 명리학(사주·오행)에 정통하면서도 재치 넘치는 MZ 감성 관상 마스터입니다.

[오늘의 명리 일진]
- 날짜: ${myeongri.dateText}
- 간지: ${myeongri.yearGanji} ${myeongri.dayGanji}
- 오늘의 오행 기운: ${myeongri.element} (${myeongri.elementKeyword})

[스캔된 사용자 얼굴 데이터]
- 오늘의 표정/감정: ${metrics.expression} (미소 지수 ${metrics.smileScore}%, 긴장도 ${metrics.tensionScore}%)
- 얼굴형: ${metrics.faceShape} (가로/세로 비율 ${metrics.faceRatioWH}, 턱/광대 비율 ${metrics.jawToCheekRatio})
- 삼정(三停) 비율: 상정(이마) ${metrics.samjeong.upper}% / 중정(코·눈) ${metrics.samjeong.middle}% / 하정(입·턱) ${metrics.samjeong.lower}% (${metrics.samjeong.dominant} 발달)
- 눈썹 모양: ${metrics.eyebrowShape}
- 눈매/눈꼬리: ${metrics.eyeTilt} (${metrics.eyeTiltDeg}°)
- 재백궁(코): ${metrics.noseType} (재물 기운 ${metrics.wealthZoneScore}점)
- 좌우 대칭도: ${metrics.symmetryScore}% / 눈빛 활력도: ${metrics.vitalityScore}% / 도화 매력 지수: ${metrics.charmScore}%

위 얼굴 데이터와 오늘의 날짜(${myeongri.dateText}, ${myeongri.dayGanji}, ${myeongri.element} 기운)를 유쾌하게 엮어, 전통 관상학과 명리학 용어를 센스 있게 섞은 오늘의 운세(총운, 재물운, 연애운, 직장·학업운, 건강·컨디션운, 행운의 처방)를 작성해 주세요.`;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function seededPick<T>(arr: T[], seed: number): T {
  const idx = Math.abs(seed) % arr.length;
  return arr[idx];
}

const FACE_SHAPE_LORE: Record<
  FaceShapeType,
  {
    element: string;
    trait: string;
    wealthHook: string;
    loveHook: string;
    careerHook: string;
  }
> = {
  계란형: {
    element: '조화의 상(調和相)',
    trait: '오행의 기운이 어느 한쪽으로 치우치지 않고 매끄럽게 순환하는 황금 밸런스 얼굴형',
    wealthHook: '돈이 들어오는 길목이 트여 있어 무리하지 않아도 실속 있는 기회가 자연스레 굴러듭니다.',
    loveHook: '첫인상부터 호감도가 높아 썸이나 대화에서 묘한 설렘을 이끌어내는 도화 기운이 강합니다.',
    careerHook: '유연한 소통 능력 덕분에 팀 안에서 해결사 역할을 톡톡히 해내며 신뢰를 얻습니다.',
  },
  둥근형: {
    element: '수형(水形) · 복덕상',
    trait: '동글동글한 윤곽에 인복과 재복이 넉넉히 고이는 대표적 귀인·복덕 관상',
    wealthHook: '혼자 버는 돈보다 사람을 통해 들어오는 식복·재복이 크니, 커피 한 잔 나누는 자리에 뜻밖의 금맥이 숨어 있습니다.',
    loveHook: '상대방의 무장해제를 부르는 따뜻한 기운! 오늘은 솔직한 리액션 하나가 마음을 녹입니다.',
    careerHook: '둥근 친화력이 최고의 무기! 까다로운 안건도 부드러운 한마디로 술술 풀어낼 운입니다.',
  },
  각진형: {
    element: '토·금형(土金形) · 장군상',
    trait: '턱선과 윤곽에 뚝심과 실행력이 서려 있는 믿음직한 리더·승부사 관상',
    wealthHook: '한 번 잡은 재물은 쉽게 새지 않는 단단한 금고형! 충동 소비만 피하면 묵직한 수익으로 이어집니다.',
    loveHook: '겉은 듬직하고 속은 다정한 반전 매력! 가벼운 농담보다 진심 어린 한 마디가 100점입니다.',
    careerHook: '추진력이 폭발하는 날! 미뤄뒀던 결정이나 어려운 과제를 밀어붙이면 확실한 성과를 거둡니다.',
  },
  긴형: {
    element: '목형(木形) · 선비·전략가상',
    trait: '깊은 사고력과 센스 있는 안목이 깃든 우아한 기획자·예술가 관상',
    wealthHook: '감각과 정보력이 곧 돈이 되는 날! 남들이 못 본 디테일이나 할인·투자 포인트를 기가 막히게 포착합니다.',
    loveHook: '은근히 빠져드는 지적인 매력! 대화가 잘 통하는 상대와 시간 가는 줄 모를 기운이 흐릅니다.',
    careerHook: '기획력·문서운·아이디어운이 반짝입니다. 메모장에 떠오른 생각을 바로 정리하면 대박 찬스가 됩니다.',
  },
  하트형: {
    element: '화형(火形) · 도화·센스상',
    trait: '시원한 이마와 날렵한 턱선이 어우러져 감각과 인기가 넘치는 스포트라이트 관상',
    wealthHook: '트렌드를 읽는 촉이 날카로운 날! 부업·아이디어·소소한 이벤트 운까지 쏠쏠하게 따라옵니다.',
    loveHook: '오늘 연애운 치트키 발동! 가볍게 건넨 눈웃음과 센스 있는 멘트가 상대의 심박수를 올립니다.',
    careerHook: '톡톡 튀는 아이디어와 빠른 순발력으로 주목받습니다. 발표나 제안이 있다면 자신 있게 나서세요.',
  },
  역삼각형: {
    element: '화·금형(火金形) · 천재·직관상',
    trait: '넓은 이마(초년·지혜운)와 또렷한 턱선에 날카로운 직감이 흐르는 브레인 관상',
    wealthHook: '빠른 판단력이 재물을 부릅니다. 다만 직감이 너무 빨라 충동 결제할 수 있으니 장바구니 3분 숙려를 추천!',
    loveHook: '시크한 듯 다정한 츤데레 무드가 매력 포인트! 먼저 작은 관심을 표현하면 관계가 급진전됩니다.',
    careerHook: '복잡한 문제의 핵심을 단번에 꿰뚫는 날! 효율적인 방법 하나를 찾아내 주변의 감탄을 자아냅니다.',
  },
};

const LUCKY_BY_ELEMENT: Record<
  FiveElement,
  { color: string; hex: string; items: string[]; actions: string[]; cautions: string[] }
> = {
  '목(木)': {
    color: '청록 에메랄드',
    hex: '#10b981',
    items: ['민트/허브 티 한 잔', '초록 포인트 소품', '새 노트나 펜'],
    actions: ['오전 중 10분 가벼운 산책으로 목(木) 기운 깨우기', '미뤄둔 새 계획 첫 줄 적어보기'],
    cautions: ['너무 많은 일을 한꺼번에 벌이지 않기', '조급한 결정은 10초만 숨 고르기'],
  },
  '화(火)': {
    color: '로열 버건디 골드',
    hex: '#f43f5e',
    items: ['따뜻한 아메리카노/라떼', '골드·로즈골드 액세서리', '향기 좋은 핸드크림'],
    actions: ['먼저 반갑게 인사 건네 화기(火氣) 인복 열기', '거울 보고 입꼬리 3초 올리기'],
    cautions: ['감정이 앞서 톡 쏘는 말투 주의', '카페인 과다 섭취만 살짝 조절하기'],
  },
  '토(土)': {
    color: '앰버 머스터드 골드',
    hex: '#f59e0b',
    items: ['견과류·고소한 간식', '가죽 지갑/카드지갑 정리', '베이지·브라운 계열 아이템'],
    actions: ['지갑이나 앱 계좌 잔고 정리하며 재백궁 기운 다지기', '든든한 식사로 중심 잡기'],
    cautions: ['고집 때문에 좋은 제안을 놓치지 않기', '지나친 걱정은 오늘만 내려놓기'],
  },
  '금(金)': {
    color: '실버 샴페인 화이트',
    hex: '#cbd5e1',
    items: ['시계 또는 메탈 소품', '시원한 탄산수/물 한 잔', '깔끔한 화이트 아이템'],
    actions: ['책상이나 스마트폰 홈 화면 1분 정리로 금(金) 기운 정화', '핵심 1가지 일부터 깔끔히 끝내기'],
    cautions: ['완벽주의로 스스로를 너무 몰아세우지 않기', '날카로운 피드백은 부드럽게 포장하기'],
  },
  '수(水)': {
    color: '미드나잇 사파이어 블루',
    hex: '#3b82f6',
    items: ['텀블러 가득 시원한 물', '네이비·블루 포인트', '잔잔한 플레이리스트'],
    actions: ['오랜만에 생각난 지인에게 짧은 안부 톡 보내기', '충분한 수분 섭취로 맑은 직감 유지'],
    cautions: ['생각이 꼬리를 물어 밤늦게 폰 보지 않기', '우유부단함 대신 첫 직감을 믿어보기'],
  },
};

export function generateLocalFortune(
  metrics: FaceMetrics,
  myeongri: MyeongriDay
): FortuneResultData {
  const lore = FACE_SHAPE_LORE[metrics.faceShape];
  const luckyPool = LUCKY_BY_ELEMENT[myeongri.element];
  const seed =
    myeongri.daySeed +
    metrics.smileScore * 7 +
    metrics.wealthZoneScore * 13 +
    metrics.charmScore * 17;

  // 카테고리별 점수 산출 (실제 스캔 수치 + 오늘 일진 조합)
  const wealthScore = clamp(
    Math.round(
      metrics.wealthZoneScore * 0.55 +
        metrics.smileScore * 0.2 +
        metrics.symmetryScore * 0.15 +
        (myeongri.element === '토(土)' || myeongri.element === '금(金)' ? 10 : 5)
    ),
    64,
    99
  );

  const loveScore = clamp(
    Math.round(
      metrics.charmScore * 0.5 +
        metrics.smileScore * 0.3 +
        (metrics.eyeTiltDeg >= 2.5 ? 11 : 7) +
        (myeongri.element === '화(火)' || myeongri.element === '수(水)' ? 8 : 4)
    ),
    63,
    99
  );

  const careerScore = clamp(
    Math.round(
      metrics.vitalityScore * 0.45 +
        metrics.symmetryScore * 0.35 +
        (metrics.samjeong.dominant === '상정' || metrics.samjeong.dominant === '중정'
          ? 12
          : 9) +
        (myeongri.element === '목(木)' || myeongri.element === '금(金)' ? 8 : 4)
    ),
    65,
    99
  );

  const healthScore = clamp(
    Math.round(
      metrics.vitalityScore * 0.5 +
        (100 - metrics.tensionScore) * 0.35 +
        14
    ),
    62,
    98
  );

  const overallScore = clamp(
    Math.round((wealthScore + loveScore + careerScore + healthScore) / 4 + 2),
    68,
    99
  );

  // 타이틀 생성
  const smileTitle =
    metrics.smileScore >= 72
      ? '웃음 끝에 황금이 맺히는'
      : metrics.smileScore >= 46
      ? '은은한 미소로 귀인을 부르는'
      : metrics.tensionScore >= 50
      ? '카리스마 눈빛으로 판을 뒤집는'
      : '고요한 기품 속에 복을 품은';

  const shapeTitleMap: Record<FaceShapeType, string> = {
    계란형: '황금 밸런스 도화·재복상',
    둥근형: '만복이 고이는 귀인·복덕상',
    각진형: '뚝심으로 대박을 잡는 장군·재물상',
    긴형: '지혜로 금맥을 짚는 전략가상',
    하트형: '인기와 행운을 싹쓸이하는 스포트라이트상',
    역삼각형: '촉 하나로 천기를 읽는 직관·브레인상',
  };

  const title = `${smileTitle} ${shapeTitleMap[metrics.faceShape]}`;
  const subtitle = `${myeongri.dayGanji} · ${myeongri.element} 기운과 '${metrics.faceShape}' 관상의 유쾌한 만남`;

  // 표정 코멘트
  const expressionSentence =
    metrics.smileScore >= 72
      ? `스캔된 미소 지수가 무려 ${metrics.smileScore}%! 관상학에서 입꼬리가 활짝 올라간 날은 '복덕궁(福德宮)'의 문이 활짝 열렸다는 신호입니다.`
      : metrics.smileScore >= 46
      ? `미소 지수 ${metrics.smileScore}%의 온화한 표정! 인당(미간)이 부드럽게 열려 있어 좋은 소식이 걸림돌 없이 들어오는 상태입니다.`
      : metrics.tensionScore >= 50
      ? `현재 집중도와 카리스마가 높게 잡혔네요(긴장도 ${metrics.tensionScore}%). 승부처에선 멋지지만, 가끔 입꼬리만 살짝 풀어주면 재복이 두 배로 붙습니다.`
      : `미소 지수 ${metrics.smileScore}%의 차분하고 안정적인 표정! 흔들림 없는 기운 덕분에 오늘 판단 미스가 확 줄어듭니다.`;

  // 눈매 + 눈썹 코멘트
  const eyeSentence =
    metrics.eyeTiltDeg >= 3.2
      ? `눈꼬리가 ${metrics.eyeTiltDeg}° 살짝 올라간 매혹적인 눈매에 '${metrics.eyebrowShape}'이 더해져, 오늘 은근한 승부욕과 사람들의 시선을 끄는 도화살이 반짝입니다.`
      : metrics.eyeTiltDeg <= -2.0
      ? `눈꼬리가 부드럽게 내려간 선한 눈매와 '${metrics.eyebrowShape}' 덕분에, 오늘 어디를 가든 "이 사람 믿을 만하다!"라는 호감과 귀인운이 따라옵니다.`
      : `좌우 대칭도 ${metrics.symmetryScore}%의 조화로운 눈매와 '${metrics.eyebrowShape}'이 어우러져, 감정에 휩쓸리지 않고 실속을 챙기는 명석한 하루가 됩니다.`;

  const samjeongDesc =
    metrics.samjeong.dominant === '상정'
      ? `상정(이마 ${metrics.samjeong.upper}%)이 시원하게 트여 있어 아이디어와 윗사람 복이 강하게 작용합니다.`
      : metrics.samjeong.dominant === '중정'
      ? `중정(눈~코 ${metrics.samjeong.middle}%)의 기운이 탄탄해 오늘 본인의 실력과 추진력이 제대로 빛을 발합니다.`
      : metrics.samjeong.dominant === '하정'
      ? `하정(입~턱 ${metrics.samjeong.lower}%)이 든든해 말년운과 마무리 운이 좋고, 시작한 일의 결실이 알찹니다.`
      : `상정(${metrics.samjeong.upper}%)·중정(${metrics.samjeong.middle}%)·하정(${metrics.samjeong.lower}%) 삼정 비율이 이상적으로 균형을 이뤄, 오전부터 밤까지 기복 없이 술술 풀립니다.`;

  const overallReading = `${myeongri.dateText}, 오늘은 명리학으로 ${myeongri.dayGanji} — ${myeongri.element} 기운이 흐르는 '${myeongri.elementKeyword}'의 날입니다. ${lore.trait}인 당신의 얼굴에 오늘의 기운이 만나 시너지가 폭발하네요! ${expressionSentence} ${eyeSentence} ${samjeongDesc}`;

  const gwansangPoints = [
    `얼굴형 · ${metrics.faceShape} (${lore.element}): ${lore.trait}`,
    `재백궁(코) · ${metrics.noseType} (${metrics.wealthZoneScore}점): 재물 기운의 중심축이 안정적입니다.`,
    `표정 & 눈매 · ${metrics.expression} / ${metrics.eyeTilt}: 오늘의 매력 지수 ${metrics.charmScore}점!`,
  ];

  const categories: FortuneCategory[] = [
    {
      id: 'wealth',
      title: '재물운',
      score: wealthScore,
      summary:
        wealthScore >= 85
          ? '재백궁에 황금빛이 감도는 날! 뜻밖의 실속 찬스'
          : '새는 돈을 막고 알짜 기회를 잡는 실속 재물운',
      detail: `관상에서 재물 창고인 재백궁(코)이 '${metrics.noseType}'(${metrics.wealthZoneScore}점)으로 분석되었습니다. ${lore.wealthHook} 특히 오늘의 ${myeongri.element} 기운과 맞물려 ${
        myeongri.element === '토(土)' || myeongri.element === '금(金)'
          ? '적금·정산·협상에서 유리한 조건을 쥐기 딱 좋은 타이밍입니다.'
          : '사람과의 정보 교류나 뜻밖의 소소한 횡재(쿠폰·선물·보너스) 운이 쏠쏠합니다.'
      }`,
    },
    {
      id: 'love',
      title: '연애·인연운',
      score: loveScore,
      summary:
        loveScore >= 85
          ? '도화 기운 만개! 눈빛과 미소만으로 호감도 급상승'
          : '편안한 대화 속에서 은근히 설렘이 싹트는 날',
      detail: `도화·매력 지수 ${metrics.charmScore}점! ${
        metrics.eyeTiltDeg >= 2.5
          ? '살짝 올라간 눈꼬리가 묘한 끌림을 만들어내니'
          : '선하고 부드러운 눈빛이 상대의 경계심을 녹여주니'
      } ${lore.loveHook} 커플이라면 사소한 칭찬 한 마디가 분위기를 확 달궈주고, 솔로라면 예상치 못한 자리에서 눈 마주치는 인연에 주목해 보세요!`,
    },
    {
      id: 'career',
      title: '직장·학업운',
      score: careerScore,
      summary:
        careerScore >= 85
          ? '눈빛 활력 최상! 존재감과 성과를 동시에 거머쥐는 날'
          : '차분한 집중력으로 한 방을 만들어내는 실력 발휘의 날',
      detail: `눈썹('${metrics.eyebrowShape}')과 눈빛 활력도 ${metrics.vitalityScore}%가 맞물려 업무·학업 몰입도가 높습니다. ${lore.careerHook} ${myeongri.energySummary}`,
    },
    {
      id: 'health',
      title: '건강·컨디션운',
      score: healthScore,
      summary:
        metrics.tensionScore >= 48
          ? '어깨와 미간의 힘을 살짝 풀면 컨디션이 수직 상승!'
          : '기혈 순환이 맑고 활력이 넘치는 상쾌한 컨디션',
      detail: `표정 긴장도는 ${metrics.tensionScore}%로 측정되었습니다. ${
        metrics.tensionScore >= 48
          ? '집중력이 좋은 대신 눈가와 턱에 힘이 들어가기 쉬운 상태예요. 따뜻한 물 한 잔과 3분 스트레칭으로 기운을 순환시키면 오후까지 거뜬합니다.'
          : '얼굴 근육이 편안하게 이완되어 있어 스트레스 회복력이 아주 좋습니다. 가벼운 산책이나 좋아하는 음악과 함께하면 오늘의 행운 지수가 한 층 더 올라갑니다.'
      }`,
    },
  ];

  const luckyNum1 = ((seed % 9) + 1);
  const luckyNum2 = (((seed * 3 + 7) % 39) + 10);

  return {
    title,
    subtitle,
    overallScore,
    overallReading,
    gwansangPoints,
    categories,
    lucky: {
      color: luckyPool.color,
      colorHex: luckyPool.hex,
      number: `${luckyNum1}, ${luckyNum2}`,
      item: seededPick(luckyPool.items, seed),
      action: seededPick(luckyPool.actions, seed + 1),
      caution: seededPick(luckyPool.cautions, seed + 2),
    },
    promptUsed: buildFortunePrompt(metrics, myeongri),
    source: 'local-engine',
    myeongri,
    metrics,
  };
}

export async function generateFortune(
  metrics: FaceMetrics,
  myeongri: MyeongriDay,
  settings: AppSettings
): Promise<FortuneResultData> {
  const prompt = buildFortunePrompt(metrics, myeongri);

  if (settings.engine === 'gemini' && settings.geminiApiKey.trim().length > 10) {
    try {
      const model = settings.geminiModel || 'gemini-2.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(settings.geminiApiKey.trim())}`;

      const jsonInstruction = `${prompt}

반드시 아래 JSON 형식으로만 응답해 주세요 (마크다운 코드블록 없이 순수 JSON):
{
  "title": "유쾌하고 임팩트 있는 15~24자 관상 타이틀",
  "subtitle": "오늘의 일진과 관상을 엮은 한줄 부제",
  "overallScore": 88,
  "overallReading": "전통 관상학과 명리학을 유쾌하게 버무린 3~4문장 총운 풀이",
  "gwansangPoints": ["핵심 관상 포인트 1", "핵심 관상 포인트 2", "핵심 관상 포인트 3"],
  "categories": [
    { "id": "wealth", "title": "재물운", "score": 90, "summary": "한줄 요약", "detail": "2~3문장 유쾌한 상세 풀이" },
    { "id": "love", "title": "연애·인연운", "score": 85, "summary": "한줄 요약", "detail": "2~3문장 유쾌한 상세 풀이" },
    { "id": "career", "title": "직장·학업운", "score": 87, "summary": "한줄 요약", "detail": "2~3문장 유쾌한 상세 풀이" },
    { "id": "health", "title": "건강·컨디션운", "score": 84, "summary": "한줄 요약", "detail": "2~3문장 유쾌한 상세 풀이" }
  ],
  "lucky": {
    "color": "행운의 색 이름",
    "colorHex": "#d4af37",
    "number": "3, 17",
    "item": "행운의 아이템",
    "action": "오늘 해보면 좋은 행운의 행동",
    "caution": "오늘 살짝 피하면 좋은 것"
  }
}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: jsonInstruction }] }],
          generationConfig: {
            temperature: 0.9,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`Gemini API 오류 (${res.status})`);
      }

      const data = await res.json();
      const text: string | undefined =
        data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('응답이 비어 있습니다.');

      const cleaned = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      if (
        parsed?.title &&
        parsed?.overallReading &&
        Array.isArray(parsed?.categories) &&
        parsed.categories.length >= 4
      ) {
        return {
          title: String(parsed.title),
          subtitle: String(parsed.subtitle || `${myeongri.dayGanji} · AI 관상 풀이`),
          overallScore: clamp(Number(parsed.overallScore) || 86, 60, 99),
          overallReading: String(parsed.overallReading),
          gwansangPoints: Array.isArray(parsed.gwansangPoints)
            ? parsed.gwansangPoints.slice(0, 3).map(String)
            : [],
          categories: parsed.categories.slice(0, 4).map((c: FortuneCategory) => ({
            id: c.id,
            title: String(c.title),
            score: clamp(Number(c.score) || 82, 55, 99),
            summary: String(c.summary),
            detail: String(c.detail),
          })),
          lucky: {
            color: String(parsed.lucky?.color || '황금 골드'),
            colorHex: String(parsed.lucky?.colorHex || '#d4af37'),
            number: String(parsed.lucky?.number || '7, 21'),
            item: String(parsed.lucky?.item || '따뜻한 차 한 잔'),
            action: String(parsed.lucky?.action || '입꼬리 살짝 올리며 하루 시작하기'),
            caution: String(parsed.lucky?.caution || '조급한 결정 피하기'),
          },
          promptUsed: prompt,
          source: 'gemini-api',
          myeongri,
          metrics,
        };
      }
    } catch (err) {
      console.warn('Gemini API 호출 실패 — 내장 관상 엔진으로 폴백합니다:', err);
    }
  }

  return generateLocalFortune(metrics, myeongri);
}
