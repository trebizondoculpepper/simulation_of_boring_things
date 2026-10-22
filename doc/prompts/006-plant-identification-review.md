# Prompt: review the plant identification and object model design

You are being asked for a technical review, as a computer scientist, of a modelling design for this project (a browser game, "The Pool": a first-person simulation of a leisure centre's pool plant, TypeScript and Three.js, in this repository). We want your critique and your better ideas before we build it. Please do not implement anything. Read the files named below to check our claims against the code, and write your feedback to `doc/reports/plant-identification-review.md` (one paragraph per line, never hard-wrapped).

## 1. The problem

The game is only playable and meaningful if the player can work the plant the way a real operator does, and if the game can tell them how in the same terms a real operator's manual would. Today it cannot.

- **Procedures need named things.** A real operator's manual says "close PL4-MU-IV1, open PL4-PW-DV1, start PL4-CAB1-P1". Our draining runbook would otherwise have to say "the grey lever on the pipe behind the cabinet, second from the left", which is torturous and ambiguous.
- **Procedures need the things to exist in the simulation.** A backwash or a drain-down is a sequence of valves set in order, the "line-up". If a valve exists only as geometry, or only as a single flag in the model, the procedure cannot be carried out or tested. At present, draining a pool is one boolean per pool (`pool/drain-down`) with no valves behind it, and a backwash is a fixed daily volume subtracted from the water balance.
- **Everything the player can see as engineering must be real.** A project rule: every engineering item is a working component modelled on a real product, which has state, can be driven and shows its state. Many valves break this rule today.
- **Everything must be identifiable and documented.** Every valve, switch and control should carry a visible identifier, appear in an index, and have a description of what it is and why you would use it. The operator's manual (a generated PDF today, possibly a web page) should list everything by plant room as a hierarchical bill of parts.
- **We need tests that keep it so:** nothing untagged, nothing undescribed, nothing drawn that is not in the model, and nothing in the model that cannot be reached.

## 2. The current architecture

Check each of these against the code. Our account may be wrong in places, and we would like to know where.

**The world** (`src/game/world.ts`, about 340 lines) is the game's single state. It is a plain immutable object holding:

- `plant`: room feeders and isolators, from `src/game/plant/services.ts`;
- `pools`: per pool, the level, balance tank, chemistry and temperature (`src/game/plant/pools.ts`);
- `wetHall`, `gas`, `lighting`, `ambient` and others.

It changes in two ways. `applyAction(world, action)` handles discrete actions such as `plant/isolator`, `plant/feeder`, `pool/drain-down`, `gas/act` and `time/skip`. `advance(world, seconds, step)` integrates time. It is saved to localStorage with a version number (`WORLD_VERSION` 13) and a migration per version (`src/game/save.ts`), and run in the browser by `worldStore` (`src/toolkit/save/world-store.ts`), which offers a `world` signal and `dispatch(action)`. The pool water is hand-written lumped code: `src/game/water/water-balance.ts` is a pool and balance tank with weir overflow, main drains, make-up on a float, backwash, evaporation and drain-down, in about 5 s sub-steps. It is not built from blocks.

**The block tree** (`src/game/sim/blocks.ts`) is immutable blocks within blocks. Each has a `kind`, plain `state` and named `children`. Addresses are paths (`circulation/P-101/motor:running`), read and written by address. `src/game/sim/hydraulics.ts` solves a steady-state pipe network:

- nodes with optional fixed heads (reservoirs);
- links of kind `resistance`, `check`, `pump` (a quadratic curve) or `closed`;
- a small leak conductance (`SHUT`) that keeps dead ends well posed.

`src/game/plant/circulation.ts` builds the Olympic circuit from it: pump sets (each with suction valve, strainer, pump, motor, non-return valve and discharge valve), filter sets (filter, inlet valve, outlet valve), heat exchanger and UV. Valve blocks have an `open` fraction that becomes a link's resistance, or `closed`. It is only used by its tests. The world does not run it, and no room binds to it.

**The stepped system** (`src/game/sim/system.ts`, `block-kind.ts`, `composite.ts`) is a different block abstraction. A `BlockKind` declares typed input and output ports, params, `init`, `step` and an optional `read`. A `System` wires outputs to inputs and steps the blocks in Gauss–Seidel order, letting a block sleep while its inputs stay within a tolerance. Composites are blocks made of blocks. It is used by `src/game/plant/ozone.ts`, `gas-house.ts`, `electrical.ts`, `sampling.ts` and `src/toolkit/components/plant/logic/ozone-room.ts`, and only partly connected to the world.

**The room views** are Three.js scenes built per room. Plant-room pipework is laid out in pure logic, `src/toolkit/gallery/logic/room-pipes.ts`, where each `PipeRun` has a `name`, `service`, `label`, `joins` and `valves` (each valve with a `name` such as `F1 inlet valve`, a position and an operator). It is drawn by `src/toolkit/gallery/views/room-pipework.ts`. Interactive parts register "uses" (click handlers) through a part set (`src/toolkit/components/core/parts/parts.ts`). Some parts are bound to the world:

- an isolator's handle dispatches `plant/isolator`;
- each frame, the view reads `world.value` and sets the switch to match.

Many are not. The room-pipework butterfly valve (`src/toolkit/components/plant/views/water-butterfly-valve.ts`) toggles its own private `open`. Valves drawn inside machine models (`balance-plant.ts`, `pumps-plant.ts`, `dosing-equipment.ts`) are static geometry from `plantTools().butterflyValve`, with no state and no name.

**Other constraints:**

- `src/game/` and every `logic/` folder are pure: no DOM, no Three.js, tested beside them.
- All input goes through one control scheme.
- The game runs at frame rate in a browser and must stay light.
- Dev rooms show single components as exhibits, so one model part may be shown by several views at once: a dev-room exhibit, a plant-room machine and a control-room mimic.
- The manual is generated by `npm run manual` from `src/manual/` (LaTeX, with Graphviz schematics).

## 3. The proposed modelling solution

The owner's design, written up in `doc/plans/plant-identification.md`, with background research in `doc/research/plant-identification.md`. Read both.

**Hierarchical identity.** Only a parent (a machine, a cabinet, a room's pipework of one service) gets a tag. Its parts inherit the parent's identifier and add a short local code. Every identifier starts with its room. `PL4-CAB1-RV3` is plant room 4, cabinet 1, return valve 3. The codes follow a fixed vocabulary: room codes `PL1`–`PL4`, `BH`, `WH` and so on; parent type codes `P` pump set, `F` filter, `T` tank, `CAB` cabinet, `PW` the room's pool-water pipework; part codes `IV` isolating valve, `DV` drain valve, `NRV` non-return valve, `SW` switch, `PS` pipe segment. The room's pipework of each service is itself a parent, so valves between machines have a home: `PL4-PW-DV1`. This is a simplified cousin of KKS and IEC 81346 reference designations, which use a location aspect, a function aspect and a product aspect.

**Component classes.** Every component is one of three:

- **plant:** engineering things such as a filter, a pipe segment, a valve, an isolator or a gauge;
- **non-plant:** functional parts of the facility outside the engineering, such as a door's leaves or a card reader;
- **decorative:** set dressing, never inventoried.

**Kinds declare their parts once.** Each kind of component carries a part manifest. Each entry gives a local code, a class, a name, a purpose (why it is there and when you would use it), a normal state, and the part's own kind if it has parts of its own. Every instance inherits the list. Nobody names the parts of every cabinet by hand.

**One recursive walk.** A single function walks any block and yields every named part, with its full identifier, model address, class, name, purpose and normal state. Everything else uses it:

- room views, to bind each control to its part;
- the look-at text;
- the valve charts hung in each plant room;
- the hierarchical bill of parts and index, possibly served as a web page beside the game;
- the PDF manual;
- the tests.

**Valves are links in the hydraulic network.** Each plant circuit moves onto the block tree and hydraulic network. A valve's state sets its link's resistance, so a backwash or a drain-down is the flow following whatever route the valves leave open. It is not a special case. The world's per-pool drain-down flag goes away.

**Tests walk the tree.** They check:

- the codes follow the rules, and identifiers are unique;
- every part has a name and a purpose, and every valve and switch a normal state;
- a new world starts in the normal line-up;
- every workable control in a view is bound to a model part, and every workable model part has a control in some room;
- pipe segments join what the model says they join;
- every identifier a procedure names exists, and a procedure's line-up, played on the model, does what it claims (the backwash cleans the filter; the drain-down empties the pool);
- the bill of parts lists everything once.

**Pilot.** The footbath (`PL4`): its cabinet and its valves as working model parts, draining and refilling by real valves, its controls bound, and a first bill-of-parts page. Then the Olympic circuit, with backwash by valve line-up.

## 4. Why we think this is the right approach

- **It matches how real plants are identified.** Hierarchical, location-first designations are what operators use, and a tag tells you where to walk.
- **Naming scales with the number of kinds, not instances.** A cabinet kind is described once.
- **The model stays the single source of truth.** Views bind to addresses and hold none of the model, as the existing architecture already intends (`doc/plant-model.md`). The manual, the charts and the game cannot disagree.
- **Procedures become data.** They are testable against the model, and they become usable in-game, for example as checklists or as scenarios.
- **Most of the machinery exists:** the block tree with addresses, the hydraulic solver with closed links, and part sets with click handlers.

## 5. Catches we can already see

Please add to these, and tell us which are serious.

1. **Three model layers.** The lumped world water code, the stepped port-and-wire system, and the block tree with the hydraulic solver overlap. Does the design need one of them, a merge, or a bridge between them, and which should be the backbone? The stepped system has typed ports and sleeping; the block tree has addresses and the hydraulic solver.
2. **Steady-state hydraulics versus changing levels.** Draining is dynamic: tank and pool levels change the reservoir heads over hours to days. Re-solving the network every tick at frame rate, for several circuits, may be costly. Should levels be integrated outside the solve, with the solve run only when a valve or a level changes enough?
3. **Ill-posed line-ups.** A player can dead-head a pump, run one dry, shut every path or open a pool straight to the sewer. The solver must stay well posed (the `SHUT` leak helps), and the consequences (cavitation, loss of prime, overheating, low-low trips) need modelling, or at least detecting.
4. **Gravity and free-surface flow.** The weir overflow, the main drains to the tank and draining to the last few centimetres are open-channel or gravity flows, not pressurised pipe flow. How should they sit beside the network?
5. **Stable identity versus layout.** Codes numbered by position within a room (`P1`, `P2`) renumber if the layout changes. Saved games, procedures and the manual would then point at the wrong thing. Should identifiers be declared explicitly and kept, with a migration when they change?
6. **Saving the state of every part.** If every valve's position lives in the world, the save grows, and every new part needs a migration. Should we store only deviations from the normal state?
7. **Ownership ambiguity.** Is a valve at a machine's flange the machine's or the pipework's? Is a pipe passing through three rooms one part or three? The room-first rule mixes location with function; IEC 81346 keeps them as separate aspects for exactly this reason.
8. **Many views, one part.** The same model part may appear in a dev-room exhibit, a plant room and a mimic. Dev-room instances need identities that do not collide with the real plant's.
9. **Kind manifests with variants.** Instances of a kind differ (a cabinet with or without a heater). Manifests may need parameters or optional parts, and the walk must reflect what is actually there.
10. **Granularity of pipe segments.** If every pipe segment is a part, the identifiers multiply. What is the right grain: between fittings, between valves, or one per run?
11. **Binding cost and safety.** Views look up parts by string address each frame. Should there be typed handles, compile-time checks, or a precomputed index?
12. **Two modes of control.** Some state changes by actions (the player turns a valve), some by integration (a level changes). Where should a valve's position live: in the action-driven world state, or in block state that steps?

## 6. What we would like from you

- Is a hierarchical, kind-declared part tree with a recursive walk the right core abstraction? Compare it with alternatives you consider credible: an entity-component system with an identity component; a graph database of assets and connections (as in an asset-management system or an ISO 15926 or CFIHOS style data model); separate function, product and location trees as in IEC 81346; or a P&ID-first model where the schematic is the source and both the simulation and the 3D views are generated from it.
- How should the simulation be structured so valve line-ups are real: hydraulic network, lumped tanks, or a hybrid? Where should the boundary be, and how should it be stepped for a frame-rate game with time skips of hours?
- How would you unify or bridge the three existing model layers?
- How would you make identity stable across layout changes and save versions?
- How would you make the "everything is identified, described, modelled and reachable" property hold by construction (types, builders, registries) rather than only by tests? Which tests are still needed?
- Which of the catches above are serious, which are not, and what have we missed?
- A recommended design in outline, and the first step you would take. Keep the pilot (the footbath) in mind.

Be concrete. Cite files and functions where your point depends on the code, and say plainly where you think we are wrong.
