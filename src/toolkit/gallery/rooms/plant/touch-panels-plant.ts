import type { PlantExhibit } from './exhibit';
import type { ExhibitSize } from '../../logic/plant-room-layout';
import { galleryWallLayout } from '../../logic/gallery-walls';
import { PARODY_SPECS } from '../../logic/parody-specs';
import { createParodyPanel } from '../../views/parody-panel';
import { SCHEMATIC_EXHIBITS } from './schematic-gallery';
import {
  WASHING_PANEL,
  createOlympicFilterWashingPanel,
} from '../../views/olympic-filter-washing';
import { OLYMPIC_FILTER_WASHING } from '../../logic/olympic-filter-washing';
import { roomWorld } from '../../../save/world-store';
import { BOOT_ALL_PANEL, createBootAllPanel } from '../../views/boot-all-panel';

/** What this room is for, printed on its title card. */
export const PURPOSE =
  'Every control panel in the plant, reinterpreted as a 24th-century touch screen (mission 093), and every bridge schematic, live (mission 095)';

/** Dim and plain, so the screens glow; its title card small, over the door. */
export const FINISH = {
  wall: '#4f4c56',
  floor: '#34333a',
  titleCard: { x: 0, y: 0, z: 0, yaw: Math.PI / 2, scale: 0.45 },
};

/**
 * Dev48, the plant reimagined (mission 093; the owner, 2026-10-27: "ALL
 * the game's existing control panels reinterpreted in this style ...
 * some of them are going to be great, some of them will be terrible, but
 * the big joke is that we're rendering pool maintenance panels science
 * fiction style"): one touch screen for each of the game's panels, boards
 * and mimics (`parody-specs.ts`, which lists the inventory), the same
 * controls, lamps and read-outs grandly renamed, each running on its own
 * trial, never the world; hung in two tiers round all four walls. After
 * them, every schematic of the bridge's stations (mission 095), live.
 */
export const EXHIBITS: readonly PlantExhibit[] = [
  // BOOT ALL (the owner, 2026-10-27): the screens' boot, shown.
  {
    title: 'Display boot',
    reference:
      'BOOT ALL reboots every screen in the room, each a little after the last: black, the emblem, a fade, the interface drawing in; SKIP puts them on',
    size: {
      w: BOOT_ALL_PANEL.w + 0.1,
      d: 0.06,
      h: BOOT_ALL_PANEL.h + 0.1,
      mount: 'wall',
    },
    // First, so the screens built after it boot as the room is entered.
    build: (kit) => createBootAllPanel(kit, { onEntry: true }),
  },
  ...PARODY_SPECS.map((spec, i): PlantExhibit => {
    const { w = 1.6, h = 1.0 } = spec.size ?? {};
    return {
      title: spec.title,
      reference: `Parodies ${spec.original}`,
      size: { w: w + 0.2, d: 0.06, h: h + 0.1, mount: 'wall' },
      build: (kit) => createParodyPanel(kit, spec, i),
    };
  }),
  // The bridge's OLYMPIC FILTER WASHING page (mission 095), live: its
  // CLEAN NOW washes this tab's Olympic filters.
  {
    title: OLYMPIC_FILTER_WASHING.title,
    reference:
      'The Olympic’s five filters under the Lidoluxe Wash-O-Tron, live: DIRT %, state, bed pressure and flow, CLEAN NOW, RUN and HOLD',
    size: {
      w: WASHING_PANEL.w + 0.1,
      d: 0.06,
      h: WASHING_PANEL.h + 0.1,
      mount: 'wall',
    },
    build: (kit) => {
      const store = typeof window === 'undefined' ? null : roomWorld();
      return createOlympicFilterWashingPanel(kit, {
        world: () => store?.world.value ?? null,
        dispatch: (a) => store?.dispatch(a),
      });
    },
  },
  // The bridge stations' schematics (mission 095; the owner, 2026-10-27:
  // all of them in the gallery, each labelled), live from the world.
  ...SCHEMATIC_EXHIBITS,
];

/** Two tiers round four walls, the room as big as they need. */
export function layoutRoom(sizes: readonly ExhibitSize[]) {
  const layout = galleryWallLayout(sizes, { tiers: [1.25, 2.8] });
  // The title card over the door, near the west wall's south end.
  FINISH.titleCard.x = -layout.halfX + 0.17;
  FINISH.titleCard.y = 2.75;
  FINISH.titleCard.z = layout.halfZ - 1.1;
  return layout;
}
