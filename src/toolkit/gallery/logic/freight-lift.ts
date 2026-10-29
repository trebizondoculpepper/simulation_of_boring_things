/**
 * The freight lift (mission 108, the owner, 2026-10-29): a goods lift from
 * the plant room corridor to the building's other floors. The car travels
 * nowhere real: each floor is a room and a landing in it, one entry in
 * `LIFT_FLOORS`, so a new location joins the game by adding a line here.
 * Its state (where the car is, its doors, its calls) lives in the world
 * (`world.lift`); this module is its floor list, its timings and its
 * state machine. Pure: seconds, no DOM.
 */

/**
 * The building's levels, bottom to top, as the floor indicator names
 * them: the car passes every one, whether or not it stops there, and the
 * indicator counts through them.
 */
export const LIFT_LEVELS = ['B2', 'B1', 'G', '1', '2', '3', '4'] as const;
export type LiftLevel = (typeof LIFT_LEVELS)[number];

/**
 * A floor the lift serves: its label (the indicator's, and its button's
 * number), its button's legend, its level, and the room its landing is in
 * (null where that room is not built yet: its button is fitted, unlit and
 * dead).
 */
export interface LiftFloor {
  id: string;
  /** On its button and the indicator: one or two characters. */
  label: string;
  /** Engraved beside its button. */
  legend: string;
  level: LiftLevel;
  /** The room its landing stands in; null while it is not built. */
  room: string | null;
}

/**
 * The floors, bottom to top (the owner, 2026-10-29). B2, the plant room
 * corridor (the owner: "B2, maybe B1 given how steep some of our
 * staircases are": change `level` and `label` here); G, reception, not
 * built (its button fitted, unlit and dead: the owner's open question);
 * 3, the bridge (the owner, 2026-10-29: "since we don't have a turbo
 * lift"), always the bridge, whatever the CONTROL ROOM MODE knob says;
 * 4, the museum's Welcome hall.
 */
export const LIFT_FLOORS: readonly LiftFloor[] = [
  {
    id: 'b2',
    label: 'B2',
    legend: 'PLANT CORRIDOR',
    level: 'B2',
    room: 'main_corridor',
  },
  { id: 'g', label: 'G', legend: 'RECEPTION', level: 'G', room: null },
  { id: '3', label: '3', legend: 'CONTROL ROOM', level: '3', room: 'bridge' },
  { id: '4', label: '4', legend: 'MUSEUM', level: '4', room: 'museum0' },
];

/**
 * The trial lift's floors (dev54, mission 108 stage 2; the owner,
 * 2026-10-29): four dev floors, each a room of its own, alike but for
 * their colours and their big painted numbers, to try the ride masking
 * the floor ahead's loading.
 */
export const TRIAL_FLOORS: readonly LiftFloor[] = [1, 2, 3, 4].map((n) => ({
  id: String(n),
  label: String(n),
  legend: `DEV FLOOR ${n}`,
  level: String(n) as LiftLevel,
  room: `dev54_${n}`,
}));

/** The lifts: the freight lift, and the trial lift of the dev floors. */
export type LiftId = 'freight' | 'trial';

/** Each lift's car (a room of its own) and its floors. */
export const LIFTS: Record<
  LiftId,
  { car: string; floors: readonly LiftFloor[]; name: string }
> = {
  freight: { car: 'freight_lift', floors: LIFT_FLOORS, name: 'FREIGHT LIFT' },
  trial: { car: 'dev54', floors: TRIAL_FLOORS, name: 'TRIAL LIFT' },
};

export const LIFT_IDS = Object.keys(LIFTS) as LiftId[];

/** The lift whose car is `room`, if any. */
export const liftOfCar = (room: string) =>
  LIFT_IDS.find((id) => LIFTS[id].car === room) ?? null;

/** The lift and floor whose landing is in `room`, if any. */
export function landingOfRoom(room: string) {
  for (const id of LIFT_IDS) {
    const floor = LIFTS[id].floors.find((f) => f.room === room);
    if (floor) return { lift: id, floor };
  }
  return null;
}

/** The lift's timings (seconds): a slow, heavy goods lift, shortened for play; the ride's length set by the floor ahead being ready. */
export const LIFT_TIMING = {
  /** Each door's full travel, open or shut. */
  doors: 2.4,
  /** Closing slowly, nudging, after being held too long. */
  nudgeDoors: 6,
  /** Held open after arriving for a car call (common settings 3–5 s). */
  carDwell: 3,
  /** Held open after answering a landing call (common settings 5–8 s). */
  hallDwell: 5,
  /** Held open after DOOR OPEN or the doorway clearing. */
  reopenDwell: 3,
  /** The warning tone sounds this long before the doors close. */
  warning: 1,
  /** Held open by the doorway this long (in all) at one stop, the doors nudge shut. */
  nudgeAfter: 20,
  /** The motor running before the car moves: its judder at the start. */
  start: 0.8,
  /** The car's travel from one level to the next (in reality 4–8 s). */
  perLevel: 2.2,
  /** Levelling in at the floor: the judder at the stop, the brake's clunk at its end. */
  stop: 0.6,
  /** The alarm bell rings this long for each press. */
  alarm: 3,
  /** No ride shorter than this, start to stop, however near the floor: it is a ride. */
  minRide: 7,
  /**
   * While the floor ahead is still being built, the car waits this far
   * short of it (in levels), so the indicator lingers on the level before.
   */
  holdShort: 0.55,
} as const;

/** How the doors stand. */
export type LiftDoors = 'shut' | 'opening' | 'open' | 'closing';

/** The car's journey, while it makes one. */
export interface LiftTrip {
  /** The floor it left. */
  from: string;
  /** The floor it is going to. */
  to: string;
  /** Seconds since the motor started. */
  elapsed: number;
  /**
   * Whether the floor ahead is built and ready to be seen (the destination
   * room's `lift/ready`): until it is, the car never arrives, lingering
   * short of it, so the walker never sees it load. A reloaded trip is
   * told again by the car.
   */
  ready: boolean;
}

/** The lift as the world keeps it. */
export interface LiftState {
  /** The floor the car stands at (or last left, while travelling). */
  floor: string;
  doors: LiftDoors;
  /** How far open the doors stand: 0 shut, 1 open. */
  open: number;
  /** Seconds left before open doors close. */
  dwell: number;
  /** The car's floor buttons pressed, each lit until its floor is reached. */
  carCalls: string[];
  /** The landings' call buttons pressed, each lit until the car arrives there. */
  hallCalls: string[];
  /** The way the car is going, or will go next: kept until no call lies that way. */
  direction: 'up' | 'down' | null;
  trip: LiftTrip | null;
  /** Someone in the doorway (the light curtain): the doors stay open, or reopen. */
  held: boolean;
  /** Seconds the doorway has held the doors at this stop. */
  heldFor: number;
  /** Closing slowly with the buzzer, the light curtain ignored: held too long. */
  nudging: boolean;
  /** Seconds left of the alarm bell. */
  alarm: number;
}

/** The lift as first found: at its lowest floor, its doors shut, nobody calling. */
export function newLift(floors = LIFT_FLOORS): LiftState {
  return {
    floor: floors[0].id,
    doors: 'shut',
    open: 0,
    dwell: 0,
    carCalls: [],
    hallCalls: [],
    direction: null,
    trip: null,
    held: false,
    heldFor: 0,
    nudging: false,
    alarm: 0,
  };
}

/** A floor by id. */
export const liftFloor = (id: string, floors = LIFT_FLOORS) =>
  floors.find((f) => f.id === id) ?? null;

/** Whether a floor's button works: its landing's room is built. */
export const floorInService = (id: string, floors = LIFT_FLOORS) =>
  Boolean(liftFloor(id, floors)?.room);

/** The floor whose landing is in `room`, if any. */
export const floorOfRoom = (room: string, floors = LIFT_FLOORS) =>
  floors.find((f) => f.room === room) ?? null;

const levelIndex = (id: string, floors: readonly LiftFloor[]) =>
  LIFT_LEVELS.indexOf(liftFloor(id, floors)?.level ?? 'B2');

/** The levels between two floors. */
export const tripLevels = (from: string, to: string, floors = LIFT_FLOORS) =>
  Math.abs(levelIndex(to, floors) - levelIndex(from, floors));

/**
 * The car's running time between two floors: its levels at its speed, but
 * never so short that the ride, start to stop, is under `minRide`.
 */
export function runSeconds(from: string, to: string, floors = LIFT_FLOORS) {
  const { start, stop, perLevel, minRide } = LIFT_TIMING;
  return Math.max(
    tripLevels(from, to, floors) * perLevel,
    minRide - start - stop,
  );
}

/** A trip's whole time, if the floor ahead is ready in time: the start, the run, the stop. */
export function tripSeconds(from: string, to: string, floors = LIFT_FLOORS) {
  return LIFT_TIMING.start + runSeconds(from, to, floors) + LIFT_TIMING.stop;
}

/** The moment in a trip (seconds since the start) at which the car waits for a floor not yet ready: `holdShort` levels short of it. */
export function holdSeconds(from: string, to: string, floors = LIFT_FLOORS) {
  const levels = tripLevels(from, to, floors);
  const k = levels > 0 ? Math.max(0, 1 - LIFT_TIMING.holdShort / levels) : 0.5;
  return LIFT_TIMING.start + runSeconds(from, to, floors) * k;
}

/**
 * Where the car is, in levels (0 = B2), as a number: still through the
 * start, then the levels at an even speed, then still through the stop.
 */
export function carLevel(lift: LiftState, floors = LIFT_FLOORS): number {
  const here = levelIndex(lift.floor, floors);
  if (!lift.trip) return here;
  const a = levelIndex(lift.trip.from, floors);
  const b = levelIndex(lift.trip.to, floors);
  const moving = lift.trip.elapsed - LIFT_TIMING.start;
  const span = runSeconds(lift.trip.from, lift.trip.to, floors);
  const k = Math.min(1, Math.max(0, moving / span));
  return a + (b - a) * k;
}

/** What the floor indicator shows: the level the car is nearest. */
export function indicatorLabel(lift: LiftState, floors = LIFT_FLOORS): string {
  const at = Math.round(carLevel(lift, floors));
  return LIFT_LEVELS[Math.min(LIFT_LEVELS.length - 1, Math.max(0, at))];
}

/** The way the car is travelling, for the indicators' arrows while it runs. */
export function liftDirection(
  lift: LiftState,
  floors = LIFT_FLOORS,
): 'up' | 'down' | null {
  if (!lift.trip) return null;
  const d =
    levelIndex(lift.trip.to, floors) - levelIndex(lift.trip.from, floors);
  return d > 0 ? 'up' : d < 0 ? 'down' : null;
}

/**
 * The landing's lit direction arrow, standing at a floor with its doors
 * not shut: the way it will go next, if any call is waiting.
 */
export function arrivalArrow(lift: LiftState, floors = LIFT_FLOORS) {
  if (lift.trip || lift.doors === 'shut') return null;
  const next = nextStop(lift, floors);
  if (!next || next === lift.floor) return null;
  return levelIndex(next, floors) > levelIndex(lift.floor, floors)
    ? ('up' as const)
    : ('down' as const);
}

/** The phase of a trip: the motor starting, the car running, waiting short of a floor not yet ready, levelling in. */
export function tripPhase(
  lift: LiftState,
  floors = LIFT_FLOORS,
): 'start' | 'run' | 'wait' | 'stop' | null {
  if (!lift.trip) return null;
  const { elapsed, from, to, ready } = lift.trip;
  if (elapsed < LIFT_TIMING.start) return 'start';
  if (elapsed >= tripSeconds(from, to, floors) - LIFT_TIMING.stop)
    return 'stop';
  if (!ready && elapsed >= holdSeconds(from, to, floors)) return 'wait';
  return 'run';
}

/** Whether a car button's lamp is lit: pressed, until its floor is reached. */
export const carButtonLit = (lift: LiftState, id: string) =>
  lift.carCalls.includes(id);

/** Whether a landing's call button is lit: pressed, until the car arrives there. */
export const callLit = (lift: LiftState, id: string) =>
  lift.hallCalls.includes(id);

/**
 * Whether the car stands at `id` with its doors open enough to pass: the
 * landing there and the car are one doorway.
 */
export const openAt = (lift: LiftState, id: string, enough = 0.02) =>
  !lift.trip && lift.floor === id && lift.open > enough;

/** Whether the warning tone sounds: the doors about to close, or nudging. */
export const closingWarning = (lift: LiftState) =>
  !lift.trip &&
  ((lift.doors === 'open' && !lift.held && lift.dwell <= LIFT_TIMING.warning) ||
    (lift.nudging && lift.doors !== 'shut'));

/**
 * The next floor to serve (collective control): the nearest call ahead in
 * the way the car is going; when none lies that way, the nearest the
 * other way. A call at the floor the car stands at comes first.
 */
export function nextStop(lift: LiftState, floors = LIFT_FLOORS): string | null {
  const calls = [...new Set([...lift.carCalls, ...lift.hallCalls])];
  if (!calls.length) return null;
  const here = levelIndex(lift.floor, floors);
  if (calls.includes(lift.floor)) return lift.floor;
  const by = (sign: number) =>
    calls
      .map((c) => ({ c, d: (levelIndex(c, floors) - here) * sign }))
      .filter((x) => x.d > 0)
      .sort((a, b) => a.d - b.d)[0]?.c ?? null;
  const first = lift.direction === 'down' ? -1 : 1;
  return by(first) ?? by(-first);
}

/** The doors opening (or reopening), held at least `dwell` once open. */
function openDoors(lift: LiftState, dwell: number): LiftState {
  if (lift.nudging) return lift;
  const d = Math.max(lift.dwell, dwell);
  if (lift.doors === 'open') return { ...lift, dwell: d };
  return { ...lift, doors: 'opening', dwell: d };
}

/** What a press asks of the lift: a floor's id, or `open`, `close` or `alarm`. */
export type LiftButton = string;

/**
 * A landing's call for floor `id`: at the floor already (and not leaving),
 * the doors open, held the landing dwell; otherwise lit until the car
 * arrives. A dead floor's button (its room not built) does nothing.
 */
export function callLift(
  lift: LiftState,
  id: string,
  floors = LIFT_FLOORS,
): LiftState {
  if (!floorInService(id, floors)) return lift;
  if (!lift.trip && lift.floor === id)
    return openDoors(lift, LIFT_TIMING.hallDwell);
  if (lift.hallCalls.includes(id)) return lift;
  return { ...lift, hallCalls: [...lift.hallCalls, id] };
}

/** A press of one of the car panel's buttons. */
export function pressLift(
  lift: LiftState,
  button: LiftButton,
  floors = LIFT_FLOORS,
): LiftState {
  if (button === 'alarm') return { ...lift, alarm: LIFT_TIMING.alarm };
  if (button === 'open')
    return lift.trip ? lift : openDoors(lift, LIFT_TIMING.reopenDwell);
  if (button === 'close')
    return lift.doors === 'open' && !lift.held
      ? { ...lift, dwell: Math.min(lift.dwell, LIFT_TIMING.warning * 0.5) }
      : lift;
  if (!floorInService(button, floors)) return lift;
  // The floor it stands at: the doors reopen.
  if (!lift.trip && lift.floor === button)
    return openDoors(lift, LIFT_TIMING.carDwell);
  if (lift.carCalls.includes(button)) return lift;
  return { ...lift, carCalls: [...lift.carCalls, button] };
}

/** Someone in the doorway, or not: the light curtain, told by the room the walker is in. */
export function holdLift(lift: LiftState, held: boolean): LiftState {
  if (lift.held === held) return lift;
  const next = { ...lift, held };
  if (!held)
    return lift.doors === 'open'
      ? { ...next, dwell: Math.max(lift.dwell, LIFT_TIMING.reopenDwell) }
      : next;
  return lift.doors === 'closing' && !lift.nudging
    ? { ...next, doors: 'opening' }
    : next;
}

/**
 * The floor ahead built and ready to be seen (its room's `lift/ready`): the
 * car may arrive. Ignored unless it is the trip's floor.
 */
export function liftReady(lift: LiftState, id: string): LiftState {
  if (!lift.trip || lift.trip.to !== id || lift.trip.ready) return lift;
  return { ...lift, trip: { ...lift.trip, ready: true } };
}

/** Whether the car is waiting for the floor ahead to be ready. */
export const waitingForFloor = (lift: LiftState, floors = LIFT_FLOORS) =>
  tripPhase(lift, floors) === 'wait';

/** Arrived at `to`: its calls answered, the doors opening, held as long as the calls there ask. */
function arrive(lift: LiftState, to: string): LiftState {
  const hall = lift.hallCalls.includes(to);
  return {
    ...lift,
    floor: to,
    trip: null,
    carCalls: lift.carCalls.filter((c) => c !== to),
    hallCalls: lift.hallCalls.filter((c) => c !== to),
    doors: 'opening',
    dwell: hall ? LIFT_TIMING.hallDwell : LIFT_TIMING.carDwell,
    heldFor: 0,
    nudging: false,
  };
}

/** One small step of the lift (`dt` no more than a tenth of a second). */
function tick(
  lift: LiftState,
  dt: number,
  floors: readonly LiftFloor[],
): LiftState {
  let l = lift;
  if (l.alarm > 0) l = { ...l, alarm: Math.max(0, l.alarm - dt) };
  if (l.trip) {
    const { from, to, ready } = l.trip;
    // Short of a floor not yet ready, the car waits, its motor running.
    const cap = ready ? Infinity : holdSeconds(from, to, floors);
    if (l.trip.elapsed >= cap) return l;
    const elapsed = Math.min(cap, l.trip.elapsed + dt);
    if (elapsed >= tripSeconds(from, to, floors)) return arrive(l, to);
    return { ...l, trip: { ...l.trip, elapsed } };
  }
  switch (l.doors) {
    case 'opening': {
      const open = Math.min(1, l.open + dt / LIFT_TIMING.doors);
      return open >= 1 ? { ...l, open: 1, doors: 'open' } : { ...l, open };
    }
    case 'open': {
      if (l.held) {
        const heldFor = l.heldFor + dt;
        return heldFor >= LIFT_TIMING.nudgeAfter
          ? { ...l, heldFor, nudging: true, doors: 'closing', dwell: 0 }
          : { ...l, heldFor };
      }
      const dwell = l.dwell - dt;
      return dwell <= 0
        ? { ...l, dwell: 0, doors: 'closing' }
        : { ...l, dwell };
    }
    case 'closing': {
      if (l.held && !l.nudging) return { ...l, doors: 'opening' };
      const rate =
        dt / (l.nudging ? LIFT_TIMING.nudgeDoors : LIFT_TIMING.doors);
      const open = Math.max(0, l.open - rate);
      return open <= 0
        ? { ...l, open: 0, doors: 'shut', nudging: false, heldFor: 0 }
        : { ...l, open };
    }
    case 'shut': {
      const next = nextStop(l, floors);
      if (next === null) return l.direction ? { ...l, direction: null } : l;
      if (next === l.floor) return arrive(l, next);
      const direction =
        levelIndex(next, floors) > levelIndex(l.floor, floors) ? 'up' : 'down';
      return {
        ...l,
        direction,
        trip: { from: l.floor, to: next, elapsed: 0, ready: false },
      };
    }
  }
}

/** Whether nothing can change until someone presses something (or the floor ahead is ready). */
function atRest(l: LiftState, floors: readonly LiftFloor[]) {
  if (l.alarm > 0) return false;
  if (l.trip)
    return (
      !l.trip.ready &&
      l.trip.elapsed >= holdSeconds(l.trip.from, l.trip.to, floors)
    );
  return (
    l.doors === 'shut' &&
    !l.direction &&
    !l.carCalls.length &&
    !l.hallCalls.length
  );
}

/**
 * The lift `delta` seconds on: in steps of a tenth of a second at most,
 * stopping early once at rest (so a long skip of the world's clock costs
 * nothing). The same object back when nothing has changed.
 */
export function stepLift(
  lift: LiftState,
  delta: number,
  floors = LIFT_FLOORS,
): LiftState {
  let l = lift;
  let left = delta;
  while (left > 1e-9 && !atRest(l, floors)) {
    const dt = Math.min(0.1, left);
    l = tick(l, dt, floors);
    left -= dt;
  }
  return l;
}
