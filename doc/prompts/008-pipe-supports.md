# Prompt: every pipe supported, by the pipe helper

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first; its rules apply. This prompt asks you to make pipe and conduit supports the pipe helper's job, so that no pipe in the game hangs in mid-air.

## The problem

Horizontal runs of pipe and conduit often span several metres with nothing holding them up. A real pipe that long sags between its fixings, and a full one would pull itself off them. Every run needs supports at a spacing set by its material and size, each support carried to the building's structure (the ceiling soffit, a wall or the floor), and fixed to it.

Today:

- **The helper is too narrow.** `src/toolkit/components/plant/views/pipe-supports.ts` (`hangerPoints`, `supportPipe`) hangs level runs every 1.5 m from a drop rod, or stands low ones on floor posts. One spacing serves every material and size.
- **Supports are skipped silently.** It skips a support whenever its rod would not fit (`if (ceilingY <= top) continue`) or the run is under 0.6 m, so gaps go unnoticed. The rod ends at whatever `ceilingY` it is given, with no fixing.
- **It is opt-in.** Only `src/toolkit/gallery/views/room-pipework.ts` and `src/toolkit/gallery/views/cabinet-services.ts` call it. Every other caller of `createPipe` (`src/toolkit/components/core/views/pipe-kinds.ts`) draws pipe with no supports at all:
  - `src/toolkit/gallery/views/room-services.ts`, the rooms' electrical conduits;
  - `src/toolkit/gallery/views/pipes-n-dreams.ts`;
  - `src/toolkit/gallery/rooms/plant/pumps.ts`;
  - `src/toolkit/gallery/rooms/plant/spa-pack.ts`.
- **Some known cases:**
  - the footbath's make-up main runs 4 m overhead at 3.4 m with no support (`cabinet-pipes.ts`, `MAKE_UP_LEVEL`);
  - the rooms' distribution conduits run round every wall unsupported;
  - long heating and pool-water mains cross the plant rooms.

## What real practice is

Support spacing depends on the material and the bore, and is closer for plastic than metal. The UK figures below are commonly published and should be checked against their sources before they are fixed in code. Treat them as the starting table, kept in one place.

| Material (what the game draws)                    | Size        | Horizontal                                        | Vertical               |
| ------------------------------------------------- | ----------- | ------------------------------------------------- | ---------------------- |
| Copper (`copper`)                                 | 15 mm       | 1.2 m                                             | 1.8 m                  |
|                                                   | 22–28 mm    | 1.8 m                                             | 2.4 m                  |
|                                                   | 35–54 mm    | 2.4–2.7 m                                         | 3.0 m                  |
| Steel, screwed (`steel-screwed`, heating, gas)    | DN15        | 1.8 m                                             | 2.4 m                  |
|                                                   | DN20–25     | 2.4 m                                             | 3.0 m                  |
|                                                   | DN50        | 3.0 m                                             | 3.6 m                  |
|                                                   | DN100       | 3.9 m                                             | 4.5 m                  |
| PVC-U / ABS pressure (`pvc-pressure`, pool water) | 20–50 mm    | 0.6–1.0 m                                         | about twice horizontal |
|                                                   | 75–160 mm   | 1.2–1.6 m                                         |                        |
|                                                   |             | closer still when hot, or per the maker's table   |                        |
| PVC-U drainage (`pvc-drain`)                      | 40–110 mm   | 0.5–1.1 m                                         | 1.2–2.0 m              |
| Steel conduit (BS 7671 On-Site Guide)             | up to 16 mm | 0.75 m                                            | 1.0 m                  |
|                                                   | 16–25 mm    | 1.75 m                                            | 2.0 m                  |
|                                                   | 25–40 mm    | 2.0 m                                             | 2.25 m                 |
| Rigid PVC conduit                                 | up to 16 mm | 0.75 m                                            | 1.0 m                  |
|                                                   | 16–25 mm    | 1.5 m                                             | 1.75 m                 |
|                                                   | 25–40 mm    | 1.75 m                                            | 2.0 m                  |
| Chemical and sample tube (`chemical-tube`)        |             | clipped every 0.3–0.5 m, along a wall or tray     |                        |
| Lagged heating (`lagged-heating`)                 |             | by the steel inside, the hanger round the lagging |                        |

Other practice to follow:

- **A support within about 300 mm of every bend, tee and valve,** and a heavy valve or fitting supported on its own, so its weight does not hang on the pipe.
- **Overhead:** a split-ring or clevis hanger round the pipe (round its lagging, if lagged), on threaded drop rod (M8 or M10), to a fixing in the soffit: a ceiling plate or a channel with an anchor. Several runs side by side share a trapeze: a length of channel strut on two rods.
- **Along a wall:** brackets or saddles fixed to the wall (conduit on spacer-bar saddles), not rods from the ceiling.
- **Low down:** pipe stands from the floor, as now.
- **Vertical runs:** wall clamps at the vertical spacing.

A 20 cm spacing would be far too close for anything but small plastic tube; a span is judged against the table, not one figure.

## What to build

1. **One support table** in pure logic (for example `src/toolkit/components/plant/logic/pipe-supports.ts`, tested): the maximum horizontal and vertical spacing for each pipe kind and size, and the near-fitting distance (300 mm).
2. **A pure support planner:** given a run's points, its kind and outside diameter (and lagging), and the room around it (the soffit's height, the floor's, its walls' faces, and anything a rod must not pass through), it returns a list of supports, each with:
   - its type: hanger and rod, trapeze, wall bracket, wall clamp or floor stand;
   - the point on the pipe;
   - the point where it meets the structure.

   Rules:
   - supports go at most one spacing apart on every horizontal length, and at the vertical spacing on risers;
   - one goes within 300 mm of every bend, tee and valve;
   - a run within about 0.3 m of a wall is bracketed to the wall, out in the room it is hung from the soffit, and low down it stands on the floor;
   - parallel runs close together share a trapeze.
   - It **never silently skips**: if no support can be placed, it says so, and a test fails.

3. **Supports drawn by the pipe helper itself,** so supporting is not opt-in:
   - `createPipe` (or a single new entry point that every caller uses) takes the room's structure and draws the run's supports with it;
   - the rods reach the real soffit, the roof slab above the services ceiling (`CEILING_ZONE` in `room-pipes.ts`), not a floating height, and end in a ceiling plate and anchor;
   - wall brackets have a base plate on the wall;
   - many supports are drawn as instanced meshes, so a plant room's hundreds of hangers stay cheap.
4. **Every caller moved onto it:** the room pipework, cabinet services, room services (conduits), the dev exhibits that draw pipe, and the make-up main. Remove the old opt-in `supportPipe` calls once covered.

## Tests (the acceptance)

Pure-logic tests, across every room that draws pipe (`ROOM_SERVICES`, the plant rooms, the cabinet rooms):

- **Spacing:** no horizontal length of any run goes longer than its kind's spacing between supports (or between a support and a run's end at a fitting or port), and every bend, tee and valve has a support within 300 mm. Do the same for risers at the vertical spacing.
- **Structure:** every support ends on structure (the soffit, a wall face or the floor), and its rod does not pass through another run, a machine's box, or a doorway's clear height.
- **Type:** a run along a wall is bracketed to it; one out in the room is hung; one low down stands.
- **No silent skip:** the planner reports every span it could not support, and the test expects none.
- **The table:** each kind and size has a spacing, and plastic is closer than metal of the same bore.

Then render a plant room (`?room=plant_pool_02`), a cabinet room (`?room=plant_pool_04`) and the control room (`?room=control_room`), and check by eye that every run is visibly held up.

## Rules for this work

- Follow `CLAUDE.md`. Engineering items are real products: supports are made after real hangers and channel strut, with a maker from `brands.ts` where one would be visible.
- Before every commit run `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` and `npm run build`, and commit only when all pass.
- **Another agent works in this same checkout.** Commit only the files you changed, naming them in `git add`, never `git add -A`. Leave others' uncommitted files alone. If a file you need has someone else's uncommitted changes (at the time of writing, `room-pipework.ts` does), stop and say so rather than editing over them.
- Add the change to `CHANGELOG.md` under Unreleased, and write a diary entry.
- Markdown is one paragraph per line, never hard-wrapped.

## Return path

Commit each step as `supports(<step>): <what changed>` and push; if the push fails because `main` moved, rebase and push again, never force-push. When done, or if you stop, write `doc/reports/pipe-supports-progress.md`. Start with a line naming yourself (model and tool) and the UTC date. Then give each step 1–4 and each test a line: done, partly done or not done, with commit hashes. Finish with any figure from the table you corrected, and its source. Commit it as `report(supports): <summary>`.
