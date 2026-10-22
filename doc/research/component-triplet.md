# Component triplet trial

One installed machine has one graph node and one stable ID. Three cooperating models describe it: the visual model owns meshes and clickable surfaces; the simulation model owns physical ports, ratings, transfers and conservation; the control model owns discrete modes, setpoints, display selection, alarms and button behavior. A panel reads the control model, which receives measured values from the simulation model. It must not run a second physical solver.

Control ports belong to the same graph node as physical ports but have a different contract. Each declares `control` medium, read or write access, a message value type and a unit. They are optional to wire: the local controls remain usable with no external connection. A remote controller may attach an output to a compatible input later. A readable temperature port cannot accept a write; a writable setpoint port cannot be read. `°C` and `g/h` are different message types at compile time and are checked again at runtime when the graph is loaded or a command arrives.

Dev19 demonstrates `demo.boiler.temperature` as a readable Celsius port and `demo.boiler.setpoint` as a writable Celsius port. The existing boiler panel changes the same control model, and the setpoint governs physical firing demand. The enlarged trial uses explicit mains gas, mains electricity and fresh-water boundary nodes. Its gas meter has gas inlet and outlet ports plus typed flow and accumulated-volume readings. The pool loop contains a pool, balance tank, pump, filter, treatment unit and plate heat exchanger; the primary boiler loop transfers heat into it. This small trial uses a project-owned `Quantity<Unit>` rather than a general units package; a broader units library would be useful only when the production solver needs unit conversion and dimensional arithmetic across many quantities. The generic machine-kind schema, persistence and migration into the saved world are still design work.

Dev19 has separate boiler and pool mimics. Graph control edges carry measured gas, electrical, thermal, water-quality and equipment status values to the boards; commands return to pumps, boiler, breaker and remote valves. The visual drops join a shared ceiling trunk, standing for a field data bus. The physical water, gas and power routes remain separate. The current bus is deliberately abstract: it does not model addresses, polling, packet loss or cable length.

## Ownership and data flow

| Model      | Owns                                                                                                                                                                                 | Does not own                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Visual     | Meshes, materials, labels, physical port anchors, hit targets, animation, sound and placement. It renders a supplied snapshot and sends player actions tagged with the installed ID. | Authoritative switch position, fuel, flow, temperature, energy or a private simulation clock. |
| Simulation | Physical ports, ratings, transfers, conservation, finite stores, losses and measured physical state.                                                                                 | Meshes, click handling, menu pages or a second copy of control-panel state.                   |
| Control    | Commands, local switches, modes, setpoints, interlocks, alarms, display pages and discrete transitions. It reads measurements and issues demands to the simulation model.            | A second gas, hydraulic, thermal or electrical solver.                                        |

The simulation and control states live in the one saved world. A room view can unload and rebuild without changing them. The render loop reads snapshots; it never advances the plant on its own. A passive functional item can have an empty control state. Pure set decoration is explicitly `decorative`, with no functional port, world command or implied plant connection.

```text
player action → visual hit target → installed ID + control command
                                → control state → simulation demand
graph + simulation state → measurements → control readout → visual snapshot
```

## Identity, parts and catalogue

One project-owned kind contract should declare the component's classification, physical ports, optional control ports, independently functional child parts, ratings, and three model adapters. An installed instance chooses its kind, permanent serial, current display tag, maker or `unbranded`, room, placement and parameters. Room and display tag can change without changing the serial or saved state.

A cabinet is a parent node with child nodes for parts that can be operated, measured, failed or individually named. Its external ports explicitly delegate to specific child ports, and internal connections stay within the assembly. `PL1.P1` can identify a pump, with `PL1.P1.SUCTION`, `PL1.P1.DISCHARGE` and `PL1.P1.INDICATOR` as addressable parts or ports. A cabinet return valve can be `PL4.CAB1.V_RET_1`. The visible plate can print the cabinet tag and a port can simply read `SUCTION`; the full graph address need not appear on every label. Hinges and bolts made only for visual detail need no nodes.

The catalogue should include `kind` (pump, valve, boiler, cabinet, fuse-isolator, sensor, etc.), `brand`, parent, room, permanent serial, current tag and functional/decorative classification. Existing `asset-NNNN`, `valve-NNNN`, feeder and saved-state IDs need a reviewed alias map. The [architecture review](../reports/port-graph-architecture-review.md) found real tag collisions, so an alias must never silently choose between two objects.

## Ports and connections

Physical connections join ports on machines. A visible port anchor names exactly one declared physical port. A required port connects to a compatible port or an explicit boundary node such as a finite fuel store, electrical source, water main, drain, outside air or flue sink. Each line declares its medium and design rating; the solver supplies live flow, pressure, temperature, current and other state. Installation direction is separate from signed live flow: backwash can reverse flow through a correctly installed filter.

The kind contract needs medium, role, direction, cardinality and unit-typed ratings. Pump suction cannot join pump suction; water cannot join acid; a current rating cannot be compared with a mass flow. Literal kind and port maps can reject authored mistakes in TypeScript. Build/load validation must also check completeness, numeric ratings, aliases, placement and dynamically assembled graphs.

Control ports are optional to connect, so local controls still work alone. Each declares one message type and unit plus read or write access. A boiler can publish `temperature: read<°C>` and accept `setpoint: write<°C>`; `g/h` cannot set that thermostat, and a write-only port cannot be read. A read port exposes a control-model status or a measured value obtained from simulation. A write port sends a command to the control model. Composite boundary control ports delegate explicitly to child controls or instruments.

One game abstraction can represent a multi-conductor electrical supply as a rated circuit. Drains may end at an unseen sewer and flues at an unseen stack. Data links may render as drops to a shared ceiling bus. These shortcuts retain explicit typed graph endpoints. A remote gas valve, water valve or breaker has separate process/power ports and command/status control ports. Remote switching still leaves a local lockable isolation function for maintenance.

## Production migration

### 1. Inventory and reconcile identities

Generate a per-room inventory of every visible engineering item, interactive part, port anchor, installed asset, installed valve, network node, saved-world address and catalogue entry. Mark real decoration explicitly. Resolve the known collisions, assign one permanent serial to each functional item and preserve old addresses through one checked alias map. A cabinet shell alone does not stand in for independently functional internal parts.

**Exit check:** no duplicate serial, ambiguous alias, orphan functional view or graph node lacking its intended placement. A 1:1 relationship holds between visible functional instances and installed graph/catalogue instances.

### 2. Define the reusable kind and instance contract

Create a project-owned registry of kinds with typed physical and control port maps, required/cardinality flags, ratings and units, child declarations and boundary-port delegation. Bind each kind to visual, simulation and control adapters under one installed ID. Keep room coordinates and maker on the installed instance, while operating limits normally come from the kind or model variant. Decoration has no functional adapter or port.

**Exit check:** compile-time negative examples reject wrong port names, directions, media, control access and units. Runtime fixtures reject missing connections, invalid ratings, duplicate placement and undelegated parent ports.

### 3. Bind world state and commands once

Store simulation and control state by permanent serial in `src/game/world.ts`; bump `WORLD_VERSION` and migrate existing saves using the alias map. Route visual actions and control-port writes through one command path. Publish immutable snapshots for views and control-port reads. Bind sensors, gauges, mimics, lamps, recorders and local panels to these snapshots. Moving a valve must change solved flow, not only its saved handle position.

**Exit check:** moving a machine between rooms preserves its state; unloading its room does not stop it; local and remote panels agree; operating a valve changes downstream flow and instruments.

### 4. Migrate complete functional slices

Use dev19's boiler, tank, pump, valves, breaker and mimic as the contract pilot. Then migrate one production slice, preferably the footbath cabinet and its plant-room supply path: it exercises a composite, local controls, valves, readouts and world state. Continue by plant circuit: each pool's pumps, balance tank, filters, dosing, heating, quality instruments and pool, then shared gas, electrical, air, chemical, drain and control systems. Reuse the existing 3D views. Temporary adapters may bridge old blocks and saved addresses until a complete circuit passes the new contract.

**Exit check for each slice:** every visible functional part has one instance; every drawn port resolves to a declared port; required physical ports connect; controls change simulation state; indicators follow simulation state; persistence and room transitions work.

### 5. Make validation a normal build gate

Run the registry and installed-graph validator in tests and development builds. Report problems by room, tag, port and reason. Check topology, control compatibility, part delegation, catalogue coverage, visual anchors and route coverage separately. Add a headless behavior test per kind and representative room tests for network effects and save migration. Renderer checks still cover placement and clipping, which topology tests cannot prove.

**Completion condition:** the generated full-site report has no unbound functional component, missing required physical connection, control or indicator without a valid target, unaccounted visible port, or ambiguous identity. Deliberately virtual boundaries and decorative items are listed so they are counted honestly.

## Current limits and decisions

Dev19 has an isolated graph and hard-coded kind and mimic dispatch. It does not yet migrate production saves or guarantee that every existing component has a graph node. `@statelyai/graph` can remain an export and traversal tool; it does not enforce this contract's domain rules. The project-owned registry and validator must do that work.

Before production migration, decide the permanent serial format and alias policy; initial medium, role and rating vocabulary; which controls become child nodes; and fault, movement, power-loss and energy behavior for remote actuators. Measure validation and stepping cost on the full plant, validating frozen installation data at build time and stepping only live state at runtime.

Related documents: [plant model](../plant-model.md), [part naming](../plans/part-naming.md), [plant identification plan](../plans/plant-identification.md) and [physical quantities](port-graph-physical-quantities.md).
