# ThreeJS Water (vendored)

Copied on 2026-10-20 from [jeantimex/threejs-water](https://github.com/jeantimex/threejs-water) at commit `f35a700a16fe386beac997806ed4471018c93ef7`: Yong Su's three.js port of [Evan Wallace's WebGL Water](http://madebyevan.com/webgl-water/). MIT licence, in `LICENSE` beside this file. Used by dev16, the water prototype (`src/toolkit/gallery/rooms/water-room.ts`).

Only the simulation and the pool's rendering passes are copied: `Water.ts`, `Renderer.ts`, `rendering/` (caustics, object textures, pool, surface, optics state, rounded-box geometry), `water/WaterOptics.ts` and the shaders they use. The demo app, camera, controls, floating objects and models are left out.

Adaptations, each marked "Pool Plant" in the code:

- Shaders are imported as Vite `?raw` strings instead of through `vite-plugin-glsl`, so the build needs no plugin.
- The ray tracing of glTF meshes is left out, with its `three-mesh-bvh` dependency: the `MeshWaterOptics.glsl` include is removed (it was compiled out, `USE_MESH_RAY_TRACING` 0) and `MeshWaterRayTracing` is reduced to its type.
- `CreateRoundedBoxPoolGeometry.ts` declares three corner variables unassigned, for our linter (no change in behaviour).
- In the rounded-box shaders, the light's fall-off with distance from the pool's middle is measured against the pool's size, so a pool much larger than the demo's is not dark at its ends.
