/* core/rui.js
   驻站灵魂小助手 RUI（无实体的灵魂，男性，成熟温柔有礼）。
   第一步：纯前端对话窗 + 站内 data/*.json 实时知识库零消耗秒回 + 严格防刷限制（每日 10 次自由提问、100 字上限、5 秒冷却）。
   第二步：当 data/rui.json 中配置了 endpoint（云端守门员地址）时，自由提问会自动走云端 DeepSeek 接口。 */

import { h, clear, icon, store } from './util.js';
import { loadData } from './data.js';

const doc = document;
const QUOTA_KEY = 'sl.rui.quota';

function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function getUsedCount() {
  try {
    const raw = JSON.parse(store(QUOTA_KEY) || 'null');
    if (raw && raw.date === todayStr() && Number.isFinite(raw.used)) return Math.max(0, raw.used);
  } catch (e) {}
  return 0;
}

function incUsedCount() {
  const next = getUsedCount() + 1;
  try { store(QUOTA_KEY, JSON.stringify({ date: todayStr(), used: next })); } catch (e) {}
  return next;
}

/* 读取站内全部公开数据，作为 RUI 的实时知识库 */
let kbPromise = null;
function loadKB() {
  if (!kbPromise) {
    kbPromise = Promise.allSettled([
      loadData('rui').catch(() => ({})),
      loadData('site').catch(() => ({})),
      loadData('status').catch(() => ({})),
      loadData('services').catch(() => ({})),
      loadData('crafts').catch(() => ({})),
      loadData('notice').catch(() => ({})),
      loadData('contact').catch(() => ({}))
    ]).then((res) => ({
      rui: res[0].value || {},
      site: res[1].value || {},
      status: res[2].value || {},
      services: res[3].value || {},
      crafts: res[4].value || {},
      notice: res[5].value || {},
      contact: res[6].value || {}
    }));
  }
  return kbPromise;
}

/* 根据 data/*.json 动态生成 RUI 成熟温柔有礼的回答 */
function buildStandardAnswer(topic, kb) {
  const cats = (kb.services && Array.isArray(kb.services.categories)) ? kb.services.categories : [];
  const findCat = (id) => cats.find((c) => c && c.id === id) || { items: [], rules: [], flow: [] };
  const chans = (kb.contact && Array.isArray(kb.contact.channels)) ? kb.contact.channels : [];
  const chanText = chans.length ? chans.map((c) => (c.label ? c.label + '：' : '') + (c.value || '')).join('；') : '可走平台：雨季不再来';

  if (topic === 'divination') {
    const c = findCat('divination');
    const list = (c.items || []).map((it) => '· ' + it.name + '：' + it.price + 'r' + (it.unit ? ' / ' + it.unit : '') + (it.note ? '（' + it.note + '）' : '')).join('\n');
    return '关于占卜，站主 Shadow 的所有占卜均由人工亲自洗牌与解读，没有任何 AI 参与，可提供抽牌图片，有需要也可按实际情况录制洗牌视频。\n\n目前的价目如下：\n' +
      (list || '· 单个问题 30r / 字卡 5r / 某项运势类 35r / 前世今生 50r / 平行世界 50r / 梦角占卜 20r / 来自未来的情书 40r') +
      '\n\n需要留意的是：占卜类订单一旦预约不接受退款，且为了认真对待每一位旅人，每日限量接单。你想看看哪一项的详情吗？';
  }

  if (topic === 'website') {
    const c = findCat('vibecoding');
    const list = (c.items || []).map((it) => '· ' + it.name + '：' + it.price + 'r' + (it.from ? ' 起' : '') + (it.note ? '（' + it.note + '）' : '')).join('\n');
    return '网站与小游戏定制（Vibecoding）会先与你沟通喜欢的风格、元素与功能，再根据难度确定工期与报价：\n' +
      (list || '· 网站定制：100r 起（定金 50r，工期基本 1 到 2 周内）\n· 加急制作：加收 30 至 50r\n· 小游戏定制：50r 起') +
      '\n\n可制作 OC 故事/梦角展示页、亲友纪念日网页、字卡传讯页、人格测试或效率工具等（暂不接定制小手机）。制作期间会定期发进度供你确认，定稿后交付完整代码压缩包与部署说明，且网页程序的 bug 免费修复。';
  }

  if (topic === 'tuning') {
    const c = findCat('tuning');
    const list = (c.items || []).map((it) => '· ' + it.name + '：' + it.price + 'r' + (it.note ? '（' + it.note + '）' : '')).join('\n');
    return '灵摆调频是以灵摆为媒介，对你的能量状态进行调试与梳理。常见做法是通过灵摆链接「高我」，减少阻滞性的负面能量，增加有利于事情发展的积极频率。\n\n目前的价目为：\n' +
      (list || '· 单项调满值：30r\n· 灵摆调频 7 次：190r') +
      '\n可调项目涵盖财富、健康、学业等，起到温和的辅助与推动作用。';
  }

  if (topic === 'ai') {
    return '关于 AI 映画（AI 生图与漫剧），站主使用 Midjourney（MJ）与 NovelAI 创作，均采用自制素材与可商用 p 值，没有画师垫图，页面作品也会如实标注。\n\n· 价格：2r - 4r / 张（视软件而定，商用等特殊需求另计）\n· 保障：对生图内容不满意可免费重新生图 2 次，定稿后交付无水印原图。';
  }

  if (topic === 'status') {
    const stMap = { open: '开单中', paused: '暂停接单', full: '已满单', unset: '以主界面排单状态显示为准' };
    const st = kb.status || {};
    let stLine = stMap[st.state] || stMap.unset;
    if (st.state === 'open' && Number.isFinite(st.total) && Number.isFinite(st.taken)) {
      stLine += '（剩余 ' + Math.max(0, st.total - st.taken) + ' 个名额）';
    }
    return '当前的排单状态为：「' + stLine + '」。\n' +
      '下单渠道：' + chanText + '。\n\n你可以先在主界面的「价目星牌」里点亮想约的项目，点击「带上清单去预约」或底部「下单与联系」，系统会自动为你复制好预约消息模板，直接发给站主 Shadow 即可。';
  }

  if (topic === 'refund') {
    return '在预约前，还请允许我温和提醒几项重要约定：\n' +
      '1. 占卜类订单全部由人工完成，不接受退款，下单前请确认了解雷诺曼、塔罗牌与神谕卡的区别。\n' +
      '2. 网站定制采取定金尾款制（定金 50r）。若中途决定不再继续制作，定金不退，会将当前代码交给你；已有雏形后的大改或新增功能需另计费，但程序 bug 免费修复。\n' +
      '3. 定制网站仅限本人使用，禁止商业用途、转售源码。详情可在第四章「一封来信」的星盘契约书中逐章查阅。';
  }

  return null;
}

/* 本地智能匹配：当云端接口尚未配置或访客问的是常规问题时，从知识库精准作答 */
function matchLocalKnowledge(q, kb) {
  const s = q.toLowerCase();
  if (/(你是谁|叫什么|名字|实体|灵魂|男|女|人设|rui)/.test(s)) {
    return '我是 RUI，一缕驻留在 Spark Light 的无形灵魂。我没有实体，借着这里的星光与秩序，替站主 Shadow 为来访的旅人解答疑惑。有什么我可以帮你的吗？';
  }
  if (/(你好|嗨|哈喽|在吗|晚上好|早上好|下午好|hello|hi)/.test(s) && s.length <= 10) {
    return '你好，旅人。很荣幸在星光下与你交谈。你想了解占卜、网站定制、灵摆调频，还是 AI 映画呢？';
  }
  if (/(小手机|airp)/.test(s)) {
    return '抱歉，由于特殊原因 AIRP 禁止商业化，目前站主 Shadow 暂不接定制小手机业务。不过 OC 故事展示页、亲友纪念日网页、字卡传讯页、人格测试和小游戏都是可以定制的。';
  }
  if (/(部署|github|pages|源码|保密|被别人看|压缩包|zip|服务器|数据库)/.test(s)) {
    return '关于代码交付与部署：默认交付完整代码压缩包（zip）与一份好懂的 README 部署说明，你可以免费发布在 GitHub Pages。如果你介意公开仓库被他人看到源码（如私密纪念日或 OC 设定），可以在下单时告诉站主 Shadow，改用 Cloudflare Pages / Netlify / Vercel 私有仓库部署或加装轻量口令。程序 bug 均免费修复。';
  }
  if (/(退款|退钱|定金|反悔|售后|大改|小改|bug)/.test(s)) {
    return buildStandardAnswer('refund', kb);
  }
  if (/(排单|下单|联系|怎么约|预约|渠道|平台|雨季|名额|开单)/.test(s)) {
    return buildStandardAnswer('status', kb);
  }
  if (/(网站|网页|代码|vibecoding|小游戏|工期|多久|加急|oc)/.test(s)) {
    return buildStandardAnswer('website', kb);
  }
  if (/(灵摆|调频|高我|能量|190|满值)/.test(s)) {
    return buildStandardAnswer('tuning', kb);
  }
  if (/(ai|生图|绘画|漫剧|midjourney|mj|novelai|重绘|水印|垫图)/.test(s)) {
    return buildStandardAnswer('ai', kb);
  }
  if (/(占卜|塔罗|雷诺曼|神谕|字卡|前世|今生|平行世界|梦角|情书|运势|洗牌)/.test(s)) {
    return buildStandardAnswer('divination', kb);
  }
  if (/(价格|价目|多少钱|收费|费用|贵|便宜)/.test(s)) {
    return 'Spark Light 目前共有四大类服务：\n' +
      '· 占卜：字卡 5r、梦角占卜 20r/题、单个问题 30r、单项运势 35r、未来情书 40r、前世今生/平行世界 50r\n' +
      '· 网站与小游戏定制：网站 100r 起（定金 50r）、小游戏 50r 起、加急 +30~50r\n' +
      '· 灵摆调频：单项调满值 30r、7 次 190r\n' +
      '· AI 生图：2r - 4r / 张（免费重绘 2 次）\n你想细致了解哪一类呢？';
  }
  return '这个问题我已经记下了。目前我的云端灵识（DeepSeek 接口）正在与站主 Shadow 做最后的连接校准，暂时只能回答站内价目、流程、排单与营业须知相关的问题。你可以换个关键词（如「占卜价格」「网站工期」「怎么下单」），或者直接通过「雨季不再来」平台联系站主 Shadow。';
}

export function mountRui() {
  if (doc.getElementById('slRuiFab')) return;

  /* 1. 悬浮徽章按钮（左下角，排单栏上方，方案 A 黑曜星典风：哑光黑底 + 极细银白铜版六芒星轨） */
  const fab = h('button', {
    class: 'sl-rui-fab', id: 'slRuiFab', type: 'button',
    'aria-haspopup': 'dialog', 'aria-expanded': 'false', 'aria-label': '召唤驻站灵魂助手 RUI'
  });
  fab.innerHTML =
    '<svg class="sl-rui-fab-sigil" viewBox="0 0 32 32" fill="none" stroke="currentColor" aria-hidden="true">' +
      '<circle class="sl-rui-spin-cw" cx="16" cy="16" r="14" stroke-width=".75" stroke-dasharray="2 2.5" opacity=".55"/>' +
      '<circle cx="16" cy="16" r="10.5" stroke-width=".7" opacity=".35"/>' +
      '<polygon class="sl-rui-spin-ccw" points="16,5.5 25.1,21.2 6.9,21.2" stroke-width=".65" opacity=".45"/>' +
      '<polygon class="sl-rui-spin-ccw" points="16,26.5 25.1,10.8 6.9,10.8" stroke-width=".65" opacity=".45"/>' +
      '<path class="sl-rui-pulse" d="M16 9.5c.4 4.2 2.3 6.1 6.5 6.5-4.2.4-6.1 2.3-6.5 6.5-.4-4.2-2.3-6.1-6.5-6.5 4.2-.4 6.1-2.3 6.5-6.5z" fill="currentColor" stroke="none"/>' +
    '</svg>' +
    '<span class="sl-rui-fab-txt"><b>Rui</b><small>SPIRIT · 侍从</small></span>';

  /* 2. 对话框遮罩与面板（方案 A 黑曜星典风） */
  const scrim = h('div', { class: 'sl-rui-scrim' });
  const closeBtn = h('button', { class: 'sl-rui-close', type: 'button', 'aria-label': '收起 RUI 对话窗' }, icon('close'));
  const quotaBadge = h('span', { class: 'sl-rui-quota', id: 'slRuiQuota' }, 'QUOTA · 10 / 10');
  const msgList = h('div', { class: 'sl-rui-msgs', id: 'slRuiMsgs', role: 'log', 'aria-live': 'polite' });
  const quickBar = h('div', { class: 'sl-rui-quicks', id: 'slRuiQuicks', 'aria-label': '常见快捷问题（不扣提问次数）' });

  const input = h('input', {
    class: 'sl-rui-input', id: 'slRuiInput', type: 'text',
    maxlength: '100', placeholder: '向 RUI 提问（限 100 字）…',
    autocomplete: 'off'
  });
  const charCount = h('span', { class: 'sl-rui-chars' }, '0/100');
  const sendBtn = h('button', { class: 'sl-rui-send', type: 'button' }, '发送');

  const headAvatar = h('div', { class: 'sl-rui-avatar', 'aria-hidden': 'true' });
  headAvatar.innerHTML =
    '<svg viewBox="0 0 36 36" fill="none" stroke="currentColor">' +
      '<circle class="sl-rui-spin-cw" cx="18" cy="18" r="16" stroke-width=".75" stroke-dasharray="1.5 3" opacity=".6"/>' +
      '<circle cx="18" cy="18" r="12" stroke-width=".7" opacity=".38"/>' +
      '<rect class="sl-rui-spin-ccw" x="9.5" y="9.5" width="17" height="17" stroke-width=".6" opacity=".4" transform="rotate(45 18 18)"/>' +
      '<path class="sl-rui-pulse" d="M18 10c.5 5 3 7.5 8 8-5 .5-7.5 3-8 8-.5-5-3-7.5-8-8 5-.5 7.5-3 8-8z" fill="currentColor" stroke="none"/>' +
    '</svg>';

  const panel = h('section', {
    class: 'sl-rui-panel', id: 'slRuiPanel', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'slRuiTitle', tabindex: '-1'
  },
    h('header', { class: 'sl-rui-head' },
      headAvatar,
      h('div', { class: 'sl-rui-meta' },
        h('div', { class: 'sl-rui-title-row' },
          h('h2', { class: 'sl-rui-title', id: 'slRuiTitle' }, 'Rui'),
          h('span', { class: 'sl-rui-role' }, 'NO.00 · 驻站灵魂')
        ),
        h('p', { class: 'sl-rui-sub' }, '无实体的守夜侍从 · 替 Shadow 为旅人答疑')
      ),
      closeBtn
    ),
    h('div', { class: 'sl-rui-bar' },
      h('span', { class: 'sl-rui-bar-tip' }, '点选星签速答不扣次数'),
      quotaBadge
    ),
    msgList,
    quickBar,
    h('form', { class: 'sl-rui-form', onsubmit: (e) => { e.preventDefault(); handleSend(); } },
      h('div', { class: 'sl-rui-inwrap' }, input, charCount),
      sendBtn
    )
  );

  doc.body.append(fab, scrim, panel);

  let isOpen = false;
  let busy = false;
  let cooldownUntil = 0;
  let cdTimer = 0;
  let inited = false;
  let cfg = { dailyLimit: 10, maxInputChars: 100, cooldownSec: 5, endpoint: '' };
  let history = [];

  function syncQuotaUI() {
    const used = getUsedCount();
    const left = Math.max(0, (cfg.dailyLimit || 10) - used);
    quotaBadge.textContent = 'QUOTA · ' + left + ' / ' + (cfg.dailyLimit || 10);
    quotaBadge.classList.toggle('is-low', left <= 2);
    return left;
  }

  /* 添加一条对话气泡（支持温柔的逐段打字浮现） */
  function addBubble(who, text, isQuickTag) {
    const row = h('div', { class: 'sl-rui-row ' + (who === 'user' ? 'is-user' : 'is-rui') });
    if (who === 'rui') {
      const miniAv = h('span', { class: 'sl-rui-mini-av', 'aria-hidden': 'true' });
      miniAv.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width=".9" stroke-dasharray="2 2"/><path d="M12 6c.4 3.8 2.2 5.6 6 6-3.8.4-5.6 2.2-6 6-.4-3.8-2.2-5.6-6-6 3.8-.4 5.6-2.2 6-6z" fill="currentColor" stroke="none"/></svg>';
      const bub = h('div', { class: 'sl-rui-bub' });
      if (isQuickTag) {
        bub.appendChild(h('span', { class: 'sl-rui-qtag' }, '星签速答 · 不扣次数'));
      }
      const txtBox = h('div', { class: 'sl-rui-btxt' });
      bub.appendChild(txtBox);
      row.append(miniAv, bub);
      msgList.appendChild(row);
      typeText(txtBox, text);
    } else {
      const bub = h('div', { class: 'sl-rui-bub' }, h('div', { class: 'sl-rui-btxt' }, text));
      row.appendChild(bub);
      msgList.appendChild(row);
    }
    msgList.scrollTop = msgList.scrollHeight;
  }

  function typeText(box, text) {
    const lines = String(text || '').split('\n');
    const isSimple = doc.documentElement.getAttribute('data-motion') === 'simple';
    if (isSimple) {
      lines.forEach((ln) => box.appendChild(h('p', null, ln || '\u00A0')));
      if (window.SLAiMosaic) window.SLAiMosaic(box);
      return;
    }
    let idx = 0;
    const pEl = h('p');
    box.appendChild(pEl);
    const full = String(text || '');
    const step = Math.max(1, Math.ceil(full.length / 42));
    function tick() {
      idx = Math.min(full.length, idx + step);
      clear(box);
      full.slice(0, idx).split('\n').forEach((ln) => box.appendChild(h('p', null, ln || '\u00A0')));
      msgList.scrollTop = msgList.scrollHeight;
      if (idx < full.length) {
        setTimeout(tick, 18);
      } else if (window.SLAiMosaic) {
        window.SLAiMosaic(box);
      }
    }
    tick();
  }

  function startCooldown(sec) {
    cooldownUntil = Date.now() + sec * 1000;
    clearInterval(cdTimer);
    const updateBtn = () => {
      const rem = Math.ceil((cooldownUntil - Date.now()) / 1000);
      if (rem > 0) {
        sendBtn.disabled = true;
        sendBtn.textContent = rem + 's';
      } else {
        clearInterval(cdTimer);
        sendBtn.disabled = busy;
        sendBtn.textContent = '发送';
      }
    };
    updateBtn();
    cdTimer = setInterval(updateBtn, 250);
  }

  async function initContent() {
    if (inited) return;
    inited = true;
    const kb = await loadKB();
    if (kb.rui && typeof kb.rui === 'object') {
      cfg = Object.assign(cfg, kb.rui);
    }
    input.setAttribute('maxlength', String(cfg.maxInputChars || 100));
    syncQuotaUI();

    /* 初始问候 */
    addBubble('rui', cfg.greeting || '你好，旅人。我是驻守在 Spark Light 的灵魂 RUI。若你想了解占卜、网站定制、灵摆调频或 AI 映画的价目与须知，请随时问我。', false);

    /* 快捷星签按钮 */
    clear(quickBar);
    const qs = Array.isArray(cfg.quickQuestions) ? cfg.quickQuestions : [];
    qs.forEach((q) => {
      const btn = h('button', {
        class: 'sl-rui-qbtn', type: 'button',
        onclick: () => {
          if (busy) return;
          addBubble('user', q.label);
          const ans = buildStandardAnswer(q.id, kb) || matchLocalKnowledge(q.label, kb);
          setTimeout(() => addBubble('rui', ans, true), 180);
        }
      }, q.label);
      quickBar.appendChild(btn);
    });
  }

  async function handleSend() {
    if (busy || Date.now() < cooldownUntil) return;
    const raw = (input.value || '').trim();
    if (!raw) return;
    const maxLen = cfg.maxInputChars || 100;
    const q = raw.slice(0, maxLen);

    const left = syncQuotaUI();
    if (left <= 0) {
      addBubble('user', q);
      input.value = '';
      charCount.textContent = '0/' + maxLen;
      addBubble('rui', '旅人，今天你我的自由问答次数（' + (cfg.dailyLimit || 10) + ' 次）已经用尽了，我的灵识需要稍作休整。你依然可以点击上方的「快捷星签」（不限次数），或者直接通过「雨季不再来」联系站主 Shadow。明日星升之时，我再为你解答。', false);
      return;
    }

    input.value = '';
    charCount.textContent = '0/' + maxLen;
    addBubble('user', q);

    /* 扣除 1 次自由提问额度并进入 5 秒防刷冷却 */
    incUsedCount();
    syncQuotaUI();
    busy = true;
    startCooldown(cfg.cooldownSec || 5);

    const kb = await loadKB();
    const ep = (cfg.endpoint || '').trim();

    if (ep) {
      /* 第二步已就绪：如果配置了云端守门员 endpoint，向云端发起受保护的 DeepSeek 请求 */
      const loadingRow = h('div', { class: 'sl-rui-row is-rui' },
        h('span', { class: 'sl-rui-mini-av', 'aria-hidden': 'true' }),
        h('div', { class: 'sl-rui-bub' }, h('div', { class: 'sl-rui-btxt sl-rui-thinking' }, 'RUI 正在星轨间检索答案……'))
      );
      msgList.appendChild(loadingRow);
      msgList.scrollTop = msgList.scrollHeight;

      try {
        const res = await fetch(ep, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: q,
            history: history.slice(-4)
          })
        });
        loadingRow.remove();
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.error) {
          const fallback = matchLocalKnowledge(q, kb);
          addBubble('rui', (data && data.error) ? data.error : fallback, false);
        } else {
          const reply = String(data.reply || '').trim() || matchLocalKnowledge(q, kb);
          history.push({ role: 'user', content: q }, { role: 'assistant', content: reply });
          addBubble('rui', reply, false);
        }
      } catch (err) {
        loadingRow.remove();
        addBubble('rui', matchLocalKnowledge(q, kb), false);
      }
    } else {
      /* 第一步：本地知识库智能应答 */
      setTimeout(() => {
        const ans = matchLocalKnowledge(q, kb);
        history.push({ role: 'user', content: q }, { role: 'assistant', content: ans });
        addBubble('rui', ans, false);
      }, 240);
    }

    busy = false;
    if (Date.now() >= cooldownUntil) {
      sendBtn.disabled = false;
      sendBtn.textContent = '发送';
    }
  }

  input.addEventListener('input', () => {
    const maxLen = cfg.maxInputChars || 100;
    charCount.textContent = input.value.length + '/' + maxLen;
  });

  function openRui() {
    if (isOpen) return;
    isOpen = true;
    initContent();
    fab.setAttribute('aria-expanded', 'true');
    fab.classList.add('is-hide');
    scrim.classList.add('on');
    panel.classList.add('on');
    doc.addEventListener('keydown', onKey);
    if (window.SLSpark) {
      const r = fab.getBoundingClientRect();
      window.SLSpark.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 12 });
    }
    setTimeout(() => input.focus({ preventScroll: true }), 120);
  }

  function closeRui() {
    if (!isOpen) return;
    isOpen = false;
    fab.setAttribute('aria-expanded', 'false');
    fab.classList.remove('is-hide');
    scrim.classList.remove('on');
    panel.classList.remove('on');
    doc.removeEventListener('keydown', onKey);
  }

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); closeRui(); }
  }

  fab.addEventListener('click', () => { if (isOpen) closeRui(); else openRui(); });
  closeBtn.addEventListener('click', closeRui);
  scrim.addEventListener('click', closeRui);

  /* 暴露全局接口，方便悬浮球菜单、底栏联系抽屉等处一键召唤 RUI */
  window.SLRui = { open: openRui, close: closeRui, toggle: () => (isOpen ? closeRui() : openRui()) };
  doc.addEventListener('sl:open-rui', openRui);
}
