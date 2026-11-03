export const DEATH_LOOT_SECONDS=180;
export const recoveryTime=remaining=>{const seconds=Math.max(0,Math.ceil(remaining));return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;};

export function createDeathLoot(initial=null) {
  let serial=initial?.serial??0,revision=0,mapRevision=0;
  const graves=new Map((initial?.graves??[]).map(grave=>[grave.id,{...grave,items:grave.items.map(stack=>({...stack}))}]));
  const changed=()=>{revision++;mapRevision++;};
  return {
    graves,
    get revision(){return revision;},get mapRevision(){return mapRevision;},
    serialize(){return {serial,graves:[...graves.values()].map(grave=>({...grave,items:grave.items.map(stack=>({...stack}))}))};},
    drop(position,inventory,seconds) {
      if(!position||![position.x,position.y,seconds].every(Number.isFinite)||seconds<0)return null;
      const items=inventory.drain();if(!items.length)return null;
      const grave={id:`grave:${++serial}`,x:position.x,y:position.y,createdAt:seconds,remaining:DEATH_LOOT_SECONDS,items};
      graves.set(grave.id,grave);changed();return grave;
    },
    update(dt=0) {
      if(!Number.isFinite(dt)||dt<=0)return [];
      const expired=[];
      for(const [id,grave] of graves) {
        const before=Math.ceil(grave.remaining);grave.remaining=Math.max(0,grave.remaining-dt);revision++;
        if(grave.remaining<=1e-9){expired.push(id);graves.delete(id);mapRevision++;}
        else if(Math.ceil(grave.remaining)!==before)mapRevision++;
      }
      return expired;
    },
    nearest(position,reach) {
      let nearest=null,distance=reach;
      for(const grave of graves.values()) {
        const gap=Math.hypot(grave.x-position.x,grave.y-position.y);
        if(grave.remaining>0&&gap<=distance){nearest={...grave,...grave.items[0],source:'death',graveId:grave.id};distance=gap;}
      }
      return nearest;
    },
    collect(id,inventory) {
      const grave=graves.get(id);if(!grave||grave.remaining<=0)return {collected:0,full:false,type:null,recovery:true};
      let collected=0,type=grave.items[0]?.type;
      for(const stack of grave.items) {const count=inventory.add(stack.type,stack.count);if(count&&!collected)type=stack.type;collected+=count;stack.count-=count;}
      grave.items=grave.items.filter(stack=>stack.count>0);const full=grave.items.length>0;
      if(!full)graves.delete(id);if(collected)changed();
      return {collected,type,full,recovery:true};
    },
  };
}
