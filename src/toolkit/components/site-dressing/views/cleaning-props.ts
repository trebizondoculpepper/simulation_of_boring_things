import { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';

/**
 * A building's cleaning kit, left about its corridors at true size after
 * common commercial products. Each stands on the
 * floor at y = 0, facing +z; they only draw, and are merged with the room.
 */

/**
 * A yellow mop bucket with its wringer and a mop standing in it, after a
 * 20 litre janitorial mop bucket on castors (about 480 × 330 mm, 470 mm to
 * the wringer's top).
 */
export function createMopBucket(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  const yellow = t.paint('#e3b51b', 0.5);
  const grey = t.paint('#4b4f50', 0.6);
  // Four walls and a dark well give the bucket a visible open top.
  t.box(group, yellow, 0.48, 0.025, 0.33, 0, 0.13, 0);
  for (const x of [-0.23, 0.23])
    t.box(group, yellow, 0.02, 0.28, 0.33, x, 0.28, 0);
  for (const z of [-0.155, 0.155])
    t.box(group, yellow, 0.46, 0.28, 0.02, 0, 0.28, z);
  t.box(group, t.paint('#263239', 0.75), 0.43, 0.005, 0.28, 0, 0.25, 0);
  for (const z of [-0.15, 0.15])
    t.box(group, yellow, 0.48, 0.025, 0.025, 0, 0.43, z);
  for (const x of [-0.2, 0.2])
    for (const z of [-0.13, 0.13]) t.cyl(group, grey, 0.035, 0.05, x, 0.045, z);
  // The wringer on one end, and the mop's handle leaning in it.
  t.box(group, grey, 0.16, 0.18, 0.3, 0.14, 0.48, 0);
  t.box(group, t.paint('#171b1d', 0.8), 0.12, 0.09, 0.24, 0.14, 0.56, 0);
  const wringerLever = t.cyl(group, grey, 0.012, 0.32, 0.16, 0.72, -0.07);
  wringerLever.rotation.x = -0.4;
  const handle = t.cyl(
    group,
    t.paint('#3e6fb2', 0.4),
    0.012,
    1.35,
    -0.08,
    0.95,
    0,
  );
  handle.rotation.z = 0.18;
  return group;
}

/**
 * A rotary floor machine parked against a wall, after a 17 inch (430 mm)
 * single-disc scrubber: a round deck and motor housing, a long handle up
 * to grips at waist height, its cable coiled on the handle.
 */
export function createRotaryScrubber(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  const red = t.paint('#b5352b', 0.45);
  const black = t.paint('#202224', 0.6);
  t.cyl(group, black, 0.22, 0.08, 0, 0.06, 0, 'y', 28);
  t.cyl(group, red, 0.17, 0.26, 0, 0.23, 0, 'y', 24);
  const handle = new Group();
  handle.position.set(0, 0.32, -0.1);
  handle.rotation.x = -0.55;
  group.add(handle);
  t.box(handle, t.paint('#9aa0a2', 0.35, 0.7), 0.04, 1.1, 0.04, 0, 0.55, 0);
  t.box(handle, black, 0.5, 0.05, 0.05, 0, 1.1, 0);
  t.cyl(handle, t.paint('#d06a2a', 0.5), 0.08, 0.1, 0, 0.6, 0.04, 'z', 14);
  return group;
}

/**
 * A janitorial trolley with an open three-shelf chassis, supply bucket,
 * waste bag and push handle, at commercial cart dimensions.
 */
export function createBinTrolley(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  const frame = t.paint('#444d50', 0.55);
  const tray = t.paint('#697377', 0.65);
  const tyre = t.paint('#25292b', 0.9);
  const bag = t.paint('#424d45', 0.9);
  for (const y of [0.23, 0.54, 0.85]) {
    t.box(group, tray, 0.74, 0.035, 0.48, -0.15, y, 0);
    for (const z of [-0.23, 0.23])
      t.box(group, tray, 0.74, 0.065, 0.018, -0.15, y + 0.045, z);
  }
  for (const x of [-0.5, 0.2])
    for (const z of [-0.23, 0.23]) {
      t.box(group, frame, 0.035, 0.85, 0.035, x, 0.55, z);
      t.cyl(group, tyre, 0.075, 0.045, x, 0.075, z, 'x', 10);
    }
  // A soft-sided waste bag is suspended from its rectangular carrier.
  t.box(group, frame, 0.42, 0.035, 0.48, 0.48, 0.91, 0);
  t.box(group, bag, 0.39, 0.55, 0.44, 0.48, 0.61, 0);
  t.box(group, t.paint('#222a27', 0.9), 0.34, 0.01, 0.39, 0.48, 0.91, 0);
  for (const z of [-0.23, 0.23])
    t.box(group, frame, 0.035, 0.9, 0.035, 0.7, 0.55, z);
  t.box(group, frame, 0.035, 0.035, 0.5, 0.7, 1.0, 0);
  // The small pail and upright bottles make its purpose clear at a glance.
  t.box(group, t.paint('#e6b328', 0.5), 0.25, 0.2, 0.25, -0.18, 0.66, 0);
  for (const x of [-0.34, -0.11]) {
    t.cyl(group, t.paint('#e2e8de', 0.55), 0.045, 0.2, x, 0.97, 0, 'y', 10);
    t.cyl(group, frame, 0.019, 0.035, x, 1.09, 0, 'y', 10);
  }
  return group;
}

/**
 * A cleaning store's open shelving, stacked: a four-shelf galvanised unit
 * (900 × 450 mm, 1800 mm tall) with cases of paper towels, bottles of
 * cleaner, toilet rolls and boxes of bin liners.
 */
export function createCleaningShelves(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  const steel = t.paint('#9da3a3', 0.45, 0.6);
  for (const x of [-0.44, 0.44])
    for (const z of [-0.21, 0.21])
      t.box(group, steel, 0.03, 1.8, 0.03, x, 0.9, z);
  const goods = [
    t.paint('#e8e4d6', 0.7),
    t.paint('#2f7fc1', 0.4),
    t.paint('#d8443a', 0.4),
    t.paint('#c8a66b', 0.8),
    t.paint('#4bb062', 0.4),
  ];
  [0.12, 0.55, 0.98, 1.41].forEach((y, shelf) => {
    t.box(group, steel, 0.9, 0.02, 0.45, 0, y, 0);
    for (let i = 0; i < 4; i++) {
      const material = goods[(shelf * 2 + i) % goods.length];
      const w = 0.16 + ((shelf + i) % 3) * 0.04;
      const h = 0.18 + ((shelf * 3 + i) % 4) * 0.05;
      t.box(group, material, w, h, 0.3, -0.33 + i * 0.22, y + h / 2 + 0.01, 0);
    }
  });
  t.box(group, steel, 0.9, 0.02, 0.45, 0, 1.79, 0);
  return group;
}

/** A yellow two-sided A-frame wet floor sign, 620 mm tall. */
export function createWetFloorSign(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  const yellow = t.paint('#f0c419', 0.45);
  for (const side of [-1, 1]) {
    const panel = t.box(group, yellow, 0.3, 0.6, 0.012, 0, 0.3, side * 0.09);
    panel.rotation.x = -side * 0.28;
    const legend = t.label(
      panel,
      'CAUTION\nWET FLOOR',
      0,
      0.06,
      side * 0.008,
      0.028,
      '#1c1c1c',
    );
    if (side < 0) legend.rotation.y = Math.PI;
  }
  t.box(group, yellow, 0.31, 0.025, 0.025, 0, 0.61, 0);
  t.box(group, t.paint('#222222', 0.8), 0.09, 0.012, 0.015, 0, 0.57, 0);
  return group;
}
