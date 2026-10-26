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
import { beginPart } from '../../components/core/parts/parts';
import type { Part } from '../../components/core/parts/parts';
import { createBollard } from '../../components/loading-dock/views/yard-kit';
import { roomWorld } from '../../save/world-store';
import type { IntakeService } from '../../../game/plant/site-intake';
import { INTAKE, YARD } from '../logic/dock-yard';
import {
  createElectricityMeteringCabinet,
  createGasMeterTrain,
  createWaterMeterSet,
} from '../../components/plant/views/utility-meters';
import { siteLoadKw, withIntake } from '../../../game/plant/site-intake';

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

interface Device {
  service: IntakeService;
  x: number;
  name: string;
  meterName: string;
  unit: string;
  build(
    kit: PanelKit,
    g: Group,
  ): {
    lever: Object3D;
    screen: { show(value: number): void };
    /** A lever turns a quarter; a handwheel spins several turns. */
    turn: 'lever' | 'wheel';
  };
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
    name: 'Water main inlet valve',
    meterName: 'Water revenue meter',
    unit: 'm³',
    build(kit, g) {
      const blue = paint(kit, '#2457a8', 0.45);
      const r = 0.058;
      // The meter set along the wall, the main rising from the ground into
      // its inlet and out of its outlet up into the wall's sleeve.
      const set = createWaterMeterSet(kit);
      const z = INTAKE.wallZ - 0.45;
      set.group.position.set(0, G, z);
      set.group.rotation.y = Math.PI;
      g.add(set.group);
      riser(g, blue, r, 1.2, G - 0.2, G + 0.4, z);
      riser(g, blue, r, -1.2, G + 0.4, 0.55, z);
      intoWall(kit, g, blue, r, -1.2, 0.62, z);
      return {
        lever: set.inlet,
        screen: { show: (v: number) => set.show(v) },
        turn: 'wheel',
      };
    },
  },
  {
    service: 'gas',
    x: INTAKE.gas,
    name: 'Gas emergency control valve',
    meterName: 'Gas meter',
    unit: 'm³',
    build(kit, g) {
      // The whole installation on the wall, its pipe at 0.9 m: the ECV,
      // filter, slam-shut regulator, meter, converter and outlet valve.
      const train = createGasMeterTrain(kit);
      train.group.position.set(0, G + 0.9, INTAKE.wallZ);
      train.group.rotation.y = Math.PI;
      g.add(train.group);
      // Its outlet, turned back into the wall through its sleeve.
      intoWall(
        kit,
        g,
        paint(kit, '#e0b81c', 0.45, 0.2),
        0.045,
        -1.3,
        G + 0.9,
        INTAKE.wallZ - 0.22,
      );
      return {
        lever: train.ecv,
        screen: { show: (v: number) => train.show(v) },
        turn: 'lever',
      };
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
      // The metering cabinet on the wall, its foot 0.4 m up.
      const cabinet = createElectricityMeteringCabinet(kit);
      cabinet.group.position.set(0, G + 1.0, INTAKE.wallZ);
      cabinet.group.rotation.y = Math.PI;
      g.add(cabinet.group);
      // The customer-side isolator beside it: a grey switch box, its
      // rotary handle red on yellow.
      const front = INTAKE.wallZ - 0.32;
      box(
        g,
        paint(kit, '#7e8a86', 0.5, 0.4),
        0.4,
        0.55,
        0.3,
        -0.75,
        G + 1.0,
        INTAKE.wallZ - 0.15,
      );
      box(
        g,
        paint(kit, '#e0b81c', 0.5),
        0.24,
        0.24,
        0.02,
        -0.75,
        G + 1.05,
        front - 0.005,
      );
      const lever = new Group();
      lever.position.set(-0.75, G + 1.05, front - 0.03);
      box(lever, paint(kit, '#c8261c', 0.5), 0.05, 0.2, 0.05, 0, 0, 0);
      g.add(lever);
      // Two heavy four-core armoured cables from the ground up into the
      // cabinet's CT chamber, and from the isolator into the wall.
      for (const dx of [0.2, 0.35])
        riser(g, black, 0.035, dx, G - 0.2, G + 0.4, INTAKE.wallZ - 0.12);
      for (const dx of [-0.8, -0.7]) {
        riser(g, black, 0.035, dx, G + 1.28, 0.8, INTAKE.wallZ - 0.12);
        intoWall(kit, g, black, 0.035, dx, 0.87, INTAKE.wallZ - 0.12);
      }
      return {
        lever,
        screen: { show: (v: number) => cabinet.show(v, lastKw, lastDelta) },
        turn: 'lever',
      };
    },
  },
];

/** The site's load and the last frame's time, for the electricity meter's pulse LED. */
let lastKw = 0;
let lastDelta = 0;

/** The three services, each a working part: its lever and its meter. */
export function yardIntake(kit: PanelKit): Part[] {
  const store = typeof window === 'undefined' ? null : roomWorld();
  const parts: Part[] = DEVICES.map((d) => {
    const a = beginPart(kit, d.name);
    const g = new Group();
    g.position.x = d.x;
    a.object.add(g);
    const { lever, screen, turn: kind } = d.build(kit, g);
    // Each installation carries its own maker's badge.
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
      if (kind === 'wheel') lever.rotation.y = turn * Math.PI * 6;
      else lever.rotation.z = (turn * Math.PI) / 2;
      if (d.service === 'power') {
        lastDelta = delta;
        const w = store?.world.value;
        lastKw = w
          ? siteLoadKw({ ...w, plant: withIntake(w.plant, w.intake) })
          : 0;
      }
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
