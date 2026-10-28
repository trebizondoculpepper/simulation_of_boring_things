# 107b: PLANTROOMS Hall 2, "Clean water": a smaller, focused plant built from dev51's

Status: planned 2026-10-28, not started. A sub-prompt of mission 107 (`doc/prompts/107-pool-science-museum.md`), after 107-0 (`doc/prompts/107-0-exhibit-groundwork.md`). It was the old stage 3, moving the ideal pool plant of mission 106 (`?room=dev51`) into the museum; the owner has since ruled (2026-10-28, below) that dev51 stays as it is and Hall 2 is a smaller, more focused plant of its own, built from dev51's models, laid out left to right. It can be built before or after 107a; it only reads Hall 1's lessons, it does not need its code.

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first and follow it. Then read mission 107, 107-0, 107a (`doc/prompts/107a-warm-water-heating.md`, what the visitor has just learnt) and above all mission 106 (`doc/prompts/106-ideal-pool-plant.md`), which built everything this hall shows.

## The owner's request

The owner, 2026-10-28: "Start planning out each of those rooms. And yes, reuse Dev 51 as one of the exhibit spaces in this museum." And, setting the order: "I think warmth could be the first one … All of the basic systems, warmth, filtration, and then we do chemical dosing. … And like all the other exhibits, you can reset it at the end."

## Rules for every hall (the owner, 2026-10-28)

1. **Every hall starts from its reset state the moment you step into it.** Its time is set to now, the visitor's real local time, and its exhibit is put in its reset condition. Walking in is the same as pressing its RESET button. No hall's state carries over from an earlier visit.
2. **Time.** A hall's simulated time starts at now. If the visitor speeds it up, the hall's time display follows. Halls may show time in different ways. **Hall 2 keeps dev51's:** the Poolguard pool clock high on the wall, its PLANT TIME readout, and the mimic's TIME buttons ×1, ×60, ×600 and ×3600 (a day's fouling in 24 real seconds).
3. **Halls start empty.** `museum2` begins with set decoration only; this sub-prompt moves dev51's exhibit in.

**How the rules fit dev51.** dev51 already builds a fresh state on every entry (`prepareRoom` in `src/toolkit/gallery/rooms/plant/ideal-pool-plant.ts`, `newIdealPlant(localNow())`) and sets its clock to the visitor's real local time on load and on RESET (the owner's correction in mission 106). So rule 1 and rule 2 hold as it stands; the only change is that entry is now a hand-over from Hall 1 or Hall 3 rather than a page load, and both must take the same path (107-0's reset on entry). One consequence: the heat meter's sign counted "since the demo started", from page load and on through RESET; under rule 1 it counts from the moment the visitor walked in, so its words become "Heat used since you came in" (and RESET still leaves it counting, so pressing RESET does not hide what the visitor has used).

## What the hall teaches, and what it builds on

**Assumes (from Hall 1):** a pump makes flow and a closed valve trades flow for pressure; gauges either side of a pump; a mag meter's reading; the plate heat exchanger and why the waters do not mix; an interlock (no flow, no heat); a local reset at the machine; plant time and ×3600 on the pool clock.

**Adds:**

- **Why a pool has a balance tank:** the pool overflows by gravity into it, so the surface (where the dirt floats) is always skimmed, and the tank takes up the water the swimmers displace; the pump draws from the tank.
- **Filtration:** a sand bed catches what the swimmers bring; it slowly fills; the differential pressure across it (PDI1) is the sign, and the flow falls as it clogs.
- **Backwash:** the five-valve nest worked in the right order, the flow reversed to lift and wash the bed, the sight glass going from brown to clear, then a rinse and back to service.
- **Valves can hurt the plant:** a slammed valve's surge (water hammer), and a dead-headed pump heating its own water until it trips, reset only at the pump once it has cooled.
- **Flow divides:** the exchanger's bypass and four flow meters show the flow splitting and rejoining.

**Leads on:** "The water is warm, clean and clear. But clear is not the same as safe: next, how the plant keeps it free of germs, by itself." (Hall 3.)

## Dev51's heating: simplified (the owner, 2026-10-28)

The owner's ruling: "simplified, each room should teach one concept, so we should get rid of the kWh used from hall 2." Hall 2 teaches clean water; energy and its cost are Hall 1's concept. So the hall keeps the plate exchanger HX1, its bypass HX1-V1, the ideal LTHW source HS1 and the interlock valve HX1-V6, because they are part of the circulation and the exchanger after the filter shows a real plant's order. What goes is everything that counts energy: the heat meter HM1's display and the kettles sign (no kWh, no kW, nothing about cost). The exchanger's placard says only: "You met the exchanger in Hall 1. It sits after the filter, so only clean water reaches its thin plates." The schematic is unchanged (HM1 stays in the model, unbound and not drawn), so mission 106's flow, pressure and temperature readings are still the acceptance; only the heat-meter readings drop out.

This rule, one concept per hall, applies to every hall (the owner, 2026-10-28): a hall's exhibit shows what teaches its own concept, and leaves out readouts that belong to another hall's.

## The schematic

Unchanged: `src/game/plant/ideal-pool-plant.ts` (`NODES`, `LINKS`, `FITTINGS`, `VALVES`, `INSTRUMENTS`, `TAGS`), as mission 106 records it: the ideal pool IP1 (470 m³) overflowing by gravity to the ideal balance tank BT1; pump P1 (Grundflow NKC 150-315) through its suction valve, non-return valve and discharge valve; the sand filter F1 (Ø2.8 m, 1 m bed, `ideal-filter.ts`, sand loss off) with its five-valve nest V1 to V5; the electromagnetic meter FT1; the split through the throttling bypass HX1-V1 and the exchanger HX1's secondary; the return to the pool; the ideal LTHW source HS1 and return HS2 through HS1-V1 and the motorised interlock valve HX1-V6; the backwash waste through tees TE3 and TE4 to the ideal drain DR1 with sight glass SG1. Instruments PI1 to PI4, PDI1, TI1 to TI5, FT1, FI2 to FI4, HM1, SG1.

**The tags follow the hall.** `ROOM_CODE` is `IPP` today; in the museum it is `M2`, so `IPP-P1-V1` becomes `M2-P1-V1` everywhere it is derived (placards, mimic, overlay), with no tag written by hand. The model keeps its code as a parameter so its tests run unchanged against either.

## The mimic

Dev51's (`IDEAL_PLANT_MIMIC` in `src/toolkit/gallery/logic/ideal-pool-plant-mimic.ts`, Penfold), unchanged but for its title ("The map: how the water is cleaned") and the derived tags; its `checkMimic` test stays.

## The museum panels (text outline)

Dev51's words (`src/toolkit/gallery/logic/ideal-pool-plant-placards.ts`), restyled to the PLANTROOMS brand (`museum-brand.ts`) and lightly edited so that Hall 1's lessons are named, not repeated:

- **Entrance panel.** Headline "Clean water". Big idea: "Swimmers bring dirt, sweat and skin with them, about three grams each an hour. The plant takes it out by passing all the water through sand, all day." Fact: "This pool's whole volume goes through the filter every two and a half hours." Route: 1 pool, 2 balance tank, 3 pump, 4 filter, 5 heat exchanger (you met it in Hall 1), 6 back to the pool, 7 backwash. RESET pedestal and sign beside it.
- **Station placards 1 to 7**, the hot-water source's and the mimic's signposts, the pool clock's: as dev51's (no heat-used sign), with "you met this in Hall 1" on the pump's and the exchanger's.
- **The activity card** keeps dev51's steps (below).

## Try it, with the expected results (all from mission 106's browser readings; the model's tests pin them)

At the normal duty (every valve open, the bypass at notch 3 of 5, heating off): FT1 184.7 m³/h (turnover 2.5 h), FI2 150.7, FI3 34.0, FI4 0; PI2 2.02 bar, PDI1 0.42 bar; 27.0 °C.

1. **Shut the filter outlet F1-V2, notch by notch:** 0.6 open: FT1 178.5, PI2 2.03; 0.4: 156.0, 2.07; 0.2: 67.0, 2.18; shut: 0, 2.21 bar, PDI1 0.
2. **Leave it shut** (dead-headed) at ×60: the pump's casing heats and it trips after about 60 plant seconds at 45 °C; START is refused; after about 30 plant seconds the casing is below 42 °C and RESET at the pump's station clears it.
3. **Let the filter foul:** ×3600 for 24 real seconds (24 plant hours): PDI1 0.42 → 0.82 bar, FT1 183 → 160 m³/h.
4. **Backwash** (pump stopped, then F1-V1 and V2 shut, V3 and V4 opened, pump started): about 196 m³/h up through the bed, BED LIFTED on the mimic, SG1 2,710 g/m³ after 12 s and 13 g/m³ after five minutes; rinse (V5) to 4 g/m³; back in service 183 m³/h and PDI1 0.42 bar. A throttled backwash (V4 at notch 1) does not lift the bed and leaves it dirty.
5. **Slam a valve with the pump running:** PI2's surge, about 2.3 bar, dying away in under a second.
6. **Heating on** (HS1-V1 open): FI4 3.07 m³/h, 181 kW; TI2 31.3 °C (nothing counts energy in this hall). Bypass HX1-V1 shut: FI3 = FT1 = 104.1 m³/h.
7. **RESET SIMULATION** (and walking back in): every valve to its normal notch, the pump running, a clean bed, the heating shut, ×1 at the visitor's local time, 27.0 °C.

## The owner's ruling: dev51 kept, Hall 2 smaller and left to right (2026-10-28)

"Keep dev51 but make a smaller more focussed Hall 2. Also, it needs to show the process from left to right, so the inputs (gas, water) on the left, the pool on the right."

- **Dev51 stays** as mission 106 built it: its own development room at `?room=dev51`, unchanged, with its heat meter, kettles sign and the original dead-head timing (about six minutes to trip). There is no alias; nothing of dev51 is refactored away.
- **Hall 2 is a new, smaller exhibit** in `museum2`, with a schematic of its own (`src/game/plant/museum-2-clean-water.ts`, tested, the plumber adding nothing) built from dev51's models (`ideal-filter.ts`, `five-valve-filter.ts`, `pump-deadhead.ts` with the museum's shorter timing, `hydraulics.ts`), and only what teaches clean water: the ideal mains make-up, the balance tank, the pump with its suction and discharge gauges and its valves, the sand filter with its five-valve nest, PDI1 and the sight glass, the flow meter, the backwash to the drain, and the pool. No heating at all (the owner, 2026-10-28: first "an idealised heat-source + return", then "we can get rid of the heat exchange as well, if hall 2 is just about filtration, but we can put in ozone and UV"): the exchanger HX1, its bypass, the LTHW source and return, the interlock valve, the extra flow meters FI2 to FI4 and any ideal heater all go; the pool simply stays at 27 °C, its temperature a constant of the hall (shown on the pool's thermometer, never changing). The combined ideal heat source and return is not built for this hall; it stays an idea for a later hall that needs warm water without being about heating.

**Ozone and UV instead** (the owner, 2026-10-28): the hall's concept widens from the sand filter to cleaning the water by treatment as well as by straining, in the order a UK plant uses (PWTAG, as `doc/research/ozone-plant.md` records it: balance tank, pump, filter, ozone with its contact tank and deozonising carbon filter, UV, then chlorine dosing, which is Hall 3's): the line runs, left to right, mains make-up and balance tank, pump, sand filter, ozone injection, contact tank, granular activated carbon deozoniser, UV unit, flow meter, pool.

- **Ozone:** a generator fed from an ideal air (or oxygen) supply on the left with the other inputs, its injection through a side stream with its own booster pump and venturi, a contact tank (about two minutes' contact at the hall's flow), and the GAC filter that takes the ozone out before the water reaches the pool; an ozone-in-air monitor on the wall with its alarm, as the research notes; the generator's output knob and a dissolved-ozone reading after the contact tank, near zero after the carbon. Built from the research note and the game's existing ozone model (`src/game/plant/ozone.test.ts` and its module, `water-treatment.ts`), its maker one of the game's brands.
- **UV:** a medium-pressure UV unit after the carbon, its lamp lit while the water flows (as `src/game/plant/uv.ts` has it: lit or not, no lamp failure modelled), its intensity meter, lamp-hours counter and a viewing port showing the glow; its maker one of the game's brands.
- **What the visitor sees them do,** within one concept: no chlorine numbers (Hall 3's and 4's); ozone and UV are shown as working machines with their own readings, and the placards say what each removes (ozone: oxidises the dirt the sand lets through and kills chlorine-resistant bugs such as _Cryptosporidium_; UV: breaks down the chloramines that make the pool smell, and kills bugs; both leave nothing behind in the pool, which is why chlorine is still needed, "see Hall 3"). If the implementing session wants a measure of their effect (a turbidity or "clarity" reading after each stage), it asks the owner first, since none is modelled yet.
- The research for both machines' real products and numbers goes in a short note beside `ozone-plant.md` before they are built; the hall is still smaller than dev51's, so the sizer may need to lengthen the bay for the extra vessels, reported to the owner.
- **Left to right.** Facing the plant, the process runs from left to right: the inputs on the left (here the mains water make-up into the balance tank; in Hall 1 the gas), then the pump, the filter, the flow meter, and the pool on the right. The pool's overflow back to the balance tank, the one line that must run right to left, goes low along the back, out of the way of the reading order. The backwash drain drops below the filter. The mimic, the lecterns and the station placards follow the same order, numbered left to right. The hall's route runs north up the ring's west side, so the plant stands on the hall's outer (west) wall, its left at the south end where the visitor comes in from Hall 1 and the pool at the north end by the way on to Hall 3; the visitor walks with the water.
- **Smaller.** A shorter run than dev51's 18 m: the implementing session sizes it with the room-layout sizer (`doc/room-layout-guide.md`) and reports the plant's length; the hall's bay may then shrink when the ring is built (107-1).
- **The link.** `?room=dev51` stays dev51. Hall 2 is `?room=museum2`.
- **The overlay** on every machine, valve and instrument, with tags derived as `M2-…`.

## Readings

Mission 106's readings are not this hall's acceptance any more, since its schematic is new: the implementing session works out the normal duty (flow, turnover, PI2, PDI1) from the new schematic's tests and writes them here. It keeps dev51's pump and filter, so the figures should come out close to dev51's (about 185 m³/h, a 2.5 h turnover, PDI1 about 0.42 bar clean); the visitor's tries (throttle, dead-head, dirty bed, backwash) keep their steps above, with the shortened trip.

## Reuses (paths checked 2026-10-28)

Everything of mission 106: `src/game/plant/ideal-pool-plant.ts`, `ideal-filter.ts`, `pump-deadhead.ts`, `five-valve-filter.ts`, `src/game/sim/hydraulics.ts`; `src/toolkit/gallery/logic/ideal-pool-plant-layout.ts`, `ideal-pool-plant-mimic.ts`, `ideal-pool-plant-placards.ts`; `src/toolkit/gallery/rooms/plant/ideal-pool-plant.ts`; `src/toolkit/gallery/views/museum-exhibit.ts`; the views `throttle-valve.ts`, `small-flowmeters.ts`, `ideal-vessel.ts`, `heat-meter.ts`, `mag-flowmeter.ts`, `pumps-plant.ts` (in `src/toolkit/components/plant/views/`), `dial-gauge.ts`, and `pool-clock.ts`.

**New:** Hall 2's own schematic and layout (left to right), the dead-head timing as a parameter, the exhibit in `museum2`, and the edited words. Dev51 is not changed.

## Acceptance

- Every mission 106 reading above unchanged in the hall (the model's tests unchanged, plus a test of the readings with `M2` tags).
- `?room=dev51` lands in `museum2` (tested in logic, checked in the browser).
- **Walking in from Hall 1:** through the archway from Hall 1 the hall is at its reset state, its clock at the visitor's local time; walk on into Hall 3 and back, and it is reset again; the hand-over works at both its archways with no jump.
- The overlay shows only displays; RESET as above; screenshots and camera links recorded here.

## Performance budget

Dev51 alone ran at about 97, 106 and 119 fps on high, medium and low; in the hall, with the shell and a neighbour seen through an archway, it must keep at least 60 fps on medium and 50 on high, within mission 094's `DEFAULT_BUDGET` for every component, nothing added to `KNOWN_OVER_BUDGET`; the neighbour halls' exhibits drawn at their reset state, not stepped (107-0). Draw calls measured on each preset and recorded here.

## Research: what the hall holds

Researched 2026-10-28 from the repository's notes (`doc/research/plant-products-pumps-balance.md`, `doc/research/pool-dosing-and-water-chemistry.md`, which cites the PWTAG Code of Practice as reproduced by the States of Guernsey, [CoP](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)), the model's constants (`FILTER_PHYSICS` in `src/game/plant/ideal-filter.ts`) and web searches. Two web searches for PWTAG's filtration and backwash velocities returned no PWTAG text, only general filter guidance (bed expansion of at least 20 %, [Washington DOH](https://doh.wa.gov/Portals/1/Documents/Pubs/331-624.pdf); 15 to 20 % often enough, 30 to 50 % in manuals, [WVU brief](https://actat.wvu.edu/files/d/638db309-5274-42c9-a8c3-7f8be496c607/filter-backwashing.pdf)). Figures marked _indicative_ are from general trade knowledge and not checked against a source here; _derived_ figures are worked from the model.

### The numbers behind the hall (derived from the model)

| Quantity                             | Value                                                                                                                                 | How                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Pool IP1                             | 470 m³, about a 25 × 12.5 m six-lane pool, 1.5 m average depth _(derived)_                                                            | 25 × 12.5 × 1.5 = 469                                                    |
| Filter F1 bed area                   | 6.16 m²                                                                                                                               | π × 2.8² / 4                                                             |
| Sand in the bed                      | 6.16 m³, about 9 t at about 1.5 t/m³ bulk _(indicative density)_                                                                      | area × 1 m                                                               |
| Filtration velocity, clean           | 30.0 m/h                                                                                                                              | 184.7 / 6.16                                                             |
| Filtration velocity, fouled (24 h)   | 26 m/h                                                                                                                                | 160 / 6.16                                                               |
| Model's design rate and wash rate    | 25 and 30 m/h                                                                                                                         | `FILTER_PHYSICS`                                                         |
| Backwash velocity                    | 31.8 m/h                                                                                                                              | 196 / 6.16                                                               |
| Turnover                             | 2.54 h                                                                                                                                | 470 / 184.7                                                              |
| Water to waste per 5-minute backwash | about 16 m³, plus the rinse _(derived)_                                                                                               | 196 × 5/60                                                               |
| Clean-bed ΔP                         | 0.42 bar (4.3 m)                                                                                                                      | PDI1; the model's 3 m per m of bed plus the vessel's laterals and valves |
| Backwash trigger                     | about 0.8 bar ΔP, or about +0.4 bar over clean _(indicative: UK practice backwashes on a rise of 0.3 to 0.5 bar, or at least weekly)_ | step 3 reaches 0.82                                                      |

**Real benchmark.** The repo's reference filter, the Waterco SMDD2000 (Ø2042 mm, 3.14 m², 94 m³/h nominal, 126 max, 1.2 m bed, 6,090 kg sand, 4 bar, [Bosta datasheet](https://www.bosta.com/datasheet/download/07ea3e4001d4b06ea7f6bd7f645260d5)), is rated at 30 m/h nominal: F1 is the same range scaled to Ø2.8 m and runs at the same 30 m/h. One such filter for a 470 m³ pool is plausible; a real UK pool of this size would more often have two or three filters for medium-rate filtration and redundancy _(indicative)_.

### Exhibits, station by station

Each station is dev51's existing machine with the same model address; nothing below needs a new component.

1. **The pool IP1 (a cut-away tank edge and the pool clock).** What the visitor sees: the Poolguard clock high on the wall (plant time, ×1 to ×3600) and the deck-level overflow grating. Plaque facts: a bather brings in dirt, sweat, skin and cosmetics (the brief's "about three grams an hour" is _indicative_: I found no source for the figure; PWTAG's related, sourced rule is 30 litres of fresh water per bather, [CoP §3.6](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)). Turnover 2.5 h means each drop goes round about ten times a day.
2. **The balance tank BT1.** Sees: level in the tank; overflow falling in. Plaque: a deck-level pool's surface spills all round into channels, skimming the top film where most of the dirt and grease floats; the tank holds the water bathers displace (about 70 litres each, _indicative_: a body's volume) and the backwash water. Does: nothing to work (dev51's has no controls).
3. **The pump P1 (Grundflow NKC 150-315, modelled on a Grundfos NK/NKG end-suction 150-315 class, 4-pole, about 15 to 22 kW at this duty, _indicative_).** Sees: suction gauge PI1, discharge gauge PI2 (100 mm dial, 0 to 4 bar, Budenberg or WIKA 232.50 class, _indicative_), its casing temperature, START/STOP and RESET at the pump. Does: start, stop; the dead-head trip (step 2) and local reset. Plaque: "you met this in Hall 1"; and the new fact, that a pump working against a shut valve turns all its power into heat in the little water trapped inside it.
4. **The filter F1 and its five-valve nest (the main exhibit).** Sees: the vessel (Ø2.8 m, about 3 m tall), PI3/PI4 either side, PDI1 (a differential gauge, 0 to 1.6 bar, WIKA 700-series class, _indicative_), the five valves V1 to V5 with their lever positions, the mimic's BED LIFTED lamp, and sight glass SG1 on the waste. Does: the backwash sequence. Plaque facts: sand of 0.5 to 1.0 mm (the model's note), 1 m deep, 6 m² across; water passes down at 30 m/h (the speed of a slow walk is 3,600 m/h, so the water moves down through the sand at under a centimetre a second, _derived_); medium-rate filters with coagulant catch about 99 % of Cryptosporidium oocysts a pass, without it as few as 10 % ([CoP §8](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)); the bed fills, the gauge difference rises, the flow falls; backwash reverses the water so the sand lifts (bed expansion, about 20 % is enough) and the dirt goes to the drain.
5. **The heat exchanger HX1 and the bypass HX1-V1** (kept, simplified: the owner, 2026-10-28). Sees: TI1 to TI5, FI2 to FI4; no heat meter or kettles sign. Plaque: after the filter, so only clean water reaches the thin plates; the bypass throttle sets how much of the flow is heated.
6. **The return to the pool and FT1.** Sees: the electromagnetic meter FT1 (modelled on Endress+Hauser Proline Promag W 400 DN150, [Instrumart](https://www.instrumart.com/products/45578/eh-proline-promag-w-400-electromagnetic-flow-meter)) reading m³/h and a totaliser. Plaque: Hall 1's mag meter again; here it tells the operator the turnover: flow ÷ volume.
7. **Backwash to waste (DR1, SG1).** Sees: the sight glass's colour (brown at 2,710 g/m³, clear at 13, polished at 4 after rinse) and a readout of g/m³. Plaque: about 16 m³ goes to drain each backwash, about a bath's worth every two seconds (196 m³/h is 54 litres a second, a bath about 100 litres, _derived_); that water counts towards the pool's fresh-water dilution.

### Interactions the game already simulates (no new model)

Every one of the brief's seven steps; plus the throttled backwash (V4 at notch 1: below the lift share, half the wash flow in `FILTER_PHYSICS.liftShare`, the bed does not lift and the dirt stays), which is the hall's best "why the order matters" lesson and could earn a line on the activity card.

### Research conflicts

- **Filtration velocity versus "medium rate".** F1 runs at 30.0 m/h clean, above the model's own design rate of 25 m/h (`FILTER_PHYSICS.filtrationRate`) and, as I recall PWTAG's classification, above its medium-rate band (up to 25 m/h) and into high rate _(indicative: not verified against the CoP text in this session)_. It matches the Waterco range's nominal 30 m/h, so it is a real product's rating, not an error in the model. Not changed. If the hall's plaque says "medium-rate", it should say "about 30 m/h, the top of the commercial range", or the duty should fall to 154 m³/h (25 m/h, turnover 3.05 h), which would change every mission 106 reading; I do not recommend that.
- **"About three grams each an hour"** (entrance panel): no source found; keep it marked as an illustration, or drop the number.
- **Backwash at 31.8 m/h** is above the model's 30 m/h wash rate and below its 40 m/h safe-rise limit, so sand loss (off anyway) would not occur: consistent.

### Question for the owner

Should the filter placard call F1's 30 m/h rate what it is (fast, at the top of a commercial sand filter's rating), or should the hall keep silent on filtration rates?

## The dead-head trip, shortened (the owner, 2026-10-28)

Mission 106's dead-headed pump took about 371 plant seconds to trip and 152 to cool below its reset temperature: too long for a visitor to wait for. In the museum it trips after about 60 plant seconds dead-headed and can be reset about 30 plant seconds later. Do it by the casing's thermal constants in `pump-deadhead.ts` (its heat capacity and its loss to the room, as a parameter of the pump's model, the museum's value passed in; the trip at 45 °C and reset below 42 °C unchanged), not by speeding the hall's clock, so the pool clock still shows real time. Retest the readings: the trip within 50 to 70 plant seconds of shutting the valve at the normal duty, the reset refused before the casing is below 42 °C and allowed within 25 to 40 seconds after the trip. Whether dev51's own value changes too depends on the third question (dev51 retired to the alias, or kept).

## Open questions for the owner (one at a time, in this order)

1. **Dev51's heating:** answered (the owner, 2026-10-28): simplified; no energy readouts in Hall 2, one concept per hall.
2. **The dead-head trip's timing:** answered (the owner, 2026-10-28): shortened for the museum, to about one minute dead-headed to trip and about 30 seconds to cool, in plant time (see "The dead-head trip, shortened").
3. **Dev51 itself:** answered (the owner, 2026-10-28): dev51 is kept as it is; Hall 2 is a smaller, focused plant of its own, laid out left to right.
