# Development Diary Entry - 2026-10-28

## Context

- **Date**: 2026-10-28 UTC
- **Branch**: main
- **Contributors**: Claude Code + User

## Problem Statement

Mission 107-1: rebuild the museum's five-hall pinwheel as the owner's ring of halls round a courtyard (built as 4 × 5, 14 halls, then cut to the owner's corrected 4 × 3, 10 halls), walkable from Hall 0 round to Hall 9 and back, with an empty hall (generic, side, corner) as a component and every hall beyond the visitor's neighbours drawn empty. Mid-build the owner ruled that all halls are one height and the courtyard windows show only the sky.

## Our Approach

The plan stays pure and tested: a 4 × 3 grid of cells, the ring as a list of cells, joins as the ring itself, halls found by number. Each hall's scene holds every other hall as an empty shell, merged by material in four groups; when a neighbour is drawn through its archway on the canvas underneath, that neighbour's shell and those beyond it turn depth-only, so they hide what is behind them without covering the room drawn beneath.

## Implementation

`museum-plan.ts` (ring, kinds, LOD sets), `museum-safety.ts` (exits recomputed), `views/museum-empty-hall.ts` (new), `views/museum-hall.ts` (signs, floor arrows, sky-only clerestories, stand-ins removed), `rooms/museum-hall-room.ts` (shells wired to the joints), `dev-room-links.ts`, `main.ts`.

## Outcomes

Logic tests pass. The browser walk could not be done: the connected Chrome could not reach the dev server. The depth-only trick is the key lesson: hiding a neighbour's shell is not enough, since rays through its archway would reach halls across the courtyard and paint over the room beneath.

## Next Steps

Walk the ring in the browser and record frame times; the lift's place in Hall 0 to confirm with the owner.
