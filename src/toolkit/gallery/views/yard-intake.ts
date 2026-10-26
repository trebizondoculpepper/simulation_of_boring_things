import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  TorusGeometry,
} from 'three';
import type { Material, Object3D } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createMicroLabel } from '../../components/core/views/eighties-controls';
import { beginPart } from '../../components/core/parts/parts';
import type { Part } from '../../components/core/parts/parts';
import { createBrandBadge } from '../../components/core/views/brand-badge';
import type { BrandId } from '../../components/core/logic/brands';
import { createBollard } from '../../components/loading-dock/views/yard-kit';
import { roomWorld } from '../../save/world-store';
import type { IntakeService } from '../../../game/plant/site-intake';
import { INTAKE, YARD } from '../logic/dock-yard';

/**
 * The site's intake in the goods yard (prompt 083; the owner, 2026-10-26):
 * the three incoming services on the building's outside wall, left of the
 * dock, each rising from the ground in its colour through the utility's
 * shut-off and meter and into the wall through a sealed, flashed sleeve:
 *
 * - water, blue: the water company's stop tap (a lever) and its revenue
 *   meter;
 * - gas, yellow: the emergency control valve (its yellow lever and its
 *   label), then the meter in its ventilated housing;
 * - electricity, a black armoured cable: the network's sealed cut-out,
 *   the meter, and the customer-side isolator, its rotary handle.
 *
 * Each lever works the world's intake (`site-intake.ts`); each meter reads
 * the world's register, on inspection too. Yellow hatching before them, a
 * no-vehicle zone, and bollards guarding them. The dock's frame, metres:
 * x east, z south, its floor at y = 0, the outside wall's face at
 * `INTAKE.wallZ`, facing -z; the yard at `YARD.level`.
 */

const G = YARD.level;

function paint(kit: PanelKit, color: string, roughness = 0.6, metalness = 0) {
  const m = new MeshStandardMaterial({ color, roughness, metalness });
  kit.materials.push(m);
  return m;
}
function box(
  p: Object3D,
  m: Material,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
) {
  const mesh = new Mesh(new BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  p.add(mesh);
  return mesh;
}
/** A pipe from (x, y0, z) to (x, y1, z), upright. */
function riser(
  p: Object3D,
  m: Material,
  r: number,
  x: number,
  y0: number,
  y1: number,
  z: number,
) {
  const mesh = new Mesh(new CylinderGeometry(r, r, y1 - y0, 14), m);
  mesh.position.set(x, (y0 + y1) / 2, z);
  p.add(mesh);
  return mesh;
}
/** A pipe from the wall's face out to `z`, level, at (x, y): into its sleeve. */
function intoWall(
  kit: PanelKit,
  p: Object3D,
  m: Material,
  r: number,
  x: number,
  y: number,
  z: number,
) {
  const w = INTAKE.wallZ;
  const run = new Mesh(new CylinderGeometry(r, r, w - z + 0.05, 14), m);
  run.rotation.x = Math.PI / 2;
  run.position.set(x, y, (w + z) / 2);
  p.add(run);
  // The sleeve's collar and its flashing on the wall's face, sealed.
  const collar = new Mesh(
    new TorusGeometry(r + 0.025, 0.012, 8, 20),
    paint(kit, '#3a3d3f', 0.8),
  );
  collar.position.set(x, y, w - 0.012);
  p.add(collar);
  box(
    p,
    paint(kit, '#8d9392', 0.5, 0.4),
    r * 2 + 0.16,
    r * 2 + 0.16,
    0.006,
    x,
    y,
    w - 0.003,
  );
  // The elbow up from the riser.
  const elbow = new Mesh(new TorusGeometry(0.06, r, 8, 12, Math.PI / 2), m);
  elbow.rotation.y = Math.PI / 2;
  elbow.position.set(x, y - 0.06, z + 0.06);
  p.add(elbow);
}

/** A meter's register on a small screen of its own, redrawn as it moves on. */
function register(
  kit: PanelKit,
  w: number,
  h: number,
  unit: string,
  lcd: boolean,
) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 80;
  const g = canvas.getContext('2d')!;
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  kit.textures.push(map);
  const m = new MeshBasicMaterial({ map });
  kit.materials.push(m);
  const mesh = new Mesh(new PlaneGeometry(w, h), m);
  mesh.userData.live = true;
  let shown = '';
  const show = (value: number) => {
    const text = Math.floor(value).toString().padStart(7, '0');
    if (text === shown) return;
    shown = text;
    g.fillStyle = lcd ? '#a9c08a' : '#111111';
    g.fillRect(0, 0, 256, 80);
    g.fillStyle = lcd ? '#1c2a12' : '#f2f2ea';
    g.font = `bold 44px ${lcd ? 'monospace' : 'sans-serif'}`;
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.fillText(text, 12, 40);
    g.font = 'bold 22px sans-serif';
    g.fillText(unit, 200, 44);
    map.needsUpdate = true;
  };
  return { mesh, show };
}

interface Device {
  service: IntakeService;
  x: number;
  name: string;
  meterName: string;
  unit: string;
  build(
    kit: PanelKit,
    g: Group,
  ): { lever: Object3D; screen: ReturnType<typeof register> };
}

/*
 * Sized for a centre this big (the owner, 2026-10-26: they were a
 * house's): gas, a DN100 steel service (114 mm) through a large commercial
 * meter in its housing; water, a DN100 main (110 mm) through a large
 * combination meter; electricity, a supply of several hundred kVA, two
 * heavy four-core armoured cables (70 mm) into a large cabinet.
 */
const DEVICES: readonly Device[] = [
  {
    service: 'water',
    x: INTAKE.water,
    name: 'Water main stop tap',
    meterName: 'Water revenue meter',
    unit: 'm³',
    build(kit, g) {
      const blue = paint(kit, '#2457a8', 0.45);
      const r = 0.055;
      const z = INTAKE.wallZ - 0.35;
      riser(g, blue, r, 0, G - 0.2, 0.55, z);
      intoWall(kit, g, blue, r, 0, 0.62, z);
      // The stop tap: its body and its lever, along the pipe when open.
      box(g, paint(kit, '#2b2d2f', 0.5, 0.6), 0.2, 0.24, 0.2, 0, G + 0.45, z);
      const lever = new Group();
      lever.position.set(0, G + 0.45, z - 0.11);
      box(lever, paint(kit, '#c8261c', 0.5), 0.05, 0.4, 0.03, 0, 0.2, 0);
      g.add(lever);
      // The combination meter: a big brass body, its dial facing the yard.
      const brass = paint(kit, '#a7843d', 0.35, 0.8);
      const body = new Mesh(new CylinderGeometry(0.17, 0.17, 0.24, 24), brass);
      body.rotation.x = Math.PI / 2;
      body.position.set(0, G + 0.95, z);
      g.add(body);
      const screen = register(kit, 0.22, 0.07, 'm³', false);
      screen.mesh.position.set(0, G + 0.95, z - 0.122);
      screen.mesh.rotation.y = Math.PI;
      g.add(screen.mesh);
      return { lever, screen };
    },
  },
  {
    service: 'gas',
    x: INTAKE.gas,
    name: 'Gas emergency control valve',
    meterName: 'Gas meter',
    unit: 'm³',
    build(kit, g) {
      const yellow = paint(kit, '#e0b81c', 0.45, 0.2);
      const r = 0.057;
      const grp = paint(kit, '#d9d6cb', 0.7);
      // The ventilated meter housing, its back to the wall, open-fronted.
      const hz = INTAKE.wallZ - 0.36;
      box(g, grp, 1.4, 1.6, 0.03, 0, G + 0.85, INTAKE.wallZ - 0.015);
      for (const s of [-1, 1])
        box(g, grp, 0.03, 1.6, 0.72, s * 0.7, G + 0.85, hz);
      box(g, grp, 1.43, 0.04, 0.75, 0, G + 1.67, hz);
      for (let k = 0; k < 4; k++)
        box(
          g,
          paint(kit, '#5f5d56', 0.8),
          0.05,
          0.3,
          0.005,
          0.71,
          G + 1.3 - k * 0.08,
          hz,
        );
      // The service up from the ground, the ECV on it in front of the housing.
      const fz = INTAKE.wallZ - 0.85;
      riser(g, yellow, r, -0.4, G - 0.2, G + 0.5, fz);
      box(
        g,
        paint(kit, '#2b2d2f', 0.5, 0.6),
        0.22,
        0.22,
        0.22,
        -0.4,
        G + 0.32,
        fz,
      );
      const lever = new Group();
      lever.position.set(-0.4, G + 0.32, fz - 0.12);
      box(lever, yellow, 0.4, 0.05, 0.03, 0.2, 0, 0);
      g.add(lever);
      const label = createMicroLabel(kit, 'GAS EMERGENCY\nCONTROL', {
        height: 0.03,
        ink: '#111111',
        plate: '#e0b81c',
      });
      label.position.set(-0.4, G + 0.6, fz - 0.12);
      label.rotation.y = Math.PI;
      g.add(label);
      // On up to the meter's height, back into the housing, and along
      // into the meter's inlet flange on its left (the owner, 2026-10-26:
      // it missed the meter).
      riser(g, yellow, r, -0.4, G + 0.5, G + 0.9, fz);
      const back = new Mesh(new CylinderGeometry(r, r, fz - hz, 14), yellow);
      back.rotation.x = Math.PI / 2;
      back.position.set(-0.4, G + 0.9, (fz + hz) / 2);
      g.add(back);
      const along = new Mesh(new CylinderGeometry(r, r, 0.2, 14), yellow);
      along.rotation.z = Math.PI / 2;
      along.position.set(-0.3, G + 0.9, hz);
      g.add(along);
      // The meter: a large commercial meter, its index on its front.
      box(g, paint(kit, '#b9bdc0', 0.4, 0.5), 0.6, 0.6, 0.42, 0.1, G + 0.9, hz);
      const screen = register(kit, 0.3, 0.09, 'm³', false);
      screen.mesh.position.set(0.1, G + 1.0, hz - 0.212);
      screen.mesh.rotation.y = Math.PI;
      g.add(screen.mesh);
      // Out of the housing's top and into the wall.
      riser(g, yellow, r, 0.1, G + 1.2, 0.8, hz);
      intoWall(kit, g, yellow, r, 0.1, 0.87, hz);
      return { lever, screen };
    },
  },
  {
    service: 'power',
    x: INTAKE.power,
    name: 'Supply isolator',
    meterName: 'Electricity meter',
    unit: 'kWh',
    build(kit, g) {
      const black = paint(kit, '#151617', 0.7);
      const steel = paint(kit, '#7e8a86', 0.5, 0.4);
      const cz = INTAKE.wallZ - 0.25;
      // The cabinet on its plinth, its back to the wall.
      box(g, paint(kit, '#8a8c88', 0.95), 1.3, 0.15, 0.55, 0, G + 0.075, cz);
      box(g, steel, 1.25, 1.85, 0.48, 0, G + 0.15 + 0.925, cz);
      const front = INTAKE.wallZ - 0.49;
      // The network's sealed cut-out: a black box, its seal wire.
      box(g, black, 0.36, 0.5, 0.02, -0.38, G + 1.25, front - 0.01);
      box(
        g,
        paint(kit, '#c8261c', 0.4),
        0.04,
        0.04,
        0.01,
        -0.38,
        G + 0.98,
        front - 0.022,
      );
      // The meter, its kWh register on its LCD.
      box(
        g,
        paint(kit, '#d6d6d0', 0.5),
        0.3,
        0.4,
        0.02,
        0.05,
        G + 1.3,
        front - 0.01,
      );
      const screen = register(kit, 0.22, 0.07, 'kWh', true);
      screen.mesh.position.set(0.05, G + 1.38, front - 0.021);
      screen.mesh.rotation.y = Math.PI;
      g.add(screen.mesh);
      // The isolator, its rotary handle, red on yellow.
      box(
        g,
        paint(kit, '#e0b81c', 0.5),
        0.28,
        0.28,
        0.02,
        0.42,
        G + 1.0,
        front - 0.01,
      );
      const lever = new Group();
      lever.position.set(0.42, G + 1.0, front - 0.035);
      box(lever, paint(kit, '#c8261c', 0.5), 0.06, 0.24, 0.05, 0, 0, 0);
      g.add(lever);
      // Two heavy four-core armoured cables, 70 mm, up from the ground
      // into the cabinet's foot, and out of its top into the wall.
      for (const dx of [-0.45, -0.3])
        riser(g, black, 0.035, dx, G - 0.2, G + 0.15, cz);
      for (const dx of [0.3, 0.45]) {
        riser(g, black, 0.035, dx, G + 2.0, 1.05, cz);
        intoWall(kit, g, black, 0.035, dx, 1.12, cz);
      }
      return { lever, screen };
    },
  },
];

const MAKERS: Record<IntakeService, BrandId> = {
  water: 'trager-feinstein',
  gas: 'trager-feinstein',
  power: 'kessler-moody',
};

/** The three services, each a working part: its lever and its meter. */
export function yardIntake(kit: PanelKit): Part[] {
  const store = typeof window === 'undefined' ? null : roomWorld();
  const parts: Part[] = DEVICES.map((d) => {
    const a = beginPart(kit, d.name);
    const g = new Group();
    g.position.x = d.x;
    a.object.add(g);
    const { lever, screen } = d.build(kit, g);
    const badge = createBrandBadge(kit, MAKERS[d.service], { height: 0.018 });
    badge.position
      .copy(screen.mesh.position)
      .add({ x: 0, y: 0.05, z: -0.002 } as never);
    badge.rotation.y = Math.PI;
    g.add(badge);
    const open = () => store?.world.value.intake.open[d.service] ?? true;
    const reading = () => store?.world.value.intake.meters[d.service] ?? 0;
    g.traverse((o) =>
      a.uses.set(o, () =>
        store?.dispatch({
          type: 'intake',
          action: { act: 'set', service: d.service, open: !open() },
        }),
      ),
    );
    // A quarter turn: along the pipe (or upright) when open, across when shut.
    let turn = open() ? 0 : 1;
    a.updates.push((delta) => {
      const want = open() ? 0 : 1;
      turn =
        turn < want
          ? Math.min(want, turn + delta * 3)
          : Math.max(want, turn - delta * 3);
      lever.rotation.z = (turn * Math.PI) / 2;
      screen.show(reading());
    });
    a.shows(
      () =>
        `${open() ? (d.service === 'power' ? 'ON' : 'open') : d.service === 'power' ? 'OFF' : 'shut'} · ${d.meterName}: ${Math.floor(reading())} ${d.unit}`,
    );
    return a.part();
  });
  // The bollards guarding them, and the hatching before them.
  const guard = beginPart(kit, 'Bollards and hatching');
  for (const x of [
    INTAKE.power - 1.0,
    (INTAKE.power + INTAKE.gas) / 2,
    (INTAKE.gas + INTAKE.water) / 2,
    INTAKE.water + 0.7,
  ]) {
    const b = createBollard(kit);
    b.position.set(x, G, INTAKE.wallZ - 1.8);
    guard.object.add(b);
  }
  {
    const x0 = INTAKE.power - 1.3;
    const x1 = INTAKE.water + 1.0;
    const w = x1 - x0;
    const d = 2.6;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = Math.round((1024 * d) / w);
    const c = canvas.getContext('2d')!;
    c.strokeStyle = 'rgba(232,192,40,0.95)';
    c.lineWidth = 14;
    c.strokeRect(7, 7, 1010, canvas.height - 14);
    c.save();
    c.beginPath();
    c.rect(7, 7, 1010, canvas.height - 14);
    c.clip();
    c.lineWidth = 12;
    for (let x = -canvas.height; x < 1040; x += 46) {
      c.beginPath();
      c.moveTo(x, canvas.height);
      c.lineTo(x + canvas.height, 0);
      c.stroke();
    }
    c.restore();
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    kit.textures.push(map);
    const m = new MeshBasicMaterial({
      map,
      color: '#c9c9c9',
      transparent: true,
      depthWrite: false,
    });
    kit.materials.push(m);
    const hatch = new Mesh(new PlaneGeometry(w, d), m);
    hatch.rotation.x = -Math.PI / 2;
    hatch.position.set((x0 + x1) / 2, G + 0.004, INTAKE.wallZ - d / 2);
    hatch.renderOrder = 1;
    guard.object.add(hatch);
  }
  parts.push(guard.part());
  return parts;
}
