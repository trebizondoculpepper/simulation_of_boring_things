# Dev11 settings sharing and pillar fittings

Added the requested “Copy settings” overlay to dev11. It copies formatted JSON containing the effective look, six knob shares and factors, the preset, enabled ingredients, rendering pixel ratio and viewpoint. It reads the current controls and console overrides at click time, shows success or clipboard failure, and is removed with the room. `poolRoom.settings()` exposes the same snapshot for inspection. The browser displayed the successful copy confirmation; the automation clipboard reader returned an empty string, so clipboard payload retrieval through that automation interface was not verified.

Added 140 mm radius tiled coving around every column base, tangent to the floor and column faces, with rounded external corners. Column collision footprints now include the coving. Prototyped up/down pillar sconces, then removed them at the owner's request because their rendering cost was undesirable. The final room has no sconce models, lights or related settings. No Encabulator files were copied.

Visually checked the overlay, copy confirmation, curved bases in Chrome. Added a geometry regression checking the cove envelope and outward/upward surface normals.

Final validation after removing the sconces: typecheck, lint (three existing warnings), all 515 tests, production build, changed-file formatting and `git diff --check` passed. The whole-repository format check still reports the pre-existing issue in the untouched `doc/research/benfield-mimic-annunciator-reference.md`. Chrome visual inspection confirms there are no sconces or their light patches; column coving and the copy overlay remain.

The owner selected their favourite snapshot: sunlight, with exposure 0.3, light 0.4, bounce 0.6, bloom 0.4, caustics 0.1 and bump 0.3. Made these dev11's initial look and knob values in `pool-looks.ts`; `?look=` still selects an alternate look. The snapshot's preset and enabled effects already match the implementation. Also lifted every dev11 deck gully by 1 mm at the owner's request to prevent rim/deck z-fighting.

Before committing and synchronizing main, formatted the existing research-note table in `doc/research/benfield-mimic-annunciator-reference.md` so the required repository format check passes. All five required checks now pass, including 515 tests; lint retains three existing warnings and build retains its large-chunk advisory.
