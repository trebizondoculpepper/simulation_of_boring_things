import type { ScenarioView } from '../../../game/plant/museum-4-challenge';

/**
 * Hall 4's dosing console's celebration and commiseration (the owner,
 * 2026-10-31): when a card is won, fireworks, a thumbs up and smiling faces
 * across all three screens; when its par runs out, a thumbs down, a sad face
 * and a rain cloud. Each plays for a few seconds over the screens and then
 * gives them back to the banner beneath (the won card's explanation, or the
 * out-of-doses screen with its retry). Its frames step at `FRAME_RATE`, so the
 * screens redraw at no more than 10 Hz while it plays and not at all after.
 * Pure: where everything is at time t, drawn by `views/console-celebration`.
 */

export type CelebrationKind = 'won' | 'lost';

/** Real seconds each plays for. */
export const CELEBRATION_SECONDS: Record<CelebrationKind, number> = {
  won: 6,
  lost: 4.5,
};

/** Frames a second while one plays: the screens' redraw rate. */
export const FRAME_RATE = 10;

/** Seconds the overlay takes to fade in and out at its ends. */
export const FADE = 0.5;

export interface CelebrationFrame {
  kind: CelebrationKind;
  /** The frame number, from 0, stepping at `FRAME_RATE`. */
  frame: number;
  /** The frame's time, s (a whole number of frames). */
  t: number;
  /** The overlay's opacity, 0 to 1, fading in and out. */
  alpha: number;
}

/** What shows `t` seconds into a `kind`, or null once it has ended. */
export function celebrationFrame(
  kind: CelebrationKind,
  t: number,
): CelebrationFrame | null {
  const end = CELEBRATION_SECONDS[kind];
  if (t < 0 || t >= end) return null;
  const frame = Math.floor(t * FRAME_RATE);
  const ft = frame / FRAME_RATE;
  const alpha = Math.max(0, Math.min(1, ft / FADE, (end - ft) / FADE));
  return { kind, frame, t: ft, alpha: Math.round(alpha * 10) / 10 };
}

/** A frame's redraw key: the screens redraw only when it changes. */
export const celebrationKey = (f: CelebrationFrame | null) =>
  f ? `${f.kind}:${f.frame}` : '';

/**
 * Which plays as the scenario view goes from `a` to `b`: a card won or
 * failed while it was being played, else null (a won or failed card shown
 * from the start, as the dev room's demonstrations do, plays none).
 */
export function celebrationOn(
  a: ScenarioView['kind'] | null,
  b: ScenarioView['kind'],
): CelebrationKind | null {
  if (a !== 'challenge') return null;
  return b === 'won' ? 'won' : b === 'failed' ? 'lost' : null;
}

// ---- Fireworks ------------------------------------------------------------------

export interface Spark {
  x: number;
  y: number;
  r: number;
  hue: number;
  /** 0 to 1. */
  alpha: number;
}

/** Seconds one burst lasts. */
const BURST = 1.4;
/** Sparks in a burst. */
const SPARKS = 14;

/** A deterministic hash in [0, 1), so a frame always draws the same. */
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/**
 * The fireworks' sparks on `screen` (0, 1, 2) at time `t`, in canvas pixels
 * of a `w` × `h` screen: a burst begins every 0.5 s somewhere in the upper
 * part, its sparks flying out, falling a little and fading over `BURST` s;
 * none begin in the last `BURST` s, so the sky is clear as it fades out.
 */
export function fireworks(
  screen: number,
  t: number,
  w: number,
  h: number,
  until: number = CELEBRATION_SECONDS.won,
): Spark[] {
  const sparks: Spark[] = [];
  const every = 0.5;
  for (let b = 0; b * every < Math.min(t + 1e-9, until - BURST); b++) {
    const age = t - (b * every + hash(screen * 31 + b) * 0.3);
    if (age < 0 || age > BURST) continue;
    const seed = screen * 1000 + b * 17;
    const cx = w * (0.15 + 0.7 * hash(seed + 1));
    const cy = h * (0.15 + 0.35 * hash(seed + 2));
    const hue = Math.floor(hash(seed + 3) * 360);
    const reach = (0.12 + 0.08 * hash(seed + 4)) * w;
    const out = 1 - (1 - age / BURST) ** 3;
    const fall = 40 * (age / BURST) ** 2;
    const fade = 1 - age / BURST;
    for (let k = 0; k < SPARKS; k++) {
      const a = (2 * Math.PI * k) / SPARKS + hash(seed + 5);
      sparks.push({
        x: cx + Math.cos(a) * reach * out,
        y: cy + Math.sin(a) * reach * out + fall,
        r: 3 + 4 * fade,
        hue: (hue + k * 6) % 360,
        alpha: fade,
      });
    }
  }
  return sparks;
}

/** Rain from the lost card's cloud: drops at time `t`, falling and looping. */
export function raindrops(
  t: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  count = 12,
): { x: number; y: number }[] {
  const drops: { x: number; y: number }[] = [];
  for (let k = 0; k < count; k++) {
    const u = (t * 0.9 + hash(k + 7)) % 1;
    drops.push({
      x: x0 + (x1 - x0) * ((k + 0.5) / count) + 6 * (hash(k) - 0.5),
      y: y0 + (y1 - y0) * u,
    });
  }
  return drops;
}
