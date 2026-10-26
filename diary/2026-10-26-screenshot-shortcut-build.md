# Screenshot shortcut built (prompt 084)

The owner asked to start work on 084. Built on the existing clean screenshot rather than beside it, following the research note.

- Ctrl/Cmd+Shift+K added to `copyShortcut` (the older Ctrl+Alt+S / Cmd+Option+S kept), listed in the control scheme's help, the pause menu's table and the ▣ button's tooltip. The title takes it through `bindTitleShortcuts`, since the gameplay handler takes no input while the title pauses the game; not while the menu or the console is open.
- `screenshot-size.ts` replaced: twice the device pixel ratio, hard-capped at 3840 px wide, by the tightest GPU limit on both axes and 16 megapixels, even for a larger display; null for a view with no size. Also the file name rule.
- `captureView` in `src/main.ts` finds the visible room canvases from the page's own stacking (sections under the stage, by z-index), so an open doorway, a dry peek and a title shot are each what is seen. It sets each renderer's ratio compensated for render scale, runs each unpaused room's frame at the time of its last browser frame (`RoomRenderer.time`, new in `render-style.ts`), so no time passes and nothing moves, composites at once into a 2D canvas, and restores the ratios in `finally`.
- `copyScreenshot` starts the clipboard write in the gesture with the PNG as a promise; refused or unsupported, it downloads the same PNG. One capture at a time; a fixed notice (`.screenshot-notice`) works on the title too, saying "Copying…", then copied or saved, with a Save button on a fallback.

Checked over the DevTools protocol in headless Chrome with real key events: plant_pool_01 at render quality 0 and 10 both gave 2400 × 1426 from a 1200 × 713 view, clean of HUD; the play canvas went back to its own size; a denied clipboard downloaded `pool-plant-plant-pool-01-….png`; a title shot was sharp and the attract room's quarter resolution came back. Software PNG encoding took several seconds, hence the "Copying…" notice. Not yet seen: an open doorway, a dry peek, Safari, Firefox, the itch.io embed (in TODO).

Checks: typecheck, lint (old warnings only), format (only another session's flyby note), build 0.1.501. The full suite failed one hall-cooling test under load 19; `world.test.ts` passed alone.
