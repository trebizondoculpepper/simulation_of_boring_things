# Development Diary Entry - 2026-10-28

## Context

| Time      | Branch | Commit   | Task                                                    |
| --------- | ------ | -------- | ------------------------------------------------------- |
| 11:57 UTC | main   | fab84ca0 | Research dosing, dosing control and the water chemistry |

## What we were asked to do

The owner asked how dosing and its control could be simulated, what the basic chemistry is, and which chemicals pool technicians add by hand, after asking whether panels could show litres, kg or moles, whether the system copes with a delivery over or under strength, and how the closed-loop feedback works. The product is a research note for a future mission; no game code was to change.

## What we did

Read the PWTAG Code of Practice (2021) and the Wallace & Tiernan DEPOLOX Pool Compact manual in full (both as PDFs, converted with `pdftotext`), PWTAG's superchlorination note, bleach-storage guidance and a range of supplier and instrument sources; worked the stoichiometry, the carbonate pH solve, the Langelier index for our waters, the hypochlorite decay table and the pump sizing in a scratch script. Checked the game's code: `pools.ts`, `chemicals.ts`, `chemical-distribution.ts`, `pool-dosing.ts`, `water-condition.ts`, `sampling.ts`, the dosing boards and the displays. Wrote `doc/research/pool-dosing-and-water-chemistry.md` and a TODO entry for the mission.

## What came out

A closed loop copes with a weak delivery by running its pump longer; the first sign is consumption, the dosing-time alarm the last. A hydrometer catches a watered-down hypochlorite load but not a stale one, because decomposition conserves the solution's mass. The game's `sampling.ts` already holds a full flow cell, probes and controller that nothing uses; the Olympic's model draws three times what its drawn DMX 1602 pump could deliver; and every display reads the true water rather than a sensor.

## What we learned

The earlier chemistry note (2026-10-22) and the sampling note (2026-10-20) had most of the chemistry and the hardware; the new work was the control law, the interlocks, strength in the tanks, the hand chemicals and the tests. No source gives probe drift as a rate, so the game's figures must be invented to fit PWTAG's daily check tolerances.
