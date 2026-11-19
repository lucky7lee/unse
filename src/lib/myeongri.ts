import { FiveElement, MyeongriDay } from '../types/fortune';

const HEAVENLY_STEMS = [
  { kr: '갑', hanja: '甲', element: '목(木)' as FiveElement, color: '#34d399' },
  { kr: '을', hanja: '乙', element: '목(木)' as FiveElement, color: '#34d399' },
  { kr: '병', hanja: '丙', element: '화(火)' as FiveElement, color: '#f87171' },
  { kr: '정', hanja: '丁', element: '화(火)' as FiveElement, color: '#f87171' },
  { kr: '무', hanja: '戊', element: '토(土)' as FiveElement, color: '#fbbf24' },
  { kr: '기', hanja: '己', element: '토(土)' as FiveElement, color: '#fbbf24' },
  { kr: '경', hanja: '庚', element: '금(金)' as FiveElement, color: '#e2e8f0' },
  { kr: '신', hanja: '辛', element: '금(金)' as FiveElement, color: '#e2e8f0' },
  { kr: '임', hanja: '壬', element: '수(水)' as FiveElement, color: '#60a5fa' },
  { kr: '계', hanja: '癸', element: '수(水)' as FiveElement, color: '#60a5fa' },
];

const EARTHLY_BRANCHES = [
  { kr: '자', hanja: '子', animal: '쥐' },
  { kr: '축', hanja: '丑', animal: '소' },
  { kr: '인', hanja: '寅', animal: '호랑이' },
  { kr: '묘', hanja: '卯', animal: '토끼' },
  { kr: '진', hanja: '辰', animal: '용' },
  { kr: '사', hanja: '巳', animal: '뱀' },
  { kr: '오', hanja: '午', animal: '말' },
  { kr: '미', hanja: '未', animal: '양' },
  { kr: '신', hanja: '申', animal: '원숭이' },
  { kr: '유', hanja: '酉', animal: '닭' },
  { kr: '술', hanja: '戌', animal: '개' },
  { kr: '해', hanja: '亥', animal: '돼지' },
];

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const ELEMENT_META: Record<
  FiveElement,
  { keyword: string; summary: string }
> = {
  '목(木)': {
    keyword: '새로운 시작과 성장',
    summary: '새싹이 힘차게 돋아나듯 새로운 아이디어와 추진력이 살아나는 날입니다.',
  },
  '화(火)': {
    keyword: '열정과 활기찬 소통',
    summary: '주변 사람들에게 긍정적인 에너지를 전하고 주목을 받기 좋은 날입니다.',
  },
  '토(土)': {
    keyword: '안정과 실속 있는 결실',
    summary: '차분하게 중심을 잡고 실속을 챙길수록 좋은 성과가 따라오는 날입니다.',
  },
  '금(金)': {
    keyword: '깔끔한 정리와 명쾌한 판단',
    summary: '복잡한 일을 명쾌하게 정리하고 깔끔하게 마무리하기 좋은 날입니다.',
  },
  '수(水)': {
    keyword: '유연한 지혜와 편안한 흐름',
    summary: '흐르는 물처럼 유연하게 대처하며 자연스럽게 기회를 얻는 날입니다.',
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

export interface UserBirthInfo {
  zodiac: string;
  age: number;
  formatted: string;
  birthYear: number;
}

export function getUserBirthInfo(birthDateStr: string): UserBirthInfo {
  if (!birthDateStr) {
    return { zodiac: '', age: 0, formatted: '', birthYear: 0 };
  }
  const parts = birthDateStr.split('-').map(Number);
  if (parts.length !== 3 || isNaN(parts[0])) {
    return { zodiac: '', age: 0, formatted: '', birthYear: 0 };
  }
  const [y, m, d] = parts;
  const zodiac = ZODIAC_ANIMALS[y % 12] + '띠';

  const today = new Date();
  let age = today.getFullYear() - y;
  const mDiff = today.getMonth() + 1 - m;
  if (mDiff < 0 || (mDiff === 0 && today.getDate() < d)) {
    age--;
  }

  return {
    zodiac,
    age: Math.max(0, age),
    formatted: `${y}년 ${m}월 ${d}일생`,
    birthYear: y,
  };
}
