import { DAY_TANKS } from '../../../../game/plant/chemical-distribution';
import type { Chemical } from '../../../../game/plant/chemicals';
import type {
  TerminalCommand,
  TerminalFeed,
} from '../../industrial-control/logic/ot216-terminal';

/**
 * The chemical distribution's control box and its two lines, as dev44's
 * prototype runs them (prompt 091; the owner, 2026-10-27): its own trial
 * state, not the world's, until the owner has agreed the design and the
 * box and terminals go into the wet hall. Pure.
 *
 * - One control box for both chemicals (a single point of failure): its
 *   door isolator, its MCB and its controller (a small PLC). It is live
 *   while the wet hall has power, its isolator is on and its MCB closed;
 *   its controller runs a couple of seconds after it comes live, unless
 *   it has hung (cleared by switching it off and on at its isolator).
 * - The box holds each day tank's low and high levels (litres), whether
 *   it is inhibited (STOP) and whether it is to be filled now: its
 *   retentive memory, kept through a power cut.
 * - A tank calls at its own low level and stops at its own high; FILL
 *   NOW calls it at once, to be filled to its high in its turn; an
 *   inhibited tank never calls and is not served, a fill in progress
 *   ended.
 * - Each line's selector in AUTO opens the outlet the box tells it,
 *   serving the calls one at a time, in turn; with the box not running it
 *   opens none. In HAND it opens its own pick, box or no box, while that
 *   tank is below its fixed high switch (90%).
 * - Each transfer pump's HAND · OFF · AUTO and trip RESET stay at its
 *   store (local): in AUTO it runs on the box's remote-run relay, in HAND
 *   whenever an outlet is open. Any tank's high-high (98%), a hard-wired
 *   switch and not settable, trips the line until RESET.
 * - Each terminal is linked to the box by its own cable: a broken link
 *   leaves that terminal at NO COMMS, the other carrying on.
 * - Each store is ideal: drawn down by the transfers and, near empty,
 *   refilled by a delivery; it reads low below 10%.
 */

export type Hoa = 'hand' | 'off' | 'auto';

export const TRIAL_CHEMICALS: readonly Chemical[] = ['hypochlorite', 'acid'];

/** Each day tank's name on a terminal, in its selector's outlet order. */
export const TANK_NAMES = [
  'PL1 LOUNGE',
  'PL2 OLYMPIC',
  'PL3 JACUZZI',
  'PL4 FOOTBATH',
] as const;

export const CONTROL = {
  /** A transfer pump's flow through an open outlet, litres a minute. */
  pumpLpm: 20,
  /** The levels a new box holds, a share of each tank: today's switches. */
  low: 0.2,
  high: 0.9,
  /** The selector's own high switch, in HAND. */
  handHigh: 0.9,
  /** The hard-wired high-high trip: a safety, not settable. */
  highHigh: 0.98,
  /** Setting limits, shares of the tank. */
  minLow: 0.1,
  maxHigh: 0.95,
  minBand: 0.1,
  /** The store: its size, its pump's cut-out, its low alarm, and when a delivery comes. */
  storeLitres: 4000,
  storeCutOut: 0.02,
  storeLowAlarm: 0.1,
  storeDelivery: 0.05,
  /** Seconds the controller takes to start once its box is live. */
  bootSeconds: 2,
} as const;

export interface TrialTank {
  capacity: number;
  litres: number;
  /** Its low and high levels, litres, held by the box. */
  lowL: number;
  highL: number;
  inhibited: boolean;
  fillNow: boolean;
  /** Called at its low (or FILL NOW), and not yet filled to its high. */
  calling: boolean;
  /** Trial seconds when its last fill ended, if it has had one. */
  lastFilled: number | null;
  /** What its pool doses from it, litres a minute. */
  doseLpm: number;
}

export interface TrialLine {
  tanks: TrialTank[];
  store: number;
  /** Its selector, on the wet hall's dirty side: following the box, or its own pick. */
  mode: 'auto' | 'hand';
  pick: number;
  /** The outlet open now, if any. */
  serving: number | null;
  hoa: Hoa;
  tripped: boolean;
}

export interface ControlBox {
  /** Its door isolator, on the front. */
  isolator: boolean;
  /** Its MCB, inside: tripped open until reset. */
  mcbTripped: boolean;
  /** Its controller hung: it answers nothing until restarted. */
  hung: boolean;
  /** Seconds since it last came live (its controller starting). */
  live: number;
  /** Each terminal's cable to it. */
  links: Record<Chemical, boolean>;
}

export interface ChemControlTrial {
  time: number;
  /** The wet hall's power, which feeds the box and the selectors' valves. */
  hallPower: boolean;
  box: ControlBox;
  lines: Record<Chemical, TrialLine>;
  /** What was set and commanded at the terminals, newest first. */
  log: string[];
}

/** A new tank's levels in whole litres. */
const levels = (capacity: number) => ({
  lowL: Math.round(capacity * CONTROL.low),
  highL: Math.round(capacity * CONTROL.high),
});

/** Where each tank stands as the trial begins, a share of full. */
const START: Record<Chemical, readonly number[]> = {
  hypochlorite: [0.7, 0.18, 0.55, 0.4],
  acid: [0.18, 0.6, 0.45, 0.75],
};

export function newChemControlTrial(): ChemControlTrial {
  const line = (c: Chemical): TrialLine => ({
    tanks: DAY_TANKS[c].map(({ litres }, i) => ({
      capacity: litres,
      litres: litres * START[c][i],
      ...levels(litres),
      inhibited: false,
      fillNow: false,
      calling: false,
      lastFilled: null,
      // Enough that every tank comes round to call, never more than the
      // pump can make up.
      doseLpm: Math.min(4, litres * 0.015),
    })),
    store: CONTROL.storeLitres * (c === 'acid' ? 0.6 : 0.85),
    mode: 'auto',
    pick: 0,
    serving: null,
    hoa: 'auto',
    tripped: false,
  });
  return {
    time: 0,
    hallPower: true,
    box: {
      isolator: true,
      mcbTripped: false,
      hung: false,
      live: CONTROL.bootSeconds,
      links: { hypochlorite: true, acid: true },
    },
    lines: { hypochlorite: line('hypochlorite'), acid: line('acid') },
    log: [],
  };
}

/** Whether the box has power: the hall's, through its isolator and MCB. */
export const boxLive = (s: ChemControlTrial) =>
  s.hallPower && s.box.isolator && !s.box.mcbTripped;

/** Whether its controller is running: live, started, not hung. */
export const controllerRunning = (s: ChemControlTrial) =>
  boxLive(s) && s.box.live >= CONTROL.bootSeconds && !s.box.hung;

/** Whether terminal `c` can talk to the box. */
export const terminalComms = (s: ChemControlTrial, c: Chemical) =>
  controllerRunning(s) && s.box.links[c];

/** Whether `c`'s transfer pump runs now. */
export function pumpRuns(s: ChemControlTrial, c: Chemical): boolean {
  const line = s.lines[c];
  if (!s.hallPower || line.tripped || line.serving === null) return false;
  if (line.store <= CONTROL.storeLitres * CONTROL.storeCutOut) return false;
  if (line.hoa === 'off') return false;
  // AUTO runs on the box's remote-run relay.
  return line.hoa === 'hand' || controllerRunning(s);
}

/** A tank's limits for its low and high levels, whole litres. */
export function levelLimits(
  tank: Pick<TrialTank, 'capacity' | 'lowL' | 'highL'>,
) {
  const band = Math.ceil(tank.capacity * CONTROL.minBand);
  return {
    low: {
      min: Math.ceil(tank.capacity * CONTROL.minLow),
      max: tank.highL - band,
    },
    high: {
      min: tank.lowL + band,
      max: Math.floor(tank.capacity * CONTROL.maxHigh),
    },
  };
}

/** The step a figure changes by on a terminal, litres, by the tank's size. */
export const levelStep = (capacity: number) =>
  capacity <= 60 ? 1 : capacity <= 300 ? 5 : 10;

/** A tank's state as a terminal says it. */
export function tankState(
  line: TrialLine,
  i: number,
): 'OK' | 'CALL' | 'FILL' | 'INHIB' {
  const tank = line.tanks[i];
  if (tank.inhibited) return 'INHIB';
  if (line.serving === i) return 'FILL';
  return tank.calling ? 'CALL' : 'OK';
}

/** The line's alarms now: any tank at high-high, the line tripped, the store low. */
export function lineAlarms(line: TrialLine): { code: string; text: string }[] {
  const out: { code: string; text: string }[] = [];
  line.tanks.forEach((t, i) => {
    if (t.litres >= t.capacity * CONTROL.highHigh)
      out.push({ code: `hh${i}`, text: `PL${i + 1} HI-HI` });
  });
  if (line.tripped) out.push({ code: 'trip', text: 'LINE TRIPPED' });
  if (line.store <= CONTROL.storeLitres * CONTROL.storeLowAlarm)
    out.push({ code: 'store', text: 'STORE LOW' });
  return out;
}

function serve(s: ChemControlTrial, line: TrialLine): number | null {
  if (line.tripped || !s.hallPower) return null;
  if (line.mode === 'hand') {
    const t = line.tanks[line.pick];
    return t && t.litres < t.capacity * CONTROL.handHigh ? line.pick : null;
  }
  if (!controllerRunning(s)) return null;
  const ok = (i: number) => line.tanks[i].calling && !line.tanks[i].inhibited;
  if (line.serving !== null && ok(line.serving)) return line.serving;
  const n = line.tanks.length;
  const from = line.serving === null ? 0 : line.serving + 1;
  for (let k = 0; k < n; k++) {
    const i = (from + k) % n;
    if (ok(i)) return i;
  }
  return null;
}

/** The trial `dt` seconds on. */
export function stepChemControl(
  s: ChemControlTrial,
  dt: number,
): ChemControlTrial {
  const time = s.time + dt;
  const live = boxLive(s);
  const box: ControlBox = {
    ...s.box,
    live: live ? s.box.live + dt : 0,
  };
  let next: ChemControlTrial = { ...s, time, box };
  const running = controllerRunning(next);
  const lines = { ...s.lines };
  for (const c of TRIAL_CHEMICALS) {
    let line = s.lines[c];
    let tripped = line.tripped;
    // The box's levels, only while its controller runs; the high-high is
    // hard-wired and trips whatever the box is doing.
    let tanks = line.tanks.map((t) => {
      if (t.litres >= t.capacity * CONTROL.highHigh) tripped = true;
      if (!running) return t;
      if (t.inhibited)
        return t.calling || t.fillNow
          ? { ...t, calling: false, fillNow: false }
          : t;
      if (t.litres >= t.highL)
        return t.calling || t.fillNow
          ? { ...t, calling: false, fillNow: false }
          : t;
      if (t.litres <= t.lowL || t.fillNow)
        return t.calling ? t : { ...t, calling: true };
      return t;
    });
    line = { ...line, tanks, tripped };
    const was = line.serving;
    line = { ...line, serving: serve(next, line) };
    if (was !== null && was !== line.serving)
      tanks = line.tanks.map((t, i) =>
        i === was ? { ...t, lastFilled: time } : t,
      );
    else tanks = line.tanks;
    line = { ...line, tanks };
    // The transfer: to the box's high in AUTO, to the selector's own high
    // switch in HAND; it may pass either a little, as a real one does.
    const runs = pumpRuns({ ...next, lines: { ...lines, [c]: line } }, c);
    let inflow = 0;
    if (runs && line.serving !== null) {
      const t = line.tanks[line.serving];
      const target =
        line.mode === 'hand' ? t.capacity * CONTROL.handHigh : t.highL;
      const room = Math.max(0, target + t.capacity * 0.01 - t.litres);
      inflow = Math.min(line.store, (CONTROL.pumpLpm * dt) / 60, room);
    }
    let store = line.store - inflow;
    // A delivery when the store runs nearly dry (the trial's ideal source).
    if (store <= CONTROL.storeLitres * CONTROL.storeDelivery)
      store = CONTROL.storeLitres * 0.95;
    tanks = line.tanks.map((t, i) => {
      const added = i === line.serving ? inflow : 0;
      const litres = t.litres + added - (t.doseLpm * dt) / 60;
      return { ...t, litres: Math.min(t.capacity, Math.max(0, litres)) };
    });
    lines[c] = { ...line, tanks, store };
  }
  next = { ...next, lines };
  return next;
}

export type { TerminalCommand };

export type TrialAction =
  | {
      act: 'terminal';
      chemical: Chemical;
      tag: string;
      command: TerminalCommand;
    }
  | { act: 'hoa'; chemical: Chemical; to: Hoa }
  | { act: 'selector'; chemical: Chemical; to: 'auto' | 'hand' }
  | { act: 'pick'; chemical: Chemical; tank: number }
  | { act: 'reset'; chemical: Chemical }
  | { act: 'isolator'; on: boolean }
  | { act: 'mcb'; tripped: boolean }
  | { act: 'hang' }
  | { act: 'link'; chemical: Chemical; ok: boolean }
  | { act: 'hall-power'; on: boolean }
  /** A test's and a developer's: set tank `tank`'s contents to `share` of full. */
  | { act: 'level'; chemical: Chemical; tank: number; share: number };

/** What a command says in the log: "PL4 HIGH LEVEL 27L". */
export function describeCommand(c: TerminalCommand): string {
  const name = TANK_NAMES[c.tank] ?? `TANK ${c.tank + 1}`;
  switch (c.kind) {
    case 'set-low':
      return `${name} LOW LEVEL ${c.litres}L`;
    case 'set-high':
      return `${name} HIGH LEVEL ${c.litres}L`;
    case 'fill-now':
      return `${name} FILL NOW`;
    case 'stop':
      return `${name} STOP (INHIBIT)`;
    case 'resume':
      return `${name} RESUME`;
  }
}

function command(
  s: ChemControlTrial,
  c: Chemical,
  tag: string,
  cmd: TerminalCommand,
): ChemControlTrial {
  // Only a terminal the box can hear.
  if (!terminalComms(s, c)) return s;
  const line = s.lines[c];
  const tank = line.tanks[cmd.tank];
  if (!tank) return s;
  let next: TrialTank = tank;
  const limits = levelLimits(tank);
  switch (cmd.kind) {
    case 'set-low':
      if (cmd.litres < limits.low.min || cmd.litres > limits.low.max) return s;
      next = { ...tank, lowL: cmd.litres };
      break;
    case 'set-high':
      if (cmd.litres < limits.high.min || cmd.litres > limits.high.max)
        return s;
      next = { ...tank, highL: cmd.litres };
      break;
    case 'fill-now':
      if (tank.inhibited) return s;
      next = { ...tank, fillNow: true };
      break;
    case 'stop':
      next = { ...tank, inhibited: true, fillNow: false, calling: false };
      break;
    case 'resume':
      next = { ...tank, inhibited: false };
      break;
  }
  const tanks = line.tanks.map((t, i) => (i === cmd.tank ? next : t));
  // A fill in progress ends at once on STOP.
  const serving =
    cmd.kind === 'stop' && line.serving === cmd.tank && line.mode === 'auto'
      ? null
      : line.serving;
  const lastFilled =
    serving !== line.serving
      ? tanks.map((t, i) => (i === cmd.tank ? { ...t, lastFilled: s.time } : t))
      : tanks;
  return {
    ...s,
    lines: { ...s.lines, [c]: { ...line, tanks: lastFilled, serving } },
    log: [`${tag}: ${describeCommand(cmd)}`, ...s.log].slice(0, 20),
  };
}

export function actOnChemControl(
  s: ChemControlTrial,
  a: TrialAction,
): ChemControlTrial {
  const line = (c: Chemical, next: Partial<TrialLine>) => ({
    ...s,
    lines: { ...s.lines, [c]: { ...s.lines[c], ...next } },
  });
  switch (a.act) {
    case 'terminal':
      return command(s, a.chemical, a.tag, a.command);
    case 'hoa':
      return line(a.chemical, { hoa: a.to });
    case 'selector':
      return line(a.chemical, { mode: a.to });
    case 'pick':
      return a.tank >= 0 && a.tank < s.lines[a.chemical].tanks.length
        ? line(a.chemical, { pick: a.tank })
        : s;
    case 'reset':
      return s.lines[a.chemical].tanks.every(
        (t) => t.litres < t.capacity * CONTROL.highHigh,
      )
        ? line(a.chemical, { tripped: false })
        : s;
    case 'isolator':
      // Off clears a hung controller: it starts afresh when back on.
      return {
        ...s,
        box: { ...s.box, isolator: a.on, hung: a.on ? s.box.hung : false },
      };
    case 'mcb':
      return {
        ...s,
        box: {
          ...s.box,
          mcbTripped: a.tripped,
          hung: a.tripped ? false : s.box.hung,
        },
      };
    case 'hang':
      return boxLive(s) ? { ...s, box: { ...s.box, hung: true } } : s;
    case 'link':
      return {
        ...s,
        box: { ...s.box, links: { ...s.box.links, [a.chemical]: a.ok } },
      };
    case 'hall-power':
      return { ...s, hallPower: a.on };
    case 'level': {
      const tanks = s.lines[a.chemical].tanks.map((t, i) =>
        i === a.tank
          ? { ...t, litres: t.capacity * Math.max(0, Math.min(1, a.share)) }
          : t,
      );
      return line(a.chemical, { tanks });
    }
  }
}

/** What the box sends terminal `c` of its line (`ot216-terminal.ts`). */
export function terminalFeed(s: ChemControlTrial, c: Chemical): TerminalFeed {
  const line = s.lines[c];
  const tanks = line.tanks.map((t, i) => ({
    name: TANK_NAMES[i] ?? `TANK ${i + 1}`,
    litres: t.litres,
    capacity: t.capacity,
    lowL: t.lowL,
    highL: t.highL,
    state: tankState(line, i),
    lastFilled: t.lastFilled === null ? null : s.time - t.lastFilled,
    outletOpen: line.serving === i,
    limits: levelLimits(t),
    step: levelStep(t.capacity),
  }));
  const waiting = tanks.findIndex((t) => t.state === 'CALL');
  return {
    line: c === 'acid' ? 'ACID' : 'HYPO',
    store: line.store,
    storeLow: line.store <= CONTROL.storeLitres * CONTROL.storeLowAlarm,
    pump: line.tripped ? 'TRIP' : pumpRuns(s, c) ? 'RUN' : 'STOP',
    tanks,
    filling: line.serving,
    next: waiting < 0 ? null : waiting,
    alarms: lineAlarms(line),
  };
}
