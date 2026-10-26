import { createActuatedButterflyValve } from './actuated-butterfly-valve';
import { signal } from '@preact/signals-core';
import { Group } from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createBrandBadge } from '../../core/views/brand-badge';
import { brandLivery } from '../../core/views/brand-livery';
import { createPartSet, pilotLight, pushButton } from '../../core/parts/parts';
import type { Part } from '../../core/parts/parts';
import { createCharacterLcd } from '../../industrial-control/views/panel-instruments';
import { createDialGauge } from '../../industrial-control/views/dial-gauge';
import { FINISH, plantTools } from './plant-tools';
import type { Point } from './plant-tools';
import {
  BOOSTER,
  boosterDisplay,
  boosterLamps,
  boosterPressure,
} from '../logic/booster-set';
import type { BoosterReading } from '../logic/booster-set';
import type { LiveExhibit } from '../../../gallery/rooms/plant/exhibit';

/** Where the set reads the wet hall from, and what its RESET does. */
export interface BoosterFeed {
  read(): BoosterReading;
  reset(): void;
}

/** With no wet hall to read (a development room): in service, delivering. */
function standAlone(): BoosterFeed {
  let tripped = false;
  return {
    read: () => ({
      powered: true,
      tripped,
      running: !tripped,
      flow: tripped ? 0 : 6.2,
      breakTank: 0.86,
    }),
    reset: () => {
      tripped = false;
    },
  };
}

/**
 * The make-up booster set (`logic/booster-set.ts`), after the Grundfos
 * Hydro Multi-E 2 CRE: two vertical multistage pumps, duty and standby,
 * on a galvanised base, the suction manifold low across the front and
 * the discharge manifold low across the back, each pump isolated either
 * side and checked on its discharge; a diaphragm vessel on the discharge
 * manifold; and the control unit on its stand at the east end, with its
 * display, POWER, PUMP 1 and 2 RUN and LOW WATER lamps, RESET, and the
 * discharge pressure gauge. Grundflow's. Origin on the floor at the
 * middle of its footprint, its front +z.
 */
export function createBoosterSet(
  kit: PanelKit,
  feed: BoosterFeed = standAlone(),
): LiveExhibit {
  const t = plantTools(kit);
  const object = new Group();
  object.name = 'Make-up booster set';
  const livery = brandLivery(kit, 'grundflow');
  const blue = livery.paint.casing;
  const steel = t.paint(FINISH.stainless, 0.3, 0.8);
  const galv = t.paint(FINISH.galvanised, 0.45, 0.6);
  const black = t.paint('#1d1f21', 0.6);
  const B = BOOSTER;
  const y = B.manifoldY;
  // The base: two galvanised channels the set's length, cross members.
  for (const z of [-B.d / 2 + 0.12, B.d / 2 - 0.12])
    t.box(object, galv, B.w - 0.1, 0.1, 0.08, 0, 0.05, z);
  for (const x of [-B.w / 2 + 0.1, 0, B.w / 2 - 0.1])
    t.box(object, galv, 0.08, 0.06, B.d - 0.2, x, 0.07, 0);
  // The manifolds: stainless, flanged at their open ends.
  t.pipe(
    object,
    80,
    [
      [-B.w / 2, y, B.suctionZ],
      [B.pumpX[1] + 0.12, y, B.suctionZ],
    ],
    FINISH.stainless,
  );
  t.flanges(
    object,
    80,
    [-B.w / 2 + 0.03, y, B.suctionZ],
    'x',
    FINISH.stainless,
  );
  t.cyl(object, steel, 0.05, 0.02, B.pumpX[1] + 0.13, y, B.suctionZ, 'x', 20);
  t.pipe(
    object,
    65,
    [
      [-B.w / 2 + 0.25, y, B.dischargeZ],
      [B.w / 2, y, B.dischargeZ],
    ],
    FINISH.stainless,
  );
  t.flanges(
    object,
    65,
    [B.w / 2 - 0.03, y, B.dischargeZ],
    'x',
    FINISH.stainless,
  );
  // The diaphragm vessel, on the discharge manifold's closed west end.
  const vx = -B.w / 2 + 0.25;
  t.rod(
    object,
    steel,
    [vx, y, B.dischargeZ],
    [vx, y + 0.18, B.dischargeZ],
    0.02,
  );
  t.cyl(
    object,
    t.paint('#c42b23', 0.45),
    0.14,
    0.42,
    vx,
    y + 0.42,
    B.dischargeZ,
    'y',
    28,
  );
  t.cyl(object, black, 0.06, 0.03, vx, y + 0.645, B.dischargeZ, 'y', 16);
  // The two pumps.
  const isolators: { at: Point; name: string }[] = [];
  B.pumpX.forEach((x, i) => pump(x, i + 1));
  function pump(x: number, n: number) {
    const z = B.pumpZ;
    // Its base, its inline suction and discharge either side of it.
    t.box(object, black, 0.26, 0.08, 0.26, x, 0.14, z);
    t.cyl(object, black, 0.1, 0.16, x, y, z, 'y', 24);
    t.pipe(
      object,
      50,
      [
        [x, y, B.suctionZ],
        [x, y, z + 0.09],
      ],
      FINISH.stainless,
    );
    t.pipe(
      object,
      50,
      [
        [x, y, z - 0.09],
        [x, y, B.dischargeZ],
      ],
      FINISH.stainless,
    );
    // Its isolating valves, motorised (the owner, 2026-10-26): set in
    // once its controller's parts are made, below.
    isolators.push(
      { at: [x, y, B.suctionZ - 0.12], name: `P${n} suction valve` },
      { at: [x, y, B.dischargeZ + 0.11], name: `P${n} discharge valve` },
    );
    // A check valve on its discharge.
    t.cyl(
      object,
      t.paint(FINISH.brass, 0.35, 0.7),
      0.04,
      0.09,
      x,
      y,
      z - 0.16,
      'z',
      18,
    );
    // The stack of stages, its sleeve, and the motor with its drive on top.
    t.cyl(object, steel, 0.075, 0.5, x, 0.58, z, 'y', 24);
    t.cyl(object, black, 0.09, 0.04, x, 0.85, z, 'y', 24);
    t.cyl(object, blue, 0.11, 0.34, x, 1.04, z, 'y', 28);
    t.box(object, blue, 0.17, 0.12, 0.08, x, 1.08, z + 0.13);
    t.cyl(object, black, 0.115, 0.04, x, 1.23, z, 'y', 28);
    badge([x, 1.0, z + 0.112], 0.022);
    t.ratingPlate(
      object,
      [x, 0.6, z + 0.078],
      'GRUNDFLOW',
      [`CRE 5-9  P${n}`, '2.2 kW  400 V'],
      0.09,
      0.05,
    );
  }
  function badge(at: Point, height: number) {
    const mesh = createBrandBadge(kit, 'grundflow', {
      height,
      plate: '#eceee8',
    });
    mesh.position.set(...at);
    object.add(mesh);
  }
  // The control unit, on its post at the east end, facing the front.
  const parts = createPartSet();
  // Each pump's suction and discharge valves, motorised and driven by
  // its controller (the owner, 2026-10-26): open while the set is
  // powered and in service, shut on a low-water trip or with its power
  // off, isolating the pumps; RESET opens them again.
  for (const v of isolators) {
    const valve = parts.add(
      createActuatedButterflyValve(kit, 50, 'z', v.name, {
        open: () => {
          const r = feed.read();
          return r.powered && !r.tripped;
        },
        set: () => {},
        power: () => feed.read().powered,
      }),
    );
    valve.object.position.set(...v.at);
    object.add(valve.object);
  }
  const panel = new Group();
  const cx = B.w / 2 - 0.22;
  panel.position.set(cx, 1.05, B.d / 2 - 0.12);
  object.add(panel);
  t.box(object, galv, 0.06, 0.8, 0.06, cx, 0.45, B.d / 2 - 0.2);
  t.box(panel, livery.paint.casing, 0.36, 0.5, 0.14, 0, 0, -0.07);
  t.box(panel, livery.paint.main, 0.36, 0.05, 0.005, 0, 0.225, 0.003);
  const mark = createBrandBadge(kit, 'grundflow', {
    height: 0.025,
    plate: '#eceee8',
  });
  mark.position.set(-0.1, 0.225, 0.007);
  panel.add(mark);
  const z = 0.002;
  const mount = <P extends Part>(part: P, px: number, py: number) => {
    parts.add(part);
    part.object.position.set(px, py, z);
    part.object.scale.setScalar(0.75);
    panel.add(part.object);
    return part;
  };
  const screen = createCharacterLcd(kit, {
    columns: 16,
    rows: 2,
    cell: 0.0028,
    backlight: true,
  });
  screen.group.position.set(0, 0.14, z);
  screen.group.traverse((o: Object3D) => (o.userData.live = true));
  panel.add(screen.group);
  const lamps = {
    power: signal(false),
    run1: signal(false),
    run2: signal(false),
    lowWater: signal(false),
  };
  (
    [
      ['POWER', 'white', lamps.power],
      ['PUMP 1 RUN', 'green', lamps.run1],
      ['PUMP 2 RUN', 'green', lamps.run2],
      ['LOW WATER', 'red', lamps.lowWater],
    ] as const
  ).forEach(([legend, colour, drive], i) =>
    mount(
      pilotLight(kit, {
        colour,
        legend,
        drive,
        pushToTest: false,
        name: `Booster set ${legend} lamp`,
      }),
      -0.12 + i * 0.08,
      0.04,
    ),
  );
  mount(
    pushButton(kit, {
      colour: 'blue',
      legend: 'RESET',
      name: 'Booster set RESET',
      action: () => feed.reset(),
    }),
    0.1,
    -0.13,
  );
  const gauge = createDialGauge(kit, {
    dia: 0.09,
    max: 10,
    unit: 'bar',
    legend: 'DISCHARGE',
    flutter: 0.01,
  });
  gauge.group.position.set(-0.08, -0.13, z);
  gauge.group.traverse((o: Object3D) => (o.userData.live = true));
  panel.add(gauge.group);
  return {
    object,
    parts,
    update(delta: number) {
      const r = feed.read();
      const l = boosterLamps(r);
      lamps.power.value = l.power;
      lamps.run1.value = l.run1;
      lamps.run2.value = l.run2;
      lamps.lowWater.value = l.lowWater;
      screen.show(boosterDisplay(r));
      gauge.set(boosterPressure(r));
      gauge.update(delta);
    },
    dispose() {
      parts.dispose();
    },
  };
}
