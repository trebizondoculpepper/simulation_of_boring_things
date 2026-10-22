# Proposal: naming the parts of the plant

The final proposal for how every part of the plant is named, 2026-10-22. It refines `doc/plans/plant-identification.md` (the owner's design) with the technical review in `doc/reports/plant-identification-review.md` (GPT-6.1, Codex). Where this document and the plan disagree on naming, this one wins.

## Contents

1. Two names for everything
2. The asset ID
3. The tag
4. Vocabularies
5. Parts of a kind
6. Pipework and lines
7. Classes and roles
8. Normal states
9. Development rooms
10. Rules the validator enforces
11. Worked example: the footbath
12. Decisions still open

## 1. Two names for everything

Every installed thing has two names, kept apart because they do different jobs.

|             | Asset ID                                           | Tag                                                                |
| ----------- | -------------------------------------------------- | ------------------------------------------------------------------ |
| Example     | `footbath.makeup.iv`                               | `PL4-MU-IV1`                                                       |
| Who uses it | The code: saves, procedures, connections, bindings | People: the plate in the room, the manual, the valve chart, alarms |
| Says        | What it is for (its function)                      | Where it is and what it is                                         |
| Changes     | Never                                              | When the plant is rearranged; old tags kept as aliases             |
| Declared    | Explicitly, once                                   | Explicitly, once (never derived from list order or position)       |

The review's main finding was that a name derived from room and position is an unstable key: moving a machine would renumber it and break saves, procedures and the manual. The boiler house chapter already numbers its tags by list order (`src/manual/logic/boiler-house.ts`). Keeping a permanent ID behind every tag fixes that, while the player and the manual still see the room-first tag the owner designed.

## 2. The asset ID

- Lowercase segments joined by dots: `[a-z][a-z0-9-]*`, for example `olympic.filter.f2.backwash-in`.
- It names **function**, not place: the system, then subsystems, then the item. `footbath.makeup.iv` is the footbath system's make-up isolating valve wherever it stands.
- Declared by hand in the installed-plant definition, once, and never reused, even after the thing is removed.
- A part's ID is its parent's ID plus the part's local key: `footbath.cab.rv3`.
- Model addresses add a state field after a colon: `footbath.makeup.iv:position`.
- Replacing a machine with a different one makes a new ID, with an explicit save migration. Moving one does not.

## 3. The tag

- Uppercase, hyphen-separated: `<room>-<parent><n>` for a parent, plus `-<part><n>` for a part. `PL4-CAB1-RV3` is plant room 4, cabinet 1, return valve 3.
- Numbers count within the room (for parents) or within the parent (for parts), from 1, and are **declared**, not computed. A gap is allowed, for example when something is removed, and a number is never reused for something else.
- A part's tag is its parent's tag plus its part code. Only parents are tagged by hand; kinds give their parts their codes.
- Each asset keeps a list of **aliases**, its former tags, so old saves, notes and procedures still resolve.
- The tag is printed on the plate (parents) or engraved on the part (parts). It appears in the manual, the valve charts, the alarm texts and the look-at text.

## 4. Vocabularies

Each vocabulary is closed: a new code is added to its table before it is used.

**Rooms**

| Code        | Room                                   | Code | Room               |
| ----------- | -------------------------------------- | ---- | ------------------ |
| `PL1`–`PL4` | Plant rooms of pools 1–4               | `WH` | Wet hall           |
| `BH`        | Boiler house                           | `HS` | Hypochlorite store |
| `AS`        | Acid store                             | `LB` | Loading bay        |
| `SR`        | Switch room                            | `AP` | Air plant          |
| `CR`        | Control room                           | `EO` | Engineer's office  |
| `PH1`–`PH4` | Pool halls (their plant-side fittings) | `GL` | Underwater gallery |

**Parents (assemblies)**

| Code | Parent          | Code  | Parent             |
| ---- | --------------- | ----- | ------------------ |
| `P`  | Pump set        | `F`   | Filter             |
| `T`  | Tank            | `HX`  | Heat exchanger     |
| `B`  | Boiler          | `UV`  | UV unit            |
| `OZ` | Ozone generator | `CAB` | Packaged cabinet   |
| `DS` | Dosing set      | `AHU` | Air-handling unit  |
| `CP` | Control panel   | `MP`  | Mimic panel        |
| `AN` | Annunciator     | `DB`  | Distribution board |
| `IS` | Isolator        | `BMS` | BMS outstation     |
| `D`  | Door            | `CRD` | Card reader        |

**The room's pipework of one service** (a parent, so valves between machines have a home): `PW` pool water, `MU` make-up, `HW` heating (LTHW), `G` gas, `DR` drainage and waste, `CH` chemicals, `BW` backwash.

**Parts.** Valves by duty, instruments by the ISA-5.1 letters operators know:

| Code        | Part                        | Code  | Part                    |
| ----------- | --------------------------- | ----- | ----------------------- |
| `IV`        | Isolating valve             | `SV`  | Suction valve           |
| `DV`        | Discharge valve             | `RV`  | Return valve            |
| `WV`        | Drain valve (to waste)      | `BV`  | Backwash valve          |
| `RNV`       | Rinse valve                 | `NRV` | Non-return valve        |
| `LCV`       | Float (level control) valve | `CV`  | Changeover valve        |
| `XV`        | Actuated on/off valve       | `M`   | Motor                   |
| `PI`        | Pressure gauge              | `TI`  | Thermometer             |
| `FI`        | Flow meter                  | `LI`  | Level gauge             |
| `LSL`/`LSH` | Low/high level switch       | `AI`  | Analyser (chlorine, pH) |
| `SW`        | Switch                      | `PB`  | Push button             |
| `L`         | Lamp                        | `LV`  | Door leaf               |
| `CL`        | Door closer                 | `FU`  | Fuse                    |

Drain-down uses `WV` (drain valve, to waste). `DV` means a pump's discharge valve, as on a pump set.

## 5. Parts of a kind

- A kind (a model of cabinet, a pump set) declares its **possible** parts once: local key, part code, class, role, name, purpose (why it is there and when you would use it), normal states, and typed state (units, open fraction or open/shut).
- An **installed** asset lists the parts it actually has, choosing among its kind's variants (a cabinet with or without a heater). The catalogue walk follows the installed asset, never the kind's maximum.
- Part numbers come from the kind's declaration, so every instance of a kind numbers its parts alike: every footbath cabinet's `RV3` is the same valve.

## 6. Pipework and lines

- Following the review, connections form a graph (ports, links, junctions, boundaries), not a tree. A valve between two machines belongs to the room's pipework of its service (`PL4-PW-WV1`), and its links join the machines' ports.
- A **line** gets a tag only where it has a distinct specification, isolation boundary, or maintenance or documentation role: `<room>-<service>-L<n>`, for example `PL4-PW-L2`, tagged after the room where it starts. A line's location may be a set of rooms, and its tag is shown on the BS 1710 legend in each room it passes through.
- Elbows, straights and supports are geometry of a link. They have no tags.

## 7. Classes and roles

Two independent properties:

- **Class:** `plant` (engineering), `facility` (functional but not engineering: doors, card readers, signs with lamps) or `decorative` (never named, never inventoried).
- **Role**, for plant and facility things:
  - `operable`: worked by a person or a controller, with state and a command path;
  - `indicator`: shows state (gauges, lamps, meters);
  - `passive`: physical and identified but not worked (a non-return valve, a strainer, a line).

Only `operable` things need a control bound in a room, and only `indicator` things need a live reading. A view factory refuses an operable part without a binding.

This qualifies the project rule "every engineering item is a real, working component", in the review's terms (R7). A non-return valve is real and modelled, but it is not a control. **This is the owner's decision**, listed in section 12.

## 8. Normal states

A part's normal position is given per **operating mode**: `running`, `shutdown`, `backwash` and `drain-down` to begin with. The manual's valve chart prints the `running` column, and procedures name the mode they start from and the mode they end in. A new world starts every part in its `running` state, and the validator checks the definition gives one.

## 9. Development rooms

Exhibits in the development rooms are not installed plant. Their IDs live under `dev.<room>.…` and their tags start `DEV`, so they never collide with the leisure centre's assets or appear in its catalogue. Mimics and plant-room machines that show installed plant bind to the installed ID, so one asset may have many views but only one state.

## 10. Rules the validator enforces

Run once when the installed plant is built, before the game draws a room or the manual is made:

1. Every asset ID and every tag is unique, including aliases, and well formed.
2. Every room, parent and part code is in its vocabulary.
3. Every asset has a class, and every plant or facility part a role, name and purpose.
4. Every operable part has normal states for every mode, typed state and a command path.
5. Every connection joins declared ports of matching medium and units.
6. Every operable part is bound to a control in exactly one installed room view, and every view control binds to an existing ID.
7. No tag is computed from order or position, and every alias resolves.

The tests then cover what types cannot prove: reachability and legibility in the room, line-ups played on the model (drain and refill first), conservation of water, and old saves loading.

## 11. Worked example: the footbath

Draining and refilling a pool is the first operation, by the owner's decision of 2026-10-22. In the footbath's plant room, `PL4`:

| Tag            | Asset ID               | Name                       | Running | Drain-down |
| -------------- | ---------------------- | -------------------------- | ------- | ---------- |
| `PL4-CAB1`     | `footbath.cab`         | Footbath treatment cabinet | —       | —          |
| `PL4-CAB1-P1`  | `footbath.cab.pump`    | Circulation pump           | on      | on         |
| `PL4-CAB1-SV1` | `footbath.cab.suction` | Pump suction valve         | open    | open       |
| `PL4-CAB1-RV1` | `footbath.cab.return`  | Return to footbath         | open    | shut       |
| `PL4-MU-IV1`   | `footbath.makeup.iv`   | Make-up isolating valve    | open    | shut       |
| `PL4-PW-WV1`   | `footbath.drain.wv`    | Drain-down valve, to waste | shut    | open       |

The drain-down procedure then reads: "From `running`: shut `PL4-MU-IV1`; shut `PL4-CAB1-RV1`; open `PL4-PW-WV1`; watch the level fall; stop `PL4-CAB1-P1` at low level." Its test plays exactly that on the model through `applyAction` and `advance`. The pilot fixes the exact valves (review question 4).

## 12. Decisions still open

These go to the owner one at a time:

1. When something is moved to another room, does its tag change to the new room's code (the old tag kept as an alias), or does it keep its original plate? This proposal assumes it changes, as a real site would retag on relocation.
2. Section 7: replace "every engineering item is a working component" with the class-and-role rule?
3. How much unsafe operation is possible: may a player dead-head a pump or defeat a sequence and see the fault, or do interlocks prevent it?
4. The footbath's real drain route and connection points, to fix the pilot's valves.
5. Should the manual document alternative operating modes and fault procedures, or only normal running?
