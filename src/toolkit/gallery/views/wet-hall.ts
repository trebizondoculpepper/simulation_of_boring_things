import { withIntake } from '../../../game/plant/site-intake';
import { installedValveByCommandId } from '../../../game/plant/installed-valves';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createMimicBoard } from '../../components/industrial-control/views/mimic-board';
import { createBoosterSet } from '../../components/plant/views/booster-set';
import type { BoosterFeed } from '../../components/plant/views/booster-set';
import { createWaterMeterSet } from '../../components/plant/views/balance-plant';
import { serviceAvailable } from '../../../game/plant/services';
import { WET_HALL_PLANT, newWetHall } from '../../../game/plant/wet-hall';
import { newPlantServices } from '../../../game/plant/services';
import { roomWorld } from '../../save/world-store';
import { wetHallMimicSpec, wetHallMimicState } from '../logic/wet-hall-mimic';
import type { WetHallReading } from '../logic/wet-hall-mimic';

/**
 * The wet hall's working machines, bound to the world's wet hall
 * (`src/game/plant/wet-hall.ts`): the booster set's controller, the
 * make-up meter's register and the wet hall's mimic all read it, and the
 * booster set's RESET, on its controller or on the mimic, resets it.
 */
function wetHallWorld(standalone = false) {
  const store =
    standalone || typeof window === 'undefined' ? null : roomWorld();
  const world = () => store?.world.value;
  return {
    reading(): WetHallReading {
      const w = world();
      const open = (tag: string) => {
        const v = installedValveByCommandId(tag);
        return !w || !v ? true : w.installedValves[v.assetId] !== false;
      };
      return {
        wetHall: w?.wetHall ?? newWetHall(),
        mains: w ? withIntake(w.plant, w.intake).sources.water : true,
        valves: { suction: open('WH-T1-IV1'), discharge: open('WH-MU1-IV2') },
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
    /** Drive one of the booster set's motorised valves open or shut. */
    valve(tag: string, open: boolean) {
      const v = installedValveByCommandId(tag);
      if (v) store?.dispatch({ type: 'plant/valve', id: v.assetId, open });
    },
  };
}

/**
 * The booster set, its controller reading the world's wet hall: its duty
 * changeover (DUTY, RUN, STOP, BOOST) the world's (the owner, 2026-10-26:
 * brought in from dev42), each pump heard as it runs up and coasts.
 */
export function createWorldBoosterSet(kit: PanelKit) {
  const w = wetHallWorld();
  const store = typeof window === 'undefined' ? null : roomWorld();
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
    // Its suction: the break tank's head over it.
    suction: () => 0.25,
    changeover: {
      state: () => w.reading().wetHall.booster,
      act: (action) => store?.dispatch({ type: 'booster/changeover', action }),
    },
  };
  return createBoosterSet(kit, feed);
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
    // Its register's reading, as it shows it (prompt 068).
    status: () => `Reads ${meter.reading()}`,
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
      const [which, act] = id.split('-');
      if (
        (which === 'suction' || which === 'discharge') &&
        (act === 'open' || act === 'shut')
      )
        w.valve(
          which === 'suction' ? 'WH-T1-IV1' : 'WH-MU1-IV2',
          act === 'open',
        );
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
