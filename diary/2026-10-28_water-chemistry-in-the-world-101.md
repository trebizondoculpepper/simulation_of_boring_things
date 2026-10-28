# Development Diary Entry - 2026-10-28

## Context

- **Date**: 2026-10-28 13:50 UTC
- **Branch**: main
- **Commit**: `14fe017c` (the mixing lag), then mission 101 stage 1
- **Contributors**: Claude Code + the owner

## Problem Statement

The owner: "Let's do that and then see if you can integrate the new water model into the game." First the pool's mixing lag (a dose into the balance tank should take about a turnover to show in the pool, not ten minutes); then the water-chemistry model, benched in the abstract this morning, installed in the world: each pool's water as the model's state, a closed-loop controller driving the real pumps, the day tanks drawn by what is pumped, bathers driving demand, and the displays reading it. The owner decided the same evening that the Olympic keeps its undersized pump, to see how it goes wrong.

## Our Approach

A conserving lag of a turnover must hold water, so the pool became three well-mixed cells in series round a ring with its tank, the exchange solved exactly as a cached matrix exponential (`src/game/water/circuit.ts`). For the world, a pure module (`src/game/plant/water-treatment.ts`) holding each circuit and its controller, stepped on its own 10 s clock with the hydraulics' flows summed between, the pools' readings written from the far cell so nothing that reads them had to change. One function, `pumpRates()`, works out what each pump delivers, and both the day tank's draw and the dose follow it, so the pump family another agent is building plugs in there.

## Implementation

- Part 1: `circuit.ts` and its tests; the bench's two-zone step through it; the bench's chlorine loop retuned to the dead time (band 0.5 mg/l, integral 6 h, by a steady day's deviation over a grid); the overdose scenario's 12 h made true, its treatment soda ash for pH and bicarbonate for alkalinity; hand doses judged a turnover after they go in; the note's figures rerun.
- Part 2: `water-treatment.ts` (+ tests, a slow test of its settled water against the bench); `pools.ts` without its old ease-to-target chemistry, reporting each pool's flows; `world.ts` with `treatment`, `WORLD_VERSION` 58 and migration 57; `pool-dosing.ts` reading the real rates; the dosing boards and the spa cabinets' peristaltic heads following them; `doseDraw` and `phTarget` removed; `scripts/olympic-before.test.ts` for the Olympic's before picture and its chart.

## Outcomes

- All ten scenarios pass with the lag and no model constant changed, but only after finding a real bug of my own (each cell carried the whole circulation, tripling the CO₂ law's turnovers) and three procedures that assumed a dose mixes at once.
- Starting every pool from nominal water (alkalinity 120) was wrong: the footbath degasses in a minute and its pH ran off. Each pool now starts from its own settled water, as the bench finds it after four months.
- In the world the lounge holds 1.3–1.7 mg/l at pH 7.3; the Olympic's pump pins at full from midday and its chlorine is under 1.0 for most of each evening and night, CHLORINE LOW lit, the only alarm; the jacuzzi's combined chlorine reaches 1.1 mg/l at busy times.
- The dev server hot-reloaded my unfinished migration into the browser's `dev` save slot (alkalinity 120 everywhere, the footbath at pH 8 in lockout). Checks were run on a slot of their own (`?slot=chem101`); the `dev` slot was left as it was.
- Lesson: the world's cost did not move (149 µs a step before and after), since the chemistry steps once in a hundred world steps; the slow tests that timed out did so under a full parallel run, not from the change.

## Next Steps

The prompt's later stages (strength per tank, deliveries and decay, hand dosing, the test kit, sensors that drift with the maximum dosing time) and its nine questions for the owner, one at a time; the pump family's models into `pumpRates()` (mission 102).
