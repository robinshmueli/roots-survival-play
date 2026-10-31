import {WORLD,EXPLORATION} from './config.js';

export function decodeDiscovery(bits,cells) {
  if(bits&&typeof bits==='object') {
    if(bits.encoding!=='runs'||Object.hasOwn(bits,'bits')||!Array.isArray(bits.runs)||bits.runs.length%2||bits.runs.length>cells*2)return null;
    const visited=new Uint8Array(cells);let end=0;
    for(let i=0;i<bits.runs.length;i+=2) {
      const start=bits.runs[i],length=bits.runs[i+1];
      if(!Number.isSafeInteger(start)||!Number.isSafeInteger(length)||start<end||length<1||start+length>cells)return null;
      visited.fill(1,start,start+length);end=start+length;
    }
    return visited;
  }
  if(typeof bits!=='string'||bits.length!==Math.ceil(Math.ceil(cells/8)/3)*4||!/^[A-Za-z0-9+/]*={0,2}$/.test(bits))return null;
  try {
    const bytes=atob(bits);if(bytes.length!==Math.ceil(cells/8))return null;
    const visited=new Uint8Array(cells);
    for(let i=0;i<cells;i++)visited[i]=(bytes.charCodeAt(i>>3)>>(i%8))&1;
    return visited;
  }catch{return null;}
}
// Discovery belongs to the player's route, independently of atlas zoom or scenery streaming.
export function createExploration({size=WORLD.size,...settings}={},initial=null) {
  const options={...EXPLORATION,...settings},cell=options.cellSize,half=size/2,columns=Math.ceil(size/cell);
  const restored=initial?.size===size&&initial?.cell===cell?decodeDiscovery(initial.encoding?initial:initial.bits,columns*columns):null;
  const visited=restored??new Uint8Array(columns*columns);
  let last=null,revision=restored?1:0,count=visited.reduce((sum,value)=>sum+value,0),cached=null,cachedRevision=-1;
  const rows=new Map(),dirty=new Set();
  function refreshRow(y) {
    const runs=[];
    for(let x=0;x<columns;) {
      if(!visited[y*columns+x]){x++;continue;}
      const start=x;while(x<columns&&visited[y*columns+x])x++;
      runs.push(start,x-start);
    }
    if(runs.length)rows.set(y,runs);else rows.delete(y);
  }
  if(restored)for(let y=0;y<columns;y++)refreshRow(y);
  function refresh(){for(const y of dirty)refreshRow(y);dirty.clear();}
  return {
    serialize(){
      if(cachedRevision!==revision){
        refresh();const runs=[];
        for(const y of [...rows.keys()].sort((a,b)=>a-b)) {
          const row=rows.get(y);for(let i=0;i<row.length;i+=2)runs.push(y*columns+row[i],row[i+1]);
        }
        cached={size,cell,encoding:'runs',runs};cachedRevision=revision;
      }
      return cached;
    },
    forEachKnownRun(callback) {
      refresh();
      for(const [y,runs] of rows)for(let i=0;i<runs.length;i+=2)callback(runs[i],y,runs[i+1],columns,cell);
    },
    get revision(){return revision;},
    get discoveredCells(){return count;},
    known(x,y) {
      if(!Number.isFinite(x)||!Number.isFinite(y)||x< -half||y< -half||x>=half||y>=half)return false;
      return visited[Math.floor((y+half)/cell)*columns+Math.floor((x+half)/cell)]===1;
    },
    visit(position) {
      if(!position||!Number.isFinite(position.x)||!Number.isFinite(position.y)||Math.abs(position.x)>half||Math.abs(position.y)>half)return null;
      const to={x:position.x,y:position.y};
      const gap=last?Math.hypot(to.x-last.x,to.y-last.y):Infinity;
      if(gap<options.sampleStep)return null;
      const from=last&&gap<=options.maxStep?last:to;
      last=to;
      const minX=Math.max(0,Math.floor((Math.min(from.x,to.x)-options.radius+half)/cell));
      const maxX=Math.min(columns-1,Math.floor((Math.max(from.x,to.x)+options.radius+half)/cell));
      const minY=Math.max(0,Math.floor((Math.min(from.y,to.y)-options.radius+half)/cell));
      const maxY=Math.min(columns-1,Math.floor((Math.max(from.y,to.y)+options.radius+half)/cell));
      const dx=to.x-from.x,dy=to.y-from.y,length2=dx*dx+dy*dy,radius2=options.radius**2;
      let changed=false;
      for(let cy=minY;cy<=maxY;cy++)for(let cx=minX;cx<=maxX;cx++) {
        const index=cy*columns+cx;if(visited[index])continue;
        const x=(cx+.5)*cell-half,y=(cy+.5)*cell-half;
        const t=length2?Math.max(0,Math.min(1,((x-from.x)*dx+(y-from.y)*dy)/length2)):0;
        if((x-from.x-t*dx)**2+(y-from.y-t*dy)**2>radius2)continue;
        visited[index]=1;dirty.add(cy);count++;changed=true;
      }
      if(!changed)return null;
      revision++;return {from,to};
    },
  };
}
