import type { PlantExhibit } from './exhibit';
import { CODEX_RULES } from '../../logic/port-graph-demo-routes';
import type { PlantRoomLayout } from '../../logic/plant-room-layout';
import {
  EXHIBITS,
  buildPlumbedServices,
  prepareRoomWith,
} from './port-graph-demo';

/**
 * Dev19b: Dev19's machines, laid out the same way, plumbed by Codex's
 * rules from its review of prompt 018 (`CODEX_RULES`) on the old overhead
 * lanes, to compare with Dev19, which adopted those rules and leaves each
 * machine on a reachable straight for its fittings (the owner, 2026-10-23).
 */
export { EXHIBITS };

export const PURPOSE =
  "Dev19 plumbed by Codex's rules on the old lanes, straight up from each port: a fitting only where someone can stand to reach it, so several are left out";

export const buildRoomServices = (
  kit: Parameters<PlantExhibit['build']>[0],
  layout: PlantRoomLayout,
) => buildPlumbedServices(kit, layout, CODEX_RULES);

export const prepareRoom = (layout: PlantRoomLayout) =>
  prepareRoomWith(layout, CODEX_RULES);
