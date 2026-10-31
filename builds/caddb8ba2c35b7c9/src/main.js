import * as THREE from '../vendor/three.module.js';
import { WORLD, PLAYER, VIEW, SPRINT, INVENTORY } from './config.js';
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
import { createFeedback } from './feedback.js';
import { ITEMS } from './items.js';
import { createSurvival } from './survival.js';
import { createSurvivalUI } from './survival-ui.js';
import { createFullscreen } from './fullscreen.js';
import { createCompass } from './compass.js';

const container = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setClearColor(0x8c9f6b);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.setAttribute('aria-label', 'WASD לתנועה, עכבר לכיוון הדמות, Shift לספרינט, לחיצה או רווח לשימוש בפריט ולאכילת תפוח, E לאיסוף, 1–3 לבחירת פריט ו־C לתיק.');
container.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-20, 20, 15, -15, 0.1, 200);
camera.position.set(0, 0, 100);
const lighting = createLighting(scene);
const world = createWorld(scene, lighting);
const player = createPlayer(scene, lighting);
const input = createInput(renderer.domElement);
const movement = createMovement(world);
const stamina = createStamina();
const inventory = createInventory();
const survival = createSurvival();
const survivalUI = createSurvivalUI();
survivalUI.update(survival.state());
const attack = createAttack();
const feedback = createFeedback(scene,lighting);
function resetActions(){input.reset();movement.stop();attack.cancel();}
const deathDialog=document.getElementById('death-screen');
deathDialog.addEventListener('cancel',event=>event.preventDefault());
document.getElementById('restart-game').addEventListener('click',()=>window.location.reload());
let bag;
const atlas = createAtlas(resetActions,()=>bag?.isOpen||deathDialog.open,()=>world.mapState());
bag = createInventoryUI(inventory,resetActions,()=>atlas.isOpen||deathDialog.open);
const position = new THREE.Vector2(PLAYER.startX, PLAYER.startY);
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
let facing={x:0,y:-1};
const aimPoint=new THREE.Vector3();

function resize() {
  const width = container.clientWidth;
  const height = container.clientHeight;
  // Native-resolution sprites are enlarged with nearest-neighbor CSS.
  const scale = Math.max(2, Math.min(4, Math.round(height / 420))) * VIEW.zoom;
  const renderWidth = Math.max(1, Math.floor(width / scale));
  const renderHeight = Math.max(1, Math.floor(height / scale));
  camera.left = -renderWidth / VIEW.pixelsPerUnit / 2;
  camera.right = renderWidth / VIEW.pixelsPerUnit / 2;
  camera.top = renderHeight / VIEW.pixelsPerUnit / 2;
  camera.bottom = -renderHeight / VIEW.pixelsPerUnit / 2;
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
  const worldSeconds = (time - cycleStartedAt) / 1000;
  const menuOpen=atlas.isOpen||bag.isOpen||deathDialog.open;
  let vitals=survival.update(!menuOpen&&appActive?realDt:0);
  if(vitals.damage)feedback.hurt(worldSeconds);
  if(vitals.dead&&!deathDialog.open){resetActions();deathDialog.showModal();}
  const paused=menuOpen||vitals.dead||!appActive;
  const direction = paused ? { x: 0, y: 0 } : input.direction();
  const held = !paused && input.sprint();
  const sprintPlan = stamina.plan(dt, held && Math.hypot(direction.x, direction.y) > 0);
  const motion = movement.step(position, direction, dt, sprintPlan.multiplier);
  compass.update(!paused&&motion.distance>.00001?motion.direction:null,dt);
  const exertion = stamina.update(paused?0:realDt, held, motion.distance > .00001 ? sprintPlan.seconds : 0);
  const {landedTrees,regrownTrees}=world.update(worldSeconds, position, camera, { direction: motion.direction, sprinting: exertion.running });
  if(regrownTrees.length)bag.notify('בוקר חדש — העצים שנכרתו צמחו מחדש',worldSeconds);
  if(!paused)for(const {tree,at} of landedTrees) {
    if(worldSeconds-at<.25&&Math.abs(tree.x-camera.position.x)<camera.right+4&&Math.abs(tree.y-camera.position.y)<camera.top+4)feedback.land(worldSeconds);
  }
  if(motion.distance>.00001)facing=motion.direction;
  const aim=input.aim();
  if(aim&&!paused) {
    aimPoint.set(aim.x,aim.y,0).unproject(camera);
    const x=aimPoint.x-position.x,y=aimPoint.y-position.y,length=Math.hypot(x,y);
    if(length>.1)facing={x:x/length,y:y/length};
  }
  const useRequested=input.takeUse();
  if(!paused&&useRequested&&inventory.equipped==='apple') {
    const meal=survival.eatApple(inventory);
    if(meal.eaten)bag.notify('אכלת תפוח',worldSeconds);
    else if(meal.reason==='full')bag.notify('מד הרעב מלא — שומרים את התפוח להמשך',worldSeconds);
    vitals=survival.state();
  }
  survivalUI.update(vitals);
  const swing=attack.update(worldSeconds,!paused&&input.attack(),facing,!paused&&inventory.equipped==='stone',strikeDirection=>{
    const target=world.nearestTree(position,strikeDirection);
    const hit=target?world.hitTree(target,worldSeconds,strikeDirection):null;
    feedback.impact(worldSeconds,position,strikeDirection,hit);
    if(hit?.felled)bag.notify('העץ נופל! אוספים את הפריטים עם E',worldSeconds);
  });
  player.update(position,facing,motion.distance,paused?0:dt,{equipped:inventory.equipped,swing,
    panting:exertion.panting,breathRemaining:exertion.breathRemaining});
  const pickupRequested=input.takePickup();
  if(!paused&&pickupRequested) {
    const pickup=world.collect(position,inventory);
    if(pickup.collected)bag.notify(`נאסף ${ITEMS[pickup.type]?.label??'פריט'} לתיק`,worldSeconds);
    if(pickup.full)bag.notify(inventory.count(pickup.type)>=INVENTORY.stackLimit?`כבר יש לך ${INVENTORY.stackLimit} ${ITEMS[pickup.type]?.plural??'פריטים מהסוג הזה'}`:'התיק והידיים מלאים — פנו מקום לפריט חדש',worldSeconds);
  }
  const target=world.nearestTree(position,swing?.direction??facing);
  feedback.update(worldSeconds,dt,target,inventory.equipped,paused?null:world.nearestDrop(position));
  bag.update(worldSeconds);
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
    staminaTime.textContent = `${exertion.energy.toFixed(1)} / ${exertion.maximum.toFixed(0)}s`;
    const status = exertion.panting?'מתנשפים':exertion.running ? 'ספרינט' : exertion.exhausted
      ? (exertion.energy >= SPRINT.restartThreshold && held ? 'שחררו Shift' : 'מתאוששים') : exertion.recovering ? 'נטען' : 'מוכנים';
    if (staminaStatus.textContent !== status) staminaStatus.textContent = status;
    staminaPanel.dataset.state = exertion.panting?'panting':exertion.running ? 'running' : exertion.exhausted ? 'exhausted' : exertion.energy < 2 ? 'low' : 'ready';
    uiTimer = 0;
  }
  renderer.render(scene, camera);
  camera.position.x = smoothX;
  camera.position.y = smoothY;
}

window.addEventListener('blur',()=>{appActive=false;previousTime=undefined;resetActions();});
window.addEventListener('focus',()=>{appActive=true;previousTime=undefined;});
document.addEventListener('visibilitychange',()=>{appActive=!document.hidden&&document.hasFocus();previousTime=undefined;resetActions();});
renderer.setAnimationLoop(frame);
