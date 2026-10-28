import { Group, Mesh } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createSevenSegment } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { brandLivery } from '../../core/views/brand-livery';
import { beginPart, createPartSet } from '../../core/parts/parts';
import { keyLegend, membraneKey } from './membrane-key';
import { piezoSounder } from '../../sound/audio/piezo-recordings';
import type { Part } from '../../core/parts/parts';
import { click, partAudio } from '../../core/audio/part-audio';
import { plantTools } from './plant-tools';
import { describe } from './describe';
import { hose } from './hose';
import {
  MOTOR_DIAPHRAGM_PUMP,
  MOTOR_PUMP_STROKE,
} from '../audio/dosing-pump-sounds';
import {
  DMH,
  motorPumpDisplay,
  motorPumpWords,
  pressMotorKey,
  setBleed,
  turnStrokeDial,
} from '../logic/motor-dosing-pump';
import type {
  MotorPumpInputs,
  MotorPumpKey,
  MotorPumpState,
} from '../logic/motor-dosing-pump';

/** Where the pump's state is kept, and what it is given (a demo's or the world's). */
export interface MotorPumpBinding {
  state(): MotorPumpState;
  change(f: (s: MotorPumpState) => MotorPumpState): void;
  inputs(): MotorPumpInputs;
}

/** What its last step did, for it to show and sound. */
export interface MotorPumpStrokes {
  /** Strokes that began, and of them how many delivered (its flow monitor's). */
  began: number;
  delivering: number;
}

export interface MotorDosingPump {
  object: Group;
  /** Its keys, dial and bleed valve, as a set and each, stepped by whoever shows it. */
  parts: ReturnType<typeof createPartSet>;
  partList: readonly Part[];
  /** Where its tubes meet it: suction below, discharge above, the return from its relief/bleed valve. */
  suctionAt: readonly [number, number, number];
  dischargeAt: readonly [number, number, number];
  returnAt: readonly [number, number, number];
  /** Show a step: its display, lamps and sounds, and its strokes. */
  show(delta: number, strokes: MotorPumpStrokes): void;
  status(): string;
}

/** A detent of its dial, and its bleed valve's quarter turn. */
const DETENT = click({ band: 3200, q: 3, decay: 0.008, level: 0.05 });
const QUARTER_TURN = click({ band: 1400, q: 2, decay: 0.02, level: 0.07 });

/**
 * Grundflow's DMH 21-10 motor-driven diaphragm metering pump (prompt 102),
 * after the ProMinent Sigma/ 1 control type at its true size (about 340
 * × 170 × 300 mm, 9 kg): a fibreglass-reinforced housing on a cast foot,
 * its fan-cooled 110 W motor at the right, its worm gearbox in the
 * middle with the stroke length dial on its top (0 to 100 %, a 5 % detent
 * a click, self-locking), its PVDF dosing head at the left with its
 * suction valve below and discharge valve above, its flow monitor on the
 * discharge valve (a green lamp that blinks for each stroke it sees
 * delivered), its integral relief and bleed valve (a red quarter-turn
 * knob, open anticlockwise) and its return nipple, and the diaphragm
 * rupture indicator's window on the head's lantern (green; red when the
 * diaphragm has burst). On the motor its control module, a 1990s membrane
 * fascia: a four-digit red LED readout, its L/H, SPM, % and mA lamps, MAN
 * and EXT, RUN, WARN and ERROR, and five keys: STOP/START, P (its mode),
 * i (what the readout shows), ▲ and ▼; its error codes printed beneath
 * (F flow, L level, d diaphragm). Grundflow's badge and rating plate.
 *
 * Its state is `bind`'s; it draws only what changes: the readout when
 * its text does, its lamps as materials.
 */
export function createMotorDosingPump(
  kit: PanelKit,
  label: string,
  bind: MotorPumpBinding,
): MotorDosingPump {
  const t = plantTools(kit);
  const f = tools(kit);
  const maker = brandLivery(kit, 'grundflow');
  const group = new Group();
  group.name = `${label} dosing pump`;
  const dark = t.paint('#26292a', 0.6);
  const rubber = t.paint('#151617', 0.9);
  const grey = t.paint('#8d9396', 0.45, 0.3);
  const pvdf = t.paint('#ecebe4', 0.4);
  const steel = t.paint('#b8bcbc', 0.3, 0.7);

  // The cast foot, on rubber feet.
  t.box(group, maker.paint.shade, 0.34, 0.018, 0.17, 0, 0.012, 0);
  for (const x of [-0.14, 0.14])
    for (const z of [-0.06, 0.06])
      t.cyl(group, rubber, 0.01, 0.006, x, 0.003, z, 'y', 10);

  // The motor at the right: its frame and cooling ribs, its fan cowl.
  const motorX = 0.085;
  const motorY = 0.09;
  t.cyl(group, grey, 0.055, 0.13, motorX, motorY, 0, 'x', 28);
  // Its cooling ribs, rings round the frame.
  for (let i = 0; i < 5; i++)
    t.cyl(
      group,
      grey,
      0.059,
      0.004,
      motorX - 0.05 + i * 0.025,
      motorY,
      0,
      'x',
      28,
    );
  t.cyl(group, dark, 0.05, 0.03, motorX + 0.08, motorY, 0, 'x', 28);
  for (let i = -2; i <= 2; i++)
    t.box(group, grey, 0.002, 0.07, 0.006, motorX + 0.096, motorY, i * 0.014);
  // Its terminal box, its cable gland and lead at the back.
  t.box(group, grey, 0.06, 0.03, 0.05, motorX, motorY - 0.01, -0.07);
  t.cyl(group, dark, 0.007, 0.012, motorX, motorY - 0.01, -0.1, 'z', 10);
  hose(
    group,
    rubber,
    [
      [motorX, motorY - 0.01, -0.106],
      [motorX, 0.004, -0.17],
    ],
    0.004,
    0.01,
  );

  // The gearbox, a rounded housing in Grundflow's colour.
  const gearX = -0.055;
  const gear = new Mesh(
    new RoundedBoxGeometry(0.13, 0.19, 0.15, 4, 0.02),
    maker.paint.casing,
  );
  gear.position.set(gearX, 0.115, 0);
  group.add(gear);
  const badge = maker.badge(0.019);
  badge.position.set(gearX, 0.165, 0.0755);
  group.add(badge);
  const plate = maker.nameplate(
    [`${DMH.model} PVT`, '21 l/h · 10 bar · 90 /min', '230 V 50 Hz 110 W IP65'],
    0.07,
    0.04,
  );
  plate.position.set(gearX, 0.075, 0.0755);
  group.add(plate);

  // The stroke length dial on the gearbox's top: a ribbed knob over a
  // printed scale, its pointer showing the stroke.
  const dialY = 0.21;
  const scale = f.printed(
    0.075,
    0.075,
    (c, w, h) => {
      // The housing's own colour round the dial's printed disc.
      c.fillStyle = maker.palette.casing;
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#e8e4da';
      c.beginPath();
      c.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#1c1a18';
      c.strokeStyle = '#1c1a18';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      for (let p = 0; p <= 100; p += 5) {
        const a = dialAngle(p / 100);
        const long = p % 25 === 0;
        c.lineWidth = long ? 4 : 2;
        c.beginPath();
        c.moveTo(
          w / 2 + Math.sin(a) * w * 0.47,
          h / 2 - Math.cos(a) * w * 0.47,
        );
        c.lineTo(
          w / 2 + Math.sin(a) * w * (long ? 0.38 : 0.42),
          h / 2 - Math.cos(a) * w * (long ? 0.38 : 0.42),
        );
        c.stroke();
        if (long) {
          c.font = `bold ${w * 0.075}px sans-serif`;
          c.fillText(
            String(p),
            w / 2 + Math.sin(a) * w * 0.31,
            h / 2 - Math.cos(a) * w * 0.31,
          );
        }
      }
      c.font = `bold ${w * 0.06}px sans-serif`;
      c.fillText('STROKE %', w / 2, h * 0.8);
    },
    256,
  ).mesh;
  scale.rotation.x = -Math.PI / 2;
  scale.position.set(gearX, dialY + 0.0015, 0);
  group.add(scale);
  const knob = new Group();
  knob.position.set(gearX, dialY, 0);
  group.add(knob);
  const knobBody = t.cyl(knob, dark, 0.02, 0.022, 0, 0.011, 0, 'y', 18);
  t.cyl(knob, dark, 0.016, 0.006, 0, 0.025, 0, 'y', 18);
  t.box(knob, t.paint('#f2efe6', 0.4), 0.003, 0.002, 0.02, 0, 0.0285, -0.01);
  const dialPart = beginPart(kit, `${label} stroke length dial`);
  dialPart.uses.set(knobBody, (direction = 1) => {
    bind.change((s) => turnStrokeDial(s, direction));
    partAudio.play(DETENT, knob);
  });
  dialPart.shows(
    () => `stroke length ${Math.round(bind.state().strokeLength * 100)} %`,
  );
  describe(
    knob,
    `${label}: stroke length dial`,
    () => `set to ${Math.round(bind.state().strokeLength * 100)} %`,
  );

  // The dosing head at the left: its lantern (with the rupture indicator's
  // window), the PVDF head and its bolts, its valves, flow monitor and
  // relief/bleed valve.
  const headX = -0.155;
  const headY = 0.11;
  t.cyl(group, maker.paint.shade, 0.05, 0.02, headX + 0.03, headY, 0, 'x', 28);
  t.cyl(group, pvdf, 0.055, 0.04, headX, headY, 0, 'x', 28);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    t.cyl(
      group,
      steel,
      0.005,
      0.01,
      headX - 0.021,
      headY + Math.cos(a) * 0.044,
      Math.sin(a) * 0.044,
      'x',
      6,
    );
  }
  // Green through its window while the diaphragm holds; red once it bursts.
  const intact = t.led(group, '#3ee05a', 0.006, headX + 0.03, headY, 0.051);
  intact.set(0.8);
  const burst = t.led(group, '#ff3b24', 0.006, headX + 0.03, headY, 0.0516);
  burst.set(1);
  burst.mesh.visible = false;
  intact.mesh.userData.live = burst.mesh.userData.live = true;
  f.label(
    group,
    'DIAPHRAGM',
    headX + 0.03,
    headY - 0.013,
    0.0515,
    0.003,
    '#e8e4da',
  );
  const nut = t.paint('#d9d8d0', 0.45);
  const valveTop = headY + 0.055;
  const valveBottom = headY - 0.055;
  for (const [y, out] of [
    [valveBottom, -1],
    [valveTop, 1],
  ] as const) {
    t.cyl(group, pvdf, 0.013, 0.05, headX, y, 0, 'y', 14);
    t.cyl(group, nut, 0.018, 0.014, headX, y + out * 0.026, 0, 'y', 6);
  }
  // The flow monitor round the discharge valve: a black ring, its lamp.
  t.cyl(group, dark, 0.02, 0.018, headX, valveTop - 0.004, 0, 'y', 16);
  const flowLamp = t.led(
    group,
    '#3ee05a',
    0.004,
    headX,
    valveTop - 0.004,
    0.021,
  );
  flowLamp.mesh.userData.live = true;
  f.label(
    group,
    'FLOW',
    headX + 0.018,
    valveTop + 0.008,
    0.012,
    0.0035,
    '#1b1b1b',
  );
  // The relief and bleed valve on the head's front, its return nipple
  // pointing down, its red knob a quarter turn from shut to open.
  const bleedAt = { x: headX - 0.006, y: headY + 0.02, z: 0.06 };
  t.cyl(
    group,
    pvdf,
    0.011,
    0.03,
    bleedAt.x,
    bleedAt.y,
    bleedAt.z - 0.008,
    'z',
    12,
  );
  t.cyl(
    group,
    pvdf,
    0.004,
    0.025,
    bleedAt.x,
    bleedAt.y - 0.02,
    bleedAt.z - 0.004,
    'y',
    8,
  );
  const bleedKnob = new Group();
  bleedKnob.position.set(bleedAt.x, bleedAt.y, bleedAt.z + 0.01);
  group.add(bleedKnob);
  const bleedBody = t.cyl(
    bleedKnob,
    t.paint('#c42b23', 0.4),
    0.013,
    0.012,
    0,
    0,
    0,
    'z',
    14,
  );
  t.box(bleedKnob, t.paint('#c42b23', 0.4), 0.034, 0.008, 0.01, 0, 0, 0.004);
  f.label(
    group,
    'BLEED',
    bleedAt.x,
    bleedAt.y + 0.022,
    0.062,
    0.0035,
    '#1b1b1b',
  );
  const bleedPart = beginPart(kit, `${label} relief and bleed valve`);
  // Anticlockwise (a click on its left) opens it, clockwise shuts it.
  bleedPart.uses.set(bleedBody, (direction = 1) => {
    bind.change((s) => setBleed(s, direction < 0));
    partAudio.play(QUARTER_TURN, bleedKnob);
  });
  bleedPart.shows(() => (bind.state().bleedOpen ? 'open' : 'shut'));
  describe(bleedKnob, `${label}: relief and bleed valve`, () =>
    bind.state().bleedOpen ? 'open to the return' : 'shut',
  );

  // The control module on the motor: a grey box, its membrane fascia.
  const cm = { x: 0.085, y: 0.2, w: 0.17, h: 0.11, d: 0.1 };
  const module = new Mesh(
    new RoundedBoxGeometry(cm.w, cm.h, cm.d, 3, 0.01),
    t.paint('#c9c6bd', 0.55),
  );
  module.position.set(cm.x, cm.y, 0.015);
  group.add(module);
  const face = 0.015 + cm.d / 2 + 0.001;
  t.box(
    group,
    maker.paint.main,
    cm.w - 0.01,
    cm.h - 0.01,
    0.002,
    cm.x,
    cm.y,
    face,
  );
  t.box(
    group,
    t.paint('#2a2b2d', 0.35),
    cm.w - 0.02,
    cm.h - 0.02,
    0.002,
    cm.x,
    cm.y,
    face + 0.0015,
  );
  const front = face + 0.003;
  const readout = createSevenSegment(kit, 4, { digitHeight: 0.012 });
  readout.group.position.set(cm.x - 0.03, cm.y + 0.024, front);
  readout.group.userData.live = true;
  group.add(readout.group);
  const ink = '#d8d4cc';
  const lamp = (
    colour: string,
    x: number,
    y: number,
    name: string,
    right = true,
  ) => {
    const led = t.led(group, colour, 0.0028, x, y, front + 0.001);
    led.mesh.userData.live = true;
    f.label(
      group,
      name,
      // Set beside its lamp by its width (about 3.2 mm a letter at this size).
      x + (right ? 1 : -1) * (0.0045 + name.length * 0.0016),
      y,
      front + 0.0005,
      0.0027,
      ink,
    );
    return led;
  };
  const units = {
    lh: lamp('#ff4a2e', cm.x + 0.016, cm.y + 0.04, 'L/H'),
    spm: lamp('#ff4a2e', cm.x + 0.016, cm.y + 0.029, 'SPM'),
    pct: lamp('#ff4a2e', cm.x + 0.016, cm.y + 0.018, '%'),
    ma: lamp('#ff4a2e', cm.x + 0.016, cm.y + 0.007, 'mA'),
  };
  const run = lamp('#3ee05a', cm.x + 0.05, cm.y + 0.04, 'RUN');
  const warn = lamp('#ffcc33', cm.x + 0.05, cm.y + 0.029, 'WARN');
  const error = lamp('#ff4a2e', cm.x + 0.05, cm.y + 0.018, 'ERR');
  const man = lamp('#ffcc33', cm.x - 0.06, cm.y - 0.008, 'MAN');
  const ext = lamp('#ffcc33', cm.x - 0.03, cm.y - 0.008, 'EXT');
  f.label(
    group,
    'Er F FLOW · Er L LEVEL · Er d DIAPH.',
    cm.x - 0.03,
    cm.y + 0.0395,
    front,
    0.0024,
    ink,
  );
  const parts = createPartSet();
  const partList: Part[] = [];
  // Its sounder behind the fascia (mission 100): lower than Grundflow's
  // other pumps, the older control module's.
  const beeper = piezoSounder({ pitch: 'mid', room: 'small' }, group);
  let errorHeard: string | null = null;
  const add = (p: Part) => partList.push(parts.add(p));
  add(dialPart.part());
  add(bleedPart.part());
  // Plain grey membrane keys, STOP/START's red bar, their legends printed
  // on the fascia above them (the owner, 2026-10-28).
  const keys: [MotorPumpKey, 'red' | undefined, string, string][] = [
    ['startStop', 'red', 'STOP/START', 'STOP/START'],
    ['mode', undefined, 'P', 'P'],
    ['info', undefined, 'i', 'i'],
    ['up', undefined, 'UP', '▲'],
    ['down', undefined, 'DOWN', '▼'],
  ];
  const keyY = cm.y - 0.03;
  keys.forEach(([k, accent, legend, mark], i) => {
    const x = cm.x - 0.054 + i * 0.026;
    const b: Part = membraneKey(kit, {
      legend: mark,
      accent,
      name: `${label} ${legend}`,
      action: () => {
        const before = bind.state();
        const after = pressMotorKey(before, k);
        // Its piezo: a confirm as STOP/START starts it, the error bleep for
        // a key that changes nothing or a start its fault refuses, else a
        // chirp.
        const refused =
          ((k === 'up' || k === 'down') && after.manual === before.manual) ||
          (k === 'startStop' && after.on && !!after.error);
        if (refused) beeper.play('error');
        else if (k === 'startStop' && after.on && !before.on)
          beeper.play('confirm');
        else beeper.key();
        bind.change(() => after);
      },
      w: i === 0 ? 0.02 : 0.014,
    });
    b.object.position.set(x, keyY, front - 0.0004);
    group.add(b.object);
    keyLegend(kit, group, mark, x, keyY, front + 0.0005);
    add(b);
  });

  let running = false;
  let flash = 0;
  let flowFlash = 0;
  let bleedShown: boolean | null = null;
  let dialShown = -1;
  let ruptureShown: boolean | null = null;
  const words = () => motorPumpWords(bind.state(), bind.inputs());
  describe(
    group,
    `${label}: Grundflow ${DMH.model} motor-driven metering pump`,
    words,
  );
  const show = (delta: number, strokes: MotorPumpStrokes) => {
    const s = bind.state();
    const i = bind.inputs();
    const d = motorPumpDisplay(s, i);
    if (s.error !== errorHeard) {
      if (s.error && i.powered) beeper.play('error');
      errorHeard = s.error;
    }
    readout.show(d ? d.text : '');
    for (const [k, led] of Object.entries(units))
      led.set(d?.unit === k ? 1 : 0);
    warn.set(d?.warn ? 1 : 0);
    error.set(d?.error ? 1 : 0);
    man.set(d?.manual ? 1 : 0);
    ext.set(d?.ext ? 1 : 0);
    // RUN lit while it runs, dipping at each stroke, as a Sigma's does.
    if (strokes.began > 0) {
      flash = 0.12;
      const sound = s.bleedOpen
        ? MOTOR_PUMP_STROKE.bleeding
        : strokes.delivering > 0
          ? MOTOR_PUMP_STROKE.delivering
          : MOTOR_PUMP_STROKE.locked;
      partAudio.play(sound, group);
    }
    if (strokes.delivering > 0) flowFlash = 0.15;
    flash = Math.max(0, flash - delta);
    flowFlash = Math.max(0, flowFlash - delta);
    run.set(d?.run ? (flash > 0 ? 0.25 : 1) : 0);
    flowLamp.set(i.powered && flowFlash > 0 ? 1 : 0);
    const now = !!d?.run;
    if (now !== running) {
      running = now;
      partAudio.hold(group, now ? MOTOR_DIAPHRAGM_PUMP : null, group);
    }
    if (s.bleedOpen !== bleedShown) {
      bleedShown = s.bleedOpen;
      bleedKnob.rotation.z = s.bleedOpen ? Math.PI / 2 : 0;
    }
    if (s.strokeLength !== dialShown) {
      dialShown = s.strokeLength;
      knob.rotation.y = -dialAngle(s.strokeLength);
    }
    if (s.ruptured !== ruptureShown) {
      ruptureShown = s.ruptured;
      burst.mesh.visible = s.ruptured;
      intact.mesh.visible = !s.ruptured;
    }
  };
  show(0, { began: 0, delivering: 0 });
  return {
    object: group,
    parts,
    partList,
    suctionAt: [headX, valveBottom - 0.034, 0],
    dischargeAt: [headX, valveTop + 0.034, 0],
    returnAt: [bleedAt.x, bleedAt.y - 0.033, bleedAt.z - 0.004],
    show,
    status: () => `${label}: ${words()}`,
  };
}

/** The dial's pointer angle for a stroke length (0 to 1): 300° of travel. */
function dialAngle(share: number) {
  return ((share - 0.5) * 300 * Math.PI) / 180;
}
