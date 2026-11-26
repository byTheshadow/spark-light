/* 全站共用外壳：顶栏、导航与设置弹层、底部固定的排单状态与下单入口。
   外壳只依赖 core/ 和 data/，不依赖任何页面的代码；外壳出错也不会影响页面本身。 */
import { h, clear, icon, store, root, placeholder, errorBox } from './util.js';
import { loadData } from './data.js';
import { mountRui } from './rui.js';
import './spark.js';   /* 弹层打开时的星光迸发，失败只记控制台 */

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
    if (window.SLSpark) window.SLSpark.burst();
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
  const prev = html.getAttribute('data-theme');
  store('sl.theme', t.id);
  if (prev && prev !== t.id) {
    /* 每个主题拥有独立完整的界面结构与交互，切换后直接重载当前页以干净挂载新世界观 */
    location.reload();
    return;
  }
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
window.SLSwitchTheme = function (themeId) {
  const t = (window.SL_THEMES || []).find((x) => x.id === themeId && x.status === 'ready');
  if (!t) return;
  applyTheme(t);
};

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
  /* 外壳形态由主题声明（themes/registry.js 的 chrome）。主界面永远用它自己那一套。 */
  const themeId = html.getAttribute('data-theme');
  const theme = (window.SL_THEMES || []).filter((t) => t.id === themeId)[0];
  /* 街机首页会替换掉原首页的整套导航，因此保留共享胶囊作为主题切换入口。 */
  const chromeKind = noHeader && themeId !== 't3-arcade' ? 'home' : ((theme && theme.chrome) === 'pill' ? 'pill' : 'bar');
  const isPill = chromeKind === 'pill';

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

  /* ---------- 顶部胶囊（主题 chrome: 'pill'）---------- */
  let pillBtn = null, navPanel = null, chromeWrap = null;
  let panelOpen = false, hoverT = 0, closeT = 0;
  if (isPill) {
    pillBtn = h('button', {
      class: 'sl-pill-btn', type: 'button', 'aria-expanded': 'false', 'aria-haspopup': 'true',
      'aria-controls': 'sl-nav-panel', 'aria-label': '打开导航'
    },
      h('span', { class: 'sl-pill-brand' }, 'Spark Light'),
      h('span', { class: 'sl-pill-star', 'aria-hidden': 'true' }));
    navPanel = h('nav', { class: 'sl-nav-panel', id: 'sl-nav-panel', 'aria-label': '页面导航' });
    chromeWrap = h('div', { class: 'sl-chrome' }, h('div', { class: 'sl-nav-veil', 'aria-hidden': 'true' }), pillBtn, navPanel);
  }

  const hoverable = () => !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  function openPanel() {
    if (!isPill || panelOpen) return;
    panelOpen = true;
    clearTimeout(closeT);
    navPanel.classList.add('on');
    const veil = chromeWrap.querySelector('.sl-nav-veil');
    if (veil) veil.classList.add('on');
    pillBtn.setAttribute('aria-expanded', 'true');
    doc.addEventListener('keydown', onPanelKey);
  }
  function closePanel(restoreFocus) {
    if (!isPill || !panelOpen) return;
    panelOpen = false;
    clearTimeout(hoverT); clearTimeout(closeT);
    navPanel.classList.remove('on');
    const veil = chromeWrap.querySelector('.sl-nav-veil');
    if (veil) veil.classList.remove('on');
    pillBtn.setAttribute('aria-expanded', 'false');
    doc.removeEventListener('keydown', onPanelKey);
    if (restoreFocus) { try { pillBtn.focus({ preventScroll: true }); } catch (e) { /* 忽略 */ } }
  }
  function onPanelKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); closePanel(true); return; }
    if (e.key !== 'Tab') return;
    const f = [pillBtn].concat(Array.from(navPanel.querySelectorAll('a[href],button:not([disabled])')));
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* 面板内容来自 data/site.json 的 nav；当前页高亮。 */
  function fillPanel(site) {
    const nav = (Array.isArray(site.nav) ? site.nav : []).filter((n) => n && n.id);
    clear(navPanel);
    navPanel.appendChild(h('div', { class: 'sl-panel-head', 'aria-hidden': 'true' }, h('b', null, '去哪'), h('em', null, 'menu')));
    const dots = h('div', { class: 'sl-panel-dots', 'aria-hidden': 'true' },
      h('i', { class: 'sl-panel-cs s1' }), h('i', { class: 'sl-panel-cs s2' }),
      h('i', { class: 'sl-panel-dot d1' }), h('i', { class: 'sl-panel-dot d2' }),
      h('i', { class: 'sl-panel-dot d3' }), h('i', { class: 'sl-panel-dot d4' }));
    navPanel.appendChild(dots);
    const cur = pageId;
    nav.forEach((n) => {
      const here = n.id === cur;
      const row = h('a', {
        class: 'sl-panel-row', href: root + (n.path || ''), 'aria-current': here ? 'page' : null
      },
        here ? h('span', { class: 'sl-panel-star', 'aria-hidden': 'true' }) : null,
        h('span', { class: 'sl-panel-t' }, h('span', null, n.title || n.id), n.desc ? h('small', null, n.desc) : null),
        here ? null : h('i', { class: 'sl-panel-chev', 'aria-hidden': 'true' }));
      row.addEventListener('click', () => closePanel(false));
      navPanel.appendChild(row);
    });
    navPanel.append(
      h('div', { class: 'sl-panel-div', 'aria-hidden': 'true' }, h('i')),
      h('button', { class: 'sl-panel-row', type: 'button', onclick: () => { closePanel(false); if (window.SLRui) window.SLRui.open(); } },
        h('span', { class: 'sl-panel-t' }, h('span', null, '问问灵魂侍从 RUI'), h('small', null, '解答价目、流程、排单与营业须知')),
        h('i', { class: 'sl-panel-chev', 'aria-hidden': 'true' })),
      h('button', { class: 'sl-panel-row', type: 'button', onclick: () => { closePanel(false); navSheet.open(pillBtn); } },
        h('span', { class: 'sl-panel-t' }, h('span', null, '更多与设置'), h('small', null, '简化动效、主题、主界面各章')),
        h('i', { class: 'sl-panel-chev', 'aria-hidden': 'true' })));
  }

  if (noHeader) {
    doc.body.prepend(skip);
    doc.body.appendChild(bar);
  } else if (isPill) {
    statusBtn.classList.add('sl-dock-state');
    orderBtn.classList.add('sl-dock-order');
    pillBtn.addEventListener('click', () => { if (panelOpen) closePanel(true); else openPanel(); });
    chromeWrap.addEventListener('pointerenter', () => {
      if (!hoverable()) return;
      clearTimeout(closeT); clearTimeout(hoverT);
      hoverT = setTimeout(openPanel, 120);
    });
    chromeWrap.addEventListener('pointerleave', () => {
      if (!hoverable()) return;
      clearTimeout(hoverT);
      closeT = setTimeout(() => closePanel(false), 220);
    });
    doc.addEventListener('pointerdown', (e) => {
      if (panelOpen && !chromeWrap.contains(e.target)) closePanel(false);
    }, true);
    chromeWrap.querySelector('.sl-nav-veil').addEventListener('click', () => closePanel(false));
    window.addEventListener('pagehide', () => closePanel(false));
    doc.body.prepend(skip, chromeWrap);
    doc.body.appendChild(h('div', { class: 'sl-dock' }, statusBtn, orderBtn));
  } else {
    doc.body.prepend(skip, head);
    doc.body.appendChild(bar);
  }

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
      /* 主界面各章的快捷入口（章节清单来自 data/site.json 的 chapters，主界面悬浮球菜单用同一份） */
      const chs = (Array.isArray(site.chapters) ? site.chapters : []).filter((c) => c && c.title && /^[A-Za-z][\w-]*$/.test(String(c.id || '')));
      if (chs.length) navSec.appendChild(h('div', { class: 'sl-sheet-sec' }, h('h3', null, '主界面各章'),
        h('div', { class: 'sl-chips' }, chs.map((c) => h('a', { class: 'sl-chip', href: root + '#' + c.id, onclick: close }, c.title)))));
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
    body.appendChild(h('div', { class: 'sl-sheet-sec', style: 'display:flex;gap:10px;flex-wrap:wrap' },
      h('button', { class: 'sl-btn', type: 'button', onclick: () => { close(); if (window.SLRui) window.SLRui.open(); } }, '先问问灵魂侍从 RUI'),
      h('a', { class: 'sl-btn sl-btn--ghost', href: root + '#price', onclick: close }, '先看价目')));
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
    if (isPill) fillPanel(site);
  }).catch(() => {});

  html.setAttribute('data-shell', '1');
  try { mountRui(); } catch (e) { console.error('[Spark Light] RUI 挂载失败：', e); }

  /* ---------- 进站 AI 内容马赛克遮挡提示弹窗（每次会话首次进入且加载页完成后，在屏幕正中弹出） ---------- */
  try {
    if (!sessionStorage.getItem('sl.ai_notice.shown')) {
      const showAiNotice = () => {
        if (sessionStorage.getItem('sl.ai_notice.shown')) return;
        sessionStorage.setItem('sl.ai_notice.shown', '1');

        const scrim = h('div', { class: 'sl-ai-modal-scrim' });
        const titleId = 'sl-ai-modal-t';
        const closeBtn = h('button', { class: 'sl-ai-modal-x', type: 'button', 'aria-label': '关闭' }, icon('close'));
        const okBtn = h('button', { class: 'sl-btn sl-ai-modal-btn', type: 'button' }, '我知道了，开始探索');
        const demo = h('span', { class: 'sl-ai-mosaic', role: 'button', tabindex: '0', title: '点击试一试解封' },
          h('span', { class: 'sl-ai-mosaic-in' }, 'AI 生图 / 漫剧'));
        demo.addEventListener('click', (e) => { e.stopPropagation(); demo.classList.toggle('is-open'); });
        demo.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); demo.classList.toggle('is-open'); } });

        const emblem = h('div', { class: 'sl-ai-modal-emblem', 'aria-hidden': 'true' });
        emblem.innerHTML = '<svg viewBox="0 0 88 88" fill="none" stroke="currentColor">' +
          '<circle cx="44" cy="44" r="39" stroke-width=".75" stroke-dasharray="2 3.5" opacity=".45"/>' +
          '<circle cx="44" cy="44" r="31" stroke-width=".85" opacity=".32"/>' +
          '<path d="M44 8L46.4 20.6L59 23L46.4 25.4L44 38L41.6 25.4L29 23L41.6 20.6Z" fill="currentColor" stroke="none" opacity=".16" transform="translate(0,21)"/>' +
          '<path d="M23 44c9.5-11.5 32.5-11.5 42 0-9.5 11.5-32.5 11.5-42 0z" stroke-width="1.25"/>' +
          '<circle cx="44" cy="44" r="7.5" stroke-width="1.15"/>' +
          '<path d="M44 38.5c.4 3.4 2.1 5.1 5.5 5.5-3.4.4-5.1 2.1-5.5 5.5-.4-3.4-2.1-5.1-5.5-5.5 3.4-.4 5.1-2.1 5.5-5.5z" fill="currentColor" stroke="none"/>' +
          '<circle cx="44" cy="5" r="1.8" fill="currentColor" stroke="none" opacity=".65"/>' +
          '<circle cx="44" cy="83" r="1.8" fill="currentColor" stroke="none" opacity=".65"/>' +
          '<circle cx="5" cy="44" r="1.8" fill="currentColor" stroke="none" opacity=".65"/>' +
          '<circle cx="83" cy="44" r="1.8" fill="currentColor" stroke="none" opacity=".65"/>' +
          '</svg>';

        const modal = h('div', { class: 'sl-ai-modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId, tabindex: '-1' },
          closeBtn,
          emblem,
          h('p', { class: 'sl-ai-modal-sub' }, 'ASTRA · CONTENT NOTICE'),
          h('h2', { class: 'sl-ai-modal-title', id: titleId }, '入站温馨提示'),
          h('div', { class: 'sl-ai-modal-div', 'aria-hidden': 'true' }, h('i')),
          h('p', { class: 'sl-ai-modal-p' },
            '站内部分板块含有 ',
            h('strong', { class: 'sl-hl' }, 'AI 生图 / 漫剧'),
            ' 相关内容。为防止老师触雷，相关文字与画面均已默认采用',
            h('strong', { class: 'sl-hl' }, '马赛克遮挡'),
            '。'),
          h('div', { class: 'sl-ai-modal-demo' },
            h('span', { class: 'sl-ai-modal-demo-lbl' }, '轻触右侧马赛克即可试玩解封：'),
            demo),
          okBtn
        );

        let isOpen = true;
        function close() {
          if (!isOpen) return;
          isOpen = false;
          scrim.classList.remove('on');
          modal.classList.remove('on');
          doc.body.classList.remove('sl-lock');
          doc.removeEventListener('keydown', onKey);
          setTimeout(() => { scrim.remove(); modal.remove(); }, 420);
        }
        function onKey(e) {
          if (e.key === 'Escape') { e.preventDefault(); close(); }
        }
        scrim.addEventListener('click', close);
        closeBtn.addEventListener('click', close);
        okBtn.addEventListener('click', close);
        doc.body.append(scrim, modal);
        doc.body.classList.add('sl-lock');
        doc.addEventListener('keydown', onKey);
        requestAnimationFrame(() => {
          scrim.classList.add('on');
          modal.classList.add('on');
          if (window.SLSpark) window.SLSpark.burst(window.innerWidth / 2, window.innerHeight / 2, { n: 14 });
          setTimeout(() => okBtn.focus(), 60);
        });
      };

      const waitLoaderThenShow = () => {
        const st = html.getAttribute('data-loader');
        if (st === 'done' || st === 'skip' || (!st && !doc.getElementById('slxLoad'))) {
          setTimeout(showAiNotice, 220);
          return true;
        }
        return false;
      };
      if (!waitLoaderThenShow()) {
        const obs = new MutationObserver(() => {
          if (waitLoaderThenShow()) obs.disconnect();
        });
        obs.observe(html, { attributes: true, attributeFilter: ['data-loader'] });
      }
    }
  } catch (e) { /* 隐私模式忽略 */ }
}
