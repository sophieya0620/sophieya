/* =========================================================
   감정 카드 데이터 + 3D 얼굴 아이콘(SVG) 생성기
   - 상담 현장에서 쓰는 감정카드를 참고해 긍정/중간/부정 3그룹, 24개 감정
   ========================================================= */

const EMOTION_GROUPS = [
  { key: 'pos', label: '긍정', color: '#FFD84D', soft: '#FFF7D6' },
  { key: 'mid', label: '중간', color: '#C9BEEF', soft: '#F3F0FD' },
  { key: 'neg', label: '부정', color: '#8FB8F2', soft: '#EAF2FE' },
];

const EMOTIONS = [
  // ---------- 긍정 ----------
  { id: 'joy',      group: 'pos', name: '기쁜',     color: '#FFD84D', eyes: 'happy',  mouth: 'big',    blush: true, extra: 'sparkle',
    desc: '마음이 환하게 밝아지는 느낌이에요' },
  { id: 'happy',    group: 'pos', name: '행복한',   color: '#FFC2D3', eyes: 'happy',  mouth: 'smile',  blush: true,
    desc: '지금 이대로도 충분하다고 느껴요' },
  { id: 'flutter',  group: 'pos', name: '설레는',   color: '#FF9EBE', eyes: 'heart',  mouth: 'gentle', blush: true,
    desc: '두근두근, 무언가를 기대하게 돼요' },
  { id: 'grateful', group: 'pos', name: '감사한',   color: '#FFE2A1', eyes: 'closed', mouth: 'smile',  blush: true,
    desc: '누군가에게 고마운 마음이 들어요' },
  { id: 'proud',    group: 'pos', name: '뿌듯한',   color: '#FFBF5E', eyes: 'dot',    mouth: 'smirk',  brows: 'raised', extra: 'sparkle',
    desc: '스스로가 조금 자랑스러워요' },
  { id: 'calm',     group: 'pos', name: '편안한',   color: '#B7E5CB', eyes: 'closed', mouth: 'gentle',
    desc: '긴장이 풀리고 숨이 고르게 쉬어져요' },
  { id: 'loved',    group: 'pos', name: '사랑받는', color: '#F5B0D6', eyes: 'closed', mouth: 'gentle', blush: true, extra: 'heart',
    desc: '소중하게 여겨지는 느낌이에요' },
  { id: 'excited',  group: 'pos', name: '신나는',   color: '#FFE45C', eyes: 'star',   mouth: 'big',    blush: true,
    desc: '에너지가 넘쳐 몸이 들썩여요' },

  // ---------- 중간 ----------
  { id: 'serene',   group: 'mid', name: '담담한',   color: '#E3DDF3', eyes: 'dot',    mouth: 'flat',
    desc: '크게 흔들리지 않고 고요해요' },
  { id: 'curious',  group: 'mid', name: '궁금한',   color: '#C6DCF6', eyes: 'dot',    mouth: 'o',      brows: 'one', extra: 'question',
    desc: '알고 싶은 것이 생겼어요' },
  { id: 'surprised',group: 'mid', name: '놀란',     color: '#D0E5FF', eyes: 'wide',   mouth: 'O',      brows: 'raised',
    desc: '예상하지 못한 일에 마음이 깜짝했어요' },
  { id: 'blank',    group: 'mid', name: '멍한',     color: '#E8E2D5', eyes: 'blank',  mouth: 'small-o',
    desc: '생각이 잠시 멈춘 것 같아요' },
  { id: 'thinking', group: 'mid', name: '생각많은', color: '#D5CCF0', eyes: 'up',     mouth: 'tilt',   extra: 'think',
    desc: '머릿속이 여러 갈래로 바빠요' },
  { id: 'bored',    group: 'mid', name: '지루한',   color: '#E1E1E8', eyes: 'half',   mouth: 'flat',   extra: 'sigh',
    desc: '시간이 느리게 흘러가요' },
  { id: 'awkward',  group: 'mid', name: '어색한',   color: '#F2D8C5', eyes: 'dot',    mouth: 'wavy',   extra: 'sweat',
    desc: '어떻게 해야 할지 몰라 머쓱해요' },
  { id: 'soso',     group: 'mid', name: '그저그런', color: '#E8E3D2', eyes: 'dot',    mouth: 'tilt',
    desc: '좋지도 나쁘지도 않은 하루예요' },

  // ---------- 부정 ----------
  { id: 'anxious',  group: 'neg', name: '불안한',   color: '#FF9F43', eyes: 'wide',   mouth: 'grit',   brows: 'worried', extra: 'sweat',
    desc: '무슨 일이 생길까 봐 마음이 조마조마해요' },
  { id: 'sad',      group: 'neg', name: '슬픈',     color: '#8DB6F2', eyes: 'sad',    mouth: 'frown',  brows: 'worried', extra: 'tear',
    desc: '마음 한쪽이 가라앉고 눈물이 날 것 같아요' },
  { id: 'angry',    group: 'neg', name: '화난',     color: '#FF7676', eyes: 'dot',    mouth: 'frown',  brows: 'angry',
    desc: '부당하다고 느껴져 속이 뜨거워요' },
  { id: 'lonely',   group: 'neg', name: '외로운',   color: '#A8B3E8', eyes: 'down',   mouth: 'pout',   brows: 'worried',
    desc: '혼자인 것 같아 마음이 시려요' },
  { id: 'worried',  group: 'neg', name: '걱정되는', color: '#FFC796', eyes: 'dot',    mouth: 'wavy',   brows: 'worried',
    desc: '앞으로의 일이 자꾸 마음에 걸려요' },
  { id: 'hurt',     group: 'neg', name: '서운한',   color: '#B7C5F2', eyes: 'sad',    mouth: 'pout',   brows: 'worried',
    desc: '기대했던 마음이 채워지지 않았어요' },
  { id: 'tired',    group: 'neg', name: '지친',     color: '#C8C2D8', eyes: 'tired',  mouth: 'flat',   extra: 'sigh',
    desc: '몸도 마음도 잠시 쉬고 싶어요' },
  { id: 'scared',   group: 'neg', name: '두려운',   color: '#B29BE3', eyes: 'wide',   mouth: 'o',      brows: 'worried', extra: 'sweat',
    desc: '무섭고 피하고 싶은 마음이 들어요' },
];

const EMOTION_MAP = Object.fromEntries(EMOTIONS.map(e => [e.id, e]));

/* ---------- 색 유틸 ---------- */
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  r = Math.round((t - r) * p + r);
  g = Math.round((t - g) * p + g);
  b = Math.round((t - b) * p + b);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/* ---------- 얼굴 파츠 ---------- */
const INK = '#3E2C44';
const L = 36, R = 64, EY = 44;   // 눈 좌표

function eyePart(type, x, side, col, hi) {
  const sw = 'stroke-width="3.6" stroke-linecap="round" fill="none"';
  const shine = (cx, cy, r = 1.4) => hi ? '' : `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff"/>`;
  switch (type) {
    case 'happy':
      return `<path d="M${x - 6} ${EY + 2} Q${x} ${EY - 6} ${x + 6} ${EY + 2}" stroke="${col}" ${sw}/>`;
    case 'closed':
      return `<path d="M${x - 6} ${EY - 1} Q${x} ${EY + 5} ${x + 6} ${EY - 1}" stroke="${col}" ${sw}/>`;
    case 'dot':
      return `<ellipse cx="${x}" cy="${EY}" rx="3.9" ry="4.9" fill="${col}"/>${shine(x + 1.3, EY - 1.7)}`;
    case 'blank':
      return `<circle cx="${x}" cy="${EY}" r="2.6" fill="${col}"/>`;
    case 'sad':
      return `<ellipse cx="${x}" cy="${EY + 2}" rx="3.5" ry="4.2" fill="${col}"/>${shine(x + 1.2, EY + 0.6, 1.2)}`;
    case 'down':
      return `<ellipse cx="${x}" cy="${EY + 3}" rx="3.4" ry="3.6" fill="${col}"/>${shine(x + 1, EY + 2, 1.1)}`;
    case 'wide': {
      const sclera = hi ? `<ellipse cx="${x}" cy="${EY}" rx="7.6" ry="8.6" fill="${col}"/>`
        : `<ellipse cx="${x}" cy="${EY}" rx="7.6" ry="8.6" fill="#fff" stroke="${INK}" stroke-opacity=".18" stroke-width="1"/>`;
      return sclera + (hi ? '' : `<circle cx="${x}" cy="${EY + 0.6}" r="4.3" fill="${col}"/>`) + shine(x + 1.5, EY - 1.2, 1.5);
    }
    case 'up': {
      const sclera = hi ? `<ellipse cx="${x}" cy="${EY}" rx="6.8" ry="7.6" fill="${col}"/>`
        : `<ellipse cx="${x}" cy="${EY}" rx="6.8" ry="7.6" fill="#fff" stroke="${INK}" stroke-opacity=".18" stroke-width="1"/>`;
      return sclera + (hi ? '' : `<circle cx="${x + 1.6}" cy="${EY - 3}" r="3.6" fill="${col}"/>`) + shine(x + 2.8, EY - 4, 1.2);
    }
    case 'half':
      return `<path d="M${x - 5} ${EY} A5 5 0 0 0 ${x + 5} ${EY} Z" fill="${col}"/>
              <path d="M${x - 6.5} ${EY} H${x + 6.5}" stroke="${col}" stroke-width="3" stroke-linecap="round"/>`;
    case 'tired':
      return `<path d="M${x - 6} ${EY + (side < 0 ? 0 : 2)} Q${x} ${EY + 4} ${x + 6} ${EY + (side < 0 ? 2 : 0)}" stroke="${col}" ${sw}/>`;
    case 'heart': {
      const c = hi ? col : '#FF5C8A';
      return `<path d="M${x} ${EY + 5.5} C${x - 10} ${EY - 1}, ${x - 4.5} ${EY - 9.5}, ${x} ${EY - 3.2} C${x + 4.5} ${EY - 9.5}, ${x + 10} ${EY - 1}, ${x} ${EY + 5.5} Z" fill="${c}"/>
              ${hi ? '' : `<ellipse cx="${x - 3}" cy="${EY - 2.6}" rx="1.6" ry="1.1" fill="#fff" opacity=".85"/>`}`;
    }
    case 'star': {
      let d = '';
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 3.2 : 7.4;
        d += (i ? 'L' : 'M') + (x + Math.cos(a) * r).toFixed(2) + ' ' + (EY + Math.sin(a) * r).toFixed(2);
      }
      return `<path d="${d}Z" fill="${col}" stroke="${col}" stroke-width="1.4" stroke-linejoin="round"/>`;
    }
  }
  return '';
}

function mouthPart(type, col, hi) {
  const sw = 'stroke-width="3.6" stroke-linecap="round" fill="none"';
  switch (type) {
    case 'big':
      return `<path d="M37 58 Q50 79 63 58 Q50 62 37 58 Z" fill="${col}" stroke="${col}" stroke-width="1.6" stroke-linejoin="round"/>
              ${hi ? '' : '<path d="M43.5 67 Q50 73 56.5 67 Q50 64 43.5 67 Z" fill="#FF8FA6"/>'}`;
    case 'smile':  return `<path d="M40 60 Q50 70 60 60" stroke="${col}" ${sw}/>`;
    case 'gentle': return `<path d="M43 62 Q50 67.5 57 62" stroke="${col}" ${sw}/>`;
    case 'smirk':  return `<path d="M41 62 Q52 68 59 59.5" stroke="${col}" ${sw}/>`;
    case 'flat':   return `<path d="M43 64 H57" stroke="${col}" ${sw}/>`;
    case 'tilt':   return `<path d="M43 65 L57 62" stroke="${col}" ${sw}/>`;
    case 'o':      return `<ellipse cx="50" cy="64" rx="3.7" ry="4.3" fill="${col}"/>`;
    case 'small-o':return `<ellipse cx="50" cy="64" rx="2.6" ry="2.4" fill="${col}"/>`;
    case 'O':      return `<ellipse cx="50" cy="65" rx="6.4" ry="8" fill="${col}"/>`;
    case 'frown':  return `<path d="M41 68 Q50 59 59 68" stroke="${col}" ${sw}/>`;
    case 'pout':   return `<path d="M44.5 66.5 Q50 62.5 55.5 66.5" stroke="${col}" ${sw}/>`;
    case 'wavy':   return `<path d="M38 64 q3 -3.6 6 0 t6 0 t6 0 t6 0" stroke="${col}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    case 'grit':
      if (hi) return `<rect x="35.5" y="56.5" width="29" height="13" rx="6.5" fill="${col}"/>`;
      return `<rect x="36" y="57" width="28" height="12" rx="6" fill="#fff" stroke="${col}" stroke-width="2.6"/>
              <path d="M36.5 63 H63.5 M43 57.5 V68.5 M50 57.5 V68.5 M57 57.5 V68.5" stroke="${col}" stroke-width="1.6" opacity=".75"/>`;
  }
  return '';
}

function browPart(type, col) {
  const sw = `stroke="${col}" stroke-width="3" stroke-linecap="round" fill="none"`;
  switch (type) {
    case 'worried': return `<path d="M28 35 L41 30.5" ${sw}/><path d="M72 35 L59 30.5" ${sw}/>`;
    case 'angry':   return `<path d="M28 30 L42 36" ${sw}/><path d="M72 30 L58 36" ${sw}/>`;
    case 'raised':  return `<path d="M29.5 32 Q36 26.5 42 31" ${sw}/><path d="M58 31 Q64 26.5 70.5 32" ${sw}/>`;
    case 'one':     return `<path d="M30 34 H42" ${sw}/><path d="M58 31 Q64 25.5 70.5 30.5" ${sw}/>`;
  }
  return '';
}

function extraPart(type, uid) {
  switch (type) {
    case 'sparkle':
      return `<path d="M84 8 Q85.6 15.4 92 17 Q85.6 18.6 84 26 Q82.4 18.6 76 17 Q82.4 15.4 84 8 Z" fill="#FFC93C" stroke="#fff" stroke-width="1.2"/>
              <circle cx="92.5" cy="29" r="2.2" fill="#FFD84D"/>`;
    case 'heart':
      return `<path d="M85 27 C76 21, 79 11.5, 85 16 C91 11.5, 94 21, 85 27 Z" fill="#FF6F98" stroke="#fff" stroke-width="1.4"/>`;
    case 'tear':
      return `<path d="M31 50 C27.6 56, 27.6 60, 31 60.4 C34.4 60, 34.4 56, 31 50 Z" fill="url(#${uid}w)"/>
              <ellipse cx="30" cy="56.5" rx="1" ry="1.6" fill="#fff" opacity=".9"/>`;
    case 'sweat':
      return `<path d="M80 14 C75.5 21.5, 75.5 26, 80 26.5 C84.5 26, 84.5 21.5, 80 14 Z" fill="url(#${uid}w)" stroke="#fff" stroke-width="1.2"/>
              <ellipse cx="78.6" cy="22.6" rx="1.1" ry="1.8" fill="#fff" opacity=".9"/>`;
    case 'question':
      return `<text x="80" y="24" font-size="20" font-weight="800" font-family="Gowun Dodum, sans-serif" fill="#7FA6E6" stroke="#fff" stroke-width="2.4" paint-order="stroke">?</text>`;
    case 'think':
      return `<circle cx="76" cy="20" r="2.4" fill="#B6A7E6"/><circle cx="83" cy="13.5" r="3.4" fill="#B6A7E6"/><circle cx="91.5" cy="7.5" r="4.4" fill="#B6A7E6"/>`;
    case 'sigh':
      return `<g fill="#fff" stroke="#C9C0D9" stroke-width="1.2"><circle cx="72" cy="70" r="4.2"/><circle cx="79" cy="67" r="5.2"/><circle cx="86" cy="71" r="4"/></g>`;
  }
  return '';
}

let __faceId = 0;
/**
 * 3D 클레이 느낌의 얼굴 아이콘 SVG 문자열
 */
function faceSVG(e, cls = '') {
  const id = 'fx' + (++__faceId);
  const c = e.color;
  const light = shade(c, 0.62), dark = shade(c, -0.22), rim = shade(c, -0.38);

  const feats = (col, hi) =>
    eyePart(e.eyes, L, -1, col, hi) + eyePart(e.eyes, R, 1, col, hi) +
    mouthPart(e.mouth, col, hi) + (e.brows ? browPart(e.brows, col) : '');

  return `<svg viewBox="0 0 100 100" class="face ${cls}" aria-hidden="true">
  <defs>
    <radialGradient id="${id}b" cx="36%" cy="28%" r="80%">
      <stop offset="0" stop-color="${light}"/>
      <stop offset=".42" stop-color="${c}"/>
      <stop offset=".88" stop-color="${dark}"/>
      <stop offset="1" stop-color="${rim}"/>
    </radialGradient>
    <radialGradient id="${id}h" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#fff" stop-opacity=".95"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${id}g" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="${rim}" stop-opacity=".45"/>
      <stop offset="1" stop-color="${rim}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#BFE3FF"/><stop offset="1" stop-color="#5FA8F5"/>
    </linearGradient>
  </defs>
  <ellipse cx="50" cy="94" rx="30" ry="5" fill="url(#${id}g)"/>
  <circle cx="50" cy="49" r="42" fill="url(#${id}b)"/>
  <path d="M87 59.5 A38.5 38.5 0 0 1 61 86" stroke="${light}" stroke-width="2.6" stroke-linecap="round" fill="none" opacity=".55"/>
  <ellipse cx="34" cy="25" rx="16" ry="9.5" transform="rotate(-30 34 25)" fill="url(#${id}h)"/>
  <circle cx="24.5" cy="36" r="2.4" fill="#fff" opacity=".8"/>
  ${e.blush ? '<ellipse cx="25.5" cy="56" rx="6.5" ry="3.8" fill="#FF7E9D" opacity=".38"/><ellipse cx="74.5" cy="56" rx="6.5" ry="3.8" fill="#FF7E9D" opacity=".38"/>' : ''}
  <g transform="translate(0 1.1)" opacity=".55">${feats('#ffffff', true)}</g>
  <g>${feats(INK, false)}</g>
  ${e.extra ? extraPart(e.extra, id) : ''}
</svg>`;
}

/* ---------- 3D 별 ---------- */
let __starId = 0;
function starSVG(filled) {
  const id = 'st' + (++__starId);
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 19 : 42;
    d += (i ? 'L' : 'M') + (50 + Math.cos(a) * r).toFixed(2) + ' ' + (52 + Math.sin(a) * r).toFixed(2);
  }
  const [a, b, c] = filled ? ['#FFF6BF', '#FFD84D', '#F3A91B'] : ['#FFFFFF', '#F1ECF6', '#DCD2E6'];
  return `<svg viewBox="0 0 100 100" aria-hidden="true">
    <defs>
      <radialGradient id="${id}" cx="40%" cy="30%" r="75%">
        <stop offset="0" stop-color="${a}"/><stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${c}"/>
      </radialGradient>
    </defs>
    <ellipse cx="50" cy="95" rx="26" ry="4" fill="${filled ? '#F3A91B' : '#CFC3DB'}" opacity=".28"/>
    <path d="${d}Z" fill="url(#${id})" stroke="${filled ? '#F7B52A' : '#E2D8EC'}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M38 34 Q44 26 50 22" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity="${filled ? .85 : .9}"/>
  </svg>`;
}
