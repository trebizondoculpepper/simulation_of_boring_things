# Plan: identifying everything in the plant

The owner's design, 2026-10-22, written up as a plan. It follows the research in `doc/research/plant-identification.md`, and supersedes its "one plant register" and `V-131` numbering.

## Revised identity and wiring target

The owner's later clarification makes this a 1:1 installation contract: each physical thing has one installed asset record; the room view, persistent simulation state where applicable, operator label and catalogue all refer to that same record. Containment gives readable paths such as `PL1.P1` for a pump, `PL1.P1.SUCTION` and `PL1.P1.DISCHARGE` for its water ports, or `PL1.CAB1.V_RET_1` for an integral return valve. A valve in a machine belongs beneath that machine; a valve on connecting pipework belongs beneath an explicitly named pipework asset.

The readable path is a changeable display designation. Each installed asset also has an explicitly allocated permanent ID, which saves, connections and action targets use. Existing hyphenated tags remain aliases while they are migrated; moving or renaming a physical item must not silently replace it in a save. Kind definitions may declare candidate parts, but only parts selected on an installed instance enter its catalogue.

The installation validator should reject a missing view/model binding for any operable control, an indicator without a model reading, and an unconnected required port. A port may instead have an explicit capped, spare or site-boundary termination. Each connection must agree on medium, direction and units. A labelled control is complete only when a World action changes its single state and the relevant simulated process responds. This lets authored instructions name controls precisely and lets the build detect disconnected plant before publication. The current footbath pilot and the remaining gaps are recorded in `doc/reports/plant-identification-gap-audit.md`.

Identity and physical lettering are separate. Put the parent designation, such as `PL1.P1`, on a pump or cabinet. Its nearby ports can be lettered simply `SUCTION` and `DISCHARGE`, and an indicator can be lettered `RUN`, because their parent is visually clear. The catalogue retains their full paths (`PL1.P1.SUCTION`, `PL1.P1.DISCHARGE`, `PL1.P1.RUN_LAMP`) so instructions and validators can refer to them unambiguously. Each installed definition therefore records both its full display path and the shorter text actually printed at its location.

The revised target above governs where the original object-model and work-order sections below still describe a tag-derived block tree. Those sections document the pilot's implementation, not the finished installation contract.

## Contents

1. Principles
2. Naming rules
3. The object model
4. The bill of parts and the web manual
5. The tests
6. Pilot and order of work

## 1. Principles

- **Every valve, switch and control in the plant exists in the simulation model and can be worked.** Procedures such as a backwash or a drain-down are valve line-ups carried out on the model. They are not flags.
- **Parts inherit a readable path from their installed parent.** The physical machine, its selected controls, indicators and ports each have a catalogue identity; the path is a display designation, not the permanent ID.
- **Every name starts with its room,** so a tag says where to go.
- **Every component is one of three classes:** plant, non-plant or decorative. Only plant and non-plant components appear in the inventory.
- **One installed definition is authoritative:** the room views, topology, valve charts, look-at text, manual and tests refer to the same installed asset IDs. A containment tree is one projection of that definition; cross-room connections form a graph.

**Automation varies by pool, on purpose.** The aim is a wide variety of pool-management experiences, so a player who has never been in a pool plant room gets a feel for what the job involves. Some systems are automated and some are worked by hand:

- The Olympic pool (`PL2`) has some automation, for example an automatic backwash controller driving actuated valves on its filters.
- The Lounge pool (`PL1`) is mostly manual: its backwash and other processes are carried out by hand at named valves.

The same process can therefore exist in both forms in the same building. The object model treats a controller as one more component that works other components' parts, just as the player does.

## 2. Naming rules

A displayed path begins with the room, then each installed parent and part: **`PL4.CAB1.V_RET_3`** is plant room 4, cabinet 1, return valve 3. The existing hyphenated form **`PL4-CAB1-RV3`** is a transitional alias. Neither is the permanent asset ID or save key.

### Room codes

| Code          | Room                                                                         |
| ------------- | ---------------------------------------------------------------------------- |
| `PL1` … `PL4` | The plant rooms of pools 1 to 4 (`plant_pool_01` … `plant_pool_04`)          |
| `WH`          | Wet hall (make-up water)                                                     |
| `BH`          | Boiler house                                                                 |
| `HS`          | Hypochlorite store                                                           |
| `AS`          | Acid store                                                                   |
| `LB`          | Loading bay                                                                  |
| `SR`          | Switch room                                                                  |
| `AP`          | Air plant                                                                    |
| `CR`          | Control room                                                                 |
| `EO`          | Engineers' office                                                            |
| `PH1` … `PH4` | The pool halls, for their plant-side fittings (gutters, main drains, inlets) |

### Parent type codes

Each parent code is a type code plus a number counting within its room (`PL2-P1`, `PL2-P2`).

| Code | Parent                                    | Code  | Parent                             |
| ---- | ----------------------------------------- | ----- | ---------------------------------- |
| `P`  | Pump set                                  | `F`   | Filter                             |
| `T`  | Tank (balance, break, backwash, chemical) | `HX`  | Heat exchanger                     |
| `B`  | Boiler                                    | `UV`  | UV unit                            |
| `OZ` | Ozone generator                           | `CAB` | Packaged cabinet                   |
| `DP` | Dosing set                                | `AHU` | Air-handling unit                  |
| `CP` | Control panel                             | `MP`  | Mimic panel                        |
| `DB` | Distribution board                        | `IS`  | Isolator                           |
| `PW` | The room's pool-water pipework            | `HW`  | The room's heating (LTHW) pipework |
| `G`  | The room's gas pipework                   | `MU`  | The room's make-up pipework        |
| `DR` | The room's drainage                       | `CH`  | The room's chemical lines          |
| `D`  | Door                                      | `CRD` | Card reader                        |

The room's pipework of each service is a parent in its own right, so a valve on the pipes between machines has a home: `PL4-PW-DV1` is plant room 4's first pool-water drain-down valve.

### Part codes

Each part code is a type code plus a number counting within its parent.

| Code  | Part                        | Code  | Part                      |
| ----- | --------------------------- | ----- | ------------------------- |
| `IV`  | Isolating valve             | `SV`  | Suction valve             |
| `RV`  | Return valve                | `DV`  | Drain or drain-down valve |
| `BV`  | Backwash valve              | `NRV` | Non-return valve          |
| `LCV` | Float (level control) valve | `CV`  | Changeover valve          |
| `SW`  | Switch                      | `PB`  | Push button               |
| `L`   | Lamp                        | `G`   | Gauge                     |
| `M`   | Motor                       | `PS`  | Pipe segment              |
| `LV`  | Door leaf                   | `CL`  | Door closer               |

The existing equipment tags (`P-101A`, `B-501`) are retired in favour of these: `P-101A` becomes `PL2-P1`. Tag plates and the manual change with it.

## 3. The object model

Every component in the world is one of three classes:

- **Plant:** engineering things the operator works or maintains: a filter, a pipe segment, a valve, an electrical isolator, a gauge. Each is a block in the simulation model with state.
- **Non-plant:** functional things that are part of the facility but not its engineering: a door (left and right leaves), a card reader, a sign with a lamp. Each has an identity and can appear in the inventory, but it is not part of the plant schematic.
- **Decorative:** set dressing (the services ceiling, plants, furniture). It has no identity and never appears in the inventory.

Every kind of component (`BlockKind` in `src/game/sim/block-kind.ts`) declares its parts once, as a manifest. Each entry gives:

- `code`: the local part code (`RV3`);
- `class`: plant or non-plant;
- `name`: "Return valve 3";
- `purpose`: why it is there and when you would use it;
- `normal`: its normal state (open, closed, on), where it has one;
- the part's own kind, if the part has parts of its own.

One recursive function walks any block and yields every named part, with its full identifier, address, class, name, purpose and normal state. That function is the standard protocol. Everything else calls it:

- the room views, to bind each control to its part;
- the look-at text;
- the valve charts in the plant rooms;
- the manual;
- the tests.

The pieces needed already exist. The model is blocks within blocks, addressed by path (`src/game/sim/blocks.ts`), and the hydraulic network (`src/game/sim/hydraulics.ts`) already has `closed` links and resistances, so a valve becomes a link whose state sets its resistance. A backwash or a drain-down is then the flow following the route the valves leave open.

The gap is that the world's pools still run on hand-written water code (`src/game/plant/pools.ts`, `src/game/water/water-balance.ts`), not on these blocks. Each circuit has to move onto the block model before its valves can be real.

## 4. The bill of parts and the web manual

The same walk produces a **hierarchical bill of parts**:

- room › parent › part, each line with its identifier, name, class and purpose;
- an alphabetical index of every identifier and name.

It can be served as a web page from the same build as the game: an operator's manual page alongside the game, generated from the very model the game runs. It never disagrees with the plant.

The PDF manual (`npm run manual`) takes its schedules and index from the same walk.

## 5. The tests

These are pure-logic tests that walk the tree:

1. Every room code, parent code and part code follows the rules, and every full identifier is unique.
2. Every plant and non-plant part has a name and a purpose. Every valve and switch has a normal state.
3. A new world has every part in its normal state.
4. Every part you can work in a room's view is bound to a part in the model, and every workable part in the model has a control in some room.
5. Every pipe segment joins the parts the model says it joins.
6. Every identifier a procedure names exists. A procedure's line-up, played on the model, does what it says: the backwash cleans the filter, and the drain-down empties the pool.
7. The bill of parts lists every identifier exactly once.

## 6. Pilot and order of work

1. **The protocol:** part manifests on block kinds, the recursive walk, and tests 1, 2 and 7, on one small kind.
2. **Pilot, the footbath (`PL4`):**
   - its cabinet and the cabinet's parts, and its pipework's valves (make-up, drain-down, return) as model blocks;
   - draining and refilling it by setting real valves (test 6);
   - its room's controls bound to them (test 4);
   - visible legends, and the look-at text.
3. **The bill of parts web page,** from the pilot.
4. **The Olympic circuit (`PL2`):** pumps, filters (backwash by valve line-up), heat exchanger, UV and ozone, balance tank and make-up.
5. **The other plant rooms, then the shared rooms** (boiler house, wet hall, stores, switch room, air plant), then the non-plant components (doors and card readers).
6. **The PDF manual's schedules and index** from the same walk.
