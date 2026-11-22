/* 作品与碎碎念页的入口脚本。本页只依赖 core/ 与 data/，不依赖其他页面。
   作品：data/works.json + assets/works/<分类>/<文件名>
   碎碎念：data/thoughts.json + assets/thoughts/<文件名> */
import { loadData } from '../core/data.js';
import { h, clear, icon, root, errorBox } from '../core/util.js';
import { renderStub } from '../core/page-stub.js';

renderStub('works');
const $ = (id) => document.getElementById(id);
const doc = document;

/* 外链只接受 http(s)，避免数据里写错或被写入奇怪的协议 */
const safeLink = (u) => (typeof u === 'string' && /^https?:\/\//i.test(u.trim()) ? u.trim() : null);
const workSrc = (it) => root + 'assets/works/' + encodeURIComponent(it.category) + '/' + encodeURIComponent(it.file);
const thoughtSrc = (it) => root + 'assets/thoughts/' + encodeURIComponent(it.image);
const fmtDate = (d) => { const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(d || '')); return m ? m[1] + '.' + m[2].padStart(2, '0') + '.' + m[3].padStart(2, '0') : String(d || ''); };

/* ---------- 大图查看 ---------- */
const Box = (function () {
  let list = [], idx = 0, opener = null, isOpen = false;
  const img = h('img', { class: 'wk-box-img', alt: '' });
  const title = h('h3', { class: 'wk-box-title', id: 'wk-box-title' });
  const meta = h('p', { class: 'wk-box-meta' });
  const cap = h('p', { class: 'wk-box-cap' });
  const act = h('div', { class: 'wk-box-act' });
  const closeBtn = h('button', { class: 'sl-iconbtn wk-box-x', type: 'button', 'aria-label': '关闭大图' }, icon('close'));
  const prev = h('button', { class: 'sl-iconbtn wk-box-nav wk-box-prev', type: 'button', 'aria-label': '上一张' }, icon('arrow'));
  const next = h('button', { class: 'sl-iconbtn wk-box-nav wk-box-next', type: 'button', 'aria-label': '下一张' }, icon('arrow'));
  const panel = h('div', { class: 'wk-box', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'wk-box-title', tabindex: '-1' },
    closeBtn, h('div', { class: 'wk-box-stage' }, prev, img, next), h('div', { class: 'wk-box-info' }, title, meta, cap, act));
  const scrim = h('div', { class: 'wk-box-scrim' });
  doc.body.append(scrim, panel);

  function show() {
    const it = list[idx];
    img.src = it.src; img.alt = it.title || '';
    title.textContent = it.title || '';
    meta.textContent = [it.catName, it.ai ? 'AI 生成' : null].filter(Boolean).join('，');
    meta.hidden = !meta.textContent;
    cap.textContent = it.caption || ''; cap.hidden = !it.caption;
    clear(act);
    const lk = safeLink(it.link);
    if (lk) act.appendChild(h('a', { class: 'sl-btn sl-btn--ghost', href: lk, target: '_blank', rel: 'noopener noreferrer' }, '查看链接'));
    prev.hidden = next.hidden = list.length < 2;
  }
  function step(d) { idx = (idx + d + list.length) % list.length; show(); }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowLeft' && list.length > 1) step(-1);
    else if (e.key === 'ArrowRight' && list.length > 1) step(1);
    else if (e.key === 'Tab') {
      const f = Array.from(panel.querySelectorAll('a[href],button:not([hidden])')).filter((x) => !x.hidden);
      if (!f.length) return;
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && doc.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && doc.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  }
  function open(items, i, from) {
    list = items; idx = i; opener = from || doc.activeElement; isOpen = true; show();
    scrim.classList.add('on'); panel.classList.add('on'); doc.body.classList.add('sl-lock');
    doc.addEventListener('keydown', onKey); setTimeout(() => closeBtn.focus(), 30);
  }
  function close() {
    if (!isOpen) return; isOpen = false;
    scrim.classList.remove('on'); panel.classList.remove('on'); doc.body.classList.remove('sl-lock');
    doc.removeEventListener('keydown', onKey); if (opener && opener.focus) opener.focus();
  }
  closeBtn.addEventListener('click', close); scrim.addEventListener('click', close);
  prev.addEventListener('click', () => step(-1)); next.addEventListener('click', () => step(1));
  return { open };
})();

/* ---------- 作品 ---------- */
async function works() {
  const data = await loadData('works');
  const grid = $('wk-grid'), filters = $('wk-filters');
  const cats = Array.isArray(data.categories) ? data.categories : [];
  const catName = (id) => (cats.find((c) => c.id === id) || {}).name || id;
  const items = (Array.isArray(data.items) ? data.items : []).filter((i) => i && i.file && i.category)
    .map((i) => ({ ...i, src: workSrc(i), catName: catName(i.category) }));

  clear(grid);
  if (!items.length) {
    filters.hidden = true;
    grid.appendChild(h('p', { class: 'sl-empty' }, '作品还没有上架，过一阵再来看看。'));
    return;
  }

  let cur = 'all';
  const count = (id) => items.filter((i) => id === 'all' || i.category === id).length;
  const chips = [['all', '全部']].concat(cats.filter((c) => count(c.id) > 0).map((c) => [c.id, c.name]));
  /* 数据里出现了没登记的分类，也要能看到 */
  items.forEach((i) => { if (!chips.some((c) => c[0] === i.category)) chips.push([i.category, i.catName]); });

  function draw() {
    const shown = items.filter((i) => cur === 'all' || i.category === cur);
    clear(grid);
    shown.forEach((it, k) => {
      const media = h('span', { class: 'wk-media' });
      const im = h('img', { src: it.src, alt: '', loading: 'lazy', decoding: 'async' });
      im.addEventListener('error', () => { console.warn('[Spark Light] 找不到图片：' + it.src); im.remove(); media.classList.add('wk-missing'); });
      media.appendChild(im);
      const cap = h('span', { class: 'wk-cap' },
        h('span', { class: 'wk-title' }, it.title || '未命名'),
        it.ai ? h('span', { class: 'sl-tag' }, 'AI 生成') : null);
      const card = h('button', { class: 'wk-card', type: 'button', 'aria-label': (it.title || '未命名') + (it.ai ? '，AI 生成' : '') + '，查看大图' }, media, cap);
      card.addEventListener('click', () => Box.open(shown, k, card));
      grid.appendChild(card);
    });
  }
  clear(filters);
  chips.forEach(([id, name]) => {
    const b = h('button', { class: 'wk-chip', type: 'button', 'aria-pressed': String(id === cur) }, name, h('span', { class: 'wk-n' }, String(count(id))));
    b.addEventListener('click', () => { cur = id; filters.querySelectorAll('.wk-chip').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); draw(); });
    filters.appendChild(b);
  });
  draw();
}

/* ---------- 碎碎念 ---------- */
async function thoughts() {
  const data = await loadData('thoughts');
  const slot = $('th-root');
  const items = (Array.isArray(data.items) ? data.items : []).filter((i) => i && (i.text || i.image))
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  clear(slot);
  if (!items.length) { slot.appendChild(h('p', { class: 'sl-empty' }, '还没有碎碎念。')); return; }
  slot.appendChild(h('ol', { class: 'th-list' }, items.map((it) => {
    const li = h('li', { class: 'th-item' },
      h('time', { class: 'th-date', datetime: String(it.date || '') }, fmtDate(it.date)),
      h('div', { class: 'th-body' }, it.text ? h('p', { class: 'th-text' }, it.text) : null));
    if (it.image) {
      const im = h('img', { class: 'th-img', src: thoughtSrc(it), alt: '', loading: 'lazy', decoding: 'async' });
      im.addEventListener('error', () => { console.warn('[Spark Light] 找不到图片：' + im.src); im.remove(); });
      li.querySelector('.th-body').appendChild(im);
    }
    return li;
  })));
}

[['wk-grid', works], ['th-root', thoughts]].forEach(([id, fn]) => {
  fn().catch((e) => { const el = $(id); if (el) { clear(el); el.appendChild(errorBox('这一块读取失败：' + (e.file || ''), e.message)); } });
});
