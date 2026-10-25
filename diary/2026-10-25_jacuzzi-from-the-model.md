# Development Diary Entry - 2026-10-25

## Context

- **Date**: 2026-10-25 02:50 to 04:00 UTC
- **Branch**: main
- **Commits**: 96ae999 (the old plant network deleted) through d458eb7 and the night's last commit
- **Contributors**: Claude Code, Codex (two reviews, kept in `doc/reviews/`), and the owner (rulings before bed)

## Problem Statement

The owner's goal: every visual thing in the game exists in the simulation's model unless it is explicitly decorative, so a fault is debugged in the simulation, not in the drawing. The model is the enhanced network (the plumber's expanded port graph); nothing is hand-written; tags are hierarchical. The work: write it up as a prompt (064), have Codex review it, take the review on board, then build it, starting with the tests and the jacuzzi.

## Our Approach

Questions first, one at a time (the old plant network's fate, pump tags, filter valve letters, the footbath's overflow valve, the regulating valve's wording, persistence), then the test that measures the gap, then the jacuzzi taken all the way, in the order Codex's review set: bindings and tests before anything working is cleared.

## Implementation

- `world-in-model.ts` and its tests: what each plant room draws, typed bindings (node, fitting, link or decorative), the unbound set pinned by identity in a file only a script writes (`scripts/pin-unbound.test.ts`): 363 unbound of about 480 at the start, 331 now.
- `plumbing-expansion.ts`: the schematic's own valves (`given`), with what the rules add reported (`added`).
- `jacuzzi-schematic.ts`: the jacuzzi's machines, links and every valve, with role, normal state and actuation; the hall's devices; the plumber adds nothing. `model-valves.ts` derives the valves' ids, hierarchical tags, names and descriptions. The world keys their states by model id (saves before version 27 become new worlds, as the owner allows); the make-up and the drain-down are their valves' states alone.
- A scene-level check (`world-in-model-scene.ts`): the builders mark what they draw with its model binding or as decorative; tests build the jacuzzi plant room (`buildPlantRoomContents`) and hall (`buildPoolHallContents`) headless and find every mesh bound, but for the plant room's doors.

## Outcomes

- The jacuzzi plant room and pool hall are wholly bound to the model, verified in the browser (hover, the console's valves, the drain-down).
- Codex's first review reordered the plan and named the runtime split (asset ids, pool flags); its second found that the make-up still had two states, that a blanket decorative mark hid working things (lights, gullies, a corridor display), and that the check proved only id membership. All three were fixed.
- Not done: re-routing the jacuzzi's pipes with the voxel router and scoring them (planned in 064, to be tried in a dev room first); the doors, awaiting the owner's ruling; every other room still drawn by hand.

## What we learned

- A listing built from data sources misses what builders add elsewhere; checking the built scene itself is what makes "nothing is missed" true.
- A decorative mark on a container hides whatever is later put in it: mark architecture before equipment is added, and let anything already marked keep its mark.
- Extracting a room's contents from its renderer (`build…Contents`) is cheap and makes the whole scene testable in Node.

## Next Steps

064 step 7 (router, `placeInline`, scoring, a dev room); the owner's ruling on doors; then the lounge, footbath, wet hall and boiler house built from their schematics, each lowering the pinned list.
