# 113: Hall 4's dosing console and challenge cards

The owner, 2026-10-31: Hall 4 (`museum4`, The chemistry of pools) gets a new central console, because the present desk is too hard to use, and its challenges become short, tested puzzles scored like golf. Agreed over several rounds of questions; nothing is built yet. Read `doc/museum-hall-model.md` (the museum hall standard: the hall is its own simulation, every component bound to it, the facing rule) and the Hall 4 layout as it stands (the review layout of commits ab883c43 to 0d3b5acc: tanks on a 0.6 m stand under the back windows, the desk 2 m in front, the teleprinter to its right, RESET and its sign lectern to its left, the meters on the right wall, the Balance Beam on the left, the challenge panel under the Challenge Cards poster; pipes deferred, lecterns parked).

## The console

The desk becomes three touch screens in a row and a big red DOSE button. Touch screens are allowed under the period rule because they bring their own kind of interface. Their look is Frutiger Aero, the mid-2000s style of Windows Vista and Windows 7 (the owner, 2026-10-31: "an optimistic fusion of technology and nature"): glossy, translucent glassy panels, soft gradients, aqua and sky blues and fresh greens, water droplets, bubbles and leaves, rounded shapes with gentle highlights; apt for a swimming pool, and in period for kit installed around 2005 to 2010. Every screen redraws only when what it shows changes. All input through `src/toolkit/controls`.

1. **Scenario screen** (left): the current challenge's title, its number of swimmers, what is wrong with the water, the problem to solve, the level being played, its par and doses used ("PAR 3 · DOSES USED 1"), and progress towards the win ("IN RANGE · HOLDING 0:42 / 1:00"). In free play: "Free play: no challenge loaded. Try any chemical and watch what happens." In small print: the laboratory runs 1,000 times faster than real life.
2. **Chemical screen** (middle): a list of the hall's chemicals (the tanks CT1–CT9 and FW1), scrolled with touch arrows, the chosen one highlighted; beneath it, what the chemical does and how pools commonly use it. The words are a pure, tested data table beside the chemical definitions.
3. **Dose screen** (right): five dose sizes, Tiny, Small, Medium, Large, Huge, chosen with touch arrows or as five touch buttons. They are an exponential scale: each about √10 (×3.16) the one before, from 1 % to 100 % of that chemical's maximum, so two steps make a factor of ten; subtle touches and big sweeps both possible. The screen shows the size's name and its real amount ("MEDIUM · 4.0 kg").
4. **DOSE**: a big red mushroom button. The whole dose goes in at once (no metering): the chosen tank's solenoid valve opens, its lamp flashes on the tank and the mimic, and the chemistry model mixes the dose as the water circulates; the pool's display, the meters and the Balance Beam show the effect within a second or two at 1,000×.

### Doses: amounts and units

Each chemical has its own **maximum**: the real-world largest single dose of it for Hall 4's 500 m³ pool (a shock dose of hypochlorite, the most acid one would add at once to trim pH, and so on), researched and cited in the data table. Huge is that maximum and Tiny a hundredth of it, so Tiny always reads as a small dose and Huge as a big one for that substance. Each chemical also has its **unit**, appropriate to how it is really dispensed: solids in kilograms (soda ash, sodium bicarbonate, calcium chloride, sodium bisulphate, calcium hypochlorite), liquids in litres (sodium hypochlorite, hydrochloric acid, liquid flocculant), gases in cubic metres (CO₂, if Hall 4 ever carries it). The amounts shown are rounded sensibly for their unit. A test checks every chemical has a unit matching its physical form, that Huge is its stated maximum, and that the five sizes rise by the stated ratio.

## Time

Hall 4 always runs at 1,000× (an hour of lab time takes 3.6 s). The TIME knob, its LCD and the LAB TIME clock come out; in their place on the wall between the arches, a small plaque: "This laboratory runs 1,000 times faster than real life: an hour passes in under four seconds, to make life bearable."

## Free play and challenges

- **Free play** is the hall's state on first entry and after RESET: balanced water, about 20 swimmers (a steady load, so the water slowly drifts), no win condition, no dose limit.
- **Challenges** are chosen on the challenge panel under the Challenge Cards poster (◄, number, ►, START). Starting one loads its water and its swimmer count (swimmers are part of the scenario, not a visitor control; the swimmers controls go from the desk and the model's inputs), plays its briefing, and sets its par.
- **Level**: a two-position key switch on the challenge panel, JOURNEYMAN and POOL PRO. Journeyman must bring the card's target readings into range; Pool Pro must bring every reading into range. Each level has its own par and its own stored solution (below).
- **Winning**: the required readings in their target bands and held there for one hour of lab time (if any drifts out, the hour starts again), within the par. The scenario screen then congratulates the visitor ("Well done: the water is back to normal. You clearly understand pool chemistry."), the explanation is narrated, and the hall returns to free play from the corrected water.
- **Failing**: the par used up with the water still wrong. The screen says "Out of doses", what is still out of range, and offers a retry (choose the card again, or RESET).
- **Target bands** (drafts, to confirm against PWTAG): free chlorine 1.0–2.0 mg/l; combined chlorine under 1.0 mg/l and not more than half the free; pH 7.2–7.6; total alkalinity 80–200 mg/l; calcium hardness 100–1,000 mg/l; Balance Beam index −0.5 to +0.5.

## Puzzles: authoring and testing

- **Authoring solver** (a script, not part of the test run): for a card, it searches dose sequences (each dose one of the chemicals at one of the five sizes) through the real chemistry model at 1,000×, finds the fewest doses that win at each level, proposes the pars, and writes the chosen solutions into the card's data. The search is breadth-first, capped at the par.
- **Each card stores**: its scenario (water, swimmers, target readings, title, words), its two pars, its Journeyman solution and its Pool Pro solution (lists such as "Medium sodium bicarbonate, Small hydrochloric acid"), its briefing and its explanation.
- **Unit tests** (fast, run always):
  - _Replay_: each stored solution still wins at its level within its par.
  - _Fuzz_: every non-zero dose in a stored solution varied by ±10 % (both extremes and a few random combinations) still wins; if it fails, the card is too sensitive, and the test names the card and the dose.
  - _Two routes_: the Journeyman solution uses fewer doses or chemicals than the Pool Pro one and leaves at least one non-target reading out of range, so the levels genuinely differ.
  - _Words_: the explanation names exactly the chemicals and sizes of the stored Pool Pro solution; the briefing names the card's target readings.
- **Difficulty**: the cards are ordered by their pars, and the challenge panel shows each card's difficulty. If the chemistry model later changes, these tests show at once which cards no longer work or have become too touchy.

## Words and narration

Each card carries two texts, written when the card is authored from its stored solution:

- **Briefing**, shown and narrated when the card starts: the scenario (swimmers, what is wrong) and the chemistry needed to find the answer, without giving it away ("Acid lowers pH, but it also eats alkalinity, the water's buffer: fix the buffer first, or the pH will keep sliding back").
- **Explanation**, narrated after a win: what the ideal solution was and why it works in the model's terms, including what a Pool Pro does beyond a Journeyman.

Both are exported to `doc/scripts/museum/museum-narration.txt` for recording, and play through the per-card clip slots already in the code (`CARD_NARRATION` in `museum-4-placards.ts`, `narrate` in `hall-4-chemistry.ts`).

## Order of work

1. The chemical data table: descriptions, maximum doses with sources, units by physical form, the five sizes; tested.
2. The challenge engine (pure, `logic/`): free play, card loading, the dose counter and par, the levels, the win and fail rules, the hold timer; at a fixed 1,000×; tested.
3. The console: the three touch screens and DOSE, bound to Hall 4's model as the standard requires; the swimmers controls, TIME knob, LCD and LAB TIME clock removed; the plaque; the level key switch on the challenge panel.
4. The authoring solver script.
5. The first set of cards (several, from easy to hard), each authored with the solver: stored solutions, pars, briefing and explanation; the replay, fuzz, two-routes and words tests passing.
6. Narration: the texts exported to the narration script, the clip slots wired.

Hall 4's re-plumbing (deferred by the owner) and the return of its lecterns are separate work; this mission does not depend on them, but the console's DOSE must use the real dosing path once it is plumbed.

## Open questions for the owner

- The draft target bands, and whether combined chlorine's "not more than half the free" applies.
- Free play's swimmer count (20 suggested).
- How many cards in the first set, and their scenarios (cloudy after a gala, pH drift, low alkalinity, aggressive water, high combined chlorine, scaling, and so on).

## Note, 2026-10-31: DOSE on the screen, and a stand for a desk

The owner asked for the physical DOSE mushroom to go. DOSE is now a glossy green Aero button in the lower third of the dose screen (`DOSE_LAYOUT.dose`), shown and touchable only once the visitor has actively picked a chemical (a row or the list's arrows) and a dose size (a segment or the size arrows) since the last dose taken or the last RESET; the console always holds a default selection, so the default alone never arms it. Until then the hint "Choose a chemical and a dose size." sits in its place. When the challenge has no doses left the armed button shows greyed as NO DOSES LEFT and a touch is refused, as the mushroom refused it. The button is a screen region (`dose`), so it arrives through the controls' raycast and UV touch path like every other; a press hands back a `dose` effect and the view calls the same `host.dose` the mushroom did. Without the mushroom the desk lost its shelf: the console is now the raked three-screen panel on a slim pedestal and plinth, 0.5 m deep, the panel's foot still at 0.86 m. The screens' material was dimmed (`SCREEN_LEVEL`) so a white dialog sits under the halls' bloom threshold and stays readable.
