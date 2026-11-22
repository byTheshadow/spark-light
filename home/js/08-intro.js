/* home/js/08-intro.js —— 由原型拆分而来。经典脚本，按文件名顺序加载，共享同一页面作用域。 */
'use strict';
/* ============ 进场、刊头、视差 ============ */
var revIO=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');revIO.unobserve(e.target)}})},{rootMargin:'0px 0px -8% 0px'});

$$('.rv').forEach(function(n){revIO.observe(n)});

var Orb=null;

(function(){
  var sec=$('#foSec'),no=$('#foNo'),f=$('#folio'),cur='';
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(!e.isIntersecting)return;var s=e.target,name=s.dataset.folio;if(name===cur)return;cur=name;
    sec.classList.add('swap');setTimeout(function(){sec.textContent=name;no.textContent=s.dataset.no;sec.classList.remove('swap')},220);if(Orb)Orb.mark(s.id)})},{rootMargin:'-45% 0px -50% 0px'});
  $$('[data-folio]').forEach(function(s){io.observe(s)});
  function top(){f.classList.toggle('top',window.scrollY<30)}top();addEventListener('scroll',top,{passive:true});
  Loop.add(function(){var H=innerHeight,doc=Math.max(1,document.documentElement.scrollHeight-H);$('#orb').style.setProperty('--p',clamp(window.scrollY/doc,0,1).toFixed(4))});
})();
