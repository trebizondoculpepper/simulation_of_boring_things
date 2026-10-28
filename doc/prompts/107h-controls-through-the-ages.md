# 107h: PLANTROOMS, "Controls from the 1920s to the Present Day, and Beyond": one pool, run from every era

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
