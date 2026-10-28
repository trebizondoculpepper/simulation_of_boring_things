/**
 * The oil-wheel projector on Hall 7's 1970s grout (the owner, 2026-10-28:
 * "make a projector that looks like an oil-wheel on the 1970s grout"):
 * a disco-era effects projector, a lamp house and lens with a motor turning
 * a sealed glass wheel of coloured oils across the beam, so the light it
 * throws swims and turns. Modelled on the liquid-wheel effects projectors
 * of the 1970s (a 250 W lamp house, a 6-inch wheel turned at about 1 rpm by
 * a small geared motor). Pure: the wheel's turn and its oils, seeded, so it
 * looks the same on every visit.
 */

/** The wheel: 150 mm of glass, turned slowly by a geared motor. */
export const OIL_WHEEL = {
  diameter: 0.15,
  /** Revolutions a minute: the slow turn of the period's wheel motors. */
  rpm: 1.2,
  /**
   * The oils within drift against the glass as it turns (they lag, and
   * slide back under gravity): the projected pattern's second layer turns
   * the other way, slower, so the light swims rather than just rotates.
   */
  drift: -0.45,
} as const;

/** Its oils: the decade's colours, the avocado's among them. */
export const OIL_COLOURS = [
  '#ff7a1a',
  '#e0306a',
  '#7a3cff',
  '#1fb8c8',
  '#c8d43a',
  '#ffcf33',
] as const;

/** The wheel's turn, radians, `seconds` after it was switched on. */
export function wheelAngle(seconds: number, rpm: number = OIL_WHEEL.rpm) {
  const turns = (seconds * rpm) / 60;
  return (turns - Math.floor(turns)) * Math.PI * 2;
}

export interface OilBlob {
  /** Its centre, as a fraction of the wheel's radius, polar. */
  readonly r: number;
  readonly a: number;
  /** Its size, as a fraction of the wheel's radius. */
  readonly size: number;
  readonly colour: string;
}

/** A small, deterministic generator (mulberry32). */
function random(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The oils' blobs in the wheel, the same for the same seed; every one inside the glass. */
export function oilBlobs(seed = 1970, count = 22): OilBlob[] {
  const next = random(seed);
  return Array.from({ length: count }, (_, k) => {
    const size = 0.16 + next() * 0.3;
    const r = Math.sqrt(next()) * (1 - size);
    return {
      r,
      a: next() * Math.PI * 2,
      size,
      colour: OIL_COLOURS[k % OIL_COLOURS.length],
    };
  });
}
