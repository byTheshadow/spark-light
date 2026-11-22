/* 星光迸发：弹层打开时，从点击位置迸出一小撮四角星，约 0.8 秒后自行消失。
   - 只用 transform 与 opacity 做动画，不重排；同时最多 24 颗，节点用完立刻移除。
   - 简化动效（data-motion="simple"）或系统“减少动态效果”时完全不出现。
   - 出错只记控制台，不影响弹层本身。
   用法：window.SLSpark.burst(x, y, { n: 8 })；不传坐标时，用最近一次点击位置（1.5 秒内有效），否则用屏幕中偏下。 */
(function () {
  var last = { x: 0, y: 0, t: -1e9 };
  var PAL = ['#b9b0ff', '#8fd6cb', '#f2b4cb', '#2c2c30', '#d8d2ff'];
  var layer = null;

  addEventListener('pointerdown', function (e) { last = { x: e.clientX, y: e.clientY, t: performance.now() }; }, { capture: true, passive: true });

  function off() {
    var d = document.documentElement;
    if (d.getAttribute('data-motion') === 'simple') return true;
    return !(window.matchMedia && matchMedia('(prefers-reduced-motion: no-preference)').matches) && d.getAttribute('data-motion') !== 'full';
  }

  function burst(x, y, opt) {
    try {
      if (off() || !document.body || !Element.prototype.animate) return;
      if (typeof x !== 'number' || typeof y !== 'number') {
        if (performance.now() - last.t < 1500) { x = last.x; y = last.y; } else { x = innerWidth / 2; y = innerHeight * 0.58; }
      }
      if (!layer || !layer.isConnected) {
        layer = document.createElement('div');
        layer.className = 'sl-spark-layer'; layer.setAttribute('aria-hidden', 'true');
        document.body.appendChild(layer);
      }
      var n = Math.min((opt && opt.n) || 8, 12);
      if (layer.childElementCount > 24) return;
      for (var i = 0; i < n; i++) {
        var s = document.createElement('span');
        var size = 7 + Math.random() * 9;
        s.className = 'sl-spark';
        s.style.width = s.style.height = size.toFixed(1) + 'px';
        s.style.background = PAL[i % PAL.length];
        layer.appendChild(s);
        var ang = (Math.PI * 2 * i) / n + Math.random() * 0.6;
        var dist = 34 + Math.random() * 56;
        var dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist - 14;
        var rot = (Math.random() * 120 - 60).toFixed(0);
        var base = 'translate(' + (x - size / 2).toFixed(1) + 'px,' + (y - size / 2).toFixed(1) + 'px) ';
        var a = s.animate([
          { transform: base + 'translate(0,0) scale(.2) rotate(0deg)', opacity: 0 },
          { transform: base + 'translate(' + (dx * 0.45).toFixed(1) + 'px,' + (dy * 0.45).toFixed(1) + 'px) scale(1.1) rotate(' + (rot / 2) + 'deg)', opacity: 1, offset: 0.3 },
          { transform: base + 'translate(' + dx.toFixed(1) + 'px,' + (dy + 22).toFixed(1) + 'px) scale(.3) rotate(' + rot + 'deg)', opacity: 0 }
        ], { duration: 650 + Math.random() * 300, easing: 'cubic-bezier(.2,.8,.25,1)', delay: Math.random() * 60 });
        a.onfinish = (function (el) { return function () { el.remove(); }; })(s);
        a.oncancel = a.onfinish;
      }
    } catch (e) { console.warn('[Spark Light] 星光效果出错：', e && e.message); }
  }
  window.SLSpark = { burst: burst };
})();
