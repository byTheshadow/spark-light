/* 来电记录：公开的留言卡片，两种看法。
   磁带：纵向滚动驱动横向走带，一条条放过去；卡堆：用手把最上面那张甩开，下一条露出来。
   所有文字用 textContent 写入。动画只在记录进入视口时计算，图片点开才放大。
   条目形状：{ id, line, date('YYYY-MM-DD'), name|null, text|null, imgs:[{src, ar}], pending?, fresh? } */
import { h, icon } from '../core/util.js';
import { clamp, pad2, lcg, buzz, isSimple } from '../core/raf.js';

const ANON = '<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M3 6.5c0-2 2.3-3.5 5-3.5s5 1.5 5 3.5"/><path d="M3 6.5v1.8c0 .5.4.8.9.7l1.7-.4c.4-.1.6-.5.5-.9L5.6 6M13 6.5v1.8c0 .5-.4.8-.9.7l-1.7-.4c-.4-.1-.6-.5-.5-.9l.5-1.7"/></svg>';
const REEL = '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48" fill="rgba(252,252,253,.78)" stroke="rgba(0,0,0,.16)"/><circle class="spool" cx="50" cy="50" r="40" fill="#2a2530" fill-opacity=".92"/><circle cx="50" cy="50" r="47" fill="none" stroke="rgba(207,200,255,.7)" stroke-width=".8"/><g class="spk"><circle cx="50" cy="50" r="15" fill="#fbfaff" stroke="rgba(0,0,0,.25)"/><path d="M50 44v-9M55.2 53l7.8 4.5M44.8 53l-7.8 4.5" stroke="#2a2530" stroke-width="3" stroke-linecap="round"/><circle cx="50" cy="50" r="3.5" fill="#2a2530"/></g></svg>';
const fmt = (d) => d.replace(/-/g, '.');

function rbtn(dir, label) {
  const b = h('button', { class: 'rb', type: 'button', 'aria-label': label }, icon('arrow', 15));
  if (dir === 'prev') b.firstChild.style.transform = 'scaleX(-1)';
  return b;
}

/* ---------- 图片查看（深色，轻量） ---------- */
let viewer = null;
function openViewer(m, start, lineName, opener) {
  if (!viewer) {
    const img = h('img', { alt: '', draggable: 'false' });
    const cap = h('span'), no = h('span');
    const x = h('button', { class: 'x', type: 'button', 'aria-label': '关闭' }, icon('close', 18));
    const stage = h('div', { class: 'v-stage' }, img);
    const prev = rbtn('prev', '上一张'), next = rbtn('next', '下一张');
    prev.classList.add('v-b'); next.classList.add('v-b');
    const root = h('div', { class: 'viewer', role: 'dialog', 'aria-modal': 'true', 'aria-label': '查看返图' },
      h('div', { class: 'v-top' }, cap, x), stage, h('div', { class: 'v-nav' }, prev, no, next));
    document.body.appendChild(h('div', { class: 'fbp' }, root));
    viewer = { root, img, cap, no, x, stage, prev, next };
  }
  const V = viewer;
  let vi = start, on = true, sx = 0;
  const show = (dir) => {
    const im = m.imgs[vi];
    if (dir && !isSimple()) { V.img.className = dir > 0 ? 'sw-r' : 'sw-l'; setTimeout(() => { V.img.src = im.src; V.img.className = ''; }, 160); } else V.img.src = im.src;
    const who = m.name || '匿名来电';
    V.img.alt = who + ' 的返图'; V.cap.textContent = who + '，' + lineName; V.no.textContent = (vi + 1) + ' / ' + m.imgs.length;
    V.prev.disabled = vi === 0; V.next.disabled = vi === m.imgs.length - 1;
  };
  const step = (d) => { const n = vi + d; if (n >= 0 && n < m.imgs.length) { vi = n; show(d); } };
  const key = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } else if (e.key === 'ArrowLeft') step(-1); else if (e.key === 'ArrowRight') step(1); };
  function close() {
    if (!on) return; on = false;
    V.root.classList.remove('on'); document.body.classList.remove('sl-lock'); document.removeEventListener('keydown', key, true);
    setTimeout(() => { if (!on) V.img.removeAttribute('src'); }, 420);
    if (opener && opener.focus) { try { opener.focus({ preventScroll: true }); } catch (e) { /* 元素已不在页面 */ } }
  }
  V.x.onclick = close; V.prev.onclick = () => step(-1); V.next.onclick = () => step(1);
  V.stage.onclick = (e) => { if (e.target === V.stage) close(); };
  V.stage.onpointerdown = (e) => { sx = e.clientX; };
  V.stage.onpointerup = (e) => { const d = e.clientX - sx; if (Math.abs(d) > 50) step(d < 0 ? 1 : -1); };
  show(0);
  V.root.classList.add('on'); document.body.classList.add('sl-lock'); document.addEventListener('keydown', key, true);
  setTimeout(() => { if (on) V.x.focus({ preventScroll: true }); }, 50);
  addEventListener('pagehide', () => { V.img.removeAttribute('src'); }, { once: true });
}

export function createLog(o) {
  /* o: { views, ctrl, lines:[{id,name,tint}], getPending(), items, onGoCall(), loop } */
  const lineOf = (id) => o.lines.find((l) => l.id === id) || { id, name: id, tint: '200,200,210' };
  const S = { filter: 'all', order: 'desc', view: 'tape', idx: 0, list: [], items: o.items.slice() };
  let T = null, D = null, snapT = 0;
  const K = 1;
  const views = o.views, ctrl = o.ctrl;

  /* ---------- 留言卡 ---------- */
  function card(m, idx, mode) {
    const L = lineOf(m.line);
    const a = h('article', { class: 'msg' + (m.pending ? ' pending' : '') + (m.fresh ? ' fresh' : '') });
    a.style.setProperty('--tint', L.tint);
    if (m.pending) a.appendChild(h('span', { class: 'badge' }, '待审核，仅你可见'));
    a.appendChild(h('header', { class: 'm-top' }, h('span', { class: 'm-line' }, h('i'), h('span', null, L.name)), h('time', { datetime: m.date }, fmt(m.date))));
    const wv = h('div', { class: 'wave', 'aria-hidden': 'true' });
    const r = lcg(String(m.id).length * 97 + (m.date || '').charCodeAt(9) * 13 + (m.text || '').length);
    for (let k = 0; k < 36; k++) {
      const b = h('b'); b.style.setProperty('--h', (.18 + Math.pow(Math.abs(Math.sin(k * .45 + r() * 2)), 1.6) * .82 * (.4 + r() * .6)).toFixed(2)); b.style.setProperty('--k', k); wv.appendChild(b);
    }
    wv.addEventListener('click', () => { wv.classList.remove('play'); void wv.offsetWidth; wv.classList.add('play'); });
    a.appendChild(wv);
    if (m.text) {
      a.appendChild(h('p', { class: 'm-body' }, m.text));
      if (mode === 'tape' && m.text.length > 48) {
        a.classList.add('clip');
        const mb = h('button', { class: 'm-more', type: 'button' }, '在卡堆里读全文');
        mb.addEventListener('click', (e) => { e.stopPropagation(); setView('deck', idx); });
        a.appendChild(mb);
      }
    }
    if (m.imgs && m.imgs.length) {
      const n = Math.min(3, m.imgs.length), g = h('div', { class: 'm-imgs' + (n === 1 ? ' one' : '') });
      g.style.setProperty('--n', n);
      m.imgs.slice(0, 3).forEach((im, i) => {
        const bt = h('button', { class: 'm-img', type: 'button', 'aria-label': '查看返图 第 ' + (i + 1) + ' 张' });
        const setAr = () => { if (n === 1) bt.style.setProperty('--ar', Math.max(.75, Math.min(1.6, im.ar || 1.3))); };
        setAr();
        const img = h('img', { alt: '', decoding: 'async', draggable: 'false' });
        img.addEventListener('load', () => { if (img.naturalWidth && img.naturalHeight) { im.ar = img.naturalWidth / img.naturalHeight; setAr(); } });
        img.addEventListener('error', () => { console.warn('[Spark Light] 找不到图片：' + im.src); img.remove(); bt.classList.add('miss'); });
        img.src = im.src;
        bt.appendChild(img);
        if (i === 2 && m.imgs.length > 3) bt.appendChild(h('span', { class: 'more' }, '+' + (m.imgs.length - 3)));
        bt.addEventListener('click', () => openViewer(m, i, L.name, bt));
        g.appendChild(bt);
      });
      a.appendChild(g);
    }
    const av = h('span', { class: 'av' + (m.name ? '' : ' anon') });
    if (m.name) av.textContent = Array.from(m.name)[0]; else av.innerHTML = ANON;
    a.appendChild(h('footer', { class: 'm-who' }, av, h('span', null, m.name || '匿名来电'), h('span', { class: 'sub' }, m.imgs && m.imgs.length ? m.imgs.length + ' 张图' : '仅文字')));
    return a;
  }

  /* ---------- 控制条 ---------- */
  function keyBtn(id, name, tint, n) {
    const b = h('button', { class: 'key', type: 'button', 'data-id': id, 'aria-pressed': String(id === S.filter) });
    if (tint) { b.style.setProperty('--tint', 'rgb(' + tint + ')'); b.appendChild(h('i')); }
    b.appendChild(h('span', null, name)); b.appendChild(h('small', null, String(n)));
    b.addEventListener('click', () => { S.filter = id; buildCtrl(); renderView(0, 'past'); });
    return b;
  }
  function seg(label, opts, cur, cb) {
    const s = h('div', { class: 'seg', role: 'group', 'aria-label': label });
    s.style.setProperty('--n', opts.length); s.style.setProperty('--on', Math.max(0, opts.findIndex((x) => x[0] === cur)));
    opts.forEach((x, i) => {
      const b = h('button', { type: 'button', 'aria-pressed': String(x[0] === cur) }, x[1]);
      b.addEventListener('click', () => { s.style.setProperty('--on', i); s.querySelectorAll('button').forEach((y) => y.setAttribute('aria-pressed', String(y === b))); cb(x[0]); });
      s.appendChild(b);
    });
    return s;
  }
  let countEl = null, vsel = null;
  function buildCtrl() {
    const all = S.items;
    ctrl.textContent = '';
    const keys = h('div', { class: 'keys', role: 'group', 'aria-label': '按项目筛选' });
    keys.appendChild(keyBtn('all', '全部', null, all.length));
    o.lines.forEach((L) => keys.appendChild(keyBtn(L.id, L.name, L.tint, all.filter((m) => m.line === L.id).length)));
    countEl = h('span', { class: 'count', 'aria-live': 'polite' });
    vsel = seg('查看方式', [['tape', '磁带'], ['deck', '卡堆']], S.view, (v) => { S.view = v; renderView(S.idx, 'always'); });
    ctrl.append(keys, seg('排序', [['desc', '最新在前'], ['asc', '最早在前']], S.order, (v) => { S.order = v; renderView(0, 'past'); }), vsel, countEl);
    ctrl.hidden = false;
  }
  function setView(v, idx) {
    S.view = v;
    if (vsel) { vsel.style.setProperty('--on', v === 'deck' ? 1 : 0); vsel.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(i === (v === 'deck' ? 1 : 0)))); }
    renderView(idx, 'always');
  }

  function ctrlBottom() { const t = parseFloat(getComputedStyle(ctrl).top); return (isNaN(t) ? 66 : t) + ctrl.offsetHeight + 6; }
  function barH() { const b = document.querySelector('.sl-orderbar'); return b ? b.offsetHeight : 0; }
  function getList() {
    const l = S.items.filter((m) => S.filter === 'all' || m.line === S.filter);
    l.sort((a, b) => { if (!!a.pending !== !!b.pending) return a.pending ? -1 : 1; return S.order === 'desc' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date); });
    return l;
  }
  function destroyViews() { T = null; D = null; clearTimeout(snapT); }
  function renderView(idx, mode) {
    S.list = getList();
    if (countEl) countEl.textContent = '共 ' + S.list.length + ' 条';
    views.textContent = ''; destroyViews();
    if (!S.list.length) {
      const e = h('div', { class: 'empty' }, h('p', null, S.items.length ? '这条线路还没有来电。' : '还没有公开的来电。拿到口令的客人，拨号留言后会出现在这里。'));
      const b = h('a', { class: 'btn', href: '#hero' }, h('span', null, '拨号留言'));
      b.addEventListener('click', (ev) => { ev.preventDefault(); scrollTo({ top: 0, behavior: isSimple() ? 'auto' : 'smooth' }); });
      e.appendChild(b); views.appendChild(e);
      if (!S.items.length) ctrl.hidden = true;
      return;
    }
    ctrl.hidden = false;
    idx = clamp(idx || 0, 0, S.list.length - 1); S.idx = idx;
    if (S.view === 'tape') buildTape(); else buildDeck(idx);
    if (mode) toView(idx, mode);
  }
  function toView(i, mode) {
    const y = T ? tapeY(i) : views.getBoundingClientRect().top + scrollY - ctrlBottom() + 10;
    if (mode === 'past' && scrollY < y - 2) return;
    scrollTo({ top: Math.max(0, y), behavior: isSimple() ? 'auto' : 'smooth' });
  }

  /* ---------- 磁带 ---------- */
  function buildTape() {
    const list = S.list;
    const tp = h('div', { class: 'tape' }), pin = h('div', { class: 'tp-pin', tabindex: '0', role: 'group', 'aria-roledescription': '磁带', 'aria-label': '来电磁带。上下滚动或左右拖动来走带，方向键逐条切换' });
    const bigT = h('span'), big = h('div', { class: 'tp-big', 'aria-hidden': 'true' }, bigT);
    const rib = h('div', { class: 'tp-rib', 'aria-hidden': 'true' }), head = h('div', { class: 'tp-head', 'aria-hidden': 'true' });
    const nowT = h('span'), now = h('div', { class: 'tp-now', 'aria-hidden': 'true' }, h('i'), nowT);
    const track = h('div', { class: 'tp-track' });
    const rl = h('div', { class: 'reel l', 'aria-hidden': 'true' }), rr = h('div', { class: 'reel r', 'aria-hidden': 'true' });
    rl.innerHTML = REEL; rr.innerHTML = REEL; /* 写死的可信片段 */
    const cards = list.map((m, i) => {
      const w = h('div', { class: 'tp-c' }, card(m, i, 'tape'));
      w.addEventListener('click', (e) => { if (!T) return; if (T.dragged || i !== T.act) { e.preventDefault(); e.stopPropagation(); if (!T.dragged) tapeGo(i); } }, true);
      track.appendChild(w); return w;
    });
    const pv = rbtn('prev', '上一条'), nx = rbtn('next', '下一条');
    const fill = h('div', { class: 'tp-fill' }), prog = h('div', { class: 'tp-prog', 'aria-hidden': 'true' }, fill);
    const ticks = list.map((m, i) => { const t = h('span', { class: 'tp-tick' }); t.style.left = (list.length > 1 ? i / (list.length - 1) * 100 : 50) + '%'; prog.appendChild(t); return t; });
    const bar = h('div', { class: 'tp-bar' }, pv, prog, nx);
    [big, rib, rl, rr, head, track, now, bar].forEach((x) => pin.appendChild(x));
    tp.appendChild(pin); views.appendChild(tp);
    T = { el: tp, pin, big: bigT, bigW: big, rib, cards, ticks, fill, nowT, pv, nx, n: list.length, cur: -1, tgt: 0, act: -1,
      sl: rl.querySelector('.spool'), sr: rr.querySelector('.spool'), kl: rl.querySelector('.spk'), kr: rr.querySelector('.spk'), pd: null, dragged: false, pinTop: 130, L: 0, gap: 300, mob: false };
    pv.addEventListener('click', () => tapeGo(T.act - 1)); nx.addEventListener('click', () => tapeGo(T.act + 1));
    pin.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') { e.preventDefault(); tapeGo(T.act + 1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); tapeGo(T.act - 1); } });
    let sd = false;
    const scrub = (e) => { const r = prog.getBoundingClientRect(); tapeGo(Math.round(clamp((e.clientX - r.left) / r.width, 0, 1) * (T.n - 1)), true); };
    prog.addEventListener('pointerdown', (e) => { sd = true; try { prog.setPointerCapture(e.pointerId); } catch (_) { /* 忽略 */ } scrub(e); });
    prog.addEventListener('pointermove', (e) => { if (sd) scrub(e); });
    prog.addEventListener('pointerup', () => { sd = false; }); prog.addEventListener('pointercancel', () => { sd = false; });
    /* 横向拖动也能走带：把横向位移换成页面滚动 */
    pin.addEventListener('pointerdown', (e) => { if (e.button > 0 || e.target.closest('.tp-bar')) return; T.pd = { x: e.clientX, y: e.clientY, lx: e.clientX, t: performance.now(), v: 0, on: false, id: e.pointerId }; });
    pin.addEventListener('pointermove', (e) => {
      const p = T && T.pd; if (!p || e.pointerId !== p.id) return;
      const ax = Math.abs(e.clientX - p.x);
      if (!p.on) { if (ax > 8 && ax > Math.abs(e.clientY - p.y)) { p.on = true; T.dragged = true; try { pin.setPointerCapture(e.pointerId); } catch (_) { /* 忽略 */ } pin.classList.add('drag'); } else return; }
      const dx = e.clientX - p.lx, nw = performance.now();
      p.v = p.v * .5 + dx / Math.max(1, nw - p.t) * .5; p.t = nw; p.lx = e.clientX;
      if (T.L > 0) scrollBy(0, -dx * K * 1.1);
    });
    const up = () => {
      const p = T && T.pd; if (!p) return; T.pd = null; pin.classList.remove('drag');
      if (p.on) { tapeGo(Math.round(T.cur * (T.n - 1) - clamp(p.v * 2.5, -2, 2))); setTimeout(() => { if (T) T.dragged = false; }, 60); }
    };
    pin.addEventListener('pointerup', up); pin.addEventListener('pointercancel', up);
    tapeLayout();
  }
  function tapeLayout() {
    if (!T) return;
    T.pinTop = ctrlBottom();
    const pinH = Math.max(380, innerHeight - T.pinTop - barH());
    T.pin.style.top = T.pinTop + 'px'; T.pin.style.height = pinH + 'px';
    T.mob = innerWidth < 640;
    const cw = T.mob ? Math.min(innerWidth * .8, 340) : clamp(innerWidth * .26, 300, 360);
    T.gap = T.mob ? cw + 14 : cw + 64;
    T.el.style.setProperty('--cw', cw.toFixed(0) + 'px');
    let mh = 0; T.cards.forEach((c) => { mh = Math.max(mh, c.offsetHeight); });
    T.el.style.setProperty('--fit', Math.min(1, (pinH - 150) / Math.max(1, mh)).toFixed(3));
    T.L = (T.n - 1) * T.gap; T.el.style.height = (pinH + T.L * K) + 'px';
  }
  function tapeY(i) { i = clamp(i, 0, T.n - 1); return T.el.getBoundingClientRect().top + scrollY - T.pinTop + (T.n > 1 ? i / (T.n - 1) : 0) * T.L * K; }
  function tapeGo(i, instant) { if (!T) return; scrollTo({ top: tapeY(i), behavior: (instant || isSimple()) ? 'auto' : 'smooth' }); }
  function tapeAct(a) {
    T.act = a; S.idx = a; const m = S.list[a];
    T.cards.forEach((c, i) => { c.classList.toggle('on', i === a); c.setAttribute('aria-hidden', i === a ? 'false' : 'true'); if ('inert' in c) c.inert = i !== a; });
    const w = T.cards[a].querySelector('.wave'); if (w && !isSimple()) { w.classList.remove('play'); void w.offsetWidth; w.classList.add('play'); }
    T.ticks.forEach((t, i) => t.classList.toggle('on', i === a));
    T.big.textContent = fmt(m.date).slice(5); T.big.classList.remove('in'); void T.big.offsetWidth; T.big.classList.add('in');
    T.nowT.textContent = pad2(a + 1) + ' / ' + pad2(T.n) + '　' + lineOf(m.line).name;
    T.pv.disabled = a <= 0; T.nx.disabled = a >= T.n - 1;
  }
  function tapeTick() {
    const r = T.el.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
    const span = T.L * K; T.tgt = span > 0 ? clamp((T.pinTop - r.top) / span, 0, 1) : 0;
    if (T.cur < 0 || isSimple()) T.cur = T.tgt; else { T.cur += (T.tgt - T.cur) * .15; if (Math.abs(T.tgt - T.cur) < .00005) T.cur = T.tgt; }
    const x = T.cur * T.L, act = T.n > 1 ? Math.round(T.cur * (T.n - 1)) : 0;
    for (let i = 0; i < T.n; i++) {
      const c = T.cards[i], d = (i * T.gap - x) / T.gap, ad = Math.abs(d);
      if (ad > 4.5) { c.style.visibility = 'hidden'; continue; }
      c.style.visibility = '';
      const s = 1 - Math.min(ad, 2.5) * .08, op = 1 - Math.min(ad, 3) * .24, y = Math.sin(d * 1.15) * (T.mob ? 8 : 30);
      c.style.transform = 'translate3d(' + (i * T.gap - x).toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotate(' + (d * 1.3).toFixed(2) + 'deg) scale(' + s.toFixed(3) + ')';
      c.style.opacity = op.toFixed(3); c.style.zIndex = String(100 - Math.round(ad * 10));
    }
    T.rib.style.backgroundPosition = (-x).toFixed(1) + 'px 0';
    T.kl.setAttribute('transform', 'rotate(' + (x * .6).toFixed(1) + ' 50 50)'); T.kr.setAttribute('transform', 'rotate(' + (x * .6).toFixed(1) + ' 50 50)');
    T.sl.setAttribute('r', (17 + 26 * (1 - T.cur)).toFixed(1)); T.sr.setAttribute('r', (17 + 26 * T.cur).toFixed(1));
    T.fill.style.transform = 'scaleX(' + T.cur.toFixed(4) + ')';
    T.bigW.style.transform = 'translate3d(' + ((.5 - T.cur) * 140).toFixed(1) + 'px,0,0)';
    if (act !== T.act) tapeAct(act);
  }
  addEventListener('scroll', () => {
    clearTimeout(snapT);
    if (!T || T.pd) return;
    snapT = setTimeout(() => {
      if (!T || T.pd || T.n < 2) return;
      const r = T.el.getBoundingClientRect(), span = T.L * K, f = (T.pinTop - r.top) / span;
      if (f <= .02 || f >= .98) return;
      const i = Math.round(f * (T.n - 1));
      if (Math.abs(tapeY(i) - scrollY) > 3) tapeGo(i);
    }, 170);
  }, { passive: true });

  /* ---------- 卡堆 ---------- */
  function buildDeck(idx) {
    const list = S.list, n = list.length;
    const dk = h('div', { class: 'deck' }), stk = h('div', { class: 'dk-stack', tabindex: '0', role: 'group', 'aria-roledescription': '卡堆', 'aria-label': '来电卡堆，左右方向键翻看' });
    const pv = rbtn('prev', '上一条'), nx = rbtn('next', '下一条'), cn = h('span', { class: 'dk-n' });
    const cards = list.map((m, i) => { const c = h('div', { class: 'dk-c' }, card(m, i, 'deck')); c.style.setProperty('--tilt', ((lcg(i * 31 + 7)() - .5) * 7).toFixed(2) + 'deg'); stk.appendChild(c); return c; });
    dk.append(stk, h('div', { class: 'dk-ctl' }, pv, cn, nx), h('p', { class: 'dk-hint' }, '把最上面那张甩到一边，下一条就露出来'));
    views.appendChild(dk);
    const ord = []; for (let k = 0; k < n; k++) ord.push((idx + k) % n);
    D = { el: dk, st: stk, cards, order: ord, n, cn, pd: null, dragged: false, busy: false };
    pv.disabled = nx.disabled = n < 2;
    pv.addEventListener('click', deckPrev); nx.addEventListener('click', () => deckNext(-1));
    stk.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') { e.preventDefault(); deckNext(-1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); deckPrev(); } });
    stk.addEventListener('click', (e) => { if (D && D.dragged) { e.preventDefault(); e.stopPropagation(); } }, true);
    stk.addEventListener('pointerdown', (e) => {
      if (!D || D.busy || e.button > 0 || D.n < 2) return;
      const c = D.cards[D.order[0]]; if (!c.contains(e.target)) return;
      D.pd = { x: e.clientX, y: e.clientY, lx: e.clientX, t: performance.now(), vx: 0, on: false, id: e.pointerId, c };
    });
    stk.addEventListener('pointermove', (e) => {
      const p = D && D.pd; if (!p || p.id !== e.pointerId) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      if (!p.on) { if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) { p.on = true; D.dragged = true; try { stk.setPointerCapture(e.pointerId); } catch (_) { /* 忽略 */ } p.c.classList.add('drag'); } else return; }
      const nw = performance.now(); p.vx = p.vx * .4 + (e.clientX - p.lx) / Math.max(1, nw - p.t) * .6; p.t = nw; p.lx = e.clientX;
      p.c.style.transform = 'translate3d(' + dx.toFixed(1) + 'px,' + (dy * .25).toFixed(1) + 'px,0) rotate(' + (dx * .06).toFixed(2) + 'deg)';
      const n2 = D.cards[D.order[1]];
      if (n2) { const q = Math.min(1, Math.abs(dx) / 220); n2.classList.add('drag'); n2.style.transform = 'translate3d(0,' + (18 * (1 - q)).toFixed(1) + 'px,0) scale(' + (.95 + .05 * q).toFixed(3) + ') rotate(calc(var(--tilt) * ' + (1 - q).toFixed(2) + '))'; }
    });
    const up = (e) => {
      const p = D && D.pd; if (!p) return; D.pd = null; D.cards.forEach((c) => c.classList.remove('drag'));
      if (!p.on) return;
      const dx = e.clientX - p.x;
      if (Math.abs(dx) > D.st.offsetWidth * .28 || Math.abs(p.vx) > .55) deckNext(dx > 0 ? 1 : -1); else deckPos();
      setTimeout(() => { if (D) D.dragged = false; }, 60);
    };
    stk.addEventListener('pointerup', up); stk.addEventListener('pointercancel', up);
    deckLayout(); deckPos();
  }
  function deckLayout() { if (!D) return; const cw = Math.min(innerWidth - 32, 420); D.st.style.width = cw + 'px'; let mh = 0; D.cards.forEach((c) => { mh = Math.max(mh, c.offsetHeight); }); D.st.style.height = (mh + 64) + 'px'; }
  function deckPos(skip) {
    D.order.forEach((ci, k) => {
      const c = D.cards[ci]; if (c === skip) return;
      const kk = Math.min(k, 3);
      c.style.zIndex = String(100 - k); c.style.opacity = k > 3 ? '0' : '1';
      c.style.transform = k ? 'translate3d(0,' + (kk * 18) + 'px,0) scale(' + (1 - kk * .05).toFixed(3) + ') rotate(var(--tilt))' : 'translate3d(0,0,0)';
      c.classList.toggle('top', k === 0); c.setAttribute('aria-hidden', k ? 'true' : 'false'); if ('inert' in c) c.inert = k > 0;
    });
    const top = D.order[0]; S.idx = top; D.cn.textContent = pad2(top + 1) + ' / ' + pad2(D.n);
    const w = D.cards[top].querySelector('.wave'); if (w && !isSimple()) { w.classList.remove('play'); void w.offsetWidth; w.classList.add('play'); }
  }
  function deckNext(dir) {
    if (!D || D.busy || D.n < 2) return; D.busy = true;
    const c = D.cards[D.order[0]]; c.classList.remove('drag');
    c.style.transform = 'translate3d(' + (dir * (innerWidth * .6 + 320)).toFixed(0) + 'px,40px,0) rotate(' + (dir * 22) + 'deg)'; c.style.opacity = '0';
    D.order.push(D.order.shift()); deckPos(c); buzz(6);
    setTimeout(() => { if (!D) return; c.classList.add('snap'); deckPos(); void c.offsetWidth; c.classList.remove('snap'); D.busy = false; }, isSimple() ? 0 : 380);
  }
  function deckPrev() {
    if (!D || D.busy || D.n < 2) return; D.busy = true;
    const ci = D.order.pop(); D.order.unshift(ci); const c = D.cards[ci];
    c.classList.add('snap'); c.style.zIndex = '101'; c.style.opacity = '0'; c.style.transform = 'translate3d(' + (-(innerWidth * .6 + 320)).toFixed(0) + 'px,40px,0) rotate(-22deg)'; void c.offsetWidth; c.classList.remove('snap');
    deckPos(); buzz(6); setTimeout(() => { if (D) D.busy = false; }, 320);
  }

  o.loop.add(() => { if (T) tapeTick(); });
  let rz = 0;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { tapeLayout(); deckLayout(); }, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { tapeLayout(); deckLayout(); });

  return {
    start() { buildCtrl(); renderView(0); },
    /* 预览模式：把刚“寄出”的留言放到最前面，只在本页里存在 */
    addPending(m) {
      S.items.unshift(m); S.filter = 'all'; buildCtrl(); renderView(0, 'always');
      setTimeout(() => { m.fresh = false; }, 2600);
    },
    releasePending() { S.items.forEach((m) => { if (m.pending) (m.imgs || []).forEach((i) => { if (String(i.src).indexOf('blob:') === 0) URL.revokeObjectURL(i.src); }); }); }
  };
}
