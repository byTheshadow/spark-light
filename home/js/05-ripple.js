/* home/js/05-ripple.js —— 由原型拆分而来。经典脚本，按文件名顺序加载，共享同一页面作用域。 */
'use strict';
/* ============ 涟漪 ============ */
function Ripple(x,y,small){if(simple)return;var d=document.createElement('span');d.className='rp'+(small?' s':'');d.style.left=x+'px';d.style.top=y+'px';d.innerHTML='<i></i><i></i><b></b>';document.body.appendChild(d);setTimeout(function(){d.remove()},1400)}
