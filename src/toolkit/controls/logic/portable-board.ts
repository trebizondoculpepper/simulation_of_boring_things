import { assertDropProfile, DEFAULT_BOARD_DROP } from './drop-profile';
import type { Attachment, DropProfile } from './drop-profile';
import { computed, signal } from '@preact/signals-core';

/**
 * What a carried object says happens to it. A part's listener, which hears
 * every part event, takes these too.
 */
export type CarryEvent = 'pick-up' | 'drop' | 'impact';
export type CarryListener = (
  event: CarryEvent,
  sound: string | null | undefined,
) => void;

/** A component stays electrically removed after being carried or dropped. */
export function createPortableBoard(
  dropProfile: DropProfile = DEFAULT_BOARD_DROP,
  restore: () => void = () => {},
  attachment: Attachment = 'detachable',
) {
  assertDropProfile(dropProfile);
  const phase = signal<'installed' | 'held' | 'falling' | 'settled'>(
    'installed',
  );
  const impactSpeed = signal(0);
  const slipSpeed = signal(0);
  const impacts = signal(0);
  const groundSpeed = signal(0);
  const grounded = signal(false);
  const locked = signal(false);
  const listeners = new Set<CarryListener>();
  const emit = (event: CarryEvent) => {
    for (const listener of listeners) listener(event, null);
  };
  return {
    phase,
    attachment,
    locked,
    canPickUp: computed(() => attachment === 'detachable' && !locked.value),
    setLocked(value: boolean) {
      locked.value = value;
    },
    reset() {
      phase.value = 'installed';
      impacts.value = 0;
      groundSpeed.value = 0;
      grounded.value = false;
      restore();
    },
    dropProfile,
    groundSpeed,
    grounded,
    motion(speed: number, onGround: boolean) {
      groundSpeed.value = speed;
      grounded.value = onGround;
    },
    impactSpeed,
    slipSpeed,
    impacts,
    pickUp() {
      if (attachment === 'fixed' || locked.value) return false;
      grounded.value = false;
      groundSpeed.value = 0;
      phase.value = 'held';
      emit('pick-up');
    },
    drop() {
      if (phase.value === 'held') {
        impacts.value = 0;
        phase.value = 'falling';
        emit('drop');
      }
    },
    impact(normalSpeed = 5, slidingSpeed = 0) {
      if (phase.value !== 'falling') return;
      impactSpeed.value = normalSpeed;
      slipSpeed.value = slidingSpeed;
      impacts.value++;
      emit('impact');
    },
    settle() {
      if (phase.value === 'falling') {
        groundSpeed.value = 0;
        phase.value = 'settled';
      }
    },
    onEvent(listener: CarryListener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      listeners.clear();
    },
  };
}

/** Fixed-step fall, then shape-specific sliding, tumbling or rolling. */
export function createBoardFall(
  x: number,
  y: number,
  z: number,
  vx: number,
  vz: number,
  profile: DropProfile = DEFAULT_BOARD_DROP,
  random: () => number = Math.random,
) {
  assertDropProfile(profile);
  const body = {
    x,
    y,
    z,
    vx,
    vy: 0,
    vz,
    settled: false,
    impacts: 0,
    grounded: false,
    angle: 0,
  };
  let cornerTravel = 0;
  let nextCorner = profile.radius * (0.7 + random() * 0.6);
  const strike = (
    normal: number,
    impact: (normal: number, slip: number) => void,
  ) => {
    body.impacts++;
    impact(normal, Math.hypot(body.vx, body.vz));
  };
  return {
    body,
    step(
      dt: number,
      floor: (x: number, z: number) => number,
      impact: (normalSpeed: number, slidingSpeed: number) => void,
    ) {
      let left = Math.min(0.2, dt);
      while (left > 0 && !body.settled) {
        const h = Math.min(left, 1 / 120);
        left -= h;
        body.vy -= 9.81 * h;
        body.x += body.vx * h;
        body.z += body.vz * h;
        body.y += body.vy * h;
        const ground = floor(body.x, body.z);
        body.grounded = body.y <= ground;
        if (!body.grounded) continue;
        body.y = ground;
        if (body.vy < -0.35) strike(-body.vy, impact);
        body.vy =
          body.impacts < (profile.shape === 'box' ? 4 : 3) && body.vy < -0.7
            ? -body.vy * profile.restitution
            : 0;
        const speed = Math.hypot(body.vx, body.vz);
        const distance = speed * h;
        if (profile.shape !== 'flat') body.angle += distance / profile.radius;
        if (profile.shape === 'box' && body.vy === 0 && speed > 0.12) {
          cornerTravel += distance;
          if (cornerTravel >= nextCorner) {
            cornerTravel = 0;
            nextCorner = profile.radius * (0.7 + random() * 0.6);
            strike(speed * 0.55, impact);
            const turn = (random() * 2 - 1) * profile.skitter;
            const oldX = body.vx;
            body.vx = (oldX * Math.cos(turn) - body.vz * Math.sin(turn)) * 0.85;
            body.vz = (oldX * Math.sin(turn) + body.vz * Math.cos(turn)) * 0.85;
          }
        }
        const drag =
          profile.shape === 'round'
            ? Math.max(
                0,
                1 - (profile.rollingResistance * h) / Math.max(speed, 0.0001),
              )
            : Math.exp(-h * profile.friction);
        body.vx *= drag;
        body.vz *= drag;
        if (body.vy === 0 && Math.hypot(body.vx, body.vz) < 0.035) {
          body.vx = 0;
          body.vz = 0;
          body.settled = true;
        }
      }
    },
  };
}
