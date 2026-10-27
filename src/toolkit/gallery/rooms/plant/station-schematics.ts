import type { PlantExhibit } from './exhibit';
import type { ExhibitSize } from '../../logic/plant-room-layout';
import { galleryWallLayout } from '../../logic/gallery-walls';
import {
  STATION_DESIGNS,
  STATION_DUTY,
  STATION_NAMES,
} from '../../logic/station-schematics';
import { plantReadingOf } from '../../logic/world-reading';
import { createStationSchematic } from '../../views/station-schematics';
import { roomWorld } from '../../../save/world-store';

/** What this room is for, printed on its title card. */
export const PURPOSE =
  'Every bridge station’s schematic screens, turning through their designs, each live from the world (mission 095)';

/** Dim and plain, so the screens glow; its title card small, over the door. */
export const FINISH = {
  wall: '#3f3d46',
  floor: '#2e2d33',
  titleCard: { x: 0, y: 0, z: 0, yaw: Math.PI / 2, scale: 0.45 },
};

/** The screens' glass, metres: about a bridge station's upper screen. */
const SCREEN = { w: 1.9, h: 1.07 };

/** The world the screens read: this tab's (the dev rooms' slot, or `?slot=`). */
function context() {
  if (typeof window === 'undefined') return null;
  const world = roomWorld().world.value;
  return { world, reading: plantReadingOf(world, 'pool_02') };
}

/**
 * Dev49, the stations' schematics (mission 095; the owner, 2026-10-27:
 * "design some schematic displays in the LCARS style that would suit each
 * of the stations ... periodically, the schematic switches to a different
 * representation"; then, of dev48's OLYMPIC HYDRODYNAMIC OVERVIEW, "I'd
 * love to see schematics for all of them in that similar style that we
 * could bring up on the individual consoles"): one screen for each of the
 * bridge's stations, Central Control and the main viewscreen, each a
 * schematic browser turning through its station's designs, set a little
 * apart so they do not all turn at once, any overview brought up from its
 * sidebar. They read the world; nothing on them changes it.
 */
export const EXHIBITS: readonly PlantExhibit[] = STATION_NAMES.map(
  (station, i): PlantExhibit => ({
    title: station,
    reference: `${STATION_DUTY[station]} · ${STATION_DESIGNS[station].length} designs`,
    size: { w: SCREEN.w + 0.1, d: 0.06, h: SCREEN.h + 0.1, mount: 'wall' },
    build: (kit) =>
      createStationSchematic(kit, station, SCREEN, context, {
        offset: (i * 18) / STATION_NAMES.length,
        pixelsPerMetre: 540,
      }),
  }),
);

/** One tier round the walls at eye height, the room as big as it needs. */
export function layoutRoom(sizes: readonly ExhibitSize[]) {
  const layout = galleryWallLayout(sizes, { tiers: [1.55] });
  FINISH.titleCard.x = -layout.halfX + 0.17;
  FINISH.titleCard.y = 2.75;
  FINISH.titleCard.z = layout.halfZ - 1.1;
  return layout;
}
