# 063: Component information, what remains

Status: opened 2026-10-25 by the overnight session that implemented prompt [060](060-inferred-component-descriptions.md) (descriptions) and stage 1 of prompt [061](061-component-information-overlay.md) (the inspection overlay), at the owner's request: "If you think there's a problem with them, get as much as you can done, and then make a new mission called Mission 62 to remediate what's left." Prompt 062 had been taken a few minutes earlier by [the HUD declutter](062-hud-declutter.md), so this is 063.

## The owner's rulings that shape it (2026-10-25, overnight)

- The model is the source of truth; plates, descriptions and the overlay follow from it, never the other way round.
- The model is the **enhanced network**: the equipment, the network drawn between it, and the valves and fittings the plumber adds (`expandForPlumbing`, `src/game/plant/plumbing-expansion.ts`). It may be edited by hand, but nothing may exist in the world that is not on it: it is the port graph of the world.
- No hand-written or manually produced structures: everything derives algorithmically from the game's model.
- Tags are hierarchical: room, group, item (PL2-P1-P1 is plant room 2, pump set 1, pump 1).

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

## 4. The legacy plant network

`src/game/plant/network/` (`PLANT_NETWORK`) is a second, older schematic of the pools, the wet hall and the packaged sets, with its own tags. Its tags disagree with the drawn ones almost everywhere: PL2 filter valves IV1/IV2/BV1/BV2/RNV1/WV1 against the drawn V1 to V5 and DV1; drains WV against DV; pump valves; the wet hall's WH-MU against WH-MU1. Its pump nodes are tagged PL1-P1 and PL2-P1, the tags of the drawn pump sets, so it gives one tag to two things. The jacuzzi's is out of date (no balance tank). Tonight's session changed it to match the lounge's drawing, then put it back when the owner ruled that the enhanced network is the truth. Owner to decide: retire it, or derive it from the rooms' enhanced networks.

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
- **The Olympic's UV unit** is labelled "Olympic pool uV unit" in its layout (and so in its asset register key): a lower-casing slip in `olympicItems`.
- **The first pick** costs about 40 ms in the Olympic plant room while bounding boxes are computed; warm them when the room is built.
- **Hierarchical pump tags.** The pumps are listed by their motor starters' tags (P-101A …), the world's; by the hierarchy they would be PL2-P1-P1 and PL2-P1-P2. Owner to decide whether the starters' tags become the pumps' hierarchical ones (a world version bump: the starters are saved by tag).
- **Stage 2 (action narratives)** has not begun: 061 starts it once stage 1 is accepted.

## 9. Notes

- Prompt [062](062-hud-declutter.md) reworks the same `.controls-help` element: it empties the help line when there is nothing to say and keeps it for contextual lines, this overlay's among them. Keep inspection's precedence (below climbing and carrying, above the empty line).
- Another agent was editing the same checkout overnight (the engineers' office storage cupboards); its uncommitted files are not this mission's. The `storage-cupboard` kind was added to `equipment-kinds.ts` so the catalogue accepts its items.
- `src/game/world.test.ts`'s "come as usual while the plant runs…" timed out once under the full parallel suite and passes alone.
