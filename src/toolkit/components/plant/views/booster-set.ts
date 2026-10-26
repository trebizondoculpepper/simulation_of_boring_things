import { createPipe } from '../../core/views/pipe-kinds';
import { createCanvasTexture } from '../../core/views/screens';
import { drawBrandMark } from '../../core/views/brand-logo';
import { BRANDS } from '../../core/logic/brands';
import {
  changeoverFlow,
  changeoverPressure,
  changeoverStatus,
  motorCalled,
  valvesCalled,
} from '../logic/booster-changeover';
import type {
  BoosterChangeover,
  BoosterPump,
  ChangeoverAction,
} from '../logic/booster-changeover';
import { partAudio } from '../../core/audio/part-audio';
import { pumpSound } from './pump-sound';
import { BOOSTER_PUMP } from '../logic/pump-sound';
import { createActuatedButterflyValve } from './actuated-butterfly-valve';
import { signal } from '@preact/signals-core';
import {
  CapsuleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import {
  createBrandBadge,
  createBrandBand,
} from '../../core/views/brand-badge';
import { brandLivery } from '../../core/views/brand-livery';
import { createPartSet, pilotLight, pushButton } from '../../core/parts/parts';
import type { Part } from '../../core/parts/parts';
import { createCharacterLcd } from '../../industrial-control/views/panel-instruments';
import { createDialGauge } from '../../industrial-control/views/dial-gauge';
import { FINISH, plantTools } from './plant-tools';
import type { Point } from './plant-tools';
import {
  BOOSTER,
  BOOSTER_CONTROL,
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
  /**
   * Its two pumps' duty changeover (`booster-changeover.ts`), where it is
   * modelled (dev42): its pumps' speeds and valves follow it, its DUTY,
   * RUN and STOP buttons work it, and its motors are heard running up and
   * coasting down.
   */
  changeover?: {
    state(): BoosterChangeover;
    act(a: ChangeoverAction): void;
  };
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
  const steel = t.paint(FINISH.stainless, 0.3, 0.8);
  const galv = t.paint(FINISH.galvanised, 0.45, 0.6);
  const black = t.paint('#1d1f21', 0.6);
  const B = BOOSTER;
  const GRUNDFLOW = BRANDS.find((b) => b.id === 'grundflow')!;
  // Grundflow's colours: its blue, its grey and its orange.
  const gfBlue = t.paint('#0b4f9c', 0.4, 0.2);
  const gfGrey = t.paint('#8a9196', 0.45, 0.4);
  const gfOrange = t.paint('#e07a22', 0.5);
  /** Lettering wrapped round a vertical cylinder, facing the front. */
  const wrapText = (
    text: string[],
    at: Point,
    radius: number,
    height: number,
  ) => {
    const art = createCanvasTexture(1024, 64);
    const c = art.context;
    c.clearRect(0, 0, 1024, 64);
    c.fillStyle = '#f2f2ea';
    c.font = 'bold 40px sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text.join('  '), 512, 34, 1000);
    art.texture.needsUpdate = true;
    kit.textures.push(art.texture);
    const material = new MeshStandardMaterial({
      map: art.texture,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      roughness: 0.6,
    });
    kit.materials.push(material);
    const theta = Math.min(Math.PI * 1.6, (height * 1024) / 64 / radius);
    const mesh = new Mesh(
      new CylinderGeometry(
        radius,
        radius,
        height,
        32,
        1,
        true,
        -theta / 2,
        theta,
      ),
      material,
    );
    mesh.position.set(...at);
    object.add(mesh);
  };
  /** Its mark wrapped round a curved surface, facing the front. */
  const band = (at: Point, radius: number, height: number) => {
    const b = createBrandBand(kit, 'grundflow', { radius, height });
    b.position.set(...at);
    object.add(b);
  };
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
  // The diaphragm vessel, on the discharge manifold's closed west end:
  // a rounded pressure vessel, domed top and bottom, in Grundflow's
  // colours (the owner, 2026-10-26): its blue shell, grey feet ring and
  // connection, an orange band with its maker's mark, and its charge
  // valve on its top dome.
  const vx = -B.w / 2 + 0.25;
  const grey = gfGrey;
  const orange = gfOrange;
  t.rod(
    object,
    steel,
    [vx, y, B.dischargeZ],
    [vx, y + 0.16, B.dischargeZ],
    0.02,
  );
  t.cyl(object, grey, 0.07, 0.04, vx, y + 0.17, B.dischargeZ, 'y', 20);
  const vessel = new Mesh(
    new CapsuleGeometry(0.14, 0.26, 10, 28),
    t.paint('#0b4f9c', 0.4, 0.2),
  );
  vessel.position.set(vx, y + 0.17 + 0.14 + 0.13, B.dischargeZ);
  object.add(vessel);
  t.cyl(object, orange, 0.142, 0.05, vx, y + 0.44, B.dischargeZ, 'y', 28);
  t.cyl(
    object,
    grey,
    0.018,
    0.04,
    vx,
    y + 0.17 + 0.28 + 0.28 + 0.01,
    B.dischargeZ,
    'y',
    10,
  );
  band([vx, y + 0.36, B.dischargeZ], 0.14, 0.04);
  // Its rating lettered round it under the band (the owner, 2026-10-26).
  wrapText(
    ['24 L  ·  PN10: MAX 10 bar  ·  PRE-CHARGE 2.5 bar  ·  -10/+70 °C'],
    [vx, y + 0.53, B.dischargeZ],
    0.141,
    0.035,
  );
  // The two pumps.
  const isolators: { at: Point; name: string }[] = [];
  B.pumpX.forEach((x, i) => pump(x, i + 1));
  function pump(x: number, n: number) {
    const z = B.pumpZ;
    // Its base, its inline suction and discharge either side of it.
    // In Grundflow's blue, orange and grey (the owner, 2026-10-26).
    t.box(object, gfGrey, 0.26, 0.08, 0.26, x, 0.14, z);
    t.cyl(object, gfGrey, 0.1, 0.16, x, y, z, 'y', 24);
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
    t.cyl(object, gfGrey, 0.09, 0.04, x, 0.85, z, 'y', 24);
    t.cyl(object, gfBlue, 0.11, 0.34, x, 1.04, z, 'y', 28);
    t.box(object, gfOrange, 0.17, 0.12, 0.08, x, 1.08, z + 0.13);
    // Its terminal box made one (the owner, 2026-10-26): a screw at each
    // corner of its lid, louvres on its east side, a cable gland under it.
    const lid = z + 0.17;
    for (const dx of [-0.07, 0.07])
      for (const dy of [-0.045, 0.045])
        t.cyl(
          object,
          steel,
          0.006,
          0.004,
          x + dx,
          1.08 + dy,
          lid + 0.002,
          'z',
          8,
        );
    t.box(
      object,
      t.paint('#c9661a', 0.55),
      0.15,
      0.1,
      0.002,
      x,
      1.08,
      lid + 0.001,
    );
    for (let k = 0; k < 5; k++)
      t.box(
        object,
        t.paint('#3a2a1c', 0.7),
        0.003,
        0.006,
        0.05,
        x + 0.0855,
        1.05 + k * 0.015,
        z + 0.13,
      );
    t.cyl(object, black, 0.012, 0.025, x + 0.05, 1.008, z + 0.15, 'y', 10);
    t.cyl(object, gfGrey, 0.115, 0.04, x, 1.23, z, 'y', 28);
    // Its maker's mark wrapped round its motor, under its terminal box.
    band([x, 0.93, z], 0.11, 0.03);
    // Its fan cowl's top: a bolted plate, the impeller mark on it, worn
    // a little (the owner, 2026-10-26).
    const top = t.printed(
      0.2,
      0.2,
      (c, cw, ch) => {
        c.clearRect(0, 0, cw, ch);
        c.fillStyle = '#8a9196';
        c.beginPath();
        c.arc(cw / 2, ch / 2, cw / 2, 0, Math.PI * 2);
        c.fill();
        // Its wear: fine speckle and a few scuffs, the same on each pump
        // but turned (a seeded scatter, not random each build).
        let seed = 7 + n * 31;
        const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        for (let k = 0; k < 900; k++) {
          const a = rnd() * Math.PI * 2;
          const r = Math.sqrt(rnd()) * cw * 0.48;
          c.fillStyle =
            rnd() < 0.5 ? 'rgba(40,44,48,0.18)' : 'rgba(230,234,236,0.16)';
          c.fillRect(cw / 2 + Math.cos(a) * r, ch / 2 + Math.sin(a) * r, 2, 2);
        }
        c.strokeStyle = 'rgba(200,205,208,0.35)';
        c.lineWidth = 1.5;
        for (let k = 0; k < 6; k++) {
          const a = rnd() * Math.PI * 2;
          const r = cw * (0.15 + rnd() * 0.25);
          const sx = cw / 2 + Math.cos(a) * r;
          const sy = ch / 2 + Math.sin(a) * r;
          c.beginPath();
          c.moveTo(sx, sy);
          c.lineTo(
            sx + (rnd() - 0.5) * cw * 0.2,
            sy + (rnd() - 0.5) * ch * 0.08,
          );
          c.stroke();
        }
        drawBrandMark(c, GRUNDFLOW, cw / 2, ch / 2, cw * 0.26);
      },
      256,
    );
    // Round: its square's corners left out.
    const topMaterial = top.mesh.material as MeshStandardMaterial;
    topMaterial.transparent = true;
    topMaterial.alphaTest = 0.5;
    top.mesh.rotation.x = -Math.PI / 2;
    top.mesh.position.set(x, 1.2505, z);
    object.add(top.mesh);
    // Its six bolts round the plate.
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
      t.cyl(
        object,
        steel,
        0.008,
        0.008,
        x + Math.cos(a) * 0.088,
        1.254,
        z + Math.sin(a) * 0.088,
        'y',
        6,
      );
    }
    // Its rating plate on its terminal box's lid, sized to it (the
    // owner, 2026-10-26: not on the round sleeve).
    t.ratingPlate(
      object,
      [x, 1.08, z + 0.174],
      'GRUNDFLOW',
      [`CRE 5-9  P${n}`, '2.2 kW  400 V'],
      0.12,
      0.07,
    );
  }
  // The control unit, on its post at the east end, facing the front.
  const parts = createPartSet();
  // Each pump's suction and discharge valves, motorised and driven by
  // its controller (the owner, 2026-10-26): open while the set is
  // powered and in service, shut on a low-water trip or with its power
  // off, isolating the pumps; RESET opens them again.
  const tails: Object3D[] = [];
  // Where its changeover is modelled, each pump's pair follows it.
  const co = feed.changeover;
  isolators.forEach((v, i) => {
    const pump = (i < 2 ? 0 : 1) as BoosterPump;
    const valve = parts.add(
      createActuatedButterflyValve(
        kit,
        50,
        'z',
        v.name,
        co
          ? {
              open: () => valvesCalled(co.state(), pump),
              set: () => {},
              position: () => co.state().valve[pump],
              power: () => true,
            }
          : {
              open: () => {
                const r = feed.read();
                return r.powered && !r.tripped;
              },
              set: () => {},
              power: () => feed.read().powered,
            },
      ),
    );
    valve.object.position.set(...v.at);
    object.add(valve.object);
    tails.push(valve.cableTail);
  });
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
  // Its duty selector and RUN and STOP, where its changeover is
  // modelled: each DUTY lit while its pump is selected.
  const selected = [signal(false), signal(false)] as const;
  const boostLit = signal(false);
  if (co)
    (
      [
        ['DUTY 1', 'white', { act: 'duty', pump: 0 }, selected[0]],
        ['DUTY 2', 'white', { act: 'duty', pump: 1 }, selected[1]],
        ['RUN', 'green', { act: 'run' }, null],
        ['STOP', 'red', { act: 'stop' }, null],
        ['BOOST', 'yellow', { act: 'boost' }, boostLit],
      ] as const
    ).forEach(([legend, colour, action, lamp], i) =>
      mount(
        pushButton(kit, {
          colour,
          legend,
          ...(lamp ? { head: 'illuminated' as const, lamp } : {}),
          name: `Booster set ${legend}`,
          action: () => co.act(action),
        }),
        -0.136 + i * 0.068,
        -0.045,
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
  // Each pump's motor, heard where it stands.
  const motors = B.pumpX.map((x) => {
    const m = new Group();
    m.position.set(x, 1.0, B.pumpZ);
    object.add(m);
    return m;
  });
  const heard = [false, false];
  // Both pumps working harder while boosting, in parallel against the
  // pipework's resistance (the owner, 2026-10-26).
  const load = signal(0);
  const sound = pumpSound(BOOSTER_PUMP, load);
  // Each pump's control cable from its terminal box's gland, down and
  // along under the set, up into a gland under the control unit; and the
  // unit's own larger gland on its top, its link to the wider control
  // network (the owner, 2026-10-26).
  {
    const cable = t.paint('#1b1d1e', 0.7);
    const pz = B.d / 2 - 0.19;
    const low = 0.72;
    B.pumpX.forEach((x, i) => {
      const gx = x + 0.05;
      const gz = B.pumpZ + 0.15;
      const ex = cx - 0.12 + i * 0.06;
      object.add(
        createPipe(
          'pressure-hose',
          0.012,
          [
            [gx, 0.99, gz],
            [gx, low, gz],
            [ex, low, pz],
            [ex, 0.8, pz],
          ],
          { colour: '#1b1d1e' },
        ),
      );
      t.cyl(object, cable, 0.011, 0.02, ex, 0.79, pz, 'y', 10);
    });
    // Each motorised valve's thinner cable, from its actuator's tail
    // down under the set (beneath the motors' cables), along and up into
    // its own small gland under the unit (the owner, 2026-10-26).
    object.updateMatrixWorld(true);
    const at = new Vector3();
    tails.forEach((tail, k) => {
      const [tx, ty, tz] = object
        .worldToLocal(tail.getWorldPosition(at))
        .toArray();
      const ex = cx - 0.02 + k * 0.03;
      object.add(
        createPipe(
          'pressure-hose',
          0.007,
          [
            [tx, ty, tz],
            [tx, 0.66 - k * 0.012, tz],
            [ex, 0.66 - k * 0.012, pz],
            [ex, 0.8, pz],
          ],
          // Laid in square runs and clipped, not hanging in loops.
          { colour: '#2a2b2c', laid: true },
        ),
      );
      t.cyl(object, cable, 0.007, 0.016, ex, 0.792, pz, 'y', 8);
    });
    // The network gland, larger, on top of the unit (the owner,
    // 2026-10-26): its control port (`BOOSTER_CONTROL`), where the
    // room's control wiring is to be drawn in; no cable drawn here.
    t.cyl(
      object,
      cable,
      0.018,
      0.025,
      BOOSTER_CONTROL[0],
      BOOSTER_CONTROL[1] - 0.0125,
      BOOSTER_CONTROL[2],
      'y',
      12,
    );
  }
  // Its pressure gauges on its manifolds, where they measure (the
  // owner, 2026-10-26: a gauge sits on what it reads, not on the panel):
  // suction on the front manifold, discharge on the back, each on a
  // short stub with its gauge cock, facing the front.
  const gauges = (
    [
      ['SUCTION', 4, -B.w / 2 + 0.2, B.suctionZ],
      ['DISCHARGE', 10, B.w / 2 - 0.12, B.dischargeZ],
    ] as const
  ).map(([legend, max, gx, gz]) => {
    t.rod(object, steel, [gx, y, gz], [gx, y + 0.17, gz], 0.008);
    t.cyl(object, black, 0.012, 0.03, gx, y + 0.1, gz, 'y', 10);
    const g = createDialGauge(kit, {
      dia: 0.1,
      max,
      unit: 'bar',
      legend,
      flutter: 0.01,
    });
    g.group.position.set(gx, y + 0.22, gz + 0.012);
    g.group.traverse((o: Object3D) => (o.userData.live = true));
    object.add(g.group);
    return g;
  });
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
      if (co) {
        const s = co.state();
        lamps.run1.value = motorCalled(s, 0);
        lamps.run2.value = motorCalled(s, 1);
        load.value = s.speed[0] > 0.5 && s.speed[1] > 0.5 ? 1 : 0;
        boostLit.value = s.boost;
        selected[0].value = s.selected === 0;
        selected[1].value = s.selected === 1;
        // Each motor heard running up when called, coasting down when not.
        ([0, 1] as const).forEach((p) => {
          const on = motorCalled(s, p);
          if (on !== heard[p]) {
            heard[p] = on;
            partAudio.hold(motors[p], on ? sound : null, motors[p]);
          }
        });
        screen.show([
          changeoverStatus(s).padEnd(16).slice(0, 16),
          `FLOW ${changeoverFlow(s).toFixed(1)} m3/h`.padEnd(16).slice(0, 16),
        ]);
      } else screen.show(boosterDisplay(r));
      // Suction: the break tank's head; discharge: the set's pressure.
      gauges[0].set(0.3);
      gauges[1].set(co ? changeoverPressure(co.state()) : boosterPressure(r));
      for (const g of gauges) g.update(delta);
    },
    dispose() {
      for (const m of motors) partAudio.hold(m, null);
      parts.dispose();
    },
  };
}
