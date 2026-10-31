import {STARTER_TENT,TENT_SHADOW_VOLUME,TENT_TURN_VOLUME} from './tent-data.js';
import {rotateGroundPoint,normalizeRotation,tentInReach} from './structures.js';
import { CAMP } from './config.js';
import { makeCanvas,texture,sprite,polygon,ellipse,rect } from './art.js';

export {TENT_SHADOW_VOLUME} from './tent-data.js';
export const campInReach=position=>tentInReach(position,STARTER_TENT);
export function campBlocked(x,y,radius=0) {
  return ((x-CAMP.x)/(1.75+radius))**2+((y-CAMP.y-.35)/(.65+radius))**2<1;
}

export function tentCanvas(closed=false,rotation=0) {
  if(normalizeRotation(rotation))return turnedTentCanvas(closed,rotation);
  const [canvas,ctx]=makeCanvas(96,80),ink='#343a2d';
  ellipse(ctx,48,69,40,7,'#263b2e35');
  polygon(ctx,[[13,65],[62,67],[88,62],[88,65],[62,70],[13,69]],'#1c302b70');
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
  return canvas;
}

export function createCamp(scene,lighting,getTent=null) {
  const maps=getTent?[]:[texture(tentCanvas(false)),texture(tentCanvas(true))],tent=getTent?null:sprite(maps[0],CAMP.width,CAMP.height);
  if(tent){tent.name='camp-tent';tent.position.set(CAMP.x,CAMP.y+CAMP.height*(CAMP.foot-.5),10-CAMP.y*.01);
  scene.add(tent);lighting?.castShadow(tent,{width:CAMP.width,height:CAMP.height,foot:CAMP.foot,volume:TENT_SHADOW_VOLUME});}
  const [canvas,ctx]=makeCanvas(16),pixels=[[3,3,9,2],[9,5,2,2],[7,7,2,2],[5,9,2,2],[3,11,10,2]];
  for(const [x,y,w,h] of pixels)rect(ctx,x-1,y-1,w+2,h+2,'#253b32');
  for(const [x,y,w,h] of pixels)rect(ctx,x,y,w,h,'#f7e5b0');
  const map=texture(canvas),letters=Array.from({length:4},()=>{
    const mesh=sprite(map,.7,.7);mesh.name='sleep-zzz';mesh.visible=false;mesh.renderOrder=12;mesh.material.depthTest=false;scene.add(mesh);return mesh;
  });
  return {
    inReach:position=>tentInReach(position,getTent?getTent():STARTER_TENT),
    update(sleeping,elapsed=0) {
      const current=getTent?getTent():STARTER_TENT;
      if(tent){tent.material.map=maps[sleeping?1:0];tent.userData.sleeping=sleeping;}
      letters.forEach((mesh,i)=>{
        const phase=i*.45;
        if(!current||!sleeping||elapsed<phase){mesh.visible=false;return;}
        const age=(elapsed-phase)%1.8,progress=age/1.8,size=.65+progress*.45;
        mesh.position.set(current.x+.35+age*.28+Math.sin(age*3+i)*.12,current.y+2.35+age*.9,22);
        mesh.scale.set(size,size,1);mesh.material.opacity=Math.min(1,age/.1)*(1-progress);
        mesh.visible=mesh.material.opacity>0;
      });
    },
    dispose() {
      for(const mesh of [tent,...letters].filter(Boolean)){lighting?.remove(mesh);mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();}
      for(const texture of [...maps,map])texture.dispose();
    },
  };
}

function turnedTentCanvas(closed,rotation) {
  const [canvas,ctx]=makeCanvas(112,128),vertices=TENT_TURN_VOLUME.map(([x,y,z])=>{const p=rotateGroundPoint(x,y-.35,rotation);return {x:p.x,y:p.y,z};});
  const point=p=>[Math.round(56+p.x*20),Math.round(80-(p.y+p.z)*20)],ink='#343a2d';
  // The ground edge uses the same projection as floors, collisions and shadows.
  polygon(ctx,vertices.slice(0,4).map(p=>point({...p,x:p.x*1.04,y:p.y*1.04})), '#1c302b70');
  function line(a,b,color) {
    const steps=Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]),1);
    for(let i=0;i<=steps;i++)rect(ctx,a[0]+(b[0]-a[0])*i/steps,a[1]+(b[1]-a[1])*i/steps,1,1,color);
  }
  const faces=[{v:[0,3,5,4],color:'#9ca476',roof:true},{v:[1,2,5,4],color:'#647650',roof:true},{v:[3,2,5],color:'#71805a'},{v:[0,1,4],color:'#99a474',door:true}];
  faces.sort((a,b)=>b.v.reduce((sum,i)=>sum+vertices[i].y,0)/b.v.length-a.v.reduce((sum,i)=>sum+vertices[i].y,0)/a.v.length);
  for(const face of faces) {
    polygon(ctx,face.v.map(i=>point(vertices[i])),face.color,ink);
    if(face.roof) {
      const [a,b,c,d]=face.v.map(i=>vertices[i]);
      const lerp=(p,q,t)=>({x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t,z:p.z+(q.z-p.z)*t});
      for(const t of [.18,.5,.82]) {
        const top=lerp(d,c,t),bottom=lerp(a,b,t),shade=face.color==='#647650'?'#819369':'#bbc18f';
        line(point(lerp(top,bottom,.1)),point(lerp(top,bottom,.82)),shade);
        for(const f of [.3,.55,.73]){const [x,y]=point(lerp(top,bottom,f));rect(ctx,x,y,1,2,'#c3c99b');}
      }
      const lower=face.v.slice(0,2).map(i=>vertices[i]);
      line(point(lerp(lower[0],d,.035)),point(lerp(lower[1],c,.035)),'#45573b');
    }
    if(face.door) {
      const points=face.v.map(i=>vertices[i]),center={x:points.reduce((sum,p)=>sum+p.x,0)/3,y:points.reduce((sum,p)=>sum+p.y,0)/3,z:points.reduce((sum,p)=>sum+p.z,0)/3};
      polygon(ctx,points.map(p=>point({x:center.x+(p.x-center.x)*.72,y:center.y+(p.y-center.y)*.72,z:center.z+(p.z-center.z)*.72})),closed?'#7b8c5e':'#233b2d',ink);
    }
  }
  line(point(vertices[4]),point(vertices[5]),'#d9c99a');
  for(const index of [0,1,2,3]) {
    const base=vertices[index],peg={x:base.x*1.15,y:base.y*1.18,z:0},[x,y]=point(peg);
    line(point(base),[x,y],'#bbaa7b');rect(ctx,x,y-1,2,4,'#64523b');
  }
  return canvas;
}
