/** Vinyl warning stickers for staff and service doors. */
export type DoorStickerId =
  | 'authorised'
  | 'moving-machinery'
  | 'hot-surfaces'
  | 'gas-equipment'
  | 'corrosive-chemicals'
  | 'keep-chemicals-apart'
  | 'live-electrical'
  | 'shoe-coverings'
  | 'ear-protection'
  | 'chemical-ppe'
  | 'no-flames'
  | 'fire-door';

export type DoorWarningPreset =
  | 'plant'
  | 'furnace'
  | 'chemical'
  | 'electrical'
  | 'noisy-plant';
export type DoorWarningSelection = DoorWarningPreset | readonly DoorStickerId[];

export const DOOR_WARNING_PRESETS: Record<
  DoorWarningPreset,
  readonly DoorStickerId[]
> = {
  plant: ['authorised', 'moving-machinery', 'fire-door'],
  furnace: [
    'authorised',
    'no-flames',
    'hot-surfaces',
    'ear-protection',
    'fire-door',
  ],
  chemical: [
    'authorised',
    'corrosive-chemicals',
    'chemical-ppe',
    'keep-chemicals-apart',
    'fire-door',
  ],
  electrical: ['authorised', 'live-electrical', 'fire-door'],
  // A plant room loud enough to be a hearing protection zone (the air
  // handling plant's fans).
  'noisy-plant': [
    'authorised',
    'ear-protection',
    'moving-machinery',
    'fire-door',
  ],
};

export const doorWarningStickers = (
  selection: DoorWarningSelection,
): readonly DoorStickerId[] =>
  typeof selection === 'string' ? DOOR_WARNING_PRESETS[selection] : selection;
