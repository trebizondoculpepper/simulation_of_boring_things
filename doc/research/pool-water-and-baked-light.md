# Pool water, caustics and baked light: what we could use

Researched 2026-10-20 for the front of house: whether three outside sources can serve the pool halls, and how the halls' lighting could be pre-rendered. Nothing has been copied yet.

## 1. ThreeJS Water, by Yong Su (jeantimex)

- **What it is:** a full port of Evan Wallace's 2011 WebGL Water demo to three.js, with additions: any three.js geometry or glTF model as a floating object, rectangular and rounded-box pools, buoyancy, ripples drawn with the pointer ([repository](https://github.com/jeantimex/threejs-water), [live demo](https://jeantimex.github.io/threejs-water/), [80.lv](https://80.lv/articles/real-time-water-simulation-with-three-js)). Yong Su also ported it to WebGPU ([Codrops](https://tympanus.net/codrops/hub/author/yong_su)).
- **Licence:** MIT ("Original work Copyright (c) 2011 Evan Wallace, Modified work Copyright (c) 2026 Yong Su"), so it can be used in this GPL-3 project, keeping the notice and crediting both.
- **Fit:** TypeScript, Vite, three 0.184 and `WebGLRenderer`; we are on three 0.186.1 with `WebGLRenderer`. Its shaders are loaded with `vite-plugin-glsl`; we would import them with Vite's built-in `?raw` instead, so the build tooling does not change.
- **How it works:** the water is a 256 × 256 height field stepped on the GPU each frame (a wave equation over two ping-pong render targets), with its normals from the height's slopes. Caustics are rendered into a 1024 × 1024 texture by tracing light from one direction through the moving surface onto the pool's floor and walls, brightening where the rays bunch (the "differential area" method). The surface's reflection and refraction are ray traced in the shader against the pool's own shape (a box, or a rounded box by its signed distance), and anything else is looked up in a cube map.
- **What it would give us:** real moving water that ripples where something touches it (a swimmer, a dropped object, a pool inlet's jet), the bright webs of caustics on the pool floor and walls moving with the waves, and refraction that bends the tiles under the water.
- **Limits to plan for:** the simulation is built for one pool in a unit box, so a 25 m pool needs its domain scaled (256 cells over 25 m is about 10 cm a cell, fine for ripples, too coarse for splashes) or split into tiles. Caustics fall only inside the pool (floor and walls); the light dancing on the hall's walls and ceiling would still be our own projected caustic texture. Its reflections see the pool and a cube map, so the cube map would be our captured room (dev11 already captures one). It assumes one light direction for the caustics, the rooflights or the sun.

## 2. threejs-caustics, by Martin Renou

- **What it is:** a small demo of real-time water caustics on arbitrary geometry under the water ([repository](https://github.com/martinRenou/threejs-caustics), [demo](https://martinrenou.github.io/threejs-caustics), [three.js forum](https://discourse.threejs.org/t/3d-water-caustics-rendering/18232)), with an article on the method on Medium.
- **Licence:** BSD-3-Clause.
- **How it works:** it renders what lies under the water from the light's point of view, refracts each light ray through the surface and splats it where it lands, so caustics fall on anything (steps, a ladder, a body), not just a box.
- **Fit:** written for three.js of 2020 and not updated since August 2020, so its code would need bringing up to date; better as a reference for the technique than as a copy. Yong Su's covers our case (a pool's floor and walls) more simply.

## 3. Poolrooms In Blender, by Šime Bugarija

- **What it is:** a paid video course (about 4 hours in 27 chapters, 2K video, with the .blend and project files), on [Superhive / Blender Market](https://superhivemarket.com/products/poolrooms-backrooms-in-blender-step-by-step-tutorial-beginner-friendly-how-to-create) at $12.99, and on [Udemy](https://www.udemy.com/course/poorooms-backrooms-in-blender-step-by-step-beginner-friendly-tutorial/) and [Flipped Normals](https://flippednormals.com/product/poolrooms-in-blender-step-by-step-tutorial-beginner-friendly-27071). The name is spelled Bugarija in the listings.
- **What it teaches:** non-destructive modelling of poolrooms and backrooms (bevels, stairs, rounded stairs, windows), materials (tile, chrome, glass, wall, ceiling, carpet), water with the Ocean modifier and a water shader, caustics, daylight through windows and lighting for closed rooms, imperfections (leaks, graffiti), and rendering an animation.
- **Licence:** the listing says only "Creative Commons" without naming the variant. Before any of its meshes, textures or settings went into this repository we would need the exact terms: CC BY or CC0 would be fine; a non-commercial or no-derivatives variant would not suit a GPL-3 project.
- **Use for us:** a guide to the look and to Blender, not code. It is the natural companion to baking our light in Blender (below): its lighting and material chapters are what a bake would render.

## 4. Pre-rendering the light

The poolrooms look is mostly soft light bounced round white tile, which real-time rendering can only fake (our dev11 uses a captured bounce, ambient occlusion and bloom). Baking it ahead of time gives the real thing for almost nothing at run time: the light becomes a texture (a light map) on each surface. Moving things (the water, its caustics, people, objects) keep their real-time light on top.

- **Option A: bake in Blender (best quality).** Export a hall's architecture from the game as glTF (three.js's `GLTFExporter`, from a dev tool), with a second UV set for the light map; in Blender, light it (area lights at the rooflights, daylight through the glazing) and bake Cycles' full global illumination into light maps; export them as images; the game sets each material's `lightMap` (UV channel 1). It can run unattended: a Python script for `blender --background` in the repository bakes every hall. The catch: the bake belongs to the geometry, so any change to a hall's layout means baking again, and the light maps add to the download (compressed KTX2 keeps them small).
- **Option B: bake in the browser.** three.js's `ProgressiveLightMap` (`examples/jsm/misc/`) accumulates soft shadows and light into a light map over many frames, for a dev tool to save as images. It needs no Blender and stays in our procedural pipeline, but gives direct light and soft shadows rather than full bounce.
- **Option C: probes for moving things.** A grid of baked light probes (irradiance captured at points through the hall) lights moving objects and swimmers to match the baked architecture.

Recommendation: prototype in dev11, which is free to change. Bake one hall in Blender (option A) with a scripted pipeline, and replace dev11's water with Yong Su's simulation and caustics, keeping our projected caustics for the walls and ceiling. If the bake loop proves too slow while the layouts still change, use option B until they settle.
