# Development Diary Entry - 2026-10-19

## Context

- **Date**: 2026-10-19 22:58 UTC
- **Branch**: main
- **Contributors**: Claude Code + User

## Problem Statement

The owner asked to bring the build tooling up to the Encabulator's, to lay out a connected series of leisure-centre rooms (a main pool hall for an Olympic pool, children's pool, spa and a rapids ride, plus back-of-house rooms: janitorial, office, pumps, air conditioning, heating and others), each for now a blank space with a title card on the wall, and to deploy the project to GitHub Pages on every commit.

## Our Approach

Copy the Encabulator's toolchain and first-person controls rather than rebuild them, describe the building as pure plan data that can be tested headlessly, and build the 3D shells from that plan in one contiguous world without portals.

## Implementation

The toolchain (Vite+, TypeScript 7, Oxlint, Oxfmt, the CI workflow) and `src/toolkit/controls/` were copied, with a small set of core view files for later signage; `doc/reuse-inventory.md` lists them. `src/game/facility-plan.ts` holds sixteen rooms and eighteen doorways; `src/scene/facility.ts` builds tiled public rooms and blockwork service rooms, merged by finish, with a title card in each; `src/rendering/facility-world.ts` runs the renderer and controls and names the room the player is in. Besides the rooms the owner named, the plan adds a balance tank room, chemical store, electrical switch room, stores, workshop, first aid room, staff room and the service corridor.

## Outcomes

All five checks pass. The world renders in Chrome from the reception start. GitHub Pages was switched to deployment by workflow.

## Next Steps

Walk every room in the browser to confirm the doorways and cards; then decide what goes into the pool hall first.
