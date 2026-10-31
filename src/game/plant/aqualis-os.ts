import { CHANNEL_IDS } from './aqualis-types';
import type { Advice, Alarm, ChannelId } from './aqualis-types';
import { stopScreen } from '../../toolkit/components/core/logic/stop-screen';
import type { StopOutcome } from '../../toolkit/components/core/logic/stop-screen';
import { glitchMoment } from '../../toolkit/components/core/logic/lcd-glitch';

/**
 * The Aqualis cabinet's computer (mission 114, `doc/plans/114/crash-modes.md`):
 * its supply, its phase (off, booting, running or crashed), and what its
 * dosing outputs and alarm contacts do in each. Pure: the host keeps the
 * boot script (`core/logic/boot-sequence.ts`) and passes in its length.
 *
 * It never crashes on its own (the owner, 2026-10-31): a scenario, or
 * dev58's crash board, crashes it with a kind and a watchdog:
 *
 * - **Stop** (the blue screen): each output holds what it was sending at
 *   the moment of the crash. Its stop screen (`stopScreen`, from the same
 *   seed) may hang until power-cycled or reboot after its dump.
 * - **Glitch** (the buffer overflow): each output jumps to a new random
 *   value on each new burst of the glitch (`glitchBurst`, from the same
 *   seed) and holds between them, often slammed to 0 or to 1, so the pumps
 *   lurch between stopped and flat out.
 * - **Watchdog works**: `WATCHDOG_S` after the crash its relay drops the
 *   release contacts, so every output is 0, and raises CONTROLLER FAULT.
 * - **Watchdog fails**: the outputs carry on, held or random, and its
 *   alarms are silent: they died with the computer.
 *
 * While crashed its software is not running: the host steps no controller,
 * gives no advice and takes no touches. Power off and on again boots it
 * after a power cut (its OS's recovery menu), and its first advice after a
 * crash is Dr Aqualis's apology (`APOLOGY`), until the screen is next
 * touched or `APOLOGY_S` passes.
 */

/** How long the watchdog's heartbeat waits before it drops the release contacts, s. */
export const WATCHDOG_S = 1.5;
/** How long the apology stays at the top of his advice, untouched, s. */
export const APOLOGY_S = 240;

export type OsPhase = 'off' | 'booting' | 'running' | 'crashed';
export type CrashKind = 'stop' | 'glitch';
export type Outputs = Record<ChannelId, number>;

export interface Crash {
  kind: CrashKind;
  seed: number;
  /** Whether the watchdog will drop the release contacts. */
  watchdog: boolean;
  /** The demands it was sending as it crashed. */
  latched: Outputs;
  /** Seconds since it crashed. */
  t: number;
  /** A stop crash's outcome; null for a glitch. */
  outcome: StopOutcome['kind'] | null;
  /** When a stop crash reboots on its own, s after it; null if it hangs. */
  rebootAt: number | null;
}

export interface OsState {
  powered: boolean;
  phase: OsPhase;
  /** The boot under way: its number (0 the first), whether after a power cut, and how far in, s. */
  boot: { n: number; unclean: boolean; t: number } | null;
  /** How many boots it has begun. */
  boots: number;
  crash: Crash | null;
  /** It crashed since it last ran: its next boot is a recovery. */
  crashedLast: boolean;
  /** The boot under way, or the run that followed it, is a crash's recovery. */
  recovering: boolean;
  /** Seconds the apology has still to show; 0 none. */
  apology: number;
}

const zero = (): Outputs => ({ hypochlorite: 0, acid: 0, co2: 0 });

/** Its supply on, running (`booting`: its first boot just begun, a clean one). */
export function newOs({ booting = false, bootAt = 0 } = {}): OsState {
  return {
    powered: true,
    phase: booting ? 'booting' : 'running',
    boot: booting ? { n: 0, unclean: false, t: Math.max(0, bootAt) } : null,
    boots: booting ? 1 : 0,
    crash: null,
    crashedLast: false,
    recovering: false,
    apology: 0,
  };
}

const beginBoot = (os: OsState, unclean: boolean): OsState => ({
  ...os,
  phase: 'booting',
  boot: { n: os.boots, unclean, t: 0 },
  boots: os.boots + 1,
  recovering: os.crashedLast,
  crash: null,
  apology: 0,
});

/** Switch its supply: off, everything stops; on, it boots as after a power cut. */
export function powerOs(os: OsState, on: boolean): OsState {
  if (on === os.powered) return os;
  if (!on)
    return {
      ...os,
      powered: false,
      phase: 'off',
      boot: null,
      crash: null,
      crashedLast: os.crashedLast || os.phase === 'crashed',
      apology: 0,
    };
  return beginBoot({ ...os, powered: true }, true);
}

/** An orderly restart (Settings › Pool dynamics › Restart): only while it runs. */
export function restartOs(os: OsState): OsState {
  return os.phase === 'running' ? beginBoot(os, false) : os;
}

export interface CrashOptions {
  kind: CrashKind;
  seed: number;
  watchdog: boolean;
  /** The demands it is sending now, which a stop crash holds. */
  demands: Outputs;
  /** How a stop screen ends (dev58: hang); else its seed chooses. */
  outcome?: StopOutcome['kind'];
}

/** Crash it, if it is running (or booting: an OS can crash at any time). */
export function crashOs(os: OsState, o: CrashOptions): OsState {
  if (os.phase !== 'running' && os.phase !== 'booting') return os;
  const stop =
    o.kind === 'stop' ? stopScreen(o.seed, { outcome: o.outcome }) : null;
  return {
    ...os,
    phase: 'crashed',
    boot: null,
    apology: 0,
    crash: {
      kind: o.kind,
      seed: o.seed,
      watchdog: o.watchdog,
      latched: { ...zero(), ...o.demands },
      t: 0,
      outcome: stop?.outcome.kind ?? null,
      rebootAt: stop?.rebootAt ?? null,
    },
  };
}

export type OsEvent = 'booted' | 'rebooting' | null;

/**
 * `dt` seconds on (real time: its screens and watchdog run on it), with
 * the boot under way `bootTotal` seconds long. `booted` when its software
 * starts; `rebooting` when a stop screen reboots itself.
 */
export function stepOs(
  os: OsState,
  dt: number,
  bootTotal: number,
): { os: OsState; event: OsEvent } {
  if (os.phase === 'booting' && os.boot) {
    const t = os.boot.t + dt;
    if (t < bootTotal)
      return { os: { ...os, boot: { ...os.boot, t } }, event: null };
    return {
      os: {
        ...os,
        phase: 'running',
        boot: null,
        crashedLast: false,
        apology: os.recovering ? APOLOGY_S : 0,
      },
      event: 'booted',
    };
  }
  if (os.phase === 'crashed' && os.crash) {
    const crash = { ...os.crash, t: os.crash.t + dt };
    if (crash.rebootAt !== null && crash.t >= crash.rebootAt)
      return {
        os: beginBoot({ ...os, crashedLast: true }, true),
        event: 'rebooting',
      };
    return { os: { ...os, crash }, event: null };
  }
  if (os.phase === 'running' && os.apology > 0)
    return {
      os: { ...os, apology: Math.max(0, os.apology - dt) },
      event: null,
    };
  return { os, event: null };
}

/** A touch on its screen: the apology, once read, goes. */
export function touchOs(os: OsState): OsState {
  return os.apology > 0 ? { ...os, apology: 0 } : os;
}

/** Whether its software runs (it steps its controller, advises and takes touches). */
export const osRunning = (os: OsState) => os.phase === 'running';

/** Whether the watchdog has dropped the release contacts. */
export const watchdogTripped = (os: OsState) =>
  os.phase === 'crashed' && !!os.crash?.watchdog && os.crash.t >= WATCHDOG_S;

/** A seeded uniform in [0, 1) from a few integers. */
function hash01(...xs: number[]): number {
  // Each integer folded in, then murmur3's finaliser, so neighbours differ.
  let h = 0x9e3779b9;
  for (const x of xs) {
    h = (h + Math.imul(x | 0, 0x85ebca6b) + 0x6d2b79f5) | 0;
    h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
    h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
    h ^= h >>> 16;
  }
  return (h >>> 0) / 4294967296;
}

/**
 * One channel's random output in a glitch's `burst`: slammed to 0 or 1
 * about a third of the time each, else anywhere between.
 */
export function glitchOutput(
  seed: number,
  burst: number,
  channel: ChannelId,
): number {
  const c = CHANNEL_IDS.indexOf(channel);
  const r = hash01(seed, burst, c, 1);
  if (r < 0.35) return 0;
  if (r < 0.7) return 1;
  return hash01(seed, burst, c, 2);
}

/**
 * The glitch's burst ruling the outputs at `t`: the last begun, so they
 * change as each burst starts (`glitchBurst` is non-null while it is
 * written) and hold through the hold after it.
 */
export const glitchOutputBurst = (seed: number, t: number): number =>
  glitchMoment(seed, t).burst;

/** What its outputs send now, given what its controller would ask for (`demands`). */
export function osOutputs(os: OsState, demands: Outputs): Outputs {
  if (os.phase === 'running') return demands;
  if (os.phase !== 'crashed' || !os.crash || watchdogTripped(os)) return zero();
  const crash = os.crash;
  if (crash.kind === 'stop') return { ...crash.latched };
  const burst = glitchOutputBurst(crash.seed, crash.t);
  const out = zero();
  for (const id of CHANNEL_IDS) out[id] = glitchOutput(crash.seed, burst, id);
  return out;
}

/** CONTROLLER FAULT: the watchdog's alarm, on the annunciator. */
export const CONTROLLER_FAULT: Alarm = {
  id: 'controller-fault',
  text: 'CONTROLLER FAULT',
};

/** Its alarm contacts now, given the advisor's (`alarms`, while it runs). */
export function osAlarms(os: OsState, alarms: readonly Alarm[]): Alarm[] {
  if (os.phase === 'running') return [...alarms];
  if (watchdogTripped(os)) return [CONTROLLER_FAULT];
  return [];
}

/** Dr Aqualis's first words after a crash's recovery. */
export const APOLOGY: Advice = {
  id: 'funny-turn',
  reading: null,
  severity: 'info',
  problem: 'Terribly sorry: I seem to have had a funny turn.',
  direction:
    'Do check what the dosing did while I was away: the water, and each pump’s own selector.',
  additive: null,
  where: null,
  dose: null,
  mood: 'concerned',
};

/** His advice now: the apology first while it lasts. */
export function osAdvice(os: OsState, advice: readonly Advice[]): Advice[] {
  if (os.phase !== 'running') return [];
  return os.apology > 0 ? [APOLOGY, ...advice] : [...advice];
}
