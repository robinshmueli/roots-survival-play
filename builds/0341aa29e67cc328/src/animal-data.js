import {WORLD,PLAYER,START_CLEARING} from './config.js';
import {waterAt,cellSeed} from './biomes.js';
import {randomGenerator} from './art.js';
import {chunkObjects} from './world-data.js';

export const ANIMAL_TYPES={
  cow:{label:'פרה',health:12,walk:1.1,run:PLAYER.speed*.85,radius:.42,reach:1.25,damage:7,width:3.2,height:3.2,foot:.76},
  chicken:{label:'תרנגולת',health:6,walk:1.5,run:PLAYER.speed*.85,radius:.24,reach:.95,damage:3,width:1.8,height:1.8,foot:.76},
};
export const ANIMAL_SPAWN_CHANCE=.432;
const legacySpawnChance=.54;
export const animalEnabled=source=>source.spawnRoll<=ANIMAL_SPAWN_CHANCE;
// Wildlife has its own random stream; adding animals never moves existing scenery.
export function chunkAnimals(cx,cy,scenery=chunkObjects(cx,cy),spawnChance=ANIMAL_SPAWN_CHANCE) {
  const result=[],cells=WORLD.chunkSize/16;
  for(let gy=0;gy<cells;gy++)for(let gx=0;gx<cells;gx++) {
    const ix=cx*cells+gx,iy=cy*cells+gy,random=randomGenerator(cellSeed(ix,iy,918237));
    const spawnRoll=random();if(spawnRoll>spawnChance)continue;
    const kind=random()<.42?'cow':'chicken',x=ix*16+4+random()*8,y=iy*16+4+random()*8;
    if(Math.abs(x)>WORLD.size/2-10||Math.abs(y)>WORLD.size/2-10||Math.hypot(x-PLAYER.startX,y-PLAYER.startY)<START_CLEARING.radius+2)continue;
    if(waterAt(x,y)||waterAt(x-1,y)||waterAt(x+1,y)||waterAt(x,y-1)||waterAt(x,y+1))continue;
    if(scenery.some(o=>Math.hypot(x-o.x,y-o.y)<o.rx+1))continue;
    result.push({id:`animal:${kind}:${ix}:${iy}`,type:'animal',kind,x,y,spawnRoll});
  }
  return result;
}
const sourceCache=new Map();
export function animalSource(id) {
  if(sourceCache.has(id))return sourceCache.get(id);
  const match=typeof id==='string'?/^animal:(cow|chicken):(-?\d+):(-?\d+)$/.exec(id):null;
  if(!match)return null;
  const ix=Number(match[2]),iy=Number(match[3]);
  if(!Number.isSafeInteger(ix)||!Number.isSafeInteger(iy)||Math.abs(ix)>WORLD.size/16||Math.abs(iy)>WORLD.size/16)return null;
  // Old sources remain valid for saved animals and meat, even after thinning.
  const source=chunkAnimals(Math.floor(ix/2),Math.floor(iy/2),undefined,legacySpawnChance).find(animal=>animal.id===id)??null;
  if(source)sourceCache.set(id,source);return source;
}
