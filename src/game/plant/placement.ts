import { ATTRACTIONS, SHARED_ROOMS, buildGraph } from './inventory';
import type { PlantEdge, PlantNode } from './inventory';

/**
 * Where each plant room goes, by rule (`doc/plant-model.md`, "How the
 * plant rooms are arranged"). The plant rooms are a three-dimensional
 * warren, placed on two axes.
 *
 * Across, from the middle to the edge: a room that serves every
 * attraction is central (the core); one that serves a single attraction
 * is peripheral, out at the edge by its pool room; and a room that must
 * reach the outside world (deliveries, the gas and electricity coming in)
 * stands on the outer edge whatever it serves.
 *
 * Down, from the roof to the basement, by physics: air handling at the
 * top, where air comes in and goes out; deliveries, chemicals, electrics
 * and staff at the surface (chemicals never in a basement, where chlorine,
 * heavier than air, would pool; electrics never below the wet plant);
 * treatment and balance tanks just below the pools, since pools overflow
 * into their tanks by gravity; the boilers and the drainage in the
 * basement, drainage lowest of all, since everything drains to it.
 *
 * Stairs and ladders join every level; a hoist or goods lift serves every
 * room that takes deliveries. Pure.
 */

/** The levels, top to bottom; the pools' water is between the surface and treatment. */
export const LEVELS = ['roof', 'surface', 'treatment', 'basement'] as const;
export type Level = (typeof LEVELS)[number];

/** Each level's height, metres, against the pools' decks at 0. */
export const LEVEL_HEIGHT: Record<Level, number> = {
  roof: 8,
  surface: 0,
  treatment: -5,
  basement: -10,
};

export type Ring = 'core' | 'intermediate' | 'peripheral' | 'outer';

/** Each shared room's level, and why it is there. */
export const SHARED_LEVELS: Record<string, { level: Level; why: string }> = {
  'air-plant': {
    level: 'roof',
    why: 'it takes fresh air in and lets stale air out',
  },
  'loading-bay': {
    level: 'surface',
    why: 'deliveries arrive by road',
  },
  'chemical-store': {
    level: 'surface',
    why: 'by the loading bay, and never in a basement: chlorine is heavier than air',
  },
  'switch-room': {
    level: 'surface',
    why: 'electrics are kept above the wet plant, out of the way of leaks and floods',
  },
  'utilities-intake': {
    level: 'surface',
    why: 'every utility comes in at the boundary, in one room: the 800 A isolator, the main gas valve and the stopcock shut the whole facility down',
  },
  'make-up': {
    level: 'surface',
    why: 'its break tank, fed from the water main, feeds the balance tanks below by gravity',
  },
  'control-room': {
    level: 'surface',
    why: 'staff work here, by the pool rooms',
  },
  office: { level: 'surface', why: 'staff work here' },
  'balance-tanks': {
    level: 'treatment',
    why: 'just below the pools, which overflow into their tanks by gravity',
  },
  'service-corridor': {
    level: 'treatment',
    why: 'it joins the attractions’ plant rooms, all at this level',
  },
  'boiler-house': {
    level: 'basement',
    why: 'its heat rises to everything it serves, and its flue climbs to the roof',
  },
  drainage: {
    level: 'basement',
    why: 'lowest of all: everything drains to it',
  },
};

/** The rooms that must reach the outside world: on the outer edge, whatever they serve. */
export const OUTER: ReadonlySet<string> = new Set([
  'loading-bay',
  'utilities-intake',
  'make-up',
  'air-plant',
]);

/** The room each node stands in (rooms and attractions are their own). */
function roomOf(nodes: readonly PlantNode[]) {
  const map = new Map<string, string>();
  for (const n of nodes) map.set(n.id, n.in ?? n.id);
  return map;
}

/**
 * The attractions a room is joined to: by anything that runs between
 * rooms, in either direction (the boiler house's heat goes out to them,
 * the control room's signals come in from them, every filter drains to
 * the drainage), through the shared rooms but not through an attraction
 * or its own plant room, which serve that attraction alone.
 */
export function served(
  room: string,
  graph: {
    nodes: readonly PlantNode[];
    edges: readonly PlantEdge[];
  } = buildGraph(),
): Set<string> {
  const where = roomOf(graph.nodes);
  const attractions = new Set(ATTRACTIONS.map((a) => a.id));
  const ownRoom = new Map(ATTRACTIONS.map((a) => [`plant-${a.id}`, a.id]));
  const next = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (!next.has(a)) next.set(a, new Set());
    next.get(a)!.add(b);
  };
  for (const e of graph.edges) {
    const a = where.get(e.from) ?? e.from;
    const b = where.get(e.to) ?? e.to;
    if (a === b) continue;
    link(a, b);
    link(b, a);
  }
  // An attraction's own plant room serves that attraction alone.
  const own = ownRoom.get(room);
  if (own) return new Set([own]);
  const reached = new Set<string>();
  const seen = new Set([room]);
  const queue = [room];
  while (queue.length) {
    const at = queue.shift()!;
    for (const to of next.get(at) ?? []) {
      const attraction = attractions.has(to) ? to : ownRoom.get(to);
      if (attraction) {
        reached.add(attraction);
        continue;
      }
      if (!seen.has(to)) {
        seen.add(to);
        queue.push(to);
      }
    }
  }
  return reached;
}

export interface Placement {
  room: string;
  name: string;
  ring: Ring;
  level: Level;
  why: string;
  /** The attractions it serves. */
  serves: number;
  /** Whether a hoist or goods lift must reach it from the loading bay. */
  hoist: boolean;
}

/** Every plant room's place: its ring across, its level down, and why. */
export function placements(): Placement[] {
  const graph = buildGraph();
  const all = ATTRACTIONS.length;
  const deliveries = new Set(
    graph.edges.filter((e) => e.medium === 'delivery').map((e) => e.to),
  );
  const rooms = graph.nodes.filter(
    (n) => n.kind === 'plant-room' || n.kind === 'shared-room',
  );
  return rooms.map((room) => {
    const serves = served(room.id, graph).size;
    const shared = SHARED_LEVELS[room.id];
    const ring: Ring = OUTER.has(room.id)
      ? 'outer'
      : room.kind === 'plant-room'
        ? 'peripheral'
        : serves >= all
          ? 'core'
          : serves > 1
            ? 'intermediate'
            : 'peripheral';
    return {
      room: room.id,
      name: room.name,
      ring,
      level: shared?.level ?? 'treatment',
      why:
        shared?.why ??
        'by its own pool room, just below its pools, so its pipes are short and its pumps draw from its tank at their level',
      serves,
      hoist: deliveries.has(room.id),
    };
  });
}

/**
 * The stairs: one flight between each pair of neighbouring levels, so
 * every level is reached from every other; and ladders down into tanks
 * and pits, wherever a room holds them.
 */
export function stairs(): { from: Level; to: Level }[] {
  return LEVELS.slice(1).map((to, i) => ({ from: LEVELS[i], to }));
}

/** Whether every room a list of placements names is in the inventory's shared or attraction rooms. */
export const allPlaced = (list: readonly Placement[]) =>
  SHARED_ROOMS.every((r) => list.some((p) => p.room === r.id)) &&
  ATTRACTIONS.every((a) => list.some((p) => p.room === `plant-${a.id}`));
