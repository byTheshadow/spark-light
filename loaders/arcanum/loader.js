/* loaders/arcanum/loader.js
   加载页「星盘与第十七张」。
   出口：mount(host, ctx) / frame(now, dt) / finish() / unmount()
   合同见 loaders/_template/README.txt。
   参考稿：视觉原型/火花照见微光，影中读取答案.html（站主 2026-11-24 提供），
   这里把它从“循环演示”改成“一次开屏”：进度由 core/loader.js 给真实值，
   节奏压到 1.5 秒左右；声音与统计脚本没有带进来。 */

const NS = 'http://www.w3.org/2000/svg';
const TAU = Math.PI * 2;

/* 文案只在这里写一份。站名之类不在这里，真要改就改这里 */
const COPY = {
  title: ['火花照见微光，', '影中读取答案'],
  sub: ['The spark unveils the glimmer;', 'in shadow, the answer is read.'],
  steps: ['I', 'II', 'III', 'IV', 'V', 'VI'],
  msgs: [
    ['Aligning the constellations', '校准星轨'],
    ['Shuffling the Major Arcana', '洗开大阿卡纳'],
    ['Tracing the sigil in starlight', '以星光描摹法印'],
    ['Listening to the void', '倾听虚空的回响'],
    ['Reading the answer in shadow', '于影中读取答案'],
    ['The spark awakens', '火花苏醒']
  ],
  final: ['The answer is revealed', '答案已现　第十七张　星辰'],
  hud: ['ARCANUM XVII', 'RA 05H 35M 17S   DEC −05° 23′', 'Lux in tenebris lucet']
};

const MARKUP = `
<div class="slx-ar-nebula" aria-hidden="true">
  <div class="slx-ar-aurora"></div>
  <div class="slx-ar-blob b1"></div><div class="slx-ar-blob b2"></div><div class="slx-ar-blob b3"></div>
  <div class="slx-ar-blob b4"></div><div class="slx-ar-blob b5"></div>
</div>
<canvas class="slx-ar-sky" aria-hidden="true"></canvas>
<div class="slx-ar-vignette" aria-hidden="true"></div>
<div class="slx-ar-flash" aria-hidden="true"></div>
<div class="slx-ar-grain" aria-hidden="true"></div>
<svg class="slx-ar-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>
  <linearGradient id="ar-gBack" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#161616"/><stop offset=".5" stop-color="#060606"/><stop offset="1" stop-color="#121212"/>
  </linearGradient>
  <linearGradient id="ar-gGold" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100" y2="168">
    <stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#d4d4d4"/><stop offset="1" stop-color="#6c6c6c"/>
  </linearGradient>
  <linearGradient id="ar-gFront" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#0a0a0a"/><stop offset=".55" stop-color="#1d1d1d"/><stop offset="1" stop-color="#050505"/>
  </linearGradient>
  <radialGradient id="ar-gHalo" cx="50" cy="68" r="40" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#ffffff" stop-opacity=".4"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
  </radialGradient>
  <symbol id="ar-cardback" viewBox="0 0 100 168">
    <rect x="1" y="1" width="98" height="166" rx="7" fill="url(#ar-gBack)" stroke="url(#ar-gGold)" stroke-width="1.6"/>
    <rect x="6" y="6" width="88" height="156" rx="4" fill="none" stroke="url(#ar-gGold)" stroke-width=".6" opacity=".75"/>
    <rect x="10" y="10" width="80" height="148" rx="2" fill="none" stroke="url(#ar-gGold)" stroke-width=".4" stroke-dasharray="1.5 2" opacity=".6"/>
    <g id="ar-cb" stroke="url(#ar-gGold)" stroke-width=".8" fill="none">
      <circle cx="50" cy="84" r="22"/>
      <circle cx="50" cy="84" r="42" stroke-width=".4" opacity=".55"/>
      <path d="M29 84 Q50 64 71 84 Q50 104 29 84Z"/>
      <circle cx="50" cy="84" r="6.5" fill="url(#ar-gGold)"/>
      <circle cx="50" cy="84" r="2.4" fill="#050505" stroke="none"/>
      <path d="M50 24 a10 10 0 1 0 8 16 a8 8 0 1 1 -8 -16z" fill="url(#ar-gGold)" stroke="none"/>
    </g>
  </symbol>
</defs></svg>
<div class="slx-ar-hud tl" aria-hidden="true"></div>
<div class="slx-ar-hud bl" aria-hidden="true"></div>
<div class="slx-ar-hud br" aria-hidden="true"></div>
<div class="slx-ar-scene" aria-hidden="true">
  <div class="slx-ar-tilt">
    <div class="slx-ar-rays"></div>
    <svg class="slx-ar-layer la" viewBox="-200 -200 400 400">
      <defs><path id="ar-ring" d="M0,-181 a181,181 0 1,1 0,362 a181,181 0 1,1 0,-362"/></defs>
      <g fill="none" stroke="currentColor">
        <circle r="196" stroke-width=".6" class="d" pathLength="1"/>
        <circle r="190" stroke-width="1.3" class="d" pathLength="1" style="--dd:.1s"/>
        <circle r="173" stroke-width=".9" class="d" pathLength="1" style="--dd:.2s"/>
      </g>
      <g id="ar-ticks" stroke="currentColor" class="fadein" style="--dd:.45s"></g>
      <text class="fadein" style="--dd:.65s" font-size="9.5" fill="currentColor" letter-spacing="1">
        <textPath href="#ar-ring" textLength="1130" lengthAdjust="spacing">SCINTILLA REVELAT LUCEM · IN UMBRA LEGITUR RESPONSUM · THE SPARK ILLUMINATES THE GLIMMER · IN SHADOW THE ANSWER IS READ ·</textPath>
      </text>
    </svg>
    <svg class="slx-ar-layer lb" viewBox="-200 -200 400 400">
      <g fill="none" stroke="currentColor">
        <circle r="150" stroke-width="1" class="d" pathLength="1" style="--dd:.25s"/>
        <circle r="142" stroke-width=".5" stroke-dasharray="2 5" opacity=".7"/>
      </g>
      <g id="ar-glyphs" class="fadein" style="--dd:.7s"></g>
    </svg>
    <svg class="slx-ar-layer lc" viewBox="-200 -200 400 400">
      <defs><path id="ar-zh-ring" d="M0,-128 a128,128 0 1,1 0,256 a128,128 0 1,1 0,-256"/></defs>
      <g id="ar-hex" fill="none" stroke="currentColor" stroke-width="1"></g>
      <circle r="120" fill="none" stroke="currentColor" stroke-width=".7" class="d" pathLength="1" style="--dd:.45s"/>
      <text class="fadein" style="--dd:.85s" font-size="8.5" fill="currentColor">
        <textPath href="#ar-zh-ring" textLength="795" lengthAdjust="spacing">火花照见微光　影中读取答案　火花照见微光　影中读取答案　</textPath>
      </text>
    </svg>
    <svg class="slx-ar-layer ld" viewBox="-200 -200 400 400">
      <g id="ar-hept" fill="none" stroke="currentColor" stroke-width=".9"></g>
      <circle r="72" fill="none" stroke="currentColor" stroke-width="1" class="d" pathLength="1" style="--dd:.6s"/>
    </svg>
    <svg class="slx-ar-layer le" viewBox="-200 -200 400 400">
      <g fill="none" stroke="currentColor">
        <circle r="50" stroke-width=".8" stroke-dasharray="1 4"/>
        <circle r="38" stroke-width=".8" class="d" pathLength="1" style="--dd:.7s"/>
      </g>
      <g id="ar-dots" fill="currentColor" class="fadein" style="--dd:.9s"></g>
    </svg>
    <div class="slx-ar-core"></div>
    <div class="slx-ar-ripples"><span class="slx-ar-ripple"></span><span class="slx-ar-ripple"></span><span class="slx-ar-ripple"></span></div>
    <div class="slx-ar-orbit"></div>
    <div class="slx-ar-rw">
      <div class="slx-ar-reveal">
        <div class="slx-ar-rf"><svg viewBox="0 0 100 168"><use href="#ar-cardback"/></svg></div>
        <div class="slx-ar-rf front">
          <svg viewBox="0 0 100 168">
            <rect x="1" y="1" width="98" height="166" rx="7" fill="url(#ar-gFront)" stroke="url(#ar-gGold)" stroke-width="1.6"/>
            <rect x="6" y="6" width="88" height="156" rx="4" fill="none" stroke="url(#ar-gGold)" stroke-width=".6" opacity=".8"/>
            <circle cx="50" cy="68" r="40" fill="url(#ar-gHalo)"/>
            <text x="50" y="21" text-anchor="middle" font-size="9" fill="#ffffff" letter-spacing="2">XVII</text>
            <g id="ar-star-art"></g>
            <g fill="none" stroke="#cfcfcf" stroke-width=".7" opacity=".85">
              <path d="M12 122 q6 -4 12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0"/>
              <path d="M12 129 q6 -4 12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0" opacity=".7"/>
              <path d="M12 136 q6 -4 12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0" opacity=".45"/>
            </g>
            <text x="50" y="151" text-anchor="middle" font-size="8" fill="#ffffff" letter-spacing="1.6">THE STAR</text>
            <text x="50" y="160" text-anchor="middle" font-size="5" fill="#a8a8a8" letter-spacing="2">星辰　希望之光</text>
          </svg>
        </div>
      </div>
    </div>
  </div>
</div>
<section class="slx-ar-copy">
  <h1 class="slx-ar-title"></h1>
  <div class="slx-ar-orn" aria-hidden="true"><i class="ol"></i><b></b><i class="or"></i></div>
  <p class="slx-ar-en"></p>
  <div class="slx-ar-status" aria-hidden="true"><span class="sen"></span><span class="zh"></span></div>
  <div class="slx-ar-meter" aria-hidden="true">
    <div class="step"><span class="sn">I</span> / VI</div>
    <div class="bar"><i></i></div>
    <div class="pct"></div>
  </div>
  <p class="slx-ar-skip">点一下跳过</p>
</section>
`;
/* ---------------- 状态 ---------------- */
let host = null, root = null, api = null;
let timers = [], offs = [];
let canvas = null, cx = null;
let W = 0, H = 0, DPR = 1, stars = [], center = { x: 0, y: 0, r: 200 };
let sceneEl = null, tiltEl = null;
let p = 0, lastPct = -1, msgIdx = -1, frameNo = 0;
let nodes = [];
let hBox = null, hCol = null, tCol = null, uCol = null;
let enEl = null, zhEl = null, stepN = null, stepIdx = 0;
let revealed = false;

const NODE_AT = [0, .17, .36, .56, .76, .93];
const LH = 1.15;

/* ---------------- 小工具 ---------------- */
function el(tag, attrs, parent) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}
function later(fn, ms) { const id = setTimeout(fn, ms); timers.push(id); return id; }
const rad = function (d) { return d * Math.PI / 180; };
function pt(r, deg, c0, c1) {
  c0 = c0 || 0; c1 = c1 || 0;
  return [c0 + r * Math.cos(rad(deg)), c1 + r * Math.sin(rad(deg))];
}
function sparkle(x, y, s) {
  return 'M' + x + ' ' + (y - s) + ' Q' + x + ' ' + y + ' ' + (x + s) + ' ' + y +
    ' Q' + x + ' ' + y + ' ' + x + ' ' + (y + s) +
    ' Q' + x + ' ' + y + ' ' + (x - s) + ' ' + y +
    ' Q' + x + ' ' + y + ' ' + x + ' ' + (y - s) + 'Z';
}
function starPath(c0, c1, n, ro, ri, rot) {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? ri : ro;
    const q = pt(r, (rot || -90) + i * 180 / n, c0, c1);
    d += (i ? 'L' : 'M') + q[0].toFixed(2) + ' ' + q[1].toFixed(2);
  }
  return d + 'Z';
}

/* ---------------- 挂载 ---------------- */
export function mount(hostEl, ctx) {
  host = hostEl;
  api = ctx;
  revealed = false;

  root = document.createElement('div');
  root.className = 'slx-ar';
  root.innerHTML = MARKUP;
  host.appendChild(root);

  sceneEl = root.querySelector('.slx-ar-scene');
  tiltEl = root.querySelector('.slx-ar-tilt');

  const huds = root.querySelectorAll('.slx-ar-hud');
  huds[0].textContent = COPY.hud[0];
  huds[1].textContent = COPY.hud[1];
  huds[2].textContent = COPY.hud[2];

  buildArt();
  buildCopy();
  initCanvas();
  bindTilt();
  scheduleMsgs();

  root.style.setProperty('--p', '0.06');

  if (api.simple) { readCenter(); draw(performance.now(), 1 / 60); }
}

/* ---------------- 星盘、牌、装饰 ---------------- */
function buildArt() {
  /* 外环刻度：144 根，每 6 根一根长的 */
  const ticks = root.querySelector('#ar-ticks');
  for (let i = 0; i < 144; i++) {
    const long = i % 6 === 0;
    const a = i * 2.5;
    const q1 = pt(173, a), q2 = pt(long ? 161 : 167, a);
    el('line', { x1: q1[0].toFixed(2), y1: q1[1].toFixed(2), x2: q2[0].toFixed(2), y2: q2[1].toFixed(2), 'stroke-width': long ? 1.2 : .5 }, ticks);
  }

  /* 希腊字母环 */
  const glyphs = root.querySelector('#ar-glyphs');
  const letters = 'ΑΒΓΔΕΖΗΘΙΚΛΜ'.split('');
  for (let i = 0; i < 12; i++) {
    const deg = i * 30 - 90;
    const q = pt(160, deg);
    el('circle', { cx: q[0].toFixed(2), cy: q[1].toFixed(2), r: 8, fill: 'rgba(0,0,0,.7)', stroke: 'currentColor', 'stroke-width': .8 }, glyphs);
    const t = el('text', {
      x: q[0].toFixed(2), y: q[1].toFixed(2), 'text-anchor': 'middle', 'dominant-baseline': 'central',
      'font-size': 8.5, fill: 'currentColor', transform: 'rotate(' + (deg + 90) + ' ' + q[0].toFixed(2) + ' ' + q[1].toFixed(2) + ')'
    }, glyphs);
    t.textContent = letters[i];
    const g = pt(150, deg + 15);
    el('circle', { cx: g[0].toFixed(2), cy: g[1].toFixed(2), r: 1.4, fill: 'currentColor' }, glyphs);
  }

  /* 六芒 */
  const hex = root.querySelector('#ar-hex');
  [[-90, 30, 150], [90, 210, 330]].forEach(function (tri, k) {
    const pts = tri.map(function (d) { const q = pt(140, d); return q[0].toFixed(2) + ',' + q[1].toFixed(2); }).join(' ');
    el('polygon', { points: pts, class: 'd', pathLength: 1, style: '--dd:' + (.25 + k * .12) + 's' }, hex);
  });

  /* 七芒与两个方转 */
  const hept = root.querySelector('#ar-hept');
  const seven = [0, 3, 6, 2, 5, 1, 4].map(function (k) {
    const q = pt(112, -90 + k * 360 / 7); return q[0].toFixed(2) + ',' + q[1].toFixed(2);
  }).join(' ');
  el('polygon', { points: seven, class: 'd', pathLength: 1, style: '--dd:.35s' }, hept);
  [0, 45].forEach(function (o, k) {
    const sq = [0, 90, 180, 270].map(function (d) {
      const q = pt(72, d + o); return q[0].toFixed(2) + ',' + q[1].toFixed(2);
    }).join(' ');
    el('polygon', { points: sq, class: 'd', pathLength: 1, style: '--dd:' + (.45 + k * .1) + 's' }, hept);
  });
  for (let i = 0; i < 7; i++) {
    const q = pt(112, -90 + i * 360 / 7);
    el('circle', { cx: q[0].toFixed(2), cy: q[1].toFixed(2), r: 3, fill: 'currentColor', class: 'fadein', style: '--dd:.8s' }, hept);
  }

  /* 内层小星 */
  const dots = root.querySelector('#ar-dots');
  for (let i = 0; i < 8; i++) {
    const q = pt(58, i * 45);
    el('path', { d: sparkle(q[0].toFixed(2), q[1].toFixed(2), i % 2 ? 3 : 5) }, dots);
  }

  /* 牌背的放射线与小星 */
  const cb = root.querySelector('#ar-cb');
  if (cb) {
    for (let i = 0; i < 24; i++) {
      const q1 = pt(25, i * 15, 50, 84), q2 = pt(i % 2 ? 31 : 37, i * 15, 50, 84);
      el('line', { x1: q1[0].toFixed(2), y1: q1[1].toFixed(2), x2: q2[0].toFixed(2), y2: q2[1].toFixed(2), 'stroke-width': .6 }, cb);
    }
    [[18, 20], [82, 20], [18, 148], [82, 148]].forEach(function (q) {
      el('path', { d: sparkle(q[0], q[1], 4), fill: 'url(#ar-gGold)', stroke: 'none' }, cb);
    });
    [30, 40, 50, 60, 70].forEach(function (x, i) {
      el('circle', { cx: x, cy: 140, r: 3, 'stroke-width': .5 }, cb);
      if (i !== 2) {
        el('circle', { cx: x + (i < 2 ? 1.6 : -1.6) * (i % 2 ? 1 : .6), cy: 140, r: 3, fill: 'url(#ar-gGold)', stroke: 'none', opacity: .85 }, cb);
      } else {
        el('circle', { cx: x, cy: 140, r: 3, fill: 'url(#ar-gGold)', stroke: 'none' }, cb);
      }
    });
  }

  /* 第十七张：星辰 */
  const sa = root.querySelector('#ar-star-art');
  if (sa) {
    for (let i = 0; i < 32; i++) {
      const q1 = pt(12, i * 11.25, 50, 68), q2 = pt(i % 2 ? 26 : 36, i * 11.25, 50, 68);
      el('line', { x1: q1[0].toFixed(2), y1: q1[1].toFixed(2), x2: q2[0].toFixed(2), y2: q2[1].toFixed(2), stroke: '#ffffff', 'stroke-width': .35, opacity: .7 }, sa);
    }
    el('path', { d: starPath(50, 68, 8, 25, 8), fill: 'url(#ar-gGold)', stroke: '#ffffff', 'stroke-width': .5 }, sa);
    el('circle', { cx: 50, cy: 68, r: 3.4, fill: '#fff' }, sa);
    [[22, 40, 3.4], [78, 38, 3.8], [17, 72, 2.6], [83, 74, 3], [28, 100, 2.6], [72, 102, 3.2], [50, 32, 2.2]].forEach(function (q) {
      el('path', { d: starPath(q[0], q[1], 4, q[2], q[2] * .32), fill: '#ffffff' }, sa);
    });
  }

  /* 环游的 9 张牌背 */
  const orbit = root.querySelector('.slx-ar-orbit');
  for (let i = 0; i < 9; i++) {
    const c = document.createElement('div');
    c.className = 'slx-ar-card';
    c.style.setProperty('--a', (i * 360 / 9) + 'deg');
    c.style.setProperty('--i', i);
    c.innerHTML = '<div class="slx-ar-float"><svg viewBox="0 0 100 168"><use href="#ar-cardback"/></svg></div>';
    orbit.appendChild(c);
  }
}
/* ---------------- 文字与进度 ---------------- */
function buildCopy() {
  /* 标题：逐字升起 */
  const title = root.querySelector('.slx-ar-title');
  let ci = 0;
  COPY.title.forEach(function (line, li) {
    const ln = document.createElement('span');
    ln.className = 'line';
    const base = 0.12 + li * 0.3;
    Array.from(line).forEach(function (ch, j) {
      const s = document.createElement('span');
      s.className = 'slx-ar-ch';
      s.style.setProperty('--dd', (base + j * 0.035).toFixed(3) + 's');
      s.style.setProperty('--i', ci);
      s.textContent = ch;
      ci += 1;
      ln.appendChild(s);
    });
    title.appendChild(ln);
  });

  /* 副标题：逐词 */
  const sub = root.querySelector('.slx-ar-en');
  let k = 0;
  COPY.sub.forEach(function (line) {
    const sl = document.createElement('span');
    sl.className = 'sl';
    const words = line.split(' ');
    words.forEach(function (w, wi) {
      const s = document.createElement('span');
      s.className = 'w';
      s.style.setProperty('--k', k);
      k += 1;
      s.textContent = w;
      sl.appendChild(s);
      if (wi < words.length - 1) sl.appendChild(document.createTextNode(' '));
    });
    sub.appendChild(sl);
  });

  const status = root.querySelector('.slx-ar-status');
  enEl = status.querySelector('.sen');
  zhEl = status.querySelector('.zh');
  stepN = root.querySelector('.slx-ar .step .sn');

  /* 进度轨上的菱形节点 */
  const bar = root.querySelector('.slx-ar .bar');
  nodes = NODE_AT.map(function (at) {
    const b = document.createElement('b');
    b.className = 'nd';
    b.style.left = (at * 100) + '%';
    bar.appendChild(b);
    return b;
  });

  /* 百分比滚轮 */
  const pct = root.querySelector('.slx-ar .pct');
  pct.innerHTML = '<span class="dg h"></span><span class="dg"></span><span class="dg"></span><span class="pc">%</span>';
  const dgs = pct.querySelectorAll('.dg');
  hBox = dgs[0];
  const tBox = dgs[1], uBox = dgs[2];

  const mkCol = function (n, f) {
    const c = document.createElement('span');
    c.className = 'col';
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.textContent = f(i);
      c.appendChild(s);
    }
    return c;
  };
  hCol = mkCol(2, function (i) { return i ? '1' : ''; });
  tCol = mkCol(11, function (i) { return i % 10; });
  uCol = mkCol(101, function (i) { return i % 10; });
  hBox.appendChild(hCol);
  tBox.appendChild(tCol);
  uBox.appendChild(uCol);
  setPct(0);
}

function setPct(ip) {
  if (!uCol) return;
  uCol.style.transform = 'translateY(' + (-ip * LH) + 'em)';
  tCol.style.transform = 'translateY(' + (-Math.floor(ip / 10) * LH) + 'em)';
  const h = ip >= 100 ? 1 : 0;
  hCol.style.transform = 'translateY(' + (-h * LH) + 'em)';
  hBox.classList.toggle('on', h === 1);
}

/* 乱码解码：先随机字符，再一个个锁回真字 */
const GL = 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΦΧΨΩ◈◇';
let scrTok = 0;
function scramble(hostEl, text) {
  const tok = ++scrTok;
  hostEl.textContent = '';
  const chars = Array.from(text);
  const spans = chars.map(function (c) {
    const s = document.createElement('span');
    s.className = 'sc';
    s.textContent = c;
    hostEl.appendChild(s);
    return s;
  });
  if (api.simple) return;
  const widths = spans.map(function (s) { return s.getBoundingClientRect().width; });
  const t0 = performance.now();
  const due = chars.map(function (c, i) { return t0 + 120 + i * 26 + Math.random() * 140; });
  const locked = chars.map(function (c) { return c === ' '; });
  spans.forEach(function (s, i) {
    s.style.width = widths[i] + 'px';
    if (!locked[i]) {
      s.textContent = GL[(Math.random() * GL.length) | 0];
      s.classList.add('scr');
    }
  });
  let lastSwap = 0;
  (function tick() {
    if (tok !== scrTok || !root) return;
    const n = performance.now();
    const swap = n - lastSwap > 70;
    if (swap) lastSwap = n;
    let left = 0;
    spans.forEach(function (s, i) {
      if (locked[i]) return;
      if (n >= due[i]) {
        s.textContent = chars[i];
        s.classList.remove('scr');
        s.classList.add('lock');
        locked[i] = true;
      } else {
        left += 1;
        if (swap) s.textContent = GL[(Math.random() * GL.length) | 0];
      }
    });
    if (left) requestAnimationFrame(tick);
  })();
}

function showMsg(idx) {
  const m = COPY.msgs[idx] || COPY.final;
  msgIdx = idx;
  if (!root) return;
  scramble(enEl, m[0]);
  zhEl.textContent = '';
  Array.from(m[1]).forEach(function (c, j) {
    const s = document.createElement('span');
    s.className = 'zc';
    s.style.setProperty('--j', j);
    s.textContent = c;
    zhEl.appendChild(s);
  });
}

/* 状态行按时间推进，配合 3.8–4.5 秒的从容加载时长 */
function scheduleMsgs() {
  let i = 0;
  function tick() {
    if (revealed || !root) return;
    if (i > 4) return;
    showMsg(i);
    i += 1;
    later(tick, 680);
  }
  later(tick, 340);
}
/* ---------------- 画布 ---------------- */
let SPR = null;
let smx = 0, smy = 0, mx = 0, my = 0;
let flowPh = 0, spin = 0, rp = [0, 0, 0];
let waves = [], meteors = [], mi = 0, nextMeteor = 0;

function sprites() {
  if (SPR) return SPR;
  const make = function (c1, c2) {
    const s = document.createElement('canvas');
    s.width = s.height = 64;
    const g = s.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(.16, c1);
    gr.addColorStop(.45, c2);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    return s;
  };
  SPR = [
    make('rgba(255,255,255,.95)', 'rgba(200,200,200,.2)'),
    make('rgba(225,225,225,.9)', 'rgba(130,130,130,.18)'),
    make('rgba(255,255,255,.8)', 'rgba(255,255,255,.1)'),
    make('rgba(200,200,200,.85)', 'rgba(110,110,110,.16)')
  ];
  return SPR;
}

function initCanvas() {
  canvas = root.querySelector('.slx-ar-sky');
  if (!canvas) return;
  cx = canvas.getContext('2d');
  resize();
  addEventListener('resize', resize);
  offs.push(function () { removeEventListener('resize', resize); });
  nextMeteor = performance.now() + 700;
}

function readCenter() {
  if (!sceneEl) return;
  const r = sceneEl.getBoundingClientRect();
  center.x = r.left + r.width / 2;
  center.y = r.top + r.height / 2;
  center.r = r.width / 2;
}

function resize() {
  if (!canvas || !cx) return;
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  cx.setTransform(DPR, 0, 0, DPR, 0, 0);
  readCenter();

  /* 抖动网格：星星分布均匀，不扎堆 */
  const cell = Math.max(44, Math.sqrt(W * H / 700));
  stars = [];
  for (let gy = 0; gy < H / cell + 1; gy++) {
    for (let gx = 0; gx < W / cell + 1; gx++) {
      const x = (gx + .5 + (Math.random() - .5) * .75) * cell;
      const y = (gy + .5 + (Math.random() - .5) * .75) * cell;
      if (x > W + 4 || y > H + 4) continue;
      stars.push({ x: x, y: y, z: Math.pow(Math.random(), 2), h: Math.random(), d: 0 });
    }
  }
  for (let i = 0; i < stars.length; i++) {
    stars[i].d = Math.hypot(stars[i].x - center.x, stars[i].y - center.y);
  }
}

function ringSpec() {
  return W < 520
    ? [{ k: 1.30, n: 26, w: .16, dir: 1, s: 4.6 }, { k: 1.50, n: 38, w: .12, dir: -1, s: 4.2 }, { k: 1.72, n: 50, w: .09, dir: 1, s: 3.8 }]
    : [{ k: 1.30, n: 48, w: .16, dir: 1, s: 5 }, { k: 1.50, n: 72, w: .12, dir: -1, s: 4.4 }, { k: 1.72, n: 96, w: .09, dir: 1, s: 4 }];
}

function spawnWaves() {
  if (!cx) return;
  const n0 = performance.now();
  const R = Math.hypot(W, H) * .5;
  [[44, .55, 0], [66, .8, 160], [88, 1.05, 320]].forEach(function (q, i) {
    waves.push({ t0: n0 + q[2], n: q[0], rmax: R * q[1], dur: 2000, rot: i * Math.PI / q[0], s: 14 - i * 2 });
  });
}

function draw(now, dt) {
  if (!cx || !W) return;
  frameNo += 1;
  if (frameNo % 30 === 0) readCenter();

  smx += (mx - smx) * .04;
  smy += (my - smy) * .04;
  const t = now * .001;

  cx.clearRect(0, 0, W, H);
  cx.globalCompositeOperation = 'source-over';

  /* 1 · 星：位置不动，一圈波纹从中心向外滚 */
  const wsp = 1 + p * 1.2;
  const ox = smx * 10, oy = smy * 7;
  cx.fillStyle = '#ffffff';
  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    if (s.h < .35) continue;
    const w = .5 + .5 * Math.sin(s.d * .013 - t * wsp);
    cx.globalAlpha = .1 + .8 * w * w;
    const r = .35 + s.z * 1.3;
    cx.fillRect(s.x - ox * s.z, s.y - oy * s.z, r, r);
  }
  cx.fillStyle = '#aaaaaa';
  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    if (s.h >= .35) continue;
    const w = .5 + .5 * Math.sin(s.d * .013 - t * wsp);
    cx.globalAlpha = .1 + .8 * w * w;
    const r = .35 + s.z * 1.3;
    cx.fillRect(s.x - ox * s.z, s.y - oy * s.z, r, r);
  }

  const SP = sprites();
  cx.globalCompositeOperation = 'lighter';

  /* 亮的星星给一层柔光 */
  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    if (s.z <= .82) continue;
    const w = .5 + .5 * Math.sin(s.d * .013 - t * wsp);
    const sz = 4 + s.z * 12 * w * w;
    cx.globalAlpha = .55 * w;
    cx.drawImage(SP[s.h < .3 ? 1 : 2], s.x - ox * s.z - sz / 2, s.y - oy * s.z - sz / 2, sz, sz);
  }

  /* 2 · 向心流：一圈均匀的辐条，粒子同步往里走 */
  flowPh = (flowPh + dt * .14 * (1 + p * .9)) % 1;
  spin += dt * .02;
  const SPOKES = W < 520 ? 12 : 20;
  const PER = 3;
  const rOut = Math.hypot(W, H) * .55;
  const rIn = Math.min(center.r * 1.72, W / 2 - 14) * 1.1;
  const streamA = .1 + .4 * p;
  for (let k = 0; k < SPOKES; k++) {
    const ang = k * TAU / SPOKES - Math.PI / 2 + spin;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    for (let j = 0; j < PER; j++) {
      const ph = (flowPh + j / PER) % 1;
      const rr = rOut - (rOut - rIn) * ph;
      cx.globalAlpha = Math.pow(Math.sin(Math.PI * ph), 1.5) * streamA;
      const sz = 3 + 6 * ph;
      cx.drawImage(SP[(k + j) % 2 ? 2 : 0], center.x + ca * rr - sz, center.y + sa * rr - sz, sz * 2, sz * 2);
    }
  }

  /* 3 · 轨道环：外圈就是进度 */
  const fit = Math.min(1, (W / 2 - 14) / (center.r * 1.72));
  const breath = .82 + .18 * Math.sin(t * 2.1);
  const RINGS = ringSpec();
  for (let ri = 0; ri < RINGS.length; ri++) {
    const R = RINGS[ri];
    rp[ri] = (rp[ri] + dt * R.w * R.dir * (1 + p * 1.2)) % TAU;
    const rx = center.r * R.k * fit;
    for (let i = 0; i < R.n; i++) {
      const a = rp[ri] + i * TAU / R.n;
      const z = Math.sin(a) * .5 + .5;
      const x = center.x + Math.cos(a) * rx;
      const y = center.y + Math.sin(a) * rx * .225;
      const big = i % 4 === 0;
      let al = (big ? .75 : .4) * (.55 + .45 * z) * breath;
      let sz = R.s * (big ? 1.8 : 1) * (.75 + .25 * z) * 1.2;
      if (ri === 2) {
        const th = ((((a + Math.PI / 2) % TAU) + TAU) % TAU) / TAU;
        const lit = Math.max(0, Math.min(1, (p - th) * 24 + .5));
        al *= .22 + .78 * lit;
        sz *= 1 + .3 * lit;
      } else {
        al *= .4 + .6 * p;
      }
      cx.globalAlpha = Math.min(1, al);
      cx.drawImage(SP[big ? 0 : 1], x - sz, y - sz, sz * 2, sz * 2);
    }
  }

  /* 4 · 流星 */
  if (nextMeteor && now > nextMeteor) {
    meteors.push({ x: (0.78 + Math.random() * .14) * W, y: (0.06 + Math.random() * .18) * H, life: 1 });
    nextMeteor = now + 6500;
  }
  for (let i = meteors.length - 1; i >= 0; i--) {
    const s = meteors[i];
    s.x -= 9;
    s.y += 4.5;
    s.life -= .016;
    if (s.life <= 0) { meteors.splice(i, 1); continue; }
    const g = cx.createLinearGradient(s.x, s.y, s.x + 108, s.y - 54);
    g.addColorStop(0, 'rgba(255,255,255,' + s.life + ')');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    cx.globalAlpha = 1;
    cx.strokeStyle = g;
    cx.lineWidth = 1.4;
    cx.beginPath();
    cx.moveTo(s.x, s.y);
    cx.lineTo(s.x + 108, s.y - 54);
    cx.stroke();
    cx.drawImage(SP[0], s.x - 6, s.y - 6, 12, 12);
  }

  /* 5 · 揭牌时的三圈冲击波 */
  for (let i = waves.length - 1; i >= 0; i--) {
    const w = waves[i];
    const tau = (now - w.t0) / w.dur;
    if (tau < 0) continue;
    if (tau >= 1) { waves.splice(i, 1); continue; }
    const e = 1 - Math.pow(1 - tau, 3);
    const rr = w.rmax * e;
    const al = Math.pow(1 - tau, 1.6);
    const sz = w.s * (1 - tau * .5);
    cx.globalAlpha = al;
    for (let j = 0; j < w.n; j++) {
      const a = w.rot + j * TAU / w.n;
      cx.drawImage(SP[j % 2 ? 2 : 0], center.x + Math.cos(a) * rr - sz, center.y + Math.sin(a) * rr - sz, sz * 2, sz * 2);
    }
  }

  cx.globalAlpha = 1;
  cx.globalCompositeOperation = 'source-over';
}

/* ---------------- 视差 ---------------- */
function bindTilt() {
  if (api.simple) return;
  const onMove = function (e) {
    if (!W || !tiltEl) return;
    mx = (e.clientX / W - .5) * 2;
    my = (e.clientY / H - .5) * 2;
    tiltEl.style.setProperty('--ry', (mx * 8).toFixed(2) + 'deg');
    tiltEl.style.setProperty('--rx', (-my * 6).toFixed(2) + 'deg');
  };
  addEventListener('pointermove', onMove, { passive: true });
  offs.push(function () { removeEventListener('pointermove', onMove); });
}
/* ---------------- 对外钩子 ---------------- */
export function frame(now, dt) {
  if (!root || !api) return;
  p = api.progress();
  root.style.setProperty('--p', p.toFixed(3));

  /* 步骤罗马数字跟着真实进度走，和进度条不会打架 */
  const n = Math.min(COPY.steps.length, Math.floor(p * COPY.steps.length) + 1);
  if (n !== stepIdx && stepN) {
    stepIdx = n;
    stepN.textContent = COPY.steps[n - 1];
    stepN.classList.remove('roll');
    void stepN.offsetWidth;
    stepN.classList.add('roll');
  }

  const ip = Math.floor(p * 100);
  if (ip !== lastPct) {
    lastPct = ip;
    setPct(ip);
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].classList.toggle('on', p >= NODE_AT[i]);
    }
  }

  if (!api.simple) draw(now, dt);
}

/** core 在进度走满时调用：揭牌、闪光、冲击波，然后告诉 core 可以淡出了 */
export function finish() {
  if (revealed || !root) return;
  revealed = true;
  root.classList.add('done');
  showMsg(5);
  spawnWaves();
  later(function () { if (root) showMsg(COPY.msgs.length); }, 380);
  later(function () { if (api) api.done(); }, 1250);
}

/** core 在淡出前后调用：停掉一切，不留计时器与监听 */
export function unmount() {
  timers.forEach(function (id) { clearTimeout(id); });
  timers = [];
  offs.forEach(function (fn) { try { fn(); } catch (e) { /* 忽略 */ } });
  offs = [];
  scrTok += 1;

  if (cx) { try { cx.clearRect(0, 0, W, H); } catch (e) { /* 忽略 */ } }
  if (root && root.parentNode) root.parentNode.removeChild(root);

  root = null; host = null; api = null;
  canvas = null; cx = null;
  sceneEl = null; tiltEl = null;
  stars = []; waves = []; meteors = []; SPR = null;
  nodes = [];
  hBox = null; hCol = null; tCol = null; uCol = null;
  enEl = null; zhEl = null; stepN = null;
  p = 0; lastPct = -1; msgIdx = -1; frameNo = 0;
  revealed = false;
  flowPh = 0; spin = 0; rp = [0, 0, 0];
  smx = 0; smy = 0; mx = 0; my = 0;
  nextMeteor = 0;
}