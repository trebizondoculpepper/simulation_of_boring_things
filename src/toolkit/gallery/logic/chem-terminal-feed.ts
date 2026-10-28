import type { World } from '../../../game/world';
import { transferRunsIn } from '../../../game/world';
import { serviceAvailable } from '../../../game/plant/services';
import { STORE_CAPACITY } from '../../../game/plant/chemicals';
import type { Chemical } from '../../../game/plant/chemicals';
import {
  DAY_TANKS,
  levelLimits,
  levelStep,
} from '../../../game/plant/chemical-distribution';
import {
  TANK_NAMES,
  boxLive,
  lineAlarms,
  tankState,
  terminalComms,
} from '../../../game/plant/chem-control';
import type {
  TerminalFeed,
  TerminalLink,
} from '../../components/industrial-control/logic/ot216-terminal';

/**
 * What the world's chemical transfer control box sends each OT-216
 * terminal (prompt 091): its line's store, pump and day tanks in litres,
 * their levels, states and limits, what is filling and what waits, and
 * the line's alarms; and the terminal's supply and link. Pure.
 */

/** A store reads low at its terminal below this share: before its cut-out. */
export const STORE_LOW_ALARM = 0.1;

export function worldTerminalFeed(world: World, c: Chemical): TerminalFeed {
  const line = world.distribution[c];
  const tanks = line.tanks.map((t, i) => {
    const capacity = DAY_TANKS[c][i].litres;
    return {
      name: TANK_NAMES[i] ?? `TANK ${i + 1}`,
      litres: t.litres,
      capacity,
      lowL: t.lowL,
      highL: t.highL,
      state: tankState(line, i),
      lastFilled: t.lastFilled === null ? null : world.time - t.lastFilled,
      outletOpen: line.serving === i,
      limits: levelLimits(capacity, t),
      step: levelStep(capacity),
    };
  });
  const store = world.chemicals[c];
  const storeLow = store <= STORE_CAPACITY[c] * STORE_LOW_ALARM;
  const waiting = tanks.findIndex((t) => t.state === 'CALL');
  return {
    line: c === 'acid' ? 'ACID' : 'HYPO',
    store,
    storeLow,
    pump: line.tripped ? 'TRIP' : transferRunsIn(world, c) ? 'RUN' : 'STOP',
    tanks,
    filling: line.serving,
    next: waiting < 0 ? null : waiting,
    alarms: lineAlarms(c, line, storeLow),
  };
}

/** Terminal `c`'s supply, from the box, and whether the box answers it. */
export function worldTerminalLink(world: World, c: Chemical): TerminalLink {
  const hall = serviceAvailable(world.plant, 'wet_hall', 'power');
  return {
    powered: boxLive(world.chemControl, hall),
    comms: terminalComms(world.chemControl, hall, c),
  };
}
