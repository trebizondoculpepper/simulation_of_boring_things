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

## Research: what the hall holds

Added 2026-10-28 from the repository's research notes (`doc/research/pool-dosing-and-water-chemistry.md`, "PDWC" below, which read the PWTAG Code of Practice (July 2021) in full; `doc/research/water-chemistry-models.md`, "WCM") and the model code (`readings` in `src/game/water/pool-chemistry.ts`, `SCENARIOS` in `chemistry-bench.ts`). No new web sources were added; every PWTAG figure below is as PDWC cites it, by section of the Code of Practice ("CoP"). Figures marked _indicative_ are hand-worked from stoichiometry and must be replaced by the model's in `museum-4-lab.test.ts`.

### The readout's green bands (UK, PWTAG)

These are the bands the readout board AN1 paints green; each comes from PDWC §2.9.

| Meter             | Scale           | Green band                                                        | Amber / red                                                                   | Source               |
| ----------------- | --------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------- |
| Free chlorine     | 0 to 10 mg/l    | 1.0 to 2.0 at pH 7.2 to 7.4 (0.75 to 1.0 at pH 7.0 to 7.2)        | above 3 amber ("reduce dosing"); above 5 red ("stop bathing if still rising") | CoP §9.5             |
| Combined chlorine | 0 to 2 mg/l     | below 0.5 and below half the free                                 | 0.5 to 1 amber; above 1 red                                                   | CoP §9.7             |
| Total chlorine    | 0 to 10 mg/l    | no band of its own (free plus combined)                           |                                                                               |                      |
| pH                | 6.5 to 8.5      | 7.0 to 7.4 (ideally 7.0 to 7.2)                                   | above 7.6 or below 6.8 red _(indicative thresholds)_                          | CoP §9.8             |
| HOCl share        | 0 to 100 %      | no PWTAG band; a plaque line: "about 58 % at pH 7.4, 25 % at 8.0" |                                                                               | PDWC §2.2            |
| Total alkalinity  | 0 to 300 mg/l   | 80 to 200                                                         |                                                                               | CoP §9.9             |
| Calcium hardness  | 0 to 500 mg/l   | 80 to 200                                                         | above 300 red (scale)                                                         | CoP §9.10            |
| TDS (above mains) | 0 to 2,000 mg/l | up to mains + 1,000                                               |                                                                               | CoP §9.11            |
| Balance index     | −1.5 to +1.5    | −0.5 to +0.5 (common practice; the CoP gives no band)             |                                                                               | CoP §9.13, PDWC §2.5 |

The TDS meter should read TDS above the mains (the readout subtracts `MAINS.tds`), since PWTAG's limit is relative.

### The balance index, as the hall shows it

The model's `langelier` is Langelier's formula exactly (PDWC §2.5, from Lenntech): `LSI = pH − pHs`, `pHs = (9.3 + A + B) − (C + D)`, with `A = (log₁₀ TDS − 1)/10`, `B = −13.12 log₁₀(T + 273) + 34.55`, `C = log₁₀ CH − 0.4`, `D = log₁₀ TA` (TDS mg/l, T °C, CH and TA mg/l as CaCO₃). A dedicated exhibit, **the Balance Beam** (BB1), shows it as a period mechanical balance: a pointer on a beam from −1.5 (AGGRESSIVE, eats grout) through 0 (BALANCED) to +1.5 (SCALING), with four seven-segment windows beneath giving each term's share as the model computes it (pH, the hardness term C, the alkalinity term D, and temperature and TDS together). It does no maths of its own: the four windows are derived from the same `readings` inputs by a pure function in the lab model, tested against `readings().langelier` to 0.001. Plaque worked examples, from PDWC §2.5's table _(derived there)_: nominal water (pH 7.4, TDS 1,000, 28 °C, CH 200, TA 120) −0.15; the same at 37 °C +0.02 (warm water scales sooner, hence spa heaters); soft water (pH 7.2, CH 100, TA 80) −0.83; neglected (pH 7.0, TDS 500, CH 60, TA 60) −1.34; hard (pH 7.8, TDS 1,500, CH 350, TA 180) +0.65. Rules of thumb for the plaque: raising pH by 0.1 raises the index by 0.1; doubling hardness or alkalinity raises it by 0.3 (log₁₀ 2); ten degrees warmer raises it by about 0.13 _(derived from the formula)_. The plaque adds PWTAG's caution: "pH and free chlorine take precedence over other factors" (CoP §9.13).

### The tanks: what each does, its side effects, its plaque line

All model effects come from `dose` via the `Additions`; side-effect figures are PDWC §2.1's stoichiometry (marked derived there).

- **CT1 Sodium hypochlorite 14 %** (pale yellow-green liquid; signs: corrosive, environmental hazard; "never mix with acid"). Raises free chlorine; adds about 1.65 mg/l TDS per mg/l chlorine (WCM, model constant) and a little alkalinity and pH from its caution caustic. Plaque: "Pool chlorine is bleach's stronger cousin. Each litre in this pool adds about 0.3 mg/l of chlorine, and salt that stays until you dilute it." Also: it decays in the drum (half-life about 180 days at 25 °C for 12.5 %, Aqua Magazine via PDWC §2.8), a fact for the plaque, not simulated by an ideal tank.
- **CT2 Calcium hypochlorite 65 %** (white granules; oxidiser, corrosive). Chlorine like CT1 but adds calcium hardness, about 0.7 mg/l as CaCO₃ per mg/l chlorine _(indicative: 100.09/141.8)_. Plaque: "Good in soft water, bad in hard: it brings calcium with it."
- **CT3 Hydrochloric acid 10 %** (clear; corrosive). Lowers pH and alkalinity; adds chloride (TDS). PWTAG wants acid below 18 % "to prevent corrosion in the plant room" (CoP §6). Plaque: "Never let acid and hypochlorite meet: together they make chlorine gas." (The hall's dosing header is ideal; no gas event here, that is the finale's.)
- **CT4 Sodium bisulphate** (white crystals; irritant). As acid, but adds sulphate, which above 360 mg/l attacks cementitious grout (CoP §9.12); 2.4 g/m³ lowers alkalinity 1 mg/l and adds 1.9 mg/l sulphate (PDWC §2.1). The readout has no sulphate meter; the log prints SO4 when it changes. Question for the owner below.
- **CT5 Carbon dioxide** (grey cylinder bank shown as a tank; gas under pressure). Lowers pH, leaves alkalinity unchanged, then leaves to the air over hours, so the pH creeps back: the visitor sees it at ×600. PWTAG prefers it for soft water (CoP §6).
- **CT6 Sodium bicarbonate** (white powder; no hazard sign). Raises alkalinity with little pH change; PWTAG's 1.68 g/m³ per mg/l (CoP §9.9 via WCM §7.1).
- **CT7 Soda ash** (white powder; irritant). Raises pH sharply and alkalinity; the hall's best pair with CT6 ("same alkalinity, very different pH").
- **CT8 Calcium chloride** (white flakes; irritant). Raises hardness; pH almost unchanged; dissolving it is exothermic (plaque fact, not simulated).
- **CT9 Sodium thiosulphate** (clear crystals; no hazard sign). Removes chlorine, 5 g/m³ per mg/l (PWTAG TN23, WCM model fit). See Research conflicts on its pH effect.
- **FW1 Mains water.** Lowers everything towards `MAINS`; the only cure for TDS, sulphate, chlorate and cyanuric acid. Plaque: PWTAG's 30 litres of fresh water per bather (CoP §3.6).

**Not on the station: PAC and other coagulants.** Polyaluminium chloride is dosed continuously ahead of the filters to clump fine particles; PWTAG's alkalinity floor of 80 exists "to ensure effective coagulation" (CoP §9.9). The model has no turbidity or particle state and `Additions` has no coagulant, so a PAC tank would be invented chemistry. Recommendation: a plaque only ("Tank you won't find here: coagulant. It works on dirt, not on chemistry, and lives in the filter hall"), pointing to whichever hall covers filtration. Similarly cyanuric acid (stabiliser) appears only as a wrong-delivery card.

### Try it, extra steps the research supports

- **10. The buffer test.** Two identical acid doses (5 l of 10 %) on the reset water and on the low-alkalinity card's water: PDWC §2.4 _(derived)_ says water of alkalinity 60 moves about twice as far as water of 120. The log shows both; numbers to be pinned by the model.
- **11. Calcium versus sodium chlorine.** Equal chlorine from CT1 (10 l) and CT2 (2.15 kg _(indicative)_): free chlorine the same; the hardness meter moves only for CT2.
- **12. Warm it.** A TEMPERATURE thumbwheel is not proposed (the pool is the standard 28 °C); the Balance Beam's plaque gives the 37 °C example instead.

### The challenge cards, concrete

Cards 1 to 8 are the brief's table, the bench scenarios (`SCENARIOS` ids: `combined-chlorine`, `low-alkalinity`, `high-ph`, `acid-overdose`, `low-hardness`, `high-tds`, `dechlorination`, the faecal incident), their start states and results as WCM §7.1 records (pass on all checks). The selector has ten positions; the research supports two more, built only from model state and model additions, to be checked by running them through the bench before they ship:

| Card                         | Starts with                                                                          | Symptom printed                                                                                            | Goal (met for one plant hour)                                    | Solution (expected; pin with the model)                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 9 Wrong delivery: stabiliser | cyanuric acid 30 mg/l in the reset water (the model's `cyanuric`), free chlorine 1.3 | "Chlorine reads fine but works poorly": HOCl share collapses (the model's `cyanuricFree`, 1/(1 + CYA/1.4)) | HOCl share back above the reset water's half _(goal indicative)_ | Fresh water (FW1): only dilution removes it; the visitor learns the cost (hundreds of m³).                 |
| 10 Hard water, scaling       | hardness 400, alkalinity 180, pH 7.7 (refill from hard mains plus CT2 overuse)       | balance index about +0.8 _(indicative)_, "white crust on the heater"                                       | index −0.5 to +0.5, hardness at most 300                         | acid to pH 7.2 and alkalinity ~100, then fresh water for hardness; nothing on the station removes calcium. |

Each card's goal check uses the green bands above, plus the card's own goal. Timing: the faecal card needs about 13.5 plant hours of hold (CT ≥ 15,300 mg·min/l, CDC via TN23), so it is only practical at ×3600 or ×600.

### Plaque facts, sourced

- "Each 0.5 increase in pH value roughly doubles the chlorine residual needed. At pH 7.5 a free chlorine of 1.0 mg/l is 50 % effective." (CoP §6)
- "Combined chlorine should be as low as possible, ideally less than half the free chlorine and no more than 1 mg/l." (CoP §9.7, paraphrased)
- "TDS should not be allowed to rise more than 1,000 mg/l above the level in the source water." (CoP §9.11)
- "Breaking point: it takes about 7.6 mg of chlorine to destroy each mg of ammonia nitrogen" (textbook stoichiometry, PDWC §2.3); the model's fit to Jafvert & Valentine is 8.5 (WCM §4).
- "The 'chlorine smell' of a pool is not chlorine: it is trichloramine, made when chlorine meets swimmers' sweat and urine." (Schmalz via WCM; plaque wording indicative.)
- "Urea from swimmers breaks down slowly: half of it lasts about 63 hours at 1 mg/l HOCl." (Davis & Bullock 2002, PDWC §2.3)
- "Even a perfectly dosed pool loses alkalinity week by week as carbon dioxide leaves its surface." (Wojtowicz via WCM §8)

### Research conflicts

1. **Thiosulphate and pH.** The brief says thiosulphate "pushes the pH up". PDWC §2.1's stoichiometry says the reaction releases acid, so pH and alkalinity fall; but WCM §8 records that PWTAG's TN23 dose (5 g/m³ per mg/l) implies a product that raises pH sharply, and the model, fitted to TN23, gives pH 8.69 after dechlorinating 20 mg/l. The hall follows the model, so the brief stands, but the plaque should not claim a mechanism: "In practice the pH rises after dechlorination; check and add acid."
2. **Breakpoint ratio.** The brief's "about eight to ten times the nitrogen" is above the textbook 7.6 (PDWC §2.3) and brackets the model's 8.5. Suggest the plaque say "about eight times" or "7.6 to 10 times, 7.6 in theory", to match the sources.
3. **Reset pH 7.40.** PWTAG's range is 7.0 to 7.4, ideally 7.0 to 7.2 (CoP §9.8); 7.40 is the edge of green. It is kept (it is the PHREEQC base water), but the pH meter's green band must include 7.40 or the hall would open on an amber needle.
4. **Hardness at reset.** 200 mg/l is the top of PWTAG's "ideally 80 to 200"; adding any calcium (Try it step 5, CT2) leaves the green band at once. Not an error, but worth a plaque line: "Already at the top of the ideal range."
5. **PAC** is named in the mission task but is outside the model (above); not added as a tank.

### Question for the owner

Should sulphate (from the dry acid) get its own meter on the readout, given PWTAG's 360 mg/l grout limit, or stay a log-sheet line only?

Answered (the owner, 2026-10-28): "Sounds fun, let's give it a try." Sulphate gets its own meter on the pool's readout, read from the model's `sulphate` (mg/l as SO₄, already tracked in `pool-chemistry.ts`): a scale of 0 to 600 mg/l, green to 360 and red above, the grout limit marked on the dial as "GROUT". Its placard: dry acid (sodium bisulphate) adds sulphate every time it lowers the pH; above about 360 mg/l sulphate attacks cement grout, and only fresh mains water brings it down; "see what it does to grout in the Grout hall." It is also logged on the log sheet. A challenge card to go with it: a season of dry acid has pushed sulphate to about 400 mg/l; bring it back under the limit (the answer: dilution with mains water, and change to hydrochloric acid or CO₂ for pH), its numbers run through the bench before it ships.
