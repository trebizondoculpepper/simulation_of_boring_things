/**
 * An old flat panel's passing faults (the owner, 2026-10-31: the Dr
 * Aqualis Trio's screen should now and then show stuck pixels or a defect,
 * "a bit transient so that it doesn't harm our use of the machine"):
 * early-2000s TFTs were prone to them. Now and then one comes on, stays a
 * few minutes and goes: a stuck sub-pixel (a bright red, green or blue
 * dot), a dead pixel (black), or a faint line down one column (a column
 * driver's loose bond, warm one minute and fine the next). Each is a dot
 * or a hairline, so it never hides anything that matters. The schedule is
 * a pure function of the time and a seed, so a panel's faults are the
 * same however it is stepped, and the screen redraws only when one comes
 * or goes (`defectsKey`). Pure.
 */

export type DefectKind = 'stuck' | 'dead' | 'column';

export interface Defect {
  kind: DefectKind;
  /** The pixel, or (a column) its x. */
  x: number;
  y: number;
  /** Its colour (a stuck sub-pixel's, or a column's tint). */
  colour: string;
}

/** How the faults come: a slot every `SLOT` seconds may hold one, lasting `last` seconds. */
export const DEFECTS = {
  /** Seconds in each slot of the schedule. */
  slot: 600,
  /** The share of slots with a fault in them. */
  chance: 0.45,
  /** How long a fault lasts, s: from `last[0]` to `last[1]`. */
  last: [60, 300] as const,
} as const;

/** A small seeded hash to 0..1. */
function rand(seed: number, n: number, k: number) {
  let h = (seed * 374761393 + n * 668265263 + k * 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967296;
}

const STUCK = ['#ff2020', '#20ff40', '#3050ff', '#ffffff'];

/** The faults showing at `t` seconds on a `w` × `h` panel. */
export function defectsAt(t: number, w: number, h: number, seed = 1): Defect[] {
  const out: Defect[] = [];
  const slot = Math.floor(Math.max(0, t) / DEFECTS.slot);
  // A fault may run on into the next slot, so look at this one and the last.
  for (const n of [slot - 1, slot]) {
    if (n < 0 || rand(seed, n, 0) >= DEFECTS.chance) continue;
    const start =
      n * DEFECTS.slot + rand(seed, n, 1) * (DEFECTS.slot - DEFECTS.last[1]);
    const last =
      DEFECTS.last[0] + rand(seed, n, 2) * (DEFECTS.last[1] - DEFECTS.last[0]);
    if (t < start || t >= start + last) continue;
    const pick = rand(seed, n, 3);
    const kind: DefectKind =
      pick < 0.55 ? 'stuck' : pick < 0.85 ? 'dead' : 'column';
    // Clear of the edges, where the title and status strips are.
    const x = Math.floor(8 + rand(seed, n, 4) * (w - 16));
    const y = Math.floor(60 + rand(seed, n, 5) * (h - 110));
    out.push({
      kind,
      x,
      y,
      colour:
        kind === 'dead'
          ? '#000000'
          : kind === 'column'
            ? 'rgba(255,255,255,0.22)'
            : STUCK[Math.floor(rand(seed, n, 6) * STUCK.length)],
    });
  }
  return out;
}

/** What the faults look like, for the screen's redraw key: changes only when one comes or goes. */
export const defectsKey = (d: readonly Defect[]) =>
  d.map((f) => `${f.kind}${f.x},${f.y}`).join(';');
