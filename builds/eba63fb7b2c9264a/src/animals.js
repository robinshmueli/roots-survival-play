import {WORLD} from './config.js';
import {cellSeed} from './biomes.js';
import {ANIMAL_TYPES,animalSource,animalEnabled} from './animal-data.js';

export function validAnimalState(record) {
  const source=animalSource(record?.id),spec=source&&ANIMAL_TYPES[source.kind];
  return !!spec&&Number.isFinite(record.x)&&Number.isFinite(record.y)&&Math.abs(record.x)<WORLD.size/2-1&&Math.abs(record.y)<WORLD.size/2-1&&Math.hypot(record.x-source.x,record.y-source.y)<34&&
    Number.isInteger(record.health)&&record.health>=0&&record.health<=spec.health&&
    [record.timer,record.attackWait,record.flee].every(n=>Number.isFinite(n)&&n>=0&&n<=10)&&
    Number.isSafeInteger(record.step)&&record.step>=0&&record.step<1e9&&
    Number.isFinite(record.dx)&&Number.isFinite(record.dy)&&Math.hypot(record.dx,record.dy)<=1.000001;
}
export function createAnimals(initial=[]) {
  const records=new Map(initial.map(r=>{const source=animalSource(r.id);return [r.id,{...source,...r,home:source,active:animalEnabled(source),moving:false,running:false}];}));
  let revision=0;
  return {
    records,
    get revision(){return revision;},
    active(){return [...records.values()].filter(animal=>animal.active);},
    serialize(){return [...records.values()].map(({id,x,y,health,timer,attackWait,flee,step,dx,dy})=>({id,x,y,health,timer,attackWait,flee,step,dx,dy}));},
    ensure(sources) {
      for(const source of sources)if(!records.has(source.id)){records.set(source.id,{...source,home:source,active:animalEnabled(source),health:ANIMAL_TYPES[source.kind].health,timer:0,attackWait:0,flee:0,step:0,dx:0,dy:-1,moving:false,running:false});revision++;}
    },
    hit(id,damage,direction) {
      const animal=records.get(id);if(!animal?.active||!animal.health||!Number.isFinite(damage)||damage<=0)return null;
      animal.health=Math.max(0,animal.health-Math.floor(damage));animal.flee=4;
      animal.dx=direction.x;animal.dy=direction.y;animal.timer=1;revision++;
      return {health:animal.health,killed:animal.health===0,animal:{id:animal.id,kind:animal.kind,x:animal.x,y:animal.y}};
    },
    update(dt,position,night,blocked) {
      const elapsed=Number.isFinite(dt)?Math.min(.1,Math.max(0,dt)):0;let damage=0;
      for(const animal of records.values()) {
        animal.moving=false;animal.running=false;animal.hostile=animal.active&&night;
        if(!animal.active||!animal.health||Math.hypot(animal.x-position.x,animal.y-position.y)>70||!elapsed)continue;
        const spec=ANIMAL_TYPES[animal.kind],distance=Math.hypot(position.x-animal.x,position.y-animal.y);
        animal.attackWait=Math.max(0,animal.attackWait-elapsed);animal.flee=Math.max(0,animal.flee-elapsed);animal.timer=Math.max(0,animal.timer-elapsed);
        const homeGap=Math.hypot(animal.x-animal.home.x,animal.y-animal.home.y),chase=night&&distance<16&&homeGap<28;
        let dx=animal.dx,dy=animal.dy,walking=true;
        if(chase) {
          dx=(position.x-animal.x)/(distance||1);dy=(position.y-animal.y)/(distance||1);animal.running=true;
          if(distance<spec.reach) {
            walking=false;
            // A wall or closed door between the animal and player stops a bite.
            const clear=[.2,.4,.6,.8].every(t=>!blocked(animal.x+(position.x-animal.x)*t,animal.y+(position.y-animal.y)*t,.12));
            if(!animal.attackWait&&clear){damage+=spec.damage;animal.attackWait=1.25;}
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
