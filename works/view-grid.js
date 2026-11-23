/* 作品页的“瀑布”和“按月份”两种陈列。
   图片懒加载，进入视口才“显影”；瀑布的几列在滚动时以不同速度轻微漂移（简化动效下关闭）。 */
import { h } from '../core/util.js';
import { clamp, isSimple } from '../core/raf.js';

const FINE = !!(window.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches);

function card(w, idx, small, ctx) {
  const b = h('button', { class: 'wk', type: 'button', 'aria-label': (w.title || '未命名') + (w.catName ? '，' + w.catName : '') + (w.ai ? '，AI 生成' : '') + (w.dateText ? '，' + w.dateText : '') + '，查看大图' });
  b.style.setProperty('--tint', w.tint);
  const inn = h('span', { class: 'wk-in' });
  const im = h('span', { class: 'wk-img' });
  const setAr = () => { if (!small) im.style.setProperty('--ar', clamp(w.ar, .6, 1.8).toFixed(3)); };
  setAr();
  const img = h('img', { alt: '', loading: 'lazy', decoding: 'async' });
  img.addEventListener('load', () => { if (img.naturalWidth && img.naturalHeight) { w.ar = img.naturalWidth / img.naturalHeight; setAr(); } });
  img.addEventListener('error', () => { console.warn('[Spark Light] 找不到图片：' + w.src); img.remove(); im.classList.add('wk-missing'); b.classList.add('dev'); });
  img.src = w.src;
  im.appendChild(img);
  inn.appendChild(im);
  if (w.ai) inn.appendChild(h('span', { class: 'wk-ai' }, '由 AI 生成'));
  inn.appendChild(h('span', { class: 'wk-shine' }));
  const cap = h('span', { class: 'wk-cap' }, h('span', { class: 'wk-t' }, w.title || '未命名'), w.dateText ? h('span', { class: 'wk-d' }, w.dateShort) : null);
  if (w.catName && (!small || ctx.showCat)) cap.appendChild(h('span', { class: 'wk-c' }, h('i'), h('span', null, w.catName)));
  inn.appendChild(cap);
  b.appendChild(inn);
  b.addEventListener('click', () => ctx.open(idx, b));
  if (FINE && !isSimple()) {
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      inn.style.setProperty('--ry', ((x - .5) * 7).toFixed(2) + 'deg');
      inn.style.setProperty('--rx', ((.5 - y) * 6).toFixed(2) + 'deg');
      inn.style.setProperty('--sx', (x * 100) + '%');
      inn.style.setProperty('--sy', (y * 100) + '%');
    });
    b.addEventListener('pointerleave', () => { inn.style.setProperty('--rx', '0deg'); inn.style.setProperty('--ry', '0deg'); });
  }
  return b;
}

function reveal(host) {
  const all = Array.from(host.querySelectorAll('.wk'));
  if (isSimple() || !('IntersectionObserver' in window)) { all.forEach((x) => x.classList.add('dev')); return null; }
  const io = new IntersectionObserver((es) => {
    es.forEach((en) => {
      if (!en.isIntersecting) return;
      const t = en.target;
      setTimeout(() => t.classList.add('dev'), (+t.getAttribute('data-k') || 0) % 4 * 90);
      io.unobserve(t);
    });
  }, { rootMargin: '0px 0px -6% 0px' });
  all.forEach((x) => io.observe(x));
  return io;
}

const ncols = () => (innerWidth < 600 ? 2 : innerWidth < 1040 ? 3 : 4);

export function createWall(list, ctx) {
  const n = ncols();
  const m = h('div', { class: 'mason' });
  m.style.setProperty('--cols', n);
  const cols = [], H = [];
  for (let i = 0; i < n; i++) { const c = h('div', { class: 'col' }); m.appendChild(c); cols.push(c); H.push(0); }
  const speed = cols.map((_, i) => [0, -.06, .04, -.03][i % 4]);
  list.forEach((w, k) => {
    const j = H.indexOf(Math.min.apply(null, H));
    const cd = card(w, k, false, ctx);
    cd.setAttribute('data-k', k);
    cols[j].appendChild(cd);
    H[j] += 1 / (w.ar || .8) + .18;
  });
  const io = reveal(m);
  return {
    el: m,
    cols: n,
    layout() { /* 列数变化时由页面重建 */ },
    needsRebuild() { return ncols() !== n; },
    tick() {
      if (isSimple()) { cols.forEach((c) => { c.style.transform = ''; }); return; }
      const r = m.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const p = innerHeight - r.top;
      cols.forEach((c, i) => { c.style.transform = 'translate3d(0,' + (p * speed[i]).toFixed(1) + 'px,0)'; });
    },
    destroy() { if (io) io.disconnect(); }
  };
}

/* 按月份：每月一段，左边是大月份数字，右边是缩略图网格。没有日期的作品放在最后一段 */
export function createMonths(list, ctx) {
  const tl = h('div', { class: 'tl' });
  const groups = {}, keys = [];
  list.forEach((w, k) => {
    const key = w.date ? w.date.slice(0, 7) : 'none';
    if (!groups[key]) { groups[key] = []; keys.push(key); }
    groups[key].push([w, k]);
  });
  keys.sort((a, b) => (a === 'none' ? 1 : b === 'none' ? -1 : 0)); // 未标日期的放最后，其余保持列表里的顺序
  keys.forEach((key) => {
    const mo = h('section', { class: 'mo' });
    const head = h('div', { class: 'mo-h' });
    if (key === 'none') {
      head.append(h('span', { class: 'mo-m mo-none' }, '未标日期'), h('span', { class: 'mo-n' }, groups[key].length + ' 件'));
    } else {
      head.append(h('span', { class: 'mo-m' }, key.slice(5)), h('span', null, h('span', { class: 'mo-y' }, key.slice(0, 4)), h('span', { class: 'mo-n' }, groups[key].length + ' 件')));
    }
    mo.appendChild(head);
    const g = h('div', { class: 'mo-g' });
    groups[key].forEach(([w, k]) => { const cd = card(w, k, true, ctx); cd.setAttribute('data-k', k); g.appendChild(cd); });
    mo.appendChild(g);
    tl.appendChild(mo);
  });
  const io = reveal(tl);
  return { el: tl, tick() {}, layout() {}, needsRebuild: () => false, destroy() { if (io) io.disconnect(); } };
}
