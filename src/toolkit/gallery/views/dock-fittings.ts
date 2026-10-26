import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SRGBColorSpace,
} from 'three';
import type { Material } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { markComponent } from '../../components/core/views/component-identity';
import type { ShellAperture } from '../logic/shell-rooms';
import type { Footprint } from '../../controls/logic/walk-collision';

/**
 * The loading dock's fittings, rough (prompt 073; the owner, 2026-10-26:
 * blocking-out components to scope the space, refined later): at each
 * lorry opening an insulated roller shutter, rolled up and fixed (its
 * barrel box, guides, bottom rail, motor and hand chain; working in 075),
 * a dock leveller in the floor, buffers and a dock shelter outside; the
 * pier's personnel door, shut (opened onto the yard in 080); and pallets
 * of deliveries waiting to be put away, by the doors into the building
 * (set decoration). Metres, the dock's middle at the origin, its floor at
 * y = 0, its outside wall's inside face at z = `wallZ` (north).
 */

/** Deliveries waiting: each stack's place, its goods' colour, its height and label. */
export const DOCK_PALLETS: readonly {
  x: number;
  z: number;
  colour: string;
  h: number;
  label: string;
}[] = [
  { x: -6.2, z: 4.6, colour: '#3d7fb8', h: 1.3, label: 'CLEANING SUPPLIES' },
  { x: -6.2, z: 3.2, colour: '#c9b48a', h: 1.1, label: 'CATERING · CAFÉ' },
  {
    x: -4.8,
    z: 4.6,
    colour: '#e9e6dc',
    h: 1.5,
    label: 'PAPER TOWELS · TOILET ROLL',
  },
  {
    x: 6.2,
    z: 4.6,
    colour: '#8a8f94',
    h: 1.0,
    label: 'FITTINGS · PLUMBING SPARES',
  },
  { x: 6.2, z: 3.2, colour: '#2f6f9e', h: 0.9, label: 'LANE ROPES' },
];
const PALLET = { w: 1.2, d: 1.0, h: 0.144 };

/** What the pallets stand in the way of. */
export const dockPalletSolids = (): Footprint[] =>
  DOCK_PALLETS.map((p) => ({
    minX: p.x - PALLET.w / 2,
    maxX: p.x + PALLET.w / 2,
    minZ: p.z - PALLET.d / 2,
    maxZ: p.z + PALLET.d / 2,
  }));

export function createDockFittings(
  kit: PanelKit,
  {
    wallZ,
    thickness,
    apertures,
  }: { wallZ: number; thickness: number; apertures: readonly ShellAperture[] },
) {
  const group = new Group();
  group.name = 'loading dock fittings';
  const paint = (color: string, roughness = 0.7, metalness = 0) => {
    const m = new MeshStandardMaterial({ color, roughness, metalness });
    kit.materials.push(m);
    return m;
  };
  const box = (
    parent: Group,
    m: Material,
    sx: number,
    sy: number,
    sz: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const mesh = new Mesh(new BoxGeometry(sx, sy, sz), m);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const shutterGrey = paint('#8f969b', 0.55, 0.4);
  const galv = paint('#a9aeae', 0.45, 0.6);
  const motorBlue = paint('#2c4f7c', 0.5, 0.3);
  const chain = paint('#4a4d50', 0.5, 0.7);
  const plate = paint('#6e7275', 0.6, 0.6);
  const yellow = paint('#d8b41c', 0.6);
  const rubber = paint('#161718', 0.9);
  const shelterGrey = paint('#2a2c2e', 0.95);
  const outer = wallZ - thickness;

  apertures.forEach((o, i) => {
    // The roller shutter, rolled up: its barrel box over the opening on the
    // inside face, guides each side, the bottom rail showing under the box,
    // its motor on the right-hand end plate, the hand chain hanging down.
    const shutter = new Group();
    shutter.name = `Roller shutter, bay ${i + 1}`;
    const top = o.h + 0.25;
    box(
      shutter,
      shutterGrey,
      o.w + 0.5,
      0.65,
      0.65,
      o.at,
      top + 0.35,
      wallZ + 0.33,
    );
    for (const s of [-1, 1]) {
      box(
        shutter,
        galv,
        0.1,
        o.h + 0.6,
        0.14,
        o.at + s * (o.w / 2 + 0.07),
        (o.h + 0.6) / 2,
        wallZ + 0.07,
      );
      box(
        shutter,
        galv,
        0.04,
        0.75,
        0.75,
        o.at + s * (o.w / 2 + 0.27),
        top + 0.35,
        wallZ + 0.33,
      );
    }
    box(shutter, galv, o.w, 0.1, 0.08, o.at, o.h - 0.05, wallZ + 0.1);
    const motor = new Mesh(
      new CylinderGeometry(0.13, 0.13, 0.35, 16),
      motorBlue,
    );
    motor.rotation.z = Math.PI / 2;
    motor.position.set(o.at + o.w / 2 + 0.47, top + 0.35, wallZ + 0.33);
    shutter.add(motor);
    box(
      shutter,
      chain,
      0.02,
      top - 1.2,
      0.02,
      o.at + o.w / 2 + 0.47,
      (top + 1.2) / 2,
      wallZ + 0.42,
    );
    box(
      shutter,
      chain,
      0.02,
      top - 1.2,
      0.02,
      o.at + o.w / 2 + 0.47,
      (top + 1.2) / 2,
      wallZ + 0.5,
    );
    group.add(shutter);

    // The dock leveller: a steel deck in the floor at the opening, its
    // pit's yellow edge, its lip folded down over the dock's face.
    const leveller = new Group();
    leveller.name = `Dock leveller, bay ${i + 1}`;
    const lw = Math.min(2.0, o.w - 0.6);
    const ld = 2.5;
    box(leveller, plate, lw, 0.02, ld, o.at, 0.01, wallZ + ld / 2);
    for (const s of [-1, 1])
      box(
        leveller,
        yellow,
        0.08,
        0.021,
        ld,
        o.at + s * (lw / 2 + 0.04),
        0.0105,
        wallZ + ld / 2,
      );
    box(leveller, plate, lw, 0.4, 0.02, o.at, -0.2, outer - 0.01);
    group.add(leveller);

    // Outside: two rubber buffers on the dock's face, and the dock shelter
    // round the opening on the outside wall.
    const outside = new Group();
    outside.name = `Dock buffers and shelter, bay ${i + 1}`;
    for (const s of [-1, 1])
      box(
        outside,
        rubber,
        0.25,
        0.45,
        0.1,
        o.at + s * (lw / 2 + 0.35),
        -0.3,
        outer - 0.05,
      );
    for (const s of [-1, 1])
      box(
        outside,
        shelterGrey,
        0.3,
        o.h + 0.4,
        0.5,
        o.at + s * (o.w / 2 + 0.15),
        (o.h + 0.4) / 2 + 0.05,
        outer - 0.25,
      );
    box(
      outside,
      shelterGrey,
      o.w + 0.6,
      0.6,
      0.5,
      o.at,
      o.h + 0.5,
      outer - 0.25,
    );
    group.add(outside);
  });

  // The pier's personnel door, shut, on its inside face.
  {
    const door = new Group();
    door.name = 'Pier door to the goods yard';
    const piers = [...apertures].sort((a, b) => a.at - b.at);
    const x = piers.length === 2 ? (piers[0].at + piers[1].at) / 2 : 0;
    box(door, galv, 1.1, 2.15, 0.05, x, 1.075, wallZ + 0.025);
    box(
      door,
      paint('#5d6a72', 0.6, 0.3),
      0.93,
      2.05,
      0.04,
      x,
      1.04,
      wallZ + 0.05,
    );
    box(door, galv, 0.4, 0.04, 0.04, x - 0.2, 1.05, wallZ + 0.09);
    // Its lintel, bearing 0.15 m into the pier either side.
    box(
      door,
      paint('#b5b2a8', 0.9),
      1.4,
      0.2,
      thickness + 0.02,
      x,
      2.25,
      wallZ - thickness / 2,
    );
    group.add(door);
  }

  // Pallets of deliveries, set decoration: a pallet, its goods
  // shrink-wrapped, a label on the front.
  const timber = paint('#a07c52', 0.9);
  const pallets = new Group();
  pallets.name = 'Deliveries waiting to be put away';
  for (const p of DOCK_PALLETS) {
    const stack = new Group();
    stack.position.set(p.x, 0, p.z);
    box(stack, timber, PALLET.w, PALLET.h, PALLET.d, 0, PALLET.h / 2, 0);
    const goods = paint(p.colour, 0.35);
    box(
      stack,
      goods,
      PALLET.w - 0.04,
      p.h,
      PALLET.d - 0.04,
      0,
      PALLET.h + p.h / 2,
      0,
    );
    // Its label, toward the dock's middle.
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 96;
    const g = canvas.getContext('2d')!;
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 256, 96);
    g.fillStyle = '#111111';
    g.font = 'bold 22px sans-serif';
    g.textAlign = 'center';
    const words = p.label.split(' · ');
    words.forEach((w, k) =>
      g.fillText(w, 128, 40 + k * 28 - (words.length - 1) * 14),
    );
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    kit.textures.push(map);
    const label = new MeshStandardMaterial({ map, roughness: 0.8 });
    kit.materials.push(label);
    const face = box(
      stack,
      label,
      0.5,
      0.19,
      0.005,
      0,
      PALLET.h + p.h * 0.6,
      0,
    );
    const toward = p.x < 0 ? 1 : -1;
    face.rotation.y = (toward * Math.PI) / 2;
    face.position.set(
      (toward * (PALLET.w - 0.04)) / 2 + toward * 0.004,
      PALLET.h + p.h * 0.6,
      0,
    );
    pallets.add(stack);
  }
  markComponent(pallets, { decorative: true });
  group.add(pallets);
  // Rough blocking-out for now (prompt 073): drawn, not yet in the model;
  // the shutters work in 075, the leveller later.
  markComponent(group, { decorative: true });
  return { group };
}
