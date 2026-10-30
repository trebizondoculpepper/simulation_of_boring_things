# Baked ambient occlusion and pre-computed reflections

Research and recommendation, 2026-10-30. No game code was changed. A throwaway bake prototype was run in the session scratchpad (described under Measurements).

## Contents

- Summary
- What the game does now
- 1. Pre-computed ambient occlusion
- 2. Pre-computed reflections
- Graphics presets
- Measurements
- Risks
- Staged plan
- Questions for the owner
- Sources

## Summary

Bake ambient occlusion in the player's browser when a room loads, on the CPU in a Web Worker with three-mesh-bvh, stored per vertex, cached in IndexedDB (files in the Electron build) under a hash of the room's static geometry. Do not commit baked assets and do not bake in CI: the rooms are procedural and change often, so committed bakes would be stale on most commits, and a CPU bake is fast enough (about 0.7 million rays a second on one core here) that a typical dev or plant room bakes in one to three seconds on a worker, with the existing GTAO running until it lands. Keep GTAO, at fewer samples and half resolution, only on High, for the small contact shadows of moving and small parts the bake leaves out; Low and Medium use the bake alone. Lightmaps with xatlas unwrapping are not worth it yet: the boxy shells would need subdivision for per-vertex AO, but that is cheap, and a lightmap pipeline adds UV2 on every merged mesh, a texture per room and seams to fix.

For reflections, extend what the pool rooms already do (`pool-room.ts` captures the room into a cube map once, and again only when the lights change) to every room with water or shiny surfaces: one or two capture points per room at load, PMREM-filtered for `scene.environment` in place of the neutral `RoomEnvironment` studio, and box-projected (parallax-corrected) for the rectangular rooms, by a small shader patch, so that tiles and stainless steel reflect the walls in the right place. The water keeps its ripples and caustics because they are computed in its own shader and only the static room it reflects comes from the capture. Re-capture on light-state changes, spread over a few frames. The saving is not mostly frame time, since the game already avoids per-frame reflection renders outside the dev water room; it is correctness (the room seen in steel and tile instead of a studio) at near-zero per-frame cost, plus dropping the vendored per-frame water passes wherever that simulation is used in the game.

## What the game does now

Ambient occlusion: `GTAOPass` (three.js addon) in 13 room builders (for example `src/toolkit/gallery/rooms/pool-room.ts` 1028, `shell-room.ts`, `museum-hall-room.ts`), samples from `ambientOcclusionAt` in `src/toolkit/settings/logic/graphics.ts` (12 a pixel in most rooms, 6 on the bridge, 3 in the museum; Low a third, Medium a half, never fewer than 4), applied through `src/toolkit/components/core/parts/render-style.ts` around line 190. GTAO renders the scene again into a normal buffer, so it roughly doubles draw calls: on the bridge 815 against 398 for one scene render, and dropping from 12 to 6 samples moved the bridge from about 47 to 58 fps at 2560 × 1426 on an Apple M5 ([bridge report](bridge-render-performance-2026-10-28.md)). It is the single largest measured cost.

Reflections and environment:

- `useEnvironment` (`render-style.ts` ~456) gives 24 rooms a PMREM of three.js's `RoomEnvironment` studio as `scene.environment`: cheap, built once, but the steel and tiles reflect a studio, not the room.
- The pool rooms (`pool-room.ts` ~843) already do the recommended thing for water: a 256 px `CubeCamera` from just above the water into the `room` sampler of the water shader (`src/toolkit/components/pool/views/pool-surfaces.ts` ~445 and 554, `textureCube(room, reflect(-v, n))`), and two PMREM passes of the lit room as `scene.environment` for bounce, taken again when the light changes, not each frame. Its lookup is not box-projected, so the reflection is right only near the probe.
- `attachRoomReflection` (`src/toolkit/components/core/views/room-reflection.ts`) takes one 40 px capture a few frames after a room is built, for sight glasses; used twice.
- Under water, `src/toolkit/components/pool/views/pool-refraction.ts` warps the already-drawn image (a full-screen pass, no second scene render). Caustics and ripples are analytic in the pool shaders (`pool-ripples.ts`).
- The vendored simulation `src/toolkit/vendor/threejs-water/` (dev room `water-room.ts` only) renders height field, caustics and object textures every frame; it is the one per-frame reflection cost, and it is not in the game's rooms.

Geometry: rooms are built procedurally in code; static set pieces are merged by material within 3 m cells (`src/toolkit/components/core/views/merge-static.ts`), moving and clickable parts kept apart; shells are mostly boxes and planes with few segments (a 12 m wall is often two triangles); `InstancedMesh` in about 8 files (gratings, drops, beads). Existing UVs are for tile textures (repeated, overlapping), so no mesh has a unique UV layout a lightmap could use.

## 1. Pre-computed ambient occlusion

### When to bake

(a) At room load in the browser, cached. Recommended. The rooms are built in code from `facility-plan.ts` and the room builders, so the geometry exists only after the builder runs; baking right there needs no new build pipeline and is never stale. Hash the merged static geometry (positions and indices of the meshes that `mergeStatic` produced, quantised to millimetres, plus the bake settings and a bake version number) with a fast hash (FNV-1a or xxhash-wasm, a few milliseconds for a few hundred thousand floats). On a hit, read the AO arrays from IndexedDB (browser) or a file under `app.getPath('userData')` (Electron) and apply them before the first frame. On a miss, show the room at once with GTAO as now, transfer the geometry to a Web Worker, bake there, apply the result when it lands (fading in over half a second), store it, and switch GTAO down. Never recompute while in the room. The cost on a miss is one to a few seconds of a background core; on a Steam Deck (Zen 2, four cores) expect perhaps two to three times this machine's single-core time, so bake on two workers and cap rays on big halls.

(b) Developer task committing baked assets. Not recommended as the main path. Rooms change often and are generated, so a committed bake goes stale on every geometry change, nothing in CI could tell (the hash would simply miss and fall back to a), and the repository would carry binary churn. Useful only as a pre-warm for the release builds (below).

(c) A CI build step. Possible but not needed. three-mesh-bvh runs in Node without a GPU (the prototype below ran in Node), but the room builders use DOM canvases for labels and textures and would need a headless browser to run; headless Chrome with SwiftShader works but is slow and brittle. Since (a) is fast enough, CI only adds risk.

Hybrid (recommended later): (a) for everyone, plus, for releases only, a `npm run bake:prewarm` script that walks every room in headless Chrome and writes the cache files into the Electron build (and optionally a static `baked/` folder on itch.io and Pages), so a player's first visit to a room hits the cache. The hash makes it safe: a stale pre-baked file just never matches.

### How to store it

Per vertex. Recommended. One byte (or a half float) per vertex in an `aoVertex` attribute, multiplied into the material's ambient and indirect light by a small `onBeforeCompile` patch shared by the room materials (the patch multiplies `material.aoMapIntensity`-style into `reflectedLight.indirectDiffuse` and `indirectSpecular`, as three's own `aomap_fragment` does, so direct light is untouched, which is physically right and keeps the lamps' highlights). It needs no UVs and survives `mergeStatic` (the attribute is merged with the rest). The cost is subdivision: big flat walls, floors and ceilings must be split to about 0.25 m near edges and corners to show the corner darkening, and can stay coarse in the middle. An adaptive split (subdivide only triangles within 1 m of other geometry, or a fixed 0.25 m border strip along each wall's edges) keeps a 12 × 8 × 4 m room to roughly 10–20 thousand extra vertices. Equipment meshes (pumps, tanks, pipes) are already dense enough. Memory: about 4 bytes a vertex in an IndexedDB record and on the GPU; a room of 200 thousand vertices is under 1 MB.

Lightmaps with UV2. Not recommended now. xatlas (via `xatlas-three` in a worker) gives good unique UVs for anything, but it is slow on hundreds of thousands of triangles (seconds to tens of seconds), changes vertex counts (it splits at seams), and would have to run on every merged mesh at every load on a cache miss. Box or planar projection would work for the shells alone (each wall a rectangle in an atlas, trivial to compute in the builders), which gives sharper corners than vertex AO at 5–10 cm texels (about 45 thousand texels for the 12 × 8 × 4 m room, a 256² texture). Worth considering only if vertex AO on the shells looks blotchy; it could then be a shell-only lightmap with equipment staying per vertex.

### What to leave out of the bake

- Moving and clickable parts (doors, valve handwheels, the lift car, float switches, people, water surfaces): exclude them as occluders and as receivers, which `mergeStatic`'s `keep` set and `targets` already identify. A door's leaf therefore leaves no baked shadow in its frame; High's reduced GTAO covers it.
- Water surfaces and light shafts are not occluders (as `pool-room.ts` already hides them from GTAO).
- Instanced meshes (gratings) are occluders (one BVH over their instances, or an approximating box) but not receivers, or receive at the instance's origin only.
- Lights: AO here is ambient occlusion only, independent of which lamps are on, so switching hall lights or emergency lighting does not invalidate the bake; it scales indirect light, which is what dims when lights are off. Only a baked direct lightmap would need re-baking per lighting state, and that is not proposed.

### How it combines with materials and post effects

Multiply into indirect diffuse and specular only (as above). Tone mapping, bloom, film and the pool refraction pass are unaffected. Where High keeps GTAO, set its radius small (about 0.3 m) so it adds contact shadows and does not double the baked room-scale darkening; or, simpler, keep its present settings at a lower intensity (`blendIntensity` about 0.5) and accept a little doubling. Canvas-textured displays (LCDs, mimics) should be excluded from receiving AO so readouts are not darkened.

## 2. Pre-computed reflections

### Per-room capture at load

In each room, after it is built and before the first visible frame (or a few frames in, as `attachRoomReflection` does), render a `CubeCamera` capture of the static room (water, people, moving parts hidden) at 128–256 px, half float, and feed it to `PMREMGenerator.fromCubemap` to get the prefiltered roughness mips that `MeshStandardMaterial` needs. Set it as `scene.environment` in place of `RoomEnvironment` (keeping `environmentIntensity` as tuned). Cost: six scene renders plus PMREM's blur chain, about 10–40 ms once on this machine depending on the room's draw calls; spread across frames (one face a frame) if a hitch shows. Memory: a 256 px half-float PMREM is about 3 MB of GPU memory per probe.

### Box projection

Rectangular rooms (all plant rooms, dev rooms, corridors, the halls) suit box projection: correct the reflection vector against the room's axis-aligned box before the cube lookup, so a tiled floor reflects the far wall where it is, not where it would be from the probe. three.js removed its old box-projected example in r132; current options are a community GLSL chunk patch (Martin Schütz's write-up, gists updated for r137) and the WebGPU renderer's TSL `getParallaxCorrectNormal` (r184), which this WebGLRenderer game cannot use directly. For PBR materials the patch must apply inside `envmap_physical_pars_fragment` (the `getIBLRadiance` path that samples PMREM's CubeUV format), which is a few lines in `onBeforeCompile`; the water shader samples its own `samplerCube room` and is easier still: correct `reflect(-v, n)` against the pool hall's box in `pool-surfaces.ts` before `textureCube`. Pass the box (min, max) and the probe position as uniforms.

### Where to put capture points

One per room at the room's centre, at about 1.6 m (eye height), for walls and equipment. Pool halls: a second, water-only probe at the water's centre about 1–1.5 m above the surface (as now), box-projected against the hall. Long rooms (corridors, the main corridor, the museum's long halls): one probe per 10–15 m segment, each with its own box, materials taking the nearest (by mesh centre) at build time; no blending. Tanks and balance tanks: the tank room's probe serves; a tank's interior water, if visible, takes a probe inside the tank volume.

### When to re-capture

On any change that alters what is seen: room light state (hall lights, emergency lighting, the light switches in `architectural-room.ts`), and a door opening onto a bright neighbour only if it is obvious. Drive it from the world state's light-change events, as `pool-room.ts` already does; debounce (half a second), spread the six faces over six frames, and swap atomically. Do not re-capture for moving parts. Captures need not be cached between sessions: they are cheap and depend on the lights.

### The water keeps its ripples and caustics

The ripples perturb the normal in the water shader (`pool-ripples.ts`) and that normal drives the reflection lookup, so the static capture still shimmers. Caustics are analytic projections on the pool floor and walls in their own shaders, not part of the reflection, and should be hidden from the capture (as `pool-room.ts` does, so the room is not tinted green). Refraction stays the screen-space warp. In the dev water room the vendored simulation's per-frame object and reflection textures could be replaced by the room probe if that simulation is ever used in the game.

### Which rooms and materials benefit

Most: the pool halls and the Olympic and lounge halls (water, glazed tiles, stainless rails and ladders), the balance tank and tank rooms, the dev water rooms, plant rooms with stainless pipework, filters and tanks, and the bridge (glossy consoles). Little: corridors and dry rooms with matte paint (keep the cheap studio or the room capture at 64 px). Expected savings: per-frame cost stays near zero (one extra texture fetch and a few ALU ops for box projection); the gain is visual. Where the vendored water simulation or any per-frame `CubeCamera` would be used, a static probe removes six scene renders a frame.

## Graphics presets

| Technique                      | Low                                    | Medium                | High                                              |
| ------------------------------ | -------------------------------------- | --------------------- | ------------------------------------------------- |
| Baked vertex AO                | on (32 rays)                           | on (32 rays)          | on (64 rays, finer border split)                  |
| Live GTAO                      | off                                    | off                   | on, half resolution, 4–6 samples, small radius    |
| Room probe (PMREM environment) | 64 px, one per room, no box projection | 128 px, box-projected | 256 px, box-projected, extra probes in long rooms |
| Water reflection probe         | 64 px                                  | 128 px                | 256 px                                            |
| Re-capture on light change     | yes, over 6 frames                     | yes                   | yes                                               |

A bake's quality setting is part of the cache key, so changing preset may trigger a bake; to avoid that, bake one quality (64 rays) for everyone and vary only GTAO and probe sizes by preset.

## Measurements

Prototype: `bake.mjs` in the session scratchpad (Node 26, three 0.180, three-mesh-bvh 0.9, one core of an Apple M5). Scene: a 12 × 8 × 4 m dev-room-like shell, walls subdivided uniformly to the given size, with 30 boxes (equipment), 12 overhead pipes and 8 cylindrical tanks; per-vertex cosine-weighted hemisphere rays to 1.5 m, `raycastFirst` against one BVH, non-indexed geometry (so vertex counts are about three times an indexed mesh's).

| Wall subdivision | Rays per vertex | Triangles | Vertices | BVH build | Bake   |
| ---------------- | --------------- | --------- | -------- | --------- | ------ |
| 0.5 m            | 16              | 7,584     | 22,752   | 6 ms      | 0.64 s |
| 0.25 m           | 32              | 16,032    | 48,096   | 7 ms      | 2.4 s  |
| 0.25 m           | 64              | 16,032    | 48,096   | 7 ms      | 4.8 s  |
| 0.1 m            | 32              | 75,168    | 225,504  | 16 ms     | 9.7 s  |

Throughput was steady at 0.6–0.75 million rays a second on one core. Indexed geometry and an adaptive border split instead of a uniform one would cut the vertex count by about four, so a real room at 0.25 m borders and 32 rays should bake in about 0.5–1 s on one core here, perhaps 1.5–3 s on a Steam Deck core, less on two workers. A large pool hall (say 50 × 25 m with 300 thousand vertices of equipment and tiles) would be 10–15 s on one core: acceptable in the background with GTAO meanwhile, and cached thereafter. The stored result is one byte a vertex (under 1 MB a room). Not measured: the real rooms (their builders need the DOM, so a real-room bake needs a browser harness, stage 1 below), and frame-time gains, which the bridge report already bounds (GTAO off: about 47 to 60 fps there).

## Risks

- Vertex AO on coarse shells looks wrong or blotchy until shells are subdivided at their borders; subdividing touches many builders (mitigate: one helper applied centrally to merged shells, not per builder).
- Cache-key drift: any non-determinism in a builder (random placement without a seed) makes every load a miss. Seeded randomness is needed; the hash will reveal misses in a dev counter.
- IndexedDB may be cleared or blocked (private windows); the fallback is GTAO, so this only costs performance.
- Merged meshes spanning moving parts: if a moving part is merged by mistake, its baked shadow stays when it moves. `mergeStatic`'s `keep` lists are the guard.
- Box projection is wrong for non-rectangular rooms (the rotunda, arched rooms, the donut pool); use plain (infinite-distance) lookups there.
- The PMREM shader patch depends on three's internal chunk names, which change between versions; pin and test on upgrade.
- Re-capture hitches when lights switch (six scene renders); spread over frames.
- Combined GTAO plus bake on High may over-darken; needs a visual check.

## Staged plan

1. A bake harness in a dev room (dev14-style): a `logic/` pure module for the hemisphere sampling and hashing (tested in Node), a worker running three-mesh-bvh, applied to one plant-room shell and one museum hall, with a toggle to compare against GTAO. Measure bake time in Chrome and on the Steam Deck. About 2 days.
2. The shared AO material patch and the border-subdivision helper in `merge-static.ts`'s path; exclusion of moving, clickable, instanced and display meshes. About 2 days.
3. Cache in IndexedDB and the Electron file store, keyed by hash; fade-in on bake completion; dev counter for misses. About 1–2 days.
4. Presets: GTAO off on Low and Medium where a bake exists, reduced on High; frame-time comparison on the bridge and one pool hall. About 1 day.
5. Room probes: generalise `pool-room.ts`'s capture into a `room-probe` view (capture, PMREM, re-capture on light change over six frames), replacing `useEnvironment`'s studio in rooms with shiny surfaces. About 2 days.
6. Box projection: the PMREM chunk patch and the water shader's corrected lookup, with per-room boxes from `facility-plan.ts`. About 2 days.
7. Optional: release pre-warm of the AO cache via headless Chrome. About 1–2 days.

Total about 11–13 days, with stages 1–4 (AO) and 5–6 (reflections) independent.

## Questions for the owner

1. Is it acceptable for a room to show live GTAO for the first one to fifteen seconds of a player's first visit while its occlusion bakes, before it settles into the baked look?
2. Should High keep a reduced live GTAO on top of the bake for contact shadows of doors and small parts, or should every preset drop GTAO once a room is baked?
3. Should rooms' shiny surfaces reflect the room itself (a captured probe) in place of the present neutral studio, accepting that dark rooms then reflect less?

## Sources

- three-mesh-bvh (BVH ray casting, CPU and GPU): https://github.com/gkjohnson/three-mesh-bvh
- xatlas.js and xatlas-three (UV unwrapping for lightmaps): https://github.com/palashbansal96/xatlas
- Three Lightmap Baker (xatlas UV2 plus three-mesh-bvh baking): https://github.com/gonnavis/three-lightmap-baker
- AO Lightmapper (browser AO bake with xatlas and WebGL2 BVH): https://github.com/crazyramirez/AO-Lightmapper
- @react-three/lightmap (in-browser lightmap and AO baker): https://github.com/pmndrs/react-three-lightmap
- Box-projected env map shader patch for three.js r137: https://gist.github.com/0beqz/8d51b4ae16d68021a09fb504af708fca
- three.js forum, parallax correction and the r132 removal: https://discourse.threejs.org/t/parallax-correction-from-environment-maps/32692
- three.js r184 TSL `getParallaxCorrectNormal`: https://app.unpkg.com/three@0.184.0/files/src/nodes/functions/material/getParallaxCorrectNormal.js
- This repository: [bridge render performance](bridge-render-performance-2026-10-28.md), [graphics quality presets](../research/graphics-quality-presets.md).
