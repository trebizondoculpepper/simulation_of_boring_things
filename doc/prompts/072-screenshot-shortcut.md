# 072: A screenshot shortcut, best quality, no overlay

Status: specified 2026-10-26 from the owner's request; not started. (071 is left to another session, which the owner believes has taken it.)

## The request

The owner, 2026-10-26: "I want a button combo that when pressed copies the screenshot in best quality mode with no overlay." The combo, chosen: **Ctrl/Cmd+Shift+K**.

## What there is now (checked 2026-10-26)

- No screenshot feature, prompt or to-do item.
- Two clipboard shortcuts in the shared control scheme (`src/toolkit/controls/logic/controls.ts`, `copyShortcut`; `CONTROL_SCHEME`'s `copyReference` and `copyPosition`): Ctrl/Cmd+C copies the highlighted object's reference, Ctrl/Cmd+P the camera link. The keyboard handler (`src/toolkit/controls/input/first-person.ts`) calls `requestCopy` (`src/toolkit/controls/input/copy-actions.ts`); the app supplies the effect (`setCopyHandler` in `src/main.ts`), writing text with `navigator.clipboard.writeText` and reporting in the copy log.
- The renderer draws at the player's render quality (`renderScale` in `src/toolkit/settings/logic/settings.ts`: level 0 is full resolution, each level fewer pixels).
- Every overlay (the HUD's buttons, the controls help line, the room's name, the crosshair, the touch sticks, the pause menu, the console) is a page element over the canvas, not drawn in it.

## What to build

1. **The shortcut.** `copyShortcut` gains `'screenshot'` for Ctrl/Cmd+Shift+K (the others keep requiring no Shift); `CopyRequest` gains `{ kind: 'screenshot' }`; the control scheme lists it ("Ctrl/Cmd+Shift+K: copy a screenshot"), so the pause menu's controls table shows it. Keyboard only for now. All input stays in the one control scheme; no room binds it.
2. **The best-quality frame.** The app's handler renders one frame of the current view at its best and reads it at once:
   - full resolution (render scale 1, whatever the player's quality setting), at twice the device's pixel ratio, capped so the image is at most 3840 px wide;
   - the top graphics settings for that frame (the highest shadow and post-processing settings the room supports);
   - the canvas read straight after that render, in the same task (`canvas.toBlob`, PNG), since the WebGL drawing buffer is not preserved between frames;
   - then the player's settings and size restored, the next frame drawn as normal. A short hitch is acceptable.
   - Only the canvas is captured, so no page overlay appears. Anything drawn inside the scene that is an overlay rather than the world (a debug helper, the noclip readout if it is ever drawn in 3D) is hidden for that frame.
3. **Copied, or saved.** The PNG goes to the clipboard (`navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])`, the key press being the user's gesture). Where the browser refuses (no `ClipboardItem`, permission denied), it downloads instead as `pool-plant-<room>-<yyyy-mm-dd-hhmmss>.png`. Either way the help line says so briefly ("Screenshot copied, 3840 × 2160" or "Screenshot saved"), and the copy log records it, as the other copies do.
4. **Where it works:** every room, the title screen's attract sequence included (a frame of the shot playing), not while the console or pause menu is open (they own the keyboard).

## Tests

- Pure (`controls.ts`): Ctrl+Shift+K and Cmd+Shift+K give `'screenshot'`; Ctrl+C and Ctrl+P still give theirs; Ctrl+Shift+C does not copy a reference; the scheme lists the shortcut.
- The size rule, pure: twice the device pixel ratio, capped at 3840 px wide, the aspect kept.
- Browser: pressed in the Olympic plant room, the clipboard holds a PNG of the view at the expected size, with no HUD, help line or crosshair in it; the render quality setting at its lowest still gives a full-resolution image; the game carries on afterwards at the player's settings; refusing the clipboard permission downloads the file instead.

## Acceptance

In any room, Ctrl/Cmd+Shift+K puts a sharp, full-resolution (up to 3840 px wide) image of exactly the 3D view on the clipboard, with nothing of the interface in it; pasting it into an image editor or a chat shows it; the game looks and runs as before a moment later.
