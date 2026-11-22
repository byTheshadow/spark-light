/* home/js/10-parallax.js —— 由原型拆分而来。经典脚本，按文件名顺序加载，共享同一页面作用域。 */
'use strict';
/* ============ 视差：指针或陀螺仪 + 滚动，分层位移；工作台随之倾斜 ============ */
(function(){
  var L=$$('[data-depth]').map(function(el){return {el:el,d:parseFloat(el.dataset.depth)||0}}),desk=$('#desk'),was=false;
  Loop.add(function(){
    if(simple){if(!was){L.forEach(function(o){o.el.style.translate=''});desk.style.transform='';was=true}return}was=false;
    var H=innerHeight;
    for(var i=0;i<L.length;i++){var o=L[i],r=o.el.parentNode.getBoundingClientRect();if(r.bottom<-120||r.top>H+120)continue;
      var off=r.top+r.height/2-H/2,x=Tilt.x*o.d*14,y=Tilt.y*o.d*10-off*o.d*.05;o.el.style.translate=x.toFixed(1)+'px '+y.toFixed(1)+'px'}
    var dr=desk.getBoundingClientRect();
    if(dr.bottom>0&&dr.top<H){var dy=(dr.top+dr.height/2-H/2)/H;desk.style.transform='rotateX('+(dy*9-Tilt.y*3.5).toFixed(2)+'deg) rotateY('+(Tilt.x*5).toFixed(2)+'deg)'}
  });
})();
