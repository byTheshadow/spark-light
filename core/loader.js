/* core/loader.js
   加载页引擎。一次进站只跑一遍：
     挑一个（随机，不和上一次重复）
     -> 加载它的样式与脚本
     -> 挂上去
     -> 用真实进度推着走（最短约 0.62 秒，1.5 秒封顶）
     -> 收尾动画（最多再等 1 秒）
     -> 淡出、卸载、记住“这次进站已经放过”
   任何一步出错都直接跳过，页面照常显示。
   加载页要导出什么、怎么写，见 loaders/_template/README.txt。 */

import { isSimple, createLoop } from './raf.js';

const MIN_MS = 3800;       /* 最短停留：约 3.8–4.4 秒推进 + 1.35 秒揭牌收尾，整段约 5.2 秒，从容展示星盘与揭牌，随时可点一下跳过 */
const MAX_MS = 4500;       /* 进度封顶：4.5 秒推满 */
const FINISH_MS = 1400;    /* 收尾动画的预算（让第十七张星辰牌翻转与冲击波完整播完） */
const FADE_MS = 420;       /* 淡出时长 */
const CSS_WAIT_MS = 500;   /* 加载页样式最多等这么久 */
const SEEN_KEY = 'sl.loader.seen';
const LAST_KEY = 'sl.loader.last';

let started = false;

function sget(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
function sset(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* 隐私模式，忽略 */ } }
function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

/** 由 core/boot.js 调用。只有 core/loader-boot.js 判定需要显示时才真的开始 */
export function startLoader() {
  if (started) return;
  var html = document.documentElement;
  if (html.getAttribute('data-loader') !== 'on') return;
  var host = document.getElementById('slxLoad');
  if (!host) { html.setAttribute('data-loader', 'done'); return; }
  started = true;
  run(host).catch(function (e) {
    console.error('[Spark Light] 加载页出错，跳过：', e);
    takeOver(host);
  });
}

async function run(host) {
  var html = document.documentElement;
  var simple = isSimple();
  var t0 = performance.now();

  /* ---- 1. 选一个 ---- */
  var reg = await import(new URL('../loaders/registry.js', import.meta.url)).catch(function () { return null; });
  var all = (reg && Array.isArray(reg.LOADERS) ? reg.LOADERS : []).filter(function (l) {
    return l && l.id && l.status === 'ready';
  });
  if (!all.length) { takeOver(host); return; }
  var pick = choose(all);

  /* ---- 2. 样式与脚本 ---- */
  await loadCss(new URL('../' + pick.css, import.meta.url));
  var mod = await import(new URL('../' + pick.js, import.meta.url)).catch(function (e) {
    console.error('[Spark Light] 加载页脚本加载失败：', pick.id, e);
    return null;
  });
  if (!mod || typeof mod.mount !== 'function') { takeOver(host); return; }

  /* ---- 3. 进度：真实里程碑 + 时间兜底 ---- */
  var p = 0.06, target = 0.14, allReady = false, pending = 3;
  var finishing = false, finished = false, skipped = false;
  var resolveFinish = function () {};
  var finishedOnce = new Promise(function (r) { resolveFinish = r; });

  var api = {
    progress: function () { return p; },
    simple: simple,
    done: function () { resolveFinish(); }
  };

  function step() { pending -= 1; if (pending <= 0) allReady = true; }

  step();                                             /* 模块已经挂上来了 */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(step, step);
  else step();
  if (document.readyState === 'complete') step();
  else window.addEventListener('load', step, { once: true });

  var loop = createLoop();
  loop.add(function (nowMs, dt) {
    if (finished) return;
    var elapsed = nowMs - t0;

    if (!allReady) target = Math.min(0.9, target + dt * 0.12);
    if (elapsed >= MAX_MS) { allReady = true; target = 1; }
    if (elapsed < MIN_MS) target = Math.min(target, 0.08 + (elapsed / MIN_MS) * 0.87);

    p += (target - p) * Math.min(1, dt * 9);
    /* 收尾段改用线性推进：指数逼近在低帧率下要多等半秒 */
    if (target >= 1 && p > 0.9) p = Math.min(1, p + dt * 2.2);
    if (p > 0.998) p = 1;

    if (typeof mod.frame === 'function') {
      try { mod.frame(nowMs, dt); } catch (e) { console.error('[Spark Light] 加载页动画出错：', e); }
    }
    if (p >= 1) finish();
  });
  /* ---- 4. 挂上去 ---- */
  try {
    mod.mount(host, api);
  } catch (e) {
    console.error('[Spark Light] 加载页挂载失败：', e);
    takeOver(host);
    return;
  }
  sset(SEEN_KEY, '1');
  sset(LAST_KEY, pick.id);
  if (window.__SL_LOADER_GUARD) clearTimeout(window.__SL_LOADER_GUARD);

  /* ---- 5. 跳过：点一下（左键/轻触）或 Esc，回车与空格也算 ---- */
  function onPointer(e) { if (e && typeof e.button === 'number' && e.button > 0) return; skip(); }
  function onKey(e) {
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); skip(); }
  }
  function skip() { if (finishing || finished) return; skipped = true; p = 1; target = 1; finish(); }
  window.addEventListener('pointerdown', onPointer, { passive: true, capture: true });
  window.addEventListener('keydown', onKey, true);

  /* ---- 6. 收尾 ---- */
  async function finish() {
    if (finishing || finished) return;
    finishing = true;
    if (!skipped && typeof mod.finish === 'function') {
      try { mod.finish(); } catch (e) { console.error('[Spark Light] 加载页收尾出错：', e); resolveFinish(); }
    }
    var budget = skipped ? 80 : (simple ? 220 : FINISH_MS);
    await Promise.race([finishedOnce, wait(budget)]);
    teardown();
  }

  function teardown() {
    if (finished) return;
    finished = true;
    loop.stop();
    window.removeEventListener('pointerdown', onPointer, true);
    window.removeEventListener('keydown', onKey, true);
    try { if (typeof mod.unmount === 'function') mod.unmount(); } catch (e) { console.error('[Spark Light] 加载页卸载出错：', e); }
    host.classList.add('slx-load--out');
    setTimeout(function () {
      if (host.parentNode) host.parentNode.removeChild(host);
      html.removeAttribute('data-loading');
      html.setAttribute('data-loader', 'done');
      window.__SL_LOADER_DONE = true;
      if (window.__SL_LOADER_GUARD) clearTimeout(window.__SL_LOADER_GUARD);
    }, simple ? 30 : FADE_MS);
  }

  loop.start();
}

/** 没有可用的加载页，或中途出错：立刻让层消失，站点照常可看 */
function takeOver(host) {
  var html = document.documentElement;
  host.classList.add('slx-load--out');
  html.removeAttribute('data-loading');
  html.setAttribute('data-loader', 'done');
  window.__SL_LOADER_DONE = true;
  if (window.__SL_LOADER_GUARD) clearTimeout(window.__SL_LOADER_GUARD);
  sset(SEEN_KEY, '1');
  setTimeout(function () { if (host.parentNode) host.parentNode.removeChild(host); }, 400);
}

/** 随机挑一个，但尽量不和上一次重复；可以给每页写 weight 调概率 */
function choose(list) {
  var last = sget(LAST_KEY);
  var pool = list;
  if (list.length > 1) {
    var alt = list.filter(function (l) { return l.id !== last; });
    if (alt.length) pool = alt;
  }
  var total = 0, i;
  for (i = 0; i < pool.length; i++) total += Math.max(0.01, pool[i].weight || 1);
  var r = Math.random() * total;
  for (i = 0; i < pool.length; i++) {
    r -= Math.max(0.01, pool[i].weight || 1);
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/** 插一个样式表，最多等 CSS_WAIT_MS，等不到就算了（不会把站卡住） */
function loadCss(url) {
  return new Promise(function (resolve) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url.href;
    var done = false;
    function end() { if (done) return; done = true; resolve(); }
    link.addEventListener('load', end, { once: true });
    link.addEventListener('error', end, { once: true });
    document.head.appendChild(link);
    setTimeout(end, CSS_WAIT_MS);
  });
}