# Development Diary Entry - 2026-10-27

## Context

| Time      | Branch | Commit                     | Task                                               |
| --------- | ------ | -------------------------- | -------------------------------------------------- |
| 18:30 UTC | main   | (see git log, mission 094) | Find the slowest components, then fix or flag them |

## Problem Statement

The owner asked whether some controls are slow and could be implemented better, naming the chart recorder as a sparingly used, not very interesting control that would be first in line if it were slow. Mission 094 asked for a browser benchmark of every component kind, a ranking by cost where used, and for the worst a decision: fix cheaply, flag for replacement, or leave.

## Our Approach

A development-only page, `bench.html?bench=components`, builds each component alone (every room item through the room's own `modelFor`, the development rooms' exhibits, dev0's boards and plinths, the touch panels), runs it for a second and a bit with the world frozen and again with it running, and counts texture uploads and texels by wrapping the WebGL context and canvas drawing calls by wrapping `CanvasRenderingContext2D`. The arithmetic (ranking, budgets, the table) is pure and tested in `logic/component-bench.ts`. Results were posted from the page to a scratch HTTP sink on localhost to get them onto disk, since the browser tool's output is truncated.

## Implementation

The benchmark (`views/component-bench.ts`, `bench.html`, `src/bench.ts`, `buildRoomItem` exported from `views/room-equipment.ts`); fixes in the circular chart recorder, the DoseCell head, `plantReadingOf` (a WeakMap by world), the balance tank panel's binding, the teleprinter, the diaphragm pumps' LCD and the mimic board; the report `doc/reports/component-cost-2026-10-27.md`; two flags in `TODO.md` (the touch panels, the peristaltic pump's screen).

## Outcomes

- The chart recorder was indeed the worst display: 60 uploads of 512 × 512 a second for an unchanged picture. Fixed in four lines.
- The ranking by total cost is dominated by draw calls (about 15 µs each on this M3 Max), not by display work: big machines of 300+ draw calls each lead it. The research's conclusion stands: the frame rate is a GPU and draw-call problem.
- Canvas pixel hashes before and after over 600 frames were identical for every fixed display but the circular chart, whose antialiasing differs; screenshots in `doc/reports/component-cost-2026-10-27/`.
- Other agents' edits reload the dev server's pages often; the benchmark keeps its progress in `sessionStorage` and carries on after a reload (`fresh` starts again, and is dropped from the URL once used).
- Chrome's timer is coarse (0.1 ms) without cross-origin isolation, so the back-to-back update timing is the figure to trust; render times varied ±30 % between runs with other tabs busy.

## Next Steps

The owner decides on the `CLAUDE.md` rule (proposed in the report) and on the two flags; the CCTV monitor wants measuring with its camera live in the control room; the draw-call merging entries in `TODO.md` are where the real frame time is.
