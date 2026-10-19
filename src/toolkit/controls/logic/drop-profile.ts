export type Attachment = 'detachable' | 'fixed';

/** Shared, precomputed physical and acoustic settings for a loose component. */
export interface DropProfile {
  readonly shape: 'flat' | 'box' | 'round';
  readonly rollAxis: 'x' | 'y' | 'z';
  /** Longest edge and approximate rolling radius, metres. */
  readonly span: number;
  readonly radius: number;
  readonly restitution: number;
  /** Sliding drag, per second; rolling resistance, metres/second squared. */
  readonly friction: number;
  readonly rollingResistance: number;
  /** Direction changes at a box's corner contacts; round parts never skitter. */
  readonly skitter: number;
  readonly sound: {
    readonly material: 'board' | 'plastic' | 'metal' | 'ceramic';
    readonly band: number;
    readonly thump: number;
    readonly decay: number;
    readonly gain: number;
  };
}

/** Artistic profiles, precomputed once per component kind, not material measurements. */
export function createDropProfile(
  shape: DropProfile['shape'],
  span: number,
  material: DropProfile['sound']['material'] = 'plastic',
  radius = span / 2,
  rollAxis: DropProfile['rollAxis'] = 'x',
): DropProfile {
  const pitch = Math.max(0.4, Math.min(1.6, (0.18 / span) ** 0.85));
  const profile: DropProfile = {
    shape,
    rollAxis,
    span,
    radius,
    restitution: shape === 'flat' ? 0.16 : shape === 'box' ? 0.32 : 0,
    friction: shape === 'flat' ? 22 : shape === 'box' ? 4 : 0,
    rollingResistance: 0.45,
    skitter: shape === 'box' ? 0.65 : 0,
    sound: {
      material,
      band:
        (material === 'metal' ? 3000 : material === 'ceramic' ? 3600 : 2400) *
        pitch,
      thump: 160 * pitch,
      decay: (material === 'metal' ? 0.09 : 0.06) / Math.sqrt(pitch),
      gain: material === 'board' ? 0.42 : 0.32,
    },
  };
  assertDropProfile(profile);
  Object.freeze(profile.sound);
  return Object.freeze(profile);
}

export function assertDropProfile(profile: DropProfile): void {
  if (
    !profile ||
    !['flat', 'box', 'round'].includes(profile.shape) ||
    !['x', 'y', 'z'].includes(profile.rollAxis)
  )
    throw new Error('Pickable objects require a drop shape');
  if (
    !profile.sound ||
    !['board', 'plastic', 'metal', 'ceramic'].includes(profile.sound.material)
  )
    throw new Error('Pickable objects require a drop sound material');
  for (const value of [
    profile.span,
    profile.radius,
    profile.rollingResistance,
    profile.sound?.band,
    profile.sound?.thump,
    profile.sound?.decay,
    profile.sound?.gain,
  ])
    if (!Number.isFinite(value) || value <= 0)
      throw new Error(
        'Pickable objects require valid drop sound and settling settings',
      );
  if (
    ![profile.friction, profile.skitter, profile.restitution].every(
      (value) => Number.isFinite(value) && value >= 0,
    ) ||
    profile.restitution >= 1 ||
    (profile.shape !== 'round' && profile.friction <= 0) ||
    (profile.shape === 'round' && profile.skitter !== 0)
  )
    throw new Error('Invalid bounce/skitter settings');
}

export const DEFAULT_BOARD_DROP = createDropProfile(
  'flat',
  0.18,
  'board',
  0.015,
);
