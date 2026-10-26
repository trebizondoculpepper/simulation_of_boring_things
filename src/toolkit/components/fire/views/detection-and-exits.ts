import { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { PLATE_WHITE, SANS, tools } from '../../core/views/fitting-tools';

/**
 * More fire safety fittings, in metres, each facing +z from its wall
 * (z = 0) or, for ceiling fittings, hanging from y = 0:
 *
 * - a point heat detector, the smoke detector's base with a low head and
 *   its thermistor showing;
 * - an end-to-end optical beam detector's transmitter-receiver head and
 *   its reflector (after reflective beam detectors such as the Fireray
 *   5000, under a name of our own), for halls too high for point
 *   detectors;
 * - a fire exit door, single or double, shut, with push bars to BS EN 1125
 *   and its PUSH BAR TO OPEN sign;
 * - a freestanding fire point board, for fittings in the middle of a deck.
 */

export function createHeatDetector(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.cyl(group, t.paint(PLATE_WHITE, 0.4), 0.06, 0.012, 0, -0.006, 0, 'y', 28);
  t.cyl(group, t.paint('#efeee8', 0.4), 0.048, 0.024, 0, -0.024, 0, 'y', 28);
  // The guard round the exposed thermistor.
  t.cyl(group, t.paint('#e3e2dc', 0.45), 0.016, 0.014, 0, -0.043, 0, 'y', 16);
  t.cyl(group, t.paint('#1b1b1b', 0.5), 0.004, 0.012, 0, -0.046, 0, 'y', 8);
  t.led(group, '#ff3020', 0.005, 0.038, -0.024, 0.016, 'z');
  return group;
}

/** A beam detector head (transmitter and receiver in one) on its wall bracket. */
export function createBeamHead(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  const grey = t.paint('#d9d9d3', 0.45);
  t.box(group, t.paint('#9a9c98', 0.4, 0.4), 0.12, 0.2, 0.02, 0, 0, 0.01);
  t.box(group, grey, 0.19, 0.25, 0.12, 0, 0, 0.08);
  t.cyl(group, t.paint('#20262b', 0.2), 0.05, 0.02, 0, 0.02, 0.145, 'z', 24);
  t.led(group, '#35e06a', 0.004, -0.06, -0.09, 0.141, 'z');
  t.label(group, 'BEAM', 0, -0.08, 0.141, 0.018, '#2a2a28');
  return group;
}

/** A beam detector's reflector: four prism tiles on a plate, 400 mm square. */
export function createBeamReflector(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.box(group, t.paint('#2b2b2b', 0.5), 0.42, 0.42, 0.012, 0, 0, 0.006);
  const prism = t.paint('#c9a54a', 0.15, 0.6);
  for (const x of [-0.1, 0.1])
    for (const y of [-0.1, 0.1])
      t.box(group, prism, 0.19, 0.19, 0.01, x, y, 0.017);
  return group;
}

/**
 * A fire exit door, shut, in a wall: one leaf up to 1.2 m wide, two
 * above, each with its push bar at 1 m, under the door's frame. Its origin
 * is on the floor at the middle of the opening.
 */
export function createFireExitDoor(kit: PanelKit, width: number, height = 2.1) {
  const t = tools(kit);
  const group = new Group();
  const frame = t.paint('#3c4447', 0.45, 0.3);
  const leafPaint = t.paint('#6f7c80', 0.5, 0.2);
  const steel = t.paint('#c6cacb', 0.3, 0.8);
  t.box(group, frame, width + 0.12, 0.06, 0.06, 0, height + 0.03, 0.03);
  for (const side of [-1, 1])
    t.box(
      group,
      frame,
      0.06,
      height,
      0.06,
      side * (width / 2 + 0.03),
      height / 2,
      0.03,
    );
  const leaves = width > 1.2 ? 2 : 1;
  const leafWidth = width / leaves - 0.01;
  const leafHinges: Group[] = [];
  for (let i = 0; i < leaves; i++) {
    // Each leaf on its hinge at its outer edge, so it can swing
    // (`group.userData.leaves`, the hinge's turn opening it outward, -z).
    const hingeX = i === 0 ? -width / 2 : width / 2;
    const hinge = new Group();
    hinge.position.x = hingeX;
    group.add(hinge);
    leafHinges.push(hinge);
    const x = -width / 2 + (i + 0.5) * (width / leaves) - hingeX;
    t.box(
      hinge,
      leafPaint,
      leafWidth,
      height - 0.01,
      0.045,
      x,
      height / 2,
      0.0225,
    );
    // The push bar, across most of the leaf, on its two end housings.
    t.box(hinge, steel, leafWidth * 0.8, 0.04, 0.035, x, 1.0, 0.075);
    for (const end of [-1, 1])
      t.box(
        hinge,
        steel,
        0.05,
        0.08,
        0.05,
        x + end * leafWidth * 0.42,
        1.0,
        0.07,
      );
    const sign = t.printed(
      0.2,
      0.1,
      (c, w, h) => {
        c.fillStyle = '#00894a';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#ffffff';
        c.font = `bold ${h * 0.24}px ${SANS}`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText('PUSH BAR', w / 2, h * 0.34);
        c.fillText('TO OPEN', w / 2, h * 0.7);
      },
      256,
    );
    sign.mesh.position.set(x, 1.22, 0.047);
    hinge.add(sign.mesh);
  }
  group.userData.leaves = leafHinges;
  return group;
}

/**
 * A freestanding fire point board, 0.6 m wide and 1.6 m high on a weighted
 * base, its face at z = 0 facing +z, so wall fittings can be hung on it.
 */
export function createFirePointStand(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  const red = t.paint('#b5241d', 0.45);
  t.box(group, red, 0.6, 1.6, 0.03, 0, 0.85, -0.015);
  t.box(group, t.paint('#2a2a2a', 0.6), 0.7, 0.05, 0.45, 0, 0.025, 0.12);
  t.label(group, 'FIRE POINT', 0, 1.55, 0.001, 0.05, '#ffffff');
  return group;
}
