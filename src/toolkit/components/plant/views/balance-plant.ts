import {
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
} from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { SANS } from '../../core/views/fitting-tools';
import {
  createBrandBadge,
  createBrandBand,
} from '../../core/views/brand-badge';
import { brandLivery } from '../../core/views/brand-livery';
import type { BrandId } from '../../core/logic/brands';
import { FINISH, plantTools } from './plant-tools';
import type { DN, Point } from './plant-tools';
import { createHumanLadder } from '../../architectural/views/human-ladder';
import { createMagFlowmeter } from './mag-flowmeter';
import { FLOWMETER, METER } from '../logic/booster-set';

/**
 * The balance tank room's plant (dev_balance), in metres, each modelled
 * on a commercial product (`doc/research/plant-products-pumps-balance.md`)
 * under a maker of the game's own. Floor machines stand on the floor at
 * their origin, their front toward +z; wall equipment has its back at
 * z = 0.
 */

type Tools = ReturnType<typeof plantTools>;

const GRP = '#c3cabf';
const GRP_FLANGE = '#b2baae';

function badge(
  kit: PanelKit,
  parent: Object3D,
  id: BrandId,
  at: Point,
  height = 0.05,
) {
  const mesh = createBrandBadge(kit, id, { height, plate: '#eceee8' });
  mesh.position.set(...at);
  parent.add(mesh);
  return mesh;
}

/** A printed label, dark on pale, facing +z at `at`. */
function label(
  t: Tools,
  parent: Object3D,
  text: string,
  at: Point,
  w = 0.4,
  colour = '#f1f1ec',
) {
  const lines = text.split('\n');
  const plate = t.printed(
    w,
    0.04 * lines.length + 0.02,
    (c, cw, ch) => {
      c.fillStyle = colour;
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = '#1b1f22';
      c.font = `bold ${(ch / lines.length) * 0.5}px ${SANS}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      lines.forEach((line, i) =>
        c.fillText(line, cw / 2, (ch / lines.length) * (i + 0.5)),
      );
    },
    384,
  );
  plate.mesh.position.set(...at);
  parent.add(plate.mesh);
  return plate.mesh;
}

/** A flanged tank connection of size `dn` through the front face at (x, y), `out` metres long. */
function connection(
  t: Tools,
  parent: Object3D,
  dn: DN,
  x: number,
  y: number,
  z: number,
  out = 0.25,
) {
  t.pipe(parent, dn, [
    [x, y, z],
    [x, y, z + out],
  ]);
  t.flanges(parent, dn, [x, y, z + 0.05], 'z', FINISH.stainless);
}

/**
 * A sectional GRP water tank of 1 m square panels, externally flanged,
 * `nx` × `nz` panels in plan and `ny` high, after the Dutypoint and Tanks
 * Direct GRP sectional ranges (1000 × 1000 mm panels, bolted flanges,
 * insulated roof with an access hatch), on steel support beams under every
 * panel joint. Its middle is at the origin; front face toward +z.
 */
export function createSectionalTank(
  kit: PanelKit,
  { nx, nz, ny, brand }: { nx: number; nz: number; ny: number; brand: BrandId },
) {
  const t = plantTools(kit);
  const group = new Group();
  const grp = t.paint(GRP, 0.55);
  const flange = t.paint(GRP_FLANGE, 0.6);
  const beam = t.paint('#3f474d', 0.55, 0.3);
  const lift = 0.25;
  const W = nx,
    D = nz,
    H = ny;
  // Support beams across, under every joint.
  for (let i = 0; i <= nx; i++)
    t.box(group, beam, 0.1, lift, D + 0.2, -W / 2 + i, lift / 2, 0);
  // The shell.
  t.box(group, grp, W, H, D, 0, lift + H / 2, 0);
  // External flanges at every panel joint, on all four sides and the roof.
  const f = 0.05;
  for (let i = 0; i <= nx; i++) {
    const x = -W / 2 + i;
    t.box(group, flange, 0.03, H, D + 2 * f, x, lift + H / 2, 0);
    t.box(group, flange, 0.03, f, D + 2 * f, x, lift + H + f / 2, 0);
  }
  for (let k = 0; k <= nz; k++) {
    const z = -D / 2 + k;
    t.box(group, flange, W + 2 * f, H, 0.03, 0, lift + H / 2, z);
    t.box(group, flange, W + 2 * f, f, 0.03, 0, lift + H + f / 2, z);
  }
  for (let j = 1; j < ny; j++)
    for (const z of [-D / 2 - f / 2, D / 2 + f / 2])
      t.box(group, flange, W + 2 * f, 0.03, f, 0, lift + j, z);
  // Each panel's moulded square dimple.
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < ny; j++)
      t.box(
        group,
        t.paint('#bcc4b8', 0.55),
        0.7,
        0.7,
        0.01,
        -W / 2 + i + 0.5,
        lift + j + 0.5,
        D / 2 + 0.005,
      );
  // Roof hatch with its handle.
  t.box(group, grp, 0.7, 0.06, 0.7, -W / 2 + 0.5, lift + H + 0.03, 0);
  t.box(
    group,
    t.paint('#6a7074', 0.5),
    0.2,
    0.03,
    0.03,
    -W / 2 + 0.5,
    lift + H + 0.08,
    0.2,
  );
  // On the front wall's face (D / 2 + 0.015), clear of it.
  badge(kit, group, brand, [W / 2 - 0.5, lift + H - 0.2, D / 2 + 0.02], 0.08);
  return { group, lift, top: lift + H };
}

/**
 * The main pool's balance tank: a 6 × 3 × 2 m sectional tank (36 m³) with
 * the overflow channels' DN250 inlets near the top, the circulation
 * pumps' DN200 suctions low on its face, overflow and drain, a hydrostatic
 * level transmitter in its roof, and a caged ladder to the hatch.
 */
export function createBalanceTank(kit: PanelKit) {
  const t = plantTools(kit);
  const { group, lift, top } = createSectionalTank(kit, {
    nx: 6,
    nz: 3,
    ny: 2,
    brand: 'gorskiy',
  });
  const front = 1.5;
  // Overflow channel returns in at the top, from above.
  for (const x of [1.2, 2.2]) {
    t.pipe(group, 250, [
      [x, top + 0.6, front + 0.35],
      [x, top - 0.25, front + 0.35],
      [x, top - 0.25, front],
    ]);
    t.flanges(group, 250, [x, top - 0.25, front + 0.06], 'z', FINISH.stainless);
  }
  // Pump suctions low on the face, each with a butterfly valve.
  for (const x of [-1.5, -0.5]) {
    connection(t, group, 200, x, lift + 0.3, front, 0.45);
    t.butterflyValve(group, 200, [x, lift + 0.3, front + 0.3], 'z');
  }
  // Overflow (warning) and drain.
  connection(t, group, 150, 2.6, top - 0.15, front, 0.2);
  connection(t, group, 100, 0.6, lift + 0.12, front, 0.35);
  t.butterflyValve(group, 100, [0.6, lift + 0.12, front + 0.22], 'z');
  // Level transmitter on the roof: a gland plate, junction box and conduit.
  t.cyl(
    group,
    t.paint(FINISH.stainless, 0.3, 0.8),
    0.06,
    0.05,
    -1.6,
    top + 0.03,
    0.6,
    'y',
    20,
  );
  t.box(
    group,
    t.paint('#d8dad6', 0.45),
    0.16,
    0.12,
    0.08,
    -1.6,
    top + 0.12,
    0.6,
  );
  t.rod(
    group,
    t.paint('#5a5f63', 0.6),
    [-1.6, top + 0.18, 0.6],
    [-1.6, top + 0.5, 0.6],
    0.012,
  );
  label(
    t,
    group,
    'BT-101  MAIN POOL BALANCE TANK  36 m³',
    [0, lift + 1.55, front + 0.02],
    1.2,
    '#f2d34a',
  );
  // Caged ladder up the face to the roof.
  const ladder = createHumanLadder('caged', top + 0.05, { kit }).group;
  ladder.position.set(-2.55, 0, front + 0.02);
  group.add(ladder);
  return group;
}

/**
 * Level instruments for the balance tank, on a board: a hydrostatic level
 * probe after the Endress+Hauser Waterpilot FMX21 (Ø22 mm stainless, on
 * its cable), and three float switches after the Flygt ENM-10, hung at
 * the tank's high-high, low and low-low levels from a bracket.
 */
export function createLevelInstruments(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  t.box(group, t.paint('#d7dad3', 0.8), 1.2, 1.6, 0.02, 0, 0, 0.01);
  // A strip of "tank wall" tinted to show the levels.
  const water = new Mesh(
    new PlaneGeometry(1.0, 1.0),
    new MeshStandardMaterial({
      color: '#7fb3c2',
      roughness: 0.3,
      transparent: true,
      opacity: 0.6,
    }),
  );
  kit.materials.push(water.material);
  water.position.set(0, -0.3, 0.021);
  group.add(water);
  // The bracket across the top.
  const steel = t.paint(FINISH.stainless, 0.3, 0.8);
  t.box(group, steel, 1.0, 0.04, 0.12, 0, 0.7, 0.08);
  // The probe on its cable, with its junction box.
  t.box(
    group,
    brandLivery(kit, 'kessler-moody').paint.casing,
    0.12,
    0.12,
    0.08,
    -0.38,
    0.62,
    0.05,
  );
  t.rod(
    group,
    t.paint('#1d1d1d', 0.7),
    [-0.38, 0.68, 0.1],
    [-0.38, -0.66, 0.1],
    0.004,
    8,
  );
  t.cyl(group, steel, 0.011, 0.16, -0.38, -0.74, 0.1, 'y', 16);
  label(t, group, 'LT-101\nhydrostatic', [-0.38, 0.45, 0.025], 0.18);
  // Three float switches at their levels.
  const floats: [number, number, string][] = [
    [-0.1, 0.12, 'LSHH'],
    [0.12, -0.42, 'LSL'],
    [0.34, -0.66, 'LSLL'],
  ];
  const yellow = brandLivery(kit, 'pepperdyne').paint.accent;
  for (const [x, y, name] of floats) {
    t.rod(
      group,
      t.paint('#2a2a2a', 0.7),
      [x, 0.68, 0.1],
      [x, y + 0.08, 0.1],
      0.004,
      8,
    );
    const bulb = new Mesh(new SphereGeometry(0.045, 20, 12), yellow);
    bulb.scale.set(1, 1.6, 1);
    bulb.position.set(x, y, 0.1);
    group.add(bulb);
    t.cyl(
      group,
      t.paint('#3a3a3a', 0.5),
      0.015,
      0.03,
      x,
      y + 0.2,
      0.1,
      'y',
      10,
    );
    label(t, group, name, [x, y - 0.12, 0.025], 0.12);
  }
  badge(kit, group, 'kessler-moody', [0.38, 0.55, 0.021], 0.04);
  return group;
}

/**
 * The make-up break tank with its Type AB air gap (the Water Supply
 * (Water Fittings) Regulations' protection for fluid category 5), after
 * the Tanks Direct 2250 litre AB tank, 1650 × 1450 × 1750 mm high: the
 * mains inlet and float valve discharging above an unrestricted weir
 * overflow, the gap marked through a clear inspection panel, and the
 * outlet to the pool make-up.
 */
export function createBreakTank(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const W = 1.65,
    D = 1.45,
    H = 1.75;
  const grp = t.paint(GRP, 0.55);
  t.box(
    group,
    t.paint('#3f474d', 0.55, 0.3),
    W + 0.1,
    0.1,
    D + 0.1,
    0,
    0.05,
    0,
  );
  t.box(group, grp, W, H, D, 0, 0.1 + H / 2, 0);
  t.box(
    group,
    t.paint(GRP_FLANGE, 0.6),
    W + 0.06,
    0.06,
    D + 0.06,
    0,
    0.1 + H + 0.03,
    0,
  );
  // The clear inspection panel: water inside up to the overflow, the gap above.
  const front = D / 2;
  const glass = new Mesh(
    new PlaneGeometry(0.9, 1.3),
    new MeshStandardMaterial({
      color: '#d9eef2',
      roughness: 0.1,
      transparent: true,
      opacity: 0.35,
    }),
  );
  kit.materials.push(glass.material);
  // Keep the glazing clear of the water face: their previous coplanar
  // surfaces fought for depth and made a checkerboard in the plant room.
  glass.position.set(-0.2, 0.95, front + 0.012);
  group.add(glass);
  const overflow = 1.35;
  t.box(
    group,
    t.paint('#7fb3c2', 0.3),
    0.9,
    overflow - 0.3,
    0.004,
    -0.2,
    0.3 + (overflow - 0.3) / 2,
    front + 0.002,
  );
  // The weir overflow: a slot through the side to a tundish and the drain.
  t.box(
    group,
    t.paint('#1d2a2d', 0.6),
    0.004,
    0.12,
    0.5,
    W / 2 + 0.002,
    overflow + 0.06,
    0,
  );
  t.box(
    group,
    t.paint('#4a4e52', 0.5),
    0.2,
    0.25,
    0.6,
    W / 2 + 0.1,
    overflow - 0.05,
    0,
  );
  t.rod(
    group,
    t.paint(FINISH.pvc, 0.45),
    [W / 2 + 0.1, overflow - 0.18, 0],
    [W / 2 + 0.1, 0, 0],
    0.055,
  );
  // Mains inlet over the top, its float valve inside, discharging above the weir.
  const inletY = overflow + 0.32;
  t.pipe(
    group,
    50,
    [
      [-0.2, 2.4, front + 0.3],
      [-0.2, 2.1, front + 0.3],
      [-0.2, 2.1, 0],
      [-0.2, inletY, 0],
    ],
    FINISH.steel,
  );
  t.box(
    group,
    t.paint(FINISH.brass, 0.35, 0.7),
    0.1,
    0.08,
    0.08,
    -0.2,
    inletY - 0.03,
    0.2,
  );
  t.rod(
    group,
    t.paint(FINISH.brass, 0.35, 0.7),
    [-0.2, inletY - 0.03, 0.2],
    [0.25, overflow - 0.05, 0.2],
    0.008,
  );
  t.cyl(
    group,
    t.paint('#e8e8e3', 0.4),
    0.09,
    0.1,
    0.25,
    overflow - 0.05,
    0.2,
    'y',
    20,
  );
  // The gap marked on the panel.
  label(
    t,
    group,
    'TYPE AB AIR GAP',
    [-0.2, (overflow + inletY) / 2, front + 0.006],
    0.42,
    '#f2d34a',
  );
  // Outlet to the make-up, low on the face, with a valve.
  t.pipe(group, 65, [
    [0.55, 0.3, front],
    [0.55, 0.3, front + 0.35],
  ]);
  t.butterflyValve(group, 65, [0.55, 0.3, front + 0.2], 'z');
  label(
    t,
    group,
    'MAKE-UP BREAK TANK  2250 L\nCATEGORY 5 PROTECTION',
    [0.45, 1.5, front + 0.004],
    0.6,
  );
  badge(kit, group, 'gorskiy', [0.55, 1.2, front + 0.004], 0.06);
  return group;
}

/**
 * The make-up water meter, after the Elster (Honeywell) Helix 4000 DN50
 * Woltmann meter (200 mm long, flanged, ISO 4064): the utility's revenue
 * meter, read by its dial register and not wired into (the owner,
 * 2026-10-26), its maker's mark round it, on its short run of steel pipe
 * on stands. The run's valves and strainer are the
 * plumber's, set from the schematic.
 */
export function createWaterMeter(kit: PanelKit) {
  return createWaterMeterSet(kit).group;
}

/**
 * The meter set, its register reading `show`'s cubic metres: six drums,
 * whole cubic metres, rolling on as the water passes.
 */
export function createWaterMeterSet(kit: PanelKit, start = 48273) {
  const t = plantTools(kit);
  const group = new Group();
  const y = METER.y;
  t.pipe(
    group,
    50,
    [
      [-METER.half, y, 0],
      [METER.half, y, 0],
    ],
    FINISH.steel,
  );
  // Its run's fittings (isolating valves, strainer, check valve) are the
  // plumber's, set in its line from the schematic, not drawn as part of
  // it (the owner, 2026-10-26: no decorative valves in a component).
  // The meter: body between flanges, register on top.
  const livery = brandLivery(kit, 'splashonomics');
  const blue = livery.paint.main;
  t.cyl(group, blue, 0.075, 0.2, 0, y, 0, 'x', 28);
  for (const x of [-0.1, 0.1])
    t.flanges(group, 50, [x, y, 0], 'x', livery.palette.main);
  t.cyl(group, blue, 0.07, 0.07, 0, y + 0.1, 0, 'y', 24);
  const register =
    (m3: number) => (c: CanvasRenderingContext2D, w: number, h: number) => {
      // Its corners its body's blue, the dial's face round within them.
      c.fillStyle = livery.palette.main;
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#f4f2e8';
      c.beginPath();
      c.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2);
      c.fill();
      // Six black drums of whole cubic metres, three red of litres, each
      // digit in its own drum's window.
      const whole = Math.floor(m3);
      const litres = Math.floor((m3 - whole) * 1000);
      const digits = (
        String(whole % 1e6).padStart(6, '0') + String(litres).padStart(3, '0')
      ).split('');
      const left = w * 0.12;
      const cell = (w * 0.76) / 9;
      c.font = `bold ${h * 0.1}px monospace`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      digits.forEach((d, k) => {
        c.fillStyle = k < 6 ? '#111' : '#a3241c';
        c.fillRect(left + k * cell + 1, h * 0.39, cell - 2, h * 0.14);
        c.fillStyle = '#f4f2e8';
        c.fillText(d, left + (k + 0.5) * cell, h * 0.465);
      });
      c.textBaseline = 'alphabetic';
      c.fillStyle = '#111';
      c.font = `${h * 0.08}px ${SANS}`;
      c.fillText('m³', w / 2, h * 0.68);
    };
  const dial = t.printed(0.12, 0.12, register(start), 256);
  dial.mesh.rotation.x = -Math.PI / 2;
  dial.mesh.position.set(0, y + 0.137, 0);
  dial.mesh.userData.live = true;
  group.add(dial.mesh);
  let shown = start;
  // Its maker's mark printed round its register (the owner, 2026-10-26).
  const band = createBrandBand(kit, 'splashonomics', {
    radius: 0.07,
    height: 0.024,
  });
  band.position.set(0, y + 0.1, 0);
  group.add(band);
  for (const x of [-(METER.half - 0.08), METER.half - 0.08])
    t.rod(
      group,
      t.paint(FINISH.galvanised, 0.4, 0.6),
      [x, 0, 0],
      [x, y - 0.03, 0],
      0.02,
    );
  return {
    group,
    /** The register at `start` plus `m3` passed, to the litre. */
    show(m3: number) {
      const now = Math.floor((start + m3) * 1000) / 1000;
      if (now === shown) return;
      shown = now;
      const c = dial.context;
      register(now)(c, c.canvas.width, c.canvas.height);
      dial.texture.needsUpdate = true;
    },
    /** What its register reads, as one would read it off. */
    reading: () =>
      `${Math.floor(shown).toString().padStart(6, '0')}.${String(Math.round((shown % 1) * 1000)).padStart(3, '0')} m³`,
  };
}

/**
 * The backwash holding tank and its discharge pump: a 3 × 2 × 2 m
 * sectional tank (12 m³, one filter's backwash) that lets the water out
 * to the sewer at the rate the connection allows, by a submersible pump
 * after the Grundfos SL1.50.65 (544 mm high, 333 × 242 mm), shown lifted
 * out on its guide rails beside the tank.
 */
export function createBackwashTank(kit: PanelKit) {
  const t = plantTools(kit);
  const { group, lift, top } = createSectionalTank(kit, {
    nx: 3,
    nz: 2,
    ny: 2,
    brand: 'gorskiy',
  });
  group.position.x = -0.7;
  const outer = new Group();
  outer.add(group);
  const front = 1;
  connection(t, group, 200, -0.8, top - 0.3, front, 0.3);
  label(
    t,
    group,
    'BACKWASH HOLDING TANK  12 m³',
    [0.3, lift + 1.5, front + 0.02],
    0.9,
    '#f2d34a',
  );
  // The pump beside it, lifted out on its rails, discharge rising to a valve.
  const pump = new Group();
  pump.position.set(1.6, 0, 0.3);
  outer.add(pump);
  const blue = brandLivery(kit, 'grundflow').paint.casing;
  t.box(pump, t.paint(FINISH.concrete, 0.85), 0.5, 0.05, 0.5, 0, 0.025, 0);
  t.cyl(pump, blue, 0.12, 0.3, 0, 0.42, 0, 'y', 24);
  t.cyl(pump, blue, 0.165, 0.16, 0, 0.16, 0, 'y', 28);
  t.box(pump, blue, 0.14, 0.1, 0.12, 0.15, 0.16, 0);
  t.cyl(pump, t.paint('#1d1d1d', 0.6), 0.02, 0.06, 0, 0.6, 0, 'y', 10);
  for (const z of [-0.08, 0.08])
    t.rod(
      pump,
      t.paint(FINISH.stainless, 0.3, 0.8),
      [0.25, 0.05, z],
      [0.25, 2.0, z],
      0.012,
    );
  t.pipe(
    pump,
    65,
    [
      [0.22, 0.16, 0],
      [0.35, 0.16, 0],
      [0.35, 1.6, 0],
    ],
    FINISH.pvc,
  );
  t.butterflyValve(pump, 65, [0.35, 1.2, 0], 'y');
  badge(kit, pump, 'grundflow', [0, 0.42, 0.121], 0.03);
  label(t, pump, 'P-601  TO SEWER\n≤ 5 l/s', [0, 0.85, 0.15], 0.3);
  return outer;
}

/**
 * Our own make-up flowmeter (the owner, 2026-10-26): a Kessler-Moody
 * electromagnetic flowmeter (`createMagFlowmeter`) on its own short run
 * of steel pipe on stands, straight after the utility's meter and in line
 * with it, its converter showing the flow and its cable gland on top of
 * its head, where its conduit comes down.
 */
export function createMakeUpFlowmeter(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const y = METER.y;
  t.pipe(
    group,
    65,
    [
      [-FLOWMETER.half, y, 0],
      [FLOWMETER.half, y, 0],
    ],
    FINISH.steel,
  );
  const meter = createMagFlowmeter(kit, { od: FLOWMETER.od, tag: 'WH-FT1' });
  meter.group.position.set(0, y, 0);
  group.add(meter.group);
  t.cyl(
    group,
    t.paint('#1c1e1f', 0.6),
    0.012,
    0.03,
    0,
    y + FLOWMETER.gland - 0.015,
    0,
    'y',
    10,
  );
  for (const x of [-(FLOWMETER.half - 0.08), FLOWMETER.half - 0.08])
    t.rod(
      group,
      t.paint(FINISH.galvanised, 0.4, 0.6),
      [x, 0, 0],
      [x, y - 0.03, 0],
      0.02,
    );
  return {
    group,
    /** Its converter's reading, m³/h. */
    show: (flow: number) => meter.show(flow, 'MAKE-UP'),
  };
}
