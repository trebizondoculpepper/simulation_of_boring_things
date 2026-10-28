# Development Diary Entry - 2026-10-28

## Context

- **Date**: 2026-10-28 13:00 UTC
- **Branch**: main
- **Commit**: (this commit)
- **Contributors**: Claude Code + User

## Problem Statement

The owner: "Design a new pump. Let's continue with this insufficient pump and observe how it goes wrong." The chemistry model says the Olympic needs about 12.5 l/h of 14 % hypochlorite; its plant room has a DMX 1602 of 2.1 l/h. Another agent is putting the chemistry into the world with the undersized pump, to watch it fail; the replacement was to be designed and built in a dev room only.

## Our Approach

Research the real 10–30 l/h pumps for hypochlorite (ProMinent Sigma, gamma/ X, Beta; Grundfos DDA, DME; LMI; Seko Tekna; Watson-Marlow Qdos), then pick one that adds something the plant does not already have. The game already has a Qdos (PERI 30) and a DDA (DDS 7.5-16), either of which would fix the Olympic; so the new pump is a motor-driven diaphragm pump after the Sigma/ 1, with a mechanical stroke dial and the gas-locking problem as its gameplay.

## Implementation

`motor-dosing-pump.ts` models it stroke by stroke: a stroke must compress the head's gas to the discharge pressure before its outlet lifts, so gas takes the start of every stroke and, past a point, all of it. Bleed, degassing head, relief, flow monitor, level and diaphragm alarms follow from that. `motor-dosing-trial.ts` is dev44's small demo state: one controller output asking the DMX and the DMH for the same dose. Views: the pump at true size with a seven-segment fascia, a dial and a bleed knob, and the trial station with damper, gauge, faults and litre counters. A first draft gave it a new maker (Hubwerk); the owner, seeing the pictures, made it Grundflow's (the DMH 21-10) and asked for smaller lettering on its fascia. Mission 102 holds the research table, the design, the tags and seven questions.

Later the same day the owner asked for the pumps as a family on the ideal pump: the head's stroke model moved to `diaphragm-head.ts`, sized by stroke and head volume so it serves the DMX's 0.19 ml stroke and the DMH's 3.9 ml alike, and `metering-pump.ts` puts the ideal, peristaltic, solenoid, stepper and motor pumps behind one interface. The owner also decided on one pump, not a duty pair: the fallback is hand dosing at the balance tank.

## Outcomes

- In the browser the DMX falls behind at the Olympic's average while the DMH keeps up; on a standard head a slug of air gas-locks it and the flow monitor trips it to `Er F`, while it still shows its set rate, as a real pump would.
- The shared dev server reloads now and then (other agents' edits), so a long wait in a browser check can lose the demo's state; the tests carry the timing cases.
- Clicks through `exhibitRoom.use` must land on the knob itself; a few pixels off hits the legend plate and does nothing.

## Next Steps

Once mission 101's `water-treatment.ts` is on main, link the family to the world (each pool's real pump; the Olympic keeps its DMX 1602). Then, when the owner asks, install the DMH one for one (schematic first), asking the open questions one at a time.

## Later: the family in the world

Once mission 101's `water-treatment.ts` landed, the pumps became real in the world (`src/game/plant/dosing-pumps.ts`, `world.dosingPumps`, WORLD_VERSION 59): the DMX 1602s and DDS 7.5-16s are stepped stroke by stroke and what they deliver is the dose, so the Olympic's DMX now gives about 2.09 l/h flat out, and a gas slug stops it until it is bled and acknowledged. Two lessons. A flow monitor that counts while the bleed is open trips during priming, so it now rests while priming. And `world.slow.test.ts`'s bathers test compared one day's bathers with another's; any change to any pool's water moved the bathers' shared random stream and failed it, so it now compares the same morning with and without hypochlorite. The owner also asked for lighter keys on the pumps (now light grey with dark marks) and piezo bleeps, which wait for mission 100's library.
