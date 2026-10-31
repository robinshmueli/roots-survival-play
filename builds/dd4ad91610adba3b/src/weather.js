import * as THREE from '../vendor/three.module.js';
import { WEATHER } from './config.js';
import { biomeWeightAt } from './biomes.js';
import { makeCanvas, texture, polygon, rect, randomGenerator, AUTUMN_COLORS } from './art.js';
import { windForce } from './wind.js';

const leafColors = AUTUMN_COLORS.map(color => new THREE.Color(color));
const snowColors = [0xffffff, 0xe5f0ef, 0xd3e6ed].map(color => new THREE.Color(color));
const canopySamples = new WeakMap();

function particleTexture(snow) {
  const [canvas, ctx] = makeCanvas(8);
  if (snow) {
    rect(ctx, 2, 3, 4, 2, '#c9e0e8');
    rect(ctx, 3, 2, 2, 4, '#e7f1f0');
    rect(ctx, 3, 3, 2, 2, '#ffffff');
  } else {
    polygon(ctx, [[4,0],[5,2],[7,2],[6,4],[7,5],[5,5],[4,7],[3,5],[1,5],[2,3],[1,1],[3,2]], '#ffffff');
    rect(ctx, 4, 3, 1, 4, '#939393');
    rect(ctx, 3, 2, 2, 1, '#c9c9c9');
  }
  return texture(canvas);
}

function makeBatch(scene, lighting, name, count, snow) {
  const geometry = new THREE.BufferGeometry();
  const fields = { position: 3, aColor: 3, aSize: 1, aAngle: 1, aAlpha: 1, aFlip: 1 };
  for (const [field, components] of Object.entries(fields)) {
    geometry.setAttribute(field, new THREE.BufferAttribute(new Float32Array(count * components), components).setUsage(THREE.DynamicDrawUsage));
  }
  const tint = new THREE.Color(0xffffff), map = particleTexture(snow);
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uMap: { value: map }, uTint: { value: tint }, uBrightness: { value: snow ? 1.3 : 1 } },
    vertexShader: `
      attribute vec3 aColor;
      attribute float aSize;
      attribute float aAngle;
      attribute float aAlpha;
      attribute float aFlip;
      varying vec3 vColor;
      varying float vAngle;
      varying float vAlpha;
      varying float vFlip;
      void main() {
        vColor = aColor; vAngle = aAngle; vAlpha = aAlpha; vFlip = aFlip;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform vec3 uTint;
      uniform float uBrightness;
      varying vec3 vColor;
      varying float vAngle;
      varying float vAlpha;
      varying float vFlip;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float c = cos(vAngle), s = sin(vAngle);
        uv = mat2(c, -s, s, c) * uv;
        uv.x /= max(vFlip, 0.2);
        uv += 0.5;
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) discard;
        vec4 ink = texture2D(uMap, uv);
        if (ink.a * vAlpha < 0.04) discard;
        gl_FragColor = vec4(ink.rgb * vColor * uTint * uBrightness, ink.a * vAlpha);
        #include <colorspace_fragment>
      }
    `,
  });
  // Lighting can tint particles through the same Color object used by the shader uniform.
  material.color = tint;
  const points = new THREE.Points(geometry, material);
  points.name = name;
  points.renderOrder = 3;
  points.frustumCulled = false;
  geometry.setDrawRange(0, 0);
  scene.add(points);
  lighting?.surface(points);
  return {
    points,
    write(particles, colors, leaves) {
      const a = geometry.attributes;
      particles.forEach((particle, i) => {
        const color = colors[particle.color];
        a.position.setXYZ(i, particle.x, leaves ? particle.y + particle.height : particle.y, 24);
        a.aColor.setXYZ(i, color.r, color.g, color.b);
        a.aSize.setX(i, particle.size);
        a.aAngle.setX(i, particle.angle);
        a.aAlpha.setX(i, particle.alpha);
        a.aFlip.setX(i, leaves ? .3 + .7 * Math.abs(Math.cos(particle.angle * 1.7)) : 1);
      });
      for (const attribute of Object.values(a)) attribute.needsUpdate = true;
      geometry.setDrawRange(0, particles.length);
      points.visible = particles.length > 0;
    },
    dispose() {
      lighting?.remove(points);
      points.removeFromParent();
      geometry.dispose(); material.dispose(); map.dispose();
    },
  };
}

function samplesFor(map) {
  if (canopySamples.has(map)) return canopySamples.get(map);
  const image = map.userData.treeImage??map.image, pixels = image.getContext('2d').getImageData(0, 0, image.width, image.height).data;
  const samples = [];
  for (let y = 8; y < image.height * .74; y += 3) {
    for (let x = 4; x < image.width - 4; x += 3) {
      const i = (y * image.width + x) * 4;
      if (pixels[i + 3] === 255 && pixels[i] > 125 && pixels[i] > pixels[i + 1] * 1.08) {
        samples.push({ x: x / image.width - .5, y: .5 - y / image.height, row: y / image.height * 16 });
      }
    }
  }
  canopySamples.set(map, samples);
  return samples;
}

export function createWeather(scene, lighting) {
  const random = randomGenerator(81457), emitters = new Map();
  const leaves = [], snow = [];
  const leafBatch = makeBatch(scene, lighting, 'falling-leaves', WEATHER.leafLimit, false);
  const snowBatch = makeBatch(scene, lighting, 'snowflakes', WEATHER.snowLimit, true);
  let previousSeconds, leafBudget = 0, hadLeaves = false;

  function emitLeaf(emitter, prewarm = false) {
    const { mesh, width, height, foot, samples } = emitter;
    if (!samples.length) return;
    const sample = samples[Math.floor(random() * samples.length)];
    const offset=mesh.userData.wind?.offsetAt?.(sample.x*width,sample.y*height)??{x:0,y:0};
    const bendX=offset.x,bendY=offset.y;
    const floorY = mesh.position.y + height * (.5 - foot) + (random() - .5) * 1.1;
    let fallingHeight = Math.max(.2, mesh.position.y + sample.y * height + bendY - floorY);
    if (prewarm) fallingHeight *= .2 + random() * .7;
    leaves.push({
      x: mesh.position.x + sample.x * width + bendX,
      y: floorY, height: fallingHeight, fall: .65 + random() * .65,
      size: 7 + Math.floor(random() * 3), color: Math.floor(random() * leafColors.length),
      angle: random() * Math.PI * 2, spin: (random() - .5) * 2.5,
      drift: .05 + random() * .2, phase: random() * Math.PI * 2,
      age: prewarm ? 1 : 0, landed: -1, alpha: prewarm ? .95 : 0,
    });
  }

  function emitSnow(bounds, top = false) {
    for (let attempt = 0; attempt < 16; attempt++) {
      const x = bounds.left + random() * (bounds.right - bounds.left);
      const y = top && attempt < 8 ? bounds.top + random() : bounds.bottom + random() * (bounds.top - bounds.bottom);
      const weight=biomeWeightAt(x,y,'snow');
      if (weight<=0||random()>weight) continue;
      snow.push({ x, y, fall: .9 + random() * 1.5, phase: random() * 7,
        size: 3 + Math.floor(random() * 4), color: Math.floor(random() * snowColors.length),
        age: top ? 0 : 1, angle: random() * Math.PI, alpha: top ? 0 : .7 });
      return;
    }
  }

  return {
    addTree(mesh, width, height, foot) {
      if (!['maple','autumnOak'].includes(mesh.userData.treeKind)) return;
      const rootY = mesh.position.y + height * (.5 - foot);
      const intensity=biomeWeightAt(mesh.position.x,rootY,'autumn');
      if(intensity<.015)return;
      emitters.set(mesh, { mesh, width, height, foot, intensity, samples: samplesFor(mesh.material.map) });
    },
    removeTree(mesh) { emitters.delete(mesh); },
    update(seconds, position, camera) {
      const dt = previousSeconds === undefined ? 0 : Math.min(.08, Math.max(0, seconds - previousSeconds));
      previousSeconds = seconds;
      const bounds = {
        left: position.x + (camera?.left ?? -24) - 2, right: position.x + (camera?.right ?? 24) + 2,
        bottom: position.y + (camera?.bottom ?? -16) - 2, top: position.y + (camera?.top ?? 16) + 2,
      };
      const candidates = [];
      for (const emitter of emitters.values()) {
        const x = emitter.mesh.position.x, y = emitter.mesh.position.y + emitter.height * .12;
        if (x > bounds.left - 2 && x < bounds.right + 2 && y > bounds.bottom - 4 && y < bounds.top + 4) candidates.push(emitter);
      }
      const totalWeight=candidates.reduce((sum,emitter)=>sum+emitter.intensity,0);
      function chooseEmitter() {
        let roll=random()*totalWeight;
        for(const emitter of candidates){roll-=emitter.intensity;if(roll<=0)return emitter;}
        return candidates[candidates.length-1];
      }
      if (candidates.length && !hadLeaves) {
        const initialLeaves = Math.min(18,Math.max(1,Math.round(totalWeight*.8)),WEATHER.leafLimit-leaves.length);
        for (let i = 0; i < initialLeaves; i++) emitLeaf(chooseEmitter(),true);
      }
      hadLeaves = candidates.length > 0;
      leafBudget = Math.min(2, leafBudget + dt * Math.min(14, totalWeight * .5));
      while (leafBudget >= 1 && candidates.length && leaves.length < WEATHER.leafLimit) {
        emitLeaf(chooseEmitter()); leafBudget--;
      }
      for (let i = leaves.length - 1; i >= 0; i--) {
        const p = leaves[i]; p.age += dt;
        if (p.landed < 0) {
          p.x += (windForce(seconds) * 1.8 + p.drift) * dt;
          p.y += Math.sin(seconds * 1.2 + p.phase) * .08 * dt;
          p.height = Math.max(0, p.height - p.fall * dt);
          p.angle += p.spin * dt;
          if (p.height === 0) p.landed = p.age;
        }
        p.alpha = Math.min(1, p.age * 3) * (p.landed < 0 ? .95 : Math.max(0, 1 - (p.age - p.landed) / 1.2));
        if (p.alpha <= 0 && p.age > 1 || p.x < bounds.left - 3 || p.x > bounds.right + 3 || p.y + p.height < bounds.bottom - 3 || p.y + p.height > bounds.top + 6) leaves.splice(i, 1);
      }
      let snowSamples = 0;
      for (let gy = 0; gy < 3; gy++) for (let gx = 0; gx < 3; gx++) {
        const x = bounds.left + (gx + .5) / 3 * (bounds.right - bounds.left);
        const y = bounds.bottom + (gy + .5) / 3 * (bounds.top - bounds.bottom);
        snowSamples+=biomeWeightAt(x,y,'snow');
      }
      const snowTarget = Math.round(WEATHER.snowLimit * snowSamples / 9);
      for (let i = snow.length - 1; i >= 0; i--) {
        const p = snow[i]; p.age += dt;
        p.x += (windForce(seconds) * .65 + Math.sin(seconds + p.phase) * .15) * dt;
        p.y -= p.fall * dt;
        const snowWeight=biomeWeightAt(p.x,p.y,'snow');
        p.alpha = Math.min(.85, p.age * 3)*snowWeight;
        if (!snowTarget || p.y < bounds.bottom - 1 || p.x < bounds.left - 1 || p.x > bounds.right + 1 || p.y > bounds.top + 2 || snowWeight<.015) snow.splice(i, 1);
      }
      const prewarm = snow.length === 0;
      let attempts = 0;
      while (snow.length < snowTarget && attempts++ < WEATHER.snowLimit) emitSnow(bounds, !prewarm);
      leafBatch.write(leaves, leafColors, true);
      snowBatch.write(snow, snowColors, false);
    },
    stats() { return { leafParticles: leaves.length, snowflakes: snow.length, leafEmitters: emitters.size }; },
    dispose() {
      emitters.clear(); leaves.length = 0; snow.length = 0;
      leafBatch.dispose(); snowBatch.dispose();
    },
  };
}
