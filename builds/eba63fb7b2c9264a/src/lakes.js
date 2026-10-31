import * as THREE from '../vendor/three.module.js';
import {LAKES,WORLD} from './config.js';
import {lakeBounds,lakeFish} from './lake-data.js';

const vertexShader=`
  varying vec2 vWorld;
  void main() {
    vec4 world=modelMatrix*vec4(position,1.0);
    vWorld=world.xy;
    gl_Position=projectionMatrix*viewMatrix*world;
  }
`;
const fragmentShader=`
  uniform float uTime;
  uniform vec3 uTint;
  uniform vec4 uLake;
  uniform vec2 uBasis;
  uniform vec3 uShape;
  uniform float uPhase;
  uniform int uFishCount;
  uniform vec4 uFish[4];
  uniform vec4 uMotion[4];
  uniform vec4 uSplash[4];
  uniform vec3 uShallow;
  uniform vec3 uDeep;
  uniform vec3 uFoam;
  uniform vec3 uShadow;
  varying vec2 vWorld;
  float hash(vec2 p) {return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p) {
    vec2 cell=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
    return mix(mix(hash(cell),hash(cell+vec2(1.0,0.0)),f.x),
      mix(hash(cell+vec2(0.0,1.0)),hash(cell+vec2(1.0)),f.x),f.y);
  }
  float lakeDistance(vec2 p) {
    vec2 d=p-uLake.xy;
    vec2 q=vec2(dot(d,uBasis),dot(d,vec2(-uBasis.y,uBasis.x)))/uLake.zw;
    float r=length(q),a=r>0.00001?atan(q.y,q.x):0.0;
    float edge=1.0+uShape.x*sin(2.0*a+uPhase)+uShape.y*cos(3.0*a-uPhase*0.7)
      +uShape.z*sin(5.0*a+uPhase*1.3);
    return (r-edge)*min(uLake.z,uLake.w);
  }
  void main() {
    vec2 p=(floor(vWorld*${WORLD.pixelsPerUnit}.0)+0.5)/${WORLD.pixelsPerUnit}.0;
    float distance=lakeDistance(p);
    if(distance>0.18)discard;
    float depth=max(0.0,-distance);
    float variation=noise(p*0.43+uPhase);
    vec3 color=mix(uShallow,uDeep,smoothstep(0.0,3.6,depth));
    color*=0.97+variation*0.055;
    float wave=sin(p.x*1.45+p.y*0.6-uTime*1.05+sin(p.y*0.8+uTime*0.16)*0.65);
    float crossing=sin(p.y*2.5-p.x*0.4+uTime*0.65);
    color*=0.98+wave*0.025+crossing*0.012;

    for(int i=0;i<4;i++) {
      if(i>=uFishCount)break;
      vec4 fish=uFish[i],motion=uMotion[i];
      vec2 d=p-fish.xy;
      float c=cos(fish.z),s=sin(fish.z);
      vec2 q=vec2(c*d.x+s*d.y,-s*d.x+c*d.y)/fish.w;
      q.y+=sin(q.x*7.0+uTime*1.3)*0.008;
      float body=1.0-step(1.0,pow(q.x/0.34,2.0)+pow(q.y/0.105,2.0));
      float tailY=q.y-motion.x*0.06;
      float tail=step(-0.59,q.x)*(1.0-step(-0.24,q.x))
        *(1.0-step(0.025+(-q.x-0.24)*0.34,abs(tailY)));
      float fins=step(-0.14,q.x)*(1.0-step(0.03,q.x))
        *(1.0-step(0.17-max(0.0,q.x+0.14)*0.55,abs(q.y)));
      float silhouette=max(body,max(tail,fins*0.65));
      color=mix(color,uShadow,silhouette*(0.35+motion.y*0.16));
    }

    float alpha=distance<0.0?1.0:(1.0-smoothstep(0.0,0.18,distance))*0.22;

    for(int i=0;i<4;i++) {
      if(i>=uFishCount)break;
      vec4 splash=uSplash[i];float age=splash.z;
      if(age>2.6)continue;
      vec2 d=p-splash.xy;
      float radius=length(d*vec2(1.0,1.28));
      float ring=(1.0-smoothstep(0.025,0.07,abs(radius-(0.12+age*0.66))))
        *(1.0-smoothstep(0.4,2.6,age));
      float second=(1.0-smoothstep(0.02,0.055,abs(radius-max(0.0,age-0.25)*0.5)))
        *smoothstep(0.25,0.4,age)*(1.0-smoothstep(0.8,2.1,age));
      float foam=max(ring*0.45,second*0.28);
      if(age<1.0) {
        for(int j=0;j<6;j++) {
          float direction=float(j)*2.39996+splash.w;
          float t=max(0.0,age-float(j)*0.025);
          vec2 drop=vec2(cos(direction),sin(direction)*0.45)*t*(0.55+float(j)*0.055);
          drop.y+=sin(t*3.14159265)*0.52;
          float droplet=(1.0-step(0.065,length(p-splash.xy-drop)))
            *(1.0-smoothstep(0.65,0.95,t));
          foam=max(foam,droplet*0.9);
        }
      }
      color=mix(color,uFoam,foam);alpha=max(alpha,foam);
    }
    gl_FragColor=vec4(color*uTint,alpha);
    #include <colorspace_fragment>
  }
`;

function makeLake(scene,lighting,lake) {
  const tint=new THREE.Color(0xffffff);
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,vertexShader,fragmentShader,
    uniforms:{
      uTime:{value:0},uTint:{value:tint},uLake:{value:new THREE.Vector4(lake.x,lake.y,lake.rx,lake.ry)},
      uBasis:{value:new THREE.Vector2(Math.cos(lake.angle),Math.sin(lake.angle))},
      uShape:{value:new THREE.Vector3(...lake.shape)},uPhase:{value:lake.phase},uFishCount:{value:lake.fishCount},
      uFish:{value:Array.from({length:4},()=>new THREE.Vector4())},
      uMotion:{value:Array.from({length:4},()=>new THREE.Vector4())},
      uSplash:{value:Array.from({length:4},()=>new THREE.Vector4())},
      uShallow:{value:new THREE.Color('#8ab5a5')},uDeep:{value:new THREE.Color('#3d7e8c')},
      uFoam:{value:new THREE.Color('#d9e9d6')},uShadow:{value:new THREE.Color('#183f49')},
    }});
  material.color=tint;
  const box=lakeBounds(lake,.3),width=box.maxX-box.minX,height=box.maxY-box.minY;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),material);
  mesh.name=`water-${lake.id}`;mesh.userData.lake=lake;mesh.position.set(lake.x,lake.y,.018);
  scene.add(mesh);lighting?.surface(mesh);
  return {lake,mesh,chunks:new Set()};
}

export function createLakes(scene,lighting) {
  const active=new Map();
  function remove(id) {
    const entry=active.get(id);if(!entry)return;
    lighting?.remove(entry.mesh);entry.mesh.removeFromParent();entry.mesh.geometry.dispose();entry.mesh.material.dispose();active.delete(id);
  }
  return {
    addChunk(cx,cy) {
      const size=WORLD.chunkSize,id=`${cx},${cy}`;
      for(const lake of LAKES) {
        const box=lakeBounds(lake,.3);
        if(box.maxX<cx*size||box.minX>(cx+1)*size||box.maxY<cy*size||box.minY>(cy+1)*size)continue;
        if(!active.has(lake.id))active.set(lake.id,makeLake(scene,lighting,lake));
        active.get(lake.id).chunks.add(id);
      }
    },
    removeChunk(id) {
      for(const [lakeId,entry] of active) {
        entry.chunks.delete(id);if(!entry.chunks.size)remove(lakeId);
      }
    },
    update(seconds) {
      for(const {lake,mesh} of active.values()) {
        const u=mesh.material.uniforms;u.uTime.value=seconds;
        for(let i=0;i<lake.fishCount;i++) {
          const fish=lakeFish(lake,i,seconds);
          u.uFish.value[i].set(fish.x,fish.y,fish.angle,fish.size);
          u.uMotion.value[i].set(fish.tail,fish.depth,0,0);
          u.uSplash.value[i].set(fish.splash.x,fish.splash.y,fish.splash.age,fish.phase);
        }
      }
    },
    stats() {return {activeLakes:active.size,lakeFish:[...active.values()].reduce((sum,entry)=>sum+entry.lake.fishCount,0)};},
    dispose() {for(const id of active.keys())remove(id);},
  };
}
