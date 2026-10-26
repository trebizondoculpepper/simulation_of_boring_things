# 084: A screenshot shortcut, best quality, no overlay

Status: researched 2026-10-26; built 2026-10-26 (`captureView` and `copyScreenshot` in `src/main.ts`, `screenshot-size.ts`, `copyShortcut`), checked in headless Chrome; open doorways, dry peeks, Safari, Firefox and the itch.io embed still to check (TODO). See the [feasibility research and integration plan](../../research/2026-10-26-screenshot-shortcut.md). (Written as 072; renumbered 084, as other sessions took the numbers in between meanwhile.)

## Review checkpoint — 2026-10-26

**Classification:** Mostly complete. **Filed:** `doc/prompts/done/084-screenshot-shortcut.md`.

**Delivered:** Ctrl/Cmd+Shift+K captures a bounded full-resolution clean PNG, including title shots, with clipboard delivery or download fallback; sizing and shortcut checks and headless Chrome acceptance are recorded in the build diary.

**Still outstanding:** Check open-doorway and dry-peek composition, Safari clipboard gestures, Firefox button fallback and the itch.io embed. These remain unchecked in root TODO.md.

**Evidence:** `c6b471f`, `082b22e`, and `diary/2026-10-26-screenshot-shortcut-build.md`. This implementation landed during the review; the checkpoint supersedes the earlier research-only status.

## The request

The owner, 2026-10-26: "I want a button combo that when pressed copies the screenshot in best quality mode with no overlay." The combo, chosen: **Ctrl/Cmd+Shift+K**.

## What there is now (checked 2026-10-26)

- A clean screenshot feature already exists (`f7d31d8`): a View-tools button and Ctrl+Alt+S / Cmd+Option+S, recognised in `controls.ts:copyShortcut`, with `{ kind: 'screenshot' }` already present in `copy-actions.ts`.
- `src/main.ts:captureScene` rerenders the player's active room and its `seeing` underlay, composites their canvases and restores their pixel ratios. `copyScreenshot` already writes a promise-backed PNG clipboard item and logs outcomes. It currently reports clipboard failure without downloading.
- The current size helper (`controls/logic/screenshot-size.ts`) targets 16 megapixels and GPU dimensions, rather than twice device DPR capped at 3840 px wide. It preserves an already larger image, so its caps are not hard upper bounds.
- `createRenderer` wraps pixel ratio with the player's render scale; `createComposer` propagates ratio changes to the post-processing buffers. Quality settings currently expose resolution, not a universal shadow/post-processing quality tier.
- UI overlays are DOM elements over the canvases. Open doorways may involve more than one world canvas, so clean capture must composite those world layers while omitting DOM UI.
- The title has its own shown scene/canvas and staged world and sets gameplay paused. The existing gameplay key handler rejects paused input, and `captureScene` resolves only the player's room: title capture is an explicit integration task.

## What to build

1. **The shortcut.** `copyShortcut` recognises the chosen Ctrl/Cmd+Shift+K chord (the reference/location chords keep requiring no Shift), reusing the existing `{ kind: 'screenshot' }` request; the control scheme lists it ("Ctrl/Cmd+Shift+K: copy a screenshot"). Update the pause menu’s separately authored controls table and the existing View-tool tooltip too. Keyboard only for now. All input stays in the one control scheme; no room binds it.
2. **The best-quality frame.** The app's handler renders one frame of the current view at its best and reads it at once:
   - full resolution (render scale 1, whatever the player's quality setting), at twice the device's pixel ratio, capped so the image is at most 3840 px wide, with both axes constrained by every participating GPU context and a bounded pixel budget; the cap also applies to already larger native displays;
   - the room’s full-resolution authored rendering and post-processing pipeline; preserve its lighting and art style, and snapshot/restore any explicit per-room capture-quality overrides. There is no universal shadow/post-processing quality slider to turn up;
   - render without advancing the camera/input or simulation, and immediately composite each visible world canvas into an independent 2D canvas in the same task. Encode that snapshot as PNG; do not wait until a later task to copy a non-preserved WebGL drawing buffer;
   - then the player's settings and size restored, the next frame drawn as normal. A short hitch is acceptable.
   - Only the composited world canvases are captured, so no page overlay appears. Anything drawn inside the scene that is an overlay rather than the world (a debug helper, the noclip readout if it is ever drawn in 3D) is hidden for that frame.
3. **Copied, or saved.** Start the clipboard write in the key/button gesture, with a promise-valued PNG (`navigator.clipboard.write([new ClipboardItem({ 'image/png': pngPromise })])`); do not await encoding before initiating the write. Where the browser refuses (no `ClipboardItem`, permission denied), it downloads instead as `pool-plant-<room>-<yyyy-mm-dd-hhmmss>.png`. Capture once, reuse the same PNG for fallback, prevent overlapping captures, and offer an explicit Save action if automatic download is blocked. Either way a shared transient status (including on the title) says so briefly ("Screenshot copied, 3840 × 2160" or "Screenshot saved"), and the copy log records it, as the other copies do. Failure messages must not claim that a failed capture was copied or saved.
4. **Where it works:** every room, the title screen's attract sequence included (a frame of the shot playing), not while the console or pause menu is open (they own the keyboard). Resolve the title’s shown, ready scene explicitly, despite the gameplay paused flag; omit its DOM blur/fade/branding and preserve its in-world flashlight. If no shot is ready, report that rather than capturing the player’s room. Retain the View-tool button: Firefox reserves Ctrl+Shift+K for its Web Console on Windows/Linux, so the chord cannot be promised on every browser.

## Tests

- Pure (`controls.ts`): Ctrl+Shift+K and Cmd+Shift+K give `'screenshot'`; Ctrl+C and Ctrl+P still give theirs; Ctrl+Shift+C does not copy a reference; the scheme lists the shortcut.
- The size rule, pure: twice the device pixel ratio, hard-capped at 3840 px wide and constrained on both GPU axes/pixel budget, with aspect kept. Include low quality, DPR 1/2, already larger native views, portrait, ultrawide and invalid dimensions.
- Browser: pressed in the Olympic plant room, the clipboard holds a PNG of the view at the expected size, with no HUD, help line or crosshair in it; the render quality setting at its lowest still gives a full-resolution image; the game carries on afterwards at the player's settings; refusing the clipboard permission downloads the file instead.
- Browser: title capture preserves its current shot, flashlight and staged-world state; loading/black transitions never capture a stale player view. Open doorways and special peeks include the correct underlying world layers. Shader/post-processing output and renderer state are restored after success and forced failure.
- Input/browser: editing, composition, repeats and unrelated modifier combinations are ignored; the gameplay and title handlers each deliver one request. Exercise Chromium/Safari clipboard gestures, Firefox’s button fallback, and the actual itch.io embed.

## Acceptance

In any ready room or title shot, the shortcut (where the browser delivers it) or retained screenshot button captures a sharp image of the current 3D view at the defined resolution, up to 3840 px wide, with no interface. Clipboard success allows pasting into an image editor or chat; refusal offers the same PNG for download. The game resumes with its camera, world, quality settings and rendering state unchanged.
