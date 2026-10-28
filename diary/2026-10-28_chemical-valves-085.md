# Development Diary Entry - 2026-10-28

## Context

- **Date**: 2026-10-28 03:20 UTC
- **Branch**: main
- **Commits**: 0064edc, 69574be, c27152e
- **Contributors**: Claude Code (overnight, unattended)

## Problem Statement

Tonight's audit of mission 085 (chemical distribution) found both chemical paths in the schematics end to end, but almost none of their valves in the enhanced network; the Olympic's chemical lines outside any schematic; and the loading bay's lines hand-laid. The task was to close those gaps in order: every chemical valve into the schematics, the Olympic's chemical lines into a schematic, and the loading bay's lines onto the plumber if it could be done safely.

## Our Approach

Follow the water circuits' pattern: valves are given fittings of the schematic, with role, normal position and operator; tags come from `model-valves.ts`; scenes only bind. Where a machine already drew its own valves (bulk tanks, transfer skids, selectors, the framed day tank), bind those to the model rather than drawing new ones; everywhere else set the valves in the runs with the inline placement the wet hall uses.

## Implementation

- `plumbing-expansion.ts`: several given fittings may share one place (a selector outlet's manual and actuated valves), set in order from the node outward; a given fitting at a port several links share is put on each, so the plumber sets it once on their common pipe (the transfer pump's suction off its header).
- `model-valves.ts`: non-return valves tagged (NRV); `keptBy: 'distribution'` for actuated valves the distribution drives; names unique per link; chemical media in descriptions.
- `schematic-parts.ts`, `back-room-schematics.ts`: the valves of the fill ports, bulk tanks, transfer pumps, selectors and day tanks. Ids are prefixed by room code because installed-valve ids must be unique across the building.
- `chemical-valves.ts`: each machine's model valves, the set the machines draw, and `distributionPaths`, which `stepDistribution` now uses so shut hand valves stop the transfer.
- `chemical-line-fittings.ts` (logic and view): run-mounted PVC-U ball and check valves, with a small hunk in `room-pipework.ts`.
- `olympic-chemical-schematic.ts`: the Olympic's chemical lines and valves; its annex and pipeline take them in.
- `loading-bay-plumbing.ts`: the hypochlorite delivery line and the mains routed by the voxel router; the acid riser by rule.

## Outcomes

- The plumber adds nothing in any chemical room; about 70 chemical valves are now in the model and tagged.
- Codes had to match the existing asset plates: the selectors are WH-XS1 and WH-XS2, the fill cabinet LB-CAB1.
- The voxel router's simple paths always rise above both ends, so a line between two sleeves at one height gets a dogleg; the mains' sleeves were set just under a router level (3.6 m, crossing at 3.8 m) to keep the rise small.
- The Olympic's dose-line valves first landed inside the dosing boards' footprints, and the room's reach test caught them; they now sit in front of the boards.

## Next Steps

- Corridor chemical runs from the schematics' boundary links, with shared wall sleeves (written in the prompt).
- A relief-valve fitting kind for the skids; the overfill stop and high-high switches; dosing stopping when a day tank's outlet is shut.
- The owner to decide on the footbath's acid day tank.
