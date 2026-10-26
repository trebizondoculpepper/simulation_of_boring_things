# 051: The utility flags retired: heat, air and chemicals from the machines

Status: not started (checked 2026-10-26): the heat, air and chemical flags in `services.ts` still stand in for the machines.

## Review checkpoint — 2026-10-26

**Classification:** Active / planned. **Filed:** `doc/prompts/051-utility-flags-retired.md`.

**Delivered:** not started

**Still outstanding:** Retain the prompt’s required work and current root TODO entries.

**Evidence:** Current prompt, its Remaining section and source check. Reviewed against source `e5078c4`.

The original request and earlier implementation notes below are retained as history; this checkpoint supersedes any conflicting old completion claims. Outstanding work remains open in the root TODO.

## Now

The world's utility sources (`services.ts`: power, water, heat, air, chemical) are booleans that only FULL ON sets, always on in practice, combined with room feeders. They stand in for machines the world now has or will have: **heat** decides the pools' and halls' heating, unrelated to the boilers; **air** decides the `ahu-fault` alarm, a hall's "ventilated" flag (beside its units' real airflow), the chemical stores' and ozone rooms' extract fans, and powers the lounge's valve actuators as if it were compressed air; **chemical** gates dosing beside the stores' real stock, acid dosing needing the hypochlorite store's feeder.

## To do

- **heat**: from the boiler house's circuit (046), the flag removed.
- **air**: a hall's ventilation from its units alone; the `ahu-fault` alarm from the units' faults; the extract fans as their own small machines (on their rooms' power, with starters or switches); the lounge's valve actuators on what really drives them (electric actuators on power, or a compressed-air plant if pneumatic: a compressor in the plant, modelled).
- **chemical**: dosing from the stores' stock and each store's own feeder, each chemical from its own store. **Deliveries**: the fill cabinets work (a delivery's tanker at the stand, the fill point opened, the store filled, stock rising); each hypochlorite tank its own level, not the whole store's.
- **water**: the town main stays a source; its stop valve (049) the way to shut it.
- FULL OFF and FULL ON (the scenario simulator) act on the machines, not the flags.

## Acceptance

No pool, hall or room depends on a utility flag but power (the site's supply) and the town main; every dependency is on a modelled machine. Checks pass.

## Remaining (checked 2026-10-26)

- Heat from the boiler house's circuit ([046](046-boiler-house-in-the-world.md)), its flag removed.
- Air: each hall's ventilation from its units alone, `ahu-fault` from the units' faults, the extract fans as machines, the lounge's valve actuators on what actually drives them.
- Chemicals from each store's stock and feeder, with deliveries and each hypochlorite tank's level.
- The town main shut by its stop valve ([049](049-every-valve-does-something.md)).
- FULL OFF and FULL ON acting on the machines, not the flags.
