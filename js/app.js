/* =========================================================
   마음 구슬 — 앱 로직
   ========================================================= */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
  const RATING_TEXT = ['5점 만점', '많이 힘들었어요', '조금 힘들었어요', '그저 그랬어요', '좋았어요', '정말 좋았어요'];
  const PEOPLE_SUGGEST = ['나 혼자', '가족', '엄마', '아빠', '친구', '연인', '선생님', '동료'];
  const PALETTE = ['#3E2C44', '#FFD84D', '#FF9F43', '#FF7E9D', '#FF6B6B', '#B7E5CB', '#8CCBF5', '#8DB6F2', '#B29BE3', '#C8A27A'];
  const SIZES = [3, 6, 11];
  const QUOTES = [
    '오늘 하루, 어떤 마음이었나요?',
    '작은 마음도 소중하게 적어볼까요.',
    '솔직한 마음은 나를 지켜줘요.',
    '천천히, 나에게 귀 기울여 봐요.',
    '오늘의 나를 그대로 안아줘요.',
  ];
  const DRAFT_KEY = 'maeum-guseul-draft';

  const pad2 = n => String(n).padStart(2, '0');
  const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
  const parseDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const shortDate = s => { const d = parseDate(s); return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEK[d.getDay()]})`; };

  const blankEntry = () => ({ id: null, date: todayStr(), emotions: [], people: [], rating: 0, event: '', reason: '', drawing: null, createdAt: null });

  const state = {
    page: 0,
    group: 'pos',
    entry: blankEntry(),
    records: [],
    detailId: null,
  };

  /* ---------------- 공통 ---------------- */
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  function vibrate(ms = 8) { try { navigator.vibrate?.(ms); } catch (_) {} }

  function saveDraft() {
    if (state.entry.id) return;          // 수정 중일 때는 임시저장 안 함
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(state.entry)); }
    catch (_) {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...state.entry, drawing: null })); } catch (__) {}
    }
  }
  function loadDraft() {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (d && typeof d === 'object') return { ...blankEntry(), ...d, id: null };
    } catch (_) {}
    return null;
  }
  const clearDraft = () => localStorage.removeItem(DRAFT_KEY);

  /* ---------------- 페이지 이동 ---------------- */
  function goPage(n, { scroll = true } = {}) {
    state.page = Math.max(0, Math.min(2, n));
    $$('.page').forEach(p => {
      const i = +p.dataset.page;
      p.classList.toggle('is-active', i === state.page);
      p.classList.toggle('is-left', i < state.page);
      p.classList.toggle('is-right', i > state.page);
      p.setAttribute('aria-hidden', i !== state.page);
      if (i === state.page && scroll) p.scrollTop = 0;
    });
    $$('.step').forEach(s => {
      const i = +s.dataset.step;
      s.classList.toggle('active', i === state.page);
      s.classList.toggle('done', i < state.page);
    });
    $('#stepFill').style.width = `${(state.page / 2) * 100}%`;

    const prev = $('#prevBtn'), next = $('#nextBtn');
    prev.disabled = state.page === 0;
    if (state.page === 2) {
      next.innerHTML = state.entry.id ? '고친 기록 저장하기' : '기억 구슬로 저장하기';
      next.classList.add('save');
    } else {
      next.textContent = '다음';
      next.classList.remove('save');
    }
    if (state.page === 1) renderMiniEmos();
    if (state.page === 2) pad.resize();
  }

  /* ---------------- 1장: 날짜 ---------------- */
  function renderDate() {
    const d = parseDate(state.entry.date);
    $('#dateDay').textContent = d.getDate();
    $('#dateMonth').textContent = `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
    $('#dateWeek').textContent = `${WEEK[d.getDay()]}요일`;
    $('#dateInput').value = state.entry.date;
    const isToday = state.entry.date === todayStr();
    $('#dateQuote').textContent = isToday ? QUOTES[d.getDate() % QUOTES.length] : '그날의 마음을 다시 떠올려 볼까요?';
  }

  /* ---------------- 1장: 감정 ---------------- */
  function renderHero() {
    const hero = $('#hero');
    const sel = state.entry.emotions.map(id => EMOTION_MAP[id]).filter(Boolean);
    if (!sel.length) {
      hero.className = 'hero empty';
      hero.innerHTML = `
        <div class="hero-face"><div class="glass-orb"></div></div>
        <div class="hero-text">
          <strong>마음에 가장 가까운 얼굴을</strong>
          <p>아래에서 골라보세요. 여러 감정이 함께 있어도 괜찮아요.</p>
        </div>`;
      return;
    }
    const main = sel[0];
    hero.className = 'hero';
    hero.style.setProperty('--c', main.color);
    hero.innerHTML = `
      <div class="hero-face" key="${main.id}">${faceSVG(main, 'float')}</div>
      <div class="hero-text">
        <strong>${main.name} 마음</strong>
        <p>${main.desc}</p>
        ${sel.length > 1 ? `<div class="hero-more">${sel.slice(1).map(e =>
          `<span class="mini" style="--c:${e.color}">${faceSVG(e)}<i>${e.name}</i></span>`).join('')}</div>` : ''}
      </div>`;
  }

  function renderTabs() {
    $('#tabs').innerHTML = EMOTION_GROUPS.map(g => {
      const n = state.entry.emotions.filter(id => EMOTION_MAP[id]?.group === g.key).length;
      return `<button class="tab ${g.key === state.group ? 'active' : ''}" role="tab" data-group="${g.key}"
          style="--c:${g.color};--soft:${g.soft}" aria-selected="${g.key === state.group}">
          <i class="tab-dot"></i>${g.label}${n ? `<em>${n}</em>` : ''}</button>`;
    }).join('');
  }

  function renderGrid(animate = false) {
    const grid = $('#emoGrid');
    const g = EMOTION_GROUPS.find(x => x.key === state.group);
    grid.style.setProperty('--soft', g.soft);
    grid.innerHTML = EMOTIONS.filter(e => e.group === state.group).map((e, i) => {
      const order = state.entry.emotions.indexOf(e.id);
      return `<button class="emo ${order >= 0 ? 'selected' : ''} ${animate ? 'pop-in' : ''}" data-id="${e.id}"
          style="--c:${e.color};--d:${i * 35}ms" aria-pressed="${order >= 0}">
          ${faceSVG(e)}
          <span>${e.name}</span>
          ${order >= 0 ? `<b class="order">${order + 1}</b>` : ''}
        </button>`;
    }).join('');
  }

  function toggleEmotion(id) {
    const list = state.entry.emotions;
    const i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1);
    else {
      if (list.length >= 3) { toast('감정은 3개까지 고를 수 있어요'); return; }
      list.push(id);
      vibrate();
    }
    renderHero(); renderTabs(); renderGrid(); saveDraft();
  }

  /* ---------------- 1장: 인물 ---------------- */
  function renderPeople() {
    const chips = $('#peopleChips');
    chips.innerHTML = state.entry.people.length
      ? state.entry.people.map((p, i) => `<span class="chip">${esc(p)}<button data-i="${i}" aria-label="${esc(p)} 지우기">×</button></span>`).join('')
      : '<span class="chips-empty">아직 아무도 없어요</span>';

    const recent = [];
    state.records.forEach(r => (r.people || []).forEach(p => { if (!recent.includes(p)) recent.push(p); }));
    const pool = [...new Set([...recent.slice(0, 6), ...PEOPLE_SUGGEST])].filter(p => !state.entry.people.includes(p)).slice(0, 10);
    $('#peopleSuggest').innerHTML = pool.map(p => `<button type="button" data-p="${esc(p)}">+ ${esc(p)}</button>`).join('');
  }

  function addPerson(name) {
    name = name.trim();
    if (!name) return;
    if (state.entry.people.includes(name)) { toast('이미 함께한 사람에 있어요'); return; }
    if (state.entry.people.length >= 8) { toast('최대 8명까지 적을 수 있어요'); return; }
    state.entry.people.push(name);
    renderPeople(); saveDraft();
  }

  /* ---------------- 1장: 별점 ---------------- */
  function renderStars() {
    const r = state.entry.rating;
    $('#stars').innerHTML = [1, 2, 3, 4, 5].map(n =>
      `<button class="star ${n <= r ? 'on' : ''}" data-n="${n}" role="radio" aria-checked="${n === r}" aria-label="${n}점" style="--d:${n * 40}ms">${starSVG(n <= r)}</button>`
    ).join('');
    $('#ratingText').textContent = r ? `${r}점 · ${RATING_TEXT[r]}` : RATING_TEXT[0];
  }

  /* ---------------- 2장 ---------------- */
  function renderMiniEmos() {
    const sel = state.entry.emotions.map(id => EMOTION_MAP[id]).filter(Boolean);
    $('#miniEmos').innerHTML = sel.length
      ? sel.map(e => `<span class="mini" style="--c:${e.color}">${faceSVG(e)}<i>${e.name}</i></span>`).join('')
      : `<button class="mini-empty" data-go="0">먼저 1장에서 감정을 골라주세요 →</button>`;
  }

  function syncText() {
    $('#eventText').value = state.entry.event;
    $('#reasonText').value = state.entry.reason;
    $('#eventCount').textContent = state.entry.event.length;
  }

  /* ---------------- 3장: 그림 ---------------- */
  const pad = new DrawPad($('#pad'), $('#canvasWrap'));
  pad.onchange = has => $('#canvasEmpty').classList.toggle('hide', has);
  let drawSaveTimer;
  pad.onstrokeend = () => {
    clearTimeout(drawSaveTimer);
    drawSaveTimer = setTimeout(() => { state.entry.drawing = pad.export(); saveDraft(); }, 400);
  };

  function renderPalette() {
    $('#palette').innerHTML = PALETTE.map(c =>
      `<button class="swatch ${c === pad.color ? 'active' : ''}" data-c="${c}" style="--c:${c}" aria-label="색 ${c}"></button>`).join('');
    $('#sizes').innerHTML = SIZES.map(s =>
      `<button class="size ${s === pad.size ? 'active' : ''}" data-s="${s}" aria-label="굵기 ${s}"><i style="width:${s + 4}px;height:${s + 4}px"></i></button>`).join('');
  }

  function setTool(mode) {
    pad.mode = mode;
    $('#toolPen').classList.toggle('active', mode === 'pen');
    $('#toolEraser').classList.toggle('active', mode === 'eraser');
  }

  /* ---------------- 전체 렌더 ---------------- */
  function renderAll() {
    renderDate(); renderHero(); renderTabs(); renderGrid(); renderPeople(); renderStars(); syncText();
    $('#editBanner').hidden = !state.entry.id;
  }

  /* ---------------- 저장 ---------------- */
  async function save() {
    const e = state.entry;
    if (!e.emotions.length) {
      toast('오늘의 감정을 하나 이상 골라주세요');
      goPage(0);
      setTimeout(() => $('#hero').scrollIntoView({ behavior: 'smooth', block: 'center' }), 350);
      return;
    }
    e.drawing = pad.export();
    const now = Date.now();
    const isEdit = !!e.id;
    const record = { ...e, id: e.id || `m${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`, createdAt: e.createdAt || now, updatedAt: now };
    try {
      await Store.put(record);
    } catch (err) {
      console.error(err);
      toast('저장 공간이 부족해요. 그림을 조금 줄여볼까요?');
      return;
    }
    await loadRecords();
    showSaved(record, isEdit);
  }

  function showSaved(record, isEdit) {
    const main = EMOTION_MAP[record.emotions[0]];
    const orb = $('#savedOrb');
    orb.style.setProperty('--c', main.color);
    orb.innerHTML = faceSVG(main) + '<i class="spark s1"></i><i class="spark s2"></i><i class="spark s3"></i>';
    $('#savedText').innerHTML = isEdit
      ? '고친 마음도 소중히 간직할게요.'
      : `${shortDate(record.date)}의 ${main.name} 마음,<br>소중히 간직할게요.`;
    openLayer($('#savedModal'));
  }

  function resetEntry() {
    state.entry = blankEntry();
    state.group = 'pos';
    clearDraft();
    pad.load(null);
    renderAll();
    goPage(0);
  }

  /* ---------------- 기록 ---------------- */
  async function loadRecords() {
    state.records = await Store.all();
    const n = state.records.length;
    const b = $('#recordCount');
    b.hidden = !n; b.textContent = n > 99 ? '99+' : n;
    renderPeople();
  }

  function orbHTML(r, cls = '') {
    const e = EMOTION_MAP[r.emotions[0]] || EMOTIONS[0];
    return `<button class="orb ${cls}" data-id="${r.id}" style="--c:${e.color}" aria-label="${shortDate(r.date)} ${e.name}">${faceSVG(e)}</button>`;
  }

  function renderRecords() {
    const list = state.records;
    const shelf = $('#shelf'), bar = $('#moodBar'), box = $('#recordList');
    if (!list.length) {
      shelf.innerHTML = '';
      bar.innerHTML = '';
      box.innerHTML = `<div class="empty-state">
          <div class="glass-orb big"></div>
          <strong>아직 기억 구슬이 없어요</strong>
          <p>오늘의 마음을 처음으로 남겨볼까요?</p>
        </div>`;
      return;
    }
    shelf.innerHTML = `<p class="shelf-label">최근의 마음들</p><div class="shelf-row">${list.slice(0, 14).map(r => orbHTML(r)).join('')}</div>`;

    const cnt = { pos: 0, mid: 0, neg: 0 };
    list.forEach(r => { const e = EMOTION_MAP[r.emotions[0]]; if (e) cnt[e.group]++; });
    const total = list.length;
    bar.innerHTML = `
      <div class="mood-track">${EMOTION_GROUPS.map(g => cnt[g.key] ? `<i style="flex:${cnt[g.key]};--c:${g.color}"></i>` : '').join('')}</div>
      <div class="mood-legend">${EMOTION_GROUPS.map(g => `<span style="--c:${g.color}"><i></i>${g.label} ${cnt[g.key]}</span>`).join('')}<span class="total">총 ${total}개</span></div>`;

    let month = '';
    box.innerHTML = list.map(r => {
      const d = parseDate(r.date);
      const m = `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
      const head = m !== month ? `<h3 class="month">${m}</h3>` : '';
      month = m;
      const emos = r.emotions.map(id => EMOTION_MAP[id]).filter(Boolean);
      const main = emos[0] || EMOTIONS[0];
      return `${head}<article class="rec" data-id="${r.id}" style="--c:${main.color}" tabindex="0">
          <div class="rec-face">${faceSVG(main)}</div>
          <div class="rec-body">
            <div class="rec-top"><span class="rec-date">${shortDate(r.date)}</span>
              <span class="rec-stars">${r.rating ? '★'.repeat(r.rating) + '<s>' + '★'.repeat(5 - r.rating) + '</s>' : ''}</span></div>
            <div class="rec-emos">${emos.map(e => e.name).join(' · ')}</div>
            <p class="rec-text">${esc(r.event || r.reason || (r.drawing ? '그림으로 남긴 마음' : '적어둔 이야기가 없어요'))}</p>
          </div>
          ${r.drawing ? `<img class="rec-thumb" src="${r.drawing}" alt="">` : ''}
        </article>`;
    }).join('');
  }

  function renderDetail(id) {
    const r = state.records.find(x => x.id === id);
    if (!r) return;
    state.detailId = id;
    const emos = r.emotions.map(x => EMOTION_MAP[x]).filter(Boolean);
    $('#detailTitle').textContent = shortDate(r.date);
    $('#detailBody').innerHTML = `
      <div class="detail-hero" style="--c:${emos[0]?.color || '#FFD84D'}">
        ${emos.map((e, i) => `<div class="detail-emo ${i === 0 ? 'main' : ''}" style="--c:${e.color}">${faceSVG(e, i === 0 ? 'float' : '')}<span>${e.name}</span></div>`).join('')}
      </div>
      ${emos[0] ? `<p class="detail-desc">“${emos[0].desc}”</p>` : ''}
      <div class="detail-row">
        <div><label>별점</label><div class="detail-stars">${[1, 2, 3, 4, 5].map(n => `<i>${starSVG(n <= r.rating)}</i>`).join('')}</div>
          <small>${r.rating ? RATING_TEXT[r.rating] : '매기지 않았어요'}</small></div>
      </div>
      <div class="detail-block"><label>함께한 사람</label>
        <div class="chips">${(r.people || []).length ? r.people.map(p => `<span class="chip">${esc(p)}</span>`).join('') : '<span class="chips-empty">적지 않았어요</span>'}</div></div>
      <div class="detail-block"><label>어떤 일이 있었나요</label><p class="detail-text">${esc(r.event) || '<span class="muted">적지 않았어요</span>'}</p></div>
      <div class="detail-block"><label>이 감정을 고른 이유</label><p class="detail-text">${esc(r.reason) || '<span class="muted">적지 않았어요</span>'}</p></div>
      ${r.drawing ? `<div class="detail-block"><label>마음 그림</label><div class="detail-draw"><img src="${r.drawing}" alt="마음 그림"></div></div>` : ''}
    `;
    openLayer($('#detailSheet'));
  }

  /* ---------------- 레이어 ---------------- */
  function openLayer(el) {
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
  }
  function closeLayer(el) {
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
  }

  /* ---------------- 이벤트 ---------------- */
  function bind() {
    $('#steps').addEventListener('click', e => {
      const b = e.target.closest('.step'); if (b) goPage(+b.dataset.step);
    });
    $('#prevBtn').addEventListener('click', () => goPage(state.page - 1));
    $('#nextBtn').addEventListener('click', () => state.page < 2 ? goPage(state.page + 1) : save());

    // 날짜
    const di = $('#dateInput');
    di.max = todayStr();
    $('#datePick').addEventListener('click', e => {
      if (e.target !== di && di.showPicker) { e.preventDefault(); try { di.showPicker(); } catch (_) { di.focus(); } }
    });
    di.addEventListener('change', () => {
      if (!di.value) return;
      state.entry.date = di.value; renderDate(); saveDraft();
    });

    // 감정
    $('#tabs').addEventListener('click', e => {
      const t = e.target.closest('.tab'); if (!t || t.dataset.group === state.group) return;
      state.group = t.dataset.group; renderTabs(); renderGrid(true);
    });
    $('#emoGrid').addEventListener('click', e => {
      const b = e.target.closest('.emo'); if (b) toggleEmotion(b.dataset.id);
    });

    // 인물
    $('#peopleForm').addEventListener('submit', e => {
      e.preventDefault(); const i = $('#peopleInput'); addPerson(i.value); i.value = '';
    });
    $('#peopleChips').addEventListener('click', e => {
      const b = e.target.closest('button[data-i]'); if (!b) return;
      state.entry.people.splice(+b.dataset.i, 1); renderPeople(); saveDraft();
    });
    $('#peopleSuggest').addEventListener('click', e => {
      const b = e.target.closest('button[data-p]'); if (b) addPerson(b.dataset.p);
    });

    // 별점
    $('#stars').addEventListener('click', e => {
      const b = e.target.closest('.star'); if (!b) return;
      const n = +b.dataset.n;
      state.entry.rating = state.entry.rating === n ? 0 : n;
      renderStars(); vibrate(); saveDraft();
    });

    // 2장
    $('#eventText').addEventListener('input', e => {
      state.entry.event = e.target.value; $('#eventCount').textContent = e.target.value.length; saveDraft();
    });
    $('#reasonText').addEventListener('input', e => { state.entry.reason = e.target.value; saveDraft(); });
    $('#miniEmos').addEventListener('click', e => { if (e.target.closest('[data-go]')) goPage(0); });

    // 3장
    $('#palette').addEventListener('click', e => {
      const b = e.target.closest('.swatch'); if (!b) return;
      pad.color = b.dataset.c; setTool('pen'); renderPalette();
    });
    $('#sizes').addEventListener('click', e => {
      const b = e.target.closest('.size'); if (!b) return;
      pad.size = +b.dataset.s; renderPalette();
    });
    $('#toolPen').addEventListener('click', () => setTool('pen'));
    $('#toolEraser').addEventListener('click', () => setTool('eraser'));
    $('#undoBtn').addEventListener('click', () => { if (!pad.undo()) toast('더 되돌릴 수 없어요'); });
    $('#clearBtn').addEventListener('click', () => {
      if (!pad.hasInk) return;
      if (confirm('그림을 모두 지울까요?')) pad.clear();
    });

    // 기록
    $('#openRecords').addEventListener('click', () => { renderRecords(); openLayer($('#recordsSheet')); });
    $$('.sheet').forEach(s => s.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeLayer(s); }));
    const openFrom = e => { const t = e.target.closest('[data-id]'); if (t) renderDetail(t.dataset.id); };
    $('#recordList').addEventListener('click', openFrom);
    $('#recordList').addEventListener('keydown', e => { if (e.key === 'Enter') openFrom(e); });
    $('#shelf').addEventListener('click', openFrom);

    $('#editBtn').addEventListener('click', async () => {
      const r = state.records.find(x => x.id === state.detailId); if (!r) return;
      state.entry = JSON.parse(JSON.stringify({ ...blankEntry(), ...r }));
      const first = EMOTION_MAP[state.entry.emotions[0]];
      state.group = first ? first.group : 'pos';
      closeLayer($('#detailSheet')); closeLayer($('#recordsSheet'));
      renderAll(); goPage(0);
      await pad.load(r.drawing);
      toast('기록을 고쳐 쓸 수 있어요');
    });
    $('#deleteBtn').addEventListener('click', async () => {
      if (!confirm('이 기억 구슬을 지울까요?\n지운 기록은 되돌릴 수 없어요.')) return;
      const id = state.detailId;
      await Store.remove(id);
      closeLayer($('#detailSheet'));
      await loadRecords(); renderRecords();
      if (state.entry.id === id) resetEntry();
      toast('기록을 지웠어요');
    });
    $('#cancelEdit').addEventListener('click', () => {
      resetEntry(); toast('새 일기를 시작해요');
    });

    $('#savedOk').addEventListener('click', () => { closeLayer($('#savedModal')); resetEntry(); });

    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      const open = $$('.sheet.open'); if (open.length) closeLayer(open[open.length - 1]);
    });
  }

  /* ---------------- 시작 ---------------- */
  async function init() {
    const draft = loadDraft();
    if (draft) {
      state.entry = draft;
      const first = EMOTION_MAP[draft.emotions[0]];
      if (first) state.group = first.group;
    }
    renderPalette();
    bind();
    renderAll();
    goPage(0, { scroll: false });
    await loadRecords();
    if (draft?.drawing) pad.load(draft.drawing);

    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  init();
})();
