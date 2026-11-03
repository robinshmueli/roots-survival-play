import {makeCanvas,polygon,ellipse,rect} from './art.js';

export function animalArt(kind,direction,frame=0,night=false,variant=0,bite=0) {
  const cow=kind==='cow',pig=kind==='pig',wolf=kind==='wolf',size=cow||wolf?64:48,[canvas,ctx]=makeCanvas(size),ink=pig?'#6a4543':wolf?'#303c40':'#3a3b2d',eyes=[];
  const facingRight=direction==='right',mirror=direction==='left',back=direction==='up',profile=facingRight||mirror;
  if(mirror){ctx.translate(size,0);ctx.scale(-1,1);}
  const stride=[0,2,1,0,-2,-1][frame%6],bob=(Math.abs(stride)>1?1:0)+(bite===1?1:bite===2?2:bite===3?-1:0);
  function eye(x,y){rect(ctx,x,y,cow||pig||wolf?2:1,cow||pig||wolf?2:1,night?'#ff423d':wolf?'#d6b66c':'#2b3028');if(night)rect(ctx,x,y,1,1,'#ffd9a1');else if(wolf)rect(ctx,x+1,y,1,2,'#253035');eyes.push({x:mirror?size-x-1:x,y});}
  function mouth(x,y,width) {
    if(!bite)return;
    const open=bite===3?5:bite===2?3:1;
    rect(ctx,x-width/2-1,y-1,width+2,open+2,ink);rect(ctx,x-width/2,y,width,open,'#492c31');
    if(open>1){rect(ctx,x-width/2+1,y,2,2,'#f2e7c9');rect(ctx,x+width/2-3,y,2,2,'#f2e7c9');rect(ctx,x-2,y+open-1,4,1,'#be7171');}
  }
  if(wolf) {
    const coat=variant%2?'#7e8581':'#707d82',light=variant%2?'#c0c3ad':'#b7c2c0';
    for(const [i,x] of [18,26,39,46].entries()) {
      const lift=i%2?stride:-stride;
      polygon(ctx,[[x-2,34],[x+2,34],[x+2+lift,51-bob],[x-2+lift,51-bob]],i%2?'#56666c':coat,ink);
      rect(ctx,x-3+lift,50-bob,6,4,'#3b494c');rect(ctx,x-2+lift,50-bob,3,1,'#b5b8a9');
    }
    const tx=profile?12:45;
    polygon(ctx,[[tx,30],[tx-8,24+stride],[tx-11,29+stride],[tx-8,40],[tx+1,46],[tx+7,41]],coat,ink);
    polygon(ctx,[[tx-8,29+stride],[tx-8,34],[tx-4,39],[tx,41],[tx-1,35]],light);
    polygon(ctx,[[12,29],[20,21],[39,20],[49,28],[47,42],[40,47],[18,46],[10,39]],coat,ink);
    polygon(ctx,[[17,26],[24,22],[38,22],[43,27],[37,31],[24,30]],'#8e9b9b');
    polygon(ctx,[[15,35],[20,39],[25,42],[37,42],[42,38],[43,44],[36,47],[20,45]],light);
    const hx=profile?45:32,hy=(back?22:29)+bob;
    polygon(ctx,[[hx-12,hy+1],[hx-15,hy+8],[hx-10,hy+8],[hx-10,hy+14],[hx-4,hy+11],[hx,hy+15],[hx+5,hy+11],[hx+11,hy+13],[hx+10,hy+5]],light,ink);
    polygon(ctx,[[hx-10,hy-4],[hx-11,hy-15],[hx-7,hy-18],[hx-3,hy-7]],coat,ink);
    polygon(ctx,[[hx+3,hy-7],[hx+7,hy-18],[hx+11,hy-15],[hx+10,hy-3]],coat,ink);
    polygon(ctx,[[hx-8,hy-13],[hx-7,hy-15],[hx-5,hy-7]],'#a18583');polygon(ctx,[[hx+5,hy-7],[hx+7,hy-15],[hx+8,hy-13]],'#a18583');
    polygon(ctx,[[hx-10,hy-6],[hx-5,hy-10],[hx+5,hy-10],[hx+11,hy-4],[hx+9,hy+7],[hx+4,hy+12],[hx-5,hy+11],[hx-10,hy+4]],coat,ink);
    polygon(ctx,[[hx-5,hy-7],[hx,hy-9],[hx+4,hy-6],[hx+2,hy+3],[hx-2,hy+4]],'#a4b0af');
    if(!back) {
      const sx=profile?hx+7:hx;
      polygon(ctx,[[sx-5,hy+1],[sx+4,hy+1],[sx+7,hy+9],[sx+3,hy+12],[sx-5,hy+10]],light,ink);
      rect(ctx,sx-3,hy+8,7,3,'#253338');rect(ctx,sx-2,hy+8,3,1,'#677a7c');
      eye(profile?hx+2:hx-7,hy-2);if(!profile)eye(hx+6,hy-2);mouth(sx,hy+11,profile?8:10);
    }
  } else if(cow) {
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
      mouth(hx,hy+12,12);
    }
    const tailX=profile?11:46;polygon(ctx,[[tailX,31],[tailX-3,37+stride],[tailX-2,44+stride],[tailX+1,43+stride],[tailX,37]],'#a89e7b',ink);rect(ctx,tailX-3,42+stride,4,5,'#545343');
  } else if(pig) {
    const skin=variant%2?'#c88e85':'#dca09b',light=variant%2?'#dfafa0':'#efbeb4';
    for(const [i,x] of [14,21,29,35].entries()) {
      const lift=i%2?stride:-stride;
      polygon(ctx,[[x-2,30],[x+2,30],[x+2+lift,40-bob],[x-2+lift,40-bob]],i%2?'#bc807b':skin,ink);
      rect(ctx,x-2+lift,39-bob,5,3,'#634b43');rect(ctx,x-1+lift,39-bob,2,1,'#a87c6e');
    }
    ellipse(ctx,24,28+bob,16,11,ink);ellipse(ctx,24,27+bob,15,10,skin);
    polygon(ctx,[[13,23+bob],[18,19+bob],[29,19+bob],[35,23+bob],[31,25+bob],[18,25+bob]],light);
    if(variant%2)polygon(ctx,[[14,29],[18,26],[23,28],[22,34],[17,35]],'#ad776e');
    const hx=profile?33:24,hy=(back?20:29)+bob;
    polygon(ctx,[[hx-8,hy-3],[hx-10,hy-11],[hx-6,hy-13],[hx-2,hy-7]],skin,ink);
    polygon(ctx,[[hx+3,hy-6],[hx+7,hy-13],[hx+11,hy-10],[hx+8,hy-2]],skin,ink);
    polygon(ctx,[[hx-8,hy-9],[hx-6,hy-11],[hx-4,hy-6]],'#b86c76');
    polygon(ctx,[[hx+5,hy-6],[hx+7,hy-11],[hx+9,hy-9]],'#b86c76');
    ellipse(ctx,hx,hy,10,9,ink);ellipse(ctx,hx,hy-1,9,8,skin);rect(ctx,hx-5,hy-6,8,2,light);
    if(!back) {
      const snout=profile?hx+5:hx;
      polygon(ctx,[[snout-6,hy+2],[snout+5,hy+2],[snout+7,hy+5],[snout+5,hy+9],[snout-6,hy+9],[snout-8,hy+5]],'#c77d86',ink);
      rect(ctx,snout-5,hy+3,8,1,'#f0b0ae');rect(ctx,snout-4,hy+5,2,2,'#79454e');rect(ctx,snout+2,hy+5,2,2,'#79454e');
      eye(profile?hx+1:hx-6,hy-2);if(!profile)eye(hx+5,hy-2);
      mouth(snout,hy+8,10);
    }
    const tx=profile?6:39,ty=25+Math.sign(stride);
    rect(ctx,tx,ty,5,2,ink);rect(ctx,tx-2,ty-4,2,5,ink);rect(ctx,tx-1,ty-5,5,2,ink);rect(ctx,tx+3,ty-3,2,3,ink);
    rect(ctx,tx,ty-4,3,1,'#efb2a8');rect(ctx,tx-1,ty-3,1,4,skin);rect(ctx,tx,ty,4,1,skin);
  } else {
    for(const [i,x] of [19,29].entries()){const lift=i?stride:-stride;rect(ctx,x+lift,34,2,7-bob,'#cc923d');rect(ctx,x-2+lift,40-bob,6,2,'#dfb45b');}
    const hx=profile?33:24,hy=(back?20:23)+bob;
    polygon(ctx,[[13,28],[7,22],[8,16],[14,20],[17,24]],'#b7b69b',ink);polygon(ctx,[[10,21],[9,15],[14,19],[16,25]],'#ebe5c6',ink);
    ellipse(ctx,24,29+bob,13,10,'#dedcc0');polygon(ctx,[[15,25],[20,21],[29,23],[33,29],[29,33],[19,32]],'#f5edd4',ink);
    polygon(ctx,[[17,28],[21,26],[27,28],[29,33],[23,36],[18,33]],'#b9bda3');rect(ctx,20,28,5,1,'#e8e5c9');
    polygon(ctx,[[hx-5,hy-3],[hx-5,hy-7],[hx-3,hy-9],[hx-1,hy-6],[hx+1,hy-9],[hx+3,hy-6],[hx+4,hy-2]],'#b54535',ink);
    ellipse(ctx,hx,hy,7,7,'#eee6cb');rect(ctx,hx-3,hy-4,5,2,'#fff2da');
    if(!back){const beakX=profile?hx+6:hx;polygon(ctx,[[beakX-2,hy+2],[beakX+4,hy+2],[beakX+1,hy+6]],'#dea34b',ink);rect(ctx,beakX,hy+6,2,3,'#b84634');eye(profile?hx+2:hx-3,hy);if(!profile)eye(hx+3,hy);if(bite>1){polygon(ctx,[[beakX-3,hy+2],[beakX+5,hy+2],[beakX+1,hy+4]],'#edbd69',ink);rect(ctx,beakX-1,hy+5,4,bite===3?4:2,'#492c31');polygon(ctx,[[beakX-2,hy+9],[beakX+4,hy+9],[beakX+1,hy+6]],'#d6993b',ink);}}
  }
  ctx.restore();return {canvas,eyes};
}
