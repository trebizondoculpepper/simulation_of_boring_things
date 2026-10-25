# CCTV ghost bathers: research and options

Date: 2026-10-25. Status: research only, nothing implemented.

## The idea

The pools' bathers rise and fall through the day. Walk into a pool hall and it is always empty. Watch it on a security camera and it is occupied: figures in protective suits with briefcase-like life-support units walk the poolside, swim in the Olympic pool and sit in the jacuzzi, in numbers that follow the bather model. They are never seen directly; the player knows them by what they do to the water and the plant.

## 1. The bather model today

`src/game/bathers.ts` already does most of what the idea needs. It is pure, seeded (mulberry32, state kept in the world) and saved with the world (`WorldState.bathers`, stepped in `src/game/world.ts` line 735, `stepBathers(world.bathers, world.time, delta, appealOf(world))`).

The centre opens 08:00 to 21:00. Each pool has a capacity (`CAPACITY`: lounge `pool_01` 69, Olympic `pool_02` 312, jacuzzi `pool_03` 8, footbath `pool_04` 6) and a typical stay (`STAY`: 60, 45, 15 min, 20 s). Arrivals are Poisson at a rate set by an hourly share of capacity (`TIMETABLE`, separate weekday and weekend profiles for leisure, lanes and spa), scaled by a daily busyness drawn at midnight (0.7 to 1.3) and by the pool's appeal (`poolAppeal`: 0 if not circulating, hall unlit, free chlorine under 0.5 mg/l or spa over 40 °C; otherwise a product of shares for temperature, pH, free and combined chlorine and hall air). Departures are Poisson from the stay. Everyone wades the footbath on the way in. At closing everyone is out within `CLEAR_SECONDS`.

So the numbers already vary through the day, by weekday or weekend, by daily busyness and by the plant's condition. Per pool the model gives `now` (in the water), `today`, `total` and `turnedAway`. It gives counts only: no individuals, no positions, no activity (walking, swimming, sitting), and no distinction between in the water and on the poolside.

Load on the plant: as far as a search shows, nothing in the live world consumes `world.bathers` yet. `health.ts` lists bathers as "not health: the visitors, a load on the plant". The bather load on chlorine (`perBather` demand) exists only in `src/game/plant/sampling.test.ts`; displacement exists in standalone rigs (`balance-tank.ts` with its fixed sessions QUIET/PUBLIC/GALA, `jacuzzi-trial.ts`, `spa-balance-tank.ts`) that are not fed from `world.bathers`. The "behaviour experienced through the plant" half of the idea therefore needs the bather counts wired into chlorine demand, combined chlorine, pH drift, heat and water loss, and balance-tank displacement. That is a separate, worthwhile piece of work, and arguably comes before the ghosts, because without it the ghosts have no effect to explain.

## 2. The CCTV pipeline today

`src/toolkit/components/security/logic/cctv-signal.ts` (pure) defines a CCTV network: cameras `transmit` RGBA frames, monitors `receive` the latest and show snow after `SIGNAL_TIMEOUT` (1 s); a camera only transmits while some monitor `watch`es it. `FEED` is 96 × 72 pixels at `FEED_RATE` 12.5 fps. The single camera is `POOL_CAMERA = 'dev16-cam1'`.

`src/toolkit/components/security/views/cctv.ts` builds the camera (a PoolGuard housing with a 40° `PerspectiveCamera` inside) and the monitor (a desk, a domed screen showing a `DataTexture` with nearest filtering, so each feed pixel is a visible block, POWER, BRIGHT and CONTRAST).

The camera lives in dev16 (`src/toolkit/gallery/rooms/water-room.ts`, the duck pool). `transmit` renders the room's own scene from `cctv.view` into a 96 × 72 scissored corner of the room's canvas, `gl.readPixels` it to the CPU, and posts it to the network; the room then draws its own picture over it. The monitor is in the security office (`src/toolkit/gallery/rooms/plant/security-office.ts`). When the player is elsewhere, `main.ts` (`runUnseen`, the `pool-plant:run-room` event) builds dev16 hidden on its own canvas and keeps it running so its camera can send.

Cost: one extra full-scene render per frame sent, but only 6,912 pixels, so fill cost is trivial; the costs are draw calls (the whole scene again), a synchronous `readPixels` (a GPU stall, about 28 kB a frame), and, when the player is not in the watched room, keeping a whole hidden room (renderer, scene, water) alive. One watched camera is cheap. Many cameras, or a multi-camera switcher in the control room, multiply that by rooms kept alive.

Showing figures only on camera is straightforward because the camera renders the same scene as the player:

- Three.js layers: put the figures on a dedicated layer (say 5); enable it on `cctv.view.layers` only. The player's camera never has it enabled, so the player never sees them, even standing beside them; the camera does. Lights must also be enabled on that layer, or the figures use unlit/basic materials (which suits a ghost). This is the cleanest option and costs nothing when unwatched.
- Toggle `visible` on the figure group just before `renderer.render(scene, cctv.view)` and back after. Equally simple, slightly more fragile.
- A separate ghost scene rendered after the room's into the same scissor region with `autoClear = false`, depth kept, so the room's walls and water occlude them. Keeps ghosts entirely out of the room's scene graph; costs a second (tiny) pass.
- Post-process in the pure feed: since the frame is already a CPU `Uint8Array`, ghostliness (smear, dropout, ghosting with the previous frame, tearing) can be applied in a pure function in `cctv-signal.ts`, testable, no shaders.

One caution: reflections. The dev16 water uses a reflection/cube camera (`cubeCamera.update`); any reflection or refraction camera must not have the ghost layer enabled, or the player would see ghosts reflected in the water. Conversely, whether ghosts appear in the water on camera is a design choice.

Prerequisite: the real pool halls (`src/toolkit/gallery/logic/pool-halls.ts`, the lounge, Olympic and jacuzzi halls) have no cameras yet. Only dev16 has one. Cameras in the real halls, and a monitor or switcher that watches them, come first.

## 3. Available hazmat-suit figures

IP caution: the hazmat explorer of Kane Pixels' The Backrooms (and the "M.E.G." of the Backrooms wiki lore) is a specific creator's work; a recognisable copy (its suit, its yellow colour scheme with that specific look, its insignia) would be fan IP and should not be modelled or downloaded. A generic Level A encapsulated suit with a backpack or carried breathing set is a real piece of industrial safety equipment and is fine; the briefcase-sized life-support unit is close to a real escape set or a compact airline/SCBA case. Generic hazmat-suit figures exist in many games and stock libraries, so the archetype itself is safe.

Candidates found (licences checked on the listing pages where stated; confirm on download):

| Model                             | Where                                                                                                                     | Licence                                                                                                   | Size                                           | Rig / animation                                            | Notes                                                                                                                                                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Neven Unsali (.blend) by Djsedj   | https://opengameart.org/content/neven-unsali-blend                                                                        | CC0                                                                                                       | about 5k tris body                             | Rigged; no animations stated                               | .blend only (convert to glTF); includes a "centipede parasite" texture/part, an original character, to strip. Best clean licence found.                                                                                    |
| Hazmat Character by mcsteeg       | https://mcsteeg.itch.io/hazmat-character                                                                                  | Custom: free, pay what you want; personal and commercial use allowed, no redistribution as your own asset | Low-poly, PSX style (count not stated), 869 kB | Mixamo-compatible humanoid, no animations included         | PSX style suits a low-res CCTV look well. Bundling in a game is allowed; the source repo is public, so check whether a raw model in a public repo counts as redistribution (ask the author or keep it in a binary bundle). |
| Hazmat suit rigged character      | https://www.cgtrader.com/3d-models/character/other/hazmat-suit-rigged-character                                           | Paid, CGTrader royalty-free                                                                               | Game-ready                                     | Two rigs, 27 animations, FBX/GLB/Blend                     | Most complete, but paid and royalty-free licences usually forbid redistributing source files in a public repo.                                                                                                             |
| Hazmat Suit Rigged                | https://www.renderhub.com/superhive/hazmat-suit-rigged ; Military Hazmat Suit https://www.renderhub.com/cgfed/hazmat-suit | Paid, RenderHub licences                                                                                  | Varies                                         | Rigged (Epic skeleton on the military one)                 | Same caveat.                                                                                                                                                                                                               |
| Hazmat Toxic Cleaner Man          | https://www.fab.com/listings/4656ff75-260c-4d7a-9c88-116b8265cdf7                                                         | Fab standard licence (check)                                                                              | Stylised                                       | Body and face rig                                          | Same caveat.                                                                                                                                                                                                               |
| Animations: Mixamo                | https://www.mixamo.com                                                                                                    | Free with Adobe account, royalty-free in games; raw files may not be redistributed standalone             | n/a                                            | Walking, Swimming, Treading Water, Sitting, Idle and so on | Works with any Mixamo-compatible humanoid (mcsteeg's). Bundle baked into the game's own .glb, not as loose files.                                                                                                          |
| Animations and bodies: Quaternius | https://quaternius.com (Ultimate Animated Character Pack; Universal Animation Library)                                    | CC0 (per author; one Sketchfab mirror says CC-BY, so confirm on quaternius.com)                           | Low-poly                                       | Large shared-skeleton clip sets in glTF                    | No hazmat suit, but a CC0 body and clips that a procedural suit shell could be skinned over. Kenney's Animated Characters (CC0) is a similar fallback.                                                                     |

Not found: anything on poly.pizza, Kenney or Quaternius that is specifically a hazmat suit, nor a confirmed CC0/CC-BY one on Sketchfab (https://sketchfab.com/3d-models/project-yellow-363520643f1449dca4c857d54cd8e6fd is a fan design after someone else's concept, licence unverified; avoid).

Loading: the project builds almost everything procedurally and the external-script rule (approved CDNs only) does not cover models; a glTF would be bundled under `public/` or imported through Vite, loaded with three's `GLTFLoader` from the installed `three` package. Any copied asset should be recorded like reused code (by analogy with `doc/reuse-inventory.md`), with its licence and source.

## 4. Design options

### Option A: procedural low-poly ghost, built in code (recommended)

A figure made the way the project makes everything: a few boxes, capsules and cylinders for a baggy encapsulated suit (hood with a wide visor, gloves, boots, tape at the wrists), and a briefcase life-support unit in one hand with a hose up to the hood. Perhaps 300 to 800 triangles, one or two materials. At 96 × 72 a figure on the far poolside is a handful of pixels tall, so detail beyond silhouette is wasted: the silhouette (bulky body, hood, visor glint, the case) is what reads.

Animation without a rig: a small pure pose function in a `logic/` folder (`ghostPose(activity, phase)`) gives joint angles for walk (legs and arms swinging, case swinging), swim (horizontal body, alternating arm strokes, half under the surface, case trailing or towed), sit (seated in a jacuzzi seat, bobbing, case on the coping beside them) and stand (idle sway). The view applies the angles to a hierarchy of groups (hips, knees, shoulders), as the duck's `duckAt` drives the duck. Cheap, deterministic, testable, and no licence questions. With 312 possible Olympic swimmers, an `InstancedMesh` per body part (or a capped number of figures) keeps draw calls down.

Effort: moderate (a figure, a pose module with tests, placement logic). Risk: low; the look may be less convincing up close, but nobody sees it up close. Fits every rule: built here, pure logic separated, no external assets.

### Option B: a licensed rigged model with Mixamo or Quaternius clips

Take the CC0 Neven Unsali model (strip the parasite) or mcsteeg's PSX hazmat, retarget Mixamo or Quaternius walk, swim, sit and idle clips, export one .glb, load with `GLTFLoader`, play with `AnimationMixer`, one mixer per figure or shared clips on instanced skinned meshes.

Effort: moderate to high (asset conversion, retargeting, adding a briefcase, a skinned-mesh pipeline the project does not have yet). Risk: licensing in a public repository (only the CC0 one is clean), a new loader and asset type, skinned-mesh cost for many figures, and a style clash with the procedural world. Gives the most natural motion.

### Option C: billboard or sprite figures

Pre-rendered or procedurally drawn sprite sheets (a few frames each of walk, swim, sit) on camera-facing quads. At 96 × 72 they would look nearly the same as 3D figures and cost almost nothing, so a whole Olympic pool of 300 is trivial. Effort: low. Risk: they look flat when the camera looks down steeply, and frames need making (they could be rendered once from Option A's figure). A good fallback for crowds even if A is used for near figures.

### Option D: implied presence only

No figures: the camera shows disturbances, wakes on empty water, wet footprints appearing on the poolside, jacuzzi water displaced, a lane rope moving, the feed smearing where something should be. Effort: low to moderate. Very eerie, no IP or modelling risk, but loses the owner's hazmat figure. Could be combined with A as the "bad signal" state.

### Shared pieces, whichever option

Mapping counts to figures: keep the bather model as the truth (counts per pool) and derive figures from it, never store figures in the world. A pure function `ghostsFor(pool, bathers, time, seed)` turns `now` into a list of figures with deterministic identities, so that when the count rises by one a new figure appears (entering from the changing-room door, walking the poolside, wading the footbath) and when it falls one leaves, rather than the crowd reshuffling every frame. Identity can come from a per-pool ring buffer or from hashing arrival order; it need not be saved, since a reload re-deriving a plausible crowd is fine. Cap the drawn number (say 40 in the Olympic pool, scaled down with a proportional fill) if cost demands, keeping the proportion visible.

Activity split: in the Olympic pool most are swimming in lanes, a few walking the poolside or standing at the ends; in the lounge, a mix of wading, standing and walking; in the jacuzzi, sitting in its eight seats (one per seat, matching `CAPACITY`); in the footbath, walking through. The bather model does not distinguish poolside from water, so the proportions are a view choice, or a small addition to the model.

Paths: pure path data per hall in a `logic/` module: poolside loops (offset from the coping, avoiding the plant door), swim lanes (lane centres, length from the pool's geometry, turn at each end, swim up one side and down the other, speeds varied per figure), jacuzzi seat positions and the entry steps. These come from the pool halls' existing geometry (`pool-halls.ts`), so a hall change moves them.

Ghostly look on CCTV: a pure post-process on the received frame in `cctv-signal.ts` or the monitor: figures drawn semi-transparent or additive, pale; temporal smear (blend with the previous frame only where the ghost layer drew, which needs a mask render or a second tiny pass); figures dropping out for a frame or two; a slight horizontal tear or roll when many are present; the time-lapse look of an old multiplex recorder (lower frame rate per camera). A ghost-layer mask (render the ghost layer alone into a second 96 × 72 target) makes all of these targeted at the figures rather than the whole picture. A bonus: a "snapshot" or video printer could freeze a frame with figures in it.

Plant load: wire `world.bathers.pools[*].now` into chlorine demand and combined chlorine (the `perBather` term already sketched in `sampling.test.ts`), pH, heat, evaporation and balance-tank displacement (`balance-tank.ts`'s `displacement` and `batherLag`, today fed by a fixed session). This is pure `src/game` work, tested beside it; if it changes the world's shape, bump `WORLD_VERSION` with a migration.

Order of work, following the project's rules: (1) bather load on the plant in `src/game`; (2) the ghost figure and its pose logic modelled in a dev room first, ideally dev16, which already has the camera, the monitor in the security office and a pool, swapping or joining the ducks; (3) the camera-only layer and the CCTV ghost effects there; (4) cameras in the real halls and a monitor or switcher; (5) mapping counts to figures in the real halls. Rooms only show world state; figures are derived each frame from `world.bathers`, so they carry on correctly between rooms and reloads.

## 5. Open questions for the owner

1. Should the bathers' load on the plant (chlorine demand, chloramines, displacement, heat) be wired into the world before the figures, so the ghosts explain something the player can already measure?
2. Procedural figure built in code (Option A), or a licensed rigged model (Option B)?
3. How literal should the figure be: a generic Level A suit with a visor and a carried case, or closer to the Backrooms explorer look (with the IP risk that brings)? What colour suit?
4. Should the figures look ghostly (transparent, smearing, dropping out) or solid and ordinary on the screen, the strangeness being only that the hall is empty in person?
5. Should they appear in reflections on the water on camera, and should the player ever see any trace in person (wet footprints, wakes, the jacuzzi water level moving)?
6. Where are the cameras: how many per hall, fixed or pan-tilt, and where are they watched (the security office, the control room, a multiplexer or switcher)?
7. One figure per bather up to the full 312 in the Olympic pool, or a capped, representative number?
8. Should the figures react to the plant (fewer when the water is cold, leaving when chlorine fails, all leaving at closing), beyond what the count already does?
9. Does the briefcase unit do anything: is it set down at the poolside while they swim, carried into the water, or connected by a hose?
10. Should recordings exist (a time-lapse VCR or a video printer) so the player can review who was there earlier?
11. Do the figures ever acknowledge the camera (turn and look at it), or is that a line not to cross?
