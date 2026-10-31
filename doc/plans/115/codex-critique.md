# Mission 115: Codex's critique of the plan

Codex (`codex exec`, read-only), 2026-10-31, given `doc/prompts/115-knob-turn-crosshair.md` and the code it names. Its critique verbatim, then what was done with each point.

## The critique

- **The cue could disagree with a click.** [Plant rooms](/Users/salimfadhley/workspace/simulation_of_boring_things/src/toolkit/gallery/rooms/plant-room.ts:650) use the first hit within 4 m; [shell rooms](/Users/salimfadhley/workspace/simulation_of_boring_things/src/toolkit/gallery/rooms/shell-room.ts:520) use 3 m. A separate scene raycast with a fixed 4 m reach can show an arrow for a knob the room cannot use. The dosing console’s screen path is different again. **Recommendation:** let a room’s existing hit lookup return an optional turn cue with its use result; keep screens and other non-kit paths untouched.

- **A free cursor cannot use an arrow placed inside the current crosshair.** [First-person controls](/Users/salimfadhley/workspace/simulation_of_boring_things/src/toolkit/controls/input/first-person.ts:1586) hide that element when the mouse is free. **Recommendation:** give the cursor arrow its own overlay, positioned from `hoverPosition`, and clear it on pointer leave.

- **Mark the exact use target, including its child meshes.** The selector’s target is sometimes a shaft and sometimes the whole group; the potentiometer uses its group. A multi-part handle may be hit on any child. **Recommendation:** resolve the hit upward to the marked `uses` object, then pass that same object and hit point to [knobDirection](/Users/salimfadhley/workspace/simulation_of_boring_things/src/toolkit/controls/input/knob-turning.ts). Test rotated panels and an edge-on view; suppress the arrow if the projected halves are too close to distinguish.

- **Visibility and occlusion need the room’s rules.** A scene-wide raycast can include invisible meshes and geometry outside a room’s use root, while glass or screen meshes may intercept it. **Recommendation:** use the room’s first eligible hit, checking visible ancestors; never let a marked knob behind the dosing console’s screen claim the cue.

- **The model work is partly done.** [createSelector](/Users/salimfadhley/workspace/simulation_of_boring_things/src/toolkit/components/core/logic/world/components.ts:316) already has `canTurn`, and its turns stop at the ends rather than wrap. **Recommendation:** reuse it, test both end stops and the latch, and change no selector semantics. At the exact projected centre, use `>=` for clockwise, matching `knobDirection`.

- **Touch has no hover position.** A finger taps where it first went down; a centred arrow would predict a different turn. **Recommendation:** show a direction cue only while a touch point is available, using its initial position, and hide it during drag or pinch. Keep gamepad’s two independently coloured LB/RB arrows.

- **Gate and clear cues with input state.** [First-person controls](/Users/salimfadhley/workspace/simulation_of_boring_things/src/toolkit/controls/input/first-person.ts:1303) already suppress inspection while carrying, flying, climbing, or behind UI. **Recommendation:** use those gates for the arrow too, and clear it immediately on room handoff, disposal, or a state change; carrying keeps its existing feedback.

- **Avoid a global scan of every knob and the whole scene at 10 Hz.** Large plant scenes and multiple live rooms make that cost and registry ownership significant. **Recommendation:** probe only the active room’s hit path, cache the last cue, and update the DOM only when it changes. If a registry is retained, filter by active room and remove entries through [Part.dispose](/Users/salimfadhley/workspace/simulation_of_boring_things/src/toolkit/components/core/parts/parts.ts:120).

## What we did with it

- **Reach and the room's own rules (accepted, without editing rooms).** Rooms reach 3 m (shell rooms) or 4 m (plant rooms), and each has its own hit path. Returning a cue from each room's lookup would mean editing some thirty rooms, which the plan set out to avoid. Instead: with the crosshair at the centre (pointer locked, or a gamepad), the cue also needs the room's own `aimed()` to be true, so the room's reach and its first-hit rules decide; with a free cursor (where `aimed()` says nothing about the cursor) the probe uses the shorter reach, 3 m, so a cue may be missing at 3–4 m but is never shown for a knob the room cannot reach.
- **A separate overlay for the free cursor (accepted).** The cue is its own element, placed from `hoverPosition` with a free cursor and cleared when the cursor leaves the canvas.
- **Mark the exact use target (accepted; already so).** The kit marks the very object it puts in `uses` (the selector's `view.knob`, the potentiometer's `view.group`); a hit on any child resolves upward to it. Suppressing the cue for an edge-on knob is rejected: `knobDirection`'s left and right are still defined, and the cue says what a click will do.
- **Visibility and occlusion (accepted).** Hidden ancestors exclude a knob and an occluding hit; only meshes count as occluders; the first visible mesh hit up to the knob must belong to that knob.
- **`canTurn` (noted).** It was added for this mission while Codex read the code; it changes no selector semantics, and its tests cover both ends and the latch. At the exact centre the cue is clockwise, matching `knobDirection` (`turnSide`, shared by both).
- **Touch (deferred).** Touch shows no crosshair and has no hover; the cue is not shown for touch, recorded as a follow-up.
- **Gating (accepted).** The cue uses the inspection line's gates (not carrying, flying, climbing, held, behind the menu, nor while following another room) and clears at once when they close and on disposal.
- **Cost (accepted in part).** The registry is filtered by the room's own scene and entries are removed by the part's disposal; the scene-wide raycast runs only once a registered knob has been hit, at most ten times a second, capped at the knob's distance, and the DOM changes only when the cue's key changes.
