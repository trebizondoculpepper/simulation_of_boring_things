# 087: Start the game at a lower resolution from the URL

Status: to do (written 2026-10-27 from the owner's request), for another agent. Persistence decided by the owner 2026-10-27; two questions remain open (end). Wider graphics settings are researched in [graphics-quality-presets](../research/graphics-quality-presets.md).

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

## Open questions for the owner

1. (Decided 2026-10-27: saved; the URL writes the saved settings.)
2. Is `resolution=6` meaning the existing Render quality level 6 (about a fifth of the pixels) right, or did you mean something lower, a sixth of each side?
3. Smooth upscaling as now, or a deliberately pixelated look at low resolutions?
