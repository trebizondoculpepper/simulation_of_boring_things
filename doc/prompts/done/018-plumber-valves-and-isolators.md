# Prompt: the plumber adds the valves and power isolators

## Review checkpoint — 2026-10-26

**Classification:** Complete. **Filed:** `doc/prompts/done/018-plumber-valves-and-isolators.md`.

**Delivered:** The original delivered implementation/report is recorded in the finished index.

**Still outstanding:** None newly identified within the archived scope.

**Evidence:** `plumbing-expansion.ts`, `inline-placement.ts`, `inline-fittings.ts`; `a2dbf66`, `d3e6d87`, `d1a5c22` (2026-10-23).. Reviewed against source `e5078c4`.

The original request and earlier implementation notes below are retained as history; this checkpoint supersedes any conflicting old completion claims. Outstanding work remains open in the root TODO.

Written by Claude (Opus 5.5, Claude Code) for its own work and so other agents know what it is doing, 2026-10-23. Read `AGENTS.md` first, then `doc/prompts/done/017-room-sizer-gantries-placement.md` (the room's four layers: sizer, regions, placement, plumber) and `doc/prompts/obsolete/016-pipe-helper-two-ways.md` (the plumber's routing). This prompt is the first part of the plumber's work in prompt 017, step 5.

## Why

Valves and isolators sit in the pipes and cables, not on the floor. When Dev19 treated its five remote valves as floor machines, placement stood them on posts in the walkways, where no installer would put them, and the room grew to fit them. The owner's ruling (2026-10-23):

- **Sizing, reserving and placing are done without the valves.** They would be added anyway, and they take no floor space, so leaving them out of the optimisation loses almost nothing.
- **The plumber adds them.** It inserts them as new nodes in the port graph, wired in, splitting each link they sit on.
- **The plumber has an option for how valves are worked:**
  - prefer manual;
  - automatic where hard to reach;
  - all automatic.
- **Power isolators follow the same rule.** They are almost never part of the main plan. Each is something that interrupts a device's drop up to the power bus.

## Revision: Codex's review and the Dev19 experiment (2026-10-23)

Codex reviewed the first version of this prompt (read-only, 12 findings). The owner then had both rule sets built side by side: Dev19b (`?room=dev19b`) with Codex's rules on the old overhead lanes, and Dev19 with the rules below (commit a2dbf66 and after). **This section overrides anything below that disagrees with it.**

**The rules adopted** (`ADOPTED_RULES` in `src/toolkit/gallery/logic/port-graph-demo-routes.ts`):

- **Non-return valves only where the circuit needs one,** not on every pump's discharge. Dev19's pumps are single pumps with flooded suction, so none needs one. Where one is needed, the usual order on a discharge is pump, non-return valve, isolating valve (Grundfos's guidance).
- **Power isolators follow the powered equipment, not the feed.** Every powered device that is not itself switchgear gets an isolator in its last feed, wherever that feed comes from, so the boiler beyond its motor breaker has one too.
- **BS 7671, stated correctly.** An isolator for mechanical maintenance must be suitable, clearly identified and securable in the off position (lockable), unless it stays under the worker's own control. "Within sight of the device" is our design preference, not the regulation's requirement (IET, Wiring Matters, March 2023).
- **Reach is from somewhere to stand.** A fitting is reachable if its operating height is between 0.5 and 1.8 m and there is clear floor (not a machine, not within 0.3 m of a wall) within arm's reach, 0.8 m. It must also be clear of fittings already set into other lines.
- **Out of reach means reported, not installed.** A fitting that cannot be set where someone can reach it is reported as a problem and not drawn. A designed valve (Dev19's remote valves) is still drawn, and reported.
- **Reachable ends.** A line leaves a machine first along a straight at the port's height, when that height is within reach, long enough for the fittings at that end. Only then does it climb to the overhead lanes. This is what lets every isolator in Dev19 be reached; Dev19b, on the old lanes, loses its pool mimic's isolator.

**Magic terminals** (the owner, 2026-10-23). A line is never left unterminated. Where it goes out of the room (a flue or vent through the roof, a drain to a gully), it ends at a magic terminal. The terminal is a node of the model whose port the plumber works out: the point where the line's most direct route meets the ceiling (or, for a drain, the floor at a gully). Reaching it terminates the line, and the plumber checks that route against the reserved regions, reporting any crossing. Dev19's stack is a ceiling terminal (`MAGIC_TERMINALS`), drawn as a roof collar. The power and control buses are the same idea for cables.

**Codex's other findings, to settle as the work goes on:**

- **Expansion is a deterministic derivation from the base graph only.** It must reject its own output as input (detect generated fittings), not merely be repeatable.
- **Identities can collide** if two links share one port. Validate one connection per isolated port, or add a discriminator; detect collisions. Dev19's `demo.*` fittings do not enter the permanent serial register (`serials.ts` holds plant IDs only).
- **The state owner.** Dev19's simulation owns its own `DemoState`, not `World`. The fittings' states belong there first, with read and command functions and defaults. Moving them to `World` needs a `WORLD_VERSION` bump and a migration.
- **An adapter between Dev19's graph and the expansion,** in both directions. Kinds live in `node.data.kind` and media on ports; the adapter generates port definitions for the fittings and validates the expanded graph.
- **Orientation is product-specific.** Belimo's actuators may sit on their side but never upside down. Choose a permitted orientation that clears the neighbouring services.
- **Removal envelopes.** Reserve each device's face-to-face length and the space to remove it, not just its length.
- **Bend clearance.** `JOINT_LENGTHS` are stock pipe lengths, not bend clearances. Use the bend and joint fitting geometry from `pipe-route.ts`.
- **A non-return valve model exists:** a dual-plate check valve, drawn in `pipework.ts` (around line 288). What is missing is a reusable inline component.
- **Drains and vents** (prompt 017) are deferred to the next stage of this work, with the floor terminal.

## The bound room: the expanded graph is the graph (the owner, 2026-10-23)

The fittings the plumber adds are real nodes of the port graph, bound to the controls drawn for them. **The plumber hands the next stage a room in a fully bound state, and the graph the game runs is the expanded graph.**

1. **Sizer, regions and placement** work on the base graph's machines.
2. **The plumber** expands the graph, routes the lines and sets the fittings. It returns a bound room:
   - the expanded graph, built and validated like the base one, with each added fitting given ports `in` and `out` in its line's medium;
   - each node's place: machines from placement, inline devices from their routes;
   - each node's visual part, and its controls (lever, handle, actuator) bound to that node's state.

   A fitting the plumber leaves out (out of reach) is not in the expanded graph.

3. **The simulation is created from the bound room's graph.** Flow and power pass through each node by what it is:
   - an isolating valve passes when open;
   - a power isolator passes when on;
   - a non-return valve passes one way;
   - a remote valve passes when its actuator has it open.

   "Is A connected to B" becomes "can A reach B along the line, through nodes that are all passing", not "is there a direct edge".

**Consequences for Dev19:**

- `createPortGraphDemo` takes the graph it runs, instead of closing over the module's `demoGraph`, and is created when the room is built, after plumbing, not when the module loads. Its `connected(a, ap, b, bp)` becomes a walk along the expanded graph through passing nodes.
- The fittings' states live in `DemoState`, keyed by node identity, all open and on by default, with a command to set each one.
- The base `demoGraph` stays the designed plan, and the expansion never edits it.
- **Dev19's graph and simulation are the other agent's** (GPT-6 Codex). This change to `src/game/plant/port-graph-demo.ts` is made by Claude at the owner's direction. Its topology and behaviour are otherwise unchanged, and its existing tests must keep passing. The mailbox was not configured for this session, so this prompt is the notice.

## What there was at the start (checked 2026-10-23, before the revision)

- **Dev19's graph** (`src/game/plant/port-graph-demo.ts`, the other agent's model; leave its topology as it is): 24 nodes, built with `@statelyai/graph`. Ports are typed by medium: gas, flue, water, power, heat, control.
  - Its five remote valves (`remote-water-valve`, `remote-gas-valve`) and its motor breaker (`remote-breaker`) are designed nodes, with state and commands in the hand-written simulation (`createPortGraphDemo`).
  - The simulation checks connections against the base graph's edges directly (`connected(a, ap, b, bp)`).
- **Remote valves are drawn at real size** (`src/toolkit/components/plant/logic/remote-valve.ts`, commit 8c6adaa): ball valves sized to their line, with Belimo-sized actuators or a solenoid coil. Each stands on a floor stand as a placed exhibit.
- **Models that exist:**
  - a lever ball valve (`createGasBallValve`, `gas-fittings.ts`, along x, sized by pipe radius, clickable);
  - a lever or chain butterfly valve for DN50 and up (`createWaterButterflyValve`);
  - a real-size rotary power isolator, about 115 × 160 × 105 mm (`createPowerIsolator`, `panel-switchgear.ts`).

  (Codex: a dual-plate check valve is already drawn in `pipework.ts`.)

- **Routes:** Dev19's routes are still the old lanes (`demoServiceRoutes`): out of each port, up to a lane at 2.15–3.65 m, along, and down. The new router (prompt 016 step 3) is not written yet.
- **A first draft of the expansion** is in `src/game/plant/plumbing-expansion.ts`. It is untested and uncommitted. It is described below.

## The design

### 1. Expansion: a derived, plumbed graph (pure)

`expandForPlumbing(nodes, edges, options) → { nodes, edges, fittings, along }`, in `src/game/plant/`.

**The rules:**

- An isolating valve at each water connection of a pump, filter, heat exchanger or strainer.
- A non-return valve on each pump's discharge, between the pump and its isolator.
- A power isolator in each feed from a supply to a device that is not itself switchgear. Dev19's motor breaker keeps its own feed, but the boiler beyond it does get an isolator.

**Derived, never edited.** The expanded graph is built fresh from the base graph each time:

- expanding twice gives the same result, with no duplicates;
- the base graph is never mutated.

**Identities come from the network:**

- the form is `<node>.<port>.<iso|nrv|isolator>`, for example `demo.poolPump.discharge.nrv`;
- serial numbers come from the serial register (`src/game/plant/network/serial-register.ts`), looked up by that identity;
- so a relayout changes no identity and loses no saved state.

**Splitting.** Each affected link `e` becomes `e#0`, `e#1`, … through its fittings in order from source to target. Each fitting has ports `in` and `out`, and the medium of its link. `along` maps each base link to its fittings in that order, which is what the drawing needs.

**Designed inline nodes.** Dev19's remote valves are already nodes in the base graph. They are marked inline (a `PlaceItem.inline` flag, or a set of kinds), so placement skips them and the plumber positions them the same way as added fittings. They are not added again.

### 2. Placing inline devices on routes (pure)

`placeInline(route, devices, options)`, in a `logic/` folder. `route` is a polyline from one port to the other. `devices` are the inline devices on that link, in order, each with its length along the pipe and which end it belongs near.

- **Reach:** a device is reachable if its operating point (handle, wheel or actuator) is between 0.5 and 1.8 m above the floor, or above the gantry's deck where it runs over the gantry.
- **Search:**
  - start from the end each device belongs near, and walk along the route;
  - take the first straight that is long enough, past the port's lead and any bend's fitting (`portLead`, `JOINT_LENGTHS`), and reachable;
  - keep at least one pipe diameter between fittings;
  - a device near the source sits closer to the source than any device near the target, and order is kept.
- **Unreachable:** if no reachable straight exists, take the nearest straight anyway, mark the device unreachable, and record a problem. Never put a device inside a bend or a port's lead.
- **Orientation:**
  - on a horizontal straight, an actuator, handle or coil goes on top, never underneath (it would collect drips);
  - on a vertical straight, the actuator faces away from the nearest wall, into the room, so it can be lifted off.
- **Output:** each device's centre, its axis along the pipe, its up or out direction, whether it is reachable, and the two pieces of route either side of it. Those pieces become the split links' runs.

### 3. How each valve is worked

`operatorFor(fitting, reachable, option) → 'hand' | 'chain' | 'motor' | 'self' | 'solenoid'`:

| Option                          | Reachable | Not reachable                             |
| ------------------------------- | --------- | ----------------------------------------- |
| `prefer-manual`                 | hand      | chain wheel (a hand chain from the floor) |
| `automatic-where-hard-to-reach` | hand      | motor                                     |
| `all-automatic`                 | motor     | motor                                     |

Fixed whatever the option:

- a non-return valve works itself;
- a gas safety shut-off is a solenoid;
- a power isolator is a switch worked by hand.

The option is set per room or per attraction, so automation varies across the plant, as the owner wants (Olympic partly automatic, Lounge mostly manual). A motor-worked valve gets a power drop from the nearest power bus, with its own power isolator, and a control stub to the control bus.

### 4. Power isolators on drops

A device's power drop runs from the power bus down to its terminal box. The isolator sits on that drop:

- at a reachable height (1.2 to 1.6 m), on the wall or a stand next to the device;
- or on the device's own frame if it has one;
- within sight of the device, by preference. BS 7671 asks that it be suitable, clearly identified and lockable off; see the revision above.

It is drawn with `createPowerIsolator`, real size, and interrupts the conduit: bus, conduit, isolator, conduit, device.

### 5. Drawing

- **Hand valves:** the lever ball valve, sized to the pipe. Lever colour by medium: yellow for gas, red for heating, blue for water.
- **Chain wheel:** a ball or butterfly valve with a chain wheel and a chain loop down to about 1 m above the floor.
- **Motor:** the real-size remote valve (`remote-valve.ts`) without its floor stand.
- **Non-return valve:** a new small model, a body sized to the pipe with a cast flow arrow on it.
- **Power isolator:** `createPowerIsolator`.

Each is clickable where it is worked, and bound to its state.

### 6. The simulation

Dev19's simulation keeps running on the base graph for now. Each base link carries the states of its fittings:

- a link carries flow only while every isolating valve on it is open;
- a device is powered only while its isolator is on.

The fittings' states live in the world state (`src/game/world.ts`), keyed by their network identity. Dev19 starts fresh, so no migration is needed there.

Moving the simulation onto the expanded graph itself is a later step, with prompt 012's network solver.

## Order of work

1. Test and commit `expandForPlumbing`:
   - rules;
   - idempotence;
   - stable identities;
   - order along a link;
   - no fitting on a switchgear feed.
2. `operatorFor`, tested against the table.
3. `placeInline`, tested on hand-made routes:
   - horizontal and vertical straights;
   - several devices on one link;
   - nothing reachable;
   - order kept;
   - never in a lead or bend.
4. Dev19:
   - mark the remote valves inline and take them out of placement;
   - route each link through its inline devices (the old lanes until the new router lands), place them, and split the runs;
   - draw the added fittings and the moved remote valves;
   - the actuation option set in Dev19's room data (start with `automatic-where-hard-to-reach`);
   - screenshots to the owner.
5. The simulation honours the isolators' states (section 6).

## Who is doing what

- **Claude (this session)** does this work, in:
  - `src/game/plant/plumbing-expansion.ts` and new `logic/` files;
  - `port-graph-demo-routes.ts`, `plant-room-layout.ts`, `machine-placement.ts`;
  - Dev19's room view.
- **Dev19's graph and simulation belong to the other agent (GPT-6 Codex).** Change them only as section 6 needs, and say so on the mailbox first.

## Checks and rules

- Pure tests beside the logic (`vite-plus/test`).
- Before every commit run `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` and `npm run build`. Commit only when all pass.
- Commit only named files, never `git add -A`; leave others' uncommitted work alone.
- `CHANGELOG.md` under Unreleased; a diary entry; Markdown one paragraph per line.

## Return path

Commits named `plumber(<step>): <what changed>`, pushed. Progress goes in `doc/reports/room-layout-progress.md`, under step 5.
