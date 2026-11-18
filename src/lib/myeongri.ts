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
    keyword: '성장과 새로운 시작',
    summary: '새싹이 뻗어 나가듯 추진력과 아이디어가 살아나는 날입니다.',
  },
  '화(火)': {
    keyword: '열정과 인기의 발산',
    summary: '존재감이 빛나고 사람들의 시선과 호감이 모이는 화기(火氣)의 날입니다.',
  },
  '토(土)': {
    keyword: '신뢰와 재물의 축적',
    summary: '중심을 잡고 차분히 쌓아 올릴수록 실속과 재복이 두터워지는 날입니다.',
  },
  '금(金)': {
    keyword: '결단과 명쾌한 성과',
    summary: '군더더기를 덜어내고 핵심을 찌를 때 깔끔한 결실이 따라오는 날입니다.',
  },
  '수(水)': {
    keyword: '지혜와 유연한 소통',
    summary: '물처럼 부드럽게 흐르며 직감과 인맥에서 뜻밖의 힌트를 얻는 날입니다.',
  },
};

export function getMyeongriDay(date: Date = new Date()): MyeongriDay {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = WEEKDAYS[date.getDay()];

  // 1900-01-01 = 갑술일 (60갑자 인덱스 10) 기준 일진 계산
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
    yearGanji: `${yearStemObj.kr}${yearBranchObj.kr}(${yearStemObj.hanja}${yearBranchObj.hanja})년`,
    dayGanji: `${dayStemObj.kr}${dayBranchObj.kr}(${dayStemObj.hanja}${dayBranchObj.hanja})일`,
    dayStem: `${dayStemObj.kr}(${dayStemObj.hanja})`,
    dayBranch: `${dayBranchObj.kr}(${dayBranchObj.hanja})`,
    element: dayStemObj.element,
    elementColor: dayStemObj.color,
    elementKeyword: meta.keyword,
    energySummary: meta.summary,
    daySeed: year * 10000 + month * 100 + day,
  };
}
