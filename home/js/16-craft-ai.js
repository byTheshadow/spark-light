/* home/js/16-craft-ai.js —— 由原型拆分而来。经典脚本，按文件名顺序加载，共享同一页面作用域。 */
'use strict';
/* ============ AI 映画：生图 / 漫剧 ============ */
(function(){
  var comic=$('#comic'),cvs=$$('#comic canvas'),btn=$('#holdBtn'),ring=$('#holdRing'),lbl=$('#holdLbl'),steps=$('#cSteps'),bub=$('#cBub'),pr=$('#cPrompt');
  var mode='reel',prog=0,hold=false,auto=false,done=false,seed=7,T=[],vis=false,t0=0,nT=0,tmp=document.createElement('canvas'),nz=document.createElement('canvas'),nctx;nz.width=nz.height=72;nctx=nz.getContext('2d');
  var LINES=['今晚的月亮，好像在等我。','如果许愿，会被听见吗？','我好像听见了星星的声音。'],PROMPTS=['月夜的海面、背影、眼睛里的星星，黑白漫画分镜','满月、仰望的少女、瞳孔里的光，网点纸风格','海上的月光、回头的人、一颗落进眼里的星'],PS=['月光下的海面，网点纸质感，单幅插画','满月与夜海，黑白版画，大面积留白','海上一轮月，细线条与网点，横向构图'];
  function star(x,cx,cy,r){x.beginPath();x.moveTo(cx,cy-r);x.lineTo(cx+r*.22,cy-r*.22);x.lineTo(cx+r,cy);x.lineTo(cx+r*.22,cy+r*.22);x.lineTo(cx,cy+r);x.lineTo(cx-r*.22,cy+r*.22);x.lineTo(cx-r,cy);x.lineTo(cx-r*.22,cy-r*.22);x.closePath();x.fill()}
  function sea(x,w,h,R){
    var hz=h*.64,mx=w*(.6+R()*.22),my=h*(.25+R()*.1),mr=h*.17,st=Math.max(4,w/48);x.fillStyle='#000';
    for(var yy=st/2;yy<hz;yy+=st)for(var xx=(Math.round(yy/st)%2?st/2:0);xx<w;xx+=st){var d=Math.hypot(xx-mx,yy-my),base=(1-yy/hz)*.55+.14,gl=Math.max(0,1-d/(mr*3)),rad=st*.5*Math.max(0,base-gl*.65);if(rad>.3){x.beginPath();x.arc(xx,yy,rad,0,7);x.fill()}}
    x.fillStyle='#fff';for(var i=0;i<12;i++){star(x,R()*w,R()*hz*.7,st*(.6+R()*.6))}
    x.beginPath();x.arc(mx,my,mr,0,7);x.fill();x.lineWidth=Math.max(1.5,w/220);x.strokeStyle='#000';x.stroke();
    x.lineWidth=Math.max(1,w/400);for(i=0;i<3;i++){x.beginPath();x.arc(mx+(R()-.5)*mr,my+(R()-.5)*mr,mr*(.1+R()*.12),0,7);x.stroke()}
    x.fillStyle='#000';x.fillRect(0,hz,w,Math.max(1.5,w/260));x.lineCap='round';
    for(yy=hz+4;yy<h;yy+=Math.max(3,(yy-hz)*.12+3)){var k=(yy-hz)/(h-hz),cnt=3+Math.floor(R()*4),rw=mr*(.8+k*1.4);
      for(var n=0;n<cnt;n++){var a0=R()*w,a1=a0+w*(.08+R()*.25),segs=(a1>mx-rw&&a0<mx+rw)?[[a0,mx-rw],[mx+rw,a1]]:[[a0,a1]];
        segs.forEach(function(sg){if(sg[1]-sg[0]>2){x.lineWidth=Math.max(1,w/300)*(1+k*1.5);x.beginPath();x.moveTo(sg[0],yy);x.lineTo(sg[1],yy);x.stroke()}})}
      if(R()<.6){var cw=rw*(.3+R()*.5),cx0=mx+(R()-.5)*rw;x.lineWidth=Math.max(1,w/400);x.beginPath();x.moveTo(cx0-cw/2,yy);x.lineTo(cx0+cw/2,yy);x.stroke()}}
  }
  function figure(x,w,h,R){
    var st=Math.max(4,w/26);x.fillStyle='#000';
    for(var yy=st/2;yy<h;yy+=st)for(var xx=(Math.round(yy/st)%2?st/2:0);xx<w;xx+=st){var rad=st*.5*(.62*(1-yy/h)+.06);if(rad>.3){x.beginPath();x.arc(xx,yy,rad,0,7);x.fill()}}
    x.fillStyle='#fff';for(var i=0;i<9;i++)star(x,R()*w,R()*h*.45,st*(.5+R()*.7));
    var cx=w*(.46+R()*.08),hy=h*.6,hr=w*.16;x.fillStyle='#000';x.beginPath();x.arc(cx,hy,hr,0,7);x.fill();
    x.beginPath();x.moveTo(cx-w*.55,h);x.bezierCurveTo(cx-w*.42,h*.8,cx-w*.22,hy+hr*1.15,cx-hr*.45,hy+hr*.8);x.lineTo(cx+hr*.45,hy+hr*.8);x.bezierCurveTo(cx+w*.22,hy+hr*1.15,cx+w*.42,h*.8,cx+w*.55,h);x.closePath();x.fill();
    for(i=0;i<5;i++){var a=Math.PI*(1.15+i*.17);x.beginPath();x.moveTo(cx+Math.cos(a)*hr*.8,hy+Math.sin(a)*hr*.8);x.lineTo(cx+Math.cos(a)*hr*1.18,hy+Math.sin(a)*hr*1.18);x.lineTo(cx+Math.cos(a+.18)*hr*.9,hy+Math.sin(a+.18)*hr*.9);x.fill()}
    x.strokeStyle='#fff';x.lineWidth=Math.max(1,w/170);x.beginPath();x.arc(cx,hy,hr*.9,Math.PI*1.1,Math.PI*1.5);x.stroke();
  }
  function eye(x,w,h,R){
    var cx=w*.5,cy=h*.56,ew=w*.44,eh=h*.28;function q(t,p0,p1,p2){return (1-t)*(1-t)*p0+2*(1-t)*t*p1+t*t*p2}
    x.save();x.beginPath();x.moveTo(cx-ew,cy);x.quadraticCurveTo(cx,cy-eh*2,cx+ew,cy);x.quadraticCurveTo(cx,cy+eh*1.5,cx-ew,cy);x.closePath();x.clip();
    var ir=eh*1.05,iy=cy-eh*.12;x.strokeStyle='#000';x.lineWidth=Math.max(1,w/300);
    for(var k=0;k<44;k++){var a=k/44*Math.PI*2;x.beginPath();x.moveTo(cx+Math.cos(a)*ir*.5,iy+Math.sin(a)*ir*.5);x.lineTo(cx+Math.cos(a)*ir,iy+Math.sin(a)*ir);x.stroke()}
    x.lineWidth=Math.max(1.5,w/160);x.beginPath();x.arc(cx,iy,ir,0,7);x.stroke();
    x.fillStyle='#000';x.beginPath();x.arc(cx,iy,ir*.45,0,7);x.fill();
    var st=Math.max(3,w/60);for(var yy=cy-eh*2;yy<cy-eh*.4;yy+=st)for(var xx=cx-ew;xx<cx+ew;xx+=st){x.beginPath();x.arc(xx,yy,st*.3,0,7);x.fill()}
    x.fillStyle='#fff';x.beginPath();x.arc(cx-ir*.34,iy-ir*.34,ir*.2,0,7);x.fill();star(x,cx+ir*.26,iy+ir*.12,ir*.3);
    x.restore();
    x.strokeStyle='#000';x.lineCap='round';x.lineWidth=Math.max(2.5,w/60);x.beginPath();x.moveTo(cx-ew,cy);x.quadraticCurveTo(cx,cy-eh*2,cx+ew,cy);x.stroke();
    x.lineWidth=Math.max(1,w/200);x.beginPath();x.moveTo(cx-ew*.8,cy+eh*.1);x.quadraticCurveTo(cx,cy+eh*1.5,cx+ew*.85,cy+eh*.05);x.stroke();
    x.lineWidth=Math.max(1.2,w/150);for(k=0;k<9;k++){var t=.12+k*.1,px=q(t,cx-ew,cx,cx+ew),py=q(t,cy,cy-eh*2,cy),dx=px-cx,dy=py-(cy+eh),L=Math.hypot(dx,dy)||1;x.beginPath();x.moveTo(px,py);x.lineTo(px+dx/L*eh*.45,py+dy/L*eh*.45);x.stroke()}
    x.lineWidth=Math.max(2,w/90);x.beginPath();x.moveTo(cx-ew*.9,cy-eh*2.3);x.quadraticCurveTo(cx,cy-eh*3,cx+ew*.85,cy-eh*2.2);x.stroke();
  }
  function build(){var d=Math.min(devicePixelRatio||1,2);cvs.forEach(function(c,i){var w=Math.round(c.clientWidth*d),h=Math.round(c.clientHeight*d);if(!w||!h)return;c.width=w;c.height=h;
    var o=document.createElement('canvas');o.width=w;o.height=h;var x=o.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,w,h);[sea,figure,eye][i](x,w,h,lcg(seed*31+i*7+1));T[i]=o})}
  function noise(g,w,h,a){var im=nctx.createImageData(72,72);for(var k=0;k<im.data.length;k+=4){var v=Math.random()*255;im.data[k]=im.data[k+1]=im.data[k+2]=v;im.data[k+3]=255}nctx.putImageData(im,0,0);g.globalAlpha=a;g.imageSmoothingEnabled=false;g.drawImage(nz,0,0,w,h);g.imageSmoothingEnabled=true;g.globalAlpha=1}
  function render(){cvs.forEach(function(c,i){if(!T[i])return;var g=c.getContext('2d'),w=c.width,h=c.height,lp=clamp((prog-i*.14)/.72,0,1);
    if(lp>=1){g.drawImage(T[i],0,0);return}if(lp<=0){noise(g,w,h,1);return}
    var res=Math.max(3,Math.round(lerp(3,w/2,Math.pow(lp,2.2))));tmp.width=res;tmp.height=Math.max(2,Math.round(res*h/w));tmp.getContext('2d').drawImage(T[i],0,0,tmp.width,tmp.height);
    g.imageSmoothingEnabled=true;g.clearRect(0,0,w,h);g.drawImage(tmp,0,0,w,h);noise(g,w,h,Math.pow(1-lp,1.3)*.9)})}
  function ringP(){ring.style.strokeDashoffset=(163.4*(1-prog)).toFixed(1)}
  new IntersectionObserver(function(es){vis=es[0].isIntersecting;if(vis&&!T.length){build();render()}},{rootMargin:'60px'}).observe(comic);
  addEventListener('resize',function(){if(vis){build();render()}});
  Loop.add(function(now,dt){if(!vis)return;
    if((hold||auto)&&!done){prog=Math.min(1,prog+dt/2.8);comic.classList.add('busy');render();ringP();steps.textContent=Math.round(prog*30)+' / 30';if(prog>=1)finish()}
    else if(!done&&!simple){nT+=dt;if(nT>.09){nT=0;render()}}});
  function start(){if(done){reset();return}hold=true;btn.classList.add('on');t0=performance.now();buzz(8);if(prog===0)typeInto(pr,(mode==='still'?PS:PROMPTS)[seed%3],40).then(function(){pr.classList.remove('ph')})}
  function stop(){if(!hold)return;hold=false;btn.classList.remove('on');if(performance.now()-t0<240&&!done)auto=true;else if(!done)comic.classList.remove('busy')}
  function finish(){done=true;auto=false;hold=false;btn.classList.remove('on');comic.classList.remove('busy');bub.textContent=LINES[seed%3];$('#cEp').textContent='第 '+(seed%9+1)+' 话';comic.classList.add('done');lbl.textContent=mode==='still'?'再生一张':'再画一话';buzz([12,30,12]);var c=center(comic);Ripple(c.x,c.y,false)}
  function reset(){seed++;done=false;prog=0;auto=false;comic.classList.remove('done');lbl.textContent='按住生成';ringP();pr.textContent='按住按钮，开始生成';pr.classList.add('ph');steps.textContent='0 / 30';build();render()}
  btn.addEventListener('pointerdown',function(e){if(e.button)return;btn.setPointerCapture(e.pointerId);start()});
  btn.addEventListener('pointerup',stop);btn.addEventListener('pointercancel',stop);
  btn.addEventListener('click',function(e){if(e.detail===0){if(done)reset();else{if(prog===0)typeInto(pr,(mode==='still'?PS:PROMPTS)[seed%3],40).then(function(){pr.classList.remove('ph')});auto=true}}});
  btn.addEventListener('contextmenu',function(e){e.preventDefault()});
  // 生图 / 漫剧切换
  var segB=$$('.seg button');
  function setMode(m){if(m===mode)return;mode=m;segB.forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.m===m))});comic.classList.toggle('single',m==='still');buzz(6);reset()}
  segB.forEach(function(b){b.addEventListener('click',function(){setMode(b.dataset.m)})});
  // 进入前的提示
  (function(){var v=$('#aiVeil'),pl=$('#aiPlate');function pass(){v.classList.add('off');pl.classList.remove('veiled')}
    if(store('sl.ai')==='ok')pass();
    $('#veilOk').addEventListener('click',function(){store('sl.ai','ok');pass();buzz(10);setTimeout(function(){segB[1].focus({preventScroll:true})},300)});
    $('#veilNo').addEventListener('click',function(){go('price')});
  })();
})();
