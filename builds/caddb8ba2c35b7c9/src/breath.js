import {makeCanvas,texture,sprite,ellipse,rect} from './art.js';

const interval=.6,lifetime=.55;
export function createBreath(scene,lighting) {
  const [canvas,ctx]=makeCanvas(16,10);
  ellipse(ctx,5,6,4,3,'#c1d8df70');ellipse(ctx,9,4,4,3,'#e3eee9e0');
  ellipse(ctx,12,6,3,2,'#d7e8e7c0');rect(ctx,5,3,3,2,'#f3f5e8c0');
  const map=texture(canvas),puffs=[];
  for(let i=0;i<4;i++) {
    const mesh=sprite(map,.75,.45);mesh.name='exhaustion-breath';mesh.visible=false;
    scene.add(mesh);lighting?.surface(mesh);puffs.push({mesh,age:lifetime});
  }
  let lastCycle=-1,previous=null;
  return {
    update(position,mouth,direction,dt,elapsed=null) {
      const dx=previous?position.x-previous.x:0,dy=previous?position.y-previous.y:0;
      previous={x:position.x,y:position.y};
      if(elapsed!==null) {
        const cycle=Math.floor((elapsed+1e-8)/interval);
        if(cycle!==lastCycle) {
          const puff=puffs.find(p=>p.age>=lifetime)??puffs[0],length=Math.hypot(direction.x,direction.y)||1;
          puff.age=0;puff.x=mouth.x+direction.x/length*.06;puff.y=mouth.y+direction.y/length*.06;
          puff.vx=direction.x/length*.95;puff.vy=direction.y/length*.95+.45;
          puff.mesh.position.z=10-position.y*.01+.006;puff.mesh.visible=true;
          lastCycle=cycle;
        }
      } else lastCycle=-1;
      for(const puff of puffs) {
        if(puff.age>=lifetime){puff.mesh.visible=false;continue;}
        const newborn=puff.age===0;
        puff.age+=Math.max(0,dt);
        puff.x+=puff.vx*dt+(!newborn&&Math.abs(dx)<1?dx:0);
        puff.y+=puff.vy*dt+(!newborn&&Math.abs(dy)<1?dy:0);
        const life=Math.min(1,puff.age/lifetime),size=.45+life*.75;
        puff.mesh.position.x=Math.round(puff.x*32)/32;puff.mesh.position.y=Math.round(puff.y*32)/32;
        puff.mesh.scale.set(size,size,1);
        puff.mesh.material.opacity=Math.min(1,puff.age/.07)*(1-life)*.82;
        puff.mesh.visible=puff.age<lifetime;
      }
    },
    dispose() {
      for(const {mesh} of puffs){lighting?.remove(mesh);mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();}
      map.dispose();
    },
  };
}
