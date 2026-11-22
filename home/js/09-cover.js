/* home/js/09-cover.js —— 由原型拆分而来。经典脚本，按文件名顺序加载，共享同一页面作用域。 */
'use strict';
/* ============ 封面：今夜的月亮、星空与漂浮的小物件 ============ */
var Cover=(function(){
  $('#issueNo').textContent=ISSUE;$('#coloIssue').textContent='第 '+ISSUE+' 期';
  $('#moonMeta').textContent='今夜'+MOON.name+'，亮面 '+Math.round(MOON.illum*100)+'%';
  $$('[data-go]').forEach(function(b){b.addEventListener('click',function(){go(b.dataset.go)})});
  // 星空：远处的点 + 会闪的四角星
  var R=lcg(+ISSUE+3),h='',i;
  for(i=0;i<90;i++){var v=(.8+R()*1.6).toFixed(1);h+='<b style="left:'+(R()*100).toFixed(2)+'%;top:'+(R()*94).toFixed(2)+'%;width:'+v+'px;height:'+v+'px;opacity:'+(.12+R()*.5).toFixed(2)+'"></b>'}
  for(i=0;i<16;i++)h+='<i data-depth="'+(.4+R()*1.4).toFixed(2)+'" style="left:'+(2+R()*96).toFixed(2)+'%;top:'+(4+R()*80).toFixed(2)+'%;--s:'+(5+R()*9).toFixed(1)+'px;--t:'+(3+R()*4).toFixed(1)+'s;--dl:-'+(R()*5).toFixed(1)+'s"></i>';
  $('#covSky').innerHTML=h;
  // 月相环：一圈 30 天刻度、8 个月相，今夜的位置点亮
  var rg='<circle r="97" fill="none" stroke="rgba(255,255,255,.16)" stroke-width=".4"/><circle r="82" fill="none" stroke="rgba(255,255,255,.08)" stroke-width=".3" stroke-dasharray="1 3"/>';
  for(var d=0;d<30;d++){var an=d/29.53*Math.PI*2,sx=Math.sin(an),cy=-Math.cos(an);rg+='<line x1="'+(sx*94.5).toFixed(2)+'" y1="'+(cy*94.5).toFixed(2)+'" x2="'+(sx*97).toFixed(2)+'" y2="'+(cy*97).toFixed(2)+'" stroke="rgba(255,255,255,.35)" stroke-width=".35"/>'}
  var cur=Math.round(MOON.p*8)%8;
  for(var k=0;k<8;k++){var a=k*Math.PI/4,x=Math.sin(a)*88.5,y=-Math.cos(a)*88.5;rg+='<g transform="translate('+x.toFixed(2)+' '+y.toFixed(2)+')" opacity="'+(k===cur?1:.5)+'"><circle r="3.3" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.45)" stroke-width=".3"/><path d="'+Moon.path(k/8,3.3)+'" fill="#fff"/></g>'}
  var ma=MOON.p*Math.PI*2,mx=Math.sin(ma),my=-Math.cos(ma),lx=mx*106,ly=my*106+(my>0?5:0);
  rg+='<line x1="'+(mx*78).toFixed(2)+'" y1="'+(my*78).toFixed(2)+'" x2="'+(mx*100).toFixed(2)+'" y2="'+(my*100).toFixed(2)+'" stroke="#fff" stroke-width=".7"/><circle cx="'+(mx*100).toFixed(2)+'" cy="'+(my*100).toFixed(2)+'" r="1.3" fill="#fff"/>';
  $('#moonRing').innerHTML=rg;
  $('#moonHalo').style.setProperty('--lx',(Math.sin(ma)*14).toFixed(1)+'%');

  // 月面：经纬展开的整张月球贴图，按今夜的月相固定打光，贴图缓慢自转
  var MN=null,mOff=0,mLast=-1;
  function buildMoon(){
    var cv=$('#moonCv'),w=cv.clientWidth;if(!w)return;var n=Math.min(560,Math.round(w*Math.min(devicePixelRatio||1,2)));if(MN&&Math.abs(MN.n-n)<4)return;cv.width=cv.height=n;
    var tw=n*2,th=n,T=document.createElement('canvas');T.width=tw;T.height=th;var t=T.getContext('2d'),r=lcg(29),i;
    t.fillStyle='#cacacf';t.fillRect(0,0,tw,th);
    function wrap(x,rad,f){[x-tw,x,x+tw].forEach(function(xx){if(xx+rad>=0&&xx-rad<=tw)f(xx)})}
    function blob(x,y,rad,col){wrap(x,rad,function(xx){var gr=t.createRadialGradient(xx,y,0,xx,y,rad);gr.addColorStop(0,col);gr.addColorStop(1,'rgba(0,0,0,0)');t.fillStyle=gr;t.beginPath();t.arc(xx,y,rad,0,7);t.fill()})}
    function arc(x,y,rad,a0,a1,lw,col){wrap(x,rad,function(xx){t.lineWidth=lw;t.strokeStyle=col;t.beginPath();t.arc(xx,y,rad,a0,a1);t.stroke()})}
    // 正面：熟悉的月海，集中在贴图中间那一半
    [[.34,.3,.13],[.48,.36,.11],[.6,.5,.13],[.42,.56,.1],[.28,.47,.08],[.66,.33,.07],[.55,.68,.07],[.22,.34,.06],[.7,.6,.06]].forEach(function(m){for(var k=0;k<16;k++){var a=r()*6.283,dd=Math.sqrt(r())*m[2]*.9;blob((.25+(m[0]+Math.cos(a)*dd)*.5)*tw,(m[1]+Math.sin(a)*dd)*th,m[2]*n*(.22+r()*.4),'rgba(52,52,68,.2)')}});
    // 背面：几乎没有月海，坑更密
    for(i=0;i<6;i++){var bx=(r()<.5?r()*.22:.78+r()*.22)*tw;blob(bx,(.2+r()*.6)*th,n*(.03+r()*.05),'rgba(56,56,72,.16)')}
    for(i=0;i<4800;i++){var v=r()<.5?255:0,s=1+r()*n*.005;t.fillStyle='rgba('+v+','+v+','+v+','+(.02+r()*.05).toFixed(3)+')';t.fillRect(r()*tw,r()*th,s,s)}
    for(i=0;i<260;i++){var cx=r()*tw,cy=r()*th,cr=n*(.003+Math.pow(r(),4)*.04);blob(cx,cy,cr*1.1,'rgba(36,36,48,.16)');arc(cx,cy,cr,Math.PI*.8,Math.PI*1.9,Math.max(.6,cr*.18),'rgba(255,255,255,.09)');arc(cx,cy,cr*.92,Math.PI*1.9,Math.PI*2.8,Math.max(.6,cr*.18),'rgba(0,0,0,.06)')}
    [[.44,.82,.03],[.56,.18,.02],[.1,.5,.025]].forEach(function(c){var x=c[0]*tw,y=c[1]*th;blob(x,y,c[2]*n*1.3,'rgba(255,255,255,.55)');for(var k=0;k<24;k++){var a=r()*6.283,L=n*(.08+r()*.3),lw=1+r()*n*.004,ex=Math.cos(a)*L,ey=Math.sin(a)*L;wrap(x,L,function(xx){t.lineWidth=lw;t.strokeStyle='rgba(255,255,255,.07)';t.beginPath();t.moveTo(xx,y);t.lineTo(xx+ex,y+ey);t.stroke()})}});
    var T2=document.createElement('canvas');T2.width=tw;T2.height=th;var t2=T2.getContext('2d');t2.filter='blur('+(n/700).toFixed(2)+'px)';t2.drawImage(T,0,0);
    var raw=t2.getImageData(0,0,tw,th).data,tex=new Uint8Array(tw*th);for(i=0;i<tw*th;i++)tex[i]=raw[i*4];
    var g=cv.getContext('2d'),img=g.createImageData(n,n),o=img.data,c=n/2,Rr=n/2-1,Lx=Math.sin(ma),Lz=-Math.cos(ma),IX=[],RW=[],UB=[],SH=[];
    for(var y=0;y<n;y++){var ny=(y+.5-c)/Rr,cl=Math.sqrt(Math.max(1e-6,1-ny*ny)),ty=clamp(Math.round((Math.asin(clamp(ny,-1,1))/Math.PI+.5)*(th-1)),0,th-1);
      for(var x=0;x<n;x++){var nx=(x+.5-c)/Rr,q=nx*nx+ny*ny;if(q>=1)continue;var nz=Math.sqrt(1-q),lam=nx*Lx+nz*Lz,lit=clamp((lam+.05)/.17,0,1);lit=lit*lit*(3-2*lit);
        var k=(y*n+x)*4;o[k+3]=clamp((1-Math.sqrt(q))*Rr,0,1)*255;IX.push(k);RW.push(ty*tw);UB.push(Math.round((Math.asin(clamp(nx/cl,-1,1))/(2*Math.PI)+.5)*tw)%tw);SH.push(lit*(.8+.28*nz)*1.16+.055*(1-lit))}}
    MN={n:n,tw:tw,tex:tex,g:g,img:img,ix:Int32Array.from(IX),rw:Int32Array.from(RW),ub:Int32Array.from(UB),sh:Float32Array.from(SH)};mLast=-1;drawMoon(Math.floor(mOff));
  }
  function drawMoon(off){var M=MN,d=M.img.data,tw=M.tw,L=M.ix.length;off=((off%tw)+tw)%tw;
    for(var i=0;i<L;i++){var tx=M.ub[i]+off;if(tx>=tw)tx-=tw;var v=M.tex[M.rw[i]+tx]*M.sh[i],k=M.ix[i];d[k]=v*.965;d[k+1]=v*.957;d[k+2]=v*.99}
    M.g.putImageData(M.img,0,0)}
  buildMoon();var rT=0;addEventListener('resize',function(){clearTimeout(rT);rT=setTimeout(buildMoon,200)});

  // 漂浮的小物件：轻轻浮动、缓慢自转；横向拨一下会像硬币一样转起来，轻触就去那一页
  var SV={
    bench:'<svg viewBox="0 0 30 46"><rect x="1" y="1" width="28" height="44" rx="3" fill="#17171c" stroke="rgba(255,255,255,.9)" stroke-width="1"/><rect x="4" y="4" width="22" height="38" rx="1.5" fill="none" stroke="rgba(255,255,255,.35)" stroke-width=".6"/><circle cx="15" cy="23" r="9.5" fill="none" stroke="rgba(255,255,255,.4)" stroke-width=".5" stroke-dasharray="1 1.6"/><path d="'+STAR4(15,23,7,1.4)+'" fill="#fff"/></svg>',
    craft:'<svg viewBox="0 0 46 46"><defs><radialGradient id="fobG" cx=".36" cy=".3" r=".75"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="rgba(214,208,255,.6)"/><stop offset="1" stop-color="rgba(150,140,230,.3)"/></radialGradient></defs><path d="M23 7L39 23L23 39L7 23Z" fill="none" stroke="rgba(255,255,255,.55)" stroke-width=".6"/><circle cx="23" cy="7" r="5.4" fill="url(#fobG)" stroke="#fff" stroke-width=".7"/><path d="M37 19.6l-2.8 3.4 2.8 3.4M41 19.6l2.8 3.4-2.8 3.4" fill="none" stroke="#fff" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M23 30v3" stroke="#fff" stroke-width=".7"/><path d="M23 33l3.2 3-3.2 8-3.2-8z" fill="#fff"/><rect x="1.5" y="18.5" width="11" height="9" rx="1.2" fill="#17171c" stroke="#fff" stroke-width=".8"/><path d="M1.5 21h11M1.5 25h11" stroke="rgba(255,255,255,.5)" stroke-width=".4"/><path d="'+STAR4(23,23,3.6,.8)+'" fill="#fff"/></svg>',
    price:'<svg viewBox="0 0 36 48"><path d="M18 7C15 3 17-1 21 1" fill="none" stroke="rgba(255,255,255,.75)" stroke-width=".8"/><path d="M6 16L18 5L30 16V44Q30 47 27 47H9Q6 47 6 44Z" fill="#f4f4f6"/><circle cx="18" cy="13" r="2.3" fill="#17171c"/><path d="'+STAR4(18,26,5.4,1.2)+'" fill="#000"/><path d="M11 36h14M13 40h10" stroke="#000" stroke-width=".9"/></svg>',
    letter:'<svg viewBox="0 0 46 32"><rect x="1" y="1" width="44" height="30" rx="2.5" fill="#f4f4f6"/><path d="M1.5 2L23 18 44.5 2" fill="none" stroke="rgba(0,0,0,.28)" stroke-width=".9"/><path d="M1.5 30L18 15M44.5 30L28 15" fill="none" stroke="rgba(0,0,0,.12)" stroke-width=".8"/><circle cx="23" cy="18" r="5.4" fill="#111"/><path d="'+STAR4(23,18,3.2,.8)+'" fill="rgba(255,255,255,.75)"/></svg>'
  };
  var FOB=[{id:'bench',t:'今日字卡',x:4,y:14,w:28,h:43,d:.9,v:10},{id:'craft',t:'四件星物',x:97,y:22,w:58,h:58,d:1.3,v:-8},{id:'price',t:'价目星牌',x:93,y:86,w:34,h:46,d:.7,v:9},{id:'letter',t:'一封来信',x:6,y:83,w:46,h:32,d:1.1,v:-11}];
  var nav=$('#fobs');
  nav.innerHTML=FOB.map(function(o,i){return '<div class="fob" style="--x:'+o.x+'%;--y:'+o.y+'%"><button type="button" class="fob-btn" aria-label="去「'+o.t+'」"><span class="fob-in" style="width:'+o.w+'px;height:'+o.h+'px">'+SV[o.id]+'</span></button><span class="fob-lab">'+o.t+'</span></div>'}).join('');
  $$('.fob',nav).forEach(function(el,i){var o=FOB[i];o.el=el;o.inn=el.querySelector('.fob-in');o.btn=el.querySelector('.fob-btn');o.ph=i*1.7;o.rz=(i*47)%360;o.sa=0;o.sv=0;o.dr=null;o.moved=0;
    o.btn.addEventListener('pointerdown',function(e){o.dr={x:e.clientX,t:performance.now()};o.moved=0});
    o.btn.addEventListener('pointermove',function(e){if(!o.dr)return;var n=performance.now(),dx=e.clientX-o.dr.x,dt=Math.max(8,n-o.dr.t)/1000;o.moved+=Math.abs(dx);o.sa+=dx*1.8;o.sv=lerp(o.sv,dx*1.8/dt,.5);o.dr.x=e.clientX;o.dr.t=n});
    function up(){o.dr=null}
    o.btn.addEventListener('pointerup',up);o.btn.addEventListener('pointercancel',up);o.btn.addEventListener('pointerleave',up);
    o.btn.addEventListener('pointerenter',function(e){if(e.pointerType==='mouse'&&!simple)o.sv+=480});
    o.btn.addEventListener('click',function(){if(o.moved>10){o.moved=0;return}buzz(8);o.sv+=900;setTimeout(function(){go(o.id)},simple?0:260)});
  });
  var mw=$('#moonWrap'),ct=$('#covTitle'),vis=true;
  new IntersectionObserver(function(es){vis=es[0].isIntersecting}).observe($('#cover'));
  $('#cover').addEventListener('pointerdown',function(){if(Tilt.state==='ask')Tilt.ask()},{once:true});
  Loop.add(function(now,dt){if(!vis)return;var t=now*.001,sy=window.scrollY;
    if(MN&&!simple){mOff+=dt*MN.tw/150;var io=Math.floor(mOff);if(io!==mLast){mLast=io;drawMoon(io)}}
    FOB.forEach(function(o){
      if(!o.dr){o.sv*=Math.exp(-dt*1.5);o.sa+=o.sv*dt;if(Math.abs(o.sv)<40){var tg=Math.round(o.sa/360)*360;o.sa+=(tg-o.sa)*Math.min(1,dt*2.5)}}
      if(!simple)o.rz+=o.v*dt;
      var bob=simple?0:Math.sin(t*.9+o.ph)*6,tx=Tilt.x*o.d*16,ty=Tilt.y*o.d*12-sy*.1*o.d+bob;
      o.el.style.transform='translate3d('+tx.toFixed(1)+'px,'+ty.toFixed(1)+'px,0)';
      var ry=(simple?0:Math.sin(t*.7+o.ph)*26)+o.sa,rx=simple?0:Math.cos(t*.55+o.ph)*14;
      o.inn.style.transform='rotateX('+rx.toFixed(1)+'deg) rotateY('+ry.toFixed(1)+'deg) rotateZ('+o.rz.toFixed(1)+'deg)';
    });
    if(simple){mw.style.translate='';ct.style.translate='';return}
    mw.style.translate=(-Tilt.x*12).toFixed(1)+'px '+(sy*.24-Tilt.y*9).toFixed(1)+'px';
    ct.style.translate=(Tilt.x*7).toFixed(1)+'px '+(sy*.07+Tilt.y*5).toFixed(1)+'px';
  });
  if(!simple){
    $$('#mast .k').forEach(function(k,i){k.animate([{transform:'translateY(105%) rotate(7deg)',opacity:0,filter:'blur(12px)'},{transform:'none',opacity:1,filter:'blur(0)'}],{duration:1400,delay:150+i*70,easing:'cubic-bezier(.22,.8,.18,1)',fill:'backwards'})});
    $('#moonCv').animate([{opacity:0,transform:'scale(.86)',filter:'blur(10px)'},{opacity:1,transform:'none',filter:'blur(0)'}],{duration:2000,easing:'cubic-bezier(.22,.8,.18,1)',fill:'backwards'});
    $('#moonRing').animate([{opacity:0,transform:'rotate(-40deg) scale(.94)'},{opacity:1,transform:'none'}],{duration:2200,delay:300,easing:'cubic-bezier(.22,.8,.18,1)',fill:'backwards'});
    FOB.forEach(function(o,i){o.btn.animate([{opacity:0,transform:'scale(.2)'},{opacity:1,transform:'none'}],{duration:1100,delay:900+i*140,easing:'cubic-bezier(.22,.8,.18,1)',fill:'backwards'})});
    $$('.cov-meta,.cov-sub,.cov-intro,.cov-hint,.cov-foot').forEach(function(n,i){n.animate([{opacity:0,transform:'translateY(16px)'},{opacity:1,transform:'none'}],{duration:1200,delay:600+i*120,easing:'cubic-bezier(.22,.8,.18,1)',fill:'backwards'})});
  }
  return {};
})();
