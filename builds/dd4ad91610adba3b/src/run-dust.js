import {makeCanvas,texture,sprite,ellipse} from './art.js';

export function createRunDust(scene,lighting) {
  const [canvas,ctx]=makeCanvas(8);ellipse(ctx,4,5,3,2,'#c6b38d90');ellipse(ctx,3,3,2,2,'#e8d8a9a0');
  const map=texture(canvas),puffs=[],timers=new Map();let cursor=0;
  for(let i=0;i<128;i++){const mesh=sprite(map,.3,.3);mesh.name='running-dust';mesh.visible=false;scene.add(mesh);lighting?.surface(mesh);puffs.push({mesh,age:1});}
  return {
    update(dt,sources=[]) {
      const elapsed=Math.min(.1,Math.max(0,dt||0)),active=new Set();
      for(const source of sources) {
        if(!source.running||!source.moving)continue;
        active.add(source.id);let time=(timers.get(source.id)??0)+elapsed;
        while(time>=.09) {
          time-=.09;const puff=puffs[cursor++%puffs.length],side=cursor%2?1:-1,dx=source.dx??0,dy=source.dy??-1;
          puff.age=0;puff.x=source.x-dx*.35+dy*.12*side;puff.y=source.y-dy*.35-dx*.12*side;
          puff.vx=-dx*.65+side*.18;puff.vy=-dy*.65+.15;
        }
        timers.set(source.id,time);
      }
      for(const id of timers.keys())if(!active.has(id))timers.delete(id);
      for(const puff of puffs) {
        puff.age+=elapsed;const t=puff.age/.55;puff.mesh.visible=t<1;if(t>=1)continue;
        puff.mesh.position.set(puff.x+puff.vx*puff.age,puff.y+puff.vy*puff.age,10-puff.y*.01-.015);
        puff.mesh.scale.setScalar(.6+t*1.5);puff.mesh.material.opacity=(1-t)*.7;
      }
    },
    dispose(){for(const {mesh} of puffs){lighting?.remove(mesh);mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();}map.dispose();},
  };
}
