import { FiveElement, MyeongriDay } from '../types/fortune';

export const HEAVENLY_STEMS = [
  { kr: '갑', hanja: '甲', element: '목(木)' as FiveElement, color: '#34d399', yinYang: '양' },
  { kr: '을', hanja: '乙', element: '목(木)' as FiveElement, color: '#34d399', yinYang: '음' },
  { kr: '병', hanja: '丙', element: '화(火)' as FiveElement, color: '#f87171', yinYang: '양' },
  { kr: '정', hanja: '丁', element: '화(火)' as FiveElement, color: '#f87171', yinYang: '음' },
  { kr: '무', hanja: '戊', element: '토(土)' as FiveElement, color: '#fbbf24', yinYang: '양' },
  { kr: '기', hanja: '己', element: '토(土)' as FiveElement, color: '#fbbf24', yinYang: '음' },
  { kr: '경', hanja: '庚', element: '금(金)' as FiveElement, color: '#e2e8f0', yinYang: '양' },
  { kr: '신', hanja: '辛', element: '금(金)' as FiveElement, color: '#e2e8f0', yinYang: '음' },
  { kr: '임', hanja: '壬', element: '수(水)' as FiveElement, color: '#60a5fa', yinYang: '양' },
  { kr: '계', hanja: '癸', element: '수(水)' as FiveElement, color: '#60a5fa', yinYang: '음' },
];

export const EARTHLY_BRANCHES = [
  { kr: '자', hanja: '子', animal: '쥐', element: '수(水)' as FiveElement },
  { kr: '축', hanja: '丑', animal: '소', element: '토(土)' as FiveElement },
  { kr: '인', hanja: '寅', animal: '호랑이', element: '목(木)' as FiveElement },
  { kr: '묘', hanja: '卯', animal: '토끼', element: '목(木)' as FiveElement },
  { kr: '진', hanja: '辰', animal: '용', element: '토(土)' as FiveElement },
  { kr: '사', hanja: '巳', animal: '뱀', element: '화(火)' as FiveElement },
  { kr: '오', hanja: '午', animal: '말', element: '화(火)' as FiveElement },
  { kr: '미', hanja: '未', animal: '양', element: '토(土)' as FiveElement },
  { kr: '신', hanja: '申', animal: '원숭이', element: '금(金)' as FiveElement },
  { kr: '유', hanja: '酉', animal: '닭', element: '금(金)' as FiveElement },
  { kr: '술', hanja: '戌', animal: '개', element: '토(土)' as FiveElement },
  { kr: '해', hanja: '亥', animal: '돼지', element: '수(水)' as FiveElement },
];

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const ELEMENT_META: Record<
  FiveElement,
  { keyword: string; summary: string }
> = {
  '목(木)': {
    keyword: '새로운 시작과 도약',
    summary: '새싹이 힘차게 땅을 뚫고 솟아오르듯 추진력과 아이디어가 반짝이는 날입니다.',
  },
  '화(火)': {
    keyword: '열정과 활기찬 발산',
    summary: '태양처럼 따뜻한 기운이 주변을 비추며 많은 사람들의 관심과 호감을 얻는 날입니다.',
  },
  '토(土)': {
    keyword: '안정과 듬직한 실속',
    summary: '대지처럼 단단하게 중심을 잡고 실속과 신뢰를 두텁게 다지기 좋은 날입니다.',
  },
  '금(金)': {
    keyword: '명쾌한 결단과 결실',
    summary: '날카롭고 정확한 판단으로 군더더기를 없애고 확실한 결과를 손에 쥐는 날입니다.',
  },
  '수(水)': {
    keyword: '유연한 지혜와 흐름',
    summary: '흐르는 물처럼 유연하게 장애물을 넘어서며 지혜롭게 이득을 챙기는 날입니다.',
  },
};

export function getMyeongriDay(date: Date = new Date()): MyeongriDay {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = WEEKDAYS[date.getDay()];

  // 1900-01-01 = 갑술일 (60갑자 인덱스 10) 기준
  const refUtc = Date.UTC(1900, 0, 1);
  const targetUtc = Date.UTC(year, date.getMonth(), day);
  const diffDays = Math.floor((targetUtc - refUtc) / 86_400_000);
  const dayIndex = (((10 + diffDays) % 60) + 60) % 60;

  const dayStemObj = HEAVENLY_STEMS[dayIndex % 10];
  const dayBranchObj = EARTHLY_BRANCHES[dayIndex % 12];

  const yearIndex = (((year - 4) % 60) + 60) % 60;
  const yearStemObj = HEAVENLY_STEMS[yearIndex % 10];
  const yearBranchObj = EARTHLY_BRANCHES[yearIndex % 12];

  const meta = ELEMENT_META[dayStemObj.element];
  const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return {
    dateText: `${year}년 ${month}월 ${day}일 (${weekday})`,
    isoDate,
    yearGanji: `${yearStemObj.kr}${yearBranchObj.kr}년`,
    dayGanji: `${dayStemObj.kr}${dayBranchObj.kr}일`,
    dayStem: `${dayStemObj.kr}`,
    dayBranch: `${dayBranchObj.kr}`,
    element: dayStemObj.element,
    elementColor: dayStemObj.color,
    elementKeyword: meta.keyword,
    energySummary: meta.summary,
    daySeed: year * 10000 + month * 100 + day,
  };
}

const ZODIAC_ANIMALS = [
  '원숭이',
  '닭',
  '개',
  '돼지',
  '쥐',
  '소',
  '호랑이',
  '토끼',
  '용',
  '뱀',
  '말',
  '양',
];

export type AgeGroup = '10대' | '20대' | '30대' | '40대' | '50대' | '60대이상';

export interface UserBirthInfo {
  zodiac: string;
  age: number;
  ageGroup: AgeGroup;
  formatted: string;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  dayGanji: string; // 출생일 일진 (사주 일주)
  dayElement: FiveElement;
  relationWithToday: {
    sipshin: string; // 십신 관계 (정재, 편재, 정관, 편관, 식신 등)
    sipshinDesc: string;
    harmonyType: '대길합' | '상생' | '상극조율' | '충돌주의' | '원만평탄';
  };
}

// 오행 인덱스: 0:목, 1:화, 2:토, 3:금, 4:수
const ELEMENT_ORDER: Record<FiveElement, number> = {
  '목(木)': 0,
  '화(火)': 1,
  '토(土)': 2,
  '금(金)': 3,
  '수(水)': 4,
};

// 십신 산출 로직
function calculateSipshin(
  myElement: FiveElement,
  myStemIdx: number,
  todayElement: FiveElement,
  todayStemIdx: number
): { name: string; desc: string } {
  const me = ELEMENT_ORDER[myElement];
  const target = ELEMENT_ORDER[todayElement];
  const sameYinYang = (myStemIdx % 2) === (todayStemIdx % 2);

  const diff = (target - me + 5) % 5;

  if (diff === 0) {
    return sameYinYang
      ? { name: '비견(比肩)', desc: '나와 뜻을 함께하는 든든한 동료와 강력한 자신감이 솟는 기운' }
      : { name: '겁재(劫財)', desc: '치열한 경쟁 속에서 남다른 승부욕과 추진력으로 판을 뒤집는 기운' };
  } else if (diff === 1) {
    return sameYinYang
      ? { name: '식신(食神)', desc: '창의적인 아이디어와 풍성한 식복, 즐거운 일들이 자연스럽게 풀리는 기운' }
      : { name: '상관(傷官)', desc: '톡톡 튀는 순발력과 매력적인 말솜씨로 주변을 사로잡는 기운' };
  } else if (diff === 2) {
    return sameYinYang
      ? { name: '편재(偏財)', desc: '뜻밖의 쏠쏠한 기회와 알짜 수익이 시원하게 열리는 재물 기운' }
      : { name: '정재(正財)', desc: '차곡차곡 실속이 쌓이고 정직한 노력의 대가가 분명하게 돌아오는 재물 기운' };
  } else if (diff === 3) {
    return sameYinYang
      ? { name: '편관(偏官)', desc: '과감한 결단력과 카리스마로 복잡한 난제를 한 방에 돌파하는 기운' }
      : { name: '정관(正官)', desc: '윗사람과 동료들에게 두터운 신뢰를 얻고 명예와 인정을 받는 기운' };
  } else {
    return sameYinYang
      ? { name: '편인(偏印)', desc: '예리한 직관과 남다른 안목으로 숨겨진 해법을 기막히게 찾아내는 기운' }
      : { name: '정인(正印)', desc: '귀인의 따뜻한 도움과 배움, 편안한 마음의 안식을 얻는 기운' };
  }
}

export function getUserBirthInfo(birthDateStr: string, todayDate: Date = new Date()): UserBirthInfo {
  if (!birthDateStr) {
    return {
      zodiac: '토끼띠',
      age: 30,
      ageGroup: '30대',
      formatted: '생년월일 미입력',
      birthYear: 1995,
      birthMonth: 1,
      birthDay: 1,
      dayGanji: '갑자일',
      dayElement: '목(木)',
      relationWithToday: {
        sipshin: '식신(食神)',
        sipshinDesc: '자연스럽게 복이 머무는 날',
        harmonyType: '상생',
      },
    };
  }

  const parts = birthDateStr.split('-').map(Number);
  const [y, m, d] = parts;
  const zodiac = ZODIAC_ANIMALS[y % 12] + '띠';

  let age = todayDate.getFullYear() - y;
  const mDiff = todayDate.getMonth() + 1 - m;
  if (mDiff < 0 || (mDiff === 0 && todayDate.getDate() < d)) {
    age--;
  }
  age = Math.max(0, age);

  let ageGroup: AgeGroup = '30대';
  if (age < 20) ageGroup = '10대';
  else if (age < 30) ageGroup = '20대';
  else if (age < 40) ageGroup = '30대';
  else if (age < 50) ageGroup = '40대';
  else if (age < 60) ageGroup = '50대';
  else ageGroup = '60대이상';

  // 1900-01-01 = 갑술일 (60갑자 인덱스 10) 기준으로 출생일 간지 계산
  const refUtc = Date.UTC(1900, 0, 1);
  const targetUtc = Date.UTC(y, m - 1, d);
  const diffDays = Math.floor((targetUtc - refUtc) / 86_400_000);
  const birthDayIndex = (((10 + diffDays) % 60) + 60) % 60;

  const birthDayStemObj = HEAVENLY_STEMS[birthDayIndex % 10];
  const birthDayBranchObj = EARTHLY_BRANCHES[birthDayIndex % 12];
  const dayGanji = `${birthDayStemObj.kr}${birthDayBranchObj.kr}일`;
  const dayElement = birthDayStemObj.element;

  // 오늘 날짜 일진 인덱스
  const todayTargetUtc = Date.UTC(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());
  const todayDiffDays = Math.floor((todayTargetUtc - refUtc) / 86_400_000);
  const todayDayIndex = (((10 + todayDiffDays) % 60) + 60) % 60;
  const todayStemObj = HEAVENLY_STEMS[todayDayIndex % 10];

  const sipshinInfo = calculateSipshin(
    dayElement,
    birthDayIndex % 10,
    todayStemObj.element,
    todayDayIndex % 10
  );

  let harmonyType: UserBirthInfo['relationWithToday']['harmonyType'] = '상생';
  const diffBranch = Math.abs((birthDayIndex % 12) - (todayDayIndex % 12));
  if (diffBranch === 6) {
    harmonyType = '충돌주의';
  } else if (diffBranch === 4 || diffBranch === 8) {
    harmonyType = '대길합';
  } else if (diffBranch === 1 || diffBranch === 2) {
    harmonyType = '원만평탄';
  } else {
    harmonyType = '상극조율';
  }

  return {
    zodiac,
    age,
    ageGroup,
    formatted: `${y}년 ${m}월 ${d}일생`,
    birthYear: y,
    birthMonth: m,
    birthDay: d,
    dayGanji,
    dayElement,
    relationWithToday: {
      sipshin: sipshinInfo.name,
      sipshinDesc: sipshinInfo.desc,
      harmonyType,
    },
  };
}
