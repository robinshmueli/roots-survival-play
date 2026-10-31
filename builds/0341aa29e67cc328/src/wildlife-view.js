import * as THREE from '../vendor/three.module.js';
import {ANIMAL_TYPES} from './animal-data.js';
import {animalArt} from './animal-art.js';
import {makeCanvas,texture,sprite,ellipse} from './art.js';

export function createWildlifeView(scene,lighting) {
  const meshes=new Map(),maps=new Map(),[halo,ctx]=makeCanvas(24);
  for(let r=11;r>0;r--)ellipse(ctx,12,12,r,r,`rgba(255,35,25,${.018+(11-r)*.002})`);
  const glowMap=texture(halo);
  return {
    meshes,
    update(animals,seconds,dt,position) {
      const wanted=new Set();
      for(const animal of animals) {
        const distance=Math.hypot(animal.x-position.x,animal.y-position.y);
        if(distance>72||!animal.health&&!meshes.has(animal.id))continue;
        wanted.add(animal.id);const spec=ANIMAL_TYPES[animal.kind],direction=Math.abs(animal.dx)>Math.abs(animal.dy)?animal.dx>0?'right':'left':animal.dy>0?'up':'down';
        const frame=animal.moving?Math.floor(seconds*(animal.running?13:7))%6:0,night=!!animal.hostile,key=`${animal.kind}:${direction}:${frame}:${night}:${Math.abs(Math.floor(animal.home.x))%2}`;
        if(!maps.has(key)) {const art=animalArt(animal.kind,direction,frame,night,Math.abs(Math.floor(animal.home.x))%2),map=texture(art.canvas);map.userData.eyes=art.eyes;maps.set(key,map);}
        if(!meshes.has(animal.id)) {
          const mesh=sprite(maps.get(key),spec.width,spec.height);mesh.name=`animal-${animal.kind}`;mesh.userData.animal=animal;mesh.userData.deathAge=0;
          mesh.userData.eyes=Array.from({length:2},()=>{const eye=sprite(glowMap,animal.kind==='cow'?.55:.35,animal.kind==='cow'?.55:.35);eye.name='animal-red-eye-glow';eye.material.blending=THREE.AdditiveBlending;eye.material.depthTest=false;eye.renderOrder=2;scene.add(eye);return eye;});
          scene.add(mesh);lighting?.castShadow(mesh,{...spec,foot:animal.kind==='cow'?54/64:42/48});meshes.set(animal.id,mesh);
        }
        const mesh=meshes.get(animal.id),foot=animal.kind==='cow'?54/64:42/48;
        mesh.material.map=maps.get(key);mesh.position.set(animal.x,animal.y+spec.height*(foot-.5),10-animal.y*.01+.004);
        if(!animal.health){mesh.userData.deathAge+=Math.max(0,dt);mesh.rotation.z=-.35;mesh.material.opacity=Math.max(0,1-mesh.userData.deathAge/.5);if(mesh.material.opacity===0)wanted.delete(animal.id);}
        mesh.userData.eyes.forEach((eye,i)=>{const p=mesh.material.map.userData.eyes[i];eye.visible=!!animal.health&&night&&!!p;if(!eye.visible)return;eye.position.set(animal.x+(p.x/mesh.material.map.image.width-.5)*spec.width,animal.y+(foot-p.y/mesh.material.map.image.height)*spec.height,24);eye.material.opacity=.7+.15*Math.sin(seconds*4);});
      }
      for(const [id,mesh] of meshes)if(!wanted.has(id)){remove(mesh);meshes.delete(id);}
    },
    dispose(){for(const mesh of meshes.values())remove(mesh);meshes.clear();for(const map of maps.values())map.dispose();maps.clear();glowMap.dispose();},
  };
  function remove(mesh){lighting?.remove(mesh);for(const eye of mesh.userData.eyes){eye.removeFromParent();eye.geometry.dispose();eye.material.dispose();}mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();}
}
