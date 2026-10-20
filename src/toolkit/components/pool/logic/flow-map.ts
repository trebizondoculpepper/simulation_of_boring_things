/**
 * Flow-map water, after Alex Vlachos, "Water Flow in Portal 2" (SIGGRAPH
 * 2010 Advances in Real-Time Rendering): a texture of flow vectors says
 * which way and how fast the water runs at each point, and the shader
 * drags its ripple normal map along them. Dragged for ever, a texture
 * stretches apart, so it is sampled twice, each copy dragged for one
 * cycle and then started again, half a cycle apart, and the two are
 * cross-faded so that each restart happens while its copy is unseen. A
 * low-frequency noise offsets the cycle point to point, so the blend's
 * slight pulse does not beat across the whole surface at once. Pure: the
 * shader does the same sums per pixel (`pool-edges.ts`).
 */

/** The two copies' points in their cycles (0 to 1), and the second's weight. */
export function flowPhases(time: number, period: number, offset = 0) {
  const first = fract(time / period + offset);
  const second = fract(first + 0.5);
  // The second copy is shown fully as the first restarts, and not at all
  // half a cycle later, when the second restarts.
  return { first, second, weight: Math.abs(0.5 - first) * 2 };
}

const fract = (x: number) => x - Math.floor(x);

/** The flow map's fastest speed, metres a second: its vectors' full scale. */
export const OVERFLOW_MAX_SPEED = 0.4;

/**
 * The overflow at a deck-level edge, in the film's own coordinates: `u`
 * along the edge (metres, repeating each metre) and `v` across it, from
 * the pool's side (0) to where it has fallen through the grating (1). It
 * leaves the pool slowly, quickens over the edge tile and drops fastest
 * through the slots; it wanders a little along the edge as it goes.
 * Metres a second, (along, across).
 */
export function overflowFlow(u: number, v: number): [number, number] {
  const ease = v * v * (3 - 2 * v);
  const across = 0.06 + 0.26 * ease;
  const along =
    0.025 * Math.sin(2 * Math.PI * (u * 3 + v * 0.7)) +
    0.012 * Math.sin(2 * Math.PI * (u * 7 - v * 1.3) + 1.1);
  return [along, across];
}

/** A low-frequency noise, 0 to 1, repeating each unit in u and v. */
export function phaseNoise(u: number, v: number) {
  const t = 2 * Math.PI;
  return (
    0.5 +
    0.3 * Math.sin(t * (2 * u + v)) * Math.cos(t * (u - 3 * v)) +
    0.2 * Math.sin(t * (5 * u + 2 * v) + 0.6)
  );
}

/**
 * The flow map as RGBA bytes, `width` × `height` texels over u 0–1 and
 * v 0–1: red and green the flow (along, across) at `maxSpeed` full scale,
 * stored as 0.5 + 0.5 × its share; blue the phase noise.
 */
export function flowMapTexels(
  width: number,
  height: number,
  flow: (u: number, v: number) => [number, number] = overflowFlow,
  maxSpeed = OVERFLOW_MAX_SPEED,
) {
  const data = new Uint8Array(width * height * 4);
  const byte = (x: number) => Math.round(Math.max(0, Math.min(1, x)) * 255);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const u = (x + 0.5) / width,
        v = (y + 0.5) / height;
      const [fu, fv] = flow(u, v);
      const i = (y * width + x) * 4;
      data[i] = byte(0.5 + (0.5 * fu) / maxSpeed);
      data[i + 1] = byte(0.5 + (0.5 * fv) / maxSpeed);
      data[i + 2] = byte(phaseNoise(u, v));
      data[i + 3] = 255;
    }
  return data;
}

/** A texel's flow back from its bytes, metres a second. */
export const decodeFlow = (
  r: number,
  g: number,
  maxSpeed = OVERFLOW_MAX_SPEED,
) => [((r / 255) * 2 - 1) * maxSpeed, ((g / 255) * 2 - 1) * maxSpeed] as const;
