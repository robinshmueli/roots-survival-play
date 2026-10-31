import * as THREE from '../vendor/three.module.js';
import { WORLD, OCEAN } from './config.js';
import { COAST, cellSeed } from './biomes.js';
import { randomGenerator } from './art.js';

// Each arriving swell keeps its own properties while crossing streamed world chunks.
export function oceanWave(id) {
  const random=randomGenerator(cellSeed(id,4109,9283));
  return {
    id,arrival:id*OCEAN.interval+(random()-.5)*OCEAN.interval*.45,
    speed:1.25+random()*.75,height:.65+random()*.75,phase:random()*Math.PI*2,
    width:.075+random()*.055,runup:OCEAN.runup*(.55+random()*.5),
    duration:3.5+random()*2.2,bend:.7+random()*.8,
  };
}

const glsl = number => Number.isInteger(number) ? `${number}.0` : String(number);
const vertexShader = `
  varying vec2 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xy;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform vec3 uTint;
  uniform vec3 uShallow;
  uniform vec3 uCoastal;
  uniform vec3 uSea;
  uniform vec3 uDeep;
  uniform vec3 uFoam;
  uniform vec3 uWet;
  uniform vec4 uWaves[${OCEAN.waveCount}];
  uniform vec4 uShapes[${OCEAN.waveCount}];
  varying vec2 vWorld;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 cell = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(cell), hash(cell + vec2(1.0, 0.0)), f.x),
               mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0, 1.0)), f.x), f.y);
  }
  float coast(float y) {
    return ${glsl(COAST.base)}
      + sin(y * ${glsl(COAST.frequency)}) * ${glsl(COAST.amplitude)}
      + sin(y * ${glsl(COAST.detailFrequency)} + ${glsl(COAST.detailPhase)}) * ${glsl(COAST.detailAmplitude)};
  }
  float coastSlope(float y) {
    return cos(y * ${glsl(COAST.frequency)}) * ${glsl(COAST.frequency * COAST.amplitude)}
      + cos(y * ${glsl(COAST.detailFrequency)} + ${glsl(COAST.detailPhase)}) * ${glsl(COAST.detailFrequency * COAST.detailAmplitude)};
  }
  void main() {
    // Sample on the same world pixel grid as the ground art, including across chunk edges.
    vec2 p = (floor(vWorld * ${glsl(WORLD.pixelsPerUnit)}) + 0.5) / ${glsl(WORLD.pixelsPerUnit)};
    float slope = coastSlope(p.y);
    float distance = ${glsl(COAST.side)} * (p.x - coast(p.y)) / sqrt(1.0 + slope * slope);
    if (distance < -${glsl(OCEAN.runup * 1.2 + .8)}) discard;

    float depth = max(0.0, distance);
    vec3 water = mix(uShallow, uCoastal, smoothstep(0.0, 8.0, depth));
    water = mix(water, uSea, smoothstep(8.0, 22.0, depth));
    water = mix(water, uDeep, smoothstep(22.0, 55.0, depth));
    float swell = sin(distance * 1.1 + uTime * 0.9 + sin(p.y * 0.23) * 0.5);
    float ripple = noise(vec2(p.x * 1.2 + uTime * 0.35, p.y * 2.5 - uTime * 0.12));
    water *= 0.96 + swell * 0.035 + ripple * 0.08;

    float foam = 0.0, wash = 0.0, wet = 0.0, waveLight = 0.0;
    for (int i = 0; i < ${OCEAN.waveCount}; i++) {
      vec4 wave = uWaves[i], shape = uShapes[i];
      float globalAge = uTime - wave.x;
      if (globalAge > shape.z + 2.3 || -globalAge * wave.y > ${glsl(OCEAN.travel + 5)}) continue;
      // Reject distant fronts before evaluating their detailed shape and foam.
      if (distance > 0.0 && abs(distance - max(0.0, -globalAge * wave.y)) > 7.0) continue;
      float delay = sin(p.y * 0.035 + wave.w) * 1.1 * shape.w
        + sin(p.y * 0.13 + wave.w * 2.1) * 0.28;
      float age = globalAge - delay;
      float incoming = 1.0 - smoothstep(-0.15, 0.15, age);
      float travelFront = -age * wave.y;
      float approach = 1.0 - clamp(travelFront / ${glsl(OCEAN.travel)}, 0.0, 1.0);
      float retreat = clamp(age / shape.z, 0.0, 1.0);
      float reach = sin(retreat * 3.14159265) * shape.y;
      float front = mix(travelFront, -reach, 1.0 - incoming);
      front += (sin(p.y * 0.75 + wave.w) * 0.13
               + sin(p.y * 2.3 + wave.w * 3.0) * 0.055) * wave.z;
      float birth = 1.0 - smoothstep(${glsl(OCEAN.travel - 8)}, ${glsl(OCEAN.travel)}, travelFront);
      float life = birth * (1.0 - smoothstep(0.65, 1.0, retreat));
      if (life < 0.001 || (distance > 0.0 && abs(distance - front) > 2.7)) continue;
      float breaking = 1.0 - smoothstep(0.35, 4.5, max(0.0, front));
      float edgeWidth = mix(shape.x, 0.21 + wave.z * 0.1, breaking);
      float edge = 1.0 - smoothstep(edgeWidth * 0.3, edgeWidth, abs(distance - front));
      float lace = noise(vec2(p.y * 3.3 + wave.w * 9.0, distance * 7.0 + uTime * 0.5));
      float flecks = hash(floor(vec2(p.y * 10.0, (distance - front) * 16.0 + wave.w * 13.0)));
      float holes = smoothstep(0.2, 0.64, lace + flecks * 0.25);
      // The shaded front face builds height before the crest breaks into irregular foam.
      float face = exp(-pow((distance - front + 0.27 * wave.z) / (0.42 * wave.z), 2.0));
      float back = exp(-pow((distance - front - 0.32 * wave.z) / (0.55 * wave.z), 2.0));
      waveLight += (back * 0.10 - face * 0.095) * life * incoming * wave.z;
      float cap = 0.12 + wave.z * 0.12 + noise(vec2(p.y * 0.6 + wave.w * 4.0, wave.w)) * 0.22;
      foam = max(foam, edge * mix(cap, 0.98, breaking) * mix(0.35, 1.0, holes) * life);

      float onSand = 1.0 - smoothstep(-0.02, 0.04, distance);
      float washed = smoothstep(front - 0.05, front + 0.18, distance) * onSand;
      wash = max(wash, washed * (1.0 - incoming) * life);
      float trail = smoothstep(front + 0.12, front + 0.4, distance)
        * (1.0 - smoothstep(front + 0.55, front + 1.15, distance));
      float bubbles = smoothstep(0.53, 0.83, lace + flecks * 0.25);
      foam = max(foam, trail * bubbles * breaking * life * 0.58);
      float impact = smoothstep(-0.35, 0.12, age) * (1.0 - smoothstep(0.8, 1.5, age));
      float sprayBand = smoothstep(front - 0.72, front - 0.55, distance)
        * (1.0 - smoothstep(front - 0.18, front - 0.05, distance));
      float spray = step(0.9, hash(floor(vec2(p.y * 12.0, distance * 16.0)) + floor(uTime * 8.0)));
      foam = max(foam, sprayBand * spray * impact * 0.7);
      wet = max(wet, smoothstep(-shape.y - 0.2, -shape.y + 0.2, distance)
        * onSand * smoothstep(0.0, 0.4, retreat) * (1.0 - smoothstep(0.55, 1.0, retreat)));
    }

    float ocean = step(0.0, distance);
    vec3 color = mix(mix(uWet, uShallow, wash), water + vec3(waveLight), ocean);
    float alpha = mix(max(wet * 0.32, wash * 0.43), 1.0, ocean);
    color = mix(color, uFoam, foam);
    alpha = max(alpha, foam * 0.95);
    if (alpha < 0.02) discard;
    gl_FragColor = vec4(color * uTint, alpha);
    #include <colorspace_fragment>
  }
`;

export function createOcean(scene, lighting) {
  const chunks = new Map();
  const waves=Array.from({length:OCEAN.waveCount},()=>new THREE.Vector4());
  const shapes=Array.from({length:OCEAN.waveCount},()=>new THREE.Vector4());
  let windowId;
  return {
    addChunk(cx, cy) {
      const minimumCoast = COAST.base - COAST.amplitude - COAST.detailAmplitude;
      const maximumCoast=COAST.base+COAST.amplitude+COAST.detailAmplitude;
      if(COAST.side===1?(cx+1)*WORLD.chunkSize<minimumCoast-OCEAN.runup*1.2-.8:cx*WORLD.chunkSize>maximumCoast+OCEAN.runup*1.2+.8)return;
      const tint = new THREE.Color(0xffffff);
      const material = new THREE.ShaderMaterial({
        transparent:true, depthWrite:false,
        uniforms:{
          uTime:{value:0}, uTint:{value:tint},
          uWaves:{value:waves},uShapes:{value:shapes},
          uShallow:{value:new THREE.Color('#89b8b0')}, uCoastal:{value:new THREE.Color('#6aabae')},
          uSea:{value:new THREE.Color('#4d919f')}, uDeep:{value:new THREE.Color('#3c788c')},
          uFoam:{value:new THREE.Color('#e6f1dc')}, uWet:{value:new THREE.Color('#839a83')},
        },
        vertexShader,fragmentShader,
      });
      material.color=tint;
      const size=WORLD.chunkSize,mesh=new THREE.Mesh(new THREE.PlaneGeometry(size,size),material);
      mesh.name=`ocean-waves-${cx}-${cy}`;
      mesh.position.set((cx+.5)*size,(cy+.5)*size,.015);
      scene.add(mesh);lighting?.surface(mesh);chunks.set(`${cx},${cy}`,mesh);
    },
    removeChunk(id) {
      const mesh=chunks.get(id);if(!mesh)return;
      lighting?.remove(mesh);mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();chunks.delete(id);
    },
    update(seconds) {
      const current=Math.floor(seconds/OCEAN.interval);
      if(current!==windowId) {
        for(let i=0;i<OCEAN.waveCount;i++) {
          const wave=oceanWave(current+i-2);
          waves[i].set(wave.arrival,wave.speed,wave.height,wave.phase);
          shapes[i].set(wave.width,wave.runup,wave.duration,wave.bend);
        }
        windowId=current;
      }
      for(const mesh of chunks.values())mesh.material.uniforms.uTime.value=seconds;
    },
    stats() {return {oceanChunks:chunks.size};},
    dispose() {for(const id of chunks.keys())this.removeChunk(id);},
  };
}
