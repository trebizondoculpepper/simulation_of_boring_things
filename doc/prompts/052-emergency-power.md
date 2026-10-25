# 052: Emergency power: the central battery, emergency lighting, a generator

Status: planned 2026-10-24, from the [wiring audit](../reports/wiring-audit-2026-10-24.md). It supersedes prompt [011](obsolete/011-emergency-lighting.md), whose detail (EN 50171's rated duration, a relay per lighting zone) still applies.

## Now

The switch room's central battery (`electrical-switchgear.ts`, `createCentralBattery`) keeps its own per-instance state; its tests work on the page only; its MAINS lamp means "not in test". There are no emergency light fittings: on a mains failure every fitting goes dark. The generator connection point is a box; the annunciator's GENERATOR RUNNING window can never light.

## To do

- **The central battery in the world**: its charge, charging from the site's supply, discharging into the emergency lighting on a mains failure, its monthly and annual tests (BS 5266) from its panel, its fault lamps.
- **Emergency light fittings** (maintained exit signs, non-maintained bulkheads) in every room and corridor, fed from it: lit on the mains' failure while it has charge, their test lamps showing.
- **A hired generator** at the connection point (or decided against): connected, started, it feeds the site's essential load; GENERATOR RUNNING lights.

## Acceptance

Switching off the main incoming switch leaves the building lit by its emergency fittings for the battery's duration, then dark; restoring the mains recharges it. Checks pass.
