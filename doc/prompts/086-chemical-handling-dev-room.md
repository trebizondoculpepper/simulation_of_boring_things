# 086: dev44, the chemical handling room

Status: to do (written 2026-10-26 with the owner), a sub-mission of [085](085-chemical-distribution.md), for another agent.

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
