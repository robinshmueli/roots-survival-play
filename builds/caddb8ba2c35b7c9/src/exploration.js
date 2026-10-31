import {WORLD,EXPLORATION} from './config.js';

// Discovery belongs to the player's route, independently of atlas zoom or scenery streaming.
export function createExploration({size=WORLD.size,...settings}={}) {
  const options={...EXPLORATION,...settings},cell=options.cellSize,half=size/2,columns=Math.ceil(size/cell);
  const visited=new Uint8Array(columns*columns);
  let last=null,revision=0,count=0;
  return {
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
        visited[index]=1;count++;changed=true;
      }
      if(!changed)return null;
      revision++;return {from,to};
    },
  };
}
