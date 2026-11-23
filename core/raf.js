/* 共用的动画循环：页面切到后台、关闭或离开时立刻停止，回到前台再继续。
   用法：const loop = createLoop(); loop.add((now, dt) => { ... }); loop.start();
   每个页面各建各的循环，互不影响；没有注册函数时不会空转。 */
export function createLoop() {
  const fns = [];
  let raf = 0, last = 0, wanted = false;

  function tick(now) {
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    for (let i = 0; i < fns.length; i++) {
      try { fns[i](now, dt); } catch (e) { console.error('[Spark Light] 动画出错：', e); }
    }
    raf = requestAnimationFrame(tick);
  }
  function run() { if (!raf && wanted && !document.hidden) { last = 0; raf = requestAnimationFrame(tick); } }
  function halt() { if (raf) cancelAnimationFrame(raf); raf = 0; }

  document.addEventListener('visibilitychange', () => { document.hidden ? halt() : run(); });
  addEventListener('pagehide', halt);
  addEventListener('pageshow', run);

  return {
    add(fn) { fns.push(fn); },
    start() { wanted = true; run(); },
    stop() { wanted = false; halt(); }
  };
}

/** 是否处于简化动效：读取 <html data-motion>，访客可以在设置里切换，所以每次都现读 */
export function isSimple() { return document.documentElement.getAttribute('data-motion') === 'simple'; }

/** 小型伪随机数，同一个种子永远得到同样的序列（让装饰图案稳定，不每次刷新都变） */
export function lcg(seed) {
  let s = Math.abs(Math.floor(seed)) % 2147483646 + 1;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const pad2 = (n) => (n < 10 ? '0' : '') + n;
export function buzz(p) {
  if (!isSimple() && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) { /* 部分浏览器不支持 */ } }
}
