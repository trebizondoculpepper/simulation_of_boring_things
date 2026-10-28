# 107-1: the ring shell, a museum you can walk round

Status: written 2026-10-28 (the owner: "Do we have a mission to build the museum layout, one that I can walk through? Also, keep an empty hall, corner and side as a component"). This is stage 8 of [107](107-pool-science-museum.md), given its own prompt. Not started.

You are working on "The Pool", a browser game in TypeScript and Three.js (this repository). Read `CLAUDE.md` first and follow it, then [107](107-pool-science-museum.md) ("The new layout", "The architecture", "Safety and services") and [107-0](107-0-exhibit-groundwork.md).

## The goal

Rebuild the stage 1 shell (five halls in a pinwheel, Hall 0 outside on the street) as the owner's ring: 14 rooms round a courtyard two rooms wide and three deep, the building four rooms east–west by five north–south, Hall 0 in the south-west corner. The visitor starts in Hall 0, follows the floor arrows north into Hall 1, and can walk the whole ring (Halls 1 to 13) back into Hall 0 without a break. The test is that walk.

- Rooms `museum0` to `museum13`, each its own room and scene, joined by archways in the shared brick walls, the hand-over the pool loop's way (`door-joins.ts`), as stage 1 already does.
- Halls 1 to 4 and 13 keep their themes' signage; Halls 5 to 12 are empty and signed "coming soon" with their theme where the owner has given one (rule 3: halls start empty).
- The courtyard (paving, trees, pond and fountain) seen through every inner hall's courtyard windows, as now; the street windows on the outer walls.
- The safety and services layer carried over (exit signs to Hall 0 the shorter way round, call points, extinguishers, emergency lighting, notices), recomputed for the ring.
- The groundwork's hook (107-0) finds halls by number, never coordinates, so exhibits built in today's halls move across unchanged.

## The empty hall: a component, and what is drawn beyond the next room (the owner, 2026-10-28)

"The halls adjacent to the one we are in should be rendered, but anything more distant should be rendered as a completely empty space (no decorations)."

There are three hall shapes on the ring, and each is a reusable component with no exhibit and no decoration:

- **Empty side hall:** a straight hall on a side of the ring, archways at both ends (in line).
- **Empty corner hall:** a corner of the ring, archways on two adjacent walls (the route turns 90°).
- **Empty hall (generic):** the bare shell with any set of archways, from which the other two are built; also Hall 0's shape, which has its own doorway layout.

Each is only the architecture: floor, walls with their archway and window openings, ceiling, and a flat light. There are no signs, lighting tracks, services ceiling, safety layer, benches or exhibits. It is cheap: geometry merged by material, one draw call per material, no shadows.

What is drawn, from the hall the visitor is in:

- **This hall:** in full.
- **The halls next to it on the ring** (its archway neighbours): in full, decorations, signage and exhibits included, so that looking through an archway shows the real room.
- **Every hall further away:** as its empty component only, at its true place and size, so a view through two archways in line (down a side of the ring) carries on into plain, empty space with no decorations. If an exhibit or sign is ever seen two halls away, that is a bug.

So a hall must be buildable at two levels: the full room, and its empty shell. The full room is the empty component plus its dressing and its exhibit. When the visitor crosses into the next hall, the level of detail moves one step along the ring: the new neighbour is promoted to full and the one left behind is demoted to empty (built lazily, released when it is no longer a neighbour, as the lazy joints do today). This replaces stage 1's "plain stand-in of the room beyond (white plaster)" with the true empty component, and lifts the one-room-beyond limit only as far as the empty shells.

Pure logic, tested beside it (`src/toolkit/gallery/logic/museum-ring.ts` or within `museum-plan.ts`): the ring's adjacency; for any hall, which halls are full and which empty; each empty hall's kind (side or corner) and its archways; and that the room the visitor is in and its neighbours are always full.

## The plan and the test

- `museum-plan.ts`: the ring's rooms, numbers, positions, archways and kinds (side, corner, Hall 0), with `MUSEUM_SQUARE`'s constants resized for a 4 × 5 ring (provisional, the owner's question 8 in 107).
- Tests (logic): the ring tiles the rectangle less the courtyard with no overlap; 14 rooms, the corners counted once; the route's joins round the ring both ways, 90° at every corner, back into Hall 0; each archway's two frames meeting; `throughDoor` and the hand-over as stage 1's tests; the full/empty sets for every hall; windows onto the courtyard and the street as now.
- Browser: walk the ring from `?room=museum0`, on high, medium and low; look down a side through two archways and see the third hall empty; frame times recorded in this prompt; screenshots and camera links for the owner.
- Budgets: the empty components across the ring cost no more than a few draw calls each; measured with the room's frame time against stage 1's figures (51 fps high, 119 low through an archway).

## Size and order

Large. After 107-0 (so exhibits are found by number), before 107e (so the finale is laid out in Hall 13). Independent of 107a to 107d.

## Built (2026-10-28)

**The owner's ruling on the layout, during the build (2026-10-28), overriding the 4 × 5 ring above:** "we also need the 4x3 room layout, 4 rooms on the long side, 3 on the short, and I thought room 0 was going to be in one corner." So the ring is 4 rooms east–west by 3 north–south: 10 rooms round a courtyard 2 rooms wide by 1 deep. Hall 0 in the south-west corner; north into Hall 1 (west side), Hall 2 the north-west corner, east through 3 and 4, Hall 5 the north-east corner, south to Hall 6, Hall 7 the south-east corner, west through 8 and 9, and from Hall 9 back into Hall 0. Rooms `museum0` to `museum9`. Hall 1 Warm water, 2 Clean water, 3 Safe water, 4 The chemistry of pools, 9 The whole plant (the finale, `FINALE`); Halls 5 to 8 "coming soon". Corners 0, 2, 5 and 7. (Built first as the 4 × 5 ring of 14, which passed the full suite, then cut down; everything below is the 4 × 3 ring.)

**The owner's ruling, folded in during the build (2026-10-28):** "Can you change the windows on the inside so the courtyard is not visible. The rooms on both sides should be the same height. Only the skybox is visible." Every hall, Hall 0 included, is now 9.5 m to its ceiling (`MUSEUM_HALL0.h = MUSEUM_SQUARE.h`); the courtyard windows are clerestories, sill 2.6 m (`WINDOW.courtSill`), and through them only a sky box is drawn. The paving, trees, pond, fountain and the far halls' courtyard walls are gone. The street windows are unchanged.

- **The plan** (`src/toolkit/gallery/logic/museum-plan.ts`): `MUSEUM_SQUARE = { cols: 4, rows: 3, cellW: 16, cellD: 14, h: 9.5 }` (provisional; 16 × 14 keeps stage 1's Hall 0, its painted pool and its fittings unchanged), the building 64 × 42 m, the courtyard 32 × 14 m. Rooms `museum0` … `museum9` round the ring (`CELLS`), found by number (`hallNumber`, `hallId`), never by coordinates. `MUSEUM_JOINS` is the ring, Hall 9 into Hall 0; Hall 0's two openings (north to Hall 1, east from Hall 9) are square-headed doorways, the rest archways. `HALL_HEADING` is the way each hall is left, so a corner hall runs along its way out. `hallKind` gives welcome, side or corner. Street windows: one either side of the hall's title (`HALL_TITLE`, now 6 × 2 m so they fit a 14 or 16 m wall), none on Hall 9's street wall (kept whole for its closing words). Ring logic: `ringDistance`, `ringNeighbours`, `hallDetail`, `detailSets`, `ringSide`, `emptyHallShape`.
- **The signs**: `HALL_BRIEFS` re-signed to the new order (1 Warm water, 2 Clean water, 3 Safe water, 4 The chemistry of pools, 9 The whole plant; 5 to 8 "Coming soon", `themed: false`); archway headers (from Hall 0, "THROUGH HERE" north and "THE ROUTE ENDS HERE · The whole plant" east; into Hall 0 from Hall 9, "THE WAY OUT · BACK TO THE Welcome hall"); the route strip names the themed halls and numbers the rest; Hall 9's end wall carries the owner's closing message; two orange arrows painted on Hall 0's deck point north to Hall 1. This overlaps 107-0's step 1 (re-signing), done here because the shell needed the new numbers; 107-0's other steps are untouched.
- **The safety layer** (`museum-safety.ts`): `EXIT_WAY` computed, the shorter way to Hall 0 (Hall 5, as far either way, goes back by 4); fire points in the odd halls; the lift's reserved place moved along Hall 0's east wall to `along: 4.4` (beside the new doorway from Hall 9, which took the wall's middle), a conservative choice the owner may want to revisit; one Hall 0 sprinkler moved out of the lift's place.
- **The empty hall** (`src/toolkit/gallery/views/museum-empty-hall.ts`): `createEmptyHall` (generic, any hall or several, merged by material: paint, bare brick, tile, concrete, deck, ceiling, glass, one draw call each), `createEmptySideHall`, `createEmptyCornerHall`; floor, walls with their openings from the same `wallRun` as the full hall, a plain faintly glowing ceiling, glowing panes in every window; no signs, tracks, services, safety layer, benches or exhibits.
- **Level of detail** (`createRingShells`, used by `museum-hall-room.ts`): each hall's scene holds every other hall as its empty component, in four merged groups (each neighbour; the halls beyond each). While a neighbour's full room is drawn through its archway (`door-joins.ts`), that neighbour's empty hall and the halls beyond it switch to a depth-only material, hiding what is behind them but drawing nothing, so the full room shows through and carries on with its own empty halls beyond. So looking down a side through two archways, the third hall is empty. Every wall is built once (a wall shared with the visitor's hall by that hall, else by the nearer hall). Full rooms are built and released by the lazy joints as before, so the neighbours are promoted and demoted as the visitor crosses.
- **Tests**: `museum-plan.test.ts` (10 rooms, numbering, tiling the building less the courtyard with no overlap, the corners, joins both ways round the ring, 90° in every corner and straight through every side hall, archway frames meeting, `throughDoor` both ways, the hand-over, the stop, clear ways in, windows, the archway seen, full/empty sets and ring sides for every hall, each empty hall's kind and archways); `museum-safety.test.ts` updated.

**Deviations.** (1) `src/main.ts` draws one room beyond at a time, so the neighbour the visitor is looking away from shows as its empty hall in its archway (the one looked at, or walked into, is always full); drawing both full at once would need a second under-canvas, not attempted. (2) The courtyard windows show the sky through a stencil (one draw call: the windows' mask and a sky box drawn over whatever lies beyond); the courtyard's own geometry and its stencilled walls are gone, but a stencil remains, since without it the empty halls across the courtyard would show through the glass. (3) Hall 0's empty component is tiled with a plain deck, without the painted pool.

**Browser check: not done.** The connected Chrome could not reach this machine's dev server (an error page on localhost, 127.0.0.1 and [::1]), so the walk round the ring, the frame times on high, medium and low and the camera links are still to do. To check: `?room=museum0`, walk north through Halls 1 to 9 and back into Hall 0; from `?room=museum1&x=0&y=1.6&z=5&yaw=0&pitch=2` (Hall 1 looking north) Hall 2 should be full and Hall 3 (round the corner) empty; from `?room=museum3` looking east, Hall 4 full and Hall 5 empty; compare frame times with stage 1's (51 fps high, 119 low).

## Neighbours in full, the fade, and Hall 0 tiled (2026-10-28)

**The owner's requests:** "only the rooms adjacent to the room we're in render", anything further seen as the empty model; "make the welcome hall look like a pool room with a tiled floor and wall"; "include the floor in the simplified version of room 0"; a glossy lifebuoy sticker on Hall 0's wall, 1 mm proud and drawn after the tiles; and the change from empty to full "fades in as you cross the threshold ... fully rendered when you have walked 1 m into the room, but it fades out as you walk back".

- **Both neighbours full** (fixing deviation 1 above): each hall's scene now builds a full copy of each of its two neighbours at its true place (`museum-hall-room.ts`). `neighbourDraw` (logic) decides per neighbour: `under` (its own room drawn through the archway looked at, as before), `full` (the copy), or `empty` (when this scene is itself drawn under the visitor's hall, `peek`, so its far neighbour is two away). `ringView` composes the two scenes; tested for every hall and every archway: the visitor's hall and both neighbours full, the rest empty. Cost: three full halls per scene (nine with the prebuilt neighbours), so building a hall takes longer; the copies are lit by the visitor's hall's lamps, not their own (their lamps would light this hall through the walls), so a copy is a little dimmer than the true room that replaces it when looked at.
- **The fade** (`neighbourFade`, logic, tested): a copy's fraction is the walker's depth into the hall past the archway from its other neighbour, over 1 m, stepped to twentieths; materials are made see-through only while fading and touched only when the step changes; the empty hall stays drawn underneath until the copy is fully in, so the architecture never fades. A true cross-fade of the room drawn under was not attempted: at the threshold the neighbour beyond is empty from either side, so the fade starts from what the visitor already saw.
- **Hall 0 tiled** (`hall0TrimGeometry`, `insideFaceRuns` in logic, tested): bands of coloured tiles (`HALL0_BANDS`) at 1.2 m, 1.4 m and 6.4 m, broken at doorways and windows; a 0.25 m tiled cove at every wall foot (broken at the doorways) and up every corner. Its deck was already tiled round the painted pool, its walls and ceiling tiled.
- **Lifebuoy sticker** (`LIFEBUOY_STICKER`): 0.75 m, on the west wall 2.5 m north of its middle at 1.95 m, 1 mm proud, glossy, renderOrder 1 and a negative polygon offset; set decoration.
- **Hall 0's empty model**: the same bands, cove and sticker (one quad), and its floor the full hall's painted floor (the same painting at 40 px/m).

**Browser check: not done.** The connected Chrome again showed an error page for the dev server on 127.0.0.1.
