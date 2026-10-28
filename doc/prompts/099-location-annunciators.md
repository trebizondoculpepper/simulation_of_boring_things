# 099: An annunciator for each location, in the control room and on the bridge

Status: to do (written 2026-10-28 from the owner's answers to [091](091-chemical-distribution-panels.md)'s design questions).

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
