import {WORLD} from './config.js';
import {cellSeed} from './biomes.js';
import {ANIMAL_TYPES,animalSource,animalEnabled} from './animal-data.js';
import {ANIMAL_BITE,biteTiming} from './animal-bite.js';

export function validAnimalState(record) {
  const source=animalSource(record?.id),spec=source&&ANIMAL_TYPES[source.kind];
  const timing=biteTiming(record?.bite);
  return !!spec&&Number.isFinite(record.x)&&Number.isFinite(record.y)&&Math.abs(record.x)<WORLD.size/2-1&&Math.abs(record.y)<WORLD.size/2-1&&Math.hypot(record.x-source.x,record.y-source.y)<34&&
    Number.isInteger(record.health)&&record.health>=0&&record.health<=spec.health&&
    [record.timer,record.attackWait,record.flee].every(n=>Number.isFinite(n)&&n>=0&&n<=10)&&
    Number.isSafeInteger(record.step)&&record.step>=0&&record.step<1e9&&
    Number.isFinite(record.dx)&&Number.isFinite(record.dy)&&Math.hypot(record.dx,record.dy)<=1.000001&&
    (record.bite==null||record.health>0&&(record.bite.version===undefined||[1,2].includes(record.bite.version))&&Number.isFinite(record.bite.elapsed)&&record.bite.elapsed>=0&&record.bite.elapsed<timing.duration&&
      Number.isFinite(record.bite.dx)&&Number.isFinite(record.bite.dy)&&Math.abs(Math.hypot(record.bite.dx,record.bite.dy)-1)<1e-6&&typeof record.bite.hit==='boolean'&&record.bite.hit===(record.bite.elapsed+1e-9>=timing.strikeAt));
}
export function createAnimals(initial=[]) {
  const records=new Map(initial.map(r=>{const source=animalSource(r.id);return [r.id,{...source,...r,bite:r.bite?{...r.bite}:null,home:source,active:animalEnabled(source),moving:false,running:false}];}));
  let revision=0;
  return {
    records,
    get revision(){return revision;},
    active(){return [...records.values()].filter(animal=>animal.active);},
    serialize(){return [...records.values()].map(({id,x,y,health,timer,attackWait,flee,step,dx,dy,bite})=>({id,x,y,health,timer,attackWait,flee,step,dx,dy,bite:bite?{...bite}:null}));},
    ensure(sources) {
      for(const source of sources)if(!records.has(source.id)){records.set(source.id,{...source,home:source,active:animalEnabled(source),health:ANIMAL_TYPES[source.kind].health,timer:0,attackWait:0,flee:0,step:0,dx:0,dy:-1,bite:null,moving:false,running:false});revision++;}
    },
    hit(id,damage,direction) {
      const animal=records.get(id);if(!animal?.active||!animal.health||!Number.isFinite(damage)||damage<=0)return null;
      animal.health=Math.max(0,animal.health-Math.floor(damage));animal.flee=4;
      if(!animal.health)animal.bite=null;
      animal.dx=direction.x;animal.dy=direction.y;animal.timer=1;revision++;
      return {health:animal.health,killed:animal.health===0,animal:{id:animal.id,kind:animal.kind,x:animal.x,y:animal.y}};
    },
    update(dt,position,night,blocked) {
      const elapsed=Number.isFinite(dt)?Math.min(.1,Math.max(0,dt)):0;let damage=0;
      for(const animal of records.values()) {
        animal.moving=false;animal.running=false;animal.hostile=animal.active&&(night||animal.kind==='wolf');animal.redEyes=animal.active&&night;
        if(!animal.hostile&&animal.bite){animal.bite=null;revision++;}
        if(!animal.active||!animal.health||Math.hypot(animal.x-position.x,animal.y-position.y)>70||!elapsed)continue;
        const spec=ANIMAL_TYPES[animal.kind],distance=Math.hypot(position.x-animal.x,position.y-animal.y);
        animal.attackWait=Math.max(0,animal.attackWait-elapsed);animal.flee=Math.max(0,animal.flee-elapsed);animal.timer=Math.max(0,animal.timer-elapsed);
        const clearBite=()=>[.2,.4,.6,.8].every(t=>!blocked(animal.x+(position.x-animal.x)*t,animal.y+(position.y-animal.y)*t,.12));
        if(animal.bite) {
          const bite=animal.bite,timing=biteTiming(bite);bite.elapsed=Math.min(timing.duration,bite.elapsed+elapsed);animal.dx=bite.dx;animal.dy=bite.dy;
          if(!bite.hit&&bite.elapsed+1e-9>=timing.strikeAt) {
            bite.hit=true;animal.attackWait=timing.cooldown;
            const dot=distance?((position.x-animal.x)*bite.dx+(position.y-animal.y)*bite.dy)/distance:1;
            if(distance<=spec.reach+timing.lunge&&dot>=.2&&clearBite())damage+=spec.damage;
          }
          if(bite.elapsed+1e-9>=timing.duration)animal.bite=null;
          revision++;continue;
        }
        const homeGap=Math.hypot(animal.x-animal.home.x,animal.y-animal.home.y),chase=animal.hostile&&distance<16&&homeGap<28;
        let dx=animal.dx,dy=animal.dy,walking=true;
        if(chase) {
          dx=(position.x-animal.x)/(distance||1);dy=(position.y-animal.y)/(distance||1);animal.running=true;
          if(distance<spec.reach) {
            walking=false;
            // Lock the direction and visibly prepare before damage can land.
            // Recheck range, direction and walls at the actual contact frame.
            if(!animal.attackWait&&clearBite())animal.bite={version:ANIMAL_BITE.version,elapsed:0,dx:distance?dx:0,dy:distance?dy:-1,hit:false};
          }
        } else if(animal.flee>0&&distance<10) {
          dx=(animal.x-position.x)/(distance||1);dy=(animal.y-position.y)/(distance||1);animal.running=true;
        } else {
          if(!animal.timer) {
            const seed=cellSeed(Math.round(animal.home.x),Math.round(animal.home.y),++animal.step*1973),angle=(seed/4294967296)*Math.PI*2;
            animal.dx=Math.cos(angle);animal.dy=Math.sin(angle);animal.timer=1.2+(seed%190)/100;
            animal.idle=seed%4===0;
          }
          dx=animal.dx;dy=animal.dy;walking=!animal.idle;
        }
        if(homeGap>12&&!chase&&!(animal.flee>0&&homeGap<25)||homeGap>29) {
          dx=(animal.home.x-animal.x)/(homeGap||1);dy=(animal.home.y-animal.y)/(homeGap||1);walking=true;
        }
        animal.dx=dx;animal.dy=dy;
        if(walking) {
          const step=(animal.running?spec.run:spec.walk)*elapsed,nx=animal.x+dx*step,ny=animal.y+dy*step;
          const safe=(x,y)=>Math.abs(x)<WORLD.size/2-spec.radius-1&&Math.abs(y)<WORLD.size/2-spec.radius-1&&!blocked(x,y,spec.radius);
          if(Math.abs(dx)>1e-6&&safe(nx,animal.y)){animal.x=nx;animal.moving=true;}
          if(Math.abs(dy)>1e-6&&safe(animal.x,ny)){animal.y=ny;animal.moving=true;}
          if(!animal.moving){animal.timer=0;animal.running=false;}
        }
        revision++;
      }
      return damage;
    },
  };
}
