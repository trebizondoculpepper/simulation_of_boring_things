import { signal } from '@preact/signals-core';

/** A temporary authoring mode: never persisted in settings or world saves. */
export const noclip = signal(false);

export interface FlightBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface FlightPose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
}

/** Rolling the view while a roll control is held, degrees a second. */
export const ROLL_DEGREES_PER_SECOND = 40;

/** An angle brought into (−π, π]. */
export function wrapAngle(radians: number) {
  const turn = Math.PI * 2;
  const wrapped = radians - turn * Math.floor((radians + Math.PI) / turn);
  return wrapped === -Math.PI ? Math.PI : wrapped;
}

/**
 * The camera's roll, radians (positive turns the view clockwise, as a
 * camera tipped to its right), after `seconds` with `turn` held: −1 to
 * roll left, +1 right, fractions from a trigger or stick. Free all the
 * way round; never rounded back to level but by `level`.
 */
export function rollCamera(roll: number, turn: number, seconds: number) {
  const step =
    (Math.max(-1, Math.min(1, turn)) *
      ROLL_DEGREES_PER_SECOND *
      Math.PI *
      Math.max(0, seconds)) /
    180;
  return wrapAngle(roll + step);
}

/** Look-relative flight, with no gravity or obstacle collision, inside the room envelope. */
export function flyCamera(
  pose: FlightPose,
  input: { forward: number; right: number; up: number },
  distance: number,
  bounds: FlightBounds,
) {
  const dx =
    Math.sin(pose.yaw) * Math.cos(pose.pitch) * input.forward +
    Math.cos(pose.yaw) * input.right;
  const dy = Math.sin(pose.pitch) * input.forward + input.up;
  const dz =
    -Math.cos(pose.yaw) * Math.cos(pose.pitch) * input.forward +
    Math.sin(pose.yaw) * input.right;
  const scale = Math.max(0, distance) / Math.max(1, Math.hypot(dx, dy, dz));
  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));
  return {
    x: clamp(pose.x + dx * scale, bounds.minX, bounds.maxX),
    y: clamp(pose.y + dy * scale, bounds.minY, bounds.maxY),
    z: clamp(pose.z + dz * scale, bounds.minZ, bounds.maxZ),
  };
}

export const flightHelp = (mode: 'keyboard' | 'mouse' | 'touch' | 'gamepad') =>
  mode === 'gamepad'
    ? 'NOCLIP · Left stick: fly · Right stick: look · A: rise · B: descend · LB / RB: roll · Y: level · Click left stick: faster · Triggers: zoom'
    : mode === 'touch'
      ? 'NOCLIP · Left stick: fly · Right stick: look · UP / DOWN: rise / descend · ⟲ / ⟳: roll · LEVEL: level · Stick rim: faster · Pinch: zoom'
      : 'NOCLIP · WASD: fly along the view · Space: rise · Shift: descend · Q / E: roll · R: level · Ctrl: faster · Mouse: look · Wheel: zoom · Esc: menu';
