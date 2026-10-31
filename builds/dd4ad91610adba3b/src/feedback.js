import {FOODS} from './config.js';
import * as THREE from '../vendor/three.module.js';
import { makeCanvas, texture, sprite, ellipse, rect } from './art.js';
import { treeMaxHealth } from './resources.js';
import { ITEMS } from './items.js';
import {STRUCTURES} from './structures.js';
import {COMBAT_TOOLS as CHOP_TOOLS,VIEW} from './config.js';
import {ANIMAL_TYPES} from './animal-data.js';
import {recoveryTime} from './death-loot.js';

export function createFeedback(scene, lighting) {
  const [canvas,ctx]=makeCanvas(48,20);
  ellipse(ctx,24,10,22,8,'#dfc88050','#e9d497');
  ellipse(ctx,24,10,19,5,'#00000000');
  const ring=sprite(texture(canvas),2.4,1);ring.name='tree-target';ring.position.z=.07;ring.visible=false;
  scene.add(ring);
  const [healthCanvas,healthCtx]=makeCanvas(48,8),healthMap=texture(healthCanvas),health=sprite(healthMap,3,.5);
  health.name='tree-health';health.visible=false;health.renderOrder=10;health.material.depthTest=false;scene.add(health);
  const [keyCanvas,keyCtx]=makeCanvas(16);
  rect(keyCtx,1,1,14,14,'#303d2b');rect(keyCtx,2,2,12,12,'#dfce92');rect(keyCtx,3,3,10,10,'#455439');
  // Three-pixel gaps keep E's arms distinct. Match the texture to native render
  // pixels so downsampling cannot collapse those gaps into a solid rectangle.
  for(const [x,y,w,h] of [[4,3,2,9],[6,3,5,1],[6,7,4,1],[6,11,5,1]])rect(keyCtx,x,y,w,h,'#fff1bf');
  const keySize=keyCanvas.width/VIEW.pixelsPerUnit;
  const pickup=sprite(texture(keyCanvas),keySize,keySize);
  pickup.name='pickup-prompt';pickup.visible=false;pickup.renderOrder=4;pickup.material.depthTest=false;scene.add(pickup);
  const chips=[];
  const [chipCanvas,chipCtx]=makeCanvas(2);rect(chipCtx,0,0,2,2,'#bb8c50');rect(chipCtx,0,0,1,1,'#dfb676');
  const chipMap=texture(chipCanvas);
  const [stoneCanvas,stoneCtx]=makeCanvas(2);rect(stoneCtx,0,0,2,2,'#7b8980');rect(stoneCtx,0,0,1,1,'#c7d0c1');const stoneChipMap=texture(stoneCanvas);
  for(let i=0;i<12;i++) {
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.11,.11),new THREE.MeshBasicMaterial({map:chipMap,transparent:true,depthWrite:false}));
    mesh.visible=false;mesh.renderOrder=2;scene.add(mesh);lighting?.surface(mesh);chips.push({mesh,age:1});
  }
  const info=document.getElementById('target-info');
  const damageFlash=document.getElementById('damage-flash');
  let hurtAt=-Infinity;
  let shakeUntil=0,shakeStrength=0,shakeDuration=.16,lastHealth='';
  function shake(seconds,strength,duration) {
    if(shakeStrength*Math.max(0,(shakeUntil-seconds)/shakeDuration)>strength)return;
    shakeUntil=seconds+duration;shakeStrength=strength;shakeDuration=duration;
  }
  return {
    hurt(seconds) {hurtAt=seconds;shake(seconds,.115,.2);},
    land(seconds) {shake(seconds,.27,.36);},
    impact(seconds,position,direction,hit) {
      if(!hit)return;
      shake(seconds,.14,.16);
      for(let i=0;i<chips.length;i++) {
        const chip=chips[i],angle=i/chips.length*Math.PI*2;
        chip.mesh.material.map=hit.type==='rock'?stoneChipMap:chipMap;
        chip.age=0;chip.x=position.x+direction.x*.9;chip.y=position.y+direction.y*.9+.65;
        chip.vx=Math.cos(angle)*(.8+i%3*.4);chip.vy=1.1+Math.sin(angle)*1.4;chip.mesh.visible=true;
      }
    },
    update(seconds,dt,target,equipped,drop=null,context=null) {
      damageFlash.style.opacity=String(Math.max(0,1-(seconds-hurtAt)/.65)*.62);
      const interaction=context?.available?context:drop;
      pickup.visible=!!interaction;
      if(interaction)pickup.position.set(interaction.x+(interaction.source==='death'?1.3:.65),interaction.y+(interaction.source==='death'?1:interaction.kind==='fiberBush'?1.25:.65),22);
      const tool=CHOP_TOOLS[equipped],blows=target?Math.ceil(target.health/(tool?.damage??1)):0;
      ring.visible=health.visible=!!target&&!!tool;
      if(ring.visible) {
        ring.position.set(target.x,target.y,.07);
        const animal=target.type==='animal',spec=animal?ANIMAL_TYPES[target.kind]:null;
        health.position.set(animal?(target.healthBarX??target.x):target.x,spec?(target.healthBarTop??target.y+spec.height*spec.foot)+.4:target.y+.7,10-target.y*.01+.04);
        const maxHealth=target.maxHealth??treeMaxHealth(target),healthKey=`${animal?'animal':'resource'}:${target.health}/${maxHealth}`;
        if(lastHealth!==healthKey) {
          const fill=Math.round(44*Math.max(0,Math.min(1,target.health/maxHealth)));
          rect(healthCtx,0,0,48,8,'#28362b');
          rect(healthCtx,1,1,46,6,'#b3aa7d');
          rect(healthCtx,2,2,44,4,animal?'#542f2b':'#494b37');
          if(fill>0) {
            rect(healthCtx,2,2,fill,4,animal?'#d8524f':'#cdb975');
            rect(healthCtx,2,2,fill,1,animal?'#f58e78':'#ecd9a0');
          }
          healthMap.needsUpdate=true;lastHealth=healthKey;
        }
      }
      const text=context?.label??(drop?drop.source==='death'?`E · איסוף הציוד שלך · נותרו ${recoveryTime(drop.remaining)}`:`E · ${drop.kind==='fiberBush'?'קטיפת גבעולים':`איסוף ${ITEMS[drop.type]?.label??'פריט'}`}`:target&&tool?(blows===1?`${target.label??'עץ'} · נותרה מכה אחת`:`${target.label??'עץ'} · נותרו ${blows} מכות`):tool?(equipped==='pickaxe'?'התקרבו לסלע · לחיצה או רווח לחציבה':equipped==='sword'?'התקרבו לחיה · לחיצה או רווח לתקיפה':equipped==='axe'?'התקרבו לעץ או למבנה · לחיצה או רווח למכה':'התקרבו לעץ או לחיה · לחיצה או רווח למכה'):STRUCTURES[equipped]?'לחיצה / רווח להצבת הבנייה':Object.hasOwn(FOODS,equipped)?`לחיצה / רווח לאכילת ${ITEMS[equipped].label}`:equipped?ITEMS[equipped]?.description??'פריט ביד':'יד ריקה · בחרו אבן, גרזן או חרב ב־1–5');
      if(info.textContent!==text)info.textContent=text;
      for(const chip of chips)if(chip.age<.5) {
        chip.age+=dt;const t=chip.age;
        chip.mesh.position.set(chip.x+chip.vx*t,chip.y+chip.vy*t-5*t*t,21);
        chip.mesh.rotation.z=t*8;chip.mesh.material.opacity=Math.max(0,1-t/.5);chip.mesh.visible=t<.5;
      }
    },
    offset(seconds) {
      const remaining=Math.max(0,(shakeUntil-seconds)/shakeDuration),amount=remaining*shakeStrength;
      return {x:Math.sin(seconds*105)*amount,y:Math.cos(seconds*137)*amount*.65};
    },
  };
}
