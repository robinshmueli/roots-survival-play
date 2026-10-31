import {makeCanvas,polygon,ellipse,rect} from './art.js';

export function furnaceArt(frame=0,rotation=0) {
  const [canvas,ctx]=makeCanvas(64),ink='#3c4139',hot=frame>0;
  ellipse(ctx,32,54,26,6,'#23372935');
  polygon(ctx,[[9,35],[13,21],[22,12],[43,12],[53,23],[56,49],[49,57],[14,57],[7,49]],'#657069',ink);
  polygon(ctx,[[13,34],[17,22],[25,15],[41,15],[49,24],[51,34]],'#9ca394',ink);
  for(const [row,y] of [23,33,43,53].entries())for(let i=0;i<5;i++) {
    const x=10+i*9+(row%2?4:0);if(x>49)continue;
    const shade=['#8b9587','#a4aa98','#768273'][(i+row+rotation)%3];
    polygon(ctx,[[x,y-6],[x+7,y-7],[x+9,y-2],[x+7,y],[x,y]],shade,'#4d5c4e');rect(ctx,x+1,y-5,4,1,'#bac0aa');
  }
  ellipse(ctx,32,14,11,4,'#a0a58f');rect(ctx,29,6,8,8,'#69776a');rect(ctx,30,5,7,3,'#b0b69e');rect(ctx,31,6,4,2,'#33443b');
  const x=23+[0,10,0,-10][rotation%4],y=35+[0,-5,-13,-5][rotation%4],w=rotation%2?13:19;
  polygon(ctx,[[x-2,y+18],[x-2,y+4],[x+2,y],[x+w-4,y],[x+w,y+4],[x+w,y+18]],'#b0ac8c',ink);
  polygon(ctx,[[x,y+16],[x,y+5],[x+3,y+2],[x+w-5,y+2],[x+w-2,y+5],[x+w-2,y+16]],hot?'#713c27':'#263b33',ink);
  if(hot) {
    const f=(frame-1)%4,cx=x+(w-2)/2;
    rect(ctx,x+2,y+14,w-6,2,'#d47332');
    polygon(ctx,[[x+2,y+15],[x+3,y+9],[cx-2,y+11],[cx-1,y+4+f],[cx+2,y+9],[x+w-5,y+6+f],[x+w-3,y+15]],'#e6923c');
    polygon(ctx,[[cx-3,y+15],[cx-2,y+10],[cx,y+8+f],[cx+2,y+14]],'#ffe0a0');
    rect(ctx,cx-4+(f%2)*7,y+1-f,1,2,'#ffcb71');
  }
  rect(ctx,x-1,y+17,w+1,2,'#4e5948');rect(ctx,12,56,38,2,'#414d3e');
  return canvas;
}
