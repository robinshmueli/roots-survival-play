import {STARTER_TENT,TENT_SPEC,TENT_SHADOW_VOLUME,TENT_TURN_VOLUME} from './tent-data.js';
import {WORLD,PLAYER,CAMP} from './config.js';
import {waterAt} from './biomes.js';
import {createInventory} from './inventory.js';
import {createFurnace} from './furnace.js';

export const BUILDING_UNIT=2.8;
const nativeSpec={width:5.6,height:5.6,foot:80/112};
export const CABIN_TYPES=['wood-wall','wood-door','wood-floor','wood-roof'];
// Sprite anchors mark the front feet; collisions follow each object's body.
export const WORKBENCH={width:3.2,height:2.8,foot:52/56,centerY:.75,rx:1.35,ry:.95,reach:2.4};
export const STRUCTURES={
  tent:TENT_SPEC,
  furnace:{width:3.2,height:3.2,foot:58/64,centerY:.55,rx:1.1,ry:.8,reach:2.4},
  workbench:WORKBENCH,
  campfire:{width:2.2,height:2.2,foot:44/48,centerY:.2,rx:.75,ry:.55,reach:2},
  'wood-wall':{...nativeSpec,foot:56/112+.12/5.6,centerY:.12,rx:1.35,ry:.3,reach:2,box:true},
  'wood-door':{...nativeSpec,height:6.4,foot:72/128+.12/6.4,centerY:.12,rx:1.35,ry:.25,reach:2.3,box:true},
  'wood-floor':{...nativeSpec,centerY:0,rx:1.4,ry:1.4,reach:2,box:true,solid:false,layer:'floor'},
  'wood-roof':{...nativeSpec,height:6.4,foot:96/128,centerY:0,rx:1.4,ry:1.4,reach:2,box:true,solid:false,layer:'roof'},
  chest:{width:2.4,height:2,foot:38/40,centerY:.38,rx:.95,ry:.65,reach:2.2},
};
export const normalizeRotation=value=>Number.isFinite(value)?((Math.trunc(value)%4)+4)%4:0;
export function rotateGroundPoint(x,y,rotation=0) {
  switch(normalizeRotation(rotation)) {
    case 1:return {x:y,y:-x};case 2:return {x:-x,y:-y};case 3:return {x:-y,y:x};default:return {x,y};
  }
}
export function structureSpec(type,rotation=0) {
  const base=STRUCTURES[type],turn=normalizeRotation(rotation);
  if(!base||!turn||type==='wood-roof'||type==='furnace')return base;
  const swap=turn%2===1&&['wood-wall','wood-door','chest','tent'].includes(type);
  // Directional art uses a larger transparent canvas around the same ground pivot.
  const height=['wood-door','tent'].includes(type)?6.4:5.6,ground=type==='wood-door'?72/128:type==='wood-wall'?56/112:type==='tent'?80/128:80/112;
  return {...base,width:5.6,height,foot:ground+base.centerY/height,rx:swap?base.ry:base.rx,ry:swap?base.rx:base.ry};
}
export function structureShadowVolume(object,roofLayout=null) {
  if(object.type==='tent')return (normalizeRotation(object.rotation)?TENT_TURN_VOLUME:TENT_SHADOW_VOLUME).map(([x,y,z])=>{const p=rotateGroundPoint(x,y-TENT_SPEC.centerY,object.rotation);return [p.x,p.y+TENT_SPEC.centerY,z];});
  const spec=STRUCTURES[object.type],round=object.type==='workbench',height=['wood-wall','wood-door'].includes(object.type)?2.15:1.05;
  if(object.type==='wood-roof') {
    const shape=roofLayout??{minX:-1.4,maxX:1.4,minY:-1.4,maxY:1.4,axis:normalizeRotation(object.rotation)%2};
    const lo=shape.axis?shape.minX:shape.minY,hi=shape.axis?shape.maxX:shape.maxY,ridge=(lo+hi)/2;
    const height=(x,y)=>2.15+.85*Math.max(0,1-Math.abs((shape.axis?x:y)-ridge)/((hi-lo)/2));
    const points=[[-1.5,-1.5],[1.5,-1.5],[1.5,1.5],[-1.5,1.5]];
    if(ridge>=-1.5&&ridge<=1.5)points.push(...(shape.axis?[[ridge,-1.5],[ridge,1.5]]:[[-1.5,ridge],[1.5,ridge]]));
    return points.map(([x,y])=>[x,y,height(x,y)]);
  }
  const points=round?Array.from({length:12},(_,i)=>({x:Math.cos(i*Math.PI/6)*spec.rx,y:Math.sin(i*Math.PI/6)*spec.ry})):
    [[-spec.rx,-spec.ry],[spec.rx,-spec.ry],[spec.rx,spec.ry],[-spec.rx,spec.ry]].map(([x,y])=>rotateGroundPoint(x,y,object.rotation));
  return points.flatMap(p=>[[p.x,p.y+spec.centerY,0],[p.x,p.y+spec.centerY,height]]);
}
export const structureCenter=object=>({x:object.x,y:object.y+(STRUCTURES[object.type??'workbench']?.centerY??0)});
export const workbenchCenter=object=>({x:object.x,y:object.y+WORKBENCH.centerY});
export function structureParts(object) {
  const spec=structureSpec(object.type??'workbench',object.rotation),center=structureCenter(object);
  if(object.type==='wood-door'&&object.open) {
    // The open leaf stays visible but never obstructs the room beside the door.
    return [{x:-1.22,y:0,rx:.16,ry:.25},{x:1.22,y:0,rx:.16,ry:.25}].map(part=>{
      const p=rotateGroundPoint(part.x,part.y,object.rotation),swap=normalizeRotation(object.rotation)%2;
      return {x:center.x+p.x,y:center.y+p.y,rx:swap?part.ry:part.rx,ry:swap?part.rx:part.ry,box:true};
    });
  }
  return [{...center,rx:spec.rx,ry:spec.ry,box:spec.box}];
}
function overlaps(x,y,object,radius=0,player=false) {
  if(STRUCTURES[object.type??'workbench'].solid===false)return false;
  // Walking boots spread farther sideways than the small navigation circle.
  // Keep them off wall caps without enlarging tree or furniture hitboxes.
  const radiusX=player&&wallType(object.type)?Math.max(radius,PLAYER.wallRadiusX):radius;
  return structureParts(object).some(part=>{
    const dx=(x-part.x)/(part.rx+radiusX),dy=(y-part.y)/(part.ry+radius);
    return part.box?Math.abs(dx)<1&&Math.abs(dy)<1:dx*dx+dy*dy<1;
  });
}
const wallType=type=>type==='wood-wall'||type==='wood-door';
function endpoints(object) {
  const center=structureCenter(object);
  return [-1,1].map(sign=>{const offset=rotateGroundPoint(sign*BUILDING_UNIT/2,0,object.rotation);return {x:center.x+offset.x,y:center.y+offset.y};});
}
function conflict(a,b) {
  const sa=structureSpec(a.type,a.rotation),sb=structureSpec(b.type,b.rotation);
  if(sa.layer!==sb.layer&&(sa.layer||sb.layer))return false;
  const ca=structureCenter(a),cb=structureCenter(b),ox=sa.rx+sb.rx-Math.abs(ca.x-cb.x),oy=sa.ry+sb.ry-Math.abs(ca.y-cb.y);
  // Perpendicular ends can meet at a cabin corner; crossing through a wall cannot.
  const corner=wallType(a.type)&&wallType(b.type)&&normalizeRotation(a.rotation)%2!==normalizeRotation(b.rotation)%2&&ox<.65&&oy<.65&&endpoints(a).some(p=>endpoints(b).some(q=>Math.hypot(p.x-q.x,p.y-q.y)<.4));
  return ox>.015&&oy>.015&&!corner;
}
export function snapBuildingPoint(type,point,rotation=0,objects=[]) {
  if(!CABIN_TYPES.includes(type)||!point)return point;
  const unit=BUILDING_UNIT,center=structureCenter({...point,type}),candidates=[];
  if(type==='wood-floor'||type==='wood-roof')return {x:Math.round(point.x/unit)*unit,y:Math.round(point.y/unit)*unit};
  const vertical=normalizeRotation(rotation)%2;
  candidates.push({x:(Math.round(center.x/unit-(vertical?.5:0))+(vertical?.5:0))*unit,y:(Math.round(center.y/unit-(vertical?0:.5))+(vertical?0:.5))*unit});
  for(const object of objects) {
    const at=structureCenter(object);
    if(object.type==='wood-floor')for(const sign of [-1,1])candidates.push({x:at.x+(vertical?sign*unit/2:0),y:at.y+(vertical?0:sign*unit/2)});
    if(wallType(object.type))for(const end of endpoints(object))for(const sign of [-1,1]) {
      const offset=rotateGroundPoint(sign*unit/2,0,rotation);candidates.push({x:end.x+offset.x,y:end.y+offset.y});
    }
  }
  let best=null,distance=.65;
  for(const candidate of candidates){const gap=Math.hypot(candidate.x-center.x,candidate.y-center.y);if(gap<distance){best=candidate;distance=gap;}}
  return best?{x:best.x,y:best.y-STRUCTURES[type].centerY}:point;
}
export function tentDoor(tent=STARTER_TENT) {
  const center=structureCenter(tent),offset=rotateGroundPoint(-.3,-1.55,tent.rotation);
  return {x:center.x+offset.x,y:center.y+offset.y};
}
export function tentWake(tent=STARTER_TENT) {
  const center=structureCenter(tent),offset=rotateGroundPoint(-.3,-1.7,tent.rotation);
  return {x:center.x+offset.x,y:center.y+offset.y};
}
export const tentInReach=(position,tent)=>!!tent&&Math.hypot(position.x-tentDoor(tent).x,position.y-tentDoor(tent).y)<=CAMP.reach;
export const structureMaxHealth=type=>['wood-wall','workbench','chest'].includes(type)?9:6;
export function wallLayoutFor(object,objects=[]) {
  if(object.type!=='wood-wall')return null;
  const turn=normalizeRotation(object.rotation);if(turn%2)return {faceDown:false};
  const center=structureCenter(object);let below=false,above=false;
  for(const floor of objects)if(floor.type==='wood-floor'&&Math.abs(floor.x-center.x)<BUILDING_UNIT-.05) {
    const dy=center.y-floor.y;
    if(Math.abs(dy-BUILDING_UNIT/2)<.16)below=true;
    if(Math.abs(dy+BUILDING_UNIT/2)<.16)above=true;
  }
  return {faceDown:below!==above?below:turn===2};
}
export function createStructures(initial=null,{starterTent=false}={}) {
  const objects=new Map();let roofRevision=-1,roofGroups=[],roofLayouts=new Map(),wallRevision=-1,wallLayouts=new Map();let serial=initial?.serial??0,revision=0,home={...(initial?.home??{x:CAMP.x,y:CAMP.y})};
  for(const record of initial?.objects??[]) {
    const {storage,furnace,...object}=record;
    if(object.type==='chest')object.storage=createInventory(false,{slots:15,hands:0},storage);
    if(object.type==='furnace')object.furnace=createFurnace(furnace);
    objects.set(object.id,object);
  }
  if(starterTent&&initial?.version!==2)objects.set(STARTER_TENT.id,{...STARTER_TENT});
  return {
    objects,
    get revision(){return revision+[...objects.values()].reduce((sum,object)=>sum+(object.storage?.revision??0)+(object.furnace?.revision??0),0);},
    serialize(){return {version:2,home:{...home},serial,objects:[...objects.values()].map(object=>({...object,...(object.storage?{storage:object.storage.serialize()}:{}),...(object.furnace?{furnace:object.furnace.serialize()}:{} )}))};},
    blocked(x,y,radius=0,player=false) {
      for(const object of objects.values())if(overlaps(x,y,object,radius,player))return true;
      return false;
    },
    resolvePlayerPosition(position,blocked=()=>false) {
      // An old save can be valid for the navigation circle but touch a wall
      // with its boots. Move to the closest clear side instead of trapping it.
      if(!this.blocked(position.x,position.y,PLAYER.radius,true)||this.blocked(position.x,position.y,PLAYER.radius))return false;
      const xs=[position.x],ys=[position.y];
      for(const object of objects.values())if(wallType(object.type)&&overlaps(position.x,position.y,object,PLAYER.radius,true))for(const part of structureParts(object)) {
        xs.push(part.x-part.rx-PLAYER.wallRadiusX-.02,part.x+part.rx+PLAYER.wallRadiusX+.02);
        ys.push(part.y-part.ry-PLAYER.radius-.02,part.y+part.ry+PLAYER.radius+.02);
      }
      const candidates=xs.flatMap(x=>ys.map(y=>({x,y,d:Math.hypot(x-position.x,y-position.y)}))).sort((a,b)=>a.d-b.d);
      const clear=candidates.find(p=>!this.blocked(p.x,p.y,PLAYER.radius,true)&&!blocked(p.x,p.y,PLAYER.radius));
      if(!clear)return false;
      position.x=clear.x;position.y=clear.y;return true;
    },
    campState(id=null){const object=id?objects.get(id):null;return object?.type==='tent'?object:[...objects.values()].reverse().find(object=>object.type==='tent')??null;},
    home(){const tent=this.campState();return tent?structureCenter(tent):null;},
    hit(id,tool='axe',damage=3) {
      const object=objects.get(id);if(!object||tool!=='axe')return null;
      const health=Math.max(0,(object.health??structureMaxHealth(object.type))-Math.max(1,damage));
      if(health===0)objects.delete(id);else object.health=health;
      revision++;return {health,maxHealth:structureMaxHealth(object.type),demolished:health===0,object};
    },
    snap(type,point,rotation=0){return snapBuildingPoint(type,point,rotation,objects.values());},
    toggleDoor(id,player) {
      const object=objects.get(id);if(object?.type!=='wood-door')return {changed:false,reason:'missing'};
      const next={...object,open:!object.open};
      if(object.open&&player&&overlaps(player.x,player.y,next,PLAYER.radius,true))return {changed:false,reason:'player'};
      object.open=next.open;revision++;return {changed:true,open:object.open};
    },
    roofGroupAt(position) {
      if(roofRevision!==revision) {
        roofGroups=[];roofLayouts=new Map();const remaining=new Set([...objects.values()].filter(object=>object.type==='wood-roof'));
        while(remaining.size) {
          const group=[remaining.values().next().value];remaining.delete(group[0]);
          for(let i=0;i<group.length;i++)for(const roof of remaining) {
            const a=group[i],dx=Math.abs(a.x-roof.x),dy=Math.abs(a.y-roof.y);
            if(dx<BUILDING_UNIT+.03&&dy<.03||dy<BUILDING_UNIT+.03&&dx<.03){remaining.delete(roof);group.push(roof);}
          }
          const minX=Math.min(...group.map(roof=>roof.x))-1.4,maxX=Math.max(...group.map(roof=>roof.x))+1.4;
          const minY=Math.min(...group.map(roof=>roof.y))-1.4,maxY=Math.max(...group.map(roof=>roof.y))+1.4;
          for(const roof of group)roofLayouts.set(roof.id,{minX:minX-roof.x,maxX:maxX-roof.x,minY:minY-roof.y,maxY:maxY-roof.y,axis:normalizeRotation(group[0].rotation)%2});
          roofGroups.push(group);
        }
        roofRevision=revision;
      }
      return new Set((roofGroups.find(group=>group.some(roof=>Math.abs(position.x-roof.x)<=1.40001&&Math.abs(position.y-roof.y)<=1.40001))??[]).map(roof=>roof.id));
    },
    roofLayout(id){return roofLayouts.get(id)??null;},
    layoutFor(type,point,rotation=0){return wallLayoutFor({...point,type,rotation},objects.values());},
    wallLayout(id) {
      if(wallRevision!==revision) {
        const floors=[...objects.values()].filter(object=>object.type==='wood-floor');wallLayouts=new Map();
        for(const object of objects.values())if(object.type==='wood-wall')wallLayouts.set(object.id,wallLayoutFor(object,floors));
        wallRevision=revision;
      }
      return wallLayouts.get(id)??null;
    },
    validate(point,player,blocked,type='workbench',rotation=0) {
      const spec=structureSpec(type,rotation);
      if(!spec||!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))return {valid:false,reason:'aim'};
      const object={...point,type,rotation:normalizeRotation(rotation)},center=structureCenter(object);
      if(Math.abs(center.x)>WORLD.size/2-spec.rx-.35||Math.abs(center.y)>WORLD.size/2-spec.ry-.35)return {valid:false,reason:'bounds'};
      if(player&&overlaps(player.x,player.y,object,PLAYER.radius,true))return {valid:false,reason:'player'};
      for(const existing of objects.values())if(conflict(object,existing))return {valid:false,reason:'occupied'};
      for(const sx of [-1,-.5,0,.5,1])for(const sy of [-1,-.5,0,.5,1]) {
        if(!spec.box&&sx*sx+sy*sy>1)continue;
        const x=center.x+sx*spec.rx,y=center.y+sy*spec.ry;
        if(waterAt(x,y))return {valid:false,reason:'water'};
        if(blocked(x,y,.1))return {valid:false,reason:'occupied'};
      }
      return {valid:true,reason:null};
    },
    place(point,player,blocked,type='workbench',rotation=0) {
      if(!this.validate(point,player,blocked,type,rotation).valid)return null;
      const object={id:`${type}:${++serial}`,type,x:point.x,y:point.y,rotation:normalizeRotation(rotation)};
      if(type==='tent')home={x:object.x,y:object.y};
      if(type==='wood-door')object.open=false;
      if(type==='chest')object.storage=createInventory(false,{slots:15,hands:0});
      if(type==='furnace')object.furnace=createFurnace();
      objects.set(object.id,object);revision++;return object;
    },
    nearest(position,types=['workbench']) {
      let nearest=null,best=Infinity;
      for(const object of objects.values()) {
        if(!types.includes(object.type))continue;
        const spec=STRUCTURES[object.type],center=structureCenter(object),distance=Math.hypot(center.x-position.x,center.y-position.y);
        if(distance<=spec.reach&&distance<best){nearest=object;best=distance;}
      }
      return nearest;
    },
  };
}
