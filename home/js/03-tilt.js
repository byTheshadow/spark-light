/* home/js/03-tilt.js —— 由原型拆分而来。经典脚本，按文件名顺序加载，共享同一页面作用域。 */
'use strict';
/* ============ 体感 ============ */
var Tilt=(function(){
  var T={x:0,y:0,tx:0,ty:0,state:'none',gyro:false},DOE=window.DeviceOrientationEvent,need=!!(DOE&&typeof DOE.requestPermission==='function'),base=null;
  T.state=(!DOE||FINE)?'none':need?'ask':'auto';
  function on(e){if(e.beta==null)return;if(!base)base={b:e.beta,g:e.gamma};base.b+=(e.beta-base.b)*.004;base.g+=(e.gamma-base.g)*.004;T.gyro=true;T.state='on';T.tx=clamp((e.gamma-base.g)/22,-1,1);T.ty=clamp((e.beta-base.b)/22,-1,1)}
  if(T.state==='auto')addEventListener('deviceorientation',on);
  T.ask=function(){if(T.state!=='ask'&&T.state!=='denied')return Promise.resolve();return DOE.requestPermission().then(function(s){if(s==='granted'){addEventListener('deviceorientation',on);T.state='on'}else T.state='denied'}).catch(function(){T.state='denied'})};
  Loop.add(function(now,dt){
    if(simple){T.x*=.9;T.y*=.9;return}
    if(!T.gyro){if(FINE&&PT.has){T.tx=(PT.x/innerWidth-.5)*2;T.ty=(PT.y/innerHeight-.5)*2}else{var t=now*.001;T.tx=Math.sin(t*.35)*.4;T.ty=Math.cos(t*.27)*.3}}
    var k=Math.min(1,dt*4);T.x+=(T.tx-T.x)*k;T.y+=(T.ty-T.y)*k});
  return T;
})();
