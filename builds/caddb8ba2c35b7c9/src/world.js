import * as THREE from '../vendor/three.module.js';
import { WORLD, HARVEST, GRASS } from './config.js';
import { biomeAt, waterAt } from './biomes.js';
import { chunkObjects } from './world-data.js';
import { groundArt } from './terrain.js';
import { createWind, createTreeGeometry } from './wind.js';
import { createWeather } from './weather.js';
import { createGrass } from './grass.js';
import { createOcean } from './ocean.js';
import { createLakes } from './lakes.js';
import { createResources, treeMaxHealth } from './resources.js';
import { itemArt, stumpArt } from './items.js';
import { sprite, texture, treeWindArt, rockArt, cactusArt, ROCK_TYPES, TREE_ART } from './art.js';

export function createWorld(scene, lighting) {
  const loaded = new Map(), data = new Map(), maps = new Map();
  const wind = createWind();
  const ocean = createOcean(scene,lighting);
  const lakes = createLakes(scene,lighting);
  const resources=createResources(),treeMeshes=new Map(),decorations=new Map(),lootMaps=new Map();
  let mapRevision=0,mapSnapshot={revision:0,felled:[]};
  let weather, grass, worldSeconds=0;
  const size = WORLD.chunkSize;
  const key = (cx, cy) => `${cx},${cy}`;

  function objects(cx, cy) {
    const id = key(cx, cy);
    if (!data.has(id)) {
      if (data.size >= 256) data.delete(data.keys().next().value);
      data.set(id, chunkObjects(cx, cy));
    }
    return data.get(id);
  }

  function asset(object) {
    const warm = object.type === 'rock' && object.biome === 'desert';
    const cold = object.type === 'rock' && object.biome === 'snow';
    const id = `${object.type}:${object.kind ?? ''}:${object.variant}:${object.snowCover ?? ''}:${warm}:${cold}`;
    if (!maps.has(id)) {
      let map;
      if (object.type === 'tree') map = treeWindArt(310, object.kind, object.variant, object.snowCover);
      else if (object.type === 'cactus') map = cactusArt(object.variant);
      else {
        map = rockArt(700 + object.variant, ROCK_TYPES[object.variant]);
        if (warm) {
          const ctx = map.image.getContext('2d');
          const image = ctx.getImageData(0, 0, map.image.width, map.image.height);
          for (let i = 0; i < image.data.length; i += 4) {
            if (image.data[i + 3] !== 255) continue;
            image.data[i] = Math.min(255, image.data[i] * 1.18);
            image.data[i + 1] *= 1.04;
            image.data[i + 2] *= .79;
          }
          ctx.putImageData(image, 0, 0);
          map.needsUpdate = true;
        }
        if (cold) {
          const ctx = map.image.getContext('2d');
          const image = ctx.getImageData(0, 0, map.image.width, map.image.height);
          for (let x = 1; x < map.image.width - 1; x++) {
            for (let y = 1; y < map.image.height - 5; y++) {
              if (image.data[(y * map.image.width + x) * 4 + 3] !== 255) continue;
              for (let dy = 1; dy <= 3; dy++) {
                const i = ((y + dy) * map.image.width + x) * 4;
                if (image.data[i + 3] !== 255) continue;
                image.data[i] = dy === 3 ? 177 : 232;
                image.data[i + 1] = dy === 3 ? 202 : 242;
                image.data[i + 2] = dy === 3 ? 209 : 238;
              }
              break;
            }
          }
          ctx.putImageData(image, 0, 0);
          map.needsUpdate = true;
        }
      }
      maps.set(id, map);
    }
    return maps.get(id);
  }

  function load(cx, cy) {
    const group = new THREE.Group();
    group.name = `chunk-${cx}-${cy}`;
    scene.add(group);
    const scenery=objects(cx,cy),map = groundArt(cx, cy, scenery);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map }));
    ground.name = 'ground';
    ground.position.set((cx + .5) * size, (cy + .5) * size, 0);
    group.add(ground);
    lighting?.surface(ground);
    const chunk={group,meshes:[ground],map};
    for (const object of scenery) {
      if(object.type==='tree'&&!resources.standing(object.id)&&!resources.bodyVisible(object.id,worldSeconds))continue;
      addObject(object,chunk);
    }
    loaded.set(key(cx, cy), chunk);
    grass?.addChunk(cx, cy);
    ocean.addChunk(cx,cy);
    lakes.addChunk(cx,cy);
  }

  function addObject(object,chunk) {
    let width, height, foot;
    if (object.type === 'tree') {
      width = TREE_ART.width / 16 * object.size;
      height = TREE_ART.height / 16 * object.size;
      foot = TREE_ART.foot;
    } else if (object.type === 'cactus') {
      width = 2 * object.size; height = 3 * object.size; foot = 43 / 48;
    } else {
      width = 3 * object.size; height = 2.5 * object.size; foot = .9;
    }
    const mesh = sprite(asset(object), width, height);
    mesh.name = object.type === 'tree' ? 'tree' : object.type === 'rock' ? `rock-${ROCK_TYPES[object.variant]}` : 'cactus';
    mesh.userData.variant = object.variant;
    mesh.userData.object = object;
    mesh.position.set(object.x, object.y + height * (foot - .5), 10 - object.y * .01);
    if (object.type === 'tree') {
      mesh.geometry.dispose();
      mesh.geometry = createTreeGeometry(width,height);
      wind.addTree(mesh, object.kind, height, foot);
      weather?.addTree(mesh, width, height, foot);
      treeMeshes.set(object.id,mesh);
    }
    chunk.group.add(mesh);
    lighting?.castShadow(mesh, { width, height, foot });
    chunk.meshes.push(mesh);
  }

  function unload(id) {
    const chunk = loaded.get(id);
    grass?.removeChunk(id);
    ocean.removeChunk(id);
    lakes.removeChunk(id);
    for (const mesh of chunk.meshes) {
      if (mesh.userData.wind) wind.removeTree(mesh);
      if(mesh.userData.object?.type==='tree')treeMeshes.delete(mesh.userData.object.id);
      weather?.removeTree(mesh);
      lighting?.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    chunk.map.dispose();
    chunk.group.removeFromParent();
    loaded.delete(id);
  }

  function removeTreeMesh(mesh) {
    const object=mesh.userData.object;
    const chunk=loaded.get(key(Math.floor(object.x/size),Math.floor(object.y/size)));
    if(chunk)chunk.meshes=chunk.meshes.filter(owner=>owner!==mesh);
    wind.removeTree(mesh);weather?.removeTree(mesh);lighting?.remove(mesh);
    mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();treeMeshes.delete(object.id);
  }

  function updateTreeEffects(seconds) {
    for(const [id,mesh] of treeMeshes) {
      const state=resources.trees.get(id);if(!state)continue;
      const object=mesh.userData.object,positions=mesh.geometry.attributes.position;
      if(state.felled) {
        const elapsed=seconds-state.fallAt;
        if(elapsed>=HARVEST.fallTime+HARVEST.groundTime){removeTreeMesh(mesh);continue;}
        if(!mesh.userData.fallBase) {
          const original=mesh.userData.wind?.base??positions.array.slice();
          wind.removeTree(mesh);weather?.removeTree(mesh);
          mesh.userData.fallBase=positions.array.slice();
          mesh.userData.wind={base:original,version:0};
        }
        const height=TREE_ART.height/16*object.size,root=height*(.5-TREE_ART.foot);
        const progress=Math.min(1,elapsed/HARVEST.fallTime),angle=progress*progress*Math.PI/2*state.fallDirection;
        const base=mesh.userData.fallBase,c=Math.cos(angle),s=Math.sin(angle);
        for(let i=0;i<positions.count;i++) {
          const x=base[i*3],y=base[i*3+1]-root;
          positions.setXY(i,x*c+y*s,root+y*c-x*s*(1-.58*progress));
        }
        // Once down, the tree belongs to the ground layer, underneath feet and grass.
        if(progress===1&&!mesh.userData.grounded) {
          mesh.userData.grounded=true;mesh.position.z=.065;
          lighting?.remove(mesh);lighting?.surface(mesh);
        }
      } else {
        const age=seconds-state.hitAt;
        if(age<.38) {
          const amount=Math.sin(age*42)*Math.exp(-age*10)*.16;
          const height=TREE_ART.height/16*object.size,root=height*(.5-TREE_ART.foot);
          for(let i=0;i<positions.count;i++)positions.setX(i,positions.getX(i)+amount*Math.max(0,(positions.getY(i)-root)/height));
        } else continue;
      }
      positions.needsUpdate=true;mesh.geometry.computeBoundingSphere();
      if(mesh.userData.wind)mesh.userData.wind.version++;
    }
  }

  function updateLoot(seconds) {
    const wanted=new Set();
    function show(id,object,stump=false) {
      if(!loaded.has(key(Math.floor(object.x/size),Math.floor(object.y/size))))return;
      wanted.add(id);
      if(!decorations.has(id)) {
        const type=stump?'stump':object.type;
        if(!lootMaps.has(type))lootMaps.set(type,texture(stump?stumpArt():itemArt(type)));
        const scale=type==='apple'?.72:1;
        const mesh=sprite(lootMaps.get(type),stump?1.5:scale,stump?.94:scale);
        mesh.name=stump?'stump':`dropped-${type}`;mesh.userData.dropId=id;
        scene.add(mesh);lighting?.surface(mesh);decorations.set(id,mesh);
      }
      const mesh=decorations.get(id);
      mesh.position.set(object.x,object.y+(stump?.25:.2+Math.sin(seconds*2+object.x)*.035),10-object.y*.01+.002);
    }
    for(const [id,state] of resources.trees)if(state.dropped)show(`stump:${id}`,state.tree,true);
    for(const [id,drop] of resources.drops)show(id,drop);
    for(const [id,mesh] of decorations)if(!wanted.has(id)) {
      lighting?.remove(mesh);mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();decorations.delete(id);
    }
  }

  return {
    biomeAt,
    update(seconds, position = { x: 0, y: 0 }, camera, interaction = {}) {
      worldSeconds=seconds;
      const {landed:landedTrees,regrown:regrownTrees}=resources.update(seconds);
      if(regrownTrees.length)mapRevision++;
      weather ??= createWeather(scene, lighting);
      // The original pixel grass is already painted into the ground texture.
      if(GRASS.enabled)grass ??= createGrass(scene, lighting);
      // Keep nearby scenery and long shadows loaded, independent of the full world's size.
      const padding = 16;
      const minX = Math.max(-WORLD.size / 2, position.x + (camera?.left ?? -24) - padding);
      const maxX = Math.min(WORLD.size / 2, position.x + (camera?.right ?? 24) + padding);
      const minY = Math.max(-WORLD.size / 2, position.y + (camera?.bottom ?? -16) - padding);
      const maxY = Math.min(WORLD.size / 2, position.y + (camera?.top ?? 16) + padding);
      const needed = new Set();
      for (let cy = Math.floor(minY / size); cy <= Math.floor(maxY / size); cy++) {
        for (let cx = Math.floor(minX / size); cx <= Math.floor(maxX / size); cx++) needed.add(key(cx, cy));
      }
      for (const id of loaded.keys()) if (!needed.has(id)) unload(id);
      // Restore just the affected tree meshes; distant trees are restored on their next load.
      for(const tree of regrownTrees) {
        const chunk=loaded.get(key(Math.floor(tree.x/size),Math.floor(tree.y/size)));
        if(!chunk)continue;
        const previous=treeMeshes.get(tree.id);
        if(previous)removeTreeMesh(previous);
        addObject(tree,chunk);
      }
      for (const id of needed) {
        if (loaded.has(id)) continue;
        const [cx, cy] = id.split(',').map(Number);
        load(cx, cy);
      }
      wind.update(seconds);
      updateTreeEffects(seconds);
      updateLoot(seconds);
      grass?.update(seconds, position, interaction);
      weather.update(seconds, position, camera);
      ocean.update(seconds);
      lakes.update(seconds);
      return {landedTrees,regrownTrees};
    },
    nearestTree(position, direction) {
      let nearest=null,best=Infinity;
      for(const [id,mesh] of treeMeshes) {
        if(!resources.standing(id))continue;
        const tree=mesh.userData.object,dx=tree.x-position.x,dy=tree.y-position.y,distance=Math.hypot(dx,dy);
        const dot=distance?(dx*direction.x+dy*direction.y)/distance:1;
        if(distance>HARVEST.reach||dot<.1)continue;
        const score=distance+(1-dot)*.45;
        if(score<best){best=score;nearest={...tree,health:resources.health(tree),maxHealth:treeMaxHealth(tree)};}
      }
      return nearest;
    },
    hitTree(tree,seconds,direction) {
      if(!treeMeshes.has(tree.id))return null;
      const hit=resources.hit(tree,seconds,direction);
      if(hit?.felled)mapRevision++;
      return hit;
    },
    mapState() {
      if(mapSnapshot.revision!==mapRevision)mapSnapshot={revision:mapRevision,felled:[...resources.trees].filter(([,state])=>state.felled).map(([id])=>id)};
      return mapSnapshot;
    },
    nearestDrop(position) {return resources.nearestDrop(position);},
    collect(position,inventory) {return resources.collect(position,inventory);},
    blocked(x, y, radius) {
      if (waterAt(x, y) || waterAt(x + radius, y) || waterAt(x - radius, y) || waterAt(x, y + radius) || waterAt(x, y - radius)) return true;
      for (let cy = Math.floor((y - 2) / size); cy <= Math.floor((y + 2) / size); cy++) {
        for (let cx = Math.floor((x - 2) / size); cx <= Math.floor((x + 2) / size); cx++) {
          for (const object of objects(cx, cy)) {
            // The same small trunk collider remains in place after chopping, around the stump.
            const centerY = object.y + (object.type === 'rock' ? object.size * .22 : 0);
            if (((x - object.x) / (radius + object.rx)) ** 2 + ((y - centerY) / (radius + object.ry)) ** 2 < 1) return true;
          }
        }
      }
      return false;
    },
    stats() {
      return { activeChunks: loaded.size, cachedChunks: data.size, cachedSprites: maps.size,
        ...ocean.stats(),
        ...lakes.stats(),
        choppedTrees:[...resources.trees.values()].filter(state=>state.felled).length,
        groundLogs:[...resources.drops.values()].filter(drop=>drop.type==='log').length,
        groundApples:[...resources.drops.values()].filter(drop=>drop.type==='apple').length,
        ...(grass?.stats() ?? {grassBatches:0,grassTufts:0,pressedGrass:0}),
        ...(weather?.stats() ?? { leafParticles: 0, snowflakes: 0, leafEmitters: 0 }) };
    },
    dispose() {
      for (const id of loaded.keys()) unload(id);
      weather?.dispose();
      grass?.dispose();
      ocean.dispose();
      lakes.dispose();
      for(const mesh of decorations.values()){lighting?.remove(mesh);mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();}
      decorations.clear();lootMaps.forEach(map=>map.dispose());lootMaps.clear();
      maps.forEach(map => map.dispose());
      maps.clear(); data.clear();
    },
  };
}
