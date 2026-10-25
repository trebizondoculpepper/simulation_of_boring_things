# Room layout progress

Claude (Opus 5.5, Claude Code), 2026-10-23. Progress on `doc/prompts/done/017-room-sizer-gantries-placement.md`.

## Steps

- **Step 1, reserved regions:** done. `src/toolkit/gallery/logic/room-regions.ts` reserves door approaches and, from two storeys up, a gantry and stair (BS EN ISO 14122-3 pitch, 1.1 m guard rails), with a walking floor and rails. `views/room-regions.ts` draws them.
- **Step 2, room sizer:** done. `room-sizer.ts`. It first estimates Dev19 at 11.5 × 11.5 m; placement in bands needed 30 % more, so the room came out at 13 × 13 × 8 m.
- **Step 3, placement:** done. `machine-placement.ts` places machines in bands round a ring walkway (or the walls only), with the owner's corner, wall and freestanding sites. It uses seeded annealing, about 0.5 s for Dev19.
- **Step 4, Dev19 runs the layers:** done, not checked by eye. `plant-room.ts` uses `layoutSizedPlantRoom` for Dev19.
- **Step 5, the plumber in Dev19:** not done. Dev19's pipes are still routed by the old lanes.
- **Step 6, other rooms:** not started; waits for the owner.

## Dev19 before and after

|                                        | Before (eb75ba5) | After                                |
| -------------------------------------- | ---------------- | ------------------------------------ |
| Room                                   | 20 × 20 × 4 m    | 13 × 13 × 8 m, with gantry and stair |
| Weighted link length, centre to centre | 399 m            | about 250 m                          |
| Pipe and conduit runs                  | 33               | 33                                   |
| Total run length                       | 943 m            | 673 m                                |
| Clashes (old router)                   | 231              | 204                                  |
| Runs entering a reserved region        | n/a              | 0                                    |
| Placement rules broken                 | n/a              | 0                                    |
