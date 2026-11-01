import {PLAYER,WORLD} from './config.js';
import {tentWake} from './structures.js';

export function findRespawnPoint(world) {
  const tent=world.campState(),start={x:PLAYER.startX,y:PLAYER.startY},anchors=tent?[tentWake(tent),start]:[start];
  const clear=point=>Math.abs(point.x)<=WORLD.size/2-1&&Math.abs(point.y)<=WORLD.size/2-1&&!world.blocked(point.x,point.y,PLAYER.radius,true);
  for(const anchor of anchors) {
    if(clear(anchor))return anchor;
    // Prefer a free spot beside the entrance, even in a furnished cabin.
    for(let radius=.5;radius<=12;radius+=.5) {
      const steps=Math.max(16,Math.ceil(Math.PI*2*radius/.5));
      for(let step=0;step<steps;step++) {
        const angle=-Math.PI/2+step*Math.PI*2/steps,point={x:anchor.x+Math.cos(angle)*radius,y:anchor.y+Math.sin(angle)*radius};
        if(clear(point))return point;
      }
    }
  }
  return null;
}

export function respawnAtHome(world,survival,stamina,position) {
  if(!survival.state().dead)return false;
  world.leaveCave?.();
  const point=findRespawnPoint(world);if(!point)return false;
  survival.respawn();stamina.reset();position.x=point.x;position.y=point.y;return true;
}
