import type { World, WorldAction } from '../../../game/world';
import {
  FILTERS,
  OLYMPIC_DIRT_REF,
  olympicFlowsOf,
} from '../../../game/plant/olympic-battery';
import { washVolume } from '../../../game/plant/wash-o-tron';
import type { ProgrammeStep, WashOTron } from '../../../game/plant/wash-o-tron';
import { WET_HALL_PLANT } from '../../../game/plant/wet-hall';
import { refusal } from './bridge-bindings';

/**
 * OLYMPIC FILTER WASHING (mission 095; the owner, 2026-10-27: "a filter
 * operations console that really works, so that I can ... see the status
 * of each filter ... the dirt percentage of each filter, and then trigger
 * a cleaning operation immediately"; then, the Olympic alone for now): a
 * bridge page showing the Olympic's five filters as the world has them,
 * each one's state under the Lidoluxe Wash-O-Tron (`wash-o-tron.ts`), its
 * DIRT %, its bed's pressure difference and flow, and the wash
 * programme's progress; CLEAN NOW asks the Wash-O-Tron to wash a filter
 * out of turn (`wash-now`), as its own WASH NOW does, and the programme's
 * RUN and HOLD are worked from here. A filter's mode, its AUTO and its
 * LOCKOUT stay at the controller in the plant room (`CLAUDE.md`: local
 * controls stay local). Everything is read from the world; nothing is
 * simulated here. Pure.
 */

/** The page's identity, for any console that shows pages (the bridge's per-console paging). */
export const OLYMPIC_FILTER_WASHING = {
  id: 'olympic-filter-washing',
  title: 'OLYMPIC FILTER WASHING',
  /** Its short name, for a console's page button or pager. */
  short: 'FILTER WASH',
  code: 'PL2-WOT',
  /**
   * What it is bound to in its room's model (`world-in-model.ts`): the
   * Olympic plant room's local control panel, into which the Wash-O-Tron
   * is wired and whose filters' valves it drives.
   */
  model: { room: 'plant_pool_02', node: 'panel' },
} as const;

/** Where its local-only controls are worked. */
export const WASH_O_TRON_AT = 'the Wash-O-Tron in the Olympic plant room (PL2)';

/**
 * The loading at which a filter's backwash falls due, in its dirt
 * reference (`filterSizing().dirtRef`, the dirt that doubles a clean
 * bed's resistance): twice it, two-thirds of the bed's capacity. There
 * the bed's resistance has tripled (its pressure difference about 0.2
 * bar over clean at full flow, the usual rise to backwash at) and its
 * capture has fallen to about 70 % of a clean bed's as dirt starts to
 * break through (`bedPasses`). The Olympic's 0.7 bar alarm
 * (`FILTER_DP_LIMIT`) is never reached by its 3 m beds before they are
 * full, so it is not the mark.
 */
export const BACKWASH_DUE_LOADING = 2;

/** A gauge's full scale, % of the due point: room to show a bed past due. */
export const DIRT_FULL_SCALE = 150;

/** Filter `n`'s dirt, % of its backwash-due point: 0 clean, 100 due. */
export function dirtPercent(world: Pick<World, 'olympic'>, n: number): number {
  const dirt = world.olympic.dirt[n] ?? 0;
  return (100 * Math.max(0, dirt)) / (BACKWASH_DUE_LOADING * OLYMPIC_DIRT_REF);
}

/** Its tag (`PL2-F1`), as its valves' (`PL2-F1-V1`), and its name. */
export const filterTag = (n: number) => `PL2-F${n + 1}`;
export const filterName = (n: number) => `FILTER ${n + 1}`;

export type TileKind =
  | 'service'
  | 'washing'
  | 'changing'
  | 'out'
  | 'fault'
  | 'locked';

const STEP_WORDS: Record<ProgrammeStep, string> = {
  backwash: 'BACKWASHING',
  settle: 'SETTLING',
  rinse: 'RINSE',
};

/** One filter's tile: everything shown of it. */
export interface FilterTile {
  n: number;
  tag: string;
  name: string;
  state: string;
  kind: TileKind;
  /** Handed to the programme (its AUTO), and asked to be washed next out of turn. */
  auto: boolean;
  queued: boolean;
  dirt: number;
  /** Over its due point. */
  due: boolean;
  /** Its bed's pressure difference, bar, and its flow out of it (+ in service, − backwashing), m³/h. */
  dp: number;
  flow: number;
  /** The washing filter's progress through its step, 0–1; null when it is not the one washing. */
  progress: number | null;
}

/** The step's time, s, by the controller's setpoints. */
const stepLimit = (s: WashOTron, step: ProgrammeStep) => s.setpoints[step];

export function filterTiles(world: World): FilterTile[] {
  const s = world.washOTron;
  const flows = olympicFlowsOf(world);
  return Array.from({ length: FILTERS }, (_, n): FilterTile => {
    const f = s.filters[n];
    const washing = s.washing === n && s.step !== null;
    let state: string;
    let kind: TileKind;
    if (f.lockout) {
      state = 'LOCKED OUT';
      kind = 'locked';
    } else if (f.phase === 'fault') {
      state = 'VALVE FAULT';
      kind = 'fault';
    } else if (washing) {
      state = STEP_WORDS[s.step!];
      kind = 'washing';
      if (f.phase !== 'steady') state += ' · VALVES';
    } else if (f.phase !== 'steady') {
      state = `TO ${f.target === 'filter' ? 'SERVICE' : f.target.toUpperCase()}`;
      kind = 'changing';
    } else if (f.mode === 'filter') {
      state = 'IN SERVICE';
      kind = 'service';
    } else if (f.mode === 'isolate' || f.mode === 'drain') {
      state = f.mode === 'drain' ? 'DRAINED' : 'OUT OF SERVICE';
      kind = 'out';
    } else {
      // Backwash, rinse or settle chosen by hand at the controller.
      state = `${f.mode.toUpperCase()} · HAND`;
      kind = 'washing';
    }
    const face = flows.filters[n];
    const dirt = dirtPercent(world, n);
    return {
      n,
      tag: filterTag(n),
      name: filterName(n),
      state,
      kind,
      auto: f.auto,
      queued: s.washNow === n && !washing,
      dirt,
      due: dirt >= 100,
      dp: face?.bedBar ?? 0,
      flow: face?.riser ?? 0,
      progress:
        washing && f.phase === 'steady'
          ? Math.min(1, s.stepTime / Math.max(1, stepLimit(s, s.step!)))
          : washing
            ? 0
            : null,
    };
  });
}

/** The programme as a whole: whether it runs, what it washes, how far, and what it waits for. */
export interface ProgrammeView {
  running: boolean;
  hold: boolean;
  /** Its words: AUTO OFF, HOLD, IDLE, WAITING · PIT CAPACITY, F2 BACKWASHING … */
  words: string;
  washing: number | null;
  step: ProgrammeStep | null;
  /** The whole wash's progress, 0–1 (backwash, settle, rinse), and seconds left of it. */
  progress: number;
  left: number;
  /** The backwash pit's share of full, and whether a wash would fit in it. */
  pit: number;
  pitRoom: boolean;
}

const ORDER: readonly ProgrammeStep[] = ['backwash', 'settle', 'rinse'];

export function programmeView(world: World): ProgrammeView {
  const s = world.washOTron;
  const total = ORDER.reduce((t, k) => t + stepLimit(s, k), 0);
  let done = 0;
  if (s.step !== null) {
    const at = ORDER.indexOf(s.step);
    done =
      ORDER.slice(0, at).reduce((t, k) => t + stepLimit(s, k), 0) +
      Math.min(
        stepLimit(s, s.step),
        Number.isFinite(s.stepTime) ? s.stepTime : 0,
      );
  }
  const pit = world.wetHall.backwashTank;
  const pitHigh = WET_HALL_PLANT.backwashTank * WET_HALL_PLANT.backwashHigh;
  const words = !s.running
    ? 'AUTO OFF'
    : s.hold
      ? s.washing !== null
        ? `HOLD · F${s.washing + 1} ${STEP_WORDS[s.step!] ?? ''}`.trim()
        : 'HOLD'
      : s.washing !== null && s.step !== null
        ? `F${s.washing + 1} ${STEP_WORDS[s.step]}`
        : s.waiting
          ? `WAITING · ${s.waiting}`
          : s.washNow !== null
            ? `F${s.washNow + 1} QUEUED`
            : 'AUTO · IDLE';
  return {
    running: s.running,
    hold: s.hold,
    words,
    washing: s.washing,
    step: s.step,
    progress: s.washing !== null && total > 0 ? done / total : 0,
    left: s.washing !== null ? Math.max(0, total - done) : 0,
    pit: pit / WET_HALL_PLANT.backwashTank,
    pitRoom: pit + washVolume(s.setpoints) <= pitHigh,
  };
}

/** What a press does: the world asked (with what to say), or refused with why. */
export type WashCommand =
  | { kind: 'act'; actions: WorldAction[]; says: string }
  | { kind: 'local'; at: string }
  | { kind: 'refused'; why: string };

/** Words for a refusal, across the page's top. */
export const refusalWords = (c: WashCommand): string | null =>
  c.kind === 'act'
    ? null
    : c.kind === 'local'
      ? refusal(c)
      : c.why.toUpperCase();

/** A Wash-O-Tron button, as the world takes it. */
function wash(
  action: Extract<WorldAction, { type: 'wash-o-tron' }>['action'],
): WorldAction {
  return { type: 'wash-o-tron', action };
}

/**
 * CLEAN NOW on filter `n`: the Wash-O-Tron's WASH NOW, the filter washed
 * next, out of turn, as soon as the programme may start it (four left in
 * service, the pumps running, room in the backwash pit). With the
 * programme off (AUTO OFF) it is started too, since nothing washes
 * without it. Refused for a filter locked out or not in service (its
 * mode is set at the controller), or one already washing.
 */
export function cleanNow(world: World, n: number): WashCommand {
  const s = world.washOTron;
  const f = s.filters[n];
  const tag = filterTag(n);
  if (!f) return { kind: 'refused', why: `no filter ${n + 1}` };
  if (f.lockout)
    return { kind: 'local', at: `${tag}’s lockout, ${WASH_O_TRON_AT}` };
  if (s.washing === n) return { kind: 'refused', why: `${tag} is washing now` };
  if (f.phase === 'fault')
    return { kind: 'local', at: `RESET, ${WASH_O_TRON_AT}` };
  if (f.mode !== 'filter' || f.phase !== 'steady')
    return {
      kind: 'local',
      at: `${tag} not in service · its FILTER button, ${WASH_O_TRON_AT}`,
    };
  const actions: WorldAction[] = [wash({ act: 'wash-now', filter: n })];
  if (!s.running) actions.push(wash({ act: 'run' }));
  const busy = s.washing !== null ? ` · AFTER F${s.washing + 1}` : '';
  return {
    kind: 'act',
    actions,
    says: `${tag} WASH REQUESTED${s.running ? '' : ' · PROGRAMME STARTED'}${busy}${s.hold ? ' · PROGRAMME ON HOLD' : ''}`,
  };
}

/** RUN: the programme on (AUTO) or off. */
export function runProgramme(world: World): WashCommand {
  const running = world.washOTron.running;
  return {
    kind: 'act',
    actions: [wash({ act: 'run' })],
    says: running ? 'WASH PROGRAMME OFF' : 'WASH PROGRAMME ON',
  };
}

/** HOLD: a running programme held where it is, or let go on. */
export function holdProgramme(world: World): WashCommand {
  const s = world.washOTron;
  if (!s.running)
    return { kind: 'refused', why: 'the programme is off · RUN it first' };
  return {
    kind: 'act',
    actions: [wash({ act: 'hold' })],
    says: s.hold ? 'WASH PROGRAMME RELEASED' : 'WASH PROGRAMME HELD',
  };
}

/** A filter's LOCKOUT: worked only at the controller. */
export const lockoutFilter = (n: number): WashCommand => ({
  kind: 'local',
  at: `${filterTag(n)}’s lockout, ${WASH_O_TRON_AT}`,
});

/** A filter's AUTO (handed to the programme or not): at the controller. */
export const autoFilter = (n: number): WashCommand => ({
  kind: 'local',
  at: `${filterTag(n)}’s AUTO, ${WASH_O_TRON_AT}`,
});

/** Seconds as M:SS. */
export const minutes = (s: number) => {
  const t = Math.max(0, Math.round(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};
