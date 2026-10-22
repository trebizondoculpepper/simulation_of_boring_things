# Development Diary Entry - 2026-10-22

## Context

- **Date**: 2026-10-22
- **Branch**: main
- **Contributors**: Claude Code + User

## Problem Statement

The owner asked for a model test of draining each pool: the process, how long each takes one at a time, and the maximum rate. The model could not do it: with the pumps stopped, gravity only lowered a pool to its balance tank's overflow, about 0.2 m below the lip. The owner then asked for a real drain-down path, and for the pool halls to show the model's water level.

## Our Approach

Drain-down was added to the shared water balance (`src/game/water/water-balance.ts`). With the drain-down valve open, a pool's pumps send its water from the main drains to the foul sewer instead of round the circuit. The rate is the site's sewer consent, 10 m³/h, shared with the backwash's discharge and between any pools draining at once. The pool empties to its floor, treating the pool as a prism of its mean depth. Each pool gained drain-down and make-up valves in the world (version 13), set by `pool/drain-down` and `pool/make-up`. A pool more than 15 cm down closes to bathers.

## Implementation

- `src/game/plant/drain-down.test.ts` runs the runbook on every pool: shut the make-up, open the drain-down, empty the pool, refill it.
- The pool hall view gained `setWaterDrop`, which moves the basins' surfaces, the shaders' waterline, the lane ropes and the gallery's underwater volume. The empty point is the bottom of the deepest well. The water's caustics and reflections fade over the last 30 cm.
- The hall room maps the world's level onto the view each frame.
- New scenarios: `drain-pool_0N` and `fill-pool_0N`.

## Outcomes

Emptying one at a time at the consent:

| Pool     | Volume   | Time to empty         | Rate            |
| -------- | -------- | --------------------- | --------------- |
| Lounge   | 138.9 m³ | about 14 h            | 10 m³/h         |
| Olympic  | 2,500 m³ | about 262 h (11 days) | 10 m³/h         |
| Jacuzzi  | 2.8 m³   | 18 min                | 10 m³/h         |
| Footbath | 0.9 m³   | 7 min                 | its 9 m³/h pump |

The times run slightly over volume divided by 10 m³/h, because the backwash's discharge takes the consent while it runs. The visual map is linear in depth, which is approximate for shaped basins.

## Next Steps

- Put the drain-down runbook in the operator's manual.
- Give the valves real controls in the plant rooms.
- Consider a temporary higher consent for a planned drain-down.
