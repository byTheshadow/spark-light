/* 全站共用外壳：顶栏、导航与设置弹层、底部固定的排单状态与下单入口。
   外壳只依赖 core/ 和 data/，不依赖任何页面的代码；外壳出错也不会影响页面本身。 */
import { h, clear, icon, store, root, placeholder, errorBox } from './util.js';
import { loadData } from './data.js';

const doc = document;
const html = doc.documentElement;

/* ---------- 弹层 ---------- */
function makeSheet(titleText, build) {
  const scrim = h('div', { class: 'sl-scrim' });
  const closeBtn = h('button', { class: 'sl-iconbtn', type: 'button', 'aria-label': '关闭' }, icon('close'));
  const body = h('div', { class: 'sl-sheet-body' });
  const titleId = 'sl-title-' + Math.random().toString(36).slice(2, 8);
  const sheet = h('div', { class: 'sl-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId, tabindex: '-1' },
    h('div', { class: 'sl-sheet-grip', 'aria-hidden': 'true' }),
    h('div', { class: 'sl-sheet-head' }, h('h2', { class: 'sl-sheet-title', id: titleId }, titleText), closeBtn),
    body);
  let opener = null, isOpen = false;

  function focusables() { return Array.from(sheet.querySelectorAll('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])')); }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const f = focusables(); if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function open(from) {
    if (isOpen) return;
    isOpen = true; opener = from || doc.activeElement;
    build(body, close);
    scrim.classList.add('on'); sheet.classList.add('on');
    doc.body.classList.add('sl-lock');
    doc.addEventListener('keydown', onKey);
    setTimeout(() => closeBtn.focus(), 30);
  }
  function close() {
    if (!isOpen) return;
    isOpen = false;
    scrim.classList.remove('on'); sheet.classList.remove('on');
    doc.body.classList.remove('sl-lock');
    doc.removeEventListener('keydown', onKey);
    if (opener && opener.focus) opener.focus();
  }
  scrim.addEventListener('click', close);
  closeBtn.addEventListener('click', close);
  doc.body.append(scrim, sheet);
  return { open, close };
}

/* ---------- 提示条 ---------- */
let toastEl, toastTimer;
function toast(text) {
  if (!toastEl) { toastEl = h('div', { class: 'sl-toast', role: 'status', 'aria-live': 'polite' }); doc.body.appendChild(toastEl); }
  toastEl.textContent = text; toastEl.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('on'), 1800);
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('已复制'); return; } catch (e) { /* 走下面的兜底 */ }
  try {
    const ta = h('textarea', { 'aria-hidden': 'true', style: 'position:fixed;left:-999px;top:0;opacity:0' }); ta.value = text;
    doc.body.appendChild(ta); ta.select(); doc.execCommand('copy'); ta.remove(); toast('已复制');
  } catch (e) { toast('复制失败，请手动选中'); }
}

/* ---------- 动效开关 ---------- */
export function isSimple() { return html.getAttribute('data-motion') === 'simple'; }
function setMotion(simple) {
  store('sl.motion', simple ? 'simple' : 'full');
  html.setAttribute('data-motion', simple ? 'simple' : 'full');
}

/* ---------- 主题切换 ---------- */
function applyTheme(t) {
  store('sl.theme', t.id);
  html.setAttribute('data-theme', t.id);
  let link = doc.getElementById('sl-theme-css');
  if (!link) { link = h('link', { rel: 'stylesheet', id: 'sl-theme-css' }); doc.head.appendChild(link); }
  link.setAttribute('href', root + t.css);
  const pg = html.getAttribute('data-page');
  let pl = doc.getElementById('sl-theme-page-css');
  if (pl) pl.remove();
  if (pg && t.pages && t.pages[pg]) { pl = h('link', { rel: 'stylesheet', id: 'sl-theme-page-css', href: root + t.pages[pg] }); doc.head.appendChild(pl); }
  const m = doc.querySelector('meta[name="theme-color"]'); if (m && t.themeColor) m.setAttribute('content', t.themeColor);
}

/* ---------- 排单状态文字 ---------- */
const STATE_TEXT = { open: '开单中', paused: '暂停接单', full: '已满单', unset: '排单状态待设置' };
function statusText(st) {
  const state = STATE_TEXT[st.state] ? st.state : 'unset';
  let t = STATE_TEXT[state];
  if (state === 'open' && Number.isFinite(st.total) && Number.isFinite(st.taken)) {
    const left = Math.max(0, st.total - st.taken);
    t += '，剩余 ' + left + ' 个名额';
  }
  return { state, text: t };
}

/* ---------- 构建外壳 ---------- */
export function mountShell() {
  const pageId = doc.body.getAttribute('data-page') || 'home';
  const noHeader = doc.body.getAttribute('data-shell-header') === 'off'; // 主界面自带顶栏与悬浮球导航

  const brandPage = h('span', { class: 'sl-brand-page' });
  const menuBtn = h('button', { class: 'sl-iconbtn', type: 'button', 'aria-haspopup': 'dialog', 'aria-label': '打开导航与设置' }, icon('menu'));
  const head = h('header', { class: 'sl-head' },
    h('a', { class: 'sl-brand', href: root, 'aria-label': 'Spark Light 主界面' },
      h('span', { class: 'sl-brand-name' }, 'Spark Light'), brandPage),
    menuBtn);

  const statusBtn = h('button', { class: 'sl-status', type: 'button', 'data-state': 'unset' },
    h('span', { class: 'sl-dot', 'aria-hidden': 'true' }), h('span', { class: 'sl-status-text' }, '排单状态读取中'));
  const orderBtn = h('button', { class: 'sl-btn', type: 'button', 'aria-haspopup': 'dialog' }, '下单与联系');
  const bar = h('div', { class: 'sl-orderbar', role: 'region', 'aria-label': '排单状态与下单入口' }, statusBtn, orderBtn);

  const skip = h('a', { class: 'sl-skip', href: '#main' }, '跳到正文');
  if (noHeader) doc.body.prepend(skip); else doc.body.prepend(skip, head);
  doc.body.appendChild(bar);

  /* 导航与设置 */
  const navSheet = makeSheet('导航与设置', async (body, close) => {
    clear(body);
    const navSec = h('div');
    const setSec = h('div', { class: 'sl-sheet-sec' }, h('h3', null, '设置'));
    body.append(navSec, setSec);

    try {
      const site = await loadData('site');
      navSec.appendChild(h('ul', { class: 'sl-rows' }, site.nav.map((n) =>
        h('li', null, h('a', { class: 'sl-row', href: root + (n.path || ''), 'aria-current': n.id === pageId ? 'page' : null },
          h('span', { class: 'sl-row-main' }, h('span', { class: 'sl-row-title' }, n.title), n.desc ? h('span', { class: 'sl-row-desc' }, n.desc) : null),
          icon('arrow', 18))))));
    } catch (e) {
      navSec.append(errorBox('导航读取失败', e.message), h('p', null, h('a', { href: root }, '回到主界面')));
    }

    /* 动效 */
    const sw = h('button', { class: 'sl-switch', type: 'button', role: 'switch', 'aria-checked': String(isSimple()), 'aria-labelledby': 'sl-motion-lab' });
    sw.addEventListener('click', () => { const next = !isSimple(); setMotion(next); sw.setAttribute('aria-checked', String(next)); });
    setSec.appendChild(h('div', { class: 'sl-row' },
      h('span', { class: 'sl-row-main' }, h('span', { class: 'sl-row-title', id: 'sl-motion-lab' }, '简化动效'), h('span', { class: 'sl-row-desc' }, '关闭漂移、粒子与抖动，更省电。默认跟随系统设置')), sw));

    /* 主题 */
    const themes = window.SL_THEMES || [];
    if (themes.length) {
      const cur = html.getAttribute('data-theme');
      const list = h('ul', { class: 'sl-rows', role: 'radiogroup', 'aria-label': '主题' });
      themes.forEach((t) => {
        const ready = t.status === 'ready';
        const row = h('button', { class: 'sl-row', type: 'button', role: 'radio', 'aria-checked': String(t.id === cur), 'aria-disabled': ready ? null : 'true' },
          h('span', { class: 'sl-row-main' }, h('span', { class: 'sl-row-title' }, t.name), t.en ? h('span', { class: 'sl-row-desc' }, t.en) : null),
          ready ? h('span', { class: 'sl-radio', 'aria-hidden': 'true' }) : h('span', { class: 'sl-tag' }, '之后开放'));
        if (ready) row.addEventListener('click', () => {
          applyTheme(t);
          list.querySelectorAll('[role="radio"]').forEach((r) => r.setAttribute('aria-checked', String(r === row)));
        });
        list.appendChild(h('li', null, row));
      });
      setSec.append(h('div', { style: 'margin-top:14px' }, h('p', { class: 'sl-row-title', style: 'margin-bottom:2px' }, '主题'), list));
    }
  });
  menuBtn.addEventListener('click', () => navSheet.open(menuBtn));

  /* 下单与联系 */
  let status = { state: 'unset' };
  const contactSheet = makeSheet('下单与联系', async (body, close) => {
    clear(body);
    const st = statusText(status);
    body.appendChild(h('p', null, st.text, status.note ? '。' + status.note : ''));
    const chanSec = h('div', { class: 'sl-sheet-sec' }, h('h3', null, '下单渠道'));
    body.appendChild(chanSec);
    try {
      const c = await loadData('contact');
      const list = Array.isArray(c.channels) ? c.channels : [];
      if (!list.length) chanSec.appendChild(h('p', null, placeholder('下单渠道待站主提供')));
      else chanSec.appendChild(h('ul', { class: 'sl-rows' }, list.map((ch) => {
        const main = h('span', { class: 'sl-row-main' }, h('span', { class: 'sl-row-desc' }, ch.label || ''), h('span', { class: 'sl-row-title' }, ch.value || ''), ch.note ? h('span', { class: 'sl-row-desc' }, ch.note) : null);
        if (ch.href) return h('li', null, h('a', { class: 'sl-row', href: ch.href, rel: 'noopener', target: '_blank' }, main, icon('arrow', 18)));
        if (ch.copy && ch.value) return h('li', null, h('button', { class: 'sl-row', type: 'button', 'aria-label': '复制 ' + (ch.label || '') + ' ' + ch.value, onclick: () => copyText(ch.value) }, main, icon('copy', 18)));
        return h('li', null, h('div', { class: 'sl-row' }, main));
      })));
    } catch (e) { chanSec.appendChild(errorBox('联系方式读取失败', e.message)); }
    body.appendChild(h('div', { class: 'sl-sheet-sec' }, h('a', { class: 'sl-btn sl-btn--ghost', href: root + '#price', onclick: close }, '先看价目')));
  });
  /* 页面可以接管“下单与联系”：监听 sl:open-contact 并 preventDefault 即可 */
  const openContact = (from) => { if (doc.dispatchEvent(new CustomEvent('sl:open-contact', { cancelable: true }))) contactSheet.open(from); };
  orderBtn.addEventListener('click', () => openContact(orderBtn));
  statusBtn.addEventListener('click', () => openContact(statusBtn));

  /* 排单状态、当前页名 */
  loadData('status').then((st) => {
    status = st;
    const s = statusText(st);
    statusBtn.setAttribute('data-state', s.state);
    statusBtn.querySelector('.sl-status-text').textContent = s.text;
  }).catch(() => { statusBtn.querySelector('.sl-status-text').textContent = '排单状态暂时读取不到'; });

  loadData('site').then((site) => {
    const n = site.nav.find((x) => x.id === pageId);
    if (n && pageId !== 'home') brandPage.textContent = n.title;
  }).catch(() => {});

  html.setAttribute('data-shell', '1');
}
