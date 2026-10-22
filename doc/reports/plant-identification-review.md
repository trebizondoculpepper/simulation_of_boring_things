GPT-6.1-sol (Codex, repository review), 2026-10-22 UTC.

## Verdict

Sound with substantial changes. A stable, inspectable asset catalogue linked to a flow graph is the right direction, but the proposed recursive block walk conflates physical identity, containment, simulation state, and connectivity; it cannot alone make an open-ended plant or make every visible control real. Make one installed-asset definition authoritative, keep identities independent of room and layout, and bridge a small hydraulic pilot into the existing world before expanding the catalogue.

## Recommendations

R1. Separate an installed asset's permanent identity from its displayed tag, location, function, model address, and view placement. Declare an immutable asset ID such as `footbath.makeup.isolator` once per installation; store `PL4-MU-IV1` as an explicit, unique, changeable designation with aliases for old tags. `doc/plans/plant-identification.md` currently derives identity from room and position, and `src/manual/logic/boiler-house.ts` already assigns schedule tags from `placed.map((p, i) => ...)`, so moving an item silently renumbers the manual. A room-first tag is useful wayfinding, but must be a label, not the save key or the connection key. This touches a new pure asset-definition module, `src/game/save.ts`, room layout data, and manual gathering.

R2. Make the installed topology a typed graph of ports, links, junctions, boundaries, and physical assets; make containment and placement separate relations. A containment tree is excellent for the bill of parts but cannot represent a pipe crossing rooms, a shared header, or one valve between two machines without arbitrary ownership. `src/game/plant/circulation.ts` has fixed `PIPES` and graph nodes alongside its `Block` hierarchy, while `src/toolkit/gallery/logic/room-pipes.ts` has a different `joins` graph; these are presently independent sources of truth. Use one graph to compile both the hydraulic network and a schematic/connection contract for the view, with intentionally authored 3D routes attached to graph link IDs. Do not require procedural generation of all geometry from the P&ID.

R3. Choose `World` as the owner of persistent dynamic state and player actions, with one hydraulic solve used as a derived flow calculation, and treat `BlockKind`/`System` as an optional way to implement complex devices. The two existing block abstractions are incompatible: `src/game/sim/blocks.ts` has `kind`, arbitrary `state`, `children` and string-address writes, while `src/game/sim/block-kind.ts` declares typed ports and stepping but has no asset identity or manifest. Neither should be copied into every valve merely to produce an inventory. Introduce a small adapter from stable asset ID to world state and typed control commands; gradually replace the lumped flow terms in `src/game/plant/pools.ts`, rather than maintaining two authoritative circulation states.

R4. Pilot one physically credible footbath line-up before promising arbitrary procedures: the pool, balance tank, make-up source, pump(s), returns, waste boundary and valves must have actual port connections, flow direction, capacities, and interlocks. `src/game/water/water-balance.ts` currently gives backwash a daily subtraction and drain-down a flag; `src/game/plant/circulation.ts` models neither a backwash route nor a drain route. First prove mass balance and zero unintended flow with the valve line-up; then add contamination, filter loading, differential pressure, rinse and automatic sequencing. A named control with no causal model is still a prop.

R5. Define controls as commands on assets, with an explicit actor (`player` or controller), authorization/precondition, target, and result; do not let a controller mutate a valve field by a privileged shortcut. Manual and automatic backwash then share the same actuator and faults, while permissions and interlocks can differ. This belongs at the `WorldAction`/asset-command boundary in `src/game/world.ts` and applies to the view callbacks in `src/toolkit/gallery/views/room-pipework.ts`; `createWaterButterflyValve` currently toggles a private boolean in `src/toolkit/components/plant/views/water-butterfly-valve.ts`.

R6. Put normal configuration and kind capabilities in immutable definitions, but put instance-specific state and documented differences on the installed asset. A cabinet kind can describe candidate ports and parts; the actual instance must enumerate selected modules and own stable IDs for its valves, switches and sensors. Generate a catalogue and view-binding index from the same validated installation, with explicit typed states/units per component. `BlockKind`'s `kind: string`, `PortValues`' primitive union and `blocks.ts`' arbitrary `write(..., value: unknown)` do not currently enforce these contracts.

R7. Replace the absolute promise that “everything visible as engineering is a working component” with an enforceable classification of operational controls, passive physical items, sensors/indicators, and cosmetic detail. Pipes, labels and fixed fittings should be identifiable and connected where relevant, but need not each have independent mutable state or click actions; check valves and gauges cannot be “worked” as manual valves can. A visual component factory should require an asset/view binding for an operable control, and an explicit cosmetic exception for a non-operational detail. This keeps `src/toolkit/components/plant/views/plant-tools.ts` from silently creating a lever that is only geometry without forcing every bolt into the world.

R8. Make procedures declarative only for their machine-checkable parts: referenced asset IDs, required initial conditions, intended valve positions, expected flow/state predicates, timeouts and alarm outcomes. Human-readable instructions still need authored wording, safety context, alternative paths and explanations. Test actions through `applyAction` and `advance` rather than writing block fields, and test a negative line-up as well as the success path. The proposed generic “new procedure needs no new machinery” holds only when the installed ports, sensors and dynamics already support it.

R9. Reject or quarantine non-converged hydraulic solutions and distinguish numerical leakage from physical flow. `solveNetwork` returns `converged` but `solveCirculation` consumes flows unconditionally (`src/game/sim/hydraulics.ts`, `src/game/plant/circulation.ts`). `SHUT` deliberately passes a small flow through a closed link; that is useful numerically but must not drain, clean or dose anything. Detect disconnected components, zero-flow/dead-head states and cavitation/low-level conditions explicitly, then surface faults and trip effects in the world.

R10. Introduce a simulation scheduler with bounded substeps, event boundaries and conservation checks before wiring a hydraulic solve into every frame. `advance` currently loops at `STEP = 0.1` seconds (`src/game/world.ts`), so a one-hour skip performs 36,000 world steps, each calling pool water integration; adding a Newton solve to every step would be costly. Solve when topology, pump state or boundary head changes materially, reuse a converged state as the next initial guess, and integrate storage volumes at a slower adaptive rate while preserving discrete timer/threshold events.

R11. Treat the “manual from the model” claim precisely: schedules, tags, topology and normal states can be generated, while approved procedures and safety wording remain authored and versioned. `src/manual/logic/boiler-house.ts` already contains authored explanatory paragraphs and derives tags from layout, so the PDF does not presently follow one asset truth. Validate generated facts against the asset graph and reference procedures by stable IDs, rendering current display tags at publication time.

R12. Add a validation pipeline that builds one installed plant definition and refuses duplicate IDs/tags, missing kind data, invalid ports/units, unconnected required ports, absent operational bindings, and references to missing assets before either game or manual runs. Keep tests for dynamic reachability, rendered labels, save migration, line-ups, mass balance and time-skip equivalence; types alone cannot prove a mesh is legible, a player can reach a chain wheel, or a controller can backwash a dirty filter safely. `src/toolkit/components/core/parts/parts.ts` currently permits unbound local behaviour by design, so a blanket test on every `Part` would misclassify development exhibits and set dressing.

## The catches

1. **Serious.** The lumped `World` is live, `blocks.ts` plus `circulation.ts` is test-only, and `System` is another execution model; pick one persisted state owner and explicitly bridge device models and the network into it (R3), rather than merging three schemas at once.

2. **Serious.** Dynamic heads and storage volumes require a coupled but multirate calculation; solving on every 0.1-second world step and every hour-long skip is the wrong cost model (R10). Test flow conservation and step-size sensitivity, especially when a tank empties or a valve changes.

3. **Serious.** The solver's numerical regularization does not model damage or trips. Dead heading, suction starvation, reverse flow, a disconnected network and failed convergence require explicit diagnostics and deterministic consequences (R9).

4. **Serious.** The pressurized circuit is not a complete pool water model. Keep weir and gravity/free-surface relations as directed boundary flows into storage nodes, and couple their volumes to the network by conservation; do not pretend a submerged drain and an overflowing gutter obey the same link law (`water-balance.ts`, R4).

5. **Serious.** A room- and order-derived string is an unstable primary key. Declare a permanent instance ID, explicit displayed tag and old-tag aliases, and migrate state by ID when a component is genuinely replaced (R1).

6. **Manageable.** A few hundred valve positions are small for localStorage; correctness matters more than bytes. Store a versioned snapshot with validated defaults and explicit migrations when semantics change. A deviation-only save is possible later, but must pin the definition revision or changed “normal” positions will reinterpret old saves (`src/game/save.ts`).

7. **Serious.** Ownership cannot be inferred from proximity or flange position. Define a documented installation boundary for each assembly, with explicit cross-room graph links and separate location/function/product aspects (R2); a pipe run's location may be a set of rooms.

8. **Manageable.** Dev exhibits should use a sandbox namespace or disposable instances with IDs distinct from installed assets, while mimics and plant views refer to one installed ID. A model may have several views, but only one authoritative live state (R1, R5).

9. **Manageable.** Kind templates need typed parameters and variant rules, but a recursive walk must traverse the installed instance, not a kind's maximum possible parts. Stable IDs must be declared for selected parts (R6).

10. **Manageable.** Give identifiers to hydraulic links and line sections that have a distinct specification, isolation boundary or maintenance/documentation role; render elbows and straight mesh segments as geometry of that link. Do not assign an asset ID to every visual segment (R2, R7).

11. **Manageable.** Build and validate an ID-to-handle index once per installed graph, and subscribe views to relevant state rather than parsing arbitrary strings each frame. Runtime validation remains necessary because TypeScript cannot prove content assembled from records or saves is sound (`blocks.ts`, R6, R12).

12. **Serious.** There should be one valve-position state, in the persisted world, changed by a common command path. A controller may request movement and an actuator may take time or fail, so commanded and actual positions may be separate fields, but neither belongs solely in a view or a parallel block tree (R3, R5).

13. **Serious.** The proposed scope “any conceivable process” has no finite completeness test. Define supported physical subsystems and operations, then extend compositional coverage; new processes may require new pipes, sensors, actuators, hazards or chemistry that no identity scheme can invent (R4, R8).

14. **Serious.** A visual valve can be unreachable despite being in the scene, obscured by equipment, above reach, or behind a locked door. Geometry/collision, access state and visibility need integration tests or targeted scene checks; a catalogue walk alone cannot establish operability (R12).

15. **Serious.** Model-to-view drift exists in both directions: the circulation `PIPES` graph and room `PipeRun.joins` are separate, while static machine valves can appear without model parts. Validate port/link IDs at render assembly and require a binding or an explicit cosmetic classification (R2, R7).

16. **Manageable.** Several “normal” states may be legitimate: normal running, shutdown, maintenance and backwash. Store a named operating configuration and a safe startup state rather than one universal normal for every valve; documents and tests should say which mode they mean (R6, R8).

17. **Serious.** Observability limits diagnosis. An operator can infer filter condition only from modeled inlet/outlet pressure indications, flow and alarm behaviour; giving the procedure direct access to hidden `clog` or solver state would make a technically functional system unplayable (R4, R8).

18. **Manageable.** Units and sign conventions are presently mostly numbers and strings (`PortValues`, `NetLink`, `PipeRun`). Reject mismatched media, units, pressure reference and flow direction at installation-build time, and test conversions at the hydraulic/storage boundary (R6, R12).

## Answers to section 6

1. It supports open-ended combinations only within a finite installed topology and implemented dynamics. A stable asset catalogue lets a procedure name a valve; it does not make an unmodeled drain route, chlorine reaction, actuator failure or safe-isolation rule exist. The strongest first demonstration is two different correct line-ups from the same footbath hardware plus an incorrect line-up whose consequence is observable.

2. Use the hierarchical walk as a catalogue projection, not the sole core abstraction. An ECS would be useful if this were a very large dynamic population, but this is a small fixed installation and ECS adds indirection without solving topology or identity. An asset graph with stable IDs, typed ports and containment/location/function relations is the best fit; IEC 81346's separate aspects are a useful conceptual model while the period-appropriate room-first string remains a display tag. A P&ID-first source is attractive for connectivity and documents, but cannot automatically determine believable 3D routing, access, behaviour or fault dynamics. ISO 15926/CFIHOS-style interchange is unnecessary complexity for this game; borrow their explicit relationships and provenance, not their full schemas.

3. Use a hybrid. The hydraulic graph solves pressurized flows and pressures from current valve/actuator positions, pump curves, losses and boundary heads; storage nodes integrate pool and tank volumes, and weir/gravity laws feed those stores. Re-solve after topology or equipment events and when heads cross a tolerance; integrate with bounded, event-aware steps. A time skip advances the same model as live play, in larger safe intervals and with conservation checks, not a separate shortcut rule.

4. Keep `World`/`applyAction`/`advance` as the orchestration and save boundary. Add an installed asset graph and a state table keyed by immutable asset IDs, compile a hydraulic graph from that definition and current state, and let stepped `BlockKind` models serve selected controllers or devices through an adapter. Retire the separate `blocks.ts` state tree after its graph/identity ideas have migrated, or use it only as a read-only catalogue projection; never let it and `World` both own the same valve. Start by routing one footbath valve action through the adapter and showing its effect on one world reading.

5. Give each installed asset an immutable internal ID allocated explicitly, not from array order, position or the current tag. Store state by this ID; keep current and historical display designations separately. A moved asset changes its location relation and perhaps its plate, not its ID; replacement is a new ID with an explicit migration policy. Version both installation definitions and saves, test old saves, and avoid `fillDefaults` silently accepting a changed meaning under an unchanged field name (`src/game/save.ts`).

6. Builders can require typed IDs, kind metadata, port definitions, selected child parts and state schemas, and a `placeOperable(assetId, viewFactory)` API can make an unbound lever impossible in production room assembly. A build-time validator can reject missing references and duplicate tags before drawing a room or producing the manual. Still test scene presence/legibility, control reachability, actual state updates, line-up outcomes, conservation, non-convergence handling and migration. Production and dev-room builders should be distinct so an exhibit's intentionally local state is not reported as an installed plant defect.

7. Catches 1–5, 7, 12–15 and 17 are serious because they threaten a single truth or the player's ability to perform a procedure; 6, 8–11, 16 and 18 are manageable with explicit schemas and validation. The most consequential omission is finite physical scope: the design must state which operations the plant can actually support. A second omission is failure and feedback modelling, including the difference between a controller command and the actuator's actual position.

## Recommended design and first step

Define an immutable `InstalledPlant` in pure `src/game/plant/` data: asset instances with permanent IDs and kind/variant specifications; typed ports and connections; explicit containment, location and function relations; selected part IDs; display tags with aliases; normal modes; and separate authored 3D placement/routes. Validate it once, then derive an indexed catalogue, hydraulic graph, scene binding contracts and manual facts. Keep `World` as the persisted state and action coordinator, with hydraulic results as derived readings and optional stepped device controllers as adapters. The first change should be a footbath-only vertical slice: inventory the existing cabinet and pipework against actual port IDs, choose one make-up/drain isolator with a permanent ID, bind its visible lever to a world action, make the water balance respond to the real line-up, and test mass conservation plus the absence of the old direct `pool/drain-down` shortcut for that circuit. Publish one catalogue page only after that same slice works in the room.

## Questions for the owner

1. Which operations must the first playable release support end to end, and which may be visibly present but explicitly unavailable until a later release?

2. Should a moved asset retain its physical plate and display tag, or should the plate change to the new room code while the internal ID and historical aliases stay stable?

3. How much unsafe operation should be possible: may a player deliberately dead-head, drain to waste or defeat a normal sequence and see a fault, or should interlocks prevent some actions entirely?

4. For the footbath pilot, is the intended drain route through the circulation pump to a shared waste line, and where are its actual make-up and drain connections meant to terminate? The hydraulic graph cannot be made authoritative until those boundaries are specified.

5. Should the in-game manual describe the installed plant exactly as it starts, or also document sanctioned alternate operating modes and fault procedures that are not the normal running line-up?
