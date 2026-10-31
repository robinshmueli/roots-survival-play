import {LEGACY_WORLD,WORLD_SIZES,DIFFICULTIES,validWorld,worldSaveKey} from './world-profile.js';
export const LIBRARY_KEY='roots-survival.worlds.v1';
export function createWorldLibrary(storage=globalThis.localStorage) {
  let worlds=[],error=null,blocked=false;
  function parse(raw) {try {const value=JSON.parse(raw);return value?.version===1&&Array.isArray(value.worlds)&&value.worlds.every(validWorld)&&new Set(value.worlds.map(w=>w.id)).size===value.worlds.length?value.worlds.map(world=>({...world,difficulty:world.difficulty??'normal'})):null;}catch{return null;}}
  function write(next) {
    if(blocked)return false;
    try {if(worlds.length)try{storage.setItem(LIBRARY_KEY+'.backup',JSON.stringify({version:1,worlds}));}catch{}
      storage.setItem(LIBRARY_KEY,JSON.stringify({version:1,worlds:next}));worlds=next;error=null;return true;
    }catch{error='לא ניתן לשמור בדפדפן כרגע. פנו מקום ונסו שוב.';return false;}
  }
  try {
    const raw=storage.getItem(LIBRARY_KEY),backup=storage.getItem(LIBRARY_KEY+'.backup');
    const loaded=parse(raw)??parse(backup);
    if(loaded)worlds=loaded;
    else if(raw||backup){blocked=true;error='לא ניתן לקרוא את רשימת העולמות. השמירות נשמרו ללא שינוי.';}
    if(!blocked&&!worlds.some(w=>w.id==='legacy')&&(storage.getItem(worldSaveKey(LEGACY_WORLD))||storage.getItem(worldSaveKey(LEGACY_WORLD)+'.backup'))) {
      let lastPlayed=0;try{lastPlayed=JSON.parse(JSON.parse(storage.getItem(worldSaveKey(LEGACY_WORLD))).payload).savedAt??0;if(!Number.isFinite(lastPlayed)||lastPlayed<0||lastPlayed>1e15)lastPlayed=0;}catch{}
      write([...worlds,{...LEGACY_WORLD,lastPlayed}]);
    }
  }catch{blocked=true;error='השמירה בדפדפן אינה זמינה כרגע.';}
  function refresh(){try{const latest=parse(storage.getItem(LIBRARY_KEY));if(latest)worlds=latest;}catch{}}
  return {
    get error(){return error;},
    list(){return worlds.map(world=>({...world})).sort((a,b)=>b.lastPlayed-a.lastPlayed||b.createdAt-a.createdAt);},
    create(name,sizeId,difficulty='normal') {
      const size=WORLD_SIZES.find(size=>size.id===sizeId),trimmed=String(name??'').trim();
      if(!size||!trimmed||trimmed.length>40||!DIFFICULTIES.some(option=>option.id===difficulty))return null;
      refresh();
      const bytes=new Uint32Array(1);globalThis.crypto.getRandomValues(bytes);
      const now=Date.now(),world={id:globalThis.crypto.randomUUID(),name:trimmed,size:size.size,sizeId,difficulty,seed:bytes[0]||1,generation:2,createdAt:now,lastPlayed:now};
      return write([...worlds,world])?world:null;
    },
    touch(id,metadata={}) {
      // Re-read so a save in another world/tab cannot erase a newly created world.
      refresh();
      if(!worlds.some(w=>w.id===id))return false;
      return write(worlds.map(world=>world.id===id?{...world,lastPlayed:Date.now(),...(Number.isSafeInteger(metadata.day)&&metadata.day>0?{day:metadata.day}:{})}:world));
    },
  };
}
