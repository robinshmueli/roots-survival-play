import {TREE_SEEDS,seedType} from './tree-seeds.js';

export const SEED_BUNDLE='seed-bundle';
export const seedKind=type=>typeof type==='string'&&type.startsWith('seed-')&&Object.hasOwn(TREE_SEEDS,type.slice(5))?type.slice(5):null;
export const isSeedStack=stack=>!!stack&&(stack.type===SEED_BUNDLE||!!seedKind(stack.type));
export const cloneStack=stack=>stack?{type:stack.type,count:stack.count,...(stack.type===SEED_BUNDLE?{seeds:stack.seeds.map(seed=>({...seed}))}:{})}:null;
export function validSeedBundle(stack,limit) {
  return stack?.type===SEED_BUNDLE&&Array.isArray(stack.seeds)&&stack.seeds.length>0&&stack.seeds.length<=Object.keys(TREE_SEEDS).length&&
    new Set(stack.seeds.map(seed=>seed?.kind)).size===stack.seeds.length&&stack.seeds.every(seed=>Object.hasOwn(TREE_SEEDS,seed?.kind)&&Number.isSafeInteger(seed.count)&&seed.count>0&&seed.count<=limit)&&
    stack.seeds.reduce((sum,seed)=>sum+seed.count,0)===stack.count;
}
export function stackContents(stack) {
  if(!stack)return [];
  return stack.type===SEED_BUNDLE?stack.seeds.map(seed=>({type:seedType(seed.kind),count:seed.count})):[{type:stack.type,count:stack.count}];
}
export const seedCount=(stack,kind)=>stack?.type===SEED_BUNDLE?(stack.seeds.find(seed=>seed.kind===kind)?.count??0):seedKind(stack?.type)===kind?stack.count:0;
// Move an exact prefix out of a bundle, retaining every seed's tree species.
export function takeSeeds(stack,quantity) {
  const taken=[];let remaining=quantity;
  for(const seed of stack.seeds) {
    const count=Math.min(seed.count,remaining);if(count){taken.push({kind:seed.kind,count});seed.count-=count;remaining-=count;}
  }
  stack.seeds=stack.seeds.filter(seed=>seed.count);stack.count-=quantity-remaining;return taken;
}
export function appendSeeds(stack,seeds) {
  for(const seed of seeds) {const existing=stack.seeds.find(item=>item.kind===seed.kind);if(existing)existing.count+=seed.count;else stack.seeds.push({...seed});stack.count+=seed.count;}
}
