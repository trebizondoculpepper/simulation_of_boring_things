import {
  BoxGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  CylinderGeometry,
} from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createMicroLabel } from '../../core/views/eighties-controls';
import { createBrandBadge } from '../../core/views/brand-badge';
import type { BrandId } from '../../core/logic/brands';
import { createEngineerStorageContainer } from './engineer-storage-container';
import type { EngineerStorageContainer } from './engineer-storage-container';
import { createDropProfile } from '../../../controls/logic/drop-profile';
import { createPortableBoard } from '../../../controls/logic/portable-board';
import type { PortableObject } from '../../../controls/input/object-handling';

export type StorageDoorStyle = 'solid' | 'glass';

/** A reusable steel engineer's stores cupboard, 0.96 × 0.50 × 1.98 m. */
export function createEngineerStorageCupboard(
  kit: PanelKit,
  doors: StorageDoorStyle,
  cabinetLabel = "ENGINEER'S STORES",
  maker: BrandId = 'ironside',
  cupboardId = `ENG.STORES.${doors.toUpperCase()}`,
  initialOpen = doors === 'solid',
) {
  const group = new Group();
  group.name = `${doors} engineer storage cupboard`;
  const uses = new Map<Object3D, () => void>();
  const moving: { update: (delta: number) => void }[] = [];
  const containers: EngineerStorageContainer[] = [];
  const itemAccess = new Map<Object3D, () => boolean>();
  const portableItems: ReturnType<typeof createPortableBoard>[] = [];
  const drawerControls: { retract: () => void; isOut: () => boolean }[] = [];
  const hinges: { side: number; group: Group; angle: number }[] = [];
  let doorsOpen = initialOpen;
  let closing = false;
  let closeDelay = 0;
  const drawersAccessible = () =>
    doorsOpen &&
    !closing &&
    hinges.every((hinge) => Math.abs(hinge.angle) > 0.9);
  const retractDrawers = () => {
    for (const drawer of drawerControls) drawer.retract();
  };
  const operateDoors = () => {
    if (closing) {
      closing = false;
      retractDrawers();
    } else if (doorsOpen && drawerControls.some((drawer) => drawer.isOut())) {
      closing = true;
      closeDelay = 0.18;
    } else {
      doorsOpen = !doorsOpen;
      if (doorsOpen) retractDrawers();
    }
  };
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
  const container = (
    kind: EngineerStorageContainer['kind'],
    suffix: string,
    label: string,
    x: number,
    y: number,
    z: number,
    labelWidth: number,
    labelHeight: number,
    labelAt: readonly [number, number, number],
    showCount = false,
  ) => {
    const part = createEngineerStorageContainer(
      kit,
      `${cupboardId}.${suffix}`,
      kind,
      label,
      labelWidth,
      labelHeight,
      labelAt,
      showCount,
    );
    part.group.position.set(x, y, z);
    group.add(part.group);
    containers.push(part);
    return part;
  };
  const addDrawerItem = (
    part: EngineerStorageContainer,
    name: string,
    x: number,
    colour: string,
  ) => {
    const item = new Group();
    item.name = `${part.id} · ${name}`;
    const material = paint(colour, 0.35);
    const body = new Mesh(
      new CylinderGeometry(0.012, 0.012, 0.045, 8),
      material,
    );
    body.rotation.z = Math.PI / 2;
    item.add(body);
    item.position.set(x, -0.005, -0.22);
    const portable = createPortableBoard(
      createDropProfile('round', 0.045, 'plastic'),
    );
    portableItems.push(portable);
    item.userData.portable = {
      component: portable,
      flat: 'upright',
      detach: () => part.removeItem(item),
    } satisfies PortableObject;
    part.addItem(item);
    return item;
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
    suffix: string,
    label: string,
    x: number,
    y: number,
    z: number,
    material: typeof yellow,
    width = 0.15,
  ) => {
    const part = container(
      'parts-bin',
      suffix,
      label,
      x,
      y,
      z,
      width * 0.78,
      0.014,
      [0, 0.025, 0.122],
    );
    const parent = part.group;
    x = 0;
    y = 0;
    z = 0;
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
  const binLabels = ['CLIPS', 'LAMP CAPS', 'SEALS', 'WASHERS', 'CONNECTORS'];
  for (let i = 0; i < 5; i++)
    partsBin(`B${i + 1}`, binLabels[i], -0.36 + i * 0.18, 1.61, -0.31, yellow);
  partsBin('B6', 'TOOLS', 0.3, 0.82, -0.3, blue, 0.22);

  // Nine individual translucent parts drawers: each has a shallow tray,
  // label pocket and finger pull, and travels on runners when selected.
  const drawerLabels = [
    'E22 BULBS',
    'FUSES',
    'O-RINGS',
    'GASKETS',
    'BRASS NUTS',
    'LABEL TAPE',
    'INDICATORS',
    'SCREWS',
    'TERMINALS',
  ];
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 3; col++) {
      const index = row * 3 + col;
      const x = (col - 1) * 0.286;
      const y = 1.12 + row * 0.145;
      box(group, dark, 0.272, 0.138, 0.3, x, y, -0.27, 'drawer aperture');
      const part = container(
        'drawer',
        `D${index + 1}`,
        drawerLabels[index],
        x,
        y,
        0,
        0.15,
        0.021,
        [0, -0.022, -0.081],
        true,
      );
      const drawer = part.group;
      box(
        drawer,
        drawerPlastic,
        0.255,
        0.012,
        0.265,
        0,
        -0.054,
        -0.23,
        'parts tray floor',
      );
      for (const side of [-1, 1])
        box(
          drawer,
          drawerPlastic,
          0.012,
          0.105,
          0.265,
          side * 0.121,
          0,
          -0.23,
          'parts tray side',
        );
      box(
        drawer,
        drawerPlastic,
        0.255,
        0.105,
        0.012,
        0,
        0,
        -0.359,
        'parts tray back',
      );
      box(
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
      box(drawer, dark, 0.065, 0.01, 0.018, 0, -0.045, -0.073, 'finger pull');
      let open = false;
      let travel = 0;
      uses.set(drawer, () => {
        if (!drawersAccessible()) return;
        open = !open;
      });
      for (let i = 0; i < 3; i++) {
        const item = addDrawerItem(
          part,
          drawerLabels[index],
          (i - 1) * 0.065,
          ['#e8e6d9', '#c8b17a', '#778d9a'][i],
        );
        itemAccess.set(
          item,
          () => drawersAccessible() && open && travel > 0.12,
        );
      }
      moving.push({
        update(delta) {
          travel += ((open ? 0.2 : 0) - travel) * Math.min(1, delta * 8);
          drawer.position.z = travel;
        },
      });
      drawerControls.push({
        retract: () => {
          open = false;
        },
        isOut: () => open || travel > 0.005,
      });
    }

  // Mixed working stores rather than rows of anonymous blocks.
  const caseBox = (
    suffix: string,
    label: string,
    x: number,
    y: number,
    width: number,
    material: typeof green,
    name: string,
  ) => {
    const part = container(
      'archive-box',
      suffix,
      label,
      x,
      y,
      -0.28,
      width * 0.7,
      0.026,
      [0, 0, 0.148],
    );
    box(part.group, material, width, 0.155, 0.29, 0, 0, 0, name);
    box(
      part.group,
      dark,
      width - 0.04,
      0.006,
      0.295,
      0,
      0.025,
      0,
      `${name} seam`,
    );
  };
  caseBox(
    'A1',
    'SERVICE MANUALS',
    -0.22,
    0.5,
    0.38,
    green,
    'green archive box',
  );
  caseBox('A2', 'LAMP STOCK', 0.2, 0.5, 0.38, green, 'green archive box');
  caseBox('A3', 'TEST RECORDS', -0.22, 0.65, 0.38, green, 'green archive box');
  caseBox('A4', 'SPARE FITTINGS', 0.2, 0.65, 0.38, green, 'green archive box');
  const chest = container(
    'tool-chest',
    'T1',
    'HAND TOOLS',
    -0.12,
    0.89,
    -0.3,
    0.3,
    0.034,
    [0, 0, 0.162],
  );
  box(chest.group, black, 0.58, 0.21, 0.32, 0, 0, 0, 'tool chest');
  box(chest.group, steel, 0.58, 0.012, 0.33, 0, 0.1, 0, 'tool chest lid');
  for (const x of [-0.31, 0.08])
    box(
      chest.group,
      steel,
      0.015,
      0.03,
      0.018,
      x + 0.12,
      0.02,
      0.174,
      'tool chest latch',
    );
  for (const [index, x] of [-0.28, -0.02].entries()) {
    const part = container(
      'instrument-case',
      `I${index + 1}`,
      `METER ${index + 1}`,
      x,
      0.22,
      -0.3,
      0.16,
      0.025,
      [0, 0, 0.158],
    );
    box(part.group, black, 0.21, 0.28, 0.31, 0, 0, 0, 'instrument case');
  }
  const carton = container(
    'carton',
    'C1',
    'CABLE STOCK',
    0.25,
    0.22,
    -0.29,
    0.25,
    0.03,
    [0, 0, 0.164],
  );
  box(carton.group, green, 0.34, 0.27, 0.32, 0, 0, 0, 'stores carton');

  // A small, genuine-looking identification plate inside the cabinet.
  const badge = createMicroLabel(kit, 'IRONSIDE STORES · E-96', {
    height: 0.008,
    ink: '#262c2d',
    plate: '#c8ceca',
  });
  badge.position.set(0, 1.88, -0.465);
  group.add(badge);

  // Fixed fascia keeps the cabinet identity visible with the doors open.
  box(
    group,
    steel,
    w - 0.035,
    0.11,
    0.028,
    0,
    h - 0.072,
    0.014,
    'cabinet identity fascia',
  );
  const cabinetPlate = createMicroLabel(kit, cabinetLabel, {
    height: 0.032,
    width: 0.49,
    maxWidth: 0.49,
    ink: '#182426',
    plate: '#e5e9e5',
  });
  cabinetPlate.position.set(-0.17, h - 0.072, 0.03);
  cabinetPlate.name = `${cupboardId} cabinet label`;
  group.add(cabinetPlate);
  const makerPlate = createBrandBadge(kit, maker, {
    form: 'wordmark',
    height: 0.042,
    plate: '#d6dddd',
  });
  makerPlate.position.set(0.315, h - 0.072, 0.031);
  group.add(makerPlate);
  group.userData.storageCabinetId = cupboardId;
  group.userData.storageCabinetLabel = cabinetLabel;
  group.userData.maker = maker;

  for (const side of [-1, 1]) {
    const hinge = new Group();
    const doorHeight = h - 0.15;
    hinge.position.set(side * (w / 2 - 0.027), doorHeight / 2 + 0.01, 0.019);
    group.add(hinge);
    const leaf = new Group();
    leaf.position.x = -side * (w / 4 - 0.01);
    hinge.add(leaf);
    const lw = w / 2 - 0.025;
    if (doors === 'solid')
      box(leaf, steel, lw, doorHeight, 0.018, 0, 0, 0, 'solid steel door');
    else {
      const rail = 0.045;
      for (const edge of [-1, 1]) {
        box(
          leaf,
          steel,
          rail,
          doorHeight,
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
          (edge * (doorHeight - rail)) / 2,
          0,
          'glass door rail',
        );
      }
      box(
        leaf,
        glass,
        lw - 2 * rail,
        doorHeight - 2 * rail,
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
    const angle = doorsOpen ? side * 1.18 : 0;
    hinge.rotation.y = angle;
    hinges.push({ side, group: hinge, angle });
    uses.set(leaf, operateDoors);
    uses.set(handle, operateDoors);
  }
  moving.push({
    update(delta) {
      if (closing) {
        closeDelay -= delta;
        if (closeDelay <= 0) {
          retractDrawers();
          if (drawerControls.every((drawer) => !drawer.isOut())) {
            doorsOpen = false;
            closing = false;
          }
        }
      }
      for (const hinge of hinges) {
        hinge.angle +=
          ((doorsOpen ? hinge.side * 1.18 : 0) - hinge.angle) *
          Math.min(1, delta * 6);
        hinge.group.rotation.y = hinge.angle;
      }
    },
  });

  // Labels, drawer fronts and glazing are passive materials. The room's
  // power-cut shader must not treat them as lamps or displays.
  group.traverse((object) => {
    if (object instanceof Mesh && object.material instanceof MeshBasicMaterial)
      object.material.userData.unpowered = true;
  });

  return {
    group,
    uses,
    containers,
    canRemove(item: Object3D) {
      const access = itemAccess.get(item);
      return access ? access() : null;
    },
    returnItem(item: Object3D, target: Object3D) {
      if (!drawersAccessible() || !itemAccess.has(item)) return false;
      const id = item.userData.storageContainerId as string | undefined;
      const drawer = containers.find(
        (part) => part.id === id && part.kind === 'drawer',
      );
      if (!drawer || drawer.items.includes(item)) return false;
      let at: Object3D | null = target;
      while (at && at !== drawer.group) at = at.parent;
      if (at !== drawer.group) return false;
      item.position.set((drawer.items.length - 1) * 0.065, -0.005, -0.22);
      item.rotation.set(0, 0, 0);
      item.scale.set(1, 1, 1);
      drawer.addItem(item);
      (item.userData.portable as PortableObject).component.reset();
      return true;
    },
    update(delta: number) {
      for (const item of moving) item.update(delta);
    },
    dispose() {
      for (const item of portableItems) item.dispose();
    },
  };
}
