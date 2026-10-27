import { CylinderGeometry, Group, MeshStandardMaterial } from 'three';
import type { Mesh, PlaneGeometry } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { plantTools } from './plant-tools';
import { chlorellaPlate } from './chlorella-plate';
import { createChemicalLabel } from './chemicals-signs';
import { bottleBund, bottleSize } from '../../../../game/plant/dose-bottle';
import type { bottleReadout } from '../../../../game/plant/dose-bottle';

type Readout = ReturnType<typeof bottleReadout>;

/**
 * A dose bottle (`game/plant/dose-bottle.ts`): Chlorella's DoseCell, an
 * idealised self-contained day tank. A round black HDPE bottle, about 1.4
 * times as tall as wide, in a moulded spill tray; on its lid one powered
 * head, the same for every size, holding its ultrasonic sensor (its
 * transducer looking down through the lid), its high and low switches, its
 * motorised dosing pump (the motor's dome on top) and a small LCD of its
 * litres with HIGH, LOW, CALL and PUMP lamps. Beside the head: the fill
 * socket where the transfer line comes in, the vented cap (through a
 * small carbon cartridge on an acid bottle), the dosing tube out of the
 * pump, and the head's power cable down to the floor.
 *
 * Metres, its middle at the origin, the floor at y = 0, its front (the
 * display) toward +z.
 */
export function createDoseBottle(
  kit: PanelKit,
  {
    tag,
    product,
    litres,
    acid,
  }: { tag: string; product: string; litres: number; acid: boolean },
) {
  const group = new Group();
  const t = plantTools(kit);
  const f = tools(kit);
  const { d, h } = bottleSize(litres);
  const r = d / 2;
  const hdpe = t.paint('#1c1e1f', 0.78);
  // The bottle's moulded body: black but glossy, so its highlights show its shape.
  const body = t.paint('#1f2224', 0.18, 0.1);
  const dark = t.paint('#2a2f31', 0.6);
  const pvc = t.paint('#5a5f63', 0.55);
  const head = t.paint('#c9ccc8', 0.55);

  // The spill pallet: a square sump holding 110% of the bottle under a
  // grid deck, the bottle standing on the deck; its rim banded in the
  // chemical's colour (hypochlorite yellow, acid red), its capacity on it.
  const tray = t.paint('#202223', 0.8);
  const colour = t.paint(acid ? '#b92b24' : '#d2ae20', 0.5);
  const { side, sump } = bottleBund(litres);
  const wall = 0.02;
  t.box(group, tray, side, 0.02, side, 0, 0.01, 0);
  for (const [w, dd, x, z] of [
    [side, wall, 0, side / 2 - wall / 2],
    [side, wall, 0, -side / 2 + wall / 2],
    [wall, side, side / 2 - wall / 2, 0],
    [wall, side, -side / 2 + wall / 2, 0],
  ] as const) {
    t.box(group, tray, w, sump, dd, x, sump / 2, z);
    t.box(group, colour, w + 0.002, 0.025, dd + 0.002, x, sump - 0.0125, z);
  }
  for (let i = 0; i < 6; i++)
    t.box(
      group,
      dark,
      side - 2 * wall,
      0.015,
      0.012,
      0,
      sump - 0.01,
      -side / 2 + ((i + 0.5) * side) / 6,
    );
  f.label(
    group,
    `BUND ${Math.ceil((litres * 1.1) / 5) * 5} L`,
    0,
    sump * 0.45,
    side / 2 + 0.002,
    Math.min(0.03, sump * 0.3),
    '#ffffff',
    '#202223',
  );
  const trayR = side / 2;
  const base = sump;

  // The bottle: its body, a moulded shoulder and its lid's neck.
  const top = base + h;
  t.cyl(group, body, r, h - 0.04, 0, base + (h - 0.04) / 2, 0, 'y', 48);
  t.cyl(group, body, r * 0.93, 0.04, 0, top - 0.02, 0, 'y', 40);
  for (const y of [base + h * 0.3, base + h * 0.65])
    t.cyl(group, body, r + 0.006, 0.02, 0, y, 0, 'y', 48);

  // The head: a grey moulded housing on the lid, the motor's dome on it.
  const hw = 0.2;
  const hh = 0.12;
  const hd = 0.15;
  const hz = Math.min(0, r - hd / 2 - 0.01);
  const headY = top + hh / 2;
  t.box(group, colour, hw + 0.002, 0.016, hd + 0.002, 0, top + hh - 0.012, hz);
  t.box(group, head, hw, hh, hd, 0, headY, hz);
  t.cyl(
    group,
    t.paint('#3e4a57', 0.45, 0.3),
    0.045,
    0.07,
    -0.04,
    top + hh + 0.035,
    hz - 0.02,
    'y',
    24,
  );
  t.cyl(group, dark, 0.048, 0.012, -0.04, top + hh + 0.007, hz - 0.02, 'y', 24);
  f.label(
    group,
    'PUMP',
    -0.04,
    top + hh + 0.072,
    hz - 0.02,
    0.014,
    '#d8dde0',
  ).rotation.x = -Math.PI / 2;

  // Its display: litres and a bar, on the head's front.
  const face = f.printed(0.13, 0.06, () => {}, 256, true);
  face.mesh.position.set(-0.02, headY + 0.008, hz + hd / 2 + 0.001);
  face.mesh.userData.live = true;
  group.add(face.mesh);
  let shown = '';
  const draw = (o: Readout) => {
    const key = o.powered ? `${Math.round((o.litres ?? 0) * 10)}` : 'off';
    if (key === shown) return;
    shown = key;
    const c = face.context;
    const w = c.canvas.width;
    const ch = c.canvas.height;
    c.fillStyle = o.powered ? '#a9c49a' : '#3a4236';
    c.fillRect(0, 0, w, ch);
    if (!o.powered) {
      face.texture.needsUpdate = true;
      return;
    }
    c.fillStyle = '#1d2618';
    c.font = 'bold 15px sans-serif';
    c.fillText(tag, 8, 18);
    c.font = 'bold 54px monospace';
    c.textAlign = 'right';
    c.fillText((o.litres ?? 0).toFixed(o.litres! < 100 ? 1 : 0), w - 34, 76);
    c.font = 'bold 22px sans-serif';
    c.fillText('L', w - 8, 76);
    c.textAlign = 'left';
    c.strokeStyle = '#1d2618';
    c.lineWidth = 2;
    c.strokeRect(8, ch - 30, w - 16, 18);
    c.fillStyle = '#1d2618';
    c.fillRect(10, ch - 28, (w - 20) * Math.max(0, Math.min(1, o.level)), 14);
    face.texture.needsUpdate = true;
  };

  // Its lamps beside the display: HIGH, LOW, CALL, PUMP.
  const lamps = (
    [
      ['HI', '#ff4a2e'],
      ['LO', '#ffb21c'],
      ['CALL', '#4aa8ff'],
      ['PUMP', '#3ee05a'],
    ] as const
  ).map(([name, colour], i) => {
    const mat = new MeshStandardMaterial({
      color: '#2b2f2e',
      emissive: colour,
      emissiveIntensity: 0,
      roughness: 0.4,
    });
    kit.materials.push(mat);
    const y = headY + 0.03 - i * 0.014;
    const lamp = t.cyl(
      group,
      mat,
      0.0035,
      0.004,
      0.07,
      y,
      hz + hd / 2 + 0.003,
      'z',
      12,
    );
    lamp.userData.live = true;
    f.label(group, name, 0.084, y, hz + hd / 2 + 0.001, 0.0055, '#1b1b1b');
    return { mat, colour };
  });
  // What it is on its front, under the display; whose it is on its side.
  f.label(
    group,
    'DOSECELL',
    -0.02,
    headY - 0.046,
    hz + hd / 2 + 0.001,
    0.011,
    '#2a2f31',
  );
  const plate = chlorellaPlate(kit, hd * 0.85, 'CHEMICAL HANDLING');
  plate.position.set(hw / 2 + 0.001, headY, hz);
  plate.rotation.y = Math.PI / 2;
  group.add(plate);

  // The fill socket, its stub turned up for the transfer line to meet.
  const fillX = Math.max(hw / 2 + 0.035, r * 0.55);
  const fillZ = -Math.min(r * 0.45, 0.06);
  t.cyl(group, hdpe, 0.03, 0.03, fillX, top + 0.015, fillZ, 'y', 16);
  t.cyl(group, pvc, 0.022, 0.025, fillX, top + 0.04, fillZ, 'y', 6);
  t.rod(
    group,
    pvc,
    [fillX, top + 0.05, fillZ],
    [fillX, top + 0.16, fillZ],
    0.012,
    10,
  );
  f.label(group, 'FILL', fillX, top + 0.18, fillZ, 0.016, '#ffffff', '#2a2f31');

  // The vented cap: a small mushroom, through a carbon cartridge on acid.
  const ventX = -Math.max(hw / 2 + 0.035, r * 0.55);
  t.cyl(group, hdpe, 0.025, 0.03, ventX, top + 0.015, fillZ, 'y', 16);
  if (acid) {
    t.cyl(
      group,
      t.paint('#3b6a4a', 0.6),
      0.022,
      0.09,
      ventX,
      top + 0.075,
      fillZ,
      'y',
      16,
    );
    t.cyl(group, dark, 0.03, 0.012, ventX, top + 0.126, fillZ, 'y', 16);
  } else {
    t.cyl(group, dark, 0.012, 0.03, ventX, top + 0.045, fillZ, 'y', 10);
    t.cyl(group, dark, 0.03, 0.014, ventX, top + 0.065, fillZ, 'y', 16);
  }
  f.label(
    group,
    'VENT',
    ventX,
    top + (acid ? 0.15 : 0.09),
    fillZ,
    0.014,
    '#ffffff',
    '#2a2f31',
  );

  // The dosing tube from the pump, out of the head's side and down to the tray's edge.
  const tube = t.paint('#e8e6dc', 0.5);
  const tx = -hw / 2;
  t.rod(group, tube, [tx, headY, hz], [tx - 0.05, headY, hz], 0.004, 6);
  t.rod(
    group,
    tube,
    [tx - 0.05, headY, hz],
    [-r - 0.03, headY - 0.05, hz],
    0.004,
    6,
  );
  t.rod(
    group,
    tube,
    [-r - 0.03, headY - 0.05, hz],
    [-r - 0.03, 0.12, hz],
    0.004,
    6,
  );
  // The power cable: from the head's back down the bottle to the floor.
  t.rod(
    group,
    dark,
    [0.06, headY, hz - hd / 2],
    [0.06, headY, -r - 0.02],
    0.005,
    6,
  );
  t.rod(
    group,
    dark,
    [0.06, headY, -r - 0.02],
    [0.06, 0.03, -r - 0.02],
    0.005,
    6,
  );

  // Its product label on the front, its tag above it.
  const lw = Math.min(0.3, d * 0.7);
  const hazard = createChemicalLabel(t, lw, lw * 0.72, product, acid);
  hazard.position.set(0, base + h * 0.45, 0);
  group.add(wrapOnBottle(hazard, r + 0.002));
  const tagLabel = f.label(
    group,
    tag,
    0,
    base + h * 0.45 + lw * 0.36 + 0.03,
    0,
    Math.min(0.04, d * 0.12),
    '#ffffff',
    '#2a2f31',
  );
  wrapOnBottle(tagLabel, r + 0.002);

  draw({
    powered: true,
    litres: 0,
    level: 0,
    high: false,
    low: false,
    calling: false,
    pumping: false,
  });
  return {
    object: group,
    /** Where its fill stub ends, for the transfer line. */
    fillAt: [fillX, top + 0.16, fillZ] as const,
    /** Its footprint's radius, its tray's. */
    radius: trayR,
    show(o: Readout) {
      draw(o);
      const on = [o.high, o.low, o.calling, o.pumping];
      lamps.forEach((l, i) => (l.mat.emissiveIntensity = on[i] ? 1.6 : 0));
    },
  };
}

/**
 * A flat printed label (a plane `width` × `height`) wrapped round the
 * bottle at radius `r`, centred on its front (+z): the same texture on an
 * arc of the cylinder, so it lies on the surface rather than standing off
 * it. Keeps its height; its x and z are the bottle's axis.
 */
function wrapOnBottle(mesh: Mesh, r: number): Mesh {
  const { width, height } = (mesh.geometry as PlaneGeometry).parameters;
  const arc = Math.min(Math.PI * 1.6, width / r);
  mesh.geometry.dispose();
  mesh.geometry = new CylinderGeometry(
    r,
    r,
    height,
    32,
    1,
    true,
    -arc / 2,
    arc,
  );
  mesh.position.x = 0;
  mesh.position.z = 0;
  return mesh;
}
