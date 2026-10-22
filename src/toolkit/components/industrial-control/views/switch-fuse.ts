import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
} from 'three';
import type { Material, Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createMicroLabel } from '../../core/views/eighties-controls';
import { brandLivery } from '../../core/views/brand-livery';
import { SWITCH_FUSE } from '../logic/enclosures';

/**
 * Voltara's switch-fuse, a room's supply: after the TP&N 63 A switch-fuses
 * of around 2000 (MEM Memshield, Crabtree), 200 × 300 × 150 mm in grey
 * steel. Its handle on its right-hand side, up for ON and down for OFF,
 * a hasp to padlock it OFF; its cover, interlocked, with the maker's
 * badge, its rating plate, a SUPPLY ON neon lit while power reaches it,
 * and an engraved legend saying what it feeds. Its supply enters a gland
 * on its top (`SWITCH_FUSE.glands`). Its back on the wall at z = 0, its
 * middle at y = 0, its front toward +z.
 */
export interface SwitchFuse {
  group: Group;
  /** What to click to switch it. */
  handle: Object3D;
  readonly on: boolean;
  set(on: boolean): void;
  toggle(): void;
  /** Whether power reaches it from upstream (its neon lit, if it is on). */
  setSupplied(supplied: boolean): void;
  update(delta: number): void;
}

export function createSwitchFuse(
  kit: PanelKit,
  {
    on = true,
    rating = 'TP&N 63A',
    legend = 'ROOM SUPPLY',
  }: { on?: boolean; rating?: string; legend?: string } = {},
): SwitchFuse {
  const { w, h, d, glands } = SWITCH_FUSE;
  const group = new Group();
  group.name = 'switch-fuse';
  group.userData.sound = 'isolator';
  const livery = brandLivery(kit, 'voltara');
  const paint = (color: string, roughness = 0.5, metalness = 0.3) => {
    const m = new MeshStandardMaterial({ color, roughness, metalness });
    kit.materials.push(m);
    return m;
  };
  const box = (
    parent: Object3D,
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
  const grey = paint('#a9aca6', 0.55, 0.35);
  const dark = paint('#2b2c2d', 0.6, 0.2);
  // The case, and its cover a step proud of it, held by four screws.
  box(group, grey, w, h, d - 0.01, 0, 0, (d - 0.01) / 2);
  box(
    group,
    paint('#b4b7b1', 0.5, 0.35),
    w - 0.012,
    h - 0.012,
    0.01,
    0,
    0,
    d - 0.005,
  );
  const front = d;
  for (const [x, y] of [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ])
    box(
      group,
      dark,
      0.008,
      0.008,
      0.003,
      x * (w / 2 - 0.018),
      y * (h / 2 - 0.018),
      front + 0.0015,
    );
  // The maker's badge, top left; its rating plate below it.
  const badge = livery.badge(0.022);
  badge.position.set(-w / 2 + 0.05, h / 2 - 0.04, front + 0.001);
  group.add(badge);
  const plate = createMicroLabel(kit, `SWITCH-FUSE\n${rating}  400V`, {
    height: 0.008,
    ink: '#1d1e1f',
    plate: '#e9e6dc',
  });
  plate.position.set(-0.02, h / 2 - 0.085, front + 0.001);
  group.add(plate);
  // The neon, SUPPLY ON: lit while it is on and power reaches it.
  const lens = new MeshStandardMaterial({
    color: '#1f4a2a',
    emissive: '#3bd16a',
    emissiveIntensity: 0,
    roughness: 0.3,
  });
  kit.materials.push(lens);
  const neon = new Mesh(new CylinderGeometry(0.009, 0.009, 0.008, 18), lens);
  neon.rotation.x = Math.PI / 2;
  neon.position.set(0, -0.01, front + 0.004);
  neon.userData.live = true;
  group.add(neon);
  const neonLegend = createMicroLabel(kit, 'SUPPLY ON', {
    height: 0.007,
    ink: '#1d1e1f',
  });
  neonLegend.position.set(0, -0.032, front + 0.001);
  group.add(neonLegend);
  // What it feeds, engraved: white on black.
  const feeds = createMicroLabel(kit, legend, {
    height: 0.016,
    ink: '#ffffff',
    plate: '#141414',
  });
  feeds.position.set(0, -h / 2 + 0.05, front + 0.001);
  group.add(feeds);
  // Its supply gland on its top.
  for (const x of glands.x) {
    const gland = new Mesh(
      new CylinderGeometry(0.017, 0.019, glands.h, 6),
      paint('#b08d3a', 0.35, 0.8),
    );
    gland.position.set(x, h / 2 + glands.h / 2, glands.z);
    group.add(gland);
  }
  // The handle, on its right-hand side: up for ON, down for OFF; the hasp
  // under it, where it is padlocked OFF.
  const side = w / 2;
  box(group, dark, 0.006, 0.05, 0.05, side + 0.003, 0, d * 0.55);
  box(group, dark, 0.012, 0.012, 0.02, side + 0.008, -0.07, d * 0.55);
  const handle = new Group();
  handle.name = 'switch-fuse handle';
  handle.position.set(side + 0.014, 0, d * 0.55);
  handle.userData.live = true;
  group.add(handle);
  const red = paint('#c42b23', 0.45, 0.1);
  box(handle, dark, 0.012, 0.03, 0.03, 0, 0, 0);
  box(handle, red, 0.014, 0.11, 0.022, 0.004, 0.06, 0);
  box(handle, red, 0.018, 0.03, 0.03, 0.005, 0.115, 0);
  // ON and OFF on the side, where the handle points.
  for (const [text, y] of [
    ['ON', 0.12],
    ['OFF', -0.12],
  ] as const) {
    const mark = createMicroLabel(kit, text, { height: 0.012, ink: '#1d1e1f' });
    mark.rotation.y = Math.PI / 2;
    mark.position.set(side + 0.001, y, d * 0.82);
    group.add(mark);
  }
  // Up, a little toward the front, for ON; down for OFF.
  const ON = 0.35;
  const OFF = Math.PI - 0.35;
  let isOn = on;
  let supplied = true;
  let angle = on ? ON : OFF;
  handle.rotation.x = angle;
  const showNeon = () => {
    lens.emissiveIntensity = isOn && supplied ? 1.4 : 0;
  };
  showNeon();
  const fuse: SwitchFuse = {
    group,
    handle,
    get on() {
      return isOn;
    },
    set(value) {
      isOn = value;
      showNeon();
    },
    toggle() {
      fuse.set(!isOn);
    },
    setSupplied(value) {
      if (value === supplied) return;
      supplied = value;
      showNeon();
    },
    update(delta) {
      const target = isOn ? ON : OFF;
      angle += (target - angle) * Math.min(1, delta * 10);
      handle.rotation.x = angle;
    },
  };
  return fuse;
}
