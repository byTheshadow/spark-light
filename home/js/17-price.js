/* home/js/17-price.js —— 由原型拆分而来。经典脚本，按文件名顺序加载，共享同一页面作用域。 */
'use strict';
/* ============ 价目星牌 ============ */
function bookMsg(lines){var L=['你好 Shadow，我想预约 Spark Light：'];if(lines&&lines.length)L=L.concat(lines);else L.push('项目：（写下想约的项目）');L.push('时间：（写下期望的时间）','想法：（简单说说你的想法）','（我已读过营业须知）');return L.join('\n')}

var Price=(function(){
  var cats=$('#pcCats'),row=$('#pcRow'),rules=$('#pcRules'),bag=new Map(),cur=-1;
  var SVC={div:'占卜',code:'网站定制',tune:'灵摆调频',ai:'AI 映画'};
  var ICON={
    div:'<svg viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="1.1"><rect x="7.5" y="4" width="11" height="18" rx="1.6"/><path d="'+STAR4(13,13,4,1)+'" fill="currentColor" stroke="none"/></svg>',
    code:'<svg viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><path d="M9 8l-5 5 5 5M17 8l5 5-5 5M15 6l-4 14"/></svg>',
    tune:'<svg viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="1.1"><path d="M13 3v11" stroke-dasharray="1.5 1.5"/><path d="M13 14l3.4 3.2L13 23l-3.4-5.8z" fill="currentColor" fill-opacity=".25"/></svg>',
    ai:'<svg viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="1.1"><rect x="3" y="6" width="20" height="14" rx="1.5"/><path d="M3 9.5h20M3 16.5h20M7 6v3.5M11 6v3.5M15 6v3.5M19 6v3.5M7 16.5V20M11 16.5V20M15 16.5V20M19 16.5V20"/></svg>'
  };
  function MC(cls,st,front,back){return '<span class="mc'+(cls?' '+cls:'')+'"'+(st?' style="'+st+'"':'')+'><span class="b">'+(back||'')+'</span>'+(front!=null?'<span class="f">'+front+'</span>':'')+'</span>'}
  var GSTAR='<svg viewBox="0 0 20 20"><path d="'+STAR4(10,10,7.5,1.7)+'" fill="#000"/><circle cx="10" cy="10" r="8.6" fill="none" stroke="#000" stroke-width=".5" stroke-dasharray="1 1.4"/></svg>';
  var GSPARK='<svg viewBox="0 0 100 100" fill="none" stroke="#000" stroke-width="6">'+GLYPH.spark+'</svg>';
  var MOONG='<svg viewBox="0 0 20 20"><path d="M12.5 3a7.5 7.5 0 1 0 5 12.5A6 6 0 1 1 12.5 3z" fill="#fff"/></svg>',SUNG='<svg viewBox="0 0 20 20" fill="none" stroke="#000" stroke-width="1.2"><circle cx="10" cy="10" r="4"/><path d="M10 1.5v3M10 15.5v3M1.5 10h3M15.5 10h3M4 4l2 2M14 14l2 2M4 16l2-2M14 6l2-2"/></svg>';
  var HEART='<svg viewBox="0 0 40 40"><path d="M20 33C8 25 5 18 5 13a7.5 7.5 0 0 1 15-2 7.5 7.5 0 0 1 15 2c0 5-3 12-15 20z" fill="rgba(207,200,255,.35)" stroke="#000" stroke-width="1.6"/><path d="'+STAR4(29,8,3.4,.8)+'" fill="#000"/></svg>';
  var HG='<svg viewBox="0 0 40 60"><path d="M9 6c0 14 10 18 10 24S9 40 9 54h22c0-14-10-18-10-24s10-10 10-24z" fill="rgba(255,255,255,.75)" stroke="#000" stroke-width="1.2"/><path class="s1" d="M12.5 10h15c-1 8-5.5 12-7.5 14-2-2-6.5-6-7.5-14z" fill="#000"/><path class="s2" d="M11.5 52c1-6 5.5-9 8.5-10 3 1 7.5 4 8.5 10z" fill="#000"/><path d="M5 4h30M5 56h30" stroke="#000" stroke-width="2.6" stroke-linecap="round"/></svg>';
  var FX={
    shuffle:function(){var h='';for(var k=0;k<6;k++)h+=MC('','--k:'+k+';--s:'+(k%2?1:-1)+';z-index:'+k);return '<span class="fx fx-shuffle">'+h+'</span>'},
    spread:function(){return '<span class="fx fx-spread"><span class="cloth"></span>'+MC('','--p:-1;z-index:1')+MC('','--p:1;z-index:2')+MC('mid','--p:0;z-index:3',GSTAR)+'</span>'},
    cycle:function(){var g='';for(var k=1;k<=3;k++)g+='<span class="mc w gh" style="--k:'+k+'"><span class="b"></span></span>';return '<span class="fx fx-cycle"><span class="ring"><i></i></span>'+g+'<span class="mc flip"><span class="b">'+MOONG+'<em>前世</em></span><span class="f">'+SUNG+'<em>今生</em></span></span></span>'},
    dream:function(){var h='';for(var k=0;k<6;k++)h+='<i style="--k:'+k+';--x:'+(26+k*9)+'%;--dx:'+((k%2?1:-1)*(4+k*2))+'px"></i>';return '<span class="fx fx-dream">'+MC('w heart','',null,HEART)+h+'</span>'},
    pocket:function(){return '<span class="fx fx-pocket">'+MC('rise','',GSPARK)+'<span class="pocket"></span></span>'},
    build:function(){var B=[[6,20,88,14],[6,40,52,40],[62,40,32,18],[62,62,32,18],[6,85,40,6]],h='';B.forEach(function(b,k){h+='<span class="blk'+(k===1?' t':'')+'" style="left:'+b[0]+'%;top:'+b[1]+'%;width:'+b[2]+'%;height:'+b[3]+'%;--k:'+k+'"></span>'});return '<span class="fx fx-build"><span class="win"><span class="bar"></span>'+h+'</span></span>'},
    rush:function(){var h='';for(var k=0;k<5;k++)h+='<span class="ln" style="--k:'+k+';--y:'+(22+k*14)+'%"></span>';return '<span class="fx fx-rush">'+h+'<span class="hg">'+HG+'</span></span>'},
    pend:function(){return '<span class="fx fx-pend"><span class="disc"></span><span class="pv"><i class="str"></i><i class="bob"></i></span></span>'},
    film:function(){var h='';for(var k=0;k<10;k++)h+='<b class="f'+(k%5)+'"></b>';return '<span class="fx fx-film"><span class="strip">'+h+'</span></span>'}
  };
  cats.innerHTML=DATA.pricing.map(function(d,i){return '<button type="button" class="pcat" role="tab" aria-selected="false" data-i="'+i+'">'+ICON[d.id]+'<span>'+d.title+'</span></button>'}).join('');
  $$('.pcat',cats).forEach(function(b){b.addEventListener('click',function(){render(+b.dataset.i)})});
  var playIO=new IntersectionObserver(function(es){es.forEach(function(e){e.target.classList.toggle('play',e.isIntersecting)})},{threshold:.3});
  function render(i){if(i===cur)return;if(cur>=0)buzz(5);cur=i;
    $$('.pcat',cats).forEach(function(b,k){b.setAttribute('aria-selected',String(k===i))});
    var d=DATA.pricing[i],h='';row.style.setProperty('--tint',d.tint);
    if(d.pending)h='<div class="pc pc-pend" style="--i:0"><span class="pc-art" aria-hidden="true">'+FX[d.fx]()+'</span><span class="pc-name">价目整理中<small>'+(d.sub?d.sub+'。':'')+'这一类还在定价，星星还没连上线。</small></span><span class="pc-price"><button type="button" class="lnk" id="askPrice">写信来问'+ARROW+'</button></span></div>';
    else d.items.forEach(function(it,k){var key=d.id+':'+k,isAi=d.id==='ai';h+='<button type="button" class="pc'+(isAi?' pc-ai-masked':'')+'" style="--i:'+k+'" data-k="'+key+'" aria-pressed="'+bag.has(key)+'"><span class="pc-art" aria-hidden="true">'+FX[it.fx]()+'</span>'+(isAi?'<span class="pc-ai-veil"><span>AI 内容 · 轻触显示</span></span>':'')+'<span class="pc-star" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="'+STARP(12,12.5,10)+'"/></svg></span><span class="pc-name">'+it.n+(it.note?'<small>'+it.note+'</small>':'')+'</span><span class="pc-price"><b data-v="'+it.p+'">0</b><i>r'+(it.u?' '+it.u:'')+'</i></span></button>'});
    playIO.disconnect();row.classList.remove('in');row.innerHTML=h;row.scrollLeft=0;void row.offsetWidth;row.classList.add('in');
    rules.innerHTML=(d.sub&&!d.pending?'<p class="pc-rules-lead">'+d.sub+'</p>':'')+(d.rules?d.rules.map(function(r){return '<p>'+r+'</p>'}).join(''):'');
    if(d.id==='ai'&&window.SLAiMosaic)window.SLAiMosaic(rules);
    if(window.SLHighlight)window.SLHighlight(rules);
    $$('.pc',row).forEach(function(c){playIO.observe(c)});
    $$('[data-v]',row).forEach(function(n,k){var v=+n.dataset.v,t0=performance.now()+k*80;if(simple){n.textContent=v;return}(function st(now){var q=clamp((now-t0)/800,0,1);n.textContent=Math.round(v*easeOut(q));if(q<1)requestAnimationFrame(st)})(t0)});
    $$('button.pc',row).forEach(function(b){b.addEventListener('click',function(){if(b.classList.contains('pc-ai-masked')){b.classList.remove('pc-ai-masked');buzz(6);return}openDetail(b,d)})});
    var ap=$('#askPrice');if(ap)ap.addEventListener('click',function(){Contact.open(bookMsg(['项目：'+SVC[d.id],'想先了解「'+d.title+'」的价目']))});
  }
  function toggle(b,d){var key=b.dataset.k,it=d.items[+key.split(':')[1]];
    if(bag.has(key)){bag.delete(key);b.setAttribute('aria-pressed','false')}else{bag.set(key,{n:it.n+(it.note&&it.u!=='起'?'（'+it.note+'）':''),p:it.p,u:it.u,s:SVC[d.id]});b.setAttribute('aria-pressed','true');buzz(10)}
    var n=bag.size,sum=0,qi=false;bag.forEach(function(v){sum+=v.p;if(v.u==='起')qi=true});var pb=$('#pbag');pb.classList.toggle('on',n>0);
    $('#pbCount').textContent='已点亮 '+n+' 项，约';$('#pbTotal').textContent=sum+'r'+(qi?' 起':'');pb.classList.remove('bump');void pb.offsetWidth;pb.classList.add('bump')}
  // 详情
  var pdm=$('#pdm'),pdArt=$('#pdmArt'),pdCur=null,pdBack=null;
  function syncAdd(){var on=bag.has(pdCur.k);$('#pdAdd span').textContent=on?'已点亮，移出清单':'点亮，加入清单';$('#pdAdd').classList.toggle('ghost',on)}
  function openDetail(b,d){var k=b.dataset.k,it=d.items[+k.split(':')[1]];pdCur={b:b,d:d,k:k};pdBack=b;buzz(8);
    pdArt.style.setProperty('--tint',d.tint);pdArt.innerHTML=FX[it.fx]();
    $('#pdCat').textContent=d.title+'，'+d.en;$('#pdT').textContent=it.n;$('#pdS').textContent=it.note||'';$('#pdP').textContent=it.p;$('#pdU').textContent='r'+(it.u?' '+it.u:'');
    $('#pdD').textContent=it.d||'';
    if(d.id==='ai'&&window.SLAiMosaic)window.SLAiMosaic($('#pdD'));
    if(window.SLHighlight)window.SLHighlight($('#pdD'));
    var fl=d.flow||[];$('#pdF').innerHTML=fl.map(function(x,i){return '<li><span class="lab">'+(i+1)+'</span>'+x+'</li>'}).join('');$('#pdFw').hidden=!fl.length;
    var nt=(d.notes||[]).concat(d.rules||[]);$('#pdN').innerHTML=nt.map(function(x){return '<p>'+x+'</p>'}).join('');
    if(d.id==='ai'&&window.SLAiMosaic)window.SLAiMosaic($('#pdN'));
    if(window.SLHighlight)window.SLHighlight($('#pdN'));
    syncAdd();pdm.classList.add('on');if(window.SLSpark)SLSpark.burst();
    if(!simple){var a=b.querySelector('.pc-art').getBoundingClientRect(),c=pdArt.getBoundingClientRect();pdArt.animate([{transform:flipT(a,c),borderRadius:'10px'},{transform:'none'}],{duration:700,easing:'cubic-bezier(.22,.8,.18,1)'})}
    setTimeout(function(){$('#pdmX').focus({preventScroll:true})},80)}
  function closeDetail(){if(!pdm.classList.contains('on'))return;pdm.classList.remove('on');if(pdBack)pdBack.focus({preventScroll:true})}
  $('#pdAdd').addEventListener('click',function(){toggle(pdCur.b,pdCur.d);syncAdd()});
  $('#pdRead').addEventListener('click',function(){closeDetail();Letter.open()});
  $('#pdmX').addEventListener('click',closeDetail);$('#pdmBg').addEventListener('click',closeDetail);
  function lines(){if(!bag.size)return [];var svcs=new Set(),list=[],sum=0,qi=false;bag.forEach(function(v){svcs.add(v.s);list.push(v.n+' '+v.p+'r'+(v.u?' '+v.u:''));sum+=v.p;if(v.u==='起')qi=true});
    return ['项目：'+Array.from(svcs).join('、'),'价目清单：'+list.join('；'),'合计约 '+sum+'r'+(qi?' 起':'')]}
  $('#pbGo').addEventListener('click',function(){Contact.open(bookMsg(lines()))});
  render(0);
  return {setCat:function(i){render(i)},lines:lines,closeDetail:closeDetail,isDetail:function(){return pdm.classList.contains('on')}};
})();
