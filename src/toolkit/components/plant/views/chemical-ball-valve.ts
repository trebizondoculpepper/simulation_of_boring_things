import { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { beginPart, createPartSet } from '../../core/parts/parts';
import { onPlinth } from './plinth';
import { plantTools } from './plant-tools';
import { describe } from './describe';
import type { BallValveView } from './gas-fittings';

/** The sizes the chemical lines use: DN15 for small lines, DN40 at the bulk tanks. */
export type ChemicalValveSize = 15 | 40;

const SIZE: Record<
  ChemicalValveSize,
  { pipe: number; body: number; nut: number; length: number; handle: number }
> = {
  15: { pipe: 0.0105, body: 0.024, nut: 0.021, length: 0.1, handle: 0.06 },
  40: { pipe: 0.025, body: 0.05, nut: 0.045, length: 0.17, handle: 0.12 },
};

/**
 * A chemical isolation valve (the owner, 2026-10-27): a PVC-U true-union
 * ball valve after GF Piping Systems' type 546, the common choice for
 * hypochlorite and dilute acid (EPDM or FKM seats): a grey body, a union
 * nut either side (so it lifts out of the line), and a red quarter-turn
 * handle, along the pipe when open and across it when shut. A click turns
 * it. Along x, its middle at the origin; `dn` 15 or 40.
 */
export function createChemicalBallValve(
  kit: PanelKit,
  {
    dn = 15,
    initial = true,
    name = 'Chemical isolation valve',
    binding,
  }: {
    dn?: ChemicalValveSize;
    initial?: boolean;
    name?: string;
    binding?: { open(): boolean; set(open: boolean): void };
  } = {},
): BallValveView {
  const t = plantTools(kit);
  const a = beginPart(kit, `${name}, DN${dn}`);
  const s = SIZE[dn];
  const grey = t.paint('#6b6e70', 0.45);
  const darker = t.paint('#55585a', 0.5);
  const red = t.paint('#c8102e', 0.4);
  // The body: a ball housing, flattened at the stem, its end connectors.
  t.cyl(a.object, grey, s.body, s.length * 0.42, 0, 0, 0, 'x', 28);
  t.cyl(
    a.object,
    grey,
    s.body * 0.82,
    s.body * 1.4,
    0,
    s.body * 0.35,
    0,
    'y',
    20,
  );
  // The union nuts, hexagonal and ribbed, either side.
  for (const side of [-1, 1]) {
    const x = side * s.length * 0.33;
    t.cyl(a.object, darker, s.nut, s.length * 0.2, x, 0, 0, 'x', 6);
    t.cyl(
      a.object,
      grey,
      s.pipe * 1.25,
      s.length * 0.14,
      side * s.length * 0.5,
      0,
      0,
      'x',
      20,
    );
  }
  // The stem and the handle: a red moulded lever, its grip end widened.
  const top = s.body * 1.05;
  t.cyl(a.object, darker, s.body * 0.25, s.body * 0.3, 0, top, 0, 'y', 12);
  const lever = new Group();
  lever.userData.live = true;
  lever.position.y = top + s.body * 0.15;
  a.object.add(lever);
  const arm = t.box(
    lever,
    red,
    s.handle,
    s.body * 0.22,
    s.body * 0.5,
    s.handle * 0.38,
    0,
    0,
  );
  const grip = t.box(
    lever,
    red,
    s.handle * 0.28,
    s.body * 0.3,
    s.body * 0.7,
    s.handle * 0.78,
    0,
    0,
  );
  t.cyl(lever, red, s.body * 0.42, s.body * 0.26, 0, 0, 0, 'y', 16);
  arm.userData.live = true;
  grip.userData.live = true;
  let open = initial;
  let angle = open ? 0 : -Math.PI / 2;
  const toggle = () => {
    if (binding) binding.set(!binding.open());
    else open = !open;
  };
  a.uses.set(arm, toggle);
  a.uses.set(grip, toggle);
  a.updates.push((delta) => {
    const target = (binding?.open() ?? open) ? 0 : -Math.PI / 2;
    angle += (target - angle) * Math.min(1, delta * 8);
    lever.rotation.y = angle;
  });
  describe(a.object, `${name}, DN${dn}`, () =>
    (binding?.open() ?? open) ? 'Open' : 'Shut',
  );
  const part = a.part();
  return Object.assign(part, {
    get open() {
      return binding?.open() ?? open;
    },
  });
}

/**
 * Both sizes on a plinth, each in a short stub of its pipe, for trying
 * them: click a handle to turn it.
 */
export function createChemicalValveDemo(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const parts = createPartSet();
  const pvc = t.paint('#5a5f63', 0.55);
  const stand = new Group();
  ([15, 40] as const).forEach((dn, i) => {
    const s = SIZE[dn];
    const z = i === 0 ? 0.1 : -0.08;
    t.cyl(stand, pvc, s.pipe, 0.36, 0, s.body + 0.02, z, 'x', 20);
    const v = createChemicalBallValve(kit, { dn, initial: i === 0 });
    v.object.position.set(0, s.body + 0.02, z);
    stand.add(v.object);
    parts.add(v);
  });
  group.add(onPlinth(kit, stand, 0.45));
  return {
    object: group,
    parts,
    update: (delta: number) => parts.update(delta),
  };
}
