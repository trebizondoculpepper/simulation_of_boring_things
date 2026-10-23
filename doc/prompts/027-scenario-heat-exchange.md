# Prompt: scenario 4, heat exchange

Written by Claude (Opus 5.5, Claude Code), 2026-10-23, one of eight test scenarios the owner asked for (each proving a piece of modelling the Olympic pool's redo will need). Read `AGENTS.md`, then the scenarios already built: Dev21 (sources to sinks, `source-sink-plumbing.ts`), Dev22 (battery-backed pump, `battery-pump-rig.ts`), Dev23 (gravity drain, `jacuzzi-drain.ts`).

**Status:** Done, 2026-10-23: Dev27 (`?room=dev27`). At the owner's asking the hot side is a single gas condensing boiler on unlimited gas and power, on a closed primary circuit (circulator, three-way valve, the exchanger and its bypass), with five digital thermometers, two flowmeters and a Penfold mimic board showing the whole process. Logic in `src/game/plant/pool-heating.ts` (the boiler's own controller, `boiler-house.ts`, fires it) and `src/toolkit/gallery/logic/pool-heating-rig.ts`, tested; seen in the room holding the pool outlet at 30 °C.

## The scenario

A hot experimental source (heating water at 80 °C) and a cold one (pool water at 26 °C) through the shell-and-tube heat exchanger to two sinks. Thermometers in and out on both sides; a three-way valve on the heating side holds the pool water's outlet at its set point.

## What it proves

- Heat as a second quantity carried by flow, and a component that exchanges it (effectiveness by NTU).
- Temperature measurement and a modulating control loop.

## Done when

- Tests: the energy given by one side is what the other takes; the outlet holds its set point as the flows change; with the heating isolated the outlets fall to the inlets.
- A dev room with dial thermometers on all four connections and the valve's position shown.
