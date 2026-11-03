import {SEED_BUNDLE,stackContents,seedKind} from './seed-stacks.js';
// Accept only the quantity that fits; the rest remains in the source container.
export function transferItems(from,to,type,quantity=from.count(type),source=null) {
  if(from===to||!Number.isSafeInteger(quantity)||quantity<=0||from.count(type)<quantity)return 0;
  if(type===SEED_BUNDLE) {
    const stack=source?from.stack(source):null;
    if(source&&(!stack||stack.type!==SEED_BUNDLE||quantity>stack.count))return 0;
    const items=stack?stackContents(stack):from.contents().filter(item=>seedKind(item.type));
    let remaining=quantity,total=0;
    for(const item of items) {
      const wanted=Math.min(item.count,remaining),accepted=to.add(item.type,wanted);
      if(accepted){from.remove(item.type,accepted,source);total+=accepted;}remaining-=wanted;if(!remaining)break;
    }
    return total;
  }
  if(source){const stack=from.stack(source);if(!stack||stack.type!==type||quantity>stack.count)return 0;}
  const accepted=to.add(type,quantity);
  if(accepted)from.remove(type,accepted,source);
  return accepted;
}
