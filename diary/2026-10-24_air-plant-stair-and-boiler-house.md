# Development Diary Entry - 2026-10-24

## Context
- **Date**: 2026-10-24, overnight, working unattended at the owner's request
- **Branch**: main
- **Commits**: 04f3bb6, b70bfb9 (air plant), faeed48 (boiler house); earlier the same session dc4c3c0, 4c737be, b9ea6d8, e26f39d, 2c099e8 and others
- **Contributors**: Claude Code + the owner

## Problem Statement

The owner liked the air handling plant's stacks of three units but found the stair to their gantries built wrong, and the room much too big. They asked for the stair on the outside of the three-storey structure, two flights going on in the same direction with a small landing at the middle floor, and the room made smaller. Then they asked for the boiler house to be re-planned and re-routed the same way, taking a best shot without them, and everything committed and pushed.

## Our Approach

For the air plant, the old stair was a switchback inside the gantries' own line, its first flight under the upper gantry. After one question (the stair along the stacks' front or off their end: the owner chose the front), it became a single straight run in a band of its own just outside the gantries: a flight to a landing beside the first gantry, a second straight on to a landing beside the second. The room was narrowed to its contents.

For the boiler house there was no complaint on record, so it was measured first. The clash checks passed; the waste was in the heating: about 94 m of LTHW flow and return in a 100 m² room, because the layout search had put the calorifier and the pressurisation unit in the far north corners, ten metres from the circulator and the low-loss header in the south.

## Implementation

- `air-plant.ts`: `gantries()` rewritten (flights and landings in their own band, the run's foot set back `STAIR_SET_BACK` from the door); `levelSolids` applies the solid under the first flight only to a walker on the floor, since a walker partway up it was being stopped by it (also true of the old stair).
- `views/air-plant.ts`: handrails on both sides of each flight; the stringers' (and rails') tilt sign was flipped, so they sloped down as the treads rose, as in the old stair.
- `shell-rooms.ts`: the air plant 9.5 × 25 m (from 17.5 × 28). `plant-fit.test.ts` exempts its floor plan from the sizing study's, which lays the units out flat; its own tests show the stacked layout fits.
- `air-plant.test.ts`: tests that the flights run outside the gantries with nothing over them, at a stair's pitch, that each landing meets its gantry without a rail between, that a walker climbs the whole stair with collisions checked every step, and that the foot is at least 4 m from the door.
- `room-equipment.ts`: the boiler house laid out by hand (`FIXED.boiler_house`): everything where the search had it but the calorifier (facing south, its coil toward the circulator) and the pressurisation unit (just north of it), now in the south-east. Wall-backed machines are marked with their walls, since `put` makes everything an island and their power feeds then dropped through the flues.

## Outcomes

- The air plant's stair can be climbed from floor to top gantry; nothing overhangs it; rails slope with it.
- The boiler house's heating flow and return are 80 m (from 94), with no clashes and every port connected; flues, gas and the calorifier's own water unchanged.
- Every check passed on each commit with only its own files on top of the last commit.
- The owner saw, before the last fixes, a structure over the stair blocking the climb; it matched the old stair's top landing and upper gantry extension, both gone, so it was most likely a page built before the change; to confirm after a full reload.

## Next Steps

- In the morning: reload, climb the air plant's stair, and look at the boiler house's south-east corner.
- The boiler house could be narrowed a little (its aisle is about 3 m) if the owner wants it tighter; and its LTHW system flow and return still cross over the door, as is usual in a plant room.
- The other editor's uncommitted work (the ideal foot spa, the Lounge routing, `footbathFilling`) is untouched.
