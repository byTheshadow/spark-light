/* 最先执行的小脚本（放在 <head> 里，会阻塞渲染，很小）：
   1) 读取访客上次选择的主题，写入 data-theme 并加载对应 theme.css（避免闪烁）
   2) 决定动效模式 data-motion：访客手动选择 > 系统“减少动态效果”设置 */
(function () {
  var d = document.documentElement;
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  var root = d.getAttribute('data-root') || './';
  var themes = window.SL_THEMES || [];
  var ready = themes.filter(function (t) { return t.status === 'ready'; });
  var saved = get('sl.theme');
  var pick = ready.filter(function (t) { return t.id === saved; })[0] || ready[0];
  if (pick) {
    d.setAttribute('data-theme', pick.id);
    document.write('<link rel="stylesheet" id="sl-theme-css" href="' + root + pick.css + '">');
    var pg = d.getAttribute('data-page');
    if (pg && pick.pages && pick.pages[pg]) document.write('<link rel="stylesheet" id="sl-theme-page-css" href="' + root + pick.pages[pg] + '">');
    var m = document.querySelector('meta[name="theme-color"]');
    if (m && pick.themeColor) m.setAttribute('content', pick.themeColor);
  }
  var pref = get('sl.motion');
  var rm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var simple = pref === 'simple' ? true : pref === 'full' ? false : rm;
  d.setAttribute('data-motion', simple ? 'simple' : 'full');
  /* 外壳形态由主题决定（pill / bar），在这里先写上去，避免内容先按旧边距排版再跳一下 */
  d.setAttribute('data-chrome', pick && pick.chrome ? pick.chrome : 'bar');
})();
