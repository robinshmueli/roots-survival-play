import * as THREE from '../vendor/three.module.js';
import { WORLD, HARVEST, GRASS, CHOP_TOOLS } from './config.js';
import { biomeAt, waterAt } from './biomes.js';
import { chunkObjects } from './world-data.js';
import { chunkForage } from './forage-data.js';
import { campBlocked } from './camp.js';
import { groundArt } from './terrain.js';
import { createWind, createTreeGeometry } from './wind.js';
import { createWeather } from './weather.js';
import { createGrass } from './grass.js';
import { createOcean } from './ocean.js';
import { createLakes } from './lakes.js';
import { createResources, treeMaxHealth, treeBodyOpacity } from './resources.js';
import { itemArt, stumpArt, forageArt, structureArt } from './items.js';
import {createStructures,structureSpec,structureShadowVolume,structureCenter} from './structures.js';
import {getCycleState} from './lighting.js';
import { makeCanvas, ellipse, sprite, texture, treeWindArt, rockArt, cactusArt, ROCK_TYPES, TREE_ART } from './art.js';

export function createWorld(scene, lighting,initial=null) {
  const loaded = new Map(), data = new Map(), maps = new Map();
  const wind = createWind();
  const ocean = createOcean(scene,lighting);
  const lakes = createLakes(scene,lighting);
  const resources=createResources(Math.random,initial?.resources),treeMeshes=new Map(),decorations=new Map(),lootMaps=new Map();
  const structures=createStructures(initial?.structures);
  let mapRevision=0,mapSnapshot={revision:-1,felled:[]};
  let weather, grass, worldSeconds=0,previousBuildingTime=0;
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
    const chunk={group,meshes:[ground],map,forage:chunkForage(cx,cy,scenery)};
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
        const opacity=treeBodyOpacity(state,seconds);
        if(opacity===0){removeTreeMesh(mesh);continue;}
        mesh.material.opacity=opacity;mesh.material.alphaTest=0;
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
          positions.setXY(i,x*c+y*s,root+y*c-x*s);
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

  function updateLoot(seconds,animationSeconds=seconds,position={x:0,y:0}) {
    const buildingDt=Math.min(.1,Math.max(0,animationSeconds-previousBuildingTime));previousBuildingTime=animationSeconds;
    const fadedRoofs=structures.roofGroupAt(position);
    const wanted=new Set(),usedRoofMaps=new Set();
    function showForage(object) {
      const harvested=resources.remainingForage(object)===0;
      if(harvested&&object.kind==='looseStone')return;
      const id=object.id,mapKey=`${object.kind}:${object.variant}:${harvested}`;
      wanted.add(id);
      if(!lootMaps.has(mapKey))lootMaps.set(mapKey,texture(forageArt(object.kind,object.variant,harvested)));
      const width=object.kind==='looseStone'?1.4:1.6,height=width*36/32;
      if(!decorations.has(id)) {
        const mesh=sprite(lootMaps.get(mapKey),width,height);
        mesh.userData.forage=object;
        scene.add(mesh);lighting?.surface(mesh);decorations.set(id,mesh);
      }
      const mesh=decorations.get(id);
      mesh.name=object.kind==='looseStone'?'loose-stone':harvested?'harvested-fiber-bush':'fiber-bush';
      mesh.userData.harvested=harvested;mesh.material.map=lootMaps.get(mapKey);
      mesh.position.set(object.x,object.y+height*(32/36-.5),10-object.y*.01+.003);
    }
    function show(id,object,stump=false) {
      if(!loaded.has(key(Math.floor(object.x/size),Math.floor(object.y/size))))return;
      wanted.add(id);
      if(!decorations.has(id)) {
        const type=stump?'stump':object.type;
        if(!lootMaps.has(type))lootMaps.set(type,texture(stump?stumpArt():itemArt(type)));
        const scale=type==='apple'?.72:type==='cherry'?.62:1;
        const mesh=sprite(lootMaps.get(type),stump?1.5:scale,stump?.94:scale);
        mesh.name=stump?'stump':`dropped-${type}`;mesh.userData.dropId=id;
        scene.add(mesh);lighting?.surface(mesh);decorations.set(id,mesh);
      }
      const mesh=decorations.get(id);
      mesh.position.set(object.x,object.y+(stump?.25:.2+Math.sin(seconds*2+object.x)*.035),10-object.y*.01+.002);
    }
    for(const [id,state] of resources.trees)if(state.dropped)show(`stump:${id}`,state.tree,true);
    for(const [id,drop] of resources.drops)show(id,drop);
    for(const chunk of loaded.values())for(const object of chunk.forage)showForage(object);
    for(const object of structures.objects.values()) {
      if(!loaded.has(key(Math.floor(object.x/size),Math.floor(object.y/size))))continue;
      const spec=structureSpec(object.type,object.rotation);
      const previous=decorations.get(object.id);
      let doorAmount=previous?.userData.doorAmount??(object.open?1:0);
      if(object.type==='wood-door')doorAmount+=(Math.min(1,buildingDt*12))*((object.open?1:0)-doorAmount);
      const roofLayout=object.type==='wood-roof'?structures.roofLayout(object.id):null;
      const frame=object.type==='campfire'?Math.floor(animationSeconds*7+Math.abs(object.x))%4:object.type==='wood-door'?Math.round(doorAmount*4):0,mapKey=`structure:${object.type}:${frame}:${object.rotation??0}:${roofLayout?JSON.stringify(roofLayout):''}`;
      if(!lootMaps.has(mapKey))lootMaps.set(mapKey,texture(structureArt(object.type,frame,object.rotation,roofLayout)));
      if(roofLayout)usedRoofMaps.add(mapKey);
      wanted.add(object.id);
      if(!decorations.has(object.id)) {
        const mesh=sprite(lootMaps.get(mapKey),spec.width,spec.height);
        mesh.name=object.type;mesh.userData.structure=object;scene.add(mesh);
        if(!['campfire','wood-floor'].includes(object.type))lighting?.castShadow(mesh,{...spec,volume:structureShadowVolume(object,roofLayout)});decorations.set(object.id,mesh);
        if(object.type==='wood-floor'){mesh.renderOrder=-1;lighting?.surface(mesh);}
        if(object.type==='wood-roof'){mesh.renderOrder=3;mesh.material.depthTest=false;mesh.userData.roofMapKey=mapKey;}
      }
      const mesh=decorations.get(object.id),center=structureCenter(object);
      mesh.material.map=lootMaps.get(mapKey);mesh.userData.doorAmount=doorAmount;
      if(object.type==='wood-roof'&&mesh.userData.roofMapKey!==mapKey){lighting?.remove(mesh);lighting?.castShadow(mesh,{...spec,volume:structureShadowVolume(object,roofLayout)});mesh.userData.roofMapKey=mapKey;}
      if(object.type==='wood-roof') {const target=fadedRoofs.has(object.id)?.28:1;mesh.material.opacity+=(target-mesh.material.opacity)*Math.min(1,buildingDt*12);}
      if(object.type==='campfire')mesh.material.color.set(0xffffff);
      mesh.position.set(object.x,object.y+spec.height*(spec.foot-.5),object.type==='wood-floor'?.025:object.type==='wood-roof'?30:10-center.y*.01+.003);
      if(object.type==='campfire') {
        const id=object.id+':glow';wanted.add(id);
        if(!lootMaps.has('fire-glow')) {
          const [canvas,ctx]=makeCanvas(48);
          for(let r=23;r>0;r-=2)ellipse(ctx,24,24,r,r,'rgba(244,157,65,.035)');
          lootMaps.set('fire-glow',texture(canvas));
        }
        if(!decorations.has(id)) {
          const glow=sprite(lootMaps.get('fire-glow'),5.5,3.4);glow.name='campfire-glow';glow.material.blending=THREE.AdditiveBlending;scene.add(glow);decorations.set(id,glow);
        }
        const glow=decorations.get(id);glow.position.set(center.x,center.y,.08);
        glow.material.opacity=(.65+.09*Math.sin(animationSeconds*9+object.x))*(.25+(1-getCycleState(seconds).tint.r)*.8);
      }
    }
    for(const [id,mesh] of decorations)if(!wanted.has(id)) {
      lighting?.remove(mesh);mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();decorations.delete(id);
    }
    for(const [id,map] of lootMaps)if(id.startsWith('structure:wood-roof:')&&!usedRoofMaps.has(id)){map.dispose();lootMaps.delete(id);}
  }

  function nearbyForage(position) {
    const found=[],radius=HARVEST.pickupRadius;
    for(let cy=Math.floor((position.y-radius)/size);cy<=Math.floor((position.y+radius)/size);cy++) {
      for(let cx=Math.floor((position.x-radius)/size);cx<=Math.floor((position.x+radius)/size);cx++) {
        const chunk=loaded.get(key(cx,cy));if(chunk)found.push(...chunk.forage);
      }
    }
    return found;
  }

  return {
    biomeAt,
    get stateRevision(){return resources.revision+structures.revision;},
    serialize(){return {resources:resources.serialize(),structures:structures.serialize()};},
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
      const animationSeconds=interaction.animationSeconds??seconds;
      wind.update(animationSeconds);
      updateTreeEffects(seconds);
      updateLoot(seconds,animationSeconds,position);
      grass?.update(animationSeconds, position, interaction);
      weather.update(animationSeconds, position, camera);
      ocean.update(animationSeconds);
      lakes.update(animationSeconds);
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
    hitTree(tree,seconds,direction,tool='stone') {
      if(!treeMeshes.has(tree.id))return null;
      const hit=resources.hit(tree,seconds,direction,CHOP_TOOLS[tool]?.damage??1);
      if(hit?.felled)mapRevision++;
      return hit;
    },
    mapState() {
      if(mapSnapshot.revision!==mapRevision)mapSnapshot={revision:mapRevision,felled:[...resources.trees].filter(([,state])=>state.felled).map(([id])=>id)};
      return mapSnapshot;
    },
    nearestDrop(position) {return resources.nearestDrop(position,nearbyForage(position));},
    collect(position,inventory) {return resources.collect(position,inventory,nearbyForage(position));},
    snapStructurePoint(type,point,rotation=0){return structures.snap(type,point,rotation);},
    canPlaceStructure(type,point,player,rotation=0){return structures.validate(point,player,(x,y,r)=>this.sceneryBlocked(x,y,r),type,rotation);},
    placeStructure(type,point,player,rotation=0){return structures.place(point,player,(x,y,r)=>this.sceneryBlocked(x,y,r),type,rotation);},
    canPlaceWorkbench(point,player){return this.canPlaceStructure('workbench',point,player);},
    placeWorkbench(point,player){return this.placeStructure('workbench',point,player);},
    nearestWorkbench(position){return structures.nearest(position);},
    nearestInteractable(position){return structures.nearest(position,['workbench','chest','wood-door']);},
    toggleDoor(object,player){return structures.toggleDoor(object.id,player);},
    blocked(x, y, radius) {
      return structures.blocked(x,y,radius)||this.sceneryBlocked(x,y,radius);
    },
    sceneryBlocked(x,y,radius=0) {
      if(campBlocked(x,y,radius))return true;
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
        groundCherries:[...resources.drops.values()].filter(drop=>drop.type==='cherry').length,
        groundApples:[...resources.drops.values()].filter(drop=>drop.type==='apple').length,
        looseStones:[...decorations.values()].filter(mesh=>mesh.name==='loose-stone').length,
        fiberBushes:[...decorations.values()].filter(mesh=>mesh.name==='fiber-bush').length,
        gatheredForage:resources.gathered.size,
        workbenches:[...structures.objects.values()].filter(o=>o.type==='workbench').length,
        builtStructures:structures.objects.size,
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
