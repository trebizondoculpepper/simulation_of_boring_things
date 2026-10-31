# 113 (f): the authoring solver, stored solutions and their tests

## The solver

A script, `scripts/hall-4-solver.ts` (run with `node scripts/hall-4-solver.ts [card]`, not part of the tests), which for each card searches dose sequences breadth-first through the real engine of (e): each dose one of the ten chemicals at one of the five sizes (50 choices), applied with a fixed gap of 20 lab minutes between doses (the visitor's thinking time), then the water run on to see whether it holds the level's bands for the hour within two lab hours. It explores depth 1, then 2, then 3 (125,000 sequences at most; each takes a few milliseconds, the bench runs two lab hours in about 7 ms), pruning sequences that repeat a chemical in a way equivalent to one larger size, and stops at the first depth with a winner. It finds the fewest doses for Journeyman and for Pool Pro, prefers among equals the solution with the fewest chemicals and then the smallest total size, proposes the pars (the fewest doses plus one, so a visitor has a spare), and prints the chosen solutions as TypeScript to paste into the card's data. A test-support module shares the replay function between the script and the tests so they cannot drift apart.

## Stored solutions

Each card's data holds `solutions: { journeyman, pro }`, each a list of `{ tank, size }`, and `pars: { journeyman, pro }`, as written by the solver.

## The tests (fast, in `museum-4-cards.test.ts`)

- Replay: each stored solution, applied as the solver applies it, wins at its level within its par.
- Fuzz: each solution's doses scaled by 0.9 and by 1.1 all together, each dose alone at both extremes, and three seeded random combinations within ±10 %: all still win; a failure names the card and the dose.
- Two routes: the Journeyman solution uses fewer doses or fewer chemicals than the Pool Pro one, and at the end of its replay at least one reading outside the card's targets is out of band, so the levels genuinely differ.
- Words: the explanation names exactly the chemicals and sizes of the Pool Pro solution (each as "Medium sodium bicarbonate" by the table's names) and no other chemical; the briefing names each of the card's target readings.
- Order: the cards are listed by their Pool Pro par, then Journeyman par.

If they take over 1.5 s, the fuzz cases go in `museum-4-cards.slow.test.ts`.

## The first set of cards

Several, easy to hard, from the scenarios the bench already pins: high pH (acid pump failed), low alkalinity, acid overdose, scaling hard water, high combined chlorine and over-chlorination; each kept only if the solver finds a Journeyman route shorter than its Pool Pro one. The briefing and explanation of each are written from its stored solution after it is solved.

## Revision after Codex's critique and the owner's note on relaxing

- Accepted: the solver's "fewest doses" is the best route under the authoring schedule (20 lab minutes between doses), and is said so.
- Accepted: no pruning by equivalence; instead the search takes each chemical at most once and in the tanks' order (combinations, not permutations), stated as a limit of the authoring search, which keeps depth three at 15,000 sequences, about 40 s a card and level.
- Accepted: the replay is checked against the game's own public outcome (`outcome === 'won'`, the par counter, the hold of a full lab hour), not final readings.
- Accepted: two routes asserts that Journeyman takes strictly fewer doses than Pool Pro.
- Accepted: the solver also reports the best reachable outcome for each card and how close each reading comes to its band; cards are retuned before any band is widened, and each card records `relaxed` (none in the first set).
- Rejected: fuzzing with neighbouring sizes; the sizes are meant to differ by √10, and the owner's ±10 % is about the chemistry's margin, not the choice.
- The solver is run with `SOLVE=1 npx vp test run scripts/hall-4-solver.test.ts`, following the manual's env-gated script pattern, because Node cannot import the extensionless TypeScript of `src/` directly.
