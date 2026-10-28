# 094: Find the slowest components, then fix or flag them

Status: stages 1–3 done 2026-10-27 ([report](../reports/component-cost-2026-10-27.md)): the benchmark built and run in the browser, every component ranked, the chart recorders and the other named offenders fixed (before and after numbers in the report) or flagged in `TODO.md`. Stage 4 done 2026-10-28 ([report](../reports/component-cost-2026-10-28.md)): the rule in `CLAUDE.md` (the owner approved it), the budgets failing loudly, and the next components down the ranking fixed (view state once per world step, the sight glasses, POOLMON's cursor, small seven-segment displays) or flagged in `TODO.md`. Still open: the CCTV monitor measured with its camera live. Written 2026-10-27 from the owner's request.

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first, and the research this builds on, [display-only updates](../research/display-only-updates.md). Markdown is one paragraph per line.

## The request

The owner, 2026-10-27: "I'm particularly interested to find out if there are any controls that are slow that maybe we could implement better. I like, for example, the chart recorder is one that we use fairly sparingly, and it's not a particularly interesting control. So if that's one of our slower controls, then that might be one that we consider dealing with first, because there's a few of them in the game. Would it make sense to have a mission about identifying the slowest components and widgets and either fixing or flagging them for replacement?"

## What is known already (the research, 2026-10-27)

The world's simulation is cheap (about 0.08 ms a step); the cost is drawing. Displays found redrawing with nothing changed: the circular chart recorder (a 512 × 512 canvas uploaded every frame), the CCTV monitor (an upload every frame and a GPU stall 12.5 times a second), the strip recorders (fixed 4 and 12 Hz redraws), the peristaltic pump's screen (about 26 redraws a second while running), the DoseCell heads (the whole display rebuilt every frame to find it unchanged), and `plantReadingOf`, recomputed by about 11 displays every frame. Estimated together at 1–3 ms a frame in the control room and the Olympic plant room (a guess; not yet measured in a browser). The Olympic plant room also has over 1,600 draw calls.

## The work

1. **Measure each component on its own.** A benchmark, run in the browser (a dev room or a dev-only page, `?bench=components`), that builds each component kind the rooms use (every entry of the room-equipment `MODELS` map, the industrial-control parts, the displays, the dev0 boards' fittings, the new touch surfaces) one at a time and records for each: its per-frame `update` time (mean and worst over a few seconds, idle and active), canvas redraws and texture uploads per second, the texels uploaded per second, its draw calls and triangles, its materials and textures (GPU memory), and its build time. Results as a table, saved (`doc/reports/component-cost-<date>.md`) and printable from the console, so it can be rerun after each fix.
2. **Rank them** by what they cost in the rooms where they are used (cost × how many there are × whether they are in the busiest rooms), not by the unit cost alone.
3. **For each of the worst, decide:**
   - **fix** where it is cheap and the component is worth keeping: redraw only when what it shows changes; work out its state once per world step, not per frame; draw at a lower resolution; share materials and textures between copies; merge static geometry; throttle a redraw that can wait;
   - **flag for replacement** where the component is slow and, as the owner says of the chart recorder, not a particularly interesting control: record it in `TODO.md` with what could replace it (a simpler drawing, another archetype from `doc/design/control-interface-archetypes.md`, or fewer of them), for the owner to decide;
   - or **leave** it, with its cost noted, if it is cheap enough.
     The chart recorders first (the owner's example), then the others the research names.
4. **Guard against regressions:** a budget per component kind (an upload rate and an update time), checked by the benchmark, failing loudly when a component goes over it; and the rule, written into `CLAUDE.md`, that displays redraw only on change.

Out of scope: splitting the world into fast and slow update rates (the research advises against it); the room-level draw-call work (the Olympic plant room's merging, the graphics presets), which has its own entries.

## Acceptance

- The benchmark exists, runs in the browser, and its first report is committed, ranking every component kind.
- The chart recorders and the other named offenders fixed or flagged, each with its before and after numbers.
- Flagged components listed in `TODO.md` with their proposed replacements, for the owner.
