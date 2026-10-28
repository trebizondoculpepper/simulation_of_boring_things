import { RELEASED } from '../logic/use-hold';
import type { UseHold } from '../logic/use-hold';

/**
 * The control scheme's part of a held use (`../logic/use-hold.ts`): while
 * a use is being delivered, the hold it came with. A component that wants
 * to repeat while held (a terminal's cursor keys) calls `currentUseHold`
 * inside its use and watches the hold's `held`; it never reads an input
 * itself. Outside a use, or for a use with no hold (a tap that has
 * already lifted, a script's), it is `RELEASED`.
 */

let delivering: UseHold = RELEASED;

/** Deliver a use inside `act` with `hold` as its hold. */
export function usingHold(hold: UseHold, act: () => void) {
  const was = delivering;
  delivering = hold;
  try {
    act();
  } finally {
    delivering = was;
  }
}

/** The hold of the use being delivered now. */
export const currentUseHold = (): UseHold => delivering;
