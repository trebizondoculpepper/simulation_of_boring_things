import { OLYMPIC_FILTER_WASHING } from './olympic-filter-washing';

/**
 * The bridge's page registry (mission 095; the plan in
 * `doc/research/bridge-console-paging.md`): every page a console can
 * show, by a stable id, for the bridge's per-console paging. For now it
 * holds the pages built for the bridge itself (`custom`, each its own
 * view, `views/bridge-pages.ts`); the paging work adds the wired panels,
 * the stations' browsers, the overviews and the displays. Until that
 * paging, a panel may carry pages after its own (`PANEL_PAGES`). Pure.
 */

export type BridgePageKind =
  | 'panel'
  | 'schematics'
  | 'overview'
  | 'display'
  | 'custom';

export type ConsoleClass = 'panel' | 'screen' | 'wall' | 'back' | 'viewscreen';

export interface BridgePage {
  /** Stable, lower-case, kebab-case: what the world will store. Never renamed once shipped. */
  id: string;
  title: string;
  /** At most 14 characters, for a pager's strip or a page button. */
  short: string;
  kind: BridgePageKind;
  /** Which kinds of console may show it. */
  suits: readonly ConsoleClass[];
  /** What it is bound to in its room's model (`world-in-model.ts`). */
  model: { room: string; node: string };
}

export const BRIDGE_PAGES: readonly BridgePage[] = [
  {
    id: OLYMPIC_FILTER_WASHING.id,
    title: OLYMPIC_FILTER_WASHING.title,
    short: OLYMPIC_FILTER_WASHING.short,
    kind: 'custom',
    suits: ['panel', 'screen', 'wall', 'back', 'viewscreen'],
    model: OLYMPIC_FILTER_WASHING.model,
  },
];

export const bridgePage = (id: string): BridgePage | undefined =>
  BRIDGE_PAGES.find((p) => p.id === id);

/**
 * The pages a wired panel shows after its own, by its spec's code, until
 * the per-console paging: the Flow Navigator's PL2-CP1 (PUMPS, MIMIC)
 * with OLYMPIC FILTER WASHING (FILTER WASH).
 */
export const PANEL_PAGES: Readonly<Record<string, readonly string[]>> = {
  'PL2-CP1': [OLYMPIC_FILTER_WASHING.id],
};
