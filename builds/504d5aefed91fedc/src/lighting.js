import {t} from './i18n.js';
import * as THREE from '../vendor/three.module.js';
import { DAY_CYCLE } from './config.js';
import { makeCanvas, texture } from './art.js';
import {projectShadowVolume} from './shadow-volume.js';
import {createLocalLights} from './local-lights.js';

const phases = [
  { id: 'day', label: t("יום"), icon: '☀' },
  { id: 'evening', label: t("ערב"), icon: '◒' },
  { id: 'night', label: t("לילה"), icon: '☾' },
];
const daySeconds=DAY_CYCLE.phaseSeconds.day;
const eveningEnd=daySeconds+DAY_CYCLE.phaseSeconds.evening;
const cycleSeconds=eveningEnd+DAY_CYCLE.phaseSeconds.night;
// A cyclic palette spreads sunset and sunrise over time instead of fading only after a label changes.
const lightStops=[
  [0,                         0xffd3ad, .31, 0x4a4033],
  [daySeconds*.35,            0xffffff, .27, 0x34432d],
  [daySeconds*.8,             0xffefcd, .32, 0x41412f],
  [daySeconds,                0xffce94, .37, 0x4c3e33],
  [daySeconds+DAY_CYCLE.phaseSeconds.evening*.5, 0xffae80, .43, 0x453443],
  [eveningEnd,                0x53638c, .40, 0x151e31],
  [eveningEnd+DAY_CYCLE.phaseSeconds.night*.32, 0x263657, .36, 0x070d1c],
  [eveningEnd+DAY_CYCLE.phaseSeconds.night*.65, 0x304367, .35, 0x0b1426],
  [cycleSeconds,              0xffd3ad, .31, 0x4a4033],
].map(([at,tint,opacity,shadow])=>({at,tint:new THREE.Color(tint),opacity,shadow:new THREE.Color(shadow)}));
const shadowMaps = new WeakMap();
const mix = (a, b, t) => a + (b - a) * t;

// This clock uses elapsed real seconds; movement's capped delta cannot slow it down.
export function getCycleState(seconds) {
  const elapsed = Math.max(0, seconds);
  let phaseTime = elapsed % cycleSeconds;
  let index = 0;
  while (index < phases.length - 1 && phaseTime >= DAY_CYCLE.phaseSeconds[phases[index].id]) {
    phaseTime -= DAY_CYCLE.phaseSeconds[phases[index].id];
    index++;
  }
  const phase = phases[index];
  const duration = DAY_CYCLE.phaseSeconds[phase.id];
  const cycleTime=elapsed%cycleSeconds;
  const nextStop=lightStops.findIndex(stop=>stop.at>cycleTime);
  const before=lightStops[nextStop-1],after=lightStops[nextStop];
  const progress=(cycleTime-before.at)/(after.at-before.at);
  const blend = progress * progress * (3 - 2 * progress);
  const phaseProgress = phaseTime / duration;
  const easedProgress = phaseProgress * phaseProgress * (3 - 2 * phaseProgress);
  // A continuous orbit spreads the movement over the entire cycle, including daylight.
  // Keep the angle unwrapped so both position and speed stay continuous at sunrise.
  const angle = -.65 + elapsed / cycleSeconds * Math.PI * 2 * DAY_CYCLE.shadowSpeed;
  let length;
  if (phase.id === 'day') {
    // Morning/evening shadows are longer; the sun is highest around midday.
    length = .52 + .53 * (.5 + .5 * Math.cos(phaseProgress * Math.PI * 2));
  } else if (phase.id === 'evening') {
    length = mix(1.05, 1.28, easedProgress);
  } else {
    length = mix(1.28, 1.05, easedProgress) - .485 * Math.sin(phaseProgress * Math.PI) ** 2;
  }
  return {
    phase,
    next: phases[(index + 1) % phases.length],
    day: Math.floor(elapsed / cycleSeconds) + 1,
    remaining: Math.ceil(duration - phaseTime),
    progress: phaseProgress,
    tint: before.tint.clone().lerp(after.tint, blend),
    shadowColor: before.shadow.clone().lerp(after.shadow, blend),
    angle,
    length,
    opacity: mix(before.opacity, after.opacity, blend),
  };
}

function shadowTexture(sourceMap) {
  if (shadowMaps.has(sourceMap)) return shadowMaps.get(sourceMap);
  const source = sourceMap.userData.treeImage ?? sourceMap.image;
  const [canvas, ctx] = makeCanvas(source.width, source.height);
  ctx.drawImage(source, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const map = texture(canvas);
  shadowMaps.set(sourceMap, map);
  return map;
}

export function createLighting(scene) {
  const fireLights=createLocalLights();
  const surfaces = new Set();
  const casters = new Map();
  const previousTint = new THREE.Color(-1, -1, -1);
  let previousUI = '';
  const hud = document.getElementById('day-cycle');
  const label = document.getElementById('period-label');
  const icon = document.getElementById('period-icon');
  const day = document.getElementById('day-number');
  const countdown = document.getElementById('period-countdown');
  const meter = document.getElementById('period-progress');

  return {
    surface(mesh) {
      fireLights.attach(mesh.material);
      surfaces.add(mesh.material);
      if (previousTint.r >= 0) mesh.material.color.copy(previousTint);
      return mesh;
    },
    remove(mesh) {
      surfaces.delete(mesh.material);
      const caster = casters.get(mesh);
      if (!caster) return;
      caster.shadow.removeFromParent();
      caster.shadow.geometry.dispose();
      caster.shadow.material.dispose();
      casters.delete(mesh);
    },
    castShadow(owner, { width, height, foot = .9375, volume = null }) {
      // Wood and leaves share one silhouette. Projecting both translucent atlas
      // layers separately would darken the trunk wherever their shadows overlap.
      const treeImage=owner.material.map?.userData.treeImage;
      const geometry = volume||treeImage?new THREE.BufferGeometry():owner.geometry.clone();
      if(treeImage&&!volume) {
        geometry.setAttribute('position',new THREE.BufferAttribute(owner.geometry.attributes.position.array.slice(0,12),3));
        geometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,1,1,1,0,0,1,0],2));
        geometry.setIndex([0,2,1,2,3,1]);
      }
      if(volume) {
        geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(volume.length*3),3));
        geometry.setIndex(Array.from({length:volume.length-2},(_,i)=>[0,i+1,i+2]).flat());
        geometry.setDrawRange(0,0);
      }
      geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
      const material = new THREE.MeshBasicMaterial({
        map: volume?null:shadowTexture(owner.material.map),
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const shadow = new THREE.Mesh(geometry, material);
      shadow.name = `shadow-${owner.name || 'tree'}`;
      shadow.position.z = .04;
      scene.add(shadow);
      casters.set(owner, { owner, shadow, width, height, foot, volume, lastAngle: NaN, lastLength: NaN, lastFlip: NaN, lastWind: -1, map: owner.material.map });
      surfaces.add(owner.material);
      fireLights.attach(owner.material);
      if (previousTint.r >= 0) owner.material.color.copy(previousTint);
      return shadow;
    },
    update(seconds,lights=[],underground=false) {
      const state = getCycleState(seconds);
      if(underground){state.tint.set(0x171e29);state.opacity=.28;state.shadowColor.set(0x05090d);state.angle=-.7;state.length=.35;}
      fireLights.update(state.tint,lights);
      if (!previousTint.equals(state.tint)) {
        surfaces.forEach(material => material.color.copy(state.tint));
        previousTint.copy(state.tint);
      }
      const dx = Math.cos(state.angle), dy = Math.sin(state.angle);
      for (const caster of casters.values()) {
        const { owner, shadow, width, height, foot, volume } = caster;
        shadow.visible=owner.visible;
        if(!owner.visible)continue;
        // The anchor follows the sprite's feet, including the moving player.
        shadow.position.x = owner.position.x;
        shadow.position.y = owner.position.y + height * (.5 - foot);
        shadow.material.color.copy(state.shadowColor);
        shadow.material.opacity = state.opacity * (owner.userData.occlusionBaseOpacity??owner.material.opacity);
        if (!volume && caster.map !== owner.material.map) {
          caster.map = owner.material.map;
          shadow.material.map = shadowTexture(caster.map);
        }
        const flip = Math.sign(owner.scale.x);
        const wind = owner.userData.wind;
        const windVersion = wind?.version ?? 0;
        if (caster.lastAngle !== state.angle || caster.lastLength !== state.length || caster.lastFlip !== flip || caster.lastWind !== windVersion) {
          const positions = shadow.geometry.attributes.position;
          const source = owner.geometry.attributes.position;
          const base = wind?.base ?? source.array;
          if(volume) {
            const hull=projectShadowVolume(volume,{x:dx,y:dy},state.length,flip);
            for(let i=0;i<positions.count;i++) {
              const point=hull[Math.min(i,hull.length-1)];positions.setXYZ(i,point.x,point.y,0);
            }
            shadow.geometry.setDrawRange(0,(hull.length-2)*3);
          } else for (let i = 0; i < positions.count; i++) {
            const x = base[i * 3], y = base[i * 3 + 1];
            const distance = (y + height * (foot - .5)) * state.length;
            // Apply the actual tree displacement after projecting the resting silhouette.
            const bendX = (source.getX(i) - x) * flip;
            const bendY = source.getY(i) - y;
            positions.setXYZ(i, -dy * x * flip + dx * distance + bendX, dx * x * flip + dy * distance + bendY, 0);
          }
          positions.needsUpdate = true;
          shadow.geometry.computeBoundingSphere();
          caster.lastAngle = state.angle;
          caster.lastLength = state.length;
          caster.lastFlip = flip;
          caster.lastWind = windVersion;
        }
      }

      const uiKey = `${state.day}:${state.phase.id}:${state.remaining}`;
      if (uiKey !== previousUI) {
        hud.dataset.period = state.phase.id;
        if (label.textContent !== state.phase.label) label.textContent = state.phase.label;
        icon.textContent = state.phase.icon;
        day.textContent = t("יום {0}", [state.day]);
        const minutes = Math.floor(state.remaining / 60);
        const seconds = String(state.remaining % 60).padStart(2, '0');
        countdown.textContent = t("{0} בעוד {1}:{2}", [state.next.label, minutes, seconds]);
        meter.style.width = `${state.progress * 100}%`;
        previousUI = uiKey;
      }
      return state;
    },
  };
}
