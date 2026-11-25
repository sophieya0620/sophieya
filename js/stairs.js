/* =========================================================
   마음 계단 — 사티어(Satir) 빙산 모델을 참고한 기록 구조
   한 계단씩 안쪽으로 내려가며 마음을 들여다봐요
   1 행동 · 대처방식(생존유형) → 2 감정 → 3 지각 → 4 기대 → 5 열망 → 6 자기
   ========================================================= */

// 대처방식(생존유형) — 스트레스 상황에서 나도 모르게 나오는 방식
const COPING = [
  { id: 'placating',  name: '회유형',   desc: '내 마음보다 상대에게 맞췄어요',       color: '#FFC2D3' },
  { id: 'blaming',    name: '비난형',   desc: '상대를 탓하며 나를 지켰어요',         color: '#FFA3A3' },
  { id: 'super',      name: '초이성형', desc: '감정은 빼고 이성으로만 대했어요',     color: '#C6DCF6' },
  { id: 'irrelevant', name: '산만형',   desc: '주제를 돌리거나 피하고 싶었어요',     color: '#EADFB4' },
  { id: 'congruent',  name: '일치형',   desc: '내 마음을 있는 그대로 표현했어요',   color: '#B7E5CB' },
];
const COPING_MAP = Object.fromEntries(COPING.map(c => [c.id, c]));

// 열망
const YEARNINGS = ['사랑', '수용', '소속감', '창조성', '관계', '안정', '자유', '삶의 목적과 의미'];

// 층 정보 (지도 · 상세 보기에서 사용)
const BERG_LAYERS = [
  { key: 'behavior',    name: '행동',  en: 'behavior',     hint: '보이는 행동과 그날의 이야기', fields: ['event', 'coping'] },
  { key: 'feelings',    name: '감정',  en: 'feelings',     hint: '느낀 감정과 감정에 대한 감정', fields: ['reason', 'feelAbout'] },
  { key: 'perception',  name: '지각',  en: 'perceptions',  hint: '생각 · 믿음 · 가정 · 가치',   fields: ['perception'] },
  { key: 'expectation', name: '기대',  en: 'expectations', hint: '나와 타인에 대한 기대',       fields: ['expectSelf', 'expectOthers', 'expectFromOthers'] },
  { key: 'yearning',    name: '열망',  en: 'yearnings',    hint: '정말 바랐던 것',              fields: ['yearnings', 'yearnText'] },
  { key: 'self',        name: '자기',  en: 'self',         hint: '나는 나',                     fields: ['selfText'] },
];

// 각 칸의 이름 (상세 보기)
const BERG_FIELD_LABEL = {
  event: '어떤 일이 있었고, 나는 어떻게 행동했나요',
  coping: '나의 대처방식',
  reason: '이 감정을 느낀 이유',
  feelAbout: '감정에 대한 감정',
  perception: '그 일을 어떻게 받아들였나요',
  expectSelf: '나에 대한 기대',
  expectOthers: '타인에 대한 기대',
  expectFromOthers: '타인이 나에게 바란다고 느낀 기대',
  yearnings: '나의 열망',
  yearnText: '그 아래에서 정말 바랐던 것',
  selfText: '깊은 곳의 나에게',
};

// 기록에 해당 층 내용이 있는지
function layerFilled(entry, layer) {
  return layer.fields.some(f => {
    const v = entry[f];
    return Array.isArray(v) ? v.length > 0 : !!(v && String(v).trim());
  });
}
