/* =========================================================
   마음 서랍 — 앱 로직
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
  const DRAFT_KEY = 'maeum-guseul-draft';   // (저장 키는 기존 기록 유지를 위해 그대로 둡니다)
  const DAILY_MAX = 10;
  const TEXT_FIELDS = ['event', 'reason', 'feelAbout', 'perception', 'expectSelf', 'expectOthers', 'expectFromOthers', 'yearnText', 'selfText'];

  const pad2 = n => String(n).padStart(2, '0');
  const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
  const parseDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const shortDate = s => { const d = parseDate(s); return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEK[d.getDay()]})`; };

  const nowTime = () => { const d = new Date(); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
  const timeLabel = t => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    return `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${pad2(m)}`;
  };
  const entryTime = r => r.time || (r.createdAt ? (d => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`)(new Date(r.createdAt)) : '');

  const blankEntry = () => ({
    id: null, date: todayStr(), time: null, emotions: [], people: [], rating: 0,
    event: '', coping: '', reason: '', feelAbout: '', perception: '',
    expectSelf: '', expectOthers: '', expectFromOthers: '', yearnings: [], yearnText: '', selfText: '',
    drawing: null, createdAt: null,
  });

  const state = {
    page: 0,
    group: 'pos',
    entry: blankEntry(),
    records: [],
    trash: [],
    detailId: null,
    sheetTab: 'records',
    remindSkipped: new Set(),
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

  function ask(message, yes = '네') {
    return new Promise(resolve => {
      const m = $('#askModal');
      $('#askText').textContent = message;
      $('#askYes').textContent = yes;
      const done = v => {
        closeLayer(m);
        $('#askYes').onclick = $('#askNo').onclick = null;
        resolve(v);
      };
      $('#askYes').onclick = () => done(true);
      $('#askNo').onclick = () => done(false);
      openLayer(m);
    });
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
      if (d && typeof d === 'object') return { ...blankEntry(), ...d, id: null, time: null };
    } catch (_) {}
    return null;
  }
  const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch (_) {} };

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
      next.innerHTML = state.entry.id ? '고친 편지 서랍에 넣기' : '마음 편지 서랍에 넣기';
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
    renderDayCount();
  }

  // 하루 최대 10번
  const dayEntries = (date, exceptId) => state.records.filter(r => r.date === date && r.id !== exceptId);
  function renderDayCount() {
    const e = state.entry;
    const n = dayEntries(e.date, e.id).length;
    const full = !e.id && n >= DAILY_MAX;
    const mine = e.id ? null : n;          // 새로 쓰는 편지의 자리
    const box = $('#dayCount');
    box.classList.toggle('full', full);
    box.innerHTML = `
      <div class="day-dots">${Array.from({ length: DAILY_MAX }, (_, i) =>
        `<i class="${i < n ? 'on' : ''} ${i === mine ? 'now' : ''}"></i>`).join('')}</div>
      <span>${e.id ? `이날의 편지 ${n + 1}통 중 하나를 고치고 있어요`
        : full ? `이날은 편지 ${DAILY_MAX}통을 모두 썼어요`
        : `이날의 <b>${n + 1}번째</b> 마음 편지 · 하루 최대 ${DAILY_MAX}번`}</span>`;
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
    $$('[data-field]').forEach(el => { el.value = state.entry[el.dataset.field] || ''; });
    $('#eventCount').textContent = (state.entry.event || '').length;
    renderCoping(); renderYearn(); renderBergMap();
  }

  function renderCoping() {
    $('#copingChips').innerHTML = COPING.map(c =>
      `<button type="button" class="cope ${state.entry.coping === c.id ? 'active' : ''} ${c.id === 'congruent' ? 'congruent' : ''}"
          data-cope="${c.id}" style="--c:${c.color}" aria-pressed="${state.entry.coping === c.id}">
          <strong>${c.name}</strong><small>${c.desc}</small></button>`).join('');
  }
  function renderYearn() {
    const sel = state.entry.yearnings || [];
    $('#yearnChips').innerHTML = YEARNINGS.map(y =>
      `<button type="button" class="yearn ${sel.includes(y) ? 'active' : ''}" data-y="${y}" aria-pressed="${sel.includes(y)}">${y}</button>`).join('');
  }
  let activeLayer = 'behavior';
  const MAG_MINI = `<svg class="bm-mag" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M38 38 L54 54" stroke="#F28CA8" stroke-width="9" stroke-linecap="round"/>
      <circle cx="26" cy="26" r="18" fill="#EEF7FE" stroke="#F2B320" stroke-width="6"/>
      <path d="M16 22 Q19 15 26 13" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none"/></svg>`;
  function renderBergMap() {
    $('#bergMap').innerHTML = BERG_LAYERS.map((l, i) =>
      `<button type="button" class="bm d${i} ${layerFilled(state.entry, l) ? 'filled' : ''} ${activeLayer === l.key ? 'active' : ''}"
          data-layer="${l.key}" style="--n:${i}" aria-label="${i + 1}번째 계단 ${l.name}">
         ${activeLayer === l.key ? MAG_MINI : ''}<i class="tread"><b>${i + 1}</b></i><span>${l.name}</span></button>`).join('');
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
    if (!e.id && dayEntries(e.date).length >= DAILY_MAX) {
      toast(`하루에 최대 ${DAILY_MAX}번까지 쓸 수 있어요 · 날짜를 바꿔주세요`);
      goPage(0);
      return;
    }
    e.drawing = pad.export();
    const now = Date.now();
    const isEdit = !!e.id;
    if (!e.time) e.time = nowTime();
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
    const scene = $('#savedScene');
    scene.innerHTML = '';
    void scene.offsetWidth;   // 애니메이션 다시 시작
    scene.innerHTML = `
      <div class="drawer-inside"></div>
      <div class="env big drop" style="--c:${main.color}"><span class="seal">${faceSVG(main)}</span></div>
      <div class="drawer-front"><i class="handle"></i></div>
      <i class="spark s1" style="--c:${main.color}"></i><i class="spark s2" style="--c:${main.color}"></i><i class="spark s3" style="--c:${main.color}"></i>`;
    $('#savedText').innerHTML = isEdit
      ? '고친 마음도 소중히 간직할게요.'
      : `${shortDate(record.date)} ${timeLabel(record.time)}의 ${main.name} 마음,<br>소중히 간직할게요.`;
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
    const all = await purgeExpired(await Store.all());
    state.records = all.filter(r => !r.deletedAt);
    state.trash = all.filter(r => r.deletedAt).sort((a, b) => b.deletedAt - a.deletedAt);
    const n = state.records.length;
    const b = $('#recordCount');
    b.hidden = !n; b.textContent = n > 99 ? '99+' : n;
    $('#openRecords').classList.toggle('has-alert', dueItems().length > 0);
    renderPeople(); renderDayCount();
  }

  /* ---------------- 임시 삭제함 ---------------- */
  const DAY = 86400000;
  const REMIND_AFTER = 3 * DAY;      // 삭제일 기준 3일 뒤부터 알림
  const MAX_KEEP = 90 * DAY;         // 최대 3개월
  const KEEP_OPTIONS = [
    { d: 3, l: '3일' }, { d: 7, l: '1주' }, { d: 14, l: '2주' }, { d: 30, l: '1개월' }, { d: 90, l: '3개월' },
  ];
  const SETTINGS_KEY = 'maeum-guseul-settings';
  const settings = (() => {
    const d = { remind: true, device: false, keepDays: 30 };
    try { return { ...d, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; } catch (_) { return d; }
  })();
  const saveSettings = () => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (_) {} };

  const keepLabel = d => (KEEP_OPTIONS.find(o => o.d === d) || {}).l || `${d}일`;
  const purgeAt = r => r.deletedAt + r.keepDays * DAY;
  const isAwaiting = (r, now = Date.now()) => !!(settings.remind && r.remindAt && now >= r.remindAt);
  const isFinalCall = r => r.remindAt && r.remindAt > r.deletedAt + REMIND_AFTER;
  const dueItems = () => state.trash.filter(r => isAwaiting(r));
  const mdDate = t => { const d = new Date(t); return `${d.getMonth() + 1}월 ${d.getDate()}일`; };
  const daysLeft = r => Math.max(0, Math.ceil((purgeAt(r) - Date.now()) / DAY));
  const daysSince = t => Math.max(0, Math.floor((Date.now() - t) / DAY));
  const stripTrash = r => { const { deletedAt, keepDays, remindAt, notifiedAt, ...rest } = r; return rest; };

  // 보관 기간이 끝난 기록은 영구 삭제 (답을 기다리는 기록은 답할 때까지 보관, 단 3개월이 최대)
  async function purgeExpired(all) {
    const now = Date.now(), keep = [];
    for (const r of all) {
      const expired = r.deletedAt && ((now >= purgeAt(r) && !isAwaiting(r, now)) || now >= r.deletedAt + MAX_KEEP);
      if (expired) await Store.remove(r.id); else keep.push(r);
    }
    return keep;
  }

  // 보관 기간 변경 = '계속 보관'. 다음 알림: 첫 3일 전이면 3일째, 이후엔 영구 삭제 하루 전
  function nextRemind(r, keepDays, now = Date.now()) {
    const first = r.deletedAt + REMIND_AFTER;
    if (now < first) return first;
    const last = r.deletedAt + keepDays * DAY - DAY;
    return last > now ? last : null;
  }

  async function softDelete(id, keepDays) {
    const r = state.records.find(x => x.id === id); if (!r) return;
    const now = Date.now();
    await Store.put({ ...r, deletedAt: now, keepDays, remindAt: now + REMIND_AFTER, notifiedAt: null });
  }
  async function restoreItem(id) {
    const r = state.trash.find(x => x.id === id); if (!r) return;
    await Store.put(stripTrash(r));
  }
  async function keepItem(id, keepDays) {
    const r = state.trash.find(x => x.id === id); if (!r) return false;
    if (r.deletedAt + keepDays * DAY <= Date.now()) { toast('보관 기간을 더 길게 골라주세요'); return false; }
    await Store.put({ ...r, keepDays, remindAt: nextRemind(r, keepDays), notifiedAt: null });
    return true;
  }

  function keepSelect(r) {
    const now = Date.now();
    return `<label class="keep-select"><span>보관</span>
      <select data-keep="${r.id}" aria-label="보관 기간">${KEEP_OPTIONS.map(o =>
        `<option value="${o.d}" ${o.d === r.keepDays ? 'selected' : ''} ${r.deletedAt + o.d * DAY <= now ? 'disabled' : ''}>${o.l}</option>`).join('')}
      </select></label>`;
  }

  function trashItemHTML(r, inRemind = false) {
    const emos = r.emotions.map(id => EMOTION_MAP[id]).filter(Boolean);
    const main = emos[0] || EMOTIONS[0];
    const due = isAwaiting(r);
    const left = daysLeft(r);
    const note = inRemind
      ? (isFinalCall(r) ? `${left ? `${left}일 뒤` : '곧'} 영구 삭제돼요` : `삭제한 지 ${daysSince(r.deletedAt)}일이 지났어요`)
      : `${mdDate(r.deletedAt)} 삭제 · ${keepLabel(r.keepDays)} 보관`;
    return `<article class="trash-item ${due ? 'due' : ''}" data-tid="${r.id}" style="--c:${main.color}">
        <div class="trash-top">
          <div class="trash-face">${faceSVG(main)}</div>
          <div class="trash-body">
            <div class="rec-date">${shortDate(r.date)} <small>${timeLabel(entryTime(r))}</small></div>
            <div class="rec-emos">${emos.map(e => e.name).join(' · ')}</div>
            <div class="trash-meta">${note}</div>
          </div>
          <div class="dday ${left <= 3 ? 'soon' : ''}"><b>${left ? 'D-' + left : 'D-day'}</b><small>${mdDate(purgeAt(r))}</small></div>
        </div>
        ${due && !inRemind ? '<p class="due-tag">삭제한 지 3일이 지났어요 · 어떻게 할지 골라주세요</p>' : ''}
        <div class="trash-actions">
          ${keepSelect(r)}
          <div class="trash-btns">
            <button class="mini-btn restore" data-act="restore">복귀</button>
            ${due || inRemind ? '<button class="mini-btn keep" data-act="keep">계속 보관</button>' : ''}
            <button class="mini-btn purge" data-act="purge">영구 삭제</button>
          </div>
        </div>
      </article>`;
  }

  function renderTrash() {
    const list = state.trash;
    $('#trashInfo').innerHTML = `
      <div class="trash-guide">
        <strong>임시 삭제함</strong>
        <p>정한 기간(최소 3일 · 최대 3개월) 동안 보관된 뒤 영구 삭제돼요.
        삭제한 지 3일이 지나면 <b>복귀 · 계속 보관 · 영구 삭제</b> 중에서 고를 수 있게 알려드려요.</p>
      </div>
      ${list.length ? `<button class="text-btn danger" id="emptyTrash">임시 삭제함 비우기</button>` : ''}`;
    $('#trashList').innerHTML = list.length ? list.map(r => trashItemHTML(r)).join('') : `
      <div class="empty-state small">
        <div class="env empty-env" style="--c:#E9E3F0"></div>
        <strong>임시 삭제함이 비어 있어요</strong>
        <p>지운 마음 편지는 여기에 잠시 머물러요.</p>
      </div>`;
  }

  function renderSheetTabs() {
    const due = dueItems().length;
    $('#recTabCount').textContent = state.records.length;
    const tc = $('#trashTabCount');
    tc.textContent = state.trash.length;
    tc.classList.toggle('alert', due > 0);
    $$('#sheetTabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === state.sheetTab));
    $('#recordsView').hidden = state.sheetTab !== 'records';
    $('#trashView').hidden = state.sheetTab !== 'trash';
  }

  function refreshSheet() {
    renderSheetTabs();
    if (state.sheetTab === 'records') renderRecords(); else renderTrash();
  }

  function openRecords(tab = 'records') {
    state.sheetTab = tab;
    refreshSheet();
    openLayer($('#recordsSheet'));
  }

  // 휴지통·알림 공통 동작
  async function trashAction(act, id, root) {
    const r = state.trash.find(x => x.id === id); if (!r) return;
    if (act === 'restore') {
      await restoreItem(id); toast('마음 편지를 서랍에 되돌렸어요');
    } else if (act === 'keep') {
      const sel = root.querySelector(`select[data-keep="${id}"]`);
      const d = sel ? +sel.value : r.keepDays;
      if (!(await keepItem(id, d))) return;
      toast(`${mdDate(r.deletedAt + d * DAY)}까지 임시 보관할게요`);
    } else if (act === 'purge') {
      if (!(await ask('이 마음 편지를 영구 삭제할까요?\n영구 삭제한 기록은 되돌릴 수 없어요.', '영구 삭제'))) return;
      await Store.remove(id); toast('영구 삭제했어요');
    }
    await loadRecords();
    refreshSheet();
    if ($('#remindModal').classList.contains('open')) renderRemind();
  }

  /* ---------------- 삭제 방식 고르기 ---------------- */
  const del = { mode: 'temp', keep: 30 };
  function renderDeleteModal() {
    $$('#deleteModal .del-opt').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === del.mode);
      b.setAttribute('aria-checked', b.dataset.mode === del.mode);
    });
    $('#delKeepWrap').classList.toggle('show', del.mode === 'temp');
    $('#delKeep').innerHTML = KEEP_OPTIONS.map(o =>
      `<button type="button" class="keep-chip ${o.d === del.keep ? 'active' : ''}" data-d="${o.d}">${o.l}</button>`).join('');
    $('#delKeepNote').textContent = `${mdDate(Date.now() + del.keep * DAY)}까지 보관 · ${mdDate(Date.now() + REMIND_AFTER)}부터 알려드려요`;
    const ok = $('#delOk');
    ok.textContent = del.mode === 'temp' ? '임시 삭제하기' : '영구 삭제하기';
    ok.classList.toggle('danger-fill', del.mode === 'perm');
  }
  function openDeleteModal() {
    del.mode = 'temp'; del.keep = settings.keepDays;
    renderDeleteModal();
    openLayer($('#deleteModal'));
  }
  async function confirmDelete() {
    const id = state.detailId;
    closeLayer($('#deleteModal'));
    if (del.mode === 'temp') {
      await softDelete(id, del.keep);
      toast(`임시 삭제함에 ${keepLabel(del.keep)} 동안 보관할게요`);
    } else {
      await Store.remove(id);
      toast('영구 삭제했어요');
    }
    closeLayer($('#detailSheet'));
    await loadRecords(); refreshSheet();
    if (state.entry.id === id) resetEntry();
  }

  /* ---------------- 알림 ---------------- */
  function renderRemind() {
    const due = dueItems().filter(r => !state.remindSkipped.has(r.id) || $('#remindModal').classList.contains('open'));
    if (!due.length) { closeLayer($('#remindModal')); return; }
    const anyFinal = due.some(isFinalCall);
    $('#remindTitle').textContent = anyFinal && due.every(isFinalCall) ? '곧 영구 삭제될 기록이 있어요' : '임시 삭제한 기록을 정리해 볼까요?';
    $('#remindList').innerHTML = due.map(r => trashItemHTML(r, true)).join('');
  }
  function anyLayerOpen() { return $$('.sheet.open, .modal.open').length > 0; }

  async function notifyDevice(due) {
    if (!settings.device || !('Notification' in window) || Notification.permission !== 'granted') return;
    const fresh = due.filter(r => !r.notifiedAt || r.notifiedAt < r.remindAt);
    if (!fresh.length) return;
    const title = '마음 서랍';
    const opts = {
      body: `임시 삭제한 기록 ${fresh.length}개를 정리할 시간이에요. 복귀 · 계속 보관 · 영구 삭제 중에서 골라주세요.`,
      icon: 'icons/icon-192.png', tag: 'trash-remind', data: { url: './#trash' },
    };
    try {
      const reg = await navigator.serviceWorker?.getRegistration?.();
      if (reg) await reg.showNotification(title, opts); else new Notification(title, opts);
    } catch (_) { return; }
    for (const r of fresh) await Store.put({ ...r, notifiedAt: Date.now() });
  }

  async function checkReminders() {
    await loadRecords();
    if ($('#recordsSheet').classList.contains('open')) refreshSheet();
    const due = dueItems();
    if (!due.length) return;
    if (document.hidden) { notifyDevice(due); return; }
    if (anyLayerOpen()) return;
    if (due.every(r => state.remindSkipped.has(r.id))) return;
    renderRemind();
    openLayer($('#remindModal'));
  }

  function renderSettings() {
    const sw = (el, on) => { el.classList.toggle('on', on); el.setAttribute('aria-checked', on); };
    sw($('#setRemind'), settings.remind);
    sw($('#setDevice'), settings.device && 'Notification' in window && Notification.permission === 'granted');
    $('#setDevice').closest('.set-row').classList.toggle('disabled', !settings.remind);
    $('#setKeep').innerHTML = KEEP_OPTIONS.map(o =>
      `<button type="button" class="keep-chip ${o.d === settings.keepDays ? 'active' : ''}" data-d="${o.d}">${o.l}</button>`).join('');
  }

  function letterHTML(r, i) {
    const e = EMOTION_MAP[r.emotions[0]] || EMOTIONS[0];
    const tilt = [-4, 3, -2, 5, -3, 2][i % 6];
    return `<button class="letter" data-id="${r.id}" style="--c:${e.color};--t:${tilt}deg;--i:${i}" aria-label="${shortDate(r.date)} ${e.name} 마음 편지">
        <span class="env"><span class="seal">${faceSVG(e)}</span></span>
        <small>${parseDate(r.date).getMonth() + 1}.${parseDate(r.date).getDate()}</small></button>`;
  }
  const excerpt = r => r.event || r.reason || r.perception || r.yearnText || r.selfText || (r.drawing ? '그림으로 남긴 마음' : '적어둔 이야기가 없어요');

  function renderRecords() {
    const list = state.records;
    const shelf = $('#shelf'), bar = $('#moodBar'), box = $('#recordList');
    if (!list.length) {
      shelf.innerHTML = '';
      bar.innerHTML = '';
      box.innerHTML = `<div class="empty-state">
          <div class="env empty-env big" style="--c:#FFE9A8"></div>
          <strong>아직 서랍이 비어 있어요</strong>
          <p>오늘의 마음을 첫 편지로 남겨볼까요?</p>
        </div>`;
      return;
    }
    shelf.innerHTML = `
      <div class="drawer-box">
        <p class="shelf-label">최근에 넣은 편지</p>
        <div class="letters">${list.slice(0, 16).map(letterHTML).join('')}</div>
        <div class="drawer-front slim"><i class="handle"></i><span>편지 ${list.length}통</span></div>
      </div>`;

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
          <div class="rec-face"><span class="env"><span class="seal">${faceSVG(main)}</span></span></div>
          <div class="rec-body">
            <div class="rec-top"><span class="rec-date">${shortDate(r.date)} <small>${timeLabel(entryTime(r))}</small></span>
              <span class="rec-stars">${r.rating ? '★'.repeat(r.rating) + '<s>' + '★'.repeat(5 - r.rating) + '</s>' : ''}</span></div>
            <div class="rec-emos">${emos.map(e => e.name).join(' · ')}</div>
            <p class="rec-text">${esc(excerpt(r))}</p>
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
    $('#detailTitle').textContent = `${shortDate(r.date)} ${timeLabel(entryTime(r))}`;
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
      <div class="detail-block"><label>마음 계단</label>${bergDetailHTML(r)}</div>
      ${r.drawing ? `<div class="detail-block"><label>마음 그림</label><div class="detail-draw"><img src="${r.drawing}" alt="마음 그림"></div></div>` : ''}
    `;
    openLayer($('#detailSheet'));
  }

  function bergDetailHTML(r) {
    const val = f => {
      const v = r[f];
      if (f === 'coping') { const c = COPING_MAP[v]; return c ? `<span class="cope-tag" style="--c:${c.color}"><b>${c.name}</b> ${c.desc}</span>` : ''; }
      if (f === 'yearnings') return (v || []).length ? `<div class="chips">${v.map(y => `<span class="chip yearn-chip">${esc(y)}</span>`).join('')}</div>` : '';
      return v && String(v).trim() ? `<p class="detail-text">${esc(v)}</p>` : '';
    };
    const layers = BERG_LAYERS.map((l, i) => {
      const body = l.fields.map(f => { const h = val(f); return h ? `<div class="bd-field"><small>${BERG_FIELD_LABEL[f]}</small>${h}</div>` : ''; }).join('');
      if (!body) return '';
      return `${i === 1 ? '<div class="bd-sea">여기서부터 안쪽 마음</div>' : ''}
        <section class="bd-layer d${i} ${l.key === 'self' ? 'core' : ''}" style="--n:${i}">
          <h4><span class="step-no">${i + 1}</span>${l.name} <em>${l.en}</em></h4>${body}</section>`;
    }).join('');
    return layers ? `<div class="berg-detail">${layers}</div>` : '<p class="detail-text"><span class="muted">적지 않았어요</span></p>';
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
      if (!state.entry.id && dayEntries(di.value).length >= DAILY_MAX) toast(`이날은 이미 ${DAILY_MAX}번 썼어요 · 다른 날짜를 골라주세요`);
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
    let mapTimer;
    $$('[data-field]').forEach(el => el.addEventListener('input', () => {
      state.entry[el.dataset.field] = el.value;
      if (el.dataset.field === 'event') $('#eventCount').textContent = el.value.length;
      saveDraft();
      clearTimeout(mapTimer); mapTimer = setTimeout(renderBergMap, 300);
    }));
    $('#miniEmos').addEventListener('click', e => { if (e.target.closest('[data-go]')) goPage(0); });
    $('#copingChips').addEventListener('click', e => {
      const b = e.target.closest('[data-cope]'); if (!b) return;
      state.entry.coping = state.entry.coping === b.dataset.cope ? '' : b.dataset.cope;
      renderCoping(); renderBergMap(); saveDraft(); vibrate();
    });
    $('#yearnChips').addEventListener('click', e => {
      const b = e.target.closest('[data-y]'); if (!b) return;
      const list = state.entry.yearnings = [...(state.entry.yearnings || [])];
      const i = list.indexOf(b.dataset.y);
      if (i >= 0) list.splice(i, 1); else list.push(b.dataset.y);
      renderYearn(); renderBergMap(); saveDraft(); vibrate();
    });
    // 계단 지도: 누르면 해당 계단으로, 스크롤하면 지금 들여다보는 계단에 돋보기 표시
    const bergPage = $('.berg-page');
    const layerTop = el => el.getBoundingClientRect().top - bergPage.getBoundingClientRect().top + bergPage.scrollTop;
    $('#bergMap').addEventListener('click', e => {
      const b = e.target.closest('[data-layer]'); if (!b) return;
      const el = $(`#layer-${b.dataset.layer}`);
      bergPage.scrollTo({ top: layerTop(el) - $('#bergMap').offsetHeight - 14, behavior: 'smooth' });
    });
    bergPage.addEventListener('scroll', () => {
      const line = bergPage.scrollTop + $('#bergMap').offsetHeight + 60;
      let cur = BERG_LAYERS[0].key;
      for (const l of BERG_LAYERS) if (layerTop($(`#layer-${l.key}`)) <= line) cur = l.key;
      if (cur !== activeLayer) { activeLayer = cur; renderBergMap(); }
    }, { passive: true });

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
    $('#clearBtn').addEventListener('click', async () => {
      if (!pad.hasInk) return;
      if (await ask('그림을 모두 지울까요?', '지우기')) pad.clear();
    });

    // 기록
    $('#openRecords').addEventListener('click', () => openRecords(dueItems().length && !state.records.length ? 'trash' : 'records'));
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
    $('#deleteBtn').addEventListener('click', openDeleteModal);
    $('#deleteModal').addEventListener('click', e => {
      const opt = e.target.closest('.del-opt');
      if (opt) { del.mode = opt.dataset.mode; renderDeleteModal(); return; }
      const chip = e.target.closest('.keep-chip');
      if (chip) { del.keep = +chip.dataset.d; renderDeleteModal(); }
    });
    $('#delCancel').addEventListener('click', () => closeLayer($('#deleteModal')));
    $('#delOk').addEventListener('click', confirmDelete);

    // 기록 / 임시 삭제함 탭
    $('#sheetTabs').addEventListener('click', e => {
      const b = e.target.closest('button[data-tab]'); if (!b) return;
      state.sheetTab = b.dataset.tab; refreshSheet();
      $('#recordsSheet .sheet-body').scrollTop = 0;
    });
    const onTrashClick = root => async e => {
      const b = e.target.closest('button[data-act]'); if (!b) return;
      await trashAction(b.dataset.act, b.closest('[data-tid]').dataset.tid, root);
    };
    $('#trashList').addEventListener('click', onTrashClick($('#trashList')));
    $('#trashList').addEventListener('change', async e => {
      const sel = e.target.closest('select[data-keep]'); if (!sel) return;
      const r = state.trash.find(x => x.id === sel.dataset.keep);
      if (await keepItem(sel.dataset.keep, +sel.value)) toast(`${mdDate(r.deletedAt + sel.value * DAY)}까지 보관할게요`);
      await loadRecords(); refreshSheet();
    });
    $('#trashInfo').addEventListener('click', async e => {
      if (!e.target.closest('#emptyTrash')) return;
      if (!(await ask(`임시 삭제함의 기록 ${state.trash.length}개를 모두 영구 삭제할까요?\n되돌릴 수 없어요.`, '모두 영구 삭제'))) return;
      for (const r of state.trash) await Store.remove(r.id);
      await loadRecords(); refreshSheet(); toast('임시 삭제함을 비웠어요');
    });

    // 알림 창
    $('#remindList').addEventListener('click', onTrashClick($('#remindList')));
    $('#remindLater').addEventListener('click', () => {
      dueItems().forEach(r => state.remindSkipped.add(r.id));
      closeLayer($('#remindModal'));
      toast('다음에 앱을 열 때 다시 알려드릴게요');
    });
    $('#remindOpenTrash').addEventListener('click', () => { closeLayer($('#remindModal')); openRecords('trash'); });

    // 설정
    $('#openSettings').addEventListener('click', () => { renderSettings(); openLayer($('#settingsSheet')); });
    $('#setRemind').addEventListener('click', async () => {
      settings.remind = !settings.remind; saveSettings(); renderSettings();
      toast(settings.remind ? '임시 삭제 알림을 켰어요' : '알림을 껐어요 · 보관 기간이 끝나면 바로 영구 삭제돼요');
      await loadRecords(); refreshSheet();
    });
    $('#setDevice').addEventListener('click', async () => {
      if (!settings.remind) { toast('먼저 임시 삭제 알림을 켜주세요'); return; }
      const granted = 'Notification' in window && Notification.permission === 'granted';
      if (settings.device && granted) { settings.device = false; saveSettings(); renderSettings(); toast('기기 알림을 껐어요'); return; }
      if (!('Notification' in window)) { toast('이 환경에서는 기기 알림을 쓸 수 없어요'); return; }
      let perm = Notification.permission;
      try { if (perm === 'default') perm = await Notification.requestPermission(); } catch (_) { perm = 'denied'; }
      settings.device = perm === 'granted'; saveSettings(); renderSettings();
      toast(settings.device ? '기기 알림을 켰어요' : '알림 권한이 허용되지 않았어요');
    });
    $('#setKeep').addEventListener('click', e => {
      const c = e.target.closest('.keep-chip'); if (!c) return;
      settings.keepDays = +c.dataset.d; saveSettings(); renderSettings();
    });
    $('#cancelEdit').addEventListener('click', () => {
      resetEntry(); toast('새 일기를 시작해요');
    });

    $('#savedOk').addEventListener('click', () => { closeLayer($('#savedModal')); resetEntry(); });

    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      const open = $$('.sheet.open'); if (open.length) closeLayer(open[open.length - 1]);
      if ($('#deleteModal').classList.contains('open')) closeLayer($('#deleteModal'));
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

    // 알림: 열 때, 다시 돌아올 때, 열려 있는 동안 1분마다 확인
    if (location.hash === '#trash') openRecords('trash');
    else setTimeout(checkReminders, 900);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) checkReminders(); });
    setInterval(checkReminders, 60000);

    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  init();
})();
