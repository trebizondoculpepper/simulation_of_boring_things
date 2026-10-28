import { Group, Mesh, MeshStandardMaterial } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { brandLivery } from '../../core/views/brand-livery';
import { createPartSet } from '../../core/parts/parts';
import { keyLegend, membraneKey } from './membrane-key';
import { piezoSounder } from '../../sound/audio/piezo-recordings';
import type { Part } from '../../core/parts/parts';
import { brandPlate } from './chlorella-plate';
import { plantTools } from './plant-tools';
import { describe } from './describe';
import { roundedSlab } from './rounded-slab';
import { hose } from './hose';
import { onPlinth } from './plinth';
import {
  box,
  dotFrame,
  fillBox,
  isLit,
  text,
  textWidth,
} from '../../industrial-control/logic/dot-matrix';
import { partAudio } from '../../core/audio/part-audio';
import { SOLENOID_PUMP, STEPPER_PUMP } from '../audio/dosing-pump-sounds';
import {
  DIAPHRAGM_PUMPS,
  diaphragmDisplay,
  diaphragmOutput,
  newDiaphragmState,
  pressKey,
  strokesOn,
} from '../logic/diaphragm-pump';
import type {
  Demand,
  DiaphragmKey,
  DiaphragmKind,
  DiaphragmOutput,
} from '../logic/diaphragm-pump';

/**
 * Each kind's shape, metres, in the pump's own frame (standing on y = 0,
 * its front toward +z, its dosing head at its left, −x): its casing (its
 * middle, size and corner radius), its head (its middle, radius and
 * length), where its suction and discharge valves are (their middles) and
 * where the tubes meet them, and its fascia's middle and size on the flat
 * of its front. The heads and the tube ends are where the old models had
 * them, so the boards' tubes still meet them.
 */
const SHAPES = {
  solenoid: {
    body: { x: 0.025, y: 0.095, z: 0, w: 0.17, h: 0.15, d: 0.11, r: 0.014 },
    foot: { w: 0.2, h: 0.02, d: 0.13 },
    head: { x: -0.095, y: 0.1, r: 0.04, len: 0.05 },
    suction: { y: 0.05, len: 0.04, tube: 0.035 },
    discharge: { y: 0.15, len: 0.04, tube: 0.17 },
    fascia: { x: 0.025, y: 0.095, w: 0.138, h: 0.118 },
    lcd: { x: 0.005, y: 0.125, w: 0.07, h: 0.035, gw: 96, gh: 48 },
    // Centred on its fascia (the owner, 2026-10-28).
    keys: { y: 0.074, x: [-0.023, 0.001, 0.025, 0.049, 0.073], scale: 0.22 },
    lamps: { x: 0.066, y: [0.142, 0.127, 0.112] },
    // Within its fascia's dark panel, clear of the border (the owner).
    plate: { x: 0.05, y: 0.0515, w: 0.05 },
  },
  stepper: {
    body: { x: 0.02, y: 0.132, z: -0.01, w: 0.15, h: 0.24, d: 0.17, r: 0.02 },
    foot: { w: 0.196, h: 0.012, d: 0.17 },
    head: { x: -0.075, y: 0.13, r: 0.045, len: 0.05 },
    suction: { y: 0.075, len: 0.04, tube: 0.07 },
    discharge: { y: 0.185, len: 0.04, tube: 0.19 },
    fascia: { x: 0.02, y: 0.14, w: 0.106, h: 0.196 },
    lcd: { x: 0.02, y: 0.2, w: 0.078, h: 0.046, gw: 96, gh: 56 },
    keys: { y: 0.138, x: [-0.02, 0, 0.02, 0.04, 0.06], scale: 0.2 },
    lamps: { x: -0.018, y: [0.105, 0.09, 0.075] },
    plate: { x: 0.035, y: 0.06, w: 0.06 },
  },
} as const;

export interface DiaphragmPump {
  object: Group;
  /** Its keys, as a set (stepped by whoever shows it, not by `update`), and each. */
  parts: ReturnType<typeof createPartSet>;
  keys: readonly Part[];
  /** Where its tubes meet its valves: suction below, discharge above. */
  suctionAt: readonly [number, number, number];
  dischargeAt: readonly [number, number, number];
  /** What it does now. */
  output(): DiaphragmOutput;
  /** A step on: `demand` its controller's, `powered` its supply's. */
  /**
   * A step on: `demand` its controller's, `powered` its supply's, `fault`
   * what it has stopped for, as the world's pump model has it (prompt 102:
   * its gas detection's `flow`), lighting ERROR and stopping it.
   */
  update(
    delta: number,
    demand: Demand,
    powered?: boolean,
    fault?: string | null,
  ): void;
  status(): string;
}

/**
 * A diaphragm metering pump (prompt 089, item 2; the owner, 2026-10-27),
 * to the peristaltic pump's standard (`peristaltic-pump.ts`) and staying
 * what it is: Grundflow's, after the ProMinent gamma/ X (`solenoid`, lying
 * on its foot) or the Grundfos SMART Digital DDA (`stepper`, upright on
 * its click-stop plate). A rounded clamshell of cast polymer with a
 * parting seam, rubber feet; on its left its PVDF dosing head, its bolts,
 * its suction valve below and discharge valve above on their union nuts,
 * its bleed (priming) knob; on its front a membrane fascia with a 5 × 7
 * dot-matrix LCD (its rate, mode, percentage and strokes a minute), START,
 * STOP, ▲, ▼ and P keys that work, and STROKE, WARN and ERROR lamps, the
 * stroke lamp flashing with each stroke as the head's diaphragm pulses
 * and the solenoid ticks (or the stepper whirrs); Grundflow's plate; a
 * cable gland at the back. Its controller asks it to dose
 * (`update`'s `demand`); in AUTO it doses the controller's rate, in
 * MANUAL its own while released.
 */
export function createDiaphragmPump(
  kit: PanelKit,
  label: string,
  kind: DiaphragmKind,
): DiaphragmPump {
  const s = SHAPES[kind];
  const spec = DIAPHRAGM_PUMPS[kind];
  const t = plantTools(kit);
  const f = tools(kit);
  const maker = brandLivery(kit, 'grundflow');
  const group = new Group();
  group.name = `${label} dosing pump`;
  const dark = t.paint('#25292b', 0.6);
  const rubber = t.paint('#151617', 0.9);
  const B = s.body;

  // Its foot, on rubber feet.
  t.box(
    group,
    maker.paint.shade,
    s.foot.w,
    s.foot.h,
    s.foot.d,
    B.x - 0.005,
    0.003 + s.foot.h / 2,
    B.z,
  );
  for (const dx of [-1, 1])
    for (const dz of [-1, 1])
      t.cyl(
        group,
        rubber,
        0.008,
        0.006,
        B.x - 0.005 + dx * (s.foot.w / 2 - 0.015),
        0.003,
        B.z + dz * (s.foot.d / 2 - 0.015),
        'y',
        10,
      );
  // The clamshell, its seam round it a little behind the front.
  const shell = new Mesh(
    new RoundedBoxGeometry(B.w, B.h, B.d, 4, B.r),
    maker.paint.casing,
  );
  shell.position.set(B.x, B.y + 0.003, B.z);
  group.add(shell);
  const seam = new Mesh(
    roundedSlab(B.w + 0.002, B.h + 0.002, 0.004, B.r + 0.001),
    t.paint('#3a3f42', 0.6),
  );
  seam.position.set(B.x, B.y + 0.003, B.z - B.d * 0.15);
  group.add(seam);
  // Shallow cast ribs along its top.
  for (let i = 0; i < 5; i++)
    t.box(
      group,
      maker.paint.shade,
      B.w * 0.6,
      0.002,
      0.004,
      B.x + 0.01,
      B.y + 0.003 + B.h / 2 + 0.001,
      B.z - B.d / 2 + 0.025 + i * ((B.d - 0.05) / 4),
    );

  // The dosing head: its backplate on the casing, the PVDF head, its six
  // bolts, its diaphragm's cover (which pulses with each stroke), and its
  // valves below and above on their union nuts; its bleed knob in front.
  const H = s.head;
  const pvdf = t.paint('#ecebe4', 0.4);
  const steel = t.paint('#b8bcbc', 0.3, 0.7);
  t.cyl(
    group,
    dark,
    H.r * 1.08,
    0.012,
    H.x + H.len / 2 + 0.006,
    H.y,
    0,
    'x',
    28,
  );
  t.cyl(group, pvdf, H.r, H.len, H.x, H.y, 0, 'x', 28);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    t.cyl(
      group,
      steel,
      0.004,
      0.008,
      H.x - H.len / 2 - 0.002,
      H.y + Math.cos(a) * H.r * 0.78,
      Math.sin(a) * H.r * 0.78,
      'x',
      6,
    );
  }
  const cover = new Group();
  cover.position.set(H.x - H.len / 2, H.y, 0);
  cover.userData.live = true;
  group.add(cover);
  t.cyl(cover, pvdf, H.r * 0.55, 0.012, -0.006, 0, 0, 'x', 24);
  const nut = t.paint('#d9d8d0', 0.45);
  for (const v of [s.suction, s.discharge]) {
    t.cyl(group, pvdf, 0.012, v.len, H.x, v.y, 0, 'y', 14);
    const out = v === s.suction ? -1 : 1;
    t.cyl(
      group,
      nut,
      0.016,
      0.012,
      H.x,
      v.y + out * (v.len / 2 - 0.004),
      0,
      'y',
      6,
    );
  }
  // Its arrow, suction up to discharge, moulded on the head.
  f.label(group, '↑', H.x, H.y, H.r + 0.0005, 0.016, '#7a7c78');
  // The bleed (priming) knob on the head's front.
  t.cyl(
    group,
    t.paint('#c42b23', 0.4),
    0.007,
    0.02,
    H.x,
    H.y - 0.012,
    H.r + 0.008,
    'z',
    10,
  );

  // The fascia, on the flat of its front.
  const front = B.z + B.d / 2 + 0.001;
  const F = s.fascia;
  t.box(
    group,
    maker.paint.main,
    F.w,
    F.h,
    0.004,
    F.x,
    F.y + 0.003,
    front + 0.001,
  );
  t.box(
    group,
    t.paint('#1e2226', 0.28),
    F.w - 0.008,
    F.h - 0.008,
    0.003,
    F.x,
    F.y + 0.003,
    front + 0.004,
  );
  // A dot-matrix LCD, light blue dots on dark blue, the unlit ones faint.
  const L = s.lcd;
  const lcd = f.printed(L.w, L.h, () => {}, L.gw * 4, true);
  lcd.mesh.position.set(L.x, L.y + 0.003, front + 0.0058);
  lcd.mesh.userData.live = true;
  group.add(lcd.mesh);
  let drawnDots: Uint8Array | null = null;
  let drawnLines: ReturnType<typeof diaphragmDisplay> = null;
  const drawLcd = (
    lines: ReturnType<typeof diaphragmDisplay>,
    flash: boolean,
  ) => {
    const fr = dotFrame(L.gw, L.gh);
    if (lines) {
      fillBox(fr, 0, 0, L.gw, 10);
      text(fr, 2, 2, lines.top, 1, false);
      text(fr, L.gw - 2 - textWidth(lines.state), 2, lines.state, 1, false);
      const big = L.gh >= 56 ? 3 : 2;
      text(fr, 2, 14, lines.rate, big);
      text(fr, L.gw - 2 - textWidth(lines.unit), 14 + 7 * big - 7, lines.unit);
      text(fr, 2, L.gh - 9, lines.foot);
      // The stroke marker: a box that fills for each stroke.
      box(fr, L.gw - 10, 14, 8, 8);
      if (flash) fillBox(fr, L.gw - 8, 16, 4, 4);
    }
    const c = lcd.context;
    const w = c.canvas.width;
    const h = c.canvas.height;
    const px = w / L.gw;
    const py = h / L.gh;
    // Only the dots that changed are painted again (a stroke's marker is
    // sixteen of them), each over its own square: the whole matrix only
    // when it is switched on or off (mission 094).
    const whole = !drawnDots || !lines !== !drawnLines;
    if (whole) {
      c.fillStyle = lines ? '#0a2142' : '#05070a';
      c.fillRect(0, 0, w, h);
    }
    for (let y = 0; y < L.gh; y++)
      for (let x = 0; x < L.gw; x++) {
        const lit = isLit(fr, x, y);
        if (!whole && drawnDots![y * L.gw + x] === fr.dots[y * L.gw + x])
          continue;
        if (!lit && !lines) continue;
        c.fillStyle = lit ? '#9fdcff' : '#10305a';
        c.fillRect(x * px, y * py, px - 1, py - 1);
      }
    drawnDots = fr.dots;
    drawnLines = lines;
    lcd.texture.needsUpdate = true;
  };
  // Its keys.
  const parts = createPartSet();
  const keyParts: Part[] = [];
  let state = newDiaphragmState();
  const K = s.keys;
  // Its sounder behind the fascia (mission 100): Grundflow's pitch.
  const beeper = piezoSounder({ pitch: 'high', room: 'small' }, group);
  let faultHeard: string | null = null;
  // Its keys: plain grey membrane keys, START's green bar and STOP's red,
  // their legends printed on the fascia above them (the owner, 2026-10-28;
  // `membrane-key.ts`).
  const keys: [DiaphragmKey, 'green' | 'red' | undefined, string, string][] = [
    ['start', 'green', 'START', 'START'],
    ['stop', 'red', 'STOP', 'STOP'],
    ['up', undefined, 'UP', '▲'],
    ['down', undefined, 'DOWN', '▼'],
    ['mode', undefined, 'P', 'P'],
  ];
  keys.forEach(([k, accent, legend, mark], i) => {
    const b = membraneKey(kit, {
      legend: mark,
      accent,
      // The stepper's narrower fascia takes narrower keys, with a margin.
      w: kind === 'stepper' ? 0.012 : 0.014,
      name: `${label} ${legend}`,
      action: () => {
        const next = pressKey(state, k);
        // Its piezo: a chirp for each key, a confirm for START, the error
        // bleep for a key that changes nothing (▲ at its most, ▼ at its least).
        if (k === 'start') beeper.play('confirm');
        else if ((k === 'up' || k === 'down') && next.manual === state.manual)
          beeper.play('error');
        else beeper.key();
        state = next;
      },
    });
    b.object.position.set(K.x[i], K.y, front + 0.0056);
    group.add(b.object);
    keyLegend(kit, group, mark, K.x[i], K.y, front + 0.0064);
    parts.add(b);
    keyParts.push(b);
  });
  // Its lamps: STROKE (green), WARN (yellow), ERROR (red).
  const lamp = (colour: string, y: number, name: string) => {
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
      0.0028,
      0.004,
      s.lamps.x,
      y + 0.003,
      front + 0.006,
      'z',
      12,
    ).userData.live = true;
    f.label(
      group,
      name,
      s.lamps.x + 0.014,
      y + 0.003,
      front + 0.0055,
      0.0036,
      '#cfd6db',
    );
    return m;
  };
  const strokeLamp = lamp('#3ee05a', s.lamps.y[0], 'STROKE');
  lamp('#ffcc33', s.lamps.y[1], 'WARN');
  const errorLamp = lamp('#ff4a2e', s.lamps.y[2], 'ERROR');
  const plate = brandPlate(kit, 'grundflow', s.plate.w, spec.model);
  plate.position.set(s.plate.x, s.plate.y + 0.003, front + 0.0056);
  group.add(plate);
  // The cable gland at the back, its lead down to the floor.
  const back = B.z - B.d / 2;
  t.cyl(
    group,
    dark,
    0.007,
    0.012,
    B.x + B.w / 2 - 0.025,
    0.05,
    back - 0.006,
    'z',
    10,
  );
  hose(
    group,
    rubber,
    [
      [B.x + B.w / 2 - 0.025, 0.05, back - 0.012],
      [B.x + B.w / 2 - 0.025, 0.004, back - 0.07],
    ],
    0.004,
    0.01,
  );

  let out: DiaphragmOutput = { running: false, rate: 0, fraction: 0, spm: 0 };
  let phase = 0;
  let pulse = 0;
  let shown = '';
  let heard = false;
  const sound = kind === 'solenoid' ? SOLENOID_PUMP : STEPPER_PUMP;
  const words = () =>
    `${state.on ? (out.running ? 'Dosing' : 'Paused, not asked') : 'Stopped'}, ${out.rate.toFixed(2)} l/h, ${state.mode === 'auto' ? 'AUTO' : 'MANUAL'}, ${out.spm} strokes a minute`;
  describe(
    group,
    `${label}: Grundflow ${spec.model} diaphragm dosing pump`,
    words,
  );
  drawLcd(diaphragmDisplay(label, state, out), false);
  return {
    object: group,
    parts,
    keys: keyParts,
    suctionAt: [H.x, s.suction.tube, 0],
    dischargeAt: [H.x, s.discharge.tube, 0],
    output: () => out,
    update(delta, demand, powered = true, fault = null) {
      out = diaphragmOutput(
        kind,
        state,
        fault ? { ...demand, running: false } : demand,
        powered,
      );
      errorLamp.emissiveIntensity = powered && fault ? 1.6 : 0;
      if ((fault ?? null) !== faultHeard) {
        if (fault && powered) beeper.play('error');
        faultHeard = fault ?? null;
      }
      if (out.running !== heard) {
        heard = out.running;
        partAudio.hold(group, out.running ? sound : null, group);
      }
      const stroke = strokesOn(phase, out.spm, delta);
      phase = stroke.phase % 1000;
      if (stroke.began > 0) pulse = 0.12;
      pulse = Math.max(0, pulse - delta);
      const flash = out.running && pulse > 0;
      strokeLamp.emissiveIntensity = flash ? 1.8 : 0;
      // The diaphragm's cover pushes out a little on each discharge stroke.
      cover.position.x = H.x - H.len / 2 - (flash ? 0.0025 : 0);
      const shown0 = diaphragmDisplay(label, state, out, powered);
      const lines = shown0 && fault ? { ...shown0, state: 'ERR' } : shown0;
      const k = `${JSON.stringify(lines)}${flash}`;
      if (k === shown) return;
      shown = k;
      drawLcd(lines, flash);
    },
    status: () => `${label}: ${words()}`,
  };
}

/**
 * A diaphragm pump alone on a plinth, for trying it beside the
 * peristaltic pump (dev44): its controller always asking for half its
 * most; its tubes down to its bottle and away to its injection point.
 */
export function createDiaphragmDemo(kit: PanelKit, kind: DiaphragmKind) {
  const label = kind === 'solenoid' ? 'DEMO SOL' : 'DEMO STEP';
  const pump = createDiaphragmPump(kit, label, kind);
  const object = onPlinth(kit, pump.object, kind === 'solenoid' ? 0.36 : 0.4);
  const t = plantTools(kit);
  const tubeM = t.paint('#ece9dc', 0.45);
  const top = 1.0;
  const [sx, sy, sz] = pump.suctionAt;
  const [qx, qy, qz] = pump.dischargeAt;
  hose(
    object,
    tubeM,
    [
      [sx, top + sy, sz],
      [sx - 0.04, top + sy - 0.05, sz + 0.06],
      [-0.2, 0.6, 0.2],
      [-0.2, 0.01, 0.3],
    ],
    0.0045,
    0.02,
  );
  hose(
    object,
    tubeM,
    [
      [qx, top + qy, qz],
      [qx - 0.04, top + qy + 0.1, qz],
      [-0.15, 1.9, -0.25],
    ],
    0.0045,
    0.03,
  );
  const demand = { running: true, rate: DIAPHRAGM_PUMPS[kind].maxLh / 2 };
  return {
    object,
    parts: pump.parts,
    update: (delta: number) => pump.update(delta, demand),
    status: pump.status,
  };
}
