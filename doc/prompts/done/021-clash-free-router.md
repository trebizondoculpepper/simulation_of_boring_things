# Prompt: a router that never puts a pipe through another

Written by Claude (Opus 5.5, Claude Code), 2026-10-23, for Codex to review, improve, build and test at the owner's direction. Read `AGENTS.md`, then prompts 017 (the room's layers), 018 (the plumber), 020 (scorers and pipe costs) and 016 (the pipe helper's routing).

## Why

Dev19's lines are still routed by the old overhead lanes (`route()` inside `demoPlumbing`, `src/toolkit/gallery/logic/port-graph-demo-routes.ts`):

- each line goes up from its port to a lane chosen by counting;
- it runs to a z near the north wall, along x, and back down.

Every riser climbs through the lanes below it, and x-runs cross z-runs at the same height. The scorer (`room-scorer.ts`) finds about 180 clashes (`pipeClashes`, `pipe-route.ts`) in every version of Dev19, and that is now the one gate every room fails. The router must prevent clashes by construction. The checker stays as the proof.

## The design (Claude's first draft: review and improve it)

1. **A voxel search grid, with a continuous final check.** A 0.1 m cell is useful for finding routes but cannot establish a 25 mm gap: occupancy must conservatively cover every cell touched by a swept pipe or fitting, and `pipeClashes` plus exact region intersection must check the final polylines. Grid size and memory are bounded by the actual room, with an explicit failure if a route cannot fit.
   - Mark only regions whose `forbids.runs` is true, the room envelope, and machine volumes with known height. `layout.solids` are floor footprints, not 3D machine boxes; do not silently treat them as full-height obstacles. Permit only the lead belonging to a machine to start inside that machine's envelope.
   - Reserve full assembled lines before splitting around inline devices; pieces of one line meet intentionally. Account for insulation and joint fittings using the drawing helper's geometry, and use the checker's 5 mm clearance unless a larger design clearance is explicitly required.
2. **A height for each direction**, the standard pipe-rack rule:
   - east–west runs on one set of levels, north–south runs on another;
   - a change of direction changes level at its bend;
   - so perpendicular horizontal runs never meet.

   The router may prefer this as a cost, not require it, if that routes better.

3. _*A path search (A*) on the grid_* between fixed, square port leads (`withPortLeads`, `portLead`):
   - orthogonal moves only;
   - a cost per bend;
   - the cost per metre from the line's price (`pipe-costs.ts`);
   - only through free cells, the pipe's radius checked against obstacles grown by it.

   Keep it fast with a bounded search region, but expand that region or report failure rather than assume that a route outside the first box does not exist. Every candidate is rechecked after `withPortLeads`, bend rounding and fitting placement.

4. **Order:** the hardest to move first. Flues and lagged heating first, then pool mains, gas, copper and small bore, then conduits.
5. **Rip-up and reroute** (negotiated congestion), with a deterministic retry limit:
   - a line that cannot route may remove the earlier lines blocking it;
   - those cells' costs rise, and the removed lines route again;
   - repeat, up to a limit.

   Recheck every affected line after a retry. What still cannot be routed is reported as a problem and omitted, never drawn through something. This applies to the flue and its ceiling terminal too.

6. **Keep what exists working:**
   - the reachable-end straights and the inline fittings (`placeInline`, `splitAt`): fittings must still land on reachable straights;
   - the magic ceiling terminal for the flue;
   - ports left square.

   The router replaces only the overhead lanes between the ends.

7. **Proof:** `pipeClashes` over the final split runs must find no clash, while every line still leaves its ports square, all fitted devices remain reachable, and no run enters a reserved region. Compare the same room layout and plumbing rules before and after for Dev19 (`?room=dev19`), Dev19c and Dev19d. Record scorer gate failures separately from the numeric score.

## What to build

- `src/toolkit/components/core/logic/voxel-router.ts`, pure, with tests beside it (`vite-plus/test`): the grid, marking, the search, the ordering, and rip-up and reroute.
- Use it in `demoPlumbing` in place of the lanes, for gas, water and power lines.
- Tests:
  - two lines that must cross do so at different levels;
  - a riser does not pass through a run above it;
  - nothing enters a reserved region;
  - Dev19's plumbed runs have no clashes (`pipeClashes`);
  - every fitting is still within reach;
  - the scorer's gates pass, or the report says precisely why not;
  - layout time stays acceptable (report it).

## Rules

- **First, review this prompt.** Improve it where it is wrong or vague, editing this file, and say what you changed and why. Then build it.
- **Edit only** `voxel-router.ts` and its test (new), `src/toolkit/gallery/logic/port-graph-demo-routes.ts` (only what the router needs) and its tests, and this prompt. Claude will not edit these while you work.
- **Do not commit or push.** Claude reviews your work, runs the full checks and commits it, naming you.
- Run `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` and `npm run build`, and report the results. Format with `npx vp fmt`.
- UK spelling. Markdown one paragraph per line. Keep the existing style, with comments only where the code around them has them.

## Report

End with:

- what you changed in this prompt;
- what you built;
- the clash counts and scores for Dev19, Dev19c and Dev19d, before and after;
- the layout time;
- anything still wrong.
