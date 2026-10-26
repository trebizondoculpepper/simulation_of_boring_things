# Prompt: scenario 5, chemical dosing with a measurement loop

Status: active (checked 2026-10-26): Dev41 has an ideal dosing bench, but the requested IBC-fed, probe-controlled scenario with loss of prime and a low-level alarm remains outstanding.

## Review checkpoint — 2026-10-26

**Classification:** Active / planned. **Filed:** `doc/prompts/028-scenario-chemical-dosing.md`.

**Delivered:** Dev41 demonstrates an ideal dosing station in `water-bench.ts`; this is preparatory work for the requested closed-loop rig.

**Still outstanding:** Build the IBC-fed measurement loop, probe/set-point control, loss of prime and low-level alarm, and complete the scenario’s acceptance checks.

**Evidence:** Current prompt, its Remaining section and source check. Reviewed against source `e5078c4`.

The original request and earlier implementation notes below are retained as history; this checkpoint supersedes any conflicting old completion claims. Outstanding work remains open in the root TODO.

Written by Claude (Opus 5.5, Claude Code), 2026-10-23, one of eight test scenarios the owner asked for (each proving a piece of modelling the Olympic pool's redo will need). Read `AGENTS.md`, then the scenarios already built: Dev21 (sources to sinks, `source-sink-plumbing.ts`), Dev22 (battery-backed pump, `battery-pump-rig.ts`), Dev23 (gravity drain, `jacuzzi-drain.ts`).

**Status:** Scenario not yet implemented; ideal dosing bench available.

## The scenario

A dosing pump draws hypochlorite from an IBC and injects it into a water line; a free-chlorine probe downstream drives the pump's rate to hold a set point. When the IBC runs dry the pump loses prime and a low-level alarm sounds.

## What it proves

- Small flows into large ones, and concentration as a property of the water.
- A measurement with a lag (the probe downstream), a proportional control, and an alarm.

## Done when

- Tests: the chlorine settles at its set point; the dose follows the water's flow; an empty IBC stops the dose and raises the alarm.
- A dev room with the IBC's level, the pump's stroke rate and the controller's display.

## Remaining (checked 2026-10-26)

- A dosing pump drawing from an IBC into a water line, the concentration carried by the water (building on [070](070-water-condition.md)).
- A free-chlorine probe downstream with its lag, proportional control to a set point, loss of prime and a low-level alarm as the IBC runs dry.
- Tests: chlorine settles at its set point; the dose follows the flow; an empty IBC stops the dose and raises the alarm.
- A dev room showing the IBC's level, the pump's stroke rate and the controller's display.
