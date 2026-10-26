# 066: The lounge pool's filter mimic, grouped by filter, showing its flows

Status: mostly complete (reviewed 2026-10-26, source `e5078c4`).

## Review checkpoint — 2026-10-26

**Classification:** Mostly complete. **Filed:** `doc/prompts/done/066-lounge-filter-mimic.md`.

**Delivered:** PL1-CP1 has the lounge filter mimic, LED flow chasers, two flowmeters and working reverse backwash.

**Still outstanding:** Install the control-room copy and maker mark, preserving local-only mode/reset controls; test synchronized readings and remote START permissions, and complete the two-board browser acceptance.

**Evidence:** 117c729, 4371e93, 63e2d0d. Reviewed against source `e5078c4`.

The original request and earlier implementation notes below are retained as history; this checkpoint supersedes any conflicting old completion claims. Outstanding work remains open in the root TODO.

## The request

The owner, 2026-10-25: redesign PL1-CP1, the lounge pool's local control panel, "so that the controls for each filter are grouped together. It should be a schematic/mimic which shows the flows (since we have flow meters)." Then: "the mimic should be a component, re-used by the mimic+panel. The gameplay reason is that some controls should only be local. If that were not the case you'd never need to go anywhere."

## What there is now (checked 2026-10-25)

- **PL1-CP1** (`asset-0006`, `src/toolkit/gallery/rooms/plant/pump-panel.ts`, `pumpPanelExhibit('pool_01')`): a three-door Penfold control cubicle in `plant_pool_01`. Its fascia carries `LOUNGE_VALVE_MIMIC` (`src/toolkit/gallery/logic/lounge-valve-mimic.ts`), titled "LOUNGE POOL — FILTER VALVES".
- **The fascia is a grid, not a schematic.** It shows the eleven lounge valves (`LOUNGE_VALVES`, `src/game/plant/lounge-valves.ts`, every `PL1-` valve in `installed-valves.ts`) four to a row. Each has its tag, OPEN and SHUT lamps, and OPEN and SHUT buttons; P1 and P2 START, STOP and RUN run along its foot. It has no lines, no symbols and no readouts.
- **Each pump's door** carries its tri-state indicator, seven-segment ammeter, HAND · OFF · AUTO selector and RESET, bound to the world's starters.
- **No flowmeters in the lounge plant room.** Only the Olympic plant room has them: PL2-P1-FT1 and PL2-F1..F5-FT1, Kessler-Moody, in `installed-fixtures.ts`, drawn by `mag-flowmeter.ts`. The lounge's flows are computed in the world (`loungeValveFlows`: to the pool and to waste), but nothing in the room measures them, and not per filter.
- **The mimic spec** (`MimicSpec`, `src/toolkit/components/industrial-control/logic/mimic.ts`) has printed lines, symbols, labels, lamps, LED readouts, buttons and modes. Its lines do not light or animate.
- **The control room** (`control_room`; `src/toolkit/gallery/rooms/plant/control.ts`) has wall mimics for the main pool circuit, heating and air handling, but none for the lounge pool.

## The owner's rulings (2026-10-25)

1. **Flowmeters, one per filter outlet:** PL1-F1-FT1 and PL1-F2-FT1. They are real, registered and branded (Kessler-Moody, as the Olympic room's), drawn in the lounge pipework and read from the world. Each reads its filter's flow up the outlet in service, and reversed while backwashing.
2. **A schematic, grouped by filter.** It is drawn as the plant runs: the balance tank, pumps P1 and P2, the discharge header, the two filters side by side, the return to the pool, and the waste lines. Each filter's inlet, outlet, backwash and drain valves stand around its symbol, each with its OPEN and SHUT lamps and buttons on the pipe it works, and the filter's flow readout beside it.
3. **LED chasers show the flow:** a row of small LEDs along each pipe, chasing in the flow's direction, dark where nothing flows. Backwash shows as a reversal. It is a new kind of display, so it is tried first in dev39, the room for control panels and other assemblies (the owner, 2026-10-25: dev0 is for single components).
4. **The pump doors stay as they are:** indicator, ammeter, HAND · OFF · AUTO and RESET. START, STOP and RUN are on the schematic beside each pump.
5. **The mimic is one component, used twice:**
   - in PL1-CP1, with the local controls on its doors;
   - as a new wall mimic in the control room: the schematic only, bound to the same world valves, pumps and meters.

   Both are the same control, so they always agree.

6. **Some controls are only local** (the gameplay reason): if everything could be worked from the control room, the player would never need to go anywhere. HAND · OFF · AUTO and RESET stay on the plant room's panel only. The control room's copy shows everything and works what the mimic carries (valves' OPEN and SHUT, pumps' START and STOP), but sending a pump to HAND, or resetting a trip, means walking to the lounge plant room.

7. **A true backwash** (the owner, 2026-10-25). The lounge's flow model (`loungeValveFlows`) has no reverse flow today: backwash is only "inlet open and backwash valve open, so water to waste". It is changed so a filter backwashing is fed in reverse: filtered water from the return header (from the other filter in service) goes down that filter's outlet (IV2 open, IV1 shut), up through its bed, and out through its backwash valve (BV1) to waste. Its outlet line chases backwards, its flowmeter reads negative, and its backwash line to waste lights. The reviewer checks that the lounge's four valves per filter can make this path; if they cannot, report what valve is missing rather than inventing one.
8. **The rule is the project's** (the owner, 2026-10-25): "some controls are only local" is now a rule in `CLAUDE.md`, for every plant room and the control room.

## Settled details

- **Units.** The model's flows are m³/h already: the lounge pool's design circulation is 90 m³/h (`pools.ts`), 45 through each filter. Backwash runs at about 34 m³/h, 30 m/h over a Ø1.2 m filter's 1.13 m² bed, taken from the filter in service, so the pool's return drops by that much while it lasts; the drains run at their present rates. The meters show m³/h to one decimal place, negative in reverse.
- **World shape.** No change: flows are worked out from the valves' positions and the pumps' states on demand, as now, so neither `WORLD_VERSION` nor a migration is needed. If the reviewer finds otherwise, bump it and migrate.
- **The chaser.** LEDs 25 mm apart along each line, each 6 mm across, in the line's colour, one lit in every four. The pattern steps every 0.12 s of real time in the flow's direction. A line whose flow is under 1 m³/h is dark. A line through a valve still travelling chases at the flow it carries, and goes dark once the flow stops.
- **Layout.** The board stays 2.4 × 1.2 m. Before building, lay the schematic out in a pure spec and test that no two of its parts (lamps, buttons, readouts, labels) overlap, and that each button has at least 30 mm clear round it.
- **The control room's board** is placed by the room's sizer and scorer. If it does not fit beside the three mimics and the annunciator, report it to the owner rather than shrinking it.

## What to build

1. **The chaser display**, in `src/toolkit/components/industrial-control/`.
   - A new optional field on each `MimicSpec` line: its flow source (an id) and the direction it runs.
   - A new map on `MimicState`: each flow id's state (flowing forward, flowing back, or still).
   - The board draws LEDs along each line with a source. They run at a fixed real-time pace, independent of the simulation's speed, in the direction given, and stay dark while still.
   - The LED's colour follows the line's (water blue), or amber if a spec asks for it.
   - Pure logic (which LED is lit at which phase) goes in `logic/`, tested; the view instances its LEDs, so a board of many lines stays cheap.
   - Tried first in dev39 (control assemblies): one line forward, one back, one still, one changing. Done 2026-10-25.
2. **The flowmeters.** Done 2026-10-25, with the true backwash (the pool's return drops by the backwash's 34 m³/h; both filters backwashing wash neither).
   - PL1-F1-FT1 and PL1-F2-FT1 go in `installed-fixtures.ts` with new asset ids, after the highest in use.
   - They are drawn on the lounge filters' outlet runs in `room-pipes.ts`, the way the Olympic room's are.
   - The world gives each filter's flow, in m³/h with its sign: `loungeValveFlows` grows a per-filter result, and the world exposes it.
   - Each meter's own display reads it, as the Olympic meters' do.
   - `registration.test.ts` covers them already; add them to the inventory's expectations.
3. **The schematic spec**, `LOUNGE_FILTER_MIMIC` (replacing `LOUNGE_VALVE_MIMIC`).
   - Its lines, symbols, valves, pumps and readouts are laid out as ruling 2 describes, on the board's existing 2.4 × 1.2 m (or a size agreed with the review).
   - Each line names its flow source: the pump suction, each pump's discharge, the header, each filter's inlet, outlet and backwash, each drain, the return and waste.
   - `loungeFilterMimicState(world)` gives the lamps, the two flow readouts (F1 FLOW and F2 FLOW, m³/h) and each line's flow state. It is pure and tested.
   - A line's state comes from the world's flows and the valves' positions (never from the board), so the two boards cannot disagree.
4. **One component, two installations.** A `createLoungeFilterMimic(kit, options)` builds the board, binds its buttons to world commands (valves' `plant/valve`, pumps' `motor/starter` START and STOP) and its state to `loungeFilterMimicState`.
   - PL1-CP1's fascia uses it, with its doors unchanged.
   - The control room gains a wall item, "Mimic: lounge pool filters", built from the same component.
   - Its place on the walls is found with the room's sizer and scorer (`doc/room-layout-guide.md`), not by hand.
   - Each board carries the Penfold mark in its top right corner (or its bottom right, where the top right is in use).
5. **What stays local.** The control room's board offers no HAND · OFF · AUTO and no RESET.
   - A pump in HAND or OFF, or tripped, shows that on both boards' lamps. Its START does nothing at either board until it is put back in AUTO, as now.
   - The prompt's tests make this explicit, so it is not "fixed" later by mistake.

## Tests

- Chaser logic: which LEDs are lit for forward, back and still, at successive phases; the pace is independent of the simulation's step.
- `loungeFilterMimicState`:
  - filter 1 in service gives its inlet, outlet and return lines flowing forward and F1 FLOW positive;
  - filter 1 backwashing gives its outlet reversed, its backwash line to waste flowing, and F1 FLOW negative;
  - both pumps stopped leaves everything still and the readouts at 0;
  - a valve's lamps follow its position.
- The two boards' states are identical for the same world, being one function.
- The control room's board has no mode selector or reset; pressing START on it with the pump in HAND changes nothing.
- The flowmeters: registered, drawn, and reading the world's per-filter flows.

## Acceptance

- In the lounge plant room, PL1-CP1's fascia is a schematic. Each filter's four valves sit around its symbol with its flow reading. With filter 1 in service its lines chase toward the pool; on backwash its outlet line chases backward and its waste line lights.
- In the control room, the same board shows the same thing at the same moment and works the same valves and pumps, but cannot change a pump's mode or reset a trip.
- The two new flowmeters read in the room what the boards show.

## For the reviewer

- Check that the chaser can be added to the shared mimic component without changing the other boards' look. Lines without a flow source must draw as now.
- Check the true backwash path (ruling 7) against the lounge's valves and the room's pipework.
- Check that the control room has wall space for a board of this size, given its three mimics, the annunciator and the other items.
- Report any wording on the board the owner should see before it ships.

## Remaining (checked 2026-10-26)

- "Mimic: lounge pool filters" on the control room's wall from `createLoungeFilterMimic`, without HAND · OFF · AUTO or RESET, placed by the room's sizer and scorer; if it does not fit beside the three mimics and the annunciator, tell the owner.
- The Penfold mark on the control room's board.
- A test that the control room's board offers no mode selector or reset, and that its START does nothing to a pump in HAND.
- Acceptance in the browser: both boards show the same thing at the same moment.
