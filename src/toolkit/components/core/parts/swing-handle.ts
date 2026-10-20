import { signal } from '@preact/signals-core';
import type { ReadonlySignal } from '@preact/signals-core';
import { Group } from 'three';
import type { PanelKit } from '../views/eighties-controls';
import { tools } from '../views/fitting-tools';
import { partAudio, recording } from '../audio/part-audio';
import { beginPart } from './parts';
import type { Part } from './parts';

/**
 * The swing handle of a free-standing control cubicle's door, which drives
 * its three-point latch: rods up and down the door's edge to the top and
 * bottom, and a cam at the middle. Larger than the quarter-turn wing latch
 * of a wall box (the Encabulator's `doorLatch`). After the common swing
 * handle of the period (EMKA 1000 and Southco's of the same kind): a
 * black zinc housing about 230 × 48 mm let into the door, with a lock
 * cylinder at its foot, and a lever that springs out from the housing at
 * its foot, pivoting at its head, then turns a quarter left to draw the
 * rods back.
 *
 * A click works it a step: out of its housing, a quarter turn (unlatched:
 * the door is free), back, and home into its housing. In metres, facing
 * +z, its mounting face at z = 0, its head up.
 */

const LATCH = recording(
  new URL('../audio/assets/switch-click.wav', import.meta.url),
  0.08,
);
const HOME = recording(
  new URL('../audio/assets/key-thock.wav', import.meta.url),
  0.05,
);

/** The handle's poses, in the order a click steps them. */
const POSES = ['home', 'out', 'turned', 'out'] as const;

export const SWING_HANDLE = { housing: 0.23, width: 0.048 } as const;

export function swingHandle(
  kit: PanelKit,
  { name = 'Cubicle door handle' }: { name?: string } = {},
): Part & { readonly unlatched: ReadonlySignal<boolean> } {
  const t = tools(kit);
  const a = beginPart(kit, name);
  // The housing in satin zinc, the lever black: as the handles are sold.
  const housing = t.paint('#6d7073', 0.35, 0.7);
  const zinc = t.paint('#1c1d1f', 0.38, 0.55);
  const chrome = t.paint('#c9ccce', 0.2, 0.9);
  const H = SWING_HANDLE.housing,
    W = SWING_HANDLE.width;
  // The housing: a flange round a recess the lever lies in.
  t.box(a.object, housing, W, H, 0.004, 0, 0, 0.002);
  t.box(
    a.object,
    t.paint('#2e3033', 0.6),
    W - 0.012,
    H - 0.05,
    0.001,
    0,
    0.012,
    0.0042,
  );
  // The lock cylinder at its foot, with its key slot.
  t.cyl(a.object, chrome, 0.009, 0.006, 0, -H / 2 + 0.018, 0.007, 'z', 20);
  t.box(
    a.object,
    t.paint('#111', 0.5),
    0.0015,
    0.008,
    0.001,
    0,
    -H / 2 + 0.018,
    0.0102,
  );
  // The lever, hung from its pivot at the housing's head. The outer group
  // turns about the door's normal; the inner swings the foot out.
  const turn = new Group();
  turn.position.set(0, H / 2 - 0.022, 0.006);
  a.object.add(turn);
  const swing = new Group();
  turn.add(swing);
  const L = H - 0.06;
  t.box(swing, zinc, 0.026, L, 0.012, 0, -L / 2 + 0.006, 0.004);
  // A grip moulded into its foot, and the pivot boss.
  t.box(
    swing,
    t.paint('#28292b', 0.5),
    0.028,
    0.05,
    0.016,
    0,
    -L + 0.03,
    0.006,
  );
  t.cyl(swing, chrome, 0.009, 0.014, 0, 0, 0.004, 'z', 16);
  turn.traverse((o) => (o.userData.live = true));
  let step = 0;
  const unlatched = signal(false);
  let swingNow = 0,
    turnNow = 0;
  a.uses.set(a.object, () => {
    step = (step + 1) % POSES.length;
    const pose = POSES[step];
    unlatched.value = pose === 'turned';
    partAudio.play(pose === 'home' ? HOME : LATCH, a.object);
  });
  a.updates.push((delta) => {
    const pose = POSES[step];
    const swingTo = pose === 'home' ? 0 : -1.05;
    const turnTo = pose === 'turned' ? Math.PI / 2 : 0;
    const k = Math.min(1, delta * 9);
    swingNow += (swingTo - swingNow) * k;
    turnNow += (turnTo - turnNow) * k;
    swing.rotation.x = swingNow;
    turn.rotation.z = turnNow;
  });
  return Object.assign(a.part(), { unlatched });
}
