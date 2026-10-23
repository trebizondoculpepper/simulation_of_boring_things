import { noiseSource } from '../../core/audio/part-loops';
import type { LoopRecipe } from '../../core/audio/part-audio';

/**
 * A stream of water pouring continuously into water (the owner,
 * 2026-10-23): the splash, a broad band of noise that never settles,
 * fluttering as the stream breaks up; the plunge under it, a low rumble
 * of the air it carries down; and a faint hiss of spray over all. `size`,
 * 0 (a small make-up pipe's trickle) to 1 (a main return's torrent),
 * makes it louder, lower and heavier. Held for as long as water falls
 * (`partAudio.hold`), from where it lands.
 */
export function waterPourSound(size = 0.3): LoopRecipe {
  const s = Math.max(0, Math.min(1, size));
  return (context, out) => {
    const level = context.createGain();
    level.gain.value = 0.05 + 0.12 * s;
    level.connect(out);
    const sources = [];
    // The splash: a band of noise, its loudness fluttering.
    const splash = noiseSource(context);
    const band = context.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1900 - 900 * s;
    band.Q.value = 0.8;
    const flutter = context.createGain();
    flutter.gain.value = 0.7;
    splash.connect(band).connect(flutter).connect(level);
    for (const [hz, depth] of [
      [5.3, 0.18],
      [8.9, 0.12],
      [13.7, 0.08],
    ] as const) {
      const lfo = context.createOscillator();
      lfo.frequency.value = hz * (1 - 0.3 * s);
      const d = context.createGain();
      d.gain.value = depth;
      lfo.connect(d).connect(flutter.gain);
      lfo.start();
      sources.push(lfo);
    }
    splash.start();
    sources.push(splash);
    // The plunge: the low rumble of air driven under.
    const plunge = noiseSource(context);
    const low = context.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 260 + 120 * (1 - s);
    const rumble = context.createGain();
    rumble.gain.value = 0.35 + 0.9 * s;
    plunge.connect(low).connect(rumble).connect(level);
    plunge.start();
    sources.push(plunge);
    // The spray's hiss.
    const spray = noiseSource(context);
    const high = context.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = 4500;
    const hiss = context.createGain();
    hiss.gain.value = 0.12;
    spray.connect(high).connect(hiss).connect(level);
    spray.start();
    sources.push(spray);
    return sources;
  };
}
