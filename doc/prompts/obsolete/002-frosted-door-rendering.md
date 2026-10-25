# 002: Draw the rooms behind doors cheaply

Superseded (2026-10-25) by the restart of the building in `b0cef39` (2026-10-21), which deleted the leisure centre, its frosted doors and the renderer this targets (`src/rendering/facility-world.ts`, `src/scene/doors.ts`, `src/game/doors.ts`) before it was built. Rooms are now separate scenes handed over at their doors; their loading cost is the "Incremental room preparation" item in `TODO.md`.

## Briefing

The leisure centre (`src/rendering/facility-world.ts`, `src/scene/facility.ts`, `src/scene/doors.ts`, `src/game/doors.ts`) keeps every room model loaded and shows the current room and its neighbours (`visibleRooms`). The frosted sliding doors use a `MeshPhysicalMaterial` with `transmission`. In three.js 0.186 that makes the renderer draw every opaque object in view a second time, every frame, into a render target the size of the screen (`renderTransmissionPass` in `WebGLRenderer.js`; `transmissionResolutionScale` defaults to 1), then mipmap it for the blur. Wherever a frosted door is in view, the whole scene is drawn twice at full resolution, to produce a picture that is then blurred almost to nothing.

The owner wants the rooms behind doors drawn as cheaply as what can be seen of them allows:

| What is between the player and a room | How the room is drawn                                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Nothing (the current room)            | In full.                                                                                                |
| An open door (any kind)               | In full, as now: it can be seen clearly.                                                                |
| A closed frosted door                 | Only its large merged meshes, at 1/16 of the screen's resolution, blurred, and shown through the glass. |
| A closed opaque door                  | Not drawn at all. Its models stay loaded, so opening the door shows it at once.                         |
| Two or more doors, of any kind        | Not drawn at all.                                                                                       |

Keep every room's models loaded, as now. Only what is drawn changes.

## Suggested approach

Adjust where the code requires, and say why in the report.

1. **Replace transmission on the frosted glass.** Give the glass an ordinary material that samples a small blurred texture of the room beyond in screen space (the fragment's screen position into the texture), tinted and lightened as frosted glass looks. Do not use `transmission`.
2. **Render the room beyond into that texture.** One small render target per frosted door in view, 1/16 of the canvas in each dimension (try 1/8 if 1/16 looks wrong, and record which). Draw only that room, from the player's camera, clipped at the door's plane so nothing on the player's side is drawn into it. Blur it: a two-pass Gaussian at that size costs almost nothing. Use `LinearFilter` sampling when it is stretched over the glass.
3. **Draw only large merged meshes into it.** The rooms already merge static meshes; mark or select the large ones, for example by bounding-sphere radius above about 0.5 m, so walls, floors, ceilings, pools and big plant are drawn and small detail is not. Use layers (`camera.layers`) or a per-room list, not a traversal each frame. No shadows in this pass; simple materials are acceptable if they help (an override material with each mesh's base colour).
4. **Draw it less often.** The picture is blurred, so it hardly changes as the player moves. Re-render it every few frames, or when the player has moved or turned more than a threshold, or when something in the room beyond changes (a light switched, a door in it opened). Record the policy and its effect.
5. **Opaque doors and the second door.** A closed opaque door's room is hidden (`visible = false` or its layer off) while the door is shut and shown when it starts to open. Rooms two doors away are never drawn, including through a frosted door in the room beyond: the small render of a neighbour must not itself draw that neighbour's neighbours.
6. **Opening.** As a frosted door slides open, switch its room to the full drawing as soon as any of it can be seen directly, and stop the small render.

## Measure it

Measure before and after, from the same viewpoints, and record the numbers: `renderer.info.render.calls` and `triangles` per frame (the main pass and the small passes separately), and frame time in Chrome on the owner's machine (state the machine and browser). Include at least one view with a frosted door in it, one with an open door, and one with nothing but closed opaque doors. Do not claim a saving that was not measured.

## Constraints

- Follow `AGENTS.md`: the five checks before committing, a diary entry, Markdown one paragraph per line, ask the owner one question at a time.
- Put the decision of what to draw for each room in pure, tested logic (in `src/game/doors.ts` or beside it): given the current room and the doors' states, each room's drawing mode (full, blurred, none). Test the table above, including the two-door rule through a frosted door.
- Do not change the shared controls (`src/toolkit/controls/`) for this.

## Return path

Write the completion report to `doc/reports/002-frosted-door-rendering.md` (create the folder and file if missing; on later runs add a dated entry and keep earlier ones). Include what changed, the resolution and blur chosen, the re-render policy, the measurements before and after with the conditions they were taken in, any visible differences the owner should look at (with `?room=facility&at=<room>` links), limitations and questions for the owner. The owner reads it next.
