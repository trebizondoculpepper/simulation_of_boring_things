# Development Diary Entry - 2026-10-27

## Context

- **Date**: 2026-10-27
- **Branch**: main
- **Commit**: 39ea689
- **Contributors**: Claude Code + User

## Problem Statement

The owner asked that an opened door should not close while the player stands near it (mission 090). The research found the hold area was only the narrow threshold strip, holds were applied after the door had already stepped (so a door could latch beside the player), a caught closing door froze at its partial angle, handover set the receiving door closing at once, and a room drawn under another could use its stale walker.

## Our Approach

One shared pure rule, `door-proximity.ts`: clearance from the walker's body edge to the box of the doorway through its wall, entering within 1.5 m and released beyond 1.75 m, per doorway, with an optional floor check. Presence became an input to each door controller's step rather than a side effect afterwards, and every room supplies it before its door parts update; follower rooms supply none.

## Implementation

`stepPlantDoor` takes `nearby` (`keepDoorOpen`: reopen an unlatched closing leaf from where it is, refresh the hold when fully open, leave a shut door shut); `standDoorOpen` gives a handed-over door a full hold. The spring door reopens in its swing direction when held while closing. The plant door, equipment doors and ladder gate parts gained `setNearby`. Bindings went into the pool halls, plant rooms, main corridor, shell rooms, the balance tank hall (a new `LiveExhibit.sense`, removing hold side effects from its collision query) and the spring portals (which now take a `present` flag).

## Outcomes

- New logic tests cover holding beyond the delay, smooth reopening, the final closing frame, leave-and-return, full closure after leaving, edge stability, wide pairs, other levels and follower rooms; the full suite and build passed.
- In the browser at pool_02's plant door the door stayed open while standing still and looking away, and closed after its hold once the player stepped away. A first attempt stood just beyond 1.5 m (clearance about 1.53 m) and the door closed, a reminder that the distance is measured to the opening, not the leaf.
- Running prettier directly reformatted files differently from `vp fmt`; use the project formatter only.

## Next Steps

Remaining browser checks (plant side, paired doorways, the ladder gate, a spring doorway, return during closing, handover and sounds) and the owner's view of the distances, recorded in the archived prompt and TODO.md.
