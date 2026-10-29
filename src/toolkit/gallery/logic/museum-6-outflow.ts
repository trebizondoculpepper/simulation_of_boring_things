/**
 * Hall 6's tank inlet: how the water leaving the fill pipe's open end
 * looks for a given delivery (the owner, 2026-10-29). Below a few
 * millilitres a second it drips, a drop at a time, as often as the flow
 * fills a drop; above that the drops merge into a stream, whose section
 * grows with the flow (the stream's speed taken as the full pipe's at the
 * largest pump's delivery) until, at that delivery, it is as wide as the
 * pipe's bore. Pure.
 */

/** One drop's volume, millilitres (a falling drop of water, about 4.6 mm across). */
export const DROP_ML = 0.05;
/** Drips merge into a stream above this, millilitres a second (about 9 l/h). */
export const STREAM_ML_S = 2.5;
/** The most drops drawn in a second: faster drips look the same. */
export const MAX_SHOWN_DROPS = 20;
/** The thinnest stream drawn, metres across. */
export const MIN_STREAM_M = 0.003;
/** Gravity, m/s². */
export const G = 9.81;

/** A drop's diameter, metres, from its volume. */
export const DROP_M = Math.cbrt((6 * DROP_ML * 1e-6) / Math.PI);

export type Outflow =
  | { kind: 'none' }
  | {
      kind: 'drops';
      /** Drops a second, as the flow honestly fills them. */
      dropsPerSecond: number;
      /** Drops a second drawn, no more than `MAX_SHOWN_DROPS`. */
      shownPerSecond: number;
    }
  | {
      kind: 'stream';
      /** The stream's diameter where it leaves the pipe, metres. */
      diameter: number;
      /** Its share of the pipe's bore, 0 to 1. */
      share: number;
    };

/** Millilitres a second from m³/h. */
export const mlPerSecond = (m3h: number) => (m3h * 1e6) / 3600;

/**
 * The outflow for `m3h` from a pipe of bore `boreM`, whose stream fills
 * that bore at `fullM3h`.
 */
export function outflowOf(
  m3h: number,
  boreM: number,
  fullM3h: number,
): Outflow {
  const ml = mlPerSecond(m3h);
  if (!(ml > 0)) return { kind: 'none' };
  if (ml < STREAM_ML_S) {
    const dropsPerSecond = ml / DROP_ML;
    return {
      kind: 'drops',
      dropsPerSecond,
      shownPerSecond: Math.min(dropsPerSecond, MAX_SHOWN_DROPS),
    };
  }
  // Area in proportion to flow, at one speed: diameter as its square root.
  const share = Math.min(1, Math.sqrt(m3h / fullM3h));
  const diameter = Math.min(boreM, Math.max(MIN_STREAM_M, boreM * share));
  return { kind: 'stream', diameter, share: diameter / boreM };
}

/** Seconds to fall `height` metres from rest. */
export const fallTime = (height: number) =>
  Math.sqrt((2 * Math.max(0, height)) / G);

/** How far below its start a thing falling from rest is after `t` seconds, metres. */
export const fallen = (t: number) => 0.5 * G * t * t;

/**
 * How many things fall due in `delta` seconds at `perSecond`, with the
 * fraction `carry` left over from before: the count now and the carry on.
 */
export function due(
  perSecond: number,
  delta: number,
  carry: number,
): { count: number; carry: number } {
  const total = carry + Math.max(0, perSecond) * Math.max(0, delta);
  const count = Math.floor(total);
  return { count, carry: total - count };
}

/** Splash rings a second where a stream lands: more as it thickens. */
export const ringsPerSecond = (share: number) => 4 + 8 * share;

/** How far a splash ring spreads, metres, round a stream (or drop) `diameter` across. */
export const ringReach = (diameter: number) => 0.04 + diameter * 1.5;
