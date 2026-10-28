# 086: dev44, the chemical handling room

Status: in progress (written 2026-10-26 with the owner, a sub-mission of [085](085-chemical-distribution.md)). Audited 2026-10-28 (below): dev44 exists and most of the master list is built; the double-contained pipe is now a pipe kind and stands in `pipes_n_dreams`; what remains is listed under "Still missing" and in `TODO.md`.

## Audit — 2026-10-28

The owner, 2026-10-28: "86 is mostly done. Just have a double check what we don't have." Each item of the master list checked against the code. dev44 is `src/toolkit/gallery/rooms/plant/chemical-handling.ts`; the kit is `src/toolkit/components/plant/views/chemical-handling-kit.ts` (_kit_ below). Some items were overtaken by the owner's later rulings (2026-10-26/27): one transfer pump per chemical, not a duty and standby pair; Chlorella DoseCell bottles as the day tanks, their head carrying the level switches and the pump, the actuated inlet valves moved to the wet hall's transfer selectors; the wet hall's distribution panel (and its replacement, 091) in place of per-room day tank panels. [x] have, [~] partly, [ ] missing.

### At the fill point

- [x] Delivery fill cabinet: `createFillCabinet` in `src/toolkit/components/plant/views/chemicals-storage.ts` (the world's loading bay, and dev_chemicals) and another in `src/toolkit/components/loading-dock/views/yard-kit.ts` (the loading gallery). Lockable, its door opens. Not in dev44 itself.
- [x] Two ports of different types: built 2026-10-28 in `chemicals-storage.ts`, the hypochlorite's a 2" brass camlock, the acid's a 1½" polypropylene Guillemin with its two lugs, labelled so (`yard-kit.ts`'s already differed). Each has its valve, cap, tag and the cabinet's drip tray; no dust-cap chain.
- [ ] Tank-full beacon and sounder per port, driven by its bulk tank's high level, with a mute: missing. The cabinet's beacon and button are static, one for both ports (`chemicals-storage.ts`).
- [ ] Contents indicator at the port: missing.
- [ ] Delivery emergency stop: missing.
- [ ] Delivery enable key switch: missing.

### Bulk storage

- [x] Hypochlorite bulk tank: `createFramedChemicalTank` (`src/toolkit/components/plant/views/framed-chemical-tank.ts`, after DENIOS, Chlorella's, opaque black HDPE), in dev44 as `createBulkTankDemo` (_kit_) and in the store.
- [x] Acid bulk tank: the same tank for 10% HCl, radar level, carbon vent filter.
- [x] Acid IBC on spill pallet: `createIbc`, `createIbcOnSpillPallet` (`chemicals-storage.ts`), kept in dev_chemicals.
- [x] Level transmitter and local gauge: on the framed tank (ultrasonic on hypochlorite, 80 GHz radar on acid, local display); the instruments alone in `src/toolkit/components/plant/views/level-instruments.ts` (dev44's "Level instruments").
- [~] High and high-high switches: the framed tank has its independent high-level float switch, drawn; no separate high switch, and neither is a modelled input (the world's distribution trips on a day tank's high-high only, `src/game/plant/chemical-distribution.ts`).
- [ ] Actuated overfill valve on the fill line, shut by high-high: missing.
- [x] Tank inlet and draw-off valves: the framed tank's fill and outlet valves turn (`parts` of `createFramedChemicalTank`); PVC-U ball valves in `src/toolkit/components/plant/views/chemical-ball-valve.ts`. Not yet nodes of the store's schematic (see 085).
- [~] Tank vent: a gooseneck on each tank, to the room, not piped outside.
- [x] Fume scrubber: the acid tank's activated-carbon vent filter pot (`framed-chemical-tank.ts`); drawn, no state.
- [ ] Bund leak detector: missing (only an annunciator window on the unused store panel).
- [ ] Bund sump and hand pump: missing. Bund floor markings are built (`src/toolkit/gallery/views/bund-marking.ts`, in dev44).
- [x] Store extract and chlorine detection: `createStoreVentilation`, `STORE_DETECTION`, kept.
- [x] Spill kit, PPE cabinet, safety shower and eyewash: `chemicals-storage.ts`, decoration.
- [x] Store signs, hazard labels, tags: `createStoreSigns`, `chemicals-signs.ts`; the framed tanks carry their own labels and tags.

### Transfer

- [x] Chemical transfer pump: `createTransferPumpSkid` (_kit_), a sealless magnetic-drive pump (Iwaki MX class) on a bunded skid, one per chemical by the owner's ruling; the duty and standby pair kept as `createDualTransferPumpSkid` (_kit_, not shown).
- [x] Suction, discharge and non-return valves: on the skid.
- [x] Pressure relief valve back to the tank: on the skid; also `createReliefValve` (`dosing-valves.ts`).
- [x] Pressure gauge with a diaphragm seal: on the skid.
- [x] Interstitial leak detector: `createLeakPort`, `createLeakDetectionDemo` (`src/toolkit/components/plant/views/leak-detection.ts`) and its tested logic `src/game/plant/leak-monitor.ts`; dev44's "Leak detection". Not yet watching a leak model in the world.

### Day tanks

- [x] Day tanks, hypochlorite and acid: Chlorella DoseCell bottles, 15 to 500 L (`src/toolkit/components/plant/views/dose-bottle.ts`, `dose-cell-head.ts`, logic `src/game/plant/dose-bottle.ts`), and the framed 1,000 L; every size in dev44's "Day tank sizes" (`createDayTankRange`); the earlier framed day tank station (`createDayTankStation`, _kit_) used by the transfer trial.
- [x] Low and high level switches: in the DoseCell head (HI, LO, CALL lamps), and on the day tank station.
- [x] Actuated inlet valve: moved to each outlet of the transfer selector (`createTransferSelector`, _kit_), and on the day tank station.
- [~] Outlet isolating valve: on the day tank station; a DoseCell bottle has none (its pump is in its head).

### Dosing

- [x] Hypochlorite dosing pumps: `createHypochloriteBoard`, `createSolenoidPump`, `createDigitalPump` (`dosing-equipment.ts`), rebuilt to the peristaltic pump's standard (`diaphragm-pump.ts`, `peristaltic-pump.ts`), in dev44.
- [x] Acid dosing pump: `createAcidBoard`, in dev44.
- [~] Dosing controller and sample cells: `createControllerPanel` (`dosing-equipment.ts`); it has not gained the circulation interlock's input and lamp.
- [x] Injection points: `createInjectionRun`, `injection-quill.ts`; the lounge's quills in its schematic with their non-return and isolating valves.
- [ ] Circulation flow switch interlock (no flow, no dosing, shown on the controller): missing. The sample cell's flow switch (`src/game/plant/sampling.ts`) is not it.
- [x] CO₂ station: `createCo2Station`, kept.
- [x] Test shelf and log: `createTestShelf`, decoration.

### Pipe

- [x] ABS chemical pipe: `abs-chemical` (`src/toolkit/components/core/views/pipe-kinds.ts`).
- [x] Polyethylene dosing tube: `chemical-tube`.
- [x] Double-contained chemical pipe: built 2026-10-28 as the `double-contained` kind in `PIPE_KINDS` (a PVC-U containment, its `carrier` an ABS pipe of half its size), its stand in `pipes_n_dreams` cut away to show the carrier, a spacer and the leak detection port (`src/toolkit/gallery/views/pipes-n-dreams.ts`); the rooms' and corridors' contained chemical lines now drawn as that kind (`room-pipework.ts`, `corridor-services.ts`). Already on dev44's pipe stand (`createChemicalPipeSamples`).
- [x] Line labels: `createPipeMarker` (`pipe-marker.ts`, BS 1710 bands, legend, flow arrow), placed along every chemical run in the rooms and the corridor.

### Controls

- [ ] Fill cabinet controls (contents gauge, beacon and sounder with mute, emergency stop, key switch): missing, as above.
- [~] Chemical handling panel per store: built as `createStoreHandlingPanel` (_kit_: tank meter, annunciator with high, high-high and overfill, bund leak, pipe leak, pump trip, gas, delivery; ACCEPT, RESET, LAMP TEST, TEST key) but shown nowhere, not in dev44 or the stores, and bound to nothing. The pump's HAND · OFF · AUTO, RUN, TRIP and reset are on the skid's local station instead.
- [~] Day tank panel per dosing plant room: built as `createDayTankPanel` (_kit_) but shown nowhere; the DoseCell heads' lamps and the wet hall's panel (and 091's terminals) now do most of its work. Its CIRCULATION PROVEN lamp and dosing inhibit key have no home.
- [ ] Control room mimic page of the chemical path: missing in the old control room. The bridge (095) has a CHEMICAL STOCKS station.

### Still missing (in `TODO.md`)

1. The fill cabinet made a working component: per-port tank-full beacon and sounder driven by its bulk tank's level, mute, contents indicator, delivery emergency stop, enable key switch; tried in dev44, then in the loading bay (with 076's deliveries).
2. The bulk tanks' high-level switch (a high alarm apart from high-high) as model inputs, and the actuated overfill valve on each fill line shut by high-high.
3. A bund leak detector and a bund sump with hand pump in each store.
4. The circulation flow switch interlock, its input and lamp on the dosing controller.
5. Decide the fate of the store handling panel and the day tank panel (show and bind them, or retire them in favour of 091's terminals and the DoseCell heads), and the control room's chemical mimic page.
6. Minor: tank vents piped outside; a dust cap on a chain at each port.

## Review checkpoint — 2026-10-26

**Classification:** Active / planned. **Filed:** `doc/prompts/086-chemical-handling-dev-room.md`.

**Delivered:** to do (written 2026-10-26 with the owner), a sub-mission of [085](085-chemical-distribution.md), for another agent.

**Still outstanding:** Retain the prompt’s required work and current root TODO entries.

**Evidence:** Current prompt, its Remaining section and source check. Reviewed against source `e5078c4`.

The original request and earlier implementation notes below are retained as history; this checkpoint supersedes any conflicting old completion claims. Outstanding work remains open in the root TODO.

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first; its rules apply: every engineering item is a real, working component after a real product, with state, driven, showing what it does, and carrying its maker's brand. Read [085](085-chemical-distribution.md), which this room serves, and [076](076-chemical-delivery.md) and [081](081-acid-supply.md).

## The request

The owner, 2026-10-26: a new development room, dev44, where all the chemical handling equipment is prototyped before it goes into the building: everything on the master list below, those we have and those we do not, side by side, each working. And the new kind of pipe, double-contained, added to the pipes gallery (`pipes_n_dreams`).

Build it as the other dev rooms are (`src/toolkit/gallery/logic/dev-room-links.ts`, its title `DEV44 · CHEMICAL HANDLING`), its stands in the order of the chemical's path: yard, store, transfer, day tank, dosing, controls. Where a component already exists, show it here too, and improve it where this list asks more of it than it does; do not fork it.

## Master list

**Have** means a component exists (its file named); **new** means it is to be made. Each is modelled after a real product.

### At the fill point (the yard)

| Item                               | State                                                                                     | Notes                                                                                                                          |
| ---------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Delivery fill cabinet              | Have: `createFillCabinet` (`chemicals-storage.ts`); shown in `dev_chemicals` and the yard | Lockable stainless, 2" and 1½" couplings, tank-full alarm. Make the two ports a different type, not only a different size.     |
| Hypochlorite fill port             | New, as a part of the cabinet                                                             | Coupling (camlock, say), dust cap on a chain, isolating ball valve, drip tray, label.                                          |
| Acid fill port                     | New, as a part of the cabinet                                                             | A different coupling (Guillemin or Storz), cap, valve, drip tray, label: an acid hose cannot connect to the hypochlorite port. |
| Tank-full alarm beacon and sounder | Partly: in the cabinet                                                                    | Per port, driven by its bulk tank's high level, with a mute.                                                                   |
| Contents indicator at the port     | New                                                                                       | The bulk tank's level, read at the port before a delivery.                                                                     |
| Delivery emergency stop            | New                                                                                       | Stops a pumped delivery and closes the overfill valve.                                                                         |

### Bulk storage (each store)

| Item                                              | State                                                                                     | Notes                                                                    |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Bulk tank, hypochlorite                           | Have: `createBundedTank` (`chemicals-storage.ts`), after an Enduramaxx 1000 L in its bund | Add the instruments below; opaque, UV-stabilised.                        |
| Bulk tank, acid                                   | New (replaces the IBC)                                                                    | HDPE or GRP in its bund, acid-resistant fittings.                        |
| Acid IBC on spill pallet                          | Have: `createIbc`, `createIbcOnSpillPallet`                                               | Kept for the gallery; leaves the building (081).                         |
| Tank level transmitter and local gauge            | New                                                                                       | Ultrasonic or hydrostatic, with a contents gauge readable from the door. |
| High and high-high level switches                 | New                                                                                       | High for the alarm, high-high for the overfill stop.                     |
| Actuated overfill valve                           | New                                                                                       | On the fill line, shut by high-high.                                     |
| Tank inlet and draw-off valves                    | New (as valves of the plumber's kit)                                                      | PVC-U ball valves.                                                       |
| Tank vent                                         | New                                                                                       | Hypochlorite's to outside.                                               |
| Fume scrubber                                     | New                                                                                       | On the acid tank's vent: activated carbon or wet.                        |
| Bund leak detector                                | New                                                                                       | A liquid sensor in the bund, alarmed.                                    |
| Bund sump and hand pump                           | New                                                                                       | For a spill.                                                             |
| Store extract and chlorine detection              | Have: `createStoreVentilation`, `STORE_DETECTION`                                         | Kept.                                                                    |
| Spill kit, PPE cabinet, safety shower and eyewash | Have: `createSpillKit`, `createPpeCabinet`, `createSafetyShower`                          | Decoration by the owner's ruling; shown for completeness.                |
| Store signs, hazard labels, tags                  | Have: `createStoreSigns`, `chemicals-signs.ts`                                            | Kept; labels for the new tanks.                                          |

### Transfer

| Item                                        | State                             | Notes                                                                                                         |
| ------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Chemical transfer pump                      | New                               | Duty and standby per chemical; a sealless magnetic-drive centrifugal pump, or an air-operated diaphragm pump. |
| Pump valves: suction, discharge, non-return | New (valves of the plumber's kit) | Per pump.                                                                                                     |
| Pressure relief valve back to the tank      | New                               | On the discharge.                                                                                             |
| Pressure gauge with a diaphragm seal        | New                               | A chemical seal keeps the acid off the gauge.                                                                 |
| Interstitial leak detector                  | New                               | At the low points of a double-contained run.                                                                  |

### Day tanks (each dosing plant room)

| Item                        | State | Notes                                         |
| --------------------------- | ----- | --------------------------------------------- |
| Day tank, hypochlorite      | New   | 100–300 L, bunded, with its level gauge.      |
| Day tank, acid              | New   | The same, acid-resistant.                     |
| Low and high level switches | New   | Low calls the transfer; high stops it.        |
| Actuated inlet valve        | New   | Opens off the main while the tank is filling. |
| Outlet isolating valve      | New   | To the dosing pumps.                          |

### Dosing (each pool)

| Item                               | State                                                                                                                     | Notes                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Hypochlorite dosing pumps          | Have: `createHypochloriteBoard`, `createSolenoidPump`, `createDigitalPump` (`dosing-equipment.ts`); shown in `dev_dosing` | Suction re-pointed to the day tank.                                            |
| Acid dosing pump                   | Have: `createAcidBoard`                                                                                                   | The same.                                                                      |
| Dosing controller and sample cells | Have: `createControllerPanel`                                                                                             | Gains the circulation interlock's input and lamp.                              |
| Injection points on the return     | Have: `createInjectionRun`                                                                                                | Kept apart.                                                                    |
| Circulation flow switch interlock  | New                                                                                                                       | A flow switch on the circulation; no flow, no dosing; shown on the controller. |
| CO₂ station for pH                 | Have: `createCo2Station`                                                                                                  | The alternative to acid; kept.                                                 |
| Test shelf and log                 | Have: `createTestShelf`                                                                                                   | Decoration.                                                                    |

### Pipe

| Item                              | State                                                    | Notes                                                                                                                                                                                                                 |
| --------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ABS chemical pipe, solvent-welded | Have: `abs-chemical` (`pipe-kinds.ts`)                   | Rigid runs.                                                                                                                                                                                                           |
| Polyethylene dosing tube          | Have: `chemical-tube`                                    | Pumps to injection points.                                                                                                                                                                                            |
| Double-contained chemical pipe    | New: add a kind to `PIPE_KINDS`, and to `pipes_n_dreams` | A carrier pipe inside a containment pipe, both ABS or PVC-U, with spacers and a leak detection port at each low point; a cut-away end on the stand shows the pipe inside. Used for every fill line and transfer main. |
| Line labels                       | New                                                      | Chemical, flow direction, at intervals and at walls.                                                                                                                                                                  |

### Controls (see below)

| Item                                      | State | Notes      |
| ----------------------------------------- | ----- | ---------- |
| Chemical handling panel, one per store    | New   | See below. |
| Day tank panel, one per dosing plant room | New   | See below. |
| Control room mimic page                   | New   | See below. |

## The controls

Following the plant's rules (period instruments, Penfold Controls panels with their mark, local controls stay local), the chemical handling needs:

- **Fill cabinet**:
  - the bulk tank's contents gauge;
  - the tank-full beacon and sounder, with a mute;
  - the delivery emergency stop;
  - a key switch enabling the delivery.

  Worked at the cabinet only.

- **Chemical handling panel, one per store**, a Penfold Controls panel:
  - each tank's level (a moving-coil meter or LED bargraph);
  - an annunciator: high level, high-high and overfill valve shut, bund leak, interstitial leak, transfer pump trip, gas detected;
  - the transfer pumps' HAND · OFF · AUTO selectors and their run and trip lamps;
  - the duty pump selector;
  - alarm accept and reset.

  Local only.

- **Day tank panel, one per dosing plant room**:
  - each day tank's level;
  - FILLING and LOW lamps;
  - the inlet valve's position;
  - the dosing interlock's lamp (circulation proven);
  - an inhibit for maintenance.
- **Control room**, a mimic of the chemical path, repeated from the panels:
  - the levels;
  - the transfer pumps running;
  - the alarms.

  It shows and accepts but does not reset or select (the owner's ruling).

## Done when

- dev44 exists, every item on the list stands in it and works, the existing ones shown as they are or improved in place.
- The double-contained pipe is a kind in `PIPE_KINDS` and stands in `pipes_n_dreams`.
- Each new component's maker is in `brands.ts`; its logic is pure and tested beside it.
- The checks pass; `TODO.md` and `CHANGELOG.md` updated; `doc/reuse-inventory.md` if anything is copied from the Encabulator.
