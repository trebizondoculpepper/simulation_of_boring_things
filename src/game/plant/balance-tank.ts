/**
 * The Olympic pool's balance tank (Dev28, `doc/prompts/done/032-balance-tank-hall.md`):
 * a cast concrete tank, 9 × 6 m inside and 4.5 m deep, under its hall's
 * gantry. The pool's overflow channels fall into it by gravity; the
 * circulation pumps draw from it; a weir at 4.0 m (216 m³) spills to
 * drain; mains make-up tops it up through an air gap.
 *
 * Its level is the plant's slack. Bathers getting in displace water over
 * the pool's edge into the tank; getting out, they leave the pool short,
 * and the pumps fill it again from the tank. With the pumps stopped, the
 * water standing in the channels and return pipework drains back into
 * it; started, they fill them again. A level transmitter reads it; three
 * float switches (HIGH, LOW, LOW LOW) alarm, and LOW LOW trips the pumps
 * so they never run dry. Pure; metres of depth, m³, m³/h, seconds.
 */

export const BALANCE_TANK = {
  /** Inside, metres: length (x), width (z), depth from its floor to the gantry. */
  length: 9,
  width: 6,
  depth: 4.5,
  /** The overflow weir to drain, depth: 216 m³ below it. */
  weir: 4.0,
  /** The float switches' levels, and the make-up's (on below, off above). */
  high: 3.85,
  makeupOn: 2.9,
  makeupOff: 3.05,
  low: 2.0,
  lowLow: 1.0,
  /** The circulation: 2500 m³ over its 3.5 h turnover. */
  circulation: 714,
  /** The mains make-up, through its 54 mm feed. */
  makeup: 30,
  /** What one bather displaces, m³, and how long a crowd takes to get in or out (to 63 %), s. */
  displacement: 0.075,
  batherLag: 300,
  /** The water standing in the channels and return pipework while pumping, m³, and how fast it drains back or fills, s. */
  channels: 6,
  channelLag: 45,
  /** The weir's discharge, m³/h per m^1.5 of head (a 200 mm pipe weir's rim). */
  weirK: 3850,
} as const;

export const AREA = BALANCE_TANK.length * BALANCE_TANK.width;

/** The pool's sessions, for the test rig's bather load. */
export const SESSIONS = [
  { name: 'CLOSED', bathers: 0 },
  { name: 'QUIET', bathers: 40 },
  { name: 'PUBLIC', bathers: 200 },
  { name: 'GALA', bathers: 400 },
] as const;

export type MakeupMode = 'off' | 'auto' | 'hand';
export type PumpState = 'run' | 'stop' | 'tripped';

export interface BalanceTankState {
  /** The water's depth, m. */
  level: number;
  bathers: number;
  session: number;
  pumps: PumpState;
  makeupMode: MakeupMode;
  makeupOpen: boolean;
  /** How far the pool stands below its overflow, m³. */
  poolShort: number;
  /** The water in the channels and returns, m³. */
  channels: number;
  /** Flows, m³/h: from the channels in, to the pumps out, make-up in, over the weir to drain. */
  inflow: number;
  outflow: number;
  makeup: number;
  spill: number;
}

export function newBalanceTank(level = 3.1): BalanceTankState {
  return {
    level,
    bathers: 0,
    session: 0,
    pumps: 'run',
    makeupMode: 'auto',
    makeupOpen: false,
    poolShort: 0,
    channels: BALANCE_TANK.channels,
    inflow: BALANCE_TANK.circulation,
    outflow: BALANCE_TANK.circulation,
    makeup: 0,
    spill: 0,
  };
}

export const volumeOf = (level: number) => level * AREA;

/** What the float switches say. */
export const floats = (s: BalanceTankState) => ({
  high: s.level >= BALANCE_TANK.high,
  low: s.level <= BALANCE_TANK.low,
  lowLow: s.level <= BALANCE_TANK.lowLow,
});

export type BalanceTankEvent =
  | { type: 'session'; to: number }
  | { type: 'makeup'; mode: MakeupMode }
  | { type: 'start' }
  | { type: 'stop' };

export function pressBalanceTank(
  s: BalanceTankState,
  e: BalanceTankEvent,
): BalanceTankState {
  switch (e.type) {
    case 'session':
      return {
        ...s,
        session: Math.max(0, Math.min(SESSIONS.length - 1, e.to)),
      };
    case 'makeup':
      return { ...s, makeupMode: e.mode };
    case 'start':
      // A trip holds until the tank is back above LOW.
      return s.pumps === 'tripped' && s.level <= BALANCE_TANK.low
        ? s
        : { ...s, pumps: 'run' };
    case 'stop':
      return { ...s, pumps: 'stop' };
  }
}

/** Step the tank `dt` seconds (in half-second steps inside). */
export function stepBalanceTank(
  state: BalanceTankState,
  dt: number,
): BalanceTankState {
  let s = state;
  const n = Math.max(1, Math.ceil(dt / 0.5));
  for (let k = 0; k < n; k++) s = stepOnce(s, dt / n);
  return s;
}

function stepOnce(s: BalanceTankState, dt: number): BalanceTankState {
  if (!(dt > 0)) return s;
  const T = BALANCE_TANK;
  const hour = 3600;
  // The bathers getting in or out.
  const target = SESSIONS[s.session].bathers;
  const bathers = target + (s.bathers - target) * Math.exp(-dt / T.batherLag);
  const displaced = (bathers - s.bathers) * T.displacement;
  let poolShort = s.poolShort;
  // Getting in: what the pool is short is made up first, the rest goes over its edge.
  let overEdge = 0;
  if (displaced > 0) {
    const filled = Math.min(poolShort, displaced);
    poolShort -= filled;
    overEdge = displaced - filled;
  } else poolShort -= displaced;
  // The channels fill while the pumps run, and drain back when they stop.
  const running = s.pumps === 'run';
  const held = running ? T.channels : 0;
  const channels = held + (s.channels - held) * Math.exp(-dt / T.channelLag);
  const filling = channels - s.channels;
  // Pumping: the pumps' flow comes back over the edge, less what fills the channels and what the pool is short.
  const pumped = running ? (T.circulation / hour) * dt : 0;
  const refill = Math.min(
    poolShort,
    Math.max(0, pumped - Math.max(0, filling)),
  );
  poolShort -= refill;
  const inflow = Math.max(0, pumped - refill - filling) + overEdge;
  // Make-up, by hand or on its level switch's band.
  const makeupOpen =
    s.makeupMode === 'hand' ||
    (s.makeupMode === 'auto' &&
      (s.level < T.makeupOn || (s.makeupOpen && s.level < T.makeupOff)));
  const makeup = makeupOpen ? (T.makeup / hour) * dt : 0;
  const head = Math.max(0, s.level - T.weir);
  const spill = Math.min(((T.weirK * head ** 1.5) / hour) * dt, head * AREA);
  const volume = Math.max(
    0,
    volumeOf(s.level) + inflow - pumped + makeup - spill,
  );
  const level = Math.min(T.depth, volume / AREA);
  // LOW LOW trips the pumps.
  const pumps: PumpState = running && level <= T.lowLow ? 'tripped' : s.pumps;
  return {
    ...s,
    level,
    bathers,
    poolShort,
    channels,
    pumps,
    makeupOpen,
    inflow: (inflow / dt) * hour,
    outflow: (pumped / dt) * hour,
    makeup: (makeup / dt) * hour,
    spill: (spill / dt) * hour,
  };
}
