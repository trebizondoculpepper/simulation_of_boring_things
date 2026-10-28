# Development Diary Entry - 2026-10-28

## Context

- **Date**: 2026-10-28 21:10 UTC
- **Branch**: main
- **Contributors**: Claude Code + User

## Problem Statement

The owner asked to start laying out the museum's halls in sequence from Hall 1: first 107-0's exhibit hook, then 107a, Warm water.

## Our Approach

Schematic and model first (pure, tested), then layout by the voxel router, then mimic and words, then the scene that binds them, plugged into the hall through a new exhibit hook with reset-on-entry and one shared clock.

## Implementation

`museum-time.ts`, `museum/exhibits.ts`, the hook in `museum-hall-room.ts`; `museum-1-heating.ts`, `museum-1-layout.ts`, `museum-1-mimic.ts`, `museum-1-placards.ts`, `museum-heating-parts.ts`, `hall-1-warm-water.ts`.

## Outcomes

The router laid every line first time once the pressurisation unit moved out of the primary pump's way. Halls with no benches broke `mergeGeometries([])` in the hall view; guarded. The exchanger's UA had to drop to a third of dev51's for a sensible boiler flow temperature. A second agent's in-progress Hall 2 file broke `npm run build` at commit time; my files typecheck.

## Next Steps

Click through every Try-it step in the browser, measure frame times, run the component benchmark on the new displays.
