# 113 (c): the screens' content and interaction

## The state object

One pure state, `DosingConsoleState` (in `src/toolkit/gallery/logic/dosing-console.ts`): `chemical` (index into the ten chemicals), `top` (the list's first visible row), `size` (0–4), `pressed` (the region being pressed, for its glow, or null), `confirmReset` (whether RESET's confirmation is up), `pick` (the card shown on the scenario screen's chooser) and `level` (`journeyman` or `pro`). The scenario screen's words are not in it: they come from the challenge engine's view (`ScenarioView`, (e)) passed in alongside. A reducer `actOnConsole(state, action)` handles the screen actions; actions it cannot handle itself (dose, start, reset, back to free play) are returned as an `effect` for the host to send to the engine. Each screen has a pure `layout` (named rectangles in 512 × 384 canvas pixels) and a pure `hit(state, view, x, y)` that maps a point to an action.

## Scenario screen (left)

A title strip with the maker's mark and the product name. Beneath it, by the view's kind:

- Free play: the heading "Free play", the words "No challenge loaded. Try any chemical and watch what happens.", and a chooser: ◄ card number and title ►, a two-segment level selector (JOURNEYMAN, POOL PRO) and a green START button. A grey RESET button at the bottom left.
- A challenge in progress: its title, "SWIMMERS 40", what is wrong, the goal, "LEVEL JOURNEYMAN", "PAR 3 · DOSES USED 1", and a progress strip: "OUT OF RANGE" grey, or "IN RANGE · HOLDING 0:42 / 1:00" amber, filling as the hour passes. RESET and a small ABANDON (back to free play) button.
- Won: a green banner "Well done", "The water is back to normal. You clearly understand pool chemistry.", the doses used against par, and a CONTINUE button back to free play (the engine also returns to free play by itself after a few seconds).
- Out of doses: a red banner "Out of doses", what is still out of range, and RETRY (the same card again) and FREE PLAY buttons.
- RESET's confirmation, over any of them: a glass dialog "Reset the lab? The water goes back to balanced and any challenge ends. Don't worry: you cannot break anything here." with RESET and CANCEL.

Always at the foot, in small print: "This laboratory runs 1,000 times faster than real life."

## Chemical screen (middle)

A title strip "Chemical", then a list of the ten chemicals, five rows visible, each its tank code and product name ("CT3 Hydrochloric acid 10 %"), the selected one in the soft blue selection; round up and down arrows scroll the window by one row and move the selection with it when it would leave the window. Touching a row selects it. Beneath, a text block: what the chemical does and how pools commonly use it, from the data table (d).

## Dose screen (right)

A title strip "Dose size", the selected chemical's short name, a five-segment selector (TINY, SMALL, MEDIUM, LARGE, HUGE), round ◄ and ► arrows either side, and big text "MEDIUM · 4.0 kg", the amount for that chemical. Beneath, "Press DOSE to add it all at once." In a challenge, "Doses left 2" and, when none are left, the DOSE line greys: "No doses left".

## DOSE

The DOSE mushroom is outside the screens; it sends `{ type: 'dose', tank, size }` to the engine. Refused (no doses left, or a won or failed card showing) it does nothing but a short deny sound.

## Press feedback

A press sets `pressed` (the glow) and the action happens on press; the glow clears on release or after 0.15 s. Each press is two redraws of one screen.

## Tests

`dosing-console.test.ts`: each screen's hit test finds every region and nothing in the margins; scrolling clamps at the ends and keeps the selection in view; the size arrows clamp at TINY and HUGE; RESET asks before it acts; the key of a screen changes exactly when something it shows changes.

## The clue (the owner, 2026-10-31, added after the first critique)

Each card has a third narration, its clue: what makes the chemistry difficult, nudging towards the stored solution without giving away its doses ("acid also lowers alkalinity, so the pH won't stay put until the buffer's back"). The engine fires it once per attempt after one real minute of play without a win or a fail; while a narration plays (briefing, clue or explanation) the scenario screen shows its words in a glass caption box above the progress strip, with a small speaker mark.

## Revision after Codex's critique

- Accepted: press feedback is a host timer in real seconds (0.15 s), outside the pure reducer, which only records which region is pressed; the host clears it.
- Accepted: each screen's key is built from what it paints, so a chemical change redraws the chemical and dose screens and a card start the scenario and dose screens; tested.
- Accepted: when the engine changes mode (a win continuing to free play, a reset), the host reconciles the console state: the RESET dialog and pressed glow clear. The RESET dialog is modal: while it is up, the scenario screen's hit test answers only its two buttons.
- Accepted: the engine is the authority for DOSE; the host asks `canDose` and plays the deny sound when refused, and the dose screen's "Doses left" is read from the engine.
- Accepted: the engine's `Hall4Game` supersedes the lab's own card fields (`card`, `active`, `metSince`, `solved`), which the console never sets; the meters and mimic read `game.lab`.
- Deferred: a 3D integration test of the raycast path; verified by driving the dev room in a browser.
- Accepted from the second critique: a narration's words stay on the scenario screen until the next narration or a change of mode, and a new narration interrupts the one playing.
