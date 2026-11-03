export const OCCLUDER_OPACITY=.3;

function pixelsFor(map) {
  const image=map?.userData.treeImage??map?.image;if(!image)return null;
  map.userData.hitPixels??=image.data??image.getContext('2d').getImageData(0,0,image.width,image.height).data;
  return {image,data:map.userData.hitPixels};
}
function localPoint(mesh,u,v) {
  const p=mesh.geometry.attributes.position;
  const x=(p.getX(0)+(p.getX(1)-p.getX(0))*u+(p.getX(2)-p.getX(0))*v)*mesh.scale.x;
  const y=(p.getY(0)+(p.getY(1)-p.getY(0))*u+(p.getY(2)-p.getY(0))*v)*mesh.scale.y;
  const angle=mesh.rotation.z,c=Math.cos(angle),s=Math.sin(angle);
  return {x:mesh.position.x+x*c-y*s,y:mesh.position.y+x*s+y*c};
}
export function spriteContains(mesh,point) {
  const p=mesh.geometry.attributes.position,angle=mesh.rotation.z,c=Math.cos(angle),s=Math.sin(angle),dx=point.x-mesh.position.x,dy=point.y-mesh.position.y;
  const x=(dx*c+dy*s)/mesh.scale.x,y=(-dx*s+dy*c)/mesh.scale.y;
  const ux=p.getX(1)-p.getX(0),uy=p.getY(1)-p.getY(0),vx=p.getX(2)-p.getX(0),vy=p.getY(2)-p.getY(0),det=ux*vy-uy*vx;
  if(!det)return false;
  const rx=x-p.getX(0),ry=y-p.getY(0),u=(rx*vy-ry*vx)/det,v=(ux*ry-uy*rx)/det;
  if(u<0||u>=1||v<0||v>=1)return false;
  const pixels=pixelsFor(mesh.material.map);if(!pixels)return false;
  return pixels.data[(Math.floor(v*pixels.image.height)*pixels.image.width+Math.floor(u*pixels.image.width))*4+3]>32;
}
function playerSamples(player) {
  if(!player?.visible)return [];
  const pixels=pixelsFor(player.material.map);if(!pixels)return [];
  const {image,data}=pixels,result=[];
  for(let y=3;y<image.height;y+=3)for(let x=Math.ceil(image.width*.16);x<image.width*.84;x+=3) {
    if(data[(y*image.width+x)*4+3]>64)result.push(localPoint(player,(x+.5)/image.width,(y+.5)/image.height));
  }
  return result;
}
function bounds(points) {
  return {left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),bottom:Math.min(...points.map(p=>p.y)),top:Math.max(...points.map(p=>p.y))};
}
export function createOcclusionFade() {
  const states=new WeakMap();
  return {
    update(player,meshes,dt,animals=[]) {
      const subjects=[player,...animals].filter(subject=>subject?.visible).map(subject=>{const samples=playerSamples(subject);return {subject,samples,area:samples.length?bounds(samples):null};}).filter(entry=>entry.area);
      const elapsed=Math.min(.1,Math.max(0,dt||0)),blend=1-Math.exp(-elapsed*14);
      for(const mesh of meshes) {
        const base=mesh.userData.baseOpacity??1;
        const box=mesh.visible?bounds([localPoint(mesh,0,0),localPoint(mesh,1,0),localPoint(mesh,0,1),localPoint(mesh,1,1)]):null;
        const covers=({subject,samples,area})=>box&&(mesh.renderOrder>subject.renderOrder||mesh.renderOrder===subject.renderOrder&&mesh.position.z>subject.position.z+.00001)&&box.right>=area.left&&box.left<=area.right&&box.top>=area.bottom&&box.bottom<=area.top&&samples.some(point=>spriteContains(mesh,point));
        const hiddenPlayer=subjects.some(entry=>entry.subject===player&&covers(entry));
        const hiddenAnimal=mesh.userData.object?.type==='tree'&&subjects.some(entry=>entry.subject!==player&&covers(entry));
        const hidden=hiddenPlayer||hiddenAnimal;
        let state=states.get(mesh);
        if(!state){state={amount:hidden?1:0,hold:0};states.set(mesh,state);}
        state.hold=hidden?.12:Math.max(0,state.hold-elapsed);
        const target=subjects.length&&state.hold>0?1:0;
        state.amount+=(target-state.amount)*blend;
        if(Math.abs(state.amount-target)<.001)state.amount=target;
        mesh.userData.occludingPlayer=hiddenPlayer;mesh.userData.occludingAnimal=hiddenAnimal;
        mesh.userData.occlusionAmount=state.amount;
        mesh.userData.occlusionBaseOpacity=base;
        mesh.material.opacity=base+(Math.min(base,OCCLUDER_OPACITY)-base)*state.amount;
      }
    },
  };
}
