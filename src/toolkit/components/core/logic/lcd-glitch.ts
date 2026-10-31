/**
 * The glitch (mission 114, `doc/plans/114/crash-modes.md`): the Dr Aqualis
 * Trio's operating system crashing with a buffer overflow that writes
 * garbage into its LCD's frame buffer. Designed with Codex, as the owner
 * asked. This plans one frame of the wreckage as plain data (fills, copies
 * of the last good frame, text runs and glyphs from a broken font ROM) for
 * `views/lcd-glitch.ts` to paint: wrong-stride shears, torn and squeezed
 * tiles, hex and binary dumps, misread glyphs, palette corruption, colour
 * bars and stuck columns, each burst a different mix, damage accumulating.
 *
 * It changes in bursts (`glitchMoment`): two to five frames a few tenths
 * of a second apart (never above `GLITCH_MAX_HZ`), then a hold of four to
 * twelve seconds, under 0.8 changes a second over a run, so a 640 × 480
 * screen keeps within the component bench's budget. `glitchBurst` tells a
 * host when a burst is being written, so it can reroll the dosing outputs
 * with it. Deterministic from the seed, the burst and the frame. Pure: no
 * DOM.
 */

/** Dimensions of the LCD in target pixels. */
export interface GlitchSize {
  w: number;
  h: number;
}

/** Composite modes used by the LCD drawer. */
export type GlitchBlend =
  | 'source-over'
  | 'difference'
  | 'exclusion'
  | 'multiply'
  | 'screen'
  | 'hue'
  | 'color'
  | 'saturation'
  | 'lighter';

/** One plain-data drawing operation in target pixels. */
export type GlitchOp =
  | {
      kind: 'fill';
      x: number;
      y: number;
      w: number;
      h: number;
      color: string;
      blend?: GlitchBlend;
      alpha?: number;
    }
  | {
      kind: 'copy';
      sx: number;
      sy: number;
      sw: number;
      sh: number;
      dx: number;
      dy: number;
      dw: number;
      dh: number;
      blend?: GlitchBlend;
      alpha?: number;
    }
  | {
      kind: 'text';
      x: number;
      y: number;
      w: number;
      h: number;
      text: string;
      color: string;
      size: number;
      background?: string;
    }
  | {
      kind: 'glyphs';
      x: number;
      y: number;
      w: number;
      h: number;
      pixel: number;
      color: string;
      bits: number[];
    };

/** A complete, deterministic LCD image recipe. */
export interface GlitchPlan {
  seed: number;
  burst: number;
  frame: number;
  base: 'frame' | 'black' | 'none';
  ops: GlitchOp[];
}

/** The greatest permitted LCD redraw frequency. */
export const GLITCH_MAX_HZ = 10;

/** The burst and frame visible at a crash-relative time. */
export interface GlitchMoment {
  burst: number;
  frame: number;
  key: string;
}

interface BurstTiming {
  start: number;
  frames: number[];
  /** When its last frame's writing stops and the hold begins. */
  end: number;
  next: number;
}

const timingCache = new Map<number, BurstTiming[]>();
const accents = [
  '#00f7df',
  '#ff22c8',
  '#f5f900',
  '#ff642c',
  '#38a3ff',
  '#8bff47',
];
const bars = [
  '#ffffff',
  '#ffff00',
  '#00ffff',
  '#00ff00',
  '#ff00ff',
  '#ff0000',
  '#0000ff',
];

// Five bits per scan line, top to bottom. The damaged reader below changes these
// rows after fetching them, rather than drawing arbitrary noise.
const fontRom: Record<string, number[]> = {
  '0': [14, 17, 19, 21, 25, 17, 14],
  '1': [4, 12, 4, 4, 4, 4, 14],
  '2': [14, 17, 1, 2, 4, 8, 31],
  '3': [30, 1, 1, 14, 1, 1, 30],
  '4': [2, 6, 10, 18, 31, 2, 2],
  '5': [31, 16, 30, 1, 1, 17, 14],
  '6': [6, 8, 16, 30, 17, 17, 14],
  '7': [31, 1, 2, 4, 8, 8, 8],
  '8': [14, 17, 17, 14, 17, 17, 14],
  '9': [14, 17, 17, 15, 1, 2, 12],
  A: [14, 17, 17, 31, 17, 17, 17],
  B: [30, 17, 17, 30, 17, 17, 30],
  C: [15, 16, 16, 16, 16, 16, 15],
  D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31],
  F: [31, 16, 16, 30, 16, 16, 16],
  ':': [0, 4, 4, 0, 4, 4, 0],
  '-': [0, 0, 0, 31, 0, 0, 0],
  '/': [1, 1, 2, 4, 8, 16, 16],
  ' ': [0, 0, 0, 0, 0, 0, 0],
};

function mix(seed: number, burst: number, frame: number): number {
  let x =
    (seed | 0) ^
    Math.imul((burst | 0) + 1, 0x9e3779b9) ^
    Math.imul((frame | 0) + 1, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return (x ^ (x >>> 16)) >>> 0;
}

function random(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let x = Math.imul(state ^ (state >>> 15), 1 | state);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 0x100000000;
  };
}

function integer(rng: () => number, low: number, high: number): number {
  return low + Math.floor(rng() * (high - low + 1));
}

function bounded(value: number, maximum: number): number {
  return Math.max(0, Math.min(maximum, Math.floor(value)));
}

function wrap(value: number, width: number): number {
  return ((value % width) + width) % width;
}

/** Build the damage for one frame, with a stable composition across a burst. */
export function glitchPlan(
  seed: number,
  burst: number,
  frame: number,
  size: GlitchSize,
): GlitchPlan {
  const w = Math.max(0, Math.floor(size.w));
  const h = Math.max(0, Math.floor(size.h));
  const ops: GlitchOp[] = [];
  const plan: GlitchPlan = { seed, burst, frame, base: 'frame', ops };
  if (!w || !h) return plan;

  const theme = random(mix(seed, burst, 0));
  const detail = random(mix(seed, burst, frame + 1));
  // Each burst a different character from the last, in an order each seed sets.
  const style = (((burst + (mix(seed, -1, -1) % 4)) % 4) + 4) % 4;
  const colour = accents[integer(theme, 0, accents.length - 1)];
  const rival = accents[integer(theme, 0, accents.length - 1)];
  const damage = Math.min(
    1,
    0.4 + Math.max(0, burst) * 0.04 + Math.max(0, frame) * 0.085,
  );
  plan.base = style === 1 ? 'black' : 'frame';

  function fill(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    blend?: GlitchBlend,
    alpha?: number,
  ): void {
    const left = bounded(x, w);
    const top = bounded(y, h);
    const right = bounded(x + width, w);
    const bottom = bounded(y + height, h);
    if (right > left && bottom > top)
      ops.push({
        kind: 'fill',
        x: left,
        y: top,
        w: right - left,
        h: bottom - top,
        color,
        blend,
        alpha,
      });
  }

  function copy(
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw = sw,
    dh = sh,
    alpha?: number,
  ): void {
    const sourceX = bounded(sx, w);
    const sourceY = bounded(sy, h);
    const targetX = bounded(dx, w);
    const targetY = bounded(dy, h);
    const sourceWidth = Math.min(sw, w - sourceX);
    const sourceHeight = Math.min(sh, h - sourceY);
    const targetWidth = Math.min(dw, w - targetX);
    const targetHeight = Math.min(dh, h - targetY);
    if (
      sourceWidth > 0 &&
      sourceHeight > 0 &&
      targetWidth > 0 &&
      targetHeight > 0
    )
      ops.push({
        kind: 'copy',
        sx: sourceX,
        sy: sourceY,
        sw: sourceWidth,
        sh: sourceHeight,
        dx: targetX,
        dy: targetY,
        dw: targetWidth,
        dh: targetHeight,
        alpha,
      });
  }

  function tornRow(y: number, height: number, shift: number): void {
    const offset = wrap(shift, w);
    copy(0, y, w - offset, height, offset, y);
    if (offset) copy(w - offset, y, offset, height, 0, y);
  }

  // A line-length register error walks the source address across the LCD.
  // The row height is about two pixels at the native size, but rises on large
  // canvases to keep the operation count bounded.
  const shearStart =
    style === 0 && theme() < 0.55
      ? 0
      : Math.floor(h * (style === 1 ? 0.04 : 0.08 + theme() * 0.16));
  const shearFraction =
    (style === 1
      ? 0.3 + theme() * 0.16
      : style === 2
        ? 0.55 + theme() * 0.2
        : 0.68 + theme() * 0.22) + Math.min(0.1, Math.max(0, burst) * 0.01);
  const shearEnd =
    style === 0 && theme() < 0.35
      ? h
      : Math.min(h, shearStart + Math.max(1, Math.floor(h * shearFraction)));
  const rowHeight = Math.max(2, Math.ceil(h / 195));
  const stride =
    theme() < 0.15
      ? integer(theme, 1, 3)
      : integer(theme, 5, Math.max(5, Math.floor(w * 0.035)));
  const phase = integer(theme, 0, w - 1) + frame * (3 + stride);
  for (let y = shearStart; y < shearEnd; y += rowHeight)
    tornRow(
      y,
      Math.min(rowHeight, shearEnd - y),
      phase + Math.floor((y - shearStart) / rowHeight) * stride,
    );

  // Entire address ranges can inherit a bad palette register.
  if (style === 2) {
    fill(0, 0, w, h, theme() < 0.5 ? '#ffffff' : '#f8ed42', 'difference', 0.9);
    fill(0, 0, w, h, '#f900c8', 'color', 0.44);
  } else if (style === 3) {
    fill(
      0,
      Math.floor(h * 0.08),
      w,
      Math.floor(h * 0.84),
      theme() < 0.5 ? '#37ff00' : '#ffab00',
      'color',
      0.8,
    );
  } else if (style === 0 && theme() < 0.45) {
    fill(0, Math.floor(h * 0.12), w, Math.floor(h * 0.68), colour, 'hue', 0.8);
  }

  // Wrong width register: intact rows are fetched but squeezed into repeated
  // copies. Leave some of the sheared image visible around the tiled patch.
  if (style === 2 || style === 3 || (style === 0 && theme() < 0.55)) {
    const count = integer(theme, 2, 4);
    const tileY = Math.floor(h * (0.04 + theme() * 0.22));
    const tileH = Math.max(1, Math.floor(h * (0.15 + theme() * 0.18)));
    const sourceY = Math.floor(h * (theme() * 0.26));
    const tileW = Math.ceil(w / count);
    for (let i = 0; i < count; i++)
      copy(
        0,
        sourceY,
        w,
        Math.min(tileH, h - sourceY),
        i * tileW,
        tileY,
        tileW,
        tileH,
      );
    if (style === 3) {
      const lowerY = Math.floor(h * 0.67);
      for (let i = 0; i < count; i++)
        copy(
          0,
          sourceY,
          w,
          Math.min(tileH, h - sourceY),
          i * tileW,
          lowerY,
          tileW,
          tileH,
        );
    }
  }

  if (style === 0 || style === 3) {
    const barY = Math.floor(h * (0.55 + theme() * 0.15));
    const barH = Math.max(1, Math.floor(h * 0.035));
    for (let i = 0; i < bars.length; i++) {
      const left = Math.floor((i * w) / bars.length);
      fill(
        left,
        barY,
        Math.ceil(((i + 1) * w) / bars.length) - left,
        barH,
        bars[(i + burst) % bars.length],
        undefined,
        0.9,
      );
    }
  }

  // The dump overwrites whole LCD rows, with partial right edges and addresses.
  const dumpRows =
    style === 1
      ? Math.min(25, 10 + Math.floor(12 * damage))
      : style === 2
        ? 8
        : 3 + Math.floor(4 * damage);
  const fontSize = Math.max(1, Math.floor(h / 31));
  const lineH = Math.max(1, Math.floor(fontSize * 1.14));
  const dumpY =
    style === 1
      ? Math.floor(h * 0.1)
      : Math.floor(h * (style === 2 ? 0.57 : 0.71));
  if (style === 1)
    fill(
      0,
      dumpY - 2,
      w,
      Math.min(h - dumpY + 2, dumpRows * lineH + 7),
      '#01070b',
    );
  for (let i = 0; i < dumpRows; i++) {
    const y = dumpY + i * lineH + (i > 3 && frame % 2 ? 1 : 0);
    if (y >= h) break;
    const x =
      style === 1
        ? Math.floor(w * 0.035)
        : integer(theme, 0, Math.floor(w * 0.16));
    const words = Array.from({ length: 8 }, () =>
      integer(detail, 0, 0xffff).toString(16).toUpperCase().padStart(4, '0'),
    );
    const text =
      i % 4 === 3
        ? '0x' +
          (0x8000 + i * 16).toString(16).toUpperCase() +
          '  ' +
          words
            .join('')
            .split('')
            .map((digit) => parseInt(digit, 16).toString(2).padStart(4, '0'))
            .join('')
        : '0x' +
          (0x8000 + i * 16).toString(16).toUpperCase() +
          '  ' +
          words.join(' ');
    ops.push({
      kind: 'text',
      x,
      y,
      w: w - x,
      h: Math.min(lineH, h - y),
      text,
      color: i % 3 === 0 ? rival : colour,
      size: fontSize,
      background: style === 1 || i % 5 === 0 ? '#02070b' : undefined,
    });
  }

  // Read a ROM of real characters through a faulty row and character clock.
  // Each operation is at most 30 cells wide because bits is a 32-bit mask.
  const pixel = Math.max(1, Math.floor(Math.min(w / 320, h / 240) * 2));
  const glyphRows = style === 1 ? Math.min(12, 7 + Math.floor(5 * damage)) : 3;
  const glyphChunks =
    style === 1 ? Math.min(8, Math.max(1, Math.floor(w / (30 * pixel)))) : 3;
  const glyphX =
    style === 1
      ? Math.floor(w * 0.04)
      : Math.floor(w * (0.16 + theme() * 0.48));
  const glyphY =
    style === 1
      ? Math.floor(h * 0.42)
      : Math.floor(h * (0.12 + theme() * 0.42));
  const glyphColor = style === 1 ? '#9cff78' : rival;
  for (let line = 0; line < glyphRows; line++) {
    const y = glyphY + line * 9 * pixel;
    if (y >= h) break;
    for (let chunk = 0; chunk < glyphChunks; chunk++) {
      const x = glyphX + chunk * 30 * pixel;
      if (x >= w) break;
      const chars = Array.from(
        { length: 5 },
        () => '0123456789ABCDEF:-/'[integer(detail, 0, 18)],
      );
      const bits: number[] = [];
      const offset = (line + frame) % 2 ? 1 : 0;
      for (let row = 0; row < 7; row++) {
        const readRow =
          row === 3 && line % 3 === 0
            ? 2
            : row === 5 && chunk % 2 === 0
              ? 6
              : row;
        let mask = 0;
        for (let character = 0; character < 5; character++) {
          let glyphRow = fontRom[chars[character]][readRow];
          if ((character + line) % 4 === 0 && row % 3 === 1)
            glyphRow = ((glyphRow << 1) | (glyphRow >>> 4)) & 31;
          for (let bit = 0; bit < 5; bit++)
            if (glyphRow & (1 << (4 - bit)))
              mask |= 1 << (character * 6 + bit + offset);
        }
        bits.push(mask);
      }
      ops.push({
        kind: 'glyphs',
        x,
        y,
        w: Math.min(30 * pixel, w - x),
        h: Math.min(7 * pixel, h - y),
        pixel,
        color: glyphColor,
        bits,
      });
    }
  }

  // Stuck data lines include clusters of adjacent columns and a strip read
  // from one source address into several destination columns.
  const clusterX = wrap(integer(theme, 0, w - 1) + frame * 2, w);
  const clusterW = integer(theme, 6, 20);
  for (let i = 0; i < clusterW; i++)
    fill(
      clusterX + i,
      0,
      1,
      h,
      bars[(i + burst) % bars.length],
      undefined,
      0.75,
    );
  const sourceX = integer(theme, 0, w - 1);
  const stripW = Math.min(integer(theme, 1, 3), w - sourceX);
  for (let i = 0; i < 3; i++)
    copy(
      sourceX,
      0,
      stripW,
      h,
      wrap(sourceX + Math.floor((w * (i + 1)) / 4), w),
      0,
    );
  for (let i = 0; i < 3; i++)
    fill(
      0,
      wrap(integer(theme, 0, h - 1) + (i === 0 ? frame * 3 : 0), h),
      w,
      integer(theme, 1, 3),
      i % 2 ? colour : rival,
      undefined,
      0.8,
    );

  if (style === 1 || style === 3) {
    const noiseY = integer(theme, 0, h - 1);
    fill(
      0,
      noiseY,
      w,
      Math.max(1, Math.floor(h * 0.035)),
      '#03060b',
      undefined,
      0.7,
    );
    for (let i = 0; i < 18; i++)
      fill(
        integer(detail, 0, w - 1),
        noiseY + integer(detail, 0, Math.max(0, Math.floor(h * 0.035) - 1)),
        integer(detail, 1, 7),
        integer(detail, 1, 2),
        accents[integer(detail, 0, accents.length - 1)],
      );
  }

  return plan;
}

function timings(seed: number): BurstTiming[] {
  let entries = timingCache.get(seed);
  if (!entries) {
    entries = [];
    if (timingCache.size >= 8)
      timingCache.delete(timingCache.keys().next().value!);
    timingCache.set(seed, entries);
  }
  return entries;
}

function appendTiming(seed: number, entries: BurstTiming[]): void {
  const burst = entries.length;
  const rng = random(mix(seed, burst, -1));
  const start = burst ? entries[burst - 1].next : 0;
  const frames = [start];
  const count = integer(rng, 2, 5);
  let end = start;
  for (let i = 0; i < count; i++) {
    end += integer(rng, 12, 40) / 100;
    if (i < count - 1) frames.push(end);
  }
  entries.push({
    start,
    frames,
    end,
    next: end + integer(rng, 400, 1200) / 100,
  });
}

/** The burst under way or held at `time`, its timings extended as far as needed. */
function burstAt(seed: number, t: number) {
  const time = Number.isFinite(t) ? Math.max(0, t) : 0;
  const entries = timings(seed);
  while (!entries.length || entries[entries.length - 1].next <= time)
    appendTiming(seed, entries);
  let low = 0;
  let high = entries.length - 1;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (entries[middle].next <= time) low = middle + 1;
    else high = middle;
  }
  return { time, burst: low, timing: entries[low] };
}

/** Return the visible frame without constructing a drawing plan. */
export function glitchMoment(seed: number, t: number): GlitchMoment {
  const { time, burst, timing } = burstAt(seed, t);
  const frames = timing.frames;
  let frame = frames.length - 1;
  while (frame > 0 && time < frames[frame]) frame--;
  return { burst, frame, key: `${burst}:${frame}` };
}

/**
 * The burst being written at `t` seconds after the crash, or null in the
 * hold between bursts: for the host as well as the drawing, which rerolls
 * each dosing channel's random output from the same seed on each new burst
 * (the owner, 2026-10-31), so the pumps' signals change as the screen does.
 */
export function glitchBurst(seed: number, t: number): number | null {
  const { time, burst, timing } = burstAt(seed, t);
  return time < timing.end ? burst : null;
}
