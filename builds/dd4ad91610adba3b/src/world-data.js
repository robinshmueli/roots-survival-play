import { WORLD, PLAYER, START_CLEARING } from './config.js';
import { biomeBlendAt, pickBiome, cellSeed, waterAt } from './biomes.js';
import { randomGenerator } from './art.js';
import { lakeSample } from './lake-data.js';

// Deterministic world cells keep the same trees and collisions after unloading an area.
export function chunkObjects(cx, cy) {
  const objects = [], cellSize = 4;
  const cells = WORLD.chunkSize / cellSize;
  for (let gy = 0; gy < cells; gy++) {
    for (let gx = 0; gx < cells; gx++) {
      const ix = cx * cells + gx, iy = cy * cells + gy;
      const random = randomGenerator(cellSeed(ix, iy));
      const x = ix * cellSize + 2 + (random() - .5) * 1.8;
      const y = iy * cellSize + 2 + (random() - .5) * 1.8;
      if (Math.abs(x) > WORLD.size / 2 - 2 || Math.abs(y) > WORLD.size / 2 - 2) continue;
      if (waterAt(x, y) || waterAt(x + 2, y) || waterAt(x - 2, y)) continue;
      const lake=lakeSample(x,y);
      if(lake&&lake.distance<lake.lake.shore+1.1)continue;
      if (Math.hypot(x-PLAYER.startX, y-PLAYER.startY) < START_CLEARING.radius) continue;
      const parts = biomeBlendAt(x, y);
      const biome = pickBiome(parts, cellSeed(ix, iy, 6217) / 4294967296), choice = random();
      const size = [.8, .9, 1, 1.1][Math.floor(random() * 4)] * (biome.id === 'jungle' ? 1.12 : 1);
      if (choice < biome.density) {
        const kind = biome.trees[Math.floor(random() * biome.trees.length)];
        const snowCover = kind.startsWith('snow') ? cellSeed(ix, iy, 8153) % 7 : undefined;
        // A small oval around the trunk leaves room to walk beside the roots and canopy.
        objects.push({ type: 'tree', biome: biome.id, kind, snowCover, variant: Math.floor(random() * WORLD.treeVariants), x, y, size, rx: .22 * size, ry: .16 * size });
      } else if (biome.id === 'desert' && choice < .22) {
        objects.push({ type: 'cactus', biome: biome.id, variant: Math.floor(random() * 5), x, y, size, rx: .3 * size, ry: .3 * size });
      } else if (choice < biome.density + (biome.id === 'desert' ? .30 : .11)) {
        const variant = Math.floor(random() * 5);
        objects.push({ type: 'rock', biome: biome.id, variant, x, y, size, rx: size * 1.05, ry: size * (variant === 3 ? .24 : .4) });
      }
    }
  }
  return objects.map(object=>({...object,id:`${object.type}:${object.x.toFixed(6)}:${object.y.toFixed(6)}`,
    woodYield:2+cellSeed(Math.floor(object.x/4),Math.floor(object.y/4),1943)%2,
    ...(object.type==='rock'?{mineral:cellSeed(Math.floor(object.x/4),Math.floor(object.y/4),66211)%12===0?'coal':'stone'}:{})}));
}
