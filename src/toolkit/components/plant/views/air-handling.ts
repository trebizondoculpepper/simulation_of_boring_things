import { Group } from 'three';
import type { Material, Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { SANS } from '../../core/views/fitting-tools';
import { createBrandBadge } from '../../core/views/brand-badge';
import { brandLivery } from '../../core/views/brand-livery';
import type { BrandId } from '../../core/logic/brands';
import { BS1710_BASIC, BS1710_CODE, FINISH, plantTools } from './plant-tools';
import type { Point } from './plant-tools';

/**
 * The air handling room's plant, in metres, each modelled at the size of
 * a referenced commercial product under a maker's name of our own
 * (`doc/research/plant-products-boiler-air.md`). Floor plant stands with
 * its origin on the floor at the middle of its footprint, front to +z;
 * wall plant has its origin in the wall's face, front to +z.
 */

type Tools = ReturnType<typeof plantTools>;

function badge(
  kit: PanelKit,
  parent: Object3D,
  id: BrandId,
  at: Point,
  height = 0.04,
  ink?: string,
) {
  const mesh = createBrandBadge(kit, id, { height, ink });
  mesh.position.set(...at);
  parent.add(mesh);
  return mesh;
}

/** A maker's nameplate in its livery, facing +z at `at`. */
function nameplate(
  kit: PanelKit,
  parent: Object3D,
  id: BrandId,
  at: Point,
  lines: readonly string[],
  w = 0.16,
  h = 0.09,
) {
  const mesh = brandLivery(kit, id).nameplate(lines, w, h);
  mesh.position.set(...at);
  parent.add(mesh);
  return mesh;
}

function sign(
  t: Tools,
  parent: Object3D,
  text: string,
  at: Point,
  w: number,
  h: number,
  { ink = '#141414', ground = '#e9e9e2' } = {},
) {
  const lines = text.split('\n');
  const label = t.printed(
    w,
    h,
    (c, cw, ch) => {
      c.fillStyle = ground;
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = ink;
      c.font = `bold ${(ch / lines.length) * 0.5}px ${SANS}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      lines.forEach((line, i) =>
        c.fillText(line, cw / 2, (ch / lines.length) * (i + 0.5)),
      );
    },
    256,
  );
  label.mesh.position.set(...at);
  parent.add(label.mesh);
  return label.mesh;
}

/** A finned coil face `w` × `h` at `at` facing +z: fins and its headers. */
function coil(
  t: Tools,
  parent: Object3D,
  w: number,
  h: number,
  at: Point,
  header: Material,
) {
  const fin = t.paint('#c3c7c6', 0.35, 0.7);
  t.box(parent, fin, w, h, 0.12, ...at);
  for (let i = 0; i < Math.floor(w / 0.025); i++)
    t.box(
      parent,
      t.paint('#9fa4a4', 0.4, 0.7),
      0.003,
      h,
      0.122,
      at[0] - w / 2 + 0.0125 + i * 0.025,
      at[1],
      at[2],
    );
  for (const dy of [-h / 2 + 0.05, h / 2 - 0.05])
    t.rod(
      parent,
      header,
      [at[0] + w / 2, at[1] + dy, at[2]],
      [at[0] + w / 2 + 0.18, at[1] + dy, at[2]],
      0.02,
      12,
    );
}

/**
 * A bank of bag filters across a deck of airflow along x: a frame at
 * `x` and pleated pockets trailing downstream, `h` high and `d` deep.
 */
function bagFilters(
  t: Tools,
  parent: Object3D,
  x: number,
  y: number,
  h: number,
  d: number,
) {
  const frame = t.paint('#b7bbbb', 0.45, 0.5);
  const media = t.paint('#f0e8c8', 0.9);
  t.box(parent, frame, 0.04, h, d, x, y, 0);
  const n = 4;
  for (let i = 0; i < n; i++)
    t.box(
      parent,
      media,
      0.34,
      h - 0.06,
      d / n - 0.03,
      x + 0.19,
      y,
      -d / 2 + (i + 0.5) * (d / n),
    );
}

/** An EC plug fan: its inlet cone, impeller and motor, on a frame, facing +x. */
function plugFan(t: Tools, parent: Object3D, d: number, at: Point) {
  const steel = t.paint('#5b5f61', 0.5, 0.4);
  const wheel = t.paint('#9fa4a7', 0.35, 0.6);
  const motor = t.paint('#2a2d2f', 0.5);
  t.cyl(parent, wheel, d / 2, d * 0.35, at[0], at[1], at[2], 'x', 32);
  t.cyl(
    parent,
    motor,
    d * 0.22,
    d * 0.3,
    at[0] + d * 0.32,
    at[1],
    at[2],
    'x',
    24,
  );
  t.cyl(parent, steel, d * 0.38, 0.03, at[0] - d * 0.2, at[1], at[2], 'x', 32);
  t.box(
    parent,
    steel,
    d * 0.9,
    0.04,
    d * 0.9,
    at[0],
    at[1] - d / 2 - 0.05,
    at[2],
  );
}

/** A duct spigot on a unit's top: a short duct, its flexible connection and a damper with actuator. */
function spigot(
  t: Tools,
  parent: Object3D,
  w: number,
  d: number,
  at: Point,
  label: string,
) {
  const galv = t.paint('#b5babb', 0.4, 0.6);
  const flex = t.paint('#2e3236', 0.8);
  t.box(parent, flex, w, 0.12, d, at[0], at[1] + 0.06, at[2]);
  t.box(parent, galv, w, 0.35, d, at[0], at[1] + 0.12 + 0.175, at[2]);
  for (const y of [at[1] + 0.12, at[1] + 0.47])
    t.box(
      parent,
      t.paint('#9da2a3', 0.45, 0.6),
      w + 0.05,
      0.03,
      d + 0.05,
      at[0],
      y,
      at[2],
    );
  // The damper's actuator on the duct's side.
  t.box(
    parent,
    t.paint('#3a3f45', 0.5),
    0.1,
    0.16,
    0.07,
    at[0] + w / 2 + 0.05,
    at[1] + 0.3,
    at[2],
  );
  sign(
    t,
    parent,
    label,
    [at[0], at[1] + 0.3, at[2] + d / 2 + 0.003],
    Math.min(0.28, w * 0.6),
    0.07,
  );
}

/**
 * The pool hall air handling unit, after the Dantherm DanX 3/6 XWPS (a
 * pool unit with a plate heat exchanger and a heat pump, 4135 wide, 1960
 * high, 880 deep, about 1.3 t), in two decks: extract air through the
 * lower, supply through the upper. From the left: the outside and
 * exhaust air dampers, filters, the cross-flow plate heat exchanger
 * spanning both decks, the heat pump (its compressor, evaporator in the
 * extract and condenser in the supply, wringing water out of the hall
 * air and putting its heat back), the LTHW heating coil, and the supply
 * and extract fans. Three access panels are off to show the inside.
 * Ours is Mistral's.
 */
/** How far the unit's end frames stand proud of its casing, metres: clear of the faces that end there. */
const PROUD = 0.003;

export function createPoolHallAhu(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  group.name = 'Pool hall air handling unit';
  const W = 4.135,
    H = 1.96,
    D = 0.88,
    base = 0.12;
  const livery = brandLivery(kit, 'mistral').paint;
  const panel = livery.casing;
  const frame = livery.main;
  const inside = t.paint('#e6e8e8', 0.6, 0.3);
  // The base frame and, section by section, the casing.
  t.box(group, livery.shade, W, base, D, 0, base / 2, 0);
  const sections: [number, boolean][] = [
    [0.45, false], // dampers
    [0.5, true], // filters (open)
    [0.95, true], // plate heat exchanger (open)
    [0.85, true], // heat pump (open)
    [0.5, false], // heating coil
    [0.885, true], // fans (open)
  ];
  let x = -W / 2;
  const mid = base + H / 2;
  const opens: [number, number][] = [];
  for (const [w, open] of sections) {
    const cx = x + w / 2;
    // Back and top always; the front's panels unless this section is open.
    t.box(group, panel, w, H, 0.04, cx, mid, -D / 2 + 0.02);
    t.box(group, panel, w, 0.04, D, cx, base + H - 0.02, 0);
    t.box(group, inside, w, 0.04, D, cx, mid, 0);
    if (open) opens.push([cx, w]);
    else
      for (const y of [base + H * 0.25, base + H * 0.75]) {
        t.box(group, panel, w - 0.02, H / 2 - 0.02, 0.04, cx, y, D / 2 - 0.02);
        t.box(
          group,
          livery.accent,
          0.03,
          0.12,
          0.03,
          cx + w / 2 - 0.08,
          y,
          D / 2 + 0.01,
        );
      }
    // The section's frame profiles; the unit's end one stands proud
    // (`PROUD`), so that the panels, decks and rails ending in its plane
    // do not show through it.
    if (x === -W / 2)
      t.box(
        group,
        frame,
        0.04 + PROUD,
        H,
        D + 0.01,
        x + 0.02 - PROUD / 2,
        mid,
        0,
      );
    else t.box(group, frame, 0.04, H, D + 0.01, x + 0.02, mid, 0);
    x += w;
  }
  t.box(
    group,
    frame,
    0.04 + PROUD,
    H,
    D + 0.01,
    W / 2 - 0.02 + PROUD / 2,
    mid,
    0,
  );
  for (const y of [base + 0.02, base + H - 0.02])
    t.box(group, frame, W, 0.04, D + 0.01, 0, y, 0);
  // Inside the open sections.
  const [flt, hx, hp, fans] = opens;
  for (const y of [base + H * 0.25, base + H * 0.75])
    bagFilters(t, group, flt[0] - flt[1] / 2 + 0.06, y, H / 2 - 0.12, D - 0.12);
  // The plate heat exchanger: a cube of plates set on its edge, across both decks.
  const plates = t.box(
    group,
    t.paint('#b9c0c3', 0.35, 0.7),
    0.95,
    0.95,
    D - 0.15,
    hx[0],
    mid,
    0,
  );
  plates.rotation.z = Math.PI / 4;
  for (let i = -6; i <= 6; i++) {
    const line = t.box(
      group,
      t.paint('#8d9396', 0.4, 0.6),
      1.3,
      0.006,
      D - 0.14,
      hx[0] + i * 0.07,
      mid + i * 0.07,
      0,
    );
    line.rotation.z = Math.PI / 4;
    line.scale.x = Math.max(0.1, 1 - Math.abs(i) / 7);
  }
  // The heat pump: compressor and its pipework below, condenser coil above.
  const copper = t.paint('#b87333', 0.35, 0.8);
  t.cyl(
    group,
    t.paint('#2a2d2f', 0.45),
    0.13,
    0.42,
    hp[0] - 0.12,
    base + 0.3,
    0.1,
    'y',
    24,
  );
  t.rod(
    group,
    copper,
    [hp[0] - 0.12, base + 0.52, 0.1],
    [hp[0] + 0.2, base + 0.52, 0.1],
    0.011,
    8,
  );
  t.rod(
    group,
    copper,
    [hp[0] + 0.2, base + 0.52, 0.1],
    [hp[0] + 0.2, base + H * 0.7, 0.1],
    0.011,
    8,
  );
  coil(
    t,
    group,
    hp[1] - 0.2,
    H / 2 - 0.25,
    [hp[0], base + H * 0.75, -0.05],
    copper,
  );
  coil(
    t,
    group,
    hp[1] - 0.45,
    H / 2 - 0.35,
    [hp[0] + 0.1, base + H * 0.25 + 0.1, -0.15],
    copper,
  );
  // The fans: supply above, extract below.
  plugFan(t, group, 0.56, [fans[0], base + H * 0.75, 0]);
  plugFan(t, group, 0.56, [fans[0], base + H * 0.25 + 0.03, 0]);
  // The LTHW coil's flow and return outside its closed section, with
  // its control valve.
  const green = t.paint(BS1710_BASIC.water, 0.5);
  const coilX = -W / 2 + 0.45 + 0.5 + 0.95 + 0.85 + 0.25;
  for (const y of [base + H - 0.35, base + H - 0.6])
    t.rod(group, green, [coilX, y, D / 2], [coilX, y, D / 2 + 0.25], 0.017, 12);
  t.rod(
    group,
    green,
    [coilX, base + H - 0.35, D / 2 + 0.25],
    [coilX, base + H + 0.6, D / 2 + 0.25],
    0.017,
    12,
  );
  t.rod(
    group,
    green,
    [coilX, base + H - 0.6, D / 2 + 0.25],
    [coilX + 0.15, base + H - 0.6, D / 2 + 0.25],
    0.017,
    12,
  );
  t.rod(
    group,
    green,
    [coilX + 0.15, base + H - 0.6, D / 2 + 0.25],
    [coilX + 0.15, base + H + 0.6, D / 2 + 0.25],
    0.017,
    12,
  );
  t.cyl(
    group,
    t.paint(BS1710_CODE.crimson, 0.6),
    0.019,
    0.06,
    coilX,
    base + H + 0.3,
    D / 2 + 0.25,
    'y',
    12,
  );
  t.box(
    group,
    t.paint('#3a3f45', 0.5),
    0.08,
    0.12,
    0.08,
    coilX + 0.15,
    base + H + 0.1,
    D / 2 + 0.25,
  );
  // The four duct connections on top: outside air and exhaust at the left
  // end, hall extract and supply at the right.
  const top = base + H;
  spigot(t, group, 0.6, 0.6, [-W / 2 + 0.35, top, -0.05], 'OUTSIDE AIR');
  spigot(t, group, 0.6, 0.6, [-W / 2 + 1.05, top, -0.05], 'EXHAUST');
  spigot(t, group, 0.6, 0.6, [W / 2 - 1.05, top, -0.05], 'EXTRACT');
  spigot(t, group, 0.6, 0.6, [W / 2 - 0.35, top, -0.05], 'SUPPLY');
  // The control cabinet on the end, as Menerga and Dantherm hang theirs.
  t.box(group, livery.casing, 0.21, 0.9, 0.48, W / 2 + 0.105, base + 1.0, 0);
  t.box(
    group,
    t.paint('#1d2022', 0.5),
    0.004,
    0.08,
    0.14,
    W / 2 + 0.212,
    base + 1.25,
    0,
  );
  t.box(
    group,
    livery.accent,
    0.03,
    0.06,
    0.06,
    W / 2 + 0.225,
    base + 0.85,
    0.12,
  );
  badge(
    kit,
    group,
    'mistral',
    [-W / 2 + 0.7, base + H * 0.6, D / 2 + 0.002],
    0.08,
  );
  nameplate(
    kit,
    group,
    'mistral',
    [-W / 2 + 0.7, base + H * 0.4, D / 2 + 0.002],
    [
      'POOLMASTER 3/6 PHX',
      '6000 m³/h  dehum. 32 kg/h',
      'heat pump 18 kW  LTHW 40 kW',
    ],
    0.18,
    0.1,
  );
  sign(
    t,
    group,
    'AHU-801  POOL HALL',
    [-W / 2 + 0.7, base + H * 0.85, D / 2 + 0.002],
    0.34,
    0.07,
    { ground: '#f2d23a' },
  );
  sign(t, group, 'FILTERS', [flt[0], base + 0.05, D / 2], 0.18, 0.05);
  sign(
    t,
    group,
    'PLATE HEAT EXCHANGER',
    [hx[0], base + 0.05, D / 2],
    0.34,
    0.05,
  );
  sign(t, group, 'HEAT PUMP', [hp[0], base + 0.05, D / 2], 0.24, 0.05);
  sign(
    t,
    group,
    'SUPPLY FAN / EXTRACT FAN',
    [fans[0], base + 0.05, D / 2],
    0.4,
    0.05,
  );
  return group;
}

/**
 * A rectangular splitter attenuator, 1200 mm long for an 800 × 600 duct,
 * as made by Caice and others (typical proportions, not one maker's
 * drawing): a galvanised casing with flanged ends, and inside, 100 mm
 * splitters of mineral wool behind perforated steel with airways between.
 */
export function createAttenuator(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  group.name = 'Splitter attenuator';
  const galv = t.paint('#b5babb', 0.4, 0.6);
  const flange = t.paint('#9da2a3', 0.45, 0.6);
  const perf = t.paint('#d3d6d6', 0.6, 0.4);
  const L = 1.2,
    w = 0.8,
    h = 0.6,
    y = 0.75;
  // A cut-away: the top and the near side left off.
  t.box(group, galv, L, 0.004, w, 0, y - h / 2, 0);
  t.box(group, galv, L, h, 0.004, 0, y, -w / 2);
  for (const x of [-L / 2, L / 2]) {
    t.box(group, flange, 0.03, h + 0.06, 0.03, x, y, w / 2);
    t.box(group, flange, 0.03, h + 0.06, 0.03, x, y, -w / 2);
    t.box(group, flange, 0.03, 0.03, w + 0.06, x, y + h / 2, 0);
    t.box(group, flange, 0.03, 0.03, w + 0.06, x, y - h / 2, 0);
  }
  for (const z of [-0.25, 0, 0.25])
    t.box(group, perf, L - 0.06, h - 0.01, 0.1, 0, y, z);
  for (const x of [-0.4, 0.4])
    t.box(
      group,
      t.paint(FINISH.galvanised, 0.45, 0.6),
      0.04,
      y - h / 2,
      0.04,
      x,
      (y - h / 2) / 2,
      0,
    );
  sign(
    t,
    group,
    'Airways between 100 mm splitters',
    [0, y + h / 2 + 0.1, w / 2],
    0.4,
    0.05,
  );
  return group;
}

/**
 * The changing area's extract fan, after the Systemair MUB 062 630D4
 * insulated "multibox" fan (about a 720 mm square casing, by its 718 mm
 * outlet adapter, 630 mm round connections, about 137 kg; its length is
 * estimated): a double-skinned box on anti-vibration mounts, a
 * backward-curved wheel inside, an access door, and a local isolator.
 * Ours is Bonk's.
 */
export function createExtractFan(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  group.name = 'Extract fan';
  const S = 0.72,
    L = 1.0,
    y = 0.55;
  const bonk = brandLivery(kit, 'bonk-industries').paint;
  const casing = bonk.casing;
  const dark = t.paint('#2e3236', 0.6);
  // Stand and anti-vibration mounts.
  t.box(group, bonk.shade, L, 0.05, S, 0, 0.025, 0);
  for (const x of [-L / 2 + 0.1, L / 2 - 0.1])
    for (const z of [-S / 2 + 0.08, S / 2 - 0.08])
      t.cyl(group, dark, 0.035, 0.06, x, 0.08, z, 'y', 12);
  t.box(group, casing, L, S, S, 0, y + 0.02, 0);
  // Round spigots both ends, flexible connections.
  for (const side of [-1, 1]) {
    t.cyl(
      group,
      casing,
      0.315,
      0.08,
      side * (L / 2 + 0.04),
      y + 0.02,
      0,
      'x',
      32,
    );
    t.cyl(group, dark, 0.32, 0.1, side * (L / 2 + 0.13), y + 0.02, 0, 'x', 32);
  }
  // Access door, handles, isolator.
  t.box(group, bonk.main, L - 0.2, S - 0.15, 0.01, 0, y + 0.02, S / 2 + 0.005);
  for (const x of [-0.3, 0.3])
    t.box(group, bonk.accent, 0.06, 0.03, 0.03, x, y + 0.02, S / 2 + 0.02);
  t.box(
    group,
    t.paint('#e5c43a', 0.45),
    0.08,
    0.1,
    0.06,
    L / 2 - 0.08,
    y + S / 2 + 0.07,
    S / 2 - 0.1,
  );
  t.box(
    group,
    t.paint('#c42b23', 0.45),
    0.02,
    0.07,
    0.03,
    L / 2 - 0.08,
    y + S / 2 + 0.07,
    S / 2 - 0.06,
  );
  badge(kit, group, 'bonk-industries', [-0.2, y + 0.22, S / 2 + 0.012], 0.04);
  nameplate(
    kit,
    group,
    'bonk-industries',
    [0.2, y + 0.22, S / 2 + 0.012],
    ['MULTIBOX 062 630D4', '400 V 3~ 2.2 kW  1430 rpm', '2.4 m³/s'],
    0.15,
    0.07,
  );
  sign(
    t,
    group,
    'EF-811  CHANGING EXTRACT',
    [0, y + S / 2 + 0.2, 0],
    0.3,
    0.06,
    { ground: '#f2d23a' },
  );
  return group;
}

/**
 * A weather louvre for an outside wall, after the Gilberts WG75: 75 mm
 * pitch blades at 45° in a 100 mm deep flanged frame, a bird mesh
 * behind, as the AHU's outside air intake and exhaust. Wall-mounted:
 * `w` × `h`, its front to +z.
 */
export function createWeatherLouvre(kit: PanelKit, w = 1.5, h = 1.0) {
  const t = plantTools(kit);
  const group = new Group();
  group.name = 'Weather louvre';
  const alu = t.paint('#a7adb0', 0.4, 0.6);
  const depth = 0.1;
  // The flanged frame.
  t.box(group, alu, w + 0.046, 0.023, depth + 0.02, 0, h / 2, depth / 2);
  t.box(group, alu, w + 0.046, 0.023, depth + 0.02, 0, -h / 2, depth / 2);
  t.box(group, alu, 0.023, h, depth + 0.02, -w / 2, 0, depth / 2);
  t.box(group, alu, 0.023, h, depth + 0.02, w / 2, 0, depth / 2);
  // The dark mesh and opening behind the blades.
  t.box(group, t.paint('#1d2022', 0.8), w, h, 0.004, 0, 0, 0.01);
  for (let y = -h / 2 + 0.06; y < h / 2 - 0.03; y += 0.075) {
    const blade = t.box(
      group,
      alu,
      w - 0.01,
      0.002 + 0.1,
      0.004,
      0,
      y,
      depth / 2,
    );
    blade.rotation.x = -Math.PI / 4;
  }
  sign(
    t,
    group,
    '75 mm pitch weather louvre',
    [0, -h / 2 - 0.1, depth],
    0.34,
    0.05,
  );
  return group;
}
