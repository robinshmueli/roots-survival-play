import {t} from './i18n.js';
import {createEating} from './eating.js';
import {activeWorld} from './world-profile.js';
import {SEEDS} from './tree-seeds.js';
import {createWorldLibrary} from './world-library.js';
import * as THREE from '../vendor/three.module.js';
import { WORLD, PLAYER, VIEW, SPRINT, INVENTORY, CAMP, COMBAT_TOOLS, FOODS } from './config.js';
import { createWorld } from './world.js';
import { createPlayer } from './player.js';
import { createInput } from './input.js';
import { createLighting } from './lighting.js';
import { createMovement } from './movement.js';
import { createAtlas } from './atlas.js';
import { createStamina } from './stamina.js';
import { createInventory } from './inventory.js';
import { createInventoryUI } from './inventory-ui.js';
import { createAttack } from './attack.js';
import {createSpearCharge} from './combat.js';
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
import {respawnAtHome} from './respawn.js';
import {createCaveTransition,createCaveIris} from './cave-transition.js';

const library=createWorldLibrary();
const saveStore=createSaveStore(),savedGame=saveStore.load();
saveStore.claim();

const container = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setClearColor(0x8c9f6b);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.setAttribute('aria-label', t("WASD לתנועה, עכבר לכיוון הדמות, Shift לספרינט, לחיצה או רווח לשימוש בפריט ולהצבת מבנים, E לאיסוף ולאינטראקציה, F ליצירה וספר מתכונים, 1–5 לבחירת פריט ו־C לתיק."));
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
const spearCharge=createSpearCharge();
const feedback = createFeedback(scene,lighting);
const gameClock=createGameClock(savedGame?.clock),camp=createCamp(scene,lighting,()=>world.campState(gameClock.sleepingTentId));
const construction=createConstruction(scene,lighting,world,inventory);
const caveTravel=createCaveTransition(),caveIris=createCaveIris(container);
function resetActions(){input.reset();movement.stop();attack.cancel();eating.cancel();spearCharge.cancel();}
const deathDialog=document.getElementById('death-screen'),pauseDialog=document.getElementById('pause-menu'),pauseButton=document.getElementById('pause-toggle');
deathDialog.addEventListener('cancel',event=>event.preventDefault());
let bag,craftUI,chestUI,furnaceUI;
const atlas = createAtlas(resetActions,()=>bag?.isOpen||craftUI?.isOpen||chestUI?.isOpen||furnaceUI?.isOpen||deathDialog.open||pauseDialog.open||gameClock.sleeping||caveTravel.active||construction.active,()=>world.mapState(),savedGame?.discovery);
bag = createInventoryUI(inventory,resetActions,()=>atlas.isOpen||craftUI?.isOpen||chestUI?.isOpen||furnaceUI?.isOpen||deathDialog.open||pauseDialog.open||gameClock.sleeping||caveTravel.active||construction.active);
const position = new THREE.Vector2(savedGame?.position.x??PLAYER.startX,savedGame?.position.y??PLAYER.startY);
camera.position.set(position.x,position.y,100);
chestUI=createChestUI(inventory,resetActions,()=>atlas.isOpen||bag.isOpen||craftUI?.isOpen||furnaceUI?.isOpen||deathDialog.open||pauseDialog.open||gameClock.sleeping||caveTravel.active||construction.active);
furnaceUI=createFurnaceUI(inventory,resetActions,()=>atlas.isOpen||bag.isOpen||chestUI.isOpen||craftUI?.isOpen||deathDialog.open||pauseDialog.open||gameClock.sleeping||caveTravel.active||construction.active);
craftUI=createCraftingUI(inventory,resetActions,()=>atlas.isOpen||bag.isOpen||chestUI.isOpen||furnaceUI.isOpen||deathDialog.open||pauseDialog.open||gameClock.sleeping||caveTravel.active||construction.active,
  ()=>!!world.nearestWorkbench(position),type=>{
    if(STRUCTURES[type])bag.notify(t("{0} נוספה לציוד · בחרו אותה ביד כדי להציב", [ITEMS[type].label]),gameClock.seconds);
    else {inventory.equip(type);bag.notify(type==='spear'?t("החנית מוכנה · קליק לדקירה · ימני מוחזק ו־Shift להסתערות"):type.endsWith('sword')?t("החרב מוכנה · לחיצה או רווח לתקיפה"):type.endsWith('pickaxe')?t("המכוש מוכן · לחיצה או רווח לחציבה"):t("הגרזן מוכן · לחיצה או רווח לכריתת עצים"),gameClock.seconds);}
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
let animationSeconds=0;
let facing=savedGame?{...savedGame.facing}:{x:0,y:-1};
const aimPoint=new THREE.Vector3();

const saveStatus=document.getElementById('save-status');
let lastSavedTime=-Infinity,lastSavedRevision='',lastLibraryUpdate=0;
function showSaveStatus() {
  const text=saveStore.superseded?t("נפתח בלשונית אחרת · לחץ להמשך כאן"):saveStore.error==='unreadable'?t("לא ניתן לקרוא את השמירה"):saveStore.error==='unavailable'?t("השמירה אינה זמינה בדפדפן"):saveStore.error==='recovered'?t("שוחזרה שמירה קודמת"):savedGame?t("השמירה נטענה"):t("שמירה אוטומטית");
  saveStatus.textContent=text;saveStatus.dataset.state=saveStore.error?'error':'ready';
}
function saveNow() {
  const success=saveStore.save({position:caveTravel.savePosition()??{x:position.x,y:position.y},facing:{...facing},inventory:inventory.serialize(),vitals:survival.serialize(),stamina:stamina.serialize(),clock:gameClock.serialize(),world:world.serialize(),discovery:atlas.serializeDiscovery()});
  if(success&&Date.now()-lastLibraryUpdate>30000){library.touch(activeWorld.id,{day:Math.floor(gameClock.seconds/cycleSeconds)+1});lastLibraryUpdate=Date.now();}
  if(success){saveStatus.textContent=t("המשחק נשמר ✓");saveStatus.dataset.state='saved';}else showSaveStatus();
  return success;
}
function returnToMenu() {
  resetActions();construction.cancel();
  if(!saveNow()&&!saveStore.superseded){
    const message=t("לא הצלחנו לשמור. פנו מקום בדפדפן ונסו שוב.");
    if(deathDialog.open||pauseDialog.open){const status=document.getElementById(deathDialog.open?'death-status':'pause-status');status.textContent=message;status.hidden=false;}else bag.notify(message,gameClock.seconds);
    return;
  }
  window.location.reload();
}
function openPause() {
  if(pauseDialog.open||document.querySelector('dialog[open]')||survival.state().dead||!appActive)return;
  resetActions();construction.cancel();gameClock.setPaused(true);pauseDialog.showModal();pauseButton.setAttribute('aria-expanded','true');
  document.getElementById('pause-status').hidden=true;saveNow();
}
function finishPause() {
  if(pauseDialog.open)return;
  gameClock.setPaused(false);pauseButton.setAttribute('aria-expanded','false');previousTime=undefined;resetActions();
}
function resumeGame() {
  if(!pauseDialog.open)return;
  if(!saveStore.checkOwner()){window.location.reload();return;}
  pauseDialog.close();finishPause();
}
pauseButton.addEventListener('click',openPause);
document.getElementById('pause-resume').addEventListener('click',resumeGame);
document.getElementById('pause-main-menu').addEventListener('click',returnToMenu);
pauseDialog.addEventListener('cancel',event=>{event.preventDefault();resumeGame();});
pauseDialog.addEventListener('close',finishPause);
document.getElementById('death-menu').addEventListener('click',returnToMenu);
document.getElementById('respawn-home').addEventListener('click',()=>{
  if(!deathDialog.open||!survival.state().dead||!saveStore.checkOwner())return;
  resetActions();construction.cancel();
  if(!respawnAtHome(world,survival,stamina,position)) {
    const status=document.getElementById('death-status');status.textContent=t("לא נמצא מקום פנוי ליד הבית. אפשר לחזור לתפריט ולנסות שוב.");status.hidden=false;return;
  }
  facing={x:0,y:-1};camera.position.set(position.x,position.y,100);previousTime=undefined;uiTimer=.2;
  survivalUI.update(survival.state());deathDialog.close();
  atlas.update(position);bag.notify(world.campState()?t("חזרת הביתה · המסע ממשיך"):t("חזרת לנקודת ההתחלה · המסע ממשיך"),gameClock.seconds);saveNow();
});
function showDeath() {
  if(deathDialog.open)return;
  resetActions();construction.cancel();world.dropDeathLoot(position,inventory,gameClock.seconds);bag.render();atlas.update(position);
  document.getElementById('death-description').textContent=world.mapState().graves.length?t("העולם נשמר. הציוד ממתין ליד הגולגולת במפה למשך 3 דקות משחק פעיל. חזרו ואספו אותו עם E."):t("העולם נשמר. אפשר לחזור לאוהל ולהמשיך במסע.");
  document.getElementById('death-status').hidden=true;deathDialog.showModal();saveNow();
}
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
// Keep side panels clear of the dock when hints or hunger warnings add a row.
new ResizeObserver(([entry])=>{
  container.style.setProperty('--player-hud-height',`${Math.ceil(entry.borderBoxSize?.[0]?.blockSize??entry.target.getBoundingClientRect().height)}px`);
}).observe(document.querySelector('.player-hud'));
createFullscreen(container,()=>{resetActions();resize();});

renderer.domElement.addEventListener('webglcontextlost', event => {
  event.preventDefault();
  const notice = document.getElementById('notice');
  notice.textContent = t("החיבור הגרפי נעצר. רעננו את הדף כדי להמשיך.");
  notice.hidden = false;
});

function frame(time) {
  const realDt = previousTime === undefined ? 0 : Math.max(0, (time - previousTime) / 1000);
  const dt = Math.min(realDt, .04);
  previousTime = time;
  if(pauseDialog.open){gameClock.update(time/1000,false);renderer.render(scene,camera);return;}
  animationSeconds+=realDt;
  const clockState=gameClock.update(time/1000,appActive),worldSeconds=clockState.seconds;
  if(clockState.woke){resetActions();position.set((clockState.wake??CAMP.wake).x,(clockState.wake??CAMP.wake).y);bag.notify(t("בוקר טוב · יום חדש"),worldSeconds);}
  craftUI.update(appActive&&!survival.state().dead&&!gameClock.sleeping?realDt:0);
  const initiallyBlocked=atlas.isOpen||bag.isOpen||craftUI.isOpen||chestUI.isOpen||furnaceUI.isOpen||deathDialog.open;
  const pickupRequested=input.takePickup(),pickupNearby=world.nearestDrop(position);
  let usedCamp=false;
  if(!initiallyBlocked&&!survival.state().dead&&appActive&&pickupRequested&&!gameClock.sleeping&&!caveTravel.active&&!construction.active) {
    const object=world.nearestInteractable(position);
    if(!pickupNearby&&object){usedCamp=true;if(object.type==='chest')chestUI.open(object);else if(object.type==='furnace')furnaceUI.open(object);else if(object.type==='wood-door'){const result=world.toggleDoor(object,position);if(!result.changed)bag.notify(t("התרחקו מעט מהפתח כדי להזיז את הדלת"),worldSeconds);}else craftUI.open();}
    else if(!pickupNearby&&world.nearestTent(position)) {
      usedCamp=true;const tent=world.nearestTent(position),center=structureCenter(tent);
      if(gameClock.startSleep(position,tent)){resetActions();position.set(center.x,center.y);}
      else bag.notify(t("אפשר לישון באוהל בערב ובלילה"),worldSeconds);
    }
  }
  const menuOpen=atlas.isOpen||bag.isOpen||craftUI.isOpen||chestUI.isOpen||furnaceUI.isOpen||deathDialog.open;
  const sleeping=gameClock.sleeping;
  let vitals=survival.update(!menuOpen&&!sleeping&&!caveTravel.active&&appActive?realDt:0);
  if(vitals.damage)feedback.hurt(worldSeconds);
  if(vitals.dead)showDeath();
  let paused=menuOpen||vitals.dead||!appActive||sleeping||caveTravel.active;
  const direction = paused ? { x: 0, y: 0 } : input.direction();
  const held = !paused && input.sprint();
  const sprintPlan = stamina.plan(dt, held && Math.hypot(direction.x, direction.y) > 0);
  const motionFrom={x:position.x,y:position.y};
  let motion = caveTravel.active?{distance:0,direction:facing}:movement.step(position, direction, dt, sprintPlan.multiplier);
  if(!paused&&!construction.active&&motion.distance>.00001&&caveTravel.canStart(position,input.movementRevision)) {
    const portal=world.crossingPortal(position,motion.direction),plan=portal?world.planPortal(portal,position):null;
    if(plan&&caveTravel.start(plan,position)){resetActions();paused=true;}
  }
  const travelMotion=caveTravel.update(appActive?dt:0,plan=>world.crossPortal(plan),input.movementRevision);
  if(travelMotion) {
    position.set(travelMotion.position.x,travelMotion.position.y);facing=travelMotion.direction;motion={distance:travelMotion.distance,direction:travelMotion.direction};paused=true;
    if(travelMotion.switched){camera.position.set(position.x,position.y,100);uiTimer=.2;atlas.update(position);}
    if(travelMotion.finished)bag.notify(world.underground?t("מערה · לפיד ביד השנייה יאיר גם בזמן חציבה"):t("חזרתם אל פני השטח"),worldSeconds);
  }
  compass.update(!paused&&motion.distance>.00001?motion.direction:null,dt);
  const exertion = stamina.update(!menuOpen&&!vitals.dead&&appActive?realDt:0, held, motion.distance > .00001 ? sprintPlan.seconds : 0);
  const {landedTrees,regrownTrees,animalDamage}=world.update(worldSeconds, position, camera, { direction: motion.direction, sprinting: exertion.running&&!paused&&motion.distance>.00001,simulationDt:paused?0:dt,recoveryDt:paused?0:realDt,effectsDt:appActive?dt:0,cookingDt:appActive?realDt:0,animationSeconds,growthSleep:gameClock.growthSleep,sleepingTent:gameClock.sleeping?(gameClock.sleepingTentId??world.campState()?.id):null });
  if(animalDamage){vitals=survival.hurt(animalDamage);feedback.hurt(worldSeconds);if(vitals.dead){paused=true;showDeath();}}
  if(regrownTrees.length)bag.notify(t("בוקר חדש — העצים שנכרתו צמחו מחדש"),worldSeconds);
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
    if(result.placed){resetActions();bag.notify(['workbench','chest','wood-door','furnace'].includes(result.object.type)?t("הבנייה הושלמה · E לפתיחה"):t("הבנייה הושלמה"),worldSeconds);}
    else bag.notify(t("אי אפשר להציב כאן · בחרו מקום פנוי על הקרקע"),worldSeconds);
  } else if(!paused&&useRequested&&SEEDS[inventory.equipped]) {
    const result=world.plantSeed(position,facing,inventory);
    bag.notify(result.planted?t("הזרע נשתל · העץ יגדל בבוקר"):t("צריך אדמה פנויה קרוב מול הדמות"),worldSeconds);
  } else if(!paused&&useRequested&&!!STRUCTURES[inventory.equipped]) {
    resetActions();construction.begin(position,facing,pointerWorld);
    construction.update(0,position,pointerWorld);
  } else if(!paused&&useRequested&&Object.hasOwn(FOODS,inventory.equipped)) {
    const result=eating.start();
    if(result.reason==='full')bag.notify(t("מד הרעב מלא — שומרים את האוכל להמשך"),worldSeconds);
  }
  const meal=eating.update(dt,!paused);
  if(meal?.eaten)bag.notify(t("אכלת {0}", [ITEMS[meal.type].label]),worldSeconds);
  vitals=survival.state();
  survivalUI.update(vitals);
  const canFight=!paused&&!eating.active&&!construction.active&&!wasPlacing;
  const spear=spearCharge.update(dt,{enabled:canFight&&inventory.equipped==='spear',held:input.brace(),sprinting:exertion.running,distance:motion.distance,direction:facing,movementDirection:motion.direction});
  const applyHit=(strikeDirection,tool,target,charged=false)=>{
    const hit=target?world.hitHarvestTarget(target,worldSeconds,strikeDirection,tool,charged):null;
    feedback.impact(worldSeconds,position,strikeDirection,hit);
    if(hit?.echo)bag.notify(hit.message,worldSeconds,6);
    if(hit?.killed)bag.notify(hit.animal?.kind==='wolf'?t("הזאב הובס"):t("החיה נפלה · אספו את הבשר הנא עם E"),worldSeconds);
    if(hit?.demolished)bag.notify(t("המבנה פורק · אספו את הערכה והפריטים עם E"),worldSeconds);
    if(hit?.felled)bag.notify(t("העץ נופל! אוספים את הפריטים עם E"),worldSeconds);
    if(hit?.broken)bag.notify(t("הסלע נשבר · אספו את החומרים עם E"),worldSeconds);
  };
  const swing=attack.update(worldSeconds,!paused&&input.attack(),facing,canFight&&!spear.held&&!!COMBAT_TOOLS[inventory.equipped],(strikeDirection,tool)=>applyHit(strikeDirection,tool,world.nearestHarvestTarget(position,strikeDirection,tool,pointerWorld)),inventory.equipped);
  if(spear.charging)for(const target of world.spearChargeTargets(motionFrom,position,facing))if(spearCharge.registerHit(target.id))applyHit(facing,'spear',target,true);
  player.update(position,facing,motion.distance,travelMotion?dt:paused?0:dt,{equipped:construction.active&&inventory.equipped!=='torch'?null:inventory.equipped,offhand:inventory.offhand,swing,
    spear,
    eating:eating.state(),panting:exertion.panting,breathRemaining:exertion.breathRemaining,visible:!sleeping,
    roofTiles:inventory.equipped==='torch'||inventory.offhand==='torch'?world.roofTilesAt(position):null});
  world.updateOcclusion(playerBody,appActive?dt:0);
  if(!paused&&pickupRequested&&!usedCamp&&!construction.active&&!wasPlacing) {
    const pickup=world.collect(position,inventory);
    const item=ITEMS[pickup.type],obtained=`+${pickup.collected} ${pickup.collected===1?item?.label??t("פריט"):item?.plural??t("פריטים")}`;
    if(pickup.recovery) {
      if(pickup.collected)bag.notify(pickup.full?t("חלק מהציוד נאסף · פנו מקום לאיסוף השאר"):t("הציוד שלך נאסף בחזרה"),worldSeconds);
      else if(pickup.full)bag.notify(t("אין מקום לציוד שנפל · פנו מקום ונסו שוב"),worldSeconds);
      atlas.update(position);
    } else if(pickup.collected)bag.notify(pickup.full?t("{0} · אין מקום לשאר", [obtained]):obtained,worldSeconds);
    else if(pickup.full)bag.notify(t("התיק והידיים מלאים — פנו מקום לפריט חדש"),worldSeconds);
  }
  world.updatePickupEffects(paused?0:dt,vitals.dead?null:player.pickupAnchor);
  const target=construction.active?null:world.nearestHarvestTarget(position,swing?.direction??facing,inventory.equipped,pointerWorld);
  const canSleep=gameClock.canSleep;
  const interactive=world.nearestInteractable(position);
  const nearbyLoot=world.nearestDrop(position);
  const nearbyTent=world.nearestTent(position),door=nearbyTent?tentDoor(nearbyTent):null;
  const nearbyPortal=world.nearbyPortal(position);
  const campHint=travelMotion?{label:t("עוברים בפתח...")}:sleeping?{sleeping:true,label:t("ישנים · הלילה חולף...")}:construction.active?
    {label:construction.status().valid?t("לחיצה להצבה · R לסיבוב · {0}° · Esc לביטול", [construction.rotation*90]):t("בחרו שטח פנוי · R לסיבוב · אדום: אי אפשר להציב")}:
    !paused&&!nearbyLoot&&interactive?{kind:interactive.type,available:true,label:interactive.type==='chest'?t("E · פתיחת תיבה"):interactive.type==='furnace'?t("E · פתיחת תנור"):interactive.type==='wood-door'?(interactive.open?t("E · סגירת דלת"):t("E · פתיחת דלת")):t("E · שולחן יצירה"),x:interactive.x,y:interactive.y+.6}:!paused&&!nearbyLoot&&nearbyTent?
    {kind:'camp',available:canSleep,label:canSleep?t("E · לישון עד הבוקר"):t("אוהל · אפשר לישון כאן בערב ובלילה"),x:door.x,y:door.y+.3}:!paused&&nearbyPortal?{label:world.underground?t("לכו אל הפתח כדי לצאת"):t("לכו אל הפתח כדי להיכנס · מומלץ לפיד")}:null;
  feedback.update(worldSeconds,dt,sleeping?null:target,inventory.equipped,paused||campHint?null:world.nearestDrop(position),campHint,spear);
  camp.update(sleeping,gameClock.sleepElapsed);
  bag.update(worldSeconds);chestUI.update();furnaceUI.update();
  lighting.update(worldSeconds,[...(player.lightSource?[player.lightSource]:[]),...world.lightSources(position)],world.underground);
  renderer.setClearColor(world.underground?0x070b10:0x8c9f6b);

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
    const status = sleeping?t("נחים"):exertion.panting?t("מתנשפים"):exertion.running ? t("ספרינט") : exertion.exhausted
      ? (exertion.energy >= SPRINT.restartThreshold && held ? t("שחררו Shift") : t("מתאוששים")) : exertion.recovering ? t("נטען") : t("מוכנים");
    if (staminaStatus.textContent !== status) staminaStatus.textContent = status;
    staminaPanel.dataset.state = exertion.panting?'panting':exertion.running ? 'running' : exertion.exhausted ? 'exhausted' : exertion.energy < 2 ? 'low' : 'ready';
    uiTimer = 0;
  }
  renderer.render(scene, camera);
  aimPoint.set(position.x,position.y+1,0).project(camera);
  caveIris.paint(caveTravel.closed,{x:(aimPoint.x+1)/2,y:(1-aimPoint.y)/2});
  camera.position.x = smoothX;
  camera.position.y = smoothY;
  updateSave(time/1000);
}

window.addEventListener('keydown',event=>{
  if(event.code!=='Escape'||event.repeat||event.metaKey||event.ctrlKey||event.altKey||event.defaultPrevented)return;
  if(pauseDialog.open){event.preventDefault();resumeGame();return;}
  if(construction.active){event.preventDefault();construction.cancel();resetActions();return;}
  if(document.querySelector('dialog[open]')||!appActive)return;
  event.preventDefault();openPause();
},true);
window.addEventListener('blur',()=>{appActive=false;previousTime=undefined;gameClock.suspend();construction.cancel();resetActions();saveNow();});
window.addEventListener('focus',()=>{if(!saveStore.checkOwner()){window.location.reload();return;}appActive=true;previousTime=undefined;});
document.addEventListener('visibilitychange',()=>{appActive=!document.hidden&&document.hasFocus();previousTime=undefined;if(!appActive){gameClock.suspend();construction.cancel();saveNow();}resetActions();});
renderer.setAnimationLoop(frame);

window.addEventListener('keydown',event=>{
  if(event.code!=='KeyR'||event.repeat||event.metaKey||event.ctrlKey||event.altKey||!appActive||caveTravel.active||gameClock.sleeping||survival.state().dead||pauseDialog.open||event.target?.closest?.('dialog[open]')&&!bag.isOpen)return;
  event.preventDefault();if(construction.active)construction.rotate();else {resetActions();inventory.swapOffhand();bag.render();}
});
