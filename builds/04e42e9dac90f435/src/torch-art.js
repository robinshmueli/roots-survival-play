import {makeCanvas,polygon,rect,texture} from './art.js';

export function flameCanvas(frame=0) {
  const [canvas,ctx]=makeCanvas(16),f=frame%4;
  polygon(ctx,[[5,14],[2,10],[4,5+f],[6,7],[8,1],[11,7],[14,4+f],[13,11],[10,15]],'#c95728','#713628');
  polygon(ctx,[[5,12],[4,9],[7,5],[8,8],[10,3+f],[12,10],[9,14]],'#f5a449');
  polygon(ctx,[[7,13],[6,10],[8,7+f],[10,11],[9,14]],'#fff0aa');return canvas;
}
export function torchCanvas(frame=0,mounted=false,rotation=0) {
  const [canvas,ctx]=makeCanvas(24,48);
  if(mounted) {
    rect(ctx,rotation%2?6:8,32,9,9,'#3b382d');rect(ctx,rotation%2?7:9,33,7,7,'#77745b');
    rect(ctx,9,34,2,2,'#d0bd87');rect(ctx,14,38,2,2,'#c5b17a');
  }
  const head=mounted?27:17;
  polygon(ctx,[[10,40],[13,40],[16,head+1],[12,head]],'#9e713d','#3d392b');
  rect(ctx,12,head+7,1,mounted?4:13,'#d1aa6b');
  polygon(ctx,[[10,head+4],[10,head-2],[16,head-3],[18,head+2],[15,head+7]],'#4c4933','#34362b');
  for(const y of [head,head+3,head+6])rect(ctx,10,y,7,1,'#a68a54');
  ctx.drawImage(flameCanvas(frame),6,mounted?13:1,16,mounted?16:20);return canvas;
}
let flames;
export function flameTextures(){return flames??=Array.from({length:4},(_,i)=>texture(flameCanvas(i)));}
