import {makeCanvas,texture,sprite,rect,randomGenerator} from './art.js';
import {itemArt} from './items.js';
import {pickupPose,PICKUP_MOTION} from './pickup-motion.js';

const FLIGHTS=48,PARTICLES=192,PIXEL=1/16;
const FALLBACK_COLORS=['#e3c58b','#bb9c66','#f4e2ad'];
export function createPickupEffects(scene,lighting) {
  const random=randomGenerator(51783),maps=new Map(),particleMaps=new Map(),palettes=new WeakMap();
  const [canvas,ctx]=makeCanvas(2);rect(ctx,0,0,2,2,'#ffffff');const pixel=texture(canvas);
  const [rimCanvas,rimCtx]=makeCanvas(12,10);
  rect(rimCtx,2,2,8,1,'#ffe7ae');rect(rimCtx,1,3,1,3,'#e9cc85');rect(rimCtx,10,3,1,3,'#e9cc85');
  rect(rimCtx,3,1,6,1,'#fff5d5');rect(rimCtx,0,0,1,1,'#fff1b9');rect(rimCtx,11,0,1,1,'#fff1b9');
  const rim=texture(rimCanvas);
  const sparks=Array.from({length:4},(_,frame)=>{
    const [canvas,ctx]=makeCanvas(3);
    if(frame===1||frame===2){rect(ctx,1,0,1,3,'#ffdc8b');rect(ctx,0,1,3,1,'#ffdc8b');}
    rect(ctx,1,1,1,1,frame===2?'#ffffff':'#fff0bf');return texture(canvas);
  });
  const make=(name,map,lit=true)=>{const mesh=sprite(map,1,1);mesh.name=name;mesh.visible=false;scene.add(mesh);if(lit)lighting?.surface(mesh);return mesh;};
  const flights=Array.from({length:FLIGHTS},()=>({mesh:make('pickup-item',null),active:false}));
  const particles=Array.from({length:PARTICLES},()=>({mesh:make('pickup-particle',pixel,false),active:false}));
  const pulses=Array.from({length:8},()=>({mesh:make('pickup-pack-flash',rim),active:false}));
  let flightCursor=0,particleCursor=0,pulseCursor=0,previousAnchor=null;
  function palette(map) {
    if(palettes.has(map))return palettes.get(map);
    const source=map.image,data=source.getContext?.('2d')?.getImageData(0,0,source.width,source.height).data,colors=new Map();
    if(data)for(let i=0;i<data.length;i+=4) {
      if(data[i+3]<220||Math.max(data[i],data[i+1],data[i+2])<95)continue;
      const color='#'+[data[i],data[i+1],data[i+2]].map(value=>value.toString(16).padStart(2,'0')).join('');
      colors.set(color,(colors.get(color)??0)+1);
    }
    const result=[...colors].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([color])=>color);
    palettes.set(map,result.length?result:FALLBACK_COLORS);return palettes.get(map);
  }
  function sparkMap(color) {
    if(!particleMaps.has(color)) {const [canvas,ctx]=makeCanvas(2);rect(ctx,0,0,2,2,color);particleMaps.set(color,texture(canvas));}
    return particleMaps.get(color);
  }
  function emit(x,y,z,colors,arrival=false) {
    const count=arrival?7:12;
    for(let i=0;i<count;i++) {
      const part=particles[particleCursor++%PARTICLES],angle=(i+random()*.65)/count*Math.PI*2,speed=(arrival?.3:.6)+random()*.55;
      Object.assign(part,{active:true,age:0,life:(arrival?.2:.32)+random()*.2,x,y,z,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed+.45,spark:i%3===0,size:PIXEL*(i%3?1:3),color:colors[i%colors.length]});
      part.mesh.userData.spark=part.spark;part.mesh.material.map=part.spark?sparks[1]:sparkMap(part.color);part.mesh.material.opacity=1;part.mesh.visible=true;
      part.mesh.position.set(x,y,z);part.mesh.scale.setScalar(part.size);
    }
  }
  const clear=()=>{for(const pool of [flights,particles,pulses])for(const effect of pool){effect.active=false;effect.mesh.visible=false;}previousAnchor=null;};
  return {
    start(items) {
      for(const [index,item] of items.entries()) {
        if(!item.count)continue;
        let map=item.map;
        if(!map) {if(!maps.has(item.type))maps.set(item.type,texture(itemArt(item.type)));map=maps.get(item.type);}
        const flight=flights[flightCursor++%FLIGHTS],colors=palette(map),bend=(flightCursor%2?1:-1)*(.16+random()*.18);
        Object.assign(flight,{active:true,age:-Math.min(index*.045,.32),from:{x:item.x,y:item.y},width:item.width??.95,height:item.height??.95,bend,routeSide:null,trail:0,colors});
        flight.mesh.userData.itemType=item.type;flight.mesh.userData.count=item.count;
        flight.mesh.material.map=map;flight.mesh.material.opacity=1;flight.mesh.rotation.z=0;
        flight.mesh.scale.set(flight.width,flight.height,1);flight.mesh.position.set(item.x,item.y,item.z??21);flight.mesh.visible=flight.age===0;
        emit(item.x,item.y,item.z??21,colors);
      }
    },
    clear,
    update(dt,anchor) {
      if(!anchor?.visible){clear();return;}
      if(previousAnchor&&Math.hypot(anchor.x-previousAnchor.x,anchor.y-previousAnchor.y)>5){clear();return;}
      previousAnchor={x:anchor.x,y:anchor.y};
      const seconds=Number.isFinite(dt)?Math.max(0,Math.min(.05,dt)):0;
      for(const flight of flights)if(flight.active) {
        flight.age+=seconds;
        if(flight.age<0){flight.mesh.visible=false;continue;}
        if(flight.routeSide===null) {
          const facing=anchor.facing??{x:0,y:1},body=anchor.body??anchor;
          flight.routeSide=Math.abs(facing.x)>.25?-Math.sign(facing.x):Math.sign(flight.from.x-body.x)||Math.sign(flight.bend);
        }
        const pose=pickupPose(flight.age,flight.from,anchor,Math.abs(flight.bend)*flight.routeSide,flight),mesh=flight.mesh;
        if(pose.done) {
          flight.active=false;mesh.visible=false;
          if(!anchor.behind) {
            emit(anchor.x,anchor.y,anchor.z+.004,flight.colors,true);
            const pulse=pulses[pulseCursor++%pulses.length];pulse.active=true;pulse.age=0;
          }
          continue;
        }
        mesh.visible=true;mesh.position.set(pose.x,pose.y,anchor.z+(pose.behind?-.0004:.004));
        mesh.scale.set(flight.width*pose.scale,flight.height*pose.scale,1);mesh.rotation.z=pose.rotation;mesh.material.opacity=pose.opacity;
        flight.trail+=seconds;
        if(!pose.behind&&pose.progress>.05&&pose.progress<.88&&flight.trail>=.045) {
          flight.trail%=.045;
          const part=particles[particleCursor++%PARTICLES];
          Object.assign(part,{active:true,age:0,life:.2,x:pose.x,y:pose.y,z:mesh.position.z-.0001,vx:0,vy:.08,spark:particleCursor%4===0,size:PIXEL*(particleCursor%4?1:2),color:flight.colors[particleCursor%flight.colors.length]});
        }
      }
      for(const part of particles)if(part.active) {
        part.age+=seconds;const t=part.age/part.life,mesh=part.mesh;
        if(t>=1){part.active=false;mesh.visible=false;continue;}
        mesh.visible=true;mesh.position.set(part.x+part.vx*part.age,part.y+part.vy*part.age-.9*part.age*part.age,part.z);
        mesh.userData.spark=part.spark;mesh.renderOrder=part.spark?2:0;
        mesh.scale.setScalar(part.size*(part.spark ? .85+Math.sin(t*Math.PI)*.2 : 1-t*.55));
        mesh.material.opacity=part.spark?(1-t)*(.65+.35*Math.sin(t*Math.PI*3)**2):(1-t)*(1-t);
        mesh.material.map=part.spark?sparks[Math.min(3,Math.floor(t*4))]:sparkMap(part.color);
      }
      for(const pulse of pulses)if(pulse.active) {
        pulse.age+=seconds;const t=pulse.age/PICKUP_MOTION.arrivalSeconds,mesh=pulse.mesh;
        if(t>=1||anchor.behind){pulse.active=false;mesh.visible=false;continue;}
        mesh.visible=true;mesh.position.set(anchor.center.x,anchor.center.y,anchor.z+.004);
        mesh.scale.set(.75*(1+Math.sin(t*Math.PI)*.12),.625,1);mesh.material.opacity=Math.sin(t*Math.PI)*.65;
      }
    },
    stats(){return {pickupFlights:flights.filter(effect=>effect.active).length,pickupParticles:particles.filter(effect=>effect.active).length,pickupSparkles:particles.filter(effect=>effect.active&&effect.spark).length,pickupPulses:pulses.filter(effect=>effect.active).length};},
    dispose() {
      clear();for(const pool of [flights,particles,pulses])for(const {mesh} of pool){lighting?.remove(mesh);mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();}
      for(const map of [...maps.values(),...particleMaps.values()])map.dispose();pixel.dispose();rim.dispose();sparks.forEach(map=>map.dispose());
    },
  };
}
