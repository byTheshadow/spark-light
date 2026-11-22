/* AI 漫剧页的入口脚本。本页只依赖 core/ 与 data/，不依赖其他页面。
   数据：data/dramas.json（写法见 data/README.md）。两种来源：
     type "bilibili"：登记 BV 号，点开后才创建 B 站外链播放器
     type "images"  ：图床或本站的图片列表，长图连续阅读
   资源释放（站主要求）：关闭观看窗、离开页面、切到后台时，播放器与图片立刻拆掉，不在手机里堆积。
     - 列表页只有封面（懒加载），不会提前创建任何播放器；
     - 视频：关闭时先把 iframe 指到空白页再移除；
     - 图片：只保留视口附近的图片，远离视口的立刻移除，读完关闭窗口则全部移除。 */
import { loadData } from '../core/data.js';
import { h, clear, icon, root, errorBox } from '../core/util.js';
import { renderStub } from '../core/page-stub.js';

renderStub('drama');
const doc = document;
const $ = (id) => doc.getElementById(id);

/* ---------- 数据整理（只信任格式正确的内容） ---------- */
const isUrl = (u) => typeof u === 'string' && /^https?:\/\//i.test(u.trim());
const BV = /^BV[0-9A-Za-z]{10}$/;
const fmtDate = (d) => { const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(d || '')); return m ? m[1] + '.' + m[2].padStart(2, '0') + '.' + m[3].padStart(2, '0') : ''; };
const coverSrc = (it) => (!it.cover ? null : isUrl(it.cover) ? it.cover.trim() : root + 'assets/covers/' + encodeURIComponent(String(it.cover)));
const pageSrc = (it, p) => (isUrl(p) ? String(p).trim() : root + 'assets/drama/' + encodeURIComponent(String(it.id || '')) + '/' + encodeURIComponent(String(p)));

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
  return it;
}

/* ---------- 观看窗 ---------- */
const Viewer = (function () {
  const title = h('h2', { class: 'dr-v-title', id: 'dr-v-title' });
  const count = h('span', { class: 'dr-v-count', 'aria-live': 'polite' });
  const closeBtn = h('button', { class: 'sl-iconbtn dr-v-x', type: 'button', 'aria-label': '关闭' }, icon('close'));
  const head = h('div', { class: 'dr-v-head' }, h('div', { class: 'dr-v-ht' }, title, count), closeBtn);
  const body = h('div', { class: 'dr-v-body' });
  const panel = h('div', { class: 'dr-viewer', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'dr-v-title', tabindex: '-1' }, head, body);
  const scrim = h('div', { class: 'dr-scrim' });
  doc.body.append(scrim, panel);

  let isOpen = false, opener = null, frame = null, io = null, boxes = [], scrollRaf = 0;

  /* 拆掉当前所有重资源 */
  function teardown() {
    if (frame) { try { frame.src = 'about:blank'; } catch (e) { /* 忽略 */ } frame.remove(); frame = null; }
    if (io) { io.disconnect(); io = null; }
    boxes.forEach(unloadBox);
    boxes = [];
    body.removeEventListener('scroll', onScroll);
    clear(body);
    body.scrollTop = 0;
    count.textContent = '';
  }

  /* ----- 视频 ----- */
  function openVideo(it) {
    const src = 'https://player.bilibili.com/player.html?bvid=' + encodeURIComponent(it.bvid) + '&page=' + it.pageNo + '&autoplay=0&high_quality=1&danmaku=0';
    frame = h('iframe', {
      class: 'dr-frame', src, title: '视频：' + (it.title || '未命名'),
      allow: 'fullscreen', allowfullscreen: 'true', scrolling: 'no', frameborder: '0',
      sandbox: 'allow-scripts allow-same-origin allow-popups allow-presentation allow-forms'
    });
    const out = 'https://www.bilibili.com/video/' + it.bvid + '/' + (it.pageNo > 1 ? '?p=' + it.pageNo : '');
    body.appendChild(h('div', { class: 'dr-vwrap' },
      h('div', { class: 'dr-player' }, h('p', { class: 'dr-player-wait' }, '播放器加载中'), frame),
      h('div', { class: 'dr-v-info' },
        it.summary ? h('p', { class: 'dr-v-sum' }, it.summary) : null,
        h('p', { class: 'dr-v-meta' }, '由 AI 生成', fmtDate(it.date) ? '，' + fmtDate(it.date) : ''),
        h('p', { class: 'dr-v-out' }, '播放不了或太卡？', h('a', { href: out, target: '_blank', rel: 'noopener noreferrer' }, '在 B 站打开')))));
  }

  /* ----- 图片：只保留视口附近的图 ----- */
  function loadBox(b) {
    if (b.img || b.failed) return;
    const im = h('img', { class: 'dr-pg-img', alt: '第 ' + (b.i + 1) + ' 页', decoding: 'async', referrerpolicy: 'no-referrer' });
    im.addEventListener('load', () => { if (im.naturalWidth) b.el.style.aspectRatio = im.naturalWidth + ' / ' + im.naturalHeight; b.el.classList.add('ok'); });
    im.addEventListener('error', () => {
      console.warn('[Spark Light] 漫剧图片加载失败：' + b.src);
      unloadBox(b); b.failed = true; b.el.classList.add('bad');
      b.el.appendChild(h('div', { class: 'dr-pg-fail' }, h('span', null, '这一页没有加载出来'),
        h('button', { class: 'sl-btn sl-btn--ghost', type: 'button', onclick: () => { clear(b.el); b.failed = false; b.el.classList.remove('bad'); loadBox(b); } }, '重试')));
    });
    im.src = b.src;
    b.img = im; b.el.appendChild(im);
  }
  function unloadBox(b) {
    if (!b.img) return;
    b.img.removeAttribute('src');   /* 先清掉地址，让浏览器放掉图片数据 */
    b.img.remove(); b.img = null; b.el.classList.remove('ok');
  }
  function openImages(it) {
    const list = h('div', { class: 'dr-pages' });
    boxes = it.pages.map((p, i) => {
      const el = h('div', { class: 'dr-pg', 'data-i': String(i) });
      list.appendChild(el);
      return { i, el, src: pageSrc(it, p), img: null, failed: false };
    });
    body.append(list, h('p', { class: 'dr-v-meta dr-v-end' }, '由 AI 生成，到底了'));
    io = new IntersectionObserver((es) => es.forEach((e) => {
      const b = boxes[+e.target.getAttribute('data-i')]; if (!b) return;
      if (e.isIntersecting) loadBox(b); else unloadBox(b);
    }), { root: body, rootMargin: '150% 0px 150% 0px' });
    boxes.forEach((b) => io.observe(b.el));
    body.addEventListener('scroll', onScroll, { passive: true });
    updateCount();
  }
  function updateCount() {
    scrollRaf = 0; if (!boxes.length) return;
    const mid = body.getBoundingClientRect().top + body.clientHeight / 2;
    let best = 0, d = Infinity;
    boxes.forEach((b, i) => { const r = b.el.getBoundingClientRect(); const dd = Math.abs(r.top + r.height / 2 - mid); if (dd < d) { d = dd; best = i; } });
    count.textContent = (best + 1) + ' / ' + boxes.length;
  }
  function onScroll() { if (!scrollRaf) scrollRaf = requestAnimationFrame(updateCount); }

  /* 切到后台立刻放掉图片，回来再按位置重新加载 */
  doc.addEventListener('visibilitychange', () => {
    if (!isOpen || !io) return;
    if (doc.hidden) boxes.forEach(unloadBox);
    else boxes.forEach((b) => { io.unobserve(b.el); io.observe(b.el); });
  });
  /* 离开页面（含手机上切走标签页后被回收、前进后退）：全部拆掉 */
  window.addEventListener('pagehide', () => { if (isOpen) close(); else teardown(); });

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const f = Array.from(panel.querySelectorAll('a[href],button:not([disabled])'));
    if (!f.length) return;
    const a = f[0], z = f[f.length - 1];
    if (e.shiftKey && doc.activeElement === a) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && doc.activeElement === z) { e.preventDefault(); a.focus(); }
  }
  function open(it, from) {
    if (isOpen) close();
    isOpen = true; opener = from || doc.activeElement;
    title.textContent = it.title || '未命名';
    if (it.kind === 'video') openVideo(it); else if (it.kind === 'images') openImages(it);
    scrim.classList.add('on'); panel.classList.add('on'); doc.body.classList.add('sl-lock');
    doc.addEventListener('keydown', onKey);
    setTimeout(() => closeBtn.focus(), 30);
  }
  function close() {
    if (!isOpen) return; isOpen = false;
    teardown();                       /* 关闭的同一刻就释放，不等动画结束 */
    scrim.classList.remove('on'); panel.classList.remove('on'); doc.body.classList.remove('sl-lock');
    doc.removeEventListener('keydown', onKey);
    if (opener && opener.focus) opener.focus();
  }
  closeBtn.addEventListener('click', close); scrim.addEventListener('click', close);
  return { open };
})();

/* ---------- 列表 ---------- */
function card(it) {
  const playable = !!it.kind;
  const media = h('span', { class: 'dr-media' });
  const cv = coverSrc(it);
  if (cv && playable) {
    const im = h('img', { src: cv, alt: '', loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer' });
    im.addEventListener('error', () => { console.warn('[Spark Light] 找不到封面：' + cv); im.remove(); media.classList.add('dr-nocover'); });
    media.appendChild(im);
  } else {
    media.classList.add('dr-nocover');
  }
  if (!playable) media.appendChild(h('span', { class: 'dr-ph-label' }, '占位 · 待上线'));
  const tags = h('span', { class: 'dr-tags' },
    playable ? h('span', { class: 'sl-tag' }, it.kind === 'video' ? '视频' : '图文') : h('span', { class: 'sl-tag' }, '待上线'),
    h('span', { class: 'sl-tag' }, '由 AI 生成'));
  const info = h('span', { class: 'dr-info' },
    h('span', { class: 'dr-title' }, it.title || (playable ? '未命名' : '漫剧标题待补')),
    it.summary ? h('span', { class: 'dr-sum' }, it.summary) : (playable ? null : h('span', { class: 'dr-sum sl-ph' }, '简介待站主提供')),
    fmtDate(it.date) ? h('span', { class: 'dr-date' }, fmtDate(it.date)) : null,
    tags);
  if (!playable) return h('li', { class: 'dr-item' }, h('div', { class: 'dr-card dr-card--ph', 'aria-label': '占位，待上线' }, media, info));
  const btn = h('button', { class: 'dr-card', type: 'button', 'aria-label': (it.title || '未命名') + '，由 AI 生成，' + (it.kind === 'video' ? '播放视频' : '阅读图文') }, media, info);
  btn.addEventListener('click', () => Viewer.open(it, btn));
  return h('li', { class: 'dr-item' }, btn);
}

async function main() {
  const data = await loadData('dramas');
  const slot = $('dr-root'); clear(slot);
  const raw = (Array.isArray(data.items) ? data.items : []).filter((i) => i && typeof i === 'object');
  let items = raw.map(normalize);
  if (!items.length) items = [{ id: 'ph-1' }, { id: 'ph-2' }].map((x) => Object.assign(x, { kind: null }));
  slot.appendChild(h('ul', { class: 'dr-grid' }, items.map(card)));
}
main().catch((e) => { const el = $('dr-root'); if (el) { clear(el); el.appendChild(errorBox('这一块读取失败：' + (e.file || ''), e.message)); } });
