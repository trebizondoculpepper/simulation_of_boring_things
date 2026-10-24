import {
  BoxGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
} from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createMicroLabel } from '../../core/views/eighties-controls';

export type StorageDoorStyle = 'solid' | 'glass';

/** A reusable steel engineer's stores cupboard, 0.96 × 0.50 × 1.98 m. */
export function createEngineerStorageCupboard(
  kit: PanelKit,
  doors: StorageDoorStyle,
) {
  const group = new Group();
  group.name = `${doors} engineer storage cupboard`;
  const uses = new Map<Object3D, () => void>();
  const moving: { update: (delta: number) => void }[] = [];
  const paint = (colour: string, metalness = 0.1) => {
    const material = new MeshStandardMaterial({
      color: colour,
      roughness: 0.65,
      metalness,
    });
    kit.materials.push(material);
    return material;
  };
  const steel = paint('#aeb5b4', 0.65);
  const inner = paint('#737b7b', 0.4);
  const dark = paint('#252a2d', 0.2);
  const black = paint('#171b1e', 0.1);
  const yellow = paint('#f4ca19');
  const green = paint('#39703d');
  const blue = paint('#1867af');
  const drawerPlastic = new MeshBasicMaterial({
    color: '#d2dddc',
    transparent: true,
    opacity: 0.68,
    depthWrite: false,
    side: DoubleSide,
  });
  const glass = new MeshBasicMaterial({
    color: '#b7cfce',
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    side: DoubleSide,
  });
  kit.materials.push(drawerPlastic, glass);
  const box = (
    parent: Group,
    material: MeshStandardMaterial | MeshBasicMaterial,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    name?: string,
  ) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    if (name) mesh.name = name;
    parent.add(mesh);
    return mesh;
  };
  const w = 0.96;
  const h = 1.98;
  const d = 0.5;
  // Folded sheet-steel case with its frame and five load-bearing shelves.
  box(group, steel, w, h, 0.018, 0, h / 2, -d + 0.009, 'back');
  for (const side of [-1, 1]) {
    box(
      group,
      steel,
      0.018,
      h,
      d,
      side * (w / 2 - 0.009),
      h / 2,
      -d / 2,
      'side',
    );
    box(
      group,
      steel,
      0.035,
      h,
      0.04,
      side * (w / 2 - 0.018),
      h / 2,
      -0.02,
      'front stile',
    );
  }
  box(group, steel, w, 0.025, d, 0, 0.0125, -d / 2, 'base');
  box(group, steel, w, 0.025, d, 0, h - 0.0125, -d / 2, 'top');
  for (const y of [0.39, 0.79, 1.02, 1.57])
    box(group, inner, w - 0.05, 0.017, d - 0.025, 0, y, -d / 2, 'shelf');
  box(
    group,
    inner,
    w - 0.05,
    0.025,
    d - 0.025,
    0,
    0.055,
    -d / 2,
    'bottom shelf',
  );

  const partsBin = (
    parent: Group,
    x: number,
    y: number,
    z: number,
    material: typeof yellow,
    width = 0.15,
  ) => {
    const bh = 0.115;
    const bd = 0.23;
    box(parent, material, width, 0.012, bd, x, y + 0.006, z, 'bin floor');
    box(
      parent,
      material,
      width,
      bh,
      0.012,
      x,
      y + bh / 2,
      z - bd / 2,
      'bin back',
    );
    for (const side of [-1, 1])
      box(
        parent,
        material,
        0.01,
        bh,
        bd,
        x + side * (width / 2 - 0.005),
        y + bh / 2,
        z,
        'bin side',
      );
    box(
      parent,
      material,
      width,
      0.032,
      0.012,
      x,
      y + 0.025,
      z + bd / 2,
      'bin lip',
    );
  };
  for (let i = 0; i < 5; i++)
    partsBin(group, -0.36 + i * 0.18, 1.61, -0.31, yellow);
  partsBin(group, 0.3, 0.82, -0.3, blue, 0.22);

  // Nine individual translucent parts drawers: each has a shallow tray,
  // label pocket and finger pull, and travels on runners when selected.
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 3; col++) {
      const x = (col - 1) * 0.286;
      const y = 1.12 + row * 0.145;
      box(group, dark, 0.272, 0.138, 0.3, x, y, -0.27, 'drawer aperture');
      const drawer = new Group();
      drawer.position.set(x, y, 0);
      group.add(drawer);
      box(drawer, drawerPlastic, 0.255, 0.12, 0.265, 0, 0, -0.23, 'parts tray');
      const front = box(
        drawer,
        drawerPlastic,
        0.265,
        0.13,
        0.012,
        0,
        0,
        -0.09,
        'parts drawer front',
      );
      box(drawer, steel, 0.13, 0.008, 0.004, 0, -0.022, -0.081, 'label pocket');
      box(drawer, dark, 0.065, 0.01, 0.018, 0, -0.045, -0.073, 'finger pull');
      let open = false;
      let travel = 0;
      uses.set(front, () => {
        open = !open;
      });
      moving.push({
        update(delta) {
          travel += ((open ? 0.2 : 0) - travel) * Math.min(1, delta * 8);
          drawer.position.z = travel;
        },
      });
    }

  // Mixed working stores rather than rows of anonymous blocks.
  const caseBox = (
    x: number,
    y: number,
    width: number,
    material: typeof green,
    name: string,
  ) => {
    box(group, material, width, 0.155, 0.29, x, y, -0.28, name);
    box(
      group,
      dark,
      width - 0.04,
      0.006,
      0.295,
      x,
      y + 0.025,
      -0.28,
      `${name} seam`,
    );
  };
  caseBox(-0.22, 0.5, 0.38, green, 'green archive box');
  caseBox(0.2, 0.5, 0.38, green, 'green archive box');
  caseBox(-0.22, 0.65, 0.38, green, 'green archive box');
  caseBox(0.2, 0.65, 0.38, green, 'green archive box');
  box(group, black, 0.58, 0.21, 0.32, -0.12, 0.89, -0.3, 'tool chest');
  box(group, steel, 0.58, 0.012, 0.33, -0.12, 0.99, -0.3, 'tool chest lid');
  for (const x of [-0.31, 0.08])
    box(group, steel, 0.015, 0.03, 0.018, x, 0.91, -0.126, 'tool chest latch');
  for (const x of [-0.28, -0.02])
    box(group, black, 0.21, 0.28, 0.31, x, 0.22, -0.3, 'instrument case');
  box(group, green, 0.34, 0.27, 0.32, 0.25, 0.22, -0.29, 'stores carton');

  // A small, genuine-looking identification plate inside the cabinet.
  const badge = createMicroLabel(kit, 'MERIDIAN STORES · E-96', {
    height: 0.008,
    ink: '#262c2d',
    plate: '#c8ceca',
  });
  badge.position.set(0, 1.88, -0.465);
  group.add(badge);

  for (const side of [-1, 1]) {
    const hinge = new Group();
    hinge.position.set(side * (w / 2 - 0.027), h / 2, 0.019);
    group.add(hinge);
    const leaf = new Group();
    leaf.position.x = -side * (w / 4 - 0.01);
    hinge.add(leaf);
    const lw = w / 2 - 0.025;
    if (doors === 'solid')
      box(leaf, steel, lw, h - 0.045, 0.018, 0, 0, 0, 'solid steel door');
    else {
      const rail = 0.045;
      for (const edge of [-1, 1]) {
        box(
          leaf,
          steel,
          rail,
          h - 0.045,
          0.023,
          (edge * (lw - rail)) / 2,
          0,
          0,
          'glass door stile',
        );
        box(
          leaf,
          steel,
          lw,
          rail,
          0.023,
          0,
          (edge * (h - 0.045 - rail)) / 2,
          0,
          'glass door rail',
        );
      }
      box(
        leaf,
        glass,
        lw - 2 * rail,
        h - 0.045 - 2 * rail,
        0.004,
        0,
        0,
        0,
        'door glazing',
      );
    }
    const handle = box(
      leaf,
      dark,
      0.018,
      0.11,
      0.025,
      -side * (lw / 2 - 0.07),
      0,
      0.025,
      'cupboard handle',
    );
    let open = doors === 'solid' ? true : side === 1;
    let angle = open ? -side * 1.18 : 0;
    hinge.rotation.y = angle;
    uses.set(leaf, () => {
      open = !open;
    });
    uses.set(handle, () => {
      open = !open;
    });
    moving.push({
      update(delta) {
        angle += ((open ? -side * 1.18 : 0) - angle) * Math.min(1, delta * 6);
        hinge.rotation.y = angle;
      },
    });
  }

  return {
    group,
    uses,
    update(delta: number) {
      for (const item of moving) item.update(delta);
    },
  };
}
