# Rendering rooms across open thresholds

## What went wrong at PR_A → CR_A_UP

The staircase is shared geometry, but it was drawn by two independent Three.js scenes. PR_A had the pool room's camera, lighting, environment and postprocessing. CR_A_UP had a separate camera and lighting setup. A previous attempt matched individual settings, including field of view and tone mapping, yet the same stair still changed brightness and contrast in one footstep because the complete lighting and postprocessing inputs were different. The geometry was not the cause of that visual jump.

There was a second visibility bug: the first pool preview was enabled only near the corridor mouth. Farther up the stair, looking back through the opening could show stale or missing PR_A imagery. A room transition must not be used as a reason to stop drawing geometry that remains visible.

## Current rule

For an open connection, use one visual render path for geometry seen on both sides of the threshold. Room IDs, controls, collision and loading may change at the boundary; the camera projection, materials, lighting and postprocessing of a shared surface must not. Today PR_A's renderer draws the dry stair and the adjacent circular room while the dry controller supplies the camera pose. The dry canvas stays mounted for movement and the location pin, but skips its own visual frame during this shared view. The wet pool geometry and refraction pass are disabled when looking away from PR_A; the dry geometry remains visible.

This is the current solution for this connection, not a general renderer abstraction. When adding another open room, prefer a common scene/render pass for the visible join rather than trying to tune two independent renderers until they look alike. If a separate renderer is required, treat the crossing as a visual continuity requirement and verify the final composite in both directions.

## Room implementation checklist

1. Define the opening, floor elevation and wall termination once in world coordinates. Reuse that data for mesh construction and collision; do not leave an end wall behind the opening.
2. Give each actual space its own room ID and URL. A shared controller or mounted scene is allowed when it preserves a seamless transition.
3. When two room IDs share one mounted scene, update their URL and label without running a full room swap. In particular, `showOnTop` hides every other room root; calling it for an internal boundary hides PR_A's shared render canvas and leaves the transparent stair canvas blank.
4. Keep all geometry visible through an open connection rendered, even after the active room ID changes. Culling decisions must follow visibility, not just room ownership or a fixed distance from the threshold.
5. Use the same camera pose and zoom when handing control to the next room. Compare field of view, tone mapping, exposure, lights, environment, material uniforms, water effects and postprocessing if any visual path changes.
6. Keep dry surfaces free of water colour, caustics and refraction. Disable expensive wet passes when the wet room cannot be seen.
7. Walk across the threshold in both directions and stop immediately on either side. The shared floor, walls, lights and ceiling should not jump in scale, colour, contrast or position. Also inspect from the far end while looking back.

## Useful inspection views

- PR_A facing the stair: `?room=PR_A&x=-12.12&y=1.84&z=-6.84&yaw=269.5&pitch=6.9&zoom=1.003`
- Just inside CR_A_UP: `?room=CR_A_UP&x=-15.03&y=2.05&z=-6.82&yaw=269.5&pitch=6.9&zoom=1.003`
- Upper landing looking back: `?room=CR_A_UP&x=-21.74&y=4.86&z=-6.18&yaw=93.5&pitch=-22.4&zoom=1.003`

The implementation is in `src/main.ts` (`startDryPeek` and room-zone handoff), `src/toolkit/gallery/rooms/pool-room.ts`, `src/toolkit/gallery/rooms/dry-stair-room.ts` and `src/toolkit/gallery/views/dry-stair-passage.ts`. The original debugging record is in `diary/2026-10-20_dry-stair-visibility-and-finish.md`.
