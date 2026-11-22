/* 小游戏页的入口脚本（游戏列表）。本页只依赖 core/ 与 data/，不依赖任何游戏的代码。
   每个游戏是 games/play/<id>/ 下一个独立页面，列表只负责展示卡片并跳转，互不影响。
   数据：data/games.json。新增游戏的步骤见 games/play/README.txt。 */
import { loadData } from '../core/data.js';
import { h, clear, icon, root, errorBox } from '../core/util.js';
import { renderStub } from '../core/page-stub.js';

renderStub('games');
const $ = (id) => document.getElementById(id);

/* path 必须是 games/play/<文件夹>/ 这种固定格式，避免数据里写出奇怪的地址 */
const PATH_OK = /^games\/play\/[A-Za-z0-9_-]+\/$/;
const coverSrc = (it) => (!it.cover ? null : /^https?:\/\//i.test(String(it.cover)) ? String(it.cover).trim() : root + 'assets/covers/' + encodeURIComponent(String(it.cover)));

function card(it) {
  const ready = it.status === 'ready' && PATH_OK.test(String(it.path || ''));
  const media = h('span', { class: 'gm-media' });
  const cv = coverSrc(it);
  if (cv) {
    const im = h('img', { src: cv, alt: '', loading: 'lazy', decoding: 'async' });
    im.addEventListener('error', () => { console.warn('[Spark Light] 找不到封面：' + cv); im.remove(); media.classList.add('gm-nocover'); });
    media.appendChild(im);
  } else {
    media.classList.add('gm-nocover');
    media.appendChild(h('span', { class: 'gm-cover-ph' }, '封面待补'));
  }
  const tags = Array.isArray(it.tags) ? it.tags.filter((t) => typeof t === 'string' && t.trim()) : [];
  const info = h('span', { class: 'gm-info' },
    h('span', { class: 'gm-title' }, it.title || '未命名'),
    it.summary ? h('span', { class: 'gm-sum' }, it.summary) : h('span', { class: 'gm-sum sl-ph' }, '玩法介绍待站主提供'),
    h('span', { class: 'gm-tags' },
      h('span', { class: 'sl-tag' }, ready ? '可以玩' : '制作中'),
      tags.map((t) => h('span', { class: 'sl-tag' }, t))));
  if (!ready) return h('li', { class: 'gm-item' }, h('div', { class: 'gm-card gm-card--soon', 'aria-label': (it.title || '未命名') + '，制作中' }, media, info));
  const link = h('a', { class: 'gm-card', href: root + it.path, 'aria-label': (it.title || '未命名') + '，开始游戏' }, media, info,
    h('span', { class: 'gm-go' }, '开始游戏', icon('arrow', 18)));
  return h('li', { class: 'gm-item' }, link);
}

async function main() {
  const data = await loadData('games');
  const intro = $('gm-intro');
  if (data.intro) intro.textContent = data.intro; else intro.hidden = true;
  const slot = $('gm-root'); clear(slot);
  const items = (Array.isArray(data.items) ? data.items : []).filter((i) => i && typeof i === 'object' && i.id);
  if (!items.length) { slot.appendChild(h('p', { class: 'sl-empty' }, '小游戏还在制作中，过一阵再来玩。')); return; }
  slot.appendChild(h('ul', { class: 'gm-grid' }, items.map(card)));
}
main().catch((e) => { const el = $('gm-root'); if (el) { clear(el); el.appendChild(errorBox('这一块读取失败：' + (e.file || ''), e.message)); } });
