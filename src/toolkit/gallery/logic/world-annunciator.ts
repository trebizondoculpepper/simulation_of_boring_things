import type { World, WorldAction } from '../../../game/world';
import { litWindows } from '../../components/industrial-control/logic/annunciator';
import type { Annunciator } from '../../components/industrial-control/logic/annunciator';
import { ANNUNCIATOR_ALARMS } from './control-room-demo';
import { LOUNGE_ALARMS } from '../../../game/plant/lounge-annunciator';

/**
 * An annunciator whose windows are the world's (`game/annunciator.ts`):
 * one for every board and console showing the plant's alarms
 * (`ANNUNCIATOR_ALARMS`, in order), so ACCEPT or RESET at any of them is
 * done for all and kept across rooms and reloads (the owner, 2026-10-27).
 * The world senses the alarms itself, so `sense` does nothing; LAMP TEST
 * (`test`) is the board's own. Pure.
 */
export function worldAnnunciator(store: {
  readonly world: { readonly value: World };
  dispatch(action: WorldAction): void;
}): Annunciator {
  return {
    get states() {
      const windows = store.world.value.annunciator.windows;
      return ANNUNCIATOR_ALARMS.map((id) => windows[id]);
    },
    test: false,
    sense() {},
    acknowledge(which) {
      store.dispatch(
        which
          ? {
              type: 'alarms/accept',
              alarms: which.map((i) => ANNUNCIATOR_ALARMS[i]),
            }
          : { type: 'alarms/accept' },
      );
    },
    reset() {
      store.dispatch({ type: 'alarms/reset' });
    },
    lit(seconds) {
      return litWindows(this.states, this.test, seconds);
    },
  };
}

/**
 * The bridge's annunciator: the world's main one and the lounge's
 * (`game/plant/lounge-annunciator.ts`) as one (the owner, 2026-10-28:
 * anything that sounds on any annunciator is a warning on the bridge):
 * its windows the main one's then the lounge's, so its ACCEPT shows while
 * either has a window flashing, and accepts both; RESET resets both.
 */
export function bridgeAnnunciator(store: {
  readonly world: { readonly value: World };
  dispatch(action: WorldAction): void;
}): Annunciator {
  const main = worldAnnunciator(store);
  const mainCount = ANNUNCIATOR_ALARMS.length;
  return {
    get states() {
      const lounge = store.world.value.loungeAnnunciator.windows;
      return [...main.states, ...LOUNGE_ALARMS.map((id) => lounge[id])];
    },
    test: false,
    sense() {},
    acknowledge(which) {
      if (!which) {
        main.acknowledge();
        store.dispatch({ type: 'lounge-alarms/accept' });
        return;
      }
      const mine = which.filter((i) => i < mainCount);
      if (mine.length) main.acknowledge(mine);
      if (which.some((i) => i >= mainCount))
        store.dispatch({ type: 'lounge-alarms/accept' });
    },
    reset() {
      main.reset();
      store.dispatch({ type: 'lounge-alarms/reset' });
    },
    lit(seconds) {
      return litWindows(this.states, this.test, seconds);
    },
  };
}
