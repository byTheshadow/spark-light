/* 作品与碎碎念页的入口脚本。本页只依赖 core/、data/ 和 works/ 里的模块，不依赖其他页面。
   作品：data/works.json + assets/works/<分类>/<文件名>
   碎碎念：data/thoughts.json + assets/thoughts/<文件名>
   写法见 data/README.md。 */
import { loadData } from '../core/data.js';
import { h, clear, root, errorBox } from '../core/util.js';
import { renderStub } from '../core/page-stub.js';
import { createLoop, isSimple, buzz } from '../core/raf.js';
import { createCF } from './view-cf.js';
import { createWall, createMonths } from './view-grid.js';
import { openLightbox } from './lightbox.js';

renderStub('works');
const $ = (id) => document.getElementById(id);

const workSrc = (it) => root + 'assets/works/' + encodeURIComponent(it.category) + '/' + encodeURIComponent(it.file);
const thoughtSrc = (it) => root + 'assets/thoughts/' + encodeURIComponent(it.image);

/* 日期：接受 年-月-日 或 年-月；写错的当作没有日期 */
function parseDate(d) {
  const m = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/.exec(String(d || '').trim());
  if (!m) return null;
  const mo = +m[2], day = m[3] ? +m[3] : 1;
  if (mo < 1 || mo > 12 || day < 1 || day > 31) return null;
  const p2 = (x) => String(x).padStart(2, '0');
  return { iso: m[1] + '-' + p2(mo) + '-' + p2(day), text: m[1] + '.' + p2(mo) + (m[3] ? '.' + p2(day) : ''), short: m[1] + '.' + p2(mo), hasDay: !!m[3], day: p2(day), month: p2(mo) };
}

/* ---------- 分类的外观：图标、色调、英文名。数据里没写的用默认 ---------- */
const TINTS = { all: '200,200,210', divination: '200,190,255', tuning: '176,222,214', 'web-games': '150,214,206', oc: '241,206,222', ai: '236,190,210' };
const FALLBACK_TINTS = ['200,190,255', '150,214,206', '236,190,210', '230,210,160', '170,200,240'];
const EN = { all: 'all works', divination: 'divination', tuning: 'pendulum', 'web-games': 'web & games', oc: 'oc', ai: 'ai works' };

/* 图标是写死的可信 SVG 片段；class="f" 是填充色（跟随主题），其余只描线 */
const ICONS = {
  all: '<g class="e-all"><circle class="e-ring" cx="50" cy="50" r="30"/><circle cx="50" cy="20" r="3" style="--i:0" fill="currentColor"/><circle cx="78.5" cy="40.7" r="3" style="--i:1" fill="currentColor"/><circle cx="67.6" cy="74.3" r="3" style="--i:2" fill="currentColor"/><circle cx="32.4" cy="74.3" r="3" style="--i:3" fill="currentColor"/><circle cx="21.5" cy="40.7" r="3" style="--i:4" fill="currentColor"/></g>',
  divination: '<g class="e-side"><rect x="34" y="22" width="32" height="48" rx="3" opacity=".35"/></g><g class="e-side r"><rect x="34" y="22" width="32" height="48" rx="3" opacity=".35"/></g><g class="e-card"><rect class="f" x="32" y="20" width="36" height="54" rx="3.5"/><g class="e-back"><path d="M37 25h26v44H37z" stroke-dasharray="2 2.5"/><path d="M50 33l3 14-3 14-3-14z"/></g><g class="e-face"><path d="M56 40a9 9 0 1 1-8-9a7 7 0 0 0 8 9z"/><path d="M40 62h20M43 66h14"/></g></g>',
  web: '<rect class="f" x="18" y="24" width="64" height="52" rx="5"/><path d="M18 34h64"/><circle cx="24" cy="29" r="1.4" fill="currentColor"/><circle cx="29" cy="29" r="1.4" fill="currentColor"/><path class="e-ln" d="M26 44h26"/><path class="e-ln" d="M30 51h34"/><path class="e-ln" d="M30 58h18"/><path class="e-ln" d="M26 65h22"/><rect class="e-blk" x="58" y="54" width="16" height="14" rx="2" fill="rgba(150,214,206,.6)" stroke="none"/><path class="e-caret" d="M52 61v8"/>',
  tuning: '<path d="M50 14v-4M40 14h20"/><path class="e-arc" d="M25 72Q50 86 75 72"/><g class="e-pend"><path d="M50 14v46"/><path class="f" d="M50 60l7 6-7 14-7-14z"/><path d="M50 66v8" opacity=".5"/></g>',
  ai: '<defs><clipPath id="wk-cpf"><rect x="16" y="30" width="68" height="40"/></clipPath></defs><path d="M16 30h68M16 70h68"/><g clip-path="url(#wk-cpf)"><g class="e-strip"><g><rect class="f" x="18" y="35" width="22" height="30" rx="1.5"/><rect class="f" x="46" y="35" width="22" height="30" rx="1.5"/><rect class="f" x="74" y="35" width="22" height="30" rx="1.5"/><rect class="f" x="102" y="35" width="22" height="30" rx="1.5"/><circle class="e-dev" cx="57" cy="48" r="5" fill="rgba(236,190,210,.9)" stroke="none"/><path class="e-dev" d="M48 62l6-6 4 3 6-6 3 3"/></g></g></g><path d="M20 26h4M30 26h4M40 26h4M50 26h4M60 26h4M70 26h4M20 74h4M30 74h4M40 74h4M50 74h4M60 74h4M70 74h4" stroke-width="1.6"/>',
  oc: '<circle class="f" cx="50" cy="36" r="12"/><path class="f" d="M26 76c2-14 12-22 24-22s22 8 24 22z"/><path class="e-twk" d="M74 20l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="currentColor" stroke="none"/><path class="e-twk e-twk2" d="M24 28l1.4 3.4 3.4 1.4-3.4 1.4L24 38l-1.4-3.4-3.4-1.4 3.4-1.4z" fill="currentColor" stroke="none"/>'
};
const iconFor = (id) => ICONS[id === 'web-games' || id === 'vibecoding' ? 'web' : id] || ICONS.all;

/* ---------- 整理数据 ---------- */
const state = { cat: 'all', order: 'desc', view: 'cf', items: [], cats: [], list: [], hasDates: false };
let viewObj = null;
const loop = createLoop();

function normalize(data) {
  const regCats = Array.isArray(data.categories) ? data.categories : [];
  const raw = (Array.isArray(data.items) ? data.items : []).filter((i) => i && i.file && i.category);
  const cats = regCats.filter((c) => c && c.id).map((c) => ({ id: String(c.id), name: c.name || c.id, desc: c.desc, en: c.en }));
  raw.forEach((i) => { if (!cats.some((c) => c.id === i.category)) cats.push({ id: i.category, name: i.category }); }); /* 数据里出现了没登记的分类，也要能看到 */
  cats.forEach((c, k) => { c.tint = TINTS[c.id] || FALLBACK_TINTS[k % FALLBACK_TINTS.length]; c.en = c.en || EN[c.id] || c.id; });
  const catOf = (id) => cats.find((c) => c.id === id);
  const items = raw.map((i, k) => {
    const c = catOf(i.category), d = parseDate(i.date);
    const w = Number(i.w), hh = Number(i.h);
    return {
      id: 'w' + k, cat: i.category, catName: c.name, tint: c.tint, title: i.title || '', caption: i.caption || '', link: i.link || null, ai: i.ai === true,
      src: workSrc(i), date: d ? d.iso : null, dateText: d ? d.text : '', dateShort: d ? d.short : '',
      ar: w > 0 && hh > 0 ? w / hh : 0.8, seq: k
    };
  });
  return { cats: cats.filter((c) => items.some((i) => i.cat === c.id)), items };
}

function currentList() {
  let l = state.items.filter((w) => state.cat === 'all' || w.cat === state.cat);
  if (state.hasDates) {
    const dated = l.filter((w) => w.date), undated = l.filter((w) => !w.date);
    dated.sort((a, b) => (state.order === 'desc' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)) || a.seq - b.seq);
    l = dated.concat(undated);
  }
  return l;
}

/* ---------- 陈列架（分类） ---------- */
function buildShelf() {
  const shelf = $('wk-shelf');
  clear(shelf);
  const tabs = [{ id: 'all', name: '全部', tint: TINTS.all, n: state.items.length }]
    .concat(state.cats.map((c) => ({ id: c.id, name: c.name, tint: c.tint, n: state.items.filter((i) => i.cat === c.id).length })));
  tabs.forEach((t) => {
    const b = h('button', { class: 'cab', type: 'button', 'data-id': t.id, 'aria-pressed': String(t.id === state.cat), 'aria-label': t.name + '，' + t.n + ' 件' });
    b.style.setProperty('--tint', t.tint);
    const em = h('span', { class: 'em' });
    em.innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true">' + iconFor(t.id) + '</svg>'; /* 写死的可信片段 */
    b.append(em, h('span', { class: 'nm' }, t.name), h('span', { class: 'n' }, String(t.n)));
    b.addEventListener('click', () => { buzz(5); setCat(t.id, true); });
    shelf.appendChild(b);
  });
}

function setNote() {
  const note = $('wk-note');
  clear(note);
  const c = state.cat === 'all' ? null : state.cats.find((x) => x.id === state.cat);
  note.appendChild(h('span', { class: 'note-k' }, c ? c.en : EN.all));
  const ul = h('ul', { class: 'note-lines' });
  let lines = null;
  if (!c) lines = ['全部作品。选一格看一类，也可以换个方式陈列。'];
  else if (typeof c.desc === 'string' && c.desc.trim()) lines = [c.desc.trim()];
  else if (Array.isArray(c.desc)) lines = c.desc.filter((x) => typeof x === 'string' && x.trim());
  if (lines && lines.length) lines.forEach((t, i) => { const li = h('li', null, t); li.style.setProperty('--i', i); ul.appendChild(li); });
  else { const li = h('li', { class: 'ph' }, '这一类的介绍待站主提供。'); li.style.setProperty('--i', 0); ul.appendChild(li); }
  note.appendChild(ul);
  note.classList.remove('in'); void note.offsetWidth; note.classList.add('in');
}

/* ---------- 控制条：排序与陈列方式 ---------- */
function seg(label, opts, cur, cb) {
  const s = h('div', { class: 'seg', role: 'group', 'aria-label': label });
  s.style.setProperty('--n', opts.length);
  s.style.setProperty('--on', Math.max(0, opts.findIndex((o) => o[0] === cur)));
  opts.forEach((o, i) => {
    const b = h('button', { type: 'button', 'aria-pressed': String(o[0] === cur) }, o[1]);
    b.addEventListener('click', () => {
      s.style.setProperty('--on', i);
      s.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      cb(o[0]);
    });
    s.appendChild(b);
  });
  return s;
}
let ctrlK = null;
function buildCtrl() {
  const ctrl = $('wk-ctrl');
  clear(ctrl);
  ctrlK = h('span', { class: 'ctrl-k' }, h('i'), h('b'), h('span'));
  ctrl.append(ctrlK, h('span', { class: 'sp' }));
  if (state.hasDates) ctrl.appendChild(seg('排序', [['desc', '最新在前'], ['asc', '最早在前']], state.order, (v) => { state.order = v; render(true); }));
  const views = [['cf', '展柜'], ['wall', '瀑布']];
  if (state.hasDates) views.push(['time', '按月份']);
  ctrl.appendChild(seg('陈列方式', views, state.view, (v) => { state.view = v; render(true); }));
  ctrl.hidden = false;
}
function updateCtrlInfo() {
  if (!ctrlK) return;
  const c = state.cat === 'all' ? null : state.cats.find((x) => x.id === state.cat);
  ctrlK.style.setProperty('--tint', c ? c.tint : TINTS.all);
  ctrlK.querySelector('b').textContent = c ? c.name : '全部';
  ctrlK.lastChild.textContent = state.list.length + ' 件';
}

function setCat(id, user) {
  state.cat = id;
  document.querySelectorAll('#wk-shelf .cab').forEach((b) => b.setAttribute('aria-pressed', String(b.getAttribute('data-id') === id)));
  setNote();
  render(user);
}

/* ---------- 渲染当前陈列 ---------- */
const ctx = {
  showCat: true,
  open(i, from) {
    openLightbox(state.list, i, from, (cur) => { if (viewObj && viewObj.go && viewObj.current && viewObj.current() !== cur) viewObj.go(cur); });
  }
};
function render(scrollUp) {
  const wall = $('wk-wall');
  if (viewObj && viewObj.destroy) viewObj.destroy();
  viewObj = null;
  clear(wall);
  state.list = currentList();
  updateCtrlInfo();
  ctx.showCat = state.cat === 'all';
  if (!state.list.length) {
    wall.appendChild(h('div', { class: 'wk-empty' }, h('p', null, '这一类还没有登记作品。'), h('small', null, '站主登记后会出现在这里。')));
  } else {
    const v = state.view === 'time' && !state.hasDates ? 'cf' : state.view;
    viewObj = v === 'cf' ? createCF(state.list, ctx) : v === 'wall' ? createWall(state.list, ctx) : createMonths(state.list, ctx);
    wall.appendChild(viewObj.el);
    if (viewObj.layout) viewObj.layout();
  }
  if (scrollUp) {
    const ctrl = $('wk-ctrl');
    const top = ctrl.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(ctrl).top) || 70);
    if (scrollY > top + 40) scrollTo({ top: top, behavior: isSimple() ? 'auto' : 'smooth' });
  }
}

async function works() {
  const data = await loadData('works');
  const { cats, items } = normalize(data);
  const wall = $('wk-wall');
  clear(wall);
  if (!items.length) {
    $('wk-shelf').hidden = true; $('wk-note').hidden = true;
    wall.appendChild(h('p', { class: 'sl-empty' }, '作品还没有上架，过一阵再来看看。'));
    return;
  }
  state.cats = cats; state.items = items; state.hasDates = items.some((w) => w.date);
  buildShelf(); buildCtrl(); setNote(); render(false);
  loop.add(() => { if (viewObj && viewObj.tick) viewObj.tick(); });
  let rz = 0;
  addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => { if (!viewObj) return; if (viewObj.needsRebuild && viewObj.needsRebuild()) render(false); else if (viewObj.layout) viewObj.layout(); }, 120);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (viewObj && viewObj.layout) viewObj.layout(); });
}

/* ---------- 碎碎念 ---------- */
async function thoughts() {
  const data = await loadData('thoughts');
  const slot = $('th-root');
  const items = (Array.isArray(data.items) ? data.items : []).filter((i) => i && (i.text || i.image))
    .map((i) => ({ ...i, d: parseDate(i.date) }))
    .sort((a, b) => String(b.d ? b.d.iso : '').localeCompare(String(a.d ? a.d.iso : '')));
  clear(slot);
  if (!items.length) { slot.appendChild(h('p', { class: 'sl-empty' }, '还没有碎碎念。')); return; }
  const withImg = items.filter((i) => i.image).map((i) => ({
    src: thoughtSrc(i), title: i.d ? i.d.text : '碎碎念', catName: '碎碎念', tint: '200,190,255', caption: i.text || '', dateText: '', link: null, ai: false, ref: i
  }));
  const ol = h('ol', { class: 'th-list' });
  items.forEach((it) => {
    const dateEl = it.d
      ? h('time', { class: 'th-date', datetime: it.d.iso }, h('b', null, it.d.hasDay ? it.d.day : it.d.month), h('span', null, it.d.hasDay ? it.d.text.slice(0, 7) : it.d.text.slice(0, 4)))
      : h('span', { class: 'th-date' }, h('span', null, '日期待补'));
    const body = h('div', { class: 'th-body' });
    if (it.text) body.appendChild(h('p', { class: 'th-text' }, it.text));
    if (it.image) {
      const idx = withImg.findIndex((x) => x.ref === it);
      const im = h('img', { class: 'th-img', src: thoughtSrc(it), alt: '', loading: 'lazy', decoding: 'async' });
      const btn = h('button', { class: 'th-imgbtn', type: 'button', 'aria-label': '查看配图' }, im);
      im.addEventListener('error', () => { console.warn('[Spark Light] 找不到图片：' + im.src); btn.remove(); });
      btn.addEventListener('click', () => openLightbox(withImg, idx, btn));
      body.appendChild(btn);
    }
    ol.appendChild(h('li', { class: 'th-item' }, dateEl, body));
  });
  slot.appendChild(ol);
}

/* 页眉的大字标记缓慢漂移（简化动效下不动）；与作品陈列共用同一个循环 */
const mark = $('wk-mark');
loop.add(() => {
  if (!mark) return;
  if (isSimple()) { mark.style.transform = ''; mark.style.opacity = ''; return; }
  const y = scrollY;
  if (y > innerHeight) return;
  mark.style.transform = 'translate3d(' + (y * -.12).toFixed(1) + 'px,' + (y * .28).toFixed(1) + 'px,0)';
  mark.style.opacity = String(Math.max(0, 1 - y / 500));
});
loop.start();

[['wk-wall', works], ['th-root', thoughts]].forEach(([id, fn]) => {
  fn().catch((e) => { const el = $(id); if (el) { clear(el); el.appendChild(errorBox('这一块读取失败：' + (e.file || ''), e.message)); } });
});
