# 113 (g): installing the console in Hall 4

## What changes in `hall-4-chemistry.ts`

The desk section (`// ---- The desk, its mimic, the teleprinter, LAB TIME ----`) loses the old desk's tank buttons, thumbwheels, VFD, swimmers controls, TIME knob and LCD, the teleprinter and the LAB TIME clock; in their place, the console of (b), built by the same view module as dev57's, given the hall's engine. The cards-board section loses RESET's pedestal, its lectern and the wall challenge panel (the Challenge Cards poster stays, decorative). The mimic above the tanks stays: its lamp for the chosen tank flashes when DOSE is pressed, as now. A plaque for 1,000× goes on the wall between the arches, decorative.

## The model

`museum-4-lab.ts`: the teleprinter instrument (M4-TP1) goes (it is only an exhibit); the desk instrument (M4-DS1) stays, now the console; the hall's state becomes the game of (e) (`Hall4Game` holding the `Hall4State`), so the hall's `HALL4_MODEL` resets to free play. The hall's exhibit tick calls `stepGame` with real seconds. The log and the printer's lines stay in the state for now (the mimic and narration read the card), but nothing prints them.

## Layout

`museum-4-layout.ts`: `DESK` widened to 2.4 m; `PRINTER`, `PRINTER_FOOT` and the RESET and lectern positions removed with every use; the walking solids follow. `museum-4-layout.test.ts` and `hall-4-walls.test.ts` rerun.

## Binding

`museum-bindings.test.ts` must still pass for museum4: the console is bound as M4-DS1; the plaque is decorative; the model no longer lists the teleprinter, so nothing is left undrawn.

## Challenge choice and level

Decided: into the UI, on the scenario screen's free-play page (◄ card ►, JOURNEYMAN or POOL PRO, START), because the console is where the visitor already stands and the wall panel's three buttons duplicated what a touch screen does better; the wall panel goes.

## Narration

The card's briefing plays on START and its explanation on a win, through `narrate` and the clip slots in `museum-4-placards.ts` (`CARD_NARRATION`), keyed by the new card ids; until recorded, the slots are silent and the words are on screen.

## Checks

Typecheck, lint, format, the museum tests (bindings, walls, walkways, layout), the bench part, and screenshots of Hall 4 from the arrival and close to the console.

## Revision after Codex's critique

- Accepted: the mimic's lamp is pulsed by the recorded dose event for 1.5 real seconds.
- Accepted: the Challenge Cards poster's words and the placards that describe the old desk (thumbwheels, CANCEL, the teleprinter, the swimmers buttons, TIME) are rewritten for the console.
- Accepted: every reader takes `game.lab`; the console's effects call the engine; the exhibit's reset recreates free play.
- Accepted: narration gets keyed slots for briefing, clue and explanation; `narrate` stays a silent hook until clips are recorded, and the words show on screen meanwhile.
- Accepted: `footprints()` and the card board's list from the old `CARDS` are updated with the rest.
- Accepted: the full gate (`npm test`, `npm run build`) and a driven check of START, DOSE, RESET, a win and a fail in Hall 4 in the browser.
