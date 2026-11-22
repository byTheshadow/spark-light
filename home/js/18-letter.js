/* home/js/18-letter.js —— 由原型拆分而来。经典脚本，按文件名顺序加载，共享同一页面作用域。 */
'use strict';
/* ============ 一封来信：马车把信送到，拆开后信纸展开，问候一个字一个字打出来 ============ */
var Letter=(function(){
  var ltr=$('#ltr'),es=$('#envStage'),env=$('#env'),seal=$('#seal'),flap=$('#flap'),sp=$('#spread'),hint=$('#envHint'),road=$('#road'),coach=$('#coach'),state='closed',st=DATA.status,sc=DATA.schedule,typed=false;
  $('#pState').textContent=DATA.stateLabel[st.state];$('#pStateEn').textContent=DATA.stateEn[st.state];
  var free=st.total-st.taken,sl='',i;for(i=0;i<st.total;i++){var used=i<st.taken;sl+='<span class="slot '+(used?'used':'free')+'" style="animation-delay:'+(i*.3)+'s"><svg viewBox="0 0 12 12"><path d="'+STAR4(6,6,5.5,1.2)+'" fill="#000"/></svg></span>'}
  $('#slots').innerHTML=sl;var noSlots=st.state==='unset'||!st.total;$('#slots').setAttribute('aria-label',noSlots?'名额待站主设置':'本月共 '+st.total+' 个位置，还剩 '+free+' 个');$('#slotTxt').textContent=noSlots?'名额待站主设置':'本月还剩 '+free+' 个';
  function fill(id,v){if(!v)return;var n=$('#'+id);n.textContent=v;n.classList.remove('ph')}
  fill('nextTxt',st.next);fill('replyTxt',sc.reply);fill('delivTxt',sc.delivery);
  $('#spDate').textContent=DSTR;
  var Y=NOW.getFullYear(),M=NOW.getMonth(),days=new Date(Y,M+1,0).getDate(),off=(new Date(Y,M,1).getDay()+6)%7,today=NOW.getDate(),Rg=lcg(Y*100+M+7),h='';
  $('#calMonth').textContent=Y+'.'+pad(M+1);
  ['一','二','三','四','五','六','日'].forEach(function(w){h+='<span class="wd">'+w+'</span>'});
  for(i=0;i<off;i++)h+='<span></span>';
  var LBL={open:'可约',full:'已满',rest:'休息',unk:'日程待定'};
  for(var d=1;d<=days;d++){var wd=(off+d-1)%7,s=sc.restWeekdays.indexOf(wd)>=0?'rest':Array.isArray(sc.full)?(sc.full.indexOf(d)>=0?'full':'open'):'unk';
    h+='<span class="d '+s+(d<today?' past':'')+(d===today?' today':'')+'" aria-label="'+(M+1)+' 月 '+d+' 日，'+LBL[s]+'">'+d+'</span>'}
  $('#cal').innerHTML=h;if(!Array.isArray(sc.full))$('#calNote').textContent='日程待站主提供';
  var pm='<defs><path id="pmc" d="M80 50m-30 0a30 30 0 1 1 60 0a30 30 0 1 1 -60 0"/></defs><circle cx="80" cy="50" r="38" fill="none" stroke="#000" stroke-width="1.2"/><circle cx="80" cy="50" r="22" fill="none" stroke="#000" stroke-width=".8"/>'+
    '<text font-size="8" letter-spacing="2" style="font-family:var(--disp)"><textPath href="#pmc">SPARK LIGHT · '+DSTR+' · </textPath></text><text x="80" y="54" text-anchor="middle" font-size="10" style="font-family:var(--serif)">'+DATA.stateLabel[st.state]+'</text>';
  for(i=0;i<4;i++)pm+='<path d="M0 '+(36+i*9)+'q8 -5 16 0t16 0t16 0" fill="none" stroke="#000" stroke-width="1"/>';
  $('#pmark').innerHTML=pm;

  // 路景：远山、树、路面三层，用无缝平铺的 SVG 做背景，马车行进时三层以不同速度后退
  function uri(svg){return 'url("data:image/svg+xml,'+encodeURIComponent(svg)+'")'}
  var LAY=[
    {el:$('.rd-far',road),w:640,dur:14000,svg:'<svg xmlns="http://www.w3.org/2000/svg" width="640" height="120" viewBox="0 0 640 120"><path d="M0 92C60 70 110 62 170 78S280 98 340 74S470 50 540 72S620 92 640 92V120H0Z" fill="rgb(222,220,236)"/><path d="M0 104C80 92 140 96 220 102S380 92 460 98S580 108 640 104V120H0Z" fill="rgb(208,206,222)"/></svg>'},
    {el:$('.rd-mid',road),w:420,dur:6200,svg:'<svg xmlns="http://www.w3.org/2000/svg" width="420" height="120" viewBox="0 0 420 120"><path d="M58 104C54 82 56 60 63 42C70 60 72 82 68 104Z" fill="rgba(30,30,40,.2)"/><path d="M78 104C75 88 76 72 81 60C86 72 87 88 84 104Z" fill="rgba(30,30,40,.14)"/><circle cx="196" cy="80" r="17" fill="rgba(30,30,40,.13)"/><path d="M195 96V104" stroke="rgba(30,30,40,.25)" stroke-width="2"/><path d="M330 104V62M330 62q8 0 10 6" stroke="rgba(30,30,40,.45)" stroke-width="1.2" fill="none"/><circle cx="340" cy="70" r="3" fill="rgb(207,200,255)"/><circle cx="340" cy="70" r="9" fill="rgba(207,200,255,.35)"/></svg>'},
    {el:$('.rd-near',road),w:160,dur:1500,svg:'<svg xmlns="http://www.w3.org/2000/svg" width="160" height="40" viewBox="0 0 160 40"><path d="M0 6H160" stroke="rgba(0,0,0,.6)" stroke-width="1"/><path d="M10 20h26M90 20h26" stroke="rgba(0,0,0,.16)" stroke-width="1.4"/><path d="M50 6l-2-5M53 6l1-4M131 6l-1-5M134 6l2-4" stroke="rgba(0,0,0,.35)" stroke-width=".8"/></svg>'}];
  LAY.forEach(function(l){l.el.style.backgroundImage=uri(l.svg);l.el.style.backgroundSize=l.w+'px 100%'});
  $('.rd-moon',road).innerHTML='<svg viewBox="-12 -12 24 24"><circle r="10" fill="rgba(0,0,0,.08)"/><path d="'+Moon.path(MOON.p,10)+'" fill="#fff"/><circle r="10" fill="none" stroke="rgba(0,0,0,.18)" stroke-width=".6"/></svg>';
  var anims=null;
  function roll(rate,ms){if(simple)return Promise.resolve();if(!anims)anims=LAY.map(function(l){var a=l.el.animate([{backgroundPosition:'0px 0'},{backgroundPosition:(-l.w)+'px 0'}],{duration:l.dur,iterations:Infinity});a.playbackRate=0;return a});
    var from=anims[0].playbackRate,t0=performance.now();return new Promise(function(res){(function stp(now){var k=clamp((now-t0)/ms,0,1),e=k*k*(3-2*k),r=from+(rate-from)*e;anims.forEach(function(a){a.playbackRate=r});if(k<1)requestAnimationFrame(stp);else res()})(t0)})}
  var dp=null,delivered=false;
  function deliver(){if(dp)return dp;dp=(async function(){
    if(simple){coach.style.transform='none';env.classList.remove('away');delivered=true;hint.textContent='马车把信送到了，轻触火漆拆开';return}
    var W=road.clientWidth,cw=coach.offsetWidth,park=W-cw-W*.1;
    coach.classList.add('run');roll(1,300);
    var a=coach.animate([{transform:'translateX('+(-cw-W*.1)+'px)'},{transform:'translateX(0)'}],{duration:2600,easing:'cubic-bezier(.25,.7,.3,1)',fill:'forwards'});
    setTimeout(function(){roll(0,1200)},1400);
    await a.finished;coach.classList.remove('run');buzz(8);await wait(260);
    // 车夫把信抛下来
    var door=$('#coachDoor').getBoundingClientRect(),er=env.getBoundingClientRect(),dx=door.left+door.width/2-(er.left+er.width/2),dy=door.top+door.height/2-(er.top+er.height/2);
    env.classList.remove('away');
    await env.animate([{transform:'translate('+dx+'px,'+dy+'px) scale(.08) rotate(-40deg)',opacity:.4,offset:0},{transform:'translate('+(dx*.45)+'px,'+(dy*.5-150)+'px) scale(.42) rotate(170deg)',opacity:1,offset:.42},{transform:'translate(0,-22px) scale(1.03) rotate(356deg)',offset:.82},{transform:'translate(0,4px) scale(.995) rotate(360deg)',offset:.92},{transform:'none',offset:1}],{duration:1350,easing:'cubic-bezier(.35,.1,.4,1)'}).finished;
    buzz([14,40,10]);delivered=true;hint.textContent='马车把信送到了，轻触火漆拆开';
    await wait(500);coach.classList.add('run');roll(-.7,500);
    await coach.animate([{transform:'translateX(0)'},{transform:'translateX('+park+'px)'}],{duration:2200,easing:'cubic-bezier(.5,0,.3,1)',fill:'forwards'}).finished;
    roll(0,600);coach.classList.remove('run');coach.classList.add('idle');
  })();return dp}
  new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)deliver()})},{threshold:.35}).observe(ltr);
  coach.addEventListener('click',function(){if(!delivered||coach.classList.contains('run'))return;coach.classList.remove('neigh');void coach.offsetWidth;coach.classList.add('neigh');buzz(10)});
  // 打字机
  var greet=$('#spGreet'),GT=greet.textContent;greet.textContent='';
  async function typeAll(){if(typed)return;typed=true;await typeInto(greet,GT,42);sp.classList.add('typed')}
  async function open(){
    if(state!=='closed'||!delivered)return;state='opening';buzz([10,30]);seal.classList.remove('press');seal.classList.add('crack');hint.textContent='';
    await wait(420);env.classList.add('open');setTimeout(function(){flap.classList.add('under')},simple?0:400);
    await wait(520);env.classList.add('raised');await wait(760);
    es.classList.add('out');await wait(480);
    ltr.classList.add('opened');sp.classList.remove('fold');void sp.offsetWidth;sp.classList.add('unf');buzz(12);state='open';
    var t=ltr.getBoundingClientRect().top;if(t<0||t>innerHeight*.4)go('letter');
    setTimeout(typeAll,simple?0:700);
  }
  async function close(){
    if(state!=='open')return;state='closing';sp.classList.remove('unf');sp.classList.add('fold');await wait(640);
    ltr.classList.remove('opened');sp.classList.remove('fold');env.classList.remove('raised');void es.offsetWidth;es.classList.remove('out');await wait(620);
    env.classList.remove('open');setTimeout(function(){flap.classList.remove('under')},simple?0:400);await wait(820);
    seal.classList.remove('crack');void seal.offsetWidth;seal.classList.add('press');buzz(14);state='closed';hint.textContent='信收好了，轻触火漆可以再拆开';
  }
  seal.addEventListener('click',open);$('#foldBtn').addEventListener('click',close);
  $('#bookBtn').addEventListener('click',function(){Contact.open(bookMsg(Price.lines()))});
  return {open:function(){go('letter');if(state==='closed')setTimeout(function(){deliver().then(function(){setTimeout(open,simple?0:400)})},simple?0:850)},isOpen:function(){return state==='open'}};
})();
