import * as THREE from '../vendor/three.module.js';
import { WORLD, GRASS } from './config.js';
import { windForce } from './wind.js';
import { biomeBlendAt, pickBiome, waterAt, cellSeed } from './biomes.js';
import { makeCanvas, texture, polygon, randomGenerator } from './art.js';

const density = { forest: .64, jungle: .83, autumn: .4, cherry: .62, desert: .018, beach: .025, snow: 0, ocean: 0 };
const colors = Object.fromEntries(Object.entries({
  forest: '#789653', jungle: '#578243', autumn: '#99934e', cherry: '#829d57',
  desert: '#ad9c63', beach: '#a9ad67',
}).map(([id, color]) => [id, new THREE.Color(color)]));

function grassTexture() {
  const [canvas, ctx] = makeCanvas(64, 16);
  for (let variant = 0; variant < 4; variant++) {
    const x = variant * 16;
    const blades = [
      [[8,14],[2,8],[3,4],[7,10]],
      [[7,14],[7 + variant % 2,1],[10,5],[9,14]],
      [[8,14],[11,8],[14,5],[12,11]],
    ];
    if (variant % 2) blades.push([[6,14],[2,11],[1,7],[5,10]]);
    if (variant > 1) blades.push([[9,14],[12,3],[12,10],[11,14]]);
    blades.forEach((blade, i) => polygon(ctx, blade.map(([a,b]) => [x+a,b]), i % 2 ? '#ffffff' : '#c6c6c6'));
    polygon(ctx, [[x+5,13],[x+10,12],[x+12,14],[x+6,14]], '#a6a6a6');
  }
  return texture(canvas);
}

function makeBatch(scene, lighting, atlas, cx, cy) {
  const roots = [], scales = [], shades = [], variants = [];
  const size = WORLD.chunkSize, spacing = GRASS.spacing;
  for (let gy = Math.floor(cy * size / spacing) - 1; gy <= Math.ceil((cy + 1) * size / spacing); gy++) {
    for (let gx = Math.floor(cx * size / spacing) - 1; gx <= Math.ceil((cx + 1) * size / spacing); gx++) {
      const random = randomGenerator(cellSeed(gx, gy, 9873));
      const x = (gx + .5) * spacing + (random() - .5) * .54;
      const y = (gy + .5) * spacing + (random() - .5) * .54;
      if (x < cx * size || x >= (cx+1) * size || y < cy * size || y >= (cy+1) * size || Math.abs(x) > WORLD.size/2 || Math.abs(y) > WORLD.size/2 || waterAt(x,y)) continue;
      const biome = pickBiome(biomeBlendAt(x,y), random());
      if (random() > density[biome.id] || !colors[biome.id]) continue;
      roots.push(x,y,10-y*.01-.004);
      scales.push(.46 + random() * .29 + (biome.id === 'jungle' ? .12 : 0));
      const color = colors[biome.id], shade = .87 + random() * .25;
      shades.push(color.r*shade,color.g*shade,color.b*shade);
      variants.push(Math.floor(random()*4));
    }
  }
  if (!scales.length) return null;
  const base = new THREE.PlaneGeometry(1,1,1,8);
  const geometry = new THREE.InstancedBufferGeometry().copy(base);
  base.dispose();
  geometry.instanceCount = scales.length;
  for (const [name, array, count] of [['aRoot', roots, 3], ['aScale', scales, 1], ['aColor', shades, 3], ['aVariant', variants, 1]]) {
    geometry.setAttribute(name, new THREE.InstancedBufferAttribute(new Float32Array(array), count));
  }
  geometry.setAttribute('aBend', new THREE.InstancedBufferAttribute(new Float32Array(scales.length*3),3).setUsage(THREE.DynamicDrawUsage));
  geometry.boundingBox = new THREE.Box3(new THREE.Vector3(cx*size-1,cy*size-1,3),new THREE.Vector3((cx+1)*size+1,(cy+1)*size+2,17));
  geometry.boundingSphere = geometry.boundingBox.getBoundingSphere(new THREE.Sphere());
  const tint = new THREE.Color(0xffffff);
  const material = new THREE.ShaderMaterial({
    uniforms: { uMap: {value: atlas}, uTint: {value: tint}, uWindForce: {value: 0} },
    vertexShader: `
      attribute vec3 aRoot;
      attribute float aScale;
      attribute vec3 aColor;
      attribute float aVariant;
      attribute vec3 aBend;
      uniform float uWindForce;
      varying vec2 vUv;
      varying vec3 vColor;
      void main() {
        vUv = vec2((uv.x + aVariant) / 4.0, uv.y);
        vColor = aColor;
        float growth = max(0.0, (uv.y - 0.125) / 0.875);
        float weight = growth * growth;
        vec2 local = vec2((uv.x - 0.5) * aScale, (uv.y - 0.125) * aScale);
        local.y *= 1.0 - aBend.z * 0.45;
        local += (vec2(1.0, 0.07) * uWindForce * 0.45 * aScale + aBend.xy) * weight;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(aRoot + vec3(local, 0.0), 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform vec3 uTint;
      varying vec2 vUv;
      varying vec3 vColor;
      void main() {
        vec4 ink = texture2D(uMap, vUv);
        if (ink.a < 0.5) discard;
        gl_FragColor = vec4(ink.rgb * vColor * uTint, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  material.color = tint;
  const mesh = new THREE.Mesh(geometry,material);
  mesh.name = `grass-${cx}-${cy}`;
  scene.add(mesh); lighting?.surface(mesh);
  return {mesh,cx,cy,recovering:false};
}

// Swept footsteps catch blades even between fast sprint frames. Teleports reset the sweep.
export function footContact(x, y, previous, position, radius) {
  const dx=position.x-previous.x, dy=position.y-previous.y, length=dx*dx+dy*dy;
  const t=length>0 && length<4 ? Math.max(0,Math.min(1,((x-previous.x)*dx+(y-previous.y)*dy)/length)) : 1;
  const ox=x-(previous.x+dx*t), oy=y-(previous.y+dy*t), distance=Math.hypot(ox,oy);
  return { pressure: Math.max(0,1-distance/radius), x:distance>.001?ox/distance:0, y:distance>.001?oy/distance:-1 };
}

export function createGrass(scene, lighting) {
  const chunks = new Map(), atlas = grassTexture();
  let previousSeconds, previousPosition;
  return {
    addChunk(cx,cy) {
      const batch=makeBatch(scene,lighting,atlas,cx,cy);
      if(batch)chunks.set(`${cx},${cy}`,batch);
    },
    removeChunk(id) {
      const batch=chunks.get(id); if(!batch)return;
      lighting?.remove(batch.mesh); batch.mesh.removeFromParent();
      batch.mesh.geometry.dispose(); batch.mesh.material.dispose(); chunks.delete(id);
    },
    update(seconds, position, interaction = {}) {
      const dt=previousSeconds===undefined?0:Math.min(.1,Math.max(0,seconds-previousSeconds));
      const previous=previousPosition??position;
      previousSeconds=seconds;
      const radius=GRASS.touchRadius*(interaction.sprinting?1.15:1);
      const direction=interaction.direction??{x:0,y:0};
      const force=windForce(seconds);
      for(const batch of chunks.values()) {
        const {mesh,cx,cy}=batch;
        mesh.material.uniforms.uWindForce.value=force;
        const near=position.x>cx*WORLD.chunkSize-2&&position.x<(cx+1)*WORLD.chunkSize+2&&position.y>cy*WORLD.chunkSize-2&&position.y<(cy+1)*WORLD.chunkSize+2;
        if(!near&&!batch.recovering)continue;
        const a=mesh.geometry.attributes, bends=a.aBend.array, roots=a.aRoot.array;
        let changed=false, recovering=false;
        for(let i=0;i<bends.length;i+=3) {
          const contact=near?footContact(roots[i],roots[i+1],previous,position,radius):{pressure:0};
          const pressure=contact.pressure;
          const lean=interaction.sprinting?.38:.28;
          const tx=pressure*(contact.x*.8+direction.x*.45)*lean;
          const ty=pressure*(contact.y*.8+direction.y*.45)*lean;
          const factor=1-Math.exp(-dt*(pressure>bends[i+2]?18:GRASS.recovery));
          const targets=[pressure?tx:0,pressure?ty:0,pressure];
          for(let axis=0;axis<3;axis++) {
            let value=bends[i+axis]+(targets[axis]-bends[i+axis])*factor;
            if(Math.abs(value)<.0001)value=0;
            if(value!==bends[i+axis]){bends[i+axis]=value;changed=true;}
          }
          if(bends[i+2]>.0001)recovering=true;
        }
        if(changed)a.aBend.needsUpdate=true;
        batch.recovering=recovering;
      }
      previousPosition={x:position.x,y:position.y};
    },
    stats() {
      let grassTufts=0, pressedGrass=0;
      for(const {mesh} of chunks.values()) {
        grassTufts+=mesh.geometry.instanceCount;
        const a=mesh.geometry.attributes.aBend;
        for(let i=0;i<a.count;i++)if(a.getZ(i)>.05)pressedGrass++;
      }
      return {grassBatches:chunks.size,grassTufts,pressedGrass};
    },
    dispose() {
      for(const id of chunks.keys())this.removeChunk(id);
      atlas.dispose();
    },
  };
}
