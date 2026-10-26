import {
  BoxGeometry,
  CanvasTexture,
  Group,
  Mesh,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import type { Material } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { markComponent } from '../../components/core/views/component-identity';
import type { ShellAperture } from '../logic/shell-rooms';
import type { Footprint } from '../../controls/logic/walk-collision';
import { YARD_LEVEL, tarmacMaterial } from './dock-outside';
import {
  PALLET,
  createPalletOfGoods,
  createRollerShutter,
} from '../../components/loading-dock/views/dock-parts';
import {
  createPalletTruck,
  createRollCage,
  createSackTruck,
} from '../../components/loading-dock/views/yard-kit';

/** How far each lorry channel runs into the dock from its opening, metres: half a rigid lorry. */
export const CHANNEL_LENGTH = 6;

/** A bay's channel in the dock's floor: its opening's width, from the outside wall inward. */
export const dockChannel = (o: ShellAperture, wallZ: number) => ({
  minX: o.at - o.w / 2,
  maxX: o.at + o.w / 2,
  minZ: wallZ,
  maxZ: wallZ + CHANNEL_LENGTH,
});

/** Yellow and black hazard striping, for a drop's edge. */
export function hazardStripes(kit: PanelKit) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 32;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#e0b81c';
  g.fillRect(0, 0, 256, 32);
  g.fillStyle = '#151515';
  for (let x = -32; x < 256; x += 32) {
    g.beginPath();
    g.moveTo(x, 32);
    g.lineTo(x + 16, 32);
    g.lineTo(x + 32, 0);
    g.lineTo(x + 16, 0);
    g.fill();
  }
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  map.wrapS = map.wrapT = RepeatWrapping;
  map.repeat.set(20, 1);
  kit.textures.push(map);
  const m = new MeshStandardMaterial({ map, roughness: 0.7 });
  kit.materials.push(m);
  return m;
}

/**
 * The loading dock's fittings, rough (prompt 073; the owner, 2026-10-26:
 * blocking-out components to scope the space, refined later): at each
 * lorry opening an insulated roller shutter, rolled up and fixed (its
 * barrel box, guides, bottom rail, motor and hand chain; working in 075),
 * and the channel the lorry's rear half backs into, sunk to the yard's
 * level, its edges marked and its buffers at the end; the
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
  { x: -6.2, z: 5.15, colour: '#3d7fb8', h: 1.3, label: 'CLEANING SUPPLIES' },
  { x: -6.2, z: 3.85, colour: '#c9b48a', h: 1.1, label: 'CATERING · CAFÉ' },
  {
    x: -4.8,
    z: 4.6,
    colour: '#e9e6dc',
    h: 1.5,
    label: 'PAPER TOWELS · TOILET ROLL',
  },
  {
    x: 6.2,
    z: 5.15,
    colour: '#8a8f94',
    h: 1.0,
    label: 'FITTINGS · PLUMBING SPARES',
  },
  { x: 6.2, z: 3.85, colour: '#2f6f9e', h: 0.9, label: 'LANE ROPES' },
];
/**
 * The dock's handling kit, set decoration: a hand pallet truck by the
 * deliveries, a roll cage and a sack truck by the corridor's doors. Each its builder, place and turn.
 */
const DOCK_KIT: readonly [(kit: PanelKit) => Group, number, number, number][] =
  [
    [createPalletTruck, -4.6, 3.6, Math.PI / 2],
    [createRollCage, 2.4, 5.2, 0],
    [createSackTruck, 3.3, 5.5, Math.PI],
  ];
/** What the kit stands in the way of. */
const KIT_SOLIDS: Footprint[] = [
  { minX: -5.45, maxX: -3.75, minZ: 3.2, maxZ: 4.0 },
  { minX: 3.8, maxX: 4.6, minZ: 4.85, maxZ: 5.55 },
];

/** What the pallets stand in the way of. */
export const dockPalletSolids = (): Footprint[] => [
  // Each pallet turned a quarter, its long side across the dock.
  ...DOCK_PALLETS.map((p) => ({
    minX: p.x - PALLET.d / 2,
    maxX: p.x + PALLET.d / 2,
    minZ: p.z - PALLET.w / 2,
    maxZ: p.z + PALLET.w / 2,
  })),
  ...KIT_SOLIDS,
];

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
  const rubber = paint('#161718', 0.9);
  const concrete = paint('#7d7f7c', 0.95);
  // The roadways' tarmac carried into each channel (the owner, 2026-10-26).
  const tarmac = tarmacMaterial(kit, 3);
  kit.materials.push(tarmac);
  void thickness;

  apertures.forEach((o, i) => {
    // The roller shutter (dev43's, Ironside's), wound up open: its head
    // over the opening, its curtain reaching down to the channel's floor,
    // its drive on the outer end plate, clear of the pier's door, and its
    // hand chain stopping 1.1 m above the dock's floor.
    const shutter = createRollerShutter(kit, {
      w: o.w,
      h: o.h - YARD_LEVEL,
      driveSide: o.at < 0 ? -1 : 1,
      chainTo: 1.1 - o.h,
    });
    shutter.setOpen(1);
    shutter.group.name = `Roller shutter, bay ${i + 1}`;
    shutter.group.position.set(o.at, o.h, wallZ);
    group.add(shutter.group);

    // Its channel (the owner, 2026-10-26): sunk to the yard's level, from
    // the opening into the dock, the lorry's rear half backed in along it,
    // its flatbed level with the dock floor either side and at the end.
    const channel = new Group();
    channel.name = `Lorry channel, bay ${i + 1}`;
    const c = dockChannel(o, wallZ);
    const cw = c.maxX - c.minX;
    const cl = c.maxZ - c.minZ;
    const cx = (c.minX + c.maxX) / 2;
    const cz = (c.minZ + c.maxZ) / 2;
    const depth = -YARD_LEVEL;
    box(channel, tarmac, cw, 0.1, cl, cx, YARD_LEVEL - 0.05, cz);
    for (const s of [-1, 1])
      box(
        channel,
        concrete,
        0.2,
        depth,
        cl,
        cx + s * (cw / 2 + 0.1),
        YARD_LEVEL / 2,
        cz,
      );
    box(
      channel,
      concrete,
      cw + 0.4,
      depth,
      0.2,
      cx,
      YARD_LEVEL / 2,
      c.maxZ + 0.1,
    );
    // Two rubber buffers on the end wall, where the lorry stops.
    for (const s of [-1, 1])
      box(channel, rubber, 0.3, 0.45, 0.12, cx + s * 0.9, -0.45, c.maxZ - 0.06);
    group.add(channel);
  });

  // Pallets of deliveries (dev43's), set decoration, their labels toward
  // the dock's middle; and the handling kit that moves them.
  const pallets = new Group();
  pallets.name = 'Deliveries waiting to be put away';
  for (const p of DOCK_PALLETS) {
    const stack = createPalletOfGoods(kit, p);
    stack.position.set(p.x, 0, p.z);
    stack.rotation.y = p.x < 0 ? Math.PI / 2 : -Math.PI / 2;
    pallets.add(stack);
  }
  for (const [make, x, z, yaw] of DOCK_KIT) {
    const thing = make(kit);
    thing.position.set(x, 0, z);
    thing.rotation.y = yaw;
    pallets.add(thing);
  }
  markComponent(pallets, { decorative: true });
  group.add(pallets);
  // Rough blocking-out for now (prompt 073): drawn, not yet in the model;
  // the shutters work in 075, the leveller later.
  markComponent(group, { decorative: true });
  return { group };
}
