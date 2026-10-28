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
