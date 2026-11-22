/* home/js/04-bg.js —— 由原型拆分而来。经典脚本，按文件名顺序加载，共享同一页面作用域。 */
'use strict';
/* ============ 弥散背景 ============ */
var BG=(function(){
  var c=$('#bg'),g=c.getContext('2d'),W=2,H=2,S=10,pulses=[],purge=0,pb={x:.5,y:.4};
  var B=[[.15,.2,.5,'0,0,0',.08,.07,0],[.86,.24,.44,'168,156,240',.28,.05,2],[.72,.8,.52,'150,214,206',.24,.06,4],[.2,.84,.46,'232,190,208',.22,.045,1],[.5,.52,.34,'0,0,0',.045,.09,3]];
  function size(){W=Math.max(2,Math.ceil(innerWidth/S));H=Math.max(2,Math.ceil(innerHeight/S));c.width=W;c.height=H}
  size();addEventListener('resize',size);
  function blob(x,y,r,col,a){if(a<=0)return;var gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba('+col+','+a.toFixed(3)+')');gr.addColorStop(.5,'rgba('+col+','+(a*.42).toFixed(3)+')');gr.addColorStop(1,'rgba('+col+',0)');g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2)}
  Loop.add(function(now,dt){
    var t=now*.001,m=Math.max(W,H),sy=window.scrollY/Math.max(1,innerHeight),sp=simple?0:1;
    purge=Math.max(0,purge-dt*.32);var fade=1-Math.min(1,purge);
    g.fillStyle='#f8f8f9';g.fillRect(0,0,W,H);
    for(var i=0;i<B.length;i++){var b=B[i];
      var x=(b[0]+Math.sin(t*b[5]*2*sp+b[6])*.13+Tilt.x*.05*(i%2?1:-1))*W;
      var y=(b[1]+Math.cos(t*b[5]*1.7*sp+b[6])*.1+Math.sin(sy*.9+i*1.3)*.08+Tilt.y*.04)*H;
      blob(x,y,b[2]*m,b[3],b[4]*fade)}
    if(FINE&&PT.has){var k=Math.min(1,dt*2.2);pb.x+=(PT.x/innerWidth-pb.x)*k;pb.y+=(PT.y/innerHeight-pb.y)*k;blob(pb.x*W,pb.y*H,.22*m,'0,0,0',.06*fade);blob(pb.x*W+.05*m,pb.y*H-.03*m,.17*m,'180,168,255',.2*fade)}
    for(var j=pulses.length-1;j>=0;j--){var p=pulses[j];p.t+=dt;var q=p.t/1.5;if(q>=1){pulses.splice(j,1);continue}blob(p.x/S,p.y/S,(.03+easeOut(q)*.3)*m,'0,0,0',.15*(1-q))}
  });
  return {pulse:function(x,y){if(!simple&&pulses.length<8)pulses.push({x:x,y:y,t:0})},purge:function(){purge=1.5}};
})();
