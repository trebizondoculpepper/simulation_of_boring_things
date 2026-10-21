# Development Diary Entry - 2026-10-21

## Context

- **Date**: 2026-10-21 22:00 UTC
- **Branch**: main
- **Commit**: after 1bf1655
- **Contributors**: Claude Code + User (and a second session, whose door warning stickers and industrial access helper go in with this commit)

## Problem Statement

The owner re-ran the plant sizing against the version-one pools and asked whether there was room for everything. The L-shaped main corridor had about 54 m of frontage against roughly 94 m of rooms, so they asked for the corridor to become a square ring round the wet hall. They then asked for every room of the main plant as an empty shell, joined to the corridor, signed and with working doors, and for the requirements to be checked against the rooms as built.

## Our Approach

The corridor became a 28 m ring, 4 m wide, round a 20 m block holding the wet hall, giving 112 m of outside frontage. The rooms were packed along its four sides, each with its doors in the middle of its frontage. One generic shell (`shell-rooms.ts` for the plan, `views/shell-room.ts`, `rooms/shell-room.ts`) builds every new room from a specification. The door joints now allow several doorways between the same two rooms: they share one joint, whose frame is the doorway in use (`activeDoorway`, `pickDoorway`).

## Implementation

- **The ring** has the corridor's walkway lines, buffer rails, keep-clear hatching and services ceiling, with a hazard guard on each corner of the wet hall's block. Its doors are to:
  - the four pool plant rooms;
  - the boiler house, loading bay, switch room, air handling plant, control room and engineer's office;
  - the wet hall.
- **The wet hall** is half a storey down (1.75 m), so drainage falls to it. It has two entrances facing each other: a stair on the east, and on the west, by the loading bay, a trolley ramp at 1:12 in two flights down the west wall.
- **The chemical stores** open off opposite walls of the loading bay, never the corridor, so they share no wall or drain.
- **Every new room** has:
  - a services ceiling;
  - a title card;
  - the name of the room beyond over each door;
  - equipment doors with card readers;
  - warning stickers chosen for what is inside.
- **Plant room sizes:** a tiny size (5 m, one storey, entered on the level) for the footbath. The others are now small 8 m, medium 12 m and large 22 m.
- **The jacuzzi** became a packaged plant: the sizer's limit for a packaged set rose to 30 m³/h, and a wider Lidoluxe cabinet holds the set, the jet pump and the air blower, with JETS and AIR switches. The placeholder cabinet in the Olympic plant room went.
- **Also:**
  - The corridor's readers are wired.
  - Push plates open their doors.
  - A door is held open while someone stands in it, and never shuts a walker in.
  - The index is regrouped: pool rooms, plant rooms, development rooms, then abandoned concepts.

## Outcomes

- `plant-fit.test.ts` checks every built room against the sizing. It checks floor area (less the stair), the longest machine and the height, and fails if a room is ever too small.
- **The sizer's 12 m wet hall height** assumes gantries on three levels; on one level the hall needs only its machines' height.
- **The sizer's suggested plan is not binding.** Its plan is half as long again as it is wide; what binds is the longest machine with its clear space.
- **Rooms with no spare.** Eight main plant rooms are built at exactly the sizer's plan, with no allowance for pipe zones or wall-mounted panels.
- **Not walked in a browser.** The doorway hand-overs are covered by logic tests only.

## Next Steps

- A margin on the exactly-sized rooms for pipe zones along the walls.
- Bringing the old two-dock loading bay design (`src/scene/loading-bay.ts`) into the new loading bay, with working shutters and dock levellers.
