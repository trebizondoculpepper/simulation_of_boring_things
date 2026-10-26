# Healthy-start run: the executable contract

Date: 2026-10-25. Source revision for the observational audit: `4b99c2f` (working tree also carried another session's uncommitted stair-smoothing and sand-filter edits, recorded in the generated JSON; neither touches the world model). `WORLD_VERSION` 27. This run implements work packages 1, 3, 5 and 6 of [mission 067](../../prompts/done/067-healthy-new-game.md); work package 4 (repair) found nothing to repair; the playable session's time is left for the owner.

## Changes since the previous run

Since the [lounge filter recheck](2026-10-25-lounge-filter-recheck.md) (`4371e93`): the lounge pumps each pump only through their own discharge valve (a pump with its own valve shut starves and trips, and its standby starts); the lounge filter mimic on PL1-CP1; inspection wording; the stair camera; the sand filter's fittings. None changes the normal-service trajectory: valve roles, sizing, controls, limits and initial state are as before.

## The observational audit, rerun

`AUDIT_HEALTHY_START=1 npx vp test run scripts/healthy-start-audit.test.ts`, method and checkpoints unchanged. Flows (lounge/Olympic/jacuzzi/footbath, m³/h): 90/621.05/24/12 at 600 s, 90/620.44/24/12 at 3600 s, 90/603.91/24/12 at 24 h. Temperatures at 3600 s: 29.958/27.974/36.959/33.959 °C. Stocks at 24 h: 11,841.44 l hypochlorite, 936.58 l acid. The only annunciator indication was the shared `makeup-running`, first at 1 s. Identical to the previous runs at the recorded precision.

## The contract, executable

`src/game/health.ts` gives `healthFindings(world)`: structured findings (subsystem, asset, severity, measured value, expected value or band, unit, reason) for the pools (level, flow, temperature, pH, free chlorine, balance tank, hall humidity, trips, drain-down), the motors (trips, AUTO, duty running, emergency stops, a set with nothing running), the services (every room's needs, every isolator), every installed valve against its normal position (the lounge's by their actual travel), gas (the boiler house's safety chain, every detected zone), the wet hall (booster trip, backwash overflow), chemical stocks, the air handling units, the jacuzzi's cabinet, the lighting and the Olympic's make-up mode. The bands sit inside the game's alarm limits; each is in `HEALTHY` with its reason.

Coverage is enforced by the type checker: `WORLD_HEALTH_COVERAGE` classifies every field of `World`, and `KIND_HEALTH_COVERAGE` every kind of installed equipment, each with the rule that judges it or why none can yet. A new world field or equipment kind does not compile until classified. Its first use caught one: `storage-cupboard`, unclassified until then.

`makeup-running` is classified as informational (`INFORMATIONAL_INDICATIONS`): the booster meeting ordinary make-up demand. The annunciator still shows it; the health check does not count it.

## Results

- **First frame:** no faults.
- **Every step of the first hour** (1 s steps, 3600 checks): no faults, so no transient fault hides between checkpoints.
- **A day** (10 s steps, every step checked): no faults.
- **Negative controls**, each proving the checker finds what it is for: both lounge filter outlets shut (valve and pool faults); the lounge plant room's feeder off (a service fault); a low balance tank; an ozone leak (a gas fault).
- **Session:** New Game over a damaged save gives a world with no faults, the damaged save having had some; Continue keeps the damaged save (`world-store.test.ts`).

## Coverage limitations, honestly

Not in the world, so not checkable yet: the ozone generators' and boiler controllers' own states (their rooms' private models), the LTHW circulator's starters, the calorifier, pressurisation and combustion panel, the central battery and emergency lighting, the BMS outstation and the fire alarm. The footbath's and jacuzzi's identified parts are judged only through their pools' flow and level. Filter dirt is a maintenance trend, not a fault. Browser checks of the panels and boards were not part of this run.

## For the owner

The world starts Monday 00:00, with the halls' air handling occupied but bathers arriving only from 08:00. The definition proposes a defined open session (Monday 09:00, say); it is not changed here, being the owner's decision.
