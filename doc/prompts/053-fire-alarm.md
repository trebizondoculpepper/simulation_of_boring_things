# 053: A fire alarm system

Status: not started (checked 2026-10-26): there is no fire alarm in the world, and the repeater is still unwired.

## Review checkpoint — 2026-10-26

**Classification:** Active / planned. **Filed:** `doc/prompts/053-fire-alarm.md`.

**Delivered:** not started

**Still outstanding:** Retain the prompt’s required work and current root TODO entries.

**Evidence:** Current prompt, its Remaining section and source check. Reviewed against source `e5078c4`.

The original request and earlier implementation notes below are retained as history; this checkpoint supersedes any conflicting old completion claims. Outstanding work remains open in the root TODO.

## To do

- A fire alarm system in the world after a real addressable panel (BS 5839-1): its panel (in reception or the control room), detectors in each zone, manual call points (the corridors' signs become working call points), sounders and beacons, its states (normal, fault, pre-alarm, fire, silenced, reset), its events log.
- The control room's repeater shows and works it (silence, reset, with the panel's access level); the FIRE ALARM annunciator window lights from it.
- Its interfaces: the air handling units stop on fire (or go to smoke extract), the gas emergency stop trips (046), the door holders release.

## Acceptance

Breaking a call point raises the alarm everywhere it should, stops what it should, and is silenced and reset only from the panel or repeater. Until it is built, the repeater and call points are registered as decorative.

## Remaining (checked 2026-10-26)

- An addressable panel to BS 5839-1 in the world: detectors, working manual call points, sounders and beacons, its states and event log.
- The control room's repeater showing and working it; the FIRE ALARM annunciator window lit from it.
- Its interfaces: the air handling units stopping (or going to smoke extract), the gas emergency stop tripping, door holders releasing.
- Until it is built, the repeater and call points registered as decorative.
