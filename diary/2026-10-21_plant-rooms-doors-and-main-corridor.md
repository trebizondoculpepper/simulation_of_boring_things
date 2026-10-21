# Development Diary Entry - 2026-10-21

## Context

- **Date**: 2026-10-21 22:30 UTC
- **Branch**: main
- **Commit**: after 5f139a6
- **Contributors**: Claude Code + User (and a second session working on the plant rooms' machinery and the pool halls in the same checkout)

## Problem Statement

The owner asked for the plant side of the version-one pools: a plant room for each pool hall, reached through a standard plant room door and joined seamlessly to its hall; the doors themselves as standard, working components; and an L-shaped main corridor off which every plant room opens, with the wet hall in the inside of the L.

## Our Approach

Each new space is a pure plan with its own tests (`plant-rooms.ts`, `main-corridor.ts`, `doorway.ts`) and a thin view. The rooms are separate scenes joined by the app's seen-through doorways (`door-joins.ts`), extended with a new kind of joint (`onOpen`) built only while its door is open and released once it shuts. Each doorway's two door frames are matched by a test that carries a walker through and back.

## Implementation

- **Doors**: the plant room door (an Ironside FD60 steel doorset on a sill above the deck's cove) and the equipment doors between plant rooms, both built from shared frame and furniture (`door-hardware.ts`); working card readers that beep when they go from red to green; a new maker, Ironside Doorsets.
- **Plant rooms**: three sizes (small 7 m, medium 10 m, large 20 m), two storeys, with a stair, studded rubber flooring, the corridors' sealed battens and a services ceiling, oriented with the pool door north and the main plant doors south. Each hall has its own plant room (`plant_pool_01` to `plant_pool_04`).
- **Main corridor**: an L of two 24 m legs, 4 m wide and 7 m tall, with walkway lines, keep-clear hatching, buffer rails, a corner guard and direction signs.
- **Climbing**: ladder climbing was added to the controls (look up or down and walk), though the small room's ladder was dropped for a stair at the owner's request.

## Outcomes

- **Bugs found by tests and reports**:
  - a doorway record copied instead of shared, so the corridor never handed over;
  - a doorway that counted as the plant floor, a storey down, lifting the walker's eye 3.5 m;
  - push plates that were not clickable;
  - doors that closed on a walker standing in them.

  Each now has a test.

- **Browser automation**: driving the game over the DevTools protocol did not move the walker (the headless page has no focus), so the doorway hand-overs are verified by logic tests rather than in a browser.

## Next Steps

- The wet hall, in the inside of the L, and its doors.
- Walking the doorways in a real browser to confirm the hand-overs and the readers' beeps.
