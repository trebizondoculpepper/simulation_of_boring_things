# 107j: PLANTROOMS, "Grundflow's Amazing World of Pumps: Pumps for every occasion"

Status: planned 2026-10-28, not started. A sub-prompt of mission 107 (`doc/prompts/107-pool-science-museum.md`), after 107-0 (`doc/prompts/107-0-exhibit-groundwork.md`). One of the owner's themes for Halls 5 to 12, **not yet given a hall number**: the owner will place it. Grundflow's sponsored hall.

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first and follow it, above all: the enhanced network is the one source of truth (the schematic first, every valve with its function, normal state and derived tag; the plumber routes the pipes and adds nothing); every engineering item is real, working and branded; all input through `src/toolkit/controls/`; `logic/` pure and tested. Then read mission 107, 107-0, mission 106 (`doc/prompts/106-ideal-pool-plant.md`, the solver and ideal sources), mission 102 (`doc/prompts/102-olympic-hypochlorite-pump.md`, the metering-pump family) and `doc/room-layout-guide.md`.

## The owner's request

The owner, 2026-10-28: "Grundflow's Amazing World of Pumps: Pumps for every occasion". At the centre stands a 1,000-litre water tank, real-looking, with a level gauge, fed from an ideal clean-water source. Round it stand pumps "all the way to giant multi-kilowatt works of engineering amazingness", from small diaphragm and peristaltic pumps to the big circulation pumps and, as the showpiece, a really large multi-kilowatt pump of the size that serves an Olympic pool. The visitor presses a button to run one. The challenge: "how long will it take to fill this tank with this pump?" Each pump fills the tank from the ideal source, and an interactive display at the edge of the room reveals how long the chosen pump takes. The spread is the point: a peristaltic dosing pump at 2 l/h would take about 500 hours, about three weeks, while a multi-kilowatt pump at 200 m³/h does it in about 18 seconds.

## Rules for every hall (the owner, 2026-10-28)

1. **Every hall starts from its reset state the moment you step into it.** Its time is set to now, the visitor's real local time, and its exhibit is put in its reset condition. Walking in is the same as pressing its RESET button. No hall's state carries over from an earlier visit. Here: the tank empty, every pump stopped, the leaderboard blank.
2. **Time.** A hall's simulated time starts at now. If the visitor speeds it up, the hall's time display follows. Halls may show time in different ways. **This hall shows time as a stopwatch:** the challenge display's big FILL TIME readout counts the plant time since the chosen pump started, in days, hours, minutes and seconds, beside a TIME selector (×1, ×60, ×600, ×3600 and ×86,400, a plant day a second, so the slowest pump finishes in about twenty real seconds); a Grundflow-branded wall clock shows the plant time of day. 107-0's hall clock is extended to ×86,400 for this hall.
3. **Halls start empty.** The hall begins with set decoration only; this sub-prompt builds its exhibit.

## What the hall teaches, and what it builds on

**Assumes:** that a pump moves water (Hall 1), and, if seen, that dosing pumps count chemical out in strokes (Hall 3).

**Teaches:**

- **Pumps for every job.** A pool uses pumps from a few millilitres an hour to hundreds of cubic metres an hour, a range of a hundred thousand times, because the jobs range that much: a dose of chemical, a sample, a sump, a spa, a heating circuit, a whole Olympic pool's water.
- **Two families.** Positive-displacement pumps (diaphragm, peristaltic) push a fixed amount each stroke or turn, almost whatever the pressure: that is why they dose. Centrifugal pumps throw water outwards with a spinning impeller: their flow depends on what they push against (their curve meeting the system's).
- **Power.** From a few watts to tens of kilowatts, and what that costs to run.

## The challenge, as a guessing game

1. **Pick a pump** with the challenge display's selector (each pump's number on its plinth) or its own RUN button.
2. **Guess** how long it will take to fill the tank: on the display, one of six answers (seconds, minutes, hours, a day or two, a week, weeks), or read its plaque first.
3. **Press RUN.** The pump starts; the tank fills; the FILL TIME counts; the visitor speeds time to watch the slow ones finish.
4. **The reveal:** at full, the pump stops and the display shows the time it took, in plant time ("3 weeks, 0 days, 20 hours", "18.4 seconds"), whether the guess was right, and the pump's delivery that did it ("2.1 l/h against 0.3 bar").
5. **The leaderboard:** a board beside the display lists every pump tried so far, fastest to slowest, with its time and its power (this visit only; rule 1).

**The times are the model's, not the nameplate's:** each pump's delivery is computed from its curve against the system it pumps into (the lift to the tank's inlet, its fill line's losses, the tank's rising level), so a centrifugal pump's time is longer than its nameplate's flow suggests, and a diaphragm pump's barely differs. The display shows both (nameplate and actual).

**Filling stops itself:** the big pumps fill the tank in seconds at ×1, so the tank has a high-level float switch (LSH1) that stops the running pump at full, and a real overflow (a weir in the tank's side and an overflow pipe to the ideal drain) as the backstop, so it cannot overfill even if the switch fails. **RESET drains it:** the RESET SIMULATION pedestal opens the drain valve and the tank empties to the ideal drain in a few seconds (shown, not instant), then the hall is at its start.

## The schematic

A new pure model, `src/game/plant/museum-pumps.ts` (tested), on mission 106's pattern; the room code from the hall's number when the owner places it (provisional `MPU`); tags derived (as expected below; the derivation wins).

**Ideal source and sink:** CW1, an ideal clean-water reservoir at the floor's level (atmospheric, unlimited; `experimental-source.ts`'s pattern, as mission 106's ideal vessels); DR1, an ideal drain.

**The tank:** TK1, a 1,000-litre cylindrical tank (about 1.1 m across, 1.15 m to its overflow), real-looking (a GRP or polyethylene tank on a steel stand, `framed-chemical-tank.ts` or `createBundedTank` in `chemicals-storage.ts` as starting points, Grundflow-branded "test tank"), with LI1 a sight-tube level gauge on its side marked in litres, LT1 a level transmitter driving a big litres readout, LSH1 the high-level float switch, its overflow weir and pipe to DR1, and its drain valve M-TK1-V1 (motorised, normal shut, opened by RESET) to DR1.

**The pumps**, each drawing from CW1 through its own suction isolating valve (normal open) and delivering through its own non-return valve and discharge isolating valve (normal open) into TK1's inlet header; each with its RUN button (a lit push button on its plinth, also on the challenge display), its plaque and its flow readout (a small Grundflow LCD or, for the old ones, a rotameter or mag meter, as suits its size). Proposed, smallest to largest, from the game's own models:

| No. | Pump                                           | Kind                                  | Delivery (nameplate)                                                | Power, about | In a pool, for                                                               | Model and view                                                                                       | Fill time, indicative |
| --- | ---------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------- |
| 1   | Grundflow DMX 1602                             | solenoid diaphragm, 180 strokes/min   | 2.1 l/h                                                             | 20 W         | hypochlorite dosing (Halls 3 and 13)                                         | `DIAPHRAGM_PUMPS`, `createDiaphragmPump`                                                             | 476 h, about 20 days  |
| 2   | Grundflow DDS 7.5-16                           | stepper diaphragm                     | 7.5 l/h                                                             | 25 W         | acid dosing                                                                  | `DIAPHRAGM_PUMPS`, `createDiaphragmPump`                                                             | 133 h, about 5½ days  |
| 3   | Grundflow DMH 21-10                            | motor-driven diaphragm, up to 10 bar  | 21 l/h                                                              | 0.25 kW      | a big pool's hypochlorite (the Olympic's, mission 102)                       | `DMH`, `createMotorDosingPump`                                                                       | 48 h, 2 days          |
| 4   | Grundflow PERI 30                              | peristaltic, 55 rpm                   | 30 l/h                                                              | 0.1 kW       | dosing that must never gas-lock; a flocculant                                | `PERI_30`, `createPeristalticPump`                                                                   | 33 h                  |
| 5   | A chemical transfer pump                       | magnetic-drive centrifugal on a skid  | from its model                                                      | 0.4 kW       | moving hypochlorite from the bulk tank to a day tank                         | `createTransferPumpSkid` (`chemical-handling-kit.ts`)                                                | from the model        |
| 6   | A sump pump                                    | submersible centrifugal               | from its model                                                      | 0.5 kW       | emptying a plant room's sump                                                 | the wet hall's pit pumps (`PitPumps` in `src/game/plant/wet-hall.ts`, tested in `pit-pumps.test.ts`) | from the model        |
| 7   | A spa pump                                     | close-coupled centrifugal             | from its model                                                      | 1.5 kW       | a spa's circulation and jets                                                 | `createSpaPump` (`spa-pack-parts.ts`)                                                                | from the model        |
| 8   | A twin-head circulator                         | in-line centrifugal, one head running | about 7 to 10 m³/h                                                  | 0.75 kW      | the boilers' heating circuit (Hall 1)                                        | `createTwinHeadPump` (`boiler-plant.ts`)                                                             | about 6 to 8 minutes  |
| 9   | Grundflow NKC end-suction, the lounge's size   | end-suction centrifugal               | 160 m³/h at 9.6 m (`PUMP_CURVE` in `src/game/plant/circulation.ts`) | about 7.5 kW | a 25 m pool's circulation                                                    | `createEndSuctionPump`                                                                               | about 23 s            |
| 10  | Grundflow NKC 150-315                          | end-suction centrifugal               | 300 m³/h at 18 m (dev51's curve, 22 m shut off)                     | about 22 kW  | a big pool's circulation (Halls 1 and 2)                                     | `createEndSuctionPump`                                                                               | about 12 s            |
| 11  | **The showpiece:** a Grundflow split-case pump | horizontal split-case, double suction | about 600 m³/h at 20 m                                              | about 45 kW  | an Olympic pool's circulation (its 2,500 m³ turned over in about four hours) | new (below)                                                                                          | about 6 s             |

(Indicative times are 1,000 litres over the nameplate delivery; the model's are longer for the centrifugal pumps, which pump against the lift and their fill line. Each power and curve is to be taken from the model where the game has one, or from the real product the view is after, recorded with its source; where a pump has no model yet, its curve is added to the hydraulics, not invented in the room.)

**Every pump at the same job:** each fills the same tank through a fill line sized for it (DN 6 tube for the dosing pumps, DN 150 to DN 250 for the big ones), so each line's losses are its own; the network solved by `solveNetwork` (`src/game/sim/hydraulics.ts`) for the centrifugal pumps on their curves, the positive-displacement pumps by their own models (`stepDosingPumps`, `metering-pump.ts`: delivery per stroke or turn, slightly less against pressure), the tank's level rising as its contents over its area.

**Instruments, all listed:** each pump's flow readout (FI1 to FI11), each big pump's suction and discharge gauges (PI), LI1, LT1 and its readout, LSH1, the challenge display, the leaderboard, the clock.

## The showpiece

A large horizontal split-case pump (new component: after the Grundfos HS range or similar, its casing split along the shaft so the top half lifts off for maintenance, double-suction impeller, a 45 kW motor on a long baseplate with its coupling guard, suction and discharge on opposite sides at DN 250 or 300), on a plinth in the middle of the far wall, lit; its plaque: "This is the size of pump that keeps an Olympic pool moving: its whole 2,500 cubic metres through the filters every four hours." Its fill line enters the tank from above with a diffuser so the fill is dramatic but contained; it sounds like a big pump (`src/toolkit/components/core/audio/part-audio.ts` and the pumps' existing sounds, louder and lower).

## The mimic

A Penfold mimic of the hall (`createMimicBoard`, `checkMimic`): the ideal source, the eleven pumps in a row with their RUN lamps, their lines lit when flowing into the tank, the tank's level as a bar, LSH1's lamp, the overflow and drain. Penfold's mark; the board itself in Grundflow's colours as the sponsor's.

## The museum panels (text outline)

- **Entrance panel**, Grundflow's: headline "Grundflow's Amazing World of Pumps: Pumps for every occasion". Big idea: "A swimming pool needs pumps of every size, from one that pushes out a few drops a minute to one that could empty a swimming pool in an afternoon. Which one fills this tank fastest? Of course you know. But how much faster?" Fact: "The biggest pump here moves water about three hundred thousand times faster than the smallest." The rules of the game, the RESET pedestal and its sign, the TIME selector.
- **Each pump's plaque:** its name and number; what it is and how it works (two sentences: a diaphragm flexing, a roller squeezing a tube, an impeller spinning); what it is for in a pool; its power and its flow; and a Grundflow slogan ("Grundflow: we've got your back-pressure").
- **Two families** panel, by the leaderboard: positive displacement against centrifugal, with a small diagram of each.

## Try it, with the expected results

The model's times, pinned in `museum-pumps.test.ts` and recorded here once computed; the indicative ones are in the table above.

1. **The smallest:** DMX 1602: at ×86,400 about 20 real seconds; FILL TIME about 20 days (its nameplate 2.1 l/h, a fraction less against its line).
2. **The showpiece:** at ×1, about six to eight seconds, LSH1 stopping it at full; the overflow never runs.
3. **Guess right and wrong:** the display says so, and shows the pump's actual delivery against its nameplate.
4. **Close a big pump's discharge valve part way and run it again** (its valve a throttling butterfly): its flow and its time change as its curve says (a lesson from Hall 1, if seen).
5. **The leaderboard:** after all eleven, fastest to slowest, the showpiece at the top and the DMX at the bottom.
6. **RESET SIMULATION** (and walking in): the tank drains to DR1 in a few seconds, the leaderboard clears, every pump stopped, time ×1 at the visitor's local time.

## Reuses (paths checked 2026-10-28)

`src/toolkit/components/plant/logic/diaphragm-pump.ts` (`DIAPHRAGM_PUMPS`), `motor-dosing-pump.ts` (`DMH`), `metering-pump.ts` (`PERI_30`, `MeteringPump`), `diaphragm-head.ts`; `src/game/plant/dosing-pumps.ts`; views `src/toolkit/components/plant/views/diaphragm-pump.ts`, `motor-dosing-pump.ts`, `peristaltic-pump.ts`, `pumps-plant.ts` (`createEndSuctionPump`, `createPumpPair`, `createJetPump`), `boiler-plant.ts` (`createTwinHeadPump`), `chemical-handling-kit.ts` (`createTransferPumpSkid`), `spa-pack-parts.ts` (`createSpaPump`), `mag-flowmeter.ts`, `small-flowmeters.ts`, `throttle-valve.ts`, `framed-chemical-tank.ts`, `chemicals-storage.ts`; `src/game/sim/hydraulics.ts` (`solveNetwork`); `src/game/plant/circulation.ts` (`PUMP_CURVE`); dev51's `solveWithDeadEnds` (`src/game/plant/ideal-pool-plant.ts`); `src/game/plant/experimental-source.ts`; the brand (`grundflow` in `brands.ts`, `brand-livery.ts`); `createMimicBoard`; `src/toolkit/gallery/views/museum-exhibit.ts`.

**New:** the hall's model and its tests; the showpiece split-case pump (view and curve); the 1,000-litre test tank with its gauge, float switch, overflow and drain; the challenge display (selector, six-answer guess, FILL TIME, reveal) and the leaderboard; curves for the pumps the game has views of but no hydraulic model for (sump, spa, transfer), from their real counterparts; the ×86,400 speed. Try the challenge display's controls on dev0's boards first (CLAUDE.md).

## Acceptance

- The model's test: every pump fills the tank in the time its delivery against its system gives (the centrifugal ones at their operating points, the positive-displacement ones at their delivery against pressure); LSH1 stops every pump at full and the overflow catches a failed switch; RESET and entry identical; every fitting given and tagged, the plumber adding nothing.
- **Walking in from the hall before:** the hall at its start; walk on and back, and it is reset.
- Browser checks on high, medium and low: each pump run once (the slow ones at ×86,400), the leaderboard complete; the pumps' sounds heard; screenshots and camera links recorded here.

## Performance budget

Eleven pumps and their lines, merged by material; only the running pump animated (a diaphragm's stroke, a rotor's turn, a coupling's spin) and only one runs at a time; displays redrawn on change; the tank's water level one mesh scaled; the model stepped in half-second plant slices, at ×86,400 solved only when the running pump or the level band changes (the positive-displacement pumps' delivery is analytic over a step); within `DEFAULT_BUDGET`; at least 60 fps on medium and 50 on high through an archway.

## Open questions for the owner (one at a time, in this order)

1. **The pumps:** the eleven above, or fewer (the dosing four, two circulation and the showpiece), or more (a borehole pump, a fountain pump, a fire pump)?
2. **One at a time,** or may several run together (a race)?
3. **The showpiece:** a split-case pump (recommended: it looks like engineering), or the biggest end-suction?
4. **Grundflow's slogans:** as drafted, or yours?
