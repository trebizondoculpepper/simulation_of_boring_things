/**
 * The gas alarms' sounders: invented for the game, synthesised from
 * scratch, and deliberately unlike any real alarm, so that nobody hearing
 * the game takes it for a real emergency. Each is urgent and easy to tell
 * from the fire alarm (`fire/audio/fire-alarm.ts`) and from each other.
 *
 * - Chlorine: three hard bleeps, then a growling klaxon falling away
 *   beneath them; a second to the cycle.
 * - Ozone: four quick rising chirps, then a trembling held bleep; 0.8 s
 *   to the cycle.
 *
 * Pure: `gasAlarmAt` says what sounds at a moment, `renderGasAlarm` the
 * samples of a seamless loop.
 */

export type GasAlarmKind = 'chlorine' | 'ozone';

export const GAS_ALARM_CYCLE: Record<GasAlarmKind, number> = {
  chlorine: 1,
  ozone: 0.8,
};
/** The rendered loop: four whole cycles. */
export const GAS_ALARM_CYCLES = 4;

interface Sounding {
  /** Its pitch, Hz, and its level, 0 to 1 (0 is silence). */
  hz: number;
  level: number;
  /** Its timbre: a hard bleep, a growling horn, or a pure chirp. */
  voice: 'bleep' | 'growl' | 'chirp';
}

const SILENT: Sounding = { hz: 0, level: 0, voice: 'bleep' };

/** Level within a span: 5 ms rises and falls, nothing outside it. */
const gate = (t: number, from: number, to: number, edge = 0.005) =>
  t < from || t >= to ? 0 : Math.min(1, (t - from) / edge, (to - t) / edge);

/** What sounds at `t` seconds. */
export function gasAlarmAt(kind: GasAlarmKind, t: number): Sounding {
  const cycle = GAS_ALARM_CYCLE[kind];
  const c = ((t % cycle) + cycle) % cycle;
  if (kind === 'chlorine') {
    for (let n = 0; n < 3; n++) {
      const level = gate(c, n * 0.11, n * 0.11 + 0.075);
      if (level) return { hz: 2650, level, voice: 'bleep' };
    }
    const level = gate(c, 0.36, 0.78, 0.01);
    if (level) {
      const share = (c - 0.36) / 0.42;
      return { hz: 1500 * (900 / 1500) ** share, level, voice: 'growl' };
    }
    return SILENT;
  }
  for (let n = 0; n < 4; n++) {
    const from = n * 0.1;
    const level = gate(c, from, from + 0.07);
    if (level)
      return {
        hz: 1200 + ((c - from) / 0.07) * 700,
        level,
        voice: 'chirp',
      };
  }
  const level = gate(c, 0.45, 0.7);
  if (level)
    return {
      hz: 1650,
      level: level * (0.75 + 0.25 * Math.sin(2 * Math.PI * 8 * c)),
      voice: 'bleep',
    };
  return SILENT;
}

/** The loop's samples at `sampleRate`, mono in [-1, 1]. */
export function renderGasAlarm(
  kind: GasAlarmKind,
  sampleRate: number,
): Float32Array {
  const length = Math.round(
    GAS_ALARM_CYCLE[kind] * GAS_ALARM_CYCLES * sampleRate,
  );
  const out = new Float32Array(length);
  const tau = Math.PI * 2;
  let phase = 0;
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const now = gasAlarmAt(kind, t);
    if (!now.level) {
      phase = 0;
      continue;
    }
    phase += (tau * now.hz) / sampleRate;
    let v: number;
    if (now.voice === 'growl') {
      // A horn: odd harmonics, roughened at 55 Hz.
      v =
        (Math.sin(phase) +
          0.5 * Math.sin(3 * phase) +
          0.3 * Math.sin(5 * phase)) *
        (0.7 + 0.3 * Math.sign(Math.sin(tau * 55 * t)));
    } else if (now.voice === 'bleep') {
      // A piezo driven hard: a softened square.
      v = Math.tanh(4 * Math.sin(phase)) * 0.8;
    } else {
      v = Math.sin(phase) + 0.2 * Math.sin(2 * phase);
    }
    out[i] = v * now.level;
  }
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  if (peak > 0) for (let i = 0; i < length; i++) out[i] *= 0.9 / peak;
  return out;
}
