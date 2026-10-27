# Development Diary Entry - 2026-10-27

## Context

| Time      | Branch | Commit  | Task                                                              |
| --------- | ------ | ------- | ----------------------------------------------------------------- |
| 16:08 UTC | main   | 11fec47 | Mission 092 stage 0: the control room's walkable prototype, dev45 |

## Problem Statement

The owner wants the main control room to be dramatically different: entered from the corridor straight up an 8 m stair into a flattened seven-sided room, a heptagonal operator's desk in the middle, consoles of every era on every wall. Stage 0 of mission 092 was to prototype the room, stair and all, in a new dev room before anything else is built. While the work was under way the owner's direction grew in steps: a chosen plan (layout E: one open space, the stair off centre on the left, a raised conference stage at the back, displays on every wall), then a third bigger with a Strangelove ring light over the operator in a Bond-villain finish, then bigger again (28 × 22 m, 9 m high, "big and grandiose and inappropriate"), the desk after EPCOT Computer Central, the rear section after the Enterprise bridge of The Next Generation, and finally stations for each pool system in a flat touch-panel style.

## Our Approach

Geometry first, pure and tested: `src/toolkit/gallery/logic/control-room-prototype.ts` holds the heptagon (from fractions of its big wall and depth, so the repeated rescaling was a change of constants), the desk (the room's shape scaled, inset for its top, the back two sides open), the stair (Approved Document K: 46 risers of 174 mm, goings of 250 mm, flights of 16, 15 and 15, a switchback in two lanes with landings across both), the stage and its steps, and the walking rules (the floor under a walker, what stops them at each height). The stair reuses the stair helper's `Surface` model and `surfaceFloorAt` from `stair-run.ts`; angled walls are solid as short boxes along each side, as the round pink room does. The scene reuses the shell rooms' runner (`runShell`, now exported from `rooms/shell-room.ts`) for the walker, the post-processing and the inspector, so dev45 walks like every shell room.

## Implementation

New: `logic/control-room-prototype.ts` and its test, `views/control-room-prototype.ts` (the drawing), `rooms/control-room-prototype.ts` (the starter). Changed: `dev-room-links.ts` (dev45, its name and colour), `main.ts` (its starter), `shell-room.ts` (`runShell` and `ShellConfig` exported). The only headroom question was the slab over the stair: only the third flight needs the opening above it; the landings and the second flight keep 2.3 m under the slab, so the opening in the room's floor is one flight wide and one long, a neat glass-guarded slot. The desk is drawn as solids on quadrilaterals with their own corner heights (a helper builds a hexahedron and orients its faces outward), so segments meet seamlessly at the heptagon's corners. Every object is marked decorative.

## Outcomes

- The walk from the door up the three flights, round the opening, across the room and up the stage's steps to the table is a test, stepping 5 cm at a time and checking no solid is met and no step is too high.
- The glossy dark floor and walls read as near black without an environment map; the lighting was raised twice and the arrival view is still dim. The arrival point's view of the big wall is dominated by the 20 m display placeholder.
- The owner's references arrived mid-build; the logic's constants absorbed each rescale without changing its structure.

## Next Steps

- The six stations (circulation and filtration, chemical dosing, heating, air handling, power, building) round the desk, as flat sloping touch-panel placeholders.
- Brighter, warmer arrival; the curved TNG-style rail round the stage, if the owner wants the stage's front curved.
- Then stage 1: the design note in `doc/design/control-interface-archetypes.md`.
