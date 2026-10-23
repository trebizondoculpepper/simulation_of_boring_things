# Prompt: a router that never puts a pipe through another

Written by Claude (Opus 5.5, Claude Code), 2026-10-23, for Codex to review, improve, build and test at the owner's direction. Read `AGENTS.md`, then prompts 017 (the room's layers), 018 (the plumber), 020 (scorers and pipe costs) and 016 (the pipe helper's routing).

## Why

Dev19's lines are still routed by the old overhead lanes (`route()` inside `demoPlumbing`, `src/toolkit/gallery/logic/port-graph-demo-routes.ts`):

- each line goes up from its port to a lane chosen by counting;
- it runs to a z near the north wall, along x, and back down.

Every riser climbs through the lanes below it, and x-runs cross z-runs at the same height. The scorer (`room-scorer.ts`) finds about 180 clashes (`pipeClashes`, `pipe-route.ts`) in every version of Dev19, and that is now the one gate every room fails. The router must prevent clashes by construction. The checker stays as the proof.

## The design (Claude's first draft: review and improve it)

1. **A voxel reservation grid.** The room is divided into cells of 0.1 m. At 13 × 13 × 8 m that is 1.35 million cells, so a `Uint8Array` of about 1.4 MB, or a `Uint16Array` of about 2.7 MB with a cost per cell.
   - The obstacles are marked first: the machines' boxes, the walls, and the reserved regions that forbid runs (`room-regions.ts`, and placement's walkways below 2.1 m).
   - Each routed run then marks its cells, padded by its outside radius, any insulation, its largest fitting (`fittingsOf`, `jointFitting`) and a clearance of 25 mm.
2. **A height for each direction**, the standard pipe-rack rule:
   - east–west runs on one set of levels, north–south runs on another;
   - a change of direction changes level at its bend;
   - so perpendicular horizontal runs never meet.

   The router may prefer this as a cost, not require it, if that routes better.

3. _*A path search (A*) on the grid_* from each port's lead (`withPortLeads`, `portLead`) to the other's:
   - orthogonal moves only;
   - a cost per bend;
   - the cost per metre from the line's price (`pipe-costs.ts`);
   - only through free cells, the pipe's radius checked against obstacles grown by it.

   Keep it fast by searching only within the line's bounding box plus a margin, and by moving in straight runs between bends.

4. **Order:** the hardest to move first. Flues and lagged heating first, then pool mains, gas, copper and small bore, then conduits.
5. **Rip-up and reroute** (negotiated congestion):
   - a line that cannot route may remove the earlier lines blocking it;
   - those cells' costs rise, and the removed lines route again;
   - repeat, up to a limit.

   What still cannot be routed is reported as a problem, never drawn through something.

6. **Keep what exists working:**
   - the reachable-end straights and the inline fittings (`placeInline`, `splitAt`): fittings must still land on reachable straights;
   - the magic ceiling terminal for the flue;
   - ports left square.

   The router replaces only the overhead lanes between the ends.

7. **Proof:** `pipeClashes` over every run must find no clash, and the scorer's clash gate must pass for Dev19 (`?room=dev19`), Dev19c and Dev19d.

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
