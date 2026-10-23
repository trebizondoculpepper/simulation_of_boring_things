# Room layout: a guide for agents

Written by Claude (Opus 5.5, Claude Code), 2026-10-23, so that any agent can pick up the room-layout work and improve the layout of a particular plant room. Read `AGENTS.md` first (the project's rules), then this. Every path below is from the repository root.

## Contents

1. What the pipeline does
2. To improve a room: the recipe
3. The layers, one by one
4. Scoring a room
5. The owner's rulings
6. The experiment rigs (Dev21 to Dev26)
7. Seeing it in the browser
8. Known problems and open work
9. Where the history is

## 1. What the pipeline does

A plant room is made in stages, each pure and tested, each handing the next a richer room. A scorer after each stage says how good the result is, so layouts can be compared by number and searched.

1. **Sizer:** how big the room must be for its machines.
2. **Regions:** the space no machine or pipe may take: door approaches, and in rooms two storeys high a gantry and stair against one wall.
3. **Placement:** where each machine stands, by site rules (corners, walls, freestanding) in bands round a ring walkway, found by seeded annealing.
4. **Blocks and variants:** identical machines pre-assembled into blocks (rows, 2 × 2), and components built as one of their variants (a heat exchanger as shell-and-tube or plate, on a plinth or the floor); the scorer picks.
5. **Plumber:** takes the schematic (a port graph) and adds the fittings it implies (isolating valves, non-return valves, power isolators, headers) as new nodes in the graph, then routes every line.
6. **Router:** lays each line without passing through any other or through a reserved region (the voxel router).
7. **Scorer:** gates first (all lines routed, no clashes, every fitting in reach, every machine walkable), then weighted dimensions (pipework cost, room area, port heights, process order and more).
8. **Bound room:** the expanded graph, fittings and all, is the graph the simulation runs, so every valve the plumber added is a working valve.

Dev19 (`?room=dev19`, and its comparison rooms dev19b, dev19c, dev19d) is the room the whole pipeline was built on. It is the reference for how the stages fit together.

## 2. To improve a room: the recipe

1. **Know the room's machines and schematic.** For Dev19 that is `src/game/plant/demo-variants.ts` (`DemoModel`: the graph and which kind each node is) and the port graph in `src/game/plant/port-graph-demo.ts`. Each machine's ports, sizes, sites and withdrawal space are in `src/toolkit/gallery/logic/port-graph-demo-routes.ts` (`demoPorts`, `demoPlaceItems`, `demoPlaceLinks`, the `SITES` and `WITHDRAWAL` tables).
2. **Score the room as it is.** `scoreDev19(name, sizes, layout, rules, model)` in `src/toolkit/gallery/logic/dev19-scoring.ts` gives a `Score`; `describeScore` (`room-scorer.ts`) prints it, gates first. Write a temporary test that prints it to the scratchpad (do not commit it).
3. **Search.** `searchDev19` tries placement seeds, scores each placement quickly (`placement-scorer.ts`), and plumbs and fully scores only the best few. `DEV19C_SEED` is the best seed found so far (seed 9, score 85, every gate passed).
4. **Change one thing and score again:** a machine's site or withdrawal, a rule in `PlumbingRules`, a variant (`withVariant`), a block make-up (`layoutWithBlocks`), a router setting. Compare with `rank` (gates first, then total).
5. **Look at it.** Run the dev server (`npm run dev -- --port 5175`) and open the room (section 7). Check by eye: pipes square to ports, nothing through a walkway, valves where a person can reach them.
6. **Prove it.** Add or update tests beside the code (`*.test.ts`, importing from `vite-plus/test`): the gates must pass, and the score must not fall. Then run `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run build`, add a line to `CHANGELOG.md` under Unreleased, and commit only the files you changed.

## 3. The layers, one by one

### Sizer

`src/toolkit/gallery/logic/room-sizer.ts`: `sizeRoom(items, options)` gives a `RoomSize` from the machines' footprints, maintenance access (`ACCESS`), the gaps between machines (`MACHINE_GAP`), circulation (`CIRCULATION`) and the service zone overhead (`SERVICE_ZONE`). It leaves room on the island for the longest freestanding item or block. Placement in bands needs about 30 % more than the bare estimate; `layoutSizedPlantRoom` (below) grows the room until placement fits.

### Regions

`src/toolkit/gallery/logic/room-regions.ts`: `reserveRegions` reserves door approaches (`DOOR_APPROACH`) and, from two storeys (`UPPER_FLOOR` = one storey, 4 m) up, a gantry (`GANTRY`) and stair (`STAIR`, BS EN ISO 14122-3 pitch, 1.1 m guard rails) along one wall. A region `forbids` runs (no pipe may pass through it) and machines. `regionFloorAt` and `regionSolids` make the gantry and stair walkable; `runEntersRegion` and `boxesOverlap` are the checks the router and scorer use. Two-storey plant rooms are the normal assumption.

### Placement

`src/toolkit/gallery/logic/machine-placement.ts`: `placeMachines(items, links, options)` places `PlaceItem`s in bands (`patternBands`) round a ring walkway (`MAIN_WALKWAY`), by simulated annealing seeded with mulberry32, so a seed always gives the same room. A `PlaceItem` says:

- `w`, `d`, `h`, its `access` in front, and its `ports` (where, in its own frame, and which way each faces);
- `site`: `corner` (big tanks, placed biggest first), `wall` (mimics and panels, `walls` says which), or `free` (pumps);
- `clearAbove`: nothing over it (a boiler's flue, a heat exchanger's top connections);
- `inline`: a valve, left out of placement for the plumber to set into its line;
- `group`: machines of a kind stand together as a battery; `bothFaces`: a block worked from both sides;
- `withdrawal`: room to draw parts out (a pump's motor, a heat exchanger's tube stack, a filter's internals).

`PlaceLink`s (pairs of items and ports, with a price a metre) pull linked machines together. Process practice after Nandagopal's _Fundamentals of Process Plant Layout and Piping Design_ is on by default (`practice`): process order (`SEQUENCE`), short pump suctions (`SUCTION`, doubled), withdrawal envelopes.

`src/toolkit/gallery/logic/plant-room-layout.ts`: `layoutSizedPlantRoom(sizes, { items, links, seed, practice, bandOf })` runs sizer, regions and placement together and returns a `SizedPlantRoomLayout` (the room, each machine's `ExhibitPlace`, its solids for walking, its regions). `layoutPlantRoom` is the old simple row layout, kept for rooms that have not been through the pipeline.

### Blocks and variants

- `src/toolkit/gallery/logic/unit-blocks.ts`: `makeUps` lists the ways to group identical machines (a row, a 2 × 2, pairs, singles); `assemble` builds a block with its own pipework and valves merged through a header, cheaper because it is shop-made; `expandBlock` turns it back into its members. `src/toolkit/gallery/logic/block-layout.ts`: `layoutWithBlocks` tries the make-ups, preferring fewer placements, with `SHOP_RATE` (0.6 of field cost) and `FIELD_JOINT` (£150 a joint). Estimates use square lengths (x + y + z), not straight lines.
- `src/game/plant/demo-variants.ts`: `DemoModel.variants` and `withVariant` build a node as another of its variants. The pool heat exchanger's variants are in `src/toolkit/components/plant/logic/shell-tube-exchanger.ts` (`EXCHANGER_VARIANTS`, `exchangerPorts`, `exchangerPlacing`): shell-and-tube on its plinth (the winner), plate on the floor, plate on a 0.3 m plinth. The placement scorer's `port heights` dimension marks down ports below 0.3 m, which limit routing.

### Plumber

`src/game/plant/plumbing-expansion.ts`: `expandForPlumbing(nodes, edges, options)` adds the fittings a schematic implies, as graph nodes with ids `<node>.<port>.<iso|nrv|isolator>`, and returns the expanded graph, the fittings, and each line's fittings in order (`along`). Options:

- `isolate`: which kinds of node have their connections isolated; `pumps` and `discharge`: a non-return valve on each pump's discharge (`nonReturn` says which pumps);
- `isolateMedia`: which media are isolated at both ends (water by default; with power among them, a power isolator at each isolated end);
- `powerIsolators`: `supply-feeds` (only feeds straight from a supply) or `every-device` (the last feed to every device that is not `switchgear`): power isolators interrupt the drop to the bus, never part of the main plan;
- `omit`: fittings left out (out of reach);
- `normally`: the state every fitting is left in, `open` (default) or `closed`.

Ports shared by several links (a pump's discharge to a battery of filters) get their fittings once on the common pipe and a header the links branch from. `operatorFor(actuation, reachable)` chooses how each valve is worked, by the plumber's option: `prefer-manual`, `automatic-where-hard-to-reach` (Dev19's `DEMO_ACTUATION`) or `all-automatic`.

`src/toolkit/gallery/logic/port-graph-demo-routes.ts`: `demoPlumbing(layout, rules, model)` is Dev19's whole plumber: it expands the graph, routes the lines (`demoLines`, by medium and price, grouped where they share a port, the flue first, then through-lines, then the dearest pipes, then power), sets each fitting on its line (`placeInline`, `splitAt` in `src/toolkit/components/core/logic/inline-placement.ts`), and returns `{ places, runs, devices, terminals, problems, graph, shares }`. Its `PlumbingRules` (`CLAUDE_RULES`, `CODEX_RULES`, `ADOPTED_RULES`): `nonReturn`, `powerIsolators`, `reach`, `unreachable`, and `routing` (`lanes`, `reachable-ends`, or `voxel`, which the adopted rules use). `MAGIC_TERMINALS`: lines that end at the room's boundary rather than a port (the boiler's flue terminates at the ceiling by the most direct route).

### Router

`src/toolkit/components/core/logic/voxel-router.ts`: `routeVoxelLines(room, lines, fixed)` lays each `RouterLine` (start and end `PortEnd`s, outside diameter, joint, price, `priority`, `startStraight` and `endStraight` leads) through a `RouterRoom` (half sizes, height, `regions` that forbid runs, `obstacles` boxes). It first tries simple paths at a set of levels (0.8 m to 7.5 m), then searches a 0.2 m grid (Dijkstra with a Manhattan estimate), blocking reserved regions, obstacles (padded by the pipe's radius and a grid step) and every line already laid. Lines are laid hardest first (`priority`, else diameter), retried in rotated orders. Every result is proved by `pipeClashes` in `src/toolkit/components/core/logic/pipe-route.ts` (which also has `portLead`, the straight a run must leave a port by, and `JOINT_BEND`).

`src/toolkit/gallery/logic/router-trials.ts` holds the other approaches tried (`routeRack`, a rack rule; `routeVoxel` with rip-up rounds): the rack was fast but let one run through, rip-up gained nothing; the voxel router is the one in use.

Pipe prices are in `src/toolkit/components/core/logic/pipe-costs.ts`: `pricePerMetre(kind, od, { conduit })` by kind and size (steel, PVC, insulated, conduit), and `FITTING_PRICES`.

### Bound room and simulation

`src/game/plant/plumbed-demo-graph.ts`: `plumbedDemoGraph` builds the expanded graph as the `@statelyai/graph` the simulation runs (`createPortGraphDemo(graph)` in `src/game/plant/port-graph-demo.ts`), and `plumbedGraphIssues` checks it. Water passes a fitting only as it should: an isolating valve or power isolator when open, a non-return valve forward only, a header always.

## 4. Scoring a room

- `src/toolkit/gallery/logic/room-scorer.ts`: `scoreRoom(room)` gives a `Score` of gates and dimensions. **Gates** (any failure ranks the room below every room that passes): every line routed and every fitting the rules want installed; no machine that cannot be walked to; no fitting out of reach; no clash (bus and header overlaps listed in `shares` are allowed); no run through a reserved region. **Dimensions**, each 0 to 1 with a weight: pipework cost (against the same runs straight), room area (against what the sizer says the contents need), clashes, fittings, access. `rank` sorts gates first, then by total; `describeScore` prints it.
- `src/toolkit/gallery/logic/placement-scorer.ts`: `scorePlacement` scores a placement before any plumbing, quickly, for searching: access, sites, batteries, process order, short suctions, fewer placements, groups by what they serve, port heights, pipework estimate, room area.
- `scoreDev19` merges the two: the plumbed room's dimensions, with placement's sites, batteries, process order, short suctions and port heights carried through.

Where Dev19 stands (2026-10-23): this morning's layout scored about 39; Dev19c (seed 9, shell-and-tube exchanger on its plinth, voxel router) scores 85 and passes every gate (all 28 lines routed, no clashes, 22 of 22 fittings in reach). At seed 1 one line is still left out (heat exchanger to tank).

## 5. The owner's rulings

These came from the owner while the pipeline was built; keep to them.

- Size the room first; most rooms come out smaller than they were drawn.
- Two-storey plant rooms are normal: a gantry and stair against one wall, and no pipe may run over the stair or the gantry's walkway.
- Big tanks go in corners, biggest first; mimics and control panels against walls; pumps freestanding.
- Buses are concentric: power buses sized for their total load; control buses always small (a ring network).
- Valves and isolators are never placed by placement: the plumber adds them as nodes in the graph and sets them in their lines. Power isolators interrupt the drop to the bus.
- The plumber's actuation option: prefer manual, automatic where hard to reach, or all automatic.
- Remote (motorised) valves are drawn at their real size (Belimo LR 118 × 71 × 85 mm, SR 141 × 93 × 86 mm: `src/toolkit/components/plant/logic/remote-valve.ts`).
- A flue is terminated by heading up to the ceiling by the most direct route (a magic terminal), never left unterminated.
- Identical machines are grouped into pre-assembled blocks, which include their own pipes and valves and so are cheaper; fewer placements is better; machines that serve the same thing are grouped as individual machines are.
- Prefer component variants whose ports are not close to the ground.
- Detectors: a chlorine detector near its source, on a wall, on the control bus; an ozone detector as far as allowed from its source; both near the floor, on a wall if one can be reached, else on a post (prompt 022, not built yet).
- The room handed to the simulation is fully bound: the expanded graph is the graph the simulation runs.

## 6. The experiment rigs (Dev21 to Dev26)

After the pipeline, the owner asked for small experiments, each proving a piece of modelling the Olympic pool's redo will need. They use the same pieces by hand, which makes them good worked examples. Each is a pure logic file beside its tests, and a room module that draws and drives it.

- **Dev21, sources to sinks** (`src/toolkit/gallery/logic/source-sink-plumbing.ts`): every experimental source plumbed to its sink by `expandForPlumbing` (`isolateMedia` all, `normally: 'closed'`) and `routeVoxelLines` with a walkway region; `createSourceSinkModel` moves each substance when both valves are open.
- **Dev22, a battery-backed pump** (`battery-pump-rig.ts`; `src/game/plant/power-conversion.ts`): a 450 V supply through an isolator to a rectifier, battery and inverter, then an isolator to a pump. `powerIsolators: 'every-device'` with `switchgear` for the parts of the UPS.
- **Dev23, draining a jacuzzi** (`jacuzzi-drain.ts`; `src/game/plant/gravity-drain.ts`): an IBC on a plinth drained by gravity to a gully. The drain run is laid by hand, falling 1 in 40 all the way: the router knows nothing of falls, so drainage is laid by rule.
- **Dev24, duty and standby pumps** (`duty-standby-rig.ts`; `src/game/plant/duty-standby.ts`): headers as components of their own (a manifold with a main end and branch stubs), so pumps join them as anything else.
- **Dev25, a one-port tank** (`tank-fill-drain.ts`; `src/game/plant/tank-tee.ts`): one port filling and draining by the pressures across a tee.
- **Dev26, an Olympic filter on its five-valve battery** (`five-valve-rig.ts`; `src/game/plant/five-valve-filter.ts`): face pipework laid by hand from the filter's own nozzles (`sandFilterGeometry`), the water side solved by the simulation's network solver (`solveNetwork` in `src/game/sim/hydraulics.ts`).

Shared helpers: `src/toolkit/gallery/logic/rig-fittings.ts` (`placeRigFittings`: each fitting at the end of the line it serves if a person can reach it there, else at the other end); `layoutRoom` in a room module (picked up by `src/toolkit/gallery/rooms/plant-room.ts`) gives a room its own layout in place of the default rows. The scenarios and their status are listed in `doc/prompts/scenarios.md`.

## 7. Seeing it in the browser

- Run `npm run dev -- --port 5175`, then open `http://localhost:5175/?room=dev19` (or any room id). A position in the link places the walker: `&x=…&z=…&yaw=…&pitch=…`, metres and degrees. Yaw 0 looks north (−z), 90 east, 180 south, 270 west; the view's direction is (sin yaw, −cos yaw).
- Reloading rebuilds the room from scratch; to watch something change, walk with the on-screen arrows rather than reloading.
- A click works a part only on its working piece (a valve's lever, a selector's knob), within reach; the first click on the canvas may only take its focus.
- To register a new dev room: its id in `src/toolkit/gallery/logic/dev-room-links.ts` (type, name, colour, and `ROOMS`), its module in `src/toolkit/gallery/rooms/plant-room.ts`, and its id in the list in `src/main.ts`.

## 8. Known problems and open work

- **The router cannot leave a port inside a machine's bounding box** except by its lead: give such ports a lead long enough to clear the box's padding (Dev24's pump power feeds need 0.8 m). Prompt 021 is where to improve this.
- **Dev19 at seed 1** still leaves one line out (heat exchanger to tank).
- **Buses and headers are not drawn** as trunking or manifolds in Dev19 (Dev24 draws its headers by hand).
- **Placement does not yet pull groups toward what they serve.**
- **Drainage needs falls,** which the router does not know: lay drains by rule, as Dev23, Dev25 and Dev26 do.
- **Gas detectors** (prompt 022, step 2) are not built.
- **The network solver** returns unconverged flows for a network with no head across it; give it none to solve (Dev26 returns no flow with the supply off).
- **Which comparison rooms to keep** (dev19b, c, d) is still for the owner.

## 9. Where the history is

- Prompts, in order: 017 (sizer, regions, placement), 018 (plumber valves and isolators, magic terminals, bound room), 019 (the simulation on the expanded graph), 020 (scorers, pipe costs, blocks and headers, process practice), 021 (the clash-free router), 022 (variants, port heights, detectors), 023 to 031 (the test scenarios), all in `doc/prompts/`.
- Reports: `doc/reports/room-layout-progress.md`.
- The day's diary: `diary/2026-10-23_room-layers-plumber-and-scorer.md`.
- The plant model the rooms bind to: `doc/plant-model.md`.
