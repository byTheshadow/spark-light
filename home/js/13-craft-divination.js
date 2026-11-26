/* home/js/13-craft-divination.js —— 由原型拆分而来。经典脚本，按文件名顺序加载，共享同一页面作用域。 */
'use strict';
/* ============ 占卜：一对纠缠的水晶球 ============ */
(function(){
  var el=$('#ent'),cv=$('#entCv'),g=cv.getContext('2d'),cap=$('#entCap'),W=0,H=0,dpr=1,vis=false,NP=FINE?440:300,mode='drift',ft=0,flash=0,ghostT=0,ptr=null,G={};
  var TINT=[[196,186,255],[160,222,212]];
  var sprD=makeSprite(64,[[0,'rgba(22,22,32,1)'],[.4,'rgba(22,22,32,.35)'],[1,'rgba(22,22,32,0)']]);
  var sprT=TINT.map(function(c){return makeSprite(64,[[0,'rgba('+c+',1)'],[.4,'rgba('+c+',.4)'],[1,'rgba('+c+',0)']])});
  var DECK=DATA.deck&&Array.isArray(DATA.deck.cards)?DATA.deck.cards.filter(function(c){return c.suit!=='back'}):[];
  var SUITS=DATA.deck&&Array.isArray(DATA.deck.suits)?DATA.deck.suits:[];
  if(!DECK.length)DECK=DATA.lenormand.map(function(c){return {name:c.n,nameEn:c.e,suit:'legacy',description:c.k,asset:''}});
  var NAMES=DECK.reduce(function(all,c){return all.concat(c.name||'')},[]);
  function mk(i){var o={i:i,w:i?-.4:.4,base:i?-.4:.4,P:[],gh:['',''],gx:[0,0]};for(var k=0;k<NP;k++){var a=rand(0,6.283),rr=Math.sqrt(Math.random())*.84;o.P.push({x:Math.cos(a)*rr,y:Math.sin(a)*rr,vx:0,vy:0,tx:0,ty:0,has:false,f:0,s:rand(.07,.17),al:rand(.03,.075),tone:Math.random()<.3})}return o}
  var O=[mk(0),mk(1)],TH=[];for(var k=0;k<160;k++)TH.push({u:rand(0,6.283),sp:rand(.32,.55),z:rand(.6,1.4)});
  function size(){var w=el.clientWidth;if(!w)return;dpr=Math.min(devicePixelRatio||1,2);W=w;H=el.clientHeight;cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);
    var r=Math.min(W*.19,H*.3);G={r:r,cy:H*.42,c:[W*.27,W*.73],ty:H*.42+r*.84,by:H*.42+r*1.2,a:(W*.23)/.72}}
  new IntersectionObserver(function(es){vis=es[0].isIntersecting;if(vis)size()},{rootMargin:'60px'}).observe(el);
  addEventListener('resize',function(){if(vis)size()});
  function lem(u){var s=Math.sin(u),c=Math.cos(u),d=1+s*s;return [W/2+G.a*c/d,G.cy+G.a*s*c/d]}
  function rr(x,y,w,h,ra){g.beginPath();g.moveTo(x+ra,y);g.arcTo(x+w,y,x+w,y+h,ra);g.arcTo(x+w,y+h,x,y+h,ra);g.arcTo(x,y+h,x,y,ra);g.arcTo(x,y,x+w,y,ra);g.closePath()}
  function lac(x0,x1){var lg=g.createLinearGradient(x0,0,x1,0);lg.addColorStop(0,'#050506');lg.addColorStop(.26,'#3e3e46');lg.addColorStop(.4,'#151518');lg.addColorStop(.82,'#060607');lg.addColorStop(1,'#26262b');return lg}
  function table(cx,i){var r=G.r,y=G.by+r*.02,c=TINT[i];
    g.save();g.translate(cx,y);g.scale(1,.16);var sg=g.createRadialGradient(0,0,0,0,0,r*1.3);sg.addColorStop(0,'rgba(0,0,0,.36)');sg.addColorStop(.6,'rgba(0,0,0,.1)');sg.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=sg;g.beginPath();g.arc(0,0,r*1.3,0,7);g.fill();g.restore();
    g.save();g.translate(cx+r*.66,y+r*.07);g.scale(1,.22);var cg=g.createRadialGradient(0,0,0,0,0,r*.55);cg.addColorStop(0,'rgba(255,255,255,.95)');cg.addColorStop(.3,'rgba('+c+','+(.6+flash*.3).toFixed(2)+')');cg.addColorStop(1,'rgba('+c+',0)');g.fillStyle=cg;g.beginPath();g.arc(0,0,r*.55,0,7);g.fill();g.restore()}
  function stand(cx){var r=G.r,ty=G.ty,by=G.by,tw=r*.6,bw=r*.86;
    g.fillStyle=lac(cx-bw,cx+bw);g.beginPath();g.moveTo(cx-tw,ty);g.bezierCurveTo(cx-tw,ty+r*.2,cx-bw,by-r*.16,cx-bw,by);g.ellipse(cx,by,bw,r*.09,0,Math.PI,0,true);g.bezierCurveTo(cx+bw,by-r*.16,cx+tw,ty+r*.2,cx+tw,ty);g.closePath();g.fill();
    g.strokeStyle='rgba(255,255,255,.22)';g.lineWidth=1;g.beginPath();g.moveTo(cx-tw*.6,ty+r*.1);g.bezierCurveTo(cx-tw*.62,ty+r*.24,cx-bw*.72,by-r*.12,cx-bw*.72,by+r*.03);g.stroke();
    g.fillStyle='#0e0e11';g.beginPath();g.ellipse(cx,ty,tw,r*.13,0,0,7);g.fill()}
  function lip(cx){var r=G.r,ty=G.ty,tw=r*.6,b=r*.075;g.fillStyle=lac(cx-tw,cx+tw);g.beginPath();g.ellipse(cx,ty,tw,r*.13,0,0,Math.PI);g.lineTo(cx-tw,ty+b);g.ellipse(cx,ty+b,tw,r*.13,0,Math.PI,0,true);g.closePath();g.fill();
    g.strokeStyle='rgba(255,255,255,.3)';g.lineWidth=.8;g.beginPath();g.ellipse(cx,ty,tw,r*.13,0,.15,Math.PI-.15);g.stroke()}
  function orb(o,t){var r=G.r,cx=G.c[o.i],cy=G.cy,c=TINT[o.i],form=mode==='form'?Math.min(1,ft*1.1):0,i;
    g.save();g.beginPath();g.arc(cx,cy,r,0,7);g.clip();
    var bg=g.createRadialGradient(cx-r*.3,cy-r*.35,r*.05,cx,cy,r);bg.addColorStop(0,'#fff');bg.addColorStop(.6,'#f0f0f4');bg.addColorStop(1,'#d8d8e0');g.fillStyle=bg;g.fillRect(cx-r,cy-r,2*r,2*r);
    var tg=g.createRadialGradient(cx,cy+r*.5,0,cx,cy+r*.35,r*1.1);tg.addColorStop(0,'rgba('+c+','+Math.min(1,.42+.4*form+flash*.4).toFixed(3)+')');tg.addColorStop(1,'rgba('+c+',0)');g.fillStyle=tg;g.fillRect(cx-r,cy-r,2*r,2*r);
    var ga=(1-form)*.085;if(ga>.005&&!simple){g.fillStyle='rgba(22,22,34,'+ga.toFixed(3)+')';g.textAlign='center';g.textBaseline='middle';g.font='600 '+Math.round(r*.48)+'px "Noto Serif SC","Songti SC",serif';g.fillText(o.gh[0],cx+o.gx[0]*r,cy-r*.12);g.globalAlpha=.7;g.fillText(o.gh[1],cx+o.gx[1]*r,cy+r*.2);g.globalAlpha=1}
    for(i=0;i<NP;i++){var q=o.P[i],x=cx+q.x*r,y=cy+q.y*r,s=lerp(q.s,.024,q.f)*r*2,al=lerp(q.al,.58,q.f);if(mode==='form'&&!q.has)al*=.4;g.globalAlpha=al;g.drawImage(q.tone&&q.f<.5?sprT[o.i]:sprD,x-s/2,y-s/2,s,s)}
    g.globalAlpha=1;
    var fr=g.createRadialGradient(cx,cy,r*.6,cx,cy,r);fr.addColorStop(0,'rgba(20,20,36,0)');fr.addColorStop(.8,'rgba(20,20,36,.07)');fr.addColorStop(1,'rgba(20,20,36,.3)');g.fillStyle=fr;g.fillRect(cx-r,cy-r,2*r,2*r);
    g.save();g.translate(cx+r*.1,cy+r*.64);g.scale(1,.42);var cg=g.createRadialGradient(0,0,0,0,0,r*.5);cg.addColorStop(0,'rgba(255,255,255,.9)');cg.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=cg;g.fillRect(-r*.5,-r*.5,r,r);g.restore();
    g.save();g.translate(cx-r*.4,cy-r*.42);g.rotate(-.5);g.transform(1,0,-.18,1,0,0);var pw=r*.15,ph=r*.21,gp=r*.034,hg=g.createLinearGradient(0,-ph,0,ph);hg.addColorStop(0,'rgba(255,255,255,.95)');hg.addColorStop(1,'rgba(255,255,255,.18)');g.fillStyle=hg;rr(-pw-gp/2,-ph,pw,ph*2,r*.035);g.fill();rr(gp/2,-ph,pw,ph*2,r*.035);g.fill();g.restore();
    g.fillStyle='rgba(255,255,255,.75)';g.beginPath();g.ellipse(cx+r*.52,cy+r*.34,r*.06,r*.032,-.9,0,7);g.fill();
    g.restore();
    g.strokeStyle='rgba(0,0,0,.26)';g.lineWidth=1;g.beginPath();g.arc(cx,cy,r,0,7);g.stroke();
    g.strokeStyle='rgba(255,255,255,.65)';g.lineWidth=1.2;g.beginPath();g.arc(cx,cy,r-1.8,Math.PI*.92,Math.PI*1.42);g.stroke()}
  function thread(dt){var dir=O[0].w>=0?1:-1,mag=clamp(Math.abs(O[0].w)/.4,.4,6),boost=1+flash*3,sp=simple?.15:1;
    g.lineWidth=1.2;g.strokeStyle='rgba(120,105,230,'+(.3+flash*.5).toFixed(3)+')';g.setLineDash([2,3.5]);g.beginPath();for(var k=0;k<=96;k++){var q=lem(k/96*Math.PI*2);if(k)g.lineTo(q[0],q[1]);else g.moveTo(q[0],q[1])}g.stroke();g.setLineDash([]);
    TH.forEach(function(p){p.u+=p.sp*dt*sp*boost*dir*mag;var q=lem(p.u),side=q[0]<W/2?0:1,ins=Math.hypot(q[0]-G.c[side],q[1]-G.cy)<G.r,a=(ins?.4:.9)*(.55+.45*Math.sin(p.u*3+p.z*5)),s=2.2*p.z*(1+flash*.8);
      g.globalAlpha=a;g.drawImage(sprT[side],q[0]-s*2,q[1]-s*2,s*4,s*4);g.fillStyle='rgba(70,56,170,'+(a*.8).toFixed(3)+')';g.beginPath();g.arc(q[0],q[1],s*.5,0,7);g.fill()});
    g.globalAlpha=1}
  Loop.add(function(now,dt){
    if(!vis||!W)return;var t=now*.001;
    if(mode==='form'){ft+=dt;if(ft>6.5)scatter()}
    flash=Math.max(0,flash-dt*.7);ghostT-=dt;
    if(ghostT<=0){ghostT=.16+Math.random()*.16;O.forEach(function(o){o.gh=[NAMES[Math.floor(Math.random()*NAMES.length)],NAMES[Math.floor(Math.random()*NAMES.length)]];o.gx=[rand(-.22,.22),rand(-.22,.22)]})}
    if(ptr&&ptr.o){ptr.o.w=ptr.w;O[1-ptr.o.i].w=-ptr.w}else O.forEach(function(o){o.w+=(o.base-o.w)*Math.min(1,dt*.45)});
    O.forEach(function(o){
      for(var i=0;i<NP;i++){var p=o.P[i];
        if(mode==='form'&&p.has){p.f=Math.min(1,p.f+dt*1.1);p.vx+=((p.tx-p.x)*14-p.vx*7)*dt*p.f;p.vy+=((p.ty-p.y)*14-p.vy*7)*dt*p.f}
        else{p.f=Math.max(0,p.f-dt*1.4);var fx=-p.y*o.w+Math.sin(p.y*2.6+t*.55+o.i*2)*.16,fy=p.x*o.w+Math.cos(p.x*2.3-t*.47+o.i*2)*.16;if(simple){fx*=.2;fy*=.2}p.vx+=(fx-p.vx)*dt*1.5;p.vy+=(fy-p.vy)*dt*1.5}
        p.x+=p.vx*dt;p.y+=p.vy*dt;var d=Math.hypot(p.x,p.y);if(d>.86){var nx=p.x/d,ny=p.y/d;p.x=nx*.86;p.y=ny*.86;var dot=p.vx*nx+p.vy*ny;if(dot>0){p.vx-=nx*dot*1.6;p.vy-=ny*dot*1.6}}
      }});
    g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);
    table(G.c[0],0);table(G.c[1],1);
    O.forEach(function(o){stand(G.c[o.i]);orb(o,t);lip(G.c[o.i])});
    thread(dt);
  });
  function sample(text){var M=180,c=document.createElement('canvas');c.width=c.height=M;var x=c.getContext('2d'),fs=text.length>1?Math.floor(M*.4):Math.floor(M*.58);
    x.fillStyle='#000';x.textAlign='center';x.textBaseline='middle';x.font='600 '+fs+'px "Noto Serif SC","Songti SC",serif';x.fillText(text,M/2,M/2+fs*.04);
    var d=x.getImageData(0,0,M,M).data,pts=[];for(var yy=0;yy<M;yy+=2)for(var xx=0;xx<M;xx+=2){if(d[(yy*M+xx)*4+3]>128)pts.push([(xx/M-.5)*1.45,(yy/M-.5)*1.45])}
    for(var i=pts.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),tmp=pts[i];pts[i]=pts[j];pts[j]=tmp}return pts}
  async function ask(){
    if(mode==='form'){scatter();return}
    var card=DECK[Math.floor(Math.random()*DECK.length)];
    var parts=(card.name||'微光').split(''),mid=Math.max(1,Math.ceil(parts.length/2));
    var left=parts.slice(0,mid).join(''),right=parts.slice(mid).join('')||left;
    try{if(document.fonts&&document.fonts.load)await Promise.race([document.fonts.load('600 80px "Noto Serif SC"',card.name),wait(900)])}catch(e){}
    [left,right].forEach(function(txt,i){var pts=sample(txt),o=O[i];o.P.sort(function(){return Math.random()-.5});var M=Math.min(pts.length,Math.floor(NP*.86));o.P.forEach(function(p,k){if(k<M){p.has=true;p.tx=pts[k][0];p.ty=pts[k][1]}else p.has=false})});
    mode='form';ft=0;flash=1;buzz([10,30,10]);cap.classList.remove('on');
    var c=center(el);Ripple(c.x,c.y,false);
    setTimeout(function(){
      var suit=SUITS.find(function(s){return s.id===card.suit});
      $('#capN').textContent=card.name||'微光';
      $('#capE').textContent=card.nameEn||((suit&&suit.titleEn)||'SPARK LIGHT ARCHIVE');
      $('#capK').textContent='正式占卜时，会结合你的问题与抽牌结果进行解读。';
      var art=$('#capArt');
      if(art&&card.asset){art.src=new URL((document.documentElement.dataset.root||'./')+card.asset,document.baseURI).href;art.alt=(card.name||'微光')+'牌面';art.hidden=false}
      cap.classList.add('on')
    },simple?0:1300);
  }
  function scatter(){mode='drift';cap.classList.remove('on');O.forEach(function(o){o.P.forEach(function(p){if(p.has){var a=rand(0,6.28);p.vx+=Math.cos(a)*rand(.3,.9);p.vy+=Math.sin(a)*rand(.3,.9)}p.has=false})})}
  function loc(e){var b=cv.getBoundingClientRect();return [e.clientX-b.left,e.clientY-b.top]}
  function which(x,y){for(var i=0;i<2;i++)if(Math.hypot(x-G.c[i],y-G.cy)<G.r*1.12)return O[i];return null}
  el.addEventListener('pointerdown',function(e){el.setPointerCapture(e.pointerId);var q=loc(e),o=which(q[0],q[1]),n=performance.now();ptr={o:o,a:o?Math.atan2(q[1]-G.cy,q[0]-G.c[o.i]):0,w:o?o.w:0,t0:n,lt:n,moved:0,x:q[0],y:q[1]};Ripple(e.clientX,e.clientY,true)});
  el.addEventListener('pointermove',function(e){if(!ptr)return;var q=loc(e),n=performance.now(),dt=Math.max(8,n-ptr.lt)/1000;ptr.moved+=Math.hypot(q[0]-ptr.x,q[1]-ptr.y);ptr.x=q[0];ptr.y=q[1];ptr.lt=n;
    if(ptr.moved>10&&mode==='form')scatter();if(!ptr.o)return;
    var a=Math.atan2(q[1]-G.cy,q[0]-G.c[ptr.o.i]),d=a-ptr.a;if(d>Math.PI)d-=2*Math.PI;if(d<-Math.PI)d+=2*Math.PI;ptr.a=a;ptr.w=clamp(lerp(ptr.w,d/dt*.4,.4),-5,5)});
  function up(){if(!ptr)return;var tap=ptr.moved<8&&performance.now()-ptr.t0<380;ptr=null;if(tap)ask()}
  el.addEventListener('pointerup',up);el.addEventListener('pointercancel',function(){ptr=null});
  el.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();ask()}});
})();
