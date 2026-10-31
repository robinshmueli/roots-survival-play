import {makeCanvas,polygon,rect} from './art.js';

export function attackWarningArt(urgent=false) {
  const [canvas,ctx]=makeCanvas(16,20);
  polygon(ctx,[[4,1],[11,1],[15,5],[15,15],[11,19],[4,19],[0,15],[0,5]],'#49372d','#201f1b');
  polygon(ctx,[[4,3],[11,3],[13,5],[13,15],[10,17],[5,17],[2,14],[2,6]],urgent?'#e77956':'#f0bc61');
  rect(ctx,5,3,6,10,'#493026');rect(ctx,6,4,4,8,'#fff2c7');
  rect(ctx,5,13,6,5,'#493026');rect(ctx,6,14,4,3,'#fff2c7');return canvas;
}

export function attackAreaArt(stage=0) {
  const [canvas,ctx]=makeCanvas(64),color=['#e3bc6655','#edb05966','#ed975877','#ed765c88'][stage],edge=['#f3d38f','#ffd18c','#ffc18a','#ffad90'][stage];
  // Match the bite's actual forward arc (dot >= .2), with a crisp pixel edge.
  for(let y=0;y<64;y++)for(let x=0;x<64;x++) {
    const nx=(x+.5-32)/32,ny=(32-y-.5)/32,r=Math.hypot(nx,ny),dot=r?nx/r:1;
    if(r>1||dot<.2)continue;
    const border=r>.92||dot<.28;
    rect(ctx,x,y,1,1,border?edge:color);
  }
  polygon(ctx,[[41,29],[49,29],[49,24],[59,32],[49,40],[49,35],[41,35]],edge,'#513c2d');return canvas;
}
