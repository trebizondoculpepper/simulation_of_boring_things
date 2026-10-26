# 057: Heat lost from the jacuzzi's balance tank

Status: not started (checked 2026-10-26): the jacuzzi's balance tank is still ideal, its water losing no heat.

## Review checkpoint — 2026-10-26

**Classification:** Active / planned. **Filed:** `doc/prompts/057-balance-tank-thermal-losses.md`.

**Delivered:** not started

**Still outstanding:** Retain the prompt’s required work and current root TODO entries.

**Evidence:** Current prompt, its Remaining section and source check. Reviewed against source `e5078c4`.

The original request and earlier implementation notes below are retained as history; this checkpoint supersedes any conflicting old completion claims. Outstanding work remains open in the root TODO.

## Purpose

A spa's balance tank holds water at the spa's temperature, 37 °C, in a plant room at perhaps 20 to 25 °C. A real tank loses heat through its walls and lid, so commercial spa installers specify foam-insulated GRP tanks, or lag them, as they lag the hot pipework. Today the world's thermal model (`src/game/plant/thermal.ts`) treats the jacuzzi's water as one body, the tank's share included, losing heat only at the spa's surface. Model the tank's losses, so an uninsulated tank costs heat and the insulated one is visibly worth having.

## What to build

- The tank's water as part of the jacuzzi's thermal mass, as now, plus a loss from the tank: its wetted wall and lid area (from its fill, its 1.1 m diameter and its depth, `JACUZZI_BALANCE_TANK`) times a U-value times the difference between the water and the plant room's air. Take U-values for bare single-skin GRP and for foam-insulated GRP (about 50 mm of polyurethane) from manufacturers' data, citing the source, and keep them as named constants.
- The plant room's air temperature: the jacuzzi plant room's own if the world has one, else a fixed plant-room temperature constant.
- Whether the tank is insulated: a property of the installed tank (insulated by default), changeable only where the owner asks for a way to change it (an uninsulated variant to compare, a damaged-insulation fault, or both).
- The heat lost shows where the heat goes: in the heating the jacuzzi draws (`pools.ts`'s `heating`), so the boiler house and the cabinet's NO HEAT and TEMP LOW warnings follow; and, if the owner wants it, on the cabinet's display or the plant room's mimic.
- The tank's look to match: an insulated tank drawn as foam-insulated GRP (a thicker, smoother outer skin, or a clad lagging jacket), the bare one as now.
- The dev38 trial's ideal tank stays ideal (no losses) unless the owner asks otherwise, so the cabinet can still be tried alone.

## Acceptance

- Pure, tested: the loss for a full and a near-empty tank, insulated and bare, against a hand calculation; zero with the water at the room's temperature; the jacuzzi's heating rising by the tank's loss in a steady state.
- The world's existing thermal and jacuzzi tests unchanged except where the new loss is expected.
- The five project checks, the changelog, and the TODO item ticked with its date and commit.

## Remaining (checked 2026-10-26)

- The tank's wall and lid losses (wetted area × U × the water's difference from the room's air), with cited U-values for bare and foam-insulated GRP as named constants.
- The plant room's air temperature, or a fixed constant.
- An insulated flag on the installed tank, insulated by default, drawn to match.
- The loss carried into the jacuzzi's heating, so the boiler house and NO HEAT and TEMP LOW follow.
- dev38's tank kept ideal.
- Tests against a hand calculation.
