/* home/js/15-craft-pendulum.js —— 由原型拆分而来。经典脚本，按文件名顺序加载，共享同一页面作用域。 */
'use strict';
/* ============ 灵摆调频：立体视角，挂链、晶体摆锤与盘面上的影子 ============ */
(function(){
  var box=$('#pend'),cv=$('#pendCv'),g=cv.getContext('2d'),btn=$('#pendBtn'),S=0,SH=0,dpr=1,vis=false;
  var AX=[{a:-90,zh:'是',en:'yes'},{a:0,zh:'否',en:'no'},{a:-45,zh:'也许',en:'maybe'},{a:-135,zh:'再问一次',en:'ask again'}];
  var W2=15.4,p={x:.25,y:-.1,vx:-.1,vy:.62},mode='free',tune=null,trail=[],drag=null,rdT=0,spin=0,hi=null;
  var A=32*Math.PI/180,ca=Math.cos(A),sa=Math.sin(A),D=4.2,PH=1.78,LEN=1.6,Y0=.72,yaw=0,F=1,CX=0,CY=0;
  function n3(v){var l=Math.hypot(v[0],v[1],v[2])||1;return [v[0]/l,v[1]/l,v[2]/l]}
  function cr3(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
  function dot3(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}
  function sub3(a,b){return [a[0]-b[0],a[1]-b[1],a[2]-b[2]]}
  function ax3(a,u,k){return [a[0]+u[0]*k,a[1]+u[1]*k,a[2]+u[2]*k]}
  var LT=n3([-.45,.85,.55]),VW=[0,sa,ca],HV=n3([LT[0]+VW[0],LT[1]+VW[1],LT[2]+VW[2]]);
  function P3(X,Y,Z){var cb=Math.cos(yaw),sb=Math.sin(yaw),x=X*cb+Z*sb,z=-X*sb+Z*cb,y=Y-Y0,y1=y*ca-z*sa,z1=y*sa+z*ca,s=F/(D-z1);return [CX+x*s,CY-y1*s,s,z1]}
  function size(){var w=box.clientWidth;if(!w)return;dpr=Math.min(devicePixelRatio||1,2);S=w;SH=box.clientHeight;cv.width=Math.round(w*dpr);cv.height=Math.round(SH*dpr);F=S*1.5;CX=S/2;CY=S*.4}
  new IntersectionObserver(function(es){vis=es[0].isIntersecting;if(vis)size()},{rootMargin:'60px'}).observe(box);
  addEventListener('resize',function(){if(vis)size()});
  function setSt(a,b){$('#pendSt').textContent=a;$('#pendSub').textContent=b}
  Loop.add(function(now,dt){
    if(!vis||!S)return;var sub=3,h=dt/sub;
    for(var s=0;s<sub;s++){
      var ax=-W2*p.x-.12*p.vx,ay=-W2*p.y-.12*p.vy;
      if(drag){ax+=(drag.x-p.x)*150-p.vx*17+W2*p.x;ay+=(drag.y-p.y)*150-p.vy*17+W2*p.y}
      else if(tune){var d=tune.d,par=p.x*d[0]+p.y*d[1],vpar=p.vx*d[0]+p.vy*d[1],px=p.x-par*d[0],py=p.y-par*d[1],vpx=p.vx-vpar*d[0],vpy=p.vy-vpar*d[1];
        var damp=2.4*Math.min(1,tune.t/1.2);ax-=vpx*damp+px*damp*1.4;ay-=vpy*damp+py*damp*1.4;
        var E=.5*(vpar*vpar+W2*par*par),E0=.5*W2*.6*.6,pump=clamp((E0-E)/E0,-1,1)*2.6;
        if(Math.abs(vpar)<.04&&Math.abs(par)<.02){ax+=d[0]*1.2;ay+=d[1]*1.2}else{var sgn=vpar>=0?1:-1;ax+=d[0]*sgn*pump;ay+=d[1]*sgn*pump}}
      p.vx+=ax*h;p.vy+=ay*h;p.x+=p.vx*h;p.y+=p.vy*h;
      var r=Math.hypot(p.x,p.y);if(r>.84){p.x*=.84/r;p.y*=.84/r;p.vx*=.7;p.vy*=.7}
    }
    if(tune&&mode==='tune'){tune.t+=dt;if(tune.t>3.8)lock()}
    trail.push([p.x,p.y]);if(trail.length>120)trail.shift();
    yaw=simple?0:Tilt.x*.22;spin+=dt*(simple?0:.5+Math.hypot(p.vx,p.vy)*1.6);
    draw();
    rdT+=dt;if(rdT>.25){rdT=0;var amp=0;trail.forEach(function(q){amp=Math.max(amp,Math.hypot(q[0],q[1]))});$('#pendRd').textContent='振幅 '+amp.toFixed(2)+'，周期 1.60 秒'+(mode==='lock'?'，已同频':'')}
  });
  function ring(r,Y){g.beginPath();for(var k=0;k<=72;k++){var a=k/72*Math.PI*2,q=P3(Math.cos(a)*r,Y,Math.sin(a)*r);if(k)g.lineTo(q[0],q[1]);else g.moveTo(q[0],q[1])}g.closePath()}
  function seg(x1,z1,x2,z2){var a=P3(x1,0,z1),b=P3(x2,0,z2);g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.stroke()}
  function links(a,b,n){var dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy)/n,an=Math.atan2(dy,dx);g.strokeStyle='#1c1c20';g.lineWidth=1;
    for(var k=0;k<n;k++){var t=(k+.5)/n,x=a[0]+dx*t,y=a[1]+dy*t;g.save();g.translate(x,y);g.rotate(an);g.beginPath();if(k%2)g.ellipse(0,0,L*.62,L*.28,0,0,7);else{g.moveTo(-L*.6,0);g.lineTo(L*.6,0)}g.stroke();g.restore()}}
  function draw(){
    g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,S,SH);var k,q;
    // 盘：先画厚度，再画盘面
    ring(1,-.05);g.fillStyle='#dcdce2';g.fill();g.strokeStyle='rgba(0,0,0,.3)';g.lineWidth=.6;g.stroke();
    ring(1,0);var bg=g.createLinearGradient(0,CY-S*.05,0,CY+S*.5);bg.addColorStop(0,'#f2f2f5');bg.addColorStop(1,'#fdfdfe');g.fillStyle=bg;g.fill();g.strokeStyle='#000';g.lineWidth=.8;g.stroke();
    g.lineWidth=.4;ring(.955,0);g.stroke();ring(.62,0);g.setLineDash([1,3]);g.stroke();g.setLineDash([]);ring(.3,0);g.stroke();
    for(var t=0;t<360;t+=5){var a=t*Math.PI/180,L=t%15===0,c=Math.cos(a),s=Math.sin(a);g.lineWidth=L?.7:.35;seg(c*.955,s*.955,c*(L?1:.975),s*(L?1:.975))}
    var st=[];for(k=0;k<8;k++){var aa=k*Math.PI/4,rr=k%2?.04:.12;q=P3(Math.cos(aa)*rr,0,Math.sin(aa)*rr);st.push(q)}g.fillStyle='rgba(0,0,0,.14)';g.beginPath();st.forEach(function(q,i){if(i)g.lineTo(q[0],q[1]);else g.moveTo(q[0],q[1])});g.closePath();g.fill();
    AX.forEach(function(ax,i){var r=ax.a*Math.PI/180,c=Math.cos(r),s=Math.sin(r),on=hi===i;g.strokeStyle=on?'#000':'rgba(0,0,0,.42)';g.lineWidth=on?1.2:.5;if(!on)g.setLineDash([1.5,3]);seg(-c*.7,-s*.7,c*.7,s*.7);g.setLineDash([]);
      [1,-1].forEach(function(sg){var q=P3(c*.83*sg,0,s*.83*sg),kk=q[2]/(F/4.58),fs=S*.036*kk;g.save();g.translate(q[0],q[1]);g.scale(1,.62);g.fillStyle=on?'#000':'#6c6c74';g.textAlign='center';g.textBaseline='middle';
        g.font=(on?'600 ':'400 ')+fs.toFixed(1)+'px "Noto Serif SC","Songti SC",serif';g.fillText(ax.zh,0,-fs*.35);g.font='italic '+(fs*.74).toFixed(1)+'px "Instrument Serif",serif';g.fillText(ax.en,0,fs*.6);g.restore()})});
    // 轨迹落在盘面上
    if(trail.length>2){g.lineCap='round';g.lineJoin='round';g.beginPath();trail.forEach(function(q,i){var z=P3(q[0],0,q[1]);if(i)g.lineTo(z[0],z[1]);else g.moveTo(z[0],z[1])});
      g.strokeStyle=mode==='lock'?'rgba(150,135,255,.24)':'rgba(150,135,255,.13)';g.lineWidth=S*.04;g.stroke();
      for(var i=1;i<trail.length;i++){var a1=P3(trail[i-1][0],0,trail[i-1][1]),b1=P3(trail[i][0],0,trail[i][1]),al=i/trail.length;g.beginPath();g.moveTo(a1[0],a1[1]);g.lineTo(b1[0],b1[1]);g.strokeStyle='rgba(0,0,0,'+(al*.5).toFixed(3)+')';g.lineWidth=.7+al*1.1;g.stroke()}}
    // 摆锤的位置与影子
    var X=p.x,Z=p.y,hy=PH-Math.sqrt(Math.max(.01,LEN*LEN-X*X-Z*Z)),sh=P3(X,0,Z),hs=clamp(hy,0,.6);
    g.save();g.translate(sh[0],sh[1]);g.scale(1,.5);var sr=sh[2]*(.07+hs*.14),sgr=g.createRadialGradient(0,0,0,0,0,sr);sgr.addColorStop(0,'rgba(0,0,0,'+(.42/(1+hs*3)).toFixed(3)+')');sgr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=sgr;g.beginPath();g.arc(0,0,sr,0,7);g.fill();g.restore();
    if(mode==='lock'){g.save();g.translate(sh[0],sh[1]);g.scale(1,.5);var lg=g.createRadialGradient(0,0,0,0,0,sh[2]*.3);lg.addColorStop(0,'rgba(180,168,255,.45)');lg.addColorStop(1,'rgba(180,168,255,0)');g.fillStyle=lg;g.beginPath();g.arc(0,0,sh[2]*.3,0,7);g.fill();g.restore()}
    // 链子：从画面上方垂下来，经过指环，连到摆锤
    var B=[X,hy,Z],u=n3([X,hy-PH,Z]),pv=P3(0,PH,0),ap=ax3(B,u,-.15),apS=P3(ap[0],ap[1],ap[2]);
    links([pv[0],-4],pv,9);links(pv,apS,22);
    g.strokeStyle='#1c1c20';g.lineWidth=1.6;g.beginPath();g.ellipse(pv[0],pv[1],S*.016,S*.011,0,0,7);g.stroke();
    // 晶体摆锤：六棱双锥，按法线打光
    var v1=n3(cr3(u,[0,0,1])),v2=cr3(u,v1),RB=.1,top=ax3(B,u,-.12),tip=ax3(B,u,.27),cen=ax3(B,u,-.025),rg=[];
    for(k=0;k<6;k++){var th=k*Math.PI/3+spin,cc=Math.cos(th),ss=Math.sin(th);rg.push([cen[0]+(v1[0]*cc+v2[0]*ss)*RB,cen[1]+(v1[1]*cc+v2[1]*ss)*RB,cen[2]+(v1[2]*cc+v2[2]*ss)*RB])}
    var fc=[];for(k=0;k<6;k++){var r0=rg[k],r1=rg[(k+1)%6];fc.push([top,r0,r1]);fc.push([r0,tip,r1])}
    var vis3=[];fc.forEach(function(f){var nn=n3(cr3(sub3(f[1],f[0]),sub3(f[2],f[0]))),ce=[(f[0][0]+f[1][0]+f[2][0])/3,(f[0][1]+f[1][1]+f[2][1])/3,(f[0][2]+f[1][2]+f[2][2])/3];if(dot3(nn,sub3(ce,B))<0)nn=[-nn[0],-nn[1],-nn[2]];if(dot3(nn,VW)<-.05)return;
      var pp=f.map(function(v){return P3(v[0],v[1],v[2])});vis3.push({p:pp,z:(pp[0][3]+pp[1][3]+pp[2][3])/3,n:nn})});
    vis3.sort(function(a,b){return a.z-b.z});
    vis3.forEach(function(f){var df=Math.max(0,dot3(f.n,LT)),sp=Math.pow(Math.max(0,dot3(f.n,HV)),28),L=22+df*150+sp*250;
      g.fillStyle='rgb('+Math.min(255,L*.93+8).toFixed(0)+','+Math.min(255,L*.91+8).toFixed(0)+','+Math.min(255,L+16).toFixed(0)+')';g.beginPath();g.moveTo(f.p[0][0],f.p[0][1]);g.lineTo(f.p[1][0],f.p[1][1]);g.lineTo(f.p[2][0],f.p[2][1]);g.closePath();g.fill();g.strokeStyle='rgba(255,255,255,.3)';g.lineWidth=.5;g.stroke()});
    var tp=P3(top[0],top[1],top[2]);g.fillStyle='#1c1c20';g.beginPath();g.arc(tp[0],tp[1],Math.max(1.6,tp[2]*.014),0,7);g.fill();
  }
  function toU(e){var b=box.getBoundingClientRect(),px=e.clientX-b.left,py=e.clientY-b.top,y=.3-Y0,k=(CY-py)/F,z=(y*ca+k*y*sa-k*D)/(sa-k*ca),z1=y*sa+z*ca,s=F/(D-z1),x=(px-CX)/s,cb=Math.cos(yaw),sb=Math.sin(yaw),X=x*cb-z*sb,Z=x*sb+z*cb,r=Math.hypot(X,Z);if(r>.84){X*=.84/r;Z*=.84/r}return [X,Z]}
  box.addEventListener('pointerdown',function(e){box.setPointerCapture(e.pointerId);var u=toU(e);drag={x:u[0],y:u[1]};tune=null;mode='free';hi=null;btn.disabled=false;btn.querySelector('span').textContent='开始调频';setSt('拖动中','松手把它甩出去');buzz(6)});
  box.addEventListener('pointermove',function(e){if(!drag)return;var u=toU(e);drag.x=u[0];drag.y=u[1]});
  function up(){if(!drag)return;drag=null;setSt('自由摆动','可以再甩一下，或者开始调频')}
  box.addEventListener('pointerup',up);box.addEventListener('pointercancel',up);
  btn.addEventListener('click',function(){if(mode==='tune')return;var ax=AX[Math.floor(Math.random()*AX.length)],r=ax.a*Math.PI/180;tune={d:[Math.cos(r),Math.sin(r)],ax:ax,t:0};mode='tune';hi=null;btn.disabled=true;setSt('调频中','让它自己找方向……');buzz(10)});
  function lock(){mode='lock';hi=AX.indexOf(tune.ax);btn.disabled=false;btn.querySelector('span').textContent='再调一次';setSt('已对齐','灵摆指向「'+tune.ax.zh+'」');buzz([12,40,12])}
})();
