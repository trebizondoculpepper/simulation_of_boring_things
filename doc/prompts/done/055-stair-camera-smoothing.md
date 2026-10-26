# 055: Stair camera smoothing

Status: done 2026-10-25 (`de705ce`; checked 2026-10-26): the camera's floor filter (`stair-smoothing.ts`, `smoothStairFloor`) and its tests are in, used by `first-person.ts` for the camera only; the browser walk-through of the listed stairs (dev34, the air plant, the pool loop's stair corridors, the plant-room decks) is still to be done, and is kept in `TODO.md`.

## Purpose

Walking up or down stairs is jerky: the walker's floor height (`floorAt` in `src/toolkit/controls/input/first-person.ts`) changes a whole riser at a time, and the camera's eye height (`eyeY()`, `EYE_HEIGHT_METRES` over `currentFloorY`) follows it in the same frame. Smooth the eye, not the floor, in the way Quake, Half-Life and Source do (the owner, 2026-10-24), so the view glides up each step while the walker's collision and floor stay exact.

## How those engines do it

The physics origin snaps up a step instantly (Half-Life's `PM_StepMove`, step size 18 units). The view keeps its own remembered floor height (`oldz` in Quake's and Half-Life's `V_CalcRefdef`; `m_flOldPlayerZ` in Source's `CBasePlayer::SmoothViewOnStairs`) that chases the true one at a fixed rate and is never allowed to lag by more than a set amount; the camera is drawn at the remembered height plus the eye height. It is a linear rate limit, not exponential easing: predictable and cheap.

|             | Quake                 | Half-Life              | Source                                                                                                 |
| ----------- | --------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------ |
| Rate        | 80 units/s (2.03 m/s) | 150 units/s (3.81 m/s) | 150 units/s (3.81 m/s)                                                                                 |
| Most lag    | 12 units (0.30 m)     | 18 units (0.46 m)      | 18 units (0.46 m)                                                                                      |
| Direction   | up only               | up only                | up and down                                                                                            |
| Not applied | in the air            | in the air             | in the air, on moving ground (lifts), while the view offset changes (crouching), with `smoothstairs 0` |

One unit is about an inch (0.0254 m). Source's sources: `src/game/shared/baseplayer_shared.cpp` in `ValveSoftware/source-sdk-2013`; Half-Life's `cl_dll/view.cpp` in `ValveSoftware/halflife`; Quake's `WinQuake/view.c` in `id-Software/Quake`.

## What to build

Follow Source: smooth both up and down, at 3.81 m/s, lagging at most 0.46 m. Keep it pure and tested:

- A pure step filter in a `logic/` module beside the controls (for example `src/toolkit/controls/logic/stair-smoothing.ts`): given the remembered height, the true floor height, the frame's `delta` and whether to reset, return the new remembered height. Move toward the floor by `rate × delta`, never past it, and clamp to within `maxLag` of it. A negative or zero `delta` leaves it unchanged.
- In `first-person.ts`, keep `currentFloorY` exactly as now for everything that depends on the floor (collision, ladders, crouch, sounds), and add a smoothed floor used only for the camera's height in walking mode, so `y = smoothedFloor + eye height + eyeOffset − crouch + bob`.
- Reset the smoothed floor to the true floor (no glide) whenever the walker is placed (`place`, which every room handover, Continue and title camera uses), when leaving or rejoining a ladder (the ladder owns the height), when entering or leaving noclip (flying), and when the floor changes by more than a threshold in a single frame that is not a step (a teleport, a room's own placement).
- Do not smooth while flying or on a ladder. Apply it in metres scaled by `metre`, as the controller's other distances are.
- Respect reduced motion as the head bob does only if it makes the view worse; smoothing reduces motion, so keep it on by default. Add it to the effect settings only if the owner asks.

## Acceptance

- Unit tests for the filter: a 0.17 m riser up and down is caught within about 45 ms at 60 frames per second and never overshoots; a 1 m jump is clamped to 0.46 m behind and then caught; a reset jumps straight to the floor; a ramp at walking pace is tracked with no lag beyond a frame; zero and negative `delta`.
- Walk the dev34 stair tower, the air plant's stairs, the pool loop's stair corridors and the plant-room decks in a browser, up and down: no snapping, no lag felt on ramps, the corridor handover between rooms still seamless (no glide on handover), ladders unchanged.
- Run the five project checks, add the change to `CHANGELOG.md` under Unreleased, and tick the TODO item with its date and commit.
