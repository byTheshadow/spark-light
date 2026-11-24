/* 加载页模板：一条中线从左长到右，站名在上面。
   复制整个 _template 文件夹改名，就能做一个新的加载页。 */

let root = null;
let api = null;
let bar = null;
let label = null;

export function mount(host, ctx) {
  api = ctx;

  root = document.createElement('div');
  root.className = 'slx-tpl';
  root.innerHTML =
    '<div class="slx-tpl-mid">' +
      '<p class="slx-tpl-name"></p>' +
      '<div class="slx-tpl-bar"><i></i></div>' +
    '</div>';
  host.appendChild(root);

  label = root.querySelector('.slx-tpl-name');
  bar = root.querySelector('.slx-tpl-bar i');

  /* 文案：这一页自己的，不读站名也可以；要读就等 core 传进来 */
  label.textContent = 'Spark Light';

  paint(ctx.progress());
}

function paint(p) {
  if (root) root.style.setProperty('--p', p.toFixed(3));
}

export function frame(now, dt) {
  if (!root || !api) return;
  paint(api.progress());
}

/** 进度满：给一个短促的收尾，然后告诉 core 可以淡出了 */
export function finish() {
  if (!root) return;
  root.classList.add('done');
  setTimeout(function () { if (api) api.done(); }, 420);
}

export function unmount() {
  if (root && root.parentNode) root.parentNode.removeChild(root);
  root = null;
  api = null;
  bar = null;
  label = null;
}