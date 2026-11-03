import {caveLayout,CAVE_BOUNDS,caveContains} from './cave-data.js';
import {createCaveDiscovery,CAVE_MAP_CELL} from './cave-discovery.js';

export function drawCaveMap(ctx,id,size,broken=[],discovery,version=2,exits=null) {
  const layout=caveLayout(id,version),bounds=layout.bounds??CAVE_BOUNDS,span=Math.max(bounds.maxX-bounds.minX,bounds.maxY-bounds.minY),scale=size/span;
  const minX=(bounds.maxX+bounds.minX-span)/2,maxY=(bounds.maxY+bounds.minY+span)/2;
  const point=(x,y)=>({x:(x-minX)*scale,y:(maxY-y)*scale});
  ctx.fillStyle='#111e24';ctx.fillRect(0,0,size,size);
  ctx.save();ctx.fillStyle='#72766a';
  for(let y=bounds.minY;y<bounds.maxY;y+=.5)for(let x=bounds.minX;x<bounds.maxX;x+=.5)if(caveContains(id,x+.25,y+.25,0,version)){const p=point(x,y+.5);ctx.fillRect(Math.floor(p.x),Math.floor(p.y),Math.ceil(.5*scale)+1,Math.ceil(.5*scale)+1);}
  const missing=new Set(broken);
  for(const rock of layout.rocks)if(!missing.has(rock.id)){const p=point(rock.x,rock.y);ctx.fillStyle=rock.mineral==='echo'?'#82e6ee':rock.mineral==='copper'?'#e58c4a':rock.mineral==='iron'?'#e1cba2':rock.mineral==='coal'?'#172622':'#a1aea1';ctx.fillRect(Math.round(p.x)-1,Math.round(p.y)-1,Math.max(2,scale*1.2),Math.max(2,scale*1.2));}
  const seen=createCaveDiscovery(discovery);ctx.fillStyle='#111e24';
  for(let y=CAVE_BOUNDS.minY;y<CAVE_BOUNDS.maxY;y+=CAVE_MAP_CELL)for(let x=CAVE_BOUNDS.minX;x<CAVE_BOUNDS.maxX;x+=CAVE_MAP_CELL)if(!seen.known(x+.5,y+.5)){
    const p=point(x,y+CAVE_MAP_CELL);ctx.fillRect(Math.floor(p.x),Math.floor(p.y),Math.ceil(CAVE_MAP_CELL*scale)+1,Math.ceil(CAVE_MAP_CELL*scale)+1);
  }
  for(const doorway of exits??layout.exits){const exit=point(doorway.x,doorway.y);if(doorway.id!=='entry'&&!seen.known(doorway.x,doorway.y))continue;ctx.fillStyle='#f6df9c';ctx.beginPath();ctx.moveTo(exit.x,exit.y-doorway.dy*4);ctx.lineTo(exit.x-4,exit.y+doorway.dy*3);ctx.lineTo(exit.x+4,exit.y+doorway.dy*3);ctx.fill();}
  ctx.restore();
  return {minX,maxX:minX+span,minY:maxY-span,maxY};
}
