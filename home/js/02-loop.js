/* home/js/02-loop.js —— 由原型拆分而来。经典脚本，按文件名顺序加载，共享同一页面作用域。 */
'use strict';
/* ============ 主循环 ============ */
var Loop=(function(){var fns=[],last=performance.now(),run=true;
  function f(now){var dt=Math.min(.05,(now-last)/1000);last=now;for(var i=0;i<fns.length;i++){try{fns[i](now,dt)}catch(e){}}if(run)requestAnimationFrame(f)}
  document.addEventListener('visibilitychange',function(){if(document.hidden)run=false;else if(!run){run=true;last=performance.now();requestAnimationFrame(f)}});
  requestAnimationFrame(f);return {add:function(fn){fns.push(fn)}}})();


var PT={x:innerWidth/2,y:innerHeight/2,has:false};

addEventListener('pointermove',function(e){PT.x=e.clientX;PT.y=e.clientY;PT.has=true},{passive:true});
