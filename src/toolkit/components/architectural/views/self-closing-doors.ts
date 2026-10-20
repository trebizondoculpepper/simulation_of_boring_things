import { Group } from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { kitPaint } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { SPRING_LEAF, SPRING_OPENING } from './spring-door';

/** How a freestanding door shuts itself. */
export type SelfClosing = 'closer' | 'rising-butt';

/** The steel feet the frame stands on, metres high. */
export const STAND_HEIGHT = 0.04;

/**
 * A single-action door in a freestanding steel frame on two feet, to show
 * how a door closes itself (`door-closers.ts`): the corridor's beech leaf
 * (`spring-door.ts`) with a lever handle each side, hung on its left on
 * three butt hinges with an overhead door closer (after the Dorma TS 83:
 * a 280 × 60 × 50 mm body on the top rail, its two-link arm to a shoe on
 * the frame head, the arm folding and opening as the door swings), or on
 * three steel rising butts (helical knuckle hinges), the leaf lifting as
 * it opens. It swings towards +z, its hinge side, where the closer is; its
 * opening's middle on the floor at the origin. Placeholders at true size.
 * `set(angle, lift)`: the door open by `angle` radians, raised `lift` m.
 */
export function createSelfClosingDoorView(kit: PanelKit, kind: SelfClosing) {
  const t = tools(kit);
  const group = new Group();
  const steel = t.paint('#5d6467', 0.45, 0.3);
  const dark = t.paint('#2a2e30', 0.5, 0.4);
  const bright = t.paint('#c4c8c8', 0.25, 0.85);
  const silver = t.paint('#aeb3b5', 0.35, 0.7);
  const B = STAND_HEIGHT;
  const { width, height } = SPRING_OPENING;
  const leafW = SPRING_LEAF.width;
  const leafT = SPRING_LEAF.thickness;

  // The stand: a foot under each jamb and a threshold strip between.
  for (const x of [-width / 2 - 0.03, width / 2 + 0.03])
    t.box(group, dark, 0.1, B, 0.7, x, B / 2, 0);
  t.box(group, dark, width, 0.01, 0.1, 0, 0.005, 0);
  // The frame: jambs and head, with a stop behind the leaf (it swings
  // towards +z, away from the stop).
  for (const x of [-width / 2 - 0.03, width / 2 + 0.03])
    t.box(
      group,
      steel,
      0.06,
      height + 0.06,
      0.1,
      x,
      B + (height + 0.06) / 2,
      0,
    );
  t.box(group, steel, width + 0.12, 0.06, 0.1, 0, B + height + 0.03, 0);
  for (const x of [-width / 2 + 0.008, width / 2 - 0.008])
    t.box(
      group,
      steel,
      0.016,
      height,
      0.014,
      x,
      B + height / 2,
      -leafT / 2 - 0.007,
    );
  t.box(
    group,
    steel,
    width,
    0.016,
    0.014,
    0,
    B + height - 0.008,
    -leafT / 2 - 0.007,
  );

  // The leaf, turning about its hinge edge on the +z face.
  const pivot = new Group();
  pivot.position.set(-leafW / 2, B + 0.01, leafT / 2);
  pivot.userData.live = true;
  group.add(pivot);
  const timber = kitPaint(kit, '#c9a978', 0.55);
  const slab = t.box(
    pivot,
    timber,
    leafW,
    SPRING_LEAF.height,
    leafT,
    leafW / 2,
    SPRING_LEAF.height / 2,
    -leafT / 2,
  );
  for (const face of [-1, 1]) {
    const z = -leafT / 2 + (face * (leafT + 0.003)) / 2;
    t.box(pivot, bright, leafW - 0.04, 0.15, 0.003, leafW / 2, 0.09, z);
    // A lever handle on a rose each side, by the closing edge.
    t.cyl(
      pivot,
      bright,
      0.026,
      0.008,
      leafW - 0.07,
      1.0,
      z + face * 0.004,
      'z',
    );
    t.box(
      pivot,
      bright,
      0.13,
      0.018,
      0.018,
      leafW - 0.125,
      1.0,
      z + face * 0.05,
    );
    t.box(
      pivot,
      bright,
      0.016,
      0.016,
      0.05,
      leafW - 0.07,
      1.0,
      z + face * 0.025,
    );
  }

  // The hinges: three, at 150 mm from the top and bottom and between.
  const hinges = [0.25, 1.05, 1.85];
  /** What rises with a rising butt's leaf, as it lifts. */
  const lifting: Object3D[] = [];
  if (kind === 'closer') {
    for (const y of hinges)
      t.cyl(group, silver, 0.008, 0.1, -leafW / 2, B + y, leafT / 2 + 0.004);
  } else {
    // A rising butt: the frame's knuckle below, the leaf's above, meeting
    // on a helix (a dark line round the join), the leaf's riding up it.
    for (const y of hinges) {
      t.cyl(
        group,
        silver,
        0.011,
        0.05,
        -leafW / 2,
        B + y - 0.025,
        leafT / 2 + 0.006,
      );
      t.box(
        group,
        silver,
        0.05,
        0.1,
        0.003,
        -leafW / 2 - 0.03,
        B + y,
        leafT / 2 + 0.002,
      );
      const top = new Group();
      top.position.set(-leafW / 2, B + y, leafT / 2 + 0.006);
      group.add(top);
      t.cyl(top, silver, 0.011, 0.05, 0, 0.025, 0);
      const helix = t.cyl(top, dark, 0.0115, 0.004, 0, 0.001, 0);
      helix.rotation.x = 0.35;
      lifting.push(top);
    }
  }

  // The overhead closer: its body on the leaf's top rail, hinge side; its
  // pinion's spindle up through the body's top near the hinge end; the
  // main arm from the spindle and the forearm to a shoe on the head.
  const ARM = { main: 0.25, fore: 0.24 };
  /** The spindle, from the pivot in the leaf's own frame (x along it, z out). */
  const SPINDLE = { x: 0.1, z: 0.028 };
  /** The shoe on the head's face, from the pivot (x along, z out). */
  const SHOE = { x: 0.45, z: 0.03 };
  const armY = SPRING_LEAF.height + 0.004;
  let mainArm: Object3D | null = null;
  let foreArm: Object3D | null = null;
  if (kind === 'closer') {
    const silverBody = t.paint('#b9bcbd', 0.4, 0.55);
    t.box(
      pivot,
      silverBody,
      0.28,
      0.06,
      0.05,
      0.24,
      SPRING_LEAF.height - 0.04,
      0.025,
    );
    t.cyl(
      pivot,
      dark,
      0.012,
      0.012,
      SPINDLE.x,
      SPRING_LEAF.height - 0.004,
      SPINDLE.z,
    );
    // The shoe, fixed to the head's face.
    t.box(
      group,
      silverBody,
      0.06,
      0.035,
      0.022,
      -leafW / 2 + SHOE.x,
      B + 0.01 + armY,
      leafT / 2 + SHOE.z - 0.006,
    );
    const arm = (length: number) => {
      const holder = new Group();
      group.add(holder);
      t.box(holder, dark, length, 0.012, 0.022, length / 2, 0, 0);
      return holder;
    };
    mainArm = arm(ARM.main);
    foreArm = arm(ARM.fore);
    // The elbow's pin.
    t.cyl(foreArm, silver, 0.008, 0.02, 0, 0, 0);
  }

  /** The arms folded to where the door is: an elbow between two circles. */
  const fold = (angle: number) => {
    if (!mainArm || !foreArm) return;
    const px = -leafW / 2;
    const pz = leafT / 2;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    // The leaf turns by −angle about y: (x, z) → (x c − z s, x s + z c).
    const sx = px + SPINDLE.x * c - SPINDLE.z * s;
    const sz = pz + SPINDLE.x * s + SPINDLE.z * c;
    const fx = px + SHOE.x;
    const fz = pz + SHOE.z;
    const dx = fx - sx;
    const dz = fz - sz;
    const d = Math.min(Math.hypot(dx, dz), ARM.main + ARM.fore - 1e-4);
    const a = (ARM.main ** 2 - ARM.fore ** 2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, ARM.main ** 2 - a * a));
    const ux = dx / Math.hypot(dx, dz);
    const uz = dz / Math.hypot(dx, dz);
    // The elbow stands out from the frame, on the +z side.
    let ex = sx + a * ux - h * uz;
    let ez = sz + a * uz + h * ux;
    if (ez < sz + a * uz - h * ux) {
      ex = sx + a * ux + h * uz;
      ez = sz + a * uz - h * ux;
    }
    const y = B + 0.01 + armY;
    mainArm.position.set(sx, y, sz);
    mainArm.rotation.y = -Math.atan2(ez - sz, ex - sx);
    foreArm.position.set(ex, y, ez);
    foreArm.rotation.y = -Math.atan2(fz - ez, fx - ex);
  };
  fold(0);

  return {
    group,
    /** What a use pushes. */
    leaf: slab,
    set(angle: number, lift = 0) {
      pivot.rotation.y = -angle;
      pivot.position.y = B + 0.01 + lift;
      for (const top of lifting) top.userData.base ??= top.position.y;
      for (const top of lifting)
        top.position.y = (top.userData.base as number) + lift;
      fold(angle);
    },
  };
}
