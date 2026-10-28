import {
  NODES,
  OZONE,
  PLANT,
  TAGS,
  connectionsOf,
  deadheadTiming,
  filterSettings,
  hall2Readings,
  newHall2,
  shortTag,
} from '../../../game/plant/museum-2-clean-water';
import type { MachineId } from '../../../game/plant/museum-2-clean-water';
import { RESET_SIGN } from './ideal-pool-plant-placards';
import type { PlacardIcon } from './ideal-pool-plant-placards';

export { RESET_SIGN };

/**
 * Hall 2's words (107b): its entrance panel, a placard at each station of
 * the water's path, left to right, the filter's settings card ("so pool
 * pros can critique my settings", the owner, 2026-10-28) and the activity
 * card. Names, tags, connections and every number come from the model
 * (`museum-2-clean-water.ts`); only the explanation is written here. No
 * energy and no chlorine figures: one concept per hall. Pure.
 */

export interface Hall2Placard {
  station: number;
  of: MachineId;
  icon: PlacardIcon | 'ozone' | 'uv';
  headline: string;
  /** The machine's name and tag, from the model. */
  title: string;
  /** What it is joined to, from the schematic. */
  joins: string;
  body: string;
  fact: string;
  tryIt: string;
}

const node = (id: MachineId) => NODES.find((n) => n.id === id)!;
const titleOf = (id: MachineId) => `${node(id).name} · ${TAGS[id]}`;
const fmt = (v: number, places = 0) =>
  v.toLocaleString('en-GB', {
    minimumFractionDigits: places,
    maximumFractionDigits: places,
  });

function joins(id: MachineId) {
  const { from, to } = connectionsOf(id);
  const list = (names: string[]) =>
    [...new Set(names)]
      .map((n) => n.replace(/^Ideal /, 'ideal ').toLowerCase())
      .join(' and ');
  return [
    from.length ? `From the ${list(from)}` : '',
    to.length ? `to the ${list(to)}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}

/** The hall's own figures, from the model. */
export function hall2Facts() {
  const r = hall2Readings(newHall2());
  const f = filterSettings();
  const d = deadheadTiming();
  return {
    flow: r.flows.toPool,
    turnover: r.turnover,
    passesPerDay: 24 / r.turnover,
    pi2: r.flows.gauge['pump.discharge.pi'],
    filter: f,
    trip: d.trip,
    reset: d.reset,
    ozone: r.ozone.ozone,
    applied: r.ozone.applied,
    contactMinutes: r.ozone.contact / 60,
    contactResidual: r.ozone.contactResidual,
    carbonResidual: r.ozone.carbonResidual,
    sideShare: r.ozone.sideFlow / r.flows.toPool,
    monitorWarning: OZONE.monitor.warning,
    monitorStop: OZONE.monitor.shutdown,
    uvFull: PLANT.uvFull,
    uvHours: PLANT.uvHoursStart,
    poolC: PLANT.poolC,
    poolVolume: PLANT.poolVolume,
  };
}

/** The placards, one at each station, left to right. */
export function hall2Placards(): Hall2Placard[] {
  const k = hall2Facts();
  const v = shortTag;
  const p = (
    station: number,
    of: MachineId,
    icon: Hall2Placard['icon'],
    headline: string,
    body: string,
    fact: string,
    tryIt: string,
  ): Hall2Placard => ({
    station,
    of,
    icon,
    headline,
    title: titleOf(of),
    joins: joins(of),
    body,
    fact,
    tryIt,
  });
  return [
    p(
      1,
      'tank',
      'tank',
      'The balance tank',
      'The pool brims over its edge into channels all round, and the water falls by gravity into this tank. The surface, where the grease and dirt float, is skimmed all the time. The tank also takes the water the swimmers push out of the pool, and the mains tops it up through a float valve.',
      `Its level gauge ${v('tank.li')} shows ${fmt(PLANT.tankVolume)} m³ at its working level.`,
      `Shut the make-up valve ${v('tank.makeup.iso')} and backwash for a long time: the tank runs down until its low level stops the pump.`,
    ),
    p(
      2,
      'pump',
      'pump',
      'The pump',
      'You met a pump in Hall 1. This one draws from the balance tank and pushes all the pool’s water through the plant. Its two gauges show what it adds: suction on one side, discharge on the other.',
      `A pump working against a shut valve turns all its power into heat in the little water trapped inside it. This one trips after about ${fmt(k.trip)} seconds, and can be reset at the pump about ${fmt(k.reset)} seconds later, once it has cooled.`,
      `Shut the filter outlet ${v('filter.outlet.iso')} with the pump running, wait for TRIP, open it again, then press RESET and START at the pump.`,
    ),
    p(
      3,
      'filter',
      'filter',
      'The sand filter',
      `A metre of sand catches what the swimmers bring. As it fills, the gap between its two gauges (${v('filter.pdi')}) grows and the flow falls. Backwashing reverses the water through the five valves ${v('filter.inlet.iso')} to ${v('filter.rinse.iso')}: the sand lifts and the dirt goes to the drain.`,
      `Each drop of the pool passes through the sand about ${fmt(k.passesPerDay)} times a day: the whole pool every ${fmt(k.turnover, 1)} hours.`,
      'Speed time up to ×3600 for a day of swimming, then backwash: watch the sight glass run brown, then clear.',
    ),
    p(
      4,
      'generator',
      'ozone',
      'Ozone',
      'Ozone is oxygen with a third atom. The generator makes it from dry air with an electric discharge, and a small booster pump drives some of the water through a venturi that sucks the gas in. Ozone oxidises the fine dirt the sand lets through and kills bugs that chlorine struggles with, such as Cryptosporidium.',
      `It makes ${fmt(k.ozone)} g of ozone an hour: about ${fmt(k.applied, 1)} g in every m³ of water.`,
      `Turn the generator’s output knob, or stop the booster ${v('booster')}: with no suction at the venturi the generator trips.`,
    ),
    p(
      5,
      'contact',
      'tank',
      'The contact tank',
      'The ozonised water spends a couple of minutes here, long enough for the ozone to do its work. The gas that does not dissolve rises to the top and goes through the destructor on its roof, which turns it back into oxygen.',
      `The water stays about ${fmt(k.contactMinutes, 1)} minutes; ${v('toCarbon.ai')} reads the ozone left as it leaves, about ${fmt(k.contactResidual, 1)} mg/l.`,
      `Switch off the destructor ${v('destructor')}: ozone reaches the air, the monitor ${v('hall.ai')} alarms and stops the generator. Switch it on, wait for the air to clear, and reset both.`,
    ),
    p(
      6,
      'carbon',
      'filter',
      'The carbon filter',
      'Ozone must never reach the swimmers. A bed of activated carbon destroys what is left of it, so the water leaves with almost none.',
      `${v('toUv.ai')} reads about ${fmt(k.carbonResidual, 3)} mg/l after the carbon.`,
      `Compare ${v('toCarbon.ai')} before the carbon with ${v('toUv.ai')} after it.`,
    ),
    p(
      7,
      'uv',
      'uv',
      'Ultraviolet light',
      'A medium-pressure lamp shines through the water as it passes. Its ultraviolet breaks down the chloramines that make a pool smell, and kills bugs. Like ozone it leaves nothing behind in the pool, which is why a pool still needs chlorine: see Hall 3.',
      `Its sensor ${v('uv.ri')} reads ${fmt(k.uvFull)} W/m² at full output; its lamp has run ${fmt(k.uvHours)} hours.`,
      'Stop the pump: with no water flowing the lamp goes out. Start it again and watch the lamp warm up.',
    ),
    p(
      8,
      'pool',
      'pool',
      'Back to the pool',
      `The flowmeter ${v('returnMain.meter')} tells the operator how much water is being cleaned: flow divided by the pool’s volume gives its turnover.`,
      `${fmt(k.flow)} m³/h into a ${fmt(k.poolVolume)} m³ pool: once round every ${fmt(k.turnover, 1)} hours. The water stays at ${fmt(k.poolC)} °C: heating was Hall 1.`,
      `Throttle ${v('filter.outlet.iso')} notch by notch and watch ${v('returnMain.meter')} fall.`,
    ),
  ];
}

/** The filter's settings card: the plant's numbers, plainly, for a pool professional to check. */
export function filterSettingsCard() {
  const f = filterSettings();
  return {
    headline: 'Our filter’s settings',
    lines: [
      `Bed: ${fmt(f.diameter, 1)} m across, ${fmt(f.area, 2)} m² of sand, ${fmt(f.bedDepth, 1)} m deep.`,
      `Flow: ${fmt(f.flow)} m³/h, a filtration velocity of ${fmt(f.velocity)} m/h, at the fast end of what a commercial sand filter is rated for.`,
      `Turnover: ${fmt(f.turnover, 1)} hours for the whole pool.`,
      `Pressure drop across the bed: ${fmt(f.cleanBar, 2)} bar clean; we backwash at ${fmt(f.dueBar, 2)} bar.`,
      `Backwash: ${fmt(f.backwashFlow)} m³/h up through the bed (${fmt(f.backwashVelocity)} m/h) for ${fmt(f.backwashMinutes)} minutes, about ${fmt(f.toWaste)} m³ to drain, then a rinse.`,
    ],
    invite: 'Think these settings are wrong? Tell us.',
  };
}

/** The entrance panel. */
export function hall2Entrance() {
  const k = hall2Facts();
  return {
    headline: 'Clean water',
    bigIdea:
      'Swimmers bring dirt, sweat and skin with them. The plant takes it out all day: it strains the water through sand, then treats it with ozone and ultraviolet light.',
    fact: `This pool’s whole volume goes through the plant every ${fmt(k.turnover, 1)} hours.`,
    route: hall2Placards().map((p) => ({
      station: p.station,
      name: p.headline,
    })),
    reset:
      'Can’t break it: the big red RESET button puts everything back to the start.',
  };
}

/** The activity card: things to try, each with what to watch. */
export function hall2ActivityCard() {
  const v = shortTag;
  const k = hall2Facts();
  return {
    title: 'Try this!',
    steps: [
      `Shut the filter outlet ${v('filter.outlet.iso')} notch by notch: ${v('pump.discharge.pi')} rises, ${v('returnMain.meter')} falls to nothing.`,
      `Leave it shut: after about ${fmt(k.trip)} seconds the pump trips. Open the valve, wait about ${fmt(k.reset)} seconds, then RESET and START at the pump.`,
      'Press TIME ×3600 for 24 seconds: a day of swimming. Watch PDI1 climb and the flow fall.',
      `Backwash: STOP the pump. Shut ${v('filter.inlet.iso')} and ${v('filter.outlet.iso')}; open ${v('filter.backwash-in.iso')} and ${v('filter.backwash-out.iso')}. START, and watch ${v('backwashOut.sg')} run brown, then clear.`,
      `Rinse: STOP. Shut ${v('filter.backwash-in.iso')} and ${v('filter.backwash-out.iso')}; open ${v('filter.inlet.iso')} and ${v('filter.rinse.iso')}. START for a minute.`,
      `Back to service: STOP, shut ${v('filter.rinse.iso')}, open ${v('filter.outlet.iso')}, START.`,
      `Switch off the ozone destructor ${v('destructor')} at ×60: watch ${v('hall.ai')} rise until it stops the generator.`,
      'Stop the pump: the UV lamp goes out and the ozone generator waits for the water to flow again.',
    ],
    warning: `Why stop the pump first? Swinging a valve on moving water stops it suddenly: a pressure surge, “water hammer”. Try it with the pump running and watch ${v('pump.discharge.pi')} kick.`,
  };
}
