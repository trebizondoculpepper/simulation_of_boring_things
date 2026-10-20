# Development Diary Entry - 2026-10-21

## Context

- **Date**: 2026-10-20 to 2026-10-21, evening into after midnight (BST)
- **Branch**: main
- **Commit**: (this commit)
- **Contributors**: Claude Code + User (another Claude session worked in the same checkout at the same time)

## Problem Statement

Two threads. First, after the old pool rooms, plant rooms and leisure centre were trashed, the owner began again from a new instance of the plant corridor (taller, for overhead pipes), asked for a better breeze-block texture, a loading bay, preloading of the nearest door's room, and a fit study for the main plant room at 47, 42 and 37 m a side. Second, the owner then walked PR_A and its new neighbours, pointing at places by URL and asking for new rooms and fittings there: an arched corridor and a stepped room south of the hall, a round skylight, a pool, ladders, skylights with sun beams, water effects and a gutter in the pink round room, a red curved corridor, and a white corridor.

## Our Approach

Each new space is a room of its own (a `RoomId`, a URL, a label, its own walker and scene), following the pattern the other session set with CR_A_UP and CR_A_ROUND: PR_A's scene also contains the new geometry, so it can be seen through openings; walking across a threshold dispatches `pool-plant:room-zone` and `main.ts` hands the walker over; while in a room off PR_A, PR_A's renderer follows the walker and draws the hall through the opening (`PEEKS` in `main.ts`, generalised from the dry stair's peek). Openings are cut through walls with their faces in the wall's own plane, as the owner asked.

## Implementation

- Plant: `src/game/main-plant-fit.ts` (the fit study, stairs, `fitFloor`, `fitSolids`) and `src/rendering/plant-fit-room.ts` (rooms `plant_fit_47/42/37`); `src/scene/breeze-block-texture.ts` (height-field textures as DataTextures, so they build in tests); `src/scene/loading-bay.ts`; `nearestJoint` in `door-joins.ts`; the AHU end frames stand proud to stop z-fighting.
- PR_A's south: `src/toolkit/gallery/views/arched-corridor.ts` and `rooms/arched-rooms.ts` (CR_A_ARCH, a 1.2 m by 3 m barrel-vaulted corridor with red bulkhead lights; CR_A_STEPS, a 10 m room a metre down with full-width steps, a round window, a round skylight, a 10 m extension a further metre down, and a pool with rounded corners, an overflow gutter under a grating, and a ladder facing the steps).
- PR_A's north: `views/red-bendy.ts` and `rooms/red-bendy-room.ts` (red_bendy_1, a half-round red corridor turning 20 degrees right).
- The round room: `views/round-room-light.ts` (sun beam through the skylight, light shaft, rippling water, caustics, the basin gutter, and a wall skylight in the dry stair passage); `views/white-corridor.ts` and `rooms/white-corridor-room.ts` (white_corridor_1, a 5 m rounded-rectangle corridor north out of it).
- `views/pool-ladder.ts`: a deck-mounted stainless ladder, used in PR_A's back pool and the stepped room's pool. Each pool's edge is open at its ladder, so a walker who ends up in the water can climb out.

## Outcomes

- What worked: building each room's geometry once (a function scaled to metres) and adding it to both its own scene and PR_A's; a separate tile material with no water above it for anything below PR_A's water line, which the tile shader would otherwise tint as under water; sizing a spot light's cone to just fill a skylight, which gives a crisp sunlit patch with no shadow map and no light leaking onto other rooms.
- Challenges: a scene group scaled to metres does not scale a light's reach or strength (the first corridor lamps reached half a metre); a zero-height last step and a thin floor slab left visible gaps; two modules importing each other would have crashed at load (the shared constant now lives in one); running Prettier directly reformatted a shared file in the wrong quote style (the project formats with `vp fmt`).
- The other session was editing several of the same files throughout (the dry stair passage, the round room, `main.ts`, and at times my own stepped room); edits were applied as small, exact replacements on the files as they stood.

## Next Steps

- Re-lay the main plant room with clearances and zoning per machine (proposed, awaiting the owner's yes).
- Distant box-like machines as textured impostor boxes (idea noted).
- Fittings (and makers) for the lights in red_bendy_1 and white_corridor_1, which are bare lights for now.
