# 113 (b): the console's physical design and layout in Hall 4

## The console

A low sit-up-and-beg desk 2.4 m wide, 0.8 m deep and 0.9 m high, its top raked 15° toward the visitor, in pale grey laminate with a brushed-aluminium edge, built by Penfold Controls and carrying the Penfold mark in its top right corner as every desk in the game does. Set flush into the raked top, three touch screens in a row, each 0.62 × 0.465 m (4:3), in black glass bezels with a thin chrome trim; each screen's surface is a plane mapped to its canvas texture (`createCanvasTexture(512, 384, 'touch')`), its material unlit (`MeshBasicMaterial`, tone mapping off) so it glows as a screen does. The screens are, left to right, Scenario, Chemical and Dose, as mission 113 orders them. Centred in front of them on a raised yellow-edged plinth on the desk's front lip, a big red DOSE mushroom button (a 90 mm head on a black collar, the word DOSE engraved on a plate beneath), which travels 8 mm when pressed and springs back. On the bezel bottoms a small badge: the software maker's mark and product name.

## Where it sits in Hall 4

It replaces the old desk (M4-DS1) at `DESK` in `museum-4-layout.ts`, front and centre, 2 m in front of the tank stand, its long side across the hall and the visitor standing on its south side facing the tanks (north), so the tanks and the mimic above them are seen over the screens. The desk's footprint is widened in the layout data to 2.4 m and its walking solid updated with it; the layout test that keeps the approaches and columns clear is rerun.

## What goes from Hall 4 (the owner's decisions)

The teleprinter (M4-TP1), its printer foot and its log feed; the RESET pedestal and its "don't worry" lectern; the TIME panel, its LCD and the LAB TIME clock; the swimmers controls; the challenge panel under the Challenge Cards poster (its job moves into the scenario screen, see (c)). The poster stays as set dressing. A small brass plaque on the wall between the arches reads: "This laboratory runs 1,000 times faster than real life: an hour passes in under four seconds, to make life bearable."

## Binding to Hall 4's model

Per `doc/museum-hall-model.md`, the console is an engineering component and must be drawn from the hall's model. The hall's instrument list (`INSTRUMENTS` in `museum-4-lab.ts`) gets the console as M4-DS1 (the desk's tag carries on: it is still the hall's dosing desk) and the teleprinter's entry goes. The console's group is marked with `markComponent(group, { tag, model: 'instrument:desk' })` as the old desk was, so every mesh beneath it (screens, bezels, DOSE) is bound through it; the plaque is marked decorative. `museum-bindings.test.ts` must still find museum4 fully bound and every instrument drawn.

## The dev room

Before Hall 4, the console is tried in dev57 ("DEV57 · THE DOSING CONSOLE"), a plain room with the console in the middle, reached by `?room=dev57`. `?scenario=free|challenge|holding|won|out` sets the scenario screen's demonstration state, and `?scenario=cycle` cycles them every four seconds. The dev room's console is not bound to Hall 4's lab: it uses the same pure state with a stub engine, so it can be shown in any state.

## Input

All touches go through `src/toolkit/controls`: the first-person walker's `use(x, y)` and `aimed()` options. The room raycasts the pointer; a hit on a screen's plane gives its texture coordinates (`hit.uv`), which become canvas pixels and go to that screen's pure hit test; a hit on DOSE dispatches the dose. `aimed` lights the crosshair over any live region. No screen binds a key.

## Performance

The console is a bench part (`part:dosing-console` in `src/toolkit/gallery/views/component-bench.ts`), driven by a script that changes the hold clock once a lab minute, and it must sit inside `DEFAULT_BUDGET`.

## Revision after Codex's critique

- Accepted: the binding uses the existing instrument pattern (`{ node: 'desk' }` through the hall's `instrument(...)` helper), not an invented `instrument:desk` id.
- Accepted: removing the teleprinter removes its creation, registration, log feed, reset sheet, tag, footprint and stand together.
- Accepted: the screen planes are registered as uses themselves, nothing sits in front of them, and the hit's UV is carried to the screen's hit test; `aimed` is true only over a live region.
- Accepted: dev57 is added to `dev-room-links.ts` and `main.ts`'s dispatch; its demonstration flag is `console=` (not `scenario=`, which `main.ts` already uses for world scenarios).
- Accepted: the benchmark drive changes selection, size and the hold together, so all three screens are exercised.
- Resolved conflict: mission 113 keeps a challenge panel on the wall; the owner's later decision (2026-10-31, through the coordinator) allowed moving challenge choice and level into the UI. Chosen: into the UI (see (g)).
- Deferred: a reach and sightline test at the standing position; checked by screenshots instead for now.
