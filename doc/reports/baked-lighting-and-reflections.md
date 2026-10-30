# Baked ambient occlusion and pre-computed reflections

Research and recommendation, 2026-10-30, revised the same day after the owner's decisions and a request to evaluate xatlas lightmaps in depth. No game code was changed. The prototypes ran in the session scratchpad on a real pool hall and a synthetic plant room (see Measurements).

## Contents

- Summary
- The owner's decisions (2026-10-30)
- What the game does now
- 1. Pre-computed ambient occlusion
- 1a. Lightmaps with xatlas: a full evaluation
- 1b. The cache
- 1c. Baking ahead
- 2. Pre-computed reflections
- Graphics presets
- Measurements
- Risks
- Staged plan
- Questions for the owner
- Sources

## Summary

Bake ambient occlusion in the player's browser, in one low-priority Web Worker, with three-mesh-bvh on the CPU; cache every bake persistently (IndexedDB on the web, files on the desktop build) under a hash of the room's static geometry, so a room, above all a corridor visited again and again, is baked once; and bake ahead the rooms the walker is likely to enter next, so that most rooms are baked before they are seen. A room whose bake is not ready shows no ambient occlusion (the owner's decision) and the baked AO fades in when it lands. Committed bakes and CI bakes are not recommended: the rooms are generated in code and change often.

On storage, the prototype on a real pool hall (Lounge pool, 134 thousand triangles in 488 meshes) changes the earlier recommendation in detail but not in direction. A whole-room xatlas unwrap took 14.5 s single-threaded, had to skip a mesh of 88 thousand vertices (xatlas.js uses 16-bit indices), and left 88 % of the hall's triangles too small to own a single texel at 10 cm; a lightmap only pays where per-vertex fails, on big flat surfaces. Build first: per-vertex AO for equipment, fittings and tiles (dense already), plus simple planar-projected lightmaps for the large flat shell surfaces (walls, floors, ceilings, pool tanks), whose UVs the builders can compute exactly with no unwrapper. xatlas stays a tool for the odd curved or irregular shell (the rotunda, arched rooms), unwrapped once per shape and cached with the bake.

Reflections: extend the pool room's existing capture-on-light-change to every room with water or shiny surfaces, PMREM-filtered and box-projected in rectangular rooms, in place of the neutral studio environment. The water keeps its ripples and caustics; per-frame cost stays near zero.

## The owner's decisions (2026-10-30)

1. No live ambient occlusion while a bake is pending: live AO (GTAO) is too slow. A room shows no AO until its bake finishes in the background, then the baked AO fades in (about half a second).
2. Bakes are cached persistently (IndexedDB on the web, files on the desktop), keyed by the geometry hash; returning to a room never re-bakes unless its geometry changed.
3. A background worker bakes ahead the rooms the walker is likely to enter next: in the museum the adjacent halls; elsewhere the rooms beyond the current room's doorways; during a freight-lift ride, the destination floor.
4. Performance comes first: the default for most rooms (pool halls, plant rooms, the museum, corridors) is no AO until the bake is ready, then the baked AO fades in and stays static. No live GTAO in any preset by default, including for moving parts. A room that truly needs an exception is listed for the owner to approve.
5. The museum's lighting is effectively flat (the owner, 2026-10-30): the white halls are lit by their ambient (the ambient, hemisphere and daylight lights in `museum-hall-room.ts`), and their few small lamps (the four gallery point lights, the exhibits' pilot lights) are insignificant beside it and are treated as if they did not count; a white hall's bake is of that flat light alone. The black boxes (Hall 7, Hall 8; `BLACK_BOX_HALLS`) have next to no ambient and are lit by a couple of spotlights, which are the light that matters there.

## What the game does now

Ambient occlusion: `GTAOPass` (three.js addon) in 13 room builders (for example `src/toolkit/gallery/rooms/pool-room.ts` 1028, `shell-room.ts`, `museum-hall-room.ts`), samples from `ambientOcclusionAt` in `src/toolkit/settings/logic/graphics.ts` (12 a pixel in most rooms, 6 on the bridge, 3 in the museum), applied through `src/toolkit/components/core/parts/render-style.ts` around line 190. GTAO renders the scene again into a normal buffer, so it roughly doubles draw calls: on the bridge 815 against 398 for one scene render, and dropping from 12 to 6 samples moved it from about 47 to 58 fps at 2560 × 1426 on an Apple M5 ([bridge report](bridge-render-performance-2026-10-28.md)); with GTAO off, 60 fps. It is the single largest measured cost.

Reflections and environment:

- `useEnvironment` (`render-style.ts` ~456) gives 24 rooms a PMREM of three.js's `RoomEnvironment` studio as `scene.environment`: cheap, but steel and tiles reflect a studio, not the room.
- The pool rooms (`pool-room.ts` ~843) already capture the room into a 256 px `CubeCamera` for the water shader's `room` sampler (`src/toolkit/components/pool/views/pool-surfaces.ts` ~445 and 554) and two PMREM passes of the lit room as `scene.environment`, again only when the light changes. The lookup is not box-projected.
- `attachRoomReflection` (`src/toolkit/components/core/views/room-reflection.ts`): one 40 px capture a few frames after build, for sight glasses.
- Under water, `src/toolkit/components/pool/views/pool-refraction.ts` warps the drawn image; caustics and ripples are analytic in the pool shaders (`pool-ripples.ts`).
- The vendored `src/toolkit/vendor/threejs-water/` (dev `water-room.ts` only) renders its textures every frame; it is not in the game's rooms.

Geometry: rooms are built in code; static set pieces are merged by material within 3 m cells (`src/toolkit/components/core/views/merge-static.ts`), moving and clickable parts kept apart; instanced meshes in about 8 files. The real Lounge pool hall (`createPoolHall`, `src/toolkit/gallery/views/pool-hall.ts`) builds 488 meshes, 134,195 triangles and 155 thousand unique vertices, its largest single mesh 88 thousand vertices; 485 of its meshes carry tile UVs (repeating, overlapping), none a unique layout a lightmap could use.

## 1. Pre-computed ambient occlusion

### When to bake

(a) In the player's browser, cached, and ahead of need. Recommended. The geometry exists only after a builder runs, so baking there needs no new pipeline and is never stale. A bake runs in one worker; the room shows no AO until it lands, then fades it in (the owner's decision). With the cache (1b) and baking ahead (1c), most rooms are baked before the walker reaches them, so the no-AO interval is seen mainly on a first visit to a room reached faster than its bake.

(b) A developer task committing baked assets. Not recommended: rooms change often, a committed bake goes stale on every geometry change, and the repository would carry binary churn.

(c) A CI build step. Possible (three-mesh-bvh runs in Node; the prototype below ran the real pool hall builder in Node with a stubbed canvas), but unnecessary given (a), and brittle as builders change.

Hybrid, later: a release-only `bake:prewarm` that walks every room and writes cache files into the desktop build, so even a first visit hits. The hash makes it safe: a stale file just never matches.

### How to store it

Per vertex, for everything dense: one byte a vertex in an `aoVertex` attribute, multiplied into indirect diffuse and specular light by a shared `onBeforeCompile` patch (as three's `aomap_fragment` does), so direct light and highlights are untouched. It needs no UVs, survives `mergeStatic`, and costs under 1 MB a room. Its weakness is big flat surfaces with few vertices, which would need subdivision.

Planar lightmaps, for the big flat surfaces: see 1a. The combination avoids subdividing shells and avoids unwrapping equipment.

### What to leave out of the bake

- Moving and clickable parts (doors, valve handwheels, the lift car, float switches, water surfaces): neither occluders nor receivers; `mergeStatic`'s `keep` set and `targets` identify them.
- Water surfaces and light shafts are not occluders.
- Instanced meshes (gratings) are occluders but not receivers.
- Canvas-textured displays (LCDs, mimics) are not receivers, so readouts are not darkened.
- Lights: this is ambient occlusion only, independent of which lamps are on, so switching hall lights or emergency lighting never invalidates a bake.

### No live GTAO (the owner, 2026-10-30)

Settled by the owner: no live GTAO in any preset by default, moving parts included; performance comes first. Moving parts carry AO baked into the part itself in its rest pose (its own crevices, which do not change as it moves); the few large movers (doors, the lift car) may take a cheap contact-shadow decal if anything looks floating. Candidate exceptions, for the owner to approve or refuse, none recommended: the bridge, if its glossy consoles read flat without contact shadows (but it is the room where GTAO cost most, 47 against 60 fps); and the freight-lift car, whose interior moves with the walker and cannot share a room bake (bake the car as its own static object instead, which makes the exception unnecessary). Rooms still unbaked, those in development or with irregular shells before xatlas support, simply show no AO.

### How it combines with materials and post effects

Multiply into indirect light only. Tone mapping, bloom, film and the pool refraction pass are unaffected. With GTAO gone there is no double-darkening to tune.

## 1a. Lightmaps with xatlas: a full evaluation

The owner prefers the lightmap route: automatic UV2 unwrapping with xatlas (xatlas.js, WebAssembly, in the browser), then baked AO lightmaps. It was prototyped on the real Lounge pool hall (built in Node by `createPoolHall` with a stubbed canvas, world-space geometry exported, then unwrapped with xatlasjs 0.2.0 and baked with three-mesh-bvh 0.9) and on a synthetic 12 × 8 × 4 m plant room.

### Unwrap time per room

| Room                               | Triangles | Meshes            | Unwrap (one thread) |
| ---------------------------------- | --------- | ----------------- | ------------------- |
| Synthetic plant room               | 19,060    | 91 (or 1 merged)  | 0.20 s              |
| Synthetic plant room, 200 fittings | 80,500    | 1 merged          | 0.85 s              |
| Lounge pool hall (real)            | 134,195   | 487 (one skipped) | 14.5 s              |

Unwrap time is not linear in triangles: the real hall's many curved fittings, coves and tiles make many small charts, and chart packing dominates. Merging or not made no difference to the synthetic room. 14.5 s on an M5 core is perhaps 30–45 s on a Steam Deck core, before any ray is cast; it can be cached with the bake, but it doubles or triples a first visit's wait, and the cache key must then cover the unwrap.

### Atlas size and texel density

At 10 texels a metre (10 cm texels) the synthetic room packed into 440 × 441 (87,551 texels used, 45 % fill) and the real hall into 949 × 950 (490 thousand texels, 54 %); at 20 texels a metre the synthetic room needed 760 × 754. One-byte (R8) atlases cost 0.2–0.9 MB of GPU memory a room, fine. But 10 cm texels are coarse for corners of a coved hall and for fittings, and 5 cm texels quadruple texels, bake time and memory.

### Seams and bleeding

With 2 texels of padding, 26–71 thousand empty texels border filled ones and must be dilated (filled from their neighbours) after the bake, or bilinear filtering pulls black into the seams; every chart edge is a potential visible seam where AO differs across it. xatlas's charting also splits vertices along seams: the synthetic room grew from 11,010 to 14,048 vertices. That is manageable work (a dilation pass is a few lines) but it is extra work vertex AO does not need.

### How it handles our merged procedural meshes

Badly in two respects. First, xatlas.js passes indices as 16-bit (`HEAPU16`), so any mesh over 65,535 vertices must be split before unwrapping; the real hall's largest merged mesh (88 thousand vertices) was skipped. Second, and more serious, small triangles: at 10 cm texels, 79,247 of the hall's 90,215 unwrapped triangles (88 %) contain no texel centre at all; at 5 cm, 92 %. Tiles, gutters, grating bars, ladders and fittings are smaller than a texel, so they read the AO of whatever texel they fall on, which may belong to a neighbouring chart; conservative rasterisation helps only a little, because the texel is still shared. Those same triangles already have vertices close together, which is exactly where per-vertex AO is accurate. Merged meshes also mix big flat pieces and tiny ones in one chart set, so the packer cannot give each its own density.

### Comparison with per-vertex AO

|                                     | Per-vertex                      | xatlas lightmap                                     |
| ----------------------------------- | ------------------------------- | --------------------------------------------------- |
| Preparation                         | none                            | unwrap: 0.2 s synthetic, 14.5 s real hall           |
| Bake, real hall, 32 rays            | 26 s (155 thousand vertices)    | 22.6 s at 10 cm (490 thousand texels); 6 s at 20 cm |
| Big flat walls and floors           | blotchy unless subdivided       | good                                                |
| Small dense parts (tiles, fittings) | good                            | poor: 88 % of triangles own no texel                |
| Seams and bleeding                  | none                            | padding plus dilation                               |
| Storage                             | 1 byte a vertex                 | R8 atlas plus a UV2 attribute (8 bytes a vertex)    |
| Fits `mergeStatic`                  | yes                             | needs split under 65,535 vertices, and UV2 merged   |
| Moving parts                        | per-part, carried with the part | need their own atlas or none                        |

Neither alone fits the game. The two are complementary: lightmaps where surfaces are large and flat, vertices where they are small and dense.

### Recommended hybrid: planar shell lightmaps plus per-vertex AO

The shells are rectangles built by known code (walls, floors, ceilings, pool tanks, corridor kit). Each builder (or one helper they share) can give each large flat face exact UV2 by planar projection into a simple shelf-packed atlas at 5 cm texels, no unwrapper, no seams within a face, padding 2 texels and a dilation pass. A 28 × 20 × 7 m hall's shell is about 1,500 m², 600 thousand texels at 5 cm (an 800 × 800 R8 texture, 0.6 MB). Everything else gets per-vertex AO. The bake casts rays for shell texels and for equipment vertices into one BVH. Coves (quarter-round fillets) get cylindrical projection along their length, also exact. xatlas is kept for irregular shells (the rotunda, arched rooms, the donut pool), unwrapped once per shape hash and cached.

### AO rays: three-mesh-bvh on the CPU, or the GPU

CPU in a worker (three-mesh-bvh `raycastFirst`): measured 0.6–0.75 million rays a second on one M5 core; predictable, does not touch the GPU, runs while the game draws. three-mesh-bvh also offers a GPU path (the BVH packed into textures and traced in a fragment shader, as in its examples and three-gpu-pathtracer), typically one or two orders of magnitude faster, so a hall would bake in well under a second. But on the Steam Deck the GPU is the bottleneck while the game runs, and GPU work cannot be pre-empted per frame except by slicing it into tiny chunks; baking ahead in the background is exactly when the GPU is busy drawing. Recommend the CPU worker in the game; the GPU path for the release pre-warm tool and for a "bake now" on loading screens (the lift ride, where the GPU is idle behind a closed car) if CPU bakes prove too slow.

### Recommendation: what to build first

Per-vertex AO first, on equipment and everything dense, since it is the simplest, has no seams, and its machinery (worker, BVH, hash, cache, bake-ahead queue, fade-in) is shared by everything after. Then planar shell lightmaps, which fix the flat surfaces per-vertex cannot. xatlas only if irregular shells look poor. This order gives a visible result soonest and never builds the part (whole-room automatic unwrapping) the prototype shows to fit the game worst.

## 1b. The cache

- Key: a hash (FNV-1a or xxhash-wasm, a few milliseconds) of the room's baked inputs: the static meshes' quantised positions, indices and normals, the shell faces' UV2 layout, the bake settings (rays, distance, texel size) and a bake version number bumped whenever the baker changes.
- Value: the per-vertex AO arrays (one byte a vertex, per mesh, in the order the builder makes them) and the shell atlas (R8, compressed with deflate via `CompressionStream`), plus the room id, size and a last-used time. A typical room is 0.2–1.5 MB.
- Where: IndexedDB on the web (one object store, keyed by hash, with an index on room id and last used); on the desktop build, files under Electron's `app.getPath('userData')/ao-cache/`, with a small JSON index.
- Size limit: 200 MB by default (enough for about 200–400 rooms). On the web check `navigator.storage.estimate()` and keep under a tenth of the quota; ask for `navigator.storage.persist()` so the browser does not evict it under pressure.
- Eviction: least recently used, by room, when over the limit, never evicting rooms marked as hubs (the main corridor, the corridors of the pool loop, the plant corridor, the lift lobbies, the control rooms), which are pinned. When a room's geometry changes, its old entries (same room id, other hash) are deleted at once.
- When storage is unavailable (private windows, blocked site data, quota exceeded, IndexedDB throwing): every access in try/catch; bakes are kept in memory for the session (an LRU of perhaps 30 rooms), so revisits in that session still do not re-bake; the game works as before, only rebaking after a reload.

## 1c. Baking ahead

A background baker with one worker and a priority queue bakes the rooms the walker is likely to enter next.

### Which rooms

- The museum: the halls adjacent to the current one (the museum already builds both neighbours' full copies while a hall is shown, `museum-hall-room.ts` ~105–153, so their geometry exists).
- Elsewhere: the rooms beyond the current room's doorways, from `facility-plan.ts`, nearest door first; in the pool loop, the next room along.
- A freight-lift ride: the destination floor's room, which `prepareRoom` (`src/toolkit/gallery/logic/room-readiness.ts`, mission 108) already builds and warms unseen; the bake joins that preparation, and the lift's travel time is the best moment to bake, with the GPU path if it is used at all.

### Building their static geometry without showing them

Bake from the pure layout, not from a shown scene: the same builder run off screen, its group never added to the scene and never drawn, with only its static meshes' geometry extracted (world-space positions, normals, indices, and shell face rectangles) and transferred to the worker as transferable `ArrayBuffer`s. The museum's neighbour copies and the lift's warmed rooms provide this for free. For doorway neighbours, building a room synchronously can pause a frame (the TODO's "Incremental room preparation" records that speculative construction caused pauses); so build ahead only during calm moments, one room at a time, and, as that TODO proposes, split builders into bounded jobs or move their pure layout work into the worker. When the walker does enter the room, its real build reuses the same meshes in the same order, so the hash matches and the cached bake applies at once.

### Prioritise and cancel

Priority: the current room first (if unbaked), then the room the walker is facing or walking towards (the doorway nearest their heading), then the other neighbours, then second-order rooms. The baker works in slices of about 2,000 rays and checks the queue between slices, so a re-prioritised job starts within milliseconds. When the walker turns back, the half-done job is cancelled only if it is no longer in the top few; otherwise it is paused, its partial results kept in memory, and resumed. Rooms already cached are skipped by hash before any work.

### Keeping the worker off the frame on the Steam Deck

- One worker only (the Deck has four cores and eight threads; the main thread, audio and the browser need the rest).
- A low-priority queue: the worker runs slices only when the main thread reports the last frames within budget; the main thread posts a frame-time summary twice a second.
- Paused during heavy moments: room hand-overs, the first seconds in a new room (shader compiles and uploads), lift arrivals, saving, and whenever frame time exceeds budget; resumed after a calm second.
- Slices sized to about 5 ms of work, so a pause takes effect within a frame.
- The Deck's power: bake ahead is cheap enough (a few seconds of one core per room) to leave on; a setting can turn baking ahead off on battery.

## 2. Pre-computed reflections

### Per-room capture at load

After a room is built and before its first visible frame (or a few frames in, as `attachRoomReflection` does), render a `CubeCamera` capture of the static room (water, people and moving parts hidden) at 128–256 px, half float, through `PMREMGenerator.fromCubemap`, and set it as `scene.environment` in place of `RoomEnvironment`. About 10–40 ms once; spread one face a frame if it hitches. A 256 px half-float PMREM is about 3 MB of GPU memory.

### Box projection

Rectangular rooms suit box projection: correct the reflection vector against the room's box before the lookup. three.js removed its box-projected example in r132; options are a community GLSL chunk patch (Martin Schütz's method, gists updated for r137) and the WebGPU renderer's TSL `getParallaxCorrectNormal` (r184), which this WebGLRenderer game cannot use directly. For PBR materials the patch goes in `envmap_physical_pars_fragment` via `onBeforeCompile`; the water shader's own `samplerCube room` lookup in `pool-surfaces.ts` is easier still.

### Where to put capture points

One per room at the centre at about 1.6 m. Pool halls: a second, water-only probe 1–1.5 m above the water's centre, as now, box-projected against the hall. Long rooms (corridors, the museum's halls): one probe per 10–15 m, each with its own box, nearest by mesh centre at build time. Tank rooms: the room's probe; a tank interior, if visible, its own.

### When to re-capture

On light-state changes (hall lights, emergency lighting, light switches in `architectural-room.ts`), as `pool-room.ts` already does: debounce half a second, spread six faces over six frames, swap atomically. Not for moving parts. Not cached between sessions: cheap and light-dependent.

### The water keeps its ripples and caustics

Ripples perturb the water's normal in its shader, and that normal drives the lookup, so a static capture still shimmers. Caustics are analytic in their own shaders and hidden from the capture (as `pool-room.ts` does). Refraction stays the screen-space warp.

### Which rooms and materials benefit

Most: the pool halls (water, glazed tiles, stainless rails and ladders), balance-tank and tank rooms, plant rooms with stainless pipework and tanks, the bridge. Little: matte corridors and dry rooms (64 px or the studio). Per-frame cost stays near zero; the gain is visual, plus six scene renders a frame saved wherever a per-frame cube camera would otherwise be used.

## Graphics presets

| Technique                                 | Low                           | Medium                | High                                              |
| ----------------------------------------- | ----------------------------- | --------------------- | ------------------------------------------------- |
| Baked AO (per vertex and shell lightmaps) | on                            | on                    | on                                                |
| Live GTAO                                 | off                           | off                   | off (the owner, 2026-10-30)                       |
| Room probe (PMREM environment)            | 64 px, no box projection      | 128 px, box-projected | 256 px, box-projected, extra probes in long rooms |
| Water reflection probe                    | 64 px                         | 128 px                | 256 px                                            |
| Bake ahead                                | on (off on battery if chosen) | on                    | on                                                |

Bake settings are the same on every preset (32 rays, 5 cm shell texels), so changing preset never triggers a re-bake.

## Measurements

All on one core of an Apple M5, Node 26, three 0.180, three-mesh-bvh 0.9, xatlasjs 0.2.0; cosine-weighted hemisphere rays to 1.5 m. Scripts `bake.mjs`, `lm.mjs`, `real.ts` and `lmreal.mjs` in the session scratchpad. Rays ran at 0.6–0.75 million a second throughout.

Per-vertex, synthetic 12 × 8 × 4 m room, walls subdivided uniformly (non-indexed, so vertex counts about three times an indexed mesh's):

| Subdivision | Rays | Vertices | Bake   |
| ----------- | ---- | -------- | ------ |
| 0.5 m       | 16   | 22,752   | 0.64 s |
| 0.25 m      | 32   | 48,096   | 2.4 s  |
| 0.25 m      | 64   | 48,096   | 4.8 s  |
| 0.1 m       | 32   | 225,504  | 9.7 s  |

Lightmap, synthetic room (xatlas, padding 2):

| Texels a metre | Rays | Triangles | Unwrap | Atlas     | Texels used    | Bake   |
| -------------- | ---- | --------- | ------ | --------- | -------------- | ------ |
| 10             | 32   | 19,060    | 0.20 s | 440 × 441 | 87,551 (45 %)  | 4.4 s  |
| 10             | 64   | 19,060    | 0.21 s | 440 × 441 | 87,551         | 8.4 s  |
| 20             | 32   | 19,060    | 0.22 s | 760 × 754 | 333,152 (58 %) | 15.6 s |
| 20             | 32   | 80,500    | 0.85 s | 793 × 794 | 340,435 (54 %) | 17.3 s |

The real Lounge pool hall (`createPoolHall(POOL_HALLS.pool_01, 1)`, built in Node in 138 ms; 488 meshes, 134,195 triangles, 155,409 unique vertices, BVH built in 39 ms):

| Method                      | Preparation   | Bake (32 rays) | Notes                                                                                                                |
| --------------------------- | ------------- | -------------- | -------------------------------------------------------------------------------------------------------------------- |
| Per vertex                  | none          | 26.2 s         | every vertex, no subdivision                                                                                         |
| xatlas at 5 texels a metre  | 14.6 s unwrap | 6.1 s          | 627 × 627; 92 % of triangles own no texel                                                                            |
| xatlas at 10 texels a metre | 14.5 s unwrap | 22.6 s         | 949 × 950, 490 thousand texels; 88 % own no texel; 71 thousand texels to dilate; one 88-thousand-vertex mesh skipped |

Estimates: the Steam Deck's Zen 2 core is perhaps two to three times slower, so the real hall's per-vertex bake is about one minute, and a typical dev or plant room 2–10 s. Halving rays to 16 halves this with little visible noise once filtered; skipping vertices of tiles that lie flat on a shell face (they take the shell lightmap instead) should cut the hall's vertex count substantially. With baking ahead, these are background seconds, not waits. Not measured: frame-time gains (the bridge report bounds them: GTAO off took the bridge from about 47 to 60 fps), and the Deck itself.

## Risks

- Large dense rooms bake slowly on the Deck (about a minute for the pool hall at 32 rays); mitigated by baking ahead, 16 rays, and the shell lightmap taking over flat tiles. The no-AO interval on a first visit may be noticed in the biggest halls.
- Cache-key drift: unseeded randomness in a builder makes every load a miss; seeded randomness is needed, and a dev counter should report misses.
- Building rooms ahead can pause frames (already recorded in the TODO's incremental preparation item); bake ahead from the museum's and lift's existing off-screen builds first.
- Storage may be unavailable or evicted; the in-memory fallback keeps a session working.
- A moving part merged by mistake keeps its baked shadow when it moves; `mergeStatic`'s `keep` lists are the guard.
- xatlas.js's 16-bit indices and slow packing on many small charts, if it is used for irregular shells.
- Box projection is wrong in non-rectangular rooms; use plain lookups there.
- The PMREM shader patch depends on three's chunk names; pin and test on upgrade.

## Staged plan

1. Bake harness in a dev room: a pure `logic/` module for hemisphere sampling and hashing (tested), a worker running three-mesh-bvh, per-vertex AO applied to one plant room and one museum hall through a shared material patch, with the fade-in and no AO while pending. Measure in Chrome and on the Steam Deck. About 3 days.
2. Exclusions (moving, clickable, instanced, displays) and wiring through `mergeStatic`; remove GTAO from every preset and room (the owner, 2026-10-30). About 2 days.
3. The persistent cache: IndexedDB and desktop files, size limit, LRU eviction with pinned hubs, in-memory fallback, dev miss counter. About 2–3 days.
4. Baking ahead: the priority queue and sliced worker, frame-budget throttling and pauses; sources in order of ease: the lift's `prepareRoom`, the museum's neighbour halls, then doorway neighbours (which depend on the incremental room preparation work). About 3–4 days, plus the doorway part's share of incremental preparation.
5. Planar shell lightmaps: UV2 and atlas packing for walls, floors, ceilings, pool tanks and coves in the shell builders; shell texels in the same bake; dilation. About 3–4 days.
6. Room probes: generalise `pool-room.ts`'s capture into a `room-probe` view, replacing the studio in rooms with shiny surfaces. About 2 days.
7. Box projection in the PMREM patch and the water shader. About 2 days.
8. Optional: xatlas for irregular shells, cached per shape; and a release pre-warm of the AO cache. About 2–3 days.

Total about 19–23 days. The AO stages (1–5) and reflection stages (6–7) are independent.

## Questions for the owner

1. Should any room be an exception to no live AO? Recommended: none; candidates listed under "No live GTAO" (the bridge; the lift car, better baked as its own object).
2. Should rooms' shiny surfaces reflect the room itself (a captured probe) in place of the present neutral studio, accepting that dark rooms then reflect less?
3. Is per-vertex AO first, then planar shell lightmaps (with xatlas only for irregular shells), acceptable in place of whole-room xatlas lightmaps, given the prototype's 14.5 s unwrap and untexelled small triangles?

## Sources

- three-mesh-bvh (BVH ray casting, CPU and GPU): https://github.com/gkjohnson/three-mesh-bvh
- xatlas.js and xatlas-three (UV unwrapping for lightmaps): https://github.com/palashbansal96/xatlas
- Three Lightmap Baker (xatlas UV2 plus three-mesh-bvh baking): https://github.com/gonnavis/three-lightmap-baker
- AO Lightmapper (browser AO bake with xatlas and WebGL2 BVH): https://github.com/crazyramirez/AO-Lightmapper
- @react-three/lightmap (in-browser lightmap and AO baker): https://github.com/pmndrs/react-three-lightmap
- Box-projected env map shader patch for three.js r137: https://gist.github.com/0beqz/8d51b4ae16d68021a09fb504af708fca
- three.js forum, parallax correction and the r132 removal: https://discourse.threejs.org/t/parallax-correction-from-environment-maps/32692
- three.js r184 TSL `getParallaxCorrectNormal`: https://app.unpkg.com/three@0.184.0/files/src/nodes/functions/material/getParallaxCorrectNormal.js
- This repository: [bridge render performance](bridge-render-performance-2026-10-28.md), [graphics quality presets](../research/graphics-quality-presets.md), `src/toolkit/gallery/logic/room-readiness.ts`, `src/toolkit/gallery/rooms/museum-hall-room.ts`.
