import type { PlantExhibit } from './exhibit';
import { EXHIBITS as PUMP_EXHIBITS } from './pumps';
import { EXHIBITS as BALANCE_EXHIBITS } from './balance';
import { EXHIBITS as CHEMICAL_EXHIBITS } from './chemicals';
import { EXHIBITS as DOSING_EXHIBITS } from './dosing';
import { EXHIBITS as BOILER_EXHIBITS } from './boiler';
import { EXHIBITS as AIR_EXHIBITS } from './air';
import { EXHIBITS as ELECTRICAL_EXHIBITS } from './electrical';
import { EXHIBITS as OZONE_EXHIBITS } from './ozone';

/**
 * The main plant room's density trial: one of each floor-standing
 * development model, as `src/rendering/plant-corridor-room.ts` sets them
 * out, besides the duty/standby pump set (`PUMP_SET`). The fit study
 * (`src/game/main-plant-fit.ts`) and its trial rooms use the same list.
 */
export const DENSITY_TRIAL: readonly PlantExhibit[] = [
  ...[1, 4, 5, 6, 7, 8].map((i) => PUMP_EXHIBITS[i]),
  ...BALANCE_EXHIBITS.slice(0, 4),
  ...CHEMICAL_EXHIBITS.slice(0, 4),
  ...DOSING_EXHIBITS.slice(0, 2),
  ...BOILER_EXHIBITS.slice(0, 6),
  ...AIR_EXHIBITS.slice(0, 3),
  ...ELECTRICAL_EXHIBITS.slice(0, 4),
  ...OZONE_EXHIBITS.slice(0, 5),
];

/** The duty/standby circulation pump set, built as a live pair (`createPumpPair`). */
export const PUMP_SET = PUMP_EXHIBITS[0];
