# Pink pool study and the replacement pool-room ring

The supplied Jared Pike image became `pike_pink_pool`: a separate walkable room with pink square tiles, a faceted stepped ceiling, a polygonal blue basin with concentric submerged treads, and two recessed openings with warm and dark ends. The opening shapes and light contrast are architectural cues, not connections in the room graph.

The main index now links to `poolrooms`, a second instance of the dev11 pool-room scene, plus Captain's Quarters, the earlier Pike room and the pink Pike room. The original `dev11` remains reachable from the development list. The four replacements form a ring: `poolrooms` → Captain → Pike → pink Pike → `poolrooms`.

The ring's spring-door portals were replaced by faceted, lit tunnel entrances. Each passage preloads its destination when the walker enters its inner section and switches rooms near its obscured end. Arrivals are placed inside the corresponding tunnel, facing into the new room. The development rooms keep their existing doors.

Removed the two west-end raised basin strips and the small protruding edge nosing pieces from the dev11 geometry, which also updates the replacement copy. The visible tiled pool structure remains.

Verification: full TypeScript build, lint and 679 tests passed. Inspected the pink room and copied room in Chrome. A manual walk through every tunnel direction remains useful for judging the transition visually.

## Corridor prototype and room codes

The four replacement pool rooms now use room IDs PR_A, PR_B, PR_C, and PR_D. Their dry connector rooms use CR_AB, CR_BC, CR_CD, and CR_DA; the index links to each. CR_AB is the first reviewable tunnel prototype: a rounded rectangular tiled cross section, a bevel at each floor corner, and flush wall lights aimed across the passage. Both ends use the same profile and the pool-room walls are cut to match. The other connector profiles are present as studies pending visual review. The far ends still read as grey until their adjacent room is entered, so visual continuity at the handoff needs another pass. Typecheck and 680 tests passed; browser inspection confirmed the floor bevel on both sides after closing the profile polygon.

## Simplified to one room

The owner rejected the multi-room direction and asked for the minimum: PR_A only. Deleted the PR_B/PR_C/PR_D renderers and plans, all four corridor renderers and tunnel geometry, and removed those routes from the room registry and index. PR_A now has uninterrupted solid perimeter walls and no portals. Its development lectern, collision box, and lectern instruction are shown only in dev11. The original dev11 study and other development rooms remain available. Build, lint, and 675 tests pass; a browser view of PR_A confirmed the pool hall renders without the lectern or tunnel openings.

## PR_A position copy

PR_A's existing overlay now presents a Copy position button. It copies the walker’s x/z coordinates in metres, yaw in degrees, and nearest compass direction with the coordinate convention (+x east, +z south), so the owner can paste a precise candidate door location. Dev11 keeps its Copy settings button. Typecheck passed and browser accessibility inspection showed Copy position in PR_A.
