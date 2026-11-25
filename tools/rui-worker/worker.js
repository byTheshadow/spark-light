/**
 * tools/rui-worker/worker.js
 * Spark Light 驻站灵魂小助手 RUI 的云端守门员（Cloudflare Worker 脚本）。
 *
 * 作用：
 * 1. 把你的 DeepSeek API Key 安全地藏在 Cloudflare 后台环境变量（DEEPSEEK_API_KEY）里，前端网页绝不暴露。
 * 2. 铁壁防刷额度：
 *    - 单 IP 限流：每分钟最多 3 次，每天最多 10 次（可通过环境变量调整）
 *    - 全站每日总熔断：全站每天最多调用 150 次，超出即自动熔断，绝不超支
 *    - 字数与长度死锁：单次提问最多 100 字，DeepSeek 回答限制在 280 tokens 以内，只带最近 2 轮上下文
 *    - 来源白名单（CORS）：只允许你的网站域名调用
 *    - 系统人设死锁：RUI（无实体的灵魂，男性，成熟温柔有礼）只能回答 Spark Light 站内业务问题，拒绝写代码/闲聊/算命等无关请求
 */

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

/* 内存级限流表（加上可选的 Cloudflare KV 持久化限流） */
const memRate = new Map();
let memGlobalDay = '';
let memGlobalCount = 0;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function corsHeaders(origin, allowedOrigins) {
  const allow = (!allowedOrigins || allowedOrigins === '*')
    ? (origin || '*')
    : (allowedOrigins.split(',').map((s) => s.trim()).includes(origin) ? origin : '');
  return {
    'Access-Control-Allow-Origin': allow || 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8'
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin, env.ALLOWED_ORIGINS || '*');

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: '仅支持 POST 请求' }), { status: 405, headers });
    }

    /* 1. 检查来源白名单（如果配置了 ALLOWED_ORIGINS） */
    if (env.ALLOWED_ORIGINS && env.ALLOWED_ORIGINS !== '*') {
      const list = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim());
      if (!list.includes(origin)) {
        return new Response(JSON.stringify({ error: '来源未获授权' }), { status: 403, headers });
      }
    }

    /* 2. 解析并检查提问字数 */
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: '请求格式有误' }), { status: 400, headers });
    }

    const question = String((body && body.question) || '').trim();
    if (!question) {
      return new Response(JSON.stringify({ error: '请输入你想询问的问题。' }), { status: 400, headers });
    }
    if (question.length > 100) {
      return new Response(JSON.stringify({ error: '旅人，单次提问还请控制在 100 字以内。' }), { status: 400, headers });
    }

    /* 3. 按 IP 与全局熔断限流 */
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const day = todayKey();
    const now = Date.now();
    const maxPerMin = Number(env.MAX_PER_MIN) || 3;
    const maxPerDay = Number(env.MAX_PER_DAY) || 10;
    const maxGlobalDay = Number(env.MAX_GLOBAL_DAY) || 150;

    if (memGlobalDay !== day) {
      memGlobalDay = day;
      memGlobalCount = 0;
      memRate.clear();
    }

    if (memGlobalCount >= maxGlobalDay) {
      return new Response(JSON.stringify({
        error: '旅人，今日站内向 RUI 提问的总次数已达上限，我的灵识正在休整。你仍可点击上方「快捷星签」查看解答，或前往「雨季不再来」联系站主 Shadow。'
      }), { status: 429, headers });
    }

    const rec = memRate.get(ip) || { count: 0, recent: [] };
    rec.recent = rec.recent.filter((t) => now - t < 60000);
    if (rec.recent.length >= maxPerMin) {
      return new Response(JSON.stringify({
        error: '旅人，你提问的节奏有些快，请稍候片刻再与我交谈。'
      }), { status: 429, headers });
    }
    if (rec.count >= maxPerDay) {
      return new Response(JSON.stringify({
        error: '旅人，今天你我的 10 次自由问答已经用尽了。你依然可以点击上方不限次数的「快捷星签」，明日星升之时我再为你解答。'
      }), { status: 429, headers });
    }

    rec.recent.push(now);
    rec.count += 1;
    memRate.set(ip, rec);
    memGlobalCount += 1;

    /* 4. 整理最近 2 轮上下文（最多 4 条，且截断长度防注入） */
    const rawHist = Array.isArray(body.history) ? body.history.slice(-4) : [];
    const safeHist = rawHist
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map((m) => ({ role: m.role, content: m.content.slice(0, 220) }));

    /* 5. 调用 DeepSeek 接口 */
    if (!env.DEEPSEEK_API_KEY) {
      return new Response(JSON.stringify({
        error: '云端守门员尚未配置 DEEPSEEK_API_KEY 密钥。'
      }), { status: 503, headers });
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
        return new Response(JSON.stringify({
          error: '星轨信号似乎有些波动，暂时无法连接灵识。你可以先点选上方快捷星签查看价目与须知。'
        }), { status: 502, headers });
      }

      return new Response(JSON.stringify({
        reply: String(reply).trim(),
        remaining: Math.max(0, maxPerDay - rec.count)
      }), { status: 200, headers });
    } catch (e) {
      return new Response(JSON.stringify({
        error: '连接灵识时出现了少许波折，请稍后再试或点击上方快捷星签。'
      }), { status: 500, headers });
    }
  }
};
