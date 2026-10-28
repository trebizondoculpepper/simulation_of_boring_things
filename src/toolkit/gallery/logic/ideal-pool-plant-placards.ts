import {
  FILTER_SPEC,
  FITTINGS,
  NODES,
  PLANT,
  TAGS,
  actOnPlant,
  connectionsOf,
  fittingName,
  newIdealPlant,
  plantReadings,
  shortTag,
  solvePlant,
  stepIdealPlant,
  turnoverHours,
} from '../../../game/plant/ideal-pool-plant';
import type {
  MachineId,
  PlantFitting,
} from '../../../game/plant/ideal-pool-plant';
import { filterSizing } from '../../../game/plant/ideal-filter';

/**
 * The exhibit's words (dev51, mission 106; the owner, 2026-10-28): the
 * museum's placards, one at each station of the water's path, each with
 * its number, a bold headline, a few plain sentences, one memorable fact
 * and a "Try it" line; the entrance panel; the activity card; and the
 * RESET sign. What a placard names (the machine's name, its tag, what it
 * is joined to, the valves and meters a visitor may work) and every number
 * in a fact come from the model; only the explanation is written here.
 * Pure.
 */

export type PlacardIcon =
  | 'pool'
  | 'tank'
  | 'pump'
  | 'filter'
  | 'hx'
  | 'heat'
  | 'meter'
  | 'map';

export interface Placard {
  /** Its station's number on the route, or none for a signpost off it. */
  station?: number;
  /** What it stands by. */
  of: MachineId | 'meters' | 'mimic';
  icon: PlacardIcon;
  headline: string;
  /** The machine's name and tag, from the model. */
  title: string;
  /** What it is joined to, from the schematic. */
  joins?: string;
  /** What it does, why it is there: two or three short sentences. */
  body: string;
  /** One memorable fact. */
  fact: string;
  /** What the visitor can do. */
  tryIt: string;
}

const node = (id: MachineId) => NODES.find((n) => n.id === id)!;
const titleOf = (id: MachineId) => `${node(id).name} · ${TAGS[id]}`;
const fitting = (id: string) => FITTINGS.find((f) => f.id === id)!;
/** A valve or meter as a placard names it: its short tag and its name. */
const named = (f: PlantFitting) =>
  `${shortTag(f.id)} (${fittingName(f).toLowerCase()})`;

function joins(id: MachineId) {
  const { from, to } = connectionsOf(id);
  const list = (names: string[]) =>
    names
      .map((n) => n.replace(/^Ideal /, 'ideal ').toLowerCase())
      .join(' and ');
  return [
    from.length ? `From the ${list(from)}` : '',
    to.length ? `to the ${list(to)}` : '',
  ]
    .filter(Boolean)
    .join(', ');
}

/** The plant's own figures at its normal duty, and with the heating full on. */
export function plantFacts() {
  const start = newIdealPlant();
  const f = solvePlant(start);
  let hot = actOnPlant(start, {
    type: 'valve',
    id: 'heat.out-1.valve',
    opening: 1,
  });
  const hf = solvePlant(hot);
  for (let t = 0; t < 120; t++) hot = stepIdealPlant(hot, hf, 1);
  const z = filterSizing(FILTER_SPEC);
  return {
    flow: f.circulation,
    turnover: turnoverHours(f.circulation),
    poolVolume: PLANT.poolVolume,
    filterArea: z.area,
    filterRate: f.circulation / z.area,
    pumpHead: f.pumpHead,
    hxShare: f.hxSecondary / f.circulation,
    fullDuty: plantReadings(hot, hf).duty,
    sourceC: PLANT.sourceC,
  };
}

const round = (v: number, places = 0) => v.toFixed(places);

export function placards(): Placard[] {
  const k = plantFacts();
  const v = (id: string) => named(fitting(id));
  return [
    {
      station: 1,
      of: 'pool',
      icon: 'pool',
      headline: 'Where it all begins',
      title: titleOf('pool'),
      joins: joins('pool'),
      body: 'Swimmers bring in sweat, skin and hair, so the water never stays clean on its own. It spills over the pool’s edge into a channel and is drawn away for cleaning, while cleaned, warmed water comes back in through inlets in the walls. Here the pool is an ideal one: a perfect, never-changing store of water, so the real machines can be seen at work.',
      fact: `The real pool it stands for holds ${round(k.poolVolume)} m³ of water: about 470 tonnes.`,
      tryIt:
        'Read its display: the water’s temperature. Turn the heating on (station 5) and watch it rise.',
    },
    {
      station: 2,
      of: 'tank',
      icon: 'tank',
      headline: 'The overflow’s catch-pot',
      title: titleOf('tank'),
      joins: joins('tank'),
      body: 'Water overflowing the pool falls into the balance tank by gravity: no pump and no valve, so it can never be shut off by mistake. The tank evens out the surges when swimmers jump in, and keeps the pump’s suction always full of water.',
      fact: 'The overflow has no valve on purpose: shut, it would flood the poolside.',
      tryIt: `Follow the pipe from the tank into the pump: ${v('pump.suction.iso')} can shut it off.`,
    },
    {
      station: 3,
      of: 'pump',
      icon: 'pump',
      headline: 'The heart of the plant',
      title: titleOf('pump'),
      joins: joins('pump'),
      body: 'One electric pump does all the work, pushing the water through the filter and the heater and back to the pool. The gauge on its inlet reads the suction; the one on top reads the pressure it makes.',
      fact: `It moves about ${round(k.flow)} m³ an hour: the whole pool through the filter every ${round(k.turnover, 1)} hours.`,
      tryIt:
        'Press STOP on its control box and watch every flow on the mimic fall to nothing; START puts it back.',
    },
    {
      station: 4,
      of: 'filter',
      icon: 'filter',
      headline: 'A bed of sand catches the dirt',
      title: titleOf('filter'),
      joins: joins('filter'),
      body: 'Water enters at the top and trickles down through a metre of sand, which traps the dirt; clean water leaves from the bottom. The two gauges on its face, and the difference between them, show how hard the water must push through the sand.',
      fact: `Its sand bed is ${round(k.filterArea, 1)} m² across: the water passes it at about ${round(k.filterRate)} metres an hour.`,
      tryIt: `Turn ${v('filter.outlet.iso')} shut, notch by notch: the flow (FT1) falls and the pump’s discharge gauge rises.`,
    },
    {
      station: 5,
      of: 'hx',
      icon: 'hx',
      headline: 'Warming without mixing',
      title: titleOf('hx'),
      joins: joins('hx'),
      body: 'Hot water from the boilers and pool water flow past each other on either side of thin steel plates, so heat passes across but the two waters never mix. Only part of the pool water goes through it; the rest takes the bypass beside it.',
      fact: `About ${round(k.hxShare * 100)} % of the flow goes through it; flat out it passes about ${round(k.fullDuty)} kW, as much as ${round(k.fullDuty / 3)} electric kettles (3 kW each).`,
      tryIt: `Open ${v('heat.out-1.valve')} to turn the heating on, then throttle it and watch the return temperature on the mimic.`,
    },
    {
      station: 6,
      of: 'meters',
      icon: 'meter',
      headline: 'Measuring every stream',
      title: `${shortTag('filter.outlet.meter')}, ${shortTag('bypass.meter')}, ${shortTag('hx.secondary.meter')} and ${shortTag('heat.out-1.meter')}: the flowmeters`,
      joins: 'The water then goes back to the pool, and the loop begins again',
      body: `Four kinds of meter, each suited to its pipe: an electromagnetic meter on the main flow (${shortTag('filter.outlet.meter')}), a paddle wheel to the heat exchanger (${shortTag('hx.secondary.meter')}), and floats in tapered tubes on the bypass (${shortTag('bypass.meter')}) and the hot water (${shortTag('heat.out-1.meter')}). The bypass and the exchanger always add up to the main flow.`,
      fact: 'The electromagnetic meter has no moving parts: moving water makes a voltage in its magnetic field.',
      tryIt: `Turn ${v('bypass.valve')} towards shut and watch ${shortTag('bypass.meter')} fall as ${shortTag('hx.secondary.meter')} rises.`,
    },
    {
      of: 'heat',
      icon: 'heat',
      headline: 'An ideal boiler house',
      title: titleOf('heat'),
      joins: joins('heat'),
      body: `In a real leisure centre this hot water comes from the boiler house. Here an ideal source gives water at ${round(k.sourceC)} °C, as much as is asked for, and an ideal sink takes it back.`,
      fact: 'Pool heating water is usually about 80 °C going out and 60 °C coming back.',
      tryIt: `Its valve ${v('heat.out-1.valve')} is the heating’s tap: turn it to open, notch by notch.`,
    },
    {
      of: 'mimic',
      icon: 'map',
      headline: 'The map of the whole system',
      title: 'Mimic board, by Penfold Controls',
      body: 'Every pipe in the room is drawn here. Lights run along each pipe the way its water flows; each valve’s light is green when open, red when shut and amber in between. Every gauge and thermometer in the room is repeated on it.',
      fact: 'Before computer screens, every plant room had a board like this.',
      tryIt:
        'Press TIME ×600 to watch the pool warm in minutes instead of hours.',
    },
  ];
}

/** The entrance panel: the exhibit's title, its introduction and its route. */
export function entrancePanel() {
  const stations = placards().filter((p) => p.station);
  return {
    title: 'How a swimming pool keeps its water clean and warm',
    subtitle: 'A working model of a pool plant room',
    introduction:
      'Behind every swimming pool is a plant room. Night and day, a pump draws the pool’s water through a sand filter, which strains out the dirt, and a heat exchanger, which keeps it warm, and sends it back. Everything in this room really works: the pipes, valves, pump, filter and gauges are simulated from the physics. The pool, its tank and the hot water are “ideal”: perfect stand-ins, so you can watch the plant itself.',
    route: stations.map((p) => ({
      station: p.station!,
      name: p.headline,
      what:
        node(p.of as MachineId)?.name ?? 'The flowmeters, and back to the pool',
    })),
    reset:
      'Can’t break it: the big red RESET button puts everything back to the start.',
  };
}

/** The activity card: things to try, each with what to watch. */
export function activityCard() {
  const v = (id: string) => shortTag(id);
  return {
    title: 'Try this!',
    steps: [
      `Shut the filter outlet ${v('filter.outlet.iso')}, notch by notch. Watch the pump’s discharge pressure (${v('pump.discharge.pi')}) rise and the flow (${v('filter.outlet.meter')}) fall to nothing. Then open it again.`,
      `Turn the heating on: open ${v('heat.out-1.valve')}. Watch the hot water’s flow (${v('heat.out-1.meter')}) and the temperature going back to the pool (${v('returnMain.ti')}).`,
      `Throttle ${v('heat.out-1.valve')} back a notch or two: less hot water, a cooler return.`,
      `Close the bypass ${v('bypass.valve')}: more water is forced through the heat exchanger (${v('hx.secondary.meter')} rises, ${v('bypass.meter')} falls).`,
      'Press STOP on the pump: every flow goes to zero, and the lights on the mimic stop running.',
      'Press TIME ×600 on the mimic and watch the pool warm up (or cool down).',
    ],
    reset:
      'Got in a muddle? Press the big red RESET SIMULATION button: everything goes back to the start.',
  };
}

/** The sign beside the RESET button. */
export const RESET_SIGN = {
  headline: 'Don’t worry, you can’t break anything!',
  body: 'This is a simulation. If you get the plant into a muddle, press this button and everything goes back to the start.',
} as const;
