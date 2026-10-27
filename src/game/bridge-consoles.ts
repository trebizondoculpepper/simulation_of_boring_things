/**
 * The bridge's consoles' pages and locks (mission 095; the owner,
 * 2026-10-27: "page left and right and lock each of the consoles in
 * place, and it should remember what I've chosen for each console"; the
 * plan in `doc/research/bridge-console-paging.md`). Every console on the
 * bridge by a stable id, the kind of place it is, and the page it shows
 * until another is chosen; the world keeps each one's choice. The world
 * stores only page ids: which pages exist, and which suit which console,
 * is the bridge's page registry's (`gallery/logic/bridge-pages.ts`),
 * which falls back to a console's default for an id it does not know.
 * Pure.
 */

/** The kind of place a console is, for which pages suit it. */
export type ConsoleClass = 'panel' | 'screen' | 'wall' | 'back' | 'viewscreen';

/** One console's choice: its page and its lock. */
export interface ConsoleChoice {
  /** A page id of the bridge's registry; null for the console's own default. */
  page: string | null;
  /** Held on its page: a display that turns through its designs by itself no longer does (the owner, 2026-10-27); ◄ and ► still choose the page held. */
  locked: boolean;
}

export interface BridgeConsole {
  /** Stable: what the world keys its choice by. Never renamed once shipped. */
  id: string;
  kind: ConsoleClass;
  /** The page it shows until another is chosen (today's assignment). */
  defaultPage: string;
  /**
   * A workstation's lower console (its input panel): ◄ and ► choose the
   * station's role (the officer it is set to), its upper displays then
   * showing that role's displays (the owner, 2026-10-27).
   */
  role?: true;
  /** An upper display's lower console, whose role chooses the displays it pages through. */
  governor?: string;
}

const panel = (
  id: string,
  code: string,
  kind: ConsoleClass = 'panel',
): BridgeConsole => ({
  id,
  kind,
  defaultPage: code.toLowerCase(),
  ...(kind === 'panel' ? { role: true as const } : {}),
});
const screen = (
  id: string,
  station: string,
  governor?: string,
): BridgeConsole => ({
  id,
  kind: 'screen',
  defaultPage: `schematics.${station}`,
  ...(governor ? { governor: `${governor}.panel` } : {}),
});
const back = (id: string): BridgeConsole => ({
  id: `back.${id}`,
  kind: 'back',
  defaultPage: `display.${id}`,
});

/** Every console on the bridge (40). */
export const BRIDGE_CONSOLES: readonly BridgeConsole[] = [
  // The wired panels: the forward stations', the desk's, the front walls', the rear stations'.
  panel('flow-navigator.panel', 'PL2-CP1'),
  panel('disinfection-tactical.panel', 'PL2-CP2'),
  panel('boiler-helmsman.panel', 'CR-MP2'),
  panel('life-support-officer.panel', 'CR-MP3'),
  panel('chief-electrical-engineer.panel', 'SR-IS3'),
  panel('security-chief.panel', 'CR-CP6'),
  panel('central-control.panel', 'CC-01'),
  panel('assistant-duty-manager.panel', 'ADM-01'),
  panel('bather-welfare-counsellor.panel', 'BWC-01'),
  panel('east-wall.panel', 'CR-MP1', 'wall'),
  panel('west-wall.panel', 'CR-CP2', 'wall'),
  panel('water-science-officer.panel', 'CR-CP3'),
  panel('drainage-officer.panel', 'WH-T2'),
  panel('loading-bay-chief.panel', 'LB-CAB1'),
  panel('operations-officer.panel', 'WH-CP1'),
  // The stations' schematic screens: forward stations' upper screens, rear stations' on the wall.
  screen('flow-navigator.screen', 'flow-navigator', 'flow-navigator'),
  screen(
    'disinfection-tactical.screen',
    'disinfection-tactical',
    'disinfection-tactical',
  ),
  screen('boiler-helmsman.screen', 'boiler-helmsman', 'boiler-helmsman'),
  screen(
    'life-support-officer.screen',
    'life-support-officer',
    'life-support-officer',
  ),
  screen(
    'chief-electrical-engineer.screen',
    'chief-electrical-engineer',
    'chief-electrical-engineer',
  ),
  screen('security-chief.screen', 'security-chief', 'security-chief'),
  screen(
    'water-science-officer.screen',
    'water-science-officer',
    'water-science-officer',
  ),
  screen('drainage-officer.screen', 'drainage-officer', 'drainage-officer'),
  screen('loading-bay-chief.screen', 'loading-bay-chief', 'loading-bay-chief'),
  screen(
    'operations-officer.screen',
    'operations-officer',
    'operations-officer',
  ),
  // The desk's upstand screens: `desk.<segment side>.<k from 1>`.
  screen('desk.0.1', 'central-control', 'central-control'),
  screen('desk.0.2', 'central-control', 'central-control'),
  screen('desk.0.3', 'central-control', 'central-control'),
  screen('desk.0.4', 'central-control', 'central-control'),
  screen('desk.1.1', 'water-science-officer', 'assistant-duty-manager'),
  screen('desk.2.1', 'flow-navigator', 'central-control'),
  screen('desk.5.1', 'security-chief', 'central-control'),
  screen('desk.6.1', 'main-viewscreen', 'bather-welfare-counsellor'),
  // The back walls' displays.
  back('site-status'),
  back('the-whole-plant'),
  back('main-pools'),
  back('small-pools'),
  back('heat-and-gas'),
  back('air-and-power'),
  // The main viewscreen, its page chosen from Central Control.
  {
    id: 'viewscreen',
    kind: 'viewscreen',
    defaultPage: 'schematics.main-viewscreen',
  },
];

export const bridgeConsole = (id: string): BridgeConsole | undefined =>
  BRIDGE_CONSOLES.find((c) => c.id === id);

/**
 * Every console at its default page, unlocked (the plan's open choice,
 * taken 2026-10-27: unlocked, so ◄ and ► work at the first press; the
 * strip is small enough that a stray press is unlikely).
 */
export const newBridgeConsoles = (): Record<string, ConsoleChoice> =>
  Object.fromEntries(
    BRIDGE_CONSOLES.map((c) => [c.id, { page: null, locked: false }]),
  );

/**
 * A console's choice changed: the same record if nothing changes, an
 * unknown console ignored. A page is chosen locked or not: the lock holds
 * the page's own turning, not the console's paging.
 */
export function chooseConsole(
  state: Record<string, ConsoleChoice>,
  id: string,
  change: { page?: string | null; locked?: boolean },
): Record<string, ConsoleChoice> {
  const was = state[id];
  if (!was) return state;
  const locked = change.locked ?? was.locked;
  const page = change.page === undefined ? was.page : change.page;
  if (page === was.page && locked === was.locked) return state;
  return { ...state, [id]: { page, locked } };
}
