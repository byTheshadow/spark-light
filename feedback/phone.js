/* 返图页的电话：拨盘（点孔或拖着转）、读数屏、电话线、接通动画、可选的拨号声。
   这个模块只管“拨号和接通”，口令是否正确由 opts.verify 决定（交给 api.js，最终由后端校验）。
   opts：{ verify(code) -> Promise<{ok, kind?, message?}>, onConnected(code) }
   资源：动画循环只在电话可见时计算；声音默认关闭，关掉或离开页面时释放音频。 */
import { clamp, buzz, isSimple } from '../core/raf.js';

const NS = 'http://www.w3.org/2000/svg';
function sv(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

/* ---------- 声音：默认关闭，打开后才有拨号咔嗒、回铃、摘机声 ---------- */
const Snd = (function () {
  let on = false, ctx = null;
  function ac() {
    if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(fs, dur, vol, type, at) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + (at || 0), g = c.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .012);
    g.gain.setValueAtTime(vol, t + Math.max(.02, dur - .04)); g.gain.linearRampToValueAtTime(0, t + dur);
    g.connect(c.destination);
    fs.forEach((f) => { const o = c.createOscillator(); o.type = type || 'sine'; o.frequency.value = f; o.connect(g); o.start(t); o.stop(t + dur + .03); });
  }
  function click() {
    const c = ac(); if (!c) return;
    const n = Math.floor(c.sampleRate * .012), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = 1.1; g.gain.value = .3;
    s.buffer = b; s.connect(f); f.connect(g); g.connect(c.destination); s.start();
  }
  function release() { if (ctx) { try { ctx.close(); } catch (e) { /* 已关闭 */ } ctx = null; } }
  addEventListener('pagehide', release);
  document.addEventListener('visibilitychange', () => { if (document.hidden && ctx && ctx.state === 'running') ctx.suspend(); });
  return {
    set(v) { on = v; if (v) ac(); else if (ctx && ctx.state === 'running') ctx.suspend(); },
    click() { if (on) click(); },
    ringback() { if (on) tone([440, 480], 1.2, .045); },
    bell() { if (on) for (let i = 0; i < 8; i++) tone([1180, 1340], .07, .03, 'triangle', i * .1); },
    pick() { if (on) { tone([150], .1, .12); click(); } },
    busy() { if (on) { tone([480, 620], .25, .045, 'sine', 0); tone([480, 620], .25, .045, 'sine', .5); } },
    hang() { if (on) { tone([110], .09, .12); click(); } }
  };
})();

/* ---------- 拨盘的几何 ---------- */
const CX = 160, CY = 160, RH = 112, STOP = 128;
const ORDER = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
const LET = ['', 'ABC', 'DEF', 'GHI', 'JKL', 'MNO', 'PRS', 'TUV', 'WXY', 'OPER'];
const holeAng = (i) => STOP - 30 * (i + 2);
const P = (a, r) => { const t = a * Math.PI / 180; return [CX + r * Math.sin(t), CY - r * Math.cos(t)]; };
const maxFor = (i) => 30 * (i + 2);
const adiff = (a, b) => { let d = a - b; while (d > 180) d -= 360; while (d < -180) d += 360; return d; };

function buildDial(dsvg) {
  const defs = sv('defs', {}, dsvg);
  const lg = sv('radialGradient', { id: 'plate', cx: '40%', cy: '34%', r: '75%' }, defs);
  sv('stop', { offset: '0', 'stop-color': '#2d2c38' }, lg); sv('stop', { offset: '.6', 'stop-color': '#121118' }, lg); sv('stop', { offset: '1', 'stop-color': '#050507' }, lg);
  const gl = sv('linearGradient', { id: 'glass', x1: '0', y1: '0', x2: '1', y2: '1' }, defs);
  sv('stop', { offset: '0', 'stop-color': '#fff', 'stop-opacity': '.26' }, gl); sv('stop', { offset: '.45', 'stop-color': '#cfc8ff', 'stop-opacity': '.08' }, gl); sv('stop', { offset: '1', 'stop-color': '#bfe6e1', 'stop-opacity': '.18' }, gl);
  const ir = sv('linearGradient', { id: 'iri', x1: '0', y1: '0', x2: '1', y2: '1' }, defs);
  sv('stop', { offset: '0', 'stop-color': '#cfc8ff' }, ir); sv('stop', { offset: '.5', 'stop-color': '#bfe6e1' }, ir); sv('stop', { offset: '1', 'stop-color': '#f1d8e2' }, ir);
  const hub = sv('radialGradient', { id: 'hubg', cx: '38%', cy: '30%', r: '80%' }, defs);
  sv('stop', { offset: '0', 'stop-color': '#fbfaff' }, hub); sv('stop', { offset: '.55', 'stop-color': '#dcd9ec' }, hub); sv('stop', { offset: '1', 'stop-color': '#a7a4bd' }, hub);
  const mk = sv('mask', { id: 'holes' }, defs);
  sv('rect', { x: 0, y: 0, width: 320, height: 320, fill: '#fff' }, mk);
  ORDER.forEach((d, i) => { const p = P(holeAng(i), RH); sv('circle', { cx: p[0], cy: p[1], r: 21, fill: '#000' }, mk); });
  sv('circle', { cx: CX, cy: CY, r: 58, fill: '#000' }, mk);

  sv('circle', { cx: CX, cy: CY, r: 157, fill: 'url(#plate)' }, dsvg);
  sv('circle', { cx: CX, cy: CY, r: 156, fill: 'none', stroke: 'url(#iri)', 'stroke-opacity': '.6', 'stroke-width': '1.2' }, dsvg);
  for (let t = 0; t < 60; t++) {
    const a = t * 6, p1 = P(a, 150), p2 = P(a, t % 5 ? 146 : 142);
    sv('line', { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1], stroke: '#fff', 'stroke-opacity': t % 5 ? '.12' : '.28', 'stroke-width': '1' }, dsvg);
  }
  ORDER.forEach((d, i) => {
    const p = P(holeAng(i), RH);
    const tx = sv('text', { x: p[0], y: p[1] + (LET[i] ? 4 : 8), 'text-anchor': 'middle', 'font-family': 'Instrument Serif, Didot, serif', 'font-size': '23', fill: '#fff', 'fill-opacity': '.92' }, dsvg);
    tx.textContent = d;
    if (LET[i]) {
      const lt = sv('text', { x: p[0], y: p[1] + 14, 'text-anchor': 'middle', 'font-family': 'Instrument Serif, Didot, serif', 'font-size': '6.5', 'letter-spacing': '1', fill: '#cfc8ff', 'fill-opacity': '.75' }, dsvg);
      lt.textContent = LET[i];
    }
  });
  const w = sv('g', { id: 'wheel' }, dsvg);
  sv('circle', { cx: CX, cy: CY, r: 140, fill: 'url(#glass)', mask: 'url(#holes)' }, w);
  sv('circle', { cx: CX, cy: CY, r: 140, fill: 'none', stroke: '#fff', 'stroke-opacity': '.3', 'stroke-width': '1' }, w);
  ORDER.forEach((d, i) => {
    const p = P(holeAng(i), RH);
    const g = sv('g', { class: 'hole', 'data-i': i, tabindex: '0', role: 'button', 'aria-label': '拨 ' + d }, w);
    sv('circle', { cx: p[0], cy: p[1], r: 25, fill: 'transparent' }, g);
    sv('circle', { class: 'hr', cx: p[0], cy: p[1], r: 21, fill: 'none', stroke: 'url(#iri)', 'stroke-opacity': '.8', 'stroke-width': '1.2' }, g);
  });
  sv('circle', { cx: CX, cy: CY, r: 56, fill: 'url(#hubg)' }, w);
  sv('circle', { cx: CX, cy: CY, r: 47, fill: 'none', stroke: '#000', 'stroke-opacity': '.16', 'stroke-width': '.8' }, w);
  const t1 = sv('text', { x: CX, y: CY - 4, 'text-anchor': 'middle', 'font-family': 'Instrument Serif, Didot, serif', 'font-style': 'italic', 'font-size': '17', fill: '#1b1a24' }, w);
  t1.textContent = 'Spark Light';
  const t2 = sv('text', { x: CX, y: CY + 16, 'text-anchor': 'middle', 'font-family': 'Noto Serif SC, serif', 'font-size': '8.5', 'letter-spacing': '3', fill: '#55536a' }, w);
  t2.textContent = '拨入口令';
  sv('circle', { class: 'hub-led', id: 'led', cx: CX, cy: CY + 30, r: 2.6, fill: '#8f87e8' }, w);
  const sp = P(STOP, 138);
  sv('path', { d: 'M-6,-16 Q8,-4 6,16 L-2,16 Q0,-2 -12,-12 Z', transform: 'translate(' + sp[0] + ' ' + sp[1] + ') rotate(' + STOP + ')', fill: 'url(#iri)', stroke: '#fff', 'stroke-opacity': '.6', 'stroke-width': '.6' }, dsvg);
}

export function createPhone(opts, loop) {
  const $ = (id) => document.getElementById(id);
  const phoneEl = $('phone'), dialEl = $('dial'), dsvg = $('dsvg'), stage = $('phStage'), hsWrap = $('hsWrap');
  const slots = $('slots'), lcd = $('lcd'), stEl = $('lcdSt'), kb = $('kb');
  const bCall = $('bCall'), bBack = $('bBack'), bClear = $('bClear'), bKb = $('bKb'), bSnd = $('bSnd');
  const cordA = $('cordA'), cordB = $('cordB'), hero = $('hero');
  buildDial(dsvg);
  const wheel = $('wheel'), led = $('led');

  let rot = 0, busy = false, code = [], st = 'idle', kbMode = false, dead = false;
  const MAXLEN = 8;
  const locked = () => st === 'call' || st === 'ok';
  const setRot = (v) => { rot = v; wheel.setAttribute('transform', 'rotate(' + v.toFixed(2) + ' ' + CX + ' ' + CY + ')'); };

  /* 动画帧里的小动画（转盘回位等）也要能在离开页面时停下，所以统一记录并在 dead 时停止 */
  function anim(step) { const run = (now) => { if (dead) return; if (step(now) !== false) requestAnimationFrame(run); }; requestAnimationFrame(run); }

  function svgPt(e) { const pt = dsvg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const m = dsvg.getScreenCTM(); return m ? pt.matrixTransform(m.inverse()) : pt; }
  function angOf(p) { const a = Math.atan2(p.x - CX, -(p.y - CY)) * 180 / Math.PI; return (a + 360) % 360; }

  function returnHome(done) {
    const from = rot;
    if (from <= 0.1 || isSimple()) { setRot(0); if (done) done(); return; }
    const dur = Math.max(260, from / 360 * 900), t0 = performance.now();
    let lastTick = from;
    anim((now) => {
      const q = clamp((now - t0) / dur, 0, 1), e = q < 1 ? 1 - Math.pow(1 - q, 2) : 1;
      setRot(from * (1 - e));
      if (lastTick - rot >= 30) { lastTick = rot; buzz(3); Snd.click(); }
      if (q < 1) return true;
      setRot(0); if (done) done(); return false;
    });
  }
  function hot(i, on) { const hh = dsvg.querySelector('.hole[data-i="' + i + '"]'); if (hh) hh.classList.toggle('hot', on); }
  function autoDial(i) {
    if (busy || code.length >= MAXLEN || locked()) return;
    busy = true;
    const target = maxFor(i), t0 = performance.now(), dur = isSimple() ? 1 : Math.max(240, target / 360 * 700);
    hot(i, true);
    anim((now) => {
      const q = clamp((now - t0) / dur, 0, 1);
      setRot(target * (1 - Math.pow(1 - q, 3)));
      if (q < 1) return true;
      push(ORDER[i]);
      returnHome(() => { hot(i, false); busy = false; });
      return false;
    });
  }

  let drag = null;
  dialEl.addEventListener('pointerdown', (e) => {
    if (busy || locked()) return;
    const p = svgPt(e), r = Math.hypot(p.x - CX, p.y - CY);
    if (r < 84 || r > 142) return;
    const a = angOf(p); let best = -1, bd = 99;
    ORDER.forEach((d, i) => { const dd = Math.abs(adiff(a, holeAng(i))); if (dd < bd) { bd = dd; best = i; } });
    if (bd > 16) return;
    e.preventDefault(); dialEl.setPointerCapture(e.pointerId); dialEl.classList.add('drag');
    drag = { i: best, last: a, max: maxFor(best), t: performance.now(), moved: 0 };
    hot(best, true); busy = true;
  });
  dialEl.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const a = angOf(svgPt(e)), d = adiff(a, drag.last);
    drag.last = a; drag.moved += Math.abs(d);
    const prev = rot; setRot(clamp(rot + d, 0, drag.max));
    if (Math.floor(rot / 30) !== Math.floor(prev / 30)) { buzz(4); Snd.click(); }
  });
  function endDrag() {
    if (!drag) return;
    const d = drag; drag = null; dialEl.classList.remove('drag');
    if (d.moved < 5 && performance.now() - d.t < 450) { busy = false; setRot(0); hot(d.i, false); autoDial(d.i); return; }
    if (rot >= d.max - 10) { setRot(d.max); push(ORDER[d.i]); }
    returnHome(() => { hot(d.i, false); busy = false; });
  }
  dialEl.addEventListener('pointerup', endDrag); dialEl.addEventListener('pointercancel', endDrag);
  dsvg.querySelectorAll('.hole').forEach((hh) => hh.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); autoDial(+hh.getAttribute('data-i')); } }));
  dialEl.addEventListener('keydown', (e) => {
    if (/^[0-9]$/.test(e.key)) { e.preventDefault(); autoDial(ORDER.indexOf(e.key)); }
    else if (e.key === 'Backspace') { e.preventDefault(); back(); }
  });

  /* ---------- 读数屏 ---------- */
  function status(t, cls) { stEl.textContent = t; stEl.className = 'lcd-st' + (cls ? ' ' + cls : ''); }
  function render(fresh) {
    slots.textContent = '';
    const n = Math.max(6, code.length + (code.length < MAXLEN ? 1 : 0));
    for (let i = 0; i < n; i++) slots.appendChild(el('span', 'slot' + (i === code.length ? ' cur' : '') + (fresh && i === code.length - 1 ? ' new' : ''), code[i] || ''));
    const len = kbMode ? kb.value.trim().length : code.length;
    bCall.disabled = len < 4 || locked();
    bBack.disabled = kbMode || !code.length;
    bClear.disabled = kbMode ? !kb.value : !code.length;
  }
  function push(d) {
    if (code.length >= MAXLEN) return;
    code.push(d);
    if (st === 'err') st = 'idle';
    status(code.length < 4 ? '继续拨' : '拨完了就按接通');
    render(true);
  }
  function back() { if (busy || locked()) return; code.pop(); render(); if (!code.length) status('请拨入口令'); }
  bBack.addEventListener('click', back);
  bClear.addEventListener('click', () => { if (locked()) return; code = []; kb.value = ''; render(); status('请拨入口令'); });
  bKb.addEventListener('click', () => {
    kbMode = !kbMode;
    lcd.classList.toggle('kbd', kbMode);
    bKb.setAttribute('aria-pressed', String(kbMode));
    bKb.textContent = kbMode ? '改用拨盘' : '改用键盘输入';
    if (kbMode) { kb.value = code.join(''); setTimeout(() => kb.focus(), 30); }
    else code = kb.value.replace(/\D/g, '').slice(0, MAXLEN).split('').filter(Boolean);
    render();
  });
  bSnd.addEventListener('click', () => {
    const on = bSnd.getAttribute('aria-pressed') !== 'true';
    bSnd.setAttribute('aria-pressed', String(on)); bSnd.textContent = on ? '声音 开' : '声音 关';
    Snd.set(on); if (on) Snd.click();
  });
  kb.addEventListener('input', () => render());
  kb.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !bCall.disabled) call(); });
  bCall.addEventListener('click', call);

  function stepOn(n) { document.querySelectorAll('#steps li').forEach((li, i) => li.classList.toggle('on', i < n)); }

  async function call() {
    const val = kbMode ? kb.value.trim() : code.join('');
    if (val.length < 4 || locked()) return;
    st = 'call'; render(); phoneEl.classList.add('calling'); status('接通中'); led.setAttribute('fill', '#bfe6e1'); Snd.ringback();
    const minWait = new Promise((r) => setTimeout(r, isSimple() ? 300 : 1500));
    let res;
    try { res = await opts.verify(val); } catch (e) { res = { ok: false, kind: 'closed', message: '暂时联系不上，请稍后再试' }; }
    await minWait;
    if (dead) return;
    phoneEl.classList.remove('calling');
    if (res && res.ok) {
      st = 'ok'; status('有人接听', 'ok'); led.setAttribute('fill', '#4fe0c2'); phoneEl.classList.add('ring'); Snd.bell(); buzz([10, 40, 10, 40, 10]);
      setTimeout(() => {
        if (dead) return;
        phoneEl.classList.remove('ring'); phoneEl.classList.add('lift'); Snd.pick(); status('已接通', 'ok'); stepOn(2);
        setTimeout(() => { if (!dead) opts.onConnected(val); }, isSimple() ? 40 : 560);
      }, isSimple() ? 0 : 900);
    } else if (res && res.kind === 'closed') {
      st = 'idle'; status((res && res.message) || '留言通道暂未开放', 'err'); led.setAttribute('fill', '#8f87e8'); Snd.hang();
      code = []; kb.value = ''; render();
    } else {
      st = 'err'; status((res && res.message) || '口令没有接通，核对后重拨', 'err'); led.setAttribute('fill', '#ff8fb0'); Snd.busy();
      dialEl.classList.remove('shake'); void dialEl.offsetWidth; dialEl.classList.add('shake'); buzz([30, 40, 30]);
      code = []; kb.value = ''; render();
    }
  }
  function hangUp(sent) {
    st = 'idle'; code = []; kb.value = '';
    if (phoneEl.classList.contains('lift')) { phoneEl.classList.remove('lift'); Snd.hang(); buzz(12); }
    led.setAttribute('fill', '#8f87e8'); stepOn(sent ? 3 : 1);
    status(sent ? '留言已寄出，可以再拨一次' : '请拨入口令'); render();
  }
  render();

  /* ---------- 夜空与视差、电话线：只在封面可见时计算 ---------- */
  const sky1 = $('sky1'), sky2 = $('sky2');
  let sway = 0, swayV = 0, lastTx = 0;
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  hero.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = hero.getBoundingClientRect();
    tilt.tx = ((e.clientX - r.left) / r.width - .5) * 2; tilt.ty = ((e.clientY - r.top) / r.height - .5) * 2;
  });
  hero.addEventListener('pointerleave', () => { tilt.tx = 0; tilt.ty = 0; });

  function drawCord(now) {
    const W = stage.offsetWidth; if (!W) return;
    const sr = stage.getBoundingClientRect(); if (!sr.width) return;
    const k = W / sr.width, hr = hsWrap.getBoundingClientRect(), lift = phoneEl.classList.contains('lift');
    const x0 = (hr.left - sr.left + hr.width * .085) * k, y0 = (hr.top - sr.top + hr.height * .88) * k, x3 = W * .12, y3 = W * .82;
    const force = (tilt.x - lastTx) * 40; lastTx = tilt.x;
    swayV += (-sway * .08 + force) - swayV * .12; sway += swayV * .5;
    const t = (now || 0) * .001, bob = isSimple() ? 0 : Math.sin(t * 1.1) * 3;
    const x1 = x0 - W * (lift ? .26 : .2) + sway, y1 = y0 + (y3 - y0) * .3 + bob, x2 = x3 - W * .15 + sway * .6, y2 = y0 + (y3 - y0) * .86;
    let d = '';
    const N = 150, loops = lift ? 16 : 12, amp = Math.max(2.5, W * .011);
    for (let i = 0; i <= N; i++) {
      const u = i / N, a = 1 - u;
      let x = a * a * a * x0 + 3 * a * a * u * x1 + 3 * a * u * u * x2 + u * u * u * x3, y = a * a * a * y0 + 3 * a * a * u * y1 + 3 * a * u * u * y2 + u * u * u * y3;
      const dx = -3 * a * a * x0 + 3 * (a * a - 2 * a * u) * x1 + 3 * (2 * a * u - u * u) * x2 + 3 * u * u * x3;
      const dy = -3 * a * a * y0 + 3 * (a * a - 2 * a * u) * y1 + 3 * (2 * a * u - u * u) * y2 + 3 * u * u * y3, L = Math.hypot(dx, dy) || 1;
      const env = Math.sin(Math.PI * clamp(u * 1.12, 0, 1)), o = Math.sin(u * loops * Math.PI * 2) * amp * env;
      x += -dy / L * o; y += dx / L * o;
      d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    cordA.setAttribute('d', d); cordB.setAttribute('d', d);
  }
  loop.add((now) => {
    if (scrollY > innerHeight * 1.3) return;
    if (!isSimple()) {
      const sy = scrollY;
      tilt.x += (tilt.tx - tilt.x) * .08; tilt.y += (tilt.ty - tilt.y) * .08;
      sky1.style.transform = 'translate3d(' + (tilt.x * -8) + 'px,' + (sy * .18 + tilt.y * -6) + 'px,0)';
      sky2.style.transform = 'translate3d(' + (tilt.x * -18) + 'px,' + (sy * .36 + tilt.y * -12) + 'px,0)';
      stage.style.transform = 'translateY(' + (sy * -.06) + 'px) rotateX(' + (tilt.y * -5) + 'deg) rotateY(' + (tilt.x * 7) + 'deg)';
    }
    drawCord(now);
  });
  drawCord(0);

  return {
    hangUp,
    setMode(text) { $('lcdHint').textContent = text || ''; },
    handsetRect: () => hsWrap.getBoundingClientRect(),
    destroy() { dead = true; }
  };
}
