import {t} from './i18n.js';
import {WORLD,PLAYER,START_CLEARING} from './config.js';
import {waterAt,cellSeed} from './biomes.js';
import {randomGenerator} from './art.js';
import {chunkObjects} from './world-data.js';

export const ANIMAL_TYPES={
  cow:{label:t("פרה"),health:12,walk:1.1,run:PLAYER.speed*.85,radius:.42,reach:1.25,damage:15,width:3.2,height:3.2,foot:54/64},
  chicken:{label:t("תרנגולת"),health:6,walk:1.5,run:PLAYER.speed*.85,radius:.24,reach:.95,damage:5,width:1.8,height:1.8,foot:42/48},
  pig:{label:t("חזיר"),health:10,walk:1.2,run:PLAYER.speed*.85,radius:.36,reach:1.1,damage:10,width:2.6,height:2.6,foot:42/48},
  wolf:{label:t("זאב"),health:24,walk:1.35,run:PLAYER.speed*.85,radius:.4,reach:1.35,damage:20,width:3.2,height:3.2,foot:54/64},
};
export const ANIMAL_LOOT={cow:{type:'raw-steak',min:1,max:2},chicken:{type:'raw-drumstick',min:2,max:2},pig:{type:'raw-bacon',min:1,max:2},wolf:{type:'raw-steak',min:1,max:2}};
export const ANIMAL_SPAWN_CHANCE=.432;
export const PIG_SPAWN_CHANCE=.16;
export const WOLF_SPAWN_CHANCE=.12;
const legacySpawnChance=.54;
export const animalEnabled=source=>source.spawnRoll<=(source.kind==='wolf'?WOLF_SPAWN_CHANCE:source.kind==='pig'?PIG_SPAWN_CHANCE:ANIMAL_SPAWN_CHANCE);
// Wildlife has its own random stream; adding animals never moves existing scenery.
export function chunkAnimals(cx,cy,scenery=chunkObjects(cx,cy),spawnChance=ANIMAL_SPAWN_CHANCE) {
  const result=[],cells=WORLD.chunkSize/16;
  for(let gy=0;gy<cells;gy++)for(let gx=0;gx<cells;gx++) {
    const ix=cx*cells+gx,iy=cy*cells+gy,random=randomGenerator(cellSeed(ix,iy,918237));
    let spawnRoll=random(),kind,x,y;
    if(spawnRoll<=spawnChance) {
      kind=random()<.42?'cow':'chicken';x=ix*16+4+random()*8;y=iy*16+4+random()*8;
    } else {
      // Pigs use a separate stream in formerly empty cells, preserving every
      // existing cow/chicken ID, location and saved death/drop record.
      if(spawnRoll<=legacySpawnChance)continue;
      const pigRandom=randomGenerator(cellSeed(ix,iy,773413));spawnRoll=pigRandom();
      if(spawnRoll<=PIG_SPAWN_CHANCE){kind='pig';x=ix*16+4+pigRandom()*8;y=iy*16+4+pigRandom()*8;}
      else {
        const wolfRandom=randomGenerator(cellSeed(ix,iy,535651));spawnRoll=wolfRandom();if(spawnRoll>WOLF_SPAWN_CHANCE)continue;
        kind='wolf';x=ix*16+4+wolfRandom()*8;y=iy*16+4+wolfRandom()*8;
      }
    }
    if(Math.abs(x)>WORLD.size/2-10||Math.abs(y)>WORLD.size/2-10||Math.hypot(x-PLAYER.startX,y-PLAYER.startY)<START_CLEARING.radius+2)continue;
    if(kind==='wolf'&&Math.hypot(x-PLAYER.startX,y-PLAYER.startY)<START_CLEARING.radius+24)continue;
    if(waterAt(x,y)||waterAt(x-1,y)||waterAt(x+1,y)||waterAt(x,y-1)||waterAt(x,y+1))continue;
    if(scenery.some(o=>Math.hypot(x-o.x,y-o.y)<o.rx+1))continue;
    result.push({id:`animal:${kind}:${ix}:${iy}`,type:'animal',kind,x,y,spawnRoll});
  }
  return result;
}
const sourceCache=new Map();
export function animalSource(id) {
  if(sourceCache.has(id))return sourceCache.get(id);
  const match=typeof id==='string'?/^animal:(cow|chicken|pig|wolf):(-?\d+):(-?\d+)$/.exec(id):null;
  if(!match)return null;
  const ix=Number(match[2]),iy=Number(match[3]);
  if(!Number.isSafeInteger(ix)||!Number.isSafeInteger(iy)||Math.abs(ix)>WORLD.size/16||Math.abs(iy)>WORLD.size/16)return null;
  // Old sources remain valid for saved animals and meat, even after thinning.
  const source=chunkAnimals(Math.floor(ix/2),Math.floor(iy/2),undefined,legacySpawnChance).find(animal=>animal.id===id)??null;
  if(source)sourceCache.set(id,source);return source;
}
