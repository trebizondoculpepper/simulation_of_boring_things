# 044: Motor panels in the plant rooms

Status: planned 2026-10-24 (the owner); stage two of the switch room's redesign, after [043](043-switch-room-tidy.md). To be done room by room, as each plant room is next reworked.

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
