# Prompt: scenario 7, power distribution

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
