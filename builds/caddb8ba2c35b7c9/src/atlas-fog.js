import {WORLD,EXPLORATION} from './config.js';
import {makeCanvas,randomGenerator} from './art.js';
import {createExploration} from './exploration.js';

const pixelsPerUnit=2;
function clouds() {
  const [canvas,ctx]=makeCanvas(WORLD.size),random=randomGenerator(6843);
  ctx.fillStyle='#738e9d';ctx.fillRect(0,0,WORLD.size,WORLD.size);
  // One irregular field for the whole world avoids a repeating cloud wallpaper.
  for(let i=0;i<220;i++) {
    const x=random()*WORLD.size,y=random()*WORLD.size,radius=30+random()*50;
    const g=ctx.createRadialGradient(x-radius*.18,y-radius*.2,0,x,y,radius);
    g.addColorStop(0,'#e1e9eacc');g.addColorStop(.43,'#c8d9dfb0');g.addColorStop(1,'#bacfd400');
    ctx.fillStyle=g;ctx.fillRect(x-radius,y-radius,radius*2,radius*2);
  }
  return canvas;
}

export function createAtlasFog() {
  const exploration=createExploration(),cloudField=clouds(),buffers=new Map();
  const mask=document.createElement('canvas');mask.width=mask.height=WORLD.size*pixelsPerUnit;
  const ink=mask.getContext('2d');
  function stamp(x,y) {
    const cx=(x+WORLD.size/2)*pixelsPerUnit,cy=(WORLD.size/2-y)*pixelsPerUnit;
    const inner=EXPLORATION.radius*pixelsPerUnit,outer=(EXPLORATION.radius+EXPLORATION.feather)*pixelsPerUnit;
    const gradient=ink.createRadialGradient(cx,cy,inner,cx,cy,outer);
    gradient.addColorStop(0,'#ffffffff');gradient.addColorStop(1,'#ffffff00');
    ink.fillStyle=gradient;ink.fillRect(cx-outer,cy-outer,outer*2,outer*2);
  }
  return {
    get revision(){return exploration.revision;},
    known:(x,y)=>exploration.known(x,y),
    stats:()=>({discoveredCells:exploration.discoveredCells,discoveryRevision:exploration.revision}),
    visit(position) {
      const route=exploration.visit(position);if(!route)return false;
      const dx=route.to.x-route.from.x,dy=route.to.y-route.from.y,steps=Math.ceil(Math.hypot(dx,dy));
      if(!steps){stamp(route.to.x,route.to.y);return true;}
      for(let i=0;i<=steps;i++)stamp(route.from.x+dx*i/steps,route.from.y+dy*i/steps);
      return true;
    },
    draw(ctx,bounds,size) {
      if(!buffers.has(size)) {
        const layer=document.createElement('canvas');layer.width=layer.height=size;buffers.set(size,layer);
      }
      const layer=buffers.get(size),paint=layer.getContext('2d'),span=bounds.maxX-bounds.minX;
      paint.save();paint.globalCompositeOperation='source-over';paint.imageSmoothingEnabled=false;paint.clearRect(0,0,size,size);
      paint.drawImage(cloudField,bounds.minX+WORLD.size/2,WORLD.size/2-bounds.maxY,span,span,0,0,size,size);
      paint.globalCompositeOperation='destination-out';paint.imageSmoothingEnabled=true;
      paint.drawImage(mask,(bounds.minX+WORLD.size/2)*pixelsPerUnit,(WORLD.size/2-bounds.maxY)*pixelsPerUnit,
        span*pixelsPerUnit,span*pixelsPerUnit,0,0,size,size);
      paint.restore();ctx.drawImage(layer,0,0,size,size);
    },
  };
}
