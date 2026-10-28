# 087: Start the game at a lower resolution from the URL

Status: done 2026-10-28 (`f77eb17`), widened by the owner 2026-10-28 to graphics presets (see "Done" at the end). Persistence decided by the owner 2026-10-27; the two other questions decided by the owner 2026-10-28 (end). Wider graphics settings are researched in [graphics-quality-presets](../research/graphics-quality-presets.md).

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first; its rules apply: all input goes through `src/toolkit/controls/`, `logic/` folders are pure and tested beside them, and markdown is one paragraph per line.

## The request

The owner, 2026-10-27: "we should be able to start the game at lower resolution with a URL setting. You should be able to pass in a URL such as resolution=6, and it would set the game to a lower resolution as soon as the game started. That would allow people who have less powerful machines to experience the game."

## What there is now (checked 2026-10-27)

- The player's settings (`src/toolkit/settings/logic/settings.ts`) already carry a render quality, `renderLevel`, a whole number from 0 to 10 (`RANGES.renderLevel`), default 0. `renderScale(level) = 1 / ln(e + level)` is the share of each side drawn: level 0 is 1:1, level 6 draws 0.46 of each side (about a fifth of the pixels), level 10 about 0.39. `cleanSettings` clamps and rounds whatever was stored.
- The settings are one signal (`src/toolkit/settings/settings-store.ts`), loaded from `localStorage` under `pool-plant:settings` at module load and written back by `updateSettings`.
- The pause menu's Graphics section has a "Render quality" slider over `renderLevel`, labelled `1:1` or `1:<1/scale>` (`src/toolkit/settings/pause-menu.ts`, about line 280).
- `createRenderer` (`src/toolkit/components/core/parts/render-style.ts`, about line 115) wraps `renderer.setPixelRatio` so whatever ratio a room asks for (usually `min(devicePixelRatio, 1.5)`) is multiplied by `renderScale(settings.value.renderLevel)`, and an `effect` re-applies it, and the post-processing composers' ratio, whenever the setting changes. So the canvas is already drawn at fewer pixels and stretched back to full size by CSS.
- `src/main.ts` reads the scale too: `captureView` (screenshots, about line 441) divides it out to capture at full quality, and the title shot (about line 1108) draws at a quarter of the room's own ratio.
- Some rooms call `renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))` directly (`src/rendering/shared-plant-layout.ts`, `plant-fit-room.ts`, `plant-corridor-room.ts`, several in `src/toolkit/gallery/rooms/`); check each renderer comes from `createRenderer`, or it ignores the setting.
- URL parameters are read ad hoc in `src/main.ts` with `new URLSearchParams(location.search)`: `room`, `from`, `noclip`, `roll`, `scenario`, `dev`, and the camera pin (`x`, `y`, `z`, `yaw`, `pitch`, `zoom`), written by the copy-link code (about line 300). There is no general place for start-up options.
- The HUD, overlays, menus and title text are DOM over the canvas, so they stay crisp whatever the canvas resolution; no change is needed to keep them sharp.

## The proposal

**`resolution=N` sets the existing render quality, `renderLevel`, to N.** Recommended, because the game already has exactly this knob, its scale and its slider: the URL is just a way to set it before the first frame. `resolution=0` is full resolution; `resolution=6` draws each side at 0.46 (about a fifth of the pixels, so roughly five times less fragment work), the slider then reading `1:2.17`; `resolution=10` is the lowest the slider offers. Values are clamped to 0–10 and rounded; anything unparseable (`resolution=low`, empty) is ignored and the stored setting stands.

The alternative, a plain divisor (`resolution=6` meaning one sixth of each side, a thirty-sixth of the pixels), would be very blocky and would need a second scale beside the slider's; not recommended. If the owner wants lower than level 10 allows, widen `RANGES.renderLevel` instead, so the slider and the URL stay one scale.

**URL wins at start-up, and persists.** Decided (the owner, 2026-10-27): the URL setting is remembered; it writes the saved settings, so a returning player gets the settings they chose and does not get a jittery start. at start-up, before any renderer is made, a valid `resolution` is applied with `updateSettings({ renderLevel })`, so it is saved like a slider change. Someone sent a link for a weak machine then keeps the lower resolution on their next visit without the parameter, and can raise it in the pause menu as usual.

**Applied before the first frame.** Apply it where the settings are first loaded (or at the very top of `main.ts`, before the title screen or any room builds its renderer), so no frame is drawn at full resolution first. Because `createRenderer` already follows the signal, applying it later would still work, but would cost a frame or two at full size on exactly the machines that can least afford it.

**Upscaling: smooth, as now.** The canvas is stretched by CSS with the browser's default (bilinear) filtering. Keep it: at level 6 it reads as soft rather than broken, and the instruments' faces stay legible. Do not set `image-rendering: pixelated`, unless the owner asks for a retro look (open question).

**Keep the parameter in links.** The copy-link and pin-link code rebuilds the search string; decide whether it carries `resolution` along (recommended: no, since a link is a place, and the setting is already saved). Navigation between rooms with `goTo` must not reapply it each time; it is read once, at start-up.

**Screenshots unaffected.** `captureView` already divides the scale out, so a screenshot is full quality whatever the URL says. Check it still is.

## Implementation outline

1. A pure parser, `src/toolkit/settings/logic/url-settings.ts`: `settingsFromUrl(search: string): Partial<Settings>`, reading `resolution` into `renderLevel` (clamped, rounded, ignored when not a finite number). Written so other start-up settings (fov, volume) could be added later, but add only `resolution` now.
2. Tests beside it, `url-settings.test.ts` (importing from `vite-plus/test`): `?resolution=6` gives `{ renderLevel: 6 }`; `0` and `10` pass; `11` and `99` clamp to 10; `-3` clamps to 0; `2.6` rounds to 3; `low`, empty and missing give `{}`; other parameters (`room`, `noclip`) are ignored.
3. Apply it once at start-up, before the first renderer: in `settings-store.ts` after `load()`, or at the top of `src/main.ts`, via `updateSettings`.
4. Check the rooms that set their own pixel ratio use `createRenderer`, so every room honours the setting.
5. Note the parameter in `README.md` (beside the other URL parameters, if they are listed) and under Unreleased in `CHANGELOG.md`; tick the TODO entry.

## Acceptance

- Opening `?resolution=6` (with or without `room=`) draws the title and every room at 0.46 of each side from the first frame; the pause menu's slider shows level 6 (`1:2.17`).
- Reloading without the parameter keeps level 6; the slider still changes it freely.
- Out-of-range and malformed values do as the tests say; no error, no blank screen.
- HUD, menus and inspection text stay crisp; screenshots (Ctrl/Cmd+Shift+K) are full quality.
- `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` and `npm run build` pass.

## Decisions

1. Persistence (the owner, 2026-10-27): saved; the URL writes the saved settings.
2. The scale (the owner, 2026-10-28): `resolution=N` is the existing Render quality level N (0–10), as proposed; not a divisor.
3. Upscaling (the owner, 2026-10-28): smooth, as now; no pixelated look.
4. Links (chosen by the implementer, for the owner to check): copy-link and pin links do not carry `graphics` or `resolution`; a link is a place, and the setting is already saved. Room changes (`goTo`) replace the address's search, so the parameters are read once, at start-up.

## Done (2026-10-28)

The owner widened the mission, 2026-10-28: "not just resolution, but maybe graphical options all the way, like low, medium, and high, so that somebody on a low-performance computer can start the game with limited resolution and some specific visual effects disabled."

- Presets (`src/toolkit/settings/logic/graphics.ts`, tested), built over the individual graphics settings another session added the same night (`616dc03`: ambient occlusion and bloom Off/Low/Medium/High, film grain and vignette, a resolution cap). A preset does two things. Choosing it writes the player's own settings: High render quality 0, AO High, bloom High, film on (the defaults, the look as it was); Medium render quality 3, AO off, bloom Medium (half-size blur), film on; Low render quality 6, AO off, bloom off, film off. Those can then be changed one by one without leaving the preset. And it decides what has no setting of its own: High a pixel-ratio cap of 2, antialiasing, the pool's refraction, shadows up to 4096 px; Medium a cap of 1.25, no antialiasing, shadow maps cut to 1024 px; Low a cap of 1 and no antialiasing, refraction or shadows. The setting is `graphics`; an old save is High. The resolution cap is left as the player set it.
- Address (`src/toolkit/settings/logic/url-settings.ts`, tested): `?graphics=low|medium|high` (any case, `med` too) and `?resolution=N` (clamped 0–10, rounded; unreadable ignored), resolution over the preset's level. Applied once in `settings-store.ts` as the settings are first read, before any renderer exists, and saved.
- Applied centrally in `src/toolkit/components/core/parts/render-style.ts`, so no room changed: `createRenderer` caps the pixel ratio before the render quality and the resolution cap, takes antialiasing from the preset when the context is made (a change reaches the next room), gates `shadowMap.enabled` on the preset (the room's own switch kept), and on the first draw of each scene and after each preset change cuts shadow maps to the preset's largest and recompiles materials when shadows come or go; `createComposer` gates any pass marked with `markEffect` (the pool's refraction), so a room switching the pass itself still works; ambient occlusion and bloom follow the player's settings through `followEffectSettings`. Every room renderer comes from `createRenderer` (checked: the rooms that call `setPixelRatio` themselves all do); only the menu panels' and title box's overlay renderers do not, and are left sharp, being the menus.
- Screenshots: `captureView` now draws at an exact ratio through `drawAtRatio` (replacing `setCapturing`), past the render quality, both caps and the preset, so they stay full resolution (with the preset's effects).
- Menus: the settings panel's PICTURE zone has a GRAPHICS lever selector, LOW · MED · HIGH, above RENDER QUALITY (the same selector kind as ON-SCREEN CONTROLS, generalised in `settings-panel.ts`), with its accessible copy; the plain menu (`?menu=plain`) has a Graphics preset select above the individual choices, and a note on what each preset does. The individual AO, bloom, film and resolution-cap choices are not yet on the panel (only the plain menu).
- Merge note: the first commit (`0b79ba6`) was undone by a merge on origin (`25b5add`) that kept the other side of every conflicting file; this was rebuilt over the individual settings.
- Checked in the browser (2026-10-28): `?room=main_corridor&graphics=low` drew the corridor at 635 px wide for a 1376 px view (1 × 0.46) from the start, and kept it after a reload without the parameter; Medium 986 px, High 2064 px (1.5 × 1376). In pool_02, switching High → Low → Medium → High live dropped and restored shadows, AO and bloom with no console errors. This machine runs 60 fps at every preset (vsync-bound), so the saving was not measurable here.
- Not done (in the research, for later): Ultra, dynamic resolution, first-run auto-detect, an FPS readout, lamp lights, services-ceiling density, instrument redraw rate, frame cap, cheaper doorway underlays.
