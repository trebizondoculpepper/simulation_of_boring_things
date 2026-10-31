# 115: The crosshair shows which way a knob will turn

The owner, 2026-10-31, a quality-of-life feature agreed in discussion. Read the root `CLAUDE.md` first (all input through `src/toolkit/controls`, `logic/` folders pure and tested, displays redrawing only on change), then `src/toolkit/controls/CLAUDE.md`.

## The request

Every knob in the game can be turned, by one rule (`stepKnob` in `src/toolkit/components/core/views/rotary-knob.ts`, `knobDirection` in `src/toolkit/controls/input/knob-turning.ts`): a click or tap on a knob's left half turns it anticlockwise (down), on its right half clockwise (up), one detent at a time, stopping at its end stops; a gamepad's LB and RB turn the aimed knob down and up. Nothing on screen says so. The crosshair should show what a click will do: hovering a knob, a curved turn arrow stands above the target ring, pointing clockwise on the knob's right half and, mirrored, anticlockwise on its left half.

**Colour**: green when the turn is possible, red when it is not (the knob is at its end stop in that direction, or latched: a locked selector refuses every turn).

## Scope

In: the shared part kit's rotary knobs and rotary selectors (`src/toolkit/components/core/parts/parts.ts`): `potentiometer` (a knob, 0 to 1 in detents) and `selector` (two-, three- and four-position, lever, XB4 and cam, and the changeover switch's three-position handle, `handle: 'changeover'`). Both are built on `createSelector` (`src/toolkit/components/core/logic/world/components.ts`), which already knows its position, its ends and its latch.

Out for now, recorded in `TODO.md` as follow-ups:

- the rotary dimmer, dial thermostat and radiator valve head (`src/toolkit/components/architectural/parts/building-parts.ts`);
- the dosing pump's stroke-length dial and its relief/bleed valve (`src/toolkit/components/plant/views/motor-dosing-pump.ts`);
- the key switch (`keySwitch` in `parts.ts`), which can refuse while latched;
- check whether the gas cylinders' handwheel valves (`gas-cylinder.ts`) are click-turnable, and cue them if so;
- touch: no crosshair and no hover, so no cue; a cue from the finger's first point is a possible follow-up;
- the hand-built knobs of `src/rendering/effects-console.ts`, `src/rendering/exhibit-panel.ts` and `panel-switchgear.ts`, which call `stepKnob`/`stepSelector` themselves.

## What was checked (round one)

- The crosshair is one DOM element made in `createFirstPerson` (`src/toolkit/controls/input/first-person.ts`) and styled each frame: a plain light ring with a dark edge for nothing, amber when something usable is aimed at (`handling.aimed()` or the room's `options.aimed()`), green ring or red × while carrying a part that fits or does not (`handling.targetFeedback`). It is shown only while the pointer is locked, on a gamepad, or while carrying; with a free mouse cursor the system cursor stands in for it.
- Rooms' `aimed()` is `Boolean(useAt(0, 0))`: each room raycasts its own groups and returns a closure. The closure calls `knobDirection(at, hit.point, camera)` only when used, so nothing can be learnt from `aimed()` without changing some thirty rooms. A dry-run use is not safe.
- `createSelector.turn` refuses while latched and stops at either end; the views' `stepKnob`/`stepSelector` are the same rule for hand-built knobs.
- The selector's use mesh is `view.knob`; the potentiometer's is its whole `view.group` (so its ring counts).

## The design

1. **The parts mark themselves.** `createSelector` gains `canTurn(direction)`, pure: false while latched, false at the end in that direction. The kit's `selector` and `potentiometer` mark their use object with a turnable cue (`markTurnable(object, { canTurn })`, in `src/toolkit/controls/input/knob-turning.ts`, beside `knobDirection`), held in a module-level registry and removed when the part is disposed. The shaft is the marked object itself, as `knobDirection` is already given in the rooms.
2. **The controls find it, without the rooms.** `createFirstPerson` already has the camera and (in every room that passes `scene`) the room's scene. A few times a second (`INSPECT_EVERY_MS`, as the inspection line does), only while a cue could be shown, it raycasts the registered turnables that belong to its scene at the aim point (the centre, or the free cursor); if one is hit within reach, it raycasts the scene up to that distance and accepts it only if the first visible mesh hit is part of that knob, so a knob behind a wall or a cabinet's glass shows nothing. With the crosshair at the centre the room's own `aimed()` must also be true, so the room's reach and hit rules decide (rooms reach 3 m or 4 m); with a free cursor the probe reaches 3 m, the shorter (Codex's review, `doc/plans/115/codex-critique.md`). No room changes.
3. **The rule, once.** A pure module, `src/toolkit/controls/logic/turn-cue.ts`, decides the cue: from the projected aim point and knob centre, the side (the same strict `<` as `knobDirection`, so exactly at the centre is clockwise), and from `canTurn` the colour; for a gamepad, both directions. It also says whether the cue changed, so the DOM is touched only on change.
4. **Drawn in the DOM, cheaply.** A small inline SVG in its own element, placed over the crosshair (or the free cursor): a curved arrow above the ring, light-on-dark in the reticle's high-contrast style (a dark outline under the coloured stroke), green `#44df70` or red `#f04b43` as the carrying cues already use. It is rebuilt only when the cue changes. With a free cursor it stands above the cursor. No animation, so reduced motion needs nothing.
5. **Gamepad.** There is no pointer side: both arrows show, anticlockwise on the left labelled LB and clockwise on the right labelled RB, each green or red. (A, at the centre, turns by the side the centre falls, which the arrows do not claim.)
6. **Carrying** a part keeps the carrying cue: no turn arrow while holding.

## Order of work

1. `canTurn` on `createSelector`, tested.
2. `turn-cue.ts`, tested.
3. The registry and `markTurnable`; the kit's `selector` and `potentiometer` mark themselves.
4. The probe and the arrow in `first-person.ts`.
5. Screenshots: a knob hovered on its right (green clockwise), its left (green anticlockwise), at an end stop (red).

## Tests

- `createSelector.canTurn`: both ways mid-travel, not past either end, nothing while latched.
- `turn-cue.ts`: side from the projected points, centre counts as right, colour from `canTurn`, gamepad gives both, change detection.
- The registry: marking, unmarking on dispose, filtering by scene.

## Acceptance

- Hovering a kit knob or selector shows a green arrow pointing the way a click will turn it; at an end stop or latched, red.
- Off a knob, the crosshair looks exactly as before; carrying, the carrying cues are unchanged.
- No room source changes; the probe runs at most ten times a second and only while the crosshair or free cursor is over the canvas.
- Typecheck, lint, format, tests and build pass.

## Status

Done, 2026-10-31: `canTurn` on `createSelector`; `src/toolkit/controls/logic/turn-cue.ts`; the registry (`markTurnable`, `turnablesIn`, `turnableOf`, `visibleAll` in `knob-turning.ts`) marked by the kit's `selector` and `potentiometer`; the probe and the SVG cue in `first-person.ts`. No room changed. Tried in dev0 (`?room=dev0&view=controls`) with a free cursor: green clockwise on the SPEED knob's right, green anticlockwise on its left, red against the four-position selector's end stop. The follow-ups are in `TODO.md`.
