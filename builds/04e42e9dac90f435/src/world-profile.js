// Profiles are selected before the game module graph is imported.
export const WORLD_SIZES=Object.freeze([
  {id:'tiny',label:'קטן מאוד',size:560,description:'מסע קצר · רבע מהשטח הנוכחי'},
  {id:'small',label:'קטן',size:1120,description:'הגודל הנוכחי של המשחק'},
  {id:'medium',label:'בינוני',size:1680,description:'פי 2.25 שטח לחקור'},
  {id:'giant',label:'ענק',size:2240,description:'פי 4 שטח לחקור'},
]);
export const DIFFICULTIES=Object.freeze([
  {id:'easy',label:'קל',description:'רעב איטי, יותר משאבים וחיות מתונות',hungerMultiplier:.75,logBonus:1,apples:[2,2],fiber:[2,2],animalDamageMultiplier:1,animalAttackSpeed:1},
  {id:'normal',label:'בינוני',description:'איזון רגיל · חיות חזקות ומהירות יותר',hungerMultiplier:1,logBonus:0,apples:[1,2],fiber:[1,2],animalDamageMultiplier:1.2,animalAttackSpeed:1.2},
  {id:'hard',label:'קשה',description:'רעב מהיר, פחות משאבים וחיות מסוכנות',hungerMultiplier:1.5,logBonus:-1,apples:[0,1],fiber:[1,1],animalDamageMultiplier:1.6,animalAttackSpeed:1.5},
]);
export const difficultyFor=id=>DIFFICULTIES.find(difficulty=>difficulty.id===id)??DIFFICULTIES[1];
export const START_CLEARING_RADIUS=14;
export const LEGACY_WORLD=Object.freeze({id:'legacy',name:'העולם שלי',size:1120,sizeId:'small',difficulty:'normal',seed:2701,generation:1,createdAt:0,lastPlayed:0});
export let activeWorld=LEGACY_WORLD;
export function validWorld(world) {
  return !!world&&typeof world.name==='string'&&world.name.trim().length>0&&world.name.length<=40&&
    (world.clearingRadius===undefined||world.generation===2&&world.spawn!==undefined&&world.clearingRadius===START_CLEARING_RADIUS)&&
    (world.spawn===undefined||world.generation===2&&world.spawn!==null&&Number.isSafeInteger(world.spawn.x)&&Number.isSafeInteger(world.spawn.y)&&Math.abs(world.spawn.x)<=world.size/2-12&&Math.abs(world.spawn.y)<=world.size/2-12)&&
    (world.difficulty===undefined||DIFFICULTIES.some(difficulty=>difficulty.id===world.difficulty))&&
    WORLD_SIZES.some(size=>size.id===world.sizeId&&size.size===world.size)&&Number.isSafeInteger(world.seed)&&world.seed>0&&world.seed<=0xffffffff&&
    (world.id==='legacy'&&world.generation===1&&world.seed===2701&&world.size===1120||/^[a-z0-9-]{8,80}$/.test(world.id)&&world.generation===2)&&
    Number.isFinite(world.createdAt)&&world.createdAt>=0&&world.createdAt<=1e15&&Number.isFinite(world.lastPlayed)&&world.lastPlayed>=0&&world.lastPlayed<=1e15;
}
export function selectWorld(world) {if(!validWorld(world))throw Error('Invalid world');activeWorld={...world,difficulty:world.difficulty??'normal'};}
export function worldSaveKey(world=activeWorld) {return world.id==='legacy'?'roots-survival.save.v1':`roots-survival.world.${world.id}.save.v1`;}
