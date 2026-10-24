# 053: A fire alarm system

Status: planned 2026-10-24, from the [wiring audit](../reports/wiring-audit-2026-10-24.md). A new system, later rather than sooner, but the control room's repeater, its annunciator window and the corridors' call points look as if it exists.

## To do

- A fire alarm system in the world after a real addressable panel (BS 5839-1): its panel (in reception or the control room), detectors in each zone, manual call points (the corridors' signs become working call points), sounders and beacons, its states (normal, fault, pre-alarm, fire, silenced, reset), its events log.
- The control room's repeater shows and works it (silence, reset, with the panel's access level); the FIRE ALARM annunciator window lights from it.
- Its interfaces: the air handling units stop on fire (or go to smoke extract), the gas emergency stop trips (046), the door holders release.

## Acceptance

Breaking a call point raises the alarm everywhere it should, stops what it should, and is silenced and reset only from the panel or repeater. Until it is built, the repeater and call points are registered as decorative.
