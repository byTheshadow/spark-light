/* 主题 3：像素街机。所有业务文字通过 textContent 写入，原型中的硬编码数据仅作结构参考。 */
const t3el = (tag, className, text) => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text != null) el.textContent = String(text);
  return el;
};

const t3button = (text, className = '') => {
  const b = t3el('button', className, text);
  b.type = 'button';
  return b;
};

function t3PriceText(item) {
  if (!item || !Number.isFinite(item.price)) return '待定';
  return (item.from ? '起 ' : '') + item.price + ' ' + (item.unit || '元');
}

function t3CategoryData(data) {
  const cats = data.services && Array.isArray(data.services.categories) ? data.services.categories : [];
  return cats.map((cat) => ({
    title: cat.title || cat.name || '服务分类',
    summary: cat.summary || '服务说明待站主补充。',
    items: Array.isArray(cat.items) ? cat.items : [],
    rules: Array.isArray(cat.rules) ? cat.rules : []
  }));
}

function t3BuildCab(cat, index) {
  const b = t3button('', 't3-cab');
  const screen = t3el('div', 't3-cab-screen');
  screen.append(t3el('div', '', 'READY'), t3el('small', '', 'STAGE ' + String(index + 1).padStart(2, '0')));
  b.append(screen);
  b.append(t3el('h3', '', cat.title));
  b.append(t3el('p', '', cat.summary));
  const first = cat.items[0];
  b.append(t3el('div', 't3-price', first ? t3PriceText(first) : '待定'));
  b.addEventListener('click', () => {
    b.classList.remove('is-hit');
    void b.offsetWidth;
    b.classList.add('is-hit');
    const target = document.getElementById('t3-price-panel');
    if (target) {
      target.hidden = false;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      t3RenderPrice(target, cat);
    }
  });
  return b;
}

function t3RenderPrice(host, cat) {
  host.replaceChildren();
  host.append(t3el('h2', '', cat.title + ' · 价目货架'));
  const list = t3el('ul', 't3-list');
  if (!cat.items.length) list.append(t3el('li', '', '服务项目待站主补充。'));
  cat.items.forEach((item) => {
    const li = t3el('li');
    const copy = t3el('div');
    copy.append(t3el('span', '', item.name || '未命名服务'));
    copy.append(t3el('small', '', item.note || item.desc || '具体内容以下单沟通为准。'));
    li.append(copy, t3el('strong', '', t3PriceText(item)));
    list.append(li);
  });
  host.append(list);
}

function t3RenderRules(host, data) {
  const groups = data.notice && Array.isArray(data.notice.groups) ? data.notice.groups : [];
  const grid = t3el('div', 't3-rules');
  groups.forEach((group) => {
    const card = t3el('article', 't3-rule');
    card.append(t3el('h3', '', group.title || '须知'));
    const clauses = Array.isArray(group.clauses) ? group.clauses : [];
    card.append(t3el('p', '', clauses.length ? clauses.join('\n') : '具体条款待站主补充。'));
    grid.append(card);
  });
  if (!groups.length) grid.append(t3el('p', '', '营业须知待站主补充。'));
  host.append(grid);
}

export function mountT3Arcade(data) {
  const main = document.getElementById('main');
  if (!main) return;
  const old = document.getElementById('t3-stage');
  if (old) old.remove();

  const cats = t3CategoryData(data);
  const stage = t3el('div');
  stage.id = 't3-stage';
  const shell = t3el('div', 't3-shell');

  const boot = t3el('section', 't3-boot');
  const bootInner = t3el('div', 't3-boot-inner');
  bootInner.append(t3el('div', 't3-kicker', 'ARCANUM XVII / PIXEL STATION'));
  bootInner.append(t3el('h1', '', 'SPARK LIGHT'));
  bootInner.append(t3el('p', '', '插入一枚硬币，进入 Shadow 的像素街区。'));
  const insert = t3button('INSERT COIN', 't3-insert');
  bootInner.append(insert);
  boot.append(bootInner);
  shell.append(boot);

  const head = t3el('header', 't3-head');
  const headCopy = t3el('div');
  headCopy.append(t3el('div', 't3-kicker', 'STAGE 01 / ARCADE SELECT'));
  headCopy.append(t3el('h2', 't3-title', '选择一台街机'));
  headCopy.append(t3el('p', 't3-copy', '每一台机器对应一组服务。点击它，查看货架上的项目。'));
  head.append(headCopy, t3el('div', 't3-credit', 'CREDIT 00'));
  shell.append(head);

  const cabins = t3el('div', 't3-cabinets');
  cats.forEach((cat, index) => cabins.append(t3BuildCab(cat, index)));
  if (!cats.length) cabins.append(t3el('p', '', '服务数据暂未加载。'));
  shell.append(cabins);

  const price = t3el('section', 't3-panel');
  price.id = 't3-price-panel';
  price.hidden = true;
  shell.append(price);

  const rules = t3el('section', 't3-panel');
  rules.append(t3el('h2', '', '通关须知'));
  t3RenderRules(rules, data);
  shell.append(rules);

  const card = t3el('section', 't3-card');
  const cardTitle = t3el('h2', '', 'DAILY CARD');
  const cardText = t3el('p', '', '按下按钮，读取今日字卡。');
  const draw = t3button('DRAW');
  const cards = data.cards && Array.isArray(data.cards.cards) ? data.cards.cards : [];
  draw.addEventListener('click', () => {
    const item = cards[Math.floor(Math.random() * cards.length)];
    cardText.textContent = item ? (item.text || '今日字卡文案待站主补充。') : '今日字卡文案待站主补充。';
  });
  card.append(cardTitle, cardText, draw);
  shell.append(card);

  const foot = t3el('footer', 't3-foot');
  foot.append(t3el('span', '', 'PIXEL STATION / SHADOW'));
  const contact = data.contact && Array.isArray(data.contact.channels) ? data.contact.channels[0] : null;
  foot.append(t3el('span', '', contact && contact.value ? contact.value : '联系渠道待站主补充'));
  shell.append(foot);

  stage.append(shell);
  main.append(stage);
  insert.addEventListener('click', () => { boot.hidden = true; stage.classList.add('is-started'); });
}
