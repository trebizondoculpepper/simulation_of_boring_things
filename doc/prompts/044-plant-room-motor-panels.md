# 044: Motor panels in the plant rooms

Status: partly done (checked 2026-10-26): the Olympic's and the lounge's circulation pumps have starters in the world, worked from their existing local panels; the other rooms' motors have none.

## Review checkpoint — 2026-10-26

**Classification:** Partial / active. **Filed:** `doc/prompts/044-plant-room-motor-panels.md`.

**Delivered:** partly done

**Still outstanding:** Retain the prompt’s required work and current root TODO entries.

**Evidence:** Current prompt, its Remaining section and source check. Reviewed against source `e5078c4`.

The original request and earlier implementation notes below are retained as history; this checkpoint supersedes any conflicting old completion claims. Outstanding work remains open in the root TODO.

## Why

Distributed motor control (the owner's choice): each motor is started, stopped and reset from a panel in its own plant room, fed from that room's distribution board, beside the local isolators already there. Later, the rebuilt control room drives the same starters remotely, as its mimics already share the one world with the plant rooms' boards (local and remote boards on one world node, no LOCAL/REMOTE switch).

## What to do

- **Starters in the world.** A starter per motor in the world state (`world.ts`, a new version and migration): its isolator, HAND-OFF-AUTO, its run command latched by START and dropped by STOP, its trip (overload, and whatever the machine's own protection asks) latched until RESET once the cause has gone, its current. Pure logic beside its tests, on the pattern of the air handling units (`game/plant/air-handling.ts`) and the MCC component's starter (`newStarter`, `pressStarter`).
- **The pool model asks the starter.** A pump runs when its room's feeder and local isolator allow it and its starter is running: in AUTO when its control wants it (duty and standby), in HAND regardless. The circulation pumps (P-101A/B Olympic, P-201A/B lounge), the LTHW circulator (P-501A/B), the make-up booster (P-601), and any other motor the rooms come to have.
- **A panel in each plant room.** A Penfold-built motor panel (its maker's mark top right), from the MCC component's parts: per motor a bucket or a drive door with its isolator, HAND-OFF-AUTO, START, STOP, RESET, RUN and TRIP lamps and an ammeter, the larger motors on variable-speed drives with their keypads. Placed by the room's layout rules, near its distribution board, clear of its pipework, its cables in containment to its motors.
- **Shown everywhere.** The rooms' mimics show each pump's RUN and TRIP from the starter. The control room's rebuild can then command the same starters.
- Try the panel on a dev room first (the owner's rule: new controls on dev0's boards or a development room before the leisure centre).

## Acceptance

- Stopping a pump at its panel stops its flow in the world, seen in its room and on every mimic; START restarts it; a trip holds until RESET.
- The local isolator, the room's feeder and the site's main switch each still stop it, whatever its panel says.
- Saves from before load with every starter as found today (running where the pump runs, in AUTO).
- Tests for each starter's logic and for each pump following its starter; typecheck, lint, format, tests and build pass.

## Progress

- 2026-10-24, first room pair: the pools' circulation pumps have starters in the world (`game/plant/motor-starters.ts`, world version 21): P-101A/B (the Olympic, on drives) and P-201A/B (the lounge, direct on line), duty and standby, in AUTO as found. The pool model circulates while one runs. The trip is the motor's thermistors after a minute's running with its valves giving it nowhere to pump (the Olympic's battery, the lounge's filter path); the tank's low-low level stays an interlock that restarts the pumps once it recovers, as the model's refilling relies on. The existing local control panel in each of those plant rooms (`rooms/plant/pump-panel.ts`) is the motor panel: its HAND · OFF · AUTO selectors, a RESET per pump (new), its emergency stop and its mimic's START and STOP work the starters, and its lamps and ammeters show them; the control room's main pool board works the same starters. Its LOCAL · REMOTE key switch and the mimic's LOCAL lamp are gone (one world, no authority switch).
- Still to do: the LTHW circulator (P-501A/B) and the make-up booster (P-601), with panels in the boiler house and the wet hall; the spa cabinets' pumps; the air plant's and stores' fans, if they are to have starters.

## Remaining (checked 2026-10-26)

- Starters for P-501A/B and P-601, with Penfold motor panels in the boiler house and the wet hall.
- Starters and panels for the spa cabinets' pumps.
- A decision on whether the air plant's and stores' fans get starters, and if so, build them.
- A Penfold motor panel per plant room built from the MCC parts, tried in a dev room first.
- The mimics' RUN and TRIP lamps from each starter, in every room.
