# 075: The loading dock's roller shutters, working

Status: incomplete, for planning (opened 2026-10-26 with the owner, from [073](073-loading-dock-layout.md)). Not ready to start: the questions below are to be settled with the owner first.

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
