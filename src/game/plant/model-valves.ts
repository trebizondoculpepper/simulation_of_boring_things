import type { PlumbEdge } from './plumbing-expansion';
import { SCHEMATICS, schematicExpansion } from './schematics';
import type { SchematicFitting, SchematicNode } from './schematics';

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
  kind: 'isolating-valve' | 'power-isolator';
  normal: 'open' | 'closed';
  /** How it is worked, as its schematic says. */
  operator?: 'lever' | 'chain' | 'motor' | 'solenoid';
  /** Kept by the identified model, not among the installed valves. */
  keptBy?: 'identified';
  /** What it isolates, in a description's words. */
  route: {
    from: string;
    to: string;
    medium: 'water' | 'heating water' | 'air' | 'gas';
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
  return fittings.flatMap((f) => {
    if (f.kind !== 'isolating-valve' && f.kind !== 'power-isolator') return [];
    const link = linkOf.get(f.edge)!;
    const serves = node.get(f.end === 'source' ? link.sourceId : link.targetId);
    const kind = f.kind;
    const prefix = `${code}-${serves?.code ?? 'X'}-${letters(kind, link, kindOf)}`;
    // An identified part's tag is its id there; the rest numbered in turn.
    const n = f.keptBy ? 0 : (counts.get(prefix) ?? 0) + 1;
    if (!f.keptBy) counts.set(prefix, n);
    const heating = [link.sourceId, link.targetId].some(
      (id) => kindOf(id) === 'heating-main',
    );
    return [
      {
        id: f.id,
        tag: f.keptBy ? f.id : `${prefix}${n}`,
        ...(f.keptBy ? { keptBy: f.keptBy } : {}),
        name: `${link.id} ${kind === 'power-isolator' ? 'isolator' : 'valve'}`,
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
            link.medium === 'air'
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

/** Every room's model valves, from each schematic in turn. */
export const MODEL_VALVES: readonly ModelValve[] = Object.values(
  SCHEMATICS,
).flatMap((schematic) => {
  const set = schematicExpansion(schematic.room)!.fittings;
  return roomValves(
    schematic.room,
    schematic.code,
    schematic.nodes,
    schematic.links,
    // As the plumber set them: the schematic's own, in their lines' order.
    schematic.fittings.filter((f) => set.some((x) => x.id === f.id)),
  );
});

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
