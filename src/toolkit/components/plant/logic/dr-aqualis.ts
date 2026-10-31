import type { Mood } from '../../../../game/plant/aqualis-types';

/**
 * Dr Aqualis's animation (mission 114, `doc/prompts/114-aqualis-dosing-controller.md`,
 * "Its screen and Dr Aqualis"): an original helper character, the Aqualis
 * water drop come to life in a lab coat, head mirror and stethoscope.
 * Given his mood and the time, this works out his pose; the view
 * (`views/dr-aqualis.ts`) draws it.
 *
 * Like a desktop helper of the early 2000s, each mood is a short animation
 * that plays and then holds still, replaying every few seconds: idle bobs
 * once and blinks, concerned taps his clipboard, alarmed jumps, pleased
 * gives a thumbs up, pointing jabs at a reading. Frames are quantised to
 * `FRAME_HZ` (10 Hz) and between plays the pose does not change, so its
 * `poseKey` changes only while an animation plays and a display redraws
 * only then. A change of mood blends from the old pose over `BLEND_S`.
 * Pure: no DOM.
 */

/** The animation's frame rate: no more than ten frames a second. */
export const FRAME_HZ = 10;
/** A change of mood blends from the old pose over this long, s. */
export const BLEND_S = 0.3;

/** Each mood's cycle: it plays for `play` seconds, then holds, and starts again every `every`. */
export const CYCLES: Record<Mood, { play: number; every: number }> = {
  idle: { play: 2, every: 7 },
  concerned: { play: 1.6, every: 5 },
  alarmed: { play: 1.2, every: 4 },
  pleased: { play: 1.5, every: 6 },
  pointing: { play: 1.2, every: 5 },
};

/** Which hand does what: open, a fist, a thumb up, or a pointing finger. */
export type Hand = 'open' | 'fist' | 'thumb' | 'point';
/** The shape his mouth makes. */
export type MouthShape = 'smile' | 'grin' | 'flat' | 'frown' | 'o';
export type Side = 'left' | 'right';

/** One arm: its swing from hanging (0, radians, outward positive), how far it reaches (0–1), and its hand. */
export interface ArmPose {
  angle: number;
  reach: number;
  hand: Hand;
}

/** A direction in screen space (x right, y down), of unit length. */
export interface Aim {
  x: number;
  y: number;
}

export interface DrAqualisPose {
  mood: Mood;
  /** Up-and-down bob, a share of his height (negative is up). */
  bob: number;
  /** Height of a jump off the ground, a share of his height. */
  jump: number;
  /** Squash and stretch: above 1 wider and shorter, below 1 taller and thinner. */
  squash: number;
  /** Lean, radians (positive leans to the right of the screen). */
  lean: number;
  /** Eyes: 0 shut, 1 open, up to 1.35 wide. */
  eyeOpen: number;
  /** Happy eyes: closed upward arcs (pleased). */
  eyeSmile: boolean;
  /** Where his pupils look, each −1 to 1 (x right, y down). */
  pupil: Aim;
  /** Brow angle, −1 worried (inner ends raised) to 1 cross (inner ends lowered). */
  brow: number;
  /** How far his brows are raised, 0–1. */
  browLift: number;
  mouth: MouthShape;
  /** The mouth's curve, −1 frown to 1 smile. */
  smile: number;
  /** How open his mouth is, 0–1. */
  mouthOpen: number;
  /** His arms, as seen: the screen's left and right. */
  arms: Record<Side, ArmPose>;
  /** Which hand holds the clipboard. */
  clipboard: Side;
  /** How far the clipboard is raised to read, 0–1. */
  clipboardLift: number;
  /** The other hand's tap on the clipboard, 0 lifted to 1 touching. */
  clipTap: number;
  thumbsUp: boolean;
  /** The way he points, if he does. */
  point: Aim | null;
  /** A sparkle beside his thumb, 0 (none) to 1. */
  sparkle: number;
  /** A bead of sweat (concerned, alarmed). */
  sweat: boolean;
}

/** What the display remembers of his mood: the current one, since when, and the one before. */
export interface DrAqualisState {
  mood: Mood;
  since: number;
  /** Where he points, for the pointing mood. */
  aim: Aim;
  previous: { mood: Mood; since: number; aim: Aim } | null;
}

const DOWN_RIGHT: Aim = { x: 0.8, y: 0.6 };

/** A fresh state, in `mood` from `t`. */
export const drAqualisState = (
  mood: Mood = 'idle',
  t = 0,
  aim: Aim = DOWN_RIGHT,
): DrAqualisState => ({ mood, since: t, aim, previous: null });

/**
 * He changes mood at `t` (or only his aim, without restarting, if the
 * mood is the same). The old pose blends into the new over `BLEND_S`.
 */
export function setMood(
  state: DrAqualisState,
  mood: Mood,
  t: number,
  aim: Aim = state.aim,
): DrAqualisState {
  if (mood === state.mood) return { ...state, aim };
  return {
    mood,
    since: t,
    aim,
    previous: { mood: state.mood, since: state.since, aim: state.aim },
  };
}

/** The unit direction from `from` to `to`, for pointing at a reading on the screen. */
export function aimAt(
  from: { x: number; y: number },
  to: { x: number; y: number },
): Aim {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const d = Math.hypot(dx, dy);
  return d < 1e-9 ? DOWN_RIGHT : { x: dx / d, y: dy / d };
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const smooth = (k: number) => {
  const c = clamp01(k);
  return c * c * (3 - 2 * c);
};
/** A bump: 0 at `a`, 1 at the middle, 0 at `b`. */
const bump = (u: number, a: number, b: number) =>
  u <= a || u >= b ? 0 : Math.sin((Math.PI * (u - a)) / (b - a));

/** A small, steady hash, so the odd blink falls at a different moment each cycle. */
const hash01 = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Time quantised to the frame rate. */
export const frameTime = (t: number) => Math.floor(t * FRAME_HZ) / FRAME_HZ;

/** Where `elapsed` falls in its mood's cycle: the cycle's number and the time into it, or null while holding. */
function phase(mood: Mood, elapsed: number) {
  const { play, every } = CYCLES[mood];
  const e = Math.max(0, elapsed);
  const cycle = Math.floor(e / every);
  const u = e - cycle * every;
  return { cycle, u, playing: u < play };
}

/** An arm hanging at rest. */
const REST: ArmPose = { angle: 0.25, reach: 0.9, hand: 'open' };
/** The clipboard arm, holding it before him. */
const HOLD: ArmPose = { angle: -0.35, reach: 0.75, hand: 'fist' };

function base(mood: Mood): DrAqualisPose {
  return {
    mood,
    bob: 0,
    jump: 0,
    squash: 1,
    lean: 0,
    eyeOpen: 1,
    eyeSmile: false,
    pupil: { x: 0, y: 0.1 },
    brow: 0,
    browLift: 0.2,
    mouth: 'smile',
    smile: 0.6,
    mouthOpen: 0,
    arms: { left: HOLD, right: REST },
    clipboard: 'left',
    clipboardLift: 0,
    clipTap: 0,
    thumbsUp: false,
    point: null,
    sparkle: 0,
    sweat: false,
  };
}

/** The angle (outward from hanging) for an arm on `side` to point along `aim`. */
const armAngleFor = (side: Side, aim: Aim) =>
  Math.atan2(side === 'right' ? aim.x : -aim.x, aim.y);

/** His pose in `mood`, `elapsed` seconds into it (already quantised). */
function moodPose(mood: Mood, elapsed: number, aim: Aim): DrAqualisPose {
  const p = base(mood);
  const { cycle, u, playing } = phase(mood, elapsed);
  switch (mood) {
    case 'idle': {
      if (playing) {
        const w = Math.sin((2 * Math.PI * u) / CYCLES.idle.play);
        p.bob = -0.025 * w;
        p.squash = 1 + 0.03 * w;
        const blinkAt = 0.4 + hash01(cycle) * 1.2;
        if (u >= blinkAt && u < blinkAt + 0.2) p.eyeOpen = 0.05;
        p.pupil = { x: 0.25 * Math.sin(Math.PI * clamp01(u / 1.6)), y: 0.1 };
      }
      return p;
    }
    case 'concerned': {
      p.brow = -0.85;
      p.browLift = 0.35;
      p.mouth = 'frown';
      p.smile = -0.6;
      p.sweat = true;
      p.clipboardLift = 1;
      p.arms = {
        left: { angle: -0.7, reach: 0.7, hand: 'fist' },
        right: { angle: -1.2, reach: 0.95, hand: 'point' },
      };
      p.pupil = { x: -0.45, y: 0.55 };
      if (playing) {
        // Four taps, two frames each, eyes on the clipboard.
        const tap = Math.floor(u * FRAME_HZ) % 4;
        p.clipTap = tap === 0 || tap === 1 ? 1 : tap === 2 ? 0.4 : 0;
        p.squash = tap < 2 ? 1.02 : 1;
        p.pupil = { x: -0.55, y: 0.75 };
      }
      return p;
    }
    case 'alarmed': {
      p.eyeOpen = 1.35;
      p.brow = -0.35;
      p.browLift = 1;
      p.mouth = 'o';
      p.smile = 0;
      p.mouthOpen = 0.8;
      p.sweat = true;
      p.pupil = { x: 0, y: 0 };
      p.arms = {
        left: { angle: 2.2, reach: 0.95, hand: 'fist' },
        right: { angle: 2.3, reach: 0.95, hand: 'open' },
      };
      p.clipboardLift = 0;
      if (playing) {
        if (u < 0.2) {
          p.squash = 1.18; // crouch
          p.arms = {
            left: { angle: 0.9, reach: 0.9, hand: 'fist' },
            right: { angle: 1, reach: 0.9, hand: 'open' },
          };
        } else if (u < 0.8) {
          const k = (u - 0.2) / 0.6;
          p.jump = 0.2 * Math.sin(Math.PI * k);
          p.squash = 0.86 + 0.1 * Math.abs(k - 0.5) * 2;
          p.eyeOpen = 1.35;
        } else if (u < 1) p.squash = 1.14; // land
      }
      return p;
    }
    case 'pleased': {
      p.eyeSmile = true;
      p.mouth = 'grin';
      p.smile = 1;
      p.mouthOpen = 0.55;
      p.browLift = 0.6;
      p.thumbsUp = true;
      p.arms = {
        left: HOLD,
        right: { angle: 2.0, reach: 0.8, hand: 'thumb' },
      };
      p.sparkle = 0;
      if (playing) {
        const raise = smooth(u / 0.4);
        p.arms = {
          left: HOLD,
          right: {
            angle: lerp(0.4, 2.0, raise),
            reach: 0.8,
            hand: raise < 0.5 ? 'fist' : 'thumb',
          },
        };
        p.thumbsUp = raise >= 0.5;
        p.jump = 0.06 * bump(u, 0.3, 0.8);
        p.squash = u > 0.8 && u < 1 ? 1.08 : 1 - 0.05 * bump(u, 0.3, 0.8);
        p.sparkle = bump(u, 0.5, 1.4);
      }
      return p;
    }
    case 'pointing': {
      const side: Side = aim.x < 0 ? 'left' : 'right';
      const other: Side = side === 'left' ? 'right' : 'left';
      p.clipboard = other;
      p.point = aim;
      p.pupil = { x: aim.x, y: aim.y };
      p.lean = 0.08 * aim.x;
      p.brow = 0.15;
      p.browLift = 0.45;
      p.mouth = 'smile';
      p.smile = 0.35;
      p.mouthOpen = 0.25;
      const pointArm = (reach: number): ArmPose => ({
        angle: armAngleFor(side, aim),
        reach,
        hand: 'point',
      });
      p.arms = {
        [side]: pointArm(1),
        [other]: HOLD,
      } as Record<Side, ArmPose>;
      if (playing) {
        const out = smooth(u / 0.3);
        const jab = 0.12 * (bump(u, 0.4, 0.7) + bump(u, 0.75, 1.05));
        p.arms = {
          [side]: pointArm(lerp(0.55, 1, out) - jab),
          [other]: HOLD,
        } as Record<Side, ArmPose>;
        p.lean = 0.08 * aim.x * out;
        p.mouthOpen = u > 0.3 ? 0.45 : 0.1;
      }
      return p;
    }
  }
}

const blendArm = (a: ArmPose, b: ArmPose, k: number): ArmPose => ({
  angle: lerp(a.angle, b.angle, k),
  reach: lerp(a.reach, b.reach, k),
  hand: k < 0.5 ? a.hand : b.hand,
});

/** `a` blended towards `b` by `k` (0–1): numbers in between, the rest from whichever is nearer. */
export function blendPose(
  a: DrAqualisPose,
  b: DrAqualisPose,
  k: number,
): DrAqualisPose {
  const pick = k < 0.5 ? a : b;
  const num = (f: (p: DrAqualisPose) => number) => lerp(f(a), f(b), k);
  return {
    ...pick,
    bob: num((p) => p.bob),
    jump: num((p) => p.jump),
    squash: num((p) => p.squash),
    lean: num((p) => p.lean),
    eyeOpen: num((p) => p.eyeOpen),
    pupil: {
      x: num((p) => p.pupil.x),
      y: num((p) => p.pupil.y),
    },
    brow: num((p) => p.brow),
    browLift: num((p) => p.browLift),
    smile: num((p) => p.smile),
    mouthOpen: num((p) => p.mouthOpen),
    arms: {
      left: blendArm(a.arms.left, b.arms.left, k),
      right: blendArm(a.arms.right, b.arms.right, k),
    },
    clipboardLift: num((p) => p.clipboardLift),
    clipTap: num((p) => p.clipTap),
    sparkle: num((p) => p.sparkle),
  };
}

/** His pose at time `t` from a remembered state, quantised to `FRAME_HZ`, blended from his last mood just after a change. */
export function poseAt(state: DrAqualisState, t: number): DrAqualisPose {
  const elapsed = frameTime(Math.max(0, t - state.since));
  const pose = moodPose(state.mood, elapsed, state.aim);
  const prev = state.previous;
  if (!prev || elapsed >= BLEND_S) return pose;
  const old = moodPose(
    prev.mood,
    frameTime(Math.max(0, state.since - prev.since)),
    prev.aim,
  );
  return blendPose(old, pose, smooth(elapsed / BLEND_S));
}

/** Whether an animation is playing at `t` (frames change), as against holding still. */
export function isPlaying(state: DrAqualisState, t: number) {
  const elapsed = Math.max(0, t - state.since);
  if (state.previous && elapsed < BLEND_S) return true;
  return phase(state.mood, elapsed).playing;
}

const r2 = (v: number) => Math.round(v * 100) / 100;
const armKey = (a: ArmPose) => `${r2(a.angle)},${r2(a.reach)},${a.hand}`;

/** A key that changes only when what is drawn changes: a display redraws only when it does. */
export function poseKey(p: DrAqualisPose): string {
  return [
    p.mood,
    r2(p.bob),
    r2(p.jump),
    r2(p.squash),
    r2(p.lean),
    r2(p.eyeOpen),
    p.eyeSmile ? 1 : 0,
    r2(p.pupil.x),
    r2(p.pupil.y),
    r2(p.brow),
    r2(p.browLift),
    p.mouth,
    r2(p.smile),
    r2(p.mouthOpen),
    armKey(p.arms.left),
    armKey(p.arms.right),
    p.clipboard,
    r2(p.clipboardLift),
    r2(p.clipTap),
    p.thumbsUp ? 1 : 0,
    p.point ? `${r2(p.point.x)},${r2(p.point.y)}` : '-',
    r2(p.sparkle),
    p.sweat ? 1 : 0,
  ].join('|');
}

/** A box on the screen he is drawn in (pixels). */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** How he fits a box: standing on its bottom edge, centred, leaving headroom for a jump and raised arms. */
export function figureIn(box: Box) {
  const size = Math.min(box.h * 0.8, box.w / 0.95);
  return { cx: box.x + box.w / 2, ground: box.y + box.h, size };
}

/** Where a shoulder is when he is drawn in `box` (to aim from), screen pixels. */
export function shoulderIn(box: Box, side: Side) {
  const { cx, ground, size } = figureIn(box);
  return {
    x: cx + (side === 'right' ? 1 : -1) * 0.26 * size,
    y: ground - 0.345 * size,
  };
}

/** One frame of him: the pose, its key, and the state to pass back next time. */
export interface DrAqualisFrame {
  pose: DrAqualisPose;
  key: string;
  state: DrAqualisState;
}

export interface PoseOptions {
  /** The way to point (pointing mood). */
  aim?: Aim;
  /** Or a point on the screen to point at, with the box he is drawn in. */
  target?: { x: number; y: number };
  box?: Box;
}

/**
 * The display's entry: his pose in `mood` at time `t` (s). Pass back the
 * last frame as `prev` so that a change of mood restarts its animation and
 * blends from the old pose; `key` changes only when the drawing would.
 */
export function drAqualisPose(
  mood: Mood,
  t: number,
  prev?: DrAqualisFrame | DrAqualisState | null,
  opts: PoseOptions = {},
): DrAqualisFrame {
  const before = prev ? ('state' in prev ? prev.state : prev) : null;
  let aim = opts.aim ?? before?.aim ?? DOWN_RIGHT;
  if (opts.target && opts.box) {
    const side: Side = opts.target.x < figureIn(opts.box).cx ? 'left' : 'right';
    aim = aimAt(shoulderIn(opts.box, side), opts.target);
  }
  const state = before
    ? setMood(before, mood, t, aim)
    : drAqualisState(mood, t, aim);
  const pose = poseAt(state, t);
  return { pose, key: poseKey(pose), state };
}
