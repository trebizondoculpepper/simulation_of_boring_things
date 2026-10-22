/**
 * The wet hall's share of the plant network: make-up water for every
 * pool, and the drainage from every plant room (`src/game/plant/wet-hall.ts`
 * is its world model, whose numbers these follow).
 *
 * Make-up: the town main, through its stop valve, fills the Category 5
 * break tank by its float valve over an air gap; the booster set, duty
 * and standby, draws from the tank through its outlet valve and pushes
 * through the make-up water meter and the make-up main valve into the
 * make-up main, which each plant room's branch leaves by its own
 * isolating valve.
 *
 * Drainage: every plant room's drains fall by gravity to the drainage
 * main and the backwash holding tank, sunk in its pit; its discharge pump
 * lifts it to the foul sewer at the rate the water company's consent
 * allows.
 *
 * Heights are metres above the wet hall's floor (`common.ts`). Pure.
 */
import { WET_HALL_PLANT } from '../wet-hall';
import {
  BACKWASH_TANK_LEVEL,
  BREAK_TANK_LEVEL,
  GAP,
  NetworkBuilder,
  SEWER_HEAD,
  SITE,
  TOWN_MAIN_HEAD,
  WET_HALL,
  ph,
} from './common';
import type { Loss, Service } from './types';

const ROOM = 'wet_hall';
const SYSTEM = 'wet-hall';

/** The booster set's design point: its rate against the highest pool's lift and the main's losses. */
export const BOOSTER = { flow: WET_HALL_PLANT.boosterRate, head: 30 };
/** The backwash discharge pump's: the sewer consent, lifted from the pit to the sewer. */
export const DISCHARGE = { flow: WET_HALL_PLANT.sewerConsent, head: 6 };

export function wetHall(b: NetworkBuilder) {
  const id = (s: string) => `wh.${s}`;
  const q = BOOSTER.flow;
  const valve = (
    key: string,
    name: string,
    service: Service,
    open: boolean,
    loss: Loss,
    kind: 'valve' | 'float-valve' = 'valve',
  ) =>
    b.node({
      id: id(key),
      name,
      kind,
      class: 'valve',
      system: SYSTEM,
      room: ROOM,
      ports: { a: service, b: service },
      hydraulic: { kind: 'valve', from: 'a', to: 'b', loss },
      normal: { open },
      aspects: {
        hydraulics: 'modelled',
        ...(kind === 'float-valve' ? { levels: ph(GAP.float) } : {}),
      },
    });
  const header = (key: string, name: string, service: Service) =>
    b.node({
      id: id(key),
      name,
      kind: 'header',
      class: 'pipework',
      system: SYSTEM,
      room: ROOM,
      ports: { main: service },
      hydraulic: { kind: 'junction' },
      aspects: { hydraulics: 'modelled' },
    });
  const tank = (
    key: string,
    name: string,
    level: number,
    ports: Record<string, Service>,
  ) =>
    b.node({
      id: id(key),
      name,
      kind: 'balance-tank',
      class: 'equipment',
      system: SYSTEM,
      room: ROOM,
      ports,
      hydraulic: { kind: 'reservoir', level },
      aspects: { hydraulics: 'modelled', levels: ph(GAP.levels) },
    });
  /** A pump set: suction valve, pump, non-return valve, discharge valve. */
  const pumpSet = (
    n: number,
    name: string,
    service: Service,
    design: { flow: number; head: number },
    running: boolean,
    from: string,
    to: string,
  ) => {
    const loss: Loss = [0.05, design.flow];
    const sv = valve(`p${n}.sv1`, `${name} suction valve`, service, true, loss);
    const pump = b.node({
      id: id(`p${n}`),
      name,
      kind: 'pump',
      class: 'equipment',
      system: SYSTEM,
      room: ROOM,
      ports: { suction: service, discharge: service, power: 'power' },
      hydraulic: {
        kind: 'pump',
        from: 'suction',
        to: 'discharge',
        head: design.head,
        flow: design.flow,
        shutoff: design.head * 1.3,
      },
      normal: { running },
      aspects: { hydraulics: 'modelled', electrics: ph(GAP.electrics) },
    });
    const nrv = b.node({
      id: id(`p${n}.nrv1`),
      name: `${name} non-return valve`,
      kind: 'non-return-valve',
      class: 'valve',
      system: SYSTEM,
      room: ROOM,
      ports: { in: service, out: service },
      hydraulic: {
        kind: 'check',
        from: 'in',
        to: 'out',
        loss: [0.3, design.flow],
      },
      aspects: { hydraulics: 'modelled' },
    });
    const dv = valve(
      `p${n}.dv1`,
      `${name} discharge valve`,
      service,
      true,
      loss,
    );
    b.link(from, `${sv}.a`, service);
    b.link(`${sv}.b`, `${pump}.suction`, service);
    b.link(`${pump}.discharge`, `${nrv}.in`, service);
    b.link(`${nrv}.out`, `${dv}.a`, service);
    b.link(`${dv}.b`, to, service);
    b.link(`${SITE.power}.out`, `${pump}.power`, 'power');
  };

  // Make-up.
  const stop = valve('mu.iv1', 'Town main stop valve', 'make-up', true, [1, q]);
  const float = valve(
    't1.lcv1',
    'Break tank float valve (Category 5 air gap)',
    'make-up',
    true,
    [TOWN_MAIN_HEAD - BREAK_TANK_LEVEL - 1, WET_HALL_PLANT.mainsFill],
    'float-valve',
  );
  const breakTank = tank(
    't1',
    'Make-up break tank (Category 5)',
    BREAK_TANK_LEVEL,
    {
      inlet: 'make-up',
      outlet: 'make-up',
      overflow: 'drainage',
      drain: 'drainage',
    },
  );
  b.link(`${SITE.townMain}.out`, `${stop}.a`, 'make-up');
  b.link(`${stop}.b`, `${float}.a`, 'make-up');
  b.link(`${float}.b`, `${breakTank}.inlet`, 'make-up');
  const outlet = valve('t1.iv1', 'Break tank outlet valve', 'make-up', true, [
    0.05,
    q,
  ]);
  b.link(`${breakTank}.outlet`, `${outlet}.a`, 'make-up');
  const suction = header(
    'mu.suction-header',
    'Booster set suction header',
    'make-up',
  );
  const discharge = header(
    'mu.discharge-header',
    'Booster set discharge header',
    'make-up',
  );
  b.link(`${outlet}.b`, `${suction}.main`, 'make-up', [0.1, q]);
  for (const n of [1, 2])
    pumpSet(
      n,
      `Make-up booster pump ${n} (${n === 1 ? 'duty' : 'standby'})`,
      'make-up',
      BOOSTER,
      n === 1,
      `${suction}.main`,
      `${discharge}.main`,
    );
  const meter = b.node({
    id: id('fm1'),
    name: 'Make-up water meter',
    kind: 'water-meter',
    class: 'equipment',
    system: SYSTEM,
    room: ROOM,
    ports: { inlet: 'make-up', outlet: 'make-up' },
    hydraulic: {
      kind: 'resistance',
      from: 'inlet',
      to: 'outlet',
      loss: [0.5, q],
    },
    aspects: { hydraulics: 'modelled' },
  });
  b.link(`${discharge}.main`, `${meter}.inlet`, 'make-up');
  const mainValve = valve('mu.iv2', 'Make-up main valve', 'make-up', true, [
    0.05,
    q,
  ]);
  b.link(`${meter}.outlet`, `${mainValve}.a`, 'make-up');
  const main = header('mu.main', 'Make-up main', 'make-up');
  if (main !== WET_HALL.makeUpMain)
    throw new Error('The make-up main has moved');
  b.link(`${mainValve}.b`, `${main}.main`, 'make-up', [1, q]);

  // Drainage.
  const drains = header(
    'dr.main',
    'Drainage main, to the backwash holding tank',
    'drainage',
  );
  if (drains !== WET_HALL.drainageMain)
    throw new Error('The drainage main has moved');
  const holding = tank('t2', 'Backwash holding tank', BACKWASH_TANK_LEVEL, {
    inlet: 'drainage',
    outlet: 'drainage',
    overflow: 'drainage',
    drain: 'drainage',
  });
  b.link(`${drains}.main`, `${holding}.inlet`, 'drainage', [0.2, 300]);
  b.link(`${breakTank}.overflow`, `${drains}.main`, 'drainage', undefined, {
    hydraulics: ph(GAP.overflow),
  });
  const breakDrain = valve(
    't1.wv1',
    'Break tank drain valve',
    'drainage',
    false,
    [BREAK_TANK_LEVEL - BACKWASH_TANK_LEVEL, 20],
  );
  b.link(`${breakTank}.drain`, `${breakDrain}.a`, 'drainage');
  b.link(`${breakDrain}.b`, `${drains}.main`, 'drainage');
  // The holding tank's discharge pump lifts to the sewer; its drain valve
  // lets the pump take it down below its normal suction.
  const pit = header(
    'dr.pit-header',
    'Backwash discharge pump suction',
    'drainage',
  );
  b.link(`${holding}.outlet`, `${pit}.main`, 'drainage', [0.1, DISCHARGE.flow]);
  const tankDrain = valve(
    't2.wv1',
    'Backwash tank drain valve',
    'drainage',
    false,
    [0.2, DISCHARGE.flow],
  );
  b.link(`${holding}.drain`, `${tankDrain}.a`, 'drainage');
  const rising = header(
    'dr.rising-main',
    'Backwash rising main, to the sewer',
    'drainage',
  );
  b.link(`${tankDrain}.b`, `${pit}.main`, 'drainage');
  pumpSet(
    3,
    'Backwash discharge pump',
    'drainage',
    DISCHARGE,
    false,
    `${pit}.main`,
    `${rising}.main`,
  );
  // The rising main to the sewer: what the pump's head does not spend on
  // the lift, at the consented rate.
  b.link(`${rising}.main`, `${SITE.sewer}.in`, 'drainage', [
    DISCHARGE.head - (SEWER_HEAD - BACKWASH_TANK_LEVEL) - 0.4,
    DISCHARGE.flow,
  ]);
  b.link(`${holding}.overflow`, `${SITE.sewer}.in`, 'drainage', undefined, {
    hydraulics: ph(GAP.overflow),
  });
  return { sewerLift: SEWER_HEAD - BACKWASH_TANK_LEVEL };
}
