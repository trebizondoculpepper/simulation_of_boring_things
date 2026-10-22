# Room transition performance in the pool loop

Investigation, 2026-10-22, at commit `55d8654`. Read-only: no code was changed. The owner reported a stutter just as the walker passes from one room to the next, especially round the pool loop (`pool_01` to `pool_04` and `pool_02_gallery`), and suspected that the preloading of adjacent rooms had stopped working.

## Summary

Preloading has not stopped working: it never did all of the work. For the pool loop, the rooms either side of the current one are built (scene, geometry, WebGL context, composer) ahead of time, but nothing is drawn or compiled until they are first seen, and the hand-over itself forces every material of the room coming on top to be compiled a second time. The PR_A cluster has a separate preloader that does warm its rooms; the pool loop never used it.

Ranked by evidence, the causes of the stutter are:

1. **Shader recompilation at every hand-over, caused by the clipping plane** (measured, confirmed by experiment). A room drawn underneath, seen through a doorway, has one renderer clipping plane; the room on top has none. The number of clipping planes is part of three.js's program cache key, so when the room underneath is handed over and comes on top, every one of its materials gets a new program. This is the hitch exactly at the transition.
2. **Neighbouring rooms are built but not warmed** (measured). Their frame loop does nothing while hidden, so all of their shaders, textures and render targets are compiled and uploaded in the frame they are first seen: as the walker crosses the band in the middle of a room, and again, a little, as more of the next room comes into view in the corridor.
3. **The room after next is built synchronously straight after the hand-over** (measured). The new room's lazy neighbours are built on the next animation frame, a whole pool hall with its own WebGL context, in one task.
4. **Every lap rebuilds and recompiles everything** (verified from code). Rooms two away are released and disposed, so nothing compiled is kept, and each room is a separate WebGL context, so nothing is shared between rooms either.
5. **Periodic whole-scene traversals** (inferred, not measured; minor). Three traversals of each drawn room's scene every two seconds.

None of the recent additions (gas detection, room power, room lights, signage, the rotunda) does expensive work at switch time in itself. They add materials, which makes causes 1 and 2 more expensive with each addition.

## How rooms are preloaded

There are two mechanisms in `src/main.ts`.

**The PR_A cluster** (`src/main.ts:746-809`). `preloadCluster` builds the rooms round PR_A one at a time when the page is idle (`idle`, line 765), and `warm` (lines 774-788) shows each one for three frames with `visibility: hidden`, so its loop runs and its shaders compile. It applies only to `PR_A_CLUSTER` (lines 755-762) and is called from `openRoom` (line 434) and the `pool-plant:room-zone` handler (line 877). The pool loop is not part of it.

**The pool loop's lazy joints** (`src/main.ts:593-632`, `checkDoors`, run every animation frame by `watchDoors`, lines 633-637). Each pool hall registers its two corridors as `lazy` joints (`src/toolkit/gallery/rooms/pool-hall-room.ts:482-494`, `573-578`). `checkDoors` asks for `lazyNeighbours(top)` (`src/toolkit/gallery/logic/door-joins.ts:70-77`) and calls `ensureBuilt` on each (`src/main.ts:583-592`), which imports the room's module and `mount`s it hidden (`src/main.ts:322-346`). Rooms no longer either side are `release`d (`src/main.ts:530-537`, `608-616`): their renderer and geometry are disposed and their canvas removed. This was introduced in `1bf1655` ("Add the plant rooms, their doors and the main corridor"); before that the loop built a room only when its joint opened.

What it builds ahead: the room's scene, all geometry and materials, its `WebGLRenderer` (a new WebGL context), the `EffectComposer` with GTAO, bloom, output and film passes.

What it does not do ahead: draw anything. `startPoolHallRoom`'s loop returns at once while its section is hidden (`pool-hall-room.ts:617`, `if (canvas.parentElement?.hidden) return;`, present since `5f139a6`). So no shader is compiled, no texture is uploaded, the shadow map and composer targets are not allocated, and the canvas is not even sized (`resize`, lines 443-453, returns while the canvas has no size). All of that happens in the first frame in which the room is seen: when `startSeeing` (`src/main.ts:538-581`) un-hides it and has the room on top draw it (`topDraw.after`, line 575).

What happens at the hand-over (`handOver`, `src/main.ts:639-664`): `stopSeeing(false)` sets the arriving room's `renderer.clippingPlanes = []` (line 513); the arriving room comes on top and is drawn without a clipping plane; `startSeeing(to, from)` sets the room left behind to one clipping plane (lines 567-572). On the next frame `checkDoors` builds the room after next and releases the room two behind.

## Why the hand-over recompiles everything

In three.js 0.186.1, `numClippingPlanes` is part of the program cache key (`node_modules/three/src/renderers/webgl/WebGLPrograms.js:358`, `491`), and a material whose last program was built for a different number of planes is flagged for a new one (`node_modules/three/src/renderers/WebGLRenderer.js:2492-2493`). A room is first compiled while it is seen underneath (one plane), then compiled again for every material when it comes on top (no plane). The room left behind gets a third set if it had never been underneath before. Nothing in the preloading can avoid this, because the preloader cannot know the clipping state the room will be drawn with.

## Measurements

Method: headless Chromium (Playwright's `chrome-headless-shell` 1228, `--use-angle=metal --enable-gpu`, which reported "ANGLE Metal Renderer: Apple M3 Max") driven over the DevTools protocol against the running Vite dev server. A script in the page placed the walker on a path through each room (entry door, exit door, along the leaving corridor's pieces) at 0.04 m per frame, through five hand-overs round the loop and back to `pool_01`, recording each frame's duration, the room, which room was seen underneath, and `renderer.info.programs.length` for the top and underneath renderers. `linkProgram`, `getContext` and texture uploads were timed by wrapping the WebGL prototype. All instrumentation was injected from outside; nothing in the repository was changed. Scripts and raw results were kept in the session's scratchpad, not the repository.

One caveat: macOS keeps a Metal shader cache across runs, so the first runs (cold cache) were far slower than later ones. The "cold" column is from the first full lap; a few shorter runs before it had already warmed the cache for `pool_01` and `pool_02`, which is why its first row is low. The warm-cache figures are closer to what a player sees in a browser that has shader caching, the cold ones to what is seen after shaders change or on a slower GPU.

**Program counts confirm the recompilation.** On hand-over, the arriving room's program count jumped in every case, though nothing new came into view: `pool_02` 44 → 73, `pool_03` 34 → 65, `pool_04` 31 → 58, `pool_02_gallery` 42 → 78, `pool_01` 33 → 61. The room left behind, now underneath, gained a set too (`pool_01` 33 → 50).

**Frame times at the transitions** (longest frame, ms; where two frames are given, the second is the build of the room after next):

| Transition                    | Cold cache, unpatched | Warm cache, unpatched | Warm cache, constant clipping plane |
| ----------------------------- | --------------------- | --------------------- | ----------------------------------- |
| pool_01 → pool_02             | 217                   | 200 + 50              | 50                                  |
| pool_02 → pool_03             | 2,859                 | 183                   | 50                                  |
| pool_03 → pool_04             | 1,992 + 100           | 125 + 100             | 100                                 |
| pool_04 → pool_02_gallery     | 3,076 + 92            | 192 + 92              | 83                                  |
| pool_02_gallery → pool_01     | 125 + 100             | 125 + 99              | 100                                 |
| pool_01 → pool_02, second lap | —                     | 508 + 42              | 50                                  |

The experiment in the last column, run in the page and not in the code, replaced the renderers' `clippingPlanes` setter so that an empty list became one plane that clips nothing (normal +y, constant 1e9). Program counts then stayed flat across every hand-over, and the hand-over hitch fell to the 40-100 ms of building the room after next, whose new WebGL context was seen being created in that frame in every run.

**First sight of a room** (crossing `LOADING.band`, a metre past the middle of a room, `src/toolkit/gallery/logic/pool-loop.ts:242-245`): 200-250 ms with a warm cache in both variants, and 0.8-1.9 s with a cold one, with about 30 programs linked and about 20 ms of texture uploads in that frame. A further 60-80 ms frame followed at the turn of the leaving corridor, where more of the next room comes into view and three.js compiles the newly visible materials (the underneath room's program count rose 37 → 44 there). These hitches are not at the transition itself, but the walker is close enough to it to feel them as one.

No WebGL context warnings were seen in 75-second runs (about nine contexts were created in each).

## Verified and inferred

Verified by measurement: the hand-over recompiles the arriving room's materials (program counts), and keeping the clipping-plane count constant removes most of the hand-over hitch; neighbours are compiled on first sight, not when built; the room after next is built (a new context) in the frames just after a hand-over; the size of each hitch.

Verified by reading code: the PR_A preloader does not cover the pool loop; hidden pool halls do not draw; rooms two away are released and rebuilt each lap; `numClippingPlanes` is in three's program key.

Inferred, not measured: that the stutter has grown worse as materials were added (signs, notices, room power, lights), since every material adds programs to compile twice; that the two-second scans in `bindRoomLights` (`src/toolkit/gallery/views/room-lights.ts:40-76`), `bindRoomPower` (`src/toolkit/gallery/views/room-power.ts:34-75`) and `findPools` (`pool-hall-room.ts:596-604`, `622-626`) cause small periodic hitches, at most six traversals every two seconds while two rooms are drawn, each starting in the room's first frame; that released renderers, disposed without `forceContextLoss()`, keep their WebGL contexts until garbage collection, which over a long session could approach the browser's limit of about 16 live contexts; that weaker GPUs see longer hitches than the M3 Max measured here.

## Recommended fixes

In order of value for effort.

1. **Keep the number of clipping planes constant.** Give every room renderer a single clipping plane that clips nothing from the start (in `createRenderer`, `src/toolkit/components/core/parts/render-style.ts:57`), and have `stopSeeing` restore that plane instead of `[]` (`src/main.ts:513`); `startSeeing` keeps setting the doorway's plane (`src/main.ts:567-572`). Programs then compile once per room, whether it is seen underneath or on top. Measured above: the hand-over hitch fell from 125-508 ms (warm) and up to 3 s (cold) to 40-100 ms. The cost is one plane test per fragment, which is negligible. Rooms outside the pool loop that use the same doorway mechanism (plant room doors, the main corridor) benefit too.
2. **Defer building the room after next.** In `checkDoors` (`src/main.ts:600-607`), build lazy neighbours when the page is idle (the existing `idle` helper, line 765), or a few frames after a hand-over, rather than in the next frame. The walk along a corridor and across a hall gives several seconds' slack. This removes the 50-100 ms that remains after fix 1.
3. **Warm the pool loop's neighbours after building them.** After `mount` for a lazy neighbour, when the page is idle, call `renderer.compileAsync(scene, camera)` (three compiles every visible object regardless of the view, using `KHR_parallel_shader_compile` where the driver has it), size the canvas, and draw one frame unseen, as `warm` does for PR_A, so that the composer's passes, shadow map and texture uploads are done too. This needs a small hook on the room handle (say `prewarm()`) since `main.ts` cannot see the scene. With fix 1, the programs compiled are the ones used both underneath and on top. This removes the 200-250 ms at first sight and the smaller hitch at the corridor's turn.
4. **Stop rebuilding every lap, or make rebuilding cheaper.** Keeping the five loop rooms built (perhaps suspended) would avoid all rebuilding and recompiling after the first lap, at a memory cost worth measuring. If rooms are still released, call `renderer.forceContextLoss()` in their dispose so contexts are freed at once.
5. **Make the periodic scans cheaper.** Scan once after a room is built and again only when something marks the scene changed, or stagger the three scans so they do not fall in the same frame.

A larger change, not recommended now, would be one WebGL context shared by every room, so compiled programs and uploaded textures are shared; it would change how rooms are drawn and composed with each other and touches every room.

## Update, 2026-10-22: fix 1 applied

Every room renderer now starts with one clipping plane that clips nothing (`inertClip` in `src/toolkit/components/core/parts/render-style.ts`), and `stopSeeing` in `src/main.ts` puts that plane back instead of clearing the list, so the number of planes never changes at a hand-over. Measured with the same driver on the M3 Max, walking the loop from pool_01 for 70 s: the arriving room's shader count stayed flat at each hand-over (pool_02 44 to 44, pool_03 34 to 34, pool_02_gallery 42 to 42; pool_04 28 to 31), against 44 to 73, 34 to 65 and 42 to 78 before. The hand-over frames took 40 to 125 ms. The frames that remain long, 175 to 300 ms, come as each next room is first seen through its doorway: cause 2 above, still to fix.
