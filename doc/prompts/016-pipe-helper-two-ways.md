# Prompt: the pipe helper, called two ways

Written by Claude (Opus 5.5, Claude Code) for its own work and so other agents know what it is doing, 2026-10-23. Read `AGENTS.md` first. This joins up three earlier prompts into one pipe helper:

- `doc/prompts/008-pipe-supports.md`: supports, and the routing rules (magic flues and drains, buses for power and control, one supply of each kind per room);
- `doc/prompts/015-pipe-lines.md`: material, size, colour and marking chosen from what a line carries;
- the clash and port checks already in `src/toolkit/components/core/logic/pipe-route.ts` (`pipeClashes`, `withPortLeads`, `leavesPortsSquare`).

## What the owner wants

The pipe helper can be called two ways:

1. **Explicitly:** "a pipe of this kind and size, through these points". This is for decorative work (the services ceiling, the pipe gallery, exhibits), where the caller decides everything and nothing is modelled. This is what `createPipe(kind, od, points)` does today, and it stays as it is.
2. **By function:** "this commodity, this capacity, from here to there". The helper sorts out the rest:
   - the material, from the commodity;
   - the size, from the capacity;
   - the route, from the two ends and the room;
   - its supports, colour bands, label and flow arrow;
   - a check that it clashes with nothing.

   It returns what it decided, so tests and the plant model can see it.

## The design

**One pipeline, two entry points.** Both end in the same drawing code. The functional call first resolves a line into an explicit run, then draws it as the explicit call would, adding its supports and marking.

- **Explicit:** `createPipe(kind, od, points, options)`, unchanged: no marking, no supports unless asked for. It is for decoration and exhibits, never for plant that is modelled.
- **By function, pure:** `resolveLine(spec, room)` in a `logic/` folder returns a `ResolvedLine`:
  - the pipe kind, outside diameter and points;
  - its supports;
  - its marking: bands, label and arrow;
  - its problems.

  It has no Three.js, so every room's lines can be tested headless.

- **By function, drawn:** `createLine(spec, room)` draws a `ResolvedLine`.

**What a functional call gives:**

```ts
interface LineRequest {
  commodity: Medium; // 'pool-water' | 'mains-water' | 'lthw-flow' | 'natural-gas' | 'ozone'
  // | 'hypochlorite' | 'acid' | 'drainage' | 'flue-gas' | 'ac-400v-3ph' | 'control' ...
  capacity: Rating; // typed: 100 A, 1 g/s, 620 m³/h, 25 mbar ...
  from: PortEnd; // a machine's port: where it is and the way it faces (`pipe-route.ts`)
  to: PortEnd | 'envelope' | 'bus'; // another port; or, by the routing rules, the room's envelope
  // (flue up, drain down) or the room's power or control bus
  flow?: 'forward' | 'reverse' | 'both';
  /** Optional: the line's whole length, metres, where it runs on beyond the room (a feed from the switch room). */
  length?: number;
  name?: string;
}
```

**Distance (the owner, 2026-10-23)** is an optional input, because a long line loses more and may need to be wider:

- **Power:** voltage drop grows with current and length. BS 7671 allows about 3% for lighting and 5% for other circuits, so a long feed needs a larger cable, and so a larger conduit.
- **Water:** friction loss grows with flow and length. A long main is widened to keep its loss, and the pump head it costs, within an allowance.
- **Gas:** the pressure drop from the meter to an appliance is limited to about 1 mbar, so a long gas run is widened.

A line routed port to port in the room knows its own length. A stub to the envelope, or a branch to the bus, runs on out of the room, and only the caller (in time, the plant network) knows its whole length, which it passes as `length`. The helper uses `length` if given, else the routed length. A caller never gives points for a functional line. If a route must go a certain way, the room's corridors and walls decide it, as `doc/plant-model.md` says.

**What the helper decides, in order:**

1. **Material and size** from the commodity and capacity (prompt 015's table): bore from flow at `sizing.ts`'s velocities (`dnFor`); conduit from current, after the On-Site Guide. Then the size is **checked against the line's length**, and widened a size at a time until the loss is within the allowance:
   - **power:** voltage drop by the cable's mV/A/m, after BS 7671 Appendix 4;
   - **water:** friction loss by Hazen–Williams or Darcy, against an allowance per line (for example 0.5 m of head on a pool main);
   - **gas:** pressure drop at most 1 mbar, meter to appliance.

   The resolved line records its loss and the allowance it met. Since the length comes after the route, the route is planned at the first size, and if the line is widened it is checked again for clashes.

2. **The route:**
   - by the commodity's rule (prompt 008): routed in full, port to port; a stub to the envelope (flue up, drain down to a gully with an air gap); or a branch to the room's bus (power, control);
   - a straight lead out of each port along its direction (`withPortLeads`);
   - square bends, at high level along the room's pipe corridors, clear of walkways below 2.1 m;
   - into the room only once for each supply (the one-supply rule).
3. **Supports** (`planSupports`, prompt 008).
4. **Marking** (prompt 015).
5. **Checks:**
   - `leavesPortsSquare`;
   - `pipeClashes` against the room's other lines;
   - the supports' problems.

   Any failure is returned as a problem, never silently drawn wrong.

**Routing** is the new part, and the hardest. Start simple and deterministic:

- an orthogonal route through a few candidate shapes: up to the run's corridor level, along, and down;
- the first candidate that passes the checks wins;
- failing all of them is a problem.

Not a general path-finder yet. Routes are planned per room, all of the room's lines together, so a later line routes round the earlier ones; order them by size, largest first.

## The order of work

1. Finish prompt 008's step 3 (drawing the supports, in progress) and step 4 (callers onto the supports).
2. Write the `LineRequest` and `ResolvedLine` types and `resolveLine`, with material, size and marking from prompt 015, and a fixed route given by the caller, as a bridge.
3. Add routing: stubs to the envelope, branches to the bus, port to port.
4. Move one room onto functional lines: the footbath plant room (`PL4`) first, the first slice the port-graph review chose. Then the other plant rooms, the wet hall and the boiler house.
5. The plant network (`src/game/plant/network/`) then issues the `LineRequest`s itself, from its links' media and ratings, so the rooms' lines come from the model.

## Who is doing what

- **Claude (this session)** does steps 1 to 4. It is working in:
  - `src/toolkit/components/core/logic/pipe-route.ts`;
  - `src/toolkit/components/core/views/pipe-kinds.ts` and `pipe-route.ts`;
  - `src/toolkit/components/plant/logic/pipe-supports.ts` and `views/pipe-supports.ts`;
  - `src/toolkit/gallery/logic/room-structure.ts`, `room-supports.ts`, `room-services.ts`, `room-pipes.ts`, `cabinet-pipes.ts`;
  - `src/toolkit/gallery/views/room-pipework.ts`, `cabinet-services.ts`, `room-services.ts` and `room-equipment.ts`;
  - new files under `src/toolkit/components/core/logic/` for lines and routing.

  Other agents should not edit these without saying so first.

- **Prompt 015** (lines and marking) becomes part of this work, unless the owner has given it to another agent. If so, that agent owns the media table and marking (`pipe-lines.ts`, `pipe-markers.ts`), and this work calls them.
- **The port-graph demo** (`src/game/plant/port-graph-demo.ts`, its routes and room), which is the other agent's, can move onto functional lines once step 3 lands; until then it should use `withPortLeads` and `pipeClashes` directly.

## Checks and rules

- Pure tests beside the logic (`vite-plus/test`):
  - every functional line in a migrated room resolves with no problems;
  - a long line is widened where a short one of the same capacity is not: a 100 A feed of 200 m gets a larger cable than one of 10 m (25 mm² carries 100 A and loses only 3 % over 80 m, so upsizing starts at about 133 m), and its voltage drop stays within 5%;
  - it leaves its ports square, clashes with nothing, and has its supports and marking;
  - an explicit pipe is drawn exactly as before.
- Before every commit run `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` and `npm run build`; commit only when all pass, verifying in a scratch copy when others' unfinished files break the shared checkout.
- Commit only named files, never `git add -A`; leave others' uncommitted work alone.
- `CHANGELOG.md` under Unreleased; a diary entry; Markdown one paragraph per line.

## Return path

Commits named `pipes(<step>): <what changed>`, pushed. Progress in `doc/reports/pipe-helper-progress.md`:

- each step done, partly done or not done, with commit hashes;
- the rooms migrated, and any line that resolved with problems.
