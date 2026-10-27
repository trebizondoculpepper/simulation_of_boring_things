import type { PlantExhibit } from './exhibit';
import { OVERVIEWS } from '../../logic/schematic-overviews';
import type { SchematicContext } from '../../logic/schematic-overviews';
import { galleryDesigns } from '../../logic/station-schematics';
import type { Design } from '../../logic/station-schematics';
import { plantReadingOf } from '../../logic/world-reading';
import {
  createSchematicSurface,
  designScreen,
} from '../../views/station-schematics';
import { roomWorld } from '../../../save/world-store';

/**
 * The schematics in the touch-screen galleries (the owner, 2026-10-27:
 * "add ALL the schematics ... to the LCARS gallery rooms", each
 * labelled): every hydrodynamic overview, every other design of the
 * bridge stations' screens, the rotator and the schematic browser, each
 * on a screen of its own, live from this tab's world (the dev rooms'
 * save slot, or `?slot=`).
 */

/** The world the screens read. */
export function schematicContext(): SchematicContext | null {
  if (typeof window === 'undefined') return null;
  const world = roomWorld().world.value;
  return { world, reading: plantReadingOf(world, 'pool_02') };
}

const SCREEN = { w: 1.6, h: 0.92 };
const size = {
  w: SCREEN.w + 0.1,
  d: 0.06,
  h: SCREEN.h + 0.1,
  mount: 'wall' as const,
};

const exhibit = (
  title: string,
  reference: string,
  designs: readonly Design[],
  mode: 'single' | 'rotator' | 'browser',
  code: string,
  offset = 0,
): PlantExhibit => ({
  title,
  reference,
  size,
  build: (kit) =>
    createSchematicSurface(
      kit,
      designScreen(designs, { mode, title, code, footer: reference, offset }),
      title,
      SCREEN,
      schematicContext,
      520,
    ),
});

const overviews: Design[] = OVERVIEWS.map((o) => ({
  kind: 'overview',
  overview: o.id,
}));

export const SCHEMATIC_EXHIBITS: readonly PlantExhibit[] = [
  ...OVERVIEWS.map((o, i) =>
    exhibit(
      o.title,
      `HYDRODYNAMIC OVERVIEW · ${o.room.replace(/_/g, ' ').toUpperCase()}'S MODEL, LIVE`,
      [overviews[i]],
      'single',
      o.code,
    ),
  ),
  ...galleryDesigns().map(({ design, stations }) =>
    exhibit(
      design.kind === 'overview' ? design.overview : design.title,
      `SCHEMATIC FOR ${stations.join(', ')}`,
      [design],
      'single',
      design.kind.toUpperCase().slice(0, 6),
    ),
  ),
  exhibit(
    'THE ROTATOR · EVERY OVERVIEW IN TURN',
    'A NEW OVERVIEW EVERY 18 SECONDS · TOUCH ITS FOOT FOR THE NEXT',
    overviews,
    'rotator',
    'ROT',
  ),
  exhibit(
    'THE SCHEMATIC BROWSER · EVERY SCHEMATIC',
    'TOUCH A NAME TO HOLD IT · CYCLE TO TURN AGAIN · MORE FOR THE NEXT PAGE',
    [...overviews, ...galleryDesigns().map((g) => g.design)],
    'browser',
    'BRWS',
    9,
  ),
];
