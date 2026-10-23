# 042: How to make the world model faster — an investigation

Status: planned 2026-10-24; an investigation, not a delivery (the owner). Nothing in the game is to be changed by it; its product is a report with measurements and a ranked recommendation, for the owner to decide what, if anything, to build.

## The question

Can the world simulation (`src/game/world.ts` and what it steps: the pools, the Olympic battery and tank, the wet hall, bathers, gas, chemicals, the identified plant) be made much cheaper at run time, perhaps by compiling the authored model (blocks within blocks, addressed by path, `doc/plant-model.md`) into a purely numerical form? Which specific steps would give the most benefit for the least cost, now and as the model grows?

## What is known (2026-10-24, measured on the owner's Mac)

- One `stepWorld` of 0.1 s costs about 25 µs; at 10 steps a second, about 0.25 ms of each second of play: not a run-time problem today.
- Catching up after the tab was away (`advance`, capped at `CATCH_UP_LIMIT`, an hour, 36 000 steps) costs about 0.8 s on load.
- About 45 % of each step (11 µs) is `footbathLineup`: four parts found by tag by walking the whole identified plant (`walkIdentified`), every step.
- The saved world is about 5.5 KB of JSON.
- The model will grow: every pool on the Olympic's pattern, the control room, the lounge relayout (`TODO.md`); perhaps four or five times what it is.

## Candidate steps to test

Each to be tried as an experiment on a copy (a scratch branch or export, never `main`), measured, and judged for its gain against what it costs in code, readability, testability, save format and migrations.

1. **Resolve addresses once.** Tag and path lookups resolved to references or indices when a world is made (or memoised by the identified plant's identity), not searched every step.
2. **Solve only on a discrete change.** Valve positions, pumps and isolators are discrete: cache each flow network's solution (`src/game/sim/hydraulics.ts` and its users) by its line-up, re-solving only when that changes.
3. **Faster catch-up.** Large steps between events (a float switching, a tank emptying, a trip), and closed forms where the physics allows (exponential approach of temperatures, chlorine decay), so an hour away costs milliseconds and the hour's cap could go.
4. **A compiled numerical form.** The block model kept as the authored source, compiled to a flat run-time form: state in typed arrays, steps as tight loops, a map from paths to indices for the rooms. Measure the gain on today's model and on a synthetic one four or five times the size.
5. **Off the main thread.** The step in a Web Worker, posting the world to the rooms: no faster, but nothing it does can delay a frame. WebAssembly for numeric kernels only as a note: it changes the build tooling, which needs the owner's permission.
6. **Anything the profiling finds.** Profile a step and a catch-up first (Node's profiler, or the browser's), and follow what is actually expensive, which may be none of the above: immutable copying of the world each step, the bathers, JSON in saving.

## Method

- A benchmark harness first, kept for later (a `*.bench.ts` or a test that reports, not asserts): a step's time, its parts' times, an hour's catch-up, the saved size; on today's world and on a synthetic grown one.
- Each candidate measured against the same harness, with the world's results checked unchanged (the same state after the same steps, within a stated tolerance), since a faster model that answers differently is not the same model.
- Note for each: the gain, the effort, what it changes for readers of the code and for the save, and whether it can be done in stages.

## Deliverable

A report in `doc/` (and a diary entry): the measurements before and after each experiment, the candidates ranked by benefit for effort, and a recommendation of what to build now, what to keep for when the model grows, and what not to do. The experiments themselves are not merged; the benchmark harness may be, if the owner agrees.
