export const COOKING={
  'raw-steak':{output:'steak',seconds:5},
  'raw-drumstick':{output:'drumstick',seconds:5},
  'raw-bacon':{output:'bacon',seconds:5},
  'iron-ore':{output:'iron',seconds:5},
  'copper-ore':{output:'copper',seconds:5},
};
export const FURNACE_FUELS={log:20,coal:40};
export const FURNACE_FUEL_SECONDS=FURNACE_FUELS.log;
export function validFurnace(data) {
  const stack=(value,types)=>value===null||value&&types.includes(value.type)&&Number.isInteger(value.count)&&value.count>0&&value.count<=20;
  const coal=data?.coal??0,burnType=data?.burnType??(data?.burn>0?'log':null);
  return !!data&&Number.isInteger(data.fuel)&&data.fuel>=0&&data.fuel<=20&&Number.isInteger(coal)&&coal>=0&&coal<=20&&
    (burnType===null||Object.hasOwn(FURNACE_FUELS,burnType))&&Number.isFinite(data.burn)&&data.burn>=0&&data.burn<=(FURNACE_FUELS[burnType]??0)&&Number.isFinite(data.progress)&&data.progress>=0&&data.progress<5&&
    stack(data.input,Object.keys(COOKING))&&stack(data.output,Object.values(COOKING).map(recipe=>recipe.output))&&(!data.progress||!!data.input);
}
export function createFurnace(initial=null) {
  let fuel=initial?.fuel??0,coal=initial?.coal??0,burn=initial?.burn??0,burnType=initial?.burnType??(burn>0?'log':null),progress=initial?.progress??0;
  let input=initial?.input?{...initial.input}:null,output=initial?.output?{...initial.output}:null,revision=0;
  const snapshot=()=>({fuel,coal,burn,burnType,progress,input:input?{...input}:null,output:output?{...output}:null});
  return {
    get revision(){return revision;},serialize:snapshot,
    state(){return {...snapshot(),burning:burn>0,recipe:input?COOKING[input.type]:null};},
    stacks(){return [...(fuel?[{type:'log',count:fuel}]:[]),...(coal?[{type:'coal',count:coal}]:[]),...(input?[{...input}]:[]),...(output?[{...output}]:[])];},
    deposit(inventory,type,quantity=20) {
      if(!Number.isInteger(quantity)||quantity<=0)return 0;
      const room=type==='log'?20-fuel:type==='coal'?20-coal:COOKING[type]&&(!input||input.type===type)?20-(input?.count??0):0;
      const count=Math.min(room,inventory.count(type),quantity);if(!count||inventory.remove(type,count)!==count)return 0;
      if(type==='log')fuel+=count;else if(type==='coal')coal+=count;else input={type,count:(input?.count??0)+count};revision++;return count;
    },
    take(slot,inventory,quantity=20) {
      const stack=slot==='fuel'?{type:'log',count:fuel}:slot==='coal'?{type:'coal',count:coal}:slot==='input'?input:slot==='output'?output:null;
      if(!stack||!Number.isInteger(quantity)||quantity<=0)return 0;
      const count=inventory.add(stack.type,Math.min(stack.count,quantity));if(!count)return 0;
      if(slot==='fuel')fuel-=count;
      else if(slot==='coal')coal-=count;
      else if(slot==='input'){input.count-=count;if(!input.count){input=null;progress=0;}}
      else {output.count-=count;if(!output.count)output=null;}
      revision++;return count;
    },
    update(dt) {
      let remaining=Number.isFinite(dt)?Math.max(0,dt):0,cooked=0;
      while(remaining>1e-9) {
        const recipe=COOKING[input?.type],ready=recipe&&(!output||output.type===recipe.output&&output.count<20);
        if(burn<=1e-9){
          burn=0;burnType=null;if(!ready||!fuel&&!coal)break;
          burnType=coal?'coal':'log';if(coal)coal--;else fuel--;burn=FURNACE_FUELS[burnType];revision++;
        }
        const step=Math.min(remaining,burn,ready?recipe.seconds-progress:remaining);
        burn=Math.max(0,burn-step);if(burn<=1e-9){burn=0;burnType=null;}remaining-=step;
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
