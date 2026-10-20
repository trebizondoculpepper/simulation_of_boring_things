import { Vector3 } from 'three';
import type { Camera, Object3D } from 'three';

/**
 * Where parts make their sounds: one audio output for the whole game,
 * like the page a React component renders into. A part brings its own
 * sounds (a `recording` or a `click`, defined where the part is) and
 * plays them here, from where it stands; the room only tells the output
 * where the listener is (`listen`) and nothing about which part makes
 * which sound. Sound starts at the first click or key press, as browsers
 * require.
 */

/** A synthesised mechanical click: filtered noise, and a thump under it. */
export interface Click {
  /** Band of the noise burst, Hz, and how narrow it is. */
  band: number;
  q: number;
  /** Seconds for the burst to die away. */
  decay: number;
  level: number;
  /** A low thump under the click: frequency and decay, or none. */
  thump?: [number, number];
  /** Repeated clicks, as a ratchet or a run of detents: count and gap. */
  repeat?: [number, number];
  /** A slow scrape instead of a snap: noise swept over this many seconds. */
  sweep?: number;
}

/** A synthesised electronic tone: a beep, a buzzer, a chime. */
export interface Tone {
  hz: number;
  seconds: number;
  level: number;
  type?: OscillatorType;
  /** Repeated beeps: count and gap, seconds. */
  repeat?: [number, number];
}

/** A sound a part makes once. */
export type SoundRecipe =
  | { recording: URL; level: number }
  | { click: Click }
  | { tone: Tone }
  | { tones: (Tone & { at: number })[] }
  | { sequence: { at: number; click: Click }[] };

/** A recorded sound, at `level`. */
export const recording = (url: URL, level: number): SoundRecipe => ({
  recording: url,
  level,
});
/** A synthesised click. */
export const click = (spec: Click): SoundRecipe => ({ click: spec });
/** A synthesised beep. */
export const tone = (spec: Tone): SoundRecipe => ({ tone: spec });

/**
 * A sound a part holds for as long as its state calls for it: builds its
 * nodes into `out` and returns the sources to stop. A source with a
 * `release` dies away by itself over that many seconds once told to stop
 * (a machine running down), and is let go only when it has.
 */
export type LoopRecipe = (
  context: AudioContext,
  out: AudioNode,
) => (Pick<AudioScheduledSourceNode, 'stop'> & { release?: number })[];

let context: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let muted = false;
/** Metres to scene units, from the room that listens. */
let metre = 1;
const buffers = new Map<string, Promise<AudioBuffer>>();
const holds = new Map<object, { stop(): void; update(): void }>();
const position = new Vector3();
const facing = new Vector3();

const start = () => {
  if (context) {
    if (context.state === 'suspended') void context.resume();
    return;
  }
  context = new AudioContext();
  master = context.createGain();
  master.gain.value = muted ? 0 : 1;
  master.connect(context.destination);
  noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const samples = noise.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
};
let listening = false;
const awaitGesture = () => {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener('pointerdown', start, { capture: true });
  window.addEventListener('keydown', start, { capture: true });
};

/** A panner placed where `from` is, or straight to the master. */
const placed = (from: Object3D | undefined): AudioNode => {
  if (!context || !master) throw new Error('No audio yet.');
  if (!from) return master;
  from.getWorldPosition(position).divideScalar(metre);
  const panner = new PannerNode(context, {
    panningModel: 'equalpower',
    distanceModel: 'inverse',
    refDistance: 1.2,
    rolloffFactor: 1,
    positionX: position.x,
    positionY: position.y,
    positionZ: position.z,
  });
  panner.connect(master);
  return panner;
};

const load = (url: URL) => {
  if (!buffers.has(url.href))
    buffers.set(
      url.href,
      fetch(url)
        .then((response) => {
          if (!response.ok) throw new Error(`Sound unavailable: ${url}`);
          return response.arrayBuffer();
        })
        .then((bytes) => context!.decodeAudioData(bytes))
        .catch((error) => {
          buffers.delete(url.href);
          throw error;
        }),
    );
  return buffers.get(url.href)!;
};

const burst = (spec: Click, at: number, out: AudioNode) => {
  const ctx = context!;
  const source = ctx.createBufferSource();
  source.buffer = noise;
  source.playbackRate.value = 0.8 + Math.random() * 0.4;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = spec.band * (0.94 + Math.random() * 0.12);
  band.Q.value = spec.q;
  const envelope = ctx.createGain();
  const length = (spec.sweep ?? 0) + spec.decay;
  envelope.gain.setValueAtTime(0.0001, at);
  envelope.gain.exponentialRampToValueAtTime(
    spec.level,
    at + (spec.sweep ?? 0.002),
  );
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + length);
  if (spec.sweep)
    band.frequency.exponentialRampToValueAtTime(spec.band * 1.6, at + length);
  source.connect(band).connect(envelope).connect(out);
  source.start(at, Math.random() * 0.5);
  source.stop(at + length + 0.02);
  if (spec.thump) {
    const [hz, decay] = spec.thump;
    const thump = ctx.createOscillator();
    thump.frequency.setValueAtTime(hz * 1.6, at);
    thump.frequency.exponentialRampToValueAtTime(hz, at + decay);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(spec.level * 0.8, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + decay);
    thump.connect(gain).connect(out);
    thump.start(at);
    thump.stop(at + decay + 0.02);
  }
};

export const partAudio = {
  /** Play a part's sound once, from where `from` stands. */
  play(recipe: SoundRecipe, from?: Object3D): () => void {
    awaitGesture();
    const none = () => {};
    if (!context || context.state !== 'running') return none;
    const out = placed(from);
    const playTone = (spec: Tone, at: number) => {
      const osc = context!.createOscillator();
      osc.type = spec.type ?? 'square';
      osc.frequency.value = spec.hz;
      const gain = context!.createGain();
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(spec.level, at + 0.005);
      gain.gain.setValueAtTime(spec.level, at + spec.seconds - 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + spec.seconds);
      osc.connect(gain).connect(out);
      osc.start(at);
      osc.stop(at + spec.seconds + 0.02);
    };
    if ('tone' in recipe) {
      const spec = recipe.tone;
      const [count, gap] = spec.repeat ?? [1, 0];
      for (let i = 0; i < count; i++) {
        const at = context.currentTime + 0.005 + i * (spec.seconds + gap);
        playTone(spec, at);
      }
      return none;
    }
    if ('tones' in recipe) {
      const startAt = context.currentTime + 0.005;
      for (const spec of recipe.tones) playTone(spec, startAt + spec.at);
      return none;
    }
    if ('sequence' in recipe) {
      const at = context.currentTime + 0.005;
      for (const contact of recipe.sequence)
        burst(contact.click, at + contact.at, out);
      return none;
    }
    if ('click' in recipe) {
      const spec = recipe.click;
      const at = context.currentTime + 0.005;
      const [count, gap] = spec.repeat ?? [1, 0];
      for (let i = 0; i < count; i++)
        burst(
          { ...spec, level: spec.level * (1 - i * 0.12) },
          at + i * gap * (0.85 + Math.random() * 0.3),
          out,
        );
      return none;
    }
    // A recording can be cut short: the returned function stops it.
    let stopped = false;
    let playing: AudioBufferSourceNode | null = null;
    load(recipe.recording)
      .then((buffer) => {
        if (!context || context.state !== 'running' || stopped) return;
        const source = context.createBufferSource();
        playing = source;
        const gain = context.createGain();
        source.buffer = buffer;
        gain.gain.value = recipe.level;
        source.connect(gain).connect(out);
        source.onended = () => {
          source.disconnect();
          gain.disconnect();
        };
        source.start();
      })
      .catch((error) => console.warn('A part sound could not play.', error));
    return () => {
      stopped = true;
      try {
        playing?.stop();
      } catch {
        // Already ended.
      }
    };
  },
  /**
   * Hold `recipe` for `owner` from where `from` stands, replacing what it
   * held; `null` lets it go.
   */
  hold(owner: object, recipe: LoopRecipe | null, from?: Object3D) {
    awaitGesture();
    holds.get(owner)?.stop();
    holds.delete(owner);
    if (!recipe || !context || !master) return;
    const ctx = context;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(1, ctx.currentTime, 0.08);
    const output = placed(from);
    gain.connect(output);
    const sources = recipe(ctx, gain);
    holds.set(owner, {
      update() {
        if (!from) return;
        from.getWorldPosition(position).divideScalar(metre);
        const panner = output as PannerNode;
        panner.positionX.value = position.x;
        panner.positionY.value = position.y;
        panner.positionZ.value = position.z;
      },
      stop() {
        const release = Math.max(0, ...sources.map((s) => s.release ?? 0));
        // A source that runs down fades itself; anything else fades now.
        if (!release) gain.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
        const end = ctx.currentTime + Math.max(0.5, release);
        for (const source of sources) source.stop(end);
        window.setTimeout(
          () => gain.disconnect(),
          (Math.max(0.5, release) + 0.1) * 1000,
        );
      },
    });
  },
  /**
   * Where the listener is: the room's camera, each frame, and how many
   * scene units make a metre.
   */
  listen(camera: Camera, metreInScene: number) {
    // A room drawn under another, seen through a doorway, does not hear.
    if (camera.userData.following) return;
    awaitGesture();
    metre = metreInScene;
    if (!context) return;
    for (const held of holds.values()) held.update();
    camera.getWorldPosition(position).divideScalar(metre);
    camera.getWorldDirection(facing);
    const l = context.listener;
    // Firefox has only the older setters on the listener.
    if (!l.positionX) {
      l.setPosition(position.x, position.y, position.z);
      l.setOrientation(facing.x, facing.y, facing.z, 0, 1, 0);
      return;
    }
    l.positionX.value = position.x;
    l.positionY.value = position.y;
    l.positionZ.value = position.z;
    l.forwardX.value = facing.x;
    l.forwardY.value = facing.y;
    l.forwardZ.value = facing.z;
    l.upX.value = 0;
    l.upY.value = 1;
    l.upZ.value = 0;
  },
  setMuted(value: boolean) {
    muted = value;
    if (context && master)
      master.gain.setTargetAtTime(value ? 0 : 1, context.currentTime, 0.03);
  },
  muted: () => muted,
  /** Whether sound has started (after the first gesture). */
  running: () => context?.state === 'running',
};
