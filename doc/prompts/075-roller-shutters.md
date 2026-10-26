# 075: The loading dock's roller shutters, working

Status: active planning / partial prototype (reviewed 2026-10-26): detailed shutter views are installed by 073, but this mission’s control, persistence and safety decisions remain open.

## Review checkpoint — 2026-10-26

**Classification:** Active / planned. **Filed:** `doc/prompts/075-roller-shutters.md`.

**Delivered:** Detailed shutter views exist under 073; motor/control/persistence scope remains active.

**Still outstanding:** Retain the prompt’s required work and current root TODO entries.

**Evidence:** Current prompt, its Remaining section and source check. Reviewed against source `e5078c4`.

The original request and earlier implementation notes below are retained as history; this checkpoint supersedes any conflicting old completion claims. Outstanding work remains open in the root TODO.

## The idea

073 drew the two insulated roller shutters open and fixed. This mission gives them a realistic controller and makes them move (the owner, 2026-10-26): a powered goods-yard shutter after Bolton Gate's, HAG's or Hörmann's, with a geared three-phase motor, a hand chain for when the power is off, and a push-button station beside each opening. Engineering items are real, working components, so the shutters are part of the world state.

## To settle

- The controller: OPEN · STOP · CLOSE push buttons, a key switch, hold-to-run or one-touch, a safety edge on the bottom rail, a photocell?
- Its maker and its badge.
- Its power: fed from which board, and what a mains failure does to it (079); winding it by the hand chain.
- Interlocks with the lorries (074) and the dock leveller.

## A second opinion (Codex, 2026-10-26; not yet adopted)

- Opening and travel against the chosen lorries. In the world: OPEN, STOP, CLOSE, position, obstruction, motor power, hand chain, faults. A documented control and protective arrangement: a safety edge on the bottom rail or presence detection; a photocell alone is not enough for people (HSE, powered doors).
- What it does in a mains failure, and whether the hand chain needs the drive disengaged. Never close onto a lorry, a person, a hose or a cable; coordinate with the leveller.
- Model one named product's motor and manual operation, not features mixed from several brochures.
- Test travel, stop, obstruction, loss and return of power, the hand chain, and save and reload part-open.
