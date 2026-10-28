# 107d: PLANTROOMS Hall 4, "The chemistry of pools": a hands-on chemistry lab

Status: planned 2026-10-28, not started. A sub-prompt of mission 107 (`doc/prompts/107-pool-science-museum.md`), after 107-0 (`doc/prompts/107-0-exhibit-groundwork.md`). Hall 4 is reached from Hall 3 (Safe water); it is the ring's north-west corner, turning east into Hall 5, whose theme is still to come. The finale, The whole plant (107e), is Hall 13. The idea is the owner's.

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first and follow it. Then read mission 107, 107-0, 107c (`doc/prompts/107c-safe-water-automatic-dosing.md`, what the visitor has just learnt), `doc/research/water-chemistry-models.md` (the model's sources, its validation against PHREEQC and the scenarios' results) and the chemistry model itself, `src/game/water/pool-chemistry.ts` and `chemistry-bench.ts`. **Use the tested chemistry model and nothing invented:** every number the hall shows comes from it.

## The owner's request

The owner, 2026-10-28: "I think maybe we could have an exhibit about the chemistry of pools where we have a set of ideal tanks, a dosing station with buttons where you can add chemicals to the dosing system, and then a readout in the simulated swimming pool of what chemistry your choices produced. And like all the other exhibits, you can reset it at the end."

## Rules for every hall (the owner, 2026-10-28)

1. **Every hall starts from its reset state the moment you step into it.** Its time is set to now, the visitor's real local time, and its exhibit is put in its reset condition. Walking in is the same as pressing its RESET button. No hall's state carries over from an earlier visit.
2. **Time.** A hall's simulated time starts at now. If the visitor speeds it up, the hall's time display follows. Halls may show time in different ways. **Hall 4 shows it on a log sheet:** the dosing station's teleprinter (`createTeleprinter`) prints a line for every dose, every swimmer arrival and every hour of plant time ("14:00 FREE CL 1.42 COMB 0.18 PH 7.38 TA 121 CH 200 LSI +0.05"), so the visitor's experiment is written down against the time; a LAB TIME readout (a seven-segment display) above it, and TIME buttons ×1, ×60, ×600 and ×3600 on the station. On entry and RESET the sheet is torn off and a new one starts at the visitor's local time.
3. **Halls start empty.** The hall begins with set decoration only; this sub-prompt builds its exhibit.

## What the hall teaches, and what it builds on

**Assumes (from Hall 3):** free chlorine kills germs and swimmers use it up; pH decides how much of it works; hypochlorite raises the pH, acid lowers it; a controller doses to keep two numbers in range; the pool's lag.

**Adds:**

- **You are the controller.** No automatic dosing here: the visitor chooses what to add and how much, and sees the result.
- **Alkalinity is the water's buffer:** with little of it, small doses swing the pH; bicarbonate raises it without moving the pH much, soda ash raises both.
- **Hardness and balance:** too soft and the water eats the grout and the concrete, too hard and it scales the plant; the Langelier index (the "balance index") puts pH, alkalinity, hardness and temperature into one number, about zero for balanced water.
- **Combined chlorine and breakpoint:** swimmers make chloramines; enough chlorine, about eight to ten times the nitrogen, breaks them down.
- **Every chemical has side effects:** hypochlorite adds salt (TDS) and alkalinity; thiosulphate takes chlorine away and pushes the pH up; acid takes alkalinity away.
- **Treatments for real problems**, as challenge cards.

**Leads on:** "You have warmed, cleaned, disinfected and balanced the water. At the end of the route, the whole plant together: and something is about to go wrong." (Hall 13, the finale; the halls between have their own themes, to come.)

## The schematic

A new pure model, `src/game/plant/museum-4-lab.ts` (tested), on mission 106's pattern; room code `M4`; tags derived (expected below; the derivation wins). It wraps the chemistry bench (`src/game/water/chemistry-bench.ts`: `newBench`, `stepBench`, `handDose`) and does no chemistry of its own.

**The pool, the same as every hall's:** `POOL_25M` (470 m³ pool, 30 m³ balance tank, 312.5 m², 28 °C). Recommended: the bench's one-volume (well-mixed) mode, so a dose shows on the readout as soon as it has gone in, with time running for the slow chemistry (the swimmers' demand, breakpoint, urea, carbon dioxide leaving to the air); the alternative, through the circulation's three cells with the hour's lag Hall 3 taught, is question 1. Drawn as an ideal vessel IP1, with no plant but a short circulation from its tank (pump P1 and its valves, as Hall 3's, to show where the doses go in).

**The reset water:** free chlorine 1.3 mg/l, pH 7.40, total alkalinity 120 mg/l, calcium hardness 200 mg/l (as CaCO₃), 28 °C, TDS at the mains' (`MAINS` in `water-treatment.ts`) plus the pool's settled excess, no combined chlorine: made by `waterFrom` so it is the model's own; the base water of the model's PHREEQC check (`doc/research/water-chemistry-models.md` §7.3), so the visitor's first doses come close to its verified numbers (the check's water had no chlorine; the test pins the hall's own).

**The ideal tanks** (ideal sources, each a tall clear-fronted tank with its contents' colour, its name and its hazard signs, in a bunded row; `src/game/plant/experimental-source.ts`'s pattern, extended with the substances it lacks), one for each of the model's additions (`Additions` in `pool-chemistry.ts`, all in grams), each with its product and unit:

| Tank | Product                             | Unit  | Model addition per unit                                            |
| ---- | ----------------------------------- | ----- | ------------------------------------------------------------------ |
| CT1  | Sodium hypochlorite, 14 %           | litre | `hypochlorite`, 140 g available chlorine (`STRENGTH.hypochlorite`) |
| CT2  | Calcium hypochlorite, 65 % granules | kg    | `calciumHypochlorite`, 650 g available chlorine                    |
| CT3  | Hydrochloric acid, 10 %             | litre | `hcl`, 104.8 g (`STRENGTH.acid`)                                   |
| CT4  | Sodium bisulphate (dry acid)        | kg    | `bisulphate`, 1,000 g                                              |
| CT5  | Carbon dioxide                      | kg    | `co2`, 1,000 g                                                     |
| CT6  | Sodium bicarbonate                  | kg    | `bicarbonate`, 1,000 g                                             |
| CT7  | Soda ash (sodium carbonate)         | kg    | `sodaAsh`, 1,000 g                                                 |
| CT8  | Calcium chloride                    | kg    | `calciumChloride`, 1,000 g                                         |
| CT9  | Sodium thiosulphate                 | kg    | `thiosulphate`, 1,000 g                                            |
| FW1  | Fresh water from the mains          | m³    | drain that much and refill with `MAINS` water (`mixWaters`)        |

(The model's `cyanuric` and `chlorate` are wrong deliveries, not products: they are not on the station, but a challenge card may start from them.)

**Each tank's line:** the tank → its outlet valve M4-CTn-V1 (an ideal metering valve: it delivers the chosen amount over a few seconds of real time, so the visitor sees it flow on the mimic and the tank's level fall, then shuts; normal shut) → the common dosing header → the dosing pot DP1 → the injection point on the return to IP1. The station's buttons work the valves; no tank empties (ideal), but each has a "used" counter.

**The swimmers:** BA1, an ideal source of pollution (`BATHER`): a "+20 SWIMMERS" button sends in twenty visits at once (their urea, ammonia, demand and TDS), and a steady SWIMMERS dial (none, the bench's 600 a day, busy).

**The dosing station:** DS1, a Penfold dosing desk (new component, built from the control-part kit, `src/toolkit/components/core/parts/parts.ts`): for each tank an illuminated push button (SELECT, lit while chosen); a three-digit thumbwheel switch for the amount in the tank's unit (a period interface: the visitor dials 012.7 litres); DOSE (green) and CANCEL; a VFD line showing the choice ("HCl 10 % 12.7 l READY"); "+20 SWIMMERS", the SWIMMERS dial, the TIME buttons and the challenge selector (below); the teleprinter TP1 beside it. Penfold's mark top right.

**The readout, on the pool:** AN1, an ideal water analyser (labelled so: "the museum's ideal analyser, which knows the water exactly"), driving a readout board on the pool's wall: free chlorine, combined chlorine and total chlorine, pH, how much of the chlorine is working (HOCl as a share of free), total alkalinity, calcium hardness, TDS, and the balance index (the Langelier index, `readings(w, T).langelier`), each a moving-coil meter with its recommended range in green (the ranges the model's research doc and tests already cite from PWTAG; none invented here) and a seven-segment value. `readings` in `pool-chemistry.ts` gives them all.

**Instruments, all listed:** AN1 and its board; the tanks' "used" counters; the station's VFD; TP1; the LAB TIME readout; P1's flow (FT1).

## The mimic

A small Penfold board (`src/toolkit/gallery/logic/museum-4-mimic.ts`, `checkMimic`) above the station, captioned "The map: where your chemicals go": the ten tanks, their valves' lenses (lit while dosing), the header, the dosing pot, the injection point and the pool, the swimmers' arrow, and repeats of free chlorine, pH and the balance index. No buttons beyond the station's.

## The museum panels (text outline)

- **Entrance panel.** Headline "The chemistry of pools". Big idea: "Keeping a pool safe is a balancing act. Every chemical you add changes more than one thing. Here, you are the pool's chemist." Fact: "The pool's 500 cubic metres weigh 500 tonnes: a 10-litre dose is like less than half a teaspoon in a bath." Route: 1 the tanks, 2 the station, 3 the readout, 4 the swimmers, 5 the challenges. RESET pedestal and sign.
- **1, The tanks:** one line per chemical: what it is for ("acid: brings the pH down"), and its side effects.
- **2, The station:** "Choose a chemical, dial how much, press DOSE." Try it: the steps below.
- **3, The readout:** "Green means within the recommended range." A short line on each meter: what it means, in a sentence.
- **4, The swimmers:** "Send in a group and watch the chlorine get to work, and the combined chlorine appear."
- **5, The challenges:** "Pick a card. Something is wrong with the water. Put it right."

## Try it, with the expected results

Numbers marked "model" are the model's tested ones (`pool-chemistry.test.ts`, the PHREEQC table of the research doc §7.3, the scenarios of §7.1); marked "indicative" are hand-worked from the model's stoichiometry for the 500 m³ circuit and are to be pinned in `museum-4-lab.test.ts`, this prompt updated with the model's figures.

1. **Add chlorine.** 10 l of 14 % hypochlorite: free chlorine +2.8 mg/l (model: 1 g/m³ of available chlorine gives 1 mg/l); with it about +2.1 mg/l of alkalinity and +4.7 mg/l of TDS (indicative: 0.76 and 1.69 per mg/l) and the pH up a little.
2. **Lower the pH.** 12.7 l of 10 % acid (1.33 kg of HCl, 2.66 g/m³): pH 7.40 → 7.24 (model 7.243, PHREEQC 7.245), alkalinity −3.6 mg/l (0.73 g/m³ per mg/l).
3. **The buffer.** 8.4 kg of bicarbonate (16.8 g/m³): alkalinity +10 mg/l, pH 7.40 → 7.43 (model 7.432); 5.3 kg of soda ash (10.6 g/m³): alkalinity +10 mg/l, pH → 7.75 (model 7.747). The same alkalinity, very different pH.
4. **Carbon dioxide.** 5 kg of CO₂ (10 mg/l): pH 7.40 → 7.05 (model 7.051), alkalinity unchanged.
5. **Hardness.** 55.5 kg of calcium chloride (1 mmol/l): hardness +100 mg/l, pH 7.40 → 7.40 (model 7.397); the balance index rises with it.
6. **Take chlorine away.** 1 kg of thiosulphate: free chlorine −0.4 mg/l (model: 5 g/m³ removes 1 mg/l), and the pH rises (the dechlorination scenario: from 7.43 to 8.69 after a full dechlorination of 20 mg/l).
7. **Send in swimmers.** "+20 SWIMMERS": 157 mg of ammoniacal nitrogen at once becomes monochloramine (about 0.002 mg/l combined chlorine in 500 m³, model: 5.07 mg Cl₂ per mg N), and 74 g of demand, two-thirds of it within the hour (about 0.1 mg/l of free chlorine used, indicative); over the following hours their urea chlorinates slowly (model's rate), and combined chlorine climbs with a busy day. Add hypochlorite to well past breakpoint (free chlorine about 8 to 10 times the nitrogen, the model's dip between 7.5 and 9.5) and the combined chlorine falls.
8. **Leave it alone.** At ×3600 for a few plant days with no dosing: free chlorine decays as the swimmers' demand uses it, and the pH drifts up as carbon dioxide leaves to the air, towards its equilibrium with air (model: pH 8.52 with 420 ppm, PHREEQC 8.49).
9. **RESET SIMULATION** (and walking back in): the reset water, swimmers normal, the counters at zero, a new log sheet at the visitor's local time.

## The challenges

A ten-position CHALLENGE selector on the station and START. Each card sets the pool to its problem water (the bench scenario's state at the end of its problem phase, `runScenario` in `chemistry-bench.ts`), prints the symptoms on the log, and names the goal; the visitor treats it with the station (and FW1); the card is met when the readout is in range and stays so for an hour of plant time, and the log prints "PUT RIGHT 2 h 40 min". The hall's cards are the bench's scenarios that are about the water (the plant's own faults, the weak delivery and the loss of dosing, are Hall 3's and the finale's, Hall 13):

| Card              | Starts with (model)                                                       | The model's treatment and result                                                                      |
| ----------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Combined chlorine | combined chlorine peaking at 1.38 mg/l after a UV failure and a busy week | superchlorinate (+8.5 g/m³), fresh water: below 0.5 in 4.8 h, then ≤ 0.23                             |
| Low alkalinity    | alkalinity about 40 mg/l, the pH swinging                                 | bicarbonate to 120: alkalinity 103, pH 7.40                                                           |
| High pH           | pH 7.64 after the acid pump failed for two days; HOCl share 0.406         | acid by hand: back in range                                                                           |
| Acid overdose     | pH 6.96, alkalinity 54                                                    | soda ash to pH 7.3, bicarbonate to 110: pH 7.40, alkalinity 102                                       |
| Low hardness      | hardness 50, balance index −1.36, after a refill from soft mains          | calcium chloride to 150, bicarbonate to 100: hardness 145, index −0.46                                |
| High TDS          | TDS 1,600 above the mains                                                 | fresh water: within mains + 1,000 in 88 plant hours                                                   |
| Dechlorination    | 20 mg/l after a shock                                                     | thiosulphate 5 g/m³ for each mg/l above 2.2: free chlorine 2.05, pH 8.69, then acid                   |
| Faecal incident   | a pool to be closed and superchlorinated                                  | 20 mg/l at pH 7.2 for 13.5 h (CT 15,433 mg·min/l), then thiosulphate: free chlorine 1.96 on reopening |

## Reuses (paths checked 2026-10-28)

- Chemistry: `src/game/water/pool-chemistry.ts` (`PoolChemistry`, `Additions`, `waterFrom`, `mixWaters`, `dose`, `stepChemistry`, `readings`, `acidFor`, `BATHER`, `CHEMISTRY`, `CONSERVED`, `equilibrateWithAir`), `src/game/water/chemistry-bench.ts` (`POOL_25M`, `newBench`, `stepBench`, `handDose`, `runScenario`, `SCENARIOS`, `alkaliFor`), `src/game/plant/water-treatment.ts` (`STRENGTH`, `MAINS`), the fixtures in `src/game/water/fixtures/`.
- Views: `createTeleprinter` (`src/toolkit/components/industrial-control/views/teleprinter.ts`), `createPanelMeter` and `createVfd` (`panel-instruments.ts`), `createSevenSegment` (`src/toolkit/components/core/views/eighties-controls.ts`), `createMimicBoard`, the control-part kit (`pushButton`, `selector`, `keySwitch` in `src/toolkit/components/core/parts/parts.ts`), `createIdealVessel`, `createExperimentalSourceView`, `src/toolkit/gallery/views/museum-exhibit.ts`.

**New:** the model `museum-4-lab.ts` and its mimic, placards and layout; the ideal chemical tanks (the substances `experimental-source.ts` lacks); the dosing desk DS1 with its thumbwheel switch (a new control part if the kit has none; try it on dev0's boards first, CLAUDE.md); the ideal analyser and its readout board; the challenge cards and their goal checks.

## Acceptance

- The model test: each Try it step's numbers equal the chemistry model's (the PHREEQC-checked ones to the research doc's precision); each challenge's problem water is its scenario's, and the scenario's own treatment applied through the station meets the card; conservation holds; RESET and entry identical.
- Nothing invented: no chemistry in the hall's code beyond calls into `pool-chemistry.ts` and `chemistry-bench.ts` (a review check).
- **Walking in from Hall 3:** Hall 4 at its reset water with a new log sheet at the visitor's local time; on into Hall 5 and back, and it is reset again.
- Browser checks on high, medium and low; screenshots and camera links recorded here.

## Performance budget

As 107a: within `DEFAULT_BUDGET`, nothing added to `KNOWN_OVER_BUDGET`; the readout board's meters eased and its digits redrawn only when they change; the teleprinter's paper redrawn a line at a time; the chemistry stepped every 10 s of plant time (well-mixed, one volume: cheap even at ×3600); at least 60 fps on medium and 50 on high through an archway.

## Open questions for the owner (one at a time, in this order)

1. **Mixing:** the pool well mixed, so a dose shows at once (recommended for a lab), or through the circulation, with the hour's lag Hall 3 taught?
2. **How much:** thumbwheel switches for any amount (recommended), or a few fixed steps per press?
3. **The challenges:** a time to beat on each card, or simply "put right"?
