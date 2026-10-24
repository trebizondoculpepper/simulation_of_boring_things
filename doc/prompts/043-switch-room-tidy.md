# 043: The switch room, only what works

Status: planned 2026-10-24 (the owner); stage one of the switch room's redesign, before [044](044-plant-room-motor-panels.md).

## Why

The world models the site's power as one incoming supply, a feeder per room switched from the main switchboard's breakers, and local isolators beside some machines in the plant rooms. Nothing in the switch room starts, stops or isolates a single motor. Yet the switch room holds a motor control centre (MCC-1) whose doors name the Olympic's, the lounge's, the heating's and the booster's pumps, with starters, drives and isolators that keep their own state and switch nothing; the switchboard's "MCC-1" breaker feeds only the wet hall in the world; and a board of sample rotary isolators shows "P-101 PUMP" padlocked off while the world's P-101 isolators stand by the pumps. The owner chose distributed motor control (option two): motors are started and stopped from panels in their own plant rooms (044), and the switch room keeps only the building's distribution.

## What to do

- Remove from the switch room (`FIXED`/`roomEquipment('switch_room')` in `room-equipment.ts`) the motor control centre, the sample rotary isolators board and the spare distribution board SR-DB3, none of which is wired to the world. Keep their components (`electrical-switchgear.ts`) and their dev room exhibits (`rooms/plant/electrical.ts`): they are models for 044's panels.
- Rename the main switchboard's "MCC-1 400 A" way to what it feeds, the wet hall ("DB-WET HALL"), in the switchboard's view and `SWITCHBOARD_FEEDS`, with its rating sized to the wet hall (the booster set and its controls; 100 A will do).
- Re-route the switch room's trunking (`cable-containment.ts`), which ran from the main switch through the MCC to the switchboard: from the main switch's top straight to the switchboard's.
- Tidy what referred to the removed items: their asset IDs (retired, never reused), the equipment catalogue, the world-bindings list (`UNWIRED`, which only shrinks), the room services' switchgear set, the containment tests, and any sign or note naming MCC-1 in the switch room. The signage dev room's MCC-1 plate may stay as a sign specimen.
- The switch room then holds: the main incoming switch, the LV main switchboard (a way per room, working), the lighting board DB-L1 (working), the emergency lighting central battery, the generator connection point and the main earthing terminal.

## Acceptance

- Nothing in the simulation changes: every room's power, and every pump, behaves as before.
- The switch room has no motor starters and no item that names a motor; every breaker's legend matches what it feeds in the world.
- Its trunking joins the main switch to the switchboard with no gap and no clash; the room's layout and containment tests pass.
- Typecheck, lint, format, tests and build pass.
