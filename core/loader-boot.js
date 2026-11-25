/* core/loader-boot.js
   放在 <body> 最前面的小脚本（普通脚本）：先判断这次进站要不要放加载页，
   要的话立刻铺一层黑，避免页面内容先闪一下再被盖住。
   真正的加载页由页面末尾的 core/loader.js 接手；这里只做判断和兜底。 */
(function () {
  var html = document.documentElement;
  var KEY = 'sl.loader.seen';

  /* 每次进入/刷新页面都显示加载页；只有从站内其他页面点击链接跳转过来时才跳过，避免切页面时闪黑屏 */
  try {
    var navEntries = performance.getEntriesByType && performance.getEntriesByType('navigation');
    var navType = (navEntries && navEntries[0] && navEntries[0].type) || '';
    var sameOriginRef = false;
    try {
      sameOriginRef = !!(document.referrer && new URL(document.referrer).origin === location.origin);
    } catch (e) {}
    if (navType === 'navigate' && sameOriginRef && sessionStorage.getItem(KEY) === '1') {
      html.setAttribute('data-loader', 'skip');
      return;
    }
  } catch (e) { /* 隐私模式下不可用，照常显示 */ }

  html.setAttribute('data-loader', 'on');
  html.setAttribute('data-loading', '');

  var veil = document.createElement('div');
  veil.className = 'slx-load';
  veil.id = 'slxLoad';
  veil.setAttribute('aria-hidden', 'true');
  if (document.body) document.body.insertBefore(veil, document.body.firstChild);
  else document.documentElement.appendChild(veil);

  window.__SL_LOADER_VEIL = veil;

  /* 兜底：脚本出错或一直没接手，最多 9 秒自己消失，绝不把站卡住 */
  window.__SL_LOADER_GUARD = window.setTimeout(function () {
    if (window.__SL_LOADER_DONE) return;
    veil.classList.add('slx-load--out');
    window.setTimeout(function () {
      if (veil.parentNode) veil.parentNode.removeChild(veil);
    }, 400);
    html.removeAttribute('data-loading');
    html.setAttribute('data-loader', 'done');
    try { sessionStorage.setItem(KEY, '1'); } catch (e) { /* 忽略 */ }
  }, 9000);
})();