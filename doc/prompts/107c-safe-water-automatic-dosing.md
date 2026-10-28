# 107c: PLANTROOMS Hall 3, "Safe water": automatic disinfection, a closed loop

Status: planned 2026-10-28, not started. A sub-prompt of mission 107 (`doc/prompts/107-pool-science-museum.md`), after 107-0 (`doc/prompts/107-0-exhibit-groundwork.md`). Hall 3 is reached from Hall 2 (Clean water) and leads on to Hall 4 (the chemistry lab).

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first and follow it. Then read mission 107, 107-0, 107a and 107b (what the visitor has learnt so far), mission 101 (`doc/prompts/101-water-chemistry-in-the-world.md`, the chemistry in the world), mission 105 (`doc/prompts/105-dosing-controllers.md`, the Chlorella controllers), mission 102 (`doc/prompts/102-olympic-hypochlorite-pump.md`, the metering pumps), mission 100 (`doc/prompts/100-piezo-beeper-library.md`), `doc/research/water-chemistry-models.md` and `doc/plant-model.md`.

## The owner's request

The owner, 2026-10-28: "All of the basic systems, warmth, filtration, and then we do chemical dosing. … And like all the other exhibits, you can reset it at the end." The brief for this hall, as set: a sample cell and a Chlorella dosing controller; metering pumps (the DMX or DMH family with their piezo bleeps); day tanks fed from ideal chemical stores; the tested chemistry model; bathers arriving and the chlorine responding; and faults, a gas-locked pump and a weak delivery.

## Rules for every hall (the owner, 2026-10-28)

1. **Every hall starts from its reset state the moment you step into it.** Its time is set to now, the visitor's real local time, and its exhibit is put in its reset condition. Walking in is the same as pressing its RESET button. No hall's state carries over from an earlier visit.
2. **Time.** A hall's simulated time starts at now. If the visitor speeds it up, the hall's time display follows. Halls may show time in different ways. **Hall 3 shows it on a chart recorder's paper:** a 24-hour circular chart recorder (`createCircularChartRecorder`, Kessler-Moody) drawing free chlorine and pH, its chart turning once a plant day with the hour lines printed on it, so the visitor reads the time off the paper and sees the loop's history; a PLANT TIME readout beside it, and TIME buttons ×1, ×60, ×600 and ×3600 on the mimic (at ×3600 the chart goes round in 24 seconds). On entry and RESET the chart is a fresh one, its pen at the visitor's local time.
3. **Halls start empty.** The hall begins with set decoration only; this sub-prompt builds its exhibit.

## What the hall teaches, and what it builds on

**Assumes:** from Hall 1, a pump and its flow, and the first control (a thermostat: on and off); from Hall 2, the balance tank, turnover (the whole pool through the plant every two and a half hours), and faults that trip and are reset at the machine.

**Adds:**

- **Clear is not safe.** Germs are killed by free chlorine (hypochlorous acid, HOCl); swimmers use it up; the plant must keep adding it.
- **pH decides how well chlorine works.** At pH 7.3 a little over half the free chlorine is the active HOCl; at 7.64 only about four-tenths (model: the bench's high-pH scenario, 0.571 → 0.406). Hypochlorite pushes the pH up, so acid is dosed too.
- **Measuring.** A sample of water flows past probes in a sample cell; the controller reads them; the test kit checks the probes.
- **Control that is not on and off.** The controller doses in proportion to how far the chlorine is below its setting, and adds a little more the longer it stays low (proportional and integral); because a dose takes over an hour to reach the far side of the pool, the loop is slow and must be patient.
- **Metering pumps** that count out chemical a stroke at a time, from day tanks filled from the store.
- **Faults that do not trip.** A pump can stroke away and deliver nothing (gas-locked), or the chemical can be weak; the plant keeps running and the water slowly gets worse; the operator finds it by reading the plant's own displays.

**Leads on:** "The controller looks after two numbers, chlorine and pH. A pool's water has many more. Next door, you are the controller." (Hall 4.)

## The schematic

A new pure model, `src/game/plant/museum-3-dosing.ts` (tested), on mission 106's pattern; room code `M3`; tags derived (as expected below; the derivation wins).

**The pool, the same as every hall's:** the chemistry bench's `POOL_25M` (`src/game/water/chemistry-bench.ts`: a 470 m³ pool and a 30 m³ balance tank, 312.5 m², 28 °C, 166.7 m³/h, the pool in three cells, `circuit.ts`), its water a `PoolChemistry` stepped by `stepChemistry` every 10 s of plant time (`CHEMISTRY_TICK` in `src/game/plant/water-treatment.ts`). Drawn as ideal vessels IP1 (pool) and BT1 (balance tank), the pool overflowing by gravity to the tank as in Hall 2.

**Ideal sources and sinks:**

- CS1, the hypochlorite store: sodium hypochlorite at 140 g/l available chlorine (`STRENGTH.hypochlorite`), unlimited, its strength a property the weak-delivery fault changes (an ideal source, `src/game/plant/experimental-source.ts`'s `hypochlorite` substance).
- CS2, the acid store: hydrochloric acid at 104.8 g/l (`STRENGTH.acid`), unlimited (`experimental-source.ts`'s `acid`).
- DR1, the sample drain (an ideal sink).
- BA1, the swimmers: an ideal source of pollution (`BATHER` in `src/game/water/pool-chemistry.ts`: each visit 17.3 mg urea nitrogen, 7.84 mg ammoniacal nitrogen, 3.7 g of organic chlorine demand, 1 g of TDS), at the rate the SWIMMERS dial sets.

**The circulation, short:** BT1 → M3-P1-V1 suction valve → P1 (Grundflow NKC, as in Halls 1 and 2, at the bench's 166.7 m³/h) → M3-P1-V2 its non-return valve → M3-P1-V3 discharge valve → FT1 (Kessler-Moody mag meter) → the sample tapping → the two injection points → IP1's inlets. No filter and no heater: "they are in Halls 1 and 2; here you see only the dosing".

**The sample line:** the tapping's isolating valve M3-SC1-V1 (normal open) → a needle valve M3-SC1-V2 setting the sample flow (normal at 40 l/h; the cell's most is 60 l/h, its flow switch makes at 20 l/h: `CELL` in `src/toolkit/components/plant/logic/sample-cell.ts`) → SC1, the Chlorella sample cell (flow switch FS1, chlorine probe AE1, pH probe AE2, the sample tap SP1 for the test kit) → DR1.

**The controller:** DC1, the Chlorella DC-1 pair (`createDc1Pair`, `dc1-face.ts`: one unit for chlorine, one for pH, the hands-on period controller; question 1), running `src/toolkit/components/plant/logic/dosing-controller.ts` with `WORLD_SETTINGS` (chlorine set 1.3 mg/l, band 0.5, integral 6 h; pH 7.3, band 0.3; alarms at `PLANT_SETTINGS`' 0.8 and 2.5 mg/l and pH 7.0 and 7.6; sample-flow loss stops dosing after 120 s; two hours at full output latches the output off). Its 4–20 mA outputs drive the two pumps and the chemistry board's meters.

**The chemical lines**, each the same: the store → its fill valve (M3-DT1-V1 for hypochlorite, M3-DT2-V1 for acid; a manual push-to-fill ball valve, normal shut) → the day tank (DT1, hypochlorite; DT2, acid; bunded polyethylene tanks, `createDayTankStation` in `chemical-handling-kit.ts`, each with its maker's badge as the game's day tanks carry; sizes chosen so the visitor sees one fall at ×3600, proposed 60 l each, about two and a half plant days of hypochlorite) with its level gauge (LI1, LI2) → its foot valve and suction line → the pump → its injection valve (a spring-loaded non-return injection fitting, M3-DP1-V1 and M3-DP2-V1) at the injection point. The pumps:

- DP1, hypochlorite: a Grundflow DMX 1602 (2.1 l/h, solenoid diaphragm, 180 strokes a minute, `DIAPHRAGM_PUMPS` in `src/toolkit/components/plant/logic/diaphragm-pump.ts`, view `createDiaphragmPump`), with its bleed valve (M3-DP1-V2, normal shut) and its flow monitor (fault `flow`, display `Er F`).
- DP2, acid: a Grundflow DDS 7.5-16 (7.5 l/h, stepper diaphragm, 190 strokes a minute, deaerating itself in standby), its bleed valve M3-DP2-V2.
- Both on `src/game/plant/dosing-pumps.ts` (`stepDosingPumps`, `actOnDosingPumps`: `acknowledge`, `bleed`, `gas`) and the head model `src/toolkit/components/plant/logic/diaphragm-head.ts` (`headStroke`, `headLocked`), their stroke sounds and piezo bleeps (`src/toolkit/components/sound/logic/piezo-beeps.ts`, `src/toolkit/components/sound/audio/piezo-recordings.ts`; the hollow tick of a locked head in `src/toolkit/components/plant/audio/dosing-pump-sounds.ts`).
- (The DMH 21-10 of mission 102 is sized for the Olympic, about 12.5 l/h; this pool needs about 0.94 l/h of hypochlorite on average, so the DMX it is.)

**The test kit:** TK1, a DPD test kit at the sample tap (new: a comparator with its colour discs, DPD 1 and DPD 3 tablets and phenol red, on a lectern; PRESS TO TEST runs `testSample` in `sample-cell.ts`, giving DPD 1, DPD 3 and phenol red, the colours drawn from the readings), so the visitor can check the controller.

**Instruments, all listed:** FT1; FS1 (the cell's flow switch, its lamp); AE1, AE2 (the probes, read only through DC1); DC1's own displays; LI1, LI2 (the day tanks' levels); the pumps' own displays and stroke lamps; QI1 free chlorine and QI2 pH, the chemistry board (two big moving-coil meters with green bands, Kessler-Moody, `createPanelMeter`, driven by DC1's 4–20 mA outputs, so they show what the controller measures, not the water's truth); the chart recorder (from the same outputs); TK1.

## The mimic

Penfold (`src/toolkit/gallery/logic/museum-3-mimic.ts`, `checkMimic`), captioned "The map: how the plant looks after the water by itself". The loop with lit flow lines; the sample line to the cell, FS1's lamp; the two injection points; each pump's stroke lamp (blinking with its strokes) and FAULT lamp; the day tanks' levels as bar readouts; DC1's measured free chlorine and pH and its outputs in %; the swimmers' rate. Buttons: the TIME speeds. Everything else is worked at its machine.

## The museum panels (text outline)

- **Entrance panel.** Headline "Safe water". Big idea: "Clear water can still carry germs. The plant keeps a little chlorine in it all the time, measures it every second, and adds more as the swimmers use it up." Fact: "The 'chlorine smell' at a pool is not chlorine: it is chloramines, made when chlorine meets sweat and urine, and it means too little chlorine, not too much." Route: 1 the swimmers, 2 the sample, 3 the controller, 4 the pumps, 5 the day tanks and stores, 6 the test kit, 7 the faults. RESET pedestal and sign.
- **1, The swimmers** (the SWIMMERS dial): "Every swimmer brings sweat, skin and worse. Chlorine destroys it, and is used up doing so." Try it: "Send in a crowd and watch the chlorine dip and the controller answer."
- **2, The sample** (SC1): "A trickle of the pool runs past two probes, all day."
- **3, The controller** (DC1): "It compares what it measures with what it is set to, and doses in proportion to the difference." Fact: "A dose takes over an hour to reach the far side of the pool, so the controller must not panic."
- **4, The pumps** (DP1, DP2): "Each stroke pushes out a fraction of a millilitre." Try it: "Watch the stroke lamp speed up as the chlorine falls."
- **5, The tanks** (DT1, DT2, CS1, CS2): "The day tank holds a few days' chemical; refill it from the store."
- **6, The test kit** (TK1): "Never trust a probe you have not checked." Try it: "Test the water and compare with the controller."
- **7, When it goes wrong** (the fault pedestal): two buttons, below.

## Try it, with the expected results

Numbers from the chemistry bench's tested scenarios (`SCENARIOS` in `chemistry-bench.ts`, results in `doc/research/water-chemistry-models.md` §7.1) on the same pool; the bench's plant uses 4 l/h pumps and a 1.5 mg/l setpoint, so each number is to be re-pinned in `museum-3-dosing.test.ts` with this hall's pumps and controller, and this prompt updated.

1. **Watch it hold.** At reset (the bench's warmed-up water: free chlorine about 1.3, pH 7.3, alkalinity and hardness as `SETTLED` for the lounge), at the bench's 600 swimmers a day, ×3600: free chlorine stays within about 1.2 to 2.2 mg/l over the plant day (model: `chemistry-bench.test.ts`'s day from a fresh fill), the chart drawing a gentle wave with the day's swimmers.
2. **Send in a crowd** (SWIMMERS to "crowd", 100 swimmers in an hour): their organic demand (100 × 3.7 g, two-thirds within the hour, in 500 m³) takes about half a milligram per litre of free chlorine out within the hour (indicative); the controller's output rises, DP1's stroke lamp quickens, and the chlorine recovers over the following hours, slowly, because of the pool's lag (a dose reaches 63 % at the far side in 69 minutes, 95 % in 113: `circuit.ts`'s tested figures).
3. **Test the water** (TK1): DPD 1 (free chlorine), DPD 3 − DPD 1 (combined) and phenol red's pH, to 0.01 and 0.1; with ideal probes they agree with DC1.
4. **Gas-lock the hypochlorite pump** (the fault pedestal's "AIR IN THE PUMP" button: `actOnDosingPumps` `gas`): DP1 keeps stroking with a hollow tick and delivers nothing (model: `dosing-pumps.test.ts`, 1 ml of gas, 0 litres, fault `flow`); after its flow monitor's 20 strokes it shows `Er F` and bleeps; free chlorine falls below 0.75 mg/l after about 4.2 plant hours (the bench's loss-of-dosing scenario), DC1's low alarm at 0.8; if left two hours at full output DC1 latches its output off too. Fix: open DP1's bleed valve, shut it, acknowledge on the pump, reset DC1's latch: back to 1.3 or more in about 4.2 hours.
5. **A weak delivery** (the pedestal's "WEAK DELIVERY" button: CS1 at 100 g/l, not 140, from the next fill of DT1): nothing alarms; the loop compensates, free chlorine 1.46 to 1.89 mg/l, but DT1 falls faster: 22.5 → 31.6 litres a day, 1.40 times (the bench's weak-delivery scenario). Found by the day tank's level against the chart's days, or the plant's log.
6. **Lose the sample** (shut M3-SC1-V1): FS1 drops, after 120 s DC1 stops dosing and alarms (model: `dosing-controller.ts`'s sample-flow interlock); the probes' standing water loses its chlorine in about four minutes (`CELL`), so the display falls while the pool does not: open the valve and it recovers.
7. **RESET SIMULATION** (and walking back in): the warmed-up water, the pumps healthy and unlocked, the day tanks full, CS1 at 140 g/l, swimmers normal, a fresh chart at the visitor's local time.

## Reuses (paths checked 2026-10-28)

- Chemistry: `src/game/water/pool-chemistry.ts` (`PoolChemistry`, `stepChemistry`, `readings`, `BATHER`), `circuit.ts` (`POOL_CELL_SHARES`, `exchangeRing`), `chemistry-bench.ts` (`POOL_25M`, `stepBench`, `SCENARIOS`, `warmedUp`), `src/game/plant/water-treatment.ts` (`STRENGTH`, `CONTROLLER`, `CHEMISTRY_TICK`, `stepCircuit`, `stepControl`).
- Controller and cell: `src/toolkit/components/plant/logic/dosing-controller.ts`, `sample-cell.ts` (`CELL`, `IDEAL_PROBES`, `stepSampleCell`, `cellSignals`, `testSample`), `dc1-face.ts`; views `src/toolkit/components/plant/views/dc1-controller.ts` (`createDc1Pair`), `sample-cell-panel.ts` (`createSamplePanel`); the working trial in dev44, `src/toolkit/components/plant/logic/dosing-controller-trial.ts` and `views/dosing-controller-trial.ts` (`createDosingControllerTrial`, its 139 m³ `DEMO_POOL`: the pattern this hall scales up).
- Pumps: `src/toolkit/components/plant/logic/diaphragm-pump.ts`, `diaphragm-head.ts`, `metering-pump.ts`; `src/game/plant/dosing-pumps.ts`; view `src/toolkit/components/plant/views/diaphragm-pump.ts`; sounds as above.
- Tanks and stores: `src/game/plant/experimental-source.ts` and its view `src/toolkit/components/plant/views/experimental-source.ts`; `chemical-handling-kit.ts` (`createDayTankStation`); `src/game/plant/chemical-distribution.ts` (`DAY_TANKS`, `LEVEL_LIMITS`).
- Instruments: `createCircularChartRecorder` (`src/toolkit/components/industrial-control/views/period-instruments.ts`), `createPanelMeter` (`panel-instruments.ts`), `createMagFlowmeter`, `createIdealVessel`, `createEndSuctionPump`, `createThrottleValve`; `src/toolkit/gallery/views/museum-exhibit.ts`.

**New:** the model `museum-3-dosing.ts` and its mimic, placards and layout; the DPD test kit TK1 as a component (comparator, discs, tablets, its colours); the SWIMMERS dial; the fault pedestal (two buttons, PLANTROOMS' make); the chart recorder's 24-hour chart driven by plant time (check whether its chart already follows a clock); the injection fitting, if none exists.

## Acceptance

- The schematic test: every fitting given and tagged, nothing added by the plumber; the chemistry conserved (`CONSERVED`); each Try it step's numbers pinned with this hall's controller and pumps; RESET and entry identical.
- The controller's readings are the model's water through the probes (ideal probes here; the drifted probes are kept for the finale, Hall 13), and nothing on the mimic, the board or the overlay shows the water's truth except TK1's test.
- **Walking in from Hall 2:** Hall 3 at its reset state with a fresh chart at the visitor's local time; on to Hall 4 and back, and it is reset again.
- Browser checks on high, medium and low; the pumps' bleeps and ticks heard only in this hall; screenshots and camera links recorded here.

## Performance budget

As 107a: every component within mission 094's `DEFAULT_BUDGET`, nothing added to `KNOWN_OVER_BUDGET` (the chart recorder was fixed in 094; keep it so); the chemistry stepped every 10 s of plant time (at ×3600, 360 steps a real second: measure, and if it is too slow, step the three-cell circuit with a longer tick at high speed, as long as the test numbers hold); the DC-1's and pumps' displays redrawn only on change; at least 60 fps on medium and 50 on high looking through an archway. Draw calls measured and recorded here.

## Open questions for the owner (one at a time, in this order)

1. **The controller:** the DC-1 pair (hands-on, period, single-purpose: recommended here, and the CX-7 touch screen in the finale, Hall 13), or the CX-7 here?
2. **The faults' buttons:** a fault pedestal the visitor presses (recommended: the museum shows what it is doing), or faults that happen by themselves at random times?
3. **Real chemical stores** (IBCs on spill pallets, `createIbcOnSpillPallet`) drawn round the ideal sources, or the ideal sources shown as they are?

## Research: what the hall holds

Researched 2026-10-28 from the repo's notes (`doc/research/plant-products-chemicals-dosing.md`, `doc/research/pool-dosing-and-water-chemistry.md`, `doc/research/water-sampling.md`, `doc/research/water-chemistry-models.md`) and a web check of PWTAG guidance. Figures from the game's own tested model are marked _(model)_; anything not checked against a primary source is marked _(indicative)_. In-game makers are the game's own (Grundflow, Chlorella, Kessler-Moody, Penfold); the real product each is after is named so the builder can match size and behaviour.

### The target numbers (the hall's green bands)

- **Free chlorine:** PWTAG's code of practice gives free chlorine "1 mg/l or below" where treatment is good, with an absolute minimum of 0.5 mg/l at pH 7.2; busy or warm pools run higher, commonly up to about 1.5 to 2 mg/l _(indicative for the upper figure)_. The hall's setpoint of 1.3 mg/l and alarms at 0.8 and 2.5 mg/l sit within this. QI1's green band: 0.8 to 2.0 mg/l.
- **Combined chlorine:** less than half the free chlorine, ideally as near zero as possible, and never more than 1 mg/l whatever the free chlorine (PWTAG). TK1's comparator shows combined as DPD 3 minus DPD 1; its plaque gives "below 0.5, and below half the free".
- **pH:** 7.2 to 7.4 is the target with chlorine (PWTAG); the controller's 7.0 and 7.6 alarms are the outer limits. QI2's green band: 7.2 to 7.4, amber 7.0 to 7.2 and 7.4 to 7.6.
- **Why pH matters:** the active HOCl share of free chlorine falls as pH rises (pKa about 7.5 near 28 °C _(indicative)_): the model's 0.571 at 7.3 and 0.406 at 7.64 _(model)_ go on the pH plaque as a simple bar ("at 7.3, more than half is the strong kind; at 7.6, less than half").
- **Bather load:** PWTAG's design figure is about one bather per 2.2 m² of water 1 to 1.5 m deep _(indicative)_, so the 312.5 m² pool holds about 140 at once; the bench's 600 swimmers a day is a modest public day. SWIMMERS dial positions: CLOSED (0), QUIET (about 20 an hour), NORMAL (the bench's 600 a day, shaped by the hour), CROWD (100 in the next hour).
- **Daily checks:** PWTAG asks for controller readings to be checked against a manual DPD test daily; recalibrate pH if the difference exceeds 0.2, chlorine if over 15 % (`pool-dosing-and-water-chemistry.md`). Pool tests at least three times a day while open.

### The exhibits, station by station

1. **The swimmers (BA1, SWIMMERS dial).** A big four-position rotary switch on a pedestal (Penfold-built, mark top right), a lit counter "SWIMMERS THIS HOUR" (seven-segment) and a small diagram of what one swimmer brings: 3.7 g of chlorine demand, about 25 mg of nitrogen (sweat and urine), 1 g of dissolved solids (`BATHER`, _(model)_). Interaction: turn the dial; the counter and the mimic's swimmers' rate follow.
2. **The sample (SC1, after the ProMinent DGMa bypass armature: clear modular cells, PG 13.5 probes, float flow monitor).** The visitor sees water trickling through a clear cell, the flow float riding at 40 l/h on its scale (0 to 60 l/h), FS1's green lamp, the two probe heads, the sample tap SP1. Interaction: the isolating valve M3-SC1-V1 (Try it 6) and the needle valve (sample flow 20 to 60 l/h; below 20 the lamp goes out).
3. **The controller (DC1, the Chlorella DC-1 pair, after a ProMinent DULCOMETER D1C-period single-parameter controller with segment displays; the DEPOLOX Pool Compact is the modern alternative, PI on chlorine, P on pH).** Two units side by side: each a red LED reading (Cl 1.30 mg/l; pH 7.30), a bar of output %, ALARM and DOSE lamps, keys to view setpoint and band. The plaque's figures: setpoint 1.3, band 0.5, integral 6 h; pH 7.3, band 0.3; sample-flow loss stops dosing after 120 s; two hours at 100 % latches off. Interaction: view the settings (not change them; question below), RESET a latch.
4. **The chemistry board (QI1, QI2 and the chart recorder).** Two 144 mm moving-coil meters (Kessler-Moody, after a period DIN 144 panel meter) scaled 0 to 3 mg/l and pH 6.5 to 8.0 with the green bands above, and a 24-hour circular chart recorder (after a Chessell/Eurotherm-style circular recorder _(indicative)_), two pens: red chlorine, blue pH. Read only.
5. **The pumps (DP1, DP2).** DP1, the Grundflow DMX 1602 (2.1 l/h, solenoid, 180 strokes/min, after the ProMinent gamma/ X or Grundfos DDE class; the name follows the game's DMX family, see conflicts): the stroke lamp blinks with each stroke; at 100 % output 180 a minute, so each stroke is about 0.19 ml (2.1 l/h ÷ 10 800 strokes/h) _(derived)_; at the average demand of 0.94 l/h about 45 % output. DP2, the Grundflow DDS 7.5-16 (after the Grundfos SMART Digital DDA 7.5-16: 7.5 l/h at up to 16 bar, stepper motor, AutoFlowAdapt deaeration). Each with its display (output %, l/h, `Er F` on flow fault), bleed valve, injection valve (after the ProMinent PVT spring-loaded injection valve, PVDF, R½). Interaction: watch, bleed, acknowledge.
6. **The day tanks and stores (DT1, DT2, CS1, CS2).** Two 60 l bunded polyethylene tanks with sight-tube level gauges in litres, hazard labels (CLP: corrosive; hypochlorite also "contact with acids liberates toxic gas", EUH031), and the two ideal stores behind. Hypochlorite as delivered in the UK is about 14 to 15 % available chlorine (140 to 150 g/l) and loses strength in store, faster when warm _(indicative)_; hence the weak-delivery fault. Plaque: "Never let acid and hypochlorite meet: they make chlorine gas. That is why they have separate tanks, pumps, colours and injection points." Interaction: the push-to-fill valves.
7. **The test kit (TK1, after the Palintest comparator with DPD 1, DPD 3 and phenol red tablets; the Palintest Lumiso Pooltest photometer is the modern equivalent).** A lectern with the comparator, its three colour discs (DPD free chlorine 0 to 3 mg/l in steps such as 0.2, 0.5, 1.0, 1.5, 2.0, 3.0; phenol red pH 6.8 to 8.2 in 0.2 steps _(indicative steps)_), and PRESS TO TEST: the tube colours fill (pale to deep magenta for chlorine, yellow to red for pH), the matching disc segment lights, and a ticket-style readout gives free, total, combined and pH. Plaque: how to do it for real (10 ml sample, crush tablet, read within seconds for DPD 1, two minutes for DPD 3).
8. **When it goes wrong (the fault pedestal).** Two mushroom-headed buttons with lamps, "AIR IN THE PUMP" and "WEAK DELIVERY", as in Try it 4 and 5; each lamp stays lit while its fault is active, and RESET SIMULATION clears them.

### Facts for the plaques (checked)

- Combined chlorine (chloramines) causes the "pool smell" and sore eyes; PWTAG wants it below half the free and never above 1 mg/l.
- pH 7.2 to 7.4 is the target; above it chlorine works less well, below it the water becomes corrosive and stings.
- Readings are checked by hand against the controller every day; a probe is never trusted unchecked.
- Hypochlorite raises pH (it is made with caustic soda); acid brings it back.

### Research conflicts

- **"DMX" for a solenoid pump.** Grundfos's real DMX is a motor-driven diaphragm pump (the small solenoid family is DDE/DME, earlier DMI); the game's Grundflow DMX 1602 (2.1 l/h, solenoid) is the game's own family name already in `DIAPHRAGM_PUMPS`, so no change, but the plaque should not call it "a DMX like Grundfos's".
- **"The smell means too little chlorine".** The entrance panel's fact is a popular simplification: the smell is chloramines (true), which come from too much pollution for the chlorine and treatment (too few swimmers showering, too little fresh water, too little chlorine at times). Suggested wording: "it means the water has more dirt than its chlorine can deal with, not too much chlorine."
- **Free chlorine upper level.** PWTAG's 2017 wording prefers 1 mg/l or below where treatment is good; the hall's 1.3 setpoint is acceptable for a busy, warm pool without UV, but the plaque should say "about 1 to 1.5 mg/l" rather than imply 1.3 is the standard.

### Sources

- PWTAG code of practice, as reproduced by ALS (2017): https://www.alsenvironmental.co.uk/media-uk/pdf/datasheets/micro-lp/als_micro_pool-water-treatment-advisory-group-code-of-practice_2017.pdf
- PWTAG technical note on pH and chlorine (TN52): https://www.pwtag.org/lowering-ph-no-problem-tn52/
- Swim England pool guidance: https://www.swimming.org/library/documents/5231/download
- Product sources (ProMinent DGMa, DULCOMARIN, gamma/ X, PVT; Grundfos DDA 7.5-16; Palintest Lumiso; Evoqua DEPOLOX Pool Compact manual) as listed in `doc/research/plant-products-chemicals-dosing.md` and `doc/research/pool-dosing-and-water-chemistry.md`.
