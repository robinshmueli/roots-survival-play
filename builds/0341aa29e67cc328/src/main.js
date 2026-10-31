import {createEating} from './eating.js';
import {activeWorld} from './world-profile.js';
import {SEEDS} from './tree-seeds.js';
import {createWorldLibrary} from './world-library.js';
import * as THREE from '../vendor/three.module.js';
import { WORLD, PLAYER, VIEW, SPRINT, INVENTORY, CAMP, COMBAT_TOOLS, FOODS } from './config.js';
import { createWorld } from './world.js';
import { createPlayer } from './player.js';
import { createInput } from './input.js';
import { createLighting, getCycleState } from './lighting.js';
import { createMovement } from './movement.js';
import { createAtlas } from './atlas.js';
import { createStamina } from './stamina.js';
import { createInventory } from './inventory.js';
import { createInventoryUI } from './inventory-ui.js';
import { createAttack } from './attack.js';
import { createFeedback } from './feedback.js';
import { ITEMS } from './items.js';
import { createSurvival } from './survival.js';
import { createSurvivalUI } from './survival-ui.js';
import { createFullscreen } from './fullscreen.js';
import { createCompass } from './compass.js';
import { createCamp } from './camp.js';
import { createGameClock,cycleSeconds } from './game-clock.js';
import {createCraftingUI} from './crafting-ui.js';
import {createConstruction} from './construction.js';
import {STRUCTURES,tentDoor,structureCenter} from './structures.js';
import {createChestUI} from './chest-ui.js';
import {createFurnaceUI} from './furnace-ui.js';
import {createSaveStore,OWNER_KEY} from './save-game.js';
import {gameViewport} from './viewport.js';

const library=createWorldLibrary();
const saveStore=createSaveStore(),savedGame=saveStore.load();
saveStore.claim();

const container = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setClearColor(0x8c9f6b);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.setAttribute('aria-label', 'WASD לתנועה, עכבר לכיוון הדמות, Shift לספרינט, לחיצה או רווח לשימוש בפריט ולהצבת מבנים, E לאיסוף ולאינטראקציה, F ליצירה וספר מתכונים, 1–3 לבחירת פריט ו־C לתיק.');
container.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-20, 20, 15, -15, 0.1, 200);
camera.position.set(0, 0, 100);
const lighting = createLighting(scene);
const world = createWorld(scene, lighting,savedGame?.world);
const player = createPlayer(scene, lighting);
const playerBody=scene.getObjectByName('player');
const input = createInput(renderer.domElement);
const movement = createMovement(world);
const stamina = createStamina(savedGame?.stamina);
const inventory = createInventory(true,INVENTORY,savedGame?.inventory);
const survival = createSurvival(savedGame?.vitals);
const eating=createEating(survival,inventory);
const survivalUI = createSurvivalUI();
survivalUI.update(survival.state());
const attack = createAttack();
const feedback = createFeedback(scene,lighting);
const gameClock=createGameClock(savedGame?.clock),camp=createCamp(scene,lighting,()=>world.campState(gameClock.sleepingTentId));
const construction=createConstruction(scene,lighting,world,inventory);
function resetActions(){input.reset();movement.stop();attack.cancel();eating.cancel();}
const deathDialog=document.getElementById('death-screen');
deathDialog.addEventListener('cancel',event=>event.preventDefault());
document.getElementById('restart-game').addEventListener('click',()=>{saveStore.reset();window.location.reload();});
let bag,craftUI,chestUI,furnaceUI;
const atlas = createAtlas(resetActions,()=>bag?.isOpen||craftUI?.isOpen||chestUI?.isOpen||furnaceUI?.isOpen||deathDialog.open||gameClock.sleeping||construction.active,()=>world.mapState(),savedGame?.discovery);
bag = createInventoryUI(inventory,resetActions,()=>atlas.isOpen||craftUI?.isOpen||chestUI?.isOpen||furnaceUI?.isOpen||deathDialog.open||gameClock.sleeping||construction.active);
const position = new THREE.Vector2(savedGame?.position.x??PLAYER.startX,savedGame?.position.y??PLAYER.startY);
camera.position.set(position.x,position.y,100);
chestUI=createChestUI(inventory,resetActions,()=>atlas.isOpen||bag.isOpen||craftUI?.isOpen||furnaceUI?.isOpen||deathDialog.open||gameClock.sleeping||construction.active);
furnaceUI=createFurnaceUI(inventory,resetActions,()=>atlas.isOpen||bag.isOpen||chestUI.isOpen||craftUI?.isOpen||deathDialog.open||gameClock.sleeping||construction.active);
craftUI=createCraftingUI(inventory,resetActions,()=>atlas.isOpen||bag.isOpen||chestUI.isOpen||furnaceUI.isOpen||deathDialog.open||gameClock.sleeping||construction.active,
  ()=>!!world.nearestWorkbench(position),type=>{
    if(STRUCTURES[type])bag.notify(`${ITEMS[type].label} נוספה לציוד · בחרו אותה ביד כדי להציב`,gameClock.seconds);
    else {inventory.equip(type);bag.notify(type==='sword'?'החרב מוכנה · לחיצה או רווח לתקיפה':'הגרזן מוכן · לחיצה או רווח לכריתת עצים',gameClock.seconds);}
    bag.render();
  },()=>world.biomeAt(position.x,position.y));
const coordinates = document.getElementById('coordinates');
const regionName = document.getElementById('biome-name');
const staminaMeter = document.getElementById('stamina-meter');
const staminaFill = document.getElementById('stamina-fill');
const staminaStatus = document.getElementById('sprint-status');
const staminaTime = document.getElementById('stamina-time');
const staminaPanel = document.getElementById('stamina-panel');
const compass=createCompass();
atlas.update(position);
let previousTime;
let appActive=!document.hidden;
let uiTimer = 0;
let cycleStartedAt;
let facing=savedGame?{...savedGame.facing}:{x:0,y:-1};
const aimPoint=new THREE.Vector3();

const saveStatus=document.getElementById('save-status');
let lastSavedTime=-Infinity,lastSavedRevision='',lastLibraryUpdate=0;
function showSaveStatus() {
  const text=saveStore.superseded?'נפתח בלשונית אחרת · לחץ להמשך כאן':saveStore.error==='unreadable'?'לא ניתן לקרוא את השמירה':saveStore.error==='unavailable'?'השמירה אינה זמינה בדפדפן':saveStore.error==='recovered'?'שוחזרה שמירה קודמת':savedGame?'השמירה נטענה':'שמירה אוטומטית';
  saveStatus.textContent=text;saveStatus.dataset.state=saveStore.error?'error':'ready';
}
function saveNow() {
  const success=saveStore.save({position:{x:position.x,y:position.y},facing:{...facing},inventory:inventory.serialize(),vitals:survival.serialize(),stamina:stamina.serialize(),clock:gameClock.serialize(),world:world.serialize(),discovery:atlas.serializeDiscovery()});
  if(success&&Date.now()-lastLibraryUpdate>30000){library.touch(activeWorld.id,{day:Math.floor(gameClock.seconds/cycleSeconds)+1});lastLibraryUpdate=Date.now();}
  if(success){saveStatus.textContent='המשחק נשמר ✓';saveStatus.dataset.state='saved';}else showSaveStatus();
  return success;
}
document.getElementById('worlds-menu').addEventListener('click',()=>{
  resetActions();construction.cancel();
  if(!saveNow()&&!saveStore.superseded){bag.notify('לא הצלחנו לשמור. פנו מקום בדפדפן ונסו שוב.',gameClock.seconds);return;}
  window.location.reload();
});
function updateSave(time) {
  const revision=inventory.revision+':'+world.stateRevision;
  if(appActive&&!saveStore.superseded&&(time-lastSavedTime>=3||(revision!==lastSavedRevision&&time-lastSavedTime>=.75))) {
    saveNow();lastSavedTime=time;lastSavedRevision=revision;
  }
}
showSaveStatus();
saveStatus.addEventListener('click',()=>{if(!saveStore.checkOwner())window.location.reload();else saveNow();});
saveStatus.addEventListener('keydown',event=>{if(['Space','Enter'].includes(event.code))event.stopPropagation();});
window.addEventListener('pagehide',saveNow);
window.addEventListener('beforeunload',saveNow);
window.addEventListener('storage',event=>{
  if(event.key!==OWNER_KEY)return;
  saveStore.observeOwner(event.newValue);
  if(saveStore.superseded){appActive=false;resetActions();construction.cancel();showSaveStatus();}
});

function resize() {
  const width = container.clientWidth;
  const height = container.clientHeight;
  const {renderWidth,renderHeight,worldWidth,worldHeight}=gameViewport(width,height,window.screen.width/window.screen.height);
  camera.left = -worldWidth / 2;
  camera.right = worldWidth / 2;
  camera.top = worldHeight / 2;
  camera.bottom = -worldHeight / 2;
  camera.updateProjectionMatrix();
  renderer.setSize(renderWidth, renderHeight, false);
}
window.addEventListener('resize', resize);
resize();
createFullscreen(container,()=>{resetActions();resize();});

renderer.domElement.addEventListener('webglcontextlost', event => {
  event.preventDefault();
  const notice = document.getElementById('notice');
  notice.textContent = 'החיבור הגרפי נעצר. רעננו את הדף כדי להמשיך.';
  notice.hidden = false;
});

function frame(time) {
  const realDt = previousTime === undefined ? 0 : Math.max(0, (time - previousTime) / 1000);
  const dt = Math.min(realDt, .04);
  previousTime = time;
  cycleStartedAt ??= time;
  const clockState=gameClock.update(time/1000,appActive),worldSeconds=clockState.seconds;
  const animationSeconds=(time-cycleStartedAt)/1000;
  if(clockState.woke){resetActions();position.set((clockState.wake??CAMP.wake).x,(clockState.wake??CAMP.wake).y);bag.notify('בוקר טוב · יום חדש',worldSeconds);}
  craftUI.update(appActive&&!survival.state().dead&&!gameClock.sleeping?realDt:0);
  const initiallyBlocked=atlas.isOpen||bag.isOpen||craftUI.isOpen||chestUI.isOpen||furnaceUI.isOpen||deathDialog.open;
  const pickupRequested=input.takePickup(),pickupNearby=world.nearestDrop(position);
  let usedCamp=false;
  if(!initiallyBlocked&&!survival.state().dead&&appActive&&pickupRequested&&!gameClock.sleeping&&!construction.active) {
    const object=world.nearestInteractable(position);
    if(!pickupNearby&&object){usedCamp=true;if(object.type==='chest')chestUI.open(object);else if(object.type==='furnace')furnaceUI.open(object);else if(object.type==='wood-door'){const result=world.toggleDoor(object,position);if(!result.changed)bag.notify('התרחקו מעט מהפתח כדי להזיז את הדלת',worldSeconds);}else craftUI.open();}
    else if(!pickupNearby&&world.nearestTent(position)) {
      usedCamp=true;const tent=world.nearestTent(position),center=structureCenter(tent);
      if(gameClock.startSleep(position,tent)){resetActions();position.set(center.x,center.y);}
      else bag.notify('אפשר לישון באוהל רק בלילה',worldSeconds);
    }
  }
  const menuOpen=atlas.isOpen||bag.isOpen||craftUI.isOpen||chestUI.isOpen||furnaceUI.isOpen||deathDialog.open;
  const sleeping=gameClock.sleeping;
  let vitals=survival.update(!menuOpen&&!sleeping&&appActive?realDt:0);
  if(vitals.damage)feedback.hurt(worldSeconds);
  if(vitals.dead&&!deathDialog.open){resetActions();construction.cancel();deathDialog.showModal();}
  let paused=menuOpen||vitals.dead||!appActive||sleeping;
  const direction = paused ? { x: 0, y: 0 } : input.direction();
  const held = !paused && input.sprint();
  const sprintPlan = stamina.plan(dt, held && Math.hypot(direction.x, direction.y) > 0);
  const motion = movement.step(position, direction, dt, sprintPlan.multiplier);
  compass.update(!paused&&motion.distance>.00001?motion.direction:null,dt);
  const exertion = stamina.update(!menuOpen&&!vitals.dead&&appActive?realDt:0, held, motion.distance > .00001 ? sprintPlan.seconds : 0);
  const {landedTrees,regrownTrees,animalDamage}=world.update(worldSeconds, position, camera, { direction: motion.direction, sprinting: exertion.running&&!paused&&motion.distance>.00001,simulationDt:paused?0:dt,effectsDt:appActive?dt:0,cookingDt:appActive?realDt:0,animationSeconds,sleepingTent:gameClock.sleeping?(gameClock.sleepingTentId??world.campState()?.id):null });
  if(animalDamage){vitals=survival.hurt(animalDamage);feedback.hurt(worldSeconds);if(vitals.dead){paused=true;resetActions();construction.cancel();if(!deathDialog.open)deathDialog.showModal();}}
  if(regrownTrees.length)bag.notify('בוקר חדש — העצים שנכרתו צמחו מחדש',worldSeconds);
  if(!paused)for(const {tree,at} of landedTrees) {
    if(worldSeconds-at<.25&&Math.abs(tree.x-camera.position.x)<camera.right+4&&Math.abs(tree.y-camera.position.y)<camera.top+4)feedback.land(worldSeconds);
  }
  if(motion.distance>.00001)facing=motion.direction;
  const aim=input.aim();
  let pointerWorld=null;
  if(aim&&!paused) {
    aimPoint.set(aim.x,aim.y,0).unproject(camera);
    pointerWorld={x:aimPoint.x,y:aimPoint.y};
    const x=aimPoint.x-position.x,y=aimPoint.y-position.y,length=Math.hypot(x,y);
    if(length>.1)facing={x:x/length,y:y/length};
  }
  const wasPlacing=construction.active;
  construction.update(appActive?dt:0,position,pointerWorld,!sleeping&&!vitals.dead);
  const useRequested=input.takeUse();
  if(!paused&&useRequested&&wasPlacing) {
    const result=construction.confirm(position);
    if(result.placed){resetActions();bag.notify(['workbench','chest','wood-door','furnace'].includes(result.object.type)?'הבנייה הושלמה · E לפתיחה':'הבנייה הושלמה',worldSeconds);}
    else bag.notify('אי אפשר להציב כאן · בחרו מקום פנוי על הקרקע',worldSeconds);
  } else if(!paused&&useRequested&&SEEDS[inventory.equipped]) {
    const result=world.plantSeed(position,facing,inventory);
    bag.notify(result.planted?'הזרע נשתל · העץ יגדל בבוקר':'צריך אדמה פנויה קרוב מול הדמות',worldSeconds);
  } else if(!paused&&useRequested&&!!STRUCTURES[inventory.equipped]) {
    resetActions();construction.begin(position,facing,pointerWorld);
    construction.update(0,position,pointerWorld);
  } else if(!paused&&useRequested&&Object.hasOwn(FOODS,inventory.equipped)) {
    const result=eating.start();
    if(result.reason==='full')bag.notify('מד הרעב מלא — שומרים את הפרי להמשך',worldSeconds);
  }
  const meal=eating.update(dt,!paused);
  if(meal?.eaten)bag.notify(`אכלת ${ITEMS[meal.type].label}`,worldSeconds);
  vitals=survival.state();
  survivalUI.update(vitals);
  const swing=attack.update(worldSeconds,!paused&&input.attack(),facing,!paused&&!eating.active&&!construction.active&&!wasPlacing&&!!COMBAT_TOOLS[inventory.equipped],(strikeDirection,tool)=>{
    const target=world.nearestHarvestTarget(position,strikeDirection,tool,pointerWorld);
    const hit=target?world.hitHarvestTarget(target,worldSeconds,strikeDirection,tool):null;
    feedback.impact(worldSeconds,position,strikeDirection,hit);
    if(hit?.killed)bag.notify('החיה נפלה · אספו את הבשר הנא עם E',worldSeconds);
    if(hit?.demolished)bag.notify('המבנה פורק · אספו את הערכה והפריטים עם E',worldSeconds);
    if(hit?.felled)bag.notify('העץ נופל! אוספים את הפריטים עם E',worldSeconds);
    if(hit?.broken)bag.notify('הסלע נשבר · אספו את האבנים עם E',worldSeconds);
  },inventory.equipped);
  player.update(position,facing,motion.distance,paused?0:dt,{equipped:construction.active?null:inventory.equipped,swing,
    eating:eating.state(),panting:exertion.panting,breathRemaining:exertion.breathRemaining,visible:!sleeping});
  world.updateOcclusion(playerBody,appActive?dt:0);
  if(!paused&&pickupRequested&&!usedCamp&&!construction.active&&!wasPlacing) {
    const pickup=world.collect(position,inventory);
    const item=ITEMS[pickup.type],obtained=`+${pickup.collected} ${pickup.collected===1?item?.label??'פריט':item?.plural??'פריטים'}`;
    if(pickup.collected)bag.notify(pickup.full?`${obtained} · אין מקום לשאר`:obtained,worldSeconds);
    else if(pickup.full)bag.notify(inventory.count(pickup.type)>=INVENTORY.stackLimit?`כבר יש לך ${INVENTORY.stackLimit} ${item?.plural??'פריטים מהסוג הזה'}`:'התיק והידיים מלאים — פנו מקום לפריט חדש',worldSeconds);
  }
  const target=construction.active?null:world.nearestHarvestTarget(position,swing?.direction??facing,inventory.equipped,pointerWorld);
  const night=getCycleState(worldSeconds).phase.id==='night';
  const interactive=world.nearestInteractable(position);
  const nearbyLoot=world.nearestDrop(position);
  const nearbyTent=world.nearestTent(position),door=nearbyTent?tentDoor(nearbyTent):null;
  const campHint=sleeping?{sleeping:true,label:'ישנים · הלילה חולף...'}:construction.active?
    {label:construction.status().valid?`לחיצה להצבה · R לסיבוב · ${construction.rotation*90}° · Esc לביטול`:'בחרו שטח פנוי · R לסיבוב · אדום: אי אפשר להציב'}:
    !paused&&!nearbyLoot&&interactive?{kind:interactive.type,available:true,label:interactive.type==='chest'?'E · פתיחת תיבה':interactive.type==='furnace'?'E · פתיחת תנור':interactive.type==='wood-door'?(interactive.open?'E · סגירת דלת':'E · פתיחת דלת'):'E · שולחן יצירה',x:interactive.x,y:interactive.y+.6}:!paused&&!nearbyLoot&&nearbyTent?
    {kind:'camp',available:night,label:night?'E · לישון עד הבוקר':'אוהל · אפשר לישון כאן בלילה',x:door.x,y:door.y+.3}:null;
  feedback.update(worldSeconds,dt,sleeping?null:target,inventory.equipped,paused||campHint?null:world.nearestDrop(position),campHint);
  camp.update(sleeping,gameClock.sleepElapsed);
  bag.update(worldSeconds);chestUI.update();furnaceUI.update();
  lighting.update(worldSeconds);

  const cameraX = THREE.MathUtils.clamp(position.x, Math.min(0, -WORLD.size / 2 - camera.left), Math.max(0, WORLD.size / 2 - camera.right));
  const cameraY = THREE.MathUtils.clamp(position.y, Math.min(0, -WORLD.size / 2 - camera.bottom), Math.max(0, WORLD.size / 2 - camera.top));
  const follow = 1 - Math.exp(-VIEW.followSpeed * dt);
  camera.position.x = THREE.MathUtils.lerp(camera.position.x, cameraX, follow);
  camera.position.y = THREE.MathUtils.lerp(camera.position.y, cameraY, follow);
  // Snap the rendered camera to the same pixel grid as the character.
  const smoothX = camera.position.x, smoothY = camera.position.y;
  const shake=paused&&!vitals.dead?{x:0,y:0}:feedback.offset(worldSeconds);
  camera.position.x = Math.round((smoothX+shake.x) * VIEW.pixelsPerUnit) / VIEW.pixelsPerUnit;
  camera.position.y = Math.round((smoothY+shake.y) * VIEW.pixelsPerUnit) / VIEW.pixelsPerUnit;
  uiTimer += dt;
  if (uiTimer > .15) {
    coordinates.textContent = `X ${Math.round(position.x)}   Y ${Math.round(position.y)}`;
    const biome = world.biomeAt(position.x, position.y);
    if (regionName.textContent !== biome.label) regionName.textContent = biome.label;
    atlas.update(position,{width:camera.right-camera.left,height:camera.top-camera.bottom});
    staminaFill.style.width = `${exertion.energy / exertion.maximum * 100}%`;
    staminaMeter.setAttribute('aria-valuenow', exertion.energy.toFixed(1));
    staminaMeter.setAttribute('aria-valuemax', String(exertion.maximum));
    staminaTime.textContent = `${exertion.energy.toFixed(1)} / ${exertion.maximum.toFixed(0)}s`;
    const status = sleeping?'נחים':exertion.panting?'מתנשפים':exertion.running ? 'ספרינט' : exertion.exhausted
      ? (exertion.energy >= SPRINT.restartThreshold && held ? 'שחררו Shift' : 'מתאוששים') : exertion.recovering ? 'נטען' : 'מוכנים';
    if (staminaStatus.textContent !== status) staminaStatus.textContent = status;
    staminaPanel.dataset.state = exertion.panting?'panting':exertion.running ? 'running' : exertion.exhausted ? 'exhausted' : exertion.energy < 2 ? 'low' : 'ready';
    uiTimer = 0;
  }
  renderer.render(scene, camera);
  camera.position.x = smoothX;
  camera.position.y = smoothY;
  updateSave(time/1000);
}

window.addEventListener('keydown',event=>{if(event.code==='Escape'&&construction.active&&!event.defaultPrevented){event.preventDefault();construction.cancel();resetActions();}},true);
window.addEventListener('blur',()=>{appActive=false;previousTime=undefined;gameClock.suspend();construction.cancel();resetActions();saveNow();});
window.addEventListener('focus',()=>{if(!saveStore.checkOwner()){window.location.reload();return;}appActive=true;previousTime=undefined;});
document.addEventListener('visibilitychange',()=>{appActive=!document.hidden&&document.hasFocus();previousTime=undefined;if(!appActive){gameClock.suspend();construction.cancel();saveNow();}resetActions();});
renderer.setAnimationLoop(frame);

window.addEventListener('keydown',event=>{
  if(event.code!=='KeyR'||event.repeat||event.metaKey||event.ctrlKey||event.altKey||!construction.active||!appActive||event.target?.closest?.('dialog[open]'))return;
  event.preventDefault();construction.rotate();
});
