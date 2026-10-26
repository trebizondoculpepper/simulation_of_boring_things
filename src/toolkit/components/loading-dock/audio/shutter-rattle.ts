import type { LoopRecipe } from '../../core/audio/part-audio';

/**
 * A roller shutter's curtain winding onto or off its barrel (the owner,
 * 2026-10-26; the first try, ringing pings, was rejected): no tones, but
 * a dense, soft chatter of the laths' hinges working, short bursts of
 * band-limited noise some 25 a second, uneven in strength, over a low,
 * uneven rumble of the curtain on the barrel and in its guides. Rendered
 * once as three seconds of loop; pure, so it can be rendered in a test.
 */
export function renderShutterRattle(sampleRate: number, seconds = 3) {
  const n = Math.floor(sampleRate * seconds);
  const out = new Float32Array(n);
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const white = () => rnd() * 2 - 1;
  /** A one-pole low-pass's coefficient for `hz`. */
  const pole = (hz: number) => Math.exp((-2 * Math.PI * hz) / sampleRate);

  // The rumble: noise low-passed twice under about 160 Hz, its strength
  // wandering slowly, as the curtain's weight shifts on the barrel.
  {
    const a = pole(160);
    let y1 = 0;
    let y2 = 0;
    let swell = 0.6;
    for (let i = 0; i < n; i++) {
      y1 = a * y1 + (1 - a) * white();
      y2 = a * y2 + (1 - a) * y1;
      if (i % 2000 === 0) swell = 0.4 + rnd() * 0.6;
      out[i] += y2 * 2.2 * swell;
    }
  }

  // The chatter: each burst a few milliseconds of noise, band-limited
  // between about 600 Hz and 2.5 kHz (high-passed then low-passed), its
  // strength uneven, some 25 a second.
  {
    const lo = pole(2500);
    const hi = pole(600);
    let t = 0;
    while (t < seconds - 0.02) {
      const at = Math.floor(t * sampleRate);
      const loud = 0.15 + rnd() ** 2 * 0.35;
      const len = Math.floor((0.004 + rnd() * 0.006) * sampleRate);
      let lp = 0;
      let hpIn = 0;
      let hpOut = 0;
      for (let i = 0; i < len * 3 && at + i < n; i++) {
        const env = i < len ? 1 : Math.exp(-(i - len) / (len * 0.5));
        const x = white() * env;
        // High-pass: what the slow follower leaves.
        hpOut = hi * (hpOut + x - hpIn);
        hpIn = x;
        lp = lo * lp + (1 - lo) * hpOut;
        out[at + i] += lp * loud * 3;
      }
      t += 0.025 + rnd() * 0.03;
    }
  }

  // Its ends faded into each other, so the loop has no seam.
  const fade = Math.floor(0.05 * sampleRate);
  for (let i = 0; i < fade; i++) {
    const k = i / fade;
    out[i] *= k;
    out[n - 1 - i] *= k;
  }
  // Brought to a set peak, its level then the recipe's.
  const peak = out.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1;
  for (let i = 0; i < n; i++) out[i] *= 0.8 / peak;
  return out;
}

const loops = new WeakMap<BaseAudioContext, AudioBuffer>();

/** The chatter and rumble, looped while the shutter runs. */
export const SHUTTER_RATTLE: LoopRecipe = (context, out) => {
  let buffer = loops.get(context);
  if (!buffer) {
    const samples = renderShutterRattle(context.sampleRate);
    buffer = context.createBuffer(1, samples.length, context.sampleRate);
    buffer.getChannelData(0).set(samples);
    loops.set(context, buffer);
  }
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const gain = context.createGain();
  gain.gain.value = 0.25;
  source.connect(gain).connect(out);
  source.start();
  return [source];
};
