import * as THREE from '../vendor/three.module.js';
import {makeCanvas,texture,sprite,rect,polygon,randomGenerator} from './art.js';
import {ECHO,echoPhase} from './echo-stone.js';
import {echoCrystalArt} from './cave-art.js';
import {createEchoChime} from './echo-chime.js';

export function createEchoView(scene) {
  const [canvas,ctx]=makeCanvas(7);
  rect(ctx,1,1,5,5,'#199bff30');rect(ctx,2,1,3,5,'#4bbcff50');rect(ctx,1,2,5,3,'#4bbcff50');
  rect(ctx,2,2,3,3,'#68dcffc0');rect(ctx,3,3,1,1,'#e0ffff');
  const map=texture(canvas),chime=createEchoChime(),crystalMap=echoCrystalArt();
  const remnant=sprite(crystalMap,2.2,3.3);remnant.name='echo-crystal-pop';remnant.visible=false;remnant.material.depthTest=false;remnant.renderOrder=3;scene.add(remnant);
  const [shardCanvas,shardCtx]=makeCanvas(7,11);
  polygon(shardCtx,[[3,0],[6,4],[3,10],[0,4]],'#2692cf','#183f67');polygon(shardCtx,[[3,1],[3,6],[1,4]],'#a1edff');
  rect(shardCtx,3,3,1,3,'#d1ffff');const shardMap=texture(shardCanvas);
  const shards=Array.from({length:6},()=>{const mesh=sprite(shardMap,.22,.35);mesh.name='echo-shard';mesh.visible=false;mesh.material.depthTest=false;mesh.renderOrder=3;scene.add(mesh);return mesh;});
  function pool(name,count,size,order) {
    const positions=new Float32Array(count*3),colors=new Float32Array(count*3),geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3).setUsage(THREE.DynamicDrawUsage));geometry.setDrawRange(0,0);
    const material=new THREE.PointsMaterial({map,size,sizeAttenuation:false,transparent:true,depthWrite:false,depthTest:order<0,vertexColors:true,blending:THREE.AdditiveBlending,opacity:ECHO.brightness});
    const mesh=new THREE.Points(geometry,material);mesh.name=name;mesh.visible=false;mesh.renderOrder=order;mesh.frustumCulled=false;scene.add(mesh);
    return {mesh,geometry,positions,colors,finish(shown){mesh.visible=shown>0;geometry.setDrawRange(0,shown);geometry.attributes.position.needsUpdate=true;geometry.attributes.color.needsUpdate=true;}};
  }
  const dust=pool('echo-dust-trail',ECHO.particleLimit,3.2,-1),burst=pool('echo-blue-burst',160,3.8,3);
  let active=null,bursts=[],pop=null,finalShards=null;
  function clear(){active=null;bursts=[];pop=finalShards=null;remnant.visible=false;for(const shard of shards)shard.visible=false;dust.finish(0);burst.finish(0);dust.mesh.userData={};burst.mesh.userData={};chime.clear();}
  function explode(x,y,seconds,seed,kind) {
    const random=randomGenerator(seed),count=kind==='crystal'?40:48,particles=Array.from({length:count},(_,i)=>{const angle=i/count*Math.PI*2+random()*.4;return {dx:Math.cos(angle),dy:Math.sin(angle),speed:1.2+random()*1.8,phase:random()*8};});
    bursts.push({x,y,seconds,particles,kind});burst.mesh.userData.kind=kind;
  }
  function paint(pool,n,x,y,z,light) {
    const offset=n*3;pool.positions[offset]=x;pool.positions[offset+1]=y;pool.positions[offset+2]=z;
    pool.colors[offset]=.18*light;pool.colors[offset+1]=.7*light;pool.colors[offset+2]=light;
  }
  function along(trail,distance) {
    let low=0,high=trail.points.length-1;
    while(low<high){const middle=(low+high)>>1;if(trail.points[middle].distance<distance)low=middle+1;else high=middle;}
    const b=trail.points[low],a=trail.points[Math.max(0,low-1)],span=b.distance-a.distance,t=span?Math.max(0,Math.min(1,(distance-a.distance)/span)):0;
    return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
  }
  return {
    clear,
    trigger(trail,seconds,source) {
      clear();if(source){pop={x:source.x,y:source.y+1.15,seconds};explode(source.x,source.y+1.5,seconds,Math.round(source.x*29+source.y*43),'crystal');chime.play('release');}
      if(!trail)return;
      const random=randomGenerator(1731+Math.round(trail.target.x*17+trail.target.y*31)),count=Math.min(ECHO.particleLimit-192,Math.max(12,Math.ceil(trail.length/.11))),particles=[];
      let segment=1;
      for(let i=0;i<count;i++) {
        const distance=trail.length*i/Math.max(1,count-1);
        while(segment<trail.points.length-1&&trail.points[segment].distance<distance)segment++;
        const a=trail.points[Math.max(0,segment-1)],b=trail.points[Math.min(segment,trail.points.length-1)],span=b.distance-a.distance,t=span?(distance-a.distance)/span:0;
        particles.push({x:a.x+(b.x-a.x)*t+(random()-.5)*.18,y:a.y+(b.y-a.y)*t+(random()-.5)*.18,distance,phase:random()*Math.PI*2});
      }
      active={trail,seconds,particles,exploded:false,arrived:false};dust.mesh.userData={targetId:trail.target.id,points:trail.points,length:trail.length,stage:'travel'};
    },
    update(seconds,standing,visible=()=>true,running=true) {
      chime.update(running);
      let shown=0;
      if(active) {
        const age=Math.max(0,seconds-active.seconds),phase=echoPhase(active.trail.length,age),target=active.trail.target;
        dust.mesh.userData.stage=phase.stage;
        if(!standing(target.id)||phase.stage==='done')active=null;
        else if(phase.stage==='burst') {
          if(!active.exploded){const at=active.seconds+phase.arrival+ECHO.orbitSeconds;explode(target.x,target.y+.6,at,Math.round(target.x*31+target.y*47),'arrival');finalShards={x:target.x,y:target.y+.6,seconds:at};chime.play('finish');active.exploded=true;}
        } else {
          if(phase.stage==='orbit'&&!active.arrived){active.arrived=true;chime.play('arrive');}
          const fade=phase.stage==='orbit'?Math.max(0,1-phase.orbit/ECHO.orbitSeconds):1;
          for(const p of active.particles) {
            if(p.distance>age*ECHO.growSpeed)break;
            const flutter=.025+Math.sin(age*2+p.phase)**2*.025,x=p.x+Math.sin(age*1.4+p.phase)*flutter,y=p.y+Math.sin(age*1.8+p.phase)*flutter;if(!visible(x,y))continue;
            const settle=Math.min(1,Math.max(0,age-p.distance/ECHO.growSpeed)),spark=.55+.45*Math.sin(age*5+p.phase)**6;
            const current=.65+.35*Math.sin(p.distance*1.9-age*7)**8;
            paint(dust,shown++,x,y,.16,spark*current*Math.min(1,settle*4+.3)*fade);
          }
          // A few moving wisps pull the eye along the path instead of leaving a
          // static dotted line. All particles still share one bounded draw call.
          for(let i=0;i<32&&phase.stage==='travel';i++) {
            const distance=Math.max(0,Math.min(active.trail.length,age*ECHO.growSpeed-i*.065)),p=along(active.trail,distance),curl=age*10+i*.5;
            const x=p.x+Math.cos(curl)*.08,y=p.y+Math.sin(curl)*.08;if(visible(x,y))paint(dust,shown++,x,y,.19,(1-i/38)*.8);
          }
          if(phase.stage==='orbit') {
            const count=Math.floor(96*Math.min(1,phase.orbit/.8)),progress=phase.orbit/ECHO.orbitSeconds,squeeze=1-Math.max(0,(progress-.65)/.35)*.16,rx=((target.rx??.75)+.4)*squeeze,ry=((target.ry??.3)+.4)*squeeze,cy=target.y+(target.size??1)*.22;
            for(let i=0;i<count;i++) {
              const angle=i/96*Math.PI*2+phase.orbit*(4+progress*3),ripple=1+Math.sin(i*.8-age*9)*.035,x=target.x+Math.cos(angle)*rx*ripple,y=cy+Math.sin(angle)*ry*ripple;if(!visible(x,y))continue;
              paint(dust,shown++,x,y,.18,.5+.5*Math.sin(age*7+i*.13)**4);
            }
          }
        }
      }
      dust.finish(shown);
      let sparkCount=0;bursts=bursts.filter(b=>seconds-b.seconds<ECHO.burstSeconds);
      for(const b of bursts) {
        const age=Math.max(0,seconds-b.seconds),fade=1-age/ECHO.burstSeconds;
        const launch=1-Math.exp(-age*14);
        for(const p of b.particles) {
          const x=b.x+p.dx*p.speed*launch*.45,y=b.y+p.dy*p.speed*launch*.45-.9*age*age;if(!visible(x,y)||sparkCount>=160)continue;
          paint(burst,sparkCount++,x,y,24,fade*(.6+.4*Math.sin(age*18+p.phase)**2));
        }
        // Thin expanding rings and delayed twinkles make the pop feel crisp
        // without increasing its brightness or flashing the whole screen.
        const ring=Math.min(1,age/.28);
        if(ring<1)for(let i=0;i<32;i++){const angle=i/32*Math.PI*2,x=b.x+Math.cos(angle)*(.15+ring*1.1),y=b.y+Math.sin(angle)*(.1+ring*.55);if(visible(x,y)&&sparkCount<160)paint(burst,sparkCount++,x,y,24,(1-ring)*.5);}
      }
      burst.finish(sparkCount);
      remnant.visible=false;
      if(pop){const age=seconds-pop.seconds;if(age<.16&&visible(pop.x,pop.y-.8)){remnant.visible=true;const press=Math.sin(Math.min(1,age/.12)*Math.PI);remnant.position.set(pop.x,pop.y,24);remnant.scale.set(1+press*.12,1-press*.18,1);remnant.rotation.z=Math.sin(age*50)*.04;remnant.material.opacity=ECHO.brightness*Math.max(0,1-age/.16);}if(age>=ECHO.burstSeconds)pop=null;}
      const fragments=pop??finalShards;
      for(let i=0;i<shards.length;i++) {
        const mesh=shards[i];mesh.visible=false;if(!fragments)continue;
        const age=seconds-fragments.seconds;if(age<.055||age>ECHO.burstSeconds)continue;
        const t=(age-.055)/(ECHO.burstSeconds-.055),angle=i/shards.length*Math.PI*2+.2,radius=(1-Math.exp(-t*4))*(i%2?.8:1.15),x=fragments.x+Math.cos(angle)*radius,y=fragments.y+.3+Math.sin(angle)*radius*.65+.45*Math.sin(t*Math.PI)-t*t*.7;
        if(!visible(x,y))continue;mesh.visible=true;mesh.position.set(x,y,24);mesh.rotation.z=angle+t*(i%2?-5:5);mesh.scale.setScalar(Math.max(.15,1-t*.85));mesh.material.opacity=ECHO.brightness*(1-t);
      }
      if(finalShards&&seconds-finalShards.seconds>ECHO.burstSeconds)finalShards=null;
    },
    dispose(){chime.dispose();for(const mesh of [remnant,...shards]){mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();}crystalMap.dispose();shardMap.dispose();for(const p of [dust,burst]){p.mesh.removeFromParent();p.geometry.dispose();p.mesh.material.dispose();}map.dispose();},
  };
}
