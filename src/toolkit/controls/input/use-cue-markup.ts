import type { UseCue } from '../logic/use-cue';

/**
 * The use cue's drawings (prompt 115, `doc/plans/115/push-pull-cue.md`):
 * small inline SVGs in the reticle's high-contrast style, a coloured fill
 * with a half-pixel dark edge, green where the use will do something and
 * red where it will not. The turn arrow curves over the ring; the push and
 * pull arrow stands up and to the right of it, in perspective: a push
 * comes in from the upper right, wide and near at its tail, narrowing to a
 * small head at the ring, far away; a pull is the same arrow reversed,
 * growing out of the ring to a big head near the player. The plain ring
 * (some other use) draws nothing here. Each shape is worked out once.
 */

export const CUE_GO = '#44df70';
export const CUE_STOP = '#f04b43';
export const CUE_EDGE = '#182327';
const LABEL_INK = '#f5f1df';

const f = (n: number) => n.toFixed(2);

const label = (text: string, x: number, y: number) =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-size="9" font-weight="bold" font-family="sans-serif" fill="${LABEL_INK}" stroke="${CUE_EDGE}" stroke-width="2.5" paint-order="stroke">${text}</text>`;

/**
 * The turn arrow's shape: a tail along an arc over the top, tapering from
 * a point to its full width (the owner, 2026-10-31: so which way it goes
 * is plain at a glance), and a big head at its end.
 */
const TURN_ARROW = (() => {
  const W = 34;
  const cx = 15;
  const cy = 17;
  const r = 10;
  const from = (200 * Math.PI) / 180;
  const to = (318 * Math.PI) / 180;
  const N = 16;
  const outer: string[] = [];
  const inner: string[] = [];
  for (let k = 0; k <= N; k++) {
    const t = k / N;
    const a = from + (to - from) * t;
    const half = 0.25 + 1.9 * t;
    const [ux, uy] = [Math.cos(a), Math.sin(a)];
    outer.push(`${f(cx + (r + half) * ux)},${f(cy + (r + half) * uy)}`);
    inner.unshift(`${f(cx + (r - half) * ux)},${f(cy + (r - half) * uy)}`);
  }
  const ex = cx + r * Math.cos(to);
  const ey = cy + r * Math.sin(to);
  // Along the arc at its end (clockwise), and across it.
  const [tx, ty] = [-Math.sin(to), Math.cos(to)];
  const [nx, ny] = [-ty, tx];
  const p = (along: number, across: number) =>
    `${f(ex + tx * along + nx * across)},${f(ey + ty * along + ny * across)}`;
  return {
    W,
    tail: [...outer, ...inner].join(' '),
    head: [p(6, 0), p(-1, 4.2), p(-1, -4.2)].join(' '),
    // The tail's fade runs from its start to its head, left to right.
    fadeFrom: f(cx + r * Math.cos(from)),
    fadeTo: f(ex),
  };
})();

/** One curved arrow, clockwise or (mirrored) anticlockwise, and its label. */
function turnArrow(direction: -1 | 1, possible: boolean, button?: string) {
  const colour = possible ? CUE_GO : CUE_STOP;
  const { W, tail, head, fadeFrom, fadeTo } = TURN_ARROW;
  const H = button ? 30 : 21;
  const fade = `turn-fade-${possible ? 'go' : 'stop'}`;
  const flip =
    direction < 0 ? ` transform="translate(${W} 0) scale(-1 1)"` : '';
  return (
    `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<defs><linearGradient id="${fade}" gradientUnits="userSpaceOnUse" x1="${fadeFrom}" y1="0" x2="${fadeTo}" y2="0">` +
    `<stop offset="0" stop-color="${colour}" stop-opacity="0.15"/><stop offset="1" stop-color="${colour}" stop-opacity="1"/></linearGradient></defs>` +
    `<g${flip}><polygon points="${tail}" fill="url(#${fade})" stroke="${CUE_EDGE}" stroke-opacity="0.6" stroke-width="0.5" stroke-linejoin="round"/>` +
    `<polygon points="${head}" fill="${colour}" stroke="${CUE_EDGE}" stroke-width="0.5" stroke-linejoin="round"/></g>` +
    `${button ? label(button, W / 2, 28) : ''}</svg>`
  );
}

/**
 * The push and pull arrow's box, its lower left corner at the ring's
 * centre (the box is placed so), and the line it runs along: from the
 * ring, at 45° up and to the right, clear of the ring's edge.
 */
const DEPTH = { W: 32, H: 32, ring: [9, 23], far: [28, 4] } as const;

/**
 * A straight arrow from `from` to its point at `to`: a body tapering from
 * `fromHalf` to `toHalf` (half-widths, px), then a head `headLength` long
 * and `headHalf` wide each side; its body fades from `fadeFrom` at its
 * tail to `fadeTo` at its head.
 */
function straightArrow(
  from: readonly [number, number],
  to: readonly [number, number],
  shape: {
    fromHalf: number;
    toHalf: number;
    headHalf: number;
    headLength: number;
  },
) {
  const [dx, dy] = [to[0] - from[0], to[1] - from[1]];
  const length = Math.hypot(dx, dy);
  const [ux, uy] = [dx / length, dy / length];
  const [nx, ny] = [-uy, ux];
  const at = (along: number, across: number) =>
    `${f(from[0] + ux * along + nx * across)},${f(from[1] + uy * along + ny * across)}`;
  const base = length - shape.headLength;
  return {
    body: [
      at(0, shape.fromHalf),
      at(base + 0.4, shape.toHalf),
      at(base + 0.4, -shape.toHalf),
      at(0, -shape.fromHalf),
    ].join(' '),
    head: [
      at(length, 0),
      at(base, shape.headHalf),
      at(base, -shape.headHalf),
    ].join(' '),
  };
}

/** A push: wide and near at the upper right, narrowing to a small head at the ring. */
const PUSH_ARROW = straightArrow(DEPTH.far, DEPTH.ring, {
  fromHalf: 3.5,
  toHalf: 1.5,
  headHalf: 2.6,
  headLength: 4.5,
});

/** A pull: thin and faint at the ring, growing to a big head at the upper right. */
const PULL_ARROW = straightArrow(DEPTH.ring, DEPTH.far, {
  fromHalf: 0.4,
  toHalf: 2.2,
  headHalf: 5,
  headLength: 7,
});

/** The perspective arrow for a push or a pull, and its gamepad button. */
function depthArrow(gesture: 'push' | 'pull', possible: boolean, button = '') {
  const colour = possible ? CUE_GO : CUE_STOP;
  const { W, H, ring, far } = DEPTH;
  const { body, head } = gesture === 'push' ? PUSH_ARROW : PULL_ARROW;
  // The far end (at the ring) fades, a push's a little, a pull's more,
  // as the turn arrow's tail does.
  const fade = `${gesture}-fade-${possible ? 'go' : 'stop'}`;
  const farOpacity = gesture === 'push' ? 0.5 : 0.15;
  return (
    `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<defs><linearGradient id="${fade}" gradientUnits="userSpaceOnUse" x1="${ring[0]}" y1="${ring[1]}" x2="${far[0]}" y2="${far[1]}">` +
    `<stop offset="0" stop-color="${colour}" stop-opacity="${farOpacity}"/><stop offset="1" stop-color="${colour}" stop-opacity="1"/></linearGradient></defs>` +
    `<polygon points="${body}" fill="url(#${fade})" stroke="${CUE_EDGE}" stroke-opacity="0.6" stroke-width="0.5" stroke-linejoin="round"/>` +
    `<polygon points="${head}" fill="${colour}" stroke="${CUE_EDGE}" stroke-width="0.5" stroke-linejoin="round"/>` +
    // The pad's button below the arrow's far end, clear of its line.
    `${button ? label(button, 26, 26) : ''}</svg>`
  );
}

/** The cue's markup: its glyph, or a knob's LB and RB arrows; none for the plain ring. */
export function useCueMarkup(cue: UseCue): string {
  if (cue.kind === 'both')
    return turnArrow(-1, cue.down, 'LB') + turnArrow(1, cue.up, 'RB');
  if (cue.gesture === 'turn')
    return turnArrow(cue.direction < 0 ? -1 : 1, cue.possible, cue.button);
  if (cue.gesture === 'push' || cue.gesture === 'pull')
    return depthArrow(cue.gesture, cue.possible, cue.button);
  return '';
}
