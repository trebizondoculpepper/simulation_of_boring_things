# Graphics quality presets: research

Status: research only (2026-10-27, for the owner), nothing implemented. Companion to [087](../prompts/087-resolution-url-setting.md), the `resolution=` URL setting.

## Contents

- The problem
- What the game draws now (inventory)
- What players expect, and common practice
- Proposed settings model
- How each setting would be built here
- Frame-time readout
- Risks
- Open questions for the owner

## The problem

Players report the game is sometimes unplayable, around 10 fps. The only graphics knob today is Render quality (`renderLevel`, 0–10), which lowers the pixel count; nothing turns off the costly effects, which on a weak GPU cost per frame whatever the resolution (shadow passes, ambient occlusion, bloom, extra scene renders). Players expect the usual menu: a preset from Low to Ultra, and individual toggles under it.

## What the game draws now (inventory)

Surveyed 2026-10-27 at `27e36ab`. Line numbers are approximate.

### One renderer factory

- Every `WebGLRenderer` is made in `createRenderer` (`src/toolkit/components/core/parts/render-style.ts`, line 104), used by 33 files. This is the one place to apply most settings, which is good news. It sets `antialias: true` (MSAA on the default framebuffer), `MAX_PIXEL_RATIO = 2`, PCF soft shadows (`PCFSoftShadowMap`, line 148), tone mapping (ACES, AgX or Neutral by room look), and wraps `setPixelRatio` to multiply by `renderScale(renderLevel)`, re-applied by an `effect` when the setting changes, and passed to post-processing composers.
- Composers are made through `createComposer` (same file, line 87), registered per renderer, so a setting can reach every composer too.
- Rooms that call `renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))` themselves (`shared-plant-layout.ts`, `plant-fit-room.ts`, `plant-corridor-room.ts`, `pool-hall-room.ts`, `shell-room.ts`, `ceiling-lab-room.ts`, `pipes-n-dreams-room.ts`, `white-corridor-room.ts`, `dry-stair-room.ts`) all go through `createRenderer`, so they do honour Render quality.
- More than one room can be drawn at once: through an open doorway the next room's canvas is drawn as an underlay (`seeing` in `src/main.ts`), and the dry peeks draw a stair room onto a plant room. Each is a full renderer with its own effects, so the cost doubles at a doorway.

### Post-processing (the biggest per-pixel cost)

- 14 room builders each run a composer of `RenderPass` → `GTAOPass` (ground-truth ambient occlusion) → `UnrealBloomPass` → `OutputPass`: `src/toolkit/gallery/rooms/` `pool-room.ts` (1026), `pool-hall-room.ts` (169), `shell-room.ts` (572), `plant-room-shell-room.ts` (187), `main-corridor-room.ts` (217), `white-corridor-room.ts`, `corridor-lab-room.ts`, `arched-rooms.ts`, `dry-stair-room.ts`, `donut-pool-room.ts`, `ceiling-lab-room.ts`, `pipes-n-dreams-room.ts`, and bloom only in `jacuzzi-water-room.ts`. GTAO needs a depth and normal pass plus several samples a pixel and a denoise; bloom is a mip chain of blurs. These are the most likely cause of 10 fps on integrated GPUs.
- The pool rooms add a screen-space refraction pass (`src/toolkit/components/pool/views/pool-refraction.ts`) that reads the scene's colour and depth, cheaper than a second scene render but another full-screen pass.

### Shadows

- `renderer.shadowMap.enabled = true` in `poolrooms-world.ts`, `dev-corridor-room.ts`, `plant-corridor-room.ts`, `pool-hall-room.ts`, `jacuzzi-water-room.ts`, `donut-pool-room.ts`, `pool-room.ts`.
- Map sizes: 4096² for the large halls (`src/toolkit/gallery/views/pool-hall.ts` 1188 when wider than 40 m; `poolrooms-world.ts` 138), 2048² elsewhere (`pool-room.ts` 805, `donut-pool.ts` 386, `dev-courtyard-room.ts` 102). PCF soft filtering everywhere. 12 lights set `castShadow = true`; any point light that casts renders six shadow faces.
- `poolrooms-world.ts` sets `shadowMap.autoUpdate = false` and updates once (line 156, 1429), a good pattern other rooms do not yet use.

### Reflections and environment

- Pool water: a 256 px `CubeCamera` probe (`pool-room.ts` 848) renders the room six times, only when the look changes, not every frame. A light-level preset could drop it to 128.
- Sight glasses and similar: `attachRoomReflection` (`src/toolkit/components/core/views/room-reflection.ts`) takes one 40 px cube capture a few frames after a room is built; cheap.
- `water-room.ts` (a dev room) uses a `CubeCamera` and the vendored `src/toolkit/vendor/threejs-water/` simulation (heightfield and caustics render targets every frame).
- PMREM environment maps (`effects-playground-room.ts`, the pool look's `scene.environment`): built once, cheap after.

### Lights

- 39 files make `PointLight`, `SpotLight` or `RectAreaLight`. Three.js's standard materials loop over every light in every fragment, so a room's light count multiplies its fragment cost; for example `poolrooms-world.ts` 764 and the dev corridor (one per fitting). The lights also add shader variants, so turning lights on and off recompiles programs (a hitch rather than a steady cost).

### Canvas textures (labels, LCDs, mimics)

- `CanvasTexture` appears in 84 files: every LCD, LED readout, chart recorder, label and mimic is a 2D canvas uploaded to the GPU when it changes (`needsUpdate = true` in 79 files). A readout that redraws each frame uploads each frame. Worth an audit: redraw only when the shown value changes, and at a lower rate when far away or off screen.

### Geometry

- `InstancedMesh` in 8 files (drops, bubbles, gratings, beads) and `mergeGeometries` in 8 files (lane markings, gratings in `pool-hall.ts`, `pool-room.ts`). Most plant is many separate meshes; the 2026-10-24 loading report ([plant-room-load-performance](../reports/plant-room-load-performance-2026-10-24.md)) already lists Olympic static draw calls as a cost.
- The procedural services ceiling (`src/toolkit/components/site-dressing/`, used by `plant-room.ts`, `racks-room.ts`, `bin-room.ts`, `repair-room.ts`, `settling-room.ts`, `architectural-room.ts`, `shell-room.ts`, the dev courtyard and corridor) adds many trays, ducts and pipes high overhead. As set decoration it is the safest thing to thin or drop on Low.

### Every-frame work

- 36 files run `requestAnimationFrame` or `setAnimationLoop`; each room's loop steps its components (`main.ts` 1157, `watchDoors` 1521). The world model (`src/game/world.ts`) runs for whichever room the player is in. Animated water, falling water, disturbed water and float switches (`src/toolkit/components/plant/views/`) update each frame.
- Audio: oscillators and noise loops per part (`src/toolkit/components/core/audio/part-loops.ts`); cheap next to rendering, so no audio setting is proposed.

### Already built

- Render quality (`renderLevel`) with its slider (`src/toolkit/settings/pause-menu.ts` 280), saved in `pool-plant:settings` (`src/toolkit/settings/settings-store.ts`).
- Screenshots (`captureView` in `main.ts`) divide the scale out and capture at full quality.

## What players expect, and common practice

A typical PC game's graphics menu offers: a preset (Low, Medium, High, Ultra, Custom); resolution or resolution scale; dynamic resolution with a target frame rate; shadows quality; ambient occlusion; reflections; anti-aliasing; post effects (bloom, motion blur, depth of field); texture quality; view or draw distance and detail; a frame-rate cap; vsync; and a frame-rate counter. Picking a toggle by hand turns the preset to Custom.

Three.js guidance agrees on where the cost is:

- Pixel ratio and resolution are the first lever; cap `devicePixelRatio` and lower it when slow. https://threejs.org/manual/#en/responsive and https://discoverthreejs.com/tips-and-tricks/
- Post-processing passes cost per pixel; MSAA on the default framebuffer is wasted when a composer renders to its own target. https://threejs.org/docs/#examples/en/postprocessing/EffectComposer and https://github.com/pmndrs/postprocessing
- Shadows: fewer casters, smaller maps, `shadowMap.autoUpdate = false` for static scenes, avoid shadow-casting point lights (six renders each). https://threejs.org/docs/#api/en/lights/shadows/LightShadow and https://discoverthreejs.com/tips-and-tricks/
- Lights: each light adds to every fragment; bake, or use fewer. https://threejs.org/manual/#en/optimize-lots-of-objects and https://discourse.threejs.org/t/three-js-performance-tips/
- Draw calls: merge or instance static meshes; check `renderer.info.render.calls`. https://threejs.org/manual/#en/optimize-lots-of-objects and https://threejs.org/docs/#api/en/renderers/WebGLRenderer.info
- Dynamic resolution (lower the pixel ratio when frame time is over budget) is the standard fix for uneven hardware; react-three-fiber's `PerformanceMonitor` and drei's `AdaptiveDpr` do this for three.js. https://github.com/pmndrs/drei#performancemonitor and https://docs.pmnd.rs/react-three-fiber/advanced/scaling-performance
- Frame-time display: the `stats.js` panel (FPS, ms) is the usual tool. https://github.com/mrdoob/stats.js

The links were not fetched in this session; check them before quoting.

## Proposed settings model

One `graphics` block in `Settings` (`src/toolkit/settings/logic/settings.ts`): a `preset` (`low`, `medium`, `high`, `ultra`, `custom`) and the individual settings below. Choosing a preset writes all of them; changing any one makes the preset `custom`. Pure, in `logic/`, with tests (`presetSettings(preset)`, `presetOf(settings)`, `cleanSettings` migrating an old save to `high` plus its `renderLevel`).

| Setting | Low | Medium | High (default) | Ultra |
| --- | --- | --- | --- | --- |
| Render quality (`renderLevel`, existing) | 6 | 3 | 0 | 0 |
| Pixel ratio cap | 1 | 1.25 | 1.5 | 2 |
| Dynamic resolution | on | on | off | off |
| Anti-aliasing (MSAA) | off | off | on | on |
| Ambient occlusion (GTAO) | off | off | on | on (full) |
| Bloom | off | on (half resolution) | on | on |
| Shadows | off | on, 1024, one caster | on, 2048 | on, 4096 |
| Shadow updates | once | once | each frame | each frame |
| Pool reflection probe | 64 px | 128 | 256 | 256 |
| Pool refraction | off | on | on | on |
| Lamp lights (per-fitting point lights) | nearest few | nearest half | all | all |
| Services ceiling | off | sparse | full | full |
| Instrument redraw rate | 5 Hz | 10 Hz | each change | each change |
| Frame cap | 30 | 60 | none (vsync) | none |

Defaults: High, as the game looks now (so no player sees it change unasked), except on first run where auto-detection picks lower.

**Auto-detect on first run** (only when no saved settings exist): read the GPU name through `WEBGL_debug_renderer_info` where the browser allows, plus `navigator.hardwareConcurrency`, `deviceMemory` and screen size, for a first guess (Low on a phone or an integrated GPU, otherwise High); then measure frame time over the first ten seconds of the first room and step down a preset while the median is over 33 ms. Save the result, so it happens once. A notice says what was chosen and where to change it.

**Dynamic resolution:** when on, a small controller watches the median frame time over a second and nudges `renderScale` down a step when it is over budget (say 20 ms for 50 fps), up a step when well under (12 ms), between the preset's floor and 1, with hysteresis so it does not flicker. It changes a runtime scale, not the saved `renderLevel`. The controller's arithmetic is pure (`logic/dynamic-resolution.ts`, tested with recorded frame times); the measuring sits in `main.ts`'s loop.

## How each setting would be built here

| Setting | Where | Difficulty |
| --- | --- | --- |
| Render quality, pixel ratio cap | Already in `createRenderer`; make `MAX_PIXEL_RATIO` a setting. | Small |
| Dynamic resolution | A second multiplier in `createRenderer`'s wrapped `setPixelRatio`; controller fed from the frame loop. Must not apply to screenshots. | Medium |
| Anti-aliasing | `antialias` is fixed when the context is made: read the setting in `createRenderer`; a change applies on the next room (or reload). Rooms with a composer could use the composer target's `samples` or an FXAA/SMAA pass instead, which can change live. | Small (reload) to medium (live) |
| Ambient occlusion, bloom | 14 builders make the same chain by hand: factor it into one `createRoomEffects(renderer, scene, camera, look)` beside `createComposer`, which sets `pass.enabled` from the signal (and bloom's resolution). Removing the repetition is worth it in itself. | Medium (one refactor, then trivial) |
| Shadows | In `createRenderer`, follow the signal: `shadowMap.enabled`, and a helper the rooms call instead of `mapSize.set(...)` (`shadowSize(wanted)`) that clamps to the preset. Toggling shadows recompiles materials (`material.needsUpdate`), a one-off hitch. Adopt `autoUpdate = false` as `poolrooms-world.ts` does, for still lights. | Medium |
| Pool reflection probe | `pool-room.ts` 848: size from the setting, rebuilt on change. | Small |
| Pool refraction | `pool-refraction.ts`: skip its pass, water falls back to the probe. | Small |
| Lamp lights | Hard in general: lighting is part of what the game models. Keep every lamp's state and emissive face; only the `PointLight` objects beyond the nearest N are turned off, by a per-room light manager. Changes the look, and recompiles shaders as counts change unless fixed counts are kept (switch intensity to 0 instead of removing). | Large |
| Services ceiling | `src/toolkit/components/site-dressing/`: a density parameter in its generator; set decoration, so safe. | Small |
| Instrument redraw rate | A shared throttle in `createCanvasTexture` (`src/toolkit/components/core/views/screens`) and an audit of the 84 users so they redraw only on change. | Medium, spread over many files |
| Frame cap | Rooms already run through `renderer.setAnimationLoop`, wrapped in `createRenderer`: skip callbacks until the frame interval has passed. Simulation time must keep using real time, not frame count. | Small |
| Vsync | Not controllable in a browser (`requestAnimationFrame` is tied to the display). Do not offer it. | n/a |
| Texture quality | The game is mostly procedural and canvas-drawn; few image textures. Low value; skip for now. | n/a |
| Underlay rooms (doorways, dry peeks) | Draw the room seen through a doorway with its effects off and at a lower scale on Low and Medium. | Medium |

Where a setting changes the menu: the pause menu's Graphics section (`src/toolkit/settings/pause-menu.ts`) gets a preset selector at the top and the toggles under it; all input stays in `src/toolkit/controls/`.

## Frame-time readout

An optional overlay (off by default; a setting under Graphics, and perhaps `?fps` in the URL like `resolution=`): FPS, frame time in ms (median and worst of the last second), the current dynamic scale, draw calls and triangles from `renderer.info`. Draw it as DOM text, not in the canvas, so it costs nothing to render and is left out of screenshots like the rest of the HUD. The averaging is pure logic with tests. A sparkline of the last few seconds' frame times helps spot hitches (room loads, shader compiles) as against a steady low rate.

## Risks

- Shader recompiles: toggling shadows, light counts or AO causes a pause; apply changes when the menu closes, with a notice, not on each slider tick.
- Look regressions: the rooms' looks (`look.exposure`, bloom strength) were tuned with AO and bloom on; at Low the rooms will look flatter. Acceptable for playability, but the owner should see Low before it ships.
- Instruments must stay readable: the game is about reading gauges. Never lower canvas texture resolution for instruments; only their redraw rate, and keep the inspection overlay's text in the DOM.
- Lights are part of the plant model: turning off `PointLight`s must not change any lamp's modelled state or its emissive face.
- Measuring is hard in a browser: rAF is capped at the display rate, and background tabs throttle. Auto-detect and dynamic resolution must ignore hidden-tab periods and room loads.
- The one-renderer-per-room design and doorway underlays mean a doorway can double the cost; the readout should make that visible before deciding what to do.
- Old saves: `cleanSettings` must migrate a save with no `graphics` block to High plus its `renderLevel`, without the player noticing.

## Open questions for the owner

1. Should first run auto-detect a preset (and drop it if the first seconds are slow), or always start on High and leave it to the player?
2. May Low turn off most real lamp lights (their lamps still lit and modelled, only the light they cast simplified), or must every fitting always light the room?
3. Should dynamic resolution be on by default for everyone, or only on Low and Medium?
4. Which comes first: the presets menu, or a quick win (AO and bloom off on Low, shadows off) behind the existing slider?
5. Should the FPS readout be a player setting, a `?fps` URL option, or both?
