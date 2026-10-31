export const COOKING={
  'raw-steak':{output:'steak',seconds:5},
  'raw-drumstick':{output:'drumstick',seconds:5},
};
export const FURNACE_FUEL_SECONDS=20;
export function validFurnace(data) {
  const stack=(value,types)=>value===null||value&&types.includes(value.type)&&Number.isInteger(value.count)&&value.count>0&&value.count<=20;
  return !!data&&Number.isInteger(data.fuel)&&data.fuel>=0&&data.fuel<=20&&
    Number.isFinite(data.burn)&&data.burn>=0&&data.burn<=FURNACE_FUEL_SECONDS&&Number.isFinite(data.progress)&&data.progress>=0&&data.progress<5&&
    stack(data.input,Object.keys(COOKING))&&stack(data.output,['steak','drumstick'])&&(!data.progress||!!data.input);
}
export function createFurnace(initial=null) {
  let fuel=initial?.fuel??0,burn=initial?.burn??0,progress=initial?.progress??0;
  let input=initial?.input?{...initial.input}:null,output=initial?.output?{...initial.output}:null,revision=0;
  const snapshot=()=>({fuel,burn,progress,input:input?{...input}:null,output:output?{...output}:null});
  return {
    get revision(){return revision;},serialize:snapshot,
    state(){return {...snapshot(),burning:burn>0,recipe:input?COOKING[input.type]:null};},
    stacks(){return [...(fuel?[{type:'log',count:fuel}]:[]),...(input?[{...input}]:[]),...(output?[{...output}]:[])];},
    deposit(inventory,type,quantity=20) {
      if(!Number.isInteger(quantity)||quantity<=0)return 0;
      const room=type==='log'?20-fuel:COOKING[type]&&(!input||input.type===type)?20-(input?.count??0):0;
      const count=Math.min(room,inventory.count(type),quantity);if(!count||inventory.remove(type,count)!==count)return 0;
      if(type==='log')fuel+=count;else input={type,count:(input?.count??0)+count};revision++;return count;
    },
    take(slot,inventory,quantity=20) {
      const stack=slot==='fuel'?{type:'log',count:fuel}:slot==='input'?input:slot==='output'?output:null;
      if(!stack||!Number.isInteger(quantity)||quantity<=0)return 0;
      const count=inventory.add(stack.type,Math.min(stack.count,quantity));if(!count)return 0;
      if(slot==='fuel')fuel-=count;
      else if(slot==='input'){input.count-=count;if(!input.count){input=null;progress=0;}}
      else {output.count-=count;if(!output.count)output=null;}
      revision++;return count;
    },
    update(dt) {
      let remaining=Number.isFinite(dt)?Math.max(0,dt):0,cooked=0;
      while(remaining>1e-9) {
        const recipe=COOKING[input?.type],ready=recipe&&(!output||output.type===recipe.output&&output.count<20);
        if(burn<=1e-9){burn=0;if(!ready||!fuel)break;fuel--;burn=FURNACE_FUEL_SECONDS;revision++;}
        const step=Math.min(remaining,burn,ready?recipe.seconds-progress:remaining);
        burn=Math.max(0,burn-step);remaining-=step;
        if(ready)progress+=step;revision++;
        if(ready&&progress>=recipe.seconds-1e-9) {
          output={type:recipe.output,count:(output?.count??0)+1};input.count--;if(!input.count)input=null;
          progress=0;cooked++;
        }
      }
      return cooked;
    },
  };
}
