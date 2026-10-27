import { effect, signal } from '@preact/signals-core';
import { partAudio } from '../../core/audio/part-audio';
import type { LoopRecipe } from '../../core/audio/part-audio';
import {
  BRIDGE_AMBIENCE,
  DRONE_PARTIALS,
  ECHO,
  SWELL_DEPTH,
  SWELL_HZ,
  createAmbienceGate,
  createChirpField,
  seededRandom,
} from '../logic/bridge-ambience';
import type {
  AmbiencePresence,
  BridgeAmbienceId,
  BridgeAmbienceVariant,
  Chirp,
} from '../logic/bridge-ambience';

/**
 * The bridge's room tone (mission 095), synthesised: our own sound in the
 * spirit of a starship bridge's background, nothing sampled. Four layers
 * under one fader, all through the game's bus, not placed (a room tone is
 * everywhere in the room):
 *
 * - the drone: six oscillators about 55 Hz and its harmonics, pairs a
 *   fraction of a hertz apart beating slowly, spread left and right,
 *   under a low-pass;
 * - the rumble and the body: two long, different noise loops (left and
 *   right, so the field is wide), one low-passed about 120 Hz with its
 *   cutoff drifting, one band-passed about 250 Hz: a big ship's air,
 *   after the airliner in flight the show's hum is said to come from;
 * - the air: the same noise high-passed, a soft hiss of ventilation;
 * - the chirps: the seeded chirp field (`logic/bridge-ambience.ts`), each
 *   chirp a few short-lived nodes scheduled a second ahead by a timer,
 *   panned, softened and given a short room echo.
 *
 * Each layer swells slowly at its own rate, none in step, so the whole
 * never comes round again. No per-sample script: a couple of dozen nodes
 * held, a handful more for each chirp while it sounds.
 */

/** How the ambience comes in and goes: seconds. */
export interface AmbienceFade {
  /** Seconds of silence before it begins to rise. */
  after?: number;
  /** Seconds to rise to its level. */
  rise?: number;
}

const DEFAULT_RISE = 3;
const DEFAULT_RELEASE = 2.5;
/** How far ahead chirps are scheduled, and how often the timer looks, seconds. */
const LOOKAHEAD = 1.2;
const TICK_MS = 300;

/** A long noise loop, its own for each seed, so left and right differ and neither repeats in under seconds. */
function noiseLoop(context: AudioContext, seconds: number, seed: number) {
  const buffer = context.createBuffer(
    1,
    Math.round(seconds * context.sampleRate),
    context.sampleRate,
  );
  const data = buffer.getChannelData(0);
  const random = seededRandom(seed);
  for (let i = 0; i < data.length; i++) data[i] = random() * 2 - 1;
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

/** Swing `param` by `depth` about where it is, at `hz`. */
function swell(
  context: AudioContext,
  param: AudioParam,
  hz: number,
  depth: number,
  at: number,
) {
  const lfo = context.createOscillator();
  lfo.frequency.value = hz;
  const amount = context.createGain();
  amount.gain.value = depth;
  lfo.connect(amount).connect(param);
  lfo.start(at);
  return lfo;
}

/** Play one chirp into `out`, `start` seconds being the field's zero. */
function playChirp(
  context: AudioContext,
  chirp: Chirp,
  start: number,
  out: AudioNode,
) {
  const at = start + chirp.at;
  const pan = new StereoPannerNode(context, { pan: chirp.pan });
  pan.connect(out);
  let last = at;
  for (const note of chirp.notes) {
    const t = at + note.at;
    const osc = context.createOscillator();
    osc.type = chirp.wave;
    osc.frequency.setValueAtTime(note.hz, t);
    if (note.toHz)
      osc.frequency.exponentialRampToValueAtTime(note.toHz, t + note.seconds);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(note.level, t + 0.006);
    gain.gain.setValueAtTime(
      note.level,
      t + Math.max(0.007, note.seconds - 0.015),
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, t + note.seconds);
    osc.connect(gain).connect(pan);
    osc.start(t);
    osc.stop(t + note.seconds + 0.02);
    last = Math.max(last, t + note.seconds + 0.02);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }
  window.setTimeout(
    () => pan.disconnect(),
    (last - context.currentTime + 0.2) * 1000,
  );
}

/**
 * The ambience as a held sound (`partAudio.hold`, or a part's
 * `holdWhile` with `from` null): `level` is its gain, read as it changes;
 * it rises over `fade` and dies away over `release` seconds when let go.
 */
export function bridgeAmbience(
  variant: BridgeAmbienceVariant | BridgeAmbienceId,
  options: {
    level?: { readonly value: number };
    fade?: AmbienceFade;
    release?: number;
    seed?: number;
  } = {},
): LoopRecipe {
  const v = typeof variant === 'string' ? BRIDGE_AMBIENCE[variant] : variant;
  return (context, out) => {
    const now = context.currentTime;
    const seed = options.seed ?? Math.floor(Math.random() * 2 ** 32);
    // Its fader (in and out) and its level (the caller's), in turn.
    const fader = context.createGain();
    const after = now + (options.fade?.after ?? 0);
    const rise = options.fade?.rise ?? DEFAULT_RISE;
    fader.gain.setValueAtTime(0, now);
    fader.gain.setValueAtTime(0, after);
    fader.gain.linearRampToValueAtTime(1, after + rise);
    const level = context.createGain();
    level.gain.value = options.level?.value ?? 1;
    fader.connect(level).connect(out);
    const unwatch = options.level
      ? effect(() => {
          const value = options.level!.value;
          level.gain.setTargetAtTime(value, context.currentTime, 0.25);
        })
      : () => {};

    const held: AudioScheduledSourceNode[] = [];
    const panned = (to: AudioNode, pan: number) => {
      const p = new StereoPannerNode(context, { pan });
      p.connect(to);
      return p;
    };

    // The drone.
    const droneBus = context.createGain();
    droneBus.gain.value = v.drone;
    const droneLow = context.createBiquadFilter();
    droneLow.type = 'lowpass';
    droneLow.frequency.value = 320;
    droneBus.connect(droneLow).connect(fader);
    for (const p of DRONE_PARTIALS) {
      const osc = context.createOscillator();
      osc.type = p.wave;
      osc.frequency.value = p.hz;
      const g = context.createGain();
      g.gain.value = p.share;
      osc.connect(g).connect(panned(droneBus, p.pan * v.width));
      osc.start(now);
      held.push(osc);
    }
    held.push(
      swell(context, droneBus.gain, SWELL_HZ.drone, v.drone * SWELL_DEPTH, now),
    );

    // The rumble, the body and the air, from two noise loops, left and right.
    const rumble = context.createGain();
    rumble.gain.value = v.rumble;
    const body = context.createGain();
    body.gain.value = v.body;
    const air = context.createGain();
    air.gain.value = v.air;
    rumble.connect(fader);
    body.connect(fader);
    air.connect(fader);
    const rumbleFilters: BiquadFilterNode[] = [];
    for (const [side, seconds] of [
      [-1, 7.3],
      [1, 5.9],
    ] as const) {
      const noise = noiseLoop(context, seconds, seed + side);
      const low = context.createBiquadFilter();
      low.type = 'lowpass';
      low.frequency.value = 120;
      low.Q.value = 0.9;
      rumbleFilters.push(low);
      noise.connect(low).connect(panned(rumble, side * v.width));
      const band = context.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = side < 0 ? 240 : 265;
      band.Q.value = 1.1;
      noise.connect(band).connect(panned(body, side * v.width));
      const high = context.createBiquadFilter();
      high.type = 'highpass';
      high.frequency.value = 1600;
      const soft = context.createBiquadFilter();
      soft.type = 'lowpass';
      soft.frequency.value = 6500;
      noise
        .connect(high)
        .connect(soft)
        .connect(panned(air, side * v.width));
      noise.start(now, Math.random() * seconds);
      held.push(noise);
    }
    for (const low of rumbleFilters)
      held.push(swell(context, low.frequency, SWELL_HZ.rumbleFilter, 30, now));
    held.push(
      swell(context, rumble.gain, SWELL_HZ.rumble, v.rumble * SWELL_DEPTH, now),
      swell(context, body.gain, SWELL_HZ.body, v.body * SWELL_DEPTH, now),
      swell(context, air.gain, SWELL_HZ.air, v.air * SWELL_DEPTH, now),
    );

    // The chirps: softened, and a short echo off the room.
    const chirpBus = context.createBiquadFilter();
    chirpBus.type = 'lowpass';
    chirpBus.frequency.value = 4200;
    chirpBus.connect(fader);
    const delay = context.createDelay(1);
    delay.delayTime.value = ECHO.seconds;
    const feedback = context.createGain();
    feedback.gain.value = ECHO.feedback;
    const dull = context.createBiquadFilter();
    dull.type = 'lowpass';
    dull.frequency.value = 2400;
    const wet = context.createGain();
    wet.gain.value = ECHO.wet;
    chirpBus.connect(delay);
    delay.connect(dull).connect(feedback).connect(delay);
    dull.connect(wet).connect(fader);

    const field = createChirpField(v, seed);
    const zero = after + Math.min(rise, 1);
    let next = field.next();
    const schedule = () => {
      const horizon = context.currentTime + LOOKAHEAD;
      while (zero + next.at < horizon) {
        // A chirp whose moment passed (the tab asleep) is skipped, not crammed in.
        if (zero + next.at >= context.currentTime)
          playChirp(context, next, zero, chirpBus);
        next = field.next();
      }
    };
    schedule();
    const timer = window.setInterval(schedule, TICK_MS);

    const release = options.release ?? DEFAULT_RELEASE;
    return [
      ...held,
      {
        release,
        stop(when?: number) {
          window.clearInterval(timer);
          unwatch();
          const t = context.currentTime;
          const end = Math.max(when ?? t + release, t + 0.05);
          fader.gain.cancelScheduledValues(t);
          fader.gain.setValueAtTime(fader.gain.value, t);
          fader.gain.linearRampToValueAtTime(0, end);
          window.setTimeout(
            () => {
              fader.disconnect();
              feedback.disconnect();
            },
            (end - t + 0.3) * 1000,
          );
        },
      },
    ];
  };
}

/** The owner's own synthesised room tone (2026-10-27): a minute of it, looped. */
const ROOM_TONE = new URL('./assets/bridge-room-tone.ogg', import.meta.url);
/** Its playing level: the recording is far louder than the synthesis. */
const ROOM_TONE_LEVEL = 0.12;
const roomToneBuffers = new WeakMap<AudioContext, Promise<AudioBuffer>>();

/**
 * The bridge's room tone from the owner's recording (`assets/README.md`):
 * a seamless one-minute loop under the same fader, level and release as
 * the synthesis, so the room drives either alike.
 */
export function bridgeRoomTone(
  options: {
    level?: { readonly value: number };
    fade?: AmbienceFade;
    release?: number;
  } = {},
): LoopRecipe {
  return (context, out) => {
    const now = context.currentTime;
    const fader = context.createGain();
    const after = now + (options.fade?.after ?? 0);
    const rise = options.fade?.rise ?? DEFAULT_RISE;
    fader.gain.setValueAtTime(0, now);
    fader.gain.setValueAtTime(0, after);
    fader.gain.linearRampToValueAtTime(1, after + rise);
    const level = context.createGain();
    level.gain.value = ROOM_TONE_LEVEL * (options.level?.value ?? 1);
    fader.connect(level).connect(out);
    const unwatch = options.level
      ? effect(() => {
          const value = ROOM_TONE_LEVEL * options.level!.value;
          level.gain.setTargetAtTime(value, context.currentTime, 0.25);
        })
      : () => {};
    if (!roomToneBuffers.has(context)) {
      const pending = fetch(ROOM_TONE)
        .then((response) => {
          if (!response.ok) throw new Error(`Sound unavailable: ${ROOM_TONE}`);
          return response.arrayBuffer();
        })
        .then((bytes) => context.decodeAudioData(bytes));
      roomToneBuffers.set(context, pending);
      void pending.catch(() => roomToneBuffers.delete(context));
    }
    let cancelled = false;
    let source: AudioBufferSourceNode | undefined;
    void roomToneBuffers
      .get(context)!
      .then((buffer) => {
        if (cancelled) return;
        source = context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.connect(fader);
        // Somewhere in the minute, so it is not always the same moment.
        source.start(0, Math.random() * buffer.duration);
      })
      .catch((error) => console.warn('The bridge could not hum.', error));
    const release = options.release ?? DEFAULT_RELEASE;
    return [
      {
        release,
        stop(when?: number) {
          cancelled = true;
          unwatch();
          const t = context.currentTime;
          const end = Math.max(when ?? t + release, t + 0.05);
          fader.gain.cancelScheduledValues(t);
          fader.gain.setValueAtTime(fader.gain.value, t);
          fader.gain.linearRampToValueAtTime(0, end);
          window.setTimeout(
            () => {
              source?.stop();
              fader.disconnect();
              level.disconnect();
            },
            (end - t + 0.3) * 1000,
          );
        },
      },
    ];
  };
}

/**
 * The bridge's ambience for a room to drive. The usual way is
 * `setPresence` every frame (or on each change) with where the walker is:
 * it starts as the walker enters the bridge (rising over `fade`, as the
 * lights come up), is heard faintly from the corridor only while the
 * doors stand open, and dies away as they shut or when the walker is
 * elsewhere; a room that only follows another's eye, or the bridge merely
 * built, never sounds (`ambienceGain`). `start`, `stop` and `setLevel`
 * drive it directly, as dev47's trial does; `dispose` when the room goes.
 * Heard once the player's first gesture has started audio, as every sound
 * in the game.
 */
export function createBridgeAmbience(
  options: {
    variant?: BridgeAmbienceId;
    level?: number;
    release?: number;
    /** The owner's recording (the default, 2026-10-27) or the synthesis. */
    source?: 'recording' | 'synthesis';
  } = {},
) {
  const owner = {};
  const base = options.level ?? 1;
  const level = signal(base);
  let variant: BridgeAmbienceId = options.variant ?? 'standard';
  let playing = false;
  const gate = createAmbienceGate();
  return {
    /**
     * Where the walker is: starts it on entering (rising over `fade`),
     * rides its level through the doors, stops it on leaving.
     */
    setPresence(presence: AmbiencePresence, fade?: AmbienceFade) {
      const { action, level: share } = gate.update(presence);
      level.value = base * share;
      if (action === 'start') this.start(fade);
      if (action === 'stop') this.stop();
    },
    /** Begin, rising over `fade` (default: at once, over three seconds). */
    start(fade?: AmbienceFade) {
      playing = true;
      partAudio.hold(
        owner,
        (options.source ?? 'recording') === 'recording'
          ? bridgeRoomTone({ level, fade, release: options.release })
          : bridgeAmbience(variant, { level, fade, release: options.release }),
      );
    },
    /** Die away over the release (default two and a half seconds). */
    stop() {
      playing = false;
      partAudio.hold(owner, null);
    },
    /** Its gain, 0 to 1, eased over a quarter second or so. */
    setLevel(value: number) {
      level.value = Math.max(0, Math.min(1, value));
    },
    /** Another variant: heard from the next `start`, or now if playing. */
    setVariant(id: BridgeAmbienceId, fade?: AmbienceFade) {
      variant = id;
      if (playing) this.start(fade ?? { rise: 1 });
    },
    get playing() {
      return playing;
    },
    dispose() {
      gate.update({ inside: false });
      this.stop();
    },
  };
}
