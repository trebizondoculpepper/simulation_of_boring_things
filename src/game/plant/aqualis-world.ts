import { bootScript } from '../../toolkit/components/core/logic/boot-sequence';
import { TRIO_BOOT_APP } from '../../toolkit/components/plant/logic/aqualis-display';
import {
  CHANNEL_IDS,
  DEFAULT_TARGETS,
  type Alarm,
  type AqualisReadings,
  type AqualisSettings,
  type ChannelId,
  type ChannelPorts,
  type ChannelView,
  type Inhibit,
  type PoolDynamics,
  type SampleInput,
  type SampleStatus,
  type Selector,
} from './aqualis-types';
import {
  newSampler,
  samplerReadings,
  samplerStatus,
  stepSampler,
} from './aqualis-sampler';
import type { SamplerState } from './aqualis-sampler';
import {
  CHLORINE_CORRECTION_HOURS,
  INTEGRAL_REACH,
  newController,
  stepController,
} from './aqualis-controller';
import type { ControllerState } from './aqualis-controller';
import { alarms as advisorAlarms } from './aqualis-advisor';
import {
  firstAidHolds,
  firstAidNoHypochlorite,
  firstAidSettings,
  startFirstAid,
  stepFirstAid,
} from './aqualis-first-aid';
import type { FirstAidId, FirstAidState } from './aqualis-first-aid';
import {
  crashOs,
  newOs,
  osAlarms,
  osOutputs,
  osRunning,
  powerOs,
  restartOs,
  stepOs,
  touchOs,
  watchdogTripped,
} from './aqualis-os';
import type { CrashKind, OsState, Outputs } from './aqualis-os';
import type { PortSignal } from './aqualis-ports';
import {
  CHEMISTRY_TICK,
  CONTROLLER,
  DOSING_PUMPS,
  STRENGTH,
} from './water-treatment';
import type { DosingControl, WaterTreatment } from './water-treatment';
import { poolTankCapacity, poolVolume } from './pools';
import type { PoolId, PoolsState } from './pools';

/**
 * The Dr Aqualis Trios in the world (mission 114): the Lounge's (PL1-CP2,
 * `pool_01`) and the Olympic's (PL2-CP2, `pool_02`), each its computer
 * (`aqualis-os.ts`), its sampler, controller and First Aid, its settings,
 * its HAND · OFF · AUTO knob, its supply isolator and its own power
 * switch, and its watchdog. They take over `water-treatment.ts`'s unseen
 * controller for those two pools; the spas keep it. Pure.
 *
 * Stepped with the world: its computer every world step (its boot, its
 * crash's watchdog and glitch bursts run on the clock), its analyser and
 * controller on the chemistry's tick (`CHEMISTRY_TICK`), as dev58's host
 * steps them. Its sample is the water its tapping sees, on the pump
 * discharge before the filters: the balance tank's (`circuit.tank`, the
 * water the pumps draw), flowing while the circulation runs and the
 * sample's three valves (PLn-SP1-IV1, PLn-CP2-IV1, PLn-CP2-IV2) are open.
 * What it sends each pump is a release contact and a 4–20 mA demand
 * (`aqualis-ports.ts`); each pump's state comes back as its channel's
 * feedback.
 *
 * Its CO₂ channel's port is unlinked (the blanked gland): its feedback is
 * null, so the controller corrects pH with acid alone. The seam: the
 * world passes `ports.co2` (the CO₂ valve controller's `co2Feedback`) and
 * takes `signals.co2` (to its `trioSignal`) when the link is made; nothing
 * here changes.
 */

export type TrioPool = 'pool_01' | 'pool_02';
export const TRIO_POOLS: readonly TrioPool[] = ['pool_01', 'pool_02'];
export const isTrioPool = (id: PoolId): id is TrioPool =>
  (TRIO_POOLS as readonly string[]).includes(id);

/** Each Trio's room code, for its tags. */
export const TRIO_ROOM_CODE: Record<TrioPool, 'PL1' | 'PL2'> = {
  pool_01: 'PL1',
  pool_02: 'PL2',
};

/** The sample's valves, by tag, each must be open for it to flow (`aqualis-schematic.ts`). */
export const TRIO_SAMPLE_VALVES: Record<TrioPool, readonly string[]> = {
  pool_01: ['PL1-SP1-IV1', 'PL1-CP2-IV1', 'PL1-CP2-IV2'],
  pool_02: ['PL2-SP1-IV1', 'PL2-CP2-IV1', 'PL2-CP2-IV2'],
};

/** The sample's flow through the cell with the circulation running and its valves open, l/h (the flow cell's, `sampling.ts`). */
export const SAMPLE_FLOW_LH = 30;

/** Each Trio's seed, for its boots and crashes (dev58's is 58). */
const SEED: Record<TrioPool, number> = { pool_01: 101, pool_02: 102 };

/** One Trio as the world keeps it. */
export interface TrioState {
  os: OsState;
  /** The boot under way's number, and its script's length, s (0 none). */
  bootN: number;
  bootTotal: number;
  sampler: SamplerState;
  controller: ControllerState;
  /** What its analyser reads, and its sample's health, as of its last tick. */
  readings: AqualisReadings;
  sample: SampleStatus;
  /** Its channels as its pump status screen shows them, and why it is not dosing, as of its last tick. */
  channels: Record<ChannelId, ChannelView>;
  inhibit: Inhibit | null;
  lockout: boolean;
  /** The advisor's alarms as of its last tick (before its computer's state: `trioAlarms`). */
  alarms: Alarm[];
  settings: AqualisSettings;
  firstAid: FirstAidState | null;
  selector: Selector;
  /** HAND's demands from its touch screen, 0 to 1. */
  hand: Record<ChannelId, number>;
  /** Its supply's isolator (PL1-CP2-IS1; the Olympic's busbar tap-off), and its own POWER switch. */
  isolator: boolean;
  mainSwitch: boolean;
  /** Whether its watchdog works, for the next crash (a scenario's choice). */
  watchdog: boolean;
  /** Its release contacts as last sent (held through a stop crash). */
  release: boolean;
  /** World seconds since its last tick. */
  owed: number;
}

export type Trios = Record<TrioPool, TrioState>;

/** What it is given from the plant each step. */
export interface TrioPlant {
  /** Its room's supply live. */
  supply: boolean;
  sample: SampleInput;
  ports: ChannelPorts;
}

const NO_DEMAND: Outputs = { hypochlorite: 0, acid: 0, co2: 0 };
const perChannel = <T>(f: (id: ChannelId) => T): Record<ChannelId, T> =>
  Object.fromEntries(CHANNEL_IDS.map((id) => [id, f(id)])) as Record<
    ChannelId,
    T
  >;

/** The pool dynamics, entered as commissioned: its water in circulation (pool and balance tank) and its design flow. */
export function trioDynamics(id: TrioPool, flowM3h: number): PoolDynamics {
  return {
    volumeM3: Math.round(poolVolume(id) + poolTankCapacity(id)),
    flowM3h,
  };
}

/** Each pool's design circulation, m³/h (`pools.ts`'s, at its start). */
const DESIGN_FLOW: Record<TrioPool, number> = { pool_01: 90, pool_02: 620 };

/** Its settings as commissioned: the dynamics as built, the default targets. */
export const trioSettings = (id: TrioPool): AqualisSettings => ({
  dynamics: trioDynamics(id, DESIGN_FLOW[id]),
  targets: DEFAULT_TARGETS,
});

/**
 * The chlorine integral that carries on the old controller's steady dose
 * (its hypochlorite output × its pump's most), so taking over is no jump:
 * in the Trio's units, u = 1 is a band of the entered volume each
 * `CHLORINE_CORRECTION_HOURS`.
 */
export function seededIntegral(id: TrioPool, old: DosingControl): number {
  const gh =
    Math.max(0, Math.min(1, old.hypochlorite)) *
    DOSING_PUMPS[id].hypochlorite *
    STRENGTH.hypochlorite;
  const v = Math.max(1, trioDynamics(id, DESIGN_FLOW[id]).volumeM3);
  const band = CONTROLLER.chlorineBand;
  return Math.min(
    band * INTEGRAL_REACH,
    Math.max(-band, (gh * CHLORINE_CORRECTION_HOURS) / v),
  );
}

const noChannels = (): Record<ChannelId, ChannelView> =>
  perChannel((id) => ({
    id,
    status: { kind: 'unconnected' },
    demand: 0,
    demandRate: 0,
    delivering: 0,
  }));

/** A Trio running, in AUTO, its cell settled on `sample`, its integral carrying on `old`'s dose. */
export function newTrio(
  id: TrioPool,
  sample: SampleInput,
  old?: DosingControl,
): TrioState {
  const sampler = newSampler(sample);
  return {
    os: newOs(),
    bootN: -1,
    bootTotal: 0,
    sampler,
    controller: {
      ...newController(),
      integral: old ? seededIntegral(id, old) : 0,
    },
    readings: samplerReadings(sampler),
    sample: samplerStatus(sampler, sample),
    channels: noChannels(),
    inhibit: null,
    lockout: false,
    alarms: [],
    settings: trioSettings(id),
    firstAid: null,
    selector: 'auto',
    hand: perChannel(() => 0),
    isolator: true,
    mainSwitch: true,
    watchdog: true,
    release: true,
    owed: 0,
  };
}

/** What its outputs send now: each port's release contact and its 4–20 mA demand. */
export function trioSignals(t: TrioState): Record<ChannelId, PortSignal> {
  const running = osRunning(t.os);
  const demands = osOutputs(t.os, running ? t.controller.demands : NO_DEMAND);
  const release = running
    ? t.release && t.selector !== 'off'
    : t.os.phase === 'crashed' && t.os.crash && !watchdogTripped(t.os)
      ? // A glitch scatters the relay with the rest; a stop holds it.
        t.os.crash.kind === 'glitch' || t.release
      : false;
  return perChannel((id) => ({ release, demand: demands[id] }));
}

/** Its alarm contacts now: the advisor's while its computer runs; CONTROLLER FAULT once the watchdog trips; else none. */
export const trioAlarms = (t: TrioState): Alarm[] => osAlarms(t.os, t.alarms);

/** Its software as each boot starts it: a new controller, no First Aid. */
const freshSoftware = (t: TrioState): TrioState => ({
  ...t,
  controller: newController(),
  firstAid: null,
  alarms: [],
  channels: noChannels(),
  inhibit: null,
  lockout: false,
});

/** One tick of its analyser and, while its computer runs, its software. */
function tick(t: TrioState, plant: TrioPlant, dt: number): TrioState {
  const s = stepSampler(t.sampler, plant.sample, dt);
  let next: TrioState = {
    ...t,
    sampler: s.state,
    readings: s.readings,
    sample: s.status,
  };
  if (!osRunning(t.os)) return next;
  const firstAid = t.firstAid
    ? stepFirstAid(t.firstAid, s.readings, t.settings, dt)
    : null;
  const working = firstAidSettings(firstAid, t.settings);
  const c = stepController(
    t.controller,
    {
      readings: s.readings,
      sample: s.status,
      selector: t.selector,
      ports: plant.ports,
      settings: working,
      hand: t.hand,
      pause: firstAidHolds(firstAid),
      noHypochlorite: firstAidNoHypochlorite(firstAid),
    },
    dt,
  );
  next = {
    ...next,
    firstAid,
    controller: c.state,
    channels: c.out.channels,
    inhibit: c.out.inhibit,
    lockout: c.out.lockout,
    release: c.out.inhibit === null,
    alarms: advisorAlarms(
      s.readings,
      s.status,
      c.out.channels,
      working,
      t.selector,
    ),
  };
  return next;
}

/** The boot under way's script (deterministic by its seed): what its screen shows, and how long. */
export function trioBootScript(id: TrioPool, os: OsState) {
  if (!os.boot) return null;
  return bootScript('gui', {
    seed: SEED[id] + os.boot.n * 7919,
    app: TRIO_BOOT_APP,
    unclean: os.boot.unclean,
  });
}

/** The boot script's length for the boot under way. */
const bootLength = (id: TrioPool, os: OsState): number =>
  trioBootScript(id, os)?.total ?? 0;

/**
 * A Trio `dt` seconds on: its supply switched through its isolator and its
 * POWER switch, its computer stepped, and its analyser and software
 * ticked once its chemistry tick has come round; what it sends each port
 * now.
 */
export function stepTrio(
  id: TrioPool,
  t0: TrioState,
  plant: TrioPlant,
  dt: number,
): { trio: TrioState; signals: Record<ChannelId, PortSignal> } {
  let t = t0;
  const powered = plant.supply && t.isolator && t.mainSwitch;
  if (powered !== t.os.powered) {
    const os = powerOs(t.os, powered);
    t = os.phase === 'booting' ? freshSoftware({ ...t, os }) : { ...t, os };
  }
  if (t.os.boot && t.os.boot.n !== t.bootN)
    t = { ...t, bootN: t.os.boot.n, bootTotal: bootLength(id, t.os) };
  const r = stepOs(t.os, dt, t.os.boot ? t.bootTotal : 0);
  t = { ...t, os: r.os };
  if (r.event === 'rebooting') t = freshSoftware(t);
  if (t.os.boot && t.os.boot.n !== t.bootN)
    t = { ...t, bootN: t.os.boot.n, bootTotal: bootLength(id, t.os) };
  const owed = t.owed + dt;
  if (r.event === 'booted' || owed + 1e-9 >= CHEMISTRY_TICK) {
    // Its first look at the plant as its software starts, and each tick.
    t = tick({ ...t, owed: 0 }, plant, r.event === 'booted' ? 0 : owed);
  } else t = { ...t, owed };
  return { trio: t, signals: trioSignals(t) };
}

/** What can be done to a Trio: at its cabinet (its knob, switch and touch screen), at its isolator, or by a scenario. */
export type TrioAction =
  | { act: 'selector'; selector: Selector }
  | { act: 'mainSwitch'; on: boolean }
  | { act: 'isolator'; on: boolean }
  | { act: 'hand'; channel: ChannelId; demand: number }
  | { act: 'settings'; settings: AqualisSettings }
  | { act: 'firstAid'; programme: FirstAidId | null }
  | { act: 'restart' }
  /** Its touch screen touched: an apology on it has been read. */
  | { act: 'touch' }
  | { act: 'watchdog'; works: boolean }
  | { act: 'crash'; kind: CrashKind; seed?: number };

export function actOnTrio(t: TrioState, a: TrioAction): TrioState {
  switch (a.act) {
    case 'selector':
      return a.selector === t.selector ? t : { ...t, selector: a.selector };
    case 'mainSwitch':
      return a.on === t.mainSwitch ? t : { ...t, mainSwitch: a.on };
    case 'isolator':
      return a.on === t.isolator ? t : { ...t, isolator: a.on };
    case 'hand':
      return {
        ...t,
        hand: { ...t.hand, [a.channel]: Math.max(0, Math.min(1, a.demand)) },
      };
    case 'settings':
      return { ...t, settings: a.settings };
    case 'firstAid':
      if (!osRunning(t.os)) return t;
      return {
        ...t,
        firstAid: a.programme
          ? startFirstAid(a.programme, t.readings, t.settings)
          : null,
      };
    case 'restart': {
      const os = restartOs(t.os);
      return os === t.os ? t : freshSoftware({ ...t, os });
    }
    case 'touch': {
      const os = touchOs(t.os);
      return os === t.os ? t : { ...t, os };
    }
    case 'watchdog':
      return { ...t, watchdog: a.works };
    case 'crash': {
      const os = crashOs(t.os, {
        kind: a.kind,
        seed: a.seed ?? t.os.boots * 31 + 7,
        watchdog: t.watchdog,
        demands: osOutputs(t.os, t.controller.demands),
      });
      return os === t.os ? t : { ...t, os };
    }
  }
}

/** Both Trios, new, their cells settled on each pool's tank water. */
export function newTrios(
  sample: (id: TrioPool) => SampleInput,
  old?: (id: TrioPool) => DosingControl | undefined,
): Trios {
  return {
    pool_01: newTrio('pool_01', sample('pool_01'), old?.('pool_01')),
    pool_02: newTrio('pool_02', sample('pool_02'), old?.('pool_02')),
  };
}

/** Both Trios as a world (or a migrated save) takes them on: each settled on its pool's water, carrying on its old controller's dose. */
export function triosFor(treatment: WaterTreatment, pools: PoolsState): Trios {
  return newTrios(
    (id) => ({
      water: treatment.circuits[id].tank,
      temperature: pools[id].temperature,
      flowLh: SAMPLE_FLOW_LH,
    }),
    (id) => treatment.circuits[id].control,
  );
}
