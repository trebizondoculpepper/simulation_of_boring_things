import { CylinderGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { createPartSet, pushButton } from '../../core/parts/parts';
import { plantTools } from './plant-tools';
import { describe } from './describe';
import { partAudio } from '../../core/audio/part-audio';
import { ALARM_BUZZER } from '../../core/audio/part-loops';
import { hose } from './hose';
import { chlorellaPlate } from './chlorella-plate';
import {
  actOnLeakMonitor,
  leakMonitorShows,
  newLeakMonitor,
  newLowPoint,
  probeWet,
  stepLeakMonitor,
  stepLowPoint,
} from '../../../../game/plant/leak-monitor';
import type {
  LeakMonitor,
  LowPoint,
} from '../../../../game/plant/leak-monitor';

/**
 * A double-contained line's low-point leak detection port (researched
 * 2026-10-27, after GF Piping Systems' low-point stations and nVent
 * Raychem's TT-MINI-PROBE), hung under a containment pipe of radius `R`
 * at the origin, along x: a containment tee's stub down, a 1/2" PVC-U
 * ball valve (grey, red lever: the drain, clickable), a clear sight tube
 * below it that shows what has collected, and the conductivity probe in a
 * 3/4" side boss: a black hex body, two stainless pins into the annulus, a
 * grey gland and its lead.
 */
export function createLeakPort(kit: PanelKit, R: number) {
  const t = plantTools(kit);
  const group = new Group();
  const abs = t.paint('#3a3d40', 0.5);
  const grey = t.paint('#6b6e70', 0.5);
  const red = t.paint('#c8102e', 0.45);
  const black = t.paint('#1e1e1e', 0.55);
  const steel = t.paint('#b8bcc0', 0.3, 0.7);
  const glandGrey = t.paint('#8a8d90', 0.6);
  // The tee: a saddle round the containment, its stub down.
  t.cyl(group, abs, R + 0.006, 0.06, 0, 0, 0, 'x', 28);
  t.cyl(group, abs, 0.016, 0.05, 0, -R - 0.02, 0, 'y', 16);
  // The probe's boss on the stub, and the probe screwed in from the side.
  const by = -R - 0.03;
  t.cyl(group, abs, 0.014, 0.02, 0, by, 0.018, 'z', 6);
  const probe = new Group();
  probe.position.set(0, by, 0.028);
  group.add(probe);
  t.cyl(probe, black, 0.011, 0.04, 0, 0, 0.02, 'z', 6);
  t.cyl(probe, black, 0.009, 0.03, 0, 0, 0.055, 'z', 16);
  for (const x of [-0.003, 0.003])
    t.cyl(probe, steel, 0.0012, 0.01, x, 0, -0.005, 'z', 6);
  t.cyl(probe, glandGrey, 0.008, 0.014, 0, 0, 0.077, 'z', 6);
  hose(
    probe,
    t.paint('#5a5d60', 0.6),
    [
      [0, 0, 0.084],
      [0, -0.05, 0.14],
      [0, -0.25, 0.16],
    ],
    0.0025,
    0.01,
  );
  // The drain valve below the stub, its red lever.
  const vy = -R - 0.075;
  t.box(group, grey, 0.045, 0.06, 0.045, 0, vy, 0);
  const lever = new Group();
  lever.position.set(0, vy, 0.025);
  lever.userData.live = true;
  group.add(lever);
  t.box(lever, red, 0.075, 0.012, 0.008, 0.03, 0, 0.006);
  // The sight tube: clear, with what has collected standing in it.
  const sy = vy - 0.065;
  const clear = new MeshStandardMaterial({
    color: '#dfecee',
    transparent: true,
    opacity: 0.3,
    roughness: 0.1,
    depthWrite: false,
  });
  kit.materials.push(clear);
  const tube = new Mesh(
    new CylinderGeometry(0.0125, 0.0125, 0.06, 16, 1, true),
    clear,
  );
  tube.position.set(0, sy, 0);
  group.add(tube);
  t.cyl(group, grey, 0.015, 0.008, 0, sy - 0.034, 0, 'y', 16);
  const liquid = t.cyl(
    group,
    t.paint('#c8d86a', 0.3),
    0.011,
    1,
    0,
    sy - 0.03,
    0,
    'y',
    14,
  );
  liquid.userData.live = true;
  liquid.visible = false;
  describe(
    group,
    'Leak detection low point: drain valve, sight tube and probe',
    () =>
      `${shownLitres > 0.004 ? 'Liquid in the annulus' : 'Dry'}; drain ${open ? 'open' : 'shut'}`,
  );
  let shownLitres = 0;
  const parts = createPartSet();
  let open = false;
  let onTurn: ((open: boolean) => void) | null = null;
  parts.uses.set(lever.children[0], () => {
    open = !open;
    onTurn?.(open);
  });
  return {
    object: group,
    parts,
    /** Called when the drain's lever is turned. */
    onDrain(f: (open: boolean) => void) {
      onTurn = f;
    },
    /** Show the low point: its lever, and what stands in the sight tube. */
    show(p: LowPoint) {
      shownLitres = p.litres;
      lever.rotation.y = p.drainOpen ? -Math.PI / 2 : 0;
      const fill = Math.min(1, p.litres / 0.02);
      liquid.visible = fill > 0.01;
      liquid.scale.y = Math.max(0.001, fill * 0.055);
      liquid.position.y = sy - 0.03 + (fill * 0.055) / 2;
    },
  };
}

/**
 * The leak detection monitor (after GF's 918Q four-sensor alarm box): a
 * light grey polycarbonate wall box, 200 × 150 × 90 mm, Chlorella's; a
 * green POWER lamp, four red ZONE LEAK lamps, an amber FAULT lamp, a
 * sounder grille, and TEST, SILENCE and RESET buttons that work.
 */
export function createLeakMonitor(kit: PanelKit) {
  const t = plantTools(kit);
  const f = tools(kit);
  const group = new Group();
  const W = 0.2;
  const H = 0.15;
  const D = 0.09;
  const body = new Mesh(
    new RoundedBoxGeometry(W, H, D, 3, 0.01),
    t.paint('#d8dadc', 0.4),
  );
  body.position.set(0, 0, D / 2);
  group.add(body);
  const z = D + 0.001;
  f.label(group, 'LEAK DETECTION', 0, H / 2 - 0.016, z, 0.009, '#1b1b1b');
  const lamp = (colour: string, x: number, y: number, name: string) => {
    const m = new MeshStandardMaterial({
      color: '#2b2f2e',
      emissive: colour,
      emissiveIntensity: 0,
      roughness: 0.4,
    });
    kit.materials.push(m);
    t.cyl(group, m, 0.0045, 0.005, x, y, z + 0.002, 'z', 14).userData.live =
      true;
    f.label(group, name, x, y - 0.011, z, 0.0045, '#1b1b1b');
    return m;
  };
  const power = lamp('#3ee05a', -0.075, 0.035, 'POWER');
  const zones = [0, 1, 2, 3].map((i) =>
    lamp('#ff3a26', -0.04 + i * 0.026, 0.035, `ZONE ${i + 1}`),
  );
  const fault = lamp('#ffb21c', 0.075, 0.035, 'FAULT');
  // The sounder: a round grille.
  t.cyl(
    group,
    t.paint('#3a3d40', 0.6),
    0.016,
    0.004,
    -0.06,
    -0.035,
    z + 0.002,
    'z',
    20,
  );
  for (let i = -2; i <= 2; i++)
    t.box(
      group,
      t.paint('#1e1e1e', 0.6),
      0.022,
      0.0015,
      0.001,
      -0.06,
      -0.035 + i * 0.005,
      z + 0.0045,
    );
  let monitor = newLeakMonitor();
  const parts = createPartSet();
  let wet: boolean[] = [];
  (
    [
      ['black', 'TEST', 'test'],
      ['amber', 'SILENCE', 'silence'],
      ['blue', 'RESET', 'reset'],
    ] as const
  ).forEach(([colour, legend, act], i) => {
    const b = pushButton(kit, {
      colour,
      legend,
      action: () => (monitor = actOnLeakMonitor(monitor, act, wet)),
    });
    b.object.position.set(-0.01 + i * 0.035, -0.022, z + 0.002);
    b.object.scale.setScalar(0.32);
    group.add(b.object);
    parts.add(b);
    f.label(group, legend, -0.01 + i * 0.035, -0.042, z, 0.0045, '#1b1b1b');
  });
  const plate = chlorellaPlate(kit, 0.07, 'LEAK MONITOR LM4');
  plate.position.set(0.055, -H / 2 + 0.012, z);
  group.add(plate);
  let shown = monitor;
  describe(group, 'Leak detection monitor LM4', () => {
    const z = shown.zones
      .map((q, i) =>
        q.latched ? `zone ${i + 1} LEAK` : q.fault ? `zone ${i + 1} fault` : '',
      )
      .filter(Boolean);
    return z.length ? z.join(', ') : 'All zones normal';
  });
  let sounding = false;
  return {
    object: group,
    parts,
    /** The monitor `dt` seconds on, its zones' probes `wet`, their leads `broken`. */
    update(dt: number, nowWet: boolean[], broken: boolean[] = []) {
      wet = nowWet;
      monitor = stepLeakMonitor(monitor, wet, broken, dt);
      parts.update(dt);
      const s = leakMonitorShows(monitor);
      power.emissiveIntensity = s.power ? 1.4 : 0;
      zones.forEach((m, i) => (m.emissiveIntensity = s.leak[i] ? 1.8 : 0));
      fault.emissiveIntensity = s.fault ? 1.6 : 0;
      shown = monitor;
      if (s.sounder !== sounding) {
        sounding = s.sounder;
        partAudio.hold(group, sounding ? ALARM_BUZZER : null, group);
      }
      return s;
    },
    state: (): LeakMonitor => shown,
  };
}

/**
 * Leak detection on a dev room's stand: a length of double-contained
 * pipe with its low-point port, and the monitor on a post beside it,
 * zone 1 its probe. Every couple of minutes a seep begins in the annulus
 * (there is no leaking plant yet), the probe wets, zone 1 latches and
 * sounds; open the drain to empty it, shut it, and RESET.
 */
export function createLeakDetectionDemo(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const galv = t.paint('#a9afaf', 0.38, 0.75);
  const R = 0.0315;
  for (const x of [-0.5, 0.5])
    t.box(group, galv, 0.04, 1.2, 0.04, x, 0.6, -0.05);
  t.box(group, galv, 1.1, 0.04, 0.04, 0, 1.18, -0.05);
  const pipeY = 1.05;
  t.cyl(group, t.paint('#3a3d40', 0.5), R, 1.0, 0, pipeY, 0.02, 'x', 24);
  const port = createLeakPort(kit, R);
  port.object.position.set(0, pipeY, 0.02);
  group.add(port.object);
  const mon = createLeakMonitor(kit);
  mon.object.position.set(0.75, 1.3, -0.07);
  t.box(group, galv, 0.04, 1.3, 0.04, 0.75, 0.65, -0.09);
  group.add(mon.object);
  let low = newLowPoint();
  port.onDrain((open) => (low = { ...low, drainOpen: open }));
  const parts = createPartSet();
  for (const p of [port.parts, mon.parts])
    for (const [o, use] of p.uses) parts.uses.set(o, use);
  let time = 0;
  return {
    object: group,
    parts,
    update(delta: number) {
      time += delta;
      // A seep for 30 s in every 150.
      const seep = time % 150 < 30 ? 0.0004 : 0;
      low = stepLowPoint(low, seep, delta);
      port.show(low);
      mon.update(delta, [probeWet(low)]);
    },
    status: () => {
      const z = mon.state().zones[0];
      return `Leak detection: low point ${probeWet(low) ? 'wet' : 'dry'}, drain ${low.drainOpen ? 'open' : 'shut'}; zone 1 ${z.latched ? 'LEAK' : 'normal'}`;
    },
  };
}
