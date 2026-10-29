# Drawing the museum for less (2026-10-29)

What we found about why the museum's halls are expensive to draw, and the options discussed with the owner for drawing them more cheaply. It follows the [performance pass](2026-10-29-performance-pass.md) and goes with the [model cost ranking](2026-10-29-museum-model-costs.md).

## Why Hall 1 was slow on High

While the player stands in Hall 1, two whole halls are drawn every frame: Hall 1, and the real Hall 2 room seen through the archway, each with its own renderer and its own post-processing chain (multisampled half-float target, ambient occlusion, bloom). `startSeeing` in `src/main.ts` runs the neighbour's whole renderer after the top room's and only clips it at the doorway plane; `museum-hall-room.ts` gives every hall the same full chain.

Measured headless (Chrome with the GPU, 1800 × 1100 at 2×): on Low, Hall 1's own canvas made about 655 draw calls a frame and the Hall 2 canvas under it about 1,180, so two thirds of the work was the room underneath. High doubled it to about 3,700, because the ambient occlusion pass draws each scene again for its normals, once in each renderer. Ruled out: shadows (none in the museum), lights (Halls 0, 1 and 2 have the same four unshadowed point lights) and transmission materials (none).

This duplicates work: each hall already draws copies of its neighbours' exhibits in its own scene, so Hall 2's exhibit was drawn twice.

## Done: ambient occlusion only in the hall walked in

The owner's proposal (commit bfbe2976): a hall drawn under another through its archway has its ambient occlusion turned off; it comes back on when the player walks in (`followEffectSettings` returns `allowAmbientOcclusion`, used by the museum hall's `suspend`, `resume` and `enter`). Hall 1 on High: 617 to 420 draw calls per render callback, 6.9 to 5.5 ms. Only the museum halls do this so far; 14 other rooms run ambient occlusion and could follow.

Still open: the real neighbouring hall drawn underneath on top of its exhibit's copy. Not drawing it at hall-to-hall archways would save about 60% of Hall 1's draws.

## The most expensive models

See the [ranking](2026-10-29-museum-model-costs.md). The headlines:

- The control desk in Hall 9 (198 meshes), Hall 4's analyser readout board (184), pump base channels (147) and dosing desk (140), Hall 1's boiler panel (136) and Hall 2's pump panel (130) lead.
- Live displays keep the counts high: each canvas texture is its own draw, so it cannot be merged. Hall 9's exhibit has 289.
- The neighbour copies cost more than a hall's own models: from Hall 7's entrance, 262 own draw calls against 1,255 for the copies.
- Far versions of the top 25 models would save about 1,175 draw calls; of all 90 models with 20 or more meshes, about 2,230; a merged copy of a whole exhibit for neighbours, 65–70% of its draws.

## Option: near and far versions of a model

The toolkit has no level-of-detail concept today: nothing uses three.js's `LOD`, and "variants" (`withVariant`, `EXCHANGER_VARIANTS`) are different physical kinds of a machine, chosen by the layout scorer. The museum's empty stand-in halls (`museum-empty-hall.ts`) are the same idea done by hand for whole rooms.

It fits the toolkit well, because a component view is a `create…View(kit, …)` returning a `group` and an `update`, and the model's state is in the world, not the view. A wrapper could place a component as `near` (today's build), `far` (generated from the near build: meshes merged per material, parts below a size dropped, displays frozen to a snapshot or a flat face; a component may supply a hand-made one), or `auto` (a three.js `LOD` of both, by distance, its `update` run only on the near version while close). The placing code picks: a hall's own exhibit `auto`, a neighbour's copy `far`, a dev room `near`. Moving parts are frozen or left unmerged in the far version; signal lamps may be kept as coloured points. Proposed order: the wrapper in a dev room on the top two or three models, then the top models, then whole exhibits for the copies.

## Option: one scene for the whole ring

The owner's idea: with far versions, the ring could be one ordinary scene holding all ten halls, distance choosing the detail, retiring the room drawn underneath, the neighbour copies with their fade-in, and the empty stand-in halls. To handle: lights (ten halls of four point lights is 40, and every material pays for every light in a scene, so a hall's lights must be on only when near); no occlusion culling in three.js (halls round a corner are still drawn when faced, so far versions must be cheap enough to draw the whole ring); all ten exhibits built at once (memory and loading). Exhibit logic is unaffected: it already runs and resets by which hall the player is in. Do it only after far versions work, measured against the present museum before anything is deleted.

## Option: halls whose archways do not line up

The owner noticed that because the archways line up, the straight runs (0, 1, 2 up the west; 2 to 5 along the north; 5, 6, 7 down the east; 7 to 0 along the south) show halls two and three away. Staggering the building (pushing middle halls out, alternately) was considered.

Pushing one middle hall out is not enough: it still shares the same stretch of wall with both neighbours, so both archways land there and line up. The neighbours must meet it at opposite ends.

Staggering cannot make a view past the next hall impossible, only narrow it. Each hall is a convex rectangle, so every point of one archway sees every point of the other, and the line through both carries on into the halls on either side, however the halls are offset, corners included. The 0.6 m walls trim the sliver but do not close it with 3.6 m archways and halls 14–21 m deep.

What does make it impossible is something solid between a hall's two archways: a freestanding screen wall a metre or two inside each archway, walked round, as real museums do; a natural place for a hall's title and introduction panel. With screens, "draw your hall and its neighbours" is true by geometry and a plan test can prove it. Staggering could still shorten the screens. The owner has not yet decided.

## Next: displays drawn only within reading distance

The owner, 2026-10-29: a display should be drawn as nothing more than a flat rectangle unless the player is close enough to read it, within about 8 m. See `src/toolkit/components/core/views/display-reach.ts`.
