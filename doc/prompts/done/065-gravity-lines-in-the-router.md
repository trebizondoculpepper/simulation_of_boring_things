# 065: Gravity lines in the voxel router

Status: done 2026-10-26. `RouterLine.gravity` in `voxel-router.ts`: a gravity line whose end is not below its start is refused; its templates cross at its start's level or lower; its search takes no upward step; a finished route that rises anywhere is rejected (`neverRises`); its last drop into an upward-facing end (a tundish) is shortened to fit under its start. `jacuzzi-plumbing.ts` dropped `falling` and routes its gravity lines with the rest. The minimum fall (1:40) is still to come.

## The request

The owner, 2026-10-25: give the voxel router (`src/toolkit/components/core/logic/voxel-router.ts`) a basic understanding of gravity lines. Certain lines are tagged as gravity-fed; the router checks that their ends are plausible (the destination lower than the source) and finds them a route that only ever descends.

## Why now

Re-plumbing the jacuzzi plant room through the router (prompt 064, step 7) showed every gravity line (the spa's overflow, the tank's overflow, the drains to the gully) routed up before it came down. They are laid meanwhile by a rule of their own in `jacuzzi-plumbing.ts` (`falling`: out of the port, level across, straight down) and passed to the router as fixed runs.

## What to build

- **The tag:** `RouterLine` gains `gravity?: true`. Which lines are gravity lines comes from the model, not by hand: an overflow (its ports so named) or a line to a gully or drain, as `jacuzzi-plumbing.ts`'s `gravity` decides today; later a link's own property in the schematic.
- **Plausible ends:** a gravity line whose end is not below its start is refused with a problem naming it, never routed uphill.
- **Only descending:** the search never takes a step that rises; level steps are allowed (a real drain has a fall of 1:40 or so, which can come later as a minimum gradient option); vertical drops are preferred. With no such route, a problem names the line.
- **Then:** `jacuzzi-plumbing.ts` drops `falling` and routes its gravity lines like the rest.

## Tests

- A gravity line routed round an obstacle never rises (each point's height ≤ the one before).
- A gravity line whose end is above its start is refused with a problem.
- A non-gravity line between the same ends may still rise (unchanged behaviour).
- The jacuzzi plant room's gravity lines, routed by the router, never rise.
