# 113 (e): the challenge engine

## Where and what

A pure module, `src/game/plant/museum-4-challenge.ts`, wrapping Hall 4's lab state (`Hall4State` in `museum-4-lab.ts`, its bench chemistry unchanged) in a game: free play or a card, its level, its doses, its hold timer and its outcome. The view and the console only call it; nothing here knows about screens.

## State

`Hall4Game`: `lab` (the `Hall4State`), `mode` (`free` or `card`), `card` (a `CardId` of the new card set, or null), `level` (`journeyman` or `pro`), `used` (doses this card), `heldSince` (lab seconds since the required readings came into range, or null), `lastDose` (lab seconds), `outcome` (`playing`, `won`, `failed`), and `outcomeAt` (when the outcome was reached).

## Time

A fixed 1,000×: `stepGame(game, realSeconds)` advances the lab by `realSeconds × 1000` in the lab's own steps (`stepHall4`, its 10 s chemistry step), clamped to a tenth of a real second at a time so a stalled frame cannot leap hours. The TIME knob's rates go.

## Free play

On entry and after RESET: the reset water, 20 swimmers (bather factor 1, the bench's normal load, so the water slowly drifts), no win, no dose limit. Doses still count, for interest.

## Cards

A new card set (`CHALLENGES`, the first set from (f)) replaces the old `CARDS` on the console. Each card: id, title, swimmers (a number, mapped to the bather factor as swimmers ÷ 20), what is wrong, the goal in words, its start water (from the pinned `SCENARIO_WATERS` or a built water), its target readings, its two pars, its two stored solutions, its briefing and its explanation. Starting one loads its water and swimmers, sets `used` to 0 and `outcome` to `playing`.

## Bands and levels

The draft bands of mission 113: free chlorine 1.0–2.0 mg/l; combined chlorine under 1.0 mg/l and at most half the free; pH 7.2–7.6; total alkalinity 80–200 mg/l; calcium hardness 100–1,000 mg/l; balance index −0.5 to +0.5. Journeyman must bring the card's targets into band; Pool Pro every band. The bands are a table (`BANDS`) so the owner can confirm them against PWTAG.

## Doses

`doseGame(game, tank, size)`: refused if the card is won or failed, or `used` has reached par; otherwise the amount (from (d)) goes into the lab at once (a new `Hall4Action` `{ type: 'dose-now', tank, amount }` added to `actOnHall4`, which hand-doses the bench in one step and, for fresh water, drains and refills), `used` rises and `lastDose` is set. The chemistry then mixes as the bench circulates.

## Winning and failing

Each step checks the level's bands: in band, `heldSince` is set if unset; out, it clears. Held for one lab hour, the card is won. Failing: with par reached and the card not won, the visitor has two lab hours after the last dose for the water to settle and hold; if it is not won by then, it fails ("Out of doses", with the readings still out of band). After a win, the hall returns to free play from the corrected water when the visitor touches CONTINUE, or by itself after eight real seconds.

## RESET

RESET moves into the UI (scenario screen, with a confirmation, see (c)): `resetGame(game)` is free play from the reset water.

## The view

`scenarioView(game)` gives the screen everything it shows: kind, title, swimmers, problem, goal, level, par, used, in range or not, held lab seconds and the hour needed, what is out of band. It is pure and tested.

## Tests

`museum-4-challenge.test.ts`: free play has no limit and never wins; a card loads its water and swimmers; DOSE is refused at par; the hold resets when a reading drifts out; a held hour wins; par reached with the water wrong fails after the settling time; RESET returns to free play; at 1,000× one real second is 1,000 lab seconds.

## Narrations (the owner, 2026-10-31, added after the first critique)

Each card has three narrations, fired by the engine as events (`narration: { kind, at }` on the game, the host plays the clip and shows the words): the briefing when a card starts; the clue once per attempt when the visitor has played one real minute (`CLUE_AFTER = 60` real seconds, counted by `stepGame` from real time, not lab time) without a win or a fail, reset by a new attempt, never after a win or a fail; and the explanation on a win. Each has its own clip slot (`CARD_NARRATION[id].briefing|clue|explanation`) and all three are exported to `doc/scripts/museum/museum-narration.txt`.

## Relaxing the win (the owner, 2026-10-31)

Because the visitor has only ten chemicals at five sizes, an ideal answer may be unreachable. The solver reports, for each card, the best reachable outcome and how far each reading ends from its band. Where a card cannot be won cleanly, retuning the card's starting water is preferred to widening its bands; any widening is recorded per card (`relaxed`, with its reason), stays within what a real pool could accept, and never lets a wrong answer win. The fuzz test is run against the bands actually used.

## Revision after Codex's critique

- Accepted: one authority. The console never sets the lab's own card fields, so the old `CARDS` check in `chemistry()` can never declare a win; the old cards remain only for the bench tests and the removed desk.
- Accepted: `stepGame` replaces the hall's session clock; a frame longer than 0.1 real seconds is clamped (the excess discarded), stated and tested.
- Accepted: DOSE's chemistry is immediate, and the mimic's lamp flash is driven by a recorded dose event (`lastDosed: { tank, real }`) for 1.5 real seconds, since four lab seconds is four real milliseconds at 1,000×.
- Accepted: the meters' green bands are aligned with `BANDS` where they differ (pH 7.2–7.6, combined under 1.0, hardness 100–1,000), so a won card never shows a reading outside green.
- Accepted: starting a card clears pending doses and delivery; auto-continue after a win counts real seconds, and free play continues from the water as it is at that moment.
- Clarified: the Pool Pro set is the six readings of `BANDS`; TDS, sulphate, HOCl share and faecal contact are not part of the new first set.

## Revision after Codex's second critique (the clue and relaxing)

- Rejected in part: moving the clue's trigger. The owner set it at one real minute; it stays, and a fail can pre-empt it (the clue then has nothing to help with; RETRY starts a fresh minute).
- Accepted: narration delivery. Each narration bumps `seq`; the host plays a clip when `seq` changes, a new one interrupting the last, and shows its words until the next or a mode change. At most one narration is fired per step.
- Accepted: the automatic return after a win waits 30 real seconds (`WON_SHOWN`), long enough for the explanation; CONTINUE is there for the impatient.
- Accepted: "best reachable" is reported as the best the authoring search found (at most three doses, each chemical once, in the tanks' order, 20 lab minutes apart), with each reading's distance from its band at the end; every card in the first set has a clean, fuzz-robust win against the unrelaxed bands, so `relaxed` is null for all seven, and any later relaxation would need its own numeric bounds and meter display.
