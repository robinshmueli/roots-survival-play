import {polygon,rect,randomGenerator} from './art.js';
import {cellSeed} from './biomes.js';

export const coalPattern=rock=>cellSeed(Math.floor(rock.x/4),Math.floor(rock.y/4),71391)%16;

export function addCoalDeposits(map,variant=0,pattern=0) {
  const canvas=map.image,ctx=canvas.getContext('2d'),pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
  const opaque=(x,y)=>pixels[(y*canvas.width+x)*4+3]>240,candidates=[],random=randomGenerator(0xc0a1+variant*1013+pattern*8191);
  // Sample the actual stone face instead of arranging deposits on a fixed grid.
  for(let y=4;y<canvas.height-4;y++)for(let x=5;x<canvas.width-5;x++) {
    let fits=true;
    for(let dy=-3;dy<=3&&fits;dy++)for(let dx=-4;dx<=4;dx++)if(!opaque(x+dx,y+dy)){fits=false;break;}
    if(fits)candidates.push({x,y});
  }
  for(let i=candidates.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
  const placed=[],target=4+Math.floor(random()*4);
  for(const {x,y} of candidates) {
    if(placed.some(p=>Math.hypot(p.x-x,p.y-y)<6.5))continue;
    const rx=2+Math.floor(random()*2),ry=1+Math.floor(random()*2),flip=random()<.5?-1:1;
    polygon(ctx,[[-rx,0],[-1,-ry],[rx-1,-ry],[rx,0],[1,ry],[-rx+1,ry]].map(([dx,dy])=>[x+dx*flip,y+dy]),'#292f2c','#141d1b');
    rect(ctx,x-1,y-ry,1+Math.floor(random()*2),1,'#56615a');rect(ctx,x,y+ry-1,1,1,'#1e2422');
    placed.push({x,y});if(placed.length>=target)break;
  }
  map.needsUpdate=true;return map;
}
