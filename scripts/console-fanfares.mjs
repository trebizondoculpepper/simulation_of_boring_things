// Synthesises Hall 4's dosing console's won and lost sounds (the owner,
// 2026-10-31): `won-fanfare.ogg`, a bright, glassy Frutiger Aero fanfare (a
// rising major arpeggio of FM bells, a shimmering chord and sparkle), and
// `lost-trombone.ogg`, a sad trombone ("wah wah wah waaah"), into
// `resources/sound/effects/frutiger-aero/`. Original sounds, made here; needs
// ffmpeg on the path. Run: node scripts/console-fanfares.mjs
import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { URL } from 'node:url';

const RATE = 44100;
const OUT = new URL(
  '../resources/sound/effects/frutiger-aero/',
  import.meta.url,
).pathname;

/** A seeded random, so the files are the same every run. */
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

/** An FM bell at time `at`, added into the stereo buffers. */
function bell(
  L,
  R,
  at,
  f,
  { amp = 0.2, decay = 1.2, ratio = 3.5, index = 2.5, pan = 0 } = {},
) {
  const start = Math.floor(at * RATE);
  const n = Math.floor(decay * 4 * RATE);
  const gl = amp * Math.sqrt((1 - pan) / 2);
  const gr = amp * Math.sqrt((1 + pan) / 2);
  for (let i = 0; i < n && start + i < L.length; i++) {
    const t = i / RATE;
    const env = Math.min(1, t / 0.004) * Math.exp(-t / decay);
    const mod =
      index *
      Math.exp(-t / (decay * 0.3)) *
      Math.sin(2 * Math.PI * f * ratio * t);
    const v =
      env *
      (Math.sin(2 * Math.PI * f * t + mod) +
        0.3 * Math.sin(2 * Math.PI * f * 2 * t) * Math.exp(-t / (decay * 0.5)));
    L[start + i] += v * gl;
    R[start + i] += v * gr;
  }
}

/** A simple stereo echo-reverb, for air. */
function reverb(L, R, mix = 0.3) {
  const taps = [
    [0.031, 0.5],
    [0.047, 0.42],
    [0.071, 0.35],
    [0.113, 0.28],
  ];
  const outL = Float32Array.from(L);
  const outR = Float32Array.from(R);
  for (const [d, g] of taps) {
    const k = Math.floor(d * RATE);
    const k2 = Math.floor(d * 1.13 * RATE);
    for (let i = k2; i < L.length; i++) {
      outL[i] += mix * g * outR[i - k];
      outR[i] += mix * g * outL[i - k2];
    }
  }
  return [outL, outR];
}

function wonFanfare() {
  const len = Math.floor(3.4 * RATE);
  const L = new Float32Array(len);
  const R = new Float32Array(len);
  // The rising arpeggio: C major, C5 up to G6.
  const run = [72, 76, 79, 84, 88, 91];
  run.forEach((m, i) =>
    bell(L, R, i * 0.085, hz(m), {
      amp: 0.16,
      decay: 0.7,
      pan: -0.6 + i * 0.24,
    }),
  );
  // The chord it lands on, with a slow shimmer.
  const at = run.length * 0.085 + 0.05;
  for (const [m, pan] of [
    [84, -0.3],
    [88, 0.3],
    [91, -0.1],
    [96, 0.2],
  ])
    bell(L, R, at, hz(m), {
      amp: 0.14,
      decay: 1.4,
      ratio: 2.0,
      index: 1.5,
      pan,
    });
  // A soft pad under the chord: the warmth that makes it a fanfare.
  const s0 = Math.floor(at * RATE);
  for (let i = s0; i < len; i++) {
    const t = (i - s0) / RATE;
    const env = Math.min(1, t / 0.08) * Math.exp(-t / 0.9) * 0.05;
    const trem = 1 + 0.25 * Math.sin(2 * Math.PI * 6 * t);
    const v =
      env *
      trem *
      (Math.sin(2 * Math.PI * hz(60) * t) +
        0.6 * Math.sin(2 * Math.PI * hz(64) * t) +
        0.5 * Math.sin(2 * Math.PI * hz(67) * t));
    L[i] += v;
    R[i] += v;
  }
  // Sparkle: tiny high pings scattered over the chord.
  const rnd = seeded(113);
  for (let k = 0; k < 28; k++) {
    const when = at + rnd() * 1.6;
    const pent = [96, 98, 100, 103, 105, 108][Math.floor(rnd() * 6)];
    bell(L, R, when, hz(pent), {
      amp: 0.035 + rnd() * 0.03,
      decay: 0.18,
      ratio: 4.1,
      index: 1.2,
      pan: rnd() * 1.6 - 0.8,
    });
  }
  return reverb(L, R, 0.35);
}

function lostTrombone() {
  const notes = [
    // [midi, start, length, wah] — G3, F#3, F3, then E3 held, sliding down.
    [55, 0.0, 0.42],
    [54, 0.48, 0.42],
    [53, 0.96, 0.42],
    [52, 1.44, 1.5],
  ];
  const len = Math.floor(3.2 * RATE);
  const L = new Float32Array(len);
  for (const [m, start, dur] of notes) {
    const s0 = Math.floor(start * RATE);
    const n = Math.floor(dur * RATE);
    const last = dur > 1;
    let phase = 0;
    for (let i = 0; i < n && s0 + i < len; i++) {
      const t = i / RATE;
      const u = t / dur;
      // A scoop up into each note; the last sags and wobbles.
      let f = hz(m) * (1 - 0.03 * Math.exp(-t / 0.04));
      if (last) {
        f *= 1 - 0.035 * Math.max(0, u - 0.3);
        f *=
          1 + 0.018 * Math.sin(2 * Math.PI * 5.5 * t) * Math.min(1, t / 0.35);
      }
      phase += (2 * Math.PI * f) / RATE;
      // The plunger: brightness opens and closes ("wah").
      const wah = last
        ? 2 + 5 * Math.sin(Math.PI * Math.min(1, u * 1.6)) * (1 - u * 0.7)
        : 2 + 6 * Math.sin(Math.PI * u);
      let v = 0;
      for (let k = 1; k <= 14; k++)
        v += (Math.exp(-k / wah) / k ** 0.6) * Math.sin(k * phase);
      const env =
        Math.min(1, t / 0.03) * Math.min(1, (dur - t) / (last ? 0.5 : 0.06));
      L[s0 + i] += 0.12 * env * v;
    }
  }
  return reverb(L, Float32Array.from(L), 0.25);
}

function writeOgg(name, [L, R]) {
  let peak = 0;
  for (let i = 0; i < L.length; i++)
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const g = 0.89 / peak;
  const data = Buffer.alloc(L.length * 4);
  for (let i = 0; i < L.length; i++) {
    data.writeInt16LE(Math.round(L[i] * g * 32767), i * 4);
    data.writeInt16LE(Math.round(R[i] * g * 32767), i * 4 + 2);
  }
  const head = Buffer.alloc(44);
  head.write('RIFF', 0);
  head.writeUInt32LE(36 + data.length, 4);
  head.write('WAVEfmt ', 8);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(2, 22);
  head.writeUInt32LE(RATE, 24);
  head.writeUInt32LE(RATE * 4, 28);
  head.writeUInt16LE(4, 32);
  head.writeUInt16LE(16, 34);
  head.write('data', 36);
  head.writeUInt32LE(data.length, 40);
  const wav = join(mkdtempSync(join(tmpdir(), 'fanfare-')), `${name}.wav`);
  writeFileSync(wav, Buffer.concat([head, data]));
  execFileSync('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-i',
    wav,
    '-c:a',
    'vorbis',
    '-strict',
    '-2',
    '-ac',
    '2',
    '-q:a',
    '6',
    join(OUT, `${name}.ogg`),
  ]);
}

writeOgg('won-fanfare', wonFanfare());
writeOgg('lost-trombone', lostTrombone());
