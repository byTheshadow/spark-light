/* home/js/21-purify.js —— 由原型拆分而来。经典脚本，按文件名顺序加载，共享同一页面作用域。 */
'use strict';
/* ============ 鼠尾草净化：一束点燃的鼠尾草从页面上扫过，烟往上卷，扫过的字轻轻颤 ============ */
(function(){
  var busy=false,pur=$('#pur'),cv=$('#smoke'),g=cv.getContext('2d'),wand=$('#wand'),sage=$('#sageBtn'),SC=.5,P=[],E=[],FL=[[],[]],seq=0,dacc=0,run0=0,on=false,phase=0,pts=null,leafs=[],last=null,emitA=0,emitB=0,endPt=null;
  var sprG=makeSprite(64,[[0,'rgba(70,70,82,.5)'],[.45,'rgba(70,70,82,.16)'],[1,'rgba(70,70,82,0)']]),sprL=makeSprite(64,[[0,'rgba(150,135,240,.42)'],[.5,'rgba(150,135,240,.12)'],[1,'rgba(150,135,240,0)']]);
  var MAXP=FINE?520:300,DUR=4.4;
  function size(){cv.width=Math.ceil(innerWidth*SC);cv.height=Math.ceil(innerHeight*SC)}
  function leaves(){var out=new Set(),w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null),n,H=innerHeight;
    while((n=w.nextNode())){if(!n.nodeValue.trim())continue;var p=n.parentElement;if(!p||p.closest('script,style,svg,.pur,.toast,.reading,.sheet,.omenu,.wand,.cover .fobs'))continue;
      while(p&&p!==document.body&&getComputedStyle(p).display==='inline')p=p.parentElement;if(!p||p===document.body)continue;
      var r=p.getBoundingClientRect();if(r.bottom<0||r.top>H||!r.width)continue;out.add(p)}
    return Array.from(out).filter(function(el){return getComputedStyle(el).animationName==='none'}).map(function(el){var r=el.getBoundingClientRect();return {el:el,x:r.left+r.width/2,y:r.top+r.height/2,w:r.width/2,h:r.height/2,hit:false}})}
  function cat(p0,p1,p2,p3,t){var t2=t*t,t3=t2*t;return .5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3)}
  function along(u){var n=pts.length-3,f=clamp(u,0,.9999)*n,i=Math.floor(f),t=f-i,a=pts[i],b=pts[i+1],c=pts[i+2],d=pts[i+3];return [cat(a[0],b[0],c[0],d[0],t),cat(a[1],b[1],c[1],d[1],t)]}
  function wave(x,y){if(simple)return;var w=$('#wave'),t0=performance.now(),Dw=1500,Mx=Math.hypot(innerWidth,innerHeight);w.style.opacity='1';
    (function st(now){var k=clamp((now-t0)/Dw,0,1),R=easeOut(k)*Mx*1.1;w.style.background='radial-gradient(circle at '+x+'px '+y+'px,rgba(255,255,255,0) '+Math.max(0,R-200).toFixed(0)+'px,rgba(255,255,255,'+(.8*(1-k)).toFixed(3)+') '+R.toFixed(0)+'px,rgba(255,255,255,0) '+(R+80).toFixed(0)+'px)';if(k<1)requestAnimationFrame(st);else w.style.opacity='0'})(t0)}
  function finishText(){pur.classList.add('done');$('#purT').textContent='此处已净化';$('#purS').textContent='愿这里清清朗朗'}
  function run(src){
    if(busy)return;busy=true;buzz([20,40,20]);var r=src.getBoundingClientRect(),sx=r.left+r.width/2,sy=r.top+r.height/2,w=innerWidth,h=innerHeight;
    pur.classList.remove('done','on');$('#purT').textContent='正在净化此空间';$('#purS').textContent='鼠尾草的烟正在扫过每一个字';void pur.offsetWidth;pur.classList.add('on');sage.classList.add('burn');BG.purge();
    if(simple){setTimeout(function(){finishText()},700);setTimeout(function(){pur.classList.remove('on');sage.classList.remove('burn');busy=false},2200);return}
    size();P=[];E=[];FL=[[],[]];dacc=0;leafs=leaves();phase=0;emitA=emitB=0;
    pts=[[sx,sy],[sx,sy],[w*.14,h*.74],[w*.36,h*.36],[w*.6,h*.7],[w*.84,h*.38],[w*.9,h*.66],[w*.9,h*.66]];
    last=[sx,sy];run0=performance.now();on=true;wand.classList.add('on');
  }
  Loop.add(function(now,dt){
    if(!on)return;var t=(now-run0)/1000,u=clamp(t/DUR,0,1),e=1-Math.pow(1-u,1.3),pt=along(e),mv=Math.hypot(pt[0]-last[0],pt[1]-last[1]),vx=(pt[0]-last[0])/Math.max(dt,.001),vy=(pt[1]-last[1])/Math.max(dt,.001);last=pt;
    if(phase===0){
      var rot=clamp(vx*.03,-28,28);wand.style.transform='translate('+pt[0].toFixed(1)+'px,'+pt[1].toFixed(1)+'px) rotate('+rot.toFixed(1)+'deg)';
      var tx=pt[0]+Math.sin(rot*Math.PI/180)*2,ty=pt[1]-2;
      dacc+=mv+dt*20;while(dacc>=13&&P.length<MAXP){dacc-=13;P.push({x:tx+rand(-4,4),y:ty+rand(-4,4),vx:rand(-12,12)-vx*.05,vy:rand(-50,-24)-vy*.03,r:rand(9,16),gr:rand(26,50),life:rand(2.8,4.8),age:0,a:rand(.07,.13),l:Math.random()<.22})}
      for(var sI=0;sI<2;sI++)FL[sI].push({x:tx+(sI?2.5:-2.5),y:ty,vx:rand(-5,5)-vx*.04,vy:rand(-42,-30),age:0,life:rand(2.4,3.4),id:seq});seq++;
      emitB+=dt*16;while(emitB>=1){emitB--;E.push({x:tx,y:ty,vx:rand(-34,34),vy:rand(-100,-40),life:rand(.5,1.3),age:0})}
      for(var i=0;i<leafs.length;i++){var L=leafs[i];if(L.hit)continue;var dx=Math.max(0,Math.abs(pt[0]-L.x)-L.w),dy=Math.max(0,Math.abs(pt[1]-L.y)-L.h);if(dx*dx+dy*dy<140*140){L.hit=true;(function(el){el.classList.add('jt');el.style.setProperty('--j',(Math.random()*-.16).toFixed(3)+'s');setTimeout(function(){el.classList.remove('jt');el.style.removeProperty('--j')},900)})(L.el)}}
      if(u>=1){phase=1;endPt=pt;wand.classList.remove('on');finishText();wave(pt[0],pt[1]);buzz(30)}
    }
    g.setTransform(SC,0,0,SC,0,0);g.clearRect(0,0,cv.width/SC,cv.height/SC);
    for(var j=P.length-1;j>=0;j--){var p=P[j];p.age+=dt;if(p.age>=p.life){P.splice(j,1);continue}
      var ang=Math.sin(p.x*.006+t*.7)*1.7+Math.cos(p.y*.005-t*.5)*1.7;p.vx+=Math.cos(ang)*30*dt;p.vy+=(Math.sin(ang)*20-16)*dt;p.vx*=1-dt*.35;p.vy*=1-dt*.2;p.x+=p.vx*dt;p.y+=p.vy*dt;p.r+=p.gr*dt;
      var k=p.age/p.life,al=p.a*Math.sin(Math.PI*Math.min(1,k*1.3))*(1-k*.3);if(al<=0)continue;g.globalAlpha=al;g.drawImage(p.l?sprL:sprG,p.x-p.r,p.y-p.r,p.r*2,p.r*2)}
    g.globalAlpha=1;g.lineCap='round';
    for(var sI=0;sI<2;sI++){var A=FL[sI];
      for(j=A.length-1;j>=0;j--){var f=A[j];f.age+=dt;if(f.age>=f.life){A.splice(j,1);continue}var an=Math.sin(f.x*.012+t*1.1+sI*2)*2.2+Math.cos(f.y*.01-t*.8)*2.2;f.vx+=Math.cos(an)*44*dt;f.vy+=(Math.sin(an)*24-10)*dt;f.vx*=1-dt*.5;f.vy*=1-dt*.3;f.x+=f.vx*dt;f.y+=f.vy*dt}
      for(j=1;j<A.length;j++){var a0=A[j-1],a1=A[j];if(a1.id!==a0.id+1)continue;var dd=Math.hypot(a1.x-a0.x,a1.y-a0.y);if(dd>70)continue;var kk=Math.max(a0.age/a0.life,a1.age/a1.life),al2=(1-kk)*Math.min(1,a1.age*4)*(sI?.34:.46);if(al2<.01)continue;
        g.strokeStyle=sI?'rgba(120,108,200,'+al2.toFixed(3)+')':'rgba(64,64,76,'+al2.toFixed(3)+')';g.lineWidth=.9+kk*4.2;g.beginPath();g.moveTo(a0.x,a0.y);g.lineTo(a1.x,a1.y);g.stroke()}}
    for(j=E.length-1;j>=0;j--){var q=E[j];q.age+=dt;if(q.age>=q.life){E.splice(j,1);continue}q.vy+=30*dt;q.vx*=1-dt;q.x+=q.vx*dt;q.y+=q.vy*dt;var ka=1-q.age/q.life;g.fillStyle='rgba(241,'+(150+ka*70).toFixed(0)+',90,'+(ka*.9).toFixed(3)+')';g.beginPath();g.arc(q.x,q.y,1.1+ka*1.2,0,7);g.fill()}
    if(phase===1&&!P.length&&!E.length&&!FL[0].length&&!FL[1].length){on=false;g.clearRect(0,0,cv.width,cv.height);setTimeout(function(){pur.classList.remove('on');sage.classList.remove('burn');busy=false},700)}
  });
  addEventListener('resize',function(){if(on)size()});
  $('#sageBtn').addEventListener('click',function(){run(this)});$('#sprig').addEventListener('click',function(){run(this)});
})();


document.addEventListener('keydown',function(e){if(e.key!=='Escape')return;if(Price.isDetail()){Price.closeDetail();return}if(Sheets.isOpen()){Sheets.close();return}if(Orb.isOpen()){Orb.close();return}if(Reading.isOpen()){Reading.keep();return}});
