import { expandForPlumbing } from './plumbing-expansion';
import type { Expansion, PlumbEdge, PlumbMedium } from './plumbing-expansion';
import { link } from './schematic-parts';
import type { SchematicFitting, SchematicNode } from './schematics';
import type { ChannelId } from './aqualis-types';

/**
 * The Dr Aqualis Trio's part of a plant room's schematic (mission 114,
 * `doc/plans/114/placement.md`, "Decisions (2026-10-31)"): the cabinet's
 * ports, the sample point on the pump discharge main (before the filters
 * and every dosing point), the sample line to the cabinet and its return
 * to the balance tank, a control link to each dosing pump, its alarm
 * output to the room's annunciator and its power feed. Its CO₂ control
 * port is declared and left unlinked (the blanked gland) until CO₂ dosing
 * exists: the seam the CO₂ valve controller's control input links to.
 * Every fitting is given, so the plumber adds none; tags derive from the
 * nodes' codes as every room's do (`model-valves.ts`). Pure.
 */

/** A port of the cabinet, as the model has it: its id and what it carries. */
export interface TrioPort {
  id: 'sampleIn' | 'sampleOut' | ChannelId | 'alarm' | 'power';
  medium: PlumbMedium;
}

/**
 * The Trio's ports: its sample in and out, and its glands (each channel's
 * control port, the alarm output and its mains entry), as the cabinet's
 * `portsOf('trio')` has them: checked by its test.
 */
export const TRIO_PORTS: readonly TrioPort[] = [
  { id: 'sampleIn', medium: 'water' },
  { id: 'sampleOut', medium: 'water' },
  { id: 'hypochlorite', medium: 'control' },
  { id: 'acid', medium: 'control' },
  { id: 'co2', medium: 'control' },
  { id: 'alarm', medium: 'control' },
  { id: 'power', medium: 'power' },
];

/** The ports left unlinked until their system exists: the CO₂ channel's. */
export const TRIO_UNLINKED_PORTS: ReadonlySet<TrioPort['id']> = new Set([
  'co2',
]);

/** Where a room's Trio meets its plant: each by a node and its port. */
export interface TrioSite {
  room: string;
  /** The room's code: PL1. */
  code: string;
  /** The cabinet's node id (kept from the old controller). */
  cabinet: string;
  /** The pump discharge main the sample is tapped from, before the filters. */
  tapping: [string, string];
  /** The balance tank the sample returns to. */
  tank: [string, string];
  /** Each automatic channel's device, by its control port (CO₂ none yet). */
  devices: Partial<Record<ChannelId, [string, string]>>;
  /** The annunciator (or panel) its alarm output goes to. */
  alarm: [string, string];
  /** Its supply: the way it is fed from, and the feed's link id. */
  power: { from: [string, string]; link: string; isolator: boolean };
}

/** The links' names, every room's alike. */
export const TRIO_LINKS = {
  tapping: 'Sample tapping',
  sample: 'Sample line',
  return: 'Sample return to the balance tank',
  hypochlorite: 'Hypochlorite dosing control',
  acid: 'Acid dosing control',
  co2: 'CO₂ dosing control',
  alarm: 'Dosing controller alarms',
} as const;

/** The sample point's node id, every room's alike; its code SP1. */
export const SAMPLE_POINT = 'sample-point';

export interface TrioParts {
  /** The nodes the Trio adds to its room: its sample point. */
  nodes: SchematicNode[];
  links: PlumbEdge[];
  fittings: SchematicFitting[];
}

/** A room's Trio parts, from where it meets the plant. */
export function trioParts(site: TrioSite, poolName: string): TrioParts {
  const { code, cabinet } = site;
  const nodes: SchematicNode[] = [
    {
      id: SAMPLE_POINT,
      kind: 'sample-point',
      code: 'SP1',
      name: `${poolName} sample point`,
    },
  ];
  const links: PlumbEdge[] = [
    link(TRIO_LINKS.tapping, site.tapping, [SAMPLE_POINT, 'in'], 'water'),
    link(
      TRIO_LINKS.sample,
      [SAMPLE_POINT, 'out'],
      [cabinet, 'sampleIn'],
      'water',
    ),
    link(TRIO_LINKS.return, [cabinet, 'sampleOut'], site.tank, 'water'),
    ...(Object.keys(site.devices) as ChannelId[]).map((c) =>
      link(TRIO_LINKS[c], [cabinet, c], site.devices[c]!, 'control'),
    ),
    link(TRIO_LINKS.alarm, [cabinet, 'alarm'], site.alarm, 'control'),
    link(site.power.link, site.power.from, [cabinet, 'power'], 'power'),
  ];
  // The sample's valves: the tapping's isolating valve at the main, the
  // cabinet's inlet ball valve at its side, its return's at its outlet;
  // in this order, so the cabinet's number IV1 (inlet) and IV2 (return).
  const valve = (
    id: string,
    edge: string,
    end: 'source' | 'target',
    role: string,
  ): SchematicFitting => ({
    id,
    kind: 'isolating-valve',
    edge,
    end,
    normally: 'open',
    role,
    operator: 'lever',
  });
  const fittings: SchematicFitting[] = [
    valve(
      `${code}.${SAMPLE_POINT}.out.iso`,
      TRIO_LINKS.sample,
      'source',
      'sample tapping isolation',
    ),
    valve(
      `${code}.${cabinet}.sampleIn.iso`,
      TRIO_LINKS.sample,
      'target',
      'sample inlet isolation',
    ),
    valve(
      `${code}.${cabinet}.sampleOut.iso`,
      TRIO_LINKS.return,
      'source',
      'sample return isolation',
    ),
    ...(site.power.isolator
      ? [
          {
            id: `${code}.${cabinet}.power.isolator`,
            kind: 'power-isolator',
            edge: site.power.link,
            end: 'target',
            normally: 'closed',
            role: 'controller isolation',
          } satisfies SchematicFitting,
        ]
      : []),
  ];
  return { nodes, links, fittings };
}

/** The Lounge's Trio (PL1-CP2), on the south wall east of the door. */
export const LOUNGE_TRIO_SITE: TrioSite = {
  room: 'plant_pool_01',
  code: 'PL1',
  cabinet: 'dosing',
  tapping: ['discharge-header', 'sample'],
  tank: ['tank', 'sample-return'],
  devices: {
    hypochlorite: ['hypo-pumps', 'control'],
    acid: ['acid-pump', 'control'],
  },
  alarm: ['annunciator', 'dosing'],
  power: {
    from: ['switch-fuse', 'dosing'],
    link: 'Dosing controller power',
    isolator: true,
  },
};

/**
 * The Olympic's Trio (PL2-CP2), in the old controller's place: its sample
 * off the common discharge manifold, its return through the west wall to
 * the balance tank, its alarms to PL2-CP1 (the room has no annunciator of
 * its own), its supply a drop from the busbar's tap-off
 * (`power-controller.tap-off`, set with the drop when it is laid).
 */
export const OLYMPIC_TRIO_SITE: TrioSite = {
  room: 'plant_pool_02',
  code: 'PL2',
  cabinet: 'controller',
  tapping: ['manifold', 'sample'],
  tank: ['tank', 'sample-return'],
  devices: {
    hypochlorite: ['hypo', 'control'],
    acid: ['acid', 'control'],
  },
  alarm: ['panel', 'dosing'],
  power: { from: ['bus', 'feed'], link: 'power-controller', isolator: false },
};

export const LOUNGE_TRIO = trioParts(LOUNGE_TRIO_SITE, 'Lounge pool');
export const OLYMPIC_TRIO = trioParts(OLYMPIC_TRIO_SITE, 'Olympic pool');

/**
 * The Trios' valves, in the model and the world but not yet drawn (the
 * pure logic first, the owner's order, mission 114): the drawn-valve
 * register's test passes them over until the plumber lays their lines.
 * Empty this when the lines are drawn.
 */
export const TRIO_VALVES_NOT_YET_DRAWN: ReadonlySet<string> = new Set(
  [...LOUNGE_TRIO.fittings, ...OLYMPIC_TRIO.fittings]
    .filter((f) => f.kind === 'isolating-valve')
    .map((f) => f.id),
);

/**
 * The nodes the Olympic's Trio parts meet, for its valves' tags (the
 * room's model is its plumber's expansion and annex; these are those
 * nodes, by the same ids).
 */
export const OLYMPIC_TRIO_NODES: readonly SchematicNode[] = [
  ...OLYMPIC_TRIO.nodes,
  {
    id: 'controller',
    kind: 'dosing-controller',
    code: 'CP2',
    name: 'Dosing controller and sample cells',
  },
  { id: 'manifold', kind: 'header', name: 'Pump discharge manifold' },
  { id: 'tank', kind: 'balance-tank', name: 'Olympic pool balance tank' },
  {
    id: 'hypo',
    kind: 'hypo-pumps',
    name: 'Hypochlorite dosing pumps',
    code: 'DP1',
  },
  { id: 'acid', kind: 'acid-pump', name: 'Acid dosing pump', code: 'DP2' },
  { id: 'panel', kind: 'panel', name: 'Olympic pool local control panel' },
  { id: 'bus', kind: 'supply', name: 'Busbar' },
];

let olympicExpanded: Expansion | undefined;
/** The Olympic Trio's lines' enhanced network: every fitting given, the plumber adding none. */
export function olympicTrioExpansion(): Expansion {
  olympicExpanded ??= expandForPlumbing(
    OLYMPIC_TRIO_NODES,
    OLYMPIC_TRIO.links,
    { isolate: new Set(), pumps: new Set(), given: OLYMPIC_TRIO.fittings },
  );
  return olympicExpanded;
}
