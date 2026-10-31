import type { Expansion } from '../../../game/plant/plumbing-expansion';
import * as M1 from '../../../game/plant/museum-1-heating';
import * as M2 from '../../../game/plant/museum-2-clean-water';
import * as M3 from '../../../game/plant/museum-3-dosing';
import * as M4 from '../../../game/plant/museum-4-lab';
import * as M6 from '../../../game/plant/museum-6-pumps';
import * as M9 from '../../../game/plant/museum-9-plant';
import type { MuseumHallId } from './museum-plan';

/**
 * Each museum hall's own model (`doc/museum-hall-model.md`): the enhanced
 * network of its schematic, as the plant rooms have theirs
 * (`world-in-model.ts`). A hall's machines bind to its nodes, its valves
 * and meters to its fittings, its pipes to its links, and its gauges and
 * readouts to its instruments; tags are the model's own. A hall with no
 * entry here has no model yet, so nothing engineering in it can be bound.
 * Pure.
 */
export interface HallModel {
  nodes: ReadonlySet<string>;
  fittings: ReadonlySet<string>;
  links: ReadonlySet<string>;
  /** Its instruments (gauges, readouts, analysers), each an id of the model. */
  instruments: ReadonlySet<string>;
  /** Nodes that stand for the world beyond the hall (the atmosphere), never drawn. */
  unseen: ReadonlySet<string>;
  /** Every tag the model derives, by tag, to the id it names. */
  byTag: ReadonlyMap<string, string>;
}

interface HallSchematic {
  expansion: () => Expansion;
  links: readonly { id: string }[];
  instruments?: readonly { id: string }[];
  tags: Readonly<Record<string, string>>;
}

const SCHEMATICS: Partial<Record<MuseumHallId, HallSchematic>> = {
  museum1: {
    expansion: M1.hall1Expansion,
    links: M1.LINKS,
    instruments: M1.INSTRUMENTS,
    tags: M1.TAGS,
  },
  museum2: {
    expansion: M2.hall2Expansion,
    links: M2.LINKS,
    instruments: M2.INSTRUMENTS,
    tags: M2.TAGS,
  },
  museum3: {
    expansion: M3.hall3Expansion,
    links: M3.LINKS,
    instruments: M3.INSTRUMENTS,
    tags: M3.TAGS,
  },
  museum4: {
    expansion: M4.hall4Expansion,
    links: M4.LINKS,
    instruments: M4.INSTRUMENTS,
    tags: M4.TAGS,
  },
  museum6: {
    expansion: M6.hall6Expansion,
    links: M6.LINKS,
    instruments: M6.INSTRUMENTS,
    tags: M6.TAGS,
  },
  museum9: {
    expansion: M9.hall9Expansion,
    links: M9.LINKS,
    instruments: M9.INSTRUMENTS,
    tags: M9.TAGS,
  },
};

/**
 * What each hall is (the owner, 2026-10-30): a plant hall holds machines,
 * valves or pipes, so it must be its own simulation, fully bound to its
 * model, its machines facing the room; a display hall holds only photos,
 * placards, specimens and signs, and is exempt. Classed by what each hall
 * actually contains; a display hall that gains a machine must be
 * reclassified as a plant hall.
 */
export const HALL_CLASS: Readonly<Record<MuseumHallId, 'plant' | 'display'>> = {
  museum0: 'display',
  museum1: 'plant',
  museum2: 'plant',
  museum3: 'plant',
  museum4: 'plant',
  museum5: 'display',
  museum6: 'plant',
  museum7: 'display',
  museum8: 'display',
  museum9: 'plant',
};

/** Kinds of node that stand for the world beyond the hall and are never drawn. */
const UNSEEN_KINDS: ReadonlySet<string> = new Set([
  'ideal-atmosphere',
  'ideal-bather-source',
]);

/** The halls that have a model of their own. */
export const MODELLED_HALLS = Object.keys(SCHEMATICS) as MuseumHallId[];

/** A hall's model, or none if it has no simulation of its own yet. */
export function hallModel(id: MuseumHallId): HallModel | undefined {
  const s = SCHEMATICS[id];
  if (!s) return undefined;
  const expansion = s.expansion();
  const fittings = new Set(expansion.fittings.map((f) => f.id));
  return {
    nodes: new Set(
      expansion.nodes.map((n) => n.id).filter((n) => !fittings.has(n)),
    ),
    fittings,
    links: new Set(s.links.map((l) => l.id)),
    unseen: new Set(
      expansion.nodes
        .filter((n) => UNSEEN_KINDS.has((n as { kind?: string }).kind ?? ''))
        .map((n) => n.id),
    ),
    instruments: new Set((s.instruments ?? []).map((i) => i.id)),
    byTag: new Map(Object.entries(s.tags).map(([k, tag]) => [tag, k])),
  };
}

export type HallBinding =
  | { node: string }
  | { fitting: string }
  | { link: string };

/** Whether a binding names something of its sort in the hall's model (an instrument counts as a node). */
export function hallBound(
  binding: HallBinding | undefined,
  model: HallModel | undefined,
): boolean {
  if (!binding || !model) return false;
  if ('node' in binding)
    return model.nodes.has(binding.node) || model.instruments.has(binding.node);
  if ('fitting' in binding) return model.fittings.has(binding.fitting);
  return model.links.has(binding.link);
}

/** Every component of the model, as `kind: id`, for checking each is drawn. */
export function modelComponents(model: HallModel): string[] {
  return [
    ...[...model.nodes]
      .filter((n) => !model.unseen.has(n))
      .map((n) => `node: ${n}`),
    ...[...model.fittings].map((f) => `fitting: ${f}`),
    ...[...model.links].map((l) => `link: ${l}`),
    ...[...model.instruments].map((i) => `instrument: ${i}`),
  ];
}
