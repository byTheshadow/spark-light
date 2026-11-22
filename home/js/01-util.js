/* home/js/01-util.js —— 由原型拆分而来。经典脚本，按文件名顺序加载，共享同一页面作用域。 */
'use strict';
/* ============ 工具 ============ */
var root=document.documentElement;

function $(s,r){return (r||document).querySelector(s)}

function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}

function clamp(v,a,b){return v<a?a:v>b?b:v}

function rand(a,b){return a+Math.random()*(b-a)}

function lerp(a,b,t){return a+(b-a)*t}

function easeOut(t){return 1-Math.pow(1-t,3)}

function pad(n){return String(n).padStart(2,'0')}

function store(k,v){try{if(v===undefined)return localStorage.getItem(k);if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch(e){return null}}

function lcg(s){s=Math.abs(Math.floor(s))%2147483646+1;return function(){s=(s*16807)%2147483647;return (s-1)/2147483646}}

var FINE=!!(window.matchMedia&&matchMedia('(hover:hover) and (pointer:fine)').matches);

var simple=false;

function applyMotion(){var m=store('sl.motion'),rm=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);simple=m==='simple'?true:m==='full'?false:rm;root.setAttribute('data-motion',simple?'simple':'full');var o=$('#motionOpt');if(o)o.setAttribute('aria-checked',String(simple))}

applyMotion();

function wait(ms){return new Promise(function(r){setTimeout(r,simple?Math.min(ms,20):ms)})}

function buzz(p){if(!simple&&navigator.vibrate){try{navigator.vibrate(p)}catch(e){}}}

var toastT=0;
function toast(m){var t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(function(){t.classList.remove('on')},2600)}

function center(el){var r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}}

function flipT(a,b){return 'translate('+(a.left+a.width/2-b.left-b.width/2).toFixed(1)+'px,'+(a.top+a.height/2-b.top-b.height/2).toFixed(1)+'px) scale('+(a.width/b.width).toFixed(4)+','+(a.height/b.height).toFixed(4)+')'}

function typeInto(node,text,speed){var tk=(node._tk||0)+1;node._tk=tk;node.textContent='';node.classList.add('caret');var arr=Array.from(text),i=0;
  return new Promise(function(res){if(simple){node.textContent=text;node.classList.remove('caret');res();return}
    (function step(){if(node._tk!==tk){res();return}if(i<arr.length){node.textContent+=arr[i++];setTimeout(step,speed||70)}else{setTimeout(function(){if(node._tk===tk)node.classList.remove('caret')},700);res()}})()})}

function makeSprite(size,stops){var c=document.createElement('canvas');c.width=c.height=size;var g=c.getContext('2d'),h=size/2,r=g.createRadialGradient(h,h,0,h,h,h);stops.forEach(function(s){r.addColorStop(s[0],s[1])});g.fillStyle=r;g.fillRect(0,0,size,size);return c}

function go(id){var el=document.getElementById(id);if(el)el.scrollIntoView({behavior:simple?'auto':'smooth',block:'start'})}

function copy(text){
  function fb(){var t=document.createElement('textarea');t.value=text;t.setAttribute('readonly','');t.style.cssText='position:fixed;top:0;left:0;opacity:0';document.body.appendChild(t);t.select();try{document.execCommand('copy')}catch(e){}t.remove()}
  if(navigator.clipboard&&window.isSecureContext)return navigator.clipboard.writeText(text).catch(fb);
  fb();return Promise.resolve();
}

var STAR4=function(cx,cy,r,w){w=w||r*.22;return 'M'+cx+' '+(cy-r)+'L'+(cx+w)+' '+(cy-w)+'L'+(cx+r)+' '+cy+'L'+(cx+w)+' '+(cy+w)+'L'+cx+' '+(cy+r)+'L'+(cx-w)+' '+(cy+w)+'L'+(cx-r)+' '+cy+'L'+(cx-w)+' '+(cy-w)+'Z'};

var STARP=function(cx,cy,r){var s='';for(var i=0;i<10;i++){var a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.42:r;s+=(i?'L':'M')+(cx+Math.cos(a)*rr).toFixed(2)+' '+(cy+Math.sin(a)*rr).toFixed(2)}return s+'Z'};

var NOW=new Date(),ISSUE=NOW.getFullYear()+pad(NOW.getMonth()+1)+pad(NOW.getDate());

var DKEY=NOW.getFullYear()+'-'+(NOW.getMonth()+1)+'-'+NOW.getDate();

var DSTR=NOW.getFullYear()+'.'+pad(NOW.getMonth()+1)+'.'+pad(NOW.getDate());

var ARROW='<svg class="arrow" viewBox="0 0 18 10" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true"><path d="M0 5h17M13 1l4 4-4 4"/></svg>';


var CARD_BACK='<svg viewBox="0 0 60 96" fill="none" stroke="currentColor" stroke-width=".6" stroke-linecap="round" preserveAspectRatio="none" aria-hidden="true">'+
  '<rect x="4.5" y="4.5" width="51" height="87" rx="2.5" stroke-width=".4"/>'+
  '<circle cx="30" cy="48" r="16"/><circle cx="30" cy="48" r="12" stroke-dasharray="1 2"/>'+
  '<path d="'+STAR4(30,48,13,2.2)+'"/><path d="'+STAR4(30,48,7.5,1.4)+'" transform="rotate(45 30 48)" stroke-width=".45"/>'+
  '<circle cx="30" cy="48" r="1.3" fill="currentColor"/>'+
  '<path d="M14 18a5 5 0 1 0 5-5 3.8 3.8 0 1 1-5 5z" stroke-width=".45"/><path d="M46 78a5 5 0 1 1-5 5 3.8 3.8 0 1 0 5-5z" stroke-width=".45"/>'+
  '<path d="'+STAR4(46,16,2.6)+'" fill="currentColor" stroke="none"/><path d="'+STAR4(14,80,2.6)+'" fill="currentColor" stroke="none"/>'+
  '<path d="M30 24v7M30 65v7M11 48h5M44 48h5" stroke-width=".45"/></svg>';

var GLYPH={
  rings:'<circle cx="38" cy="50" r="24"/><circle cx="62" cy="50" r="24"/><path d="'+STAR4(50,50,6)+'"/>',
  spark:'<path d="M50 10c2 22 18 38 40 40-22 2-38 18-40 40-2-22-18-38-40-40 22-2 38-18 40-40z"/>',
  arc:'<path d="M16 62a34 34 0 0 1 68 0z"/><path d="M26 74h48M36 84h28"/><path d="'+STAR4(50,30,5)+'"/>',
  tri:'<path d="M50 14L88 80H12z"/><circle cx="50" cy="58" r="7"/><path d="M50 30v14"/>',
  lines:'<path d="M16 32h68M16 50h68M16 68h68"/><circle cx="64" cy="32" r="5"/><circle cx="34" cy="50" r="5"/><circle cx="56" cy="68" r="5"/>',
  moon:'<path d="M60 14a36 36 0 1 0 26 52A30 30 0 1 1 60 14z"/><path d="'+STAR4(74,30,6)+'"/>',
  eye:'<path d="M10 50c20-26 60-26 80 0-20 26-60 26-80 0z"/><circle cx="50" cy="50" r="12"/><circle cx="50" cy="50" r="4"/><path d="M50 14v8M50 78v8"/>'
};

var Moon={
  info:function(d){var syn=29.530588853,ref=Date.UTC(2000,0,6,18,14),age=((d.getTime()-ref)/864e5)%syn;if(age<0)age+=syn;var p=age/syn,names=['新月','蛾眉月','上弦月','盈凸月','满月','亏凸月','下弦月','残月'];
    return {p:p,age:age,illum:(1-Math.cos(2*Math.PI*p))/2,name:names[Math.floor(p*8+.5)%8]}},
  path:function(p,r){var rx=Math.abs(Math.cos(2*Math.PI*p))*r,wax=p<.5,outer=wax?1:0,inner=wax?(p<.25?0:1):(p<.75?0:1);
    return 'M0 '+(-r)+'A'+r+' '+r+' 0 0 '+outer+' 0 '+r+'A'+rx.toFixed(2)+' '+r+' 0 0 '+inner+' 0 '+(-r)+'Z'}
};

var MOON=Moon.info(NOW);
