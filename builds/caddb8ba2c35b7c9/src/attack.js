import { HARVEST } from './config.js';

export function createAttack() {
  let nextSwing=0,swing=null;
  return {
    cancel() { swing=null; },
    update(seconds, requested, direction, enabled, onImpact) {
      if(!enabled){swing=null;return null;}
      if(swing) {
        const length=Math.hypot(direction.x,direction.y)||1;
        swing.direction={x:direction.x/length,y:direction.y/length};
      }
      if(swing && !swing.hit && seconds-swing.started>=HARVEST.impactTime) {
        swing.hit=true; onImpact(swing.direction);
      }
      if(swing && seconds-swing.started>=HARVEST.swingTime)swing=null;
      if(requested && !swing && seconds+1e-9>=nextSwing) {
        const length=Math.hypot(direction.x,direction.y)||1;
        swing={started:seconds,direction:{x:direction.x/length,y:direction.y/length},hit:false};
        nextSwing=seconds+HARVEST.cooldown;
      }
      return swing?{progress:Math.min(1,(seconds-swing.started)/HARVEST.swingTime),direction:swing.direction}:null;
    },
  };
}
