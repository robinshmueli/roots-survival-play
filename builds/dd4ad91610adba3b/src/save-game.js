import {worldSaveKey} from './world-profile.js';
import {WORLD,INVENTORY,SURVIVAL,SPRINT,EXPLORATION,CAMP} from './config.js';
import {ITEMS} from './items.js';
import {STRUCTURES,structureCenter,structureSpec,structureMaxHealth} from './structures.js';
import {createInventory} from './inventory.js';
import {chunkObjects} from './world-data.js';
import {chunkForage} from './forage-data.js';
import {decodeDiscovery} from './exploration.js';
import {savedPhaseSeconds,migrateClock,remapCycleTime} from './game-clock.js';
import {validFurnace} from './furnace.js';
import {validAnimalState} from './animals.js';
import {animalSource,ANIMAL_LOOT} from './animal-data.js';
import {TREE_SEEDS,seedType} from './tree-seeds.js';
import {plantedTree,plantRecord} from './planting.js';
import {rockMaxHealth} from './resources.js';
import {waterAt} from './biomes.js';
import {DEATH_LOOT_SECONDS} from './death-loot.js';

export const SAVE_KEY=worldSaveKey(),BACKUP_KEY=SAVE_KEY+'.backup',OWNER_KEY=SAVE_KEY+'.owner';
const worldId=`${WORLD.seed}:${WORLD.size}:${WORLD.generation}`;
const number=(value,min=0,max=1e12)=>Number.isFinite(value)&&value>=min&&value<=max;
const integer=(value,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
const coordinate=point=>point&&number(point.x,-WORLD.size/2-3,WORLD.size/2+3)&&number(point.y,-WORLD.size/2-3,WORLD.size/2+3);
const list=(value,max=100000)=>Array.isArray(value)&&value.length<=max;
const unique=values=>new Set(values).size===values.length;
function validInventory(data,capacity=INVENTORY) {
  if(!data||!createInventory(false,capacity).restore(data))return false;
  return [...data.hands,...data.slots].every(stack=>stack===null||Object.hasOwn(ITEMS,stack.type));
}
export function validateSaveState(state) {
  try {
    if(!coordinate(state?.position)||Math.abs(state.position.x)>WORLD.size/2-1||Math.abs(state.position.y)>WORLD.size/2-1||!coordinate(state.facing)||Math.abs(Math.hypot(state.facing.x,state.facing.y)-1)>1e-6||!validInventory(state.inventory))return null;
    const v=state.vitals,s=state.stamina,c=state.clock;
    if(!v||!number(v.hunger,0,SURVIVAL.maxHunger)||!Number.isInteger(v.hunger*2)||!integer(v.health,0,SURVIVAL.maxHealth)||!number(v.hungerProgress,0,1)||!number(v.starvationProgress,0,1))return null;
    if(v.regenerationProgress!==undefined&&!number(v.regenerationProgress,0,1))return null;
    const staminaMaximum=s?.maximum??10;
    if(!s||![10,SPRINT.duration].includes(staminaMaximum)||!number(s.energy,0,staminaMaximum)||!number(s.recoveryDelay,0,Math.max(1.2,SPRINT.rechargeDelay))||typeof s.exhausted!=='boolean'||!number(s.breathRemaining,0,SPRINT.exhaustionDuration))return null;
    const durations=savedPhaseSeconds(c),savedCycle=durations?Object.values(durations).reduce((sum,n)=>sum+n,0):0;
    if(!c||!durations||!number(c.seconds)||!(c.sleep===null||typeof c.sleep==='object'))return null;
    if(c.sleep) {
      const p=c.sleep,t=p.elapsed/CAMP.sleepSeconds,expected=p.from+(p.to-p.from)*t*t*(3-2*t);
      if(p.wake!==undefined&&!coordinate(p.wake)||p.tentId!==undefined&&p.tentId!==null&&typeof p.tentId!=='string')return null;
      if(!number(p.from,0,c.seconds)||!number(p.to,c.seconds)||!number(p.elapsed,0,CAMP.sleepSeconds)||p.to!==(Math.floor(p.from/savedCycle)+1)*savedCycle||Math.abs(expected-c.seconds)>1e-5)return null;
    }
    const discovery=state.discovery,cells=Math.ceil(WORLD.size/EXPLORATION.cellSize)**2;
    if(discovery?.size!==WORLD.size||discovery.cell!==EXPLORATION.cellSize||!decodeDiscovery(discovery.encoding?discovery:discovery.bits,cells))return null;
    const resources=state.world?.resources,structures=state.world?.structures;
    const animals=state.world?.animals??[];
    if(!list(animals,20000)||!unique(animals.map(animal=>animal?.id))||!animals.every(validAnimalState))return null;
    if(!resources||!integer(resources.harvestSequence)||!integer(resources.demolitionSequence??0)||!list(resources.trees)||!list(resources.drops)||!list(resources.gathered)||!structures||!integer(structures.serial)||!list(structures.objects,10000))return null;
    const deathLoot=resources.deathLoot===undefined?{serial:0,graves:[]}:resources.deathLoot;
    if(!deathLoot||!integer(deathLoot.serial,0,1e9)||!list(deathLoot.graves,10000)||!unique(deathLoot.graves.map(grave=>grave?.id)))return null;
    for(const grave of deathLoot.graves) {
      const match=typeof grave?.id==='string'?/^grave:([1-9]\d*)$/.exec(grave.id):null;
      if(!match||!integer(Number(match[1]),1,deathLoot.serial)||!coordinate(grave)||Math.abs(grave.x)>WORLD.size/2-1||Math.abs(grave.y)>WORLD.size/2-1||!number(grave.createdAt,0,c.seconds)||!number(grave.remaining,Number.MIN_VALUE,DEATH_LOOT_SECONDS)||!list(grave.items,INVENTORY.hands+INVENTORY.slots)||!grave.items.length||!unique(grave.items.map(stack=>stack?.type)))return null;
      if(!grave.items.every(stack=>stack&&Object.hasOwn(ITEMS,stack.type)&&integer(stack.count,1,INVENTORY.stackLimit)))return null;
    }
    const savedNightStarts=durations.day+durations.evening,latestNight=Math.floor((c.seconds-savedNightStarts)/savedCycle);
    if(resources.forageNight!==undefined&&!integer(resources.forageNight,-1,latestNight))return null;
    if(structures.version!==undefined&&structures.version!==2||structures.home!==undefined&&!coordinate(structures.home))return null;
    const chunks=new Map(),forage=new Map();
    const scenery=(cx,cy)=>{const key=cx+':'+cy;if(!chunks.has(key))chunks.set(key,chunkObjects(cx,cy));return chunks.get(key);};
    const plants=new Map(),rockStates=new Map(),plantSerial=resources.plantSerial??0;
    if(!integer(plantSerial,0,100000)||!integer(resources.seedCountdown??1,1,2)||!list(resources.plants??[],10000)||!list(resources.rocks??[])||!unique((resources.plants??[]).map(p=>p?.id)))return null;
    for(const record of resources.plants??[]) {
      const match=typeof record?.id==='string'?/^planted:([1-9]\d*)$/.exec(record.id):null;
      if(!match||!integer(Number(match[1]),1,plantSerial)||!Object.hasOwn(TREE_SEEDS,record.kind)||!coordinate(record)||Math.abs(record.x)>WORLD.size/2-2||Math.abs(record.y)>WORLD.size/2-2||waterAt(record.x,record.y)||!integer(record.variant,0,WORLD.treeVariants-1)||!number(record.plantedAt,0,c.seconds)||record.growsAt!==(Math.floor(record.plantedAt/savedCycle)+1)*savedCycle||typeof record.grown!=='boolean'||record.grown&&record.growsAt>c.seconds)return null;
      plants.set(record.id,plantedTree(plantRecord(record)));
    }
    const naturalFor=(id,type)=>{
      if(typeof id!=='string')return null;
      const match=new RegExp('^'+type+':(-?\\d+\\.\\d{6}):(-?\\d+\\.\\d{6})$').exec(id);if(!match)return null;
      const point={x:Number(match[1]),y:Number(match[2])};if(!coordinate(point))return null;
      return scenery(Math.floor(point.x/WORLD.chunkSize),Math.floor(point.y/WORLD.chunkSize)).find(object=>object.id===id&&object.type===type)??null;
    };
    for(const entry of resources.rocks??[]) {
      if(!Array.isArray(entry)||entry.length!==2)return null;
      const [id,data]=entry,rock=naturalFor(id,'rock');
      if(!rock||rockStates.has(id)||!data||!integer(data.health,0,rockMaxHealth(rock))||!number(data.hitAt,0,c.seconds)||typeof data.broken!=='boolean'||data.broken!==(data.health===0)||data.broken&&!(integer(data.stoneYield,2,3)||rock.mineral==='coal'&&integer(data.coalYield,1,2)))return null;
      rockStates.set(id,data);
    }
    const treeFor=id=>{
      const plant=plants.get(id);return plant?(plant.grown?plant:null):naturalFor(id,'tree');
    };
    if(!resources.trees.every(entry=>Array.isArray(entry)&&entry.length===2)||!unique(resources.trees.map(([id])=>id))||!unique(resources.drops.map(drop=>drop?.id))||!resources.gathered.every(entry=>Array.isArray(entry)&&entry.length===2)||!unique(resources.gathered.map(([id])=>id)))return null;
    const trees=[];
    for(const [id,data] of resources.trees) {
      const tree=treeFor(id);if(!tree||!data||!integer(data.health,0,10)||!number(data.hitAt,0,c.seconds)||typeof data.felled!=='boolean'||typeof data.dropped!=='boolean')return null;
      if(data.felled) {
        if(data.health!==0||!number(data.fallAt,0,c.seconds)||!number(data.regrowAt,data.fallAt)||!integer(data.harvest,1,resources.harvestSequence)||!integer(data.appleYield,0,2)||![-1,1].includes(data.fallDirection))return null;
        if(data.cherryYield!==undefined&&(!integer(data.cherryYield,0,4)||data.cherryYield>0&&tree.kind!=='cherry'))return null;
        if(data.seedYield!==undefined&&!integer(data.seedYield,0,1))return null;
        trees.push([id,{...data,tree}]);
      } else {
        if(data.health===0||data.dropped)return null;
        trees.push([id,{...data}]);
      }
    }
    for(const drop of resources.drops) {
      const stone=typeof drop?.id==='string'?/^(rock:-?\d+\.\d{6}:-?\d+\.\d{6}):loot:(stone|coal):([0-2])$/.exec(drop.id):null;
      if(stone) {
        const rock=rockStates.get(stone[1]);
        const amount=stone[2]==='coal'?rock?.coalYield:rock?.stoneYield;
        if(!rock?.broken||!Number.isInteger(amount)||Number(stone[3])>=amount||drop.type!==stone[2]||drop.count!==1||!coordinate(drop)||!number(drop.createdAt,0,c.seconds))return null;
        continue;
      }
      const building=typeof drop?.id==='string'?/^demolition:(\d+):([a-z-]+):(\d+):(\d+)$/.exec(drop.id):null;
      if(building) {
        const [,sequence,type,serial,index]=building;
        if(!Object.hasOwn(STRUCTURES,type)||!integer(Number(sequence),1,resources.demolitionSequence??0)||!integer(Number(serial),type==='tent'?0:1,structures.serial)||!integer(Number(index),0,type==='chest'?15:type==='furnace'?4:0)||!Object.hasOwn(ITEMS,drop.type)||Number(index)===0&&drop.type!==type||!integer(drop.count,1,INVENTORY.stackLimit)||!coordinate(drop)||!number(drop.createdAt,0,c.seconds))return null;
        continue;
      }
      const meat=typeof drop?.id==='string'?/^(animal:(cow|chicken|pig):-?\d+:-?\d+):loot:(raw-steak|raw-drumstick|raw-bacon)$/.exec(drop.id):null;
      if(meat) {
        const source=animalSource(meat[1]),loot=source&&ANIMAL_LOOT[source.kind];
        if(!loot||drop.type!==loot.type||meat[3]!==loot.type||!integer(drop.count,loot.min,loot.max)||!coordinate(drop)||!number(drop.createdAt,0,c.seconds)||!animals.some(animal=>animal.id===meat[1]&&animal.health===0))return null;
        continue;
      }
      const match=typeof drop?.id==='string'?/^((?:tree:-?\d+\.\d{6}:-?\d+\.\d{6})|(?:planted:[1-9]\d*)):harvest:(\d+):(log|apple|cherry|seed):(\d+)$/.exec(drop.id):null;
      const source=match?treeFor(match[1]):null;
      if(!match||!source||drop.type==='cherry'&&(source.kind!=='cherry'||!integer(Number(match[4]),0,3))||!integer(Number(match[2]),1,resources.harvestSequence)||drop.type!==(match[3]==='seed'?seedType(source.kind):match[3])||match[3]==='seed'&&Number(match[4])!==0||drop.count!==1||!coordinate(drop)||!number(drop.createdAt,0,c.seconds))return null;
    }
    for(const [id,count] of resources.gathered) {
      const match=typeof id==='string'?/^forage:(looseStone|fiberBush):(-?\d+):(-?\d+)$/.exec(id):null;
      if(!match||!integer(count,0,2))return null;
      const ix=Number(match[2]),iy=Number(match[3]);if(!integer(ix,-WORLD.size/4,WORLD.size/4)||!integer(iy,-WORLD.size/4,WORLD.size/4))return null;
      const cx=Math.floor(ix*4/WORLD.chunkSize),cy=Math.floor(iy*4/WORLD.chunkSize),key=cx+':'+cy;
      if(!forage.has(key))forage.set(key,chunkForage(cx,cy,scenery(cx,cy)));
      const source=forage.get(key).find(object=>object.id===id);if(!source||count>source.count)return null;
    }
    if(!unique(structures.objects.map(object=>object?.id)))return null;
    for(const object of structures.objects) {
      if(!object||!Object.hasOwn(STRUCTURES,object.type)||!coordinate(object)||!integer(object.rotation,0,3))return null;
      const match=new RegExp('^'+object.type+':(\\d+)$').exec(object.id);if(!match||!integer(Number(match[1]),object.type==='tent'?0:1,structures.serial))return null;
      const center=structureCenter(object),spec=structureSpec(object.type,object.rotation);
      if(Math.abs(center.x)>WORLD.size/2-spec.rx||Math.abs(center.y)>WORLD.size/2-spec.ry)return null;
      if(object.health!==undefined&&!integer(object.health,1,structureMaxHealth(object.type)))return null;
      if(object.type==='wood-door'&&typeof object.open!=='boolean')return null;
      if(object.type==='chest'&&!validInventory(object.storage,{slots:15,hands:0}))return null;
      if(object.type==='furnace'&&!validFurnace(object.furnace))return null;
      if(object.wallId!==undefined) {
        const host=structures.objects.find(wall=>wall.id===object.wallId);
        if(object.type!=='torch'||host?.type!=='wood-wall')return null;
        const c=structureCenter(host),s=structureSpec(host.type,host.rotation);
        if(Math.abs(object.x-c.x)>s.rx+.05||Math.abs(object.y-c.y)>s.ry+.05)return null;
      }
    }
    if(c.sleep?.tentId&&!structures.objects.some(object=>object.id===c.sleep.tentId&&object.type==='tent'))return null;
    const clock=migrateClock(c),offset=clock.seconds-c.seconds;
    const migratedPlants=[...plants.values()].map(plant=>({...plantRecord(plant),plantedAt:plant.plantedAt+offset,growsAt:remapCycleTime(plant.growsAt,durations)}));
    const migratedRocks=[...rockStates].map(([id,data])=>[id,{...data,hitAt:data.hitAt+offset}]);
    const migratedTrees=trees.map(([id,data])=>[id,{...data,hitAt:data.hitAt+offset,...(data.felled?{fallAt:data.fallAt+offset,regrowAt:remapCycleTime(data.regrowAt,durations)}:{})}]);
    const drops=resources.drops.map(drop=>({...drop,createdAt:drop.createdAt+offset}));
    // Old saves have no nightly marker: restore once if loaded at night, while
    // daytime loads retain their harvests until the coming night.
    const forageNight=resources.forageNight??latestNight-Number(c.seconds%savedCycle>=savedNightStarts);
    const inventory=createInventory(false,INVENTORY,state.inventory).serialize();
    const migratedDeathLoot={...deathLoot,graves:deathLoot.graves.map(grave=>({...grave,createdAt:grave.createdAt+offset,items:grave.items.map(stack=>({...stack}))}))};
    return {...state,inventory,clock,world:{...state.world,resources:{...resources,deathLoot:migratedDeathLoot,trees:migratedTrees,drops,forageNight,plants:migratedPlants,rocks:migratedRocks}}};
  }catch{return null;}
}
function checksum(text) {
  let value=2166136261;for(let i=0;i<text.length;i++)value=Math.imul(value^text.charCodeAt(i),16777619);
  return (value>>>0).toString(16);
}
export function encodeSave(state,sequence=1,savedAt=Date.now()) {
  const payload=JSON.stringify({version:1,worldId,sequence,savedAt,state});
  return JSON.stringify({format:'roots-save',payload,checksum:checksum(payload)});
}
export function decodeSave(raw) {
  try {
    if(typeof raw!=='string'||raw.length>8e6)return null;
    const envelope=JSON.parse(raw);if(envelope.format!=='roots-save'||typeof envelope.payload!=='string'||checksum(envelope.payload)!==envelope.checksum)return null;
    const data=JSON.parse(envelope.payload);if(data.version!==1||data.worldId!==worldId||!integer(data.sequence,1)||!number(data.savedAt,0,1e15))return null;
    const state=validateSaveState(data.state);return state?{...data,state}:null;
  }catch{return null;}
}
export function createSaveStore(providedStorage) {
  let storage=providedStorage,sequence=0,lastGood=null,blocked=false,disabled=false,claimed=false,lost=false,error=null;
  const token=globalThis.crypto?.randomUUID?.()??String(Date.now())+Math.random();
  try{storage??=globalThis.localStorage;}catch{}
  const current=()=>{try{return !claimed||storage?.getItem(OWNER_KEY)===token;}catch{return false;}};
  return {
    checkOwner(){if(claimed&&!current())lost=true;return !lost;},
    get error(){return error;},get token(){return token;},get superseded(){return lost;},
    observeOwner(value){if(claimed&&value&&value!==token)lost=true;},
    load() {
      try {
        if(!storage)throw Error('storage');
        const primary=storage.getItem(SAVE_KEY),backup=storage.getItem(BACKUP_KEY),a=decodeSave(primary),b=decodeSave(backup);
        const chosen=a&&(!b||a.sequence>=b.sequence)?{data:a,raw:primary}:{data:b,raw:backup};
        if(!chosen.data){if(primary||backup){blocked=true;error='unreadable';}return null;}
        sequence=chosen.data.sequence;lastGood=chosen.raw;if(chosen.raw!==primary)error='recovered';return chosen.data.state;
      }catch{error='unavailable';return null;}
    },
    claim(){try{if(storage&&!blocked){storage.setItem(OWNER_KEY,token);claimed=true;lost=false;return true;}}catch{error='unavailable';}return false;},
    save(state) {
      if(disabled||blocked||!storage)return false;
      if(!current()){lost=true;return false;}
      try {
        const raw=encodeSave(state,sequence+1);
        if(lastGood)try{storage.setItem(BACKUP_KEY,lastGood);}catch{}
        storage.setItem(SAVE_KEY,raw);sequence++;lastGood=raw;error=null;return true;
      }catch{error='unavailable';return false;}
    },
    reset(){disabled=true;try{storage?.removeItem(SAVE_KEY);storage?.removeItem(BACKUP_KEY);if(current())storage?.removeItem(OWNER_KEY);}catch{}},
  };
}
