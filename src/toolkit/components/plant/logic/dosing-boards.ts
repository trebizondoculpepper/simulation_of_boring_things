/**
 * Where each dosing board's own pipework meets the room's (the owner,
 * 2026-10-28: the pipes did not meet the boards): in the board's frame,
 * its middle, its back on the wall, +z out, metres; the same frame as its
 * machine ports (`machinePorts`). Its suction at its top edge, from its day
 * tank's line overhead; its dose low at its edge, beside its pumps'
 * shelf, high enough that its line crosses above the Olympic's dosing
 * spool (its top 0.91 m) to drop onto its quill. Pure.
 */
export const HYPO_PORTS = {
  supply: [0.3, 0.5, 0.15],
  dose: [0.56, -0.2, 0.15],
} as const;
export const ACID_PORTS = {
  supply: [0.15, 0.4, 0.175],
  dose: [0.3, -0.2, 0.175],
} as const;
