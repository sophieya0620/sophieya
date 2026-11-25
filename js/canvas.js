/* =========================================================
   그림 메모장 (손가락/펜/마우스)
   ========================================================= */
class DrawPad {
  constructor(canvas, wrap) {
    this.c = canvas;
    this.wrap = wrap;
    this.ctx = canvas.getContext('2d');
    this.color = '#3E2C44';
    this.size = 6;
    this.mode = 'pen';
    this.history = [];
    this.drawing = false;
    this.hasInk = false;
    this.onchange = () => {};
    this.onstrokeend = () => {};

    this.resize();
    new ResizeObserver(() => this.resize()).observe(wrap);

    canvas.addEventListener('pointerdown', e => this.down(e));
    canvas.addEventListener('pointermove', e => this.move(e));
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => canvas.addEventListener(t, e => this.up(e)));
  }

  resize() {
    const r = this.wrap.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
    if (w === this.c.width && h === this.c.height) return;
    let snap = null;
    if (this.c.width && this.hasInk) {
      snap = document.createElement('canvas');
      snap.width = this.c.width; snap.height = this.c.height;
      snap.getContext('2d').drawImage(this.c, 0, 0);
    }
    this.c.width = w; this.c.height = h;
    this.dpr = dpr;
    if (snap) this.ctx.drawImage(snap, 0, 0, w, h);
    this.history = [];
  }

  point(e) {
    const r = this.c.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (this.c.width / r.width),
      y: (e.clientY - r.top) * (this.c.height / r.height),
      p: e.pointerType === 'pen' && e.pressure ? e.pressure : 0.5,
    };
  }

  width(p) {
    const base = this.size * this.dpr * (this.mode === 'eraser' ? 3 : 1);
    return base * (0.6 + p * 0.8);
  }

  snapshot() {
    try {
      this.history.push(this.ctx.getImageData(0, 0, this.c.width, this.c.height));
      if (this.history.length > 25) this.history.shift();
    } catch (_) { /* ignore */ }
  }

  setup() {
    const ctx = this.ctx;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = ctx.fillStyle = this.color;
    ctx.globalCompositeOperation = this.mode === 'eraser' ? 'destination-out' : 'source-over';
  }

  down(e) {
    if (e.button !== undefined && e.button > 0) return;
    e.preventDefault();
    this.c.setPointerCapture?.(e.pointerId);
    this.snapshot();
    this.drawing = true;
    this.setup();
    const pt = this.point(e);
    this.last = pt; this.prevMid = pt;
    this.ctx.beginPath();
    this.ctx.arc(pt.x, pt.y, this.width(pt.p) / 2, 0, Math.PI * 2);
    this.ctx.fill();
    if (this.mode === 'pen') this.mark(true);
  }

  move(e) {
    if (!this.drawing) return;
    e.preventDefault();
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of (events.length ? events : [e])) {
      const pt = this.point(ev);
      const mid = { x: (this.last.x + pt.x) / 2, y: (this.last.y + pt.y) / 2 };
      this.ctx.lineWidth = this.width(pt.p);
      this.ctx.beginPath();
      this.ctx.moveTo(this.prevMid.x, this.prevMid.y);
      this.ctx.quadraticCurveTo(this.last.x, this.last.y, mid.x, mid.y);
      this.ctx.stroke();
      this.last = pt; this.prevMid = mid;
    }
  }

  up() {
    if (!this.drawing) return;
    this.drawing = false;
    this.ctx.globalCompositeOperation = 'source-over';
    if (this.mode === 'eraser') this.mark(!this.isBlank());
    this.onstrokeend();
  }

  mark(v) { this.hasInk = v; this.onchange(v); }

  undo() {
    const img = this.history.pop();
    if (!img) return false;
    this.ctx.putImageData(img, 0, 0);
    this.mark(!this.isBlank());
    this.onstrokeend();
    return true;
  }

  clear(record = true) {
    if (record && this.hasInk) this.snapshot();
    this.ctx.clearRect(0, 0, this.c.width, this.c.height);
    this.mark(false);
    if (record) this.onstrokeend();
  }

  isBlank() {
    const { width: w, height: h } = this.c;
    if (!w || !h) return true;
    const d = this.ctx.getImageData(0, 0, w, h).data;
    for (let i = 3; i < d.length; i += 16) if (d[i] !== 0) return false;
    return true;
  }

  /** 투명 배경 PNG(최대 1000px)로 내보내기, 비어 있으면 null */
  export() {
    if (!this.hasInk || this.isBlank()) return null;
    const max = 1000, s = Math.min(1, max / this.c.width);
    const out = document.createElement('canvas');
    out.width = Math.round(this.c.width * s);
    out.height = Math.round(this.c.height * s);
    out.getContext('2d').drawImage(this.c, 0, 0, out.width, out.height);
    return out.toDataURL('image/png');
  }

  load(dataURL) {
    this.history = [];
    this.ctx.clearRect(0, 0, this.c.width, this.c.height);
    if (!dataURL) { this.mark(false); return Promise.resolve(); }
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const s = Math.min(this.c.width / img.width, this.c.height / img.height);
        const w = img.width * s, h = img.height * s;
        this.ctx.drawImage(img, (this.c.width - w) / 2, (this.c.height - h) / 2, w, h);
        this.mark(true);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = dataURL;
    });
  }
}
