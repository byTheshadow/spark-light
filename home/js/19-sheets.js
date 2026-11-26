/* home/js/19-sheets.js —— 由原型拆分而来。经典脚本，按文件名顺序加载，共享同一页面作用域。 */
'use strict';
/* ============ 抽屉 ============ */
var Sheets=(function(){var scrim=$('#sscrim'),cur=null;
  function open(id){close();cur=$('#'+id);cur.classList.add('on');scrim.classList.add('on');buzz(8);if(window.SLSpark)SLSpark.burst();var x=cur.querySelector('[data-close]');setTimeout(function(){if(x)x.focus({preventScroll:true})},80)}
  function close(){if(cur){cur.classList.remove('on');cur=null}scrim.classList.remove('on')}
  scrim.addEventListener('click',close);$$('[data-close]').forEach(function(b){b.addEventListener('click',close)});
  $$('.sheet').forEach(function(sh){var y0=null;sh.addEventListener('touchstart',function(e){y0=sh.scrollTop<=0?e.touches[0].clientY:null},{passive:true});sh.addEventListener('touchend',function(e){if(y0!=null&&e.changedTouches[0].clientY-y0>80&&innerWidth<900)close();y0=null},{passive:true})});
  return {open:open,close:close,isOpen:function(){return !!cur}}})();

var Contact=(function(){var msg='';
  $('#channels').innerHTML=DATA.contact.map(function(c){return '<div class="row"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M4 5h16v11h-8l-4 3.5V16H4z"/></svg></span><span>'+c.label+'<small class="'+(c.v?'':'ph')+'">'+(c.v||'待站主提供')+'</small></span></div>'}).join('');
  $('#copyAgain').addEventListener('click',function(){copy(msg).then(function(){toast('已复制')})});
  var askRuiBtn=$('#askRuiInContact');
  if(askRuiBtn)askRuiBtn.addEventListener('click',function(){Sheets.close();if(window.SLRui)window.SLRui.open()});
  return {open:function(m){msg=m;$('#msgbox').textContent=m;copy(m).then(function(){toast('预约消息已复制')});setTimeout(function(){Sheets.open('contact')},simple?0:500)}}})();

(function(){
  var list=$('#ntList'),N=DATA.notice.length,read=new Set([0]);
  var ROM=['I','II','III','IV','V'],SHORT=['I 摘要','II 占卜调频','III 网站游戏','IV 创作','V 交付售后'];
  var PTS=[[100,30],[166.6,78.4],[141.1,156.6],[58.9,156.6],[33.4,78.4]];
  var nodesBox=$('#astroNodes'),pillsBox=$('#astroPills'),rotor=$('#astroRotor'),calBtn=$('#astroCalBtn');
  var noticePane=$('#gpNoticePane'),calPane=$('#gpCalPane'),gpTitle=$('#gpTitle'),gpEn=$('#gpEn'),gpIdx=$('#gpIdx');
  var curIdx=0,curAngle=0,totalTabs=N+1;

  function body(n){
    if(!n.b)return '<p class="gp-clause">「'+n.t+'」的具体条款待站主提供。正式版会在这里逐条写清楚，下单前请先读一读。</p>';
    return n.b.split('<br>').map(function(line){return '<p class="gp-clause">'+line+'</p>'}).join('');
  }

  /* 1. 构建星盘上的 5 颗主星节点 */
  if(nodesBox){
    var nh='';
    for(var i=0;i<N;i++){
      var p=PTS[i]||[100,30];
      nh+='<g class="astro-node'+(i===0?' active read':'')+'" data-idx="'+i+'" transform="translate('+p[0]+','+p[1]+')" role="button" tabindex="0" aria-label="第 '+(i+1)+' 章：'+DATA.notice[i].t+'"><circle class="hit" r="22"/><circle class="core" r="10.5"/><g class="node-label"><text>'+(ROM[i]||i+1)+'</text></g></g>';
    }
    nodesBox.innerHTML=nh;
  }

  /* 2. 构建手机与桌面通用的快捷星轨胶囊拨片 */
  if(pillsBox){
    var ph=DATA.notice.map(function(n,i){return '<button type="button" class="qp'+(i===0?' on':'')+'" data-idx="'+i+'">'+(SHORT[i]||(ROM[i]+' '+n.t))+'</button>'}).join('');
    ph+='<button type="button" class="qp" data-idx="'+N+'">星历档期</button>';
    pillsBox.innerHTML=ph;
  }

  function prog(){
    $('#ntProg').textContent='已点亮 '+read.size+' / '+N+' 颗契约星'+(read.size===N?' · 星轨已连成一线':'');
    var poly=$('#astroStarPoly');
    if(poly&&read.size===N)poly.setAttribute('stroke','rgba(207,200,255,.85)');
  }

  function rotateTo(idx,user){
    idx=(idx+totalTabs)%totalTabs;
    curIdx=idx;
    var wasAll=read.size===N;
    if(idx<N){
      read.add(idx);
      var targetMod=(-idx*72)%360;
      var diff=((targetMod-(curAngle%360))+540)%360-180;
      curAngle+=diff;
    }else{
      curAngle+=36;
    }
    if(rotor)rotor.style.transform='rotate('+curAngle+'deg)';
    $$('.node-label',nodesBox).forEach(function(lbl){lbl.style.transform='rotate('+(-curAngle)+'deg)'});
    $$('.astro-node',nodesBox).forEach(function(nd,i){
      nd.classList.toggle('active',i===idx);
      if(read.has(i))nd.classList.add('read');
    });
    if(calBtn)calBtn.classList.toggle('active',idx===N);
    $$('.qp',pillsBox).forEach(function(b,i){b.classList.toggle('on',i===idx)});

    prog();
    if(user&&!wasAll&&read.size===N)toast('五颗契约星全部点亮，星轨连成了一线');
    if(user)buzz(5);

    if(idx<N){
      var n=DATA.notice[idx];
      if(gpTitle)gpTitle.textContent=(ROM[idx]||idx+1)+' · '+n.t;
      if(gpEn)gpEn.textContent='Astrolabe Pact · 0'+(idx+1);
      if(calPane)calPane.hidden=true;
      if(noticePane){
        noticePane.hidden=false;
        list.innerHTML=body(n);
        if(window.SLAiMosaic)window.SLAiMosaic(list);
        if(window.SLHighlight)window.SLHighlight(list);
      }
    }else{
      if(gpTitle)gpTitle.textContent='时间安排与本月星历';
      if(gpEn)gpEn.textContent=$('#calMonth')?$('#calMonth').textContent:'Schedule';
      if(noticePane)noticePane.hidden=true;
      if(calPane)calPane.hidden=false;
    }
    if(gpIdx)gpIdx.textContent=(idx+1)+' / '+totalTabs;
  }

  $$('.astro-node',nodesBox).forEach(function(nd){
    nd.addEventListener('click',function(){rotateTo(+nd.getAttribute('data-idx'),true)});
    nd.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();rotateTo(+nd.getAttribute('data-idx'),true)}});
  });
  $$('.qp',pillsBox).forEach(function(b){
    b.addEventListener('click',function(){rotateTo(+b.getAttribute('data-idx'),true)});
  });
  if(calBtn)calBtn.addEventListener('click',function(){rotateTo(N,true)});
  var prevBtn=$('#gpPrev'),nextBtn=$('#gpNext');
  if(prevBtn)prevBtn.addEventListener('click',function(){rotateTo(curIdx-1,true)});
  if(nextBtn)nextBtn.addEventListener('click',function(){rotateTo(curIdx+1,true)});

  rotateTo(0,false);

  $('#pages').innerHTML='<p class="lab" style="margin:0">页面</p>'+DATA.pages.map(function(p){return '<button type="button" class="row" data-pg="'+p.t+'" data-href="'+p.href+'"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="'+STAR4(12,12,7,1.6)+'"/></svg></span><span>'+p.t+'</span><span class="end">筹备中</span></button>'}).join('');
  $$('[data-pg]').forEach(function(b){b.addEventListener('click',function(){location.href=b.dataset.href})});

  /* 主题切换 */
  var curTheme=document.documentElement.getAttribute('data-theme')||'t1-starfield';
  var th1=$('#thState-t1'),th2=$('#thState-t2'),th3=$('#thState-t3');
  if(th1&&th2){
    th1.textContent=curTheme==='t1-starfield'?'当前':'切换';
    th2.textContent=curTheme==='t2-journal'?'当前':'切换';
    if(th3)th3.textContent=curTheme==='t3-arcade'?'当前':'切换';
  }
  $$('.theme-row').forEach(function(b){
    b.addEventListener('click',function(){
      var tid=b.getAttribute('data-theme-id');
      if(tid&&window.SLSwitchTheme){
        window.SLSwitchTheme(tid);
      }
    });
  });

  $('#motionOpt').addEventListener('click',function(){store('sl.motion',simple?'full':'simple');applyMotion();toast(simple?'已简化动效':'已恢复完整动效')});
  function gyroText(){$('#gyroSub').textContent={on:'已开启，倾斜手机试试',denied:'未获授权，可在系统设置里允许',none:FINE?'桌面端由鼠标位置驱动':'这台设备不支持体感',auto:'倾斜手机，背景和封面会跟着动',ask:'轻点开启（需要授权）'}[Tilt.state]||''}
  gyroText();$('#gyroOpt').addEventListener('click',function(){Tilt.ask().then(gyroText)});
  $('#resetDaily').addEventListener('click',function(){Sheets.close();Bench.reset();go('bench')});
  $('#fNotice').addEventListener('click',function(){Letter.open()});$('#fMore').addEventListener('click',function(){Sheets.open('more')});
  $('#fReset').addEventListener('click',function(){Bench.reset();go('bench')});
})();
