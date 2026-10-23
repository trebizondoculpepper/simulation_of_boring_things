# Prompt: scenario 2, filling a tank to a float switch

Written by Claude (Opus 5.5, Claude Code), 2026-10-23, one of eight test scenarios the owner asked for (each proving a piece of modelling the Olympic pool's redo will need). Read `AGENTS.md`, then the scenarios already built: Dev21 (sources to sinks, `source-sink-plumbing.ts`), Dev22 (battery-backed pump, `battery-pump-rig.ts`), Dev23 (gravity drain, `jacuzzi-drain.ts`).

**Status:** Not started.

## The scenario

Mains water fills a tank through a solenoid valve. A high float switch shuts the valve; a low one opens it. A manual draw-off valve on the tank lets the player take water away, so the tank cycles by itself.

## What it proves

- Control ports driving valves, and level switches as real components with hysteresis between them.
- A closed loop that holds a level.

## Done when

- Tests: the level stays between the floats while water is drawn off; it fills to the high float and stops; a stuck float lets it overflow (to an overflow pipe and a drain).
- A dev room with the tank's level visible, the solenoid's state and the floats' lamps.
