import {
  BOILER_KW,
  NODES,
  POOL,
  POOL_KJ_PER_K,
  START_C,
  START_SET,
  TAGS,
  hall1Readings,
  newHall1,
  poolLosses,
  runHall1,
  shortTag,
} from '../../../game/plant/museum-1-heating';
import type { MachineId } from '../../../game/plant/museum-1-heating';
import { BOILER_EFFICIENCY, GAS_ENERGY } from '../../../game/plant/heat-loop';
import { KETTLE_KWH, RESET_SIGN } from './ideal-pool-plant-placards';
import type { Placard } from './ideal-pool-plant-placards';

export { RESET_SIGN };

/**
 * Hall 1's words (107a): its entrance panel and a placard at each station
 * of the route, gas to pool, left to right. The names, tags and every
 * number in a fact come from the model (`museum-1-heating.ts`); only the
 * explanation is written here. Pure.
 */

const node = (id: MachineId) => NODES.find((n) => n.id === id)!;
const titleOf = (id: MachineId) => `${node(id).name} · ${TAGS[id]}`;
const round = (v: number, places = 0) =>
  v.toLocaleString('en-GB', {
    minimumFractionDigits: places,
    maximumFractionDigits: places,
  });

/** The hall's own figures, from the model. */
export function hall1Facts() {
  const kWhPerK = POOL_KJ_PER_K / 3600;
  const warm = runHall1(newHall1(), 3600);
  const r = hall1Readings(warm);
  const at28 = poolLosses({ ...newHall1(), poolC: 28 });
  const busy = poolLosses({ ...newHall1(), poolC: 28, swimmers: 'busy' });
  return {
    kWhPerK,
    kettles: kWhPerK / KETTLE_KWH,
    gasEnergy: GAS_ENERGY,
    efficiency: BOILER_EFFICIENCY,
    boilerKW: BOILER_KW,
    flowC: r.temps['boilerFlow.ti'],
    returnC: r.temps['boilerReturn.ti'],
    rise: r.temps['hxOut.ti'] - r.temps['hxIn.ti'],
    flow: r.flow,
    evaporation: at28.evaporation,
    lost: at28.total,
    busyFactor: busy.evaporation / at28.evaporation,
    perDay: (at28.total / BOILER_EFFICIENCY) * 24,
  };
}

/** The placards, one at each station, in the route's order. */
export function hall1Placards(): Placard[] {
  const k = hall1Facts();
  const v = (id: string) => shortTag(id);
  return [
    {
      station: 1,
      of: 'gasMain',
      icon: 'meter',
      headline: 'The gas',
      title: titleOf('gasMain'),
      body: `Gas from the street, counted by the meter ${v('gas.meter')}. The yellow lever ${v('gas.ecv')} is the emergency control valve: one quarter-turn shuts off the whole building. The gauge ${v('gas.pi')} shows the gas’s pressure, in millibars.`,
      fact: `A cubic metre of natural gas holds about ${round(k.gasEnergy, 1)} kWh of energy.`,
      tryIt: 'Watch the meter’s red drums speed up when the boiler fires.',
    },
    {
      station: 2,
      of: 'boiler',
      icon: 'heat',
      headline: 'The boiler',
      title: titleOf('boiler'),
      body: `A flame heats water to about ${round(k.flowC)} °C, and the flue takes the burnt gases up through the roof. The boiler will not fire unless the pool’s water is flowing, and if its flame fails it locks itself out until someone presses RESET on the boiler itself.`,
      fact: `A condensing boiler is about ${round(k.efficiency * 100)} % efficient: it even recovers the heat in the steam of its own flue gases.`,
      tryIt: `Shut the gas cock ${v('boiler.gas.iso')} while the boiler fires: watch it lock out. Open the cock and press RESET on the boiler.`,
    },
    {
      station: 3,
      of: 'hx',
      icon: 'hx',
      headline: 'The exchanger',
      title: titleOf('hx'),
      body: 'Two waters, one hot and one cool, pass each other through thin steel plates. The heat crosses; the water never does. The boiler’s water goes round its own sealed circuit, pumped by the twin-head pump P1.',
      fact: `The boiler’s water leaves about ${round(k.flowC - k.returnC)} degrees cooler; the pool’s only ${round(k.rise, 1)} of a degree warmer, because there is so much more of it.`,
      tryIt: `Compare ${v('boilerFlow.ti')} and ${v('boilerReturn.ti')} with ${v('hxIn.ti')} and ${v('hxOut.ti')}.`,
    },
    {
      station: 4,
      of: 'poolPump',
      icon: 'pump',
      headline: 'The pump',
      title: titleOf('poolPump'),
      body: `Water does not move by itself. The pump pushes it round, ${round(k.flow)} m³ an hour; the gauges either side show the pressure it adds, and the flow switch ${v('poolDischarge.fs')} tells the boiler the water is moving.`,
      fact: 'Shut the pump’s valve and it can only churn the same water: it warms up, and its thermostat trips it to save it.',
      tryIt: `Close the valve ${v('poolPump.discharge.iso')} notch by notch: the flow ${v('poolDischarge.meter')} falls and the pressure ${v('poolPump.discharge.pi')} rises.`,
    },
    {
      station: 5,
      of: 'pool',
      icon: 'pool',
      headline: 'The pool',
      title: titleOf('pool'),
      body: `The thermostat ${v('poolOut.tc')} calls for heat until the pool reaches its setting (${START_SET} °C to start; it is ${START_C} °C now). ON-OFF: the boiler fires flat out, then stops, and the pool saw-tooths round the setting. MODULATING: the boiler turns itself down as the pool nears it, and the temperature settles.`,
      fact: `To warm this ${round(POOL.volume)} m³ pool by one degree takes ${round(k.kWhPerK)} kWh: about ${round(Math.round(k.kettles / 50) * 50)} kettles.`,
      tryIt:
        'Turn the thermostat’s dial, and switch its CONTROL between ON-OFF and MODULATING.',
    },
    {
      station: 6,
      of: 'losses',
      icon: 'heat',
      headline: 'Where the heat goes',
      title: `The pool’s heat balance · ${TAGS['loss.evaporation']} to ${TAGS['loss.total']}`,
      body: `Most of a pool’s heat leaves from its surface, as water evaporates: about ${round(k.evaporation)} kW of the ${round(k.lost)} kW this pool loses at 28 °C. A little goes into the ground; a warm hall gives a little back. (These meters are the museum’s model of the heat balance: no real plant measures them. Heat lost as radiation is left out.)`,
      fact: `Busy swimmers splash up roughly ${round(k.busyFactor)}× the evaporation of a calm pool.`,
      tryIt: 'Turn the SWIMMERS dial and watch the evaporation needle move.',
    },
    {
      station: 7,
      of: 'cost',
      icon: 'meter',
      headline: 'The gas it burns',
      title: `Gas burnt now · ${TAGS['cost']}`,
      body: `Every kWh of heat in the pool came from gas the meter counted. This display shows the gas the boiler is burning right now, in cubic metres an hour and as kilowatts of heat going in; watch it drop as the boiler turns itself down, or stop when it cycles off. The heat meter ${v('hx.primary.heat')} counts what reached the pool; the difference is the boiler’s loss.`,
      fact: `Holding this pool at 28 °C takes about ${round(k.perDay)} kWh of gas a day, just to stand still.`,
      tryIt:
        'Press TIME ×3600, turn the SWIMMERS dial down, and watch the gas fall as the pool needs less.',
    },
  ];
}

/** The entrance panel, in the museum's style. */
export function hall1Entrance() {
  const stations = hall1Placards();
  const k = hall1Facts();
  return {
    title: 'Warm water',
    subtitle: 'Hall 1: heating, energy and a first pump',
    introduction: `A pool is a huge bath that is always going cold. Heating it is a chain: gas burns, hot water carries the heat, and an exchanger hands it to the pool without the waters ever mixing. To warm this pool by one degree takes ${round(k.kWhPerK)} kWh: about ${round(Math.round(k.kettles / 50) * 50)} kettles. Everything here works: every valve, switch and dial is yours to try.`,
    route: stations.map((p) => ({
      station: p.station!,
      name: p.headline,
      what: p.title.split(' · ')[0],
    })),
    reset:
      'Can’t break it: the big red RESET SIMULATION button puts everything back to the start.',
  };
}
