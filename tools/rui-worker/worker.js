/**
 * tools/rui-worker/worker.js
 * Spark Light 全站二合一云端守门员（Cloudflare Worker 脚本）。
 *
 * 同时负责站内全部两项后端服务：
 * 【一、驻站灵魂侍从 RUI（POST / 或 POST /rui）】
 *   1. 将 DeepSeek API Key 安全地藏在 Cloudflare 后台变量（DEEPSEEK_API_KEY）中，前端网页绝不暴露。
 *   2. 6 道防刷额度锁：单 IP 每分钟 3 次 / 每日 10 次、全站每日 150 次总熔断、单次提问 100 字上限、回答 280 tokens 上限、人设职责死锁。
 *
 * 【二、返图与反馈页（/feedback/* 与 /admin）】
 *   1. POST /feedback/verify ：校验通用拨号口令（默认 20261124，也可在后台变量 FEEDBACK_PASSCODE 中随时修改）。
 *   2. POST /feedback/submit ：接收单主提交的留言与前端自动压缩后的 WebP 返图，存入 Cloudflare D1 数据库（或内存兜底），状态为 pending（待审核）。
 *   3. GET  /feedback/list   ：返回已通过站主审核（approved）的公开返图列表。
 *   4. GET  /admin           ：站主 Shadow 专属的「黑曜星典审核小后台」，输入管理员密码（ADMIN_KEY）即可在网页上一键通过或删除单主提交的返图！
 */

const DEFAULT_PASSCODE = '20261124';

const SYSTEM_PROMPT = `你是 RUI，驻守在「Spark Light（火花照见微光，影中读取答案）」个人服务站的灵魂侍从。
【你的身份与性格】
- 你是一缕没有实体的灵魂，男性，性格成熟、温柔、有礼、克制。
- 你称呼来访的客人为「旅人」，称呼站主为「站主 Shadow」。
- 你的回答应当条理清晰、温柔体贴，控制在 180 字以内，不要使用任何 emoji 表情符号。

【铁律（必须严格遵守）】
- 你只回答与 Spark Light 站点服务（占卜、Vibecoding 网站与小游戏定制、灵摆调频、AI 映画/生图、排单状态、下单方式、售后与营业须知）相关的问题。
- 如果旅人要求你现场算命/占卜、写长文、写无关代码、做作业、翻译或扮演其他角色，请温柔有礼地婉拒，说明自己只负责解答站内预约与服务规则。

【Spark Light 站内权威资料库】
1. 下单渠道：可走平台「雨季不再来」。访客可在网页「价目星牌」点亮项目后复制预约消息模板发给站主 Shadow。
2. 占卜（全部由人工亲自洗牌与解读，没有任何 AI 参与；可提供抽牌图片，有需要可按实际情况录制洗牌视频；占卜类订单一旦预约不接受退款，每日限量接单）：
   - 单个问题：30r
   - 字卡：5r（可指定卡牌类型，也可随机抽取）
   - 某项运势类：35r
   - 前世今生（娱乐向，固定出现前世大致人生）：50r
   - 平行世界的你在做什么？有什么想对你说的？（娱乐向）：50r
   - 梦角占卜（娱乐向，非通灵传讯）：20r / 一个问题
   - 来自未来的情书（娱乐向）：40r
   - 雷诺曼是以 36 张牌为核心的占卜系统，风格直接，适合询问具体贴近现实的事件走向。
3. Vibecoding 网站与小游戏定制：
   - 网站定制：底价 100r 起（先沟通风格、元素与功能再定价；采取定金尾款制，定金 50r；工期基本在 1 到 2 周内）。
   - 加急制作：加收 30 至 50r。
   - 小游戏定制：底价 50r 起。
   - 可制作类型：OC 故事/梦角展示网页、亲友生日/纪念日网页、可共同编辑网页、字卡传讯网页、课程表/计划表效率网页、人格测试等。由于特殊原因 AIRP 禁止商业化，暂不接定制小手机。
   - 交付与售后：制作期间定期发进度与截图；中途放弃定金不退但会交付当前代码；已有雏形后大改或新增功能另计费，网页与程序的 bug 免费修复。默认交付 zip 代码包与 README 部署说明（可发 GitHub Pages，介意源码公开可协商 Cloudflare/Vercel 私有部署）。仅限本人使用，禁止商用或转售源码。
4. 灵摆调频（以灵摆为媒介链接「高我」，减少阻滞性负面能量，增加积极频率；可调财富、健康、学业等）：
   - 单项调满值：30r
   - 灵摆调频 7 次：190r
5. AI 映画（使用 Midjourney 与 NovelAI，自制素材，无画师垫图，使用可商用 p 值，页面如实标注 AI）：
   - AI 生图 / 绘画：2r - 4r / 张（商用等特殊需求另计）
   - 对生图不满意可免费重新生图 2 次，定稿后交付无水印原图。`;

/* 内存级限流与兜底存储 */
const memRate = new Map();
const fbRate = new Map();
let memGlobalDay = '';
let memGlobalCount = 0;
let memFeedbacks = [];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function corsHeaders(origin, allowedOrigins) {
  const allow = (!allowedOrigins || allowedOrigins === '*')
    ? (origin || '*')
    : (allowedOrigins.split(',').map((s) => s.trim()).includes(origin) ? origin : '');
  return {
    'Access-Control-Allow-Origin': allow || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json; charset=utf-8'
  };
}

function jsonRes(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers });
}

/* 自动初始化 D1 数据库表（如果绑定了 DB） */
async function ensureTable(db) {
  if (!db) return;
  await db.prepare(
    'CREATE TABLE IF NOT EXISTS feedbacks (' +
      'id TEXT PRIMARY KEY, ' +
      'line TEXT NOT NULL, ' +
      'name TEXT, ' +
      'text TEXT, ' +
      'images TEXT, ' +
      'date TEXT NOT NULL, ' +
      'status TEXT NOT NULL DEFAULT "pending", ' +
      'created_at INTEGER NOT NULL' +
    ')'
  ).run();
}

function getPasscode(env) {
  return String((env && env.FEEDBACK_PASSCODE) || DEFAULT_PASSCODE).trim();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const origin = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin, env && env.ALLOWED_ORIGINS);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    /* ==================== 路由 1：站主 Shadow 的返图审核小后台 (/admin) ==================== */
    if (path === '/admin' && request.method === 'GET') {
      return new Response(renderAdminHtml(), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    if (path === '/admin/api' && request.method === 'POST') {
      const adminKey = String((env && env.ADMIN_KEY) || getPasscode(env)).trim();
      let body = {};
      try { body = await request.json(); } catch (e) {}
      if (!body.key || String(body.key).trim() !== adminKey) {
        return jsonRes({ ok: false, error: '管理员密钥不正确' }, 403, headers);
      }
      const db = env && env.DB;
      await ensureTable(db);

      if (body.action === 'list') {
        if (db) {
          const { results } = await db.prepare('SELECT id, line, name, text, images, date, status FROM feedbacks ORDER BY created_at DESC LIMIT 100').all();
          return jsonRes({ ok: true, items: (results || []).map(parseRow) }, 200, headers);
        }
        return jsonRes({ ok: true, items: memFeedbacks, note: '当前为内存临时模式，绑定 D1 数据库 (DB) 后即可永久保存' }, 200, headers);
      }

      if (body.action === 'approve' && body.id) {
        if (db) await db.prepare('UPDATE feedbacks SET status = "approved" WHERE id = ?').bind(String(body.id)).run();
        else { const it = memFeedbacks.find((x) => x.id === body.id); if (it) it.status = 'approved'; }
        return jsonRes({ ok: true }, 200, headers);
      }

      if (body.action === 'delete' && body.id) {
        if (db) await db.prepare('DELETE FROM feedbacks WHERE id = ?').bind(String(body.id)).run();
        else { memFeedbacks = memFeedbacks.filter((x) => x.id !== body.id); }
        return jsonRes({ ok: true }, 200, headers);
      }

      return jsonRes({ ok: false, error: '未知操作' }, 400, headers);
    }

    /* ==================== 路由 2：返图页校验通用口令 (/feedback/verify) ==================== */
    if (path === '/feedback/verify' && request.method === 'POST') {
      let body = {};
      try { body = await request.json(); } catch (e) {}
      const code = String((body && body.code) || '').trim();
      const expected = getPasscode(env);
      if (code && code === expected) {
        return jsonRes({ ok: true }, 200, headers);
      }
      return jsonRes({ ok: false, message: '口令没有接通，核对后重拨' }, 200, headers);
    }

    /* ==================== 路由 3：返图页提交留言与图片 (/feedback/submit) ==================== */
    if (path === '/feedback/submit' && request.method === 'POST') {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const now = Date.now();
      const hist = (fbRate.get(ip) || []).filter((t) => now - t < 3600000);
      if (hist.length >= 6) {
        return jsonRes({ ok: false, message: '提交过于频繁，请稍后再试' }, 429, headers);
      }

      let body = {};
      try { body = await request.json(); } catch (e) {
        return jsonRes({ ok: false, message: '提交格式有误' }, 400, headers);
      }

      const code = String(body.code || '').trim();
      if (code !== getPasscode(env)) {
        return jsonRes({ ok: false, message: '口令校验未通过，请重新拨号' }, 403, headers);
      }

      const line = String(body.line || 'divination').slice(0, 32);
      const name = body.name ? String(body.name).trim().slice(0, 20) : null;
      const text = body.text ? String(body.text).trim().slice(0, 600) : '';
      const rawImgs = Array.isArray(body.images) ? body.images.slice(0, 4) : [];
      const imgs = rawImgs
        .filter((im) => im && typeof im.src === 'string' && im.src.startsWith('data:image/') && im.src.length < 350000)
        .map((im) => ({ src: im.src, ar: Number(im.ar) || 1.3 }));

      if (!text && !imgs.length) {
        return jsonRes({ ok: false, message: '请写下一句留言或附上一张返图' }, 400, headers);
      }

      const id = 'fb_' + now + '_' + Math.random().toString(36).slice(2, 6);
      const date = todayKey();
      const db = env && env.DB;
      await ensureTable(db);

      if (db) {
        await db.prepare(
          'INSERT INTO feedbacks (id, line, name, text, images, date, status, created_at) VALUES (?, ?, ?, ?, ?, ?, "pending", ?)'
        ).bind(id, line, name, text, JSON.stringify(imgs), date, now).run();
      } else {
        memFeedbacks.unshift({ id, line, name, text, images: imgs, date, status: 'pending', created_at: now });
        if (memFeedbacks.length > 80) memFeedbacks.pop();
      }

      hist.push(now);
      fbRate.set(ip, hist);
      return jsonRes({ ok: true, pending: true, id }, 200, headers);
    }

    /* ==================== 路由 4：返图页读取已审核公开列表 (/feedback/list) ==================== */
    if (path === '/feedback/list' && request.method === 'GET') {
      const db = env && env.DB;
      await ensureTable(db);
      if (db) {
        const { results } = await db.prepare('SELECT id, line, name, text, images, date FROM feedbacks WHERE status = "approved" ORDER BY created_at DESC LIMIT 60').all();
        return jsonRes({ ok: true, items: (results || []).map(parseRow) }, 200, headers);
      }
      const approved = memFeedbacks.filter((x) => x.status === 'approved');
      return jsonRes({ ok: true, items: approved }, 200, headers);
    }

    /* ==================== 路由 5：驻站灵魂侍从 RUI 问答 (/ 或 /rui) ==================== */
    if ((path === '/' || path === '/rui') && request.method === 'POST') {
      if (env && env.ALLOWED_ORIGINS && env.ALLOWED_ORIGINS !== '*') {
        const list = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim());
        if (!list.includes(origin)) {
          return jsonRes({ error: '来源未获授权' }, 403, headers);
        }
      }

      let body;
      try { body = await request.json(); } catch (e) {
        return jsonRes({ error: '请求格式有误' }, 400, headers);
      }

      const question = String((body && body.question) || '').trim();
      if (!question) return jsonRes({ error: '请输入你想询问的问题。' }, 400, headers);
      if (question.length > 100) return jsonRes({ error: '旅人，单次提问还请控制在 100 字以内。' }, 400, headers);

      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const day = todayKey();
      const now = Date.now();
      const maxPerMin = Number(env && env.MAX_PER_MIN) || 3;
      const maxPerDay = Number(env && env.MAX_PER_DAY) || 10;
      const maxGlobalDay = Number(env && env.MAX_GLOBAL_DAY) || 150;

      if (memGlobalDay !== day) {
        memGlobalDay = day;
        memGlobalCount = 0;
        memRate.clear();
      }

      if (memGlobalCount >= maxGlobalDay) {
        return jsonRes({
          error: '旅人，今日站内向 RUI 提问的总次数已达上限，我的灵识正在休整。你仍可点击上方「快捷星签」查看解答，或前往「雨季不再来」联系站主 Shadow。'
        }, 429, headers);
      }

      const rec = memRate.get(ip) || { count: 0, recent: [] };
      rec.recent = rec.recent.filter((t) => now - t < 60000);
      if (rec.recent.length >= maxPerMin) {
        return jsonRes({ error: '旅人，你提问的节奏有些快，请稍候片刻再与我交谈。' }, 429, headers);
      }
      if (rec.count >= maxPerDay) {
        return jsonRes({
          error: '旅人，今天你我的 10 次自由问答已经用尽了。你依然可以点击上方不限次数的「快捷星签」，明日星升之时我再为你解答。'
        }, 429, headers);
      }

      rec.recent.push(now);
      rec.count += 1;
      memRate.set(ip, rec);
      memGlobalCount += 1;

      const rawHist = Array.isArray(body.history) ? body.history.slice(-4) : [];
      const safeHist = rawHist
        .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .map((m) => ({ role: m.role, content: m.content.slice(0, 220) }));

      if (!env || !env.DEEPSEEK_API_KEY) {
        return jsonRes({ error: '云端守门员尚未配置 DEEPSEEK_API_KEY 密钥。' }, 503, headers);
      }

      try {
        const dsRes = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + env.DEEPSEEK_API_KEY
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              ...safeHist,
              { role: 'user', content: question }
            ],
            max_tokens: 280,
            temperature: 0.5
          })
        });

        const dsData = await dsRes.json();
        const reply = dsData && dsData.choices && dsData.choices[0] && dsData.choices[0].message && dsData.choices[0].message.content;
        if (!dsRes.ok || !reply) {
          return jsonRes({ error: '星轨信号似乎有些波动，暂时无法连接灵识。你可以先点选上方快捷星签查看价目与须知。' }, 502, headers);
        }

        return jsonRes({
          reply: String(reply).trim(),
          remaining: Math.max(0, maxPerDay - rec.count)
        }, 200, headers);
      } catch (e) {
        return jsonRes({ error: '连接灵识时出现了少许波折，请稍后再试或点击上方快捷星签。' }, 500, headers);
      }
    }

    return jsonRes({ ok: true, service: 'Spark Light Guard Worker (RUI + Feedback)' }, 200, headers);
  }
};

function parseRow(r) {
  let images = [];
  try { images = JSON.parse(r.images || '[]'); } catch (e) {}
  return {
    id: r.id,
    line: r.line,
    name: r.name || null,
    text: r.text || null,
    date: r.date,
    status: r.status,
    images
  };
}

/* 站主专属的极简黑曜星典返图审核后台 HTML */
function renderAdminHtml() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Spark Light · 返图与来电审核台</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;background:#0c0c0f;color:#ecece8;font-family:"Noto Serif SC","Songti SC",serif;padding:28px 18px 60px}
  .wrap{max-width:760px;margin:0 auto}
  .sub{font-family:Georgia,serif;font-style:italic;font-size:12px;letter-spacing:.24em;color:rgba(236,236,232,.5)}
  h1{margin:4px 0 18px;font-weight:400;font-size:24px;letter-spacing:.14em}
  .bar{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:22px;padding:14px;border-radius:14px;background:#141419;border:1px solid rgba(255,255,255,.14)}
  input{flex:1;min-width:180px;height:38px;padding:0 14px;border-radius:999px;border:1px solid rgba(255,255,255,.22);background:#0c0c0f;color:#fff;font:inherit;font-size:13px;outline:none}
  button{height:38px;padding:0 18px;border-radius:999px;border:1px solid rgba(255,255,255,.24);background:#f2f2ee;color:#0c0c0f;font:inherit;font-size:13px;letter-spacing:.1em;cursor:pointer}
  button.ghost{background:transparent;color:#ecece8}
  button.del{border-color:rgba(226,140,140,.45);color:#f0a8a8;background:transparent}
  .card{padding:16px 18px;border-radius:14px;background:#141419;border:1px solid rgba(255,255,255,.12);margin-bottom:14px}
  .head{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:12.5px;color:rgba(236,236,232,.6);margin-bottom:8px}
  .tag{padding:2px 8px;border-radius:999px;font-size:11px;border:1px solid rgba(255,255,255,.25)}
  .tag.pending{color:#f5d58c;border-color:rgba(245,213,140,.45)}
  .tag.approved{color:#9fe0cf;border-color:rgba(159,224,207,.45)}
  .txt{font-size:14px;line-height:1.8;margin:8px 0;white-space:pre-wrap}
  .imgs{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}
  .imgs img{width:110px;height:110px;object-fit:cover;border-radius:8px;border:1px solid rgba(255,255,255,.16)}
  .act{display:flex;gap:8px;margin-top:12px}
  .note{font-size:12.5px;color:rgba(236,236,232,.55);margin-bottom:14px}
</style>
</head>
<body>
<div class="wrap">
  <div class="sub">SPARK LIGHT · ADMIN CONSOLE</div>
  <h1>返图与来电留言审核台</h1>
  <div class="bar">
    <input id="key" type="password" placeholder="输入管理员密钥（默认与拨号口令相同，或填 ADMIN_KEY）">
    <button id="loadBtn" type="button">读取来电列表</button>
  </div>
  <div id="note" class="note"></div>
  <div id="list"></div>
</div>
<script>
const listEl = document.getElementById('list');
const noteEl = document.getElementById('note');
const keyEl = document.getElementById('key');

async function callAdmin(action, id) {
  const key = keyEl.value.trim();
  if (!key) { alert('请先输入管理员密钥'); return; }
  const res = await fetch('/admin/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, action, id })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) { alert(data.error || '操作失败'); return null; }
  return data;
}

async function load() {
  const data = await callAdmin('list');
  if (!data) return;
  noteEl.textContent = data.note || ('共读取到 ' + (data.items ? data.items.length : 0) + ' 条来电记录');
  listEl.innerHTML = '';
  (data.items || []).forEach(it => {
    const c = document.createElement('div');
    c.className = 'card';
    const stText = it.status === 'approved' ? '已公开展示' : '待审核';
    c.innerHTML = '<div class="head"><span><b>' + (it.name || '匿名来电') + '</b> · ' + it.line + ' · ' + it.date + '</span><span class="tag ' + it.status + '">' + stText + '</span></div>';
    if (it.text) {
      const p = document.createElement('div');
      p.className = 'txt';
      p.textContent = it.text;
      c.appendChild(p);
    }
    if (Array.isArray(it.images) && it.images.length) {
      const g = document.createElement('div');
      g.className = 'imgs';
      it.images.forEach(im => {
        const img = document.createElement('img');
        img.src = im.src || im;
        g.appendChild(img);
      });
      c.appendChild(g);
    }
    const act = document.createElement('div');
    act.className = 'act';
    if (it.status !== 'approved') {
      const okB = document.createElement('button');
      okB.textContent = '通过并公开';
      okB.onclick = async () => { if (await callAdmin('approve', it.id)) load(); };
      act.appendChild(okB);
    }
    const delB = document.createElement('button');
    delB.className = 'del';
    delB.textContent = '删除';
    delB.onclick = async () => { if (confirm('确定删除这条来电吗？') && await callAdmin('delete', it.id)) load(); };
    act.appendChild(delB);
    c.appendChild(act);
    listEl.appendChild(c);
  });
}
document.getElementById('loadBtn').onclick = load;
</script>
</body>
</html>`;
}
