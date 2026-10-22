import { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { doorWarningStickers } from '../logic/door-warnings';
import type {
  DoorStickerId,
  DoorWarningSelection,
} from '../logic/door-warnings';
import { createSafetySign } from '../../general-safety/views/safety-signs';
import type { Pictogram } from '../../general-safety/views/safety-signs';

/**
 * Each door sign: its ISO 7010 pictogram and its words, modern UK
 * practice (`safety-signs.ts`), as a sign maker prints them for a door.
 */
const SIGNS: Record<
  DoorStickerId,
  { pictogram: Pictogram; words: readonly string[] }
> = {
  authorised: {
    pictogram: 'no-entry',
    words: ['AUTHORISED', 'PERSONNEL ONLY'],
  },
  'moving-machinery': {
    pictogram: 'automatic-start',
    words: ['CAUTION', 'Pumps start automatically'],
  },
  'hot-surfaces': {
    pictogram: 'hot-surface',
    words: ['CAUTION', 'Hot surfaces'],
  },
  'gas-equipment': {
    pictogram: 'general',
    words: ['GAS EQUIPMENT', 'Isolate before service'],
  },
  'corrosive-chemicals': {
    pictogram: 'corrosive',
    words: ['DANGER', 'Corrosive substances'],
  },
  'keep-chemicals-apart': {
    pictogram: 'general',
    words: ['NEVER MIX', 'Acid and hypochlorite'],
  },
  'live-electrical': {
    pictogram: 'electricity',
    words: ['DANGER', '400 VOLTS'],
  },
  'shoe-coverings': {
    pictogram: 'mandatory',
    words: ['WEAR SHOE COVERINGS', 'before entering the pool'],
  },
  'ear-protection': {
    pictogram: 'ear',
    words: ['HEARING PROTECTION ZONE', 'Ear protection must be worn'],
  },
  'chemical-ppe': {
    pictogram: 'gloves',
    words: ['CHEMICAL PPE', 'must be worn'],
  },
  'no-flames': {
    pictogram: 'no-flames',
    words: ['NO SMOKING', 'or naked flames'],
  },
  'fire-door': { pictogram: 'door-shut', words: ['FIRE DOOR', 'KEEP SHUT'] },
};

/**
 * A door's signs, one above another, facing +z, centred at their
 * mounting point: each a landscape safety sign `width` wide.
 */
export function createDoorWarningStickers(
  kit: PanelKit,
  selection: DoorWarningSelection,
  width = 0.34,
) {
  const group = new Group();
  group.name = 'door warning stickers';
  const ids = doorWarningStickers(selection);
  const height = 0.105;
  const gap = 0.014;
  ids.forEach((id, i) => {
    const { pictogram, words } = SIGNS[id];
    const sign = createSafetySign(
      kit,
      [pictogram],
      words,
      'landscape',
      width,
      height,
    );
    sign.name = `warning sticker: ${id}`;
    sign.position.y = ((ids.length - 1) / 2 - i) * (height + gap);
    group.add(sign);
  });
  return group;
}
