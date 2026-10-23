# Prompt: the plumber adds the valves and power isolators

Written by Claude (Opus 5.5, Claude Code) for its own work and so other agents know what it is doing, 2026-10-23. Read `AGENTS.md` first, then `doc/prompts/017-room-sizer-gantries-placement.md` (the room's four layers: sizer, regions, placement, plumber) and `doc/prompts/016-pipe-helper-two-ways.md` (the plumber's routing). This prompt is the first part of the plumber's work in prompt 017, step 5.

## Why

Valves and isolators sit in the pipes and cables, not on the floor. When Dev19 treated its five remote valves as floor machines, placement stood them on posts in the walkways, where no installer would put them, and the room grew to fit them. The owner's ruling (2026-10-23):

- **Sizing, reserving and placing are done without the valves.** They would be added anyway, and they take no floor space, so leaving them out of the optimisation loses almost nothing.
- **The plumber adds them.** It inserts them as new nodes in the port graph, wired in, splitting each link they sit on.
- **The plumber has an option for how valves are worked:**
  - prefer manual;
  - automatic where hard to reach;
  - all automatic.
- **Power isolators follow the same rule.** They are almost never part of the main plan. Each is something that interrupts a device's drop up to the power bus.

## What there is now (checked 2026-10-23)

- **Dev19's graph** (`src/game/plant/port-graph-demo.ts`, the other agent's model; leave its topology as it is): 24 nodes, built with `@statelyai/graph`. Ports are typed by medium: gas, flue, water, power, heat, control.
  - Its five remote valves (`remote-water-valve`, `remote-gas-valve`) and its motor breaker (`remote-breaker`) are designed nodes, with state and commands in the hand-written simulation (`createPortGraphDemo`).
  - The simulation checks connections against the base graph's edges directly (`connected(a, ap, b, bp)`).
- **Remote valves are drawn at real size** (`src/toolkit/components/plant/logic/remote-valve.ts`, commit 8c6adaa): ball valves sized to their line, with Belimo-sized actuators or a solenoid coil. Each stands on a floor stand as a placed exhibit.
- **Models that exist:**
  - a lever ball valve (`createGasBallValve`, `gas-fittings.ts`, along x, sized by pipe radius, clickable);
  - a lever or chain butterfly valve for DN50 and up (`createWaterButterflyValve`);
  - a real-size rotary power isolator, about 115 × 160 × 105 mm (`createPowerIsolator`, `panel-switchgear.ts`).

  There is no non-return valve model.

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
- within sight of the device, as BS 7671 expects for switching off for mechanical maintenance.

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
