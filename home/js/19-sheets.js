/* home/js/19-sheets.js —— 由原型拆分而来。经典脚本，按文件名顺序加载，共享同一页面作用域。 */
'use strict';
/* ============ 抽屉 ============ */
var Sheets=(function(){var scrim=$('#sscrim'),cur=null;
  function open(id){close();cur=$('#'+id);cur.classList.add('on');scrim.classList.add('on');buzz(8);var x=cur.querySelector('[data-close]');setTimeout(function(){if(x)x.focus({preventScroll:true})},80)}
  function close(){if(cur){cur.classList.remove('on');cur=null}scrim.classList.remove('on')}
  scrim.addEventListener('click',close);$$('[data-close]').forEach(function(b){b.addEventListener('click',close)});
  $$('.sheet').forEach(function(sh){var y0=null;sh.addEventListener('touchstart',function(e){y0=sh.scrollTop<=0?e.touches[0].clientY:null},{passive:true});sh.addEventListener('touchend',function(e){if(y0!=null&&e.changedTouches[0].clientY-y0>80&&innerWidth<900)close();y0=null},{passive:true})});
  return {open:open,close:close,isOpen:function(){return !!cur}}})();

var Contact=(function(){var msg='';
  $('#channels').innerHTML=DATA.contact.map(function(c){return '<div class="row"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M4 5h16v11h-8l-4 3.5V16H4z"/></svg></span><span>'+c.label+'<small class="'+(c.v?'':'ph')+'">'+(c.v||'待站主提供')+'</small></span></div>'}).join('');
  $('#copyAgain').addEventListener('click',function(){copy(msg).then(function(){toast('已复制')})});
  return {open:function(m){msg=m;$('#msgbox').textContent=m;copy(m).then(function(){toast('预约消息已复制')});setTimeout(function(){Sheets.open('contact')},simple?0:500)}}})();

(function(){
  var list=$('#ntList'),mini=$('#constMini'),N=DATA.notice.length,read=new Set(),pos=[[22,44],[86,16],[150,40],[214,12],[278,36]],s='';
  for(var i=0;i<N-1;i++){s+='<path class="bg" d="M'+pos[i]+'L'+pos[i+1]+'" fill="none"/><path class="lk" id="lk'+i+'" d="M'+pos[i]+'L'+pos[i+1]+'" fill="none"/>'}
  pos.forEach(function(p,i){s+='<path class="st" id="ns'+i+'" d="'+STAR4(p[0],p[1],6,1.4)+'"/>'});mini.innerHTML=s;
  function body(n){return n.b||'「'+n.t+'」的具体条款待站主提供。正式版会在这里逐条写清楚，下单前请先读一读。'}
  list.innerHTML=DATA.notice.map(function(n,i){return '<div class="nt"><button type="button" class="nt-h" aria-expanded="false"><span class="lab">'+(i+1)+'</span><span>'+n.t+'</span><span class="nt-pm"></span></button><div class="nt-b"><div><p>'+body(n)+'</p></div></div></div>'}).join('');
  function prog(){$('#ntProg').textContent='已读 '+read.size+' / '+N+(read.size===N?'，星座连上了':'')}
  prog();
  $$('.nt',list).forEach(function(nt,i){nt.querySelector('.nt-h').addEventListener('click',function(){var on=!nt.classList.contains('on');nt.classList.toggle('on',on);this.setAttribute('aria-expanded',String(on));
    if(on&&!read.has(i)){read.add(i);$('#ns'+i).classList.add('on');for(var k=0;k<N-1;k++)$('#lk'+k).classList.toggle('on',read.has(k)&&read.has(k+1));prog();if(read.size===N)toast('须知都读完了，星星连成了一线')}})});
  $('#pages').innerHTML='<p class="lab" style="margin:0">页面</p>'+DATA.pages.map(function(p){return '<button type="button" class="row" data-pg="'+p.t+'" data-href="'+p.href+'"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="'+STAR4(12,12,7,1.6)+'"/></svg></span><span>'+p.t+'</span><span class="end">筹备中</span></button>'}).join('');
  $$('[data-pg]').forEach(function(b){b.addEventListener('click',function(){location.href=b.dataset.href})});
  $('#motionOpt').addEventListener('click',function(){store('sl.motion',simple?'full':'simple');applyMotion();toast(simple?'已简化动效':'已恢复完整动效')});
  function gyroText(){$('#gyroSub').textContent={on:'已开启，倾斜手机试试',denied:'未获授权，可在系统设置里允许',none:FINE?'桌面端由鼠标位置驱动':'这台设备不支持体感',auto:'倾斜手机，背景和封面会跟着动',ask:'轻点开启（需要授权）'}[Tilt.state]||''}
  gyroText();$('#gyroOpt').addEventListener('click',function(){Tilt.ask().then(gyroText)});
  $('#resetDaily').addEventListener('click',function(){Sheets.close();Bench.reset();go('bench')});
  $('#fNotice').addEventListener('click',function(){Letter.open()});$('#fMore').addEventListener('click',function(){Sheets.open('more')});
  $('#fReset').addEventListener('click',function(){Bench.reset();go('bench')});
})();
