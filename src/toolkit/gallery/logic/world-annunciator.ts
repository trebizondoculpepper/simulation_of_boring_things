import type { World, WorldAction } from '../../../game/world';
import { litWindows } from '../../components/industrial-control/logic/annunciator';
import type { Annunciator } from '../../components/industrial-control/logic/annunciator';
import { ANNUNCIATOR_ALARMS } from './control-room-demo';

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
