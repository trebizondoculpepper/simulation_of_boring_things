# 107a: PLANTROOMS Hall 1, "Warm water": a real gas boiler heats an ideal pool

Status: planned 2026-10-28, not started. A sub-prompt of mission 107 (`doc/prompts/107-pool-science-museum.md`), after 107-0 (`doc/prompts/107-0-exhibit-groundwork.md`), which re-signs the halls and gives a hall its exhibit hook, reset on entry and clock. Hall 1 is the first exhibit on the route, entered from Hall 0, the welcome.

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first and follow it, above all: the enhanced network is the one source of truth (the schematic first, every valve with its function, normal state and derived tag; the plumber routes the pipes and adds nothing); every engineering item is real, working and branded; the overlay says only what a thing's own display shows; displays redraw only when what they show changes; all input through `src/toolkit/controls/`; `logic/` pure and tested. Then read mission 107, 107-0, mission 106 (`doc/prompts/106-ideal-pool-plant.md`, whose dev51 is the pattern), `doc/plant-model.md` and `doc/room-layout-guide.md`.

## The owner's request

The owner, 2026-10-28: "I think warmth could be the first one, so we feature a real gas boiler and a heat exchanger connected to an ideal pool. And then we carry on from there. All of the basic systems, warmth, filtration, and then we do chemical dosing. … And like all the other exhibits, you can reset it at the end."

## Rules for every hall (the owner, 2026-10-28)

1. **Every hall starts from its reset state the moment you step into it.** Its time is set to now, the visitor's real local time, and its exhibit is put in its reset condition. Walking in is the same as pressing its RESET button. No hall's state carries over from an earlier visit.
2. **Time.** A hall's simulated time starts at now. If the visitor speeds it up, the hall's time display follows. Halls may show time in different ways. **Hall 1 shows it on the pool clock** (`createPoolClock`, Poolguard's 750 mm sweep-second clock, as in dev51) with a PLANT TIME readout beside it, and TIME buttons ×1, ×60, ×600 and ×3600 on the mimic: at ×3600 the minute hand goes round once a second and the pool's warming is seen in minutes.
3. **Halls start empty.** The hall begins with set decoration only (the shell, signage, the safety layer). This sub-prompt builds its exhibit.

## What the hall teaches, and what it builds on

**Assumes:** nothing but Hall 0's idea, that there is a great deal of plant behind a pool's tiles. This is the first exhibit, so it explains everything it shows.

**Teaches:**

- **Moving water, at its simplest.** A pump makes the water flow; the flow meter counts it; the gauges either side show the pressure the pump adds; close a valve and the flow falls while the pump's pressure rises. One pump, one loop, no tank and no filter (they come in Hall 2).
- **Fuel to heat.** Gas burns in the boiler's burner; its heat goes into water; the flue takes the burnt gases away; the gas meter counts what was burnt, the heat meter what was delivered, and the difference is the boiler's loss (a condensing boiler's is small: 95 % efficient in the model).
- **Heat moves without the waters mixing.** The boiler's hot water and the pool's water pass each other in the plate heat exchanger: the boiler's comes out 20 K cooler, the pool's less than a degree warmer, because there is so much more of it.
- **Where the heat goes.** A pool loses heat mostly from its surface, as water evaporates; a cover stops most of it.
- **What it costs.** kWh of gas, turned into money.
- **The first control.** A thermostat calls for heat when the pool is below its setting and stops when it is reached: on and off. And the first protections: the boiler will not fire without flow, and locks itself out if its flame fails, until someone resets it at the boiler.

**Leads on:** "The water is warm, and it goes round. But it is carrying everything the swimmers left in it: next, how we take that out." (Hall 2.)

## The schematic

A new pure model, `src/game/plant/museum-1-heating.ts` (tested), on mission 106's pattern: nodes, links, every fitting given with its function, normal state and derived tag; `expandForPlumbing` adds nothing. Room code `M1`. Tags below are as the derivation is expected to give them; if the derivation gives another form, the derivation wins, and this list is updated.

**The pool, the same pool in every hall.** Ideal pool IP1: 25 × 12.5 × 1.5 m, 470 m³ (dev51's `PLANT`, the chemistry bench's `POOL_25M`), so the visitor meets one pool throughout the museum. A thermal mass (1.97 GJ/K, 547 kWh/K) losing heat to an ideal hall air HA1 (29 °C, 60 % relative humidity, held), and to the ground at 10 °C (`GROUND` in `heat-loss.ts`). Drawn as an ideal vessel (`createIdealVessel`).

**Ideal sources and sinks:**

- GS1, the gas main: natural gas (G20) at 21 mbar, unlimited (new: an ideal gas source, after `experimental-source.ts`'s pattern).
- AT1, the atmosphere: the flue's terminal above the roof (an ideal sink).
- HA1, the hall air and the ground, as above (ideal boundaries of the pool's heat balance).

**The gas line:** GS1 → FQ1 the rotary gas meter (Trager-Feinstein, `createRotaryGasMeter`) → M1-GS1-V1, the emergency control valve (a yellow-levered quarter-turn ball valve, `createGasBallValve`; normal open) → PI3, gas pressure, mbar (a dial gauge) → M1-B1-V1, the boiler's gas isolating cock (normal open) → the boiler.

**The boiler:** B1, a Hamwarmy HW 160 condensing boiler (`condensingBoilerModel(160)`, drawn by `createCondensingBoiler(kit, 160, panel)`, after the Remeha Gas 220 Ace; its controls `createBoilerPanel`, after the Remeha Gas 310 ECO's: four-digit code display, burner, lockout, pump and manual lamps, MODE, STEP, −, +, STORE, RESET, the setpoint knob, the rocker switch and its 63 mm pressure gauge). Its burner modulates to hold an 80 °C flow (`heat-loop.ts`'s `BOILER`: purge, ignition, firing, blocked, lockout; minimum flow 3 m³/h, high limit 95 °C, return limit 85 °C, minimum gas 17 mbar, minimum water 0.8 bar; the panel controller `boiler-house.ts`: purge 6 s, ignition 4 s, three tries, run-on 20 s, faults 2 ignition failure and 5 flame loss). FL1, its flue: twin-wall stainless from the boiler's Ø250 spigot up to the roof deck, 9.5 m (new: a flue run component, its sections, bands, the roof's weathering collar and a terminal seen through a roof light if one is there).

**The primary (boiler) circuit, sealed:** B1 → TI3 boiler flow → M1-B1-V2 flow isolator (lever ball valve, normal open) → M1-HX1-V1, the motorised valve on the exchanger's primary (after a Belimo LR24A, 35 s stroke; normal shut; opened by the thermostat's call and the flow interlock, below) → HX1 primary → HM1 the heat meter on the primary's return (Splashonomics, after the Kamstrup MULTICAL 603, `createHeatMeter`) → TI4 boiler return → P1, the primary pump (Grundflow twin-head, `createTwinHeadPump`, one head duty, the other standby; about 7 m³/h, `HEATING.primaryFlow` in `pool-heating.ts`) with its non-return valve M1-P1-V1 → M1-B1-V3 return isolator (normal open) → B1. PU1, the pressurisation unit (Hamwarmy, `createPressurisation`) holds the circuit at 1.5 bar on the boiler's own gauge. A boiler bypass (M1-B1-V4, a differential bypass valve, normal shut, opening when the motorised valve shuts) keeps the boiler's minimum flow, so its pump can run on.

**The pool (secondary) circuit:** IP1's outlet → M1-P2-V1 suction butterfly (lever and notch plate, `createThrottleValve`; normal open) → PI1 suction gauge → P2, the pool pump (Grundflow NKC 150-315, `createEndSuctionPump`, on its curve: 22 m shut off, 18 m at 300 m³/h) → PI2 discharge gauge → M1-P2-V2 its non-return valve → M1-P2-V3 the discharge butterfly (throttling, notch plate; normal fully open) → FT1 the circulation's flow (Kessler-Moody mag meter, `createMagFlowmeter`) → FS1 a flow switch (makes above 5 m³/h, as dev51's interlock) → TI1 exchanger in → HX1 secondary (plate heat exchanger, `createPlateHeatExchanger`, after the Alfa Laval M10-BFG; UA 12 kW/K as dev51's `PLANT.hxUA`) → TI2 exchanger out → IP1's inlets. P2's local station (`createPumpStation`: START, STOP, RUN, and its TRIPPED lamp and RESET for dev51's dead-head trip, `pump-deadhead.ts`, kept as the pump's own protection).

**Control:** TC1, the pool thermostat (a capillary immersion thermostat on the pool's return with a dial 20 to 35 °C, set to 28 °C, on and off with its own differential of about 1 K, or modulating on `THERMAL.band`, as the visitor chooses on the CONTROL selector; see Research conflicts, answered): when it calls and FS1 is made, M1-HX1-V1 opens and B1 is enabled; otherwise the valve shuts and B1 runs on and stops. The interlock is a line in the model, not a hidden rule: its lens on the mimic.

**The cover:** CV1, a motorised pool cover (new component: a slatted cover on a roller at the pool's end, its motor, two limit switches, and a key switch with OPEN and CLOSE push buttons; Certikind, who make pool fittings). Its position (0 to 100 %) scales the pool's evaporation.

**The swimmers:** a museum dial, SWIMMERS (none, a few, busy, a gala), setting the surface's activity (`ACTIVITY_FACTOR` in `evaporation.ts`: still 0.5, calm 1, flowing 2, gushing 3).

**Instruments, all listed:** PI1, PI2 (pool pump), PI3 (gas, mbar), the boiler's own gauge and display, TI1 to TI4 (dial thermometers, `createDialGauge` thermometer kind, or `createDigitalThermometer`), TI5 the pool's temperature on a big digital display, FT1, FS1, FQ1, HM1, TC1, EC1 the cost display (below), and the losses board (below).

**The heat balance, honest.** The pool's temperature is the sum of what goes in (HX1's duty, by ε–NTU, `effectiveness` in `pool-heating.ts`) less what goes out, each loss from the existing models: evaporation by vapour pressure (`thermal.ts`'s evaporation term, as `stepThermal` computes it, scaled by the swimmers' activity and the cover), convection to the hall air (`THERMAL.surfaceH`, 4 W/m²·K), and conduction to the ground (`THERMAL.groundU`, 0.6 W/m²·K). Radiation is not in the game's models; this hall leaves it out and its panel says so (question 3). The cover's saving is a new constant, sourced and tagged as `CHEMISTRY`'s constants are (sourced, fitted or invented); a published figure for a well-fitted cover is about nine-tenths of the evaporation saved.

**Cost.** EC1, a Splashonomics energy-cost display (new: a moving-coil "pence per hour" meter and an LED "£ since you came in" counter, Splashonomics making operating-cost metering), from FQ1's gas at a stated unit rate (an illustrative constant on its face, "at N p per kWh"; question 2) and the gas's energy (`GAS_ENERGY`, 10.55 kWh/m³).

**The losses board.** QI1 evaporation, QI2 convection, QI3 the ground, each a moving-coil kW meter, and QI4 the total beside HM1's kW. The board is an ideal instrument, labelled so ("the museum's model of the pool's heat balance"), since no real plant measures these: the overlay says so too.

## The mimic

A Penfold mimic board (`createMimicBoard`, spec in `src/toolkit/gallery/logic/museum-1-mimic.ts`, checked by `checkMimic` and `mimicLayoutProblems`; Penfold's mark top right, `panel-maker-mark.ts`), captioned "The map: how the heat gets from the gas to the pool". It shows both circuits as lit flow lines (`flow` chasers when the water moves), the gas line, B1's FIRING and LOCKOUT lamps, P1 and P2 RUN, M1-HX1-V1's lens (OPEN, SHUT, travelling), TC1's CALL lamp, FS1, CV1's position, and readouts of TI1 to TI5, FT1, HM1 kW, FQ1 m³/h, EC1 p/h and the four losses. Buttons: the TIME speeds only. Pump START and STOP stay at P2's station and the boiler's RESET at the boiler (local-only controls, CLAUDE.md).

## The museum panels (text outline)

- **Entrance panel.** Headline "Warm water". Big idea: "A pool is a huge bath that is always going cold. Heating it is a chain: gas burns, hot water carries the heat, and an exchanger hands it to the pool without the waters ever mixing." Fact: "To warm this pool by one degree takes 547 kWh: about 3,250 kettles." Route: 1 the gas, 2 the boiler, 3 the exchanger, 4 the pump, 5 the pool, 6 where the heat goes, 7 what it costs. The RESET pedestal beside it, with its sign.
- **1, The gas** (at FQ1 and GS1-V1): "Gas from the street, counted by the meter." Fact: "A cubic metre of natural gas holds about 10.5 kWh." Try it: "Watch the meter's dial speed up when the boiler fires."
- **2, The boiler** (at B1): "A flame heats water to 80 °C, and the flue takes the smoke away." Fact: "A condensing boiler is about 95 % efficient: it even recovers the heat in the steam of its own flue gases." Try it: "Shut the gas cock while the boiler fires, watch it lock out, then open the cock and press RESET on the boiler."
- **3, The exchanger** (at HX1): "Two waters, one hot and one cool, pass each other through thin steel plates. The heat crosses; the water never does." Fact: "The boiler's water leaves 20 degrees cooler; the pool's less than one degree warmer, because there is so much more of it."
- **4, The pump** (at P2): "Water does not move by itself. The pump pushes it round." Try it: "Close the valve notch by notch: the flow falls and the pressure rises."
- **5, The pool** (at IP1 and TC1): "The thermostat calls for heat until the pool reaches 28 °C."
- **6, Where the heat goes** (at the losses board and CV1): "Most of a pool's heat leaves from its surface, as water evaporates." Fact: "Swimmers splashing roughly double it." Try it: "Close the cover and watch the evaporation needle drop."
- **7, What it costs** (at EC1 and HM1).
- **The pool clock** placard, as dev51's.

## Try it, with the expected results

Numbers marked "model" come from the existing models and must be pinned in `museum-1-heating.test.ts`; marked "indicative" are hand-worked here and are to be replaced by the model's in the test and this prompt.

1. **Throttle the pool pump** (M1-P2-V3, notch by notch to shut). The flow on FT1 falls to 0 and PI2 rises to the pump's shut-off head (22 m, about 2.2 bar above suction, model: NKC 150-315's curve through `solveWithDeadEnds`). FS1 opens below 5 m³/h, the motorised valve shuts and the boiler stops calling. The numbers at each notch from `solveNetwork`, pinned.
2. **Stop the pool pump while heating.** FT1 0, FS1 open, M1-HX1-V1 shuts within 35 s, B1 runs on 20 s and stops (model: `RUN_ON_SECONDS`); TI2 stops rising.
3. **Heat the pool.** At reset the pool is at 27.0 °C with TC1 at 28 °C, so it calls at once. At full fire (160 kW), uncovered, calm, the pool gains about 0.25 K an hour (indicative: 160 kW in, about 24 kW lost, over 547 kWh/K), so at ×3600 about a quarter of a degree a real minute: 28 °C in about four real minutes. Gas on FQ1 about 16 m³/h (model: 160 / 0.95 / 10.55). TI3 80 °C, TI4 about 60 °C (indicative: 160 kW over 7 m³/h of primary); TI1 to TI2 rises by about 0.75 K at 185 m³/h (indicative: 160 kW over 185 × 1.163).
4. **Where the heat goes.** Calm and uncovered at 28 °C: evaporation about 21 kW and 31 kg of water an hour (indicative, from `evaporationRate`; the test pins `thermal.ts`'s figure, which governs), the ground about 3.4 kW (0.6 × 312.5 × 18), convection about −1.25 kW (the hall air a degree warmer gives a little back). SWIMMERS to "busy": evaporation doubles. Cover closed: evaporation falls to about a tenth (the sourced constant).
5. **Boiler lockout.** Shut M1-B1-V1 while firing: the flame is lost (fault 5), the boiler retries three times and locks out (its own display shows the code; LOCKOUT lit on the boiler and the mimic). Open the cock and press RESET on the boiler panel: purge 6 s, ignition 4 s, firing (model: the boiler bench's "flame failure" test).
6. **What it costs.** Holding 28 °C, calm and uncovered, about 24 kW of heat, 25 kW of gas: about 600 kWh a day (indicative); EC1 shows its pence per hour at the stated rate. Cover closed overnight: the saving, from the model.
7. **RESET SIMULATION** (and walking back in): pool 27.0 °C, every valve normal, P2 running, B1 enabled and calling, cover open, swimmers calm, time ×1 at the visitor's local time, EC1 and HM1 at zero.

## Reuses (paths checked 2026-10-28)

- Boiler: `src/toolkit/components/plant/logic/boiler-house.ts` (`newBoiler`, `stepBoiler`, `pressBoiler`, `boilerDisplay`, `boilerLamps`, `FAULTS`, `condensingBoilerModel`), `src/game/plant/heat-loop.ts` (`BOILER`, `PUMP`, `WATER_HEAT`, `GAS_ENERGY`, `BOILER_EFFICIENCY`), `src/game/plant/boiler-control-model.ts`, `src/toolkit/components/plant/views/boiler-plant.ts` (`createCondensingBoiler`, `createTwinHeadPump`, `createPressurisation`), `src/toolkit/components/plant/views/boiler-controls.ts` (`createBoilerPanel`), `src/toolkit/components/plant/views/gas-fittings.ts` (`createGasBallValve`), `src/toolkit/components/plant/views/utility-meters.ts` (`createRotaryGasMeter`). The dev rooms that show them: `dev_boiler` (`src/toolkit/gallery/rooms/plant/boiler.ts`) and dev27, heat exchange (`src/toolkit/gallery/rooms/plant/pool-heating.ts`, a HW 160 with its panel and a shell-and-tube exchanger).
- Heat: `src/game/plant/pool-heating.ts` (`effectiveness`, `HEATING`), `src/game/plant/thermal.ts` (`THERMAL`, `saturation`, `thermalParams`, `stepThermal`), `src/game/plant/evaporation.ts` (`evaporationRate`, `ACTIVITY_FACTOR`, `LATENT_HEAT`), `src/game/plant/heat-loss.ts` (`GROUND`).
- Water: `src/game/plant/ideal-pool-plant.ts` (dev51's `PLANT`, `RESISTANCE`, `valveCharacteristic`, `NOTCHES`, `solveWithDeadEnds` behind `solveNetwork`, `src/game/sim/hydraulics.ts`), `src/game/plant/pump-deadhead.ts`.
- Views: `src/toolkit/components/plant/views/pumps-plant.ts` (`createEndSuctionPump`, `createPlateHeatExchanger`), `throttle-valve.ts`, `mag-flowmeter.ts`, `heat-meter.ts`, `ideal-vessel.ts`, `digital-thermometer.ts` (all in `src/toolkit/components/plant/views/`), `src/toolkit/components/industrial-control/views/dial-gauge.ts`, `panel-instruments.ts` (`createPanelMeter` for the losses board), `mimic-board.ts`; `src/toolkit/components/architectural/views/pool-clock.ts`; `src/toolkit/gallery/views/museum-exhibit.ts` (lecterns, panels, RESET pedestal, pump station).

**New:** the model `museum-1-heating.ts` and its mimic, placards and layout modules (`src/toolkit/gallery/logic/museum-1-*.ts`); the ideal gas source; the flue run; the pool cover CV1; the pool thermostat TC1; the energy-cost display EC1; the losses board; the SWIMMERS dial; a maker for the plate exchanger (its view carries none today; Hamwarmy, who make calorifiers, is the obvious one).

## Acceptance

- The schematic test: every fitting given, tags derived, the plumber adds nothing; every Try it step's numbers pinned; the heat balance closes (in = out + stored, to 0.1 %); the cover's saving is the sourced constant's; RESET and entry give the same state.
- The layout test: every pipe routed by the voxel router, no clashes, the visitors' floor clear below 2.6 m, the flue straight up clear of the services ceiling's beams.
- **Walking in from Hall 0:** through Hall 0's doorway the hall is at its reset state with the clock at the visitor's local time; the boiler is already firing (the pool calls), the pump running. Walk on into Hall 2 and back: Hall 1 is reset again (rule 1).
- In the browser on high, medium and low: every Try it step as above; the overlay shows only displays (the losses board says it is ideal); camera links and screenshots recorded in this prompt.

## Performance budget

No per-room budget exists yet in the game (mission 094 budgets per component: `DEFAULT_BUDGET` in `src/toolkit/gallery/logic/component-bench.ts`, 12 texture uploads and 250,000 texels a second with the world still, 300,000 running, 200 µs an update). Proposed for each hall: every new component within `DEFAULT_BUDGET` and nothing added to `KNOWN_OVER_BUDGET`; the exhibit merged by material (pipes, supports, valves' bodies); displays redrawn only on change and at most four times a second; the model stepped once a frame in half-second slices at most (about 120 slices a frame at ×3600: measure, and cut to fewer by solving the network only when a valve, pump or trip changes, as dev51 does); and looking through an archway into Hall 0 or Hall 2, at least 60 fps on medium and 50 on high on the owner's machine (dev51 ran at 97, 106 and 119 on high, medium and low, the stage 1 shell at 51 on high through an archway). Draw calls measured on each preset and recorded here.

## Open questions for the owner (one at a time, in this order)

1. **The pool's size.** The same 470 m³, 25 m pool in every hall (warming visibly only at ×3600), or a smaller teaching pool here that warms in minutes at ×60?
2. **The gas price** on EC1: an illustrative round figure (say 6 p per kWh), or none, showing kWh only?
3. **Radiation.** Leave it out (the panel says so), or add a sourced radiation loss to the models (it would also change the game's pool halls)?
4. **Heat recovery** (the earlier plan's run-around coil): leave it out of Hall 1, or a later addition?
5. **The boiler's flue** through the warehouse's roof: shown rising to the roof deck, or out through the wall?

## Research: what the hall holds

Researched 2026-10-28 from the repo's product notes (`doc/research/plant-products-boiler-air.md`, `doc/research/plant-products-pumps-balance.md`), the models the brief cites, and web search. Anything not verified against a primary source is marked indicative.

### Exhibits, in route order

| #   | Exhibit                                                   | Modelled after (UK market)                                                                                                       | Key specs and readings                                                                                                                                                                                 | What the visitor does                                       |
| --- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| 1   | FQ1 rotary gas meter, GS1-V1 emergency control valve, PI3 | A commercial rotary (Roots-type) meter, G65 class (indicative; maker not verified); ECV a yellow-levered quarter-turn ball valve | Reads m³ on a mechanical register with a fast test dial; about 16 m³/h at full fire (160 / 0.95 / 10.55, model); PI3 0 to 40 mbar dial, 21 mbar nominal G20 supply, boiler trips below 17 mbar (model) | Watches the test dial speed up when B1 fires; shuts the ECV |
| 2   | B1 Hamwarmy HW 160 and FL1 flue                           | Remeha Gas 220 Ace 160 (Baxi), 800 W × 1662 H × 657 D mm (repo note); panel after Remeha Gas 310 ECO                             | Flow 80 °C, return about 60 °C, 1.5 bar on its 63 mm gauge, 0.8 bar minimum; 95 % (model, gross-to-net simplified); purge 6 s, ignition 4 s, 3 tries, fault codes 2 and 5                              | Shuts M1-B1-V1 to see lockout; RESET at the panel           |
| 3   | HX1 plate heat exchanger                                  | Alfa Laval M10-BFG, frame 1084 H × 470 W mm, depth with plate count (repo note)                                                  | UA 12 kW/K (model); primary 20 K drop at 7 m³/h; secondary rise about 0.75 K at 185 m³/h (indicative)                                                                                                  | Reads TI1 to TI4 either side                                |
| 4   | P1 primary twin-head pump                                 | Grundfos MAGNA3 D 65-120 F, 340 mm port to port (repo note)                                                                      | About 7 m³/h (model)                                                                                                                                                                                   | Sees duty/standby lamps                                     |
| 5   | P2 pool pump, valves, FT1, FS1                            | Grundfos NK 150-315 (repo note: DN200 suction, DN150 discharge, 30 kW, 641 kg)                                                   | 22 m shut-off, 18 m at 300 m³/h (model); FS1 makes above 5 m³/h                                                                                                                                        | Throttles M1-P2-V3 notch by notch                           |
| 6   | IP1 pool, TI5 big display, TC1 thermostat                 | Capillary immersion thermostat, 20 to 35 °C dial (indicative)                                                                    | 25 × 12.5 × 1.5 m, 470 m³, 547 kWh/K; 27.0 °C at reset, set 28 °C                                                                                                                                      | Turns TC1's dial                                            |
| 7   | Losses board QI1 to QI4, SWIMMERS dial, CV1 cover         | Cover: a slatted motorised cover on an end roller (generic; Certikind)                                                           | Evaporation about 21 kW calm at 28 °C (indicative), ground 3.4 kW, convection about −1.25 kW (hall 29 °C); cover cuts evaporation by about nine-tenths                                                 | Turns SWIMMERS; key switch OPEN/CLOSE                       |
| 8   | EC1 cost display, HM1 heat meter                          | HM1 after Kamstrup MULTICAL 603                                                                                                  | About 25 kW gas holding 28 °C, about 600 kWh a day (indicative)                                                                                                                                        | Reads p/h and £ since you came in                           |

### Facts for the plaques

- Pool water and hall air: UK practice keeps hall air about 1 K above the water to limit evaporation and condensation (the brief's 29 °C over 28 °C follows it); PWTAG publishes recommended maximum water temperatures by activity, but its exact competition figure was not retrieved here (indicative: 27 to 29 °C for general swimming, from a university reply citing guidance).
- 547 kWh per degree is about 3,250 kettles (1.7 l from 15 to 100 °C is about 0.168 kWh): checked.
- Covers: a solid cover in use cut evaporation by about 95 % in a 2025 study of UAE pools (reported secondhand); Southampton University's Jubilee Sports Centre cover saved 169,000 kWh, £5,000 and 31 t CO₂ a year (University case study). The brief's "about nine-tenths" is a fair, slightly conservative constant; tag it "sourced" against these.

### Sources

- [Southampton University, Jubilee Sports Centre pool cover case study](https://www.southampton.ac.uk/susdev/our-approach/case-studies/cmp007-jubilee-sports-centre-pool-cover.page)
- [York University Middle East environment report on pool covers (UAE study, about 95 %)](https://mideastenvironment.apps01.yorku.ca/?p=23441)
- [Aberystwyth University response on pool temperature guidance](https://www.aber.ac.uk/en/student/your-voice-matters/tell-us-now/our-response/sportscentre/name-241524-en.html)
- Product specs: the repo notes cited above (Baxi Remeha Gas 220 Ace, Grundfos MAGNA3 D and NK 150-315, Alfa Laval M10-BFG).

### Research conflicts

- **TC1's differential.** The brief calls TC1 "on and off with a 0.1 K differential, `THERMAL.band`", but `THERMAL.band` in `src/game/plant/thermal.ts` is a proportional band ("full output this far below its setting"), not an on/off differential. Either TC1 gets its own on/off differential constant (a real capillary thermostat's is typically 0.5 to 1 K, indicative), or the panel text should say it modulates. Left unchanged pending the owner.

  Answered (the owner, 2026-10-28): "Let users play with all the controls, so on/off and temp setting." The visitor works every control the heating has: the boiler's ON/OFF switch, TC1's setpoint dial (20 to 35 °C), and a CONTROL selector on the boiler panel, ON-OFF · MODULATING, so they can see the difference. In ON-OFF the thermostat switches the boiler between off and full fire with its own differential (a new constant, about 1 K, indicative; the pool's temperature saw-tooths round the setting and the boiler cycles); in MODULATING the boiler's output follows `THERMAL.band`'s proportional band and the temperature settles smoothly. Both are tested in the model (`museum-1-heating.ts`). The placard at the pool explains both in one line each. RESET puts the switch ON, the dial at 28 °C and the selector at MODULATING.

## Built (2026-10-28)

- Model `src/game/plant/museum-1-heating.ts` (tested): nodes GS1, B1, AT1, TE1/TE2, HX1, P1, PU1, P2, IP1; every fitting given, `added` empty. Derived tags differ from the brief where the derivation wins: the pool pump's non-return valve is M1-P2-NRV1 and its discharge butterfly M1-P2-V2 (not V2/V3); P1's NRV M1-P1-NRV1. Losses from `thermal.ts` (evaporation by vapour pressure calibrated to `evaporationRate`), `THERMAL.surfaceH`, `groundU`; closes to 0.1 %. Pinned: at 28 °C calm 21.27 kW evaporation (31.25 kg/h), −1.25 kW air, 3.375 kW ground; throttling notches 185, 184, 183, 176, 136, 0 m³/h; shut-off 2.16 bar over suction.
- Deviations: HX1's UA is 3.8 kW/K, not dev51's 12 (12 would pull the boiler's flow to ~52 °C); even so the boiler's own controller settles near 72/55 °C at about 140 kW, not 80/60. The butterfly characteristic is the cube of opening (the square hardly throttles this loop). Pool warms ~0.22 K/h. Cover travel 120 s; OPEN/CLOSE run it to its limit (not hold-to-run). The CONTROL selector is a Penfold plate on the boiler's front below its panel. Gas price 6 p/kWh, printed as illustrative (question 2, conservative). Radiation left out, the losses panel says so. The flue rises straight to 9.5 m through the services ceiling's height (not checked against its beams).
- Layout `src/toolkit/gallery/logic/museum-1-layout.ts` (voxel router, tested: all routed, no clashes, nothing east of x = −2.5, flue straight). Plant along the street (west) wall, gas south, pool north; visitors face west, so gas is on their left. The mimic, clock, entrance panel, RESET and EC1 are on the east wall facing west, so the mimic is drawn gas-left too (mirror of the plant as seen across the hall). Hall size fits (16 × 14 m); nothing crowded out.
- Mimic `museum-1-mimic.ts` (checkMimic and mimicLayoutProblems clean), placards `museum-1-placards.ts`, new components `src/toolkit/components/plant/views/museum-heating-parts.ts` (pool cover and station, thermostat, cost display, losses board with SWIMMERS, control selector), view `src/toolkit/gallery/rooms/museum/hall-1-warm-water.ts`.
- Browser: checked on the owner's dev server; the hall renders with its plant, placards, mimic and losses board. Camera: `?room=museum1&x=4&y=1.6&z=3&yaw=290&pitch=0` (from the east side, looking west-north-west at the plant). Not done: every Try-it step clicked through in the browser, presets' frame times, the component benchmark for the new displays.
