import type { Chemical } from './chemicals';
import { DAY_TANKS, DISTRIBUTION, levelLimits } from './chemical-distribution';
import type {
  ChemicalDistribution,
  ChemicalLine,
  DayTank,
} from './chemical-distribution';

/**
 * The wet hall's chemical transfer control box (prompt 091; the owner,
 * 2026-10-27 and 2026-10-28): Chlorella's packaged transfer control, one
 * box for both chemicals, a single point of failure, with an OT-216
 * operator terminal for each line linked to it by its own serial cable.
 * Pure.
 *
 * - The box is live while the wet hall has power, its door isolator is
 *   on and its MCB closed. Its controller runs `BOOT_SECONDS` after it
 *   comes live, unless it has hung; switching the isolator off (or the
 *   MCB tripping) clears a hang, and it starts afresh.
 * - While its controller runs it decides in AUTO: each day tank's own low
 *   and high levels, STOP (inhibit), RESUME and FILL NOW, kept in the
 *   world through a power cut (`chemical-distribution.ts`).
 * - Each terminal's link: broken, that terminal shows NO COMMS and the
 *   other carries on.
 * - Its faults (`chemControlFaults`) are readings of the world, for the
 *   wet hall's annunciator and the bridge (mission 099).
 */

/** Seconds the controller takes to start once its box is live. */
export const BOOT_SECONDS = 2;

export interface ChemControlBox {
  /** Its door isolator, on the front. */
  isolator: boolean;
  /** Its MCB, inside: tripped open until reset. */
  mcbTripped: boolean;
  /** Its controller hung: answering nothing until restarted. */
  hung: boolean;
  /** Seconds since it last came live (its controller starting); 0 while dead. */
  live: number;
  /** Each terminal's cable to it, sound. */
  links: Record<Chemical, boolean>;
}

/** A box as installed: on, its controller long since started. */
export const newChemControlBox = (): ChemControlBox => ({
  isolator: true,
  mcbTripped: false,
  hung: false,
  live: BOOT_SECONDS,
  links: { hypochlorite: true, acid: true },
});

/** Whether the box has power: the wet hall's, through its isolator and MCB. */
export const boxLive = (b: ChemControlBox, hallPower: boolean) =>
  hallPower && b.isolator && !b.mcbTripped;

/** Whether its controller runs: live, started, not hung. */
export const controllerRunning = (b: ChemControlBox, hallPower: boolean) =>
  boxLive(b, hallPower) && b.live >= BOOT_SECONDS && !b.hung;

/** Whether terminal `c` can talk to the box. */
export const terminalComms = (
  b: ChemControlBox,
  hallPower: boolean,
  c: Chemical,
) => controllerRunning(b, hallPower) && b.links[c];

/** The box `dt` seconds on: its controller's start-up clock. */
export function stepChemControlBox(
  b: ChemControlBox,
  hallPower: boolean,
  dt: number,
): ChemControlBox {
  const live = boxLive(b, hallPower);
  if (!live)
    return b.live === 0 && !b.hung ? b : { ...b, live: 0, hung: false };
  if (b.live >= BOOT_SECONDS) return b;
  return { ...b, live: Math.min(BOOT_SECONDS, b.live + dt) };
}

/**
 * The box's faults, as the wet hall's annunciator and the bridge read
 * them (mission 099): pure readings of the world, each true while it lasts.
 *
 * - `supplyLost`: no supply reaching the box, the wet hall's power off or
 *   its door isolator switched off: both lines' AUTO filling stopped.
 * - `mcbTripped`: its MCB tripped (found inside, reset there).
 * - `controllerFault`: its controller hung while the box is live (FAULT
 *   flashing inside; cleared by switching it off and on at its isolator).
 * - `commsLost`: each terminal's link broken while the controller runs
 *   (that terminal at NO COMMS).
 * - `stopped`: AUTO filling stopped for any of these reasons, or the
 *   controller still starting.
 */
export interface ChemControlFaults {
  supplyLost: boolean;
  mcbTripped: boolean;
  controllerFault: boolean;
  commsLost: Record<Chemical, boolean>;
  stopped: boolean;
}

export function chemControlFaults(
  b: ChemControlBox,
  hallPower: boolean,
): ChemControlFaults {
  const running = controllerRunning(b, hallPower);
  return {
    supplyLost: !hallPower || !b.isolator,
    mcbTripped: b.mcbTripped,
    controllerFault: boxLive(b, hallPower) && b.hung,
    commsLost: {
      hypochlorite: running && !b.links.hypochlorite,
      acid: running && !b.links.acid,
    },
    stopped: !running,
  };
}

/** What a terminal sends the box (`ot216-terminal.ts`'s `TerminalCommand`). */
export type TankCommand =
  | { kind: 'set-low' | 'set-high'; tank: number; litres: number }
  | { kind: 'fill-now' | 'stop' | 'resume'; tank: number };

export type ChemControlAction =
  /** A setting stored or a command confirmed at terminal `tag`. */
  | { act: 'terminal'; chemical: Chemical; tag: string; command: TankCommand }
  /** The box's door isolator switched. */
  | { act: 'isolator'; on: boolean }
  /** Its MCB tripped or reset (by hand, or a fault from the console). */
  | { act: 'mcb'; tripped: boolean }
  /** Its controller hangs (a fault from the console or a scenario). */
  | { act: 'hang' }
  /** A terminal's link broken or mended (a fault from the console). */
  | { act: 'link'; chemical: Chemical; ok: boolean };

/** Each day tank's name on a terminal and in the log, in outlet order. */
export const TANK_NAMES = [
  'PL1 LOUNGE',
  'PL2 OLYMPIC',
  'PL3 JACUZZI',
  'PL4 FOOTBATH',
] as const;

/** What a command says in the log: "PL4 HIGH LEVEL 27L". */
export function describeTankCommand(c: TankCommand): string {
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

/** The line with terminal command `cmd` applied, or the same line if it is refused. */
function command(
  c: Chemical,
  line: ChemicalLine,
  cmd: TankCommand,
  now: number,
): ChemicalLine {
  const tank = line.tanks[cmd.tank];
  const capacity = DAY_TANKS[c][cmd.tank]?.litres;
  if (!tank || !capacity) return line;
  const limits = levelLimits(capacity, tank);
  let next: DayTank;
  switch (cmd.kind) {
    case 'set-low':
      if (cmd.litres < limits.low.min || cmd.litres > limits.low.max)
        return line;
      next = { ...tank, lowL: cmd.litres };
      break;
    case 'set-high':
      if (cmd.litres < limits.high.min || cmd.litres > limits.high.max)
        return line;
      next = { ...tank, highL: cmd.litres };
      break;
    case 'fill-now':
      if (tank.inhibited) return line;
      next = { ...tank, fillNow: true };
      break;
    case 'stop':
      next = { ...tank, inhibited: true, fillNow: false, calling: false };
      break;
    case 'resume':
      if (!tank.inhibited) return line;
      next = { ...tank, inhibited: false };
      break;
  }
  // A fill in progress in AUTO ends at once on STOP.
  const ends =
    cmd.kind === 'stop' && line.serving === cmd.tank && line.mode === 'auto';
  return {
    ...line,
    serving: ends ? null : line.serving,
    tanks: line.tanks.map((t, i) =>
      i === cmd.tank ? (ends ? { ...next, lastFilled: now } : next) : t,
    ),
  };
}

/**
 * The distribution and the box after `a`, with the wet hall's power
 * `hallPower`, at world time `now`. A terminal's command is heard only
 * while its link answers; refused, both are returned unchanged.
 */
export function actOnChemControl(
  d: ChemicalDistribution,
  b: ChemControlBox,
  hallPower: boolean,
  now: number,
  a: ChemControlAction,
): { distribution: ChemicalDistribution; box: ChemControlBox } {
  const same = { distribution: d, box: b };
  switch (a.act) {
    case 'terminal': {
      if (!terminalComms(b, hallPower, a.chemical)) return same;
      const line = command(a.chemical, d[a.chemical], a.command, now);
      return line === d[a.chemical]
        ? same
        : { distribution: { ...d, [a.chemical]: line }, box: b };
    }
    case 'isolator':
      return b.isolator === a.on
        ? same
        : { distribution: d, box: { ...b, isolator: a.on } };
    case 'mcb':
      return b.mcbTripped === a.tripped
        ? same
        : { distribution: d, box: { ...b, mcbTripped: a.tripped } };
    case 'hang':
      return boxLive(b, hallPower) && !b.hung
        ? { distribution: d, box: { ...b, hung: true } }
        : same;
    case 'link':
      return b.links[a.chemical] === a.ok
        ? same
        : {
            distribution: d,
            box: { ...b, links: { ...b.links, [a.chemical]: a.ok } },
          };
  }
}

/** A tank's state as a terminal says it. */
export function tankState(
  line: ChemicalLine,
  i: number,
): 'OK' | 'CALL' | 'FILL' | 'INHIB' {
  const tank = line.tanks[i];
  if (tank.inhibited) return 'INHIB';
  if (line.serving === i) return 'FILL';
  return tank.calling ? 'CALL' : 'OK';
}

/** A line's alarms now, as its terminal shows them: a tank at high-high, the line tripped, the store low. */
export function lineAlarms(
  c: Chemical,
  line: ChemicalLine,
  storeLow: boolean,
): { code: string; text: string }[] {
  const out: { code: string; text: string }[] = [];
  line.tanks.forEach((t, i) => {
    if (t.litres >= DAY_TANKS[c][i].litres * DISTRIBUTION.highHigh)
      out.push({ code: `hh${i}`, text: `PL${i + 1} HI-HI` });
  });
  if (line.tripped) out.push({ code: 'trip', text: 'LINE TRIPPED' });
  if (storeLow) out.push({ code: 'store', text: 'STORE LOW' });
  return out;
}
