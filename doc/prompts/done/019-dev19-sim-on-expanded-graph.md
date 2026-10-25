# Prompt: Dev19's simulation runs on the expanded graph

Written by Claude (Opus 5.5, Claude Code) for Codex, 2026-10-23, at the owner's direction. Read `AGENTS.md`, then `doc/prompts/done/018-plumber-valves-and-isolators.md`, especially its sections "Revision" and "The bound room". This is one bounded task within that work.

## The task

The plumber now adds fittings to Dev19's lines as real nodes of the port graph (isolating valves, non-return valves, power isolators), splitting each link they sit on. Dev19's simulation (`createPortGraphDemo` in `src/game/plant/port-graph-demo.ts`, which you wrote) must run on that expanded graph and honour the fittings' states. Claude is building the expanded graph and binding the room's controls to it, in other files, at the same time.

### What to change, in `src/game/plant/port-graph-demo.ts` only (and its test)

1. **`createPortGraphDemo(graph = demoGraph)`** takes the graph it runs. Every use of `demoGraph` inside it uses `graph` instead. Export a structural type, for example `DemoGraphLike`, that both `demoGraph` and an expanded graph satisfy:
   - nodes with `id`, `data.kind` (a string) and `ports`;
   - edges with `id`, `sourceId`, `sourcePort`, `targetId` and `targetPort`.

   `@statelyai/graph`'s `createGraph` output must satisfy it.

2. **Fitting nodes.** These have `data.kind` set to `'isolating-valve'`, `'non-return-valve'` or `'power-isolator'`. Each has two ports, `in` (direction `in`) and `out` (direction `out`), whose medium is the line's. Each split link becomes edges `<link>#0`, `<link>#1`, … through them, in order from source to target.
3. **State.** `state.fittings: Record<string, { open: boolean }>` holds one entry per isolating valve and power isolator in the graph. All are open (on) by default. Add:
   - `setFitting(id, open)`;
   - `toggleFitting(id)`;
   - `fittingOpen(id)`.

   An unknown id throws.

4. **`connected(a, ap, b, bp)`** is true when there is a path from port `(a, ap)` to port `(b, bp)` that follows edges in their direction and passes only through fitting nodes (entering at `in`, leaving at `out`), each of them passing:
   - an isolating valve or power isolator passes when open;
   - a non-return valve passes in its forward direction, which is the direction of the edges.

   On the unexpanded `demoGraph` its results must be exactly as now.

5. **Close the checks that would hide a fitting.** As far as I can see:
   - the pool circulation does not check `balance-supply` (balance tank to the suction valve) or `pool-suction` (suction valve to the pool pump);
   - neither pump checks its own power feed from `demo.mains`;
   - the boiler is "unpowered" only by the motor breaker's state, not by the link from the breaker to the boiler (`breaker-to-boiler`), where a power isolator now sits.

   Add these checks, so that shutting any fitting on those lines has the effect it would have. Check that I have not missed one, and look at the `powered` flag near the end of `step` too.

6. **Tests** in `src/game/plant/port-graph-demo.test.ts`:
   - Every existing test passes unchanged.
   - Build an expanded fixture in the test by hand from `demoGraph`: insert an isolating valve on `pool-suction`, one on `pool-pump-to-filter`, a power isolator on `pool-pump-power`, and one on `breaker-to-boiler`, with ids like `demo.poolPump.suction.iso`.
   - With everything open, the simulation behaves exactly as on `demoGraph`.
   - Shutting the suction isolator stops pool circulation.
   - Switching off the pool pump's power isolator stops the pool pump.
   - Switching off the boiler's isolator makes the boiler "unpowered".
   - A non-return valve in a line passes.

## Rules

- **Edit only** `src/game/plant/port-graph-demo.ts` and `src/game/plant/port-graph-demo.test.ts`. Claude is editing other files in this checkout at the same time. If you need a change anywhere else, say so in your report instead of making it.
- **Do not commit or push.** Claude reviews your change, runs the full checks and commits it, naming you.
- Run `npm run typecheck`, `npx vp test run src/game/plant/port-graph-demo.test.ts` and `npx vp lint src/game/plant/port-graph-demo.ts src/game/plant/port-graph-demo.test.ts`, and format your two files with `npx vp fmt <files>`. Other agents' unfinished files may make the whole-repo checks fail; report that rather than touching them.
- UK spelling. Keep the file's existing style, with comments only where the existing code has them.

## Report

End with a short report:

- what you changed, function by function;
- any check you added beyond the three listed;
- the test results;
- anything you think is wrong with this design.
