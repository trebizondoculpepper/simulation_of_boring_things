# 107h: PLANTROOMS, "Controls from the 1920s to the Present Day, and Beyond": one pool, run from every era

**Parked (the owner, 2026-10-28):** not one of the museum's halls for now. This brief and its research are kept for a later hall or the development rooms.

Status: planned 2026-10-28, not started. A sub-prompt of mission 107 (`doc/prompts/107-pool-science-museum.md`), after 107-0 (`doc/prompts/107-0-exhibit-groundwork.md`). One of the owner's themes for Halls 5 to 12, **not yet given a hall number**: the owner will place it.

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first and follow it, above all: every engineering item is real, working and branded; mimics and panels are Penfold's with its mark; all input through `src/toolkit/controls/`; displays redraw only on change; every interface must be one the game can simulate. Then read mission 107, 107-0, `doc/design/control-interface-archetypes.md` (the approved archetypes), mission 093 (`doc/prompts/093-bridge-widget-kit.md`) and mission 095 (`doc/prompts/095-the-bridge.md`).

## The owner's request

The owner, 2026-10-28, who thinks it might be funny: a hall of little booths, slightly screened from one another, each a pool control station of its era, walked through in order: the 1980s, discrete buttons and analogue meters; the 1990s, seven-segment displays and readouts; the 2000s, two-row LCD displays and membrane buttons; and the future, the 25th century: "we're going to take pool management to the 25th century, and we're going to ask people what they think aquatics management might look like", reusing the starship bridge's assets. The title says from the 1920s, so earlier booths are proposed too. Each booth works and controls the same small ideal pool, shown in every booth, so visitors see the same job done each way; each has a plaque with its era and a line of humour; the future booth ends with an invitation to say what aquatics management will look like.

## Rules for every hall (the owner, 2026-10-28)

1. **Every hall starts from its reset state the moment you step into it.** Its time is set to now, the visitor's real local time, and its exhibit is put in its reset condition. Walking in is the same as pressing its RESET button. No hall's state carries over from an earlier visit. Here: every booth's pool at its start, every control at its normal position.
2. **Time.** A hall's simulated time starts at now. If the visitor speeds it up, the hall's time display follows. Halls may show time in different ways. **This hall shows time in every era's way, one per booth:** the 1920s booth's attendant's chalkboard log (the hour chalked up as plant time passes), the 1950s booth's electric wall clock and its circular chart recorder's paper, the 1980s booth's moving-coil hours and a mechanical hour meter, the 1990s booth's red seven-segment clock, the 2000s booth's LCD's top line, the 2010s booth's touch screen's header, and the 25th-century booth's "AQUATIC CYCLE" reading (our own invention). One hall clock (107-0) drives them all; one TIME lever at the hall's entrance (×1, ×60, ×600) sets its speed, and every booth's display follows.
3. **Halls start empty.** The hall begins with set decoration only; this sub-prompt builds its exhibit.

## What the hall teaches, and what it builds on

**Assumes:** that a pool has a pump, a heater and chlorine dosing to look after (Halls 1 to 3, if they come before; the entrance panel says it in a sentence otherwise).

**Teaches:** the job has not changed in a hundred years (start the pump, keep the water warm, keep the chlorine up), but the way people do it has: from turning a handwheel and chalking a reading, to pressing a lit button, to reading a number, to scrolling a menu, to touching a screen. Each interface makes some things easier and some things harder; the funny ones are a little true.

## The booths

**Recommended: seven booths**, each about 2.4 m wide and 2.4 m deep, their side screens 2.4 m high (so the hall's white walls and the services ceiling show above), in date order along the route, alternating sides so the visitor zigzags; at seven, a hall of the ring's size takes them with a clear 2.4 m aisle. Each booth's screens and floor in its period's finish; the same small ideal pool in each.

1. **1920s–30s, the attendant's station.** Brass and varnished timber, white glazed tiles. A face-plate motor starter with its big lever (START by moving it notch by notch, too fast and the overload trips; new, period), the pump's suction and discharge gate valves on handwheels (the game's valve handwheels), a big dial pressure gauge (`createDialGauge`), a mercury-in-glass thermometer in a brass case (new), a steam valve on the calorifier (the heat), a hand-dosing pot with a measuring jug for bleach (the chlorine, by hand), and the chalkboard log (new; the visitor's readings chalked by the station itself, as an attendant's). Plaque: "Pool control, 1920s. One man, one lever, one hat. Health and safety had not been invented yet."
2. **1950s–60s, the brown panel.** Green-painted steel, a bakelite fascia. Bakelite rotary switches (`rotary-knob.ts`), jewel lamps (`createJewelLamp`), a 250 mm pressure gauge, a circular chart recorder of the pool's temperature (`createCircularChartRecorder`), an electric wall clock, a bakelite telephone (set decoration). Chlorine: a gas chlorinator's rotameter and its needle valve (the period's real practice; shown and worked as a needle valve setting a rate; never the gas itself). Plaque: "Pool control, 1950s and 60s. Everything is brown, beige or battleship grey. If it gets warm, that's the valves."
3. **1980s, the big panel.** The approved archetype, "1980s large control panel": a painted steel panel with a Penfold mimic line, 30 mm lit push buttons, lever selectors, mushroom stop, moving-coil meters and annunciator windows (`createEightiesButton`, `createPanelLed`, `createBarGraph`, `createPanelMeter`, `createPushButton`, `createLeverSelector`, `createMushroomHead`, `createPilotLamp` in `src/toolkit/components/core/views/eighties-controls.ts` and `src/toolkit/components/industrial-control/views/`), Penfold's mark. Plaque: "Pool control, 1980s. One button, one job. If you need the manual, you are pressing the wrong button."
4. **1990s, the numbers.** Red seven-segment displays and readouts (`createSevenSegment`, `createLedMatrix`), LED bar graphs, and the Chlorella DC-1 pair (`createDc1Pair`, after the late-1990s ProMinent D1C, membrane keys) dosing the chlorine. Plaque: "Pool control, 1990s. Now everything is a number, and every number glows red. Nobody knows what E 07 means."
5. **2000s, the menus.** The approved archetype, "Early 2000s compact control panel": the Penfold OT-216 terminal (`createOt216Terminal`, its 16 × 2 character LCD and membrane keypad, its control box), and the Grundflow DMX and DDS metering pumps' own fascias (`createDiaphragmPump`, their LCDs and keys) as the dosing. Plaque: "Pool control, 2000s. Press F2, then ENTER, then F2 again. Please wait."
6. **2010s, the screen.** The Chlorella CX-7 touch controller (`createCx7Controller`, after the DULCOMARIN 3, a 7-inch touch screen) and a Grundflow DMH (`createMotorDosingPump`) with its display. Plaque: "Pool control, 2010s. It is all one screen now. The screen has a screensaver."
7. **The 25th century.** The bridge's own kit (missions 093 and 095): a sloping console (`createBridgeConsole`, `src/toolkit/gallery/views/bridge-console.ts`) of `ui2d` touch panels (`src/ui2d/`, `createTouchSurface` in `src/toolkit/components/industrial-control/views/touch-surface.ts`), colour-blocked rounded bars on black, every touch answered with a bleep, the boot sequence (`BootScreen`), a small viewscreen showing the pool. Our own designs only (the archetype "Starship bridge touch station (parody)"): no Star Trek or Paramount names, logos, art, fonts or sounds. Plaque: "Pool control, the 25th century. Humanity has crossed the stars. There is still hair in the filter." Then the invitation (below).

(Owner's question 1: a 2020s booth too, a phone or tablet app? It would be a screen within a screen, the least interesting thing to simulate, so it is not recommended.)

## The pool, the same in every booth

A pure model, `src/game/plant/museum-booth-pool.ts` (tested): a small ideal teaching pool (proposed 10 × 5 × 1.2 m, 60 m³, so it warms and loses its chlorine visibly at ×60), one instance per booth (so booths do not fight; question 2), each with the same job:

- **The pump:** START and STOP, ideal on its flow (30 m³/h, a two-hour turnover); its flow shown.
- **The heat:** an ideal heat source (30 kW) through the booth's era's control (a steam valve, a thermostat, a setpoint), the pool losing heat as `thermal.ts` gives; its temperature shown.
- **The chlorine:** hypochlorite dosed by the era's means (a jug, a rotameter's needle valve, a dosing pump on a controller), the pool's free chlorine and pH from the chemistry model (`stepChemistry`, `pool-chemistry.ts`) with a few swimmers (`BATHER`); shown as the era could show it (the 1920s booth by a colour-comparator test the visitor reads, the 1950s by the same, the 1980s on by meters and numbers).

Each booth has a small ideal vessel (`createIdealVessel`) behind a window in its back screen, the same little pool, so the visitor sees what they are controlling. Every booth's mimic or panel carries Penfold's mark from the 1980s on; the earlier booths carry their own period makers' plates. Tags derived per booth (the booth's era as its block: `B1980-P1`), as the enhanced network rule asks.

## The invitation (the future booth)

At the end of the 25th-century booth, a lectern with a printed card holder: "What do you think aquatics management will look like? Tell us." Static for now (there is no backend): blank comment cards in a holder, a slot box labelled "Your ideas", and a sign. When the game has a way to collect visitors' words (an artifact's shared database, or the game's own), the card becomes a working form; noted in TODO, not built here.

## The mimic

No hall-wide mimic. The 1980s booth's Penfold mimic (`createMimicBoard`, `checkMimic`) is the hall's one, as its era's way of showing the pool; the other booths show it their own way.

## The museum panels (text outline)

- **Entrance panel.** Headline "Controls from the 1920s to the Present Day, and Beyond". Big idea: "The job has hardly changed in a hundred years: run the pump, keep the water warm, keep the chlorine up. How people do it has changed completely. Every booth runs the same little pool. Try them all." Fact: "Real plant rooms are like this hall: most have a bit of every decade." RESET pedestal and sign; the TIME lever.
- **Each booth's plaque:** its era, one sentence on what an operator did, and its line of humour (above).

## Try it, with the expected results

In every booth, the same three jobs; the numbers (to be pinned in `museum-booth-pool.test.ts`) are the same in each, only the way differs:

1. **Start the pump.** Flow to 30 m³/h (the 1920s starter refuses a lever moved too fast: its overload trips and must be reset).
2. **Warm the pool by a degree.** 60 m³ is 70 kWh a degree, so at 30 kW, less its losses, a little over two plant hours, about two and a half real minutes at ×60 (indicative).
3. **Keep the chlorine at 1.3 mg/l** with the swimmers in: in the old booths by hand (a test, a jug, a wait), in the new by setting a controller; the old way overshoots, the new way holds.
4. **RESET SIMULATION** (and walking in): every booth's pool and controls at their start.

## Reuses (paths checked 2026-10-28)

`src/toolkit/components/core/views/eighties-controls.ts` (`createEightiesButton`, `createPanelLed`, `createSevenSegment`, `createBarGraph`), `src/toolkit/components/industrial-control/views/industrial-controls.ts` (`createPushButton`, `createMushroomHead`, `createLeverSelector`, `createPotentiometer`, `createPilotLamp`), `industrial-displays.ts`, `panel-instruments.ts` (`createPanelMeter`, `createJewelLamp`, `createLedMatrix`, `createVfd`), `period-instruments.ts` (`createCircularChartRecorder`, `createCrtMonitor`), `ot216-terminal.ts` (`createOt216Terminal`), `dial-gauge.ts`, `mimic-board.ts`, `touch-surface.ts`; `src/toolkit/components/core/views/rotary-knob.ts`; `src/toolkit/components/plant/views/dc1-controller.ts`, `cx7-controller.ts`, `diaphragm-pump.ts`, `motor-dosing-pump.ts`; `src/ui2d/`; `src/toolkit/gallery/views/bridge-console.ts`, `bridge-viewscreen.ts`; dev0's boards (`DEV0 · CONTROLS AND DISPLAYS`), dev47 (touch panels) and dev48 (the plant reimagined); `createIdealVessel`; `src/game/water/pool-chemistry.ts`, `src/game/plant/thermal.ts`.

**New:** the booth pool model; the booths' screens and finishes; the 1920s face-plate starter, mercury thermometer, hand-dosing pot and chalkboard log; the 1950s gas chlorinator's rotameter (or a reuse of the glass rotameter, `small-flowmeters.ts`); the TIME lever; the future booth's pages for the little pool (in the `ui2d` kit); the comment card stand. Try each new control on dev0's boards first (CLAUDE.md).

## Acceptance

- The booth pool model's test: the same job gives the same numbers whichever booth's controls work it; RESET and entry identical; every booth's time display follows the one hall clock.
- Every booth's controls work their pool, and only through the control scheme; the 25th-century booth's panels bleep and boot as the bridge's do; no third party's marks anywhere (a review check).
- **Walking in from the hall before:** the booths in date order along the route; walk on and back, and every booth is reset.
- Browser checks on high, medium and low; screenshots and camera links recorded here.

## Performance budget

Seven booths of displays is the risk: every display redrawn only when its value changes, at most four times a second (mission 094's rule), the chalkboard and chart recorder only on their steps; the booths' screens and bodies merged by material; booths not in view not stepped visually (their models step, they are cheap); within `DEFAULT_BUDGET`, nothing in `KNOWN_OVER_BUDGET`; at least 60 fps on medium and 50 on high through an archway. Draw calls measured and recorded here.

## Open questions for the owner (one at a time, in this order)

1. **How many booths:** the seven above (recommended), or add a 2020s app booth, or drop to the five you named plus one earlier?
2. **One pool or seven:** each booth its own copy of the little pool (recommended, so booths do not fight), or one shared pool every booth controls?
3. **The humour:** the plaque lines as drafted, or would you like to write them?

## Research: what the hall holds

Researched 2026-10-28 by web search. Facts marked **(sourced)** rest on the sources listed at the end; anything marked **(indicative)** is period-plausible but not verified, and should be checked before it goes on a plaque. Every product in the game keeps our own invented brand (CLAUDE.md, `brands.ts`); the real products named here are only what each item is modelled after, and never appear in the game.

### The thread through every booth: the chlorine test

The visitor's chlorine reading changes with the era, and that is one of the hall's best teaching points. Before about the 1960s, pool attendants tested with **orthotolidine (OTO)** reagent, which turns water yellow, matched by eye against coloured glass in a comparator **(sourced)**; OTO was later found to be carcinogenic and was dropped **(sourced)**. **DPD**, developed by Tom Palin at the Newcastle and Gateshead Water Company, turns water pink, came as tablets used in the Lovibond comparator, distinguishes free from combined chlorine, and is still the international standard **(sourced)**; Wilkinson & Simpson (later Palintest) took the licence in 1960 **(sourced)**. Sources disagree on whether Palin's DPD work dates from the 1950s or 1960s, so the plaque should say "the mid-twentieth century". So: the 1920s and 1950s booths test with a yellow comparator (our "Tintwell" brand, after the Lovibond comparator made by The Tintometer Ltd of Salisbury); the 1980s booth has a pink DPD comparator on its shelf beside the panel, as real plant rooms did alongside their meters; from the 1990s on, the reading comes from an amperometric or potentiostatic cell on the controller (after Wallace & Tiernan's Depolox line and ProMinent's DULCOMETER, both reagentless cells **(sourced for Depolox's method; dates indicative)**).

### Booth by booth

1. **1920s–30s, the attendant's station.**
   - **Pump starter:** a face-plate starter on a slate panel: a brass arm swept across resistance studs, held at RUN by a no-volt release coil, and thrown back to OFF by an overload release when the current is too high **(sourced: the three-point face-plate starter's no-volt and overload releases)**. The game's mechanic (too fast and it trips) is true to it: moving the arm too fast leaves too little resistance in circuit, the current surges and the overload releases the arm. Strictly it is a DC motor's starter; many British towns still had DC supplies in the 1920s **(indicative)**, so the plaque may say "the town's supply was DC".
   - **Valves:** gate valves on handwheels, cast iron with brass trim (game's handwheels).
   - **Gauges:** a 150 mm brass-bezel Bourdon pressure gauge (`createDialGauge`, the "Budenwell" name after Bourdon/Budenberg **(indicative)**); a mercury thermometer in a perforated brass case hung in the pool's return.
   - **Heat:** a steam valve on the calorifier, its handwheel turned by the visitor; no thermostat (Satchwell's first commercial thermostat was 1927, for electric heaters, so a 1920s pool's heat was by hand **(sourced)**).
   - **Chlorine:** an enamel bucket of bleach and a measuring jug, tipped into the balance tank; tested with the yellow OTO comparator. A true note for the plaque: the bigger municipal pools of the period were already chlorinated by gas, Wallace & Tiernan's first chlorinator having gone in at New York in 1913 **(sourced)**; the hand dose is the small pool's way.
   - **Time:** the chalkboard log.
   - **How it is worked:** open the suction and discharge valves, notch the starter arm up slowly, crack the steam valve, read the thermometer, test, tip a jug, chalk it up.
   - **Plaque fact:** "The face-plate starter's arm was held on by a magnet. If the power failed, a spring threw it back to OFF, so the pump could not leap into life when the power returned." **Joke:** keep the brief's, "One man, one lever, one hat. Health and safety had not been invented yet."
2. **1950s–60s, the brown panel.**
   - **Panel:** green-grey steel cabinet, black bakelite fascia, engraved traffolyte labels, a bakelite rotary switch per pump (OFF · ON) and a DOL starter's START and STOP buttons with a red trip lamp (jewel lamps).
   - **Heat:** a capillary thermostat with a dial setpoint on the calorifier's motorised steam valve (modelled after Satchwell's and Drayton's period thermostats **(indicative for the exact models)**); the setpoint dial in °F, with °C beside it in small figures (Britain went metric in the 1960s and 70s **(indicative)**). The circular chart recorder (24 hours a turn) draws the pool's temperature.
   - **Chlorine:** a wall-mounted vacuum gas chlorinator's front: a glass rotameter tube with its float and a V-notch rate-setting knob, and a vacuum gauge (modelled after Wallace & Tiernan's V-notch chlorinators, whose units carry exactly a rotameter, a rate valve and a vacuum gauge **(sourced for the modern V10K/S10k; the 1950s form indicative)**). The visitor sets the rate in "lb/day" on the rotameter's scale; the gas is never shown. Test: still the yellow comparator, now on a shelf with a printed card.
   - **Plaque fact:** "Gas chlorinators worked under vacuum, so a leak let air in rather than chlorine out." **(indicative: the general principle of vacuum feed; check the wording)**. **Joke:** the brief's, though "that's the valves" assumes thermionic valves on a panel that would have none; suggest "If it hums, that's normal. If it stops humming, run." (see conflicts).
3. **1980s, the big panel.** The approved archetype, as the brief says. Penfold mimic of pump, heater and dosing; 30 mm lit push buttons; HAND · OFF · AUTO lever selectors; a mushroom emergency stop; moving-coil meters for temperature (°C now), pump current (A) and free chlorine (mg/l, from an analyser cabinet behind, after Depolox **(indicative date)**); a six-window annunciator (HIGH TEMP, LOW CL, PUMP TRIP, LOW FLOW, DOSING FAULT, MAINS FAIL) with ACCEPT and RESET. Inside (behind a glazed door) a relay rack and a time switch: the pump runs AUTO on a mechanical 24-hour time switch with captive pins (after Sangamo or Venner time switches **(indicative)**). The thermostat becomes a panel-mounted on–off controller with a setpoint knob. Pink DPD comparator on the shelf. Mechanical hour meter for the pump. **Plaque fact:** "Inside the panel, logic was done by relays: a click is a decision." The first PLC, the Modicon 084 of 1968–69, was built to replace such relay panels in car plants **(sourced)**; panels like this one kept relays for pools for years after **(indicative)**. **Joke:** the brief's.
4. **1990s, the numbers.** Red seven-segment readings of temperature, free chlorine and pH; the Chlorella DC-1 pair (after ProMinent's D1C, as the brief says) doing the dosing with membrane keys; an LED bar graph of flow; a small PLC with its LED I/O strip visible through a window (after the Mitsubishi FX or Siemens S5 small PLCs **(indicative)**), so the relays of booth 3 are visibly replaced by a box of blinking LEDs. Error codes on a seven-segment: "E 07" means low sample flow, printed only in a manual chained to the desk. **Plaque fact:** the PLC, the relay panel's replacement, introduced to pool plant. **Joke:** the brief's.
5. **2000s, the menus.** The approved archetype, as the brief says: the Penfold OT-216 (16 × 2 LCD, membrane keypad, after the common small operator terminals of the period), the Grundflow DMX/DDS pumps' fascias. Add a BMS outstation's front (Trend IQ-style, **indicative**: Trend's IQ outstations are a well-known UK BMS line, but no source found in this research) with a modem lamp: the pool's alarms now go down a phone line to a duty engineer's pager. **Plaque fact:** "The building could now ring someone up when it was unhappy." **Joke:** the brief's.
6. **2010s, the screen.** As the brief: the Chlorella CX-7 (after DULCOMARIN 3) and Grundflow DMH. Add an Ethernet socket with a sticker "DO NOT CONNECT TO INTERNET" (a common site sticker **(indicative)**). **Joke:** the brief's.
7. **The 25th century.** As the brief: the bridge kit, our own designs only. Invented facts for the plaque, labelled as such: the AQUATIC CYCLE, a "tachyon chlorine field" whose setpoint is still 1.3 mg/l. **Joke:** the brief's.

### Research conflicts

- **1920s starter is DC.** A face-plate starter with no-volt and overload releases is a DC motor's starter. Not an error (DC supplies were common then, **indicative**) but the plaque should say so.
- **1920s chlorine by bleach jug.** True for a small pool; the larger municipal pools of the 1920s were often already gas-chlorinated (Wallace & Tiernan from 1913, **sourced**). Suggest the plaque admits it.
- **1950s joke "that's the valves".** A pool control panel of the 1950s held switches, contactors and a thermostat, not thermionic valves; the joke implies electronics it would not have had **(indicative)**. Kept in the brief; an alternative offered above.
- **Chlorine test by era.** The brief has the 1920s and 1950s booths using "a colour-comparator test": correct, but it was the yellow orthotolidine test, not today's pink DPD. Palin's DPD date is disputed (1950s vs 1960s).

### Sources

- Grace's Guide, Satchwell Controls Co: https://www.gracesguide.co.uk/Satchwell_Controls_Co ; Rheostatic Co: https://gracesguide.co.uk/Rheostatic_Co
- Palintest, Measuring chlorine using DPD: https://www.palintest.com/measuring-chlorine-using-dpd/ ; Arthur Thomas Palin: https://en.wikipedia.org/wiki/Arthur_Thomas_Palin
- US patent 3937613 (OTO's carcinogenicity, DPD tablets with the Lovibond comparator): https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/3937613
- Xylem, FAQs for gas feed systems (Wallace & Tiernan 1913): https://www.xylem.com/en-uk/resources/faqs/faqs-for-gas-feed-systems/ ; Evoqua V10K brochure: https://epiint.evoqua.com/siteassets/documents/products/disinfection/wt.025.100.000.de.br.v10k.pdf
- Evoqua Depolox 5 datasheet: https://epiint.evoqua.com/siteassets/documents/products/a_temp_disimfection/wt.050.585.001.de.ps.depolox-5.pdf
- Programmable logic controller (Modicon 084): https://en.wikipedia.org/wiki/Programmable_logic_controller ; Control.com, The origin story of the PLC: https://control.com/technical-articles/the-origin-story-of-the-plc/
- Starting methods of DC motors (face-plate starters): https://electricaleasy.com/2014/01/starting-methods-of-dc-motor.html
