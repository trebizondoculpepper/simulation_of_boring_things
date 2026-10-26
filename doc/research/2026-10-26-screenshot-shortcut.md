# Screenshot shortcut: feasibility and implementation research

Reviewed 2026-10-26 against source `280c614`, for [prompt 084](../prompts/084-screenshot-shortcut.md), originally numbered 072. This is research, not a screenshot implementation change. Prompt 071 concerns ladders and is outside this review.

## Verdict

Feasible as an extension of the existing clean screenshot feature. Reuse its canvas compositing, renderer/composer resizing and promise-backed PNG clipboard write. The remaining work is the selected shortcut, a precisely bounded capture size, a title-aware view target, a render-only capture boundary, feedback and download fallback. No new screenshot library, server, persistent world field or save migration is required.

## Existing implementation, not a blank slate

| Concern   | Current implementation                                                                                                                                         | Required extension                                                                                                                                                        |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Input     | `controls/logic/controls.ts:copyShortcut` recognises Ctrl+Alt+S / Cmd+Option+S; `copy-actions.ts` already has a screenshot request.                            | Add the selected Ctrl/Cmd+Shift+K chord without breaking reference/location copying or noclip; update the separately authored controls table and button tooltip.          |
| Capture   | `src/main.ts:captureScene` rerenders the active room and `seeing` underlay and composites them into a 2D canvas.                                               | Reuse this multi-canvas composition; audit dry peeks and other visibility paths rather than capturing just the front WebGL canvas.                                        |
| Quality   | `screenshot-size.ts` uses a 16-megapixel budget; `createRenderer` wraps pixel ratio with the player's render scale; registered composers follow ratio changes. | Define the requested two-times-device-DPR rule and hard 3840-pixel width limit independently of the current quality setting.                                              |
| Clipboard | `copyScreenshot` already passes a PNG promise to `ClipboardItem`, writes to the clipboard and logs outcomes.                                                   | Preserve the gesture-sensitive ordering; add download fallback and a shared in-progress guard for keyboard and button requests.                                           |
| Title     | Its own scene/store/camera live inside `startTitleBackdrop`; the backdrop sets the gameplay paused flag.                                                       | Resolve the shown attract canvas and handle its shortcut separately from gameplay-paused input, without allowing capture while a pause menu or console owns the keyboard. |
| Output    | A clean screenshot button exists in the room's View tools; errors currently stop at a message.                                                                 | Keep the button as an alternative when a browser consumes the key chord; save the same captured PNG if clipboard access is unavailable.                                   |

The current capture calls the room's whole animation loop. That includes input, camera and machine updates, so it is not a proof that the captured pose equals the instant the shortcut was pressed. It also uses only the player's active-room pointer, which does not identify the title's shown scene. Both require explicit handling.

## Resolution and graphics quality

Treat viewport width and height as CSS pixels and use raw `devicePixelRatio`, not the currently reduced renderer ratio. Let `r` initially be `2 × devicePixelRatio`, then constrain it by `3840 / width`, each participating renderer's maximum texture/renderbuffer/viewport dimensions on both axes, and a pixel budget such as the existing 16 megapixels. Use the most restrictive participating context. Reject zero/non-finite dimensions and aspect-preserve integer output within one rounding pixel. Every cap is a hard upper bound, even when the normal display is larger: the existing `Math.max(current, ...)` rule deliberately preserves an already sharper image and therefore does not implement this contract.

Examples before any tighter GPU constraint: 1920 × 1080 CSS pixels at DPR 1 or 2 produce 3840 × 2160; 1280 × 720 at DPR 1 produces 2560 × 1440; a 3840 × 2160 CSS viewport still produces at most 3840 × 2160. Portrait and ultrawide views keep their own aspect ratio, and portrait output may be limited by the maximum height or pixel budget first. Do not upscale an already low-resolution screenshot in 2D and call it best quality.

The graphics settings currently expose resolution scaling, not a universal shadow/post-processing quality slider. Best quality should mean full-resolution rendering through the room's authored effects chain, at the capture size. Preserve its lighting, colour grading, deliberate film effects and shadow configuration. If a room adds explicit capture quality overrides, snapshot and restore those too. An unqualified promise to enable the highest shadows in every room is not grounded in the present API.

The wrapped `renderer.setPixelRatio` still multiplies the requested ratio by `renderScale(settings.renderLevel)`. Supply the appropriately compensated value or add a narrowly scoped capture override; do not persist or toggle the player's settings signal. `createComposer` already propagates pixel-ratio changes to post-processing buffers. Save and restore renderer sizes/ratios, composer sizing, render targets, viewport/scissor state and deliberate exclusions in `try/finally`, including on encoding or allocation failure.

## Capture the world, not the interface

The clean image is the scene's rendered pixels. DOM menus, HUD, crosshair, console, title branding, fade veil and CSS title blur/dimming are excluded. A title shot therefore yields the sharp, unobscured 3D image at its current pose; its in-world lamps, displays and flashlight remain part of the scene. Mark any genuine scene-space debug overlay explicitly for capture exclusion rather than hiding arbitrary world objects by name.

An open doorway is already a composition of room canvases: preserve their visible order and alpha, rendering and copying each layer before that context's drawing buffer can be discarded. Capture a shown, ready attract shot; while no shot is ready, report that the scene is loading rather than silently using the player's room or queueing a capture of a different future shot.

Establish a synchronous capture transaction: resolve the current view, freeze its camera/input and simulation updates, render each participating scene through its actual final pipeline, composite into an independent 2D canvas, and restore normal rendering before yielding. The preferred renderer contract exposes a draw-only capture operation. Reusing the full animation loop needs an explicit zero-delta/no-input audit; calling it with a new `performance.now()` can advance the view. No async boundary should lie inside the temporary rendering override. Title world/torch/scenario and the player's world must remain unchanged.

## Clipboard and download behaviour

Start `navigator.clipboard.write([new ClipboardItem({ 'image/png': pngPromise })])` from the actual key/button handler without awaiting PNG encoding first. WebKit requires writes to originate in a user gesture; its documentation explicitly describes promise-valued clipboard items. The existing code already uses the right basic pattern. Clipboard availability depends on a secure context and the embedding/browser policy, so successful copying cannot be guaranteed on every host. Test the itch.io embed as well as the standalone HTTPS site and localhost.

Render/composite once and retain the resulting PNG for either delivery route. Unsupported clipboard APIs, denied permission or a rejected write should attempt download of those same bytes through an object URL and a sanitised `pool-plant-<room>-<local timestamp>.png` filename; release the URL after the browser can consume it. Capture/encoding failure should report failure, not claim a saved file. A browser that blocks an automatic fallback download needs an explicit Save action using the retained image. Prevent overlapping captures and ensure an eventual rejection cannot leave an unhandled PNG promise.

Report delivery and dimensions on a shared transient status surface that works in gameplay and on the title, then log the result through the existing copy log. The normal controls-help text is rebuilt every frame, so assigning its text once is not a reliable toast.

## Shortcut compatibility

The owner's selected chord remains Ctrl/Cmd+Shift+K. Mozilla documents Ctrl+Shift+K as Firefox's Web Console shortcut on Windows/Linux; a page cannot promise ownership of browser-reserved keys. Test delivery with real key events and keep the existing screenshot button available. Do not silently choose a different chord. Keyboard handlers should ignore editing targets, composition, repeats and unrelated modifiers; update both the shared shortcut function and the pause menu's explicit bindings table. Title capture must not depend on unpausing gameplay.

## Bounded implementation order

1. Extract/test the exact capture-size contract and add the chosen input chord, keeping the existing screenshot request and View tool.
2. Introduce a view resolver and scoped capture transaction over the existing room renderer/composer registry. Verify low-quality settings, open-door compositing and restoration first.
3. Add title capture of the current shown scene, preserving the camera pose, flashlight and staged-world isolation; reject an unready scene.
4. Add shared status, clipboard delivery, download fallback and capture de-duplication.
5. Run real browser capture/paste checks in Chromium and Safari; exercise Firefox's button fallback and the itch.io embed.

Acceptance should cover a low-resolution render setting, ordinary rooms, an open doorway, a post-processed pool room, a special peek and a lights-out title shot. Assert dimensions, nonblank PNG pixels, layer order, no DOM overlays, unchanged camera/world/settings, recovery after forced failure, and the same bytes being reused for clipboard failure/download. Browser clipboard tests need a real user gesture; script-only writes can fail for a different reason than the feature.

## Sources checked

- [WebKit: Async Clipboard API](https://webkit.org/blog/10855/async-clipboard-api/) — supported PNG representation, gesture requirement and promise-backed clipboard items. This supports retaining the existing write ordering.
- [W3C Clipboard API, ClipboardItem constructor](https://www.w3.org/TR/clipboard-apis/#dom-clipboarditem-clipboarditem) — promise-backed item data; this is a Working Draft and browser implementations still need verification.
- [HTML standard: canvas serialization](https://html.spec.whatwg.org/multipage/canvas.html#dom-canvas-toblob-dev) — blob encoding, invalid/tainted canvas failure and asynchronous completion. Copy to an independent canvas before restoring live WebGL buffers.
- [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html) and [EffectComposer](https://threejs.org/docs/pages/EffectComposer.html) — pixel ratio, render buffers and composer resizing/render passes.
- [Mozilla: developer-tools keyboard shortcuts](https://firefox-source-docs.mozilla.org/devtools-user/keyboard_shortcuts/index.html) — Ctrl+Shift+K belongs to the Web Console on Windows/Linux.

These findings establish feasibility and a concrete integration plan. They do not claim that the new chord, title capture or fallback has been implemented or browser-verified.
