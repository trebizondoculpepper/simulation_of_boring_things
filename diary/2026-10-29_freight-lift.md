# Development Diary Entry - 2026-10-29

## Context

- **Date**: 2026-10-29 UTC
- **Branch**: main
- **Commit**: 07f9f841, 821250d5 and the stage 3 commit
- **Contributors**: Claude Code + the owner

## Problem Statement

Mission 108: a freight lift from the plant room corridor to the building's other floors, each floor only a room and a landing in it, so new places join the game without fitting the building's geometry. During the session the owner added floor 3 (the bridge, its entrance played as by the corridor's doors), asked for the ride to mask loading (the floor ahead built and warmed while the car runs, the car arriving only when it is ready), and set out a simple modern lift's behaviour (lit calls until answered, collective control, 3 s and 5 s dwells, a light curtain, nudging, a warning tone).

## Our Approach

The lift is pure logic first (`freight-lift.ts`: the floors, the state machine, the ride timing), kept in the world as `lifts` (the freight lift and a trial lift), then a car room and a landing component tried on four dev floors (`dev54`), then landings installed in the corridor, on the bridge and in Hall 0. The car registers a lazy joint to the floor ahead while it runs, so the app builds that room unseen; `room-readiness.ts` is the contract by which the app reports it built and warmed (one frame drawn from just inside its landing), and only then does the car arrive.

## Implementation

`src/toolkit/gallery/logic/freight-lift.ts`, `lift-doorway.ts`, `room-readiness.ts`; `views/lift-landing.ts`; `rooms/lift-rooms.ts`; `components/architectural/views/lift-doors.ts`; `components/sound/audio/lift-sounds.ts`; a Stannard Lifts brand; the corridor's north wall, the bridge's west wall and Hall 0's east wall cut for their landings; `runShell` takes `extras`.

## Outcomes

- Rode B2 → 4, 4 → B2 and B2 → 3 headless: the doors, indicator, panel lamps and both hand-overs work, the bridge's first view starts once the lift doors shut behind the walker.
- Built and warmed unseen: `main_corridor` about 0.5 s, `museum0` about 0.4 s, `bridge` 0.3 to 1.1 s; the 7 s minimum ride hides them all.
- Gotchas: a landing room built ahead must not act as if the walker were in it (it marked the trip ready itself until the landing waited to be entered); Hall 9's copy of its shared wall had to be cut as seen from Hall 0, and a depth-only pane over the doorway keeps anything behind the wall from drawing over the car; a joint turning from lazy to the floor's own must not wait for the doors to shut.

## Next Steps

Stage 4 (the dev panel lists the lift); the owner's open questions (G, the maker and load, the bridge landing's narrow pier).
