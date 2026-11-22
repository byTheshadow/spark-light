/* home/js/14-craft-code.js —— 由原型拆分而来。经典脚本，按文件名顺序加载，共享同一页面作用域。 */
'use strict';
/* ============ 网站定制：代码 ============ */
(function(){
  var sg=$('#sigil'),pre=$('#code'),site=$('#site'),token=0,phase=0;
  [[0,0,100,11],[0,17,58,36],[63,17,37,36],[0,59,31,26],[34.5,59,31,26],[69,59,31,26]].forEach(function(b,i){var n=document.createElement('i');n.style.cssText='left:'+b[0]+'%;top:'+b[1]+'%;width:'+b[2]+'%;height:'+b[3]+'%;--i:'+i;site.appendChild(n)});
  site.insertAdjacentHTML('beforeend','<span class="url">spark-light 已上线，可以分享了</span>');
  var L=[[['k','const '],['','sky = '],['k','new '],['f','Sky'],['','('],['s',"'Spark Light'"],['',')\n']],[['','sky.'],['f','scatter'],['','(stars, { diffuse: '],['k','true'],['',' })\n']],
    [['','sky.'],['f','on'],['','('],['s',"'tap'"],['',', wish '],['k','=>'],['',' '],['f','grant'],['','(wish))\n']],[['c','// 按你的想法，一行一行长出来\n']],[['f','deploy'],['','(sky)']]];
  async function run(){var my=++token;phase=1;sg.classList.remove('built');sg.classList.add('run');pre.innerHTML='';buzz(10);await wait(560);
    for(var a=0;a<L.length;a++)for(var b=0;b<L[a].length;b++){var sp=document.createElement('span');if(L[a][b][0])sp.className=L[a][b][0];pre.appendChild(sp);var tx=L[a][b][1];
      for(var k=0;k<tx.length;k++){if(my!==token)return;sp.textContent+=tx[k];if(!simple)await wait(tx[k]===' '?6:16)}}
    await wait(450);if(my!==token)return;sg.classList.add('built');phase=2;buzz(18)}
  function reset(){token++;phase=0;sg.classList.remove('run','built');pre.innerHTML=''}
  function act(){if(phase===2)reset();else if(phase===0)run()}
  sg.addEventListener('click',act);sg.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();act()}});
  if(FINE){sg.addEventListener('pointermove',function(e){if(simple)return;var r=sg.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;sg.style.transform='rotateY('+(x*14).toFixed(2)+'deg) rotateX('+(-y*12).toFixed(2)+'deg)'});sg.addEventListener('pointerleave',function(){sg.style.transform=''})}
})();
