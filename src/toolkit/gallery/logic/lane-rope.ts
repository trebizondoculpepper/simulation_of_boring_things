/**
 * A lane rope's sway: a string fixed at both ends (its wall hooks), in a
 * slow standing wave, as if it had been plucked: its fundamental, half a
 * sine across the pool, and a fainter second harmonic, out of step with
 * it, so the motion never looks mechanical. Pure; metres and seconds.
 */
export const LANE_ROPE_SWAY = {
  /** The fundamental's swing at the rope's middle, and its period. */
  amplitude: 0.06,
  period: 7,
  /** The second harmonic's swing, a share of the fundamental's. */
  second: 0.25,
} as const;

/**
 * How far sideways the rope is at `u` along it (0 at one end, 1 at the
 * other) at time `t`: nothing at its ends, at most a little more than the
 * fundamental's amplitude.
 */
export function laneRopeSway(u: number, t: number, s = LANE_ROPE_SWAY) {
  const w = (2 * Math.PI) / s.period;
  return (
    s.amplitude * Math.sin(Math.PI * u) * Math.cos(w * t) +
    s.amplitude *
      s.second *
      Math.sin(2 * Math.PI * u) *
      Math.cos(2 * w * t + 1.3)
  );
}
