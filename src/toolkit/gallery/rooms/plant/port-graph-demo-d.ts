import type { PlantExhibit } from './exhibit';
import { ADOPTED_RULES } from '../../logic/port-graph-demo-routes';
import type { PlantRoomLayout } from '../../logic/plant-room-layout';
import { DEV19D_MODEL } from '../../../../game/plant/demo-variants';
import {
  buildPlumbedServices,
  exhibitsFor,
  prepareRoomWith,
} from './port-graph-demo';

/**
 * Dev19d: Dev19's plant with three sand filters in parallel (the owner,
 * 2026-10-23), made by every stage: the filters pre-assembled into
 * candidate blocks, placed, plumbed by the adopted rules, and run.
 */
export const EXHIBITS: readonly PlantExhibit[] = exhibitsFor(DEV19D_MODEL);

export const PURPOSE =
  'Dev19 with three sand filters in parallel: pre-assembled into blocks, placed by the process rules, plumbed and run';

export const prepareRoom = (layout: PlantRoomLayout) =>
  prepareRoomWith(layout, ADOPTED_RULES, DEV19D_MODEL);

export const buildRoomServices = (
  kit: Parameters<PlantExhibit['build']>[0],
  layout: PlantRoomLayout,
) => buildPlumbedServices(kit, layout, ADOPTED_RULES, DEV19D_MODEL);
