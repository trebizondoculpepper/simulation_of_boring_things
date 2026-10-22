# Identifying the plant: valve tags, line numbers and the plant register

Research and proposals, 2026-10-22, at the owner's request: make the plant comprehensible as a real one is, with every valve and pipe identified, indexed and described, and a test that keeps it so. Nothing here is built yet.

## Contents

1. How a real plant does it
2. What we have now
3. Proposal
4. The tests
5. Order of work
6. Questions for the owner

## 1. How a real plant does it

A UK building-services plant room of around 2000, as handed over by a mechanical contractor, identifies its plant in five layers, all cross-referenced by number.

**Pipes (BS 1710).** Every pipe carries colour bands for its contents (green with a white band for pool water, and so on), a legend naming the contents, and arrows for the direction of flow, at junctions, on either side of walls and at intervals along straight runs. Building services usually label a pipe by service and destination ("POOL WATER — TO FILTERS") rather than by number. Process plants go further and give every line a number from a line list, typically size, service, sequence and pipe specification (`150-PW-101-U`), so a drawing, a stress calculation and a maintenance record all name the same pipe. Our game already does the building-services half.

**Valves (tags and the valve chart).** Every valve that is not part of a packaged machine carries a tag: an engraved disc, traffolyte (laminated plastic) or brass, about 40–50 mm across, on a chain or a ring round its neck or handwheel. It shows the valve's number and often its service. Typical council and university M&E specifications require each valve in a plant room to be numbered, and a framed valve chart to be displayed in the room giving each valve's number, function and location. Better charts also give its size, type and normal position (normally open or normally closed). The same numbers appear on the record (as-built) drawings and in the O&M manual.

**Equipment (tags and rating plates).** Every machine carries the contractor's tag plate (`P-101A`) beside the maker's rating plate. The tags follow a scheme by system: pumps P, filters F, tanks T, heat exchangers HX. We already do this.

**Instruments (ISA-5.1).** Gauges, transmitters and switches are tagged by what they measure and do, then a loop number: `PI-101` pressure indicator, `FT-101` flow transmitter, `LSL-102` low-level switch. The convention is ANSI/ISA-5.1, near universal on process plant and common on larger building services.

**Documents.** The O&M manual (in the UK, following BSRIA's guidance on O&M manuals) holds the asset register, the equipment schedule, the valve schedule, the system schematics with every valve numbered and drawn in its normal position, and the operating procedures. The procedures name valves by number: "Close V-131 (make-up isolating valve)". A framed copy of each system's schematic usually hangs in the plant room beside the valve chart. Safe isolation (HSE's HSG253) adds valve locks and "Do not operate" tags when a valve is held for maintenance.

The modern international scheme is reference designation to IEC 81346 (in power stations its forerunner KKS), which names everything by its function, its product and its location as separate aspects. It is too modern for a plant of around 2000 to wear on its tags. It matches our plant model's addresses closely, though, and suits the register behind the tags (see 3.1).

## 2. What we have now

- **Pipe runs** (`src/toolkit/gallery/logic/room-pipes.ts`): each has a `name` ("Suction main, balance tank to the pumps"), a `service` and a `label` ("SUCTION"), drawn with BS 1710 bands and legends (`pipe-markers.ts`). They have no line numbers, and no index lists them.
- **Room-pipework valves** (the `valves` of each run): a few dozen, each with a code `name` such as `F1 inlet valve`, `Balance tank drain valve`, `LTHW flow isolating valve` or a gas isolating valve. Each is a working lever or chain wheel (`water-butterfly-valve.ts`, `gas-fittings.ts`). Nothing about it is visible to the player. Most are not bound to the world: the butterfly valve toggles its own `open`, and the world never hears of it.
- **Machine-internal valves**: valves drawn as part of a machine's model, for example the balance tank's pump suctions and make-up outlet (`balance-plant.ts`), the pump sets' discharge valves (`pumps-plant.ts`), the meter's gate valves and the dosing injection ball valves. They are static geometry from `plantTools().butterflyValve`. They have no name, they do not work, and they break the project's rule that engineering items are working components.
- **The plant model** (`src/game/plant/circulation.ts` and the `sim/` blocks) addresses ports and blocks by path (`P-101.in`, `circulation/P-101/motor:running`). Its names and the room pipework's names are not linked.
- **The manual** (`doc/plans/operators-manual.md`) plans an equipment schedule, schematics labelled by tag, and an index, but no valve schedule or line list.
- **Drain-down** is a single world flag per pool (`pool/drain-down`, `pool/make-up`), with no valves of its own.

## 3. Proposal

### 3.1 One plant register

One pure-logic module, the plant register (`src/game/plant/register.ts`, tested beside it), would be the only place a tag is defined. Each entry would hold:

- `tag`: `V-131`, `200-PW-104`, `P-101A`, `PI-101`.
- `kind`: valve, line, equipment or instrument.
- `system`: Olympic circulation, Lounge circulation, make-up, LTHW, gas, drainage, chemicals, and so on.
- `room`: the plant room it is in.
- `description`: "Make-up isolating valve, Olympic balance tank".
- `function`: what it is for and when it is worked, a sentence or two for the valve chart and the manual.
- For a valve: its type (butterfly, gate, ball, check), size (DN), operator (lever, handwheel, chain wheel), and **normal position** (open or closed in normal running).
- For a line: `from` and `to` (tags or ports), service and size.
- `address`: the plant model address it drives or reads (`olympic/drainDown:open`), or `manual-only` for a valve the model does not yet need. A tag is not an address: the tag is what the plant wears, and the address is what the model calls it.
- `maker`, for the equipment schedule and the tag plate.

Everything else reads from the register: the room pipework takes each valve's tag from it, the tags and charts in the rooms print from it, and the manual's schedules, schematics and index are generated from it. A valve can only be created by passing it a register entry, so an untagged valve does not typecheck.

### 3.2 Numbering

The numbering would follow the equipment tags we already have, so the numbers read as one scheme. Each circuit takes the hundred of its pumps:

| Series   | System                                | Example                                               |
| -------- | ------------------------------------- | ----------------------------------------------------- |
| 1xx      | Olympic circulation (P-101)           | V-131 make-up isolating valve; V-140 drain-down valve |
| 2xx      | Lounge circulation (P-201)            | V-231, V-240                                          |
| 3xx, 4xx | Jacuzzi and footbath packages         | V-301                                                 |
| 5xx      | Heating, LTHW (the boilers are B-50x) | V-511 LTHW flow isolating valve                       |
| 6xx      | Gas                                   | V-601 cascade 1 gas isolating valve                   |
| 7xx      | Make-up water, break tank and booster | V-701                                                 |
| 8xx      | Chemicals                             | V-811 hypochlorite injection isolating valve          |
| 9xx      | Drainage and backwash to sewer        | V-901                                                 |

- **Valves** would be `V-nnn`.
- **Lines** would be `DN-service-nnn` (`200-PW-104`), the line number printed on the existing BS 1710 legend after the destination ("POOL WATER — TO FILTERS — 200-PW-104").
- **Instruments** would be ISA-5.1 (`PI-101`, `FI-140`).
- Valves inside a packaged machine (a dosing pump's own suction valve) would belong to the machine and carry no tag, as in a real plant. The test would know them by a flag in the register, not by being left out.

### 3.3 What the player sees

- **Valve tag** (a new component, tried on dev0's boards first): a 45 mm traffolyte disc on a chain from the valve's neck, black engraved on white, or red on white for the fire and gas services. It shows the tag large and a two-word service below ("V-131 / MAKE-UP"). It swings when the valve is worked. Up close the number is legible. As a game affordance, looking at a tagged valve or pipe could show its tag and description in the status line, the same way the room's title card is shown.
- **Line numbers** on the existing pipe legends.
- **A valve chart** in each plant room: a framed sheet listing that room's valves with number, description, size and normal position, printed by the installer, Bramhall Fenwick Engineering. It is generated from the register, so it cannot drift from the valves in the room.
- **A system schematic** framed beside it: the same DOT drawing as the manual's, with every valve numbered and drawn in its normal position.

### 3.4 The operator's manual

For each plant room's chapter:

- a **valve schedule** (the valve chart);
- an **equipment schedule** (already planned);
- an **instrument schedule**;
- a **line list**;
- the **schematics** numbered as above.

The procedures, such as the drain-down runbook, would be written against tags ("Close V-131. Set V-140 to DRAIN."). A **general index** at the back would list every tag and every name, giving the page and the room. Since the register holds a `function` for every valve, every valve gets its paragraph.

### 3.5 Making the drawn valves real

The machine-internal valves would become working valve parts with tags, the same as the room pipework's. The pump sets' suction and discharge valves are the ones a drain-down needs, along with the balance tank's suction and make-up valves. This is also where the missing drain-down valves go. Per pool:

- the make-up isolating valve;
- the suction changeover (from the balance tank, or from the main drains);
- the drain-down valve on the pump discharge, to the sewer;
- the return isolating valve.

The world would then take its drain-down state from those valves' positions instead of a single flag, so getting the line-up wrong does something.

## 4. The tests

These are the checks the owner asked for, all pure-logic tests beside the register:

1. **Every tag is unique and well formed** for its kind (`V-nnn`, `DN-XX-nnn`, ISA letters and loop).
2. **Every valve in the game is in the register.** Every room's valves (the room pipework's `valves`, and the machines' valve ports once they are parts) are gathered, and the test checks each one's tag. A valve with no tag fails, naming the room and the valve.
3. **Nothing in the register is missing from the game.** Every register entry is placed in exactly one room, so the chart cannot list a valve that isn't there.
4. **Every entry is described:** description, function, and (for valves) type, size and normal position are present and not placeholders.
5. **Every line joins what the register says it joins:** each pipe run's `joins` match its line's `from` and `to`.
6. **Every address exists.** Each `address` resolves in the plant model, or the entry is marked `manual-only`.
7. **Normal positions are the starting state.** A new world has every bound valve in its normal position, so normal running is the documented line-up.
8. **The documents cover everything.** Every tag appears in its room's valve chart, in the manual's schedule and in the index. Every tag a runbook names exists, and the runbook's line-up, played on the model, does what it says (the drain-down test, written against tags).

Only one claim is not a pure-logic test: that the tag can be seen. The type system covers it: valve parts are built from register entries, so every valve view draws its tag. Where a check is needed, a view test can traverse a room's scene graph for valve parts with no tag mesh.

## 5. Order of work

Each step is a checkpoint that can be committed on its own.

1. **The register, the numbering and tests 1, 4 and 6**, populated from the room pipework's existing valves and lines.
2. **Tests 2, 3 and 5**, with the room pipework's valves taking their tags from the register.
3. **The valve tag component** on dev0, then on every room-pipework valve, and line numbers on the legends.
4. **The missing drain-down valves** (3.5), bound to the world, with the drain-down runbook test rewritten against tags (tests 7 and 8 in part).
5. **The machine-internal valves** made working and tagged, machine by machine.
6. **The valve charts and framed schematics** in each plant room.
7. **The manual's schedules, line list and index** (test 8 in full).

## 6. Questions for the owner

- Valve numbers by circuit series (`V-131`, as proposed) or by system prefix (`PW-V-031`, `MU-V-01`)? The first is shorter on a disc and matches the pump tags.
- Should looking at a valve show its tag and description in the status line, or should the player have to read the disc and look it up on the chart?
- Should valves have locks and "Do not operate" tags for safe isolation (HSG253), or is that for later?
