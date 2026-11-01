// Generation 1 remains untouched so existing saves keep their trees and lakes.
const LEGACY_LAKES = [
  {x:28,y:19,rx:9,ry:6.2,angle:.3,seed:31},
  {x:-32,y:-20,rx:7.5,ry:5.5,angle:-.5,seed:72},
  {x:-94,y:53,rx:12,ry:7.6,angle:.7,seed:53},
  {x:-180,y:-48,rx:8.5,ry:12,angle:.2,seed:94},
  {x:-315,y:-195,rx:12,ry:9,angle:-.3,seed:65},
  {x:-252,y:-302,rx:15,ry:9.5,angle:.8,seed:86},
  {x:-420,y:-330,rx:9,ry:7,angle:.5,seed:127},
  {x:31,y:-244,rx:8.4,ry:6.2,angle:.2,seed:98},
  {x:-105,y:-345,rx:7,ry:10,angle:-.6,seed:159},
  {x:102,y:-390,rx:11,ry:7.5,angle:.6,seed:170},
  {x:-270,y:225,rx:13,ry:8,angle:-.4,seed:111},
  {x:-397,y:365,rx:9,ry:11,angle:.6,seed:142},
  {x:-120,y:295,rx:9,ry:6,angle:-.8,seed:183},
  {x:17,y:215,rx:11,ry:7.2,angle:.4,seed:164},
  {x:98,y:340,rx:8,ry:12,angle:-.2,seed:215},
  {x:-162,y:443,rx:12,ry:8,angle:.3,seed:196},
  {x:-320,y:480,rx:10,ry:7,angle:-.5,seed:227},
  {x:-475,y:100,rx:13,ry:8,angle:.5,seed:208},
  {x:-460,y:-45,rx:8,ry:6,angle:.7,seed:249},
  {x:55,y:70,rx:7,ry:5,angle:-.3,seed:230},
].map((lake,id)=>({...lake,id:`lake-${id}`,phase:lake.seed*.73,shore:.65+(id%4)*.1,
  shape:[.17+(id%3)*.035,.09+(id%4)*.02,.035+(id%3)*.015],fishCount:2+lake.seed%3}));

const LEGACY_REGIONS=[{id:'forest',x:-95,y:-5},{id:'jungle',x:-285,y:-240},{id:'desert',x:40,y:-255},{id:'autumn',x:-275,y:265},{id:'cherry',x:15,y:240},{id:'snow',x:-125,y:470}];
const LEGACY_COAST={base:185,amplitude:18,frequency:.016,detailAmplitude:7,detailFrequency:.047,detailPhase:.5,side:1};
function generator(seed) {return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296;};}
export function chooseWorldSpawn(profile) {
  const {regions}=createWorldLayout(profile),random=generator(profile.seed^0x53a9b4d1);
  const region=regions[Math.floor(random()*regions.length)];
  return {x:Math.round(region.x),y:Math.round(region.y)};
}
export function createWorldLayout(profile) {
  if(profile.generation===1)return {regions:LEGACY_REGIONS,coast:LEGACY_COAST,lakes:LEGACY_LAKES};
  const random=generator(profile.seed),size=profile.size,half=size/2,scale=size/1120;
  const side=random()<.5?-1:1;
  const coast={base:side*size*(.24+random()*.06),amplitude:18*scale,frequency:.016/scale,detailAmplitude:7*scale,detailFrequency:.047/scale,detailPhase:random()*Math.PI*2,side};
  const landCenter=-side*size*.095;
  const ids=['forest','jungle','autumn','cherry'];
  for(let i=ids.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}
  const regions=ids.map((id,i)=>({id,x:landCenter+(i%2?1:-1)*size*(.12+random()*.025),y:(i<2?-1:1)*size*(.13+random()*.035)}));
  regions.push({id:'snow',x:landCenter+(random()-.5)*size*.18,y:size*(.4+random()*.025)});
  regions.push({id:'desert',x:landCenter+(random()-.5)*size*.18,y:-size*(.39+random()*.035)});
  const lakes=[],target=Math.round(20*scale*scale);
  for(let attempt=0;lakes.length<target&&attempt<target*100;attempt++) {
    const x=(random()*2-1)*(half-22),y=(random()*2-1)*(half-22),rx=6+random()*9,ry=5+random()*7;
    const boundary=coast.base+Math.sin(y*coast.frequency)*coast.amplitude+Math.sin(y*coast.detailFrequency+coast.detailPhase)*coast.detailAmplitude;
    const nearSpawn=profile.spawn?Math.hypot(x-profile.spawn.x,y-profile.spawn.y)<Math.max(rx,ry)*1.6+Math.max(12,(profile.clearingRadius??0)+6):Math.hypot(x,y)<Math.max(rx,ry)+24;
    if(side*(x-boundary)>-rx-50||nearSpawn||regions.some(r=>Math.hypot(x-r.x,y-r.y)<Math.max(rx,ry)+8)||lakes.some(l=>Math.hypot(x-l.x,y-l.y)<Math.max(rx,ry)+Math.max(l.rx,l.ry)+10))continue;
    const seed=Math.floor(random()*1000000),id=lakes.length;
    lakes.push({id:`lake-${id}`,x,y,rx,ry,angle:random()*Math.PI,seed,phase:seed*.73,shore:.65+random()*.3,shape:[.17+random()*.07,.09+random()*.06,.035+random()*.03],fishCount:2+seed%3});
  }
  return {regions,coast,lakes};
}
