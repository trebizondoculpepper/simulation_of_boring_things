import { worldStore } from '../../../save/world-store';
import type { PoolId } from '../../../../game/plant/pools';
import { plantAt } from '../../logic/control-room-demo';
import type { PlantReading } from '../../logic/control-room-demo';
import { plantReadingOf } from '../../logic/world-reading';

/**
 * The plant as the machines and the control room show it: the world's
 * (`world-reading.ts`), for `pool`'s plant; or, with no world (a test,
 * a server-side render), the scripted loop's at `seconds`.
 */
export function currentPlant(
  pool: PoolId = 'pool_02',
  seconds = typeof performance === 'undefined' ? 0 : performance.now() / 1000,
): PlantReading {
  if (typeof window === 'undefined') return plantAt(seconds);
  return plantReadingOf(worldStore('dev').world.value, pool);
}
