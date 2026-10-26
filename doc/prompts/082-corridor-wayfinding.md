# 082: Wayfinding signs at the main corridor's corners

Status: not started (written 2026-10-26 with the owner).

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first; its rules apply.

## The request

The owner, 2026-10-26: the big square main corridor is confusing; it is hard to remember what goes where. At the outside corners of the ring, put directional signs saying what lies each way: this way to the electrical switch room, the boiler house, plant room 3, plant room 4 and so on, listing what to expect in each direction, to help people find their way round the game.

## What there is now (checked 2026-10-26)

- **The corridor** (`src/toolkit/gallery/logic/main-corridor.ts`): a square ring, 28 m a side, 4 m wide, its north-west outside corner at the origin, x east, z south. `corridorWalls()` gives each of its eight walls (four outside, four inside round the wet hall) its line, extent and the way into the corridor. `CORRIDOR_DOORS` lists every room's doors by wall and distance along it: north, the Olympic plant room and the engineer's office; east, the air handling plant and the control room; south, the lounge plant room, the boiler house and the switch room; west, the loading bay and the footbath's and jacuzzi's plant rooms; the wet hall's two pairs in the inner east and inner west walls.
- **Room names** are in `DEV_ROOM_NAMES` (`src/toolkit/gallery/logic/dev-room-links.ts`): "ELECTRICAL SWITCH ROOM", "PLANT ROOM 3 – JACUZZI" and so on. Door signs use `signTo` (`src/toolkit/gallery/views/shell-room.ts`), which shortens the wet hall's.
- **What is on the walls already**: the A1 poster gallery and the fire points (`src/toolkit/gallery/logic/corridor-posters.ts`, `src/toolkit/gallery/views/corridor-posters.ts`, mounted from `src/toolkit/gallery/views/main-corridor.ts`), placed clear of the doors (1.55 m) and away from the corners; and the room door signs over each door.

## The signs

- **Where**: at each of the ring's four outside corners, one sign on each of the two outside walls that meet there, near the corner (about 0.9 m from it), at eye height (its middle about 1.75 m up), facing into the corridor; eight in all. Clear of the doors, posters and fire points; the placement logic checks it.
- **What each says**: an arrow pointing along its side of the ring, away from the corner (left or right as the reader faces the sign, worked out from the wall's facing and the direction of travel); under it, every room whose doors are on that side, its outside wall and the inside wall opposite, nearest first; then, smaller, "then:" and the rooms round the next corner. The wet hall listed once on each side it has a door.
- **Derived, never written by hand**: the lists come from `CORRIDOR_DOORS` and the corridor's walls, so they stay right when rooms move (the loading bay was widened in prompt 073 and its neighbours moved along).
- **What they look like**: a modern building wayfinding sign, a flat aluminium panel in a dark blue with white sans-serif lettering and a white arrow, about 0.6 m wide, its height fitting its list; the same style on all eight. Set decoration (signage, `decorativeKind`), so static.

## Build

1. Pure logic, tested beside it (`src/toolkit/gallery/logic/corridor-wayfinding.ts`): for each corner and wall, the sign's place, its arrow's direction and its two lists, from `CORRIDOR_DOORS` and `corridorWalls()`; its tests check every room appears on some sign, the order by distance, the arrow's side, and that no sign overlaps a door, a poster or a fire point.
2. The view (`src/toolkit/gallery/views/corridor-wayfinding.ts`), the sign drawn on a canvas, mounted from `main-corridor.ts` beside the posters.
3. Checked in the game at each corner, both ways round.

## Done when

- Eight signs, two at each outside corner, each pointing along its side and listing what lies that way and then round the next corner; derived from the corridor's door list; clear of everything else on the walls.
- Its tests pass; seen in the game; the five checks pass.
