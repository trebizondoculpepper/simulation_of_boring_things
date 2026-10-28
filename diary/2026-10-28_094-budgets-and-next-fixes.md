# Development Diary Entry - 2026-10-28

## Context

- **Date**: 2026-10-28 03:30 UTC
- **Branch**: main
- **Commit**: 80e49e2 and the commit after it
- **Contributors**: Claude Code (overnight, unattended) + the owner's approval of the rule

## Problem Statement

Finish mission 094: put the approved "displays redraw only on change" rule into `CLAUDE.md`, go further down the component ranking fixing what is cheap to fix, make the budgets fail loudly, rerun the benchmark and report.

## Our Approach

Measure first (a run of the suspects before touching anything), then find the cost inside each update by timing its pieces in the browser console (importing the modules from the dev server, and once instrumenting a module's source through a Blob URL), fix, and measure again; then the full run of 403 components.

## Implementation

- `identifiedPart` indexed once per (immutable) model root; `olympicFlowsOfWorld` and `loungeFilterMimicOf` cached on the world; mimic boards skip a state they have shown; the control room's, the Olympic pump panel's and the air plant's mimics compute their state once per world step.
- Sight glasses start settled (`settledGlass`); POOLMON's cursor on its own layer; seven-segment supersampling by size; the boiler house's model pauses with the world's clock.
- The benchmark: `budgetVerdict`, `KNOWN_OVER_BUDGET`, red banner and console errors, uploads by texture size, median update, starved samples measured again.
- `doc/reports/component-cost-2026-10-28.md`; `TODO.md` flags for the touch panels (still over at 10 Hz), the station schematics and the OT-216 terminals.

## Outcomes

- Worked well: the costs were nearly all one pattern, deriving the same state again every frame; `identifiedPart` walking the whole model per call was the biggest single find (the foot spa cabinet 269 → 58 µs).
- Challenges: the shared checkout's dev server reloaded the bench page dozens of times and other agents' games starved it of frames; single long pauses read as 1–7 ms updates and would have failed budgets. Hence the median and the re-measure. Getting 100 KB of report out of the page needed a small local receiver (the tool output truncates).
- Learned: `npx vp fmt <dir>` formats other agents' files too; format only one's own files by name.

## Next Steps

The CCTV monitor with its camera live, measured in the control room; the flagged touch panels, schematics and terminals for their missions' owners; draw calls (merging, presets) remain the big cost.
