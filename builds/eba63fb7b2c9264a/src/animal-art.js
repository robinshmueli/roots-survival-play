import {makeCanvas,polygon,ellipse,rect} from './art.js';

export function animalArt(kind,direction,frame=0,night=false,variant=0) {
  const cow=kind==='cow',size=cow?64:48,[canvas,ctx]=makeCanvas(size),ink='#3a3b2d',eyes=[];
  const facingRight=direction==='right',mirror=direction==='left',back=direction==='up',profile=facingRight||mirror;
  if(mirror){ctx.translate(size,0);ctx.scale(-1,1);}
  const stride=[0,2,1,0,-2,-1][frame%6],bob=Math.abs(stride)>1?1:0;
  function eye(x,y){rect(ctx,x,y,cow?2:1,cow?2:1,night?'#ff423d':'#2b3028');if(night)rect(ctx,x,y,1,1,'#ffd9a1');eyes.push({x:mirror?size-x-1:x,y});}
  if(cow) {
    for(const [i,x] of (profile?[18,26,39,44]:[21,29,36,43]).entries()) {
      const lift=i%2?stride:-stride;
      polygon(ctx,[[x-2,37],[x+3,37],[x+2+lift,51-bob],[x-2+lift,51-bob]],i%2?'#b6aa85':'#d3c9a7',ink);
      rect(ctx,x-2+lift,50-bob,5,4,'#514936');rect(ctx,x-1+lift,50-bob,2,1,'#82735b');
    }
    polygon(ctx,[[13,29],[17,22],[39,21],[47,28],[46,41],[39,47],[19,46],[12,39]],'#dad3b1',ink);
    polygon(ctx,[[16,26],[22,23],[38,23],[44,28],[43,32],[21,31],[15,35]],'#f2e8c8');
    polygon(ctx,variant%2?[[18,25],[26,24],[29,28],[26,34],[19,34],[16,30]]:[[17,31],[22,28],[29,30],[30,37],[25,41],[18,39]],'#586052');
    polygon(ctx,[[33,23],[40,24],[44,29],[42,34],[36,33],[32,28]],'#4c564a');rect(ctx,18,41,5,2,'#b8b18e');
    if(!back){ellipse(ctx,32,46,6,3,'#c58d7e');rect(ctx,29,47,2,3,'#dda18c');rect(ctx,34,47,2,3,'#dda18c');}
    const hx=profile?46:32,hy=(back?20:29)+bob;
    polygon(ctx,[[hx-9,hy-4],[hx-13,hy-5],[hx-13,hy],[hx-8,hy+2]],'#c6bc97',ink);
    polygon(ctx,[[hx+8,hy-4],[hx+12,hy-5],[hx+12,hy],[hx+8,hy+2]],'#c6bc97',ink);
    polygon(ctx,[[hx-7,hy-7],[hx-6,hy-12],[hx-3,hy-9],[hx-3,hy-5]],'#e0d1a8',ink);
    polygon(ctx,[[hx+4,hy-7],[hx+6,hy-12],[hx+8,hy-9],[hx+7,hy-5]],'#e0d1a8',ink);
    polygon(ctx,[[hx-8,hy-6],[hx+7,hy-6],[hx+10,hy+2],[hx+8,hy+11],[hx-7,hy+11],[hx-10,hy+3]],'#d8cfaa',ink);
    polygon(ctx,[[hx-6,hy-5],[hx-1,hy-5],[hx-2,hy+3],[hx-7,hy+4]],'#596052');rect(ctx,hx+1,hy-4,4,4,'#f0e5c4');
    if(!back) {
      ellipse(ctx,hx,hy+9,9,5,'#c69a87');rect(ctx,hx-5,hy+8,2,2,'#725e4c');rect(ctx,hx+4,hy+8,2,2,'#725e4c');rect(ctx,hx-4,hy+6,7,1,'#e5b7a0');
      eye(hx-6,hy+1);if(!profile)eye(hx+5,hy+1);
    }
    const tailX=profile?11:46;polygon(ctx,[[tailX,31],[tailX-3,37+stride],[tailX-2,44+stride],[tailX+1,43+stride],[tailX,37]],'#a89e7b',ink);rect(ctx,tailX-3,42+stride,4,5,'#545343');
  } else {
    for(const [i,x] of [19,29].entries()){const lift=i?stride:-stride;rect(ctx,x+lift,34,2,7-bob,'#cc923d');rect(ctx,x-2+lift,40-bob,6,2,'#dfb45b');}
    const hx=profile?33:24,hy=(back?20:23)+bob;
    polygon(ctx,[[13,28],[7,22],[8,16],[14,20],[17,24]],'#b7b69b',ink);polygon(ctx,[[10,21],[9,15],[14,19],[16,25]],'#ebe5c6',ink);
    ellipse(ctx,24,29+bob,13,10,'#dedcc0');polygon(ctx,[[15,25],[20,21],[29,23],[33,29],[29,33],[19,32]],'#f5edd4',ink);
    polygon(ctx,[[17,28],[21,26],[27,28],[29,33],[23,36],[18,33]],'#b9bda3');rect(ctx,20,28,5,1,'#e8e5c9');
    polygon(ctx,[[hx-5,hy-3],[hx-5,hy-7],[hx-3,hy-9],[hx-1,hy-6],[hx+1,hy-9],[hx+3,hy-6],[hx+4,hy-2]],'#b54535',ink);
    ellipse(ctx,hx,hy,7,7,'#eee6cb');rect(ctx,hx-3,hy-4,5,2,'#fff2da');
    if(!back){const beakX=profile?hx+6:hx;polygon(ctx,[[beakX-2,hy+2],[beakX+4,hy+2],[beakX+1,hy+6]],'#dea34b',ink);rect(ctx,beakX,hy+6,2,3,'#b84634');eye(profile?hx+2:hx-3,hy);if(!profile)eye(hx+3,hy);}
  }
  ctx.restore();return {canvas,eyes};
}
