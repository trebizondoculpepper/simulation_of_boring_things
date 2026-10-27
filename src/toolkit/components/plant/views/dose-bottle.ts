import { CylinderGeometry, Group } from 'three';
import type { Mesh, PlaneGeometry } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { plantTools } from './plant-tools';
import { createDoseCellHead, DOSE_CELL_HEAD } from './dose-cell-head';
import { createChemicalLabel } from './chemicals-signs';
import { bottleBund, bottleSize } from '../../../../game/plant/dose-bottle';
import { bottleReadout } from '../../../../game/plant/dose-bottle';
import type { DoseBottle } from '../../../../game/plant/dose-bottle';

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

  // The spill pallet: a square sump holding 110% of the bottle under a
  // grid deck, the bottle standing on the deck; its rim banded in the
  // chemical's colour (hypochlorite yellow, acid red), its capacity on it.
  const tray = t.paint('#202223', 0.8);
  const colour = t.paint(acid ? '#b92b24' : '#d2ae20', 0.5);
  const { side, sump } = bottleBund(litres);
  const wall = 0.02;
  const rimHeight = Math.min(0.025, sump / 2);
  const wallHeight = sump - rimHeight;
  t.box(group, tray, side, 0.02, side, 0, 0.01, 0);
  for (const [w, dd, x, z] of [
    [side, wall, 0, side / 2 - wall / 2],
    [side, wall, 0, -side / 2 + wall / 2],
    [wall, side, side / 2 - wall / 2, 0],
    [wall, side, -side / 2 + wall / 2, 0],
  ] as const) {
    t.box(group, tray, w, wallHeight, dd, x, wallHeight / 2, z);
  }
  // A separate cap above the black walls, with a 1 mm overhang on each
  // face. The side pieces fit between the front and back: neither the
  // wall tops nor the neighbouring coloured caps share a visible face.
  const rimSide = side + 0.002;
  const rimWall = wall + 0.002;
  const rimOffset = (rimSide - rimWall) / 2;
  for (const sign of [-1, 1]) {
    t.box(
      group,
      colour,
      rimSide,
      rimHeight,
      rimWall,
      0,
      sump - rimHeight / 2,
      sign * rimOffset,
    );
    t.box(
      group,
      colour,
      rimWall,
      rimHeight,
      rimSide - 2 * rimWall,
      sign * rimOffset,
      sump - rimHeight / 2,
      0,
    );
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

  // The DoseCell head on the lid, toward the front.
  const { w: hw, h: hh, d: hd } = DOSE_CELL_HEAD;
  const hz = Math.min(0, r - hd / 2 - 0.01);
  const headY = top + hh / 2;
  const cell = createDoseCellHead(kit, { tag, acid });
  cell.object.position.set(0, top, hz);
  group.add(cell.object);

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

  const tx = -hw / 2;
  // Its dosing tube is the room's, from the head's discharge gland.
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

  return {
    object: group,
    /** Where its fill stub ends, for the transfer line. */
    fillAt: [fillX, top + 0.16, fillZ] as const,
    /** Its head's discharge gland, facing out to its left (−x): the dosing tube's start. */
    dosingAt: [tx - 0.016, headY, hz] as const,
    /** Where its power lead reaches the floor. */
    powerAt: [0.06, 0.03, -r - 0.02] as const,
    /** Its footprint's radius, its tray's. */
    radius: trayR,
    /** Shows the bottle `b`'s state on its head. */
    parts: cell.parts,
    show: (b: DoseBottle, powered = true, delta = 0) =>
      cell.show(bottleReadout(b, powered), b, delta),
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
