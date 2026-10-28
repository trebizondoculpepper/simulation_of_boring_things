# Development Diary Entry - 2026-10-28

## Context

- **Date**: 2026-10-28 15:30 UTC
- **Branch**: main
- **Contributors**: Claude Code + the owner

## Problem Statement

The owner asked for the two pool groups' dosing controllers to be designed, installation to come later: a modern multi-channel touch-screen controller for the Olympic (after the DULCOMARIN 3 or DEPOLOX Pool) and a period pair of single-channel controllers for the Lounge (after the DULCOMETER D1C, about 2000). Midway the owner added that both are Chlorella's, each has a sample line in and out with its valves, signal cables run in conduit to the pumps, and the relays run along the wall to the control room.

## Our Approach

Research first: the D1C's 1997 operating instructions (read in full) gave its six keys, its menus, its limit and alarm relays, its pause input and its calibration limits; the DULCOMARIN 3's product page its touch screen, screen recorder and inputs; the DEPOLOX manual (read for mission 101) the interlocks. Then one pure controller model generalised from mission 101's hidden `stepControl`, proved equal to it step by step with the world's settings, and two faces as views over it, each pure where it can be (the touch screen described as rectangles, text and lines with its touch zones; the DC-1's menus as a key-driven state machine).

## Implementation

`dosing-controller.ts` (the model), `sample-cell.ts` (the cell and its probes, with a drifted set), `cx7-hmi.ts` and `dc1-face.ts` (the faces), `dosing-controller-trial.ts` (two demonstration pools in the chemistry model), each tested; the views `cx7-controller.ts`, `dc1-controller.ts`, `sample-cell-panel.ts` and `dosing-controller-trial.ts`; one exhibit in dev44; five new seven-segment glyphs. The installation prompt is `doc/prompts/105-dosing-controllers.md` (103 and 104 were taken while this was under way).

## Outcomes

- The faults play as the research said they should: a pump that delivers nothing winds the PI controller to 100 % and trips the maximum dosing time after two hours; a soda ash slug locks chlorine out; drifted probes overdose until calibrated against the photometer.
- The CX-7's screen at first ignored every touch: the touch-surface kit puts a screen in its frame's face, coplanar, and the ray struck the frame first. The CX-7 now answers a use on its frame within the opening as a touch on the screen; the kit itself may want the same.
- The demonstration pool's alkalinity (60 mg/l) is weak, so the first soda ash slug (4 kg) took pH to 9; 1.5 kg makes a believable excursion.

## Next Steps

The owner's six questions in the prompt, one at a time, then installation: schematics first, then the world, the rooms, the annunciators and the bridge.
