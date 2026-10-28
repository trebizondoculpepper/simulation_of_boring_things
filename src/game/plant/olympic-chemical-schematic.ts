import { expandForPlumbing } from './plumbing-expansion';
import type { Expansion, PlumbEdge } from './plumbing-expansion';
import {
  chemicalCheck,
  chemicalValve,
  dayTanks,
  link,
} from './schematic-parts';
import type { SchematicFitting, SchematicNode } from './schematics';

/**
 * The Olympic plant room's chemical lines (prompt 085, gap 3): its part of
 * the chemical distribution as a schematic, as the other plant rooms have
 * theirs (`dayTanks`), though the room is plumbed by its own pipeline
 * (`olympic-plumbing.ts`), whose expanded network (with `olympic-annex.ts`)
 * takes these nodes, links and fittings. Each chemical's branch from the
 * wet hall's selector into its day tank (the hypochlorite's a framed
 * 1,000 l tank, its actuated inlet the distribution's; the acid's a dose
 * bottle); each day tank's supply line to its dosing pump; each pump's
 * dose line to its quill on the UV unit's outlet spool, with its isolating
 * and non-return valves at the pump. Every valve given, the plumber
 * adding none; their tags derived as every room's (`model-valves.ts`).
 * Pure.
 */

export const OLYMPIC_ROOM = 'plant_pool_02';
export const OLYMPIC_CODE = 'PL2';

const DAY = dayTanks(
  { hypochlorite: ['hypo', 'in'], acid: ['acid', 'in'] },
  'pool_02',
);
const branch = (l: PlumbEdge) => l.id.endsWith('to its day tank');

/** Each chemical's names: its pumps' node, its lines'. */
const CHEMICALS = [
  { c: 'hypochlorite', k: 'hypo', Name: 'Hypochlorite' },
  { c: 'acid', k: 'acid', Name: 'Acid' },
] as const;

export const OLYMPIC_CHEMICAL_NODES: readonly SchematicNode[] = [
  ...DAY.nodes,
  {
    id: 'hypo',
    kind: 'hypo-pumps',
    name: 'Hypochlorite dosing pumps',
    code: 'DP1',
  },
  { id: 'acid', kind: 'acid-pump', name: 'Acid dosing pump', code: 'DP2' },
  { id: 'uv', kind: 'uv', name: 'Olympic UV unit' },
];

export const OLYMPIC_CHEMICAL_LINKS: readonly PlumbEdge[] = [
  ...DAY.links.filter(branch),
  ...CHEMICALS.flatMap(({ c, k, Name }) => [
    link(`${Name} supply line`, [`${c}-day`, 'out'], [k, 'in'], 'chemical'),
    link(`${Name} dose line`, [k, 'out'], ['uv', 'dose'], 'chemical'),
  ]),
];

export const OLYMPIC_CHEMICAL_FITTINGS: readonly SchematicFitting[] = [
  // Each branch's: the day tank's inlet valve, a framed tank's actuated one.
  ...DAY.fittings.filter((f) => f.edge.endsWith('to its day tank')),
  ...CHEMICALS.flatMap(({ c, k, Name }) => [
    chemicalValve(
      `${OLYMPIC_CODE}.${c}-day.out.iso`,
      `${Name} supply line`,
      'source',
      'outlet isolation',
    ),
    // From the pump outward: its dosing isolation, then its non-return.
    chemicalValve(
      `${OLYMPIC_CODE}.${k}.out.iso`,
      `${Name} dose line`,
      'source',
      'dosing isolation',
    ),
    chemicalCheck(
      `${OLYMPIC_CODE}.${k}.out.nrv`,
      `${Name} dose line`,
      'source',
      'dosing non-return',
    ),
  ]),
];

let expanded: Expansion | undefined;
/** The chemical lines' enhanced network: the schematic expanded, every fitting given. */
export function olympicChemicalExpansion(): Expansion {
  expanded ??= expandForPlumbing(
    OLYMPIC_CHEMICAL_NODES,
    OLYMPIC_CHEMICAL_LINKS,
    { isolate: new Set(), pumps: new Set(), given: OLYMPIC_CHEMICAL_FITTINGS },
  );
  return expanded;
}
