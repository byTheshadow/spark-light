/* home/js/12-craft-rail.js —— 由原型拆分而来。经典脚本，按文件名顺序加载，共享同一页面作用域。 */
'use strict';
/* ============ 四件星物：翻页 ============ */
(function(){
  var rail=$('#rail'),tabs=$$('.tab'),ind=$('#tabInd'),plates=$$('.plate',rail),cur=0;
  function syncHeight(){
    var p=plates[cur];
    if(!p)return;
    var h=Math.ceil(p.scrollHeight);
    if(h>60)rail.style.height=h+'px';
  }
  function setTab(i){tabs.forEach(function(t,k){t.classList.toggle('on',k===i);t.setAttribute('aria-selected',String(k===i))});var t=tabs[i];ind.style.width=t.offsetWidth+'px';ind.style.transform='translateX('+t.offsetLeft+'px)';
    $('#railNo').textContent=String(i+1);$('#railBar').style.transform='translateX('+(i*100)+'%)';plates.forEach(function(p,k){p.classList.toggle('cur',k===i)});
    syncHeight()}
  function to(i){i=clamp(i,0,plates.length-1);rail.scrollTo({left:i*rail.clientWidth,behavior:simple?'auto':'smooth'})}
  rail.addEventListener('scroll',function(){var i=Math.round(rail.scrollLeft/Math.max(1,rail.clientWidth));if(i!==cur){cur=i;setTab(i);buzz(4)}},{passive:true});
  tabs.forEach(function(t,k){t.addEventListener('click',function(){to(k)})});
  $('#rPrev').addEventListener('click',function(){to(cur-1)});$('#rNext').addEventListener('click',function(){to(cur+1)});
  addEventListener('resize',function(){setTab(cur);rail.scrollLeft=cur*rail.clientWidth});
  if(window.ResizeObserver){
    var ro=new ResizeObserver(function(){syncHeight()});
    plates.forEach(function(p){ro.observe(p)});
  }
  setTimeout(function(){setTab(0)},60);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){setTab(cur)});
  $$('.pl-go').forEach(function(b){b.addEventListener('click',function(){go('price');setTimeout(function(){Price.setCat(+b.dataset.cat)},simple?0:700)})});
})();
