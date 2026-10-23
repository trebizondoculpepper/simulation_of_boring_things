import type { PlantExhibit } from './exhibit';
import { ADOPTED_RULES } from '../../logic/port-graph-demo-routes';
import type { PlantRoomLayout } from '../../logic/plant-room-layout';
import { EXHIBITS, buildPlumbedServices, prepareRoom } from './port-graph-demo';

/**
 * Dev19c: Dev19 made end to end by every stage, the scorer last: of
 * twelve placement seeds, each sized, reserved, placed, plumbed and
 * scored, the best (`DEV19C_SEED`, `dev19-scoring.ts`), plumbed by the
 * adopted rules (the owner, 2026-10-23).
 */
export { EXHIBITS, prepareRoom };

export const PURPOSE =
  'Dev19 made by every stage, the scorer last: the best-scoring of twelve placements, plumbed by the adopted rules';

export const buildRoomServices = (
  kit: Parameters<PlantExhibit['build']>[0],
  layout: PlantRoomLayout,
) => buildPlumbedServices(kit, layout, ADOPTED_RULES);
