# Prompt: the pipe helper draws a line from what it carries

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `AGENTS.md` first; its rules apply. Read `doc/prompts/008-pipe-supports.md` (the pipe helper's supports and routing rules) and `doc/reports/port-graph-architecture-review.md` (typed media and ratings) before designing.

## What the owner wants

The pipe helper should know what each run **carries** and its **rating**, for example "3-phase power, 100 A" or "ozone, 1 g/s", and from that be responsible for everything that follows from it:

- the pipe's material and size;
- its colour;
- its identification bands, label and flow arrow.

A caller says what the line is; it no longer picks a pipe kind, a colour or a label by hand.

## What is there now (checked 2026-10-23)

- **The helper knows material and size, not what is carried.** `createPipe(kind, od, points, options)` (`src/toolkit/components/core/views/pipe-kinds.ts`) takes a `PipeKindId` (`pvc-pressure`, `copper`, `lagged-heating`, `steel-screwed`, `stainless`, `chemical-tube`, `flue`…) and an outside diameter, and draws the material, joints, bends and lagging. Nothing tells it whether a steel pipe carries gas or cables.
- **What is carried lives in each caller, in three shapes:**
  - `PipeRun.service` in `src/toolkit/gallery/logic/room-pipes.ts` ('pool water', 'heating flow', 'electrical', 'hypochlorite', 'ozone', 'sample', 'make-up', 'gas', 'flue', 'hot water'…);
  - `ServiceRoute.utility` in `room-services.ts` ('power');
  - `CabinetRun.service` in `cabinet-pipes.ts`.
- **No ratings anywhere** in the drawing data. The plant network (`src/game/plant/network/types.ts`) has a `Service` per port but no ratings either.
- **Marking is a separate, opt-in call.** `markPipe(kit, points, { radius, service, text })` (`src/toolkit/components/plant/views/pipe-markers.ts`) draws BS 1710 bands (a basic colour and a code band), a label and an arrow. Only `room-pipework.ts` and `cabinet-services.ts` call it, and only for pipes of 20 mm and over. The conduits and everything else are unmarked.
- **The arrow is wrong half the time by construction:** it comes from the order the run's points were written in, not from which way the line flows.
- **Wrong colours, found while writing this:**
  - `MARKED` in `room-pipework.ts` bands **ozone as compressed air**;
  - it bands **make-up** (mains water) and **domestic hot water as pool water**;
  - the pool plant rooms' **acid lines carry the service `hypochlorite`**, so they are banded and labelled as hypochlorite;
  - the hand-written labels are free text, unchecked.

## What to build

1. **A line description, in pure logic** (for example `src/toolkit/components/core/logic/pipe-lines.ts`), tested:

   ```ts
   interface LineSpec {
     medium: Medium; // 'pool-water' | 'mains-water' | 'lthw-flow' | 'lthw-return' | 'dhw' | 'natural-gas'
     // | 'hypochlorite' | 'acid' | 'ozone' | 'sample' | 'drainage' | 'flue-gas'
     // | 'ac-400v-3ph' | 'ac-230v' | 'control' | 'air' ...
     rating?: Rating; // typed quantities: current (A), voltage (V), flow (m³/h, l/h, g/s), pressure (bar, mbar)
     flow?: 'forward' | 'reverse' | 'both'; // normal running, relative to the run's points
     name?: string; // a line tag where it has one (PL2-PW-L2), else derived
   }
   ```

   Make media and quantities **literal types**, not plain strings, so `{ medium: 'ozone', rating: { current: … } }` fails to compile where a rating does not suit the medium; validate at runtime what is built from data. Use the shapes the port-graph review sketched (its section 6), so the plant network can adopt the same types later.

2. **A table from medium to drawing**, in the same logic module, one place:
   - **Material** (`PipeKindId`) by medium: pool water PVC-U; mains water and DHW copper; LTHW lagged steel; gas screwed steel painted yellow ochre; hypochlorite and acid chemical tube (or ABS); ozone stainless; drainage PVC-U drain; flue gas flue; power and control steel or PVC conduit.
   - **Size from rating:**
     - conduit and cable from current, after the On-Site Guide's cable sizes and conduit capacity;
     - bore from flow, at the velocity rules `sizing.ts` already uses (`dnFor`);
     - a caller may still give a size, which is checked against the rating, not silently overridden.
   - **Colour:** the BS 1710 basic colour and code colour for each medium, from `BS1710_BASIC` and `BS1710_CODE` (`plant-tools.ts`). The pipe body takes its material's own colour unless the medium is painted overall (gas yellow ochre; fire mains red). Electrical conduit is banded orange. Check each medium's colours against BS 1710:1984 and its Table 1 code colours, and say which you could not confirm. Drinking water (mains, make-up) is green with an auxiliary blue band; hypochlorite and acid are violet, told apart by their code band and label; ozone is light blue (gases other than air).
   - **Label text:** derived from medium and rating, for example "LTHW FLOW 80 °C", "400 V 3-PH 100 A", "OZONE 1 g/s", "SODIUM HYPOCHLORITE 15 %".
   - **The arrow,** from `flow`. A line marked `both` gets a double arrow; a conduit gets none.

3. **The helper draws it.** One entry point, for example `createLine(spec, points, options)`, draws the pipe from the table and its marking:
   - bands near each end, beside each valve, either side of each wall penetration, and at most every few metres;
   - the label and arrow on the longest straight.

   `markPipe` becomes internal to it. `createPipe(kind, …)` stays for exhibits and decorative pipework (the services ceiling, the pipe gallery), which have no medium.

4. **Callers move onto it,** in this order:
   - the room conduits (`room-services.ts`);
   - the cabinet services (`cabinet-pipes.ts`, `cabinet-services.ts`);
   - the pool plant rooms' and the wet hall's and boiler house's pipework (`room-pipes.ts`, `room-pipework.ts`).

   Each run states its `LineSpec` instead of a kind, a service and a label, and the `MARKED` table and the free-text labels go. Where a run's direction is known from the plant network (`src/game/plant/network/`: a pump's discharge, a drain to the holding tank), use it. Otherwise state it, and test it against the network where the run has a network counterpart.

5. **Ratings for the existing runs:**
   - pool water from each pool's design flow (`POOL_TARGET`);
   - power feeds from each machine's rated current (the pump's motor kW at 400 V 3-phase; the plates in `brands.ts` and the machine models already state many);
   - the ozone generator's output (160 g/h is the Olympic's);
   - dosing from the pumps' rates.

   Where a figure is a guess, say so in a comment.

## Tests (the acceptance)

- **The table:** every medium has a material, a colour pair, a label and a size rule; electrical conduit is orange-banded; no two media share a colour pair and label.
- **Size from rating:** 100 A at 400 V 3-phase gives a conduit at least as large as the On-Site Guide requires for its cables; a pool's design flow gives the bore `dnFor` gives. A caller's size smaller than its rating needs is a reported problem, not a silent change.
- **Types:** a fixture showing a mismatched medium and rating fails to compile (as a `// @ts-expect-error` line), and the runtime validator rejects the same built from data.
- **Every run in every room** (`ROOM_SERVICES`) is drawn through a `LineSpec`, has a label and an arrow where it flows, and its arrow agrees with the plant network wherever the run has a network counterpart.
- **The wrong colours above are fixed:** ozone not banded as air; make-up and DHW not as pool water; the acid lines labelled and banded as acid.
- Render a pool plant room (`?room=plant_pool_02`), the wet hall and the control room, and check by eye that the bands and labels read correctly and the arrows point the way the water goes.

## Rules for this work

- Follow `AGENTS.md`; UK spelling; Markdown one paragraph per line.
- Before every commit run `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` and `npm run build`; commit only when all pass. If other agents' unfinished files break the checks in the shared checkout, verify in a scratch copy (`git archive HEAD`, your files copied in, `node_modules` symlinked) and say so.
- **Another agent works in this same checkout**, and the pipe helper's supports (prompt 008) are being built at the same time by the main Claude session. Commit only the files you changed, naming them in `git add`, never `git add -A`. Leave others' uncommitted files alone; if a file you need has someone else's uncommitted changes, stop and say so rather than editing over them. Coordinate with prompt 008's work in `room-pipework.ts`, `cabinet-services.ts` and `room-services.ts`.
- Add each change to `CHANGELOG.md` under Unreleased, unless someone else has uncommitted edits in it; write a diary entry.

## Return path

Commit each step as `lines(<step>): <what changed>` and push; rebase if `main` moved, never force-push. When done, or if you stop, write `doc/reports/pipe-lines-progress.md`:

- start with a line naming yourself (model and tool) and the UTC date;
- give each step and test a line: done, partly done or not done, with commit hashes;
- list every colour or size rule you could not confirm against its standard, and every rating that is a guess.

Commit it as `report(lines): <summary>`.
