import {WORLD} from './config.js';
import {makeCanvas,texture,polygon,rect,ellipse,randomGenerator} from './art.js';
import {caveContains,caveLayout} from './cave-data.js';

export function caveEntranceArt(variant=0) {
  const [canvas,ctx]=makeCanvas(96,88);
  variant%=4;
  ctx.save();
  if(variant===1){ctx.translate(14,-5);ctx.scale(.72,1.06);}
  if(variant===2){ctx.translate(-4,15);ctx.scale(1.08,.8);}
  ellipse(ctx,48,76,45,9,'#31362b66');
  polygon(ctx,[[4,74],[6,48],[18,29],[25,14],[45,5],[66,12],[80,30],[91,52],[93,75]],'#4d5750','#27372f');
  polygon(ctx,[[8,52],[21,32],[28,17],[46,9],[60,13],[48,28],[29,37],[20,59]],'#87917a');
  polygon(ctx,[[51,15],[64,17],[77,33],[86,55],[83,73],[70,68],[68,41]],'#6e7b68');
  polygon(ctx,[[21,73],[24,46],[34,31],[48,25],[61,32],[73,47],[77,74]],'#171f22','#323e36');
  polygon(ctx,[[29,72],[31,48],[39,36],[49,33],[59,40],[65,52],[67,74]],'#080e13');
  polygon(ctx,[[20,74],[34,69],[61,69],[79,75],[77,81],[24,81]],'#7d7358','#414c39');
  for(const [x,y,w] of [[15,44,10],[30,20,9],[58,22,8],[76,48,10],[7,65,9],[81,68,8]]){rect(ctx,x,y,w,2,'#a2a78c');rect(ctx,x+3,y+2,1,4,'#39453b');}
  for(const [x,y] of [[16,39],[27,25],[56,12],[75,36],[7,62]]){ellipse(ctx,x,y,5,3,'#607147');rect(ctx,x,y-2,3,1,'#95a25f');}
  rect(ctx,35,76,23,1,'#b1a276');
  if(variant===3) {
    polygon(ctx,[[4,65],[0,41],[9,30],[18,31],[20,50],[16,70]],'#716b58','#303b35');
    polygon(ctx,[[77,67],[75,37],[86,25],[95,31],[96,70]],'#827863','#303b35');
    for(const [x,y] of [[17,24],[23,18],[69,23],[79,36]]){rect(ctx,x,y,2,14,'#53744c');rect(ctx,x+1,y+2,3,3,'#8ba36a');}
    rect(ctx,12,42,3,16,'#3f493f');rect(ctx,83,39,2,15,'#4c4d40');
  }
  ctx.restore();
  return texture(canvas);
}

export function caveGroundArt(id,cx,cy,version=2) {
  const pixels=WORLD.chunkSize*WORLD.pixelsPerUnit,[canvas,ctx]=makeCanvas(pixels),layout=caveLayout(id,version);
  const random=randomGenerator(layout.seed^(cx*19337)^(cy*67231)),step=4,ppu=WORLD.pixelsPerUnit;
  for(let y=0;y<pixels;y+=step)for(let x=0;x<pixels;x+=step) {
    const wx=cx*WORLD.chunkSize+(x+step/2)/ppu,wy=(cy+1)*WORLD.chunkSize-(y+step/2)/ppu;
    const floor=caveContains(id,wx,wy,0,version),below=caveContains(id,wx,wy-1.1,0,version);
    const edge=floor&&!caveContains(id,wx,wy,.6,version),noise=random();
    const colors=floor?(edge?['#4a4c46','#55554a','#484b45']:['#777264','#7b7565','#716f63','#817969']):below?['#a3a28b','#8c927e','#959782']:['#343e39','#3c453e','#414b41'];
    rect(ctx,x,y,step,step,colors[Math.floor(noise*colors.length)]);
    if(!floor&&below&&Math.floor(y/step)%5===0)rect(ctx,x,y,step,1,'#bcc0a4');
    if(floor&&noise<.025){rect(ctx,x,y,2,1,'#a69b7f');rect(ctx,x+1,y+1,2,1,'#4e554c');}
    if(!floor&&!below&&noise<.07)rect(ctx,x,y,step,1,'#535e4d');
  }
  return texture(canvas);
}

export function caveExitArt(direction=-1,variant=0) {
  const [canvas,ctx]=makeCanvas(96,88);
  if(direction>0) {
    polygon(ctx,[[6,78],[9,43],[23,13],[42,5],[62,11],[83,35],[90,78]],'#687368','#253b37');
    polygon(ctx,[[24,76],[25,45],[35,28],[49,22],[62,31],[72,46],[75,78]],'#c5ddbb','#344e42');
    polygon(ctx,[[28,64],[30,44],[38,32],[49,27],[60,35],[68,46],[70,65]],'#b9d2d2');
    polygon(ctx,[[25,66],[35,58],[45,62],[57,55],[74,65],[75,78],[24,78]],'#88a56b');
    for(const [x,y] of [[32,49],[59,45],[65,52]]){rect(ctx,x,y,2,14,'#647d4c');polygon(ctx,[[x-5,y+5],[x+1,y-7],[x+6,y+5]],'#6f9d60');}
    polygon(ctx,[[36,77],[41,61],[54,59],[63,77]],'#b4ae83');rect(ctx,37,74,18,1,'#ded2a7');
  } else {
    // A level opening in the southern cave wall; daylight and ground continue
    // through it. There are no steps or stair stripes.
    polygon(ctx,[[27,3],[67,3],[75,25],[87,83],[8,83],[20,27]],'#9eaf91','#293b39');
    polygon(ctx,[[32,7],[62,7],[68,31],[78,83],[18,83],[27,33]],'#a9be93');
    polygon(ctx,[[36,24],[57,21],[64,46],[68,83],[26,83],[30,48]],'#c1b994');
    polygon(ctx,[[8,82],[4,56],[15,24],[23,5],[34,1],[30,25],[24,53],[23,82]],'#58685e','#223832');
    polygon(ctx,[[71,83],[71,53],[64,24],[61,2],[74,6],[84,27],[93,58],[89,83]],'#6f7a6a','#223832');
    for(const [x,y] of [[17,35],[13,56],[73,39],[80,60]]){rect(ctx,x,y,8,2,'#96a085');rect(ctx,x+3,y+3,1,5,'#3b5045');}
    polygon(ctx,[[23,73],[31,68],[32,82],[23,82]],'#73925a');polygon(ctx,[[65,76],[70,64],[75,78],[71,83]],'#6f8d55');
  }
  if(variant%2)for(const [x,y] of [[20,29],[75,25]]){rect(ctx,x,y,2,14,'#405d44');rect(ctx,x,y+3,4,2,'#8da56b');}
  return texture(canvas);
}

export function addIronDeposits(map,variant=0,copper=false) {
  const ctx=map.image.getContext('2d'),w=map.image.width,h=map.image.height,source=ctx.getImageData(0,0,w,h).data,random=randomGenerator(38271+variant*9187);
  for(let i=0;i<11;i++) {
    const x=5+Math.floor(random()*(w-10)),y=4+Math.floor(random()*(h-10));
    if(source[(y*w+x)*4+3]<240)continue;
    if(copper) {
      polygon(ctx,[[x,y],[x+3,y-2],[x+5,y],[x+4,y+3],[x,y+4],[x-2,y+2]],'#c76d3b','#623e30');
      rect(ctx,x,y,3,1,'#ffbf7b');rect(ctx,x+1,y+2,2,2,'#83a48c');
    } else {
      // Pale, angular seams contrast with the round orange/green copper flecks.
      polygon(ctx,[[x-3,y+3],[x-1,y-1],[x+2,y-3],[x+4,y-3],[x+3,y],[x+6,y+1],[x+5,y+3],[x+1,y+2],[x-1,y+5]],'#c3ad86','#665b49');
      polygon(ctx,[[x-2,y+2],[x,y-1],[x+3,y-2],[x+1,y+1],[x+4,y+2],[x+1,y+3],[x,y+2],[x-1,y+4]],'#f3dfb7');
      rect(ctx,x+2,y+2,2,1,'#988363');
    }
  }
  // Preserve the rock silhouette around deposits on its boundary.
  const image=ctx.getImageData(0,0,w,h);for(let i=3;i<source.length;i+=4)image.data[i]=source[i];ctx.putImageData(image,0,0);map.needsUpdate=true;
}
export const addCopperDeposits=(map,variant=0)=>addIronDeposits(map,variant,true);

export function echoCrystalArt() {
  const [canvas,ctx]=makeCanvas(32,48);
  ellipse(ctx,16,23,14,19,'#167bc21a');ellipse(ctx,16,23,11,16,'#259fe32a');
  ellipse(ctx,16,43,9,2,'#2ca8d84a');ellipse(ctx,16,43,5,1,'#91edff50');
  polygon(ctx,[[16,6],[25,19],[16,34],[7,19]],'#218fce','#133c69');
  polygon(ctx,[[16,8],[16,21],[9,19]],'#9af4ff');
  polygon(ctx,[[16,8],[23,19],[16,21]],'#46c9f3');
  polygon(ctx,[[9,20],[15,22],[16,31]],'#48d3f0');
  polygon(ctx,[[17,22],[23,20],[17,31]],'#2764af');
  rect(ctx,14,12,2,8,'#dcffff');rect(ctx,17,17,3,1,'#9df5ff');
  for(const [x,y] of [[4,15],[27,27],[8,35]]){rect(ctx,x,y,1,3,'#58c8f1');rect(ctx,x-1,y+1,3,1,'#58c8f1');rect(ctx,x,y+1,1,1,'#d5ffff');}
  return texture(canvas);
}
