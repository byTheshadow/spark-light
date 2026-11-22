/* 主界面入口脚本。各区块各自读数据、各自显示错误，互不影响。 */
import { loadData } from '../core/data.js';
import { h, clear, icon, formatPrice, placeholder, errorBox, root } from '../core/util.js';

const $ = (id) => document.getElementById(id);

async function hero() {
  const site = await loadData('site');
  if (site.ownerLine) $('hero-owner').textContent = site.ownerLine;
  const tg = $('hero-tagline');
  clear(tg);
  if (site.tagline) tg.textContent = site.tagline; else tg.appendChild(placeholder('定位语待站主提供'));
  $('foot').textContent = site.name + '，' + (site.ownerLine || '');
}

async function prices() {
  const data = await loadData('services');
  const slot = $('price-root');
  $('price-note').textContent = data.currencyNote || '';
  clear(slot);
  data.categories.forEach((cat) => {
    const block = h('div', { class: 'sl-price-cat' }, h('h3', null, cat.name), cat.summary ? h('p', { class: 'sl-price-sum' }, cat.summary) : null);
    if (cat.items && cat.items.length) {
      block.appendChild(h('ul', { class: 'sl-price-list' }, cat.items.map((it) =>
        h('li', { class: 'sl-price-row' },
          h('span', { class: 'sl-price-name' }, it.name),
          h('span', { class: 'sl-price-val' }, formatPrice(it, data.currency) || '价格待定'),
          it.note ? h('span', { class: 'sl-price-note' }, it.note) : null))));
    } else {
      block.appendChild(h('p', { style: 'margin-top:10px' }, placeholder(cat.placeholder || '内容待站主提供')));
    }
    if (cat.rules && cat.rules.length) block.appendChild(h('ul', { class: 'sl-rules' }, cat.rules.map((r) => h('li', null, r))));
    slot.appendChild(block);
  });
}

async function entries() {
  const site = await loadData('site');
  const slot = $('entries-root');
  clear(slot);
  slot.appendChild(h('div', { class: 'sl-entries' }, site.nav.filter((n) => n.id !== 'home').map((n) =>
    h('a', { class: 'sl-entry', href: root + n.path },
      h('span', { class: 'sl-entry-main' }, h('span', { class: 'sl-entry-title' }, n.title), n.desc ? h('span', { class: 'sl-entry-desc' }, n.desc) : null),
      icon('arrow', 22)))));
}

[['hero-owner', hero], ['price-root', prices], ['entries-root', entries]].forEach(([id, fn]) => {
  fn().catch((e) => { const el = $(id); if (el) { clear(el); el.appendChild(errorBox('这一块读取失败：' + (e.file || ''), e.message)); } });
});
