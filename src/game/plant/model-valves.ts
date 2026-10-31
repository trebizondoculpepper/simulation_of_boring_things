import type { PlumbEdge } from './plumbing-expansion';
import { SCHEMATICS, schematicExpansion } from './schematics';
import type { SchematicFitting, SchematicNode } from './schematics';
import {
  OLYMPIC_CHEMICAL_FITTINGS,
  OLYMPIC_CHEMICAL_LINKS,
  OLYMPIC_CHEMICAL_NODES,
  OLYMPIC_CODE,
  OLYMPIC_ROOM,
  olympicChemicalExpansion,
} from './olympic-chemical-schematic';
import {
  OLYMPIC_TRIO,
  OLYMPIC_TRIO_NODES,
  olympicTrioExpansion,
} from './aqualis-schematic';

/**
 * The valves of the rooms built from a schematic (prompt 064), derived
 * from it, never written by hand: each valve's id is its fitting's in the
 * room's model, its tag follows the hierarchy (the room, the machine it
 * serves, its kind and number: PL3-BT1-IV1), its name its link's, and
 * what it isolates its link's two ends. The world keeps their states by
 * these ids. Pure.
 */

export interface ModelValve {
  /** Its fitting's id in the room's model: the world's key for it. */
  id: string;
  tag: string;
  name: string;
  room: string;
  /** The link it sits on, by the name the room's run carries. */
  link: string;
  /** What it is for, in the schematic's words. */
  role: string;
  kind: 'isolating-valve' | 'power-isolator' | 'non-return-valve';
  normal: 'open' | 'closed';
  /** How it is worked, as its schematic says. */
  operator?: 'lever' | 'chain' | 'motor' | 'solenoid';
  /** Kept by the identified model, not among the installed valves. */
  keptBy?: 'identified' | 'register' | 'distribution';
  /** What it isolates, in a description's words. */
  route: {
    from: string;
    to: string;
    medium:
      | 'water'
      | 'heating water'
      | 'air'
      | 'gas'
      | 'sodium hypochlorite'
      | 'hydrochloric acid';
  };
}

/** A node in a sentence: its name, lower-cased after "the", unless an acronym begins it. */
const words = (node: SchematicNode | undefined) => {
  const name = node?.name ?? 'nothing';
  const plain = /^[A-Z]{2}/.test(name)
    ? name
    : name.charAt(0).toLowerCase() + name.slice(1);
  return `the ${plain}`;
};

/** The letters for a fitting's kind and work: a valve to waste is a drain valve. */
const letters = (
  kind: ModelValve['kind'],
  link: PlumbEdge,
  kindOf: (id: string) => string | undefined,
) =>
  kind === 'power-isolator'
    ? 'IS'
    : kind === 'non-return-valve'
      ? 'NRV'
      : kindOf(link.targetId) === 'gully'
        ? 'DV'
        : 'IV';

function roomValves(
  room: string,
  code: string,
  nodes: readonly SchematicNode[],
  links: readonly PlumbEdge[],
  fittings: readonly SchematicFitting[],
): ModelValve[] {
  const node = new Map(nodes.map((n) => [n.id, n]));
  const kindOf = (id: string) => node.get(id)?.kind;
  const linkOf = new Map(links.map((l) => [l.id, l]));
  const counts = new Map<string, number>();
  // Several of a kind on one link (a manual and an actuated valve on a
  // selector's outlet): each named by what it is for as well.
  const onLink = (f: SchematicFitting) =>
    fittings.filter((x) => x.edge === f.edge && x.kind === f.kind).length;
  return fittings.flatMap((f) => {
    if (
      f.kind !== 'isolating-valve' &&
      f.kind !== 'power-isolator' &&
      f.kind !== 'non-return-valve'
    )
      return [];
    const link = linkOf.get(f.edge)!;
    const serves = node.get(f.end === 'source' ? link.sourceId : link.targetId);
    const kind = f.kind;
    const prefix = `${code}-${serves?.code ?? 'X'}-${letters(kind, link, kindOf)}`;
    // An identified part's tag is its id there, a register's its plate;
    // the rest (the distribution's actuated valves too) numbered in turn.
    const numbered = !f.keptBy || f.keptBy === 'distribution';
    const n = numbered ? (counts.get(prefix) ?? 0) + 1 : 0;
    if (numbered) counts.set(prefix, n);
    const heating = [link.sourceId, link.targetId].some(
      (id) => kindOf(id) === 'heating-main',
    );
    const word =
      kind === 'power-isolator'
        ? 'isolator'
        : kind === 'non-return-valve'
          ? 'non-return valve'
          : 'valve';
    const chemical = /hypochlorite/i.test(link.id)
      ? ('sodium hypochlorite' as const)
      : /acid/i.test(link.id)
        ? ('hydrochloric acid' as const)
        : undefined;
    return [
      {
        id: f.id,
        // An identified part's tag is its id; a register's valve keeps its plate there.
        tag: f.keptBy === 'identified' ? f.id : numbered ? `${prefix}${n}` : '',
        ...(f.keptBy ? { keptBy: f.keptBy } : {}),
        name:
          onLink(f) > 1 && f.role
            ? `${link.id} ${word}, ${f.role}`
            : `${link.id} ${word}`,
        room,
        link: link.id,
        role: f.role ?? '',
        kind,
        normal: f.normally,
        ...(f.operator ? { operator: f.operator } : {}),
        route: {
          from: words(node.get(link.sourceId)),
          to: words(node.get(link.targetId)),
          medium:
            link.medium === 'chemical' && chemical
              ? chemical
              : link.medium === 'air'
                ? 'air'
                : link.medium === 'gas'
                  ? 'gas'
                  : heating
                    ? 'heating water'
                    : 'water',
        },
      },
    ];
  });
}

/** Every room's model valves, from each schematic in turn, and the Olympic's chemical lines' (prompt 085) and Trio's (mission 114). */
export const MODEL_VALVES: readonly ModelValve[] = [
  ...Object.values(SCHEMATICS).flatMap((schematic) => {
    const set = schematicExpansion(schematic.room)!.fittings;
    return roomValves(
      schematic.room,
      schematic.code,
      schematic.nodes,
      schematic.links,
      // As the plumber set them: the schematic's own, in their lines' order.
      schematic.fittings.filter((f) => set.some((x) => x.id === f.id)),
    );
  }),
  ...roomValves(
    OLYMPIC_ROOM,
    OLYMPIC_CODE,
    OLYMPIC_CHEMICAL_NODES,
    OLYMPIC_CHEMICAL_LINKS,
    OLYMPIC_CHEMICAL_FITTINGS.filter((f) =>
      olympicChemicalExpansion().fittings.some((x) => x.id === f.id),
    ),
  ),
  // And its Dr Aqualis Trio's sample valves (mission 114).
  ...roomValves(
    OLYMPIC_ROOM,
    OLYMPIC_CODE,
    OLYMPIC_TRIO_NODES,
    OLYMPIC_TRIO.links,
    OLYMPIC_TRIO.fittings.filter((f) =>
      olympicTrioExpansion().fittings.some((x) => x.id === f.id),
    ),
  ),
];

/** The valves (not isolators) the world keeps open or shut. */
export const MODEL_ISOLATING_VALVES = MODEL_VALVES.filter(
  (v) => v.kind === 'isolating-valve',
);

/** Those kept among the installed valves (the rest are the identified model's). */
export const MODEL_INSTALLED_VALVES = MODEL_ISOLATING_VALVES.filter(
  (v) => !v.keptBy,
);

/** A room's model valve on a link, by the link's name. */
export const modelValveOn = (room: string, link: string) =>
  MODEL_ISOLATING_VALVES.find((v) => v.room === room && v.link === link);

/** The rooms whose valves come from their model. */
export const MODELLED_VALVE_ROOMS: ReadonlySet<string> = new Set(
  MODEL_VALVES.map((v) => v.room),
);

/** A room's one schematic node of a kind, if it has exactly one. */
export function schematicNodeOfKind(
  room: string,
  kind: string,
): string | undefined {
  const found = (SCHEMATICS[room]?.nodes ?? []).filter((n) => n.kind === kind);
  return found.length === 1 ? found[0].id : undefined;
}

/** A room's model fitting of a kind on a link, if it has one. */
export function schematicFittingOn(
  room: string,
  link: string,
  kind: ModelValve['kind'],
): string | undefined {
  return MODEL_VALVES.find(
    (v) => v.room === room && v.link === link && v.kind === kind,
  )?.id;
}

/** A room's schematic node for a drawn machine: its own by its name, or its room's one of its kind. */
export function schematicNodeFor(
  room: string,
  name: string,
  kind: string,
): string | undefined {
  return (
    SCHEMATICS[room]?.nodes.find((n) => n.name === name)?.id ??
    schematicNodeOfKind(room, kind)
  );
}
