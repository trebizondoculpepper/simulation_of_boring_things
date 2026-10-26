# 052: Emergency power: the central battery, emergency lighting, a generator

Status: mostly complete (reviewed 2026-10-26, source `e5078c4`).

## Review checkpoint — 2026-10-26

**Classification:** Mostly complete. **Filed:** `doc/prompts/done/052-emergency-power.md`.

**Delivered:** The central battery and its panel tests are in the world; rooms receive emergency illumination while normal lighting is out.

**Still outstanding:** Install separate emergency light fittings instead of dimming normal lamps; complete generator supply under 077/079; run the duration/recharge and room-by-room acceptance checks.

**Evidence:** 898b3f5; src/game/plant/lighting-protection.test.ts. Reviewed against source `e5078c4`.

The original request and earlier implementation notes below are retained as history; this checkpoint supersedes any conflicting old completion claims. Outstanding work remains open in the root TODO.

## Now

The switch room's central battery (`electrical-switchgear.ts`, `createCentralBattery`) keeps its own per-instance state; its tests work on the page only; its MAINS lamp means "not in test". There are no emergency light fittings: on a mains failure every fitting goes dark. The generator connection point is a box; the annunciator's GENERATOR RUNNING window can never light.

## To do

- **The central battery in the world**: its charge, charging from the site's supply, discharging into the emergency lighting on a mains failure, its monthly and annual tests (BS 5266) from its panel, its fault lamps.
- **Emergency light fittings** (maintained exit signs, non-maintained bulkheads) in every room and corridor, fed from it: lit on the mains' failure while it has charge, their test lamps showing.
- **A hired generator** at the connection point (or decided against): connected, started, it feeds the site's essential load; GENERATOR RUNNING lights.

## Acceptance

Switching off the main incoming switch leaves the building lit by its emergency fittings for the battery's duration, then dark; restoring the mains recharges it. Checks pass.

## Remaining (checked 2026-10-26)

- Separate emergency light fittings, central-system versions of the existing designs (`createExitSign`, `createEmergencyBulkhead`, `createEmergencyLight` in `safety-fittings.ts`) and a new twin-spot: maintained exit signs over every exit, twin-spots high in the halls, wet hall and big plant rooms, bulkheads in the small plant rooms and stores, downlights along the corridors; lit from the world's battery, their test lamps showing, in place of the normal fittings' dim level.
- A hired generator at the connection point (or decided against), feeding the essential load and lighting GENERATOR RUNNING (with [010](../obsolete/010-loading-bay-two-lorries.md)).
- The acceptance check: with the main incoming switch off, the building stays lit by its emergency fittings for the battery's duration, then goes dark, and the battery recharges when the mains return.
