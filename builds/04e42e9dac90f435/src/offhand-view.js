import {itemArt} from './items.js';
import {makeCanvas,texture,sprite,polygon,rect} from './art.js';
import {flameTextures} from './torch-art.js';

export function createOffhandView(scene,lighting) {
  const maps=new Map(),[canvas,ctx]=makeCanvas(24,48);
  polygon(ctx,[[10,40],[13,40],[16,18],[12,17]],'#a87a45','#3d392b');rect(ctx,12,24,1,13,'#d1aa6b');
  polygon(ctx,[[10,21],[10,15],[16,14],[18,19],[15,24]],'#4c4933','#34362b');
  for(const y of [17,20,23])rect(ctx,10,y,7,1,'#c0a171');
  const torchMap=texture(canvas),mesh=sprite(torchMap,.75,1.5),flames=flameTextures(),fire=sprite(flames[0],.5,.65);
  mesh.name='held-offhand-item';fire.name='offhand-torch-flame';mesh.visible=fire.visible=false;
  scene.add(mesh,fire);lighting?.surface(mesh);
  return {
    update(body,type,seconds) {
      mesh.visible=!!type&&body.visible;fire.visible=mesh.visible&&type==='torch';if(!mesh.visible)return null;
      const anchor=body.material.map.userData.offGrip,flip=body.scale.x;
      const grip={x:body.position.x+anchor.x*flip,y:body.position.y+anchor.y};
      const front=body.material.map.userData.offhandFront,z=body.position.z+(front?.0003:-.0003);
      if(type==='torch'){mesh.material.map=torchMap;mesh.scale.set(flip,1,1);mesh.position.set(grip.x,grip.y+.375,z);}
      else {
        if(!maps.has(type))maps.set(type,texture(itemArt(type)));
        mesh.material.map=maps.get(type);mesh.scale.set(flip*.75,.5,1);mesh.position.set(grip.x,grip.y+.1,z);
      }
      mesh.userData.grip={...grip,side:'left'};mesh.userData.tool=type;
      if(!fire.visible)return null;
      fire.material.map=flames[Math.floor(seconds*8)%4];fire.position.set(grip.x+.0625*flip,grip.y+.78,z+.00001);
      return {x:fire.position.x,y:body.position.y-.8,radius:7,power:1.7};
    },
    dispose(){for(const object of [mesh,fire]){lighting?.remove(object);object.removeFromParent();object.geometry.dispose();object.material.dispose();}torchMap.dispose();maps.forEach(map=>map.dispose());},
  };
}
