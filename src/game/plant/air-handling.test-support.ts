import { advance, applyAction, newWorld } from '../world';
import type { World } from '../world';
import { AIR_UNITS } from './air-handling';

export const olympic = AIR_UNITS.filter((u) => u.hall === 'olympic');
export const allOff = (w: World) =>
  olympic.reduce(
    (x, u) =>
      applyAction(x, {
        type: 'air/unit',
        tag: u.tag,
        action: { act: 'mode', mode: 'off' },
      }),
    w,
  );
// Settled first, its heat pumps cycling.
export const settled = advance(newWorld(), 3600, 1);
