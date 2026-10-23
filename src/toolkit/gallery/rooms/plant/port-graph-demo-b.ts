import type { PlantExhibit } from './exhibit';
import { CODEX_RULES } from '../../logic/port-graph-demo-routes';
import type { PlantRoomLayout } from '../../logic/plant-room-layout';
import { EXHIBITS, buildPlumbedServices } from './port-graph-demo';

/**
 * Dev19b: Dev19's machines, laid out the same way, plumbed by Codex's
 * rules from its review of prompt 018 (`CODEX_RULES`), to compare with
 * Dev19's (the owner, 2026-10-23).
 */
export { EXHIBITS };

export const PURPOSE =
  "Dev19 plumbed by Codex's rules: non-return valves only where needed, an isolator for every powered device, and a fitting only where someone can stand to reach it";

export const buildRoomServices = (
  kit: Parameters<PlantExhibit['build']>[0],
  layout: PlantRoomLayout,
) => buildPlumbedServices(kit, layout, CODEX_RULES);
