/* 作品页的大图查看窗：左边看图，右边是说明。
   左右拖动换一张，往下拖关闭；键盘左右键翻页，Esc 关闭；打开时锁住页面滚动，关闭后把焦点还给原来的元素。
   图片只在打开时加载，关闭后立刻释放。
   条目形状：{ src, title, date, catName, tint, ai, caption, link, tag } */
import { h, icon } from '../core/util.js';
import { clamp, buzz, isSimple } from '../core/raf.js';

const safeLink = (u) => (typeof u === 'string' && /^https?:\/\//i.test(u.trim()) ? u.trim() : null);

let built = null;

function build() {
  const img = h('img', { class: 'lb-img', alt: '', draggable: 'false' });
  const stage = h('div', { class: 'lb-stage' }, img);
  const closeBtn = h('button', { class: 'lb-x', type: 'button', 'aria-label': '关闭' }, icon('close', 18));
  const dot = h('i');
  const cat = h('span', { class: 'lb-c' }, dot, h('span'));
  const title = h('h2', { class: 'lb-t', id: 'lb-title' });
  const date = h('p', { class: 'lb-d' });
  const ai = h('span', { class: 'lb-ai', hidden: true }, '由 AI 生成');
  const cap = h('p', { class: 'lb-p' });
  const act = h('div', { class: 'lb-act' });
  const prev = h('button', { class: 'wk-rb', type: 'button', 'aria-label': '上一件' }, icon('arrow', 16));
  const next = h('button', { class: 'wk-rb', type: 'button', 'aria-label': '下一件' }, icon('arrow', 16));
  prev.firstChild.style.transform = 'scaleX(-1)';
  const no = h('span', { class: 'lb-n' });
  const nav = h('div', { class: 'lb-nav' }, prev, no, next);
  const hint = h('p', { class: 'lb-hint' }, '左右拖动换一件，往下拖关闭');
  const side = h('aside', { class: 'lb-side' }, closeBtn, cat, title, date, ai, cap, act, nav, hint);
  const root = h('div', { class: 'lb', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'lb-title' }, stage, side);
  document.body.appendChild(h('div', { class: 'wkp' }, root)); /* 外面套一层 wkp，样式只在本页生效 */
  return { root, img, stage, closeBtn, cat, dot, title, date, ai, cap, act, prev, next, no, nav, hint };
}

export function openLightbox(list, start, opener, onClose) {
  if (!list || !list.length) return;
  const L = built || (built = build());
  let cur = clamp(start || 0, 0, list.length - 1);
  let moved = false, isOpen = true, g = null, releaseT = 0;

  function fill(dir) {
    const w = list[cur];
    L.img.classList.remove('ready');
    if (dir && !isSimple()) {
      L.img.classList.add('drag');
      L.img.style.transform = 'translate3d(' + (dir * 60) + 'px,0,0) scale(.96)';
      void L.img.offsetWidth;
      L.img.classList.remove('drag');
    } else L.img.style.transform = '';
    const pre = new Image();
    const src = w.src;
    pre.onload = () => {
      if (!isOpen || list[cur] !== w) return;
      L.img.src = src;
      requestAnimationFrame(() => { L.img.style.transform = ''; L.img.classList.add('ready'); });
    };
    pre.onerror = () => { console.warn('[Spark Light] 找不到图片：' + src); };
    pre.src = src;
    L.img.alt = w.title || '';
    L.root.style.setProperty('--tint', w.tint || '200,200,210');
    L.cat.lastChild.textContent = w.catName || '';
    L.cat.hidden = !w.catName;
    L.title.textContent = w.title || '未命名';
    L.date.textContent = w.dateText || '';
    L.date.hidden = !w.dateText;
    L.ai.hidden = !w.ai;
    L.cap.textContent = w.caption || '';
    L.cap.hidden = !w.caption;
    L.act.textContent = '';
    const lk = safeLink(w.link);
    if (lk) L.act.appendChild(h('a', { class: 'sl-btn sl-btn--ghost', href: lk, target: '_blank', rel: 'noopener noreferrer' }, '查看链接'));
    L.no.textContent = (cur + 1) + ' / ' + list.length;
    const single = list.length < 2;
    L.nav.hidden = single;
    L.hint.textContent = single ? '往下拖关闭' : '左右拖动换一件，往下拖关闭';
    L.prev.disabled = cur === 0;
    L.next.disabled = cur === list.length - 1;
  }
  function go(d) { const n = cur + d; if (n < 0 || n >= list.length) return; cur = n; buzz(5); fill(d); }

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'Tab') {
      const f = Array.from(L.root.querySelectorAll('a[href],button:not([disabled])')).filter((x) => !x.hidden && x.offsetParent !== null);
      if (!f.length) return;
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  }
  function close() {
    if (!isOpen) return;
    isOpen = false;
    L.root.classList.remove('on');
    L.root.style.removeProperty('--fade');
    document.body.classList.remove('sl-lock');
    document.removeEventListener('keydown', onKey);
    if (onClose) { try { onClose(cur); } catch (e) { console.error(e); } }
    L.closeBtn.onclick = L.prev.onclick = L.next.onclick = null;
    L.stage.onclick = L.stage.onpointerdown = L.stage.onpointermove = L.stage.onpointerup = L.stage.onpointercancel = null;
    clearTimeout(releaseT);
    /* 等关闭动画播完再释放图片，手机里不留着大图 */
    releaseT = setTimeout(() => { if (!isOpen) { L.img.removeAttribute('src'); L.img.style.transform = ''; } }, 520);
    if (opener && opener.focus) { try { opener.focus({ preventScroll: true }); } catch (e) { /* 元素已不在页面 */ } }
  }

  L.closeBtn.onclick = close;
  L.prev.onclick = () => go(-1);
  L.next.onclick = () => go(1);
  L.stage.onclick = (e) => { if (!moved && e.target === L.stage) close(); };
  L.stage.onpointerdown = (e) => { if (e.button > 0) return; g = { x: e.clientX, y: e.clientY, on: false, ax: '', id: e.pointerId, dx: 0, dy: 0 }; };
  L.stage.onpointermove = (e) => {
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if (!g.on) {
      if (Math.hypot(dx, dy) < 8) return;
      g.on = true; moved = true; g.ax = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      try { L.stage.setPointerCapture(e.pointerId); } catch (_) { /* 忽略 */ }
      L.img.classList.add('drag');
    }
    g.dx = dx; g.dy = dy;
    if (g.ax === 'x') {
      const edge = (dx > 0 && cur === 0) || (dx < 0 && cur === list.length - 1);
      L.img.style.transform = 'translate3d(' + (edge ? dx * .3 : dx).toFixed(1) + 'px,0,0) rotate(' + (dx * .012).toFixed(2) + 'deg)';
    } else {
      const y = Math.max(0, dy);
      L.img.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0) scale(' + (1 - Math.min(y / 1400, .15)).toFixed(3) + ')';
      L.root.style.setProperty('--fade', (1 - Math.min(y / 600, .6)).toFixed(3));
    }
  };
  const end = () => {
    if (!g) return;
    const G = g; g = null;
    setTimeout(() => { moved = false; }, 60);
    if (!G.on) return;
    L.img.classList.remove('drag');
    L.root.style.removeProperty('--fade');
    if (G.ax === 'x' && Math.abs(G.dx) > 70) {
      const d = G.dx < 0 ? 1 : -1, n = cur + d;
      if (n >= 0 && n < list.length) { go(d); return; }
    }
    if (G.ax === 'y' && G.dy > 110) { close(); return; }
    L.img.style.transform = '';
  };
  L.stage.onpointerup = end; L.stage.onpointercancel = end;

  clearTimeout(releaseT);
  fill(0);
  L.root.classList.add('on');
  document.body.classList.add('sl-lock');
  document.addEventListener('keydown', onKey);
  setTimeout(() => { if (isOpen) L.closeBtn.focus({ preventScroll: true }); }, 50);
  /* 页面被关闭或切走时也释放 */
  addEventListener('pagehide', () => { if (isOpen) { L.img.removeAttribute('src'); } }, { once: true });
}
