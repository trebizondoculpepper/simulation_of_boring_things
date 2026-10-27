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
