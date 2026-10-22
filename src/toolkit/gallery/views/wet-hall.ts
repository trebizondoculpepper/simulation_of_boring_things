import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createMimicBoard } from '../../components/industrial-control/views/mimic-board';
import { createBoosterSet } from '../../components/plant/views/booster-set';
import type { BoosterFeed } from '../../components/plant/views/booster-set';
import { createWaterMeterSet } from '../../components/plant/views/balance-plant';
import { serviceAvailable } from '../../../game/plant/services';
import { WET_HALL_PLANT, newWetHall } from '../../../game/plant/wet-hall';
import { newPlantServices } from '../../../game/plant/services';
import { worldStore } from '../../save/world-store';
import { wetHallMimicSpec, wetHallMimicState } from '../logic/wet-hall-mimic';
import type { WetHallReading } from '../logic/wet-hall-mimic';
import type { LiveExhibit } from '../rooms/plant/exhibit';
import { partAudio } from '../../components/core/audio/part-audio';
import { pumpSound } from '../../components/plant/views/pump-sound';
import { BOOSTER_PUMP } from '../../components/plant/logic/pump-sound';

/**
 * The wet hall's working machines, bound to the world's wet hall
 * (`src/game/plant/wet-hall.ts`): the booster set's controller, the
 * make-up meter's register and the wet hall's mimic all read it, and the
 * booster set's RESET, on its controller or on the mimic, resets it.
 */
function wetHallWorld(standalone = false) {
  const store =
    standalone || typeof window === 'undefined' ? null : worldStore('dev');
  const world = () => store?.world.value;
  return {
    reading(): WetHallReading {
      const w = world();
      return {
        wetHall: w?.wetHall ?? newWetHall(),
        mains: w?.plant.sources.water ?? true,
      };
    },
    powered() {
      return serviceAvailable(
        world()?.plant ?? newPlantServices(),
        'wet_hall',
        'power',
      );
    },
    reset() {
      store?.dispatch({ type: 'plant/booster-reset' });
    },
  };
}

/** The booster set, its controller reading the world's wet hall. */
export function createWorldBoosterSet(kit: PanelKit) {
  const w = wetHallWorld();
  const feed: BoosterFeed = {
    read() {
      const s = w.reading().wetHall;
      return {
        powered: w.powered(),
        tripped: s.boosterTripped,
        running: s.boosterRunning,
        flow: s.flow,
        breakTank: s.breakTank / WET_HALL_PLANT.breakTank,
      };
    },
    reset: () => w.reset(),
  };
  // Heard while it runs: its pump's sound held at it.
  const set = createBoosterSet(kit, feed);
  const sound = pumpSound(BOOSTER_PUMP);
  let heard = false;
  const live: LiveExhibit = {
    ...set,
    update(delta: number) {
      set.update?.(delta);
      const running = feed.read().running;
      if (running !== heard) {
        heard = running;
        partAudio.hold(set, running ? sound : null, set.object);
      }
    },
    dispose() {
      partAudio.hold(set, null);
      set.dispose?.();
    },
  };
  return live;
}

/** The make-up meter, its register counting the world's make-up. */
export function createWorldWaterMeter(kit: PanelKit) {
  const w = wetHallWorld();
  const meter = createWaterMeterSet(kit);
  return {
    object: meter.group,
    update() {
      meter.show(w.reading().wetHall.meter);
    },
  };
}

/**
 * The wet hall's mimic, by Penfold Controls; `standalone` (a development
 * room), showing a wet hall at rest rather than the world's.
 */
export function createWetHallMimic(kit: PanelKit, standalone = false) {
  const w = wetHallWorld(standalone);
  const board = createMimicBoard(kit, wetHallMimicSpec, {
    press: (id) => {
      if (id === 'booster-reset') w.reset();
    },
  });
  return {
    object: board.group,
    parts: board.parts,
    update() {
      board.show(wetHallMimicState(w.reading()));
    },
  };
}
