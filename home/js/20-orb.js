/* home/js/20-orb.js —— 由原型拆分而来。经典脚本，按文件名顺序加载，共享同一页面作用域。 */
'use strict';
/* ============ 悬浮球：可拖动，吸附左右边缘 ============ */
Orb=(function(){
  var o=$('#orb'),m=$('#omenu'),sc=$('#oscrim'),S=58,M=14,pos={side:'r',y:.84},open=false,X=0,Y=0,d=null;
  try{var sp=JSON.parse(store('sl.orb')||'null');if(sp&&(sp.side==='l'||sp.side==='r')&&typeof sp.y==='number')pos=sp}catch(e){}
  var IT=[['cover','0','封面','cover'],['bench','1','今日字卡','workbench'],['craft','2','四件星物','crafts'],['price','3','价目星牌','price cards'],['letter','4','一封来信','letter'],['@notice','·','营业须知','notice'],['@more','·','更多与设置','more']];
  m.innerHTML=IT.map(function(it,i){return '<button type="button" class="mi" data-id="'+it[0]+'" style="--i:'+i+'" tabindex="-1"><span class="n">'+it[1]+'</span><span>'+it[2]+'</span><em>'+it[3]+'</em></button>'}).join('');
  function insets(){var cs=getComputedStyle(root);return [parseFloat(cs.paddingTop)||0,parseFloat(cs.paddingBottom)||0]}
  function place(){var ins=insets();X=pos.side==='r'?innerWidth-S-M:M;Y=clamp(pos.y*innerHeight,ins[0]+64,innerHeight-S-M-ins[1]);o.style.transform='translate('+X+'px,'+Y+'px)'}
  place();addEventListener('resize',function(){place();if(open)close()});
  o.addEventListener('pointerdown',function(e){o.setPointerCapture(e.pointerId);d={sx:e.clientX,sy:e.clientY,ox:X,oy:Y,drag:false};o.classList.remove('snap')});
  o.addEventListener('pointermove',function(e){if(!d)return;var dx=e.clientX-d.sx,dy=e.clientY-d.sy;if(!d.drag&&Math.hypot(dx,dy)>6){d.drag=true;o.classList.add('drag');if(open)close()}
    if(d.drag){X=clamp(d.ox+dx,4,innerWidth-S-4);Y=clamp(d.oy+dy,4,innerHeight-S-4);o.style.transform='translate('+X+'px,'+Y+'px)'}});
  function up(){if(!d)return;var was=d.drag;d=null;o.classList.remove('drag');if(was){pos.side=X+S/2<innerWidth/2?'l':'r';pos.y=Y/innerHeight;store('sl.orb',JSON.stringify(pos));o.classList.add('snap');place();buzz(6)}else toggle()}
  o.addEventListener('pointerup',up);o.addEventListener('pointercancel',function(){if(d)d.drag=true;up()});
  o.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}});
  function toggle(){open?close():openM()}
  function openM(){open=true;o.classList.add('open');o.setAttribute('aria-expanded','true');var mw=Math.min(256,innerWidth-2*M),mh=m.offsetHeight||380,left=pos.side==='r'?innerWidth-mw-M:M,below=Y+S/2<innerHeight/2,top=below?Y+S+10:Y-mh-10;
    top=clamp(top,10,innerHeight-mh-10);m.style.width=mw+'px';m.style.left=left+'px';m.style.top=top+'px';m.style.setProperty('--ox',pos.side==='r'?'100%':'0%');m.style.setProperty('--oy',below?'0%':'100%');m.style.setProperty('--dy',below?'-10px':'10px');
    m.classList.add('on');sc.classList.add('on');$$('.mi',m).forEach(function(b){b.tabIndex=0});buzz(8)}
  function close(){open=false;o.classList.remove('open');o.setAttribute('aria-expanded','false');m.classList.remove('on');sc.classList.remove('on');$$('.mi',m).forEach(function(b){b.tabIndex=-1})}
  sc.addEventListener('click',close);
  $$('.mi',m).forEach(function(b){b.addEventListener('click',function(){close();var id=b.dataset.id;if(id==='@notice')Letter.open();else if(id==='@more')Sheets.open('more');else go(id)})});
  return {close:close,isOpen:function(){return open},mark:function(id){$$('.mi',m).forEach(function(b){b.classList.toggle('cur',b.dataset.id===id)})}};
})();

Orb.mark('cover');
