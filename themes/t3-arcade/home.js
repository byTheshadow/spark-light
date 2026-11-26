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

const T3_FLAME_FRAMES = [
  ['......o.......', '.....oo.......', '.....oyo...o..', '....oyyo..oo..', '....oyyoo.oyo.', '...oyyyyooyyo.', '..oyyywwyyyyo.', '.oyywwwwwwyyo.', '.oywwwwwwwwyo.', 'oywwewwwwewyo.', 'oywwewwwwewwyo', 'oywpwwwwwwpwyo', '.oywwweewwwyo.', '.oyywwwwwwyyo.', '..ooyyyyyyoo..', '....oooooo....'],
  ['.......o......', '......oo......', '..o..oyo......', '..oo.oyyo.....', '.oyo.oyyo.....', '.oyyooyyyo....', '..oyyywwyyyyo.', '.oyywwwwwwyyo.', '.oywwwwwwwwyo.', 'oywwewwwwewyo.', 'oywwewwwwewwyo', 'oywpwwwwwwpwyo', '.oywwweewwwyo.', '.oyywwwwwwyyo.', '..ooyyyyyyoo..', '....oooooo....'],
  ['......o.......', '.....oo.......', '.....oyo...o..', '....oyyo..oo..', '....oyyoo.oyo.', '...oyyyyooyyo.', '..oyyywwyyyyo.', '.oyywwwwwwyyo.', '.oywwwwwwwwyo.', 'oywwwwwwwwwyo.', 'oyweewwwweewyo', 'oywpwwwwwwpwyo', '.oywwweewwwyo.', '.oyywwwwwwyyo.', '..ooyyyyyyoo..', '....oooooo....']
];

function t3HeroFlame() {
  const wrap = t3el('div', 't3-hero-flame');
  const embers = t3el('span', 't3-embers');
  [[18, -14, 0], [32, 18, .55], [48, -22, 1.1], [65, 26, 1.65], [78, -10, .3]].forEach(([left, dx, delay]) => {
    const ember = t3el('i');
    ember.style.setProperty('--x', left + '%');
    ember.style.setProperty('--dx', dx + 'px');
    ember.style.setProperty('--delay', delay + 's');
    embers.append(ember);
  });
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 15 16'); svg.setAttribute('aria-hidden', 'true');
  T3_FLAME_FRAMES.forEach((frame, frameIndex) => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 't3-flame-frame f' + frameIndex);
    frame.forEach((row, y) => [...row].forEach((key, x) => {
      if (key === '.') return;
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x); rect.setAttribute('y', y); rect.setAttribute('width', '1.02'); rect.setAttribute('height', '1.02');
      rect.setAttribute('fill', key === 'o' ? 'var(--arc-flame)' : key === 'y' ? 'var(--arc-hi)' : key === 'w' ? 'var(--arc-core)' : key === 'p' ? 'var(--arc-candy)' : 'var(--arc-screen)');
      g.append(rect);
    }));
    svg.append(g);
  });
  wrap.append(embers, svg);
  return wrap;
}

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
  const body = t3el('span', 't3-cab-body');
  const marquee = t3el('span', 't3-marquee');
  marquee.append(t3el('span', '', cat.title));
  const bulbs = t3el('span', 't3-bulbs');
  for (let i = 0; i < 6; i += 1) bulbs.append(t3el('i'));
  marquee.append(bulbs);
  const screen = t3el('div', 't3-cab-screen');
  screen.append(t3el('div', '', 'READY'), t3el('small', '', 'STAGE ' + String(index + 1).padStart(2, '0')));
  const panel = t3el('span', 't3-cab-panel');
  panel.append(t3el('i', 't3-stick'), t3el('i', 't3-pbtn a'), t3el('i', 't3-pbtn b'));
  const base = t3el('span', 't3-cab-base');
  base.append(t3el('i', 't3-coin-slot'));
  body.append(marquee, screen, panel, base);
  b.append(body);
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
  if (window.SLAiMosaic && /AI|生图|漫剧|绘画|创作|映画|NovelAI|Midjourney/.test(cat.title + ' ' + cat.summary)) window.SLAiMosaic(host);
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

function t3AddStreet(shell, data) {
  const sec = t3el('section', 't3-stage t3-street-stage');
  const head = t3el('header', 't3-head');
  const copy = t3el('div');
  copy.append(t3el('div', 't3-kicker', 'STAGE 02 / SPARK STREET'));
  copy.append(t3el('h2', 't3-title', '火花街'));
  copy.append(t3el('p', 't3-copy', '天色会跟着时间变化。点亮街角的店，查看今天的排单。'));
  head.append(copy, t3el('div', 't3-credit', 'LIVE / PIXEL WEATHER'));
  const street = t3el('div', 't3-street');
  const sky = t3el('div', 't3-sky');
  sky.append(t3el('i', 't3-moon'), t3el('i', 't3-cloud cloud-a'), t3el('i', 't3-cloud cloud-b'));
  const buildings = t3el('div', 't3-buildings');
  ['星光杂货店', 'Spark Light', '静音游戏厅', 'RUI 事务所'].forEach((name, i) => {
    const shop = t3button('', 't3-shop');
    shop.append(t3el('span', 't3-shop-sign', name), t3el('span', 't3-shop-window', i === 1 ? 'OPEN' : 'PLAY'));
    const status = data.status && data.status.state === 'open' ? '开单中' : '今日暂闭';
    shop.addEventListener('click', () => t3Toast(name + ' · ' + status));
    buildings.append(shop);
  });
  street.append(sky, buildings, t3el('div', 't3-road'));
  const bar = t3el('div', 't3-street-bar');
  const timeLabel = t3el('span', '', '现在是像素夜晚');
  const times = [['清晨', 'dawn'], ['白天', 'day'], ['黄昏', 'dusk'], ['夜晚', 'night']];
  const chips = times.map(([label, value]) => {
    const chip = t3button(label, 't3-chip' + (value === 'night' ? ' on' : ''));
    chip.dataset.time = value;
    chip.addEventListener('click', () => {
      chips.forEach((node) => node.classList.toggle('on', node === chip));
      street.dataset.time = value;
      timeLabel.textContent = '现在是像素' + label;
    });
    return chip;
  });
  street.dataset.time = 'night';
  bar.append(timeLabel, ...chips);
  sec.append(head, street, bar);
  shell.append(sec);
}

function t3AddShop(shell, cats) {
  const sec = t3el('section', 't3-stage');
  const head = t3el('header', 't3-head');
  const copy = t3el('div');
  copy.append(t3el('div', 't3-kicker', 'STAGE 03 / ITEM SHOP'));
  copy.append(t3el('h2', 't3-title', '道具商店'));
  copy.append(t3el('p', 't3-copy', '点货架上的道具查看详情。价目从统一数据读取。'));
  head.append(copy, t3el('div', 't3-credit', 'SHOPKEEPER READY'));
  const shop = t3el('div', 't3-store');
  const keeper = t3el('div', 't3-keeper');
  keeper.append(t3el('div', 't3-keeper-sprite', 'RUI'), t3el('p', '', '欢迎光临。点货架上的道具，我来讲讲它。'));
  shop.append(keeper);
  const shelf = t3el('div', 't3-shelf');
  cats.flatMap((cat) => cat.items.slice(0, 2).map((item) => ({ ...item, cat: cat.title }))).forEach((item, i) => {
    const goods = t3button('', 't3-good');
    goods.append(t3el('span', 't3-good-icon', ['CARD', 'ORB', 'WEB', 'KEY'][i % 4]), t3el('b', '', item.name || '服务道具'), t3el('small', '', t3PriceText(item)));
    goods.addEventListener('click', () => t3Toast((item.name || '服务道具') + ' · ' + t3PriceText(item)));
    shelf.append(goods);
  });
  shop.append(shelf);
  sec.append(head, shop);
  shell.append(sec);
}

function t3AddGame(shell, data) {
  const sec = t3el('section', 't3-stage');
  const head = t3el('header', 't3-head');
  const copy = t3el('div');
  copy.append(t3el('div', 't3-kicker', 'STAGE 05 / DAILY DRAW'));
  copy.append(t3el('h2', 't3-title', '今日一张'));
  copy.append(t3el('p', 't3-copy', '顶一下发光的砖块，掉出来的就是今天的字卡。'));
  head.append(copy, t3el('div', 't3-credit', 'PLAYER 1'));
  const game = t3el('div', 't3-game');
  const canvas = document.createElement('canvas');
  canvas.width = 320; canvas.height = 180; canvas.setAttribute('aria-label', '今日一张像素小游戏');
  const status = t3el('p', 't3-game-status', '按下发光砖块');
  const draw = t3button('顶一下', 't3-game-btn');
  const ctx = canvas.getContext('2d');
  const paint = () => { ctx.fillStyle = '#120d2e'; ctx.fillRect(0, 0, 320, 180); ctx.fillStyle = '#ffd23f'; for (let i = 0; i < 8; i += 1) ctx.fillRect(26 + i * 36, 28, 22, 12); ctx.fillStyle = '#ff7eb6'; ctx.fillRect(146, 135, 28, 20); ctx.fillStyle = '#6ff2c6'; ctx.fillRect(154, 108, 12, 22); };
  paint();
  draw.addEventListener('click', () => { const cards = data.cards && data.cards.cards; const item = Array.isArray(cards) && cards.length ? cards[Math.floor(Math.random() * cards.length)] : null; status.textContent = item ? item.text || '今日字卡文案待站主补充。' : '今日字卡文案待站主补充。'; paint(); });
  game.append(canvas, status, draw);
  sec.append(head, game);
  shell.append(sec);
}

let t3ToastTimer;
function t3Toast(message) {
  let toast = document.getElementById('t3-toast');
  if (!toast) { toast = t3el('div', 't3-toast'); toast.id = 't3-toast'; document.body.append(toast); }
  toast.textContent = message; toast.classList.add('on');
  clearTimeout(t3ToastTimer); t3ToastTimer = setTimeout(() => toast.classList.remove('on'), 2200);
}

export function mountT3Arcade(data) {
  const main = document.getElementById('main');
  if (!main) return;
  /* The original home page is a complete document tree.  Remove it before
     mounting the arcade world so hidden legacy sections cannot affect height,
     focus order, scroll anchoring, or future theme styles. */
  main.replaceChildren();

  const cats = t3CategoryData(data);
  const stage = t3el('div');
  stage.id = 't3-stage';
  const shell = t3el('div', 't3-shell');

  const boot = t3el('section', 't3-boot');
  const bootInner = t3el('div', 't3-boot-inner');
  bootInner.append(t3HeroFlame());
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

  t3AddStreet(shell, data);
  t3AddShop(shell, cats);

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

  t3AddGame(shell, data);

  stage.append(shell);
  main.append(stage);
  if (window.SLAiMosaic) window.SLAiMosaic(stage);
  insert.addEventListener('click', () => { boot.hidden = true; stage.classList.add('is-started'); });
}
