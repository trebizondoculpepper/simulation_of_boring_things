import type { World, WorldAction } from '../../../game/world';
import { litWindows } from '../../components/industrial-control/logic/annunciator';
import type { Annunciator } from '../../components/industrial-control/logic/annunciator';
import { ANNUNCIATOR_ALARMS } from './control-room-demo';
import {
  LOCATIONS,
  LOCATION_ANNUNCIATORS,
} from '../../../game/plant/location-annunciators';

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
 * The bridge's annunciator: the world's main one and every location's
 * (`game/plant/location-annunciators.ts`: the lounge's, the Olympic's,
 * the wet hall's) as one (the owner, 2026-10-28: anything that sounds on
 * any annunciator is a warning on the bridge): its windows the main
 * one's then each location's in turn, so its ACCEPT shows while any has
 * a window flashing, and accepts them all; RESET resets them all.
 */
export function bridgeAnnunciator(store: {
  readonly world: { readonly value: World };
  dispatch(action: WorldAction): void;
}): Annunciator {
  const main = worldAnnunciator(store);
  const mainCount: number = ANNUNCIATOR_ALARMS.length;
  return {
    get states() {
      const all = store.world.value.locationAnnunciators;
      return [
        ...main.states,
        ...LOCATIONS.flatMap((location) =>
          LOCATION_ANNUNCIATORS[location].alarms.map(
            (id) => all[location].windows[id] ?? 'off',
          ),
        ),
      ];
    },
    test: false,
    sense() {},
    acknowledge(which) {
      if (!which) {
        main.acknowledge();
        store.dispatch({ type: 'location-alarms/accept' });
        return;
      }
      const mine = which.filter((i) => i < mainCount);
      if (mine.length) main.acknowledge(mine);
      // A location's windows accepted together, as its own board's ACCEPT.
      let from: number = mainCount;
      for (const location of LOCATIONS) {
        const to = from + LOCATION_ANNUNCIATORS[location].alarms.length;
        if (which.some((i) => i >= from && i < to))
          store.dispatch({ type: 'location-alarms/accept', location });
        from = to;
      }
    },
    reset() {
      main.reset();
      store.dispatch({ type: 'location-alarms/reset' });
    },
    lit(seconds) {
      return litWindows(this.states, this.test, seconds);
    },
  };
}
