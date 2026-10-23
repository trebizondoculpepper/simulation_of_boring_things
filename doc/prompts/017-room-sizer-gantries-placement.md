# Prompt: room sizer, gantries, placement, then the plumber

Written by Claude (Opus 5.5, Claude Code) for its own work and so other agents know what it is doing, 2026-10-23. Read `AGENTS.md` first. This comes before the routing in `doc/prompts/016-pipe-helper-two-ways.md`: the plumber can only route well in a room that is the right size with its machines in sensible places.

## Why

Dev19's pipework failed every check (2026-10-23 audit): 231 clashes among 33 runs, neighbours 2.3 m apart joined by 41 m of pipe, risers through machines, no supports. The cause is upstream of the plumber:

- the room is a fixed 20 × 20 m, and its 22 machines cover about 30 m² of its 400 m² (under 8 %), so connected machines end up far apart;
- `layoutSquarePlantRoom` only arranges machines round the four walls, never in an island or a cluster, and never turns a machine to face its neighbour;
- nothing reserves space for walking, so nothing tells the plumber where it may not go.

## What the owner wants

Four helpers, each a layer, run in order. Each takes what the one before produced:

1. **The room sizer** sets the room's width, length and height from its contents.
2. **The gantries helper** (optional, an experiment) reserves regions of the room: an observation gantry and its staircase, and the walkways. No pipe may run above a staircase or above a walkway.
3. **The placement helper** finds an efficient arrangement of the machines in the space that remains.
4. **The plumber** (prompt 016) connects everything, keeping out of the reserved regions.

The owner's rule for the experiment: if the room is more than two storeys tall, it gets an observation gantry along one wall and a staircase down from it against that wall; no pipes above the staircase or the gantry's walkway.

The point of the experiment is to see whether blocking out regions of a room works as a general mechanism. Gantries are the first kind of reserved region, and not the last.

## The owner's rulings as the work went on (2026-10-23)

- **A two-storey plant room is normal.** The sizer makes rooms two storeys (8 m) by default, and the gantry appears from two storeys up, not only above two.
- **Where machines belong.** Each machine has a `site`. The big tanks (balance tanks, the heating water tank) go in corners, placed first, biggest first. Mimics, control panels and signs go against walls. Pumps and process vessels are freestanding where they can be; this is a preference that a much shorter pipe run may outweigh.
- **Bands round a ring walkway** (Claude's design, which the owner liked). Placement fills bands: one along each wall, backs to the wall, and an island of two bands back to back down the middle, all facing a ring walkway. The layout is tidy by construction and every machine faces a walkway.
- **Concentric buses.** With a ring layout, the power and control buses are concentric too: an outer ring on the walls for the wall bands, and an inner ring at high level over the walkway for the island. The walkway only bars runs below 2.1 m.
  - **A power bus is sized for the total load it carries:** the sum of its connected currents, by the plumber's cable rules.
  - **A control bus is always small, however much hangs off it**, because it is a ring network that scales.

## The design

All four are pure logic in `logic/` folders, tested with `vite-plus/test`, with no Three.js. The view only draws what they return.

### Shared: the reserved region

```ts
interface Region {
  name: string;
  kind: 'walkway' | 'gantry' | 'stair' | 'access' | 'door';
  /** An axis-aligned box in the room's frame, metres; floor at y = 0. */
  min: Vec3;
  max: Vec3;
  /** What it forbids: machines on the floor inside it, and/or any run passing through the box. */
  forbids: { machines: boolean; runs: boolean };
}
```

- A walkway forbids machines on its floor and any run below its headroom (2.1 m).
- A staircase or gantry walkway forbids runs anywhere above it, up to the soffit (the owner's rule). Its own structure stands inside it.
- A machine's maintenance access forbids other machines, but not runs overhead.

These become `SupportObstacle`s for `planSupports` (kind `clear` or `landing`, which already exist), and boxes the plumber's route check rejects.

### 1. The room sizer

`sizeRoom(contents, options) → { w, d, h, reasons }`:

- **Floor area:** the sum of each machine's footprint and its maintenance and withdrawal space (a pump's motor withdrawal, a filter's manway), plus a walkway, plus an allowance for pipework that grows with the number and size of links.
  - Reuse `packing.ts`'s rules: a 1.5 m walkway, 0.8 m between machines, a 0.6 m service zone.
  - A compact plant room is about three times its machines' bare footprint. This is a working figure to test against, not a standard.
- **Shape:** an aspect ratio near square unless a process train wants a long room. Round to 0.5 m.
- **Height:** the tallest machine, plus its lifting or withdrawal space, plus the service zone for the pipe and conduit tiers and their supports.
- **Doors:** wide and tall enough for the largest machine to come in.
- **Reasons:** say how each figure was reached, so a test or the owner can see why.

If placement cannot fit everything, the sizer grows the room a step (0.5 m on the shorter side) and placement runs again, up to a limit. Failing at the limit is a reported problem.

### 2. The gantries helper (optional)

`reserveRegions(room, options) → Region[]`:

- **Always:** the walkways placement must keep clear, the doorways' approach and the main walkway that joins them.
- **If the room is more than two storeys tall** (`STOREY` is 4 m in `src/game/plant/network/common.ts`, so over 8 m), it also adds:
  - an observation gantry along one wall at the upper storey's floor level, 1.2 m wide (the corridor width), with its walkway;
  - a straight staircase against the same wall, from the gantry down to the floor.
- **Which wall:** the wall with the room's upper door if there is one, otherwise the longest wall. Override with `gantryWall`.
- `gantry: 'auto' | 'always' | 'never'`, default `'auto'`. `'always'` lets the experiment be tried in Dev19 whatever its height. At its present contents, Dev19 will size to about 4 m, so `'auto'` alone would never show a gantry there.
- The existing gantries (`main-plant-fit.ts`'s perimeter gantry and stairs, `plant-rooms.ts`'s landings) are the reference for sizes and drawing. Do not change them in this work.

### 3. The placement helper

`placeMachines(room, regions, contents, links) → { placed, problems }`:

- **Hard rules:**
  - every machine and its access space is inside the room;
  - nothing overlaps another machine, its access or a region that forbids machines;
  - wall-mounted items go on a wall;
  - fixed constraints hold: gas and electrical entry on the supply wall (west by default), the boiler where its flue can rise.
- **Score (minimised):** each link's length weighted by its pipe size (the plumber's `choosePipe` gives the size), plus a penalty for each crossing in plan, plus a penalty for ports facing away from what they connect to.
- **Moves:**
  - position;
  - a quarter-turn of rotation;
  - swapping two machines;
  - patterns tried as starting points: round the walls, an island with a walkway round it, and clusters, such as a process train of pump, filter and heat exchanger in a line.
- **Search:** simulated annealing or a swap search from each pattern, seeded and deterministic, so tests are stable.

The links come from the port graph (`physicalAdjacencyMatrix`, `src/game/plant/port-adjacency.ts`). Control links do not pull machines together; they go to the bus.

### 4. The plumber

Prompt 016 as written, with these additions:

- its route check rejects any segment through a region that forbids runs;
- power and control go to the room's bus (`control-bus.ts`), not one conduit each from the supply;
- the flue rises through the roof.

## The order of work

1. `Region` and `reserveRegions` (walkways and doors; the gantry and stair), tested. Draw the regions in Dev19 as translucent boxes, for the owner to check.
2. `sizeRoom`, tested against Dev19's contents: about 10 × 10 m, not 20 × 20 m.
3. `placeMachines`, tested: no overlaps, every hard rule holds, and Dev19's weighted link length well below today's.
4. Dev19 runs sizer → regions → placement, with `gantry: 'always'` as a toggle to compare. A before-and-after plan from above, with the regions, goes to the owner.
5. The plumber routes Dev19 (prompt 016 step 3), clear of the regions: no clashes, no runs above a stair or a walkway, supports planned.
6. Only then, and only if the owner asks, apply the helpers to other development rooms or report on the real plant rooms. Real rooms' sizes stay as the facility plan has them until the owner decides.

## Who is doing what

- **Claude (this session)** does this work. It is working in:
  - new files under `src/toolkit/gallery/logic/` for the sizer, regions and placement;
  - `plant-room-layout.ts`;
  - `port-graph-demo-routes.ts`;
  - the Dev19 room view (`src/toolkit/gallery/rooms/plant/port-graph-demo.ts`, `plant-room.ts`).
- **Dev19 was built by another agent** (GPT-6 Codex). The owner has asked Claude to rework its layout and pipes. Its graph and model (`src/game/plant/port-graph-demo.ts`) stay as they are, except for any new port anchors placement needs.

## Checks and rules

- Pure tests beside the logic; deterministic results.
- Before every commit run `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` and `npm run build`. Commit only when all pass.
- Commit only named files, never `git add -A`; leave others' uncommitted work alone.
- `CHANGELOG.md` under Unreleased; a diary entry; Markdown one paragraph per line.

## Return path

Commits named `layout(<step>): <what changed>`, pushed. Progress in `doc/reports/room-layout-progress.md`:

- each step's state, with commit hashes;
- Dev19's figures before and after: room size, weighted link length, clashes.
