/* 小游戏页的入口脚本（游戏列表）。本页只依赖 core/ 与 data/，不依赖任何游戏的代码。
   每个游戏是 games/play/<id>/ 下一个独立页面，列表只负责展示方块并跳转，互不影响。
   数据：data/games.json。新增游戏的步骤见 games/play/README.txt。

   方块机：每个游戏占一块 4x4 的墨色方块，其余位置由纸面纹理的小方块填补。
   方块数量变了，棋盘自动加高、重新排版，不需要改这里的坐标。 */
import { loadData } from '../core/data.js';
import { h, clear, icon, root, errorBox } from '../core/util.js';
import { renderStub } from '../core/page-stub.js';
import { isSimple, buzz } from '../core/raf.js';

renderStub('games');
const $ = (id) => document.getElementById(id);

const PATH_OK = /^games\/play\/[A-Za-z0-9_-]+\/$/;
const coverSrc = (it) => (!it.cover ? null : /^https?:\/\//i.test(String(it.cover)) ? String(it.cover).trim() : root + 'assets/covers/' + encodeURIComponent(String(it.cover)));

/* 方块里的白色线条插画（来自站主参考稿）。抓坏猫用那只猫，其它游戏用一张同风格的空板方块图。
   都是写死的可信 SVG 常量，只放进空节点，数据不会进到这里。 */
const ART_CAT = '<svg viewBox="0 0 100 70" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><g fill="none" stroke="#fff" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M76 70c5-7 12-9 14-18s-5-12-3-18"/><path d="M22 70c0-19 10-31 28-31s28 12 28 31"/><path d="M29 47l-4-19 13 11M71 47l4-19-13 11"/><path d="M33 61l-14-2M33 64l-14 1M67 61l14-2M67 64l14 1" stroke-width=".6" opacity=".7"/><path d="M47 62l3 2 3-2" stroke-width=".8"/></g><g fill="#f4e9a6"><ellipse class="eye" cx="41" cy="54" rx="3.6" ry="2.8"/><ellipse class="eye" cx="59" cy="54" rx="3.6" ry="2.8"/></g><g fill="#000"><rect x="40.4" y="52" width="1.3" height="4.4" rx=".6"/><rect x="58.4" y="52" width="1.3" height="4.4" rx=".6"/></g></svg>';
const ART_BLOCKS = '<svg viewBox="0 0 100 70" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><g fill="none" stroke="#fff" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M50 18v-5M46 13h8"/><rect x="25" y="25" width="18" height="18" rx="2"/><rect x="47" y="25" width="18" height="18" rx="2" fill="rgba(255,255,255,.12)"/><rect x="36" y="47" width="18" height="18" rx="2"/><path d="M20 66h60" stroke-width=".6" opacity=".5"/></g><path d="M76 15l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#fff" opacity=".9"/></svg>';
const ART_BY_ID = { 'catch-bad-cat': ART_CAT };
const artSvg = (g) => {
  const wrap = document.createElement('span');
  wrap.innerHTML = ART_BY_ID[g.id] || ART_BLOCKS;
  return wrap.firstElementChild;
};

/* 预览窗里的示意画面（参考稿）：夜空、月亮、城市剪影，一只猫走过去。
   没有封面时用它，旁边写明“示意画面”。 */
const PV_SCENE = '<svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><circle cx="252" cy="52" r="20" fill="#f4f1e6"/><circle cx="244" cy="46" r="18" fill="#141127"/><g fill="#fff"><circle cx="40" cy="30" r=".9"/><circle cx="96" cy="60" r=".7"/><circle cx="150" cy="22" r="1"/><circle cx="204" cy="92" r=".6"/><circle cx="292" cy="120" r=".8"/></g><path d="M0 150h60v-18h36v18h50v-30l24-16 24 16v30h40v-22h50v22h36v50H0z" fill="#000"/><rect x="182" y="132" width="8" height="10" fill="#f4e9a6" opacity=".8"/><g class="walker"><g transform="translate(0 126)"><path d="M6 10c4-6 16-7 24-4l4-6 2 7c3 2 4 5 3 8H8c-3 0-4-3-2-5z" fill="#000" stroke="#000"/><path d="M2 10c-4-2-6-8-2-12" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round"/><rect class="leg" x="11" y="14" width="2.4" height="9" fill="#000"/><rect class="leg b" x="27" y="14" width="2.4" height="9" fill="#000"/><circle cx="33" cy="8" r="1.3" fill="#f4e9a6"/></g></g></svg>';

/* ---------- 棋盘尺寸 ---------- */
const COLS = 10;          /* 棋盘宽度，单位是格子 */
const UNIT = 4;           /* 每个游戏方块的边长 */
const BAY_X = [0, 6];     /* 游戏方块的横排位置：一行放两块，中间留两格 */
const MIN_ROWS = 11;      /* 最小高度，只有一两个游戏时也不会太扁 */
const FILLER_SHAPES = [
  { look: 'line', cells: [[0, 0], [1, 0], [2, 0], [2, -1]] },
  { look: 'hatch', cells: [[0, 0], [1, 0], [2, 0], [1, -1]] },
  { look: 'grey', cells: [[0, 0], [1, 0], [1, -1], [2, -1]] },
  { look: 'dot', cells: [[0, 0], [0, -1], [0, -2], [0, -3]] }
];
const DROP_ORDER = [1, 3, 0, 2, 4];

const board = $('gmp-board');
const clip = $('gmp-clip');
const tip = $('gmp-tip');
let pieces = [];          /* { kind, look, cells, game } */
let els = [];
let anims = [];

function bounds(cells) {
  let c0 = Infinity, r0 = Infinity, c1 = -1, r1 = -1;
  cells.forEach(([x, y]) => { c0 = Math.min(c0, x); r0 = Math.min(r0, y); c1 = Math.max(c1, x); r1 = Math.max(r1, y); });
  return { c: c0, r: r0, w: c1 - c0 + 1, h: r1 - r0 + 1 };
}

function free(occ, c, r, shape, rows) {
  for (const [x, y] of shape) {
    const cc = c + x, rr = r + y;
    if (cc < 0 || cc >= COLS || rr < 0 || rr >= rows || occ[rr][cc]) return false;
  }
  return true;
}

/* 从下往上找位置：先铺满棋盘底部，空的地方留给“下一块” */
function place(occ, shape, rows) {
  for (let r = rows - 1; r >= 0; r--) {
    for (let c = 0; c < COLS; c++) {
      if (free(occ, c, r, shape, rows)) return { c, r };
    }
  }
  return null;
}

function buildLayout(games) {
  const n = games.length;
  const rows = Math.max(MIN_ROWS, Math.ceil(n / 2) * UNIT + 3);
  const occ = Array.from({ length: rows }, () => new Array(COLS).fill(false));
  const out = [];
  for (let i = 0; i < n; i++) {
    const c = BAY_X[i % 2];
    const r = rows - UNIT - Math.floor(i / 2) * UNIT;
    const cells = [];
    for (let y = 0; y < UNIT; y++) {
      for (let x = 0; x < UNIT; x++) {
        occ[r + y][c + x] = true;
        cells.push([c + x, r + y]);
      }
    }
    out.push({ kind: 'game', game: games[i], cells });
  }
  /* 空位小块：多轮尝试，放不下就跳过，不会互相压住 */
  const pool = FILLER_SHAPES.map((f) => ({ look: f.look, cells: f.cells, done: false }));
  let placed = true;
  while (placed) {
    placed = false;
    for (const f of pool) {
      if (f.done) continue;
      const at = place(occ, f.cells, rows);
      if (!at) continue;
      const cells = f.cells.map(([x, y]) => [at.c + x, at.r + y]);
      cells.forEach(([x, y]) => { occ[y][x] = true; });
      out.push({ kind: 'slot', look: f.look, cells });
      f.done = true;
      placed = true;
    }
  }
  return { rows, pieces: out };
}

/* ---------- 方块 ---------- */
function pieceEl(p) {
  const b = bounds(p.cells);
  const cls = p.kind === 'game' ? 'gmp-piece is-game' : 'gmp-piece is-slot look-' + p.look;
  const el = h('button', { class: cls, type: 'button' });
  el.style.setProperty('--c', b.c);
  el.style.setProperty('--r', b.r);
  el.style.setProperty('--w', b.w);
  el.style.setProperty('--h', b.h);
  p.cells.forEach(([x, y]) => {
    const t = h('span', { class: 'gmp-tile' });
    t.style.setProperty('--x', x - b.c);
    t.style.setProperty('--y', y - b.r);
    el.appendChild(t);
  });

  if (p.kind === 'game') {
    const g = p.game;
    const face = h('span', { class: 'gmp-face' });
    if (g.src) {
      face.classList.add('has-cover');
      const im = h('img', { alt: '', loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer' });
      im.addEventListener('error', () => { console.warn('[Spark Light] 找不到封面：' + g.src); im.remove(); });
      im.src = g.src;
      face.appendChild(im);
    } else {
      face.appendChild(artSvg(g));
    }
    face.appendChild(h('span', { class: 'gmp-face-title' }, g.title || '未命名'));
    face.appendChild(h('span', { class: 'gmp-face-state' }, g.ready ? '可以玩' : '制作中'));
    face.appendChild(h('span', { class: 'gmp-face-star' }));
    el.appendChild(face);
    el.setAttribute('aria-label', (g.title || '未命名') + '，' + (g.ready ? '可以玩' : '制作中') + '，打开预览');
  } else {
    el.setAttribute('aria-label', '空位');
  }

  bindDrag(el, p);
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(el, p); }
  });
  return el;
}

/* 微微拖动：越拉越紧，松手弹回原位 */
function bindDrag(el, p) {
  let st = null;
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    st = { x: e.clientX, y: e.clientY, moved: false, id: e.pointerId };
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* 部分浏览器不支持 */ }
  });
  el.addEventListener('pointermove', (e) => {
    if (!st || e.pointerId !== st.id) return;
    const dx = e.clientX - st.x, dy = e.clientY - st.y;
    if (!st.moved && Math.hypot(dx, dy) > 6) { st.moved = true; el.classList.add('dragging'); }
    if (!st.moved) return;
    const max = (board.clientWidth / COLS) * 0.9;
    const tx = max * Math.tanh(dx / (max * 2.2));
    const ty = max * Math.tanh(dy / (max * 2.2));
    el.style.transform = 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px)';
  });
  function end(cancel) {
    if (!st) return;
    const moved = st.moved;
    st = null;
    el.classList.remove('dragging');
    el.style.transform = '';
    if (!moved && !cancel) activate(el, p);
  }
  el.addEventListener('pointerup', () => end(false));
  el.addEventListener('pointercancel', () => end(true));
  el.addEventListener('click', (e) => e.preventDefault());
}

function activate(el, p) {
  if (p.kind === 'game') openPreview(p.game, el);
  else showTip(p);
}

let tipT = 0;
function showTip(p) {
  const cell = board.clientWidth / COLS;
  const b = bounds(p.cells);
  const half = tip.offsetWidth / 2 + 4;
  const x = (b.c + b.w / 2) * cell;
  tip.style.left = Math.max(half, Math.min(board.clientWidth - half, x)) + 'px';
  tip.style.top = (b.r * cell) + 'px';
  tip.classList.add('on');
  clearTimeout(tipT);
  tipT = setTimeout(() => tip.classList.remove('on'), 1600);
}

/* 依次落下。动画跑完、或者浏览器把动画帧停掉了（切到后台、截图环境），都要让方块回到原位，
   否则它们会停在棋盘上方被裁掉。所以除了 onfinish，还留一个兜底的计时器。 */
let dropTimer = 0;
function stopAnims() {
  clearTimeout(dropTimer);
  dropTimer = 0;
  anims.forEach((a) => { try { a.cancel(); } catch (e) { /* 忽略 */ } });
  anims = [];
  clip.classList.remove('dropping');
}

function dropAll() {
  stopAnims();
  if (isSimple()) return;
  const cell = board.clientWidth / COLS;
  clip.classList.add('dropping');
  const order = [];
  DROP_ORDER.forEach((i) => { if (i < pieces.length) order.push(i); });
  pieces.forEach((_, i) => { if (order.indexOf(i) < 0) order.push(i); });
  let total = 0;
  order.forEach((idx, k) => {
    const el = els[idx];
    const b = bounds(pieces[idx].cells);
    if (!el) return;
    const dist = (b.r + b.h + 1) * cell;
    const dur = 520 + b.r * 14, delay = k * 200;
    total = Math.max(total, dur + delay);
    try {
      anims.push(el.animate([
        { transform: 'translateY(' + (-dist) + 'px)', easing: 'cubic-bezier(.55,0,1,.5)' },
        { transform: 'translateY(0)', offset: .86, easing: 'ease-out' },
        { transform: 'translateY(-2px)', offset: .93, easing: 'ease-in' },
        { transform: 'translateY(0)' }
      ], { duration: dur, delay: delay, fill: 'backwards' }));
    } catch (e) { /* 不支持 Web Animations 的浏览器直接显示原位 */ }
  });
  if (!anims.length) { clip.classList.remove('dropping'); return; }
  dropTimer = setTimeout(stopAnims, total + 200);
}

/* ---------- 预览窗 ---------- */
const pv = $('gmp-pv');
const scrim = $('gmp-scrim');
const pvTitle = $('gmp-pv-title');
const pvState = $('gmp-pv-state');
const pvDot = $('gmp-pv-dot');
const pvSum = $('gmp-pv-sum');
const pvTags = $('gmp-pv-tags');
const pvScreen = $('gmp-pv-screen');
const pvPlay = $('gmp-pv-play');
const pvPlayText = $('gmp-pv-play-text');
let pvOpen = false, pvLastFocus = null, pvGame = null;

$('gmp-pv-x').appendChild(icon('close', 18));

function openPreview(g, opener) {
  pvGame = g;
  pvLastFocus = opener || document.activeElement;
  pvTitle.textContent = g.title || '未命名';
  pvDot.className = 'gmp-dot' + (g.ready ? ' ready' : '');
  pvState.textContent = g.ready ? '可以玩' : '制作中';

  clear(pvScreen);
  if (g.src) {
    const im = h('img', { alt: '', decoding: 'async', referrerpolicy: 'no-referrer', src: g.src });
    im.addEventListener('error', () => im.remove());
    pvScreen.appendChild(im);
  } else {
    const wrap = document.createElement('span');
    wrap.innerHTML = PV_SCENE;
    pvScreen.appendChild(wrap.firstElementChild);
  }
  pvScreen.appendChild(h('span', { class: 'gmp-pv-cap' }, g.src ? '预览画面' : '示意画面，正式版换成游戏截图'));

  clear(pvSum);
  if (g.summary) { pvSum.className = 'gmp-pv-sum'; pvSum.textContent = g.summary; }
  else { pvSum.className = 'gmp-pv-sum ph'; pvSum.textContent = '玩法介绍待站主提供。'; }

  clear(pvTags);
  if (g.tags.length) {
    g.tags.forEach((t) => pvTags.appendChild(h('span', { class: 'sl-tag' }, t)));
    pvTags.hidden = false;
  } else {
    pvTags.hidden = true;
  }

  pvPlay.disabled = !g.ready;
  pvPlayText.textContent = g.ready ? '开始游戏' : '还在制作中';

  pvOpen = true;
  scrim.classList.add('on');
  pv.classList.add('on');
  document.body.classList.add('sl-lock');
  document.addEventListener('keydown', onPvKey);
  setTimeout(() => { try { $('gmp-pv-close').focus({ preventScroll: true }); } catch (e) { /* 忽略 */ } }, 60);
}

function closePreview() {
  if (!pvOpen) return;
  pvOpen = false;
  pvGame = null;
  pv.classList.remove('on');
  scrim.classList.remove('on');
  document.body.classList.remove('sl-lock');
  document.removeEventListener('keydown', onPvKey);
  if (pvLastFocus && pvLastFocus.focus) { try { pvLastFocus.focus({ preventScroll: true }); } catch (e) { /* 元素已不在页面 */ } }
  pvLastFocus = null;
}

function onPvKey(e) {
  if (e.key === 'Escape') { e.preventDefault(); closePreview(); return; }
  if (e.key !== 'Tab') return;
  const f = Array.from(pv.querySelectorAll('a[href],button:not([disabled])')).filter((x) => !x.hidden);
  if (!f.length) return;
  const a = f[0], z = f[f.length - 1];
  if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
  else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
}

scrim.addEventListener('click', closePreview);
$('gmp-pv-x').addEventListener('click', closePreview);
$('gmp-pv-close').addEventListener('click', closePreview);
pvPlay.addEventListener('click', () => {
  if (!pvGame || !pvGame.ready) return;
  buzz(8);
  location.href = root + pvGame.path;
});
window.addEventListener('pagehide', () => { if (pvOpen) closePreview(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && pvOpen) closePreview(); });

/* ---------- 棋盘尺寸跟随容器 ---------- */
function fitCell() {
  const w = board.clientWidth;
  if (!w) return;
  board.style.setProperty('--cell', (w / COLS) + 'px');
}

/* ---------- 数据整理 ---------- */
function normalizeGame(raw) {
  const g = Object.assign({}, raw);
  g.title = typeof g.title === 'string' ? g.title : '';
  g.summary = typeof g.summary === 'string' && g.summary.trim() ? g.summary : '';
  g.tags = Array.isArray(g.tags) ? g.tags.filter((t) => typeof t === 'string' && t.trim()) : [];
  g.path = typeof g.path === 'string' ? g.path : '';
  g.ready = g.status === 'ready' && PATH_OK.test(g.path);
  g.src = coverSrc(g);
  return g;
}

function renderTally(games) {
  const box = $('gmp-tally');
  clear(box);
  if (!games.length) { $('gmp-top').hidden = true; return; }
  const ready = games.filter((g) => g.ready).length;
  const a = h('span', null, '可以玩');
  a.appendChild(h('b', null, String(ready)));
  const b = h('span', null, '制作中');
  b.appendChild(h('b', null, String(games.length - ready)));
  box.append(a, b);
}

function renderNext() {
  const mini = $('gmp-next-mini');
  clear(mini);
  [1, 0, 1, 0, 0, 0].forEach((isEmpty) => mini.appendChild(h('i', { class: isEmpty ? 'e' : null })));
}

/* ---------- 启动 ---------- */
async function main() {
  const data = await loadData('games');
  const intro = $('gmp-intro');
  if (typeof data.intro === 'string' && data.intro.trim()) intro.textContent = data.intro;
  else {
    /* 没有简介时退回导航里的一句话，避免页头空着 */
    intro.hidden = true;
    $('page-lede').hidden = false;
  }

  const games = (Array.isArray(data.items) ? data.items : [])
    .filter((i) => i && typeof i === 'object' && i.id)
    .map(normalizeGame);

  renderTally(games);
  renderNext();

  const built = buildLayout(games);
  pieces = built.pieces;
  board.style.setProperty('--cols', COLS);
  board.style.setProperty('--rows', built.rows);
  clear(clip);
  els = pieces.map((p) => {
    const el = pieceEl(p);
    clip.appendChild(el);
    return el;
  });
  fitCell();
  dropAll();

  const hint = $('gmp-hint');
  hint.textContent = !games.length
    ? '机台还在组装，新游戏会先掉在这里'
    : games.some((g) => g.ready)
      ? '点方块看介绍；可以玩的会进到游戏页面'
      : '点黑色方块看游戏预览，每块都可以拖一拖';

  /* 尺寸变化时只改格子大小，方块位置由 CSS 跟着换算 */
  if (window.ResizeObserver) {
    let raf = 0;
    new ResizeObserver(() => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; fitCell(); });
    }).observe(board);
  } else {
    let t = 0;
    window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(fitCell, 120); });
  }

  $('gmp-replay').insertBefore(icon('arrow', 15), $('gmp-replay').firstChild);
  $('gmp-replay').addEventListener('click', () => { buzz(6); dropAll(); });
  window.addEventListener('pagehide', stopAnims);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopAnims(); });
}

main().catch((e) => {
  const box = $('gmp-arcade');
  if (box) { clear(box); box.appendChild(errorBox('这一块读取失败：' + (e.file || ''), e.message)); }
});
