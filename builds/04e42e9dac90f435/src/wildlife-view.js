import * as THREE from '../vendor/three.module.js';
import {ANIMAL_TYPES} from './animal-data.js';
import {animalArt} from './animal-art.js';
import {makeCanvas,texture,sprite,ellipse} from './art.js';
import {animalBitePose,biteTiming} from './animal-bite.js';
import {attackWarningArt,attackAreaArt} from './animal-warning-art.js';

export function createWildlifeView(scene,lighting) {
  const meshes=new Map(),maps=new Map(),[halo,ctx]=makeCanvas(24);
  for(let r=11;r>0;r--)ellipse(ctx,12,12,r,r,`rgba(255,35,25,${.018+(11-r)*.002})`);
  const glowMap=texture(halo);
  const warningMaps=[false,true].map(urgent=>texture(attackWarningArt(urgent))),areaMaps=Array.from({length:4},(_,i)=>texture(attackAreaArt(i)));
  return {
    meshes,
    update(animals,seconds,dt,position) {
      const wanted=new Set();
      for(const animal of animals) {
        const distance=Math.hypot(animal.x-position.x,animal.y-position.y);
        if(distance>72||!animal.health&&!meshes.has(animal.id))continue;
        wanted.add(animal.id);const spec=ANIMAL_TYPES[animal.kind],direction=Math.abs(animal.dx)>Math.abs(animal.dy)?animal.dx>0?'right':'left':animal.dy>0?'up':'down';
        const pose=animalBitePose(animal),frame=animal.moving?Math.floor(seconds*(animal.running?13:7))%6:0,night=!!(animal.redEyes??(animal.hostile&&animal.kind!=='wolf')),key=`${animal.kind}:${direction}:${frame}:${night}:${Math.abs(Math.floor(animal.home.x))%2}:${pose.frame}`;
        if(!maps.has(key)) {const art=animalArt(animal.kind,direction,frame,night,Math.abs(Math.floor(animal.home.x))%2,pose.frame),map=texture(art.canvas);map.userData.eyes=art.eyes;maps.set(key,map);}
        if(!meshes.has(animal.id)) {
          const mesh=sprite(maps.get(key),spec.width,spec.height);mesh.name=`animal-${animal.kind}`;mesh.userData.animal=animal;mesh.userData.deathAge=0;
          const eyeSize=['cow','wolf'].includes(animal.kind)?.55:animal.kind==='pig'?.45:.35;
          mesh.userData.eyes=Array.from({length:2},()=>{const eye=sprite(glowMap,eyeSize,eyeSize);eye.name='animal-red-eye-glow';eye.material.blending=THREE.AdditiveBlending;eye.material.depthTest=false;eye.renderOrder=2;scene.add(eye);return eye;});
          const warning=sprite(warningMaps[0],1,1.25);warning.name='animal-attack-warning';warning.renderOrder=9;warning.material.depthTest=false;warning.visible=false;scene.add(warning);
          const area=sprite(areaMaps[0],1,1);area.name='animal-attack-area';area.visible=false;scene.add(area);mesh.userData.telegraph={warning,area};
          scene.add(mesh);lighting?.castShadow(mesh,spec);meshes.set(animal.id,mesh);
        }
        const mesh=meshes.get(animal.id),foot=spec.foot;
        mesh.material.map=maps.get(key);mesh.position.set(animal.x+pose.x,animal.y+spec.height*(foot-.5)+pose.y,10-animal.y*.01+.004);mesh.userData.biteFrame=pose.frame;
        const {warning,area}=mesh.userData.telegraph,bite=animal.bite,timing=biteTiming(bite),preparing=!!animal.health&&!!animal.hostile&&!!bite&&!bite.hit;
        warning.visible=area.visible=preparing;
        if(preparing) {
          const progress=Math.min(1,bite.elapsed/timing.windup),radius=spec.reach+timing.lunge;
          warning.material.map=warningMaps[progress>=.65?1:0];warning.position.set(mesh.position.x,mesh.position.y+spec.height/2+1.45+(Math.floor(bite.elapsed*4)%2)/16,24);
          area.material.map=areaMaps[Math.min(3,Math.floor(progress*4))];area.scale.set(radius*2,radius*2,1);area.rotation.z=Math.atan2(bite.dy,bite.dx);area.position.set(animal.x,animal.y,.11);
        }
        if(!animal.health){mesh.userData.deathAge+=Math.max(0,dt);mesh.rotation.z=-.35;mesh.material.opacity=Math.max(0,1-mesh.userData.deathAge/.5);if(mesh.material.opacity===0)wanted.delete(animal.id);}
        mesh.userData.eyes.forEach((eye,i)=>{const p=mesh.material.map.userData.eyes[i];eye.visible=!!animal.health&&night&&!!p;if(!eye.visible)return;eye.position.set(mesh.position.x+(p.x/mesh.material.map.image.width-.5)*spec.width,mesh.position.y+(.5-p.y/mesh.material.map.image.height)*spec.height,24);eye.material.opacity=.7+.15*Math.sin(seconds*4);});
      }
      for(const [id,mesh] of meshes)if(!wanted.has(id)){remove(mesh);meshes.delete(id);}
    },
    dispose(){for(const mesh of meshes.values())remove(mesh);meshes.clear();for(const map of maps.values())map.dispose();maps.clear();glowMap.dispose();for(const map of [...warningMaps,...areaMaps])map.dispose();},
  };
  function remove(mesh){lighting?.remove(mesh);for(const extra of [...mesh.userData.eyes,...Object.values(mesh.userData.telegraph)]){extra.removeFromParent();extra.geometry.dispose();extra.material.dispose();}mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();}
}
