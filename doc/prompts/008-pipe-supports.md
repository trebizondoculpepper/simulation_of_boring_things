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

Support spacing depends on the material, the bore and, for plastic, the temperature: the closer for plastic, for small bores and for hot water. A 20 cm spacing would be far too close for anything but small plastic tube; a span is judged against a table, not one figure. Researched 2026-10-22; the sources are listed at the end, and the figures marked _check_ should be confirmed against the source named before they are fixed in code. Keep the table in one place.

| What the game draws                               | Size            | Horizontal                                                | Vertical               | Source                                                                            |
| ------------------------------------------------- | --------------- | --------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------- |
| Copper (`copper`)                                 | 15 and 22 mm    | 1.2 m                                                     | 1.8 m                  | UK Copper Board guidance, as quoted by UK trade guides                            |
|                                                   | 28 mm           | 1.8 m                                                     | 2.4 m                  | _check_: Lawton Tubes' fixing data sheet                                          |
|                                                   | 35–54 mm        | 2.4–2.7 m                                                 | 3.0 m                  | _check_: Lawton Tubes                                                             |
| Steel, screwed (`steel-screwed`, heating, gas)    | 15 mm OD        | 1.5 m                                                     | 1.8 m                  | Engineering ToolBox's metric table                                                |
|                                                   | 25–50 mm OD     | 2.4 m                                                     | 3.0 m                  | Engineering ToolBox                                                               |
|                                                   | 100 mm OD       | 3.0 m                                                     | 3.6 m                  | Engineering ToolBox; _check_ against BESA's guidance (TG14), which may allow more |
| PVC-U / ABS pressure (`pvc-pressure`, pool water) | DN100 at 20 °C  | 1.5 m                                                     | 3.0 m                  | Vinidex (AS/NZS 2032 basis)                                                       |
|                                                   | 110 mm at 20 °C | about 2.0 m                                               |                        | Plastic Pipe Shop's table (by size and temperature)                               |
|                                                   | smaller bores   | pro rata, closer                                          | about twice horizontal |                                                                                   |
|                                                   | warm water      | horizontal spacing less 25 % for every 10 °C above 20 °C  |                        | Vinidex. Pool water runs at 28–37 °C, so take about 75–60 % of the 20 °C figure.  |
| PVC-U drainage (`pvc-drain`)                      | 40–110 mm       | 0.5–1.1 m                                                 | 1.2–2.0 m              | _check_: the maker's soil and waste guide                                         |
| Steel conduit (IET On-Site Guide, Table 4.12)     | up to 16 mm     | 0.75 m                                                    | 1.0 m                  | On-Site Guide, reproduced by TLC Direct                                           |
|                                                   | 16–25 mm        | 1.75 m                                                    | 2.0 m                  |                                                                                   |
|                                                   | 25–40 mm        | 2.0 m                                                     | 2.25 m                 |                                                                                   |
| Rigid PVC conduit (same table)                    | up to 16 mm     | 0.75 m                                                    | 1.0 m                  | _check_ the larger sizes in the On-Site Guide                                     |
| Chemical and sample tube (`chemical-tube`)        |                 | clipped every 0.3–0.5 m, along a wall or tray             |                        |                                                                                   |
| Lagged heating (`lagged-heating`)                 |                 | as the steel inside it; the hanger goes round the lagging |                        |                                                                                   |

Other practice to follow:

- **A support within about 300 mm of every bend, tee and valve,** and a heavy valve or fitting supported on its own, so its weight does not hang on the pipe.
- **Overhead:** a split-ring or clevis hanger round the pipe (round its lagging, if lagged), on threaded drop rod (M8 or M10), to a fixing in the soffit: a ceiling plate or a channel with an anchor. Several runs side by side share a trapeze: a length of channel strut on two rods.
- **Along a wall:** brackets or saddles fixed to the wall (conduit on spacer-bar saddles), not rods from the ceiling.
- **Low down:** pipe stands from the floor, as now.
- **Vertical runs:** wall clamps at the vertical spacing.
- **Pipe inside a machine:** the pipework inside a packaged machine (a skid, a cabinet) is carried by its frame, not by the building.

## What the code has now (found on 2026-10-22)

Read these before designing; each is a trap for a naive implementation.

1. **No single statement of where a room's structure is.** Every caller assumes its own heights:
   - `room-pipes.ts` hangs everything to `INTO_CEILING = 8 - 1.9` (6.1 m). That is the bottom of the decorative services-ceiling zone in an 8 m room (`CEILING_ZONE = 1.9`), hard-coded for the large and medium plant rooms.
   - `plant-room-shell-room.ts` passes the cabinet services `plan.roof - plan.floor - CEILING_ZONE`.
   - `room-services.ts` assumes a roof of 7.2 m in the plant rooms and the wet hall, and 7 m elsewhere.
   - The real heights live in `plantRoomPlan` (`src/toolkit/gallery/logic/plant-rooms.ts`): the tiny room is 7 m from floor to roof, the small 3.5 m, and the medium and large 8 m. The service rooms' heights live in `SHELL_ROOMS` (`shell-rooms.ts`, `height`).

   So step 0 below is a room structure description that every caller takes from one place.

2. **The services ceiling is set dressing,** with its own hangers (`site-dressing/logic/service-ceiling.ts`, `hangEvery` per system). Plant supports' rods may pass up through its zone to the soffit, as real rods pass among other services. Clash tests ignore it, but not the real plant.
3. **The obstacles already exist:**
   - `pipeObstacles` (`room-pipes.ts`) gives the low runs' footprints;
   - `layoutRoom(room).placed` gives every machine's footprint and height;
   - `box.keepClear` gives the doorways and stairs.

   A rod or stand must not pass through any of these.

4. **Six callers draw pipe with `createPipe`, of three sorts:**
   - **building pipework:** `room-pipework.ts`, `cabinet-services.ts`, `room-services.ts` (the conduits). These need building supports.
   - **pipe inside a machine:** `spa-pack.ts` (the cabinet's internal pipework) and `plant/pumps.ts` (0.7 m stubs on an exhibit). Their frame carries them, so the rule must let them count as supported by it.
   - **an exhibit:** `pipes-n-dreams.ts`, the dev room's pipe gallery, which should show its supports as the building's are.
5. **`supportPipe` silently drops supports:**
   - when the rod would not fit (`if (ceilingY <= top) continue`);
   - for level lengths under 0.6 m;
   - for a low run whose stand would go below the floor.

   None of these shows in a test. There is one test (`pipe-supports.test.ts`), for the 1.5 m spacing on one run.

6. **Lagging** (`lagged-heating`) is drawn round the pipe by `pipe-kinds.ts`. The hanger must go round its outside (`radius` is passed as the pipe's radius plus lagging in `room-pipework.ts`, but not everywhere).
7. **Another agent is changing `room-pipework.ts`** (the plant identification work) at the time of writing. Coordinate as the rules below say.

## What to build

Each step is a checkpoint, committed on its own.

0. **The room's structure, from one place:** a pure function, for example `roomStructure(room)` in `src/toolkit/gallery/logic/`. For any room that draws pipe it gives:
   - its floor level and soffit (the roof slab's underside);
   - the bottom of its services-ceiling zone;
   - its walls' inner faces;
   - its obstacles: low runs, machines, doorways and stairs.

   It is built from `plantRoomPlan`, `SHELL_ROOMS` and `layoutRoom`. Replace `INTO_CEILING`, the 7.2 m and 7 m in `room-services.ts`, and the `ceiling` passed to the cabinet services with it.

1. **One support table** in pure logic (for example `src/toolkit/components/plant/logic/pipe-supports.ts`, tested): the maximum horizontal and vertical spacing for each pipe kind and size from the table above, the warm-water reduction for plastic, and the near-fitting distance (300 mm).
2. **A pure support planner:** given a run (its points, kind, outside diameter, lagging, its valves and tees, its temperature for plastic) and the room's structure, it returns its supports. Each has:
   - its type: hanger and rod, trapeze, wall bracket, wall clamp, floor stand, or carried by a machine;
   - the point on the pipe;
   - the point where it meets the structure.

   Rules:
   - supports go at most one spacing apart on every horizontal length, and at the vertical spacing on risers;
   - one goes within 300 mm of every bend, tee and valve;
   - a run within about 0.3 m of a wall is bracketed to the wall, out in the room it is hung from the soffit, and low down it stands on the floor;
   - parallel runs close together share a trapeze;
   - a run marked as a machine's own pipework is carried by that machine.

   It **never silently skips**: a span it cannot support is returned as a problem.

3. **Supports drawn by the pipe helper itself,** so supporting is not opt-in:
   - `createPipe` (or one new entry point every caller uses) takes the room's structure, or the machine that carries the run, and draws the run's supports with it;
   - rods reach the soffit and end in a ceiling plate and anchor;
   - wall brackets and clamps have a base plate on the wall;
   - stands have a base plate on the floor;
   - all are drawn as instanced meshes, so a plant room's hundreds of supports stay cheap;
   - the hardware is made after real channel strut and hangers (a maker from `brands.ts` where a label would show).
4. **Every caller moved onto it,** in this order: the room services' conduits; the cabinet services, including the footbath make-up main; the room pipework, once the other agent has committed its changes there; then the exhibits. Remove the old opt-in `supportPipe` calls once covered.

## Routing rules: what is routed, and what only runs to the room's envelope (the owner, 2026-10-22)

Not every service has to be routed from machine to machine inside a room. Some run only to the room's envelope, where the plant model takes over: the drawing shows the visible half of a real connection, and the port graph knows where it goes next (`doc/reports/port-graph-architecture-review.md`).

- **Magic:**
  - **Smoke, exhaust and fumes:** a flue goes straight up, through the ceiling. A condensing boiler's condensate is a drain.
  - **Water drainage and sewage:** a drain goes straight down, and ends a little above a floor gully, with a visible air gap.
- **Semi-magic:**
  - **Electricity:** a conduit sized for its current runs to the nearest wall, preferring the room's **supply wall**: the wall its power comes in by. The supply wall is the west wall unless a room overrides it, which it declares when the helper is started for it. It goes to the supply wall unless that is much further than the nearest wall. A machine's local isolator stays a real node beside it, and the conduit runs from the isolator.
  - **Control:** a small conduit runs to the nearest wall, ending at a small junction box. A control network we do not route is imagined beyond it; the plant model keeps the logical signal (controller to starter, sensor to controller) as an unrouted connection.
- **Routed in full:** pool water, make-up, heating, gas, chemicals, ozone, sample lines and air ducts, which join machines in the same room.

Each medium declares how it is drawn: routed, or a stub with its direction (up, down, wall, or wall preferring the supply side). Supports follow the same rules as any run. The tests add:

- a flue leaves vertically and reaches the ceiling unobstructed;
- a drain falls and ends above floor level, over a gully;
- an electrical or control stub ends on a wall, the supply wall when it is near enough, crossing no walkway below 2.1 m.

## Tests (the acceptance)

Pure-logic tests, across every room that draws pipe (`ROOM_SERVICES`, the plant rooms, the cabinet rooms):

- **Spacing:** no horizontal length of any run goes longer than its kind's spacing between supports (or between a support and a run's end at a fitting or port), and every bend, tee and valve has a support within 300 mm. Do the same for risers at the vertical spacing.
- **Structure:** every support ends on structure (the soffit from `roomStructure`, a wall face or the floor) or on the machine that carries it, and its rod or stand does not pass through another run, a machine's box, or a doorway's or stair's clear space. The services ceiling is ignored.
- **One source of heights:** no caller keeps its own ceiling or roof height (`INTO_CEILING` and the constants in `room-services.ts` are gone).
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

## Sources

- UK Copper Board figures as quoted in [BuildWiz: 22 mm copper pipe](https://www.buildwiz.uk/knowledge/materials/plumbing/copper-pipe-22mm), [BuildWiz: 15 mm copper pipe](https://www.buildwiz.uk/knowledge/materials/plumbing/copper-pipe-15mm) and [Screwfix community: pipe clip spacing](https://community.screwfix.com/threads/quick-pipe-clip-question.68343/); [Lawton Tubes: Fixing copper tube data sheet](https://lawtontubes.co.uk/wp-content/uploads/2021/06/Fixing-Copper-Tube.pdf) for the table to check.
- [Engineering ToolBox: Steel pipes, supports](https://www.engineeringtoolbox.com/steel-pipe-supports-d_1071.html); [Engineering ToolBox: Copper tubes, supports](https://www.engineeringtoolbox.com/copper-tube-supports-d_1070.html).
- [Vinidex: PVC above-ground installation](https://www.vinidex.com.au/technical-resources/pvc-above-ground-installation/) (spacing by DN, and the temperature reduction); [Plastic Pipe Shop: Pipe clip spacing](https://www.plasticpipeshop.co.uk/Pipe-Clip-Spacing_ep_52-1.html) (PVC and ABS, by size and temperature).
- IET On-Site Guide, Table 4.12, as reproduced at [TLC Direct: Plastic and metal conduits](https://www.tlc-direct.co.uk/Book/4.5.1.htm).
