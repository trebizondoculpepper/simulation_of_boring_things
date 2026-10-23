import type { Footprint } from '../../controls/logic/walk-collision';
import { pipeClashes } from '../../components/core/logic/pipe-route';
import type { DrawnRun, Vec3 } from '../../components/core/logic/pipe-route';
import { runEntersRegion } from './room-regions';
import type { Region } from './room-regions';

/**
 * The scorer (the owner, 2026-10-23): the last stage, after the sizer, the
 * regions, placement and the plumber. It judges a finished room and gives
 * one number, so that one room can be said to be better or worse than
 * another, and how far it is from good. Like any packing or routing
 * problem there is no direct way to the best room; the scorer lets a
 * search get most of the way and shows what is left.
 *
 * After Codex's advice (consulted 2026-10-23):
 *
 * - **Gates first.** A room that fails one is not a workable room,
 *   whatever its score; an unsafe room never outranks a workable one for
 *   shorter pipes. Gates: every machine's access reachable on foot; every
 *   fitting the rules want installed and reachable; no run cutting into
 *   another; no run through a reserved region.
 * - **Then a score, 0 to 100:** the weighted mean of dimensions each 0 to
 *   1, each saying why, with its raw measures. The score is shown even
 *   when a gate fails, so that progress can be seen, but rooms are ranked
 *   gates first.
 * - **Baselines come from outside the candidate** (the room's area against
 *   what the sizer says its contents need), so that a search cannot better
 *   its own yardstick. Route economy is provisional until the plumber's
 *   own router replaces the old lanes.
 *
 * Compare only rooms with the same contents and the same rules. Pure.
 */

export interface ScoredRoom {
  name: string;
  /** Inside the walls, metres. */
  w: number;
  d: number;
  h: number;
  /** The floor area the sizer says the same contents need, m². */
  minimumArea: number;
  /** Machines on the floor: their footprints. */
  machines: readonly Footprint[];
  /** Machines whose maintenance access no one can walk to. */
  unreachableAccess: number;
  /** The runs of pipe and conduit, as drawn. */
  runs: readonly DrawnRun[];
  /**
   * Runs that share a port's bus or header, by run name: they may lie
   * together, so overlaps between them are not clashes.
   */
  shares?: ReadonlyMap<string, readonly string[]>;
  /** What each run costs a metre, installed, £ (`pipe-costs.ts`). */
  runPrices: readonly number[];
  /** Each line's two ends, for its shortest square length. */
  ends: readonly (readonly [Vec3, Vec3])[];
  /** What each line's pipe costs a metre, £. */
  endPrices: readonly number[];
  regions: readonly Region[];
  /** The fittings the rules want, those installed, and of those how many can be reached. */
  fittings: { wanted: number; installed: number; reachable: number };
}

export interface Dimension {
  name: string;
  /** 0 (bad) to 1 (good). */
  score: number;
  weight: number;
  why: string;
}

export interface Score {
  name: string;
  /** Whether it passes every gate. */
  passes: boolean;
  gates: string[];
  /** 0 to 100, the weighted mean of the dimensions. */
  total: number;
  dimensions: Dimension[];
}

const clamp = (x: number) => Math.max(0, Math.min(1, x));

export function scoreRoom(room: ScoredRoom): Score {
  const gates: string[] = [];
  const dimensions: Dimension[] = [];
  const machines = room.machines.length;

  // Walking and maintenance access.
  if (room.unreachableAccess)
    gates.push(`${room.unreachableAccess} machines cannot be walked to`);
  dimensions.push({
    name: 'access',
    score: machines ? clamp(1 - room.unreachableAccess / machines) : 1,
    weight: 18,
    why: `${machines - room.unreachableAccess} of ${machines} machines' access reachable from a door`,
  });

  // The fittings the rules want, there and within reach.
  const { wanted, installed, reachable } = room.fittings;
  if (installed < wanted)
    gates.push(
      `${wanted - installed} of ${wanted} fittings the rules want are missing`,
    );
  if (reachable < installed)
    gates.push(`${installed - reachable} fittings are out of reach`);
  dimensions.push({
    name: 'fittings',
    score: wanted ? clamp(reachable / wanted) : 1,
    weight: 14,
    why: `${reachable} of ${wanted} wanted fittings installed within reach`,
  });

  // Physical clashes and reserved regions.
  const clashes = pipeClashes(room.runs).filter((c) => {
    const a = room.shares?.get(c.run);
    const b = room.shares?.get(c.other);
    return !(a && b && a.some((k) => b.includes(k)));
  }).length;
  if (clashes) gates.push(`${clashes} places where runs cut into each other`);
  let intrusions = 0;
  for (const run of room.runs)
    for (let k = 1; k < run.points.length; k++)
      if (
        runEntersRegion(
          run.points[k - 1],
          run.points[k],
          run.od / 2,
          room.regions,
        )
      ) {
        intrusions++;
        break;
      }
  if (intrusions)
    gates.push(`${intrusions} runs pass through a reserved region`);
  const links = Math.max(1, room.ends.length);
  dimensions.push({
    name: 'clashes',
    score: 1 / (1 + clashes / links),
    weight: 8,
    why: `${clashes} clashes over ${links} lines`,
  });

  // What the pipework costs (the owner, 2026-10-23: the cheaper the
  // better, not merely the shorter): each run at its price a metre,
  // against the same pipes run the shortest square way, end to end.
  const cost = room.runs.reduce(
    (sum, r, i) => sum + runLength(r.points) * (room.runPrices[i] ?? 0),
    0,
  );
  const cheapest = room.ends.reduce(
    (sum, [a, b], i) =>
      sum +
      (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])) *
        (room.endPrices[i] ?? 0),
    0,
  );
  dimensions.push({
    name: 'pipework cost',
    score: cost > 0 ? clamp(cheapest / cost) : 1,
    weight: 12,
    why: `£${Math.round(cost).toLocaleString('en-GB')} of pipe and conduit, against £${Math.round(cheapest).toLocaleString('en-GB')} for the same run straight (estimates; old lanes)`,
  });

  // The room's area against what its contents need.
  const area = room.w * room.d;
  const a0 = room.minimumArea;
  dimensions.push({
    name: 'room area',
    score: clamp((1.5 * a0 - area) / (0.5 * a0)),
    weight: 7,
    why: `${area.toFixed(0)} m² against ${a0.toFixed(0)} m² the sizer says the contents need`,
  });

  const weights = dimensions.reduce((sum, d) => sum + d.weight, 0);
  const mean =
    dimensions.reduce((sum, d) => sum + d.score * d.weight, 0) / weights;
  return {
    name: room.name,
    passes: gates.length === 0,
    gates,
    total: Math.round(mean * 1000) / 10,
    dimensions,
  };
}

/** Rooms in order, best first: those passing every gate, then by score. */
export function rank(scores: readonly Score[]) {
  return [...scores].sort(
    (a, b) => Number(b.passes) - Number(a.passes) || b.total - a.total,
  );
}

function runLength(points: readonly Vec3[]) {
  let total = 0;
  for (let i = 1; i < points.length; i++)
    total += Math.hypot(
      points[i][0] - points[i - 1][0],
      points[i][1] - points[i - 1][1],
      points[i][2] - points[i - 1][2],
    );
  return total;
}

/** A score as lines of text, for a report. */
export function describeScore(score: Score) {
  return [
    `${score.name}: ${score.total} (${score.passes ? 'passes its gates' : 'fails its gates'})`,
    ...score.gates.map((g) => `  GATE: ${g}`),
    ...score.dimensions.map(
      (d) =>
        `  ${d.name} ${(d.score * 100).toFixed(0)} (×${d.weight}): ${d.why}`,
    ),
  ].join('\n');
}
