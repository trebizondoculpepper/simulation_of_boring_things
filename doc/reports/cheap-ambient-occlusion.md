# Cheap ambient occlusion: how shipped games darken corners

Research report, 2026-10-30. Research only. No prototype is in the tree: the owner asked to read this first.

## Contents

1. The problem
2. Techniques, one by one
3. How each fits Pool Plant
4. Ranked recommendation
5. Sources

## 1. The problem

The owner's verdict (2026-10-30) is that the per-vertex ray-traced bake in `src/toolkit/baking/` costs minutes for big rooms and will never do. The goal is quick and dirty: a little more volume, concave corners and junctions (wall–wall, wall–floor, wall–ceiling, machine–floor, pipe–wall) slightly darker than wide flat surfaces, more so in plant rooms far from lights. In the white museum, lit by big flat sources, only nearness to a concavity matters.

Our rooms are built in code from known rectangles (`src/game/facility-plan.ts`, `src/toolkit/gallery/logic/shell-plan.ts`, `src/toolkit/gallery/logic/museum-plan.ts`), merged by `mergeStatic`, and drawn with Three.js materials that can be patched through `onBeforeCompile`, as `src/toolkit/baking/baked-ao.ts` already does. A scene unit is a metre in the facility plan, but the component kit uses `METRE` ≈ 9.01 scene units (`src/toolkit/components/core/logic/units.ts`), so any radius must be scaled by it.

## 2. Techniques, one by one

### 2.1 Lightmaps with baked AO (Quake, Source, Unity, Unreal Lightmass)

Quake's `light` compile tool works out lighting and shadow from the map's light entities and stores the result as lightmaps in the BSP; a `_minlight` key sets a floor across the whole map ([QuakeWiki, Light](https://quakewiki.org/wiki/Light_(map_compiling)); [ericw-tools light docs](https://ericw-tools.readthedocs.io/en/latest/light.html)). Q3Map2 added a "dirty" ambient occlusion pass to lightmaps, which the Quake community has discussed adding to Quake compilers ([InsideQC forum](https://forums.insideqc.com/viewtopic.php?p=23797)). Valve's Source engine lit world geometry with radiosity lightmaps and models with an "ambient cube", six colours sampled at the model's position ([Mitchell, McTaggart and Green, Shading in Valve's Source Engine, SIGGRAPH 2006](https://advances.realtimerendering.com/s2006/Chapter7-Shading_in_Valve's_Source_Engine.pdf); [McTaggart, Half-Life 2 shading, GDC 2004](https://drivers.amd.com/developer/gdc/d3dtutorial10_half-life2_shading.pdf)). Unity bakes AO into lightmaps when baked global illumination is on ([Unity manual, Baked ambient occlusion](https://docs.unity3d.com/es//Manual/LightingBakedAmbientOcclusion.html)); Three.js reads such a map through `aoMap`, which needs a second UV set ([three.js, MeshStandardMaterial](https://threejs.org/docs/pages/MeshStandardMaterial.html)).

Cost: an offline bake per level (minutes to hours), nothing per frame but a texture fetch. Look: the best of all, contact shading everywhere. Limits: needs a lightmap UV unwrap and an offline compiler; our rooms are generated at load, so the bake would run at load, which is exactly the cost the owner has ruled out. Fit: poor.

### 2.2 Per-vertex AO and dirt (artist tools, Minecraft-style corner counting)

Blender's Dirty Vertex Colors writes a dirt gradient into vertex colours from mesh cavity (the angle between a vertex's normal and its neighbours'), with blur passes and dirt and highlight angles ([Blender manual, Editing Vertex Paint Colors](https://docs.blender.org/manual/en/4.1/sculpt_paint/vertex_paint/editing.html)). Unity tools such as VertexDirt and VertexColorBaker bake AO or curvature into vertex colours on import, needing no lightmap UVs ([VertexDirt](https://marketplace.unity.com/packages/tools/level-design/vertexdirt-vertex-ambient-occlusion-21015); [VertexColorBaker](https://github.com/Fewes/VertexColorBaker)); the Infamous 2 talk notes that engines typically support static per-vertex baked AO alongside SSAO ([Reed, AO Fields and Decals in Infamous 2, GDC 2012](https://www.reedbeta.com/talks/ao-fields/Ambient%20Occlusion%20Fields%20and%20Decals%20in%20Infamous%202.pdf)).

Minecraft's smooth lighting, first a mod, then part of the game, darkens each vertex of a block face by counting the opaque blocks round that corner; four opaque neighbours take it to 0.2 and the GPU interpolates across the face ([The Grey Minecraft Coder, Lighting](https://greyminecraftcoder.blogspot.com/2013/08/lighting.html)). Mikola Lysenko's write-up gives the closed form from two side voxels and one corner voxel, four possible levels per vertex, and notes it is view independent and very cheap ([0fps, Ambient occlusion for Minecraft-like worlds](https://0fps.net/2013/07/03/ambient-occlusion-for-minecraft-like-worlds/)); it also notes this is simpler than Minecraft's own.

Cost: cavity from neighbouring normals is one pass over the vertices (milliseconds for our rooms); Minecraft's rule is a lookup per vertex. Nothing per frame beyond a vertex attribute. Look: good where there are vertices; it is per vertex, so a 10 m wall built from two triangles gets no gradient at all, and the cavity method sees only angles inside one connected mesh, so it cannot see a pipe meeting a wall or a pump standing on a floor (separate pieces). Fit: weak for the room shells (few vertices, which is why our bake subdivides faces), useful only as detail on dense, connected meshes such as machine castings.

### 2.3 Analytic occluders: spheres, boxes, capsules

The Last of Us lit its world with lightmaps and gave characters dynamic "ambient shadows" from spheres, the occlusion of each worked out analytically as the share of the hemisphere a sphere blocks, with a cone for direction ([Iwanicki, Lighting technology of The Last of Us, SIGGRAPH 2013](https://history.siggraph.org/learning/lighting-technology-of-the-last-of-us-by-iwanicki); [Digital Production, 2014](https://digitalproduction.com/2014/01/21/verfall-mit-historie-retro-artikel/)). (The brief's "AO volumes and occlusion boxes" for The Last of Us could not be confirmed by name; "Ambient Occlusion Volumes" is a separate NVIDIA technique, below.) Unreal's capsule shadows approximate a skeletal mesh by spheres and capsules from its physics asset, and can cast a soft shadow in areas lit only by bounce light; their cost scales with capsules, characters and screen area ([Unreal Engine, Capsule Shadows](https://dev.epicgames.com/documentation/en-us/unreal-engine/capsule-shadows-overview-in-unreal-engine)). Íñigo Quílez publishes closed-form occlusion for a sphere and for a box on any receiving surface; the box's faces are summed one by one ([Quílez, Sphere ambient occlusion](https://iquilezles.org/articles/sphereao); [Quílez, Box occlusion](https://iquilezles.org/articles/boxocclusion)).

Cost: nothing at load beyond listing the shapes; per frame, a few dozen arithmetic operations per shape per lit pixel. Look: soft, believable contact darkening, no noise, no flicker. Handles separate objects meeting, since a box shades whatever is near it. Limits: shapes must be listed and kept few (a uniform array, or a small grid of them); a box approximates a pump badly at its curves but well enough for darkening. Fit: very good; our rooms and plinths are boxes already.

### 2.4 Distance fields: SDF AO (Evans, Quílez, Unreal DFAO)

Alex Evans showed approximate AO and sky light for dynamic scenes from a signed distance field stored in a volume ([Evans, Fast Approximations for Global Illumination on Dynamic Scenes, SIGGRAPH 2006](https://www.advances.realtimerendering.com/s2006/Chapter9-Fast_Approximations_for_Global_Illumination_on_Dynamic_Scenes.pdf)). Quílez's ray-marching AO takes a handful of samples along the surface normal and compares each with the distance to the nearest surface, weighting nearer samples more ([Quílez, NVScene 2008](https://iquilezles.org/articles/nvscene2008); [Cambridge, Ray Marching and Signed Distance Fields](https://www.cl.cam.ac.uk/teaching/1920/FGraphics/1.%20Ray%20Marching%20and%20Signed%20Distance%20Fields.pdf)). Unreal's Distance Field Ambient Occlusion uses precomputed per-mesh distance-field volumes to give medium-range AO from world-space occluders, free of screen-space AO's off-screen artefacts ([Unreal Engine, Mesh Distance Fields](https://dev.epicgames.com/documentation/en-us/unreal-engine/mesh-distance-fields-in-unreal-engine)).

For box rooms the distance field needs no volume texture: it is analytic. The distance from a point to the nearest wall, floor or ceiling of a rectangular room is the inside distance of a box; a union of rectangles takes the largest; a list of solid boxes takes the smallest of their box distances (Quílez's box functions, [Quílez, Box functions](https://iquilezles.org/articles/boxfunctions)). Four taps along the normal then give corner darkening that is strongest in a three-way corner, weaker along a two-way junction, and nothing in the middle of a wall.

Cost: no load cost at all beyond listing boxes (well under a millisecond); per frame, taps × boxes box distances per lit pixel (4 × 32 = 128 cheap evaluations, comparable to a few extra lights). Look: smooth, view-independent, stable. Limits: the shapes are coarse (a box for a pump), a point inside or on its own box must ignore that box or a machine shades itself, and it only knows what is listed. Fit: the best of any technique here; it uses exactly what our room plans already hold.

### 2.5 Precomputed occlusion volumes per object (AO fields, Infamous 2, TLOU rigid objects)

Kontkanen and Laine stored, round each rigid occluder, a field of how much it blocks the sky at each nearby point, approximated as a spherical cap in a cube map ([Kontkanen and Laine, Ambient Occlusion Fields, I3D 2005](https://users.aalto.fi/~laines9/publications/kontkanen2005i3d_paper.pdf)). Sucker Punch's Infamous 2 stored an occlusion cone per voxel of a small volume texture round each object ("AO fields"), and flat "AO decals" for contact shadows, a few kilobytes per object, to fill the gap between baked AO and SSAO ([Reed, GDC 2012](https://gdcvault.com/play/1015320/Ambient-Occlusion-Fields-and-Decals); [slides](https://www.reedbeta.com/talks/ao-fields/Ambient%20Occlusion%20Fields%20and%20Decals%20in%20Infamous%202.pdf)). McGuire's Ambient Occlusion Volumes extrude a shadow-volume-like region round each triangle and shade inside it ([McGuire, Ambient Occlusion Volumes, HPG 2010](https://research.nvidia.com/publication/2010-06_ambient-occlusion-volumes)).

Cost: an offline bake per object kind (once, shipped), a 3D texture fetch per pixel per nearby object. Look: better than a plain box for shaped objects. Limits: precomputation and an asset pipeline per machine model; volume textures. Fit: moderate; a later step for showpiece machines, not the first.

### 2.6 Decals and contact strips (Infamous 2, Godot blob shadows)

AO decals project a soft dark patch under or beside an object ([Reed, GDC 2012](https://gdcvault.com/play/1015532/Ambient-Occlusion-Fields-and-Decals)). Godot's documentation recommends blob-shadow decals as a form of AO where SSAO is too costly or unstable, for example under vehicles ([Godot, Using decals](https://docs.godotengine.org/de/4.3/_sources/tutorials/3d/using_decals.rst.txt)); platformers such as Yooka-Laylee ground characters the same way ([Simon Schreibt](https://simonschreibt.de/?p=11272)).

Cost: a quad per junction, generated from the room plan in milliseconds; a cheap blended draw per frame (overdraw, and a draw call each unless merged). Look: convincing along straight junctions and under machines; a gradient texture along each wall foot is the classic hand-made version. Limits: transparent sorting, z-fighting, extra geometry; corners where three strips meet double up unless handled. Fit: good and simple, but the shader method in 2.4 does the same with no extra geometry.

### 2.7 Low-resolution 3D occlusion or irradiance volumes

Godot's VoxelGI voxelises the scene and bakes in about 5–20 seconds, and can be baked at run time for procedural levels whose geometry exists in advance; it is Forward+ only and relatively demanding ([Godot, VoxelGI](https://docs.godotengine.org/en/4.0/classes/class_voxelgi.html)). Iwanicki's talk describes precomputing occlusion round rigid objects in a 3D volume for The Last of Us (secondary report of the SIGGRAPH 2013 paper, [SIGGRAPH archive](https://history.siggraph.org/learning/lighting-technology-of-the-last-of-us-by-iwanicki)). A coarse occupancy grid of a room (say 25 cm cells, built from its boxes) can be blurred into an occlusion texture in milliseconds and sampled in the shader.

Cost: tens of milliseconds to build for our room sizes from boxes, seconds if by voxelising triangles; a 3D texture fetch per pixel. Look: soft and broad, loses junction sharpness at low resolution, leaks through thin walls. Fit: moderate; it gains little over 2.4 for box rooms.

### 2.8 Height-map world AO (Assassin's Creed III, CryEngine)

Assassin's Creed III rendered the world top-down into a height map, blurred it, and reduced ambient light by how far a point sits below the nearby occluder height (secondary Japanese report of St-Amour's GDC 2013 talk: [Game Watch](https://game.watch.impress.co.jp/docs/news/20130401_593983.html)); CryEngine 3 has a similar Height Map AO for large-scale outdoor occlusion ([CRYENGINE docs](https://cryengine.com/docs/static/engines/cryengine-3/categories/1114113/pages/21890652)). Fit: poor indoors, where a ceiling covers everything.

### 2.9 Light-distance falloff

Plain point and spot lights already fall off with distance; what the owner wants is for the corner darkening itself to deepen far from lamps. Unreal's indirect capsule shadows do something related, reading Lightmass's volume samples to aim and weight the occlusion ([Unreal Engine, Capsule Shadows](https://dev.epicgames.com/documentation/en-us/unreal-engine/capsule-shadows-overview-in-unreal-engine)). For us it is one more uniform array of lamp positions and a smoothstep on the nearest one's distance, multiplying the strength from 2.4. Cost: one loop over at most 16 positions per pixel. Fit: very good, and our plant rooms know their lamps.

### 2.10 Screen-space AO, for comparison

SSAO and its successors (Alchemy, GTAO, which the museum already has as a live option) give contact shadows from the depth buffer at a per-frame cost that scales with resolution, with noise and off-screen artefacts ([McGuire et al., The Alchemy Screen-Space Ambient Obscurance Algorithm, HPG 2011](https://research.nvidia.com/publication/2011-08_alchemy-screen-space-ambient-obscurance-algorithm)). It is the "live" mode the owner is moving away from, so it is not ranked.

## 3. How each fits Pool Plant

| Technique | Load | Per frame | Separate pieces meeting | Fit |
|---|---|---|---|---|
| Lightmap bake | minutes | texture fetch | yes | poor (UVs, bake time) |
| Vertex cavity / Minecraft rule | ms | none | no | detail only |
| Analytic box SDF AO in shader | < 1 ms | ~128 box distances a pixel | yes | best |
| Analytic sphere/box occluders (Quílez) | < 1 ms | per shape per pixel | yes | good |
| AO fields per object | offline | 3D fetch per object | yes | later |
| Decals / contact strips | ms | blended quads | yes | good, more geometry |
| Occlusion volume texture | tens of ms | 3D fetch | yes | moderate |
| Height-map world AO | ms | 2D fetch | partly | poor indoors |
| Light-distance weight | none | ≤ 16 distances a pixel | n/a | very good, add-on |

The hook would be the same shape as the bake's: a separate module that copies each opaque, lit material once with an `onBeforeCompile` patch at `#include <aomap_fragment>` (darkening `indirectDiffuse` and a share of `directDiffuse`), plus a single call in each room with its interior rectangles from its plan. Box occluders can be taken from each mesh's world bounding box, dropping the shell's own slabs and anything small or already inside a bigger box.

## 4. Ranked recommendation

1. Analytic distance-field AO in the shader from the room's own rectangles plus up to about 32 occluder boxes (2.4, with Quílez's normal-tap sampling and box distances). Zero load cost, modest per-pixel cost, corners and machine feet darken, separate pieces meeting are handled, and it is all data our plans already hold. For the museum: radius about 1.2 m, weak, and darken a share of the direct light too since the big flat lights dominate.
2. Plus light-distance weighting in plant rooms (2.9): the same shader, strength raised by a smoothstep of the distance to the nearest lamp. Cheap, and gives "more shaded far from the lights" directly.
3. Optionally, per-vertex cavity on dense connected meshes only (2.2) for small-scale grime on machine castings and fittings, computed at load in milliseconds, written as a vertex attribute. Skip it on shells.
4. If the shader route proves too costly on weak GPUs: contact strips and blob decals generated from the room plan (2.6), the cheapest per pixel.
5. Later, for showpiece machines whose box is a poor fit: a small precomputed AO field per model (2.5).

Not recommended: lightmaps (2.1), voxel GI or occlusion volumes (2.7), height-map AO (2.8), and any per-frame screen-space AO.

## 5. Sources

All linked inline above. Two claims rest on secondary reports and should be checked against the primary talks if they matter: the detail of The Last of Us's sphere and volume occlusion (Iwanicki, SIGGRAPH 2013; full paper not retrieved), and Assassin's Creed III's world AO (Japanese report of St-Amour, GDC 2013). The brief's "occlusion boxes" in The Last of Us could not be confirmed by name.
