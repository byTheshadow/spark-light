/* 通用小工具：存储、建节点、图标、价格格式化。
   建节点一律用 textContent，数据里即使有 < > 也不会被当成代码执行。 */

export const root = document.documentElement.getAttribute('data-root') || './';

/** 读写 localStorage；失败（隐私模式等）时静默返回 null。v 省略=读取，null=删除 */
export function store(key, v) {
  try {
    if (v === undefined) return localStorage.getItem(key);
    if (v === null) localStorage.removeItem(key); else localStorage.setItem(key, v);
  } catch (e) { /* 存储不可用时站点照常工作，只是不记住选择 */ }
  return null;
}

/** h('div', {class:'x', onclick:fn, 'aria-label':'y'}, '文字', 子节点, ...) */
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const k in attrs) {
      const v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  append(el, kids);
  return el;
}
function append(el, kids) {
  for (const k of kids) {
    if (k === null || k === undefined || k === false) continue;
    if (Array.isArray(k)) append(el, k);
    else el.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}
export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

/* 图标：全部是线条 SVG，不使用 emoji。路径是写死的可信字符串。 */
const ICONS = {
  menu:  '<path d="M4 8h16M4 16h16"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  copy:  '<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M5 15V6a1 1 0 0 1 1-1h9"/>'
};
export function icon(name, size = 20) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('width', size); s.setAttribute('height', size);
  s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '1.5'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
  s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
  s.innerHTML = ICONS[name] || '';
  return s;
}

/** 价格显示。价格只来自 data/services.json，页面不写死。 */
export function formatPrice(item, currency = 'r') {
  if (typeof item.price !== 'number') return null;
  let t = item.price + currency;
  if (item.unit) t += ' / ' + item.unit;
  if (item.from) t = '底价 ' + t + ' 起';
  return t;
}

/** 占位：站主还没提供的内容，用统一样式显示，不自行编写 */
export function placeholder(text) { return h('span', { class: 'sl-ph' }, text); }

/** 区块级错误提示：说清楚出了什么事、怎么处理 */
export function errorBox(title, detail) {
  return h('div', { class: 'sl-error', role: 'alert' },
    h('strong', null, title), detail ? h('span', null, detail) : null);
}
