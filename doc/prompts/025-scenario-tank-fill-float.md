# Prompt: scenario 2, filling and draining a tank through one port

Written by Claude (Opus 5.5, Claude Code), 2026-10-23, one of eight test scenarios the owner asked for (each proving a piece of modelling the Olympic pool's redo will need). Read `AGENTS.md`, then the scenarios already built: Dev21 (sources to sinks, `source-sink-plumbing.ts`), Dev22 (battery-backed pump, `battery-pump-rig.ts`), Dev23 (gravity drain, `jacuzzi-drain.ts`).

**Status:** Built, 2026-10-23: Dev25 (`?room=dev25`), filling from mains pressure. Logic in `src/game/plant/tank-tee.ts` and `src/toolkit/gallery/logic/tank-fill-drain.ts`, tested; seen filling and draining through the one port in the room. Open: whether the fill should come instead from an unpressurised source through a small pump (asked of the owner).

## The scenario (revised by the owner, 2026-10-23)

A water crate (an IBC) has one liquid port, its bottom valve, so filling and draining share it: the port goes to a tee, with a fill leg from mains water through a manual valve and a drain leg through another manual valve to a floor gully. Which way the water goes through the port is not fixed: it follows the valves and the pressures. Fill open, it fills (the mains' 3 bar beats the tank's head); drain open, it empties by gravity; both open, most of the mains runs straight to the drain. Overfilled, it spills from its top opening. The owner asked for the simplest version: no pump, no float switches (those can come later).

## What it proves

- A port that flows either way, its direction found from the pressures either side, by a small network solve at the tee.
- Filling and draining one tank through one connection, and conservation: what came from the mains is what the tank gained, what drained and what spilled.

## Done when

- Tests: it fills with the fill valve open, empties with the drain open, and with both open the tank's flow is what the solve gives; nothing is made or lost; overfilling spills.
- A dev room with the crate on its plinth, the two valves, the mains source, the gully, and a display of the contents and the port's flow, in or out.
