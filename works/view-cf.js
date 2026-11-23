/* 作品页的“展柜”：横向的 3D 翻看。拖、甩、滑、方向键都能翻，带惯性并吸附到最近一件。
   只渲染中间 6 件以内的作品，其余隐藏；离开视口时不计算。 */
import { h, icon } from '../core/util.js';
import { clamp, pad2, buzz, isSimple } from '../core/raf.js';

function rbtn(dir, label) {
  const b = h('button', { class: 'wk-rb', type: 'button', 'aria-label': label }, icon('arrow', 15));
  if (dir === 'prev') b.firstChild.style.transform = 'scaleX(-1)';
  return b;
}

/* list 里每一项：{ src, title, ai, ar, tint, catName, dateText }；ctx.open(i) 打开大图 */
export function createCF(list, ctx) {
  const n = list.length;
  const cf = h('div', { class: 'cf' });
  const num = h('span', { class: 'cf-num' });
  const bg = h('div', { class: 'cf-bg', 'aria-hidden': 'true' }, num);
  const stg = h('div', { class: 'cf-stage', tabindex: '0', role: 'group', 'aria-roledescription': '展柜', 'aria-label': '作品展柜。左右拖动或用方向键翻看，回车看大图' });
  const ring = h('div', { class: 'cf-ring' });
  const S = { n, pos: isSimple() ? 0 : -2.6, tgt: 0, vel: 0, act: -1, pd: null, man: false, dragged: false, sd: false, H: 360, A: 300, B: 100, px: 200, dead: false };

  const items = list.map((w, i) => {
    const b = h('button', { class: 'cf-it', type: 'button', tabindex: '-1', 'aria-label': (w.title || '未命名') + (w.catName ? '，' + w.catName : '') });
    b.style.setProperty('--tint', w.tint);
    const setAr = () => b.style.setProperty('--ar', clamp(w.ar, .68, 1.5).toFixed(3));
    setAr();
    const img = h('img', { alt: '', decoding: 'async', draggable: 'false', loading: i < 7 ? 'eager' : 'lazy' });
    img.addEventListener('load', () => { if (img.naturalWidth && img.naturalHeight) { w.ar = img.naturalWidth / img.naturalHeight; setAr(); } });
    img.addEventListener('error', () => { console.warn('[Spark Light] 找不到图片：' + w.src); img.remove(); f.classList.add('wk-missing'); });
    img.src = w.src;
    const f = h('span', { class: 'cf-f' }, img, h('span', { class: 'cf-gl' }), w.ai ? h('span', { class: 'wk-ai' }, '由 AI 生成') : null);
    b.appendChild(f);
    b.addEventListener('click', () => {
      if (S.dragged) return;
      if (i === S.act && Math.abs(S.pos - i) < .35) ctx.open(i, b); else go(i);
    });
    ring.appendChild(b);
    return b;
  });
  stg.append(ring, h('div', { class: 'cf-floor' }));
  cf.append(bg, stg);

  const ccDot = h('i'), ccT = h('span');
  const cc = h('span', { class: 'cf-c' }, ccDot, ccT);
  const ct = h('strong', { class: 'cf-t' }), cd = h('span', { class: 'cf-d' });
  const cap = h('div', { class: 'cf-cap', 'aria-live': 'polite' }, cc, ct, cd);
  cf.appendChild(cap);

  const pv = rbtn('prev', '上一件'), nx = rbtn('next', '下一件');
  const kn = h('span', { class: 'cf-kn' });
  const sc = h('div', { class: 'cf-sc', 'aria-hidden': 'true' });
  for (let i = 0; i < n; i++) { const tk = h('span', { class: 'cf-tk' }); tk.style.left = (n > 1 ? i / (n - 1) * 100 : 50) + '%'; sc.appendChild(tk); }
  sc.appendChild(kn);
  const cn = h('span', { class: 'cf-n' });
  cf.append(h('div', { class: 'cf-bar' }, pv, sc, nx, cn), h('p', { class: 'cf-hint' }, '拖动或左右滑动翻看，点中间那件看大图'));

  function go(i) { const t = clamp(i, 0, n - 1); S.vel = 0; S.man = false; if (t !== S.tgt) buzz(4); S.tgt = t; }
  pv.addEventListener('click', () => go(Math.round(S.tgt) - 1));
  nx.addEventListener('click', () => go(Math.round(S.tgt) + 1));
  stg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(Math.round(S.tgt) + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(Math.round(S.tgt) - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ctx.open(S.act, items[S.act]); }
  });
  stg.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    S.pd = { x: e.clientX, y: e.clientY, lx: e.clientX, t: performance.now(), v: 0, start: S.pos, on: false, id: e.pointerId };
  });
  stg.addEventListener('pointermove', (e) => {
    const p = S.pd; if (!p || e.pointerId !== p.id) return;
    let dx = e.clientX - p.x;
    if (!p.on) {
      if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(e.clientY - p.y)) {
        p.on = true; S.dragged = true; S.vel = 0; p.start = S.pos; p.x = e.clientX; dx = 0;
        try { stg.setPointerCapture(e.pointerId); } catch (_) { /* 忽略 */ }
        stg.classList.add('drag');
      } else return;
    }
    let raw = p.start - dx / S.px; const mx = n - 1;
    if (raw < 0) raw *= .35; else if (raw > mx) raw = mx + (raw - mx) * .35;
    S.pos = raw;
    const now = performance.now();
    p.v = p.v * .4 + (-(e.clientX - p.lx) / S.px / Math.max(1, now - p.t) * 16) * .6;
    p.t = now; p.lx = e.clientX;
  });
  const up = () => {
    const p = S.pd; if (!p) return; S.pd = null; stg.classList.remove('drag');
    if (p.on) {
      S.vel = clamp(p.v, -.8, .8);
      if (Math.abs(S.vel) < .04) { S.vel = 0; S.tgt = clamp(Math.round(S.pos), 0, n - 1); }
      setTimeout(() => { S.dragged = false; }, 60);
    }
  };
  stg.addEventListener('pointerup', up); stg.addEventListener('pointercancel', up);
  stg.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault(); S.vel = 0; S.man = true;
    S.pos = clamp(S.pos + e.deltaX / S.px, -.3, n - .7);
    clearTimeout(S.wt);
    S.wt = setTimeout(() => { if (!S.dead) { S.man = false; S.tgt = clamp(Math.round(S.pos), 0, n - 1); } }, 140);
  }, { passive: false });
  const scrub = (e) => { const r = sc.getBoundingClientRect(); go(Math.round(clamp((e.clientX - r.left) / r.width, 0, 1) * (n - 1))); };
  sc.addEventListener('pointerdown', (e) => { S.sd = true; try { sc.setPointerCapture(e.pointerId); } catch (_) { /* 忽略 */ } scrub(e); });
  sc.addEventListener('pointermove', (e) => { if (S.sd) scrub(e); });
  sc.addEventListener('pointerup', () => { S.sd = false; }); sc.addEventListener('pointercancel', () => { S.sd = false; });

  function layout() {
    const mob = innerWidth < 640;
    const H = mob ? Math.min(innerWidth * .62, innerHeight * .44) : clamp(innerHeight * .5, 260, 460);
    S.H = H; S.A = H * (mob ? .66 : .82); S.B = H * (mob ? .2 : .3); S.px = H * (mob ? .5 : .6);
    cf.style.setProperty('--h', H.toFixed(0) + 'px');
  }
  function setActive(a) {
    const first = S.act < 0; S.act = a;
    const w = list[a];
    items.forEach((it, i) => it.classList.toggle('on', i === a));
    const set = () => {
      if (S.dead) return;
      cc.style.setProperty('--tint', w.tint);
      ccT.textContent = (w.catName || '') + (w.ai ? (w.catName ? '　' : '') + '由 AI 生成' : '');
      ct.textContent = w.title || '未命名';
      cd.textContent = w.dateText || '';
      cap.classList.remove('sw');
    };
    if (first || isSimple()) set(); else { cap.classList.add('sw'); clearTimeout(S.capT); S.capT = setTimeout(set, 170); }
    num.textContent = pad2(a + 1);
    cn.textContent = pad2(a + 1) + ' / ' + pad2(n);
    pv.disabled = a <= 0; nx.disabled = a >= n - 1;
  }

  function tick() {
    const r = cf.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const mx = n - 1;
    if (!S.pd && !S.man) {
      if (S.vel) {
        S.pos += S.vel; S.vel *= .9;
        if (S.pos < 0 || S.pos > mx) S.vel *= .5;
        if (Math.abs(S.vel) < .015) { S.vel = 0; S.tgt = clamp(Math.round(S.pos), 0, mx); }
      } else {
        const dd = S.tgt - S.pos;
        S.pos = (Math.abs(dd) < .0005 || isSimple()) ? S.tgt : S.pos + dd * .13;
      }
    }
    const p = S.pos, A = S.A, B = S.B, H = S.H;
    for (let i = 0; i < n; i++) {
      const it = items[i], d = i - p, ad = Math.abs(d);
      if (ad > 6) { it.style.visibility = 'hidden'; continue; }
      it.style.visibility = '';
      const sg = d < 0 ? -1 : 1, m1 = Math.min(ad, 1), rest = Math.max(ad - 1, 0);
      it.style.transform = 'translate3d(' + (sg * (m1 * A + rest * B)).toFixed(1) + 'px,0,' + (-(m1 * H * .5 + rest * H * .12)).toFixed(1) + 'px) rotateY(' + (-sg * m1 * 50).toFixed(2) + 'deg)';
      it.style.zIndex = String(1000 - Math.round(ad * 20));
      it.style.setProperty('--dim', (Math.min(ad, 4) / 4 * .62).toFixed(3));
    }
    kn.style.left = (mx > 0 ? clamp(p / mx, 0, 1) * 100 : 50).toFixed(2) + '%';
    num.style.transform = 'translate3d(' + (-(p - mx / 2) * 26).toFixed(1) + 'px,' + (r.top * -.08).toFixed(1) + 'px,0)';
    const a = clamp(Math.round(p), 0, mx);
    if (a !== S.act) setActive(a);
  }

  layout();
  setActive(0);
  return {
    el: cf, tick, layout,
    go,
    current: () => S.act,
    destroy() { S.dead = true; clearTimeout(S.wt); clearTimeout(S.capT); }
  };
}
