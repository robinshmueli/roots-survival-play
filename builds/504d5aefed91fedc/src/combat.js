import {COMBAT_TOOLS,HARVEST,SPEAR_CHARGE} from './config.js';

export const combatReach=tool=>COMBAT_TOOLS[tool]?.reach??HARVEST.reach+.25;
export function weaponContact(position,direction,target,tool,blocked=()=>false) {
  const dx=target.x-position.x,dy=target.y-position.y,distance=Math.hypot(dx,dy),length=Math.hypot(direction.x,direction.y);
  if(!length||distance>combatReach(tool)+1e-9)return false;
  const x=direction.x/length,y=direction.y/length,along=dx*x+dy*y;
  if(tool==='spear') {
    if(along<0||Math.abs(dx*y-dy*x)>(target.radius??.3)+SPEAR_CHARGE.halfWidth)return false;
  } else if(distance&&along/distance<.1)return false;
  // Sample the full path; long weapons cannot reach through walls or scenery.
  const steps=Math.max(1,Math.ceil(distance/.12));
  for(let i=1;i<steps;i++)if(blocked(position.x+dx*i/steps,position.y+dy*i/steps,.06))return false;
  return true;
}
export function sweptSpearContact(from,to,direction,target,blocked=()=>false) {
  const distance=Math.hypot(to.x-from.x,to.y-from.y),steps=Math.max(1,Math.ceil(distance/.15));
  for(let i=0;i<=steps;i++)if(weaponContact({x:from.x+(to.x-from.x)*i/steps,y:from.y+(to.y-from.y)*i/steps},direction,target,'spear',blocked))return true;
  return false;
}

export function createSpearCharge() {
  let elapsed=0;const hit=new Set();
  return {
    cancel(){elapsed=0;hit.clear();},
    update(dt,{enabled,held,sprinting,distance,direction,movementDirection}) {
      if(!enabled||!held){this.cancel();return {held:false,braced:false,charging:false,progress:0};}
      const seconds=Number.isFinite(dt)?Math.max(0,dt):0;elapsed=Math.min(SPEAR_CHARGE.holdTime,elapsed+seconds);
      const length=Math.hypot(direction.x,direction.y),motionLength=Math.hypot(movementDirection.x,movementDirection.y),alignment=length&&motionLength?(direction.x*movementDirection.x+direction.y*movementDirection.y)/length/motionLength:0;
      const braced=elapsed+1e-9>=SPEAR_CHARGE.holdTime,charging=braced&&sprinting&&seconds>0&&distance/seconds>=SPEAR_CHARGE.minSpeed&&alignment>=SPEAR_CHARGE.minAlignment;
      return {held:true,braced,charging,progress:elapsed/SPEAR_CHARGE.holdTime};
    },
    registerHit(id){if(hit.has(id))return false;hit.add(id);return true;},
  };
}
