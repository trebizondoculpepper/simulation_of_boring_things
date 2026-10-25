# Prompt: scenario 1, duty and standby pumps

Written by Claude (Opus 5.5, Claude Code), 2026-10-23, one of eight test scenarios the owner asked for (each proving a piece of modelling the Olympic pool's redo will need). Read `AGENTS.md`, then the scenarios already built: Dev21 (sources to sinks, `source-sink-plumbing.ts`), Dev22 (battery-backed pump, `battery-pump-rig.ts`), Dev23 (gravity drain, `jacuzzi-drain.ts`).

**Status:** Done, 2026-10-23: Dev24 (`?room=dev24`). Logic in `src/game/plant/duty-standby.ts` and `src/toolkit/gallery/logic/duty-standby-rig.ts`, tested; seen working in the room (pump 1's isolator off: P1 FAULT and DUTY FAIL lit, pump 2 running, the flow kept at 300 m³/h).

## The scenario

Two pump sets draw from one source through a shared suction header and deliver into a common discharge header, to a sink. A duty/standby controller runs one (the duty, as selected) and keeps the other in reserve. When the duty pump fails (its local isolator switched off, say), the controller sees it has not started, raises DUTY FAIL and starts the standby. Each pump's non-return valve keeps the running pump's water from coming back through the idle one.

## What it proves

- Headers (manifolds) as components with their own ports, so several pumps can share a suction and a delivery.
- Non-return valves doing their job; and what happens when one jams open (water recirculates through the idle pump, and the delivery falls).
- The first real control logic: a controller with commands out and running feedback in, a fail timer, latched alarms and a reset.

## Done when

- The plumber lays it out and routes it with no clashes; each pump has its suction isolating valve, its discharge non-return and isolating valves, and a local power isolator.
- Tests: the duty runs; isolating it starts the standby within the fail delay and latches DUTY FAIL; reset clears it once the duty is available; a jammed non-return valve shows reverse flow through the idle pump.
- A dev room shows it working, with its panel's lamps, the pumps' gauges and a flow readout.
