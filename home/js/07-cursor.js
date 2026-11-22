/* home/js/07-cursor.js —— 由原型拆分而来。经典脚本，按文件名顺序加载，共享同一页面作用域。 */
'use strict';
/* ============ 光标与按钮反馈 ============ */
if(FINE){(function(){
  var r=document.createElement('div');r.className='cring';r.innerHTML='<i></i>';document.body.appendChild(r);var x=-80,y=-80;
  document.addEventListener('pointerover',function(e){var t=e.target;r.classList.toggle('hov',!!(t&&t.closest&&t.closest('button,a,input,label,[role=button],[role=slider],[data-kin],.bm.show,.ent,.pend,.fob-btn,.pc')))},{passive:true});
  document.addEventListener('pointerdown',function(){r.classList.add('dn')},{passive:true});
  document.addEventListener('pointerup',function(){r.classList.remove('dn')},{passive:true});
  document.documentElement.addEventListener('mouseleave',function(){r.classList.add('out')});
  document.documentElement.addEventListener('mouseenter',function(){r.classList.remove('out')});
  Loop.add(function(n,dt){var k=Math.min(1,dt*18);x+=(PT.x-x)*k;y+=(PT.y-y)*k;r.style.transform='translate('+x.toFixed(1)+'px,'+y.toFixed(1)+'px)'});
})()}

document.addEventListener('pointerdown',function(e){
  var b=e.target&&e.target.closest&&e.target.closest('.btn,.cl,.chip,.prow,.tab,.mi,.row,.rbtn,.nt-h');if(!b||b.disabled)return;
  var r=b.getBoundingClientRect(),d=Math.hypot(r.width,r.height)*2,s=document.createElement('span');s.className='ink';
  s.style.cssText='width:'+d+'px;height:'+d+'px;left:'+(e.clientX-r.left-d/2)+'px;top:'+(e.clientY-r.top-d/2)+'px';b.appendChild(s);setTimeout(function(){s.remove()},800);buzz(4);
},{passive:true});

document.addEventListener('pointermove',function(e){
  var b=e.target&&e.target.closest&&e.target.closest('.btn');if(!b)return;var r=b.getBoundingClientRect();
  b.style.setProperty('--hx',((e.clientX-r.left)/r.width*100).toFixed(1)+'%');b.style.setProperty('--hy',((e.clientY-r.top)/r.height*100).toFixed(1)+'%');
  if(FINE&&!simple){b.style.setProperty('--mx',((e.clientX-r.left-r.width/2)*.1).toFixed(1)+'px');b.style.setProperty('--my',((e.clientY-r.top-r.height/2)*.18).toFixed(1)+'px')}
},{passive:true});

document.addEventListener('pointerout',function(e){var b=e.target&&e.target.closest&&e.target.closest('.btn');if(b&&!b.contains(e.relatedTarget)){b.style.setProperty('--mx','0px');b.style.setProperty('--my','0px')}},{passive:true});
