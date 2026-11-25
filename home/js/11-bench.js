/* home/js/11-bench.js —— 由原型拆分而来。经典脚本，按文件名顺序加载，共享同一页面作用域。 */
'use strict';
/* ============ 工作台：今日字卡 ============ */
var Reading,Bench;

Bench=(function(){
  var mat=$('#mat'),deckEl=$('#deck'),btn=$('#drawBtn'),st=$('#benchSt'),bm=$('#bm'),N=9,cards=[],order,state='idle',curMsg=null;
  $('#deskTag').textContent='工作台，'+DSTR;
  // 桌布纹样
  var a='<circle r="98" fill="none" stroke="currentColor" stroke-width=".35"/><circle r="92" fill="none" stroke="currentColor" stroke-width=".25" stroke-dasharray="1 3"/><circle r="64" fill="none" stroke="currentColor" stroke-width=".2"/>';
  for(var t=0;t<360;t+=10){var rr=t%30===0?86:89,ra=t*Math.PI/180;a+='<line x1="'+(Math.sin(ra)*rr).toFixed(2)+'" y1="'+(-Math.cos(ra)*rr).toFixed(2)+'" x2="'+(Math.sin(ra)*92).toFixed(2)+'" y2="'+(-Math.cos(ra)*92).toFixed(2)+'" stroke="currentColor" stroke-width=".3"/>'}
  a+='<path d="'+STAR4(0,0,96,5)+'" fill="none" stroke="currentColor" stroke-width=".2"/>';
  $('#matArt').innerHTML=a;
  // 月相盘
  var md='<circle r="48" fill="rgba(255,255,255,.6)" stroke="#000" stroke-width=".6"/>';
  for(var d=0;d<30;d++){var an=d/29.53*Math.PI*2,on=Math.abs(d-MOON.age)<.6;md+='<line x1="'+(Math.sin(an)*42).toFixed(2)+'" y1="'+(-Math.cos(an)*42).toFixed(2)+'" x2="'+(Math.sin(an)*(on?33:38)).toFixed(2)+'" y2="'+(-Math.cos(an)*(on?33:38)).toFixed(2)+'" stroke="#000" stroke-width="'+(on?1.6:.4)+'"/>'}
  md+='<circle r="24" fill="#1d1d22"/><path d="'+Moon.path(MOON.p,24)+'" fill="#f8f8f9"/><circle r="24" fill="none" stroke="#000" stroke-width=".6"/>';
  md+='<text y="64" text-anchor="middle" font-size="11" fill="#000" style="font-family:var(--serif);letter-spacing:2px">'+MOON.name+'</text>';
  $('#moonDial').innerHTML='<svg viewBox="-50 -50 100 100">'+md+'</svg>';

  for(var i=0;i<N;i++){var b=document.createElement('button');b.type='button';b.className='card';b.disabled=true;b.setAttribute('aria-label','第 '+(i+1)+' 张字卡');
    b.innerHTML='<span class="ci"><span class="cback">'+CARD_BACK+'</span></span>';deckEl.appendChild(b);cards.push(b);b.addEventListener('click',onPick)}
  order=cards.slice();
  function put(c,x,y,r,s,delay){c.style.transitionDelay=(delay||0)+'ms';c.style.transform='translate('+x.toFixed(1)+'px,'+y.toFixed(1)+'px) rotate('+r.toFixed(2)+'deg)'+(s&&s!==1?' scale('+s+')':'')}
  function live(){return order.filter(function(c){return !c.hidden})}
  function stack(){var L=live();L.forEach(function(c,k){c.style.zIndex=k;put(c,k*.5,-k*1.3,(k-L.length/2)*.7,1,0)})}
  stack();
  st.textContent='在开始正式的体验之前，你可以先在这里试试抽一张今日字卡。';
  function setSt(t){st.textContent=t}
  var benchW=$('#bench .bench');function focus(on){if(simple)on=false;benchW.classList.toggle('focusing',on)}
  new IntersectionObserver(function(es){if(!es[0].isIntersecting)focus(false)},{threshold:.25}).observe(benchW);
  async function shuffle(){
    if(state!=='idle')return;state='shuffle';focus(true);btn.disabled=true;setSt('洗牌中……');buzz(10);
    var L=live(),n=L.length,cw=L[0].offsetWidth;
    for(var round=0;round<3;round++){
      var half=Math.ceil(n/2);
      L.forEach(function(c,k){var left=k<half,kk=left?k:k-half;put(c,(left?-1:1)*cw*.68,-kk*1.3-4,left?-8:8,1.02,0)});
      await wait(400);
      var A=L.slice(0,half),B=L.slice(half),mix=[];
      while(A.length||B.length){if(Math.random()<.5){if(A.length)mix.push(A.shift());if(B.length)mix.push(B.shift())}else{if(B.length)mix.push(B.shift());if(A.length)mix.push(A.shift())}}
      mix.forEach(function(c,k){setTimeout(function(){c.style.zIndex=k;put(c,rand(-2,2),-k*1.3,rand(-2.5,2.5),1,0);if(k%2===0)buzz(3)},simple?0:k*46)});
      L=mix;await wait(n*46+360);
    }
    order=L.concat(order.filter(function(c){return c.hidden}));
    var mw=mat.clientWidth,Rr=mw*.62,A2=Math.min(38,6*n);
    L.forEach(function(c,k){var ang=n>1?(-A2+2*A2*k/(n-1)):0,rad=ang*Math.PI/180;c.style.zIndex=k;put(c,Math.sin(rad)*Rr,Rr*(1-Math.cos(rad))-mw*.06,ang,1,k*40)});
    await wait(560+n*40);
    L.forEach(function(c){c.disabled=false;c.classList.add('pickable');c.style.transitionDelay='0ms'});
    setSt('凭直觉，选一张。');state='fan';
  }
  function onPick(e){
    var c=e.currentTarget;if(state!=='fan')return;state='pick';buzz(14);
    live().forEach(function(x){x.classList.remove('pickable');x.disabled=true});
    var msg=DATA.cards[Math.floor(Math.random()*DATA.cards.length)];
    c.style.transitionDelay='0ms';c.style.zIndex=99;c.style.transform+=' translateY(-16%) scale(1.06)';
    setTimeout(function(){
      Reading.open(c,msg,true);c.style.opacity='0';
      setTimeout(function(){c.hidden=true;c.style.opacity='';stack()},420);
    },simple?0:380);
  }
  function fillBm(msg){$('#bmG').innerHTML='<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="6">'+GLYPH[msg.g]+'</svg>';bm.setAttribute('aria-label','今日书签：轻触展开全文')}
  function prepare(msg){curMsg=msg;fillBm(msg);bm.style.transition='none';bm.classList.add('show','high','ghost');void bm.offsetWidth;return bm}
  function tuck(isNew){
    bm.classList.remove('ghost');void bm.offsetWidth;bm.style.transition='';
    requestAnimationFrame(function(){bm.classList.remove('high')});
    if(isNew){store('sl.daily',JSON.stringify({k:DKEY,g:curMsg.g,t:curMsg.t}));setSt('书签夹进书里了，露在外面的那一截，轻触就能展开全文。');btn.disabled=true;btn.querySelector('span').textContent='今日已抽';state='done'}
    focus(false);
  }
  bm.addEventListener('click',function(){if(!bm.classList.contains('show')||!curMsg)return;buzz(8);bm.classList.add('high');setTimeout(function(){Reading.open(bm,curMsg,false)},simple?0:260)});
  function reset(){focus(false);store('sl.daily',null);cards.forEach(function(c){c.hidden=false;c.disabled=true;c.classList.remove('pickable');c.style.opacity=''});bm.classList.remove('show','high','ghost');curMsg=null;
    btn.disabled=false;btn.querySelector('span').textContent='抽一张';setSt('牌已经放回桌上了。');state='idle';stack();toast('今日字卡已重置')}
  try{var sd=JSON.parse(store('sl.daily')||'null');if(sd&&sd.k===DKEY&&GLYPH[sd.g]){cards[N-1].hidden=true;stack();prepare({g:sd.g,t:sd.t});bm.classList.remove('ghost','high');bm.style.transition='';state='done';btn.disabled=true;btn.querySelector('span').textContent='今日已抽';setSt('今天已经抽过了。书里露出来的那枚小书签，轻触就能展开全文。')}}catch(e){}
  btn.addEventListener('click',shuffle);
  // 蜡烛
  (function(){var c=$('#candle'),gl=c.querySelector('.c-glow'),lit=true,v=1,vis=false;
    new IntersectionObserver(function(es){vis=es[0].isIntersecting}).observe(c);
    Loop.add(function(now,dt){if(!lit||!vis)return;var t=now*.001,f=simple?1:.86+.08*Math.sin(t*7.3)+.05*Math.sin(t*13.1+1)+.04*(Math.random()-.5);v+=(f-v)*Math.min(1,dt*12);gl.style.transform='scale('+v.toFixed(3)+')';gl.style.opacity=(.5+.5*v).toFixed(3)});
    c.addEventListener('click',function(){lit=!lit;c.classList.toggle('off',!lit);buzz(10);
      if(!lit&&!simple){var p=center(c);for(var i=0;i<4;i++)(function(i){setTimeout(function(){var s=document.createElement('span');s.className='puff';s.style.left=(p.x+rand(-4,4))+'px';s.style.top=p.y+'px';s.style.setProperty('--px',rand(-24,24).toFixed(0)+'px');document.body.appendChild(s);setTimeout(function(){s.remove()},2500)},i*240)})(i)}
      toast(lit?'烛火重新亮了':'蜡烛熄了，飘起一缕烟')});
  })();
  return {prepare:prepare,tuck:tuck,reset:reset};
})();


Reading=(function(){
  var ov=$('#reading'),big=$('#big'),keep=$('#rdKeep'),msgEl=$('#bigMsg'),token=0,cur=null,isNew=false,opened=false;
  $('#bigBack').innerHTML=CARD_BACK;
  function open(src,msg,fresh){
    var my=++token;cur=msg;isNew=fresh;opened=true;
    $('#bigGlyph').innerHTML=GLYPH[msg.g];msgEl.textContent='';$('#bigNo').textContent=fresh?'今日字卡':'你今天的书签';$('#bigDate').textContent=DSTR;
    keep.querySelector('span').textContent=fresh?'夹进书里':'放回书里';
    big.getAnimations().forEach(function(a){a.cancel()});
    big.classList.remove('flip','fold');ov.classList.remove('done','leaving');ov.classList.add('on');
    if(!simple){var a=src.getBoundingClientRect(),b=big.getBoundingClientRect();big.animate([{transform:flipT(a,b)},{transform:'none'}],{duration:760,easing:'cubic-bezier(.22,.8,.18,1)'})}
    setTimeout(function(){if(my!==token)return;big.classList.add('flip');buzz(18)},simple?0:(fresh?820:560));
    setTimeout(function(){if(my!==token)return;typeInto(msgEl,msg.t,fresh?95:40).then(function(){if(my!==token)return;ov.classList.add('done');keep.focus({preventScroll:true})})},simple?0:(fresh?1550:1150));
  }
  function doKeep(){
    if(!opened||!ov.classList.contains('done'))return;opened=false;token++;ov.classList.remove('done');
    var bmEl=Bench.prepare(cur),a=big.getBoundingClientRect(),b=bmEl.getBoundingClientRect(),fresh=isNew;
    big.classList.add('fold');ov.classList.add('leaving');buzz(10);
    function finish(){ov.classList.remove('on','leaving');Bench.tuck(fresh);setTimeout(function(){big.getAnimations().forEach(function(x){x.cancel()});big.classList.remove('flip','fold')},80)}
    if(simple){finish();return}
    var an=big.animate([{transform:'none'},{transform:flipT(b,a)}],{duration:760,delay:180,easing:'cubic-bezier(.7,0,.2,1)',fill:'forwards'});an.onfinish=finish;
  }
  keep.addEventListener('click',doKeep);$('#rdBg').addEventListener('click',doKeep);
  return {open:open,keep:doKeep,isOpen:function(){return opened}};
})();
