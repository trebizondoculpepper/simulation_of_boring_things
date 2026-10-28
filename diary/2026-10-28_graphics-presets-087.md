# Development Diary Entry - 2026-10-28

## Context

- **Date**: 2026-10-28 UTC
- **Branch**: main
- **Contributors**: Claude Code + owner (unattended overnight)

## Problem Statement

Mission 087 asked for `?resolution=N` to start the game at a lower render quality; the owner widened it to graphics presets, Low, Medium and High, so a weak machine can start with fewer pixels and the costly effects off, from the address and from the menus.

## Our Approach

Every room renderer already comes from `createRenderer` and every composer from `createComposer`, so the presets are applied there and nowhere else: no room builder changed. The rooms keep writing `shadowMap.enabled = true` and `pass.enabled = …` as before; those properties are redefined so the room's wish and the preset's permission are both needed. Shadow-map sizes are cut on a scene's first draw and after a preset change, with a material recompile when shadows come or go.

## Implementation

`settings/logic/graphics.ts` (the presets), `settings/logic/url-settings.ts` (the address), both tested; `graphics` added to the settings; the address applied in `settings-store.ts` at load; `render-style.ts` caps the pixel ratio, gates AO, bloom, refraction and shadows, and gives screenshots an exact ratio (`drawAtRatio`); the settings panel's GRAPHICS selector (the ON-SCREEN CONTROLS selector kind, generalised) and the plain menu's select.

## Outcomes

Live switching works in pool_02 with no errors; canvas widths match the arithmetic. Gotcha: running `npx prettier` reformatted files to double quotes, since the project formats with `vp fmt`; reverted with `npx vp fmt`. Another gotcha: other agents' edits trigger Vite reloads that close the menu mid-test, and a reload re-applies the address's `graphics=`; testing the persistence needs the parameter dropped. The machine here is vsync-bound at 60 fps at every preset, so the saving could not be measured.

## Next Steps

From the research: Ultra, dynamic resolution, first-run auto-detect, an FPS readout, lamp lights, services-ceiling density, a frame cap, cheaper doorway underlays.
