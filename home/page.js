/* 主界面入口脚本。
   1) 读取 data/ 里的内容，整理成原型代码需要的 DATA 对象
   2) 把业务介绍等文字填进页面
   3) 按顺序加载 home/js/ 里的互动脚本（经典脚本，共享同一个页面作用域）
   本页只依赖 core/ 与 data/，不依赖其他页面。 */
import { loadData } from '../core/data.js';
import { errorBox, root } from '../core/util.js';

const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SCRIPTS = ['01-util', '02-loop', '03-tilt', '04-bg', '05-ripple', '06-kinetic', '07-cursor', '08-intro', '09-cover', '10-parallax', '11-bench', '12-craft-rail',
  '13-craft-divination', '14-craft-code', '15-craft-pendulum', '16-craft-ai', '17-price', '18-letter', '19-sheets', '20-orb', '21-purify'];

/* 价目卡的动画与配色属于主题皮肤，文字与价格来自 data/services.json */
const META = {
  divination: { id: 'div', title: '占卜', en: 'divination', tint: 'rgba(200,190,255,.6)', fx: { 'ln-tarot-1q': 'shuffle', 'fortune-single': 'spread', 'past-life': 'cycle', 'oc-entertainment': 'dream', 'cards-random': 'pocket' } },
  vibecoding: { id: 'code', title: '网站定制', en: 'vibecoding', tint: 'rgba(175,225,218,.7)', fx: { website: 'build', rush: 'rush' } },
  tuning: { id: 'tune', title: '灵摆调频', en: 'pendulum', tint: 'rgba(191,230,225,.55)', pendFx: 'pend' },
  ai: { id: 'ai', title: 'AI 映画', en: 'ai reels', tint: 'rgba(241,206,222,.8)', pendFx: 'film' }
};

function buildData(d) {
  const { status, services, notice, contact, cards, lenormand, site } = d;
  const state = ['open', 'paused', 'full'].includes(status.state) ? status.state : 'unset';
  const total = Number.isFinite(status.total) ? Math.max(0, status.total) : 0;
  const taken = Number.isFinite(status.taken) ? Math.min(Math.max(0, status.taken), total) : 0;

  const pricing = services.categories.filter((c) => META[c.id]).map((c) => {
    const m = META[c.id], items = c.items || [];
    return {
      id: m.id, title: m.title, en: m.en, tint: m.tint,
      sub: c.summary ? esc(c.summary) : undefined,
      pending: !items.length, fx: m.pendFx,
      flow: (c.flow || []).map(esc), notes: (c.notes || []).map(esc), rules: (c.rules || []).map(esc),
      items: items.map((it) => ({
        n: esc(it.name), note: it.note ? esc(it.note) : '', p: Number.isFinite(it.price) ? it.price : 0,
        u: it.from ? '起' : (it.unit || ''), fx: (m.fx && m.fx[it.id]) || 'shuffle', d: it.desc || '说明待站主提供'
      }))
    };
  });

  const chans = (contact.channels || []).filter((c) => c && c.value);
  return {
    status: { state, total, taken, next: status.note || null },
    stateLabel: { open: '开单中', paused: '暂停接单', full: '已满单', unset: '待设置' },
    stateEn: { open: 'open for booking', paused: 'paused', full: 'fully booked', unset: 'to be set' },
    schedule: { example: false, restWeekdays: [], full: null, reply: null, delivery: null },
    cards: cards.cards.map((c) => ({ g: c.glyph, t: c.text || '字卡文案待站主提供。' })),
    lenormand: lenormand.cards.map((c) => ({ n: c.n, a: c.a, e: c.e, k: c.k || '牌义待站主提供' })),
    pricing,
    notice: notice.groups.map((g) => ({ t: esc(g.title), b: g.clauses && g.clauses.length ? g.clauses.map((c, i) => (i + 1) + '. ' + esc(c)).join('<br>') : null })),
    contact: chans.length ? chans.map((c) => ({ label: esc(c.label || ''), v: esc(c.value) })) : [{ label: '下单渠道', v: null }, { label: '联系方式', v: null }],
    pages: site.nav.filter((n) => n.id !== 'home').map((n) => ({ t: esc(n.title), href: root + n.path }))
  };
}

function fillText(d) {
  const intro = document.getElementById('covIntro');
  if (d.site.tagline) intro.textContent = d.site.tagline; else { const ph = document.createElement('span'); ph.className = 'ph'; ph.textContent = '一句话介绍，待站主提供。'; intro.appendChild(ph); }
  if (d.site.ownerLine) document.getElementById('covSub').textContent = d.site.ownerLine;
  const order = ['divination', 'vibecoding', 'tuning', 'ai'];
  order.forEach((id, i) => {
    const c = (d.crafts.crafts || []).find((x) => x.id === id) || {};
    const p = document.querySelector('[data-craft="' + i + '"]');
    if (p) { if (c.desc) p.textContent = c.desc; else { const ph = document.createElement('span'); ph.className = 'ph'; ph.textContent = '业务介绍待站主提供'; p.appendChild(ph); } }
    const ul = document.querySelector('[data-craft-tags="' + i + '"]');
    if (ul) { (c.tags || []).forEach((t) => { const li = document.createElement('li'); li.textContent = t; ul.appendChild(li); }); if (!(c.tags || []).length) ul.hidden = true; }
  });
}

function loadScript(src) {
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = src; s.async = false;
    s.onload = resolve;
    s.onerror = () => { console.error('[Spark Light] 脚本加载失败：' + src); resolve(); };
    document.head.appendChild(s);
  });
}

async function main() {
  const names = ['site', 'status', 'services', 'notice', 'contact', 'cards', 'lenormand', 'crafts'];
  const results = await Promise.allSettled(names.map((n) => loadData(n)));
  const bad = results.map((r, i) => (r.status === 'rejected' ? r.reason : null)).filter(Boolean);
  if (bad.length) {
    const box = errorBox('主界面需要的数据读取失败：' + bad.map((e) => e.file).join('、'), bad[0].message);
    document.getElementById('main').prepend(box);
    return;
  }
  const d = {}; names.forEach((n, i) => { d[n] = results[i].value; });
  window.DATA = buildData(d);
  fillText(d);
  for (const f of SCRIPTS) await loadScript(root + 'home/js/' + f + '.js');
  /* 底部“下单与联系”交给主界面自带的联系弹层 */
  document.addEventListener('sl:open-contact', (e) => {
    if (typeof Contact !== 'undefined' && typeof bookMsg === 'function') { e.preventDefault(); Contact.open(bookMsg()); }
  });
  window.dispatchEvent(new CustomEvent('sl:home-ready'));
}
main();
