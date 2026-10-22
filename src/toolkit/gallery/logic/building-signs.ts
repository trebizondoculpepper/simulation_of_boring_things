/**
 * The building's notices and signs inside its rooms
 * (`doc/research/mandatory-safety-posters.md`), as wall items each room
 * lays out among its machines; the doors carry their own
 * (`door-warnings.ts`). Their sizes, metres, and the rooms each goes in.
 * Pure.
 */

export interface SignItem {
  label: string;
  w: number;
  h: number;
  /** Its middle's height over the floor. */
  y: number;
}

/** A3, A4 and the sign makers' sizes. */
const A3 = { w: 0.297, h: 0.42 };
const A4 = { w: 0.21, h: 0.297 };
const SIGN = { w: 0.2, h: 0.3 };

export const SIGN_ITEMS = {
  'staff-noticeboard': {
    label: 'Staff noticeboard',
    w: 1.1,
    h: 0.7,
    y: 1.5,
  },
  'shock-poster': { label: 'Electric shock poster', ...A3, y: 1.5 },
  'gas-emergency': { label: 'Gas emergency notice', ...A4, y: 1.5 },
  'no-flames': { label: 'No naked flames sign', ...SIGN, y: 1.7 },
  spillage: { label: 'Chemical spillage procedure', ...A4, y: 1.5 },
  'never-mix': { label: 'Never mix notice', w: A4.h, h: A4.w, y: 1.6 },
  'no-smoking': { label: 'No smoking sign', ...SIGN, y: 1.7 },
  'fire-exit-clear': { label: 'Fire exit keep clear sign', ...SIGN, y: 1.7 },
} as const satisfies Record<string, SignItem>;

export type SignItemId = keyof typeof SIGN_ITEMS;

/** Each room's notices: the staff's, the procedures by what they concern. */
export const ROOM_SIGNS: Partial<Record<string, readonly SignItemId[]>> = {
  // No staff room yet: the statutory notices on the control room's board,
  // where the staff are. (The engineer's office has no wall free of its
  // doorways and furniture.)
  control_room: ['staff-noticeboard'],
  switch_room: ['shock-poster'],
  // The boiler house's gas emergency notice is on the gas train, by its
  // emergency control valve (`room-equipment.ts`'s view); its no naked
  // flames sign on its door.
  // (Their eyewash and safety shower, and their never mix notice, are
  // part of their stores' fittings.)
  hypo_store: ['spillage'],
  acid_store: ['spillage'],
  loading_bay: ['no-smoking', 'fire-exit-clear'],
};
