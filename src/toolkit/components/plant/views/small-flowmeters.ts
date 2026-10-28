import { Group, Mesh, MeshStandardMaterial, SphereGeometry } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createMicroLabel } from '../../core/views/eighties-controls';
import { createDialGauge } from '../../industrial-control/views/dial-gauge';
import { createCharacterLcd } from '../../industrial-control/views/panel-instruments';
import { createBrandBadge } from '../../core/views/brand-badge';
import { plantTools } from './plant-tools';

/**
 * The flowmeters for the smaller lines (mission 106), each a different
 * kind of instrument, each live:
 *
 * - a **metal-tube variable-area meter** (after the Krohne H250): a float
 *   in a tapered tube, lifted by the flow, its position carried out by a
 *   magnet to a pointer on a dial; it must stand in a rising pipe;
 * - a **glass-tube rotameter** (after the Krohne DK 800): the same float,
 *   seen through a glass tube against a printed scale;
 * - a **paddle-wheel meter** (after the Signet 2537 with its 8550
 *   transmitter): a paddle wheel set into the pipe through a saddle, its
 *   transmitter's LCD showing the flow.
 *
 * Each is drawn along x through its origin (the pipe's way, the way its
 * water should flow), its face toward +z: `placeFitting` turns it into its
 * pipe. `show` takes the flow, m³/h, and moves nothing unless it changes.
 */

/** A metal-tube variable-area meter, its dial reading 0 to `max` m³/h. */
export function createMetalTubeMeter(
  kit: PanelKit,
  { od, tag, max }: { od: number; tag: string; max: number },
) {
  const t = plantTools(kit);
  const group = new Group();
  group.name = `Gorskiy variable-area flowmeter ${tag}`;
  const steel = t.paint('#bfc4c6', 0.3, 0.8);
  const r = od / 2;
  const length = Math.max(0.25, od * 2.2);
  // The measuring tube between its flanges, and the indicator's housing.
  t.cyl(group, steel, r * 1.05, length * 0.86, 0, 0, 0, 'x', 24);
  for (const x of [-length / 2, length / 2])
    t.cyl(group, steel, r * 1.5, 0.025, x * 0.93, 0, 0, 'x', 24);
  const housing = t.paint('#2c3e66', 0.5, 0.2);
  t.cyl(group, housing, 0.075, 0.07, 0, 0, r + 0.04, 'z', 32);
  const dial = createDialGauge(kit, {
    dia: 0.12,
    min: 0,
    max,
    unit: 'm³/h',
    entry: 'back',
    filled: false,
    flutter: 0.003,
    maker: 'gorskiy',
    legend: tag,
  });
  dial.group.position.set(0, 0, r + 0.08);
  // Its scale reads up the tube: turned so the dial is upright when the tube rises.
  dial.group.rotation.z = -Math.PI / 2;
  group.add(dial.group);
  dial.group.traverse((o) => (o.userData.live = true));
  const plate = createMicroLabel(kit, `${tag}  VA METER  ▲ FLOW`, {
    height: 0.014,
    ink: '#f2f2ea',
    plate: '#2c3e66',
    maxWidth: 0.22,
  });
  plate.position.set(-length * 0.33, -r - 0.02, r + 0.01);
  plate.rotation.z = -Math.PI / 2;
  group.add(plate);
  let shown = NaN;
  return {
    group,
    show(flow: number, delta: number) {
      const v = Math.max(0, flow);
      if (v !== shown) {
        shown = v;
        dial.set(v);
      }
      dial.update(delta);
    },
  };
}

/** A glass-tube rotameter, its scale 0 to `max` m³/h. */
export function createGlassRotameter(
  kit: PanelKit,
  { od, tag, max }: { od: number; tag: string; max: number },
) {
  const t = plantTools(kit);
  const group = new Group();
  group.name = `Gorskiy rotameter ${tag}`;
  const brass = t.paint('#b08d3c', 0.35, 0.7);
  const r = od / 2;
  const tube = 0.34;
  // End fittings, the frame's two side rails and its scale behind the glass.
  for (const x of [-tube / 2 - 0.03, tube / 2 + 0.03])
    t.cyl(group, brass, r * 1.4, 0.06, x, 0, 0, 'x', 20);
  const frame = t.paint('#3a3f44', 0.5, 0.3);
  for (const z of [-0.035, 0.035])
    t.box(group, frame, tube + 0.06, 0.012, 0.012, 0, 0, z);
  const scale = t.printed(
    tube,
    0.05,
    (c, w, h) => {
      c.fillStyle = '#f4f3ee';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#16191b';
      c.font = `bold ${h * 0.24}px Arial`;
      c.textAlign = 'center';
      for (let k = 0; k <= 10; k++) {
        const x = (k / 10) * w * 0.9 + w * 0.05;
        c.fillRect(x - 1, 0, 2, h * (k % 5 === 0 ? 0.45 : 0.28));
        if (k % 2 === 0)
          c.fillText(((max * k) / 10).toFixed(max < 10 ? 1 : 0), x, h * 0.75);
      }
      c.textAlign = 'left';
      c.fillText('m³/h', w * 0.02, h * 0.95);
    },
    512,
  );
  scale.mesh.position.set(0, -0.012, -0.022);
  scale.mesh.rotation.x = -0.4;
  group.add(scale.mesh);
  const glass = new MeshStandardMaterial({
    color: '#d8ecf2',
    transparent: true,
    opacity: 0.35,
    roughness: 0.05,
  });
  kit.materials.push(glass);
  t.cyl(group, glass, 0.018, tube, 0, 0, 0, 'x', 20);
  const floatPaint = t.paint('#c62c22', 0.4);
  const float = new Mesh(new SphereGeometry(0.012, 12, 8), floatPaint);
  float.userData.live = true;
  group.add(float);
  const badge = createBrandBadge(kit, 'gorskiy', { height: 0.018 });
  badge.position.set(tube / 2 + 0.06, 0.03, r * 1.45);
  group.add(badge);
  const plate = createMicroLabel(kit, `${tag}  ▲ FLOW`, {
    height: 0.014,
    ink: '#16191b',
    plate: '#f4f3ee',
    maxWidth: 0.12,
  });
  plate.position.set(-tube / 2 - 0.03, 0, r * 1.45);
  plate.rotation.z = -Math.PI / 2;
  group.add(plate);
  let at = -tube * 0.45;
  return {
    group,
    show(flow: number, delta: number) {
      // The float rides up the tube with the flow, damped as a real one.
      const share = Math.max(0, Math.min(1.05, flow / max));
      const target = -tube * 0.45 + share * tube * 0.9;
      if (Math.abs(target - at) < 1e-5) return;
      at += (target - at) * Math.min(1, delta * 3);
      float.position.x = at;
    },
  };
}

/** A paddle-wheel meter in its saddle, its transmitter's LCD showing the flow. */
export function createPaddleWheelMeter(
  kit: PanelKit,
  { od, tag }: { od: number; tag: string },
) {
  const t = plantTools(kit);
  const group = new Group();
  group.name = `Trager-Feinstein paddle-wheel flowmeter ${tag}`;
  const grey = t.paint('#3e4447', 0.55);
  const r = od / 2;
  // The saddle clamped round the pipe, the sensor's body standing from it.
  t.cyl(group, grey, r * 1.18, 0.09, 0, 0, 0, 'x', 24);
  t.cyl(group, t.paint('#20252a', 0.5), 0.022, 0.12, 0, r + 0.05, 0, 'y', 16);
  // The transmitter's round head, its display toward +z.
  const head = t.paint('#e4e6e2', 0.5);
  t.cyl(group, head, 0.065, 0.06, 0, r + 0.16, 0.0, 'z', 32);
  const lcd = createCharacterLcd(kit, {
    columns: 8,
    rows: 2,
    cell: 0.0042,
    backlight: true,
  });
  lcd.group.position.set(0, r + 0.165, 0.031);
  group.add(lcd.group);
  const badge = createBrandBadge(kit, 'trager-feinstein', { height: 0.012 });
  badge.position.set(0, r + 0.125, 0.031);
  group.add(badge);
  let shown = '';
  return {
    group,
    show(flow: number) {
      const lines = [
        tag.padEnd(8).slice(0, 8),
        `${Math.abs(flow).toFixed(1).padStart(4)}m3/h`,
      ];
      const key = lines.join('|');
      if (key === shown) return;
      shown = key;
      lcd.show(lines);
    },
  };
}
