// Accept only the quantity that fits; the rest remains in the source container.
export function transferItems(from,to,type,quantity=from.count(type)) {
  if(from===to||!Number.isSafeInteger(quantity)||quantity<=0||from.count(type)<quantity)return 0;
  const accepted=to.add(type,quantity);
  if(accepted)from.remove(type,accepted);
  return accepted;
}
