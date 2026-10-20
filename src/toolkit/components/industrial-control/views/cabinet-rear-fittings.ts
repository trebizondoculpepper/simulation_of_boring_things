import {
  BoxGeometry,
  ExtrudeGeometry,
  Shape,
  Path,
  CatmullRomCurve3,
  CylinderGeometry,
  Group,
  Mesh,
  TubeGeometry,
  Vector3,
} from 'three';
import type { Material } from 'three';
import { createMicroLabel, kitPaint } from '../../core/views/eighties-controls';
import type { PanelKit } from '../../core/views/eighties-controls';

const palettes = new WeakMap<PanelKit, Map<string, Material>>();
export function cabinetRearPaint(kit: PanelKit, colour: string) {
  let palette = palettes.get(kit);
  if (!palette) palettes.set(kit, (palette = new Map()));
  let material = palette.get(colour);
  if (!material) palette.set(colour, (material = kitPaint(kit, colour)));
  return material;
}

const box = (
  group: Group,
  material: Material,
  w: number,
  h: number,
  d: number,
  x = 0,
  y = 0,
  z = 0,
) => {
  const mesh = new Mesh(new BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
};

/** Folded sheet panel, positive Z facing out; Rittal rear-sheet reference. */
export function createCabinetRearPanel(
  kit: PanelKit,
  width: number,
  height: number,
  paint: Material,
  fixed = true,
) {
  const group = new Group();
  group.name = fixed ? 'Bolted rear panel' : 'Folded rear service leaf';
  box(group, paint, width, height, fixed ? 0.0015 : 0.002);
  const gasket = cabinetRearPaint(kit, '#303632');
  for (const x of [-width / 2 + 0.007, width / 2 - 0.007]) {
    box(group, paint, 0.012, height - 0.006, 0.018, x, 0, -0.009);
    box(group, gasket, 0.003, height - 0.014, 0.002, x, 0, -0.019);
  }
  for (const y of [-height / 2 + 0.007, height / 2 - 0.007])
    box(group, paint, width - 0.012, 0.012, 0.018, 0, y, -0.009);
  if (fixed)
    for (const x of [-width / 2 + 0.025, width / 2 - 0.025])
      for (const y of [-height / 2 + 0.025, height / 2 - 0.025]) {
        const screw = new Mesh(
          new CylinderGeometry(0.0035, 0.0035, 0.002, 8),
          cabinetRearPaint(kit, '#a1a5a1'),
        );
        screw.rotation.x = Math.PI / 2;
        screw.position.set(x, y, 0.002);
        group.add(screw);
        box(group, gasket, 0.004, 0.0007, 0.0003, x, y, 0.0032);
      }
  return group;
}

/** Phoenix CD 60×40 duct: closed lid, 60 mm face, 40 mm installed depth. */
export function createCabinetDuct(kit: PanelKit, length: number) {
  const group = new Group();
  group.name = 'CD 60x40 covered wiring duct';
  const grey = cabinetRearPaint(kit, '#bfc1b6');
  box(group, grey, 0.06, length, 0.04, 0, 0, 0.02);
  for (const x of [-0.027, 0.027])
    box(
      group,
      cabinetRearPaint(kit, '#7e847a'),
      0.001,
      length - 0.004,
      0.001,
      x,
      0,
      0.0407,
    );
  for (let y = -length / 2 + 0.014; y < length / 2; y += 0.025)
    for (const x of [-0.0301, 0.0301])
      box(
        group,
        cabinetRearPaint(kit, '#737b72'),
        0.0005,
        0.009,
        0.022,
        x,
        y,
        0.015,
      );
  return group;
}

/** Rittal SK 3237.100-sized filtered grille, 116.5 mm square / 43 mm deep. */
export function createCabinetFilter(kit: PanelKit) {
  const group = new Group();
  group.name = '116.5 mm guarded fan filter';
  const trim = cabinetRearPaint(kit, '#aeb4b0');
  box(
    group,
    cabinetRearPaint(kit, '#383d39'),
    0.092,
    0.092,
    0.043,
    0,
    0,
    -0.018,
  );
  box(
    group,
    cabinetRearPaint(kit, '#656c62'),
    0.104,
    0.104,
    0.002,
    0,
    0,
    0.004,
  );
  for (const x of [-0.055, 0.055])
    box(group, trim, 0.0065, 0.1165, 0.008, x, 0, 0.004);
  for (const y of [-0.055, 0.055])
    box(group, trim, 0.104, 0.0065, 0.008, 0, y, 0.004);
  for (let i = 0; i < 9; i++)
    box(group, trim, 0.104, 0.004, 0.008, 0, -0.044 + i * 0.011, 0.009);
  return group;
}

/** Blanked segmented gland plate; no unsupported cables to imaginary loads. */
export function createCabinetEntryPlate(
  kit: PanelKit,
  width: number,
  label: string,
) {
  const group = new Group();
  group.name = `${label} gland plate`;
  box(group, cabinetRearPaint(kit, '#aab0aa'), width, 0.075, 0.002);
  for (const x of [-width * 0.3, 0, width * 0.3]) {
    const blank = new Mesh(
      new CylinderGeometry(0.01, 0.01, 0.004, 12),
      cabinetRearPaint(kit, '#424943'),
    );
    blank.name =
      x === 0
        ? 'Centre entry blank'
        : x > 0
          ? 'Right entry blank'
          : 'Left entry blank';
    blank.rotation.x = Math.PI / 2;
    blank.position.set(x, 0.006, 0.003);
    group.add(blank);
  }
  const text = createMicroLabel(kit, label, {
    height: 0.004,
    ink: '#202a28',
    maxWidth: width - 0.01,
  });
  text.position.set(0, -0.022, 0.0015);
  group.add(text);
  return group;
}

/** Flexible bonding lead; both endpoints follow the real chassis/leaf studs. */
export function createBondingLead(kit: PanelKit, from: Vector3, to: Vector3) {
  const group = new Group();
  group.name = 'Protective bonding lead';
  const middle = from.clone().lerp(to, 0.5);
  middle.y -= 0.055;
  middle.z += 0.025;
  const curve = new CatmullRomCurve3([from, middle, to]);
  group.add(
    new Mesh(
      new TubeGeometry(curve, 12, 0.0025, 5, false),
      cabinetRearPaint(kit, '#cfba3c'),
    ),
  );
  const stripe = new Mesh(
    new TubeGeometry(curve, 12, 0.0011, 4, false),
    cabinetRearPaint(kit, '#347a43'),
  );
  stripe.position.z = 0.0022;
  group.add(stripe);
  for (const point of [from, to]) {
    const lug = new Mesh(
      new CylinderGeometry(0.005, 0.005, 0.003, 8),
      cabinetRearPaint(kit, '#a9a277'),
    );
    lug.rotation.x = Math.PI / 2;
    lug.position.copy(point);
    group.add(lug);
  }
  return group;
}

/** A real sheet opening and rubber edge trim for each supported control loom. */
export function createCablePartition(
  kit: PanelKit,
  width: number,
  height: number,
  holes: readonly { x: number; y: number }[],
  material: Material,
) {
  const group = new Group();
  group.name = 'Grommeted wireway partition';
  const shape = new Shape();
  shape.moveTo(-width / 2, -height / 2);
  shape.lineTo(width / 2, -height / 2);
  shape.lineTo(width / 2, height / 2);
  shape.lineTo(-width / 2, height / 2);
  shape.closePath();
  for (const { x, y } of holes) {
    const hole = new Path();
    hole.moveTo(x - 0.016, y - 0.012);
    hole.lineTo(x - 0.016, y + 0.012);
    hole.lineTo(x + 0.016, y + 0.012);
    hole.lineTo(x + 0.016, y - 0.012);
    hole.closePath();
    shape.holes.push(hole);
    const trim = cabinetRearPaint(kit, '#333e3a');
    for (const dx of [-0.017, 0.017])
      box(group, trim, 0.004, 0.03, 0.014, x + dx, y);
    for (const dy of [-0.013, 0.013])
      box(group, trim, 0.032, 0.004, 0.014, x, y + dy);
  }
  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.012,
    bevelEnabled: false,
  });
  geometry.translate(0, 0, -0.006);
  group.add(new Mesh(geometry, material));
  return group;
}
