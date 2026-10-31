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
import {animalSource} from './animal-data.js';

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
    if(!v||!integer(v.hunger,0,SURVIVAL.maxHunger)||!integer(v.health,0,SURVIVAL.maxHealth)||!number(v.hungerProgress,0,1)||!number(v.starvationProgress,0,1))return null;
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
    const savedNightStarts=durations.day+durations.evening,latestNight=Math.floor((c.seconds-savedNightStarts)/savedCycle);
    if(resources.forageNight!==undefined&&!integer(resources.forageNight,-1,latestNight))return null;
    if(structures.version!==undefined&&structures.version!==2||structures.home!==undefined&&!coordinate(structures.home))return null;
    const chunks=new Map(),forage=new Map();
    const scenery=(cx,cy)=>{const key=cx+':'+cy;if(!chunks.has(key))chunks.set(key,chunkObjects(cx,cy));return chunks.get(key);};
    const treeFor=id=>{
      if(typeof id!=='string')return null;
      const match=/^tree:(-?\d+\.\d{6}):(-?\d+\.\d{6})$/.exec(id);if(!match)return null;
      const point={x:Number(match[1]),y:Number(match[2])};if(!coordinate(point))return null;
      return scenery(Math.floor(point.x/WORLD.chunkSize),Math.floor(point.y/WORLD.chunkSize)).find(object=>object.id===id&&object.type==='tree')??null;
    };
    if(!resources.trees.every(entry=>Array.isArray(entry)&&entry.length===2)||!unique(resources.trees.map(([id])=>id))||!unique(resources.drops.map(drop=>drop?.id))||!resources.gathered.every(entry=>Array.isArray(entry)&&entry.length===2)||!unique(resources.gathered.map(([id])=>id)))return null;
    const trees=[];
    for(const [id,data] of resources.trees) {
      const tree=treeFor(id);if(!tree||!data||!integer(data.health,0,10)||!number(data.hitAt,0,c.seconds)||typeof data.felled!=='boolean'||typeof data.dropped!=='boolean')return null;
      if(data.felled) {
        if(data.health!==0||!number(data.fallAt,0,c.seconds)||!number(data.regrowAt,data.fallAt)||!integer(data.harvest,1,resources.harvestSequence)||!integer(data.appleYield,0,2)||![-1,1].includes(data.fallDirection))return null;
        if(data.cherryYield!==undefined&&(!integer(data.cherryYield,0,4)||data.cherryYield>0&&tree.kind!=='cherry'))return null;
        trees.push([id,{...data,tree}]);
      } else {
        if(data.health===0||data.dropped)return null;
        trees.push([id,{...data}]);
      }
    }
    for(const drop of resources.drops) {
      const building=typeof drop?.id==='string'?/^demolition:(\d+):([a-z-]+):(\d+):(\d+)$/.exec(drop.id):null;
      if(building) {
        const [,sequence,type,serial,index]=building;
        if(!Object.hasOwn(STRUCTURES,type)||!integer(Number(sequence),1,resources.demolitionSequence??0)||!integer(Number(serial),type==='tent'?0:1,structures.serial)||!integer(Number(index),0,type==='chest'?15:type==='furnace'?3:0)||!Object.hasOwn(ITEMS,drop.type)||Number(index)===0&&drop.type!==type||!integer(drop.count,1,INVENTORY.stackLimit)||!coordinate(drop)||!number(drop.createdAt,0,c.seconds))return null;
        continue;
      }
      const meat=typeof drop?.id==='string'?/^(animal:(cow|chicken):-?\d+:-?\d+):loot:(raw-steak|raw-drumstick)$/.exec(drop.id):null;
      if(meat) {
        const source=animalSource(meat[1]),type=meat[2]==='cow'?'raw-steak':'raw-drumstick';
        if(!source||drop.type!==type||meat[3]!==type||!integer(drop.count,meat[2]==='cow'?1:2,2)||!coordinate(drop)||!number(drop.createdAt,0,c.seconds)||!animals.some(animal=>animal.id===meat[1]&&animal.health===0))return null;
        continue;
      }
      const match=typeof drop?.id==='string'?/^(tree:-?\d+\.\d{6}:-?\d+\.\d{6}):harvest:(\d+):(log|apple|cherry):(\d+)$/.exec(drop.id):null;
      if(!match||!treeFor(match[1])||drop.type==='cherry'&&(treeFor(match[1]).kind!=='cherry'||!integer(Number(match[4]),0,3))||!integer(Number(match[2]),1,resources.harvestSequence)||drop.type!==match[3]||drop.count!==1||!coordinate(drop)||!number(drop.createdAt,0,c.seconds))return null;
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
    }
    if(c.sleep?.tentId&&!structures.objects.some(object=>object.id===c.sleep.tentId&&object.type==='tent'))return null;
    const clock=migrateClock(c),offset=clock.seconds-c.seconds;
    const migratedTrees=trees.map(([id,data])=>[id,{...data,hitAt:data.hitAt+offset,...(data.felled?{fallAt:data.fallAt+offset,regrowAt:remapCycleTime(data.regrowAt,durations)}:{})}]);
    const drops=resources.drops.map(drop=>({...drop,createdAt:drop.createdAt+offset}));
    // Old saves have no nightly marker: restore once if loaded at night, while
    // daytime loads retain their harvests until the coming night.
    const forageNight=resources.forageNight??latestNight-Number(c.seconds%savedCycle>=savedNightStarts);
    return {...state,clock,world:{...state.world,resources:{...resources,trees:migratedTrees,drops,forageNight}}};
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
