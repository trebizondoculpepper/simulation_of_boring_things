import { OLYMPIC_FILTER_WASHING } from './olympic-filter-washing';
import { BRIDGE_BINDINGS, bridgeSpec } from './bridge-bindings';
import { STATION_NAMES } from './station-schematics';
import { OVERVIEWS } from './schematic-overviews';
import {
  BACK_WALL_SCREENS,
  DESK_SCREEN_STATIONS,
} from './control-room-prototype';
import { cornerRadius } from '../../components/industrial-control/logic/touch-surface';
import { BRIDGE_CONSOLES, bridgeConsole } from '../../../game/bridge-consoles';
import type {
  BridgeConsole,
  ConsoleChoice,
  ConsoleClass,
} from '../../../game/bridge-consoles';

export type { ConsoleClass } from '../../../game/bridge-consoles';

/**
 * The bridge's page registry (mission 095; the plan in
 * `doc/research/bridge-console-paging.md`): every page a console can
 * show, by a stable id, in paging order: the wired panels, the stations'
 * schematic browsers, the hydrodynamic overviews, the back walls'
 * displays, and the pages built for the bridge itself (`custom`, each
 * its own view, `views/bridge-pages.ts`). A console pages through those
 * that suit its kind (`consolePages`); the world keeps each console's
 * choice (`game/bridge-consoles.ts`). Pure.
 */

export type BridgePageKind =
  | 'panel'
  | 'schematics'
  | 'overview'
  | 'display'
  | 'custom';

export interface BridgePage {
  /** Stable, lower-case, kebab-case: what the world stores. Never renamed once shipped. */
  id: string;
  title: string;
  /** At most 14 characters, for a pager's strip or a page button. */
  short: string;
  kind: BridgePageKind;
  /** Which kinds of console may show it. */
  suits: readonly ConsoleClass[];
  /** 'panel': its spec's code; 'schematics': its station; 'overview': its overview's id; 'display': its back-wall display's title; 'custom': its id. */
  source: string;
  /** What it is bound to in its room's model (`world-in-model.ts`). */
  model: { room: string; node: string };
}

/** A name as a page id's part: `FLOW NAVIGATOR` → `flow-navigator`. */
export const kebab = (words: string) =>
  words
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** The wired panels, in paging order, each with its strip's name. A panel added to `BRIDGE_BINDINGS` is listed here, where it belongs; never reordering the rest. */
export const PANEL_PAGE_ORDER: readonly { code: string; short: string }[] = [
  { code: 'PL2-CP1', short: 'CIRCULATION' },
  { code: 'PL2-CP2', short: 'DOSING' },
  { code: 'CR-MP2', short: 'HEATING' },
  { code: 'CR-MP3', short: 'AIR' },
  { code: 'SR-IS3', short: 'CHANGEOVER' },
  { code: 'CR-CP6', short: 'FIRE' },
  { code: 'CC-01', short: 'CENTRAL CTRL' },
  { code: 'ADM-01', short: 'ASST DUTY MGR' },
  { code: 'BWC-01', short: 'WELFARE' },
  { code: 'CR-MP1', short: 'MAIN POOL' },
  { code: 'CR-CP2', short: 'ANNUNCIATOR' },
  { code: 'CR-CP3', short: 'RECORDERS' },
  { code: 'WH-T2', short: 'PIT PUMPS' },
  { code: 'LB-CAB1', short: 'FILL CABINET' },
  { code: 'WH-CP1', short: 'DISTRIBUTION' },
];

const STATION_SHORT: Record<string, string> = {
  'FLOW NAVIGATOR': 'FLOW NAV',
  'BOILER HELMSMAN': 'BOILERS',
  'CHIEF ELECTRICAL ENGINEER': 'ELECTRICAL',
  'DISINFECTION TACTICAL': 'DISINFECTION',
  'LIFE SUPPORT OFFICER': 'LIFE SUPPORT',
  'SECURITY CHIEF': 'SECURITY',
  'WATER SCIENCE OFFICER': 'WATER SCI',
  'DRAINAGE OFFICER': 'DRAINAGE',
  'LOADING BAY CHIEF': 'LOADING BAY',
  'OPERATIONS OFFICER': 'OPERATIONS',
  'CENTRAL CONTROL': 'CENTRAL',
  'MAIN VIEWSCREEN': 'VIEWSCREEN',
};

const DISPLAY_SHORT: Record<string, string> = {
  'THE WHOLE PLANT': 'WHOLE PLANT',
  'HEAT AND GAS': 'HEAT & GAS',
  'AIR AND POWER': 'AIR & POWER',
};

/** The bridge's own desk, which its schematic screens are bound to. */
const DESK = { room: 'control_room', node: 'operator-desk' };

const EVERY: readonly ConsoleClass[] = [
  'panel',
  'screen',
  'wall',
  'back',
  'viewscreen',
];

export const BRIDGE_PAGES: readonly BridgePage[] = [
  ...PANEL_PAGE_ORDER.flatMap(({ code, short }): BridgePage[] => {
    const binding = BRIDGE_BINDINGS[code];
    return binding
      ? [
          {
            id: code.toLowerCase(),
            title: bridgeSpec(code).title,
            short,
            kind: 'panel',
            suits: ['panel', 'wall', 'viewscreen'],
            source: code,
            model: binding.model,
          },
        ]
      : [];
  }),
  {
    id: OLYMPIC_FILTER_WASHING.id,
    title: OLYMPIC_FILTER_WASHING.title,
    short: OLYMPIC_FILTER_WASHING.short,
    kind: 'custom',
    suits: EVERY,
    source: OLYMPIC_FILTER_WASHING.id,
    model: OLYMPIC_FILTER_WASHING.model,
  },
  ...STATION_NAMES.map((station): BridgePage => ({
    id: `schematics.${kebab(station)}`,
    title: station,
    short: STATION_SHORT[station] ?? station.slice(0, 14),
    kind: 'schematics',
    suits: EVERY,
    source: station,
    model: DESK,
  })),
  ...OVERVIEWS.map((o): BridgePage => ({
    id: `overview.${o.id}`,
    title: o.title,
    short: o.id.toUpperCase().slice(0, 14),
    kind: 'overview',
    suits: ['screen', 'wall', 'back', 'viewscreen'],
    source: o.id,
    model: DESK,
  })),
  ...BACK_WALL_SCREENS.map((s): BridgePage => ({
    id: `display.${kebab(s.title)}`,
    title: s.title,
    short: DISPLAY_SHORT[s.title] ?? s.title.slice(0, 14),
    kind: 'display',
    suits: ['screen', 'wall', 'back', 'viewscreen'],
    source: s.title,
    model: DESK,
  })),
];

export const bridgePage = (id: string): BridgePage | undefined =>
  BRIDGE_PAGES.find((p) => p.id === id);

/**
 * Each role's displays (the owner, 2026-10-27: "the lower display you set
 * determines which upper displays are available"): a workstation's lower
 * console, its input panel, is set to a role (an officer) by ◄ and ►, and
 * shows that role's panel (the first here); its upper displays then page
 * only through the role's displays (the rest: its schematic browser and
 * its neighbours', the overviews of its systems, the back walls' displays
 * that show them). Keyed by role, as the stations' names.
 */
export const ROLE_PAGES: Readonly<Record<string, readonly string[]>> = {
  'flow-navigator': [
    'pl2-cp1',
    'schematics.flow-navigator',
    'olympic-filter-washing',
    'overview.olympic',
    'overview.lounge',
    'overview.jacuzzi',
    'overview.footbath',
    'overview.backwash',
    'display.main-pools',
    'display.small-pools',
  ],
  'disinfection-tactical': [
    'pl2-cp2',
    'schematics.disinfection-tactical',
    'schematics.water-science-officer',
    'overview.olympic',
    'overview.lounge',
    'display.main-pools',
  ],
  'boiler-helmsman': [
    'cr-mp2',
    'schematics.boiler-helmsman',
    'overview.heating',
    'overview.gas',
    'display.heat-and-gas',
  ],
  'life-support-officer': [
    'cr-mp3',
    'schematics.life-support-officer',
    'overview.air',
    'display.air-and-power',
  ],
  'chief-electrical-engineer': [
    'sr-is3',
    'schematics.chief-electrical-engineer',
    'overview.power',
    'display.air-and-power',
  ],
  'security-chief': [
    'cr-cp6',
    'schematics.security-chief',
    'overview.gas',
    'display.site-status',
  ],
  'central-control': [
    'cc-01',
    'schematics.central-control',
    'schematics.main-viewscreen',
    'display.site-status',
    'display.the-whole-plant',
  ],
  'assistant-duty-manager': [
    'adm-01',
    'schematics.central-control',
    'display.site-status',
    'display.the-whole-plant',
  ],
  'bather-welfare-counsellor': [
    'bwc-01',
    'schematics.main-viewscreen',
    'display.main-pools',
    'display.small-pools',
  ],
  'water-science-officer': [
    'cr-cp3',
    'schematics.water-science-officer',
    'schematics.disinfection-tactical',
    'overview.olympic',
    'overview.lounge',
    'overview.jacuzzi',
    'overview.footbath',
    'display.main-pools',
    'display.small-pools',
  ],
  'drainage-officer': [
    'wh-t2',
    'schematics.drainage-officer',
    'overview.backwash',
    'overview.make-up',
  ],
  'loading-bay-chief': [
    'lb-cab1',
    'schematics.loading-bay-chief',
    'schematics.operations-officer',
  ],
  'operations-officer': [
    'wh-cp1',
    'schematics.operations-officer',
    'schematics.loading-bay-chief',
    'overview.make-up',
  ],
};

/** The roles in paging order, each with its panel's page id. */
export const ROLES: readonly { role: string; panel: string }[] = Object.entries(
  ROLE_PAGES,
).map(([role, ids]) => ({ role, panel: ids[0] }));

/** The role a lower console's page sets, by the page (its role's panel). */
export const roleOfPage = (page: string) =>
  ROLES.find((r) => r.panel === page)?.role;

const pagesOf = (ids: readonly string[]) =>
  ids.flatMap((id) => {
    const p = bridgePage(id);
    return p ? [p] : [];
  });

/** Turned round so `first` leads, if it is there. */
const from = (pages: BridgePage[], first: string) => {
  const at = pages.findIndex((p) => p.id === first);
  return at < 0 ? pages : [...pages.slice(at), ...pages.slice(0, at)];
};

type Choices = Readonly<Record<string, ConsoleChoice>>;

/** The extra-wide consoles: Central Control's, 3 m across the operator's desk. */
export const WIDE_CONSOLES: ReadonlySet<string> = new Set([
  'central-control.panel',
]);

/**
 * Whether a page was designed for an extra-wide console: a wired panel at
 * least 3.5 times as wide as it is high (Central Control's is 3.0 by
 * 0.62 m). The rest are laid out for the stations' displays.
 */
export function extraWide(page: BridgePage): boolean {
  if (page.kind !== 'panel') return false;
  const size = (bridgeSpec(page.source) as { size?: { w: number; h: number } })
    .size;
  return Boolean(size && size.w / size.h >= 3.5);
}

/** An upper display's place among its lower console's uppers, from 0. */
const slotOf = (c: BridgeConsole) =>
  BRIDGE_CONSOLES.filter((k) => k.governor === c.governor).indexOf(c);

/** The role a workstation's lower console `id` is set to now. */
export function roleOf(id: string, choices: Choices): string | undefined {
  const page = pageOf(id, choices);
  return page && roleOfPage(page.id);
}

/**
 * The pages a console pages through: a workstation's lower console, the
 * roles' panels (its own default first, so ► from a fresh console goes to
 * the next, ◄ wraps to the last); an upper display, its lower console's
 * role's displays that suit it; any other (the front walls, the back
 * walls' displays, the viewscreen), every page that suits it, its own
 * default first.
 */
export function consolePages(c: BridgeConsole, choices: Choices): BridgePage[] {
  // Central Control's extra-wide console shows only the designs made as
  // wide as it (the owner, 2026-10-28: a station's smaller panel there
  // shrank into the middle of it).
  if (WIDE_CONSOLES.has(c.id))
    return from(BRIDGE_PAGES.filter(extraWide), c.defaultPage);
  if (c.role) return from(pagesOf(ROLES.map((r) => r.panel)), c.defaultPage);
  if (c.governor) {
    const role = roleOf(c.governor, choices);
    const pages = pagesOf(role ? ROLE_PAGES[role] : []).filter((p) =>
      p.suits.includes(c.kind),
    );
    if (pages.length) return pages;
  }
  return from(
    BRIDGE_PAGES.filter((p) => p.suits.includes(c.kind)),
    c.defaultPage,
  );
}

/**
 * What console `id` shows: its chosen page where it is among its pages;
 * otherwise its default if that is; otherwise (an upper display whose
 * role has changed) its own entry of its role's displays, each upper
 * display of a station a different one where there are enough.
 */
export function pageOf(id: string, choices: Choices): BridgePage | undefined {
  const c = bridgeConsole(id);
  if (!c) return undefined;
  const pages = consolePages(c, choices);
  const chosen = choices[id]?.page;
  return (
    (chosen ? pages.find((p) => p.id === chosen) : undefined) ??
    pages.find((p) => p.id === c.defaultPage) ??
    pages[Math.max(0, slotOf(c)) % Math.max(1, pages.length)]
  );
}

/** The page `direction` steps from what console `id` shows, wrapping round. */
export function stepPage(
  id: string,
  choices: Choices,
  direction: -1 | 1,
): BridgePage | undefined {
  const c = bridgeConsole(id);
  const now = pageOf(id, choices);
  if (!c || !now) return undefined;
  const pages = consolePages(c, choices);
  const at = Math.max(
    0,
    pages.findIndex((p) => p.id === now.id),
  );
  return pages[(at + direction + pages.length) % pages.length];
}

/**
 * A lower console set to another role (`page`, that role's panel): its
 * upper displays each reset to their own entry of the new role's
 * displays (the first, or a different one each where a station has
 * several). The actions to dispatch, its own first.
 */
export function chooseRole(
  id: string,
  page: string,
  choices: Choices,
): { type: 'bridge/console'; console: string; page: string | null }[] {
  const after = {
    ...choices,
    [id]: { page, locked: choices[id]?.locked ?? false },
  };
  return [
    { type: 'bridge/console', console: id, page },
    ...BRIDGE_CONSOLES.filter((k) => k.governor === id).map((k, slot) => {
      const pages = consolePages(k, after);
      return {
        type: 'bridge/console' as const,
        console: k.id,
        page: pages.length ? pages[slot % pages.length].id : null,
      };
    }),
  ];
}

/** A back-wall display's console id, by its title. */
export const backConsoleId = (title: string) => `back.${kebab(title)}`;

/**
 * The console ids of the stations' schematic screens (`stationScreenPlaces`:
 * `<station>.screen`) and then the desk's (`deskScreenPlaces`:
 * `desk.<segment side>.<k from 1>`), in the places' order.
 */
export function screenConsoleIds(
  stations: readonly { station: string }[],
  desk: readonly { station: string }[],
): string[] {
  const side = (station: string) =>
    Object.entries(DESK_SCREEN_STATIONS).find(([, s]) => s === station)?.[0] ??
    '6';
  const counted = new Map<string, number>();
  return [
    ...stations.map((p) => `${kebab(p.station)}.screen`),
    ...desk.map((p) => {
      const k = (counted.get(p.station) ?? 0) + 1;
      counted.set(p.station, k);
      return `desk.${side(p.station)}.${k}`;
    }),
  ];
}

/** A pager strip's height for a glass `h` metres high, metres; it is five times as wide. */
export const pagerHeight = (h: number) =>
  Math.min(0.36, Math.max(0.035, 0.055 * h));

/** The gap between two pager strips side by side (Central Control's), metres. */
export const PAGER_GAP = 0.004;

/**
 * Where a pager strip goes on a glass `w` × `h` about its middle, metres:
 * in its bottom-left corner, clear of the rounded corner; a console's
 * further strips (Central Control's for the viewscreen) beside it to the
 * right, `slot` strips along, over the frame's bottom bar.
 */
export function pagerPlace(w: number, h: number, slot = 0) {
  const hp = pagerHeight(h);
  const inset = cornerRadius(w, h) + 0.004;
  return {
    x: -w / 2 + inset + (5 * hp) / 2 + slot * (5 * hp + PAGER_GAP),
    y: -h / 2 + inset + hp / 2,
    w: 5 * hp,
    h: hp,
  };
}

/**
 * The pages a wired panel shows after its own, by its spec's code: the
 * Flow Navigator's PL2-CP1 (PUMPS, MIMIC) with OLYMPIC FILTER WASHING
 * (FILTER WASH). Also a page of its own in the registry.
 */
export const PANEL_PAGES: Readonly<Record<string, readonly string[]>> = {
  'PL2-CP1': [OLYMPIC_FILTER_WASHING.id],
};
