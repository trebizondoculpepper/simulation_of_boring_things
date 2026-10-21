/** Vinyl warning stickers for staff and service doors. */
export type DoorStickerId =
  | 'authorised'
  | 'moving-machinery'
  | 'hot-surfaces'
  | 'gas-equipment'
  | 'corrosive-chemicals'
  | 'keep-chemicals-apart'
  | 'live-electrical';

export type DoorWarningPreset = 'plant' | 'furnace' | 'chemical' | 'electrical';
export type DoorWarningSelection = DoorWarningPreset | readonly DoorStickerId[];

export const DOOR_WARNING_PRESETS: Record<
  DoorWarningPreset,
  readonly DoorStickerId[]
> = {
  plant: ['authorised', 'moving-machinery', 'hot-surfaces'],
  furnace: ['authorised', 'hot-surfaces', 'gas-equipment'],
  chemical: ['authorised', 'corrosive-chemicals', 'keep-chemicals-apart'],
  electrical: ['authorised', 'live-electrical'],
};

export const doorWarningStickers = (
  selection: DoorWarningSelection,
): readonly DoorStickerId[] =>
  typeof selection === 'string' ? DOOR_WARNING_PRESETS[selection] : selection;
