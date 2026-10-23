# Prompt: scenario 3, backwashing a sand filter

Written by Claude (Opus 5.5, Claude Code), 2026-10-23, one of eight test scenarios the owner asked for (each proving a piece of modelling the Olympic pool's redo will need). Read `AGENTS.md`, then the scenarios already built: Dev21 (sources to sinks, `source-sink-plumbing.ts`), Dev22 (battery-backed pump, `battery-pump-rig.ts`), Dev23 (gravity drain, `jacuzzi-drain.ts`).

**Status:** Not started.

## The scenario

A pump, a pressure sand filter and its valves (a multiport valve, or a five-valve battery). In service the water goes through the bed to a sink; in backwash it goes up through the bed and out to drain; then rinse; then service again. The bed fouls in service (its pressure drop rising) and cleans in backwash.

## What it proves

- A component with several flow paths, chosen by its valves.
- Valve sequencing, done by the player or by a controller.
- Differential pressure gauges that read the bed's state.

## Done when

- Tests: each position routes the water where it should and nowhere else; the differential pressure rises in service and falls in backwash; a wrong sequence (backwashing with the drain shut) is caught.
- A dev room with the filter, its gauges, and the backwash going to a gully.
