# Prompt: scenario 5, chemical dosing with a measurement loop

Written by Claude (Opus 5.5, Claude Code), 2026-10-23, one of eight test scenarios the owner asked for (each proving a piece of modelling the Olympic pool's redo will need). Read `AGENTS.md`, then the scenarios already built: Dev21 (sources to sinks, `source-sink-plumbing.ts`), Dev22 (battery-backed pump, `battery-pump-rig.ts`), Dev23 (gravity drain, `jacuzzi-drain.ts`).

**Status:** Not started.

## The scenario

A dosing pump draws hypochlorite from an IBC and injects it into a water line; a free-chlorine probe downstream drives the pump's rate to hold a set point. When the IBC runs dry the pump loses prime and a low-level alarm sounds.

## What it proves

- Small flows into large ones, and concentration as a property of the water.
- A measurement with a lag (the probe downstream), a proportional control, and an alarm.

## Done when

- Tests: the chlorine settles at its set point; the dose follows the water's flow; an empty IBC stops the dose and raises the alarm.
- A dev room with the IBC's level, the pump's stroke rate and the controller's display.
