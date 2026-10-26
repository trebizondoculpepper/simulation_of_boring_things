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

const DEVICES: readonly Device[] = [
  {
    service: 'water',
    x: INTAKE.water,
    name: 'Water main stop tap',
    meterName: 'Water revenue meter',
    unit: 'm³',
    build(kit, g) {
      const blue = paint(kit, '#2457a8', 0.45);
      const z = INTAKE.wallZ - 0.25;
      riser(g, blue, 0.032, 0, G - 0.2, 0.5, z);
      intoWall(kit, g, blue, 0.032, 0, 0.56, z);
      // The stop tap: its body and its lever, along the pipe when open.
      box(g, paint(kit, '#2b2d2f', 0.5, 0.6), 0.09, 0.12, 0.09, 0, G + 0.45, z);
      const lever = new Group();
      lever.position.set(0, G + 0.45, z - 0.05);
      box(lever, paint(kit, '#c8261c', 0.5), 0.03, 0.22, 0.02, 0, 0.11, 0);
      g.add(lever);
      // The meter: a brass body, its dial facing the yard.
      const brass = paint(kit, '#a7843d', 0.35, 0.8);
      const body = new Mesh(new CylinderGeometry(0.08, 0.08, 0.1, 20), brass);
      body.rotation.x = Math.PI / 2;
      body.position.set(0, G + 0.85, z);
      g.add(body);
      const screen = register(kit, 0.11, 0.035, 'm³', false);
      screen.mesh.position.set(0, G + 0.85, z - 0.052);
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
      const z = INTAKE.wallZ - 0.4;
      // The ventilated meter housing, its back to the wall, open-fronted.
      const grp = paint(kit, '#d9d6cb', 0.7);
      const hz = INTAKE.wallZ - 0.22;
      box(g, grp, 0.8, 1.0, 0.03, 0, G + 0.6, INTAKE.wallZ - 0.015);
      for (const s of [-1, 1])
        box(g, grp, 0.03, 1.0, 0.42, s * 0.4, G + 0.6, hz);
      box(g, grp, 0.83, 0.04, 0.45, 0, G + 1.12, hz);
      for (let k = 0; k < 4; k++)
        box(
          g,
          paint(kit, '#5f5d56', 0.8),
          0.03,
          0.18,
          0.005,
          0.25,
          G + 0.9 - k * 0.05,
          hz - 0.215 + 0.002,
        );
      // The service up from the ground, the ECV on it before the housing.
      riser(g, yellow, 0.03, -0.2, G - 0.2, G + 0.35, z + 0.15);
      box(
        g,
        paint(kit, '#2b2d2f', 0.5, 0.6),
        0.08,
        0.1,
        0.08,
        -0.2,
        G + 0.22,
        z + 0.15,
      );
      const lever = new Group();
      lever.position.set(-0.2, G + 0.22, z + 0.1);
      box(lever, yellow, 0.22, 0.03, 0.02, 0.11, 0, 0);
      g.add(lever);
      const label = createMicroLabel(kit, 'GAS EMERGENCY\nCONTROL', {
        height: 0.016,
        ink: '#111111',
        plate: '#e0b81c',
      });
      label.position.set(-0.2, G + 0.42, z + 0.09);
      label.rotation.y = Math.PI;
      g.add(label);
      // The meter, its index on its front.
      box(
        g,
        paint(kit, '#b9bdc0', 0.4, 0.5),
        0.34,
        0.36,
        0.22,
        0.05,
        G + 0.62,
        hz,
      );
      const screen = register(kit, 0.2, 0.06, 'm³', false);
      screen.mesh.position.set(0.05, G + 0.67, hz - 0.112);
      screen.mesh.rotation.y = Math.PI;
      g.add(screen.mesh);
      // Out of the housing's top and into the wall.
      riser(g, yellow, 0.03, 0.05, G + 0.8, 0.45, hz);
      intoWall(kit, g, yellow, 0.03, 0.05, 0.51, hz);
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
      const cz = INTAKE.wallZ - 0.17;
      // The cabinet on its plinth, its back to the wall.
      box(g, paint(kit, '#8a8c88', 0.95), 0.9, 0.12, 0.38, 0, G + 0.06, cz);
      box(g, steel, 0.86, 1.3, 0.32, 0, G + 0.12 + 0.65, cz);
      const front = INTAKE.wallZ - 0.33;
      // The network's sealed cut-out: a black box, its seal wire.
      box(g, black, 0.22, 0.3, 0.02, -0.25, G + 0.95, front - 0.01);
      box(
        g,
        paint(kit, '#c8261c', 0.4),
        0.03,
        0.03,
        0.01,
        -0.25,
        G + 0.8,
        front - 0.022,
      );
      // The meter, its kWh register on a small LCD.
      box(
        g,
        paint(kit, '#d6d6d0', 0.5),
        0.2,
        0.28,
        0.02,
        0.05,
        G + 1.0,
        front - 0.01,
      );
      const screen = register(kit, 0.15, 0.047, 'kWh', true);
      screen.mesh.position.set(0.05, G + 1.06, front - 0.021);
      screen.mesh.rotation.y = Math.PI;
      g.add(screen.mesh);
      // The isolator, its rotary handle, red on yellow.
      box(
        g,
        paint(kit, '#e0b81c', 0.5),
        0.16,
        0.16,
        0.02,
        0.3,
        G + 0.85,
        front - 0.01,
      );
      const lever = new Group();
      lever.position.set(0.3, G + 0.85, front - 0.03);
      box(lever, paint(kit, '#c8261c', 0.5), 0.03, 0.13, 0.03, 0, 0, 0);
      g.add(lever);
      // The armoured cable up from the ground, and on into the wall.
      riser(g, black, 0.025, -0.3, G - 0.2, G + 0.12, cz);
      riser(g, black, 0.025, 0.3, G + 1.42, 0.62, cz);
      intoWall(kit, g, black, 0.025, 0.3, 0.68, cz);
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
    INTAKE.power - 0.8,
    (INTAKE.power + INTAKE.gas) / 2,
    (INTAKE.gas + INTAKE.water) / 2,
    INTAKE.water + 0.7,
  ]) {
    const b = createBollard(kit);
    b.position.set(x, G, INTAKE.wallZ - 1.5);
    guard.object.add(b);
  }
  {
    const x0 = INTAKE.power - 1.1;
    const x1 = INTAKE.water + 1.0;
    const w = x1 - x0;
    const d = 2.2;
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
