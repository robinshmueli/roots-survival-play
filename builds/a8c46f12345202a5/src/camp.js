import { CAMP } from './config.js';
import { makeCanvas,texture,sprite,polygon,ellipse,rect } from './art.js';

export const campInReach=position=>Math.hypot(position.x-CAMP.door.x,position.y-CAMP.door.y)<=CAMP.reach;
export function campBlocked(x,y,radius=0) {
  return ((x-CAMP.x)/(1.75+radius))**2+((y-CAMP.y-.35)/(.65+radius))**2<1;
}

// Ground coordinates and pole heights follow the painted base and ridge.
// Canvas shadows/ropes are decoration, rather than elevated tent fabric.
export const TENT_SHADOW_VOLUME=[
  [-1.75,.05,0],[.7,-.05,0],[2.1,.25,0],[-.35,.35,0],
  [-.35,0,2.9],[.85,.3,2.25],
];

function tentArt(closed) {
  const [canvas,ctx]=makeCanvas(96,80),ink='#343a2d';
  ellipse(ctx,48,69,40,7,'#263b2e35');
  // Rope lines and pegged corners ground the canvas tent in the clearing.
  polygon(ctx,[[14,63],[5,72],[6,73],[17,65]],'#bbaa7b',ink);
  polygon(ctx,[[82,59],[91,70],[90,72],[80,62]],'#bbaa7b',ink);
  rect(ctx,4,70,2,5,'#64523b');rect(ctx,89,69,2,5,'#64523b');
  polygon(ctx,[[41,9],[65,16],[90,62],[62,68],[13,66]],'#647650',ink);
  polygon(ctx,[[42,11],[64,18],[85,60],[62,65]],'#516748');
  polygon(ctx,[[45,13],[63,19],[79,56],[69,52]],'#809366');
  polygon(ctx,[[41,11],[63,66],[14,65]],'#99a474',ink);
  polygon(ctx,[[39,17],[21,60],[29,59],[42,28]],'#c1b98b');
  polygon(ctx,[[43,18],[59,62],[51,58],[42,32]],'#7b8c5e');
  polygon(ctx,[[18,64],[61,65],[61,68],[15,67]],'#5b6745',ink);
  if(closed) {
    polygon(ctx,[[42,27],[29,64],[54,64]],'#8c9a68',ink);
    polygon(ctx,[[42,31],[41,63],[32,62]],'#b2b487');
    rect(ctx,42,35,1,30,'#586b47');rect(ctx,40,47,4,2,'#d6c99a');
  } else {
    polygon(ctx,[[42,26],[28,65],[54,65]],'#233b2d',ink);
    polygon(ctx,[[42,30],[41,63],[31,63]],'#162a23');
    polygon(ctx,[[39,30],[28,64],[23,60],[34,42]],'#c5bd8d',ink);
    polygon(ctx,[[45,30],[53,63],[58,61],[51,43]],'#91a16e',ink);
    rect(ctx,28,65,26,2,'#b9a579');rect(ctx,32,65,16,1,'#d4be8e');
  }
  polygon(ctx,[[40,8],[43,8],[65,15],[65,18],[42,12]],'#d9c99a',ink);
  rect(ctx,41,8,1,7,'#eedfb0');rect(ctx,65,18,1,3,'#b7b284');
  for(const [x,y] of [[25,47],[24,51],[57,49],[59,54],[72,44]])rect(ctx,x,y,1,2,'#bac396');
  return texture(canvas);
}

export function createCamp(scene,lighting) {
  const maps=[tentArt(false),tentArt(true)],tent=sprite(maps[0],CAMP.width,CAMP.height);
  tent.name='camp-tent';tent.position.set(CAMP.x,CAMP.y+CAMP.height*(CAMP.foot-.5),10-CAMP.y*.01);
  scene.add(tent);lighting?.castShadow(tent,{width:CAMP.width,height:CAMP.height,foot:CAMP.foot,volume:TENT_SHADOW_VOLUME});
  const [canvas,ctx]=makeCanvas(16),pixels=[[3,3,9,2],[9,5,2,2],[7,7,2,2],[5,9,2,2],[3,11,10,2]];
  for(const [x,y,w,h] of pixels)rect(ctx,x-1,y-1,w+2,h+2,'#253b32');
  for(const [x,y,w,h] of pixels)rect(ctx,x,y,w,h,'#f7e5b0');
  const map=texture(canvas),letters=Array.from({length:4},()=>{
    const mesh=sprite(map,.7,.7);mesh.name='sleep-zzz';mesh.visible=false;mesh.renderOrder=12;mesh.material.depthTest=false;scene.add(mesh);return mesh;
  });
  return {
    inReach:campInReach,
    update(sleeping,elapsed=0) {
      tent.material.map=maps[sleeping?1:0];tent.userData.sleeping=sleeping;
      letters.forEach((mesh,i)=>{
        const phase=i*.45;
        if(!sleeping||elapsed<phase){mesh.visible=false;return;}
        const age=(elapsed-phase)%1.8,progress=age/1.8,size=.65+progress*.45;
        mesh.position.set(CAMP.x+.35+age*.28+Math.sin(age*3+i)*.12,CAMP.y+2.35+age*.9,22);
        mesh.scale.set(size,size,1);mesh.material.opacity=Math.min(1,age/.1)*(1-progress);
        mesh.visible=mesh.material.opacity>0;
      });
    },
    dispose() {
      for(const mesh of [tent,...letters]){lighting?.remove(mesh);mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();}
      for(const texture of [...maps,map])texture.dispose();
    },
  };
}
