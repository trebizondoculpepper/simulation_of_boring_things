/**
 * The component benchmark's arithmetic (mission 094,
 * `doc/prompts/094-slowest-components.md`): what one component costs on
 * its own, how many of it the game's rooms have, its cost where used, the
 * ranking, the budgets it is held to, and the report's table. Pure: the
 * measuring is `views/component-bench.ts`, run in the browser at
 * `bench.html?bench=components`.
 */

/** Where a benchmarked component comes from. */
export type BenchSource = 'room' | 'exhibit' | 'board' | 'part';

/** One phase of a component's measurement: the world frozen, or running. */
export interface PhaseStats {
  /** Frames measured. */
  frames: number;
  /** Seconds measured. */
  seconds: number;
  /** Its `update` per frame, ms: mean and worst (the browser's timer is coarse). */
  updateMeanMs: number;
  updateWorstMs: number;
  /** `renderer.render` of it alone, CPU side, ms a frame (texture uploads included). */
  renderMeanMs: number;
  /** Texture uploads (level 0 `texImage2D`/`texSubImage2D`) a second. */
  uploadsPerS: number;
  /** Texels uploaded a second, all levels. */
  texelsPerS: number;
  /** Canvas 2D drawing calls a second (fills, strokes, text, images). */
  ops2dPerS: number;
  /**
   * Which textures were uploaded, by size, most first: `512×512 ×72`
   * (so an over-budget component says which of its displays it is).
   */
  uploadsBy?: string;
}

/** What one component costs, measured on its own. */
export interface BenchSample {
  /** Its key: a room item's key, `exhibit:<title>`, `board:<name>` or `part:<name>`. */
  id: string;
  /** What it is, in words. */
  label: string;
  source: BenchSource;
  /** The room it was built for, if a room item. */
  room?: string;
  buildMs: number;
  /** `update` called back to back, µs a call, the world frozen (precise where the frame timer is not). */
  updateUs: number;
  idle: PhaseStats;
  active: PhaseStats;
  drawCalls: number;
  triangles: number;
  materials: number;
  textures: number;
  /** Its textures' size on the GPU, bytes (RGBA8, mipmaps counted). */
  textureBytes: number;
  /** Whether it has an `update` at all. */
  live: boolean;
  /** Why it could not be built or measured, if so. */
  error?: string;
}

/** How many of a component the game's rooms have. */
export interface Usage {
  /** In all the equipped rooms. */
  count: number;
  /** In the busiest rooms (`BUSY_ROOMS`). */
  busy: number;
  rooms: string[];
}

/** The rooms where most is drawn and most is looked at. */
export const BUSY_ROOMS: readonly string[] = [
  'control_room',
  'plant_pool_02',
  'wet_hall',
];

/** A busy room's copies count this many times over. */
export const BUSY_WEIGHT = 2;

/**
 * How many of each item key the rooms have: `rooms` is each room's placed
 * item keys. A key counts as itself and, where it has an argument
 * (`store-extract:hypo_store`), also under its kind (`store-extract`).
 */
export function countUsage(
  rooms: readonly { room: string; keys: readonly string[] }[],
): Map<string, Usage> {
  const usage = new Map<string, Usage>();
  const add = (key: string, room: string) => {
    const u = usage.get(key) ?? { count: 0, busy: 0, rooms: [] };
    u.count += 1;
    if (BUSY_ROOMS.includes(room)) u.busy += 1;
    if (!u.rooms.includes(room)) u.rooms.push(room);
    usage.set(key, u);
  };
  for (const { room, keys } of rooms)
    for (const key of keys) {
      add(key, room);
      const kind = key.split(':')[0];
      if (kind !== key) add(`kind:${kind}`, room);
    }
  return usage;
}

/** The weight of a component's copies: busy rooms' count `BUSY_WEIGHT` times. */
export const usageWeight = (u: Usage | undefined) =>
  u ? u.count - u.busy + u.busy * BUSY_WEIGHT : 0;

/**
 * What one copy costs a frame while the world runs, ms: its update and
 * its own share of rendering (draw submission and texture uploads), the
 * empty scene's render taken off.
 */
export const unitCostMs = (s: BenchSample, baselineRenderMs = 0) =>
  s.error
    ? 0
    : s.active.updateMeanMs +
      Math.max(0, s.active.renderMeanMs - baselineRenderMs);

/** A sample ranked: its unit cost, its weight in the rooms, its cost where used. */
export interface Ranked {
  sample: BenchSample;
  usage: Usage | undefined;
  unitMs: number;
  weight: number;
  /** Unit cost × weight: ms a frame across the rooms, busy rooms doubled. */
  whereUsedMs: number;
}

/**
 * The samples ranked by their cost where used, then (for those the rooms
 * do not use, the development rooms' own) by their unit cost.
 */
export function rankSamples(
  samples: readonly BenchSample[],
  usage: ReadonlyMap<string, Usage>,
  baselineRenderMs = 0,
): Ranked[] {
  return samples
    .map((sample) => {
      const u = usage.get(sample.id);
      const unitMs = unitCostMs(sample, baselineRenderMs);
      const weight = usageWeight(u);
      return { sample, usage: u, unitMs, weight, whereUsedMs: unitMs * weight };
    })
    .sort((a, b) => b.whereUsedMs - a.whereUsedMs || b.unitMs - a.unitMs);
}

/**
 * A budget per component (mission 094, step 4): uploads a second and
 * texels a second while the world is frozen (nothing to show changes, so
 * nothing should be uploaded), and its update's cost a call.
 */
export interface Budget {
  idleUploadsPerS: number;
  idleTexelsPerS: number;
  activeTexelsPerS: number;
  updateUs: number;
}

export const DEFAULT_BUDGET: Budget = {
  // A display animating on its own (a strip chart's creeping paper, a
  // cursor's blink) may upload a few times a second with the world still.
  idleUploadsPerS: 12,
  idleTexelsPerS: 250_000,
  // Running: about a 512 × 512 texture a second, or a small one at 10 Hz.
  activeTexelsPerS: 300_000,
  updateUs: 200,
};

/**
 * Components known to be over budget, each flagged for the owner in
 * `TODO.md` or left with a reason (mission 094), by id or id prefix: the
 * benchmark still lists them, but as known; anything else over budget
 * fails the run. Remove an entry once its component is within budget.
 */
export const KNOWN_OVER_BUDGET: Readonly<Record<string, string>> = {
  'exhibit:dev47:':
    'flagged in TODO.md: the touch panels redraw on change before any goes into the game (mission 093)',
  'exhibit:dev48:':
    'flagged in TODO.md: the touch panels redraw on change before any goes into the game (mission 093)',
  'exhibit:dev44:Peristaltic dosing pump':
    'flagged in TODO.md: its screen animates its rotor 26 times a second',
  'exhibit:dev44:Transfer trial':
    'a development rig of many machines at once, its demonstration stepping every frame',
  'exhibit:dev44:Day tank sizes':
    'a development rig of every day tank size at once',
  'exhibit:dev44:Level instruments':
    'its demonstration drives its instruments every frame; the world drives them at most ten times a second',
  'exhibit:dev43:':
    'its demonstration drives its meters every frame; the world drives them at most ten times a second',
  'board:cabinet fittings':
    'dev0: its demonstration drives its fittings every frame',
  'board:period instruments':
    'dev0: its demonstration swings its recorders’ pens every frame',
};

/** Why a sample's overrun is known, if it is (`KNOWN_OVER_BUDGET`). */
export const knownOverBudget = (id: string) =>
  Object.entries(KNOWN_OVER_BUDGET).find(([prefix]) =>
    id.startsWith(prefix),
  )?.[1];

/** The run's verdict on its budgets: what failed, and what was over but known. */
export function budgetVerdict(
  samples: readonly BenchSample[],
  budget = DEFAULT_BUDGET,
) {
  const failures: { id: string; label: string; over: string[] }[] = [];
  const known: { id: string; label: string; over: string[]; why: string }[] =
    [];
  for (const s of samples) {
    const over = overBudget(s, budget);
    if (!over.length) continue;
    const why = knownOverBudget(s.id);
    if (why) known.push({ id: s.id, label: s.label, over, why });
    else failures.push({ id: s.id, label: s.label, over });
  }
  return { passed: failures.length === 0, failures, known };
}

/** What a sample does over its budget, in words; empty if within it. */
export function overBudget(s: BenchSample, budget = DEFAULT_BUDGET): string[] {
  if (s.error) return [];
  const over: string[] = [];
  if (s.idle.uploadsPerS > budget.idleUploadsPerS)
    over.push(
      `uploads ${fmt(s.idle.uploadsPerS)}/s with nothing changing (budget ${budget.idleUploadsPerS})`,
    );
  if (s.idle.texelsPerS > budget.idleTexelsPerS)
    over.push(
      `${kilo(s.idle.texelsPerS)} texels/s with nothing changing (budget ${kilo(budget.idleTexelsPerS)})`,
    );
  if (s.active.texelsPerS > budget.activeTexelsPerS)
    over.push(
      `${kilo(s.active.texelsPerS)} texels/s running (budget ${kilo(budget.activeTexelsPerS)})`,
    );
  if (s.updateUs > budget.updateUs)
    over.push(`update ${fmt(s.updateUs)} µs (budget ${budget.updateUs} µs)`);
  // Which of its textures, where it uploads too much.
  const by = over.some((o) => o.includes('texels') || o.includes('uploads'))
    ? (s.idle.uploadsBy ?? s.active.uploadsBy)
    : undefined;
  if (by) over.push(`uploading ${by}`);
  return over;
}

/** Upload counts by texture size, most first, as `512×512 ×72, 64×64 ×3`. */
export function uploadsBySize(sizes: ReadonlyMap<string, number>, top = 3) {
  return [...sizes]
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([size, n]) => `${size} ×${n}`)
    .join(', ');
}

/** A texture upload's size, `width×height`, from its call's arguments. */
export function uploadSize(
  method: 'texImage2D' | 'texSubImage2D',
  args: readonly unknown[],
): string {
  const n = (v: unknown) => (typeof v === 'number' ? v : 0);
  const source = (v: unknown) => {
    const o = (v ?? {}) as { width?: number; height?: number };
    return `${o.width ?? 0}×${o.height ?? 0}`;
  };
  if (method === 'texImage2D')
    return args.length >= 8 ? `${n(args[3])}×${n(args[4])}` : source(args[5]);
  return args.length >= 8 ? `${n(args[4])}×${n(args[5])}` : source(args[6]);
}

/**
 * The texels a WebGL upload call moves, from its arguments: an explicit
 * width and height where given, else its source's (a canvas, an image, an
 * ImageData). Zero for a call it does not recognise.
 */
export function uploadTexels(
  method: 'texImage2D' | 'texSubImage2D',
  args: readonly unknown[],
): number {
  const n = (v: unknown) => (typeof v === 'number' ? v : 0);
  const source = (v: unknown) => {
    if (!v || typeof v !== 'object') return 0;
    const o = v as {
      width?: number;
      height?: number;
      videoWidth?: number;
      videoHeight?: number;
    };
    return (
      (o.videoWidth ?? o.width ?? 0) * (o.videoHeight ?? o.height ?? 0) || 0
    );
  };
  if (method === 'texImage2D') {
    // (target, level, internal, width, height, border, format, type, data…)
    if (args.length >= 8) return n(args[3]) * n(args[4]);
    // (target, level, internal, format, type, source)
    return source(args[5]);
  }
  // (target, level, x, y, width, height, format, type, data…)
  if (args.length >= 8) return n(args[4]) * n(args[5]);
  // (target, level, x, y, format, type, source)
  return source(args[6]);
}

/** A texture's bytes on the GPU, RGBA8, a full mip chain adding a third. */
export const textureBytes = (width: number, height: number, mipmaps: boolean) =>
  Math.round(width * height * 4 * (mipmaps ? 4 / 3 : 1));

const fmt = (v: number, digits = 1) =>
  Number.isFinite(v) ? v.toFixed(digits) : '–';
const ms = (v: number) =>
  v >= 1 ? v.toFixed(2) : v >= 0.01 ? v.toFixed(3) : v.toFixed(4);
const kilo = (v: number) =>
  v >= 1e6
    ? `${(v / 1e6).toFixed(1)}M`
    : v >= 1e3
      ? `${(v / 1e3).toFixed(0)}k`
      : v.toFixed(0);
const cell = (s: string) => s.replace(/\|/g, '/');

/** The ranked table, as Markdown: one row a component. */
export function rankedTable(ranked: readonly Ranked[], limit = Infinity) {
  const head =
    '| # | Component | Source | Copies (busy) | Unit ms/frame | Where used ms | update µs | Update mean / worst ms | Render ms | Uploads/s idle · run | Texels/s idle · run | 2D ops/s run | Draws | Tris | Mats | Tex | Tex MB | Build ms | Over budget |';
  const rule = `|${' --- |'.repeat(19)}`;
  const rows = ranked.slice(0, limit).map((r, i) => {
    const s = r.sample;
    if (s.error)
      return `| ${[i + 1, cell(s.label), s.source, r.usage?.count ?? 0, 'error', ...Array<string>(13).fill(''), cell(s.error)].join(' | ')} |`;
    const cols = [
      i + 1,
      cell(s.label),
      s.source,
      r.usage ? `${r.usage.count} (${r.usage.busy})` : '0',
      ms(r.unitMs),
      r.weight ? ms(r.whereUsedMs) : '–',
      fmt(s.updateUs, 1),
      `${ms(s.active.updateMeanMs)} / ${ms(s.active.updateWorstMs)}`,
      ms(s.active.renderMeanMs),
      `${fmt(s.idle.uploadsPerS)} · ${fmt(s.active.uploadsPerS)}`,
      `${kilo(s.idle.texelsPerS)} · ${kilo(s.active.texelsPerS)}`,
      kilo(s.active.ops2dPerS),
      s.drawCalls,
      kilo(s.triangles),
      s.materials,
      s.textures,
      (s.textureBytes / 1e6).toFixed(2),
      fmt(s.buildMs),
      cell(
        (overBudget(s).length && knownOverBudget(s.id) ? 'known: ' : '') +
          overBudget(s).join('; '),
      ),
    ];
    return `| ${cols.join(' | ')} |`;
  });
  return [head, rule, ...rows].join('\n');
}

/** The rows as plain objects, for `console.table`. */
export const consoleRows = (ranked: readonly Ranked[]) =>
  ranked.map((r, i) => ({
    rank: i + 1,
    component: r.sample.label,
    copies: r.usage?.count ?? 0,
    busy: r.usage?.busy ?? 0,
    unitMs: Number(r.unitMs.toFixed(4)),
    whereUsedMs: Number(r.whereUsedMs.toFixed(4)),
    updateUs: Number(r.sample.updateUs.toFixed(1)),
    uploadsIdle: Number(r.sample.idle.uploadsPerS.toFixed(1)),
    uploadsRun: Number(r.sample.active.uploadsPerS.toFixed(1)),
    texelsRun: Math.round(r.sample.active.texelsPerS),
    draws: r.sample.drawCalls,
    tris: r.sample.triangles,
    buildMs: Number(r.sample.buildMs.toFixed(1)),
    over: overBudget(r.sample).join('; '),
    error: r.sample.error ?? '',
  }));
