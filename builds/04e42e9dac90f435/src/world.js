import {t} from './i18n.js';
import * as THREE from '../vendor/three.module.js';
import { WORLD, PLAYER, HARVEST, GRASS, CHOP_TOOLS, COMBAT_TOOLS,SPEAR_CHARGE,toolKind } from './config.js';
import {combatReach,weaponContact,sweptSpearContact} from './combat.js';
import {chunkAnimals,ANIMAL_TYPES} from './animal-data.js';
import {createAnimals} from './animals.js';
import {createWildlifeView} from './wildlife-view.js';
import {createRunDust} from './run-dust.js';
import {createPickupEffects} from './pickup-effects.js';
import {createOcclusionFade,spriteContains} from './occlusion.js';
import { biomeAt, waterAt } from './biomes.js';
import { chunkObjects } from './world-data.js';
import { chunkForage } from './forage-data.js';
import {tentDoor,tentInReach,structureParts,structureMaxHealth} from './structures.js';
import { groundArt } from './terrain.js';
import { createWind, createTreeGeometry } from './wind.js';
import { createWeather } from './weather.js';
import { createGrass } from './grass.js';
import { createOcean } from './ocean.js';
import { createLakes } from './lakes.js';
import { createResources, treeMaxHealth, treeHitDamage, rockMaxHealth, treeBodyOpacity } from './resources.js';
import { ITEMS, itemArt, saplingArt, forageArt, structureArt } from './items.js';
import {SEEDS} from './tree-seeds.js';
import {sleepGrowth} from './sleep-growth.js';
import {caveEntrances,caveById,caveLayout,caveContains,caveRoute,CAVE_SPAWN,CAVE_EXIT} from './cave-data.js';
import {createCaveDiscovery} from './cave-discovery.js';
import {caveEntranceArt,caveExitArt,caveGroundArt,addIronDeposits,addCopperDeposits,echoCrystalArt} from './cave-art.js';
import {addCoalDeposits,coalPattern} from './coal-art.js';
import {createEchoView} from './echo-view.js';
import {ECHO,scanEcho,findEchoTrail,createEchoSections,echoLineVisible} from './echo-stone.js';
import {deathBagArt} from './death-loot-art.js';
import {STRUCTURES,createStructures,structureSpec,structureShadowVolume,structureCenter} from './structures.js';
import {getCycleState} from './lighting.js';
import { makeCanvas, ellipse, sprite, texture, treeWindArt, rockArt, cactusArt, ROCK_TYPES, TREE_ART } from './art.js';

export function createWorld(scene, lighting,initial=null) {
  const loaded = new Map(), data = new Map(), maps = new Map();
  const wind = createWind();
  const ocean = createOcean(scene,lighting);
  const lakes = createLakes(scene,lighting);
  const surfaceResources=createResources(Math.random,initial?.resources),surfaceStructures=createStructures(initial?.structures,{starterTent:true});
  const caveStates=new Map((initial?.caves?.visited??[]).map(record=>[record.id,{layoutVersion:record.layoutVersion??1,resources:createResources(Math.random,record.resources),structures:createStructures(record.structures,{water:()=>false}),discovery:createCaveDiscovery(record.discovery)}]));
  let activeCave=initial?.caves?.active??null;
  if(!caveById(activeCave)||!caveStates.has(activeCave))activeCave=null;
  let resources=activeCave?caveStates.get(activeCave).resources:surfaceResources,structures=activeCave?caveStates.get(activeCave).structures:surfaceStructures;
  const treeMeshes=new Map(),decorations=new Map(),lootMaps=new Map();
  const animals=createAnimals(initial?.animals),wildlife=createWildlifeView(scene,lighting),dust=createRunDust(scene,lighting);
  const pickupEffects=createPickupEffects(scene,lighting),echoView=createEchoView(scene);
  const animalChunks=new Map();
  const occluders=new Set(),occlusion=createOcclusionFade();
  const rockMeshes=new Map();
  const growingMeshes=new Map();
  let mapRevision=0,mapSnapshot={revision:-1,felled:[]};
  let weather, grass, worldSeconds=0,previousBuildingTime=0;
  let echoOrigin={x:PLAYER.startX,y:PLAYER.startY},echoRadius=ECHO.radius;
  const size = WORLD.chunkSize;
  const key = (cx, cy) => `${cx},${cy}`;
  const layoutVersion=()=>activeCave?caveStates.get(activeCave).layoutVersion:2;
  const currentLayout=()=>activeCave?caveLayout(activeCave,layoutVersion()):null;
  const echoSections=new WeakMap(),echoVisibility=new Map();let echoVisibilityKey='';
  function echoVisible(x,y) {
    if(!activeCave)return false;
    const key=Math.round(x*4)+','+Math.round(y*4);
    if(!echoVisibility.has(key))echoVisibility.set(key,echoLineVisible(echoOrigin,{x,y},(px,py)=>caveContains(activeCave,px,py,0,layoutVersion())&&!structures.blocked(px,py,.02,true)));
    return echoVisibility.get(key);
  }
  function routeFor(portalId) {
    const route=caveRoute(portalId),legacy=caveStates.get(portalId)?.layoutVersion===1||caveStates.get(route?.caveId)?.layoutVersion===1||caveStates.get(route?.otherPortal)?.layoutVersion===1;
    return legacy?{caveId:portalId,exitId:'entry',otherPortal:null}:route;
  }
  function currentExits() {
    return currentLayout()?.exits.filter(exit=>exit.id==='entry'||routeFor(exit.portalId)?.caveId===activeCave)??[];
  }
  function safeArrival(caveId,opening) {
    const state=caveId?caveStates.get(caveId):{resources:surfaceResources,structures:surfaceStructures},version=state?.layoutVersion??2;
    const clear=point=>{
      const r=PLAYER.radius;
      if(Math.abs(point.x)>WORLD.size/2-1||Math.abs(point.y)>WORLD.size/2-1||state?.structures.blocked(point.x,point.y,r,true))return false;
      const nearby=caveId?caveLayout(caveId,version).rocks:[];
      if(caveId&&!caveContains(caveId,point.x,point.y,r,version))return false;
      if(!caveId) {
        for(const [dx,dy] of [[0,0],[r,0],[-r,0],[0,r],[0,-r]])if(waterAt(point.x+dx,point.y+dy))return false;
        for(let cy=Math.floor((point.y-2)/size);cy<=Math.floor((point.y+2)/size);cy++)for(let cx=Math.floor((point.x-2)/size);cx<=Math.floor((point.x+2)/size);cx++)nearby.push(...chunkObjects(cx,cy));
        nearby.push(...surfaceResources.plants.values());
      }
      return !nearby.some(object=>{
        if(object.mineral==='echo')return false;
        if(object.type==='rock'&&state?.resources&&!state.resources.rockStanding(object.id)||object.type==='tree'&&state?.resources&&!state.resources.standing(object.id))return false;
        const y=object.y+(object.type==='rock'?object.size*.22:0);
        return ((point.x-object.x)/(r+object.rx))**2+((point.y-y)/(r+object.ry))**2<1;
      });
    };
    for(const distance of caveId?[3,3.5,4,5,6,8]:[2.5,3,3.5,4,5,6,8])for(const dx of [0,-.75,.75,-1.5,1.5,-2.5,2.5]) {
      const point={x:opening.x+dx,y:opening.y+(caveId?-opening.dy: -1)*distance};if(clear(point))return point;
    }
    return null;
  }

  function objects(cx, cy) {
    const id = key(cx, cy);
    if (!data.has(id)) {
      if (data.size >= 256) data.delete(data.keys().next().value);
      data.set(id, activeCave?currentLayout().rocks.filter(rock=>Math.floor(rock.x/size)===cx&&Math.floor(rock.y/size)===cy):chunkObjects(cx, cy));
    }
    return data.get(id);
  }

  function asset(object) {
    const warm = object.type === 'rock' && object.biome === 'desert';
    const cold = object.type === 'rock' && object.biome === 'snow';
    const mineral=object.mineral==='coal'?`coal:${coalPattern(object)}`:object.mineral??'';
    const id = `${object.type}:${object.kind ?? ''}:${object.variant}:${object.snowCover ?? ''}:${warm}:${cold}:${mineral}`;
    if (!maps.has(id)) {
      let map;
      if (object.type === 'tree') map = treeWindArt(310, object.kind, object.variant, object.snowCover);
      else if (object.type === 'cactus') map = cactusArt(object.variant);
      else if(object.mineral==='echo')map=echoCrystalArt();
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
      if(object.type==='rock'&&object.mineral==='coal')addCoalDeposits(map,object.variant,coalPattern(object));
      if(object.type==='rock'&&object.mineral==='iron')addIronDeposits(map,object.variant);
      if(object.type==='rock'&&object.mineral==='copper')addCopperDeposits(map,object.variant);
      maps.set(id, map);
    }
    return maps.get(id);
  }

  function load(cx, cy) {
    const group = new THREE.Group();
    group.name = `chunk-${cx}-${cy}`;
    scene.add(group);
    const scenery=objects(cx,cy),map = activeCave?caveGroundArt(activeCave,cx,cy,layoutVersion()):groundArt(cx, cy, scenery);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map }));
    ground.name = 'ground';
    ground.position.set((cx + .5) * size, (cy + .5) * size, 0);
    group.add(ground);
    lighting?.surface(ground);
    const chunk={group,meshes:[ground],map,forage:activeCave?[]:chunkForage(cx,cy,scenery)};
    const planted=[...resources.plants.values()].filter(tree=>tree.grown&&Math.floor(tree.x/size)===cx&&Math.floor(tree.y/size)===cy);
    for (const object of [...scenery,...planted]) {
      if(object.type==='tree'&&!resources.standing(object.id)&&!resources.bodyVisible(object.id,worldSeconds))continue;
      if(object.type==='rock'&&!resources.rockStanding(object.id))continue;
      addObject(object,chunk);
    }
    loaded.set(key(cx, cy), chunk);
    grass?.addChunk(cx, cy);
    if(!activeCave){ocean.addChunk(cx,cy);lakes.addChunk(cx,cy);}
  }

  function addObject(object,chunk,growing=false) {
    let width, height, foot;
    if (object.type === 'tree') {
      width = TREE_ART.width / 16 * object.size;
      height = TREE_ART.height / 16 * object.size;
      foot = TREE_ART.foot;
    } else if (object.type === 'cactus') {
      width = 2 * object.size; height = 3 * object.size; foot = 43 / 48;
    } else if(object.mineral==='echo') {
      width=2.2;height=3.3;foot=.85;
    } else {
      width = 3 * object.size; height = 2.5 * object.size; foot = .9;
    }
    const mesh = sprite(asset(object), width, height);
    mesh.name = object.mineral==='echo'?'echo-crystal':object.type === 'tree' ? 'tree' : object.type === 'rock' ? `rock-${ROCK_TYPES[object.variant]}` : 'cactus';
    mesh.userData.variant = object.variant;
    mesh.userData.object = object;
    if(object.type==='rock')rockMeshes.set(object.id,mesh);
    mesh.position.set(object.x, object.y + height * (foot - .5), 10 - object.y * .01);
    if (object.type === 'tree') {
      mesh.geometry.dispose();
      mesh.geometry = createTreeGeometry(width,height);
      wind.addTree(mesh, object.kind, height, foot);
      if(!growing)weather?.addTree(mesh, width, height, foot);
      (growing?growingMeshes:treeMeshes).set(object.id,mesh);
      if(growing){mesh.name='growing-tree';mesh.userData.growing=true;}
    }
    chunk.group.add(mesh);
    occluders.add(mesh);
    if(object.mineral!=='echo')lighting?.castShadow(mesh, { width, height, foot });
    chunk.meshes.push(mesh);
    return mesh;
  }

  function unload(id) {
    const chunk = loaded.get(id);
    grass?.removeChunk(id);
    ocean.removeChunk(id);
    lakes.removeChunk(id);
    for (const mesh of chunk.meshes) {
      occluders.delete(mesh);
      if (mesh.userData.wind) wind.removeTree(mesh);
      if(mesh.userData.object?.type==='tree')(mesh.userData.growing?growingMeshes:treeMeshes).delete(mesh.userData.object.id);
      if(mesh.userData.object?.type==='rock')rockMeshes.delete(mesh.userData.object.id);
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
    occluders.delete(mesh);
    mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();
    (mesh.userData.growing?growingMeshes:treeMeshes).delete(object.id);rockMeshes.delete(object.id);
  }

  function updateSleepingGrowth(sleep) {
    const wanted=new Set();
    function grow(tree,dueAt) {
      const pose=sleepGrowth(sleep,dueAt);
      const chunk=loaded.get(key(Math.floor(tree.x/size),Math.floor(tree.y/size)));
      if(!pose||!chunk)return;
      wanted.add(tree.id);
      const mesh=growingMeshes.get(tree.id)??addObject(tree,chunk,true);
      mesh.userData.growthScale=pose.scale;
      mesh.userData.baseOpacity=mesh.material.opacity=pose.opacity;
      mesh.material.alphaTest=0;
    }
    if(sleep) {
      for(const tree of resources.plants.values())if(!tree.grown&&!resources.trees.get(tree.id)?.felled)grow(tree,tree.growsAt);
      for(const state of resources.trees.values())if(state.felled)grow(state.tree,state.regrowAt);
    }
    for(const [id,mesh] of growingMeshes)if(!wanted.has(id))removeTreeMesh(mesh);
  }

  function updateTreeEffects(seconds) {
    for(const [id,mesh] of rockMeshes) {
      if(!resources.rockStanding(id)){removeTreeMesh(mesh);continue;}
      if(mesh.userData.object.mineral==='echo'){const object=mesh.userData.object;mesh.visible=echoVisible(object.x,object.y);mesh.position.y=object.y+1.15+Math.sin(seconds*1.8+object.variant)*.12;const glow=(.92+Math.sin(seconds*2.1+object.variant)*.08)*ECHO.brightness;mesh.material.color.setRGB(glow,glow,ECHO.brightness);mesh.rotation.z=Math.sin(seconds*1.25+object.variant)*.025;mesh.scale.set(1+Math.sin(seconds*.95+object.variant)*.015,1+Math.sin(seconds*1.1+object.variant)*.02,1);continue;}
      const state=resources.rocks.get(id),age=seconds-(state?.hitAt??-Infinity);
      mesh.position.x=mesh.userData.object.x+(age<.3?Math.sin(age*48)*Math.exp(-age*12)*.1:0);
    }
    for(const [id,mesh] of treeMeshes) {
      const state=resources.trees.get(id);if(!state)continue;
      const object=mesh.userData.object,positions=mesh.geometry.attributes.position;
      if(state.felled) {
        const elapsed=seconds-state.fallAt;
        const opacity=treeBodyOpacity(state,seconds);
        if(opacity===0){removeTreeMesh(mesh);continue;}
        mesh.userData.baseOpacity=mesh.material.opacity=opacity;mesh.material.alphaTest=0;
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

  function updateLoot(seconds,animationSeconds=seconds,position={x:0,y:0},interaction={}) {
    const buildingDt=Math.min(.1,Math.max(0,animationSeconds-previousBuildingTime));previousBuildingTime=animationSeconds;
    const fadedRoofs=structures.roofGroupAt(position);
    const wanted=new Set(),usedRoofMaps=new Set(),usedInteriorMaps=new Set();
    if(activeCave)for(const exit of currentExits()) {
      const id=`cave-exit:${exit.id}`,mapKey=`cave-exit-art:${exit.dy}:${caveById(exit.portalId).seed%4}`;wanted.add(id);
      if(!lootMaps.has(mapKey))lootMaps.set(mapKey,caveExitArt(exit.dy,caveById(exit.portalId).seed%4));
      if(!decorations.has(id)){const height=exit.dy>0?5.5:3.2,mesh=sprite(lootMaps.get(mapKey),exit.dy>0?6:4.8,height);mesh.name='cave-exit';mesh.userData.exit=exit;const foot=exit.dy>0?80/88:8/88;mesh.position.set(exit.x,exit.y+height*(foot-.5),10-exit.y*.01);scene.add(mesh);decorations.set(id,mesh);}
    }
    if(!activeCave)for(const entrance of caveEntrances()) {
      if(!loaded.has(key(Math.floor(entrance.x/size),Math.floor(entrance.y/size))))continue;
      wanted.add(entrance.id);
      const mapKey=`cave-entrance:${entrance.seed%4}`;
      if(!lootMaps.has(mapKey))lootMaps.set(mapKey,caveEntranceArt(entrance.seed%4));
      if(!decorations.has(entrance.id)) {
        const mesh=sprite(lootMaps.get(mapKey),6,5.5);mesh.name='cave-entrance';mesh.userData.entrance=entrance;
        mesh.position.set(entrance.x,entrance.y+5.5*(80/88-.5),10-entrance.y*.01);
        scene.add(mesh);lighting?.castShadow(mesh,{width:6,height:5.5,foot:80/88});decorations.set(entrance.id,mesh);occluders.add(mesh);
      }
    }
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
        occluders.add(mesh);
        scene.add(mesh);lighting?.surface(mesh);decorations.set(id,mesh);
      }
      const mesh=decorations.get(id);
      mesh.name=object.kind==='looseStone'?'loose-stone':harvested?'harvested-fiber-bush':'fiber-bush';
      mesh.userData.harvested=harvested;mesh.material.map=lootMaps.get(mapKey);
      mesh.position.set(object.x,object.y+height*(32/36-.5),10-object.y*.01+.003);
    }
    function show(id,object) {
      if(!loaded.has(key(Math.floor(object.x/size),Math.floor(object.y/size))))return;
      wanted.add(id);
      if(!decorations.has(id)) {
        const type=object.type;
        if(!lootMaps.has(type))lootMaps.set(type,texture(itemArt(type)));
        const scale=type==='apple'?.72:type==='cherry'?.62:1;
        const mesh=sprite(lootMaps.get(type),scale,scale);
        mesh.name=`dropped-${type}`;mesh.userData.dropId=id;
        scene.add(mesh);lighting?.surface(mesh);decorations.set(id,mesh);
      }
      const mesh=decorations.get(id);
      mesh.position.set(object.x,object.y+.2+Math.sin(seconds*2+object.x)*.035,10-object.y*.01+.002);
    }
    for(const [id,drop] of resources.drops)show(id,drop);
    for(const grave of resources.deathLoot.graves.values()) {
      if(!loaded.has(key(Math.floor(grave.x/size),Math.floor(grave.y/size))))continue;
      wanted.add(grave.id);
      if(!lootMaps.has('death-bag'))lootMaps.set('death-bag',texture(deathBagArt()));
      if(!decorations.has(grave.id)) {
        const mesh=sprite(lootMaps.get('death-bag'),1.6,1.6);mesh.name='death-loot';mesh.userData.graveId=grave.id;
        scene.add(mesh);lighting?.surface(mesh);decorations.set(grave.id,mesh);
      }
      decorations.get(grave.id).position.set(grave.x,grave.y+.6,10-grave.y*.01+.002);
    }
    for(const tree of resources.plants.values())if(!tree.grown&&loaded.has(key(Math.floor(tree.x/size),Math.floor(tree.y/size)))) {
      const id=`sapling:${tree.id}`,mapKey=`sapling:${tree.kind}`;wanted.add(id);
      if(!lootMaps.has(mapKey))lootMaps.set(mapKey,texture(saplingArt(tree.kind)));
      if(!decorations.has(id)) {
        const mesh=sprite(lootMaps.get(mapKey),.9,1.2);mesh.name='sapling';mesh.userData.plant=tree;
        scene.add(mesh);lighting?.surface(mesh);decorations.set(id,mesh);occluders.add(mesh);
      }
      decorations.get(id).position.set(tree.x,tree.y+1.2*(27/32-.5),10-tree.y*.01+.002);
      const opacity=1-(growingMeshes.get(tree.id)?.userData.baseOpacity??0);
      decorations.get(id).userData.baseOpacity=decorations.get(id).material.opacity=opacity;
    }
    for(const chunk of loaded.values())for(const object of chunk.forage)showForage(object);
    for(const object of structures.objects.values()) {
      if(!loaded.has(key(Math.floor(object.x/size),Math.floor(object.y/size))))continue;
      const spec=structureSpec(object.type,object.rotation);
      const previous=decorations.get(object.id);
      let doorAmount=previous?.userData.doorAmount??(object.open?1:0);
      if(object.type==='wood-door')doorAmount+=(Math.min(1,buildingDt*12))*((object.open?1:0)-doorAmount);
      const roofLayout=object.type==='wood-roof'?structures.roofLayout(object.id):null;
      const layout=object.type==='tent'?structures.tentLayout(object.id):object.type==='torch'?structures.torchLayout(object.id):object.type==='wood-wall'?structures.wallLayout(object.id):object.type==='wood-door'?structures.doorLayout(object.id):roofLayout;
      const frame=object.type==='furnace'?(object.furnace.state().burning?1+Math.floor(animationSeconds*7)%4:0):['torch','campfire'].includes(object.type)?Math.floor(animationSeconds*7+Math.abs(object.x))%4:object.type==='wood-door'?Math.round(doorAmount*4):object.type==='tent'&&object.id===interaction.sleepingTent?1:0,mapKey=`structure:${object.type}:${frame}:${object.rotation??0}:${layout?JSON.stringify(layout):''}`;
      if(!lootMaps.has(mapKey))lootMaps.set(mapKey,texture(structureArt(object.type,frame,object.rotation,layout)));
      if(roofLayout)usedRoofMaps.add(mapKey);
      if(['tent','torch'].includes(object.type))usedInteriorMaps.add(mapKey);
      wanted.add(object.id);
      if(!decorations.has(object.id)) {
        const mesh=sprite(lootMaps.get(mapKey),spec.width,spec.height);
        mesh.name=object.type==='tent'?'camp-tent':object.type;mesh.userData.structure=object;scene.add(mesh);
        if(object.type!=='wood-floor')occluders.add(mesh);
        if(!['torch','campfire','wood-floor'].includes(object.type))lighting?.castShadow(mesh,{...spec,volume:structureShadowVolume(object,roofLayout)});decorations.set(object.id,mesh);
        if(object.type==='wood-floor'){mesh.renderOrder=-1;lighting?.surface(mesh);}
        if(object.type==='wood-roof')mesh.userData.roofMapKey=mapKey;
      }
      const mesh=decorations.get(object.id),center=structureCenter(object);
      mesh.material.map=lootMaps.get(mapKey);mesh.userData.doorAmount=doorAmount;
      if(object.type==='tent')mesh.userData.sleeping=!!frame;
      if(object.type==='wood-roof'&&mesh.userData.roofMapKey!==mapKey){lighting?.remove(mesh);lighting?.castShadow(mesh,{...spec,volume:structureShadowVolume(object,roofLayout)});mesh.userData.roofMapKey=mapKey;}
      if(object.type==='wood-roof') {const target=fadedRoofs.has(object.id)?.28:1,base=mesh.userData.baseOpacity??1;mesh.userData.baseOpacity=mesh.material.opacity=base+(target-base)*Math.min(1,buildingDt*12);}
      if(['campfire','torch'].includes(object.type))mesh.material.color.set(0xffffff);
      // A roof sorts at the front edge of its whole cabin: outside trees in
      // front stay in front, while the connected roof still covers its room.
      const depth=object.type==='wood-roof'?10-(object.y+(roofLayout?.minY??-1.4))*.01+.004:10-center.y*.01+.003+(object.wallId ? .0005 : 0);
      mesh.position.set(object.x,object.y+spec.height*(spec.foot-.5)+(object.type==='torch'?(layout?.lift??(object.wallId ? .6 : 0)):0),object.type==='wood-floor'?.025:depth);
      if(['campfire','torch'].includes(object.type)||object.type==='furnace'&&object.furnace.state().burning) {
        const id=object.id+':glow';wanted.add(id);
        if(!lootMaps.has('fire-glow')) {
          const [canvas,ctx]=makeCanvas(48);
          for(let r=23;r>0;r-=2)ellipse(ctx,24,24,r,r,'rgba(244,157,65,.035)');
          lootMaps.set('fire-glow',texture(canvas));
        }
        if(!decorations.has(id)) {
          const glow=sprite(lootMaps.get('fire-glow'),5.5,3.4);glow.name=`${object.type}-glow`;glow.material.blending=THREE.AdditiveBlending;scene.add(glow);decorations.set(id,glow);
        }
        const glow=decorations.get(id);glow.position.set(center.x,center.y,.08);
        glow.material.opacity=(.65+.09*Math.sin(animationSeconds*9+object.x))*(.25+(1-getCycleState(seconds).tint.r)*.8);
      }
    }
    for(const [id,mesh] of decorations)if(!wanted.has(id)) {
      occluders.delete(mesh);
      lighting?.remove(mesh);mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();decorations.delete(id);
    }
    for(const [id,map] of lootMaps)if(id.startsWith('structure:wood-roof:')&&!usedRoofMaps.has(id)){map.dispose();lootMaps.delete(id);}
    for(const [id,map] of lootMaps)if((id.startsWith('structure:tent:')||id.startsWith('structure:torch:'))&&!usedInteriorMaps.has(id)){map.dispose();lootMaps.delete(id);}
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

  function changeCave(id) {
    if(id&&!caveById(id)||id===activeCave)return false;
    for(const key of loaded.keys())unload(key);
    for(const mesh of decorations.values()){occluders.delete(mesh);lighting?.remove(mesh);mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();}
    decorations.clear();data.clear();animalChunks.clear();pickupEffects.clear();echoView.clear();
    wildlife.update([],0,0,{x:0,y:0});
    activeCave=id;
    if(id&&!caveStates.has(id))caveStates.set(id,{layoutVersion:2,resources:createResources(),structures:createStructures(null,{water:()=>false}),discovery:createCaveDiscovery()});
    resources=id?caveStates.get(id).resources:surfaceResources;structures=id?caveStates.get(id).structures:surfaceStructures;
    mapRevision++;mapSnapshot={revision:-1,felled:[]};return true;
  }

  return {
    biomeAt(x,y){return activeCave?{id:'cave',label:t("מערה"),color:'#777264',alternate:'#716f63',detail:'#4e554c'}:biomeAt(x,y);},
    get underground(){return !!activeCave;},
    get caveId(){return activeCave;},
    crossingPortal(position,direction) {
      if(Math.abs(direction.y)<.15)return null;
      if(activeCave){const exit=currentExits().find(exit=>direction.y*exit.dy>.15&&Math.abs(position.x-exit.x)<.8&&(position.y-exit.y)*exit.dy>-.9&&(position.y-exit.y)*exit.dy<1.1);return exit?{type:'cave-exit',...exit}:null;}
      return direction.y>.15?caveEntrances().find(portal=>Math.abs(position.x-portal.x)<.8&&position.y>portal.y-.9&&position.y<portal.y+1.1)??null:null;
    },
    planPortal(portal,position) {
      if(activeCave) {
        const exit=currentExits().find(exit=>exit.id===portal.id);if(!exit)return null;
        const destination=caveById(exit.portalId);
        const end=safeArrival(null,destination);if(!end)return null;
        return {fromCave:activeCave,toCave:null,depart:{x:exit.x,y:exit.y+exit.dy*1.1},arrival:{x:destination.x,y:destination.y+.9},end,direction:{x:0,y:exit.dy},emergeDirection:{x:0,y:-1},checkpoint:{x:position.x,y:position.y},portalId:destination.id};
      }
      const destination=caveById(portal.id),route=routeFor(portal.id);if(!destination||!route)return null;
      const version=caveStates.get(route.caveId)?.layoutVersion??2,exit=caveLayout(route.caveId,version).exits.find(exit=>exit.id===route.exitId);
      if(!exit)return null;
      const end=safeArrival(route.caveId,exit);if(!end)return null;
      return {fromCave:null,toCave:route.caveId,depart:{x:destination.x,y:destination.y+1.1},arrival:{x:exit.x,y:exit.y+exit.dy*.4},end,direction:{x:0,y:1},emergeDirection:{x:0,y:-exit.dy},checkpoint:{x:position.x,y:position.y},portalId:destination.id};
    },
    crossPortal(plan){if(activeCave!==plan.fromCave)return false;return changeCave(plan.toCave);},
    useCave(portal,position) {
      const actual=activeCave?{...portal,id:portal?.id??'entry'}:portal,plan=this.planPortal(actual,position);
      if(!plan||Math.hypot(position.x-(activeCave?currentExits().find(exit=>exit.id===actual.id)?.x:portal.x),position.y-(activeCave?currentExits().find(exit=>exit.id===actual.id)?.y:portal.y-1.5))>2.5)return null;
      return this.crossPortal(plan)?{...plan.end}:null;
    },
    leaveCave(){return activeCave?changeCave(null):false;},
    updateOcclusion(player,dt){occlusion.update(player,occluders,dt,[...wildlife.meshes.values()].filter(mesh=>mesh.userData.animal.health>0));},
    roofTilesAt(position){return [...structures.roofGroupAt(position)].map(id=>{const {x,y}=structures.objects.get(id);return {x,y};});},
    get stateRevision(){return mapRevision+surfaceResources.revision+surfaceStructures.revision+animals.revision+[...caveStates.values()].reduce((sum,state)=>sum+state.resources.revision+state.structures.revision,0);},
    serialize(){return {resources:surfaceResources.serialize(),structures:surfaceStructures.serialize(),animals:animals.serialize(),caves:{version:1,active:activeCave,visited:[...caveStates].map(([id,state])=>({id,layoutVersion:state.layoutVersion,resources:state.resources.serialize(),structures:state.structures.serialize(),discovery:state.discovery.serialize()}))}};},
    update(seconds, position = { x: 0, y: 0 }, camera, interaction = {}) {
      worldSeconds=seconds;echoOrigin={x:position.x,y:position.y};
      echoRadius=camera?2*Math.max(camera.right-camera.left,camera.top-camera.bottom):ECHO.radius;
      const visibilityKey=activeCave+':'+Math.round(echoOrigin.x*8)+':'+Math.round(echoOrigin.y*8)+':'+structures.revision;
      if(visibilityKey!==echoVisibilityKey){echoVisibility.clear();echoVisibilityKey=visibilityKey;}
      if(activeCave&&(interaction.simulationDt??0)>0&&caveStates.get(activeCave).discovery.visit(position))mapRevision++;
      const allStates=[{resources:surfaceResources,structures:surfaceStructures},...caveStates.values()];
      for(const state of allStates) {
        if(state.resources!==resources)state.resources.update(seconds,interaction.recoveryDt??0);
        for(const object of state.structures.objects.values())object.furnace?.update(interaction.cookingDt??0);
      }
      const {landed:landedTrees,regrown:regrownTrees,grownPlants}=resources.update(seconds,interaction.recoveryDt??0);
      if(regrownTrees.length||grownPlants.length)mapRevision++;
      weather ??= createWeather(scene, lighting);
      // The original pixel grass is already painted into the ground texture.
      if(GRASS.enabled&&!activeCave)grass ??= createGrass(scene, lighting);
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
      for(const tree of [...regrownTrees,...grownPlants]) {
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
      updateSleepingGrowth(interaction.growthSleep);
      for(const id of activeCave?[]:needed) {
        if(!animalChunks.has(id)){const [cx,cy]=id.split(',').map(Number);animalChunks.set(id,chunkAnimals(cx,cy,objects(cx,cy)));}
        animals.ensure(animalChunks.get(id));
      }
      for(const id of animalChunks.keys())if(!needed.has(id))animalChunks.delete(id);
      const animalDamage=activeCave?0:animals.update(interaction.simulationDt??0,position,getCycleState(seconds).phase.id==='night',(x,y,r)=>this.blocked(x,y,r));
      const activeAnimals=activeCave?[]:animals.active();
      wildlife.update(activeAnimals,animationSeconds,interaction.simulationDt??0,position);
      const runners=activeAnimals.filter(animal=>animal.health&&Math.hypot(animal.x-position.x,animal.y-position.y)<70);
      if(interaction.sprinting)runners.push({id:'player',x:position.x,y:position.y,dx:interaction.direction?.x??0,dy:interaction.direction?.y??0,moving:true,running:true});
      dust.update(interaction.effectsDt??interaction.simulationDt??0,runners);
      echoView.update(seconds,id=>resources.rockStanding(id),echoVisible,(interaction.simulationDt??0)>0);
      wind.update(animationSeconds);
      updateTreeEffects(seconds);
      updateLoot(seconds,animationSeconds,position,interaction);
      grass?.update(animationSeconds, position, interaction);
      weather.update(animationSeconds, position, camera,!!activeCave);
      ocean.update(animationSeconds);
      lakes.update(animationSeconds);
      return {landedTrees,regrownTrees,animalDamage};
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
      if(!treeMeshes.has(tree.id)||!CHOP_TOOLS[tool])return null;
      const hit=resources.hit(tree,seconds,direction,treeHitDamage(tree,tool));
      if(hit?.felled)mapRevision++;
      return hit;
    },
    mapState() {
      const revision=mapRevision+':'+structures.revision+':'+resources.deathLoot.mapRevision+':'+[...caveStates.values()].reduce((sum,state)=>sum+state.resources.deathLoot.mapRevision,0);
      if(mapSnapshot.revision!==revision){
        const graves=[...resources.deathLoot.graves.values()].map(({id,x,y,remaining})=>({id,x,y,remaining}));
        if(!activeCave)for(const [id,state] of caveStates){const entrance=caveById(id);for(const grave of state.resources.deathLoot.graves.values())graves.push({id:`${id}:${grave.id}`,x:entrance.x,y:entrance.y-1.5,remaining:grave.remaining});}
        mapSnapshot={revision,cave:activeCave,caveLayoutVersion:layoutVersion(),caveExits:currentExits(),caveDiscovery:activeCave?caveStates.get(activeCave).discovery.serialize():null,entrances:activeCave?[]:caveEntrances(),home:structures.home(),graves,felled:[...resources.trees].filter(([,state])=>state.felled).map(([id])=>id),broken:[...resources.rocks].filter(([,state])=>state.broken).map(([id])=>id),planted:[...resources.plants.values()].map(tree=>({...tree,size:tree.grown?tree.size:.18}))};
      }
      return mapSnapshot;
    },
    campState(id=null){return structures.campState(id);},
    dropDeathLoot(position,inventory,seconds){return resources.deathLoot.drop(position,inventory,seconds);},
    nearestTent(position){return [...structures.objects.values()].filter(object=>object.type==='tent'&&tentInReach(position,object)).sort((a,b)=>Math.hypot(position.x-tentDoor(a).x,position.y-tentDoor(a).y)-Math.hypot(position.x-tentDoor(b).x,position.y-tentDoor(b).y))[0]??null;},
    nearestHarvestTarget(position,direction,tool='stone',aim=null) {
      if(!COMBAT_TOOLS[tool])return null;
      const candidates=[];
      for(const [id,mesh] of treeMeshes)if(CHOP_TOOLS[tool]&&resources.standing(id)) {
        const tree=mesh.userData.object,dx=tree.x-position.x,dy=tree.y-position.y,distance=Math.hypot(dx,dy),dot=distance?(dx*direction.x+dy*direction.y)/distance:1;
        if(distance<=HARVEST.reach)candidates.push({target:{...tree,health:resources.health(tree),maxHealth:treeMaxHealth(tree)},mesh,distance,dot});
      }
      for(const [id,mesh] of rockMeshes)if(resources.rockStanding(id)&&(toolKind(tool)==='pickaxe'||mesh.userData.object.mineral==='echo')&&(mesh.userData.object.mineral!=='echo'||mesh.visible)) {
        const rock=mesh.userData.object,dx=rock.x-position.x,dy=rock.y-position.y,distance=Math.hypot(dx,dy),dot=distance?(dx*direction.x+dy*direction.y)/distance:1;
        if(distance<=HARVEST.reach+rock.rx)candidates.push({target:{...rock,health:resources.rockHealth(rock),maxHealth:rockMaxHealth(rock),label:rock.mineral==='echo'?t("יהלום הד"):rock.mineral==='copper'?t("סלע נחושת"):rock.mineral==='iron'?t("סלע ברזל"):rock.mineral==='coal'?t("סלע פחם"):t("סלע")},mesh,distance:Math.max(0,distance-rock.rx),dot});
      }
      for(const object of structures.objects.values())if(toolKind(tool)==='axe') {
        let nearest={distance:Infinity};
        for(const part of structureParts(object)) {
          const x=Math.max(part.x-part.rx,Math.min(part.x+part.rx,position.x)),y=Math.max(part.y-part.ry,Math.min(part.y+part.ry,position.y)),distance=Math.hypot(x-position.x,y-position.y);
          if(distance<nearest.distance)nearest={x,y,distance};
        }
        if(nearest.distance>HARVEST.reach)continue;
        const center=structureCenter(object),distance=Math.hypot(center.x-position.x,center.y-position.y),dot=distance?((center.x-position.x)*direction.x+(center.y-position.y)*direction.y)/distance:1;
        candidates.push({target:{...object,x:center.x,y:center.y,health:object.health??structureMaxHealth(object.type),maxHealth:structureMaxHealth(object.type),label:ITEMS[object.type].label.replace(t("ערכת "),'')},mesh:decorations.get(object.id),distance:nearest.distance,dot,layer:STRUCTURES[object.type].layer});
      }
      for(const animal of activeCave?[]:animals.active())if(toolKind(tool)!=='pickaxe'&&animal.health) {
        const dx=animal.x-position.x,dy=animal.y-position.y,distance=Math.hypot(dx,dy);if(distance>combatReach(tool))continue;
        const spec=ANIMAL_TYPES[animal.kind],dot=distance?(dx*direction.x+dy*direction.y)/distance:1;
        if(['sword','spear'].includes(toolKind(tool))&&!weaponContact(position,direction,{...animal,radius:spec.radius},tool,(x,y,r)=>this.blocked(x,y,r)))continue;
        const mesh=wildlife.meshes.get(animal.id);
        candidates.push({target:{id:animal.id,type:'animal',kind:animal.kind,x:animal.x,y:animal.y,health:animal.health,maxHealth:spec.health,label:spec.label,healthBarX:mesh?.position.x,healthBarTop:mesh?mesh.position.y+spec.height/2:undefined},mesh,distance,dot});
      }
      const pointed=aim?candidates.filter(candidate=>candidate.mesh&&spriteContains(candidate.mesh,aim)):[];
      if(pointed.length)return pointed.sort((a,b)=>visualPriority(b)-visualPriority(a))[0].target;
      return candidates.filter(candidate=>!candidate.layer&&candidate.dot>=.1).sort((a,b)=>(a.distance+(1-a.dot)*.45)-(b.distance+(1-b.dot)*.45))[0]?.target??null;
    },
    spearChargeTargets(from,to,direction) {
      if(activeCave)return [];
      return animals.active().filter(animal=>animal.health&&Math.hypot(animal.x-to.x,animal.y-to.y)<=combatReach('spear')+Math.hypot(to.x-from.x,to.y-from.y)&&sweptSpearContact(from,to,direction,{...animal,radius:ANIMAL_TYPES[animal.kind].radius},(x,y,r)=>this.blocked(x,y,r))).map(animal=>({id:animal.id,type:'animal',kind:animal.kind,x:animal.x,y:animal.y}));
    },
    hitHarvestTarget(target,seconds,direction,tool='stone',charged=false) {
      if(!COMBAT_TOOLS[tool])return null;
      if(target.type==='animal') {
        const charge=tool==='spear'&&charged,result=animals.hit(target.id,charge?SPEAR_CHARGE.damage:COMBAT_TOOLS[tool].damage,direction);
        if(result?.killed)resources.dropAnimal(result.animal,seconds);return result?{...result,charged:charge}:null;
      }
      if(target.type==='tree')return this.hitTree(target,seconds,direction,tool);
      if(target.type==='rock') {
        const result=resources.hitRock(target,seconds,tool);
        if(result?.echo&&activeCave){
          const layout=currentLayout();
          if(!echoSections.has(layout))echoSections.set(layout,createEchoSections(layout.bounds,(x,y,r)=>caveContains(activeCave,x,y,r,layoutVersion())));
          const sections=echoSections.get(layout),targets=scanEcho(echoOrigin,layout.rocks,id=>resources.rockStanding(id),echoRadius).filter(rock=>sections.same(echoOrigin,rock));
          const blocked=(x,y,r,ignore=null)=>!sections.same(echoOrigin,{x,y})||!caveContains(activeCave,x,y,r,layoutVersion())||structures.blocked(x,y,r,true)||layout.rocks.some(rock=>rock.id!==ignore&&rock.mineral!=='echo'&&resources.rockStanding(rock.id)&&((x-rock.x)/(r+rock.rx))**2+((y-rock.y-rock.size*.22)/(r+rock.ry))**2<1);
          const trail=findEchoTrail(echoOrigin,targets,layout.bounds,blocked,echoRadius);
          const mesh=rockMeshes.get(target.id);if(mesh)removeTreeMesh(mesh);mapRevision++;
          echoView.trigger(trail,seconds,target);return {...result,trail,message:trail?t("אבקה כחולה מתאספת... עקבו אחריה"):t("היהלום מהבהב, אבל לא נוצר שביל")};
        }
        if(result?.broken)mapRevision++;return result;
      }
      const result=structures.hit(target.id,toolKind(tool),CHOP_TOOLS[tool]?.damage??0);
      if(result?.demolished){resources.dropBuilding(result.object,seconds);for(const attached of result.attached??[])resources.dropBuilding(attached,seconds);}
      return result;
    },
    nearestDrop(position) {return resources.nearestDrop(position,nearbyForage(position));},
    collect(position,inventory) {
      const forage=nearbyForage(position),drop=resources.nearestDrop(position,forage);
      if(!drop)return {collected:0,full:false,type:null};
      const recovery=drop.source==='death',before=recovery?new Map(inventory.contents().map(stack=>[stack.type,stack.count])):null;
      const source=decorations.get(recovery?drop.graveId:drop.id),origin={x:source?.position.x??drop.x,y:source?.position.y??drop.y+.2,z:source?.position.z??21};
      const result=resources.collect(position,inventory,forage);
      if(result.collected) {
        const stacks=recovery?inventory.contents().map(stack=>({type:stack.type,count:stack.count-(before.get(stack.type)??0)})).filter(stack=>stack.count>0):[{type:result.type,count:result.collected}];
        const cloneSource=source&&!recovery&&drop.kind!=='fiberBush';
        pickupEffects.start(stacks.map(stack=>({...stack,...origin,...(cloneSource?{map:source.material.map,width:source.geometry.parameters.width*Math.abs(source.scale.x),height:source.geometry.parameters.height*Math.abs(source.scale.y)}:{})})));
        if(source&&!result.full&&drop.kind!=='fiberBush')source.visible=false;
      }
      return result;
    },
    updatePickupEffects(dt,anchor){pickupEffects.update(dt,anchor);},
    plantSeed(position,direction,inventory) {
      if(activeCave)return {planted:false};
      const type=inventory.equipped,seed=SEEDS[type];if(!seed||inventory.count(type)<1||resources.plants.size>=10000)return {planted:false};
      const length=Math.hypot(direction.x,direction.y),dx=length?direction.x/length:0,dy=length?direction.y/length:-1;
      const point={x:Math.round((position.x+dx*.95)*16)/16,y:Math.round((position.y+dy*.95)*16)/16};
      if(Math.abs(point.x)>WORLD.size/2-2||Math.abs(point.y)>WORLD.size/2-2||this.blocked(point.x,point.y,.55))return {planted:false};
      if([...structures.objects.values()].some(o=>['wood-floor','wood-roof'].includes(o.type)&&Math.abs(o.x-point.x)<1.65&&Math.abs(o.y-point.y)<1.65))return {planted:false};
      if([...resources.plants.values()].some(tree=>Math.hypot(tree.x-point.x,tree.y-point.y)<1.8))return {planted:false};
      // Reserve old natural roots too: those trees still return at dawn.
      for(let cy=Math.floor((point.y-2)/size);cy<=Math.floor((point.y+2)/size);cy++)for(let cx=Math.floor((point.x-2)/size);cx<=Math.floor((point.x+2)/size);cx++)if(objects(cx,cy).some(o=>o.type==='tree'&&Math.hypot(o.x-point.x,o.y-point.y)<1.25))return {planted:false};
      if(inventory.remove(type,1)!==1)return {planted:false};
      const tree=resources.plant(seed.kind,point,worldSeconds);mapRevision++;return {planted:true,tree};
    },
    snapStructurePoint(type,point,rotation=0){
      if(type==='torch'&&point) {
        const walls=[...decorations.values()].filter(mesh=>mesh.userData.structure?.type==='wood-wall'&&spriteContains(mesh,point)).sort((a,b)=>b.position.z-a.position.z);
        if(walls.length){const wall=walls[0].userData.structure,center=structureCenter(wall);point={x:wall.rotation%2?center.x:point.x,y:wall.rotation%2?point.y:center.y,wallId:wall.id};}
      }
      return structures.snap(type,point,rotation);
    },
    lightSources(position) {
      const lights=[...structures.objects.values()].filter(o=>loaded.has(key(Math.floor(o.x/size),Math.floor(o.y/size)))&&(['torch','campfire'].includes(o.type)||o.type==='furnace'&&o.furnace.state().burning)).map(o=>({x:o.x,y:o.y+.2,radius:o.type==='campfire'?8:7,power:o.type==='campfire'?2:1.7}));
      if(activeCave)for(const exit of currentExits())lights.push({x:exit.x,y:exit.y-exit.dy,radius:5,power:1.6});
      return lights.sort((a,b)=>Math.hypot(a.x-position.x,a.y-position.y)-Math.hypot(b.x-position.x,b.y-position.y)).slice(0,15);
    },
    structureLayout(type,point,rotation=0){return structures.layoutFor(type,point,rotation);},
    canPlaceStructure(type,point,player,rotation=0){if(activeCave&&currentExits().some(exit=>Math.hypot(point.x-exit.x,point.y-exit.y)<4))return {valid:false,reason:'entrance'};return structures.validate(point,player,(x,y,r)=>this.sceneryBlocked(x,y,r),type,rotation);},
    placeStructure(type,point,player,rotation=0){return this.canPlaceStructure(type,point,player,rotation).valid?structures.place(point,player,(x,y,r)=>this.sceneryBlocked(x,y,r),type,rotation):null;},
    canPlaceWorkbench(point,player){return this.canPlaceStructure('workbench',point,player);},
    placeWorkbench(point,player){return this.placeStructure('workbench',point,player);},
    nearestWorkbench(position){return structures.nearest(position);},
    nearestInteractable(position){
      const building=structures.nearest(position,['workbench','chest','wood-door','furnace']);if(building)return building;
      return null;
    },
    nearbyPortal(position){return (activeCave?currentExits():caveEntrances()).find(portal=>Math.hypot(position.x-portal.x,position.y-portal.y)<4.5)??null;},
    toggleDoor(object,player){return structures.toggleDoor(object.id,player);},
    blocked(x, y, radius, player=false) {
      return structures.blocked(x,y,radius,player)||this.sceneryBlocked(x,y,radius);
    },
    resolvePlayerPosition(position){return structures.resolvePlayerPosition(position,(x,y,r)=>this.sceneryBlocked(x,y,r));},
    sceneryBlocked(x,y,radius=0) {
      if(activeCave&&!caveContains(activeCave,x,y,radius,layoutVersion()))return true;
      if(!activeCave&&(waterAt(x, y) || waterAt(x + radius, y) || waterAt(x - radius, y) || waterAt(x, y + radius) || waterAt(x, y - radius)))return true;
      if(!activeCave&&caveEntrances().some(cave=>!(Math.abs(x-cave.x)<Math.max(.1,.95-radius)&&y<cave.y+1.5)&&((x-cave.x)/(radius+2.6))**2+((y-cave.y-1.3)/(radius+1.3))**2<1))return true;
      for (let cy = Math.floor((y - 2) / size); cy <= Math.floor((y + 2) / size); cy++) {
        for (let cx = Math.floor((x - 2) / size); cx <= Math.floor((x + 2) / size); cx++) {
          for (const object of objects(cx, cy)) {
            if(object.mineral==='echo'||object.type==='tree'&&!resources.standing(object.id)||object.type==='rock'&&!resources.rockStanding(object.id))continue;
            const centerY = object.y + (object.type === 'rock' ? object.size * .22 : 0);
            if (((x - object.x) / (radius + object.rx)) ** 2 + ((y - centerY) / (radius + object.ry)) ** 2 < 1) return true;
          }
        }
      }
      for(const tree of resources.plants.values())if(resources.standing(tree.id)&&((x-tree.x)/(radius+tree.rx))**2+((y-tree.y)/(radius+tree.ry))**2<1)return true;
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
        groundCoconuts:[...resources.drops.values()].filter(drop=>drop.type==='coconut').length,
        cave:activeCave,visitedCaves:caveStates.size,
        looseStones:[...decorations.values()].filter(mesh=>mesh.name==='loose-stone').length,
        fiberBushes:[...decorations.values()].filter(mesh=>mesh.name==='fiber-bush').length,
        gatheredForage:resources.gathered.size,
        workbenches:[...structures.objects.values()].filter(o=>o.type==='workbench').length,
        builtStructures:structures.objects.size-(structures.objects.has('tent:0')?1:0),
        tents:[...structures.objects.values()].filter(object=>object.type==='tent').length,
        animals:activeCave?0:animals.active().filter(animal=>animal.health).length,
        furnaces:[...structures.objects.values()].filter(object=>object.type==='furnace').length,
        ...pickupEffects.stats(),
        ...(grass?.stats() ?? {grassBatches:0,grassTufts:0,pressedGrass:0}),
        ...(weather?.stats() ?? { leafParticles: 0, snowflakes: 0, leafEmitters: 0 }) };
    },
    dispose() {
      for (const id of loaded.keys()) unload(id);
      weather?.dispose();
      grass?.dispose();
      ocean.dispose();
      lakes.dispose();
      wildlife.dispose();dust.dispose();pickupEffects.dispose();echoView.dispose();animalChunks.clear();
      occluders.clear();
      for(const mesh of decorations.values()){lighting?.remove(mesh);mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();}
      decorations.clear();lootMaps.forEach(map=>map.dispose());lootMaps.clear();
      maps.forEach(map => map.dispose());
      maps.clear(); data.clear();
    },
  };
}

function visualPriority(candidate) {
  if(candidate.target.type==='wood-roof'&&candidate.mesh.material.opacity<.5)return -200;
  return candidate.mesh.renderOrder*100+candidate.mesh.position.z;
}
