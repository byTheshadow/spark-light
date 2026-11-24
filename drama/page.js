/* AI 漫剧页的入口脚本：一间小放映厅。
   本页只依赖 core/ 与 data/，不依赖其他页面。数据：data/dramas.json（写法见 data/README.md）。
   两种来源：
     type "bilibili"：登记 BV 号，点开放映时才创建 B 站外链播放器
     type "images"  ：图床或本站的图片列表，长图连续阅读
   资源释放（硬性要求）：退出放映、切到后台、离开页面时，播放器与图片立刻拆掉，不在手机里堆积。
     - 列表上只有封面或占位画面，不会提前创建任何播放器；
     - 视频：退出时先把 iframe 指到空白页再移除；
     - 图片：只保留视口附近 1.5 屏内的图，其余立刻移除；退出时全部移除。 */
import { loadData } from '../core/data.js';
import { h, clear, icon, root, errorBox } from '../core/util.js';
import { renderStub } from '../core/page-stub.js';
import { createLoop, isSimple, pad2 } from '../core/raf.js';

renderStub('drama');

const doc = document;
const $ = (id) => doc.getElementById(id);

/* ---------- 数据整理（只信任格式正确的内容） ---------- */
const isUrl = (u) => typeof u === 'string' && /^https?:\/\//i.test(u.trim());
const BV = /^BV[0-9A-Za-z]{10}$/;
const fmtDate = (d) => {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(d || ''));
  return m ? m[1] + '.' + pad2(+m[2]) + '.' + pad2(+m[3]) : '';
};
const coverSrc = (it) => (!it.cover ? null : isUrl(it.cover) ? it.cover.trim() : root + 'assets/covers/' + encodeURIComponent(String(it.cover)));
const pageSrc = (it, p) => (isUrl(p) ? String(p).trim() : root + 'assets/drama/' + encodeURIComponent(String(it.id || '')) + '/' + encodeURIComponent(String(p)));

/* 每部作品一套配色与一张线条插画（来自站主的参考稿）。插画是没有封面时的占位画面，属装饰，
   页面上同时标“封面待补”；一旦登记了封面，一律用封面。 */
const MOTIFS = [
  { id: 'moon', p1: '#2e2860', p2: '#0d0c1c', glow: '#7d6ce1', tint: '125,108,225' },
  { id: 'card', p1: '#43304a', p2: '#120d16', glow: '#c47aa2', tint: '196,122,162' },
  { id: 'tower', p1: '#15393f', p2: '#061214', glow: '#3fa597', tint: '63,165,151' },
  { id: 'crane', p1: '#efedf8', p2: '#b4acd9', glow: '#a597ff', tint: '165,151,255' }
];

/* 写死的可信 SVG 片段，只放进空节点，数据不会进到这里 */
const MOTIF_SVG = {
  moon: '<path d="M122 14A17 17 0 1 0 122 46 13.5 13.5 0 1 1 122 14z" fill="rgba(255,255,255,.92)"/><g stroke="rgba(255,255,255,.3)" stroke-width=".6"><path d="M20 70h120M36 75h88M52 80h56"/></g><rect x="62" y="44" width="34" height="22" rx="1.5" fill="none" stroke="rgba(255,255,255,.75)" stroke-width=".9"/><path d="M62 45l17 11 17-11" fill="none" stroke="rgba(255,255,255,.75)" stroke-width=".9"/><g fill="#fff"><circle cx="30" cy="18" r=".7"/><circle cx="48" cy="30" r=".5"/><circle cx="142" cy="58" r=".6"/><circle cx="98" cy="12" r=".5"/></g>',
  card: '<g transform="rotate(-9 80 45)"><rect x="62" y="16" width="36" height="54" rx="3" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.8)" stroke-width=".9"/><rect x="66" y="20" width="28" height="46" rx="1.5" fill="none" stroke="rgba(255,255,255,.35)" stroke-width=".5"/><path d="M80 31c.4 4 2.6 6.2 7 7.6-4.4 1.4-6.6 3.6-7 7.6-.4-4-2.6-6.2-7-7.6 4.4-1.4 6.6-3.6 7-7.6z" fill="#f1c8dc"/><text x="80" y="61" text-anchor="middle" font-family="Instrument Serif, serif" font-style="italic" font-size="7" fill="rgba(255,255,255,.85)">VII</text></g><g fill="#fff"><circle cx="122" cy="16" r=".8"/><circle cx="34" cy="70" r=".6"/><circle cx="40" cy="22" r=".5"/></g>',
  tower: '<path d="M80 34L160 14v44z" fill="rgba(255,255,255,.12)"/><path d="M74 36h12l4 40H70z" fill="rgba(255,255,255,.88)"/><path d="M72 50h16M71 62h18" stroke="#15393f" stroke-width="2.6"/><rect x="75" y="26" width="10" height="10" fill="#ffe9b8"/><path d="M73 26l7-6 7 6z" fill="rgba(255,255,255,.88)"/><g stroke="rgba(255,255,255,.3)" stroke-width=".7" fill="none"><path d="M0 80q10-3 20 0t20 0 20 0 20 0 20 0 20 0 20 0 20 0"/><path d="M0 85q10-3 20 0t20 0 20 0 20 0 20 0 20 0 20 0 20 0"/></g>',
  crane: '<path d="M30 70Q80 10 136 24" fill="none" stroke="rgba(40,30,90,.35)" stroke-width=".7" stroke-dasharray="2 3"/><path d="M76 40l26-19-7 22 14 4-19 5-5 16-5-14-23-2z" fill="#fff" stroke="#2a2356" stroke-width=".8" stroke-linejoin="round"/><path d="M76 40l19 12" stroke="#2a2356" stroke-width=".6"/><circle cx="128" cy="16" r="7" fill="none" stroke="rgba(40,30,90,.4)" stroke-width=".7"/>'
};

function normalize(raw) {
  const it = Object.assign({}, raw);
  let kind = null;
  const type = it.type || (it.bvid ? 'bilibili' : null);
  if (type === 'bilibili' && BV.test(String(it.bvid || '').trim())) {
    it.bvid = String(it.bvid).trim();
    const pg = parseInt(it.page, 10);
    it.pageNo = pg >= 1 && pg <= 999 ? pg : 1;
    kind = 'video';
  } else if (type === 'images' && Array.isArray(it.pages)) {
    it.pages = it.pages.filter((p) => typeof p === 'string' && p.trim());
    if (it.pages.length) kind = 'images';
  }
  it.kind = kind;
  it.title = typeof it.title === 'string' ? it.title : '';
  it.summary = typeof it.summary === 'string' ? it.summary : '';
  it.dateText = fmtDate(it.date);
  it.src = kind ? coverSrc(it) : null;
  it.outUrl = kind === 'video' ? 'https://www.bilibili.com/video/' + it.bvid + '/' + (it.pageNo > 1 ? '?p=' + it.pageNo : '') : null;
  return it;
}

/* 还没有任何一部作品时，胶片上留一个“下一部作品”的位置，而不是堆几张假卡 */
const makePlaceholder = () => ({
  id: '', kind: null, placeholder: true, title: '下一部作品', summary: '这个位置留给下一部作品。',
  dateText: '', src: null, outUrl: null, c1: '#1a1a26', c2: '#08080d', glow: '#4a3c6e', tint: '150,150,170'
});
const KIND = { video: '视频', images: '长图' };

/* ---------- 画面：有封面用封面，没有就用参考稿里的线条插画打底 ---------- */
function leaderArt() {
  const ring = h('div', { class: 'drp-leader-ring' }, h('b', null, '0'));
  return h('div', { class: 'drp-leader' }, ring, h('small', null, '待上线'));
}

function art(it) {
  if (!it.kind) return leaderArt();
  const box = h('span', { class: 'drp-art' });
  box.style.background = 'linear-gradient(168deg,' + it.c1 + ',' + it.c2 + ')';
  if (it.src) {
    const im = h('img', { alt: '', decoding: 'async', referrerpolicy: 'no-referrer' });
    im.addEventListener('error', () => { console.warn('[Spark Light] 找不到封面：' + it.src); im.remove(); });
    im.src = it.src;
    box.appendChild(im);
  } else {
    const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 160 90');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = MOTIF_SVG[it.motif] || MOTIF_SVG.moon;   /* 写死的常量，不含数据 */
    box.appendChild(svg);
    box.appendChild(h('span', { class: 'drp-art-ph' }, '封面待补'));
  }
  return box;
}

/* ---------- 状态 ---------- */
const state = { all: [], list: [], active: -1, filter: 'all', empty: false };
let frames = [];

const strip = $('drp-strip');
const tabsBox = $('drp-tabs');
const hint = $('drp-hint');
const screen = $('drp-screen');
const layers = [$('drp-layer-a'), $('drp-layer-b')];
let front = 0;

/* ---------- 胶片 ---------- */
function frameEl(it, i) {
  const f = h('button', { class: 'drp-frame', type: 'button', role: 'option', tabindex: '-1', 'aria-selected': 'false' },
    h('span', { class: 'drp-frame-img' }, art(it)),
    h('span', { class: 'drp-frame-no' }, pad2(i + 1)));
  f.setAttribute('aria-label', (it.kind ? KIND[it.kind] + '，' : '') + (it.title || '未命名'));
  f.addEventListener('click', () => {
    if (dragMoved) return;
    if (i === state.active) startShow(state.list[i]); else centerOn(i, true);
  });
  return f;
}

function buildStrip() {
  clear(strip);
  frames = state.list.map((it, i) => {
    const f = frameEl(it, i);
    strip.appendChild(f);
    return f;
  });
  state.active = -1;
  strip.scrollLeft = 0;
  setActive(0, true);
}

function centerOn(i, smooth) {
  const f = frames[i];
  if (!f) return;
  const x = f.offsetLeft - (strip.clientWidth - f.offsetWidth) / 2;
  strip.scrollTo({ left: x, behavior: smooth && !isSimple() ? 'smooth' : 'auto' });
}

function nearest() {
  const mid = strip.scrollLeft + strip.clientWidth / 2;
  let best = 0, bd = Infinity;
  frames.forEach((f, i) => {
    const d = Math.abs(f.offsetLeft + f.offsetWidth / 2 - mid);
    if (d < bd) { bd = d; best = i; }
  });
  return best;
}

let scrollRaf = 0;
strip.addEventListener('scroll', () => {
  if (scrollRaf) return;
  scrollRaf = requestAnimationFrame(() => { scrollRaf = 0; setActive(nearest()); });
}, { passive: true });

/* 鼠标拖动胶片；触屏用原生滑动 */
let drag = null, dragMoved = false;
strip.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'mouse' || e.button !== 0) return;
  drag = { x: e.clientX, s: strip.scrollLeft };
  dragMoved = false;
});
window.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x;
  if (!dragMoved && Math.abs(dx) > 5) { dragMoved = true; strip.classList.add('dragging'); }
  if (dragMoved) strip.scrollLeft = drag.s - dx;
});
window.addEventListener('pointerup', () => {
  if (!drag) return;
  drag = null;
  if (dragMoved) {
    strip.classList.remove('dragging');
    centerOn(nearest(), true);
    setTimeout(() => { dragMoved = false; }, 60);
  }
});
strip.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') { e.preventDefault(); centerOn(Math.min(state.active + 1, state.list.length - 1), true); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); centerOn(Math.max(state.active - 1, 0), true); }
  else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startShow(state.list[state.active]); }
});

/* ---------- 换片 ---------- */
function setActive(i, silent) {
  const it = state.list[i];
  if (!it || (i === state.active && !silent)) return;
  const dir = i >= state.active ? 1 : -1;
  state.active = i;

  frames.forEach((f, k) => {
    f.classList.toggle('is-on', k === i);
    f.setAttribute('aria-selected', k === i ? 'true' : 'false');
  });

  /* 画面像被拉过片门：新的从一侧滑进来，旧的往另一侧滑出去 */
  const back = 1 - front, nl = layers[back], ol = layers[front];
  clear(nl);
  nl.appendChild(art(it));
  nl.style.zIndex = '1';
  ol.style.zIndex = '0';
  if (!silent && !isSimple()) {
    try {
      nl.animate([
        { transform: 'translateY(' + (dir * 22) + '%)', filter: 'blur(5px) brightness(1.6)', opacity: .4 },
        { transform: 'translateY(0)', filter: 'blur(0) brightness(1)', opacity: 1 }
      ], { duration: 260, easing: 'cubic-bezier(.3,.7,.2,1)' });
      const oa = ol.animate([
        { transform: 'translateY(0)', opacity: 1 },
        { transform: 'translateY(' + (-dir * 22) + '%)', opacity: 0 }
      ], { duration: 220, easing: 'ease-in', fill: 'forwards' });
      oa.onfinish = () => { if (ol !== layers[front]) clear(ol); oa.cancel(); };
    } catch (e) { clear(ol); }
  } else {
    clear(ol);
  }
  front = back;

  /* 银幕说明 */
  $('drp-screen-title').textContent = it.kind ? (it.title || '未命名') : '下一部作品';
  $('drp-screen-kind').textContent = it.kind ? KIND[it.kind] : '';
  $('drp-screen-wrap').style.setProperty('--drp-glow', it.glow);

  /* 当前这一部的介绍 */
  $('drp-n-kind').textContent = it.kind ? KIND[it.kind] : '待上线';
  const ep = it.kind === 'images' ? '共 ' + it.pages.length + ' 页' : '';
  $('drp-n-ep').textContent = ep;
  $('drp-n-date').textContent = it.dateText;
  $('drp-n-sep1').hidden = !ep;
  $('drp-n-sep2').hidden = !(ep && it.dateText);
  $('drp-sum').textContent = it.summary || (it.kind ? '简介待站主提供。' : '这个位置留给下一部作品。');

  const play = $('drp-play');
  play.disabled = !it.kind;
  $('drp-play-text').textContent = !it.kind ? '还没有上线' : it.kind === 'video' ? '开始放映' : '开始阅读';
  const out = $('drp-out');
  if (it.outUrl) { out.href = it.outUrl; out.hidden = false; } else { out.removeAttribute('href'); out.hidden = true; }
}

/* ---------- 类型筛选：与参考稿一致，三档常显；没有作品的档位置灰 -------- */
function buildTabs() {
  clear(tabsBox);
  if (!state.all.length) { tabsBox.hidden = true; return; }
  tabsBox.hidden = false;
  const counts = {
    all: state.all.length,
    video: state.all.filter((i) => i.kind === 'video').length,
    images: state.all.filter((i) => i.kind === 'images').length
  };
  [['all', '全部'], ['video', '视频'], ['images', '长图']].forEach(([id, label]) => {
    const n = counts[id];
    const b = h('button', {
      type: 'button', role: 'tab', 'data-f': id,
      'aria-selected': id === state.filter ? 'true' : 'false',
      'aria-disabled': n ? null : 'true'
    });
    b.textContent = label;
    b.addEventListener('click', () => {
      if (!n) return;
      Array.from(tabsBox.children).forEach((x) => x.setAttribute('aria-selected', x === b ? 'true' : 'false'));
      state.filter = id;
      state.list = id === 'all' ? state.all.slice() : state.all.filter((it) => it.kind === id);
      buildStrip();
    });
    tabsBox.appendChild(b);
  });
}

/* ---------- 放映窗 ---------- */
const Show = (function () {
  const theater = $('drp-theater');
  const ps = $('drp-pscreen');
  const pin = $('drp-pin');
  const beam = $('drp-beam');
  const thTitle = $('drp-th-title');
  const thCount = $('drp-th-count');
  const closeBtn = $('drp-close');

  let on = false, item = null, lastFocus = null, timers = [], loop = null, frame = null, io = null, boxes = [], scrollRaf2 = 0;

  closeBtn.insertBefore(icon('close', 14), closeBtn.firstChild);

  const headH = () => {
    const el = doc.querySelector('.sl-head');
    return el && el.offsetHeight ? el.offsetHeight : 54;
  };

  function later(fn, ms) { timers.push(setTimeout(fn, isSimple() ? 0 : ms)); }

  function targetRect(reading) {
    const vw = window.innerWidth, vh = window.innerHeight, top = headH() + 8;
    if (reading) {
      const w = Math.min(vw - 24, 620);
      return { x: (vw - w) / 2, y: top + 40, w, h: vh - top - 64 };
    }
    const w2 = Math.min(vw - 24, (vh - 170) * 16 / 9, 1040);
    const h2 = w2 * 9 / 16 + 44;   /* 多留一条：播放器下面的“在 B 站打开”兜底链接不能被裁掉 */
    return { x: (vw - w2) / 2, y: Math.max(top, (vh - h2) / 2 - 20), w: w2, h: h2 };
  }

  function aimBeam(t) {
    const lx = window.innerWidth / 2, ly = window.innerHeight - 25;
    beam.style.clipPath = 'polygon(' + lx + 'px ' + ly + 'px, ' + (lx - 4) + 'px ' + ly + 'px, ' +
      t.x + 'px ' + (t.y + t.h) + 'px, ' + t.x + 'px ' + t.y + 'px, ' +
      (t.x + t.w) + 'px ' + t.y + 'px, ' + (t.x + t.w) + 'px ' + (t.y + t.h) + 'px, ' +
      (lx + 4) + 'px ' + ly + 'px)';
  }

  function place(t) {
    ps.style.left = t.x + 'px';
    ps.style.top = t.y + 'px';
    ps.style.width = t.w + 'px';
    ps.style.height = t.h + 'px';
  }

  /* ----- 视频：倒数结束后才创建播放器 ----- */
  function mountVideo(it) {
    if (!on) return;
    pin.textContent = '';
    const src = 'https://player.bilibili.com/player.html?bvid=' + encodeURIComponent(it.bvid) +
      '&page=' + it.pageNo + '&autoplay=0&high_quality=1&danmaku=0';
    frame = h('iframe', {
      class: 'drp-vframe', src, title: '视频：' + (it.title || '未命名'),
      allow: 'fullscreen', allowfullscreen: 'true', scrolling: 'no', frameborder: '0',
      sandbox: 'allow-scripts allow-same-origin allow-popups allow-presentation allow-forms'
    });
    pin.appendChild(h('div', { class: 'drp-vwrap' }, frame,
      h('p', { class: 'drp-vout' }, '播放不了或太卡？',
        h('a', { href: it.outUrl, target: '_blank', rel: 'noopener noreferrer' }, '在 B 站打开'))));
    pin.classList.add('show');
  }

  function countdown() {
    const ring = h('div', { class: 'drp-leader-ring' });
    const b = h('b', null, '3');
    ring.appendChild(b);
    pin.textContent = '';
    pin.appendChild(h('div', { class: 'drp-lead-frame' }, ring));
    pin.classList.add('show');
    if (isSimple()) { mountVideo(item); return; }
    const t0 = performance.now();
    loop = createLoop();
    loop.add((now) => {
      const e = (now - t0) / 1000;
      const n = 3 - Math.floor(e);
      if (n <= 0) { stopCount(); mountVideo(item); return; }
      b.textContent = String(n);
      ring.style.setProperty('--p', ((e % 1) * 360).toFixed(1) + 'deg');
    });
    loop.start();
  }
  function stopCount() { const l = loop; loop = null; if (l) l.stop(); }

  /* ----- 图文：竖向连续阅读，只保留视口附近的图 ----- */
  function loadBox(b) {
    if (b.img || b.failed) return;
    const im = h('img', { class: 'drp-pg-img', alt: '第 ' + (b.i + 1) + ' 页', decoding: 'async', referrerpolicy: 'no-referrer' });
    im.addEventListener('load', () => {
      if (im.naturalWidth) b.el.style.aspectRatio = im.naturalWidth + ' / ' + im.naturalHeight;
      b.el.classList.add('ok');
      b.el.textContent = '';
      b.el.appendChild(im);
      updateCount();
    });
    im.addEventListener('error', () => {
      console.warn('[Spark Light] 漫剧图片加载失败：' + b.src);
      unloadBox(b);
      b.failed = true;
      b.el.classList.remove('ok');
      b.el.classList.add('bad');
      b.el.textContent = '';
      b.el.appendChild(h('div', { class: 'drp-pg-fail' },
        h('span', null, '这一页没有加载出来'),
        h('button', { class: 'sl-btn sl-btn--ghost', type: 'button', onclick: () => { b.failed = false; b.el.classList.remove('bad'); b.el.textContent = String(b.i + 1); loadBox(b); } }, '重试')));
    });
    im.src = b.src;
    b.img = im;
  }
  function unloadBox(b) {
    if (!b.img) return;
    b.img.removeAttribute('src');
    b.img.remove();
    b.img = null;
    b.el.classList.remove('ok');
  }
  function mountPages(it) {
    if (!on) return;
    const list = h('div', { class: 'drp-pages' });
    boxes = it.pages.map((p, i) => {
      const el = h('div', { class: 'drp-pg', 'data-i': String(i) }, String(i + 1));
      list.appendChild(el);
      return { i, el, src: pageSrc(it, p), img: null, failed: false };
    });
    pin.textContent = '';
    pin.append(list, h('p', { class: 'drp-end' }, '由 AI 生成，到底了'));
    pin.classList.add('show');
    io = new IntersectionObserver((es) => es.forEach((e) => {
      const b = boxes[+e.target.getAttribute('data-i')];
      if (!b) return;
      if (e.isIntersecting) loadBox(b); else unloadBox(b);
    }), { root: ps, rootMargin: '150% 0px 150% 0px' });
    boxes.forEach((b) => io.observe(b.el));
    ps.addEventListener('scroll', onScroll, { passive: true });
    /* 第一页先直接加载：观察器还没来得及回调时，也不会是一片空屏 */
    if (boxes[0]) loadBox(boxes[0]);
    updateCount();
  }
  function updateCount() {
    scrollRaf2 = 0;
    if (!boxes.length) return;
    /* 用 scrollTop 与 offsetTop 计算，不用 getBoundingClientRect：
       放映窗从银幕飞过来的那 0.9 秒里带着 transform，rect 会被缩放，算出来会偏到最后一页。
       取阅读区上方四分之一处作为“读到哪一页”，比取正中更贴近实际观感 */
    const mid = ps.scrollTop + Math.min(ps.clientHeight * .25, 200);
    let best = 0, d = Infinity;
    boxes.forEach((b, i) => {
      const c = b.el.offsetTop + b.el.offsetHeight / 2;
      const dd = Math.abs(c - mid);
      if (dd < d) { d = dd; best = i; }
    });
    thCount.textContent = (best + 1) + ' / ' + boxes.length;
  }
  function onScroll() { if (!scrollRaf2) scrollRaf2 = requestAnimationFrame(updateCount); }

  function teardown() {
    if (frame) { try { frame.src = 'about:blank'; } catch (e) { /* 忽略 */ } frame.remove(); frame = null; }
    if (io) { io.disconnect(); io = null; }
    boxes.forEach(unloadBox);
    boxes = [];
    ps.removeEventListener('scroll', onScroll);
    pin.textContent = '';
    pin.classList.remove('show');
    ps.scrollTop = 0;
    thCount.textContent = '';
  }

  function makeDust() {
    clear(beam);
    if (isSimple()) return;
    for (let k = 0; k < 18; k++) {
      const d = doc.createElement('i');
      d.style.left = (30 + Math.random() * 40) + '%';
      d.style.top = (30 + Math.random() * 65) + '%';
      d.style.setProperty('--d', (6 + Math.random() * 8).toFixed(1) + 's');
      d.style.setProperty('--dl', (-Math.random() * 10).toFixed(1) + 's');
      d.style.setProperty('--dx', ((Math.random() - .5) * 40).toFixed(0) + 'px');
      beam.appendChild(d);
    }
  }

  function open(it) {
    if (!it || !it.kind || on) return;
    on = true;
    item = it;
    lastFocus = doc.activeElement;
    thTitle.textContent = it.title || '未命名';
    ps.style.setProperty('--drp-glow', it.glow);
    ps.classList.toggle('reading', it.kind === 'images');
    teardown();
    makeDust();

    const from = screen.getBoundingClientRect();
    const t = targetRect(it.kind === 'images');
    place(t);
    ps.style.transform = 'translate(' + (from.left - t.x) + 'px,' + (from.top - t.y) + 'px) scale(' +
      (from.width / t.w) + ',' + (from.height / t.h) + ')';
    aimBeam(t);
    theater.classList.add('on');
    screen.classList.add('away');
    doc.body.classList.add('drp-dim', 'sl-lock');

    if (isSimple()) {
      ps.style.transform = 'none';
      theater.classList.add('lit');
    } else {
      void ps.offsetWidth;
      ps.classList.add('flying');
      ps.style.transform = 'none';
      theater.classList.add('lit');
    }
    later(() => { ps.classList.remove('flying'); }, 900);
    later(() => { if (!on) return; if (item.kind === 'images') mountPages(item); else countdown(); }, 700);

    doc.addEventListener('keydown', onKey);
    try { closeBtn.focus({ preventScroll: true }); } catch (e) { /* 忽略 */ }
  }

  function close() {
    if (!on) return;
    on = false;
    timers.forEach(clearTimeout); timers = [];
    stopCount();
    teardown();
    clear(beam);
    theater.classList.remove('lit');
    doc.removeEventListener('keydown', onKey);
    const finish = () => {
      if (on) return;
      theater.classList.remove('on');
      ps.classList.remove('flying', 'reading');
      ps.style.transform = '';
      screen.classList.remove('away');
      doc.body.classList.remove('drp-dim', 'sl-lock');
      thTitle.textContent = '';
    };
    if (isSimple()) finish(); else setTimeout(finish, 450);
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) { /* 元素已不在页面 */ } }
  }

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const f = Array.from(theater.querySelectorAll('a[href],button:not([disabled])')).filter((x) => !x.hidden);
    if (!f.length) return;
    const a = f[0], z = f[f.length - 1];
    if (e.shiftKey && doc.activeElement === a) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && doc.activeElement === z) { e.preventDefault(); a.focus(); }
  }

  closeBtn.addEventListener('click', close);
  theater.addEventListener('click', (e) => { if (e.target === theater) close(); });
  doc.addEventListener('visibilitychange', () => { if (doc.hidden && on) close(); });
  window.addEventListener('pagehide', () => { if (on) close(); });
  window.addEventListener('resize', () => {
    if (!on) { centerOn(state.active, false); return; }
    const t = targetRect(ps.classList.contains('reading'));
    place(t);
    if (!ps.classList.contains('flying')) ps.style.transform = 'none';
    aimBeam(t);
  });

  return { open };
})();

function startShow(it) {
  if (screen && screen.classList.contains('drp-ai-masked')) {
    screen.classList.remove('drp-ai-masked');
  }
  Show.open(it);
}
const aiVeil = $('drp-ai-veil');
if (aiVeil) aiVeil.addEventListener('click', () => { if (screen) screen.classList.remove('drp-ai-masked'); });
$('drp-play').addEventListener('click', () => startShow(state.list[state.active]));

/* ---------- 启动 ---------- */
async function main() {
  const data = await loadData('dramas');
  const raw = (Array.isArray(data.items) ? data.items : []).filter((i) => i && typeof i === 'object');
  state.empty = raw.length === 0;
  state.all = raw.map((x, i) => {
    const it = normalize(x);
    const m = MOTIFS[i % MOTIFS.length];
    it.motif = m.id;
    it.c1 = m.p1; it.c2 = m.p2; it.glow = m.glow; it.tint = m.tint;
    return it;
  });
  state.list = state.empty ? [makePlaceholder()] : state.all.slice();
  buildTabs();
  buildStrip();
  hint.textContent = state.empty
    ? '漫剧还没上线，上映后会先出现在这里'
    : state.list.length === 1
      ? '点一下选中，再点开始放映'
      : '左右拖动胶片，停在片门里的就是当前这一部';
}

main().catch((e) => {
  const hall = $('drp-hall');
  if (hall) { clear(hall); hall.appendChild(errorBox('这一块读取失败：' + (e.file || ''), e.message)); }
});
