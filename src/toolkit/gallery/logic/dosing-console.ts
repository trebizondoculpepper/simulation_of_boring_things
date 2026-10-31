import type { Region } from '../../../ui2d/aero/logic/aero-layout';
import {
  hitRegion,
  keepInView,
  listWindow,
} from '../../../ui2d/aero/logic/aero-layout';
import {
  DOSE_ORDER,
  doseOf,
  doseText,
} from '../../../game/plant/museum-4-doses';
import { tankById } from '../../../game/plant/museum-4-lab';
import { CHALLENGES } from '../../../game/plant/museum-4-cards';
import {
  canDose,
  dosesLeft,
  scenarioView,
} from '../../../game/plant/museum-4-challenge';
import type { Hall4Game } from '../../../game/plant/museum-4-challenge';
import type { SizeIndex } from '../../../game/plant/museum-4-doses';
import type {
  Level,
  NarrationKind,
  ScenarioView,
} from '../../../game/plant/museum-4-challenge';
import type { TankId } from '../../../game/plant/museum-4-lab';

/**
 * Hall 4's dosing console, its three screens' state, layout and touch
 * regions (mission 113, `doc/plans/113/c-screens-interaction.md`): the
 * scenario screen (left), the chemical screen (middle) and the dose screen
 * (right), each 512 × 384 canvas pixels, and the reducer their touches
 * drive. What the console cannot decide itself (start, reset, dose) it
 * hands back as an effect for the challenge engine. Pure.
 */

export const SCREEN = { w: 512, h: 384 } as const;
/** Rows the chemical list shows at once. */
export const LIST_ROWS = 5;
/** The hold shown on the scenario screen is rounded to this many lab seconds (0.9 real seconds), to keep its redraws within budget. */
export const HOLD_STEP = 900;
/** Real seconds a pressed region glows. */
export const PRESS_GLOW = 0.15;

export interface ConsoleState {
  /** The chosen chemical, an index into `DOSE_ORDER`. */
  chemical: number;
  /** The list's first visible row. */
  top: number;
  size: SizeIndex;
  /** The region pressed (its glow), or null. */
  pressed: string | null;
  /** Whether RESET's confirmation is up. */
  confirmReset: boolean;
  /** The card shown on the free-play chooser. */
  pick: number;
  level: Level;
  /**
   * Whether the visitor has picked a chemical, and a size, since the last
   * dose taken or reset: the console always has a selection, so the DOSE
   * button waits for both to be chosen actively (the owner, 2026-10-31).
   */
  pickedChemical: boolean;
  pickedSize: boolean;
}

export const newConsole = (): ConsoleState => ({
  chemical: 0,
  top: 0,
  size: 2,
  pressed: null,
  confirmReset: false,
  pick: 0,
  level: 'journeyman',
  pickedChemical: false,
  pickedSize: false,
});

/**
 * Whether the dose screen shows its DOSE button: once a chemical is picked,
 * the size standing at Medium unless the visitor changes it (the owner,
 * 2026-10-31: leaving it on Medium must not hide DOSE).
 */
export const armed = (s: ConsoleState) => s.pickedChemical;

/** The console after a dose was taken: both picks to be made afresh. */
export const afterDose = (s: ConsoleState): ConsoleState => ({
  ...s,
  pickedChemical: false,
  pickedSize: false,
});

export const chosenTank = (s: ConsoleState): TankId => DOSE_ORDER[s.chemical];

/** What the console asks of the challenge engine. */
export type ConsoleEffect =
  | { type: 'start'; card: number; level: Level }
  | { type: 'reset' }
  | { type: 'abandon' }
  | { type: 'continue' }
  | { type: 'retry' }
  | { type: 'dose' };

export type ScreenId = 'scenario' | 'chemical' | 'dose';

// ---- Layouts -------------------------------------------------------------------

const rect = (x: number, y: number, w: number, h: number) => ({ x, y, w, h });
const circle = (cx: number, cy: number, r: number) =>
  rect(cx - r, cy - r, 2 * r, 2 * r);

export const SCENARIO_LAYOUT = {
  strip: rect(8, 8, 496, 40),
  caption: rect(12, 56, 488, 176),
  smallPrint: { x: 256, y: 370 },
  // Free play.
  freeText: rect(20, 96, 472, 50),
  cardPrev: circle(40, 186, 20),
  cardBox: rect(68, 166, 376, 40),
  cardNext: circle(472, 186, 20),
  levelJourneyman: rect(20, 220, 232, 40),
  levelPro: rect(260, 220, 232, 40),
  start: rect(300, 278, 192, 46),
  reset: rect(20, 278, 140, 46),
  // A challenge.
  problem: rect(20, 108, 472, 56),
  goal: rect(20, 166, 472, 40),
  progress: rect(20, 236, 472, 30),
  abandon: rect(170, 278, 150, 46),
  // Won or failed.
  banner: rect(20, 58, 472, 210),
  next: rect(176, 278, 160, 46),
  retry: rect(96, 278, 150, 46),
  freePlay: rect(266, 278, 150, 46),
  // RESET's confirmation.
  dialog: rect(56, 84, 400, 210),
  resetYes: rect(92, 232, 150, 46),
  resetNo: rect(270, 232, 150, 46),
} as const;

export const CHEMICAL_LAYOUT = {
  title: rect(8, 8, 496, 40),
  list: rect(8, 56, 448, 192),
  rowHeight: 36,
  up: circle(482, 92, 20),
  down: circle(482, 212, 20),
  describe: rect(18, 258, 476, 118),
} as const;

export const DOSE_LAYOUT = {
  title: rect(8, 8, 496, 40),
  chemical: { x: 256, y: 74 },
  segments: [0, 1, 2, 3, 4].map((i) => rect(16 + i * 97, 96, 93, 56)),
  less: circle(40, 196, 22),
  more: circle(472, 196, 22),
  amount: { x: 256, y: 196 },
  left: { x: 256, y: 242 },
  /** DOSE, the big glossy button in the screen's lower third, once armed. */
  dose: rect(116, 262, 280, 82),
  /** The hint in its place until then. */
  hint: { x: 256, y: 303 },
} as const;

/** A list row's rectangle, `i` from the window's top. */
export const rowRect = (i: number) =>
  rect(
    CHEMICAL_LAYOUT.list.x + 6,
    CHEMICAL_LAYOUT.list.y + 6 + i * CHEMICAL_LAYOUT.rowHeight,
    CHEMICAL_LAYOUT.list.w - 24,
    CHEMICAL_LAYOUT.rowHeight - 2,
  );

// ---- The view models: what each screen paints ---------------------------------------

export interface ScenarioScreen {
  view: ScenarioView;
  /** The chooser's card, its number and title, and how many there are. */
  pick: number;
  pickTitle: string;
  cards: number;
  level: Level;
  confirmReset: boolean;
  /** The narration's words while it plays, or null. */
  caption: { kind: NarrationKind; text: string } | null;
  pressed: string | null;
}

export interface ChemicalScreen {
  rows: string[];
  chemical: number;
  top: number;
  /** The chosen chemical's name and words. */
  heading: string;
  words: string;
  pressed: string | null;
}

export interface DoseScreen {
  chemical: string;
  size: SizeIndex;
  amount: string;
  /** Doses left in a challenge, or null in free play. */
  left: number | null;
  /** Whether DOSE would be taken. */
  ready: boolean;
  /** Whether the DOSE button shows (a chemical and a size picked). */
  armed: boolean;
  pressed: string | null;
}

/** The scenario screen's key: its view model, the hold rounded to `HOLD_STEP`. */
export function scenarioKey(m: ScenarioScreen) {
  const v =
    m.view.kind === 'free'
      ? m.view
      : {
          ...m.view,
          held:
            m.view.held === null
              ? null
              : Math.floor(m.view.held / HOLD_STEP) * HOLD_STEP,
        };
  return JSON.stringify({ ...m, view: v });
}

export const chemicalKey = (m: ChemicalScreen) => JSON.stringify(m);
export const doseKey = (m: DoseScreen) => JSON.stringify(m);

// ---- Touch regions -----------------------------------------------------------------

/** The scenario screen's live regions, by what it shows. */
export function scenarioRegions(m: ScenarioScreen): Region[] {
  const L = SCENARIO_LAYOUT;
  if (m.confirmReset)
    return [
      { id: 'reset-yes', rect: L.resetYes },
      { id: 'reset-no', rect: L.resetNo },
    ];
  switch (m.view.kind) {
    case 'free':
      return [
        { id: 'card-prev', rect: L.cardPrev },
        { id: 'card-next', rect: L.cardNext },
        { id: 'level-journeyman', rect: L.levelJourneyman },
        { id: 'level-pro', rect: L.levelPro },
        { id: 'start', rect: L.start },
        { id: 'reset', rect: L.reset },
      ];
    case 'challenge':
      return [
        { id: 'reset', rect: L.reset },
        { id: 'abandon', rect: L.abandon },
      ];
    case 'won':
      return [{ id: 'continue', rect: L.next }];
    case 'failed':
      return [
        { id: 'retry', rect: L.retry },
        { id: 'free-play', rect: L.freePlay },
      ];
  }
}

export function chemicalRegions(s: ConsoleState): Region[] {
  const w = listWindow(DOSE_ORDER.length, LIST_ROWS, s.top);
  return [
    ...w.shown.map((_, i) => ({ id: `row-${i}`, rect: rowRect(i) })),
    { id: 'chem-up', rect: CHEMICAL_LAYOUT.up, enabled: s.chemical > 0 },
    {
      id: 'chem-down',
      rect: CHEMICAL_LAYOUT.down,
      enabled: s.chemical < DOSE_ORDER.length - 1,
    },
  ];
}

export function doseRegions(s: ConsoleState): Region[] {
  return [
    ...DOSE_LAYOUT.segments.map((r, i) => ({ id: `size-${i}`, rect: r })),
    { id: 'size-down', rect: DOSE_LAYOUT.less, enabled: s.size > 0 },
    { id: 'size-up', rect: DOSE_LAYOUT.more, enabled: s.size < 4 },
    { id: 'dose', rect: DOSE_LAYOUT.dose, enabled: armed(s) },
  ];
}

/** The region of `screen` under canvas pixel (x, y), or null. */
export function hitScreen(
  screen: ScreenId,
  s: ConsoleState,
  scenario: ScenarioScreen,
  x: number,
  y: number,
) {
  const regions =
    screen === 'scenario'
      ? scenarioRegions(scenario)
      : screen === 'chemical'
        ? chemicalRegions(s)
        : doseRegions(s);
  return hitRegion(regions, x, y);
}

// ---- The reducer ----------------------------------------------------------------

const selectChemical = (s: ConsoleState, chemical: number): ConsoleState => {
  const c = Math.max(0, Math.min(DOSE_ORDER.length - 1, chemical));
  return {
    ...s,
    chemical: c,
    top: keepInView(s.top, c, LIST_ROWS, DOSE_ORDER.length),
  };
};

/** A press on region `id`: the console's new state, and any effect for the engine. */
export function pressConsole(
  s: ConsoleState,
  id: string,
  cards: number,
): { state: ConsoleState; effect?: ConsoleEffect } {
  const n: ConsoleState = { ...s, pressed: id };
  if (id.startsWith('row-')) {
    const w = listWindow(DOSE_ORDER.length, LIST_ROWS, s.top);
    return {
      state: selectChemical(
        { ...n, pickedChemical: true },
        w.top + Number(id.slice(4)),
      ),
    };
  }
  const c: ConsoleState = { ...n, pickedChemical: true };
  const z: ConsoleState = { ...n, pickedSize: true };
  if (id.startsWith('size-') && /\d$/.test(id))
    return { state: { ...z, size: Number(id.slice(5)) as SizeIndex } };
  switch (id) {
    case 'chem-up':
      return { state: selectChemical(c, s.chemical - 1) };
    case 'chem-down':
      return { state: selectChemical(c, s.chemical + 1) };
    case 'size-down':
      return { state: { ...z, size: Math.max(0, s.size - 1) as SizeIndex } };
    case 'size-up':
      return { state: { ...z, size: Math.min(4, s.size + 1) as SizeIndex } };
    case 'dose':
      return armed(s) ? { state: n, effect: { type: 'dose' } } : { state: s };
    case 'card-prev':
      return { state: { ...n, pick: (s.pick - 1 + cards) % cards } };
    case 'card-next':
      return { state: { ...n, pick: (s.pick + 1) % cards } };
    case 'level-journeyman':
      return { state: { ...n, level: 'journeyman' } };
    case 'level-pro':
      return { state: { ...n, level: 'pro' } };
    case 'start':
      return {
        state: n,
        effect: { type: 'start', card: s.pick, level: s.level },
      };
    case 'reset':
      return { state: { ...n, confirmReset: true } };
    case 'reset-no':
      return { state: { ...n, confirmReset: false } };
    case 'reset-yes':
      return {
        state: afterDose({ ...n, confirmReset: false }),
        effect: { type: 'reset' },
      };
    case 'abandon':
      return { state: n, effect: { type: 'abandon' } };
    case 'continue':
    case 'free-play':
      return { state: n, effect: { type: 'continue' } };
    case 'retry':
      return { state: n, effect: { type: 'retry' } };
  }
  return { state: s };
}

/** The press's glow over. */
export const releaseConsole = (s: ConsoleState): ConsoleState =>
  s.pressed ? { ...s, pressed: null } : s;

/** The console reconciled with a change of the engine's mode: the dialog and glow gone. */
export const settleConsole = (s: ConsoleState): ConsoleState =>
  s.confirmReset || s.pressed
    ? { ...s, confirmReset: false, pressed: null }
    : s;

const capital = (t: string) => t[0].toUpperCase() + t.slice(1);

export function chemicalScreen(s: ConsoleState): ChemicalScreen {
  const tank = tankById(chosenTank(s));
  const d = doseOf(tank.id);
  return {
    rows: DOSE_ORDER.map(
      (id) => `${tankById(id).code}  ${tankById(id).product}`,
    ),
    chemical: s.chemical,
    top: listWindow(DOSE_ORDER.length, LIST_ROWS, s.top).top,
    heading: `${tank.code} · ${capital(d.name)}`,
    words: `${d.does} ${d.use}`,
    pressed:
      s.pressed?.startsWith('row-') || s.pressed?.startsWith('chem-')
        ? s.pressed
        : null,
  };
}

/** The dose screen, `left` and `ready` from the engine (null and true when there is none). */
export function doseScreen(
  s: ConsoleState,
  left: number | null,
  ready: boolean,
): DoseScreen {
  const tank = chosenTank(s);
  return {
    chemical: `${tankById(tank).code} · ${capital(doseOf(tank).name)}`,
    size: s.size,
    amount: doseText(tank, s.size),
    left,
    ready,
    armed: armed(s),
    pressed:
      s.pressed?.startsWith('size-') || s.pressed === 'dose' ? s.pressed : null,
  };
}

export function scenarioScreen(
  s: ConsoleState,
  view: ScenarioView,
  caption: ScenarioScreen['caption'],
  titles: readonly string[] = CHALLENGES.map((c) => c.title),
): ScenarioScreen {
  const scenarioIds = new Set(
    scenarioRegions({
      view,
      pick: 0,
      pickTitle: '',
      cards: 0,
      level: s.level,
      confirmReset: s.confirmReset,
      caption: null,
      pressed: null,
    }).map((r) => r.id),
  );
  return {
    view,
    pick: s.pick,
    pickTitle: titles[s.pick] ?? '',
    cards: titles.length,
    level: s.level,
    confirmReset: s.confirmReset,
    caption,
    pressed: s.pressed && scenarioIds.has(s.pressed) ? s.pressed : null,
  };
}

/** All three screens from the console and the engine's game. */
export function consoleScreens(
  s: ConsoleState,
  g: Hall4Game,
  caption: ScenarioScreen['caption'],
) {
  const left = g.card ? dosesLeft(g) : null;
  return {
    scenario: scenarioScreen(s, scenarioView(g), caption),
    chemical: chemicalScreen(s),
    dose: doseScreen(s, left, canDose(g)),
  };
}

/** The scenario screen's demonstration states, for the dev room (`?console=`). */
export const DEMO_STATES = [
  'free',
  'challenge',
  'holding',
  'won',
  'out',
] as const;
export type DemoState = (typeof DEMO_STATES)[number];

/** A demonstration state's scenario view, from the first card. */
export function demoView(state: DemoState, heldSeconds = 2520): ScenarioView {
  if (state === 'free') return { kind: 'free', swimmers: 20 };
  const c = CHALLENGES[0];
  return {
    kind: state === 'won' ? 'won' : state === 'out' ? 'failed' : 'challenge',
    title: c.title,
    swimmers: c.swimmers,
    problem: c.problem,
    goal: c.goal,
    level: 'journeyman',
    par: c.pars.journeyman,
    used: state === 'challenge' ? 0 : state === 'holding' ? 1 : 2,
    held: state === 'holding' ? heldSeconds : state === 'won' ? 3600 : null,
    out: state === 'out' ? ['pH'] : state === 'challenge' ? ['pH'] : [],
  };
}
