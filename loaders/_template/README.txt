加载页模板
==================================================

一个加载页就是一个文件夹：loader.js + loader.css（+ 这个 README.txt）。

必须导出
  mount(host, ctx)
      host：core 建好的那一层黑底 div（.slx-load），把内容挂在这里面。
      ctx.progress()  返回 0~1 的真实进度，每帧现读。
      ctx.simple      访客是否选了“简化动效”（true 时不要播放大动画）。
      ctx.done()      你自己的收尾动画播完时调用一次。

  unmount()
      停掉动画、计时器、监听，清空画布。core 在这之后会删掉整层。

可选导出
  frame(now, dt)   core 的动画循环每帧调用（全站只有这一条循环，不要自己开 rAF）。
  finish()         进度推满那一刻调用一次，用来播收尾动画。

不要做
  - 不要碰页面其他部分，不要 import 页面代码，不要读别的页面的数据
  - 不要自己开 requestAnimationFrame / setInterval
  - 不要自动播放声音（浏览器会拦），也不要把音效开关做成第二个“点一下”
  - 不要用 emoji（tools/check_no_emoji.py 会拦）

样式
  所有选择器都写在 .slx-load 之下，例如 .slx-ar-xxx，避免影响站点。
  颜色、字体尽量用 core/base.css 里的 --sl-* 变量，兜底字体已经配好。