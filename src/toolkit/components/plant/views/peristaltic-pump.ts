import {
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  TorusGeometry,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { brandLivery } from '../../core/views/brand-livery';
import { createPartSet, pushButton } from '../../core/parts/parts';
import { brandPlate } from './chlorella-plate';
import { plantTools } from './plant-tools';
import {
  box,
  circle,
  dotFrame,
  fillBox,
  isLit,
  text,
  textWidth,
} from '../../industrial-control/logic/dot-matrix';
import { hose } from './hose';
import { onPlinth } from './plinth';

/**
 * A small peristaltic dosing pump (the owner, 2026-10-27: the bland box
 * made to look the part), after the Watson-Marlow Qdos and 300 series: a
 * rounded cast casing on rubber feet; on its left face the pump head, a
 * clear hinged guard over a rotor whose three rollers squeeze a loop of
 * reinforced tube against the track, the tube in at the bottom and out at
 * the top through its clamps; Grundflow's (blue, orange, grey): on its
 * front a membrane keypad with a 120 × 72 dot graphic LCD (light blue dots
 * on dark blue, the controller's 5 × 7 font, a large figure at triple size) of
 * its rate, mode and flow, START, STOP, ▲ and ▼ keys that work, RUN and
 * ALARM lamps and the wordmark; a cable gland at the back. Its rotor
 * turns while it runs, faster for a higher rate.
 *
 * Metres, standing on y = 0, its front toward +z; `suctionAt` and
 * `dischargeAt` are where its tube leaves the head.
 */
export function createPeristalticPump(kit: PanelKit, label: string) {
  const t = plantTools(kit);
  const f = tools(kit);
  const maker = brandLivery(kit, 'grundflow');
  const group = new Group();
  const W = 0.17;
  const H = 0.19;
  const D = 0.15;
  const body = maker.paint.casing;
  const dark = t.paint('#25292b', 0.6);
  const rubber = t.paint('#151617', 0.9);

  // The casing on its four feet, a parting line round it.
  for (const [x, z] of [
    [-W / 2 + 0.02, -D / 2 + 0.02],
    [W / 2 - 0.02, -D / 2 + 0.02],
    [-W / 2 + 0.02, D / 2 - 0.02],
    [W / 2 - 0.02, D / 2 - 0.02],
  ] as const)
    t.cyl(group, rubber, 0.012, 0.01, x, 0.005, z, 'y', 12);
  const shell = new Mesh(new RoundedBoxGeometry(W, H, D, 4, 0.018), body);
  shell.position.set(0, 0.01 + H / 2, 0);
  group.add(shell);
  t.box(
    group,
    maker.paint.main,
    W + 0.002,
    0.012,
    D + 0.002,
    0,
    0.01 + H * 0.3,
    0,
  );

  // The pump head on the left face: its housing, the track, the rotor and
  // its rollers, the loop of tube, the clear guard.
  const hx = -W / 2 - 0.022;
  const hy = 0.01 + H * 0.55;
  const head = t.paint('#d7d9d4', 0.5);
  t.cyl(group, head, 0.058, 0.04, hx + 0.008, hy, 0.01, 'x', 32);
  const track = new Mesh(new TorusGeometry(0.044, 0.006, 8, 32), dark);
  track.rotation.y = Math.PI / 2;
  track.position.set(hx - 0.012, hy, 0.01);
  group.add(track);
  const rotor = new Group();
  rotor.position.set(hx - 0.014, hy, 0.01);
  rotor.userData.live = true;
  group.add(rotor);
  const steel = t.paint('#b8bcbc', 0.3, 0.7);
  t.cyl(rotor, steel, 0.012, 0.016, 0, 0, 0, 'x', 16);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const arm = t.box(
      rotor,
      steel,
      0.006,
      0.03,
      0.008,
      0,
      Math.cos(a) * 0.015,
      Math.sin(a) * 0.015,
    );
    arm.rotation.x = -a;
    t.cyl(
      rotor,
      steel,
      0.008,
      0.014,
      0,
      Math.cos(a) * 0.031,
      Math.sin(a) * 0.031,
      'x',
      14,
    );
  }
  const tubeMat = t.paint('#e3d9b8', 0.45);
  const loop = new Mesh(
    new TorusGeometry(0.039, 0.0045, 8, 32, Math.PI * 1.2),
    tubeMat,
  );
  loop.rotation.set(0, Math.PI / 2, Math.PI * 0.4 + Math.PI / 2);
  loop.position.set(hx - 0.014, hy, 0.01);
  group.add(loop);
  const guardMat = new MeshStandardMaterial({
    color: '#dff0f4',
    transparent: true,
    opacity: 0.28,
    roughness: 0.1,
    depthWrite: false,
  });
  kit.materials.push(guardMat);
  const guard = new Mesh(new CylinderGeometry(0.06, 0.06, 0.006, 32), guardMat);
  guard.rotation.z = Math.PI / 2;
  guard.position.set(hx - 0.026, hy, 0.01);
  group.add(guard);
  t.box(group, dark, 0.01, 0.022, 0.012, hx - 0.026, hy + 0.06, 0.01);
  // The tube's clamps, its ends out of the head below and above.
  const sx = hx - 0.012;
  const lowY = hy - 0.05;
  const highY = hy + 0.05;
  const sz = 0.055;
  t.box(group, maker.paint.accent, 0.02, 0.014, 0.02, sx, lowY, sz);
  t.box(group, maker.paint.accent, 0.02, 0.014, 0.02, sx, highY, sz);

  // The front, after the Qdos: a dark membrane keypad panel in Grundflow's
  // blue surround; a colour TFT (light blue on dark blue) showing its rate,
  // mode and a flow bar; START (green) and STOP (red) keys, ▲ and ▼ to set
  // the rate; RUN and ALARM lamps; Grundflow's wordmark beneath.
  const front = D / 2 + 0.001;
  const panelY = 0.01 + H * 0.56;
  t.box(
    group,
    maker.paint.main,
    W * 0.86,
    H * 0.8,
    0.004,
    0.01,
    panelY,
    front + 0.001,
  );
  t.box(
    group,
    t.paint('#1e2226', 0.28),
    W * 0.78,
    H * 0.72,
    0.003,
    0.01,
    panelY,
    front + 0.004,
  );
  // A 120 × 72 dot graphic LCD, light blue dots on dark blue, each dot
  // drawn as a square with a gap, the unlit ones faintly showing.
  const GW = 120;
  const GH = 72;
  const P = 4;
  const tft = f.printed(0.1, 0.06, () => {}, GW * P, true);
  tft.mesh.position.set(0.01, 0.01 + H * 0.74, front + 0.0058);
  tft.mesh.userData.live = true;
  group.add(tft.mesh);
  const drawTft = (
    on: boolean,
    running: boolean,
    rate: number,
    alarm: boolean,
    phase: number,
  ) => {
    const fr = dotFrame(GW, GH);
    if (on) {
      fillBox(fr, 0, 0, GW, 10);
      text(fr, 2, 2, label.slice(0, 12), 1, false);
      const state = alarm ? 'ALARM' : running ? 'RUN' : 'STOP';
      text(fr, GW - 2 - textWidth(state), 2, state, 1, false);
      text(fr, 2, 15, 'MANUAL');
      text(fr, 2, 26, `${String(Math.round(rate * 100)).padStart(3)}%`);
      const value = (rate * 30).toFixed(1);
      text(fr, GW - 3 - textWidth(value, 3), 14, value, 3);
      text(fr, GW - 3 - textWidth('L/H'), 38, 'L/H');
      box(fr, 2, 52, 96, 12);
      fillBox(fr, 4, 54, Math.round(92 * rate), 8);
      circle(fr, 109, 58, 7);
      for (let i = 0; i < 3; i++) {
        const a = phase + (i / 3) * Math.PI * 2;
        fillBox(fr, 108 + Math.cos(a) * 4, 57 + Math.sin(a) * 4, 2, 2);
      }
    }
    const c = tft.context;
    const w = c.canvas.width;
    const h = c.canvas.height;
    const px = w / GW;
    const py = h / GH;
    c.fillStyle = on ? '#0a2142' : '#05070a';
    c.fillRect(0, 0, w, h);
    for (let y = 0; y < GH; y++)
      for (let x = 0; x < GW; x++) {
        const lit = isLit(fr, x, y);
        if (!lit && !on) continue;
        c.fillStyle = lit ? '#9fdcff' : '#10305a';
        c.fillRect(x * px, y * py, px - 1, py - 1);
      }
    tft.texture.needsUpdate = true;
  };
  const parts = createPartSet();
  let on = true;
  let rate = 0.45;
  const key = (
    colour: 'green' | 'red' | 'black',
    legend: string,
    x: number,
    y: number,
    action: () => void,
  ) => {
    const b = pushButton(kit, { colour, legend, action });
    b.object.position.set(x, y, front + 0.005);
    b.object.scale.setScalar(0.28);
    group.add(b.object);
    f.label(
      group,
      legend === 'UP' ? '▲' : legend === 'DOWN' ? '▼' : legend,
      x,
      y - 0.012,
      front + 0.0055,
      0.0045,
      '#cfd6db',
    );
    parts.add(b);
  };
  const keyY = 0.01 + H * 0.4;
  key('green', 'START', -0.045, keyY, () => (on = true));
  key('red', 'STOP', -0.015, keyY, () => (on = false));
  key('black', 'UP', 0.025, keyY, () => (rate = Math.min(1, rate + 0.05)));
  key('black', 'DOWN', 0.055, keyY, () => (rate = Math.max(0.05, rate - 0.05)));
  const lamp = (colour: string, x: number) => {
    const m = new MeshStandardMaterial({
      color: '#2b2f2e',
      emissive: colour,
      emissiveIntensity: 0,
      roughness: 0.4,
    });
    kit.materials.push(m);
    t.cyl(
      group,
      m,
      0.003,
      0.004,
      x,
      0.01 + H * 0.27,
      front + 0.006,
      'z',
      12,
    ).userData.live = true;
    return m;
  };
  const runLamp = lamp('#3ee05a', -0.045);
  const alarmLamp = lamp('#ff4a2e', -0.03);
  f.label(
    group,
    'RUN  ALARM',
    -0.035,
    0.01 + H * 0.22,
    front + 0.0055,
    0.0045,
    '#cfd6db',
  );
  const mark = brandPlate(kit, 'grundflow', 0.075, 'PERI 30');
  mark.position.set(0.035, 0.01 + H * 0.24, front + 0.0056);
  group.add(mark);
  // A fine cast texture: shallow ribs along the casing's top.
  for (let i = 0; i < 6; i++)
    t.box(
      group,
      maker.paint.shade,
      W * 0.7,
      0.002,
      0.004,
      0.01,
      0.01 + H + 0.001,
      -D / 2 + 0.03 + i * 0.018,
    );
  f.label(
    group,
    label,
    0.012,
    0.01 + H * 0.06,
    front,
    0.006,
    '#1b1b1b',
    '#f4f3ee',
  );

  // The cable gland at the back, its lead down to the floor.
  t.cyl(group, dark, 0.008, 0.014, W / 2 - 0.03, 0.05, -D / 2 - 0.007, 'z', 10);
  hose(
    group,
    rubber,
    [
      [W / 2 - 0.03, 0.05, -D / 2 - 0.014],
      [W / 2 - 0.03, 0.006, -D / 2 - 0.08],
    ],
    0.004,
    0.01,
  );

  let shown = '';
  let phase = 0;
  let wasRunning = false;
  return {
    object: group,
    parts,
    /** Where its tube leaves its head: suction below, discharge above. */
    suctionAt: [sx, lowY, sz] as const,
    dischargeAt: [sx, highY, sz] as const,
    /** Whether it is running: switched on, and asked to dose. */
    running: () => wasRunning,
    /** `demand`: there is chemical to dose and the process asks for it. */
    update(delta: number, demand: boolean, alarm = false) {
      parts.update(delta);
      const running = on && demand && !alarm;
      wasRunning = running;
      if (running) {
        rotor.rotation.x -= delta * (2 + rate * 10);
        phase += delta * (2 + rate * 10);
      }
      runLamp.emissiveIntensity = running ? 1.6 : 0;
      alarmLamp.emissiveIntensity = alarm ? 1.6 : 0;
      const k = `${on}${running}${Math.round(rate * 100)}${alarm}${running ? Math.round(phase * 4) : 0}`;
      if (k === shown) return;
      shown = k;
      drawTft(on, running, rate, alarm, phase);
    },
    status: () =>
      `${label} peristaltic pump: ${on ? (wasRunning ? 'running' : 'standing by') : 'stopped'}, ${(rate * 30).toFixed(1)} l/h`,
  };
}

/** The peristaltic pump alone on a plinth, for trying it: always asked to dose. */
export function createPeristalticDemo(kit: PanelKit) {
  const pump = createPeristalticPump(kit, 'DEMO DOSING');
  const object = onPlinth(kit, pump.object, 0.36);
  return {
    object,
    parts: pump.parts,
    update: (delta: number) => pump.update(delta, true),
    status: pump.status,
  };
}
