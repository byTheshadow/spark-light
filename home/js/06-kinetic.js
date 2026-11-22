/* home/js/06-kinetic.js —— 由原型拆分而来。经典脚本，按文件名顺序加载，共享同一页面作用域。 */
'use strict';
/* ============ 文字动力学：点到的字会被推开、倾斜，再弹回 ============ */
var Kin=(function(){
  var active=new Set(),els=[];
  function split(el){
    if(el._k)return;var list=[];
    (function walk(node){
      Array.prototype.slice.call(node.childNodes).forEach(function(ch){
        if(ch.nodeType===3){
          var t=ch.nodeValue;if(!t.trim())return;var frag=document.createDocumentFragment(),w=null;
          Array.from(t).forEach(function(cc){
            if(/\s/.test(cc)){w=null;frag.appendChild(document.createTextNode(cc));return}
            if(/[，。、；：！？）」』”’》]/.test(cc)&&frag.lastChild&&frag.lastChild.nodeType===1){var pv=frag.lastChild,ww=document.createElement('span');ww.className='kw';frag.replaceChild(ww,pv);ww.appendChild(pv);var ps=document.createElement('span');ps.className='k';ps.textContent=cc;ps.style.setProperty('--j','0s');ps._x=ps._y=ps._r=ps._vx=ps._vy=ps._vr=0;list.push(ps);ww.appendChild(ps);w=null;return}
            var lat=/[A-Za-z0-9'’.\-&]/.test(cc);var s=document.createElement('span');s.className='k';s.textContent=cc;
            s.style.setProperty('--j',(Math.random()*-.17).toFixed(3)+'s');s._x=s._y=s._r=s._vx=s._vy=s._vr=0;list.push(s);
            if(lat){if(!w){w=document.createElement('span');w.className='kw';frag.appendChild(w)}w.appendChild(s)}else{w=null;frag.appendChild(s)}
          });
          node.replaceChild(frag,ch);
        }else if(ch.nodeType===1&&!(ch instanceof SVGElement)&&ch.tagName!=='BR'&&!ch.classList.contains('k'))walk(ch);
      });
    })(el);
    el._k=list;
  }
  function hit(el,px,py,pow){
    if(simple||!el._k)return;pow=pow||1;var R=FINE?120:95;
    for(var i=0;i<el._k.length;i++){var s=el._k[i],r=s.getBoundingClientRect();if(!r.width)continue;
      var cx=r.left+r.width/2-s._x,cy=r.top+r.height/2-s._y,dx=cx-px,dy=cy-py,d=Math.hypot(dx,dy);if(d>R)continue;
      var f=Math.pow(1-d/R,2)*pow,ux=d?dx/d:0,uy=d?dy/d:-1;
      s._vx+=ux*f*420;s._vy+=uy*f*420-f*110;s._vr+=(ux>=0?1:-1)*f*240*(.6+Math.random()*.8);active.add(s)}
  }
  $$('[data-kin]').forEach(function(el){split(el);els.push(el)});
  Loop.add(function(now,dt){
    if(!active.size)return;var K=240,C=22;
    active.forEach(function(s){
      s._vx+=(-K*s._x-C*s._vx)*dt;s._vy+=(-K*s._y-C*s._vy)*dt;s._vr+=(-K*s._r-C*s._vr)*dt;
      s._x+=s._vx*dt;s._y+=s._vy*dt;s._r+=s._vr*dt;
      if(Math.abs(s._x)+Math.abs(s._y)+Math.abs(s._r)<.06&&Math.abs(s._vx)+Math.abs(s._vy)+Math.abs(s._vr)<.6){s._x=s._y=s._r=s._vx=s._vy=s._vr=0;s.style.transform='';active.delete(s);return}
      s.style.transform='translate('+s._x.toFixed(2)+'px,'+s._y.toFixed(2)+'px) rotate('+s._r.toFixed(2)+'deg)'});
  });
  document.addEventListener('pointerdown',function(e){
    var t=e.target;if(!t||!t.closest)return;
    if(!t.closest('[data-noripple]')){Ripple(e.clientX,e.clientY,!!t.closest('button,[role=button],input,a,label'));BG.pulse(e.clientX,e.clientY)}
    var el=t.closest('[data-kin]');if(el){hit(el,e.clientX,e.clientY,1);return}
    if(t.closest('button,input,[role=button],[data-noripple],.reading,.writer,.sheet'))return;
    els.forEach(function(k){var r=k.getBoundingClientRect();if(e.clientX>r.left-70&&e.clientX<r.right+70&&e.clientY>r.top-70&&e.clientY<r.bottom+70)hit(k,e.clientX,e.clientY,.8)});
  },{passive:true});
  var lastH=0;
  if(FINE)document.addEventListener('pointermove',function(e){var now=performance.now();if(now-lastH<45)return;lastH=now;var el=e.target&&e.target.closest&&e.target.closest('[data-kin="hover"]');if(el)hit(el,e.clientX,e.clientY,.22)},{passive:true});
  return {hit:hit};
})();
