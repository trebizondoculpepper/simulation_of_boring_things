# Development Diary Entry - 2026-10-23

## Context

- **Date**: 2026-10-23 (UTC)
- **Branch**: main
- **Commit**: 5e67ab6
- **Contributors**: Claude Code (Opus 5.5) + the owner, with Codex (codex-cli 0.162) for one implementation task and two reviews

## Problem Statement

The owner asked for Dev19's pipes to be redrawn to our standards. An audit found 231 clashes among 33 runs, 40 m detours between machines 2 m apart, risers through machines and no supports. The cause was upstream of the pipe helper: a 20 m square room for 30 m² of machines, laid out only round its walls.

## Our Approach

The owner set out a room's making as stages, each handing on to the next: a room sizer, a regions helper (reserved walkways, door approaches, a gantry and its stair, where no pipe may run), placement in the space left, the plumber, and finally a scorer (prompts 017, 018, 020). Valves and isolators are left out of the layout and added by the plumber as real nodes of the port graph. It hands on a bound room, and the expanded graph is the graph the game runs.

## Implementation

- **Sizer, regions and placement:** placement fills bands round a ring walkway, with the owner's sites (big tanks in corners, panels on walls, pumps freestanding) and batteries of like machines.
- **Real-size remote valves,** from Belimo's datasheets.
- **The plumber's expansion:** isolating valves, power isolators, and non-return valves where the rules call for them. Each line leaves its machine on a reachable straight, its fittings are set where someone standing on clear floor can reach them, and a flue ends at a magic ceiling terminal.
- **Dev19's simulation on the expanded graph,** with working fittings. Codex implemented the simulation side from prompt 019.
- **Scorers:** a placement scorer and a final scorer, gates first, with pipework priced per metre.
- **Comparison rooms:** Dev19b holds Codex's rules on the old lanes, and Dev19c the best of a scored search.

## Outcomes

By the scorer:

- Dev19 this morning: 38.8, with about £49,600 of pipework at estimated rates.
- Dev19c: 71.7, with about £23,900.

Every version still fails one gate: pipe clashes, from the old overhead lanes. Codex's reviews were valuable. They corrected my BS 7671 claim and my blanket non-return valve rule, and shaped the scorer: gates first, and baselines the candidate cannot choose. The scorer found a fault I had missed: a power drop running down through the walkway.

## Next Steps

- The plumber's own router, to replace the old lanes and clear the clashes.
- Concentric power and control buses.
- Remove the simulation's hand-listed line checks (Codex's concern).
- Stage scorers for the router.
- Decide which comparison rooms to keep.
