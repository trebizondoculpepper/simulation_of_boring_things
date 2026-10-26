# Prompt: scenario 7, power distribution

Status: not started (checked 2026-10-26): only a general RCD block and its test exist (`src/game/plant/electrical.ts`, `rcd.test.ts`); DB-L1's RCBOs (2026-10-25) model trips by earth leakage on a lighting board, but not a distribution board with MCB curves and summed currents.

## Review checkpoint — 2026-10-26

**Classification:** Active / planned. **Filed:** `doc/prompts/030-scenario-power-distribution.md`.

**Delivered:** not started

**Still outstanding:** Retain the prompt’s required work and current root TODO entries.

**Evidence:** Current prompt, its Remaining section and source check. Reviewed against source `e5078c4`.

The original request and earlier implementation notes below are retained as history; this checkpoint supersedes any conflicting old completion claims. Outstanding work remains open in the root TODO.

Written by Claude (Opus 5.5, Claude Code), 2026-10-23, one of eight test scenarios the owner asked for (each proving a piece of modelling the Olympic pool's redo will need). Read `AGENTS.md`, then the scenarios already built: Dev21 (sources to sinks, `source-sink-plumbing.ts`), Dev22 (battery-backed pump, `battery-pump-rig.ts`), Dev23 (gravity drain, `jacuzzi-drain.ts`).

**Status:** Not started.

## The scenario

A 400 V experimental supply to a distribution board (main switch, MCBs and an RCD) feeding three loads: a pump, a heater and lighting. Overload the board and the right breaker trips; leave an earth fault on and the RCD trips.

## What it proves

- The power bus: currents adding up, each load drawing what it draws.
- Protection with its own curves (an MCB's thermal and magnetic trips, an RCD's 30 mA).

## Done when

- Tests: the currents add up at the main switch; an overload trips its MCB after its curve's delay and not the others; an earth fault trips the RCD; resetting needs the fault gone.
- A dev room with the board's ammeter, each breaker's state, and the loads running or not.

## Remaining (checked 2026-10-26)

- A distribution board model: a 400 V supply, a main switch, MCBs with thermal and magnetic trip curves, an RCD; a pump, a heater and lighting as loads.
- Tests: the currents add up at the main switch; an overload trips its own MCB after its curve's delay and no other; an earth fault trips the RCD; a reset holds only once the fault is gone.
- A dev room showing the board's ammeter, each breaker and each load running.
