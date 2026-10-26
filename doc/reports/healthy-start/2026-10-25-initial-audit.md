# Healthy-start initial audit: 2026-10-25

Source revision: `fb1ff79142ad2df23f221470ba470b03b3f223ad`; `WORLD_VERSION` 27. This is a research run, not acceptance of mission 067. The working tree also contained the new audit script; full provenance is in the generated JSON.

## Method

`AUDIT_HEALTHY_START=1 npx vp test run scripts/healthy-start-audit.test.ts` ran the unmodified `newWorld()` without player actions. Steps were at most 1 s through the first hour and at most 10 s afterwards. Checkpoints: 0, 0.1, 1, 60, 600, 3600, 28800, 32400, 43200, 75600 and 86400 s. Annunciator indications were inspected every step. Raw output: `build/research/healthy-start.json` (generated, ignored by git). Subsequent reports should use the same provenance and method, or explain changes.

## Measured results

Temperatures are °C, flow m³/h, pool surface level metres relative to the overflow lip, balance a fill fraction. These are observations, not tolerances.

| Elapsed | Pool    | Temperature | Flow   | Surface level | Balance | pH    | Free chlorine mg/l | RH %  |
| ------- | ------- | ----------- | ------ | ------------- | ------- | ----- | ------------------ | ----- |
| 0 s     | pool_01 | 30.000      | 90.00  | 0.0150        | 0.6800  | 7.400 | 1.400              | 58.00 |
| 0 s     | pool_02 | 28.000      | 620.00 | 0.0150        | 0.7750  | 7.400 | 1.400              | 58.00 |
| 0 s     | pool_03 | 37.000      | 24.00  | 0.0150        | 0.3385  | 7.400 | 1.400              | 58.00 |
| 0 s     | pool_04 | 34.000      | 12.00  | 0.0150        | 0.6800  | 7.400 | 1.400              | 58.00 |
| 600 s   | pool_01 | 29.962      | 90.00  | 0.0165        | 0.6801  | 7.400 | 1.400              | 58.61 |
| 600 s   | pool_02 | 27.994      | 621.05 | 0.0109        | 0.7984  | 7.400 | 1.400              | 58.61 |
| 600 s   | pool_03 | 36.964      | 24.00  | 0.0120        | 0.3486  | 7.400 | 1.400              | 58.61 |
| 600 s   | pool_04 | 33.960      | 12.00  | 0.0120        | 0.7156  | 7.400 | 1.400              | 58.61 |
| 3600 s  | pool_01 | 29.958      | 90.00  | 0.0165        | 0.6800  | 7.400 | 1.400              | 57.89 |
| 3600 s  | pool_02 | 27.974      | 620.44 | 0.0109        | 0.7978  | 7.400 | 1.400              | 57.89 |
| 3600 s  | pool_03 | 36.959      | 24.00  | 0.0120        | 0.3472  | 7.400 | 1.400              | 57.89 |
| 3600 s  | pool_04 | 33.959      | 12.00  | 0.0120        | 0.7137  | 7.400 | 1.400              | 57.89 |
| 43200 s | pool_01 | 29.958      | 90.00  | 0.0165        | 0.6802  | 7.400 | 1.400              | 58.96 |
| 43200 s | pool_02 | 27.958      | 612.01 | 0.0108        | 0.7902  | 7.400 | 1.400              | 58.96 |
| 43200 s | pool_03 | 36.960      | 24.00  | 0.0120        | 0.3408  | 7.400 | 1.400              | 58.96 |
| 43200 s | pool_04 | 33.960      | 12.00  | 0.0120        | 0.6883  | 7.400 | 1.400              | 58.96 |
| 86400 s | pool_01 | 29.955      | 90.00  | 0.0165        | 0.5553  | 7.400 | 1.400              | 55.02 |
| 86400 s | pool_02 | 27.957      | 603.91 | 0.0107        | 0.7817  | 7.400 | 1.400              | 55.02 |
| 86400 s | pool_03 | 36.958      | 24.00  | 0.0120        | 0.3171  | 7.400 | 1.400              | 55.02 |
| 86400 s | pool_04 | 33.936      | 12.00  | 0.0120        | 0.6647  | 7.400 | 1.400              | 55.02 |

Only `makeup-running` appeared in `plantReadingOf(...).alarms`, first at 1 s for all four pool readings. It was absent at the 600 s and later recorded checkpoints. This is shared booster activity, not evidence of four separate faults. No other indication was recorded during this run. All recorded wet-hall alarm booleans were false and jacuzzi cabinet trips were empty. This does not certify every room-local alarm or unimplemented safety system.

At 24 h, hypochlorite stock was 11,841.44 l from 12,000 l and acid 936.58 l from 1,000 l. Olympic flow declined from 620 to 603.91 m³/h as the simulated plant ran. Chemical stocks and filter loading are consumable/maintenance trends, not a static equilibrium. No conclusion about infinite unattended operation follows.

## What the current defaults mean

`newWorld()` composes per-subsystem constructors. `newPools()` starts surfaces at +0.015 m, temperatures and displayed flows at `POOL_TARGET`, pH 7.4, free chlorine 1.4 mg/l, combined chlorine 0.12 mg/l, redox 720, hall RH 58 %, drain-down false and make-up enabled. Tank fractions differ: Olympic 3.1 m / its 4 m weir = 0.775; jacuzzi approximately 0.3385 from its displacement/reserve sizing; lounge and footbath 0.68. One fixed “healthy tank percentage” would be wrong.

`newMotors()` puts both starters of each pair in AUTO, the duty running and the standby stopped, with no trip or panel emergency stop. Required services and feeds start available, boiler gas permits are made, chemical stores are full and gas zones clear. `newOlympicTank()` starts make-up AUTO with the solenoid shut; `newAirHandling()` enables AUTO and occupied halls. Jacuzzi jets and air start idle, ready for their timed START. These are legitimate examples of operational equipment that is not continuously on.

The world clock begins Monday at midnight (`src/game/bathers.ts`), although the initial AHU occupancy flags are true. The centre admits bathers 08:00–21:00. Mission 067 should choose a consistent healthy playable session rather than treating the initial clock and occupancy as settled product decisions. No clock/default behavior was changed during this research.

## Existing checks and gaps

`src/game/new-game.test.ts` checks constructor values and a 600 s run: level > −0.03 m, no pool trip, flow > 80 % of configured target, temperature within 0.5 °C and pH close to 7.4. It does not establish full-facility coverage, ongoing actual treatment paths, intermediate bounds or local-machine control behavior.

Current annunciator thresholds are in `src/toolkit/gallery/logic/world-reading.ts` and `control-room-demo.ts`: flow alarm below half design or unavailable circulation, free chlorine below 1 or above 3 mg/l, pH outside 7.0–7.8, balance below 0.2, water temperature over 2 °C below target, RH above 62 %, and filter differential pressure above 0.7 bar. These are existing game alarm thresholds, not a researched operating specification. The generic balance alarm is especially not a substitute for tank-specific cutouts and surge reserve.

`createGameSession.start()` resets the world and enters `pool_04`; `WorldStore.reset()` uses `newWorld()` and saves it. The title’s normal preset instead advances a new world 60 s at 1 s steps (`src/game/attract-scenarios.ts`). They do not currently share one explicitly defined playable health policy. Continue and migrations were read but were not exercised by this observational script.

The audit observes the world and shared plant readings. It does not prove that all installed boilers, ozone equipment, fire/access systems or room-local controls persist and work across visits. Some equipment has local or derived simulation rather than an independent world state. The coverage work in mission 067 must enumerate these and report unverified cases instead of assigning them healthy from a generic utility boolean.

## Next execution

Implement [mission 067](../../prompts/done/067-healthy-new-game.md) against the [maintained definition](../../healthy-start.md). Establish subsystem health predicates and independent coverage, choose the playable time/session, verify automatic and timed controls, then change initial settings only where evidence requires it. Preserve this report and compare the next run’s trajectories and findings.
