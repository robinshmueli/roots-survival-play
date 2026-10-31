import { WORLD, DIFFICULTY, PLAYER, START_CLEARING } from './config.js';
import { biomeAt, cellSeed, waterAt } from './biomes.js';
import { lakeSample } from './lake-data.js';
import { randomGenerator } from './art.js';
import { chunkObjects } from './world-data.js';

const plants={forest:.065,jungle:.09,autumn:.06,cherry:.055,beach:.025,desert:0,snow:0};

// An independent random stream preserves all existing trees and rocks.
export function chunkForage(cx,cy,scenery=chunkObjects(cx,cy)) {
  const result=[],cells=WORLD.chunkSize/4;
  for(let gy=0;gy<cells;gy++)for(let gx=0;gx<cells;gx++) {
    const ix=cx*cells+gx,iy=cy*cells+gy,random=randomGenerator(cellSeed(ix,iy,76193));
    const roll=random(),x=ix*4+1+random()*2,y=iy*4+1+random()*2;
    if(Math.abs(x)>WORLD.size/2-2||Math.abs(y)>WORLD.size/2-2||Math.hypot(x-PLAYER.startX,y-PLAYER.startY)<START_CLEARING.forageRadius)continue;
    const biome=biomeAt(x,y),plantChance=plants[biome.id]??0;
    if(roll>=.075+plantChance)continue;
    const kind=roll<.075?'looseStone':'fiberBush',type=kind==='looseStone'?'stone':'fiber';
    if(waterAt(x,y)||waterAt(x-.4,y)||waterAt(x+.4,y)||waterAt(x,y-.4)||waterAt(x,y+.4))continue;
    const lake=lakeSample(x,y);
    if(lake&&lake.distance<lake.lake.shore+.4)continue;
    if(scenery.some(object=>((x-object.x)/(object.rx+.65))**2+((y-object.y)/(object.ry+.7))**2<1))continue;
    // Prefer visible gaps on the ground rather than the middle of a tree's crown.
    if(scenery.some(object=>object.type==='tree'&&Math.abs(x-object.x)<1.5*object.size&&y>object.y+.7&&y<object.y+5.5*object.size))continue;
    result.push({id:`forage:${kind}:${ix}:${iy}`,source:'forage',kind,type,x,y,biome:biome.id,
      variant:Math.floor(random()*3),count:type==='stone'?1:DIFFICULTY.fiber[0]+Math.floor(random()*(DIFFICULTY.fiber[1]-DIFFICULTY.fiber[0]+1))});
  }
  return result;
}
