import {
  BLEED_SECONDS,
  CROWD_BATHERS,
  DAY_TANK_L,
  NODES,
  PUMPS,
  TAGS,
  shortTag,
} from '../../../game/plant/museum-3-dosing';
import type { MachineId } from '../../../game/plant/museum-3-dosing';
import { BATHER, hoclFraction } from '../../../game/water/pool-chemistry';
import { PLANT_SETTINGS } from '../../components/plant/logic/dosing-controller';
import { RESET_SIGN } from './ideal-pool-plant-placards';
import type { Placard } from './ideal-pool-plant-placards';

export { RESET_SIGN };

/**
 * Hall 3's words (107c): its entrance panel and a placard at each station
 * of the route, left to right. Names, tags and numbers come from the
 * model (`museum-3-dosing.ts`) and the controller's settings; only the
 * explanation is written here. Pure.
 */

const node = (id: MachineId) => NODES.find((n) => n.id === id)!;
const titleOf = (id: MachineId) => `${node(id).name} · ${TAGS[id]}`;
const fmt = (v: number, places = 0) =>
  v.toLocaleString('en-GB', {
    minimumFractionDigits: places,
    maximumFractionDigits: places,
  });

/** The hall's own figures. */
export function hall3Facts() {
  const P = PLANT_SETTINGS;
  return {
    set: P.chlorineSet,
    band: P.chlorineBand,
    integral: P.chlorineIntegral,
    phSet: P.pHSet,
    phBand: P.pHBand,
    low: P.chlorineLow,
    high: P.chlorineHigh,
    flowDelay: P.sampleFlowDelay,
    limitHours: P.doseLimit / 3600,
    hocl73: hoclFraction(7.3, 28),
    hocl76: hoclFraction(7.6, 28),
    demand: BATHER.demand / 1000,
    hypoLh: PUMPS.hypochlorite.maxLh,
    acidLh: PUMPS.acid.maxLh,
  };
}

export function hall3Placards(): Placard[] {
  const k = hall3Facts();
  const v = shortTag;
  return [
    {
      station: 1,
      of: 'swimmers',
      icon: 'pool',
      headline: 'The swimmers',
      title: `Swimmers · ${TAGS['swimmers']}`,
      body: `Every swimmer brings sweat, skin and worse: about ${fmt(k.demand, 1)} g of chlorine demand each. Chlorine destroys it, and is used up doing so. NORMAL is a public day of 600 swimmers, busiest in the evening; CROWD sends ${CROWD_BATHERS} in for the next hour.`,
      fact: 'The pool smell is not chlorine: it is chloramines, and it means the water has more dirt than its chlorine can deal with.',
      tryIt:
        'Send in a crowd and watch the chlorine dip and the controller answer.',
    },
    {
      station: 2,
      of: 'sampleCell',
      icon: 'meter',
      headline: 'The sample',
      title: titleOf('sampleCell'),
      body: `A trickle of the pool, about 40 litres an hour, runs past two probes all day: free chlorine ${v('cell.cl')} and pH ${v('cell.ph')}. The float ${v('cell.fs')} shows it is flowing; without flow the controller stops dosing after ${fmt(k.flowDelay)} seconds, because it can no longer trust what it reads.`,
      fact: 'Standing still, the probe uses up the chlorine in its own little cell in a few minutes: it reads low while the pool is fine.',
      tryIt: `Shut the sample valve ${v('sample.iso')}: watch the lamp go out, the reading fall, and the controller stop. Open it again.`,
    },
    {
      station: 3,
      of: 'controller',
      icon: 'meter',
      headline: 'The controller',
      title: `Dosing controller · ${TAGS['controller']}`,
      body: `It compares what it measures with what it is set to, and doses in proportion to the difference: set to ${fmt(k.set, 1)} mg/l, full output ${fmt(k.band, 1)} below it, and a little more the longer it stays low (integral ${fmt(k.integral)} hours). pH is set to ${fmt(k.phSet, 1)}. Two hours at full output and it stops itself (E dt): something must be wrong.`,
      fact: `pH decides how strong chlorine is: at pH 7.3 about ${fmt(k.hocl73 * 100)} % of it is the strong kind, at 7.6 only ${fmt(k.hocl76 * 100)} %. A dose takes over an hour to reach the far side of the pool, so the controller must not panic.`,
      tryIt:
        'Press ◄► to SEt, XP or tn, ↵ to change, ▲ ▼, ↵ to keep. ↵ on the reading acknowledges an alarm.',
    },
    {
      station: 4,
      of: 'hypoPump',
      icon: 'pump',
      headline: 'The pumps',
      title: `${node('hypoPump').name} · ${TAGS['hypoPump']}; ${node('acidPump').name} · ${TAGS['acidPump']}`,
      body: `Each stroke pushes out a fraction of a millilitre. The hypochlorite pump gives up to ${fmt(k.hypoLh, 1)} litres an hour, the acid pump ${fmt(k.acidLh, 1)}. Hypochlorite pushes the pH up, so acid is dosed too, at its own injection point.`,
      fact: 'A bubble in the pump’s head and it strokes away delivering nothing: the plant keeps running and the water slowly gets worse.',
      tryIt: `Watch the stroke lamp speed up as the chlorine falls. A pump showing its fault: open its bleed valve ${v('hypoPump.bleed')} for ${fmt(BLEED_SECONDS)} seconds, shut it, and press START on the pump.`,
    },
    {
      station: 5,
      of: 'hypoTank',
      icon: 'tank',
      headline: 'The tanks',
      title: `${titleOf('hypoTank')}; ${titleOf('acidTank')}`,
      body: `Each day tank holds ${fmt(DAY_TANK_L)} litres, a few days’ chemical, read on its sight gauge (${v('hypoTank.li')}, ${v('acidTank.li')}). Refill it from its store by holding its fill valve open.`,
      fact: 'Never let acid and hypochlorite meet: they make chlorine gas. That is why they have separate tanks, pumps, colours and injection points.',
      tryIt: `Hold ${v('hypoTank.fill')} open to fill the hypochlorite tank.`,
    },
    {
      station: 6,
      of: 'testKit',
      icon: 'meter',
      headline: 'The test kit',
      title: `DPD test kit · ${TAGS['testKit']}`,
      body: 'Never trust a probe you have not checked. DPD 1 turns pink with free chlorine; DPD 3 shows the total, and the difference is the combined chlorine; phenol red gives the pH.',
      fact: 'Pools test by hand at least three times a day, and check the controller against the test every day.',
      tryIt: 'Press TEST and compare with the controller.',
    },
    {
      station: 7,
      of: 'faults',
      icon: 'map',
      headline: 'When it goes wrong',
      title: `Fault pedestal · ${TAGS['faults']}`,
      body: 'AIR IN THE PUMP puts a bubble into the hypochlorite pump’s head. WEAK DELIVERY makes the next hypochlorite into the day tank weaker than it should be. Neither trips the plant; find each from the plant’s own displays.',
      fact: 'A weak delivery sets off no alarm: the controller simply doses more, and the day tank empties faster.',
      tryIt: 'Press a fault, then put it right. RESET SIMULATION clears both.',
    },
  ];
}

export function hall3Entrance() {
  const stations = hall3Placards();
  return {
    title: 'Safe water',
    subtitle: 'Hall 3: automatic disinfection',
    introduction:
      'Clear water can still carry germs. The plant keeps a little chlorine in it all the time, measures it every second, and adds more as the swimmers use it up. Everything here works: every valve, key and dial is yours to try.',
    route: stations.map((p) => ({
      station: p.station!,
      name: p.headline,
      what: p.title.split(' · ')[0],
    })),
    reset:
      'Can’t break it: the big red RESET SIMULATION button puts everything back to the start, the controller’s settings too.',
  };
}
