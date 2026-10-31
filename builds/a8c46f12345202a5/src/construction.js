import {STRUCTURES,structureSpec} from './structures.js';
import {structureArt} from './items.js';
import {makeCanvas,texture,sprite,ellipse,randomGenerator} from './art.js';

export function createConstruction(scene,lighting,world,inventory) {
  const previews=new Map(),maps=[];
  function getPreview(type,rotation) {
    const key=`${type}:${rotation}`;
    if(previews.has(key))return previews.get(key);
    const source=structureArt(type,0,rotation),previewMaps=[[105,244,139],[240,112,94]].map(color=>{
      const [canvas,ctx]=makeCanvas(source.width,source.height);ctx.drawImage(source,0,0);
      const image=ctx.getImageData(0,0,canvas.width,canvas.height);
      for(let i=0;i<image.data.length;i+=4) {
        const light=(image.data[i]+image.data[i+1]+image.data[i+2])/765;
        for(let c=0;c<3;c++)image.data[i+c]=Math.round(color[c]*(.5+light*.5));
      }
      ctx.putImageData(image,0,0);return texture(canvas);
    });
    const spec=structureSpec(type,rotation),mesh=sprite(previewMaps[0],spec.width,spec.height);
    mesh.name=`${type}-preview-inactive-${rotation}`;mesh.userData.rotation=rotation;mesh.visible=false;mesh.renderOrder=5;mesh.material.depthTest=false;mesh.material.opacity=.78;scene.add(mesh);
    maps.push(...previewMaps);const result={mesh,maps:previewMaps,type,rotation};previews.set(key,result);return result;
  }
  const [canvas,ctx]=makeCanvas(8);ellipse(ctx,4,4,3,2,'#d9bd88b0');ellipse(ctx,3,3,2,2,'#eee0b49a');
  const map=texture(canvas),random=randomGenerator(36421),dust=Array.from({length:18},()=>{
    const mesh=sprite(map,.35,.35);mesh.name='building-dust';mesh.visible=false;mesh.renderOrder=3;scene.add(mesh);lighting?.surface(mesh);return {mesh,age:1};
  });
  let active=false,type=null,rotation=0,point=null,preview=null,verdict={valid:false,reason:'aim'};
  const cancel=()=>{active=false;point=null;if(preview)preview.mesh.visible=false;};
  function selectPreview() {
    if(preview){preview.mesh.visible=false;preview.mesh.name=`${preview.type}-preview-inactive-${preview.rotation}`;}
    preview=getPreview(type,rotation);preview.mesh.name=`${type}-preview`;
  }
  return {
    get rotation(){return rotation;},
    rotate(){if(!active)return false;rotation=(rotation+1)%4;selectPreview();return true;},
    get active(){return active;},get type(){return type;},
    get point(){return point?{...point}:null;},
    status(){return {...verdict};},
    begin(position,direction,aim=null,kind=inventory.equipped) {
      if(active||!STRUCTURES[kind]||inventory.count(kind)<1)return false;
      type=kind;rotation=0;selectPreview();active=true;
      point=aim?{x:aim.x,y:aim.y}:{x:position.x+direction.x*3,y:position.y+direction.y*3};return true;
    },
    cancel,
    update(dt,position,aim=null,enabled=true) {
      if(active&&!enabled)cancel();
      if(active) {
        const spec=structureSpec(type,rotation);
        if(aim)point={x:Math.round(aim.x*16)/16,y:Math.round(aim.y*16)/16};
        point=world.snapStructurePoint(type,point,rotation);
        verdict=world.canPlaceStructure(type,point,position,rotation);
        preview.mesh.visible=true;preview.mesh.material.map=preview.maps[verdict.valid?0:1];preview.mesh.userData.valid=verdict.valid;
        preview.mesh.position.set(point.x,point.y+spec.height*(spec.foot-.5),20);
      }
      for(const puff of dust) {
        if(puff.age>=.7){puff.mesh.visible=false;continue;}
        puff.age+=Math.max(0,dt);const t=puff.age,scale=.6+t*1.8;
        puff.mesh.position.set(puff.x+puff.vx*t,puff.y+puff.vy*t-.5*t*t,21);
        puff.mesh.scale.set(scale,scale,1);puff.mesh.material.opacity=Math.max(0,1-t/.7)*.8;puff.mesh.visible=t<.7;
      }
    },
    confirm(position) {
      if(!active)return {placed:false,reason:'inactive'};
      if(inventory.count(type)<1){cancel();return {placed:false,reason:'kit'};}
      verdict=world.canPlaceStructure(type,point,position,rotation);
      if(!verdict.valid)return {placed:false,reason:verdict.reason};
      const object=world.placeStructure(type,point,position,rotation);
      if(!object)return {placed:false,reason:'occupied'};
      inventory.remove(type,1);
      dust.forEach((puff,i)=>{
        const side=i%2?1:-1;
        puff.age=0;puff.x=object.x+side*(structureSpec(type,rotation).rx*.7+random()*.3);puff.y=object.y-.2+random()*.3;
        puff.vx=side*(.8+random()*1.1);puff.vy=.2+random()*.9;puff.mesh.position.set(puff.x,puff.y,21);puff.mesh.scale.setScalar(.6);puff.mesh.material.opacity=.8;puff.mesh.visible=true;
      });
      cancel();return {placed:true,object};
    },
    dispose() {
      for(const mesh of [...previews.values()].map(p=>p.mesh).concat(dust.map(p=>p.mesh))){lighting?.remove(mesh);mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();}
      for(const texture of [...maps,map])texture.dispose();
    },
  };
}
