# 047: Ozone and UV treatment in the world

Status: planned 2026-10-24, from the [wiring audit](../reports/wiring-audit-2026-10-24.md).

## Now

Each ozone generator (lounge, Olympic) runs its own ozone plant in closure state in its view (`views/room-equipment.ts`, `worldOzoneGenerator`): START, STOP, setpoint, RESET and HAND-OFF-AUTO change only it, and its circulation flow is a constant. The world counts a pool's water as treated while either its UV or its ozone isolator is on (`pools.ts`, `TREATED_BY`), so the generator's STOP does nothing. The lounge's contact tank shows the dev ozone room's residual; the Olympic's is a static vessel. The spa cabinets' UV is the page's.

## To do

- **The ozone plant in the world** (the generator's controls, its output, the contact tank's residual and the destruct unit, the room's ozone gas detection already in `gas.ts`), stepped from the pool's real flow; the generator's panel and the contact tank show it.
- **Treatment from what runs**: a pool's chloramines broken down by its UV running (lamp on, flow through it, its isolator and power) and its ozone dosing (generator producing, flow through the contact tank), each its own contribution, not "either isolator on".
- **The spa cabinets' UV** (jacuzzi and footbath) in the world: on with their pump and power, off with the cabinet door open; the world's chloramines for pools 03 and 04 follow it.

## Acceptance

Stopping a pool's ozone generator, or its UV, lets its combined chlorine rise, seen on its dosing controller and in the control room; restarting brings it down. The contact tank's residual reads its own room's plant. Tests; checks pass.
