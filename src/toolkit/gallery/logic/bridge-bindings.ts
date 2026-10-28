import type { World, WorldAction } from '../../../game/world';
import { POOL_MOTORS } from '../../../game/plant/motor-starters';
import type { MotorTag, StarterMode } from '../../../game/plant/motor-starters';
import type { PoolId } from '../../../game/plant/pools';
import { serviceAvailable } from '../../../game/plant/services';
import {
  CHANGEOVER_POSITIONS,
  generatorAvailable,
  mainsAvailable,
  switchboardLive,
} from '../../../game/plant/changeover';
import { CALL_POINTS, zoneInAlarm } from '../../../game/plant/fire-alarm';
import type { FireZone } from '../../../game/plant/fire-alarm';
import { CAPACITY, CLOSES, OPENS, clock, isOpen } from '../../../game/bathers';
import { SETPOINT_RANGE } from '../../../game/world';
import { WET_HALL_PLANT, pitFloats } from '../../../game/plant/wet-hall';
import { HEALTHY } from '../../../game/health';
import { STORE_CAPACITY } from '../../../game/plant/chemicals';
import type { Chemical } from '../../../game/plant/chemicals';
import {
  DAY_TANKS,
  DISTRIBUTION,
  dayLevel,
  transferRunning,
} from '../../../game/plant/chemical-distribution';
import { ANNUNCIATOR_ALARMS, ALARM_TEXT } from './control-room-demo';
import { litLocationWindows } from '../../../game/plant/location-annunciators';
import type { PlantReading } from './control-room-demo';
import { airState, heatingState, mainPoolState } from './pool-mimics';
import type { PumpsShown } from './pool-mimics';
import { PARODY_SPECS } from './parody-specs';
import type { ParodySpec, ParodyWidget } from './parody-trial';

/**
 * The bridge's touch panels wired to the world (mission 095; the owner,
 * 2026-10-27: "wire them up now to the real world simulation model"): for
 * each of dev48's reimagined panels put on the bridge (`parody-specs.ts`),
 * what each of its lamps, read-outs, gauges, trends, selectors, buttons,
 * diagram symbols, banners, lists and annunciator windows reads from the
 * world and what each press asks of it, the same reads and the same
 * actions as the original's view (the mimics' `mainPoolState`,
 * `heatingState` and `airState` of the control room's plant reading; the
 * pump panel's starters; the changeover's lamps). Mimic copies: the
 * bridge's and the plant rooms' boards share the one world.
 *
 * Local-only controls (`CLAUDE.md`: mode selectors, trip resets, the
 * changeover, releasing an emergency stop) are bound as refusals: a deny
 * bleep and LOCAL CONTROL ONLY, with where to go. Things the world does
 * not model yet (a dosing stop, the fire panel's silence) are bound as
 * such, refused the same way, NOT YET MODELLED. A board's own display
 * modes (TEMP, PRESS …) change only what it shows. Pure.
 */

/** What a panel reads: the world, and the control room's plant reading (the Olympic's). */
export interface BridgeContext {
  world: World;
  reading: PlantReading;
}

type Read<T> = (c: BridgeContext) => T;

/** What a press does. */
export type Command =
  /** Asks the world: the action, or null when there is nothing to do. */
  | { kind: 'act'; act: (c: BridgeContext) => WorldAction | null }
  /** Refused here: worked only at `at`. */
  | { kind: 'local'; at: string }
  /** Refused: the world has nothing behind it yet. */
  | { kind: 'unmodelled'; what: string }
  /** The board's own display: changes what it shows, nothing in the world. */
  | { kind: 'view' }
  /**
   * Asks to be confirmed (the owner, 2026-10-27): the first press arms it,
   * the panel asking for a second within `CONFIRM_WINDOW` seconds, which
   * carries out its steps, each `after` seconds from that press; unpressed,
   * it lapses (`pressConfirm`).
   */
  | { kind: 'confirm'; prompt: string; steps: readonly ConfirmStep[] };

/** One of a confirmed command's actions, `after` seconds from the confirming press. */
export interface ConfirmStep {
  after: number;
  action: WorldAction;
}

/** Seconds a confirm-step command waits for its second press before it lapses. */
export const CONFIRM_WINDOW = 5;

/** A panel's confirm step: the command armed by its label, and until when (the panel's own seconds). */
export type Armed = { label: string; until: number } | null;

/**
 * A press of a confirm-step command at `now`: the second press of the
 * same one within its window confirms it; any other arms it afresh.
 */
export function pressConfirm(
  armed: Armed,
  label: string,
  now: number,
): { armed: Armed; confirmed: boolean } {
  if (armed && armed.label === label && now <= armed.until)
    return { armed: null, confirmed: true };
  return { armed: { label, until: now + CONFIRM_WINDOW }, confirmed: false };
}

/** The confirm step at `now`: lapsed (null) once its window has passed. */
export const confirmAt = (armed: Armed, now: number): Armed =>
  armed && now > armed.until ? null : armed;

/** A press's command, fixed or from the world as it is. */
export type CommandOf = Command | ((c: BridgeContext) => Command);

export type SymbolState = 'on' | 'off' | 'fault' | 'between';

/**
 * A panel's wiring. Each map is keyed by an item's label, or, where a
 * label repeats on a panel, by `PAGE/column/label` (taken first).
 */
export interface PanelBinding {
  /** Its spec's code. */
  code: string;
  /** The original's node in its room's enhanced network (`world-in-model.ts`). */
  model: { room: string; node: string };
  lamps?: Record<string, Read<boolean> | null>;
  readouts?: Record<string, Read<number | string>>;
  /** A share of full, 0–1, and its words. */
  gauges?: Record<string, Read<readonly [number, string]>>;
  /** A share, 0–1, pushed a few times a second. */
  trends?: Record<string, Read<number>>;
  buttons?: Record<string, CommandOf & { lit?: Read<boolean> }>;
  selectors?: Record<
    string,
    { value: Read<number>; choose: (index: number) => CommandOf }
  >;
  symbols?: Record<string, { state: Read<SymbolState>; press?: CommandOf }>;
  /** Whether a circuit's flow moves. */
  flow?: Read<boolean>;
  /** An annunciator's windows, in order: each in alarm or not. */
  windows?: Read<readonly boolean[]>;
  /** A banner by its words: flashing (in alarm) or steady. */
  banners?: Record<string, Read<boolean>>;
  /** A list's rows by their words: what each shows at its right. */
  rows?: Record<string, Read<string>>;
}

/** Look an item up by its qualified key, then its label. */
export function lookup<T>(
  map: Record<string, T> | undefined,
  page: string,
  column: number,
  label: string,
): T | undefined {
  if (!map) return undefined;
  return map[`${page}/${column}/${label}`] ?? map[label];
}

/** Whether `label` names something bound in `map` (a null lamp counts: dark, by design). */
const has = (
  map: Record<string, unknown> | undefined,
  page: string,
  column: number,
  label: string,
) => map !== undefined && (`${page}/${column}/${label}` in map || label in map);

/** Every item of `spec` that `binding` leaves unwired, as `PAGE/column/label`. */
export function unwired(spec: ParodySpec, binding: PanelBinding): string[] {
  const out: string[] = [];
  spec.pages.forEach((page) =>
    page.columns.forEach((col, ci) =>
      col.forEach((w: ParodyWidget) => {
        const miss = (map: Record<string, unknown> | undefined, l: string) => {
          if (!has(map, page.name, ci, l)) out.push(`${page.name}/${ci}/${l}`);
        };
        switch (w.kind) {
          case 'buttons':
            w.labels.forEach((l) => miss(binding.buttons, l));
            break;
          case 'selector':
            miss(binding.selectors, w.label);
            break;
          case 'lamps':
            w.labels.forEach((l) => miss(binding.lamps, l));
            break;
          case 'readouts':
            w.items.forEach(([l]) => miss(binding.readouts, l));
            break;
          case 'gauges':
            w.items.forEach((l) => miss(binding.gauges, l));
            break;
          case 'trend':
            miss(binding.trends, w.name);
            break;
          case 'banner':
            miss(binding.banners, w.words);
            break;
          case 'list':
            w.rows.forEach((l) => miss(binding.rows, l));
            break;
          case 'annunciator':
            if (!binding.windows) out.push(`${page.name}/${ci}/(windows)`);
            break;
          case 'circuit':
            w.symbols.forEach((s) => miss(binding.symbols, s.label));
            if (!binding.flow) out.push(`${page.name}/${ci}/(flow)`);
            break;
        }
      }),
    ),
  );
  return out;
}

/** A press's command as the world stands. */
export const commandNow = (cmd: CommandOf, c: BridgeContext): Command =>
  typeof cmd === 'function' ? cmd(c) : cmd;

// ---- helpers -----------------------------------------------------------------

const MODES: readonly StarterMode[] = ['hand', 'off', 'auto'];
const act = (f: (c: BridgeContext) => WorldAction | null): Command => ({
  kind: 'act',
  act: f,
});
const local = (at: string): Command => ({ kind: 'local', at });
const unmodelled = (what: string): Command => ({ kind: 'unmodelled', what });
const VIEW: Command = { kind: 'view' };

/** A pool's pumps' starters, duty then standby. */
const pumpsOf = (pool: PoolId) => POOL_MOTORS(pool) as MotorTag[];

/** What a pump's starter shows: 0 running, 1 stopped, 2 tripped (the pump panel's). */
const shown = (w: World, tag: MotorTag): 0 | 1 | 2 => {
  const s = w.motors.starters[tag];
  return s.tripped ? 2 : s.running ? 0 : 1;
};
const pumpsShownOf = (w: World, pool: PoolId): PumpsShown => {
  const [p1, p2] = pumpsOf(pool);
  return { p1: shown(w, p1), p2: shown(w, p2) };
};
/** START or STOP to a starter: as the mimics' and the pump panel's. */
const starter = (tag: MotorTag, verb: 'start' | 'stop'): Command =>
  act(() => ({ type: 'motor/starter', tag, action: { act: verb } }));
/** A pump symbol touched: STOP if it runs, START if not. */
const toggle =
  (tag: MotorTag): CommandOf =>
  (c) =>
    starter(tag, c.world.motors.starters[tag].running ? 'stop' : 'start');
const pumpState =
  (tag: MotorTag): Read<SymbolState> =>
  (c) => {
    const s = shown(c.world, tag);
    return s === 2 ? 'fault' : s === 0 ? 'on' : 'off';
  };
const on = (b: boolean): SymbolState => (b ? 'on' : 'off');
const share = (v: number, lo: number, hi: number) =>
  Math.max(0, Math.min(1, (v - lo) / (hi - lo)));

const PL2 = 'PL2-CP1, the filter pumps’ panel in the Olympic plant room';
const PL1 = 'PL1-CP1, the filter pumps’ panel in the lounge plant room';

// ---- the panels ---------------------------------------------------------------

/** PL2-CP1: the Olympic's filter pumps, P-101A and P-101B. */
function pumpPanel(): PanelBinding {
  const [a, b] = pumpsOf('pool_02');
  const pump = (n: 1 | 2, tag: MotorTag) => ({
    lamps: {
      [`P${n} RUNNING`]: (c: BridgeContext) => shown(c.world, tag) === 0,
      [`P${n} STOPPED`]: (c: BridgeContext) => shown(c.world, tag) === 1,
      [`P${n} TRIPPED`]: (c: BridgeContext) => shown(c.world, tag) === 2,
    },
    readouts: {
      [`P${n} MOTOR CURRENT`]: (c: BridgeContext) =>
        c.world.motors.starters[tag].current,
    },
    selectors: {
      [`P${n} MODE`]: {
        value: (c: BridgeContext) =>
          MODES.indexOf(c.world.motors.starters[tag].mode),
        choose: () => local(`${tag}’s door on ${PL2}`),
      },
    },
    buttons: {
      [`P${n} START`]: starter(tag, 'start'),
      [`P${n} STOP`]: starter(tag, 'stop'),
      [`P${n} RESET`]: local(`${tag}’s door on ${PL2}`),
    },
  });
  const p1 = pump(1, a);
  const p2 = pump(2, b);
  const stopped = (c: BridgeContext) => c.world.motors.stopped.pool_02;
  return {
    code: 'PL2-CP1',
    model: { room: 'plant_pool_02', node: 'panel' },
    lamps: {
      ...p1.lamps,
      ...p2.lamps,
      'SUPPLY ON': (c) =>
        serviceAvailable(c.world.plant, 'plant_pool_02', 'power'),
    },
    readouts: { ...p1.readouts, ...p2.readouts },
    selectors: { ...p1.selectors, ...p2.selectors },
    buttons: {
      ...p1.buttons,
      ...p2.buttons,
      // Struck from here; released only at the panel (`CLAUDE.md`).
      'EMERGENCY STOP': Object.assign(
        (c: BridgeContext) =>
          stopped(c)
            ? local(`the emergency stop on ${PL2}`)
            : act(() => ({
                type: 'motor/stop',
                pool: 'pool_02',
                stopped: true,
              })),
        { lit: stopped },
      ),
    },
    symbols: {
      BALANCE: { state: (c) => (c.reading.balance < 0.3 ? 'fault' : 'on') },
      P1: { state: pumpState(a), press: toggle(a) },
      P2: { state: pumpState(b), press: toggle(b) },
      'F1–F4': {
        state: (c) =>
          Math.max(...c.reading.filterDp) > 0.7
            ? 'fault'
            : on(c.reading.flow > 1),
      },
      UV: { state: (c) => on(c.reading.uvOn) },
      HX: { state: (c) => on(c.reading.boilersFiring) },
    },
    flow: (c) => c.reading.flow > 1,
    banners: {
      'ALL HANDS: SWIMMERS IN THE WATER': (c) =>
        stopped(c) || shown(c.world, a) === 2 || shown(c.world, b) === 2,
    },
  };
}

/** CR-MP1: the main pool's mimic, the control room's board. */
function mainPoolMimic(): PanelBinding {
  const [a, b] = pumpsOf('pool_02');
  const state = (c: BridgeContext) =>
    mainPoolState(c.reading, pumpsShownOf(c.world, 'pool_02'));
  const lamp = (id: string) => (c: BridgeContext) =>
    Boolean(state(c).lamps[id]);
  return {
    code: 'CR-MP1',
    model: { room: 'control_room', node: 'mimic-pool' },
    symbols: {
      'BALANCE TANK': {
        state: (c) => (lamp('level-low')(c) ? 'fault' : 'on'),
      },
      P1: { state: pumpState(a), press: toggle(a) },
      P2: { state: pumpState(b), press: toggle(b) },
      F1: { state: (c) => (lamp('f1-dp')(c) ? 'fault' : 'on') },
      F2: { state: (c) => (lamp('f2-dp')(c) ? 'fault' : 'on') },
      DOSE: { state: (c) => on(lamp('dosing')(c)) },
      HX: { state: (c) => on(c.reading.boilersFiring) },
    },
    flow: (c) => (state(c).readouts.pumps.flow?.value ?? 0) > 1,
    readouts: {
      CIRCULATION: (c) => state(c).readouts.pumps.flow?.value ?? 0,
      'WORST FILTER DP': (c) => state(c).readouts.filters.pressure?.value ?? 0,
      'FREE CHLORINE': (c) => state(c).readouts.pool.water?.value ?? 0,
      POOL: (c) => state(c).readouts.pool.temperature?.value ?? 0,
    },
    buttons: { FLOW: VIEW, PRESS: VIEW, TEMP: VIEW, WATER: VIEW },
    lamps: {
      'MAKE-UP': lamp('makeup'),
      'LEVEL LOW': lamp('level-low'),
      'UV ON': lamp('uv-on'),
      DOSING: lamp('dosing'),
    },
  };
}

/** CR-MP2: the heating mimic, the control room's board. */
function heatingMimic(): PanelBinding {
  const lamp = (id: string) => (c: BridgeContext) =>
    Boolean(heatingState(c.reading).lamps[id]);
  const boiler =
    (n: 1 | 2): Read<SymbolState> =>
    (c) =>
      lamp(`b${n}-lock`)(c) ? 'fault' : on(lamp(`b${n}-fire`)(c));
  return {
    code: 'CR-MP2',
    model: { room: 'control_room', node: 'mimic-heating' },
    symbols: {
      'B1 300 kW': { state: boiler(1) },
      'B2 300 kW': { state: boiler(2) },
      HEADER: { state: () => 'on' },
      P5: { state: (c) => on(lamp('p5-run')(c)) },
      'POOL HX': { state: () => 'on' },
      CALORIFIER: { state: () => 'on' },
      'GAS ESV': { state: (c) => on(lamp('esv-open')(c)) },
    },
    flow: lamp('p5-run'),
    lamps: {
      'B1 FIRE': lamp('b1-fire'),
      'B1 LOCKOUT': lamp('b1-lock'),
      'B2 FIRE': lamp('b2-fire'),
      'B2 LOCKOUT': lamp('b2-lock'),
      'ESV OPEN': lamp('esv-open'),
      'P5 RUN': lamp('p5-run'),
    },
    readouts: {
      FLOW: (c) =>
        heatingState(c.reading).readouts.flow.temperature?.value ?? 0,
      SYSTEM: (c) => heatingState(c.reading).readouts.flow.pressure?.value ?? 0,
    },
    buttons: { TEMP: VIEW, PRESS: VIEW, FLOW: VIEW },
    trends: {
      'CALORIFIER STORE': (c) =>
        share(
          heatingState(c.reading).readouts.calorifier.temperature?.value ?? 0,
          50,
          70,
        ),
    },
  };
}

/** CR-MP3: the air handling mimic, the control room's board. */
function airMimic(): PanelBinding {
  const st = (c: BridgeContext) => airState(c.reading);
  const lamp = (id: string) => (c: BridgeContext) => Boolean(st(c).lamps[id]);
  const temp = (id: string) => (c: BridgeContext) => {
    const v = st(c).readouts[id].temperature?.value ?? 0;
    return [share(v, 0, 40), `${v.toFixed(1)} °C`] as const;
  };
  return {
    code: 'CR-MP3',
    model: { room: 'control_room', node: 'mimic-air' },
    symbols: {
      FRESH: { state: () => 'on' },
      FILTER: { state: (c) => (lamp('filter-dirty')(c) ? 'fault' : 'on') },
      'PLATE HX': { state: () => 'on' },
      'HEAT PUMP': { state: (c) => on(lamp('hp-on')(c)) },
      SUPPLY: { state: (c) => on(lamp('supply-run')(c)) },
      EXTRACT: { state: (c) => on(lamp('extract-run')(c)) },
      EXHAUST: { state: () => 'on' },
    },
    flow: lamp('supply-run'),
    lamps: {
      'SUPPLY RUN': lamp('supply-run'),
      'EXTRACT RUN': lamp('extract-run'),
      'HEAT PUMP ON': lamp('hp-on'),
      'FILTER DIRTY': lamp('filter-dirty'),
      'RH HIGH': lamp('rh-high'),
    },
    readouts: {
      HALL: (c) => st(c).readouts.hall.temperature?.value ?? 0,
      'HALL HUMIDITY': (c) => st(c).readouts.hall.humidity?.value ?? 0,
    },
    buttons: { TEMP: VIEW, RH: VIEW, FANS: VIEW },
    gauges: {
      OUTSIDE: temp('outside'),
      SUPPLY: temp('supply'),
      HALL: temp('hall'),
      EXTRACT: temp('extract'),
    },
  };
}

/** PL2-CP2: the Olympic's dosing controller and sample cells (the original's world reads: its pool's water; its pumps dosing as its pool is dosed). */
function dosingController(): PanelBinding {
  const p = (c: BridgeContext) => c.world.pools.pool_02;
  const dosing = (chemical: Chemical, rate: number) => (c: BridgeContext) => {
    const running = c.reading.dosing && c.world.chemicals[chemical] > 0;
    return [running ? rate / 2 : 0, running ? `${rate} l/h` : 'IDLE'] as const;
  };
  const AT = 'the dosing controller in the Olympic plant room';
  return {
    code: 'PL2-CP2',
    model: { room: 'plant_pool_02', node: 'controller' },
    readouts: {
      'FREE CHLORINE': (c) => p(c).freeChlorine,
      PH: (c) => p(c).ph,
      REDOX: (c) => p(c).redox,
      WATER: (c) => p(c).temperature,
    },
    trends: {
      'CHLORINE RESIDUAL': (c) => share(p(c).freeChlorine, 0, 4),
      PH: (c) => share(p(c).ph, 6.6, 8.2),
    },
    gauges: {
      'HYPO STROKE RATE': dosing('hypochlorite', 1.24),
      'ACID STROKE RATE': dosing('acid', 0.62),
    },
    lamps: {
      'HYPO DOSING': (c) => dosing('hypochlorite', 1)(c)[0] > 0,
      'ACID DOSING': (c) => dosing('acid', 1)(c)[0] > 0,
      'SAMPLE FLOW FAULT': (c) => c.reading.flow < 1,
    },
    buttons: {
      STOP: unmodelled('a dosing stop'),
      START: unmodelled('a dosing stop'),
      RESET: local(AT),
      '▲': local(AT),
      '▼': local(AT),
      BACK: local(AT),
      OK: local(AT),
    },
    rows: Object.fromEntries(
      ['CALIBRATE PH', 'CALIBRATE CL', 'SET POINTS', 'LIMITS', 'LOG'].map(
        (r) => [r, () => 'AT THE CONTROLLER'],
      ),
    ),
  };
}

/** SR-IS3: the mains/generator changeover switch (its handle and lamps; turned only by hand, at it). */
function changeover(): PanelBinding {
  return {
    code: 'SR-IS3',
    model: { room: 'switch_room', node: 'changeover' },
    banners: { 'ONE SUPPLY ONLY · BREAK BEFORE MAKE': () => false },
    selectors: {
      SUPPLY: {
        value: (c) =>
          CHANGEOVER_POSITIONS.indexOf(c.world.plant.changeover ?? 'I'),
        choose: () => local('the changeover switch in the switch room'),
      },
    },
    lamps: {
      'MAINS AVAILABLE': (c) => mainsAvailable(c.world.plant),
      'GENERATOR AVAILABLE': (c) => generatorAvailable(c.world.plant),
    },
  };
}

/** The fire zones the world has, each with its words on the repeater. */
const FIRE_ZONES: Record<string, FireZone | null> = {
  'ZONE 1 POOL HALL': null,
  'ZONE 2 PLANT': 'wet_hall',
  'ZONE 3 CHANGING': null,
};
const anyFire = (c: BridgeContext) =>
  ([...new Set(Object.values(CALL_POINTS))] as FireZone[]).some((z) =>
    zoneInAlarm(c.world.fireAlarm, z),
  );

/** CR-CP6: the fire alarm repeater (the world has call points in two zones: the wet hall's and the loading bay's). */
function fireRepeater(): PanelBinding {
  return {
    code: 'CR-CP6',
    model: { room: 'control_room', node: 'fire-repeater' },
    lamps: {
      FIRE: anyFire,
      FAULT: null,
      DISABLEMENT: null,
      TEST: null,
      POWER: (c) => switchboardLive(c.world.plant),
    },
    rows: Object.fromEntries(
      Object.entries(FIRE_ZONES).map(([words, zone]) => [
        words,
        (c: BridgeContext) =>
          zone === null
            ? 'NOT FITTED'
            : zoneInAlarm(c.world.fireAlarm, zone) ||
                zoneInAlarm(c.world.fireAlarm, 'loading_bay')
              ? 'FIRE'
              : 'NORMAL',
      ]),
    ),
    buttons: {
      SILENCE: unmodelled('the fire panel’s sounders'),
      RESOUND: unmodelled('the fire panel’s sounders'),
      RESET: local('the call point, with its key'),
      MUTE: unmodelled('the fire panel’s buzzer'),
    },
  };
}

/** CR-CP2: the alarm annunciator, the control room's (its ACCEPT and RESET the view's, as the original's). */
function annunciator(): PanelBinding {
  const rooms = [
    'PUMP ROOM',
    'DOSING ROOM',
    'CHEMICAL STORE',
    'BOILER ROOM',
    'AIR HANDLING',
    'SWITCH ROOM',
    'BALANCE TANKS',
  ];
  return {
    code: 'CR-CP2',
    model: { room: 'control_room', node: 'annunciator' },
    windows: (c) =>
      ANNUNCIATOR_ALARMS.map((id) => c.reading.alarms.includes(id)),
    rows: Object.fromEntries(
      rooms.map((room) => [
        room,
        (c: BridgeContext) => {
          const n = c.reading.alarms.filter(
            (id) => ALARM_TEXT[id].room === room,
          ).length;
          return n ? `${n} IN` : '—';
        },
      ]),
    ),
  };
}

// ---- Central Control ---------------------------------------------------------

const POOLS: readonly [PoolId, string][] = [
  ['pool_01', 'LOUNGE'],
  ['pool_02', 'OLYMPIC'],
  ['pool_03', 'JACUZZI'],
  ['pool_04', 'FOOTBATH'],
];

/** Central Control's reboot of every bridge display (the owner, 2026-10-27). */
export const REBOOT_DISPLAYS = 'REBOOT DISPLAYS';

/** Seconds the bridge's displays stay off in a reboot before they are switched on again. */
export const REBOOT_OFF_FOR = 1;

/**
 * REBOOT DISPLAYS, confirmed (the owner, 2026-10-27: "possible to reboot
 * the bridge controls from one of the bridge controls"): the bridge's
 * displays switched off in the world, every one black at once, and on
 * again `REBOOT_OFF_FOR` seconds later, each booting on its own drawn
 * durations, the main viewscreen last (`bridge-room.ts`). Its lights and
 * theme are not touched: it is not the first view.
 */
export const REBOOT_COMMAND: Command = {
  kind: 'confirm',
  prompt: 'REBOOT ALL BRIDGE DISPLAYS? PRESS CONFIRM',
  steps: [
    { after: 0, action: { type: 'bridge/displays', on: false } },
    { after: REBOOT_OFF_FOR, action: { type: 'bridge/displays', on: true } },
  ],
};

/**
 * Central Control, the operator's console (mission 092's list, the
 * research's, as far as the model goes today): the time and whether open,
 * water quality per pool, bathers per pool against its limit, the alarm
 * summary with ACCEPT, the fire alarm's zones, pumps and power, chemical
 * stocks; the stops the world has (circulation per pool, struck from here,
 * released only at its panel); and the items not yet modelled (the pool
 * emergency alarm, a dosing stop, the PA) shown and refused as such.
 */
export const CENTRAL_CONTROL: ParodySpec = {
  original: 'THE OPERATOR’S DESK, POOLMON',
  title: 'CENTRAL CONTROL',
  code: 'CC-01',
  colour: 'golden-tanoi',
  size: { w: 3.0, h: 0.62 },
  pages: [
    {
      name: 'WATCH',
      columns: [
        [
          {
            kind: 'readouts',
            items: [
              ['TIME', '', 0, 0],
              ['DAY', '', 0, 0],
            ],
          },
          { kind: 'lamps', labels: ['CENTRE OPEN'] },
          { kind: 'list', rows: ['ALARMS IN', 'NEWEST', 'GO TO'] },
          { kind: 'buttons', labels: ['ACCEPT ALARMS'] },
        ],
        [
          {
            kind: 'readouts',
            items: POOLS.map(
              ([, n]) => [`${n} FREE CL`, 'mg/l', 0, 0] as const,
            ),
          },
        ],
        [
          {
            kind: 'readouts',
            items: POOLS.map(([, n]) => [`${n} PH`, '', 0, 0] as const),
          },
        ],
        [
          {
            kind: 'readouts',
            items: POOLS.map(([, n]) => [`${n} TEMP`, '°C', 0, 0] as const),
          },
        ],
        [{ kind: 'gauges', items: POOLS.map(([, n]) => `${n} BATHERS`) }],
      ],
    },
    {
      name: 'EMERGENCY',
      columns: [
        [
          { kind: 'lamps', labels: ['FIRE WET HALL', 'FIRE LOADING BAY'] },
          {
            kind: 'banner',
            words: 'FIRE ALARM · EVACUATE BY THE NEAREST EXIT',
          },
          {
            kind: 'buttons',
            labels: ['STOP CIRCULATION LOUNGE', 'STOP CIRCULATION OLYMPIC'],
          },
        ],
        [
          {
            kind: 'buttons',
            labels: ['POOL EMERGENCY ALARM', 'STOP DOSING', 'PA TO POOLSIDE'],
          },
          { kind: 'lamps', labels: ['LOUNGE STOPPED', 'OLYMPIC STOPPED'] },
        ],
      ],
    },
    {
      name: 'PLANT',
      columns: [
        [
          {
            kind: 'lamps',
            labels: ['LOUNGE PUMP RUN', 'OLYMPIC PUMP RUN', 'PUMP TRIPPED'],
          },
          {
            kind: 'readouts',
            items: [
              ['LOUNGE FLOW', 'm³/h', 0, 0],
              ['OLYMPIC FLOW', 'm³/h', 0, 0],
            ],
          },
        ],
        [
          {
            kind: 'lamps',
            labels: ['MAINS', 'GENERATOR', 'EMERGENCY LIGHTING ON BATTERY'],
          },
          { kind: 'gauges', items: ['BATTERY CHARGE'] },
          { kind: 'buttons', labels: [REBOOT_DISPLAYS] },
        ],
        [
          {
            kind: 'gauges',
            items: ['HYPOCHLORITE STORE', 'ACID STORE'],
          },
          { kind: 'lamps', labels: ['HYPO TRANSFER', 'ACID TRANSFER'] },
        ],
      ],
    },
  ],
};

/**
 * Every alarm in on any annunciator, as the bridge lists them (the owner,
 * 2026-10-28: anything that sounds on any annunciator is a warning on
 * the bridge): the plant's (`ANNUNCIATOR_ALARMS`), then each location's
 * lit windows, the lounge's, the Olympic's and the wet hall's (each
 * board's first-out last, as the newest that matters), each its words
 * and the room to go to.
 */
function alarmsIn(c: BridgeContext): { words: string; room: string }[] {
  const plant = c.reading.alarms.map((id) => ({
    words: ALARM_TEXT[id].window.replace('\n', ' '),
    room: ALARM_TEXT[id].room,
  }));
  return [
    ...plant,
    ...litLocationWindows(c.world).map(({ words, room }) => ({ words, room })),
  ];
}

/** The bridge's shared annunciator, ACCEPTed from Central Control or CR-CP2 alike (the view's, as the original's). */
export const ACCEPT_ALARMS = 'ACCEPT ALARMS';

function centralControl(): PanelBinding {
  const water =
    (pool: PoolId, key: 'freeChlorine' | 'ph' | 'temperature') =>
    (c: BridgeContext) =>
      c.world.pools[pool][key];
  const readouts: Record<string, Read<number | string>> = {
    TIME: (c) => {
      const { hour } = clock(c.world.time);
      const h = Math.floor(hour);
      const m = Math.floor((hour - h) * 60);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    },
    DAY: (c) =>
      ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'][
        clock(c.world.time).weekday
      ],
    'LOUNGE FLOW': (c) => c.world.pools.pool_01.flow,
    'OLYMPIC FLOW': (c) => c.world.pools.pool_02.flow,
  };
  const gauges: Record<string, Read<readonly [number, string]>> = {
    'BATTERY CHARGE': (c) =>
      [
        c.world.centralBattery.charge,
        `${Math.round(c.world.centralBattery.charge * 100)}%`,
      ] as const,
    'HYPOCHLORITE STORE': (c) =>
      [
        c.world.chemicals.hypochlorite / STORE_CAPACITY.hypochlorite,
        `${Math.round(c.world.chemicals.hypochlorite)} l`,
      ] as const,
    'ACID STORE': (c) =>
      [
        c.world.chemicals.acid / STORE_CAPACITY.acid,
        `${Math.round(c.world.chemicals.acid)} l`,
      ] as const,
  };
  for (const [pool, name] of POOLS) {
    readouts[`${name} FREE CL`] = water(pool, 'freeChlorine');
    readouts[`${name} PH`] = water(pool, 'ph');
    readouts[`${name} TEMP`] = water(pool, 'temperature');
    gauges[`${name} BATHERS`] = (c) => {
      const now = c.world.bathers.pools[pool].now;
      return [now / CAPACITY[pool], `${now} / ${CAPACITY[pool]}`] as const;
    };
  }
  const stop = (pool: 'pool_01' | 'pool_02', at: string): CommandOf =>
    Object.assign(
      (c: BridgeContext) =>
        c.world.motors.stopped[pool]
          ? local(`the emergency stop on ${at}`)
          : act(() => ({ type: 'motor/stop', pool, stopped: true })),
      { lit: (c: BridgeContext) => c.world.motors.stopped[pool] },
    );
  const running = (pool: PoolId) => (c: BridgeContext) =>
    pumpsOf(pool).some((t) => c.world.motors.starters[t].running);
  const transfer = (chemical: Chemical) => (c: BridgeContext) =>
    transferRunning(
      c.world.distribution[chemical],
      c.world.chemicals[chemical],
      STORE_CAPACITY[chemical],
    );
  return {
    code: 'CC-01',
    model: { room: 'control_room', node: 'operator-desk' },
    readouts,
    gauges,
    lamps: {
      'CENTRE OPEN': (c) => isOpen(c.world.time),
      'FIRE WET HALL': (c) => zoneInAlarm(c.world.fireAlarm, 'wet_hall'),
      'FIRE LOADING BAY': (c) => zoneInAlarm(c.world.fireAlarm, 'loading_bay'),
      'LOUNGE STOPPED': (c) => c.world.motors.stopped.pool_01,
      'OLYMPIC STOPPED': (c) => c.world.motors.stopped.pool_02,
      'LOUNGE PUMP RUN': running('pool_01'),
      'OLYMPIC PUMP RUN': running('pool_02'),
      'PUMP TRIPPED': (c) =>
        [...pumpsOf('pool_01'), ...pumpsOf('pool_02')].some(
          (t) => c.world.motors.starters[t].tripped,
        ),
      MAINS: (c) => mainsAvailable(c.world.plant),
      GENERATOR: (c) => generatorAvailable(c.world.plant),
      'EMERGENCY LIGHTING ON BATTERY': (c) =>
        Boolean(c.world.centralBattery.test) || !switchboardLive(c.world.plant),
      'HYPO TRANSFER': transfer('hypochlorite'),
      'ACID TRANSFER': transfer('acid'),
    },
    rows: {
      'ALARMS IN': (c) => String(alarmsIn(c).length),
      NEWEST: (c) => alarmsIn(c).at(-1)?.words ?? '—',
      'GO TO': (c) => alarmsIn(c).at(-1)?.room ?? '—',
    },
    banners: {
      'FIRE ALARM · EVACUATE BY THE NEAREST EXIT': anyFire,
    },
    buttons: {
      // Accepts the bridge's annunciator: the view's, as the original's.
      [ACCEPT_ALARMS]: VIEW,
      'STOP CIRCULATION LOUNGE': stop('pool_01', PL1),
      'STOP CIRCULATION OLYMPIC': stop('pool_02', PL2),
      'POOL EMERGENCY ALARM': unmodelled('a pool emergency alarm'),
      'STOP DOSING': unmodelled('a dosing stop'),
      'PA TO POOLSIDE': unmodelled('a public address system'),
      [REBOOT_DISPLAYS]: REBOOT_COMMAND,
    },
  };
}

/** The healthy band of a water reading, for its readout's alarm colour. */
export function outOfBand(name: string, value: number): boolean {
  if (name.endsWith('FREE CL'))
    return value < HEALTHY.freeChlorine[0] || value > HEALTHY.freeChlorine[1];
  if (name.endsWith(' PH')) return value < 7.0 || value > 7.8;
  if (name.endsWith('BATHERS')) return value >= 1;
  return false;
}

/** WH-CP3: the chemical transfer control box in the wet hall (prompt 091), its lines as WH-CP1, the panel it replaced, showed them. */
function distributionPanel(): PanelBinding {
  const page = (chemical: Chemical, name: string) => {
    const line = (c: BridgeContext) => c.world.distribution[chemical];
    const AT = `WH-CP3, the chemical transfer control box in the wet hall`;
    const gauges: Record<string, Read<readonly [number, string]>> = {
      [`${name}/0/BULK STORE`]: (c) =>
        [
          c.world.chemicals[chemical] / STORE_CAPACITY[chemical],
          `${Math.round(c.world.chemicals[chemical])} l`,
        ] as const,
    };
    DAY_TANKS[chemical].forEach((t, i) => {
      const label = [
        'PL1 LOUNGE',
        'PL2 OLYMPIC',
        'PL3 JACUZZI',
        'PL4 FOOTBATH',
      ][['pool_01', 'pool_02', 'pool_03', 'pool_04'].indexOf(t.site)];
      gauges[`${name}/0/${label}`] = (c) =>
        [
          dayLevel(chemical, i, line(c)),
          `${Math.round(line(c).tanks[i].litres)} l`,
        ] as const;
    });
    const lamps: Record<string, Read<boolean>> = {
      [`${name}/0/SEL AUTO`]: (c) => line(c).mode === 'auto',
      [`${name}/0/SEL HAND`]: (c) => line(c).mode === 'hand',
      [`${name}/0/PUMP RUN`]: (c) =>
        transferRunning(
          line(c),
          c.world.chemicals[chemical],
          STORE_CAPACITY[chemical],
        ),
      [`${name}/0/PUMP AUTO`]: (c) => line(c).hoa === 'auto',
      [`${name}/0/HH TRIP`]: (c) => line(c).tripped,
    };
    const windows = (c: BridgeContext) => [
      line(c).tanks.some(
        (_t, i) => dayLevel(chemical, i, line(c)) < DISTRIBUTION.low / 2,
      ),
      line(c).tripped,
      c.world.chemicals[chemical] < STORE_CAPACITY[chemical] * HEALTHY.stock,
      line(c).hoa !== 'auto' || line(c).mode !== 'auto',
    ];
    return { gauges, lamps, windows, AT };
  };
  const hypo = page('hypochlorite', 'HYPOCHLORITE');
  const acid = page('acid', 'ACID');
  return {
    code: 'WH-CP3',
    model: { room: 'wet_hall', node: 'control-box' },
    gauges: { ...hypo.gauges, ...acid.gauges },
    lamps: { ...hypo.lamps, ...acid.lamps },
    windows: (c) => [...hypo.windows(c), ...acid.windows(c)],
  };
}

/** CR-CP3: the chart recorders, as trends of the world's water and air. */
function chartRecorders(): PanelBinding {
  return {
    code: 'CR-CP3',
    model: { room: 'control_room', node: 'chart-recorders' },
    trends: {
      'POOL TEMPERATURES': (c) =>
        share(c.world.pools.pool_02.temperature, 20, 40),
      'CHLORINE AND PH': (c) => share(c.world.pools.pool_02.freeChlorine, 0, 4),
      'HALL AIR · 7 DAYS': (c) => share(c.world.pools.pool_02.hallAir, 20, 40),
    },
  };
}

/** WH-T2: the backwash pit's pump panel in the wet hall (its selectors and duty local). */
function pitPumps(): PanelBinding {
  const AT = 'the pit pump panel in the wet hall';
  const pit = (c: BridgeContext) => c.world.wetHall;
  const floats = (c: BridgeContext) => pitFloats(pit(c).backwashTank);
  const mode = (n: 0 | 1) => ({
    value: (c: BridgeContext) =>
      ['hand', 'off', 'auto'].indexOf(pit(c).pitPumps.modes[n]),
    choose: () => local(AT),
  });
  const duty = (n: 0 | 1) =>
    Object.assign(local(AT), {
      lit: (c: BridgeContext) => pit(c).pitPumps.duty === n,
    });
  return {
    code: 'WH-T2',
    model: { room: 'wet_hall', node: 'holding' },
    gauges: {
      'PIT DEPTH': (c) =>
        [
          pit(c).backwashTank / WET_HALL_PLANT.backwashTank,
          `${pit(c).backwashTank.toFixed(1)} m³`,
        ] as const,
    },
    selectors: { 'P-601': mode(0), 'P-602': mode(1) },
    buttons: { 'DUTY 1': duty(0), 'DUTY 2': duty(1) },
    lamps: {
      'P1 RUN': (c) => pit(c).pitPumps.running[0],
      'P2 RUN': (c) => pit(c).pitPumps.running[1],
      'HIGH LEVEL': (c) => floats(c).high,
      'HI-HI': (c) => floats(c).highHigh,
    },
  };
}

/** LB-CAB1: the delivery fill cabinet on the loading bay: the stores it fills. */
function fillCabinet(): PanelBinding {
  const store = (chemical: Chemical) => (c: BridgeContext) =>
    [
      c.world.chemicals[chemical] / STORE_CAPACITY[chemical],
      `${Math.round(c.world.chemicals[chemical])} l`,
    ] as const;
  return {
    code: 'LB-CAB1',
    model: { room: 'loading_bay', node: 'fill' },
    banners: { 'COUPLE 2" HYPO · 1½" ACID': () => false },
    gauges: { 'HYPO TANK': store('hypochlorite'), 'ACID IBC': store('acid') },
    lamps: {
      'TANK FULL ALARM': (c) =>
        c.world.chemicals.hypochlorite >= STORE_CAPACITY.hypochlorite * 0.98 ||
        c.world.chemicals.acid >= STORE_CAPACITY.acid * 0.98,
      // Deliveries are not yet modelled as a filling: dark.
      FILLING: null,
      'DOOR UNLOCKED': null,
    },
    buttons: {
      'HORN SILENCE': unmodelled('the fill cabinet’s horn'),
      'LAMP TEST': VIEW,
    },
  };
}

/** The assistant duty manager's panel, at the command chair on the right: bathers and opening. */
export const ASSISTANT_DUTY_MANAGER: ParodySpec = {
  original: 'RECEPTION’S COUNT OF BATHERS AND THE OPENING HOURS',
  title: 'ASSISTANT DUTY MANAGER',
  code: 'ADM-01',
  colour: 'lilac',
  size: { w: 1.1, h: 0.62 },
  pages: [
    {
      name: 'BATHERS',
      columns: [
        [{ kind: 'gauges', items: POOLS.map(([, n]) => `${n} BATHERS`) }],
      ],
    },
    {
      name: 'AWAY',
      columns: [
        [{ kind: 'list', rows: POOLS.map(([, n]) => `${n} TURNED AWAY`) }],
      ],
    },
    {
      name: 'HOURS',
      columns: [
        [
          {
            kind: 'readouts',
            items: [
              ['TIME', '', 0, 0],
              ['OPENS', '', 0, 0],
              ['CLOSES', '', 0, 0],
            ],
          },
          { kind: 'lamps', labels: ['CENTRE OPEN'] },
        ],
      ],
    },
  ],
};

/** The bather welfare counsellor's panel, at the command chair on the left: warmth and comfort. */
export const BATHER_WELFARE: ParodySpec = {
  original: 'THE POOLS’ THERMOSTATS AND THE HALLS’ AIR',
  title: 'BATHER WELFARE COUNSELLOR',
  code: 'BWC-01',
  colour: 'anakiwa',
  size: { w: 1.1, h: 0.62 },
  pages: [
    {
      name: 'WATER',
      columns: [
        [
          {
            kind: 'readouts',
            items: POOLS.map(([, n]) => [`${n} WATER`, '°C', 0, 0] as const),
          },
        ],
      ],
    },
    {
      name: 'SET',
      columns: [
        [
          {
            kind: 'readouts',
            items: [
              ['LOUNGE SET', '°C', 0, 0],
              ['OLYMPIC SET', '°C', 0, 0],
            ],
          },
          { kind: 'buttons', labels: ['LOUNGE WARMER', 'LOUNGE COOLER'] },
          { kind: 'buttons', labels: ['OLYMPIC WARMER', 'OLYMPIC COOLER'] },
        ],
      ],
    },
    {
      name: 'AIR',
      columns: [
        [
          {
            kind: 'readouts',
            items: POOLS.map(([, n]) => [`${n} HALL AIR`, '°C', 0, 0] as const),
          },
        ],
      ],
    },
    {
      name: 'HUMIDITY',
      columns: [
        [
          {
            kind: 'readouts',
            items: POOLS.map(
              ([, n]) => [`${n} HUMIDITY`, '%RH', 0, 0] as const,
            ),
          },
        ],
      ],
    },
  ],
};

function assistantDutyManager(): PanelBinding {
  const hhmm = (h: number) => `${String(h).padStart(2, '0')}:00`;
  return {
    code: 'ADM-01',
    model: { room: 'control_room', node: 'operator-desk' },
    gauges: Object.fromEntries(
      POOLS.map(([pool, n]) => [
        `${n} BATHERS`,
        (c: BridgeContext) => {
          const now = c.world.bathers.pools[pool].now;
          return [now / CAPACITY[pool], `${now} / ${CAPACITY[pool]}`] as const;
        },
      ]),
    ),
    rows: Object.fromEntries(
      POOLS.map(([pool, n]) => [
        `${n} TURNED AWAY`,
        (c: BridgeContext) => String(c.world.bathers.pools[pool].turnedAway),
      ]),
    ),
    readouts: {
      TIME: (c) => {
        const { hour } = clock(c.world.time);
        const h = Math.floor(hour);
        const m = Math.floor((hour - h) * 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      },
      OPENS: () => hhmm(OPENS),
      CLOSES: () => hhmm(CLOSES),
    },
    lamps: { 'CENTRE OPEN': (c) => isOpen(c.world.time) },
  };
}

function batherWelfare(): PanelBinding {
  const readouts: Record<string, Read<number>> = {};
  for (const [pool, n] of POOLS) {
    readouts[`${n} WATER`] = (c) => c.world.pools[pool].temperature;
    readouts[`${n} SET`] = (c) => c.world.pools[pool].setpoint;
    readouts[`${n} HALL AIR`] = (c) => c.world.pools[pool].hallAir;
    readouts[`${n} HUMIDITY`] = (c) => c.world.pools[pool].hallRh;
  }
  // The pools' thermostats (`pool/setpoint`), half a degree a press, in range.
  const nudge = (pool: PoolId, by: number): Command =>
    act((c) => ({
      type: 'pool/setpoint',
      pool,
      celsius: Math.min(
        SETPOINT_RANGE.max,
        Math.max(SETPOINT_RANGE.min, c.world.pools[pool].setpoint + by),
      ),
    }));
  return {
    code: 'BWC-01',
    model: { room: 'control_room', node: 'operator-desk' },
    readouts,
    buttons: {
      'LOUNGE WARMER': nudge('pool_01', 0.5),
      'LOUNGE COOLER': nudge('pool_01', -0.5),
      'OLYMPIC WARMER': nudge('pool_02', 0.5),
      'OLYMPIC COOLER': nudge('pool_02', -0.5),
    },
  };
}

/** The bridge's wired panels, by their specs' codes. */
export const BRIDGE_BINDINGS: Readonly<Record<string, PanelBinding>> =
  Object.fromEntries(
    [
      pumpPanel(),
      mainPoolMimic(),
      heatingMimic(),
      airMimic(),
      dosingController(),
      changeover(),
      fireRepeater(),
      annunciator(),
      centralControl(),
      distributionPanel(),
      chartRecorders(),
      pitPumps(),
      fillCabinet(),
      assistantDutyManager(),
      batherWelfare(),
    ].map((b) => [b.code, b]),
  );

/** A wired panel's spec, by its code: dev48's, or Central Control's. */
export function bridgeSpec(code: string): ParodySpec {
  if (code === CENTRAL_CONTROL.code) return CENTRAL_CONTROL;
  if (code === ASSISTANT_DUTY_MANAGER.code) return ASSISTANT_DUTY_MANAGER;
  if (code === BATHER_WELFARE.code) return BATHER_WELFARE;
  const spec = PARODY_SPECS.find((s) => s.code === code);
  if (!spec) throw new Error(`No reimagined panel ${code}`);
  return spec;
}

/** What a refused press says on its panel. */
export function refusal(cmd: Command): string | null {
  if (cmd.kind === 'local')
    return `LOCAL CONTROL ONLY · AT ${cmd.at.toUpperCase()}`;
  if (cmd.kind === 'unmodelled')
    return `NOT YET MODELLED · ${cmd.what.toUpperCase()}`;
  return null;
}

/**
 * What the main viewscreen shows (mission 095, for now): the alarm list
 * while any alarm on the bridge's annunciator is unaccepted, else the
 * main pool's circuit.
 */
export const viewscreenShows = (unaccepted: number): 'ALARMS' | 'SCHEMATIC' =>
  unaccepted > 0 ? 'ALARMS' : 'SCHEMATIC';
