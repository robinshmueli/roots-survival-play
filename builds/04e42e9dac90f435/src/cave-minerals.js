import {randomGenerator} from './art.js';

// Use a separate random stream so existing cave shapes, rock IDs and copper,
// coal and iron deposits stay in place when a few ordinary rocks gain iron.
export function addExtraIron(rocks,seed) {
  const random=randomGenerator(seed^0x34ab719),limit=Math.max(1,Math.ceil(rocks.length/9));
  let iron=rocks.filter(rock=>rock.mineral==='iron').length;
  for(const rock of rocks) {
    const roll=random();
    if(rock.mineral==='stone'&&roll<.1&&iron<limit){rock.mineral='iron';iron++;}
  }
}

export function addEchoStones(rocks,seed) {
  const random=randomGenerator(seed^0x718c2b9);
  const candidates=rocks.filter(rock=>rock.mineral==='stone').map(rock=>({rock,rank:random()})).sort((a,b)=>a.rank-b.rank);
  const previous=Math.min(candidates.length,Math.max(1,Math.round(rocks.length*.14))),count=Math.min(candidates.length,Math.round(rocks.length*.09));
  // Keep the previous sites identifiable so consumed crystals remain gone in
  // old saves, even if their position now generates an ordinary rock.
  for(const {rock} of candidates.slice(0,previous))rock.echoSite=true;
  for(const {rock} of candidates.slice(0,count))rock.mineral='echo';
}
