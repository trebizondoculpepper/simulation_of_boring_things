import { CylinderGeometry, Group, Mesh } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { beginPart } from '../../core/parts/parts';
import type { Part } from '../../core/parts/parts';
import { plantTools } from './plant-tools';
import { createChemicalBallValve } from './chemical-ball-valve';
import { createCheckValve } from './dosing-valves';
import type { BallValveView } from './gas-fittings';
import type { CheckValve } from './dosing-valves';
import { describe } from './describe';

/** Where each piece sits out from the main's surface, metres. */
export const QUILL_LAYOUT = {
  boss: 0.03,
  quill: 0.07,
  check: 0.102,
  ball: 0.19,
  end: 0.24,
} as const;

export interface InjectionQuillSet {
  group: Group;
  quill: Part;
  check: CheckValve;
  valve: BallValveView;
}

/**
 * A dosing line's injection point (prompt 089, item 4), after a PVDF
 * injection quill in a PP clamp saddle (as GF's and ProMinent's): the
 * saddle bolted round the main, the quill screwed into its boss, its dip
 * tube reaching into the flow; on its outer end a DN15 PVC-U ball check
 * valve (non-return, its arrow toward the main) and a DN15 true-union ball
 * valve to isolate it, worked by its red handle. The main stands upright
 * through the origin, `mainRadius` its radius; the set runs out along +x.
 */
export function createInjectionQuillSet(
  kit: PanelKit,
  {
    mainRadius,
    name,
    valve,
  }: {
    mainRadius: number;
    name: string;
    valve?: { open(): boolean; set(open: boolean): void };
  },
): InjectionQuillSet {
  const t = plantTools(kit);
  const group = new Group();
  group.name = `${name} set`;
  const R = mainRadius;
  const L = QUILL_LAYOUT;
  // The quill: its saddle round the main, its boss, its hexagon body.
  const q = beginPart(kit, name);
  const pp = t.paint('#2f3336', 0.6);
  const pvdf = t.paint('#e8e6dc', 0.4);
  const collar = new Mesh(
    new CylinderGeometry(R + 0.006, R + 0.006, 0.07, 28, 1, true),
    pp,
  );
  q.object.add(collar);
  for (const side of [-1, 1])
    t.box(q.object, pp, 0.025, 0.07, 0.014, -R * 0.2, 0, side * (R + 0.012));
  t.cyl(q.object, pp, 0.02, L.boss, R + L.boss / 2, 0, 0, 'x', 20);
  t.cyl(
    q.object,
    pvdf,
    0.013,
    L.quill - L.boss,
    R + (L.boss + L.quill) / 2,
    0,
    0,
    'x',
    6,
  );
  describe(q.object, name, () =>
    (valve?.open() ?? true) ? 'Injecting, its valve open' : 'Its valve shut',
  );
  group.add(q.object);
  const quill = q.part();
  // Its non-return valve, flow toward the main.
  const check = createCheckValve(kit, {
    dn: 15,
    name: `${name} non-return valve`,
  });
  check.object.position.x = R + L.check;
  check.object.rotation.y = Math.PI;
  group.add(check.object);
  // A short tube between the check valve and the ball valve.
  t.cyl(
    group,
    t.paint('#6b6e70', 0.5),
    0.0105,
    0.012,
    R + 0.137,
    0,
    0,
    'x',
    12,
  );
  // Its isolating ball valve, its handle up.
  const ball = createChemicalBallValve(kit, {
    dn: 15,
    name: `${name} isolating valve`,
    ...(valve ? { binding: valve } : {}),
  });
  ball.object.position.x = R + L.ball;
  group.add(ball.object);
  return { group, quill, check, valve: ball };
}

/**
 * A dosing line's injection point where there is no room for its valves
 * (the owner, 2026-10-28: the tiny tube met the large pipe with no sign of
 * a seal): the quill alone in its PP clamp saddle, the saddle's two halves
 * bolted round the main, its boss, the PVDF quill screwed into it, and the
 * compression nut on its outer end gripping the dosing tube. The main runs
 * along x through the origin, `mainRadius` its radius; the quill stands up
 * from its top, +y, `QUILL_LAYOUT.quill` high.
 */
export function createInjectionSaddle(kit: PanelKit, mainRadius: number) {
  const t = plantTools(kit);
  const group = new Group();
  group.name = 'Injection quill';
  const R = mainRadius;
  const L = QUILL_LAYOUT;
  const pp = t.paint('#2f3336', 0.6);
  const pvdf = t.paint('#e8e6dc', 0.4);
  const steel = t.paint('#9da1a4', 0.35, 0.7);
  // The saddle's halves, a band round the main, and their bolted lugs.
  const band = new Mesh(
    new CylinderGeometry(R + 0.008, R + 0.008, 0.08, 32, 1, true),
    pp,
  );
  band.rotation.z = Math.PI / 2;
  group.add(band);
  for (const side of [-1, 1]) {
    t.box(group, pp, 0.08, 0.03, 0.024, 0, 0, side * (R + 0.02));
    for (const bx of [-0.025, 0.025])
      t.cyl(group, steel, 0.005, 0.05, bx, 0, side * (R + 0.02), 'y', 8);
  }
  // Its boss on top, the quill's hexagon body, and the tube's nut.
  t.cyl(group, pp, 0.022, L.boss, 0, R + L.boss / 2, 0, 'y', 20);
  t.cyl(
    group,
    pvdf,
    0.014,
    L.quill - L.boss - 0.012,
    0,
    R + (L.boss + L.quill - 0.012) / 2,
    0,
    'y',
    6,
  );
  t.cyl(group, pvdf, 0.011, 0.012, 0, R + L.quill - 0.006, 0, 'y', 6);
  return group;
}
