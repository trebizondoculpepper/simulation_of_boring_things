/**
 * The pump pair's layout along its length (`createPumpPair`): the pumps
 * (1.9 m long) stand 0.45 m along; each one's discharge nozzle rises off
 * its volute's axis, 0.57 m back from the pump's middle; its strainer
 * stands with its outlet flange (0.36 m out) on the pump's suction flange
 * (0.05 m past the pump's end). Pure.
 */
export const PUMP_ALONG = 0.45;
export const PAIR_DISCHARGE_X = PUMP_ALONG - 1.9 / 2 + 0.38;
export const PAIR_STRAINER_X = PUMP_ALONG - 1.9 / 2 - 0.05 - 0.36;
