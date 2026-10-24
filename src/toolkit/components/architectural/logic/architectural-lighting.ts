/**
 * Architectural lighting, as logic (Dev30, lighting styles): how a
 * fitting's output follows its dimmer, how it fades to it, and how a
 * fibre-optic starlight ceiling's points twinkle and change colour on its
 * projector's wheels. Pure: shares 0 to 1, seconds.
 */

/** Below this share of its knob's travel a dimmer is off. */
export const DIMMER_OFF = 0.04;

/**
 * A dimmer's output, 0 to 1, for its knob's share of travel: off at the
 * bottom of its travel, then rising on a square law, as a leading-edge
 * dimmer's light does to the eye, to full at the top.
 */
export function dimmerOutput(share: number): number {
  if (!(share > DIMMER_OFF)) return 0;
  const t = Math.min(1, (share - DIMMER_OFF) / (1 - DIMMER_OFF));
  return 0.04 + 0.96 * t * t;
}

/** `from` moved toward `to` with a time constant of `tau` seconds (a lamp's warm-up and fade). */
export function fadeToward(from: number, to: number, dt: number, tau = 0.25) {
  if (!(dt > 0)) return from;
  return to + (from - to) * Math.exp(-dt / tau);
}

/**
 * Fibre end `i`'s brightness, 0.25 to 1, at `time`: steady with its
 * twinkle wheel stopped; turning, each end flickers on its own, slowly,
 * as the wheel's holes pass its fibre.
 */
export function twinkle(i: number, time: number, wheel: boolean): number {
  if (!wheel) return 1;
  const a = Math.sin(i * 12.9898) * 43758.5453;
  const phase = (a - Math.floor(a)) * Math.PI * 2;
  const speed = 0.6 + ((i * 7) % 11) / 11;
  const v =
    0.5 +
    0.35 * Math.sin(time * speed + phase) +
    0.15 * Math.sin(time * speed * 2.7 + phase * 1.7);
  return 0.25 + 0.75 * Math.max(0, Math.min(1, v));
}

/** A perforated illuminator wheel: mostly dim, with brief bright passes for each fibre. */
export function fibreWheelSparkle(
  i: number,
  time: number,
  wheel: boolean,
): number {
  if (!wheel) return 1;
  const a = Math.sin(i * 12.9898) * 43758.5453;
  const phase = (a - Math.floor(a)) * Math.PI * 2;
  const speed = 4.2 + ((i * 7) % 9) * 0.55;
  const opening = 0.5 + 0.5 * Math.sin(time * speed + phase);
  return 0.12 + 0.88 * opening ** 5;
}

/** Separate rainbow phases along the fibre bundle, drifting slowly as the colour wheel turns. */
export function fibreRainbowHue(i: number, time: number): number {
  return (i * 0.61803398875 + time * 0.035) % 1;
}

/**
 * The colour wheel's colour at `time`, as red, green and blue shares:
 * white with it out; turning, a slow round of soft colours, as a
 * projector's dichroic wheel gives.
 */
export function wheelColour(
  time: number,
  wheel: boolean,
): [number, number, number] {
  if (!wheel) return [1, 0.97, 0.9];
  const h = (time / 40) % 1;
  const k = (n: number) => {
    const x = (n + h * 6) % 6;
    return 0.55 + 0.45 * Math.max(0, Math.min(1, Math.abs(x - 3) - 1));
  };
  return [k(0), k(4), k(2)];
}
