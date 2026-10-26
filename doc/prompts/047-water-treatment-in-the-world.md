# 047: Ozone and UV treatment in the world

Status: partly done (checked 2026-10-26): the spa cabinets' UV runs in the world and the ozone plant reports its state, but treatment still follows "either isolator on" (`TREATED_BY`) and the contact tank shows the dev room's residual.

## Now

Each ozone generator (lounge, Olympic) runs its own ozone plant in closure state in its view (`views/room-equipment.ts`, `worldOzoneGenerator`): START, STOP, setpoint, RESET and HAND-OFF-AUTO change only it, and its circulation flow is a constant. The world counts a pool's water as treated while either its UV or its ozone isolator is on (`pools.ts`, `TREATED_BY`), so the generator's STOP does nothing. The lounge's contact tank shows the dev ozone room's residual; the Olympic's is a static vessel. The spa cabinets' UV is the page's.

## To do

- **The ozone plant in the world** (the generator's controls, its output, the contact tank's residual and the destruct unit, the room's ozone gas detection already in `gas.ts`), stepped from the pool's real flow; the generator's panel and the contact tank show it.
- **Treatment from what runs**: a pool's chloramines broken down by its UV running (lamp on, flow through it, its isolator and power) and its ozone dosing (generator producing, flow through the contact tank), each its own contribution, not "either isolator on".
- **The spa cabinets' UV** (jacuzzi and footbath) in the world: on with their pump and power, off with the cabinet door open; the world's chloramines for pools 03 and 04 follow it.

## Acceptance

Stopping a pool's ozone generator, or its UV, lets its combined chlorine rise, seen on its dosing controller and in the control room; restarting brings it down. The contact tank's residual reads its own room's plant. Tests; checks pass.

## Remaining (checked 2026-10-26)

- The ozone plant stepped in the world from the pool's real flow (controls, output, contact tank residual, destruct unit), shown by its panel and contact tank.
- `TREATED_BY` replaced by separate contributions from UV running (lamp, flow, isolator, power) and ozone produced (with [070](070-water-condition.md)'s `irradiate` and `ozonate`).
- Each contact tank reading its own room's plant.
- Tests: stopping a pool's ozone or UV raises its combined chlorine; restarting brings it down.
