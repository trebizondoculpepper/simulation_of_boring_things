# 063: Component information, what remains

Status: mostly complete (reviewed 2026-10-26, source `e5078c4`).

## Review checkpoint — 2026-10-26

**Classification:** Mostly complete. **Filed:** `doc/prompts/done/063-component-information-remediation.md`.

**Delivered:** The room-model binding and component/part inspection foundation is delivered; the prompt already records zero unbound plant items and the remaining tag/description cases.

**Still outstanding:** Retain and execute the nine remediation actions below: discharge/regulating valve descriptions, canonical tags and migrations, per-kind statuses, register derivation, coverage outside plant rooms and browser acceptance.

**Evidence:** 4b17b50, 209d53b; doc/reports/plant-identification-gap-audit.md. Reviewed against source `e5078c4`.

The original request and earlier implementation notes below are retained as history; this checkpoint supersedes any conflicting old completion claims. Outstanding work remains open in the root TODO.

## Review, 2026-10-26: what is still to do

Checked against the code on 2026-10-26 (main at the time). **Still needed, but much smaller than when it was opened.**

**Done since it was opened:**

- **Every plant room is bound to its model** (items 0 and 1, the main work): each has a schematic (`schematics.ts`: lounge, jacuzzi, footbath, wet hall, boiler house, switch room, the stores, loading bay, air plant), and `world-in-model.unbound.json` pins **0 unbound drawn things in every room**, down from 361 of 479. The schematic rooms' valves are derived from their schematics (`model-valves.ts`), with hierarchical tags and routes, so their descriptions read as the rulings ask: PL3-BT1-IV1 gives "Isolates water flowing from the water service to the jacuzzi balance tank." (061's acceptance sentence).
- **Valve descriptions:** 83 of the 86 registered valves have one; the three left are below.
- **The footbath's overflow valve PL4-PW1-IV2** (answer 4): removed.
- **Part inspection** (item 6, partly): prompt [068](068-inspect-component-parts.md) named controls, lamps and readouts inside panels (the lounge mimic, the pump panels' doors, flowmeters); the jacuzzi music rack's source and amplifier now name themselves and their state (2026-10-26); the pool halls mark some components.
- **Statuses** (item 7, partly): UV units (On or Off) and ozone monitors have them now, beside the pumps, pump sets, tanks, booster set, cabinets and valves.

**Actions, in order** (quickest first; each ends with the project's five checks and its `TODO.md` item ticked with its commit):

1. **Describe the pumps' two discharge valves, PL2-P1-IV3 and PL2-P1-IV4.**
   - In `olympic-plumbing.ts`, give the fittings `pumps.dischargeA.iso` and `pumps.dischargeB.iso` (set by the room's code on the `Discharge A` and `Discharge B` risers) the annex's links `pumps.dischargeA` and `pumps.dischargeB` (`olympic-annex.ts`), so `olympicValveRoutes()` gives each a route.
   - Done when both read "Isolates water flowing from the circulation pump … to …", and `component-descriptions.test.ts` no longer lists them as unrouted.
2. **Describe the regulating valve, PL2-F-RV1** (answer 5).
   - Add a regulating-valve template to `component-descriptions.ts`: "Regulates <medium> flowing from <source> to <destination>.", chosen by the fitting's kind (`regulating-valve`), beside the isolating one.
   - Put `battery.outlet.regulating` on the enhanced network as a fitting of a link (by a plumber rule, not the room's code), so its route is derived.
   - Done when PL2-F-RV1 reads "Regulates water flowing from the filters' outlet header to …" and all 86 registered valves have a description.
3. **Derive the Olympic's valve tags; the filters' by function** (answer 3).
   - Replace `valveName`'s hand table in `olympic-plumbing.ts` with tags derived from the hierarchy (room, the machine served, the fitting's role and number), as `model-valves.ts` does for the schematic rooms.
   - The filters' five valves become IV1 inlet, IV2 outlet, BV1 backwash in, BV2 backwash out, RNV1 rinse, DV1 drain (PL2-F1-IV1 …), the same scheme in every room; update the registers, the battery's mimic and panels, the manual and the tests that name V1 to V5.
   - Bump `WORLD_VERSION` (32 now) with no migration (answer 6: a changed network may discard the saved world).
   - Done when no tag in `olympic-plumbing.ts` is written by hand and `registration.test.ts` passes.
4. **Hierarchical pump tags** (answer 2).
   - Rename the starters in `motor-starters.ts` (`MOTORS`: P-101A, P-101B, P-201A, P-201B) to PL2-P1-P1, PL2-P1-P2, PL1-P1-P1, PL1-P1-P2, and every use: `world.ts`, `pools.ts`, `services.ts`, `lounge-valves.ts`, `lounge-schematic.ts`, `part-inspection.ts`, `world-reading.ts`, `lounge-filter-mimic.ts`, `room-equipment.ts`, `dosing-equipment.ts`, `plant-corridor-room.ts`, the pump plates (`pumps-plant.ts`), the panels, the console and the tests.
   - Bump `WORLD_VERSION` with no migration (answer 6).
   - Done when no `P-101`/`P-201` tag remains in the source and the overlay, plates, panels and console all show the new tags.
5. **Statuses for the kinds still without one** (item 7).
   - In `statusBindingFor` (`component-descriptions.ts`) and `component-status.ts`, from the world only: the sand filters (In service, Backwashing, from the battery's flows and the lounge's valves), the heat exchangers (heating or not, from their primary valves and flow), the dosing pumps (dosing or stopped), the boilers (firing, from `boiler-house.ts`).
   - The AHUs last: first derive one tag set from the other (the catalogue's AP-AHU1 and the world's AHU-801 in `air-handling.ts`), never joining them by index.
   - Done when each reads "currently …" in the overlay, tested per kind.
6. **The registers derived from the network** (item 3).
   - First write the design for the owner's sign-off: what each register keeps (if anything, now that answer 6 lifts persistence), where the tags and names come from, and what replaces `installed-valves.ts`, `installed-asset-ids.ts`, `installed-fixtures.ts`, `installed-feeders.ts` and `ROOM_NAMES`. Build only once it is approved.
7. **Mark the components still unmarked** (item 6).
   - The corridors and the development rooms other than dev0: each engineering item marked by tag or name (`markComponent`), decorative where it is set dressing; then check the pool halls' coverage with the inspection audit (`inspection-audit.ts`).
8. **Stage 1's remaining acceptance checks** (item 5), in the browser:
   - pointer lock (centre aim), a gamepad and touch;
   - narrow screens (two lines at phone width, `.controls-help` at the top on touch);
   - ladders, carrying, noclip, the pause menu, the console and room changes;
   - a component behind a closed cabinet door, named only with the door open (first check that something inside the jacuzzi's cabinet is now a component of its own, since 064 bound the room to its model).
   - Record each check here, then ask the owner to accept stage 1.
9. **Stage 2, the action narratives** (061): begun once the owner has accepted stage 1.

The sections below are the mission as opened, kept as the record.

## The owner's rulings that shape it (2026-10-25, overnight)

- The model is the source of truth; plates, descriptions and the overlay follow from it, never the other way round.
- The model is the **enhanced network**: the equipment, the network drawn between it, and the valves and fittings the plumber adds (`expandForPlumbing`, `src/game/plant/plumbing-expansion.ts`). It may be edited by hand, but nothing may exist in the world that is not on it: it is the port graph of the world.
- No hand-written or manually produced structures: everything derives algorithmically from the game's model.
- Tags are hierarchical: room, group, item (PL2-P1-P1 is plant room 2, pump set 1, pump 1).

## The owner's answers (2026-10-25, asked one at a time)

1. **The old plant network:** find out whether anything uses it; nothing did, so it is deleted (item 4).
2. **Pump tags:** hierarchical (asked twice; the second time, chosen): the pumps become PL2-P1-P1, PL2-P1-P2, PL1-P1-P1 and PL1-P1-P2, starters, plates, panels and console included.
3. **Filter valve tags:** letters by function, derived from each fitting's role: IV1 inlet, IV2 outlet, BV1 backwash in, BV2 backwash out, RNV1 rinse, DV1 drain, the same scheme in every room.
4. **The footbath's overflow valve PL4-PW1-IV2:** removed, as the jacuzzi's was; the overflow runs unvalved and its asset id (valve-0094) is retired.
5. **The regulating valve PL2-F-RV1:** a regulating-valve template, derived from its link: "Regulates water flowing from … to …".
6. **Persistence:** not a concern for now. "If the network changes then the state of the game is meaningless for now. We can just throw the game state away if the network has changed." So a change to a room's enhanced network may discard the saved world (a version bump with no migration), and the registers need not keep anything by hand to carry saves across a retagging.

7. **The way rooms are made (the owner's diagnosis):** the fault is in how the rooms were designed. A room begins with the machines it needs and a schematic, its port graph, with every valve and isolator in it; the machines are placed; the plumber routes the pipes and places the valves as efficiently as it can (it may add valves its rules imply, which enhances the model, but if the schematic is correct it need add nothing); the rest of the process follows. Placing machines and valves in the visual space binds them to what already exists in the model: nothing can be put in the visual space that the model does not have. Written into `AGENTS.md` and `doc/room-layout-guide.md`; a test that every drawn machine, valve and pipe is a node, fitting or link of its room's enhanced network enforces it, the rooms not yet migrated listed in a list that only shrinks.

8. **The test first:** every machine, valve, isolator and electrical component in the world must be attached to a node of the port graph, or marked decorative, in which case it sits there and does nothing. The planning process: the schematic with all the machines and valves; the machines put into the room and their layout optimised; the plumber puts in the pipes and the valves the schematic already describes; then scoring. Written into `doc/room-layout-guide.md`; enforced by `world-in-model.test.ts` (below).

## 0. The enforcing test (built 2026-10-25)

`src/toolkit/gallery/logic/world-in-model.ts` lists, room by room, what each plant room draws (machines, valves, flowmeters, isolators, electrical components, pipes), from the same data its scene builders use, each with the model id it is drawn from; `world-in-model.test.ts` pins each room's count of things neither in its enhanced network nor decorative, and fails if a count rises (something drawn outside the model) or falls without its pin being lowered. At its start: 361 of 479 drawn things unbound. The Olympic plant room binds 107 of its 143 (its 36 are listed in the test); every other room binds nothing, having no enhanced network. Decorative today means a kind classed decorative (signs, furniture); the non-plant fittings (safety shower, spill kit, PPE cabinet, desks) count as unbound until each is either put in the model or marked decorative.

## 1. Build every plant room through the plumber (the main work)

Only the Olympic plant room (`olympic-plumbing.ts`, prompt 033) is laid out from an enhanced network. Every other room's pipework is hand-drawn: the lounge's runs and valves (`room-pipes.ts`), the jacuzzi's and footbath's cabinet services (`cabinet-pipes.ts`), the wet hall's and boiler house's. By the rulings these rooms' drawn valves are things that do not exist on any enhanced network, so their descriptions are empty (tag and name only) and their tags are not derived.

Done when each room's schematic is a port graph, expanded by the plumber (or by hand edits to its enhanced network), its pipework drawn from it and its valves' routes and tags derived from it, as the Olympic's are. Order, for the overlay's acceptance: the jacuzzi plant room first (061's sentence for PL3-BT1-IV1 waits on it), then the lounge, footbath, wet hall and boiler house. The room-layout guide (`doc/room-layout-guide.md`) is the recipe. Keep the installed valves' asset ids and save keys: a valve's identity in the save survives its retagging.

Each room's routes then join `enhancedRoutes()` in `equipment-catalogue.ts`, which today holds only `olympicValveRoutes()`. Generalise it to a per-room table of enhanced networks rather than adding rooms one by one.

## 2. Drawn things the Olympic's enhanced network does not hold

Even in the Olympic room some drawn valves are not fittings of its enhanced network, so they have no route (`component-descriptions.test.ts` names them):

- **PL2-P1-IV3, PL2-P1-IV4**, the pumps' two discharge valves. The schematic gives the `pumps` node one shared `discharge` port; the plumber sets one isolating valve on it, and the room's code (`valveName`'s table) draws two. Fix the schematic: two discharge ports (as it already has two suctions, `suctionA` and `suctionB`), so the plumber sets two valves.
- **PL2-F-RV1**, the battery's side-stream regulating valve, added by the room's code (`battery.outlet.regulating`), not by the plumber. Put it on the enhanced network (a fitting kind for regulating valves, set by a rule), and decide its description's template with the owner ("Regulates …").
- **The drawn tags themselves.** `valveName` in `olympic-plumbing.ts` maps each fitting to a tag by a hand-written table (V1 to V5, DV1, P1, T2, UV1, HX1). By the rulings tags should be derived from the network's hierarchy (room, the machine the fitting serves, the fitting's kind and number). Derive them, and decide with the owner whether a filter's five valves keep their battery numbers (V1 to V5, as real five-valve nests are lettered) or take kind letters (IV, BV, RNV, WV).

## 3. Hand-written registers that should be derived

The registers predate tonight and are hand-written: `installed-asset-ids.ts` (each placed item's asset id and tag), `installed-valves.ts` (each drawn valve's), `installed-fixtures.ts`, `installed-feeders.ts`, and the catalogue's `ROOM_NAMES`. By the rulings each tag and name should come from the enhanced network, the registers keeping only what must persist (asset ids, so saves survive a retagging). This is the larger consequence of the rulings and wants the owner's sign-off on the design before it is started: what persists, where, and how a renamed node keeps its asset id (the legacy network's serial register, `network/serials.ts`, is one precedent).

## 4. The legacy plant network: deleted

`src/game/plant/network/` (`PLANT_NETWORK`), an older schematic with its own tags, was found to be used by nothing in the game (only its own tests, two maintenance scripts and a storey constant), and the owner had it deleted (2026-10-25). `STOREY` moved to `plant-rooms.ts`.

## 5. Stage 1's remaining acceptance checks

Checked in Chrome: PL2-F1-V1's line (from the enhanced network), PL3-BT1's ("1st Balance tank in PL3, currently 68 % full"), P-101A Off then On with the pointer still, a wall clearing the line, dev0's controls named by their parts. Still to check, as 061 asks:

- Pointer lock (centre aim), a gamepad and touch.
- Narrow screens: two lines at phone width, where touch moves `.controls-help` to the top.
- Ladders, carrying, noclip, the pause menu, the console and room changes.
- **A closed cabinet door.** Picking blocks at the first surface (a scene test proves it), but no room has a separately marked component behind a door: the jacuzzi cabinet's door and internals are all PL3-CAB1. Done when one stands behind a door and is named only with the door open, which item 1's work on the jacuzzi will give.

## 6. Components not yet marked in the scenes

Marked: placed layout equipment, room pipework and cabinet services valves, flowmeters, switch-fuses, PL3-BT1, and each circulation pump within its pump set. Not yet: the controls nested in plant (the jacuzzi cabinet's buttons, valve panels' switches, starters, mimic buttons: by part name, as dev0 does, unless they get tags on the network); the footbath's identified model parts; and rooms not wired for inspection (the pool halls, `poolrooms-world.ts`; corridors; dev rooms other than dev0).

## 7. Statuses not yet given

Status is found from each item's kind and room (`statusBindingFor`): motors, pump sets, balance, break and backwash tanks, the booster set, the jacuzzi cabinet and the footbath cabinet's switch. Not yet: the Olympic filters (In service / Backwashing, from the battery's flows), the AHUs (the catalogue's AP-AHU1… and the world's AHU-801… are different tags: derive one from the other, never join by index), UV, dosing, heat exchangers and boilers where a helper proves the state.

## 8. Single items

- **PL4-PW1-IV2**, "Overflow from the spa valve" in the footbath room, valves a gravity overflow; the owner removed the same from the jacuzzi (PL3-JZ1-IV2: "A gravity overflow is never valved; shut, it would flood the deck"). Owner to rule.
- **Hierarchical pump tags.** The pumps are listed by their motor starters' tags (P-101A …), the world's; by the hierarchy they would be PL2-P1-P1 and PL2-P1-P2. Owner to decide whether the starters' tags become the pumps' hierarchical ones (a world version bump: the starters are saved by tag).
- **Stage 2 (action narratives)** has not begun: 061 starts it once stage 1 is accepted.

## 9. Notes

- Prompt [062](062-hud-declutter.md) reworks the same `.controls-help` element: it empties the help line when there is nothing to say and keeps it for contextual lines, this overlay's among them. Keep inspection's precedence (below climbing and carrying, above the empty line).
- Another agent was editing the same checkout overnight (the engineers' office storage cupboards); its uncommitted files are not this mission's. The `storage-cupboard` kind was added to `equipment-kinds.ts` so the catalogue accepts its items.
- `src/game/world.test.ts`'s "come as usual while the plant runs…" timed out once under the full parallel suite and passes alone.

## Remaining (checked 2026-10-26)

- PL2-P1-IV3 and PL2-P1-IV4 described, their fittings given the annex's discharge links.
- A regulating-valve template, and PL2-F-RV1 on the enhanced network.
- The Olympic's valve tags derived, the filters' by function (IV, BV, RNV, DV) not V1 to V5, with `WORLD_VERSION` bumped.
- Hierarchical pump tags (PL2-P1-P1 and so on) wherever P-101 and P-201 appear, with `WORLD_VERSION` bumped.
- Statuses for the sand filters, heat exchangers, dosing pumps, boilers and AHUs (the AHUs after unifying their tags).
- A design for registers derived from the network, for the owner's sign-off, then built.
- The components in the corridors and the dev rooms other than dev0 marked, and the pool halls audited.
- Stage 1's remaining browser checks, then the owner's acceptance; then stage 2 of [061](061-component-information-overlay.md).
