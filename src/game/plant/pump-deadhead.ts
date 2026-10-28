/**
 * A centrifugal pump run against a shut valve (mission 106; the owner,
 * 2026-10-28: "dead-head trip: yes"). A pump turns all the power its shaft
 * takes into the water it holds, less what it does as useful work on the
 * water it delivers (ρ·g·Q·H). At its duty the flow carries that heat
 * away and warms by a few hundredths of a kelvin; at shut-off nothing
 * flows, the casing's water heats a few kelvin a minute, and left alone
 * it would boil and wreck the seal. So pool pumps carry a casing
 * thermostat (as Grundfos's and others' dead-head protection): above its
 * setting it trips the starter, which latches off until it is reset at
 * the pump, and a reset is refused until the casing has cooled.
 *
 * The figures are the Grundflow NKC 150-315's (30 kW, after the Grundfos
 * NK 150-315): about 12 kW at the shaft at shut-off, rising to 24 kW at
 * 300 m³/h; the volute's water and iron together about 40 litres' worth
 * of heat capacity. Pure; m³/h, metres, kW, °C, seconds.
 */

export const DEADHEAD = {
  /** Shaft power at shut-off, and at 300 m³/h, kW. */
  shutoffKW: 12,
  ratedKW: 24,
  ratedFlow: 300,
  /** The casing's heat capacity, kJ/K: its water and iron. */
  casingKJperK: 167,
  /** Its loss to the room and the still water either side when nothing flows, kW/K. */
  casingUA: 0.15,
  /** The thermostat: trips above this, °C; a reset is refused until the casing is below this. */
  tripC: 45,
  resetC: 42,
} as const;

/** The shaft's power at a flow, kW. */
export const shaftKW = (flow: number) =>
  DEADHEAD.shutoffKW +
  ((DEADHEAD.ratedKW - DEADHEAD.shutoffKW) * Math.max(0, flow)) /
    DEADHEAD.ratedFlow;

/** The useful work done on the water, kW: ρ·g·Q·H. */
export const hydraulicKW = (flow: number, head: number) =>
  (9.81 * Math.max(0, flow) * Math.max(0, head)) / 3600;

/** What heats the pump's water, kW: the shaft's power less the useful work, while it runs. */
export function pumpHeatKW(running: boolean, flow: number, head: number) {
  if (!running) return 0;
  return Math.max(0, shaftKW(flow) - hydraulicKW(flow, head));
}

/** A flow's heat capacity rate, kW/K. */
const capacity = (m3h: number) => (Math.max(0, m3h) * 1000 * 4.186) / 3600;

/**
 * The casing's water `dt` seconds on: heated by the pump, carried away by
 * the flow through it (at the inlet's temperature), and losing a little
 * to the room; stepped exactly, so any step is stable.
 */
export function stepCasing(
  casingC: number,
  {
    running,
    flow,
    head,
    inletC,
    roomC,
  }: {
    running: boolean;
    flow: number;
    head: number;
    inletC: number;
    roomC: number;
  },
  dt: number,
): number {
  if (!(dt > 0)) return casingC;
  const q = pumpHeatKW(running, flow, head);
  const cf = capacity(flow);
  const ua = DEADHEAD.casingUA;
  const equilibrium = (q + cf * inletC + ua * roomC) / (cf + ua);
  const tau = DEADHEAD.casingKJperK / (cf + ua);
  return equilibrium + (casingC - equilibrium) * Math.exp(-dt / tau);
}

/** Whether the thermostat trips at this casing temperature. */
export const deadheadTrips = (casingC: number) => casingC > DEADHEAD.tripC;

/** Whether a reset at the pump is accepted at this casing temperature. */
export const resetAllowed = (casingC: number) => casingC < DEADHEAD.resetC;

/** How long a dead-headed pump runs before it trips, from `fromC`, seconds (for the placards). */
export function secondsToTrip(fromC: number, roomC = 22) {
  let c = fromC;
  for (let t = 0; t < 3600; t++) {
    c = stepCasing(
      c,
      { running: true, flow: 0, head: 22, inletC: fromC, roomC },
      1,
    );
    if (deadheadTrips(c)) return t + 1;
  }
  return Infinity;
}
