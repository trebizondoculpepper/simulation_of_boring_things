# Plant-room door loading: measurements and recommendations

Investigated 2026-10-24 on `fdbe3dc`, after the requested pull, with the local Dev35 prototype also present. No performance fix was implemented. Temporary profiling hooks were removed after measurement; the prototype work was preserved through the pull.

## Finding

Opening a plant-room door starts work that could have been completed before the player opened it. The room gets a new WebGL renderer, builds its geometry and instruments synchronously, then compiles and uploads its visible materials and runs every postprocessing pass for the first time. The doorway keeps showing its dark lobby until that work produces an image. Closing the door can release the room, so it pays those costs again when rebuilt.

The strongest measured bottleneck was first-frame rendering, followed by renderer creation and, in the Olympic plant room, equipment construction. The measured layout and pipe-generation stages were relatively small in these samples. Moving routing to a worker alone would leave the main doorway delay largely intact.

## Method and limits

Used Chrome on this Mac, reporting `ANGLE (Apple, ANGLE Metal Renderer: Apple M5, Unspecified Version)`. Added temporary `performance.now()` timers around module readiness, room construction, renderer setup, shell/equipment construction, individual equipment factories, rendering and the complete composer. Recorded Three.js program, geometry, texture and draw-call counts. Timed the existing `ozoneRoom()` pure model separately through Vite SSR in Node.

Development-server experiments were followed by an instrumented production build served locally on port 5176, so the main results below do not depend on Vite's development module requests or hot reload. Other application tabs were present, and GPU/driver caches were not cleared. These are diagnostic samples, not isolated benchmark medians or promises about every player's timings. Initial development measurements included hot-reload activity and are excluded from the production comparison.

The draw timings are elapsed CPU wall time around `renderer.render`, including driver waiting, shader setup and uploads. They do not separately measure shader compiler time, GPU execution or texture-upload time. Program-count increases identify shader creation during those slow frames, but cannot assign all of the frame to compilation. The renderer-setup stage includes renderer construction and nearby initial setup, not only the raw WebGL context call.

Raw production samples, with timestamps, are in [plant-room-load-2026-10-24.json](data/plant-room-load-2026-10-24.json). The browser logging API retains history across navigations; samples are selected by production origin and the room being investigated. Startup numbers below are taken from individual runs, not summed across retained histories.

## Measurements

| Case                                                  | Room construction | Equipment within construction | First complete composer frame | Following composer frames sampled |
| ----------------------------------------------------- | ----------------: | ----------------------------: | ----------------------------: | --------------------------------: |
| Jacuzzi plant room, direct URL                        |          1,685 ms |                         19 ms |                      4,469 ms |                            3–8 ms |
| Olympic plant room, direct URL                        |          1,632 ms |                        922 ms |                      5,593 ms |                         57–120 ms |
| Jacuzzi plant room, opened through its pool-hall door |            315 ms |                         30 ms |                      5,722 ms |        1,139 ms next, then 4–6 ms |

The first rows were complete page loads. The doorway row was an actual door opened using the game's Use control from `?room=pool_03&x=3.8&z=-1.23&yaw=90`. It registered `import plant_pool_03` only after the door was opened. That request became ready in 50 ms, and synchronous construction took another 315 ms. Its first main scene render then took 2,550 ms while creating 14 programs; subsequent AO/bloom/output/film work brought the whole composer frame to 5,722 ms and the program count to 29. The second frame still cost 1,139 ms before subsequent sampled frames settled to single-digit milliseconds. The measured first-image delay was around six seconds in this run, longer than the reported 1–3 seconds; cache and machine/browser conditions affect its size, while the same late-loading path applies.

For the Olympic direct load, renderer setup took 562 ms, shell construction 117 ms, and equipment 922 ms. Within equipment, layout was 0.5 ms, machine construction 818 ms, pipework 81 ms, services 3 ms, and supports 16 ms. The ozone-generator factory subtree accounted for 768 ms of the machine-construction time. Its separate pure `ozoneRoom()` model construction took 0.3, 0.1 and less than 0.1 ms in three Node runs; the factory timing therefore warrants profiling its view/control/texture-building subtree rather than assuming its simulation is the expensive part. The browser and Node results are separate environments and are not a precise subtraction.

The Olympic first main render created 20 programs and took 3,008 ms; the complete frame created 35 programs. Its scene pass issued 1,637 draw calls and about 359,000 triangles in that view, with 1,628 registered geometries and 127 textures before the effect passes. A later development view reached 2,755 calls and about 425,000 triangles; that is a different view/run, not the production sample above. The steady rendering cost is a separate problem from first visibility, and matters when two rooms are drawn through one doorway.

## Why the current loader waits

- `nearestJoint` in `src/toolkit/gallery/logic/door-joins.ts` explicitly skips both `lazy` and `onOpen` joints. Plant-room doors are registered with `onOpen: true` in `pool-hall-room.ts` and `plant-room-shell-room.ts`. Consequently the nearest-door preload branch in `main.ts` does not preload those rooms.
- `checkDoors` in `src/main.ts` sees the open door, calls `ensureBuilt`, waits for the starter import and synchronously calls `mount`. `mount` invokes the entire room constructor in one task. The measured 50 ms request timer includes import/evaluation/scheduling; it is not a network-only measurement.
- Plant-room frame loops return while their root is hidden. Building a hidden room leaves first-use shader compilation, uploads, render-target allocation and effect-pass initialization until it becomes visible. The special `preloadCluster`/`warm` path applies to PR_A's group, not these plant doors.
- `startSeeing` makes the neighbour visible and draws its frame after the current room. That first composer frame blocks the main thread before a fresh doorway image can be presented.
- `checkDoors`/`release` discard lazily built rooms that are no longer active neighbours or visible underneath. After the door closes, its room may be disposed and rebuilt on reopening. Each room also has its own WebGL context, so sharing a JavaScript material or image does not share the GPU program/upload between those contexts.
- The old clipping-plane-count bug is already fixed: `createRenderer` starts with one inert plane and `stopSeeing` restores one inert plane. The earlier report's primary fix should not be applied again. That report remains useful background: [room-transition-performance.md](room-transition-performance.md).

## Recommendations, in order

1. **Prepare the nearest plant room before its door opens.** Add an explicit distance-based prefetch policy for `onOpen` doors, with a small limit on prepared neighbours. Keep the door's visual-open state separate from its preparation state. Importing a module alone is insufficient; the readiness state needs to distinguish imported, built and ready to draw. Start far enough away to have useful walking time, and schedule rather than construct every nearby room in one frame.
2. **Warm the scene and the complete render pipeline.** Give room handles a preparation hook. Use Three.js `compileAsync` for scene programs where supported, initialize required textures, then exercise the sized composer invisibly so AO, bloom, output, film and render targets are ready too. Compile the materials likely to appear as the doorway opens and the eye moves, not just one camera's initial view. Retain the existing single clipping-plane count. Warm-up has real work and can itself stall, so use incremental work/preparation budgets and measure movement responsiveness; one giant hidden render simply moves the hitch earlier.
3. **Keep a small cache of recently used rooms.** Suspend a closed room briefly instead of disposing it immediately. Start with the current room plus one prepared/recent plant room, then measure CPU/GPU memory and browser context limits before increasing the budget. Evict deliberately. Do not warm every room or keep every WebGL context indefinitely. Ensure suspended rooms do not keep playing machinery sounds, binding input or stepping view-owned simulations unnecessarily.
4. **Reduce Olympic geometry and material submission overhead.** Merge static casing, pipe and support geometry by compatible material and spatial cell; instance repeated bolts, flanges and fittings. Keep moving valve handles, meter needles, lamps, doors and hit targets independently usable. Inspect the ozone-generator subtree for avoidable canvas/texture construction and repeated work. First preserve working components, then compare build time, draw calls and visible quality. The current layout and pipe numbers do not justify making router optimization the first fix.
5. **Test a lighter first presentation.** Once the scene is ready, show a basic image while expensive optional effect passes finish preparing, or offer lower-cost AO/quality settings. Ensure the transition does not produce the brightness/contrast jumps described in the room-transition guide. Measure a shared renderer/context as a longer-term design option if repeated per-room context and program costs remain dominant; it is a larger architectural change, not the first patch.

## Acceptance measurements for the follow-up

Record door activation to first non-lobby image, synchronous construction stages, first and subsequent frame times, program counts, GPU resource counts and repeat-open latency. Compare at least the jacuzzi, lounge, Olympic and boiler/air-plant rooms in both directions, first visit and repeat visit, with graphics quality and viewport held constant. Repeat on a clean production build and an ordinary browser profile; report median and worst samples and separate preparation hitches from door-opening latency. A useful initial target is a prepared doorway image within 100 ms, without introducing long movement stalls while approaching it. This is a target to validate, not a measured result of the proposed changes.

## Outcome

The report and measurements are saved. Temporary source instrumentation was removed, and no loader/rendering optimization was shipped as part of this investigation. The pending Dev35 prototype remains local and independent of the newly pulled world-wired jacuzzi.
