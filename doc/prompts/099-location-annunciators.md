# 099: An annunciator for each location, in the control room and on the bridge

Status: done 2026-10-28 (written the same day from the owner's answers to [091](091-chemical-distribution-panels.md)'s design questions); see "What was done" below. The chemical control box's windows wait for 091 to put its faults in the world (`TODO.md`).

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first; its rules apply, above all that the game has one world state and that rooms only show it, that status words need a failure model, and that the control room has two forms behind the CONTROL ROOM MODE knob: the old control room (the default) and the bridge ([095](095-the-bridge.md)). Markdown is one paragraph per line.

## The request

The owner, 2026-10-28: "In the old style control room, I want an annunciator for each major location in the game. So we have an Olympic pool annunciator … a lazy pool annunciator. We probably also need a wet room annunciator, and that would show things that could go wrong with that location. For example, the drainage tank overfilling, the clean water tank underfilling, the chemical transfer failing." And: "in the control room, there should be at least 3 annunciators. One for the Olympic pool, one for the lazy pool, and one for the wet hall. Each will display fault conditions related to that location. And then I want to make sure that all of those fault conditions can also display in the bridge." The wet hall's annunciator is shown in the wet hall and in the control room. A standing rule from the same day: any change to warning and error states must update the bridge too.

## The work

1. **Survey** the annunciators there are (`src/toolkit/gallery/logic/world-annunciator.ts`, `world-bindings.ts`, `bridge-bindings.ts`, the control room's layout in `room-equipment.ts`, the bridge's alarm display and consoles) and every fault condition the world models, by location: which exist, which are shown where.
2. **One annunciator per major location** in the old control room: at least the Olympic pool (`pool_02`), the lazy pool (`pool_01`) and the wet hall, each a real annunciator of the 1980s large-panel archetype (windows, flash until ACCEPT, steady while active, RESET when cleared, horn), its windows the fault conditions of its location that the world actually models (no window for a fault without a failure model; list the wanted ones not yet modelled in `TODO.md`). Keep the existing alarm annunciator's behaviour where it is already used, and say where windows moved.
3. **The wet hall annunciator**, a copy in the wet hall and one in the control room (as mimic copies: one state, two boards), its windows at least: backwash (drainage) tank high, make-up (clean water) tank low, hypochlorite transfer fault, acid transfer fault (from `world.distribution`: a trip on high-high, the store's low-level cut-out, and once [091](091-chemical-distribution-panels.md) puts the chemical control box in the wet hall, its loss of supply, MCB trip and hung controller), the booster set's trip, and whatever else the wet hall models.
4. **The bridge shows every one of these faults**: its alarm display and the relevant stations' consoles, with ACCEPT acknowledging the same alarm state the annunciators read (one state, not two). Check the alarm sound repeats until ACCEPT as it does now.
5. Tests beside the logic; look at both rooms in the browser; Penfold's mark on each annunciator panel.

## Acceptance

- At least three location annunciators in the old control room, the wet hall's also in the wet hall, every window driven by a modelled fault.
- Every one of those faults shown on the bridge, acknowledged once for both.
- `TODO.md` lists the faults wanted but not yet modelled.

## What was done (2026-10-28)

**The survey.** The old control room had two annunciators: the plant's main one (CR-CP2, 36 windows from `world-reading.ts`, its faults mostly the Olympic's with the site's own: mains, fire, gas, boilers, backwash tank high, make-up running), and the lounge's (CR-CP7, 16 windows, the twin of PL1-CP3 in its plant room). The bridge listed both, but its viewscreen counted only the main board's unaccepted windows.

**One sequence for every location** (`game/plant/location-annunciator.ts`): ISA sequence M with first-out, generic over its list of windows; the lounge's now uses it. **A registry** (`game/plant/location-annunciators.ts`): each location's tag, title, windows, engravings, columns and the function sensing its faults in the world; the world senses every one each step whichever room the walker is in. The world holds `locationAnnunciators: { pool_01, pool_02, wet_hall }` in place of `loungeAnnunciator` (version 56: a saved lounge state is kept as `pool_01`, the others start dark); the actions are `location-alarms/accept` and `location-alarms/reset` with the board's `location`, or with none (the bridge) for every board.

**PL2, the Olympic's** (`olympic-annunciator.ts`, 24 windows, six by four): balance tank low; circulation tripped on low-low; P-101A and P-101B tripped; no pump in AUTO; circulation flow low; filters 1 to 5 high DP; the Wash-O-Tron not in AUTO; UV lamp fail; chlorine low; chlorine high; pH out of range; dosing inhibited; day tank low; pool temperature low; hall RH high; hall air plant fail; ozone in air; room power fail; one spare. Its pool's conditions are read as the main board reads them, so the two always agree; the main board keeps every window it had (none moved), as the building's general board.

**WH, the wet hall's** (`wet-hall-annunciator.ts`, 18 windows, six by three): break tank low; booster set tripped on low water; town main no supply; backwash pit high; backwash inhibited (high-high); backwash pit overflowing; a pit pump not in AUTO; sewer over consent; hypochlorite and acid transfer each tripped on high-high, its store at its low-level cut-out, and its selector or pump not in AUTO; chemical transfer no supply (either store's power, on which its pump runs); wet hall power fail; fire alarm in the wet hall zone; booster set stopped or isolated (STOP at its panel, or either motorised valve shut). WH-CP2 hangs on the make-up bay's north wall east of the mimic; its twin, CR-CP9, is in the old control room with PL2's (CR-CP8), on the east wall; the control room is 1.5 m deeper (10 m) to take them.

**The boards** (`views/location-annunciator.ts`, from the lounge's): Penfold's housing round Warden's windows, sized to the board's rows and columns, its horn, ACCEPT, RESET, LAMP TEST and MUTE, Penfold's mark bottom right, the first-out flashing twice as fast.

**The bridge** shows every window: its annunciator (`bridgeAnnunciator`) carries each location's windows after the main board's, so ACCEPT at Central Control or CR-CP2 accepts them all (by index, a location's windows accept as its own board's ACCEPT), RESET resets them all; the viewscreen counts and lists them (`WH HYPO TRANSFER NOT IN AUTO`, `GO TO WET HALL`), and the alarm bleep sounds until they are accepted; Central Control's ALARMS IN, NEWEST and GO TO and the alarm sweep list them too.

Seen in the browser: the control room's PL2 and WH boards flashing (NO PUMP IN AUTO first-out; PIT PUMP NOT IN AUTO, ACID TRANSFER NOT IN AUTO), ACCEPT at the WH board turning them steady, the faults put right and the windows held until RESET put them out; WH-CP2 in the wet hall flashing HYPO TRANSFER NOT IN AUTO; the bridge's viewscreen with `4 ALARMS · ACCEPT AT CENTRAL CONTROL`, among them `WH CHEM TRANSFER NO SUPPLY` and `WH HYPO TRANSFER NOT IN AUTO`. Camera URLs: `?room=control_room&noclip=true&x=0.3&y=1.6&z=-0.8&yaw=90&pitch=0` (PL2 and WH), `?room=wet_hall&noclip=true&x=8.3&y=1.75&z=-5.0&yaw=0&pitch=-3` (WH-CP2 beside the mimic), `?room=bridge&noclip=true&x=-12.31&y=9.8&z=-1.58&yaw=15&pitch=3` (the viewscreen and CR-CP2).

Left for later (`TODO.md`): the chemical control box's windows once 091 models its faults; the faults wanted but not yet modelled.
