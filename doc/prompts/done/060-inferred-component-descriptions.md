# 060: Inferred component descriptions

Status: done 2026-10-25 (`1886f49`, reworked in `4b17b50`), its remaining work handed to [063](063-component-information-remediation.md). Implemented 2026-10-25 as a data layer, then reworked the same night to the owner's later rulings (below): descriptions, kinds, live status and ordinals, shared by the overlay, the inventory, the manual and the console's `status`; valves described from their rooms' enhanced networks, so far only the Olympic plant room's. What remains is in [063](063-component-information-remediation.md). Earlier status: reviewed against the running catalogue and plant network on 2026-10-25; ready to implement in the ordered steps below.

## Review checkpoint — 2026-10-26

**Classification:** Complete. **Filed:** `doc/prompts/done/060-inferred-component-descriptions.md`.

**Delivered:** The original delivered implementation/report is recorded in the finished index.

**Still outstanding:** None newly identified within the archived scope.

**Evidence:** `component-descriptions.ts`, `1886f49`, reworked to the enhanced network in `4b17b50` (2026-10-25); `TODO.md` ticked. What remains is prompt 063's. Moved 2026-10-25.. Reviewed against source `e5078c4`.

The original request and earlier implementation notes below are retained as history; this checkpoint supersedes any conflicting old completion claims. Outstanding work remains open in the root TODO.

## The owner's later rulings (2026-10-25, overnight), which supersede what follows

- "The model should be the source of truth and everything should follow from the model, so that the number plates and the descriptions and the overlay pop-ups should all describe a thing's function and purpose in the model … it doesn't go the other way around."
- The model is the **enhanced network**: "we start with the equipment, we draw a network, and then the plumber might add additional valves and things, and so we have the enhanced network, and the enhanced network is our source of truth. The enhanced network tells us what everything is and where it is, and everything that exists in our world must exist on that enhanced network." It may be edited by hand, but "we can't have anything except that what exists on that network, because that is effectively the port graph of our world."
- "There should be no handwritten or manually produced structures … Everything has to derive from the actual game model. And everything has to be derived algorithmically, not something that an LLM has manually worked out."
- Tags are hierarchical: "plant two, pump set one, pump one" (PL2-P1-P1); tag at the group level and below it at the item level.

So option 1 below (ends recorded in the valve register) and the review's endpoint table and legacy-network cross-check were built and then removed: a valve's route is its link in its room's enhanced network (`olympicValveRoutes` in `olympic-plumbing.ts`), its words derived from the network's nodes. The legacy `PLANT_NETWORK` is not the source of truth and is left as it was.

## The owner's rulings (2026-10-25)

- "Most of the time purpose should be inferred." An item's description is built from what is known of it, not written for each item. "We can have some special narrative tags, but that shouldn't be normal."
- A valve: **"Isolates <commodity> flowing from <source> to <destination>"**, for example "Isolates water flowing from the water service to the balance tank."
- An electrical isolator: **"Isolates power for <destination>"**, for example "Isolates power for the jacuzzi plant room."
- Any other equipment: **"<Cardinality> <equipment type> in <location>, currently <status>"**, for example "1st Pump in PL2, currently Off".

## What the code has now (checked 2026-10-25)

- **Valves.** 80 registered valves (`src/game/plant/installed-valves.ts`), keyed by room, run and valve name, with asset id, tag and normal state. The inventory's purpose for each is guessed from words in its name (`plantInventory` in `equipment-catalogue.ts`): "Opens the filter backwash or discharge route.", "Opens a drain route to waste.", "Isolates gas to the named boiler.", else "Isolates or admits flow in the named pipe run."
- **Their ends are not recorded anywhere usable.** The drawn pipe runs (`room-pipes.ts`, `cabinet-pipes.ts`, `olympic-plumbing.ts`) are geometry: points, a service and a name ("Make-up to the balance tank"), not the two things they join. The plant network (`src/game/plant/network/`) does record connections (each valve a node whose ports `a` and `b` link to named nodes), but only 7 of the 80 registered valves are nodes in it: the drawn valves and the network's valves are largely two separate sets with different tags. Reconciling them is already planned (prompt 049, "Every installed valve does something").
- **Isolators.** The room switch-fuses (`installed-feeders.ts`) say "Isolates and fuses the electrical supply to this room."; motor starters and other isolators have their own records.
- **Equipment.** Placed items (`installed-asset-ids.ts` and `equipment-catalogue.ts`'s kinds, with a generic purpose per kind), fixtures drawn outside the layouts (`installed-fixtures.ts`), and the world's live state for many of them (motor starters, pools and tanks, cabinets, valves).

## Proposed design

**A pure module, `src/game/plant/purposes.ts`.** No Three.js, no DOM, tested beside it:

- `valvePurpose(valve)`: the valve's authored `purpose` if it has one (rare); else, if its ends and commodity are known, `Isolates ${medium} flowing from ${from} to ${to}.`; else nothing. Resolve commodity from explicit metadata or a known run service; never describe an air or gas line as water merely because a field is missing. No generic filler: an item with no known purpose shows its tag and name alone, as the overlay plan already decided.
- `powerPurpose(destination)`: `Isolates power for ${destination}.`
- `equipmentLine(place, type, location, status)`: `${ordinal(place)} ${type} in ${location}, currently ${status}`, with `ordinal` giving 1st, 2nd, 3rd, 4th, 11th, 12th, 13th, 21st…, and `placesByKind(items)` giving each item's place among its room's items of the same kind, ordered by the number in its tag (PL2-P1 before PL2-P2).

**Where a valve's ends come from.** Two options; the reviewer should weigh them:

1. **Recorded in the valve register now.** Each `INSTALLED_VALVES` entry gains optional `ends: { from, to, medium? }` and `purpose?`, filled room by room as plain data (the jacuzzi plant room first, for the overlay's demonstration). Simple and immediate, but it repeats knowledge the plumbing and the network ought to own, and can drift from them.
2. **Derived from the plant network.** A valve's ends are the names of the nodes its ports link to. Correct by construction and never drifts, but it works for only 7 of the 80 valves until the drawn valves and the network are reconciled (prompt 049).

The proposal is option 1 now, with a test that, for every valve that is also a network node, the recorded ends agree with the network's, so the two cannot quietly diverge; option 2 replaces the recorded ends room by room as 049 reconciles them.

**Isolators.** The switch-fuses' destination is the room they feed ("the jacuzzi plant room"); a motor starter's or a machine's isolator names its machine. Where an isolator's destination is not known, no purpose.

**The equipment line.**

- _Cardinality_ is the item's place among its room's items of the same kind (1st Pump, 2nd Pump), not a global count; a lone item is "1st".
- _Equipment type_ is the kind as a word, from the catalogue's kinds (Pump, Filter, Balance tank, UV unit), not the item's full name; its tag and name are already the overlay's first line.
- _Location_ is the room's code as printed (PL2), per the owner's example.
- _Status_ is the item's state now, from the world, as its own instruments would show it: a pump On, Off or Tripped; a tank its level (for example "68 % full"); a filter In service or Backwashing; a valve Open, Shut or moving. Items with no live state in the world yet omit the whole `, currently …` clause; the line then ends at the location. Do not print a dangling “currently”, an invented Off state, or a room-local demonstration state as if it belonged to the world.

## The owner's answers (2026-10-25)

- **Valves' ends are recorded in the register now** (option 1): optional `ends: { from, to, medium? }` and a rare `purpose?` on each `INSTALLED_VALVES` entry, filled room by room, the jacuzzi plant room first; a test checks they agree with the plant network wherever a valve is also a network node; the network replaces them room by room as prompt 049 reconciles the two.
- **The overlay shows live status**, as the owner's example does; it updates while the pointer rests on an item, only when the status text changes. The overlay plan's rule that live readings stay on the instruments is relaxed to allow this line's status (simple states and a tank's level, not instrument-level detail).
- **"1st Pump in PL2"**, an ordinal among the room's items of that kind, even where the tag numbers it.
- **"currently Off"**, without a colon, as in the owner's example.
- **The type words and status wording live in the catalogue's kinds**, beside each kind's code, maker and generic purpose, so no kind can be added without them.
- **One source for all three**: the overlay, the inventory (and the printed manual) and the console's `status` give the same description; an item with no purpose yet shows none anywhere, so the gaps are visible and get filled.

## Review findings and implementation contract (2026-10-25)

The owner's wording and preference for inferred descriptions stand. The implementation is feasible, with the concrete corrections below. This review changes documentation only; it does not implement descriptions or the overlay.

### 1. Endpoint identity and the legacy network

An executable audit of `INSTALLED_VALVES`, `PLANT_NETWORK.nodes` and port links confirmed 80 installed valves and seven exact valve-tag overlaps. Five appear consistent: PL1-F1-IV1, PL1-F1-IV2, PL1-F2-IV1, PL1-F2-IV2 and WH-T1-IV1. The other two are real semantic conflicts: the drawn PL1-F1-BV1 and PL1-F2-BV1 are **backwash waste** routes (`room-pipes.ts`, corroborated by `loungeValveFlows()`), while the network uses those tags for **backwash supply** valves from the pump discharge header to each filter. Equal tag strings are therefore insufficient proof of equal components. None of PL3's ten installed valves currently overlaps the network.

Keep the agreed `ends: { from, to, medium? }` shape, but make `from` and `to` stable endpoint keys resolved through a small endpoint-label table. Reuse network node/port identities where they exist; a key for an endpoint outside the network has an explicit label and can acquire a network mapping later. Compare identities, port roles and commodity, not English display strings. Read the valve's own `hydraulic.from` and `hydraulic.to` ports to determine direction, then follow their incident links using `splitEnd()`; do not assume array order, that every incident link points forwards, or that every valve uses ports literally called a and b. Describe the normal designed route, not instantaneous measured flow, which can stop or reverse during backwash.

Resolving the two BV1 conflicts is a required bounded reconciliation task before full acceptance. Preserve installed asset IDs, tags and save keys; do not silently rewrite the drawn plant to match the legacy graph, equate different ports because their parent equipment matches, or hide the mismatches in a passing allowlist. Establish the correct connection from the working schematic and correct the legacy mapping/topology. The broader network migration remains prompt 049's. A final cross-check must exercise all seven overlaps with non-vacuous endpoint comparisons, including the corrected BV1 routes; it must fail on a deliberately swapped endpoint or wrong commodity. Missing metadata in other rooms remains a reported gap, as agreed, rather than a reason to generate filler.

For the jacuzzi demonstration, all ten current valves need endpoints. The following are the intended functional routes to verify against `cabinet-pipes.ts` and its bindings when assigning endpoint keys; these are descriptions of the designed connections, not live-flow claims:

| Tag         | Commodity     | From                   | To                     |
| ----------- | ------------- | ---------------------- | ---------------------- |
| PL3-BT1-IV1 | water         | make-up water service  | balance tank           |
| PL3-BT1-DV1 | water         | balance tank           | waste drain            |
| PL3-JZ1-IV8 | water         | balance tank           | circulation pump       |
| PL3-JZ1-IV1 | water         | treatment cabinet      | jacuzzi return jets    |
| PL3-JZ1-IV5 | water         | jacuzzi suction        | jet pump               |
| PL3-JZ1-IV6 | water         | jet pump               | jacuzzi jets           |
| PL3-JZ1-IV7 | air           | air blower             | jacuzzi air ring       |
| PL3-JZ1-IV3 | heating water | heating flow main      | jacuzzi heat exchanger |
| PL3-JZ1-IV4 | heating water | jacuzzi heat exchanger | heating return main    |
| PL3-JZ1-DV1 | water         | jacuzzi drain outlet   | waste drain            |

### 2. One formatter and an explicit world snapshot

`plantInventory(root, valveStates, feederStates)` currently receives only three slices of state. It cannot infer a pump's running state, tank level or filter mode from those arguments. Introduce one pure `describeComponent(record, context)` path, with static component definitions plus an optional read-only world snapshot. Import `World` as a type only; never import or call `newWorld()` from the catalogue to manufacture live state, and never make world stepping depend on the catalogue. A type-only import has no runtime dependency ([TypeScript documentation](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html)).

A compatible integration is to retain the existing three inventory arguments and add an optional fourth description context, plus an `inventoryForWorld(world)` wrapper that supplies all four from the same snapshot. The overlay and console use that wrapper or its single-item equivalent. Without a snapshot, include known static/inferred descriptions and omit live status. Preserve the `purpose: string` output field for existing consumers, using an empty string for no description; the console omits its entire `purpose = …` row when empty, and the manual renders an empty purpose cell. Do not leak `undefined`, stringify an absent field, or rebuild all inventory entries every frame.

The manual is a static artifact, not a live display. `buildManual()` currently calls `plantInventory()` with defaults; retain that snapshot-free form initially, so its equipment lines omit status. If a caller explicitly supplies a snapshot, record the snapshot's provenance/time in the artifact and pass that same context to all schedule generators. The parity requirement is byte-for-byte equality **for the same component and context**; a live screen and a snapshot-free PDF need not claim the same “currently” value. Update `src/manual/logic/manual.test.ts`, which currently compares inventory identifiers but does not compare purpose cells, to verify description parity as well. Exercise `renderManual()` and its escaping; if PDF layout changes, render and inspect the generated PDF before delivering it.

### 3. Exhaustive kind policies and real status

The existing private `KINDS: Record<string, EquipmentKind>` covers placement kinds only. Inventory also contains identified model kinds, installed fixtures such as flowmeters, switch-fuses and pipework. Put type words and status formatting policies in a common, finite kind registry (for example `equipment-kinds.ts`) shared by the catalogue and the new formatter, with an explicit `none` status policy. Keep resolver inputs pure and data-only; a kind policy may format a resolved state without reading DOM, Three.js or a room's exhibit. A broad string index signature alone will not enforce completeness: derive a finite union and validate every produced inventory kind and every known fixture/model subtype against it. [TypeScript mapped types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html) support a policy entry per member; inventory coverage tests must also catch stringly typed kinds at runtime.

| Component group                                                                                  | Available world evidence                                                        | Initial policy                                                                                                                  |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Individual lounge/Olympic circulation pumps                                                      | `world.motors.starters`, mapped by existing motor tag                           | Tripped before On before Off; use actual running/trip values, not HAND/AUTO or a start request.                                 |
| Balance, break and backwash tanks                                                                | `world.pools`, `world.wetHall`, known capacities                                | Rounded whole percent full; clamp formatting to 0–100 while retaining raw state for diagnostics.                                |
| Jacuzzi cabinet and its jets/air                                                                 | Existing cabinet inputs/readings and jacuzzi running helpers                    | Reuse actual derived operation and trip/interlock conditions; POWER alone is not proof of running.                              |
| Olympic filters                                                                                  | Existing battery flow/readout helpers and installed lineup                      | In service or Backwashing only where the helper proves that mode and flow; absent/ambiguous evidence means no status.           |
| Room switch-fuses and known isolators                                                            | Feeder/isolator flags and explicit destination mapping                          | The agreed power-isolation description; a switch position must not be presented as proof that a downstream machine is running.  |
| AHU stacks                                                                                       | Catalogue tags AP-AHU1… differ from world unit tags AHU-801…                    | Add an explicit existing-unit mapping before showing status. Do not join unrelated collections by their current array index.    |
| UV, dosing, heat-exchange equipment, chemical stores and shared plant                            | Some have existing pure operation helpers/readings; availability varies by item | Use those helpers only where identity and units are explicit; otherwise the kind's status policy is `none`.                     |
| Boilers/controllers/instruments with room-local behaviour, fixtures and remaining unmapped kinds | No reliable world binding for the particular item                               | End the inferred equipment line at its location. Do not expand this task into moving every exhibit's simulation into the world. |

The identity-to-world mapping is necessary instance data, not an authored narrative per item. Kinds define wording once; mappings provide the relevant existing model address. Missing state is not Off. Valves retain their isolation-purpose template; a boolean command cannot prove an actuator is physically Open or moving, and actual travel exists in the world only for some valve families. Do not append a guessed valve state to the owner's prescribed sentence.

### 4. Individual pumps, assemblies and ordinals

The catalogue currently contains one `pump-pair` item per pool room: PL2-P1 is the assembly, not the first pump. Individual pumps already have motor tags P-101A/P-101B in PL2 and P-201A/P-201B in PL1. Expose these as child description/inventory records tied to their existing motor identities and room, retaining the parent assembly record. Do not assign the parent's asset ID to two children, rename existing tags, or number a pump set as though it were an individual pump. Include a `pump` kind for children and a “Pump set” type for the assembly, with an explicitly formatted aggregate status or no status. This makes the owner's example testable against the actual first pump rather than a synthetic object.

Rank the complete room roster by canonical kind, including fixtures and described children, before filtering it for an overlay or search. Use natural comparison of all numeric tag segments (P2 before P10, A before B), with full tag then stable identity as tie-breakers. Do not strip every nondigit into one number. Group individual pumps separately from pump sets and other assemblies; omit room/container pseudo-records from equipment ranking. Return ranks by stable key without mutating the records or reassigning asset IDs. Ordinals are presentation positions, so adding an earlier-numbered item can change a later ordinal without changing its identity. Cover reordering, subsets, fixtures, children, same-number letter suffixes, nested tags and the 11th–13th exceptions.

### 5. Compatibility and delivery order

Prompt 060 supersedes the older overlay research's “authored purposes only” and “no live readings” restrictions for this one-line description. Special narrative overrides stay rare. Never use the old catalogue's generic kind purpose, or regex guesses from valve names, as an implicit override; preserve engineering documentation fields as needed but feed all three user-facing description consumers from the new resolver. In particular, `identification.ts` currently validates nonempty manifest purposes; do not casually weaken that unrelated identity contract merely to represent a missing UI description.

1. Define the common kinds, endpoint labels, description context and pure formatter; make unknown values explicit. Add identity mappings and child records needed for the pump example.
2. Record all PL3 valve endpoints and seed the overlapping network cases. Reconcile the two BV1 semantic conflicts; prove the cross-check exercises all seven overlaps. Do not require migrating all 80 valves into the network first.
3. Connect inventory and console to the same resolver/context, preserve stable IDs and optional-purpose behaviour, and test the manual schedule against the same context. Update fixture/catalogue tests that currently assume every generic purpose remains nonempty or equals a fixture's old authored sentence.
4. Integrate the resolver into the stage-1 inspection prototype described by the overlay plan. The hover overlay itself is still unimplemented; if 060 is delivered first as a data layer, accept inventory/console/manual parity first and retain the hover demonstration as an open stage-1 task. Stage-2 action narratives remain a separate delivery.
5. Run the acceptance checks below and the five project checks. No saved-world shape changes are required for metadata, derived status or ordinals; any unrelated new persistent state would need its own version/migration work.

The review removes the request for a further reviewer as a gate. The remaining work above is implementation, including the two concrete legacy reconciliations, rather than an unresolved owner preference.

## Tests (implementation acceptance)

- `valvePurpose`: inferred wording, its medium, an authored purpose overriding, none without either.
- `powerPurpose`, `ordinal` (including 11th to 13th, 21st, 101st), `placesByKind` (per room and kind, by tag number), `equipmentLine` with and without a status.
- Every valve in the jacuzzi plant room has a purpose; elsewhere the count of valves without one is reported, not failed, until each room is done.
- Recorded ends agree with network endpoint identities, port roles and commodity for all seven overlaps, including the reconciled BV1 routes; deliberately swapped endpoints and wrong commodity fail. Assert coverage counts so absent metadata cannot make this test pass vacuously.
- An individual pump uses its actual motor identity/state; the parent pump set is described separately. Status reacts to a world change while the target is stationary, with Tripped taking priority and missing state omitting the entire status clause.
- Inventory, console and manual purpose cells match the shared resolver for identical contexts, including empty descriptions and snapshot-free rendering; fixture registration, stable IDs and identified-part validation remain intact.
- Exhaustive kind coverage includes model parts, fixtures, children, pipework and feeders, not just placement KINDS; report unmapped status and endpoints without inventing defaults.

## Acceptance

The overlay's second line, the inventory and the console's `status` give the same description for the same item; the jacuzzi plant room's valves all read "Isolates … flowing from … to …"; "1st Pump in PL2, currently Off" appears for P-101A with both Olympic starters stopped and no trip, while PL2-P1 remains a separately identified pump set; no item shows a generic filler sentence.

## Progress check — 2026-10-25 02:19 UTC

The data-layer implementation is committed as `1886f49`: `component-descriptions.ts`, status resolution, the jacuzzi valve endpoints and network cross-check, and shared inventory/console/manual wording are present with dedicated tests. This is the agreed stage-1 data handoff. Keep the overlay portion of the acceptance statement open until prompt 061 renders that same resolver's live line in the game; do not duplicate purpose formatting in the overlay.
