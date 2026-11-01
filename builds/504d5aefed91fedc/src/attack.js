import { COMBAT_TOOLS } from './config.js';

export function createAttack() {
  let nextSwing=0,swing=null;
  return {
    cancel() { swing=null; },
    update(seconds, requested, direction, enabled, onImpact,tool='stone') {
      const settings=COMBAT_TOOLS[tool];
      if(!enabled||!settings){swing=null;return null;}
      if(swing?.tool!==tool)swing=null;
      if(swing) {
        const length=Math.hypot(direction.x,direction.y)||1;
        swing.direction={x:direction.x/length,y:direction.y/length};
      }
      if(swing && !swing.hit && seconds-swing.started>=settings.impactTime) {
        swing.hit=true; onImpact(swing.direction,swing.tool);
      }
      if(swing && seconds-swing.started>=settings.swingTime)swing=null;
      if(requested && !swing && seconds+1e-9>=nextSwing) {
        const length=Math.hypot(direction.x,direction.y)||1;
        swing={started:seconds,direction:{x:direction.x/length,y:direction.y/length},hit:false,tool};
        nextSwing=seconds+settings.cooldown;
      }
      return swing?{progress:Math.min(1,(seconds-swing.started)/settings.swingTime),direction:swing.direction}:null;
    },
  };
}
