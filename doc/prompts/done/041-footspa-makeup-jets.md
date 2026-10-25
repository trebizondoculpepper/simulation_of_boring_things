# 041: Foot spa make-up jets and local ripples

Status: planned 2026-10-23; the owner asked for a prompt before implementation.

## Intent

Show the small fresh-water supply entering the foot spa in `pool_04` while it is actually filling. Use the existing wall inlets rather than adding prominent new fittings. At full level the water surface must cover the inlet centres, which are about 7.5 cm below the lip. The inlet streams should be narrow and clear, without white water or a broad churn; small rings should spread only near the active inlets.

## State and placement

Drive the effect from `footbathFilling(world)` so it starts only when PL4-MU1-LCV1 is open, the balance-tank float calls for water, and the wet hall booster can supply it. Stop it promptly when any of those conditions ends. Use the same state for the cabinet's FILLING annunciator. Put the streams at two or three of the existing south-wall inlets in the footbath channel. Place the ripple rings at the current water surface from `world.pools.pool_04.level`, and move them as it fills. Hide surface ripples when the bath is effectively empty; the small inlet squirt may remain visible above the low waterline.

## Acceptance

- With the make-up valve open, low balance-tank level and a live wet hall supply, small clear streams and local ripples are visible from the pool room; FILLING is lit on the cabinet.
- Closing PL4-MU1-LCV1, satisfying the float, or losing wet hall supply stops both the effect and FILLING. MAKE-UP on the circuit mimic continues to show valve position separately.
- A full foot spa covers the inlet centres. The streams do not produce white foam or disturb the whole bath.
- The effect follows the world's saved level through room changes and reloads. It is visual only; the existing world water balance determines the volume and timing.

## Suggested implementation

Use one small reusable visual group in `src/toolkit/gallery/views/` attached to the `pool_04` hall. Animate a few thin translucent aqua streams and low-opacity expanding rings, with no per-jet dynamic lights. Update it from the hall's animation loop alongside `showWater()`. Keep the component independent of the water balance and test the pure fill condition in `src/game/`.
