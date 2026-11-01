import {LAKES,WORLD} from './config.js';

// Shared shoreline math for terrain, collisions, the atlas, fish and the water shader.
const TAU=Math.PI*2;
export function lakeRadius(lake,angle) {
  const [a,b,c]=lake.shape,p=lake.phase;
  return 1+a*Math.sin(angle*2+p)+b*Math.cos(angle*3-p*.7)+c*Math.sin(angle*5+p*1.3);
}
export function lakePoint(lake,angle,fraction=1) {
  const radius=lakeRadius(lake,angle)*fraction,c=Math.cos(lake.angle),s=Math.sin(lake.angle);
  const u=Math.cos(angle)*lake.rx*radius,v=Math.sin(angle)*lake.ry*radius;
  return {x:lake.x+c*u-s*v,y:lake.y+s*u+c*v};
}
export function lakeField(lake,x,y) {
  const dx=x-lake.x,dy=y-lake.y,c=Math.cos(lake.angle),s=Math.sin(lake.angle);
  const u=(c*dx+s*dy)/lake.rx,v=(-s*dx+c*dy)/lake.ry;
  const r=Math.hypot(u,v),edge=lakeRadius(lake,Math.atan2(v,u));
  return {lake,ratio:r/edge,distance:(r-edge)*Math.min(lake.rx,lake.ry)};
}
export function lakeBounds(lake,padding=0) {
  const radius=(1+lake.shape.reduce((a,b)=>a+b,0))*Math.max(lake.rx,lake.ry)+lake.shore+padding;
  return {minX:lake.x-radius,maxX:lake.x+radius,minY:lake.y-radius,maxY:lake.y+radius};
}
// Most terrain samples are far from water, so avoid scanning all lakes for each pixel.
const cells=new Map(),cellSize=WORLD.chunkSize;
for(const lake of LAKES) {
  const box=lakeBounds(lake,2);
  for(let cy=Math.floor(box.minY/cellSize);cy<=Math.floor(box.maxY/cellSize);cy++) {
    for(let cx=Math.floor(box.minX/cellSize);cx<=Math.floor(box.maxX/cellSize);cx++) {
      const key=`${cx},${cy}`;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(lake);
    }
  }
}
export function lakeSample(x,y) {
  const nearby=cells.get(`${Math.floor(x/cellSize)},${Math.floor(y/cellSize)}`);
  if(!nearby)return null;
  let nearest=null;
  for(const lake of nearby) {
    const sample=lakeField(lake,x,y);
    if(!nearest||sample.distance<nearest.distance)nearest=sample;
  }
  return nearest;
}
function fishPosition(lake,index,seconds) {
  const phase=lake.phase+index*2.39996,pace=.07+(lake.seed%7)*.006+index*.012;
  const angle=phase+seconds*pace*(index%2?-1:1)+Math.sin(seconds*.13+phase)*.28;
  const radius=.44+Math.sin(seconds*.17+phase)*.13+Math.sin(seconds*.29+phase*2)*.07;
  return lakePoint(lake,angle,radius);
}
export function lakeFish(lake,index,seconds) {
  const phase=lake.phase+index*2.39996,point=fishPosition(lake,index,seconds);
  const before=fishPosition(lake,index,seconds-.025),after=fishPosition(lake,index,seconds+.025);
  const period=10+(lake.seed+index*7)%9,offset=(lake.seed*.19+index*3.7)%period;
  const age=((seconds+offset)%period+period)%period,at=seconds-age;
  return {...point,angle:Math.atan2(after.y-before.y,after.x-before.x),size:.85+(index%3)*.16,
    tail:Math.sin(seconds*(7.5+index*.6)+phase),depth:.5+.3*Math.sin(seconds*.19+phase),
    splash:{...fishPosition(lake,index,at),age,period},phase:phase%TAU};
}
