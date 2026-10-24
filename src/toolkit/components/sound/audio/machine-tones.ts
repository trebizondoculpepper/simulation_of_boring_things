import { effect } from '@preact/signals-core';
import type { Readable } from '../../core/logic/world/components';
import type { LoopRecipe } from '../../core/audio/part-audio';

/**
 * A small library of machine tones: hums and the noise of cooling fans,
 * pumps and compressors, synthesised once into seamless loops of
 * `TONE_LOOP_SECONDS` and played at any speed (`machineTone`). They are
 * not one to a part: a part takes whichever suits it and plays it faster
 * or slower, as a bigger fan turns slower and a smaller one whines. Each
 * is rendered from a seed, so it is the same every time; the loops are
 * tried out in dev7, the listening room, before they are given to parts.
 * American mains, 60 Hz, so magnetic hum is at 120 Hz and its harmonics.
 */

export const TONE_LOOP_SECONDS = 4;

export type MachineToneId =
  | 'cabinet-fan'
  | 'fan-tray'
  | 'blower'
  | 'side-channel'
  | 'transformer'
  | 'motor'
  | 'pump'
  | 'compressor'
  | 'coolant'
  | 'drive-fan'
  | 'turbine'
  | 'worn-fan'
  | 'gear-motor'
  | 'drain-gurgle';

export interface MachineTone {
  id: MachineToneId;
  /** What it is, as on its stand. */
  name: string;
  /** What it sounds like, in a few words. */
  caption: string;
  /**
   * How it starts and stops: seconds to run up to speed from rest, and to
   * run down to rest from full speed, and how fast it goes, as a share of
   * full speed, the moment it starts (1 for what does not turn: a
   * transformer only fades in and out).
   */
  spin: { up: number; down: number; floor: number };
}

export const MACHINE_TONES: readonly MachineTone[] = [
  {
    id: 'transformer',
    name: 'TRANSFORMER HUM',
    caption: 'A loaded transformer: a low, coarse buzz and rumble',
    spin: { up: 0.25, down: 0.4, floor: 1 },
  },
  {
    id: 'motor',
    name: 'MOTOR HUM',
    caption: 'An induction motor running, a little rough',
    spin: { up: 2, down: 5, floor: 0.08 },
  },
  {
    id: 'gear-motor',
    name: 'GEAR MOTOR',
    caption:
      'A small geared actuator motor: a whine on 271 Hz and its gears, quick to run up and stop',
    // A small motor and its gearbox: up to speed in a breath, stopped by
    // its load almost at once, and silent at rest.
    spin: { up: 0.35, down: 0.25, floor: 0.12 },
  },
  {
    id: 'drain-gurgle',
    name: 'DRAIN GURGLE',
    caption:
      'Water running from a drain-down pipe into a tundish and away down its gully',
    // Not a machine: it fades in as the water arrives and out as it stops.
    spin: { up: 0.4, down: 1.2, floor: 1 },
  },
  {
    id: 'cabinet-fan',
    name: 'CABINET FAN',
    caption: 'A 120 mm axial fan pulling air through louvres',
    spin: { up: 2.5, down: 6, floor: 0.05 },
  },
  {
    id: 'drive-fan',
    name: 'DRIVE FAN',
    caption: 'A small heatsink fan, and the whine of switching',
    spin: { up: 1.5, down: 4, floor: 0.05 },
  },
  {
    id: 'fan-tray',
    name: 'FAN TRAY',
    caption: 'Three small, fast fans, beating against each other',
    spin: { up: 3, down: 5, floor: 0.1 },
  },
  {
    id: 'blower',
    name: 'BLOWER',
    caption: 'A squirrel-cage blower: rumble and whoosh',
    spin: { up: 4, down: 9, floor: 0.05 },
  },
  {
    id: 'side-channel',
    name: 'SIDE-CHANNEL BLOWER',
    caption:
      'A regenerative air blower, as under a spa: a hard, high siren over a hiss of air',
    // A light impeller on a two-pole motor: up to speed in a couple of
    // seconds, and a long, falling wail as it coasts down.
    spin: { up: 1.8, down: 6, floor: 0.06 },
  },
  {
    id: 'worn-fan',
    name: 'WORN FAN',
    caption: 'A fan with a dry bearing: ticking and a faint squeal',
    spin: { up: 3, down: 3.5, floor: 0.05 },
  },
  {
    id: 'pump',
    name: 'COOLANT PUMP',
    caption: 'A centrifugal pump, and now and then a gurgle',
    spin: { up: 1.5, down: 2.5, floor: 0.1 },
  },
  {
    id: 'coolant',
    name: 'COOLANT FLOW',
    caption: 'Liquid rushing through pipes, swelling and settling',
    spin: { up: 3, down: 4, floor: 0.4 },
  },
  {
    id: 'compressor',
    name: 'COMPRESSOR',
    caption: 'A reciprocating refrigeration compressor chugging',
    spin: { up: 0.8, down: 1.2, floor: 0.3 },
  },
  {
    id: 'turbine',
    name: 'TURBINE WHINE',
    caption: 'A high-speed rotor: a thin, steady, eerie whine',
    spin: { up: 8, down: 14, floor: 0.03 },
  },
];

/** A seeded random number generator (mulberry32). */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The tools for one loop at one sample rate. Every periodic thing in a
 * loop has a whole number of cycles in it, so the loop joins without a
 * click: `hz` rounds a frequency to the nearest that does.
 */
function loopTools(sampleRate: number, seed: number) {
  const n = Math.round(sampleRate * TONE_LOOP_SECONDS);
  const random = seeded(seed);
  const hz = (f: number) =>
    Math.max(1, Math.round(f * TONE_LOOP_SECONDS)) / TONE_LOOP_SECONDS;
  const time = (i: number) => i / sampleRate;
  const rms = (x: Float32Array) => {
    let sum = 0;
    for (const v of x) sum += v * v;
    return Math.sqrt(sum / x.length) || 1;
  };
  /**
   * Noise through a band-pass filter (`q` > 0) or a low-pass (`q` = 0)
   * at `centre`, scaled to an RMS of 1. It is filtered from well before
   * the loop starts, and its last half second is crossfaded into its
   * first, so it loops with no seam.
   */
  const noise = (centre: number, q: number) => {
    const fade = Math.round(sampleRate * 0.5);
    const lead = Math.round(sampleRate * 0.2);
    const total = lead + n + fade;
    const raw = new Float32Array(total);
    const w = (2 * Math.PI * Math.min(centre, sampleRate * 0.45)) / sampleRate;
    if (q > 0) {
      // A band-pass biquad (RBJ, constant peak gain).
      const alpha = Math.sin(w) / (2 * q);
      const a0 = 1 + alpha;
      const b0 = alpha / a0;
      const b2 = -alpha / a0;
      const a1 = (-2 * Math.cos(w)) / a0;
      const a2 = (1 - alpha) / a0;
      let x1 = 0;
      let x2 = 0;
      let y1 = 0;
      let y2 = 0;
      for (let i = 0; i < total; i++) {
        const x = random() * 2 - 1;
        const y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2;
        x2 = x1;
        x1 = x;
        y2 = y1;
        y1 = y;
        raw[i] = y;
      }
    } else {
      // Two one-pole low-passes, for a softer slope.
      const k = 1 - Math.exp(-w);
      let y1 = 0;
      let y2 = 0;
      for (let i = 0; i < total; i++) {
        y1 += k * (random() * 2 - 1 - y1);
        y2 += k * (y1 - y2);
        raw[i] = y2;
      }
    }
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) out[i] = raw[lead + i];
    for (let i = 0; i < fade; i++) {
      const k = i / fade;
      // Equal power, the two halves being unrelated noise.
      out[i] =
        raw[lead + i] * Math.sin((k * Math.PI) / 2) +
        raw[lead + n + i] * Math.cos((k * Math.PI) / 2);
    }
    const scale = 1 / rms(out);
    for (let i = 0; i < n; i++) out[i] *= scale;
    return out;
  };
  /** Partials `[frequency, level]`, summed, with optional phases. */
  const partials = (list: [number, number][], into: Float32Array) => {
    for (const [f, level] of list) {
      const w = 2 * Math.PI * hz(f);
      const phase = random() * Math.PI * 2;
      for (let i = 0; i < n; i++)
        into[i] += level * Math.sin(w * time(i) + phase);
    }
    return into;
  };
  /** A slow wander, 1 ± `depth`, from a few looping sinusoids. */
  const wander = (depth: number, speeds = [0.25, 0.5, 0.75]) => {
    const out = new Float32Array(n);
    const waves = speeds.map((s) => ({
      w: 2 * Math.PI * hz(s),
      phase: random() * Math.PI * 2,
    }));
    for (let i = 0; i < n; i++) {
      let v = 0;
      for (const { w, phase } of waves) v += Math.sin(w * time(i) + phase);
      out[i] = 1 + (depth * v) / waves.length;
    }
    return out;
  };
  /**
   * A short sound placed at `at` seconds, wrapping round the loop's end,
   * so events can fall anywhere: `shape(t)` for t ≥ 0, over `length`.
   */
  const event = (
    into: Float32Array,
    at: number,
    length: number,
    shape: (t: number) => number,
  ) => {
    const start = Math.round(at * sampleRate);
    const count = Math.round(length * sampleRate);
    for (let k = 0; k < count; k++)
      into[(start + k) % n] += shape(k / sampleRate);
  };
  return { n, random, hz, time, noise, partials, wander, event, rms };
}

type Tools = ReturnType<typeof loopTools>;

/** Mix `[signal, level]` pairs, each scaled. */
function mix(n: number, layers: [Float32Array, number][]) {
  const out = new Float32Array(n);
  for (const [layer, level] of layers)
    for (let i = 0; i < n; i++) out[i] += layer[i] * level;
  return out;
}

/** An axial fan: its blade-pass tone, beaten by the turning rotor, and air. */
function fan(
  t: Tools,
  { rev, blades, air, airQ, tone }: Record<string, number>,
) {
  const bladePass = rev * blades;
  const whirr = t.partials(
    [
      [bladePass, 1],
      [bladePass * 2, 0.35],
      [bladePass * 3, 0.12],
    ],
    new Float32Array(t.n),
  );
  // The rotor is never quite balanced: each turn swells the tone a little.
  const turn = t.partials([[rev, 0.25]], new Float32Array(t.n));
  for (let i = 0; i < t.n; i++) whirr[i] *= 1 + turn[i];
  const rush = t.noise(air, airQ);
  const rumble = t.noise(rev * 2, 0);
  const swell = t.wander(0.12);
  return mix(t.n, [
    [whirr, tone],
    [rush, 0.32],
    [rumble, 0.12],
  ]).map((v, i) => v * swell[i]);
}

const RECIPES: Record<MachineToneId, (t: Tools) => Float32Array> = {
  transformer: (t) => {
    // Not a clean tone: the core's laminations buzz at 120 Hz and its
    // many harmonics, driven a little into saturation so they are coarse,
    // fluttering as the load shifts, over the low rumble of the steel and
    // its tank, with a gritty band of noise round the hum itself.
    const core = t.partials(
      [
        [120, 1],
        [240, 0.7],
        [360, 0.5],
        [480, 0.32],
        [600, 0.22],
        [720, 0.15],
        [840, 0.1],
        [960, 0.07],
      ],
      new Float32Array(t.n),
    );
    const drive = 1.6;
    const flutter = t.noise(9, 0);
    const buzz = core.map(
      (v, i) =>
        (Math.tanh((drive * v) / 2) / Math.tanh(drive)) *
        (1 + 0.12 * flutter[i]),
    );
    const rumble = t.noise(90, 0);
    const grit = t.noise(120, 6);
    const body = t.noise(300, 0.9);
    return mix(t.n, [
      [buzz, 0.4],
      [rumble, 0.5],
      [grit, 0.3],
      [body, 0.08],
    ]);
  },
  motor: (t) => {
    // A four-pole motor at 1750 rpm: 120 Hz magnetic hum, the rotor's
    // turn (29 Hz) and the slot whine far above.
    const hum = t.partials(
      [
        [120, 1],
        [240, 0.4],
        [360, 0.12],
      ],
      new Float32Array(t.n),
    );
    const rotor = t.partials(
      [
        [29.25, 0.5],
        [58.5, 0.25],
      ],
      new Float32Array(t.n),
    );
    const slot = t.partials([[1316, 0.12]], new Float32Array(t.n));
    const fanAir = t.noise(900, 0.7);
    return mix(t.n, [
      [hum, 0.45],
      [rotor, 0.3],
      [slot, 0.25],
      [fanAir, 0.12],
    ]);
  },
  'gear-motor': (t) => {
    // Resynthesised from a recording of a small DC gear motor running
    // free (the owner, 2026-10-23, for the valves' actuators): a whine on
    // 271 Hz whose fifth harmonic, 1354 Hz, is the loudest, then its
    // third, eighth and fourth; every partial swelling once a turn of the
    // geared shaft, 271 / 11 Hz, so it carries sidebands; a slower gear
    // stage under it (148, 188 and 376 Hz); and the brushes' hiss, 4 to
    // 8 kHz. Levels as measured, relative to the fifth harmonic.
    const f0 = 271;
    const whine = t.partials(
      (
        [
          [1, 0.03],
          [2, 0.032],
          [3, 0.3],
          [4, 0.145],
          [5, 1],
          [6, 0.061],
          [7, 0.079],
          [8, 0.195],
          [9, 0.025],
          [10, 0.021],
          [13, 0.038],
          [14, 0.048],
        ] as const
      ).map(([k, level]) => [f0 * k, level] as [number, number]),
      new Float32Array(t.n),
    );
    const turn = t.partials(
      [
        [f0 / 11, 0.5],
        [(2 * f0) / 11, 0.12],
      ],
      new Float32Array(t.n),
    );
    for (let i = 0; i < t.n; i++) whine[i] *= 1 + turn[i];
    const gears = t.partials(
      [
        [148, 0.15],
        [188, 0.18],
        [376, 0.125],
      ],
      new Float32Array(t.n),
    );
    // The brushes' hiss is much of what it sounds like: loud, and up into
    // the highest octave; under the whine, the gearbox's own rough noise.
    const brushes = t.noise(5500, 0.8);
    const fizz = t.noise(11000, 0.8);
    const body = t.noise(1400, 1.2);
    const grind = t.noise(350, 0.9);
    return mix(t.n, [
      [whine, 1],
      [gears, 1],
      [brushes, 1.1],
      [fizz, 0.7],
      [body, 0.05],
      [grind, 0.08],
    ]);
  },
  'drain-gurgle': (t) => {
    // Water going down a drain (the owner, 2026-10-24), resynthesised from
    // a recording's spectrum: four layers, each pulsing about five times a
    // second, never evenly. A heaving rumble under 230 Hz (its peak near
    // 170 Hz); the glugs, a resonance wandering 480 to 1,020 Hz and the
    // loudest of them; a sparkle of drops and small bubbles at 1.8 to
    // 3.2 kHz; and a fizz to 6 kHz, with almost nothing above. Their
    // levels are the recording's: the glugs at 0 dB, the sparkle -2, the
    // rumble -6 and the fizz -7.
    const seconds = TONE_LOOP_SECONDS;
    /** An envelope of `rate` swells a second, each up in `rise` and dying over `decay`, on a `floor`. */
    const bursts = (
      rate: number,
      rise: number,
      decay: number,
      floor: number,
    ) => {
      const env = new Float32Array(t.n).fill(floor);
      for (let k = 0; k < seconds * rate; k++) {
        const level = 0.4 + t.random() * 0.8;
        t.event(
          env,
          t.random() * seconds,
          rise + decay * 5,
          (s) =>
            level *
            Math.min(1, s / rise) *
            Math.exp(-Math.max(0, s - rise) / decay),
        );
      }
      return env;
    };
    /** A bubble's ring: a short tone rising as it closes, dying away. */
    const bubble = (
      into: Float32Array,
      at: number,
      f: number,
      decay: number,
      level: number,
    ) =>
      t.event(into, at, decay * 6, (s) => {
        const phase = 2 * Math.PI * f * (s + (0.35 * s * s) / decay);
        return level * Math.sin(phase) * Math.exp(-s / decay);
      });
    /** `layer` shaped by `env`, scaled to an RMS of 1. */
    const shaped = (layer: Float32Array, env: Float32Array) => {
      const out = layer.map((v, i) => v * env[i]);
      const scale = 1 / t.rms(out);
      return out.map((v) => v * scale);
    };

    // The rumble: low noise, heaving slowly and pulsing.
    const heave = t.wander(0.5, [0.25, 0.5]);
    const pulse = bursts(5, 0.02, 0.09, 0.35);
    const rumble = shaped(
      mix(t.n, [
        [t.noise(170, 1.2), 1],
        [t.noise(110, 0.8), 0.6],
      ]),
      pulse.map((v, i) => v * heave[i]),
    );

    // The glugs: narrow resonances across 500 Hz to 1 kHz, each sounding
    // by turns, so the note wanders; and the gulps' own rising notes.
    const glugs = new Float32Array(t.n);
    for (const f of [500, 590, 700, 830, 1000]) {
      const ring = t.noise(f, 7);
      const env = bursts(1.1, 0.015, 0.07, 0.05);
      for (let i = 0; i < t.n; i++) glugs[i] += ring[i] * env[i];
    }
    const gulps = new Float32Array(t.n);
    for (let k = 0; k < seconds * 5; k++)
      bubble(
        gulps,
        t.random() * seconds,
        480 * Math.pow(2.1, t.random()),
        0.03 + t.random() * 0.04,
        0.5 + t.random() * 0.5,
      );
    const glug = shaped(
      mix(t.n, [
        [glugs, 1],
        [gulps, 0.9],
      ]),
      t.wander(0.3, [0.5, 1.25]),
    );

    // The sparkle: many small, quick bubbles and drops over a bright wash.
    const drops = new Float32Array(t.n);
    for (let k = 0; k < seconds * 40; k++)
      bubble(
        drops,
        t.random() * seconds,
        1600 * Math.pow(1.6, t.random()),
        0.006 + t.random() * 0.016,
        0.25 + t.random() * 0.5,
      );
    const sparkle = shaped(
      mix(t.n, [
        [drops, 1],
        [t.noise(2300, 1.2).map((v) => v * 0.1), 1],
      ]),
      bursts(6, 0.005, 0.04, 0.55),
    );

    // The fizz, in the same pulses, and nothing much above it.
    const fizz = shaped(t.noise(4500, 0.9), bursts(6, 0.003, 0.03, 0.55));

    // Through a steep low-pass, falling from 5 kHz, as the recording does
    // there: four poles, run round the loop twice, so it starts as it
    // ends, with no seam.
    const all = mix(t.n, [
      [glug, 1],
      [sparkle, 1],
      [rumble, 0.67],
      [fizz, 0.6],
    ]);
    const k = 1 - Math.exp((-2 * Math.PI * 8000) / (t.n / seconds));
    const y = [0, 0, 0, 0];
    for (let pass = 0; pass < 2; pass++)
      for (let i = 0; i < t.n; i++) {
        let v = all[i];
        for (let j = 0; j < 4; j++) v = y[j] += k * (v - y[j]);
        if (pass === 1) all[i] = v;
      }
    return all;
  },
  'cabinet-fan': (t) =>
    fan(t, { rev: 45, blades: 7, air: 750, airQ: 0.6, tone: 0.28 }),
  'drive-fan': (t) => {
    const whirr = fan(t, {
      rev: 80,
      blades: 5,
      air: 1600,
      airQ: 0.7,
      tone: 0.3,
    });
    // The drive's switching, faintly: a carrier and its sidebands.
    const pwm = t.partials(
      [
        [4000, 0.06],
        [3880, 0.02],
        [4120, 0.02],
      ],
      new Float32Array(t.n),
    );
    return mix(t.n, [
      [whirr, 1],
      [pwm, 1],
    ]);
  },
  'fan-tray': (t) => {
    // Three 40 mm fans at nearly the same speed: their whines beat.
    const fans = [250, 251.5, 252.75].map((rev) =>
      t.partials(
        [
          [rev * 9, 1],
          [rev * 18, 0.25],
          [rev, 0.4],
        ],
        new Float32Array(t.n),
      ),
    );
    const air = t.noise(3200, 0.5);
    const low = t.noise(500, 0);
    return mix(t.n, [
      [fans[0], 0.1],
      [fans[1], 0.1],
      [fans[2], 0.1],
      [air, 0.3],
      [low, 0.1],
    ]);
  },
  blower: (t) => {
    // A squirrel cage: many shallow blades, a broad rush, a deep rumble.
    const rumble = t.noise(160, 0);
    const whoosh = t.noise(420, 0.8);
    const blades = t.partials(
      [
        [17 * 36, 0.18],
        [17, 0.4],
        [34, 0.15],
      ],
      new Float32Array(t.n),
    );
    const swell = t.wander(0.18, [0.25, 0.5]);
    return mix(t.n, [
      [rumble, 0.45],
      [whoosh.map((v, i) => v * swell[i]), 0.35],
      [blades, 0.3],
    ]);
  },
  'side-channel': (t) => {
    // A side-channel (regenerative) blower: a 40-blade impeller on a
    // two-pole motor at 3450 rpm. Its blade-pass, 2300 Hz, is a hard
    // siren, roughened by the turning rotor; the air hisses high through
    // its channel and silencers; little low end, but the motor's hum.
    const rev = 57.5;
    const siren = t.partials(
      [
        [40 * rev, 0.5],
        [40 * rev - rev, 0.12],
        [40 * rev + rev, 0.12],
        [80 * rev, 0.18],
      ],
      new Float32Array(t.n),
    );
    const flutter = t.wander(0.15, [rev / 8, rev / 4]);
    const hiss = t.noise(3200, 0.8);
    const breath = t.noise(1400, 0.5);
    const hum = t.partials(
      [
        [120, 0.3],
        [rev, 0.12],
      ],
      new Float32Array(t.n),
    );
    return mix(t.n, [
      [siren.map((v, i) => v * flutter[i]), 0.45],
      [hiss, 0.3],
      [breath, 0.12],
      [hum, 0.12],
    ]);
  },
  'worn-fan': (t) => {
    const whirr = fan(t, {
      rev: 38,
      blades: 7,
      air: 700,
      airQ: 0.6,
      tone: 0.25,
    });
    // A dry bearing ticks about five times a turn, never evenly.
    const ticks = new Float32Array(t.n);
    const rate = 38 / 5;
    const count = Math.round(rate * TONE_LOOP_SECONDS);
    for (let k = 0; k < count; k++) {
      const at = (k + (t.random() - 0.5) * 0.3) / rate;
      const level = 0.4 + t.random() * 0.6;
      const pitch = 2600 + t.random() * 900;
      t.event(
        ticks,
        (at + TONE_LOOP_SECONDS) % TONE_LOOP_SECONDS,
        0.012,
        (s) =>
          level * Math.sin(2 * Math.PI * pitch * s) * Math.exp(-s / 0.0025),
      );
    }
    // And squeals, faintly, coming and going.
    const squeal = t.partials([[3150, 1]], new Float32Array(t.n));
    const comes = t.wander(1, [0.25, 0.75]);
    for (let i = 0; i < t.n; i++)
      squeal[i] *= Math.max(0, comes[i] - 1.2) * 0.25;
    return mix(t.n, [
      [whirr, 1],
      [ticks, 0.35],
      [squeal, 1],
    ]);
  },
  pump: (t) => {
    // A centrifugal pump at 1750 rpm with six vanes: vane-pass tone,
    // motor hum, the churn of water, and a gurgle now and then.
    const tones = t.partials(
      [
        [175.5, 0.5],
        [351, 0.2],
        [120, 0.4],
        [29.25, 0.3],
      ],
      new Float32Array(t.n),
    );
    const churn = t.noise(260, 0.9);
    const swell = t.wander(0.3, [0.5, 0.75, 1.25]);
    const gurgles = new Float32Array(t.n);
    for (let k = 0; k < 5; k++) {
      const at = t.random() * TONE_LOOP_SECONDS;
      const from = 180 + t.random() * 220;
      const level = 0.4 + t.random() * 0.6;
      // A bubble: a sine sweeping up as it shrinks, dying fast.
      t.event(gurgles, at, 0.07, (s) => {
        const f = from * (1 + s * 14);
        return (
          level *
          Math.sin(2 * Math.PI * f * s) *
          Math.exp(-s / 0.02) *
          Math.min(1, s / 0.002)
        );
      });
    }
    return mix(t.n, [
      [tones, 0.35],
      [churn.map((v, i) => v * swell[i]), 0.3],
      [gurgles, 0.25],
    ]);
  },
  coolant: (t) => {
    const hiss = t.noise(1800, 0.45);
    const body = t.noise(320, 0);
    const swell = t.wander(0.35, [0.25, 0.5, 0.75]);
    const trickle = new Float32Array(t.n);
    for (let k = 0; k < 22; k++) {
      const at = t.random() * TONE_LOOP_SECONDS;
      const from = 700 + t.random() * 1100;
      const level = 0.2 + t.random() * 0.5;
      t.event(trickle, at, 0.03, (s) => {
        const f = from * (1 + s * 25);
        return (
          level *
          Math.sin(2 * Math.PI * f * s) *
          Math.exp(-s / 0.008) *
          Math.min(1, s / 0.001)
        );
      });
    }
    return mix(t.n, [
      [hiss.map((v, i) => v * swell[i]), 0.22],
      [body.map((v, i) => v * (2 - swell[i])), 0.4],
      [trickle, 0.2],
    ]);
  },
  compressor: (t) => {
    // A two-cylinder compressor at 1440 rpm: 48 strokes a second, each a
    // thud and a little valve tick, over its motor's hum.
    const strokes = new Float32Array(t.n);
    const rate = 48;
    const count = rate * TONE_LOOP_SECONDS;
    for (let k = 0; k < count; k++) {
      const at = k / rate + (t.random() - 0.5) * 0.0015;
      const heavy = k % 2 === 0 ? 1 : 0.7;
      const level = heavy * (0.85 + t.random() * 0.15);
      t.event(
        strokes,
        (at + TONE_LOOP_SECONDS) % TONE_LOOP_SECONDS,
        0.03,
        (s) => level * Math.sin(2 * Math.PI * 85 * s) * Math.exp(-s / 0.008),
      );
      t.event(
        strokes,
        (at + 0.006 + TONE_LOOP_SECONDS) % TONE_LOOP_SECONDS,
        0.004,
        (s) =>
          0.15 *
          level *
          Math.sin(2 * Math.PI * 3400 * s) *
          Math.exp(-s / 0.0008),
      );
    }
    const hum = t.partials(
      [
        [120, 0.5],
        [240, 0.2],
      ],
      new Float32Array(t.n),
    );
    const rattle = t.noise(1200, 1.2);
    return mix(t.n, [
      [strokes, 0.6],
      [hum, 0.3],
      [rattle, 0.05],
    ]);
  },
  turbine: (t) => {
    // A rotor at 37,500 rpm: a thin whine with a little shimmer, and a
    // hush of air under it.
    const whine = new Float32Array(t.n);
    const shimmer = t.wander(0.0015, [0.5, 1.25]);
    let phase = 0;
    let phase2 = 0;
    const f = t.hz(1250);
    for (let i = 0; i < t.n; i++) {
      phase += (2 * Math.PI * f * shimmer[i]) / (t.n / TONE_LOOP_SECONDS);
      phase2 += (2 * Math.PI * 2 * f * shimmer[i]) / (t.n / TONE_LOOP_SECONDS);
      whine[i] = Math.sin(phase) + 0.2 * Math.sin(phase2);
    }
    // The shimmer averages to nothing over the loop, so the phase comes
    // round to where it began and the loop joins.
    const hush = t.noise(5000, 0.5);
    const low = t.noise(220, 0);
    return mix(t.n, [
      [whine, 0.22],
      [hush, 0.05],
      [low, 0.08],
    ]);
  },
};

/** RMS each loop is scaled to, so all are about as loud as each other. */
const LOUDNESS = 0.2;

/** One loop, `TONE_LOOP_SECONDS` long, at `sampleRate`: the same each time. */
export function renderMachineTone(id: MachineToneId, sampleRate: number) {
  let seed = 7;
  for (let i = 0; i < id.length; i++)
    seed = (seed * 31 + id.charCodeAt(i)) >>> 0;
  const t = loopTools(sampleRate, seed);
  const out = RECIPES[id](t);
  let scale = LOUDNESS / t.rms(out);
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  scale = Math.min(scale, 0.95 / (peak || 1));
  for (let i = 0; i < out.length; i++) out[i] *= scale;
  return out;
}

/**
 * A machine running up and down, as a share of its full speed, 0 to 1. It
 * runs up as a motor does, quickly at first and easing on to its speed
 * (`1 - (1 - x)²` over `up` seconds); told to stop, it coasts down from
 * wherever it has got to, slowing as it goes, over `down` seconds from
 * full speed and less from less (`k₀(1 - x)²`).
 */
export function createSpin(spin: MachineTone['spin'], start: number) {
  let stopped: { at: number; from: number; seconds: number } | null = null;
  const at = (now: number) => {
    if (stopped) {
      const x = Math.min(1, (now - stopped.at) / stopped.seconds);
      return stopped.from * (1 - x) ** 2;
    }
    const x = Math.min(1, Math.max(0, (now - start) / spin.up));
    return 1 - (1 - x) ** 2;
  };
  return {
    /** How fast it is going at `now`. */
    at,
    /** Its speed at `now` as a share of the rate it is played at. */
    rate: (now: number) => spin.floor + (1 - spin.floor) * at(now),
    /**
     * How loud it is at `now`: a machine is quiet turning slowly, its air
     * rising with the square of its speed; what does not turn fades.
     */
    level: (now: number) => (spin.floor >= 1 ? at(now) : at(now) ** 2),
    /** Stop it at `now`: the seconds it will take to come to rest. */
    stop(now: number) {
      if (!stopped) {
        const from = at(now);
        stopped = { at: now, from, seconds: Math.max(0.05, spin.down * from) };
      }
      return stopped.seconds;
    },
  };
}

const rendered = new WeakMap<
  BaseAudioContext,
  Map<MachineToneId, AudioBuffer>
>();

/**
 * A machine tone held as a loop, at `level`, played at `rate` (1 as
 * rendered, 2 an octave up and twice as fast), which may change while it
 * plays. Held, it runs up to speed from rest, rising in pitch and
 * loudness (`createSpin`); let go, it runs down to rest and falls silent.
 */
export function machineTone(
  id: MachineToneId,
  rate: Readable<number>,
  level: number | Readable<number> = 0.3,
  /** How it starts and stops, if not as its machine does. */
  spinning?: MachineTone['spin'],
): LoopRecipe {
  return (context, out) => {
    let buffers = rendered.get(context);
    if (!buffers) rendered.set(context, (buffers = new Map()));
    let buffer = buffers.get(id);
    if (!buffer) {
      const samples = renderMachineTone(id, context.sampleRate);
      buffer = context.createBuffer(1, samples.length, context.sampleRate);
      buffer.getChannelData(0).set(samples);
      buffers.set(id, buffer);
    }
    const spin = spinning ?? MACHINE_TONES.find((tone) => tone.id === id)!.spin;
    const run = createSpin(spin, context.currentTime);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.playbackRate.value = Math.max(0.02, rate.value * run.rate(0));
    const gain = context.createGain();
    gain.gain.value = 0;
    source.connect(gain).connect(out);
    // Start somewhere in the loop, so two of a kind are not in step.
    source.start(0, Math.random() * TONE_LOOP_SECONDS);
    // It runs up, follows its rate and runs down: set a few dozen times a
    // second, each setting smoothed into the next.
    const steer = () => {
      const now = context.currentTime;
      source.playbackRate.setTargetAtTime(
        Math.max(0.02, rate.value * run.rate(now)),
        now,
        0.03,
      );
      gain.gain.setTargetAtTime(
        (typeof level === 'number' ? level : level.value) * run.level(now),
        now,
        0.03,
      );
    };
    const timer = setInterval(steer, 25);
    const follow = effect(() => {
      void rate.value;
      if (typeof level !== 'number') void level.value;
      steer();
    });
    source.onended = () => {
      clearInterval(timer);
      follow();
      source.disconnect();
      gain.disconnect();
    };
    let release = 0;
    return [
      {
        get release() {
          return release || spin.down * run.at(context.currentTime);
        },
        stop(when?: number) {
          release = run.stop(context.currentTime);
          source.stop(Math.max(when ?? 0, context.currentTime + release));
        },
      },
    ];
  };
}
