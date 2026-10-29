# 107j: PLANTROOMS, "Grundflow's Amazing World of Pumps: We Keep Water Moving"

Status: planned 2026-10-28, not started. A sub-prompt of mission 107 (`doc/prompts/107-pool-science-museum.md`), after 107-0 (`doc/prompts/107-0-exhibit-groundwork.md`). One of the owner's themes for Halls 5 to 12, **not yet given a hall number**: the owner will place it. Grundflow's sponsored hall.

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first and follow it, above all: the enhanced network is the one source of truth (the schematic first, every valve with its function, normal state and derived tag; the plumber routes the pipes and adds nothing); every engineering item is real, working and branded; all input through `src/toolkit/controls/`; `logic/` pure and tested. Then read mission 107, 107-0, mission 106 (`doc/prompts/106-ideal-pool-plant.md`, the solver and ideal sources), mission 102 (`doc/prompts/102-olympic-hypochlorite-pump.md`, the metering-pump family) and `doc/room-layout-guide.md`.

## The owner's request

The owner, 2026-10-28: "Grundflow's Amazing World of Pumps: Pumps for every occasion". At the centre stands a 1,000-litre water tank, real-looking, with a level gauge, fed from an ideal clean-water source. Round it stand pumps "all the way to giant multi-kilowatt works of engineering amazingness", from small diaphragm and peristaltic pumps to the big circulation pumps and, as the showpiece, a really large multi-kilowatt pump of the size that serves an Olympic pool. The visitor presses a button to run one. The challenge: "how long will it take to fill this tank with this pump?" Each pump fills the tank from the ideal source, and an interactive display at the edge of the room reveals how long the chosen pump takes. The spread is the point: a peristaltic dosing pump at 2 l/h would take about 500 hours, about three weeks, while a multi-kilowatt pump at 200 m³/h does it in about 18 seconds.

**Simplified by the owner, 2026-10-28** (these rules replace the earlier brief where they differ): no time compression, the hall runs at real time only; no guessing game and no leaderboard; each pump's sign simply says how long it would take to fill the tank at that pump's rate, from its real delivery in the model ("At this rate it would take 12 days to fill the tank", "At this rate it would take 17 seconds to fill the tank"), in friendly units; one tank level shared by all the pumps, cumulative whichever have run; when the tank is full every pump locks out, its run lamp out, tripped on the high-level switch, and a pressed button plays the piezo library's `error` front centre and does nothing else; RESET, and walking in, empty the tank and clear the trips. "It is just a demonstration of how quickly each pump fills the tank."

## Rules for every hall (the owner, 2026-10-28)

1. **Every hall starts from its reset state the moment you step into it.** Its time is set to now, the visitor's real local time, and its exhibit is put in its reset condition. Walking in is the same as pressing its RESET button. No hall's state carries over from an earlier visit. Here: the tank empty, every pump stopped, every trip cleared.
2. **Time.** A hall's simulated time starts at now. Halls may show time in different ways. **This hall runs at real time only** (the owner, 2026-10-28): no TIME control and no speed-up; a Grundflow-branded wall clock shows the visitor's local time. The slow pumps' times are told by their signs, not waited for.
3. **Halls start empty.** The hall begins with set decoration only; this sub-prompt builds its exhibit.

## What the hall teaches, and what it builds on

**Assumes:** that a pump moves water (Hall 1), and, if seen, that dosing pumps count chemical out in strokes (Hall 3).

**Teaches:**

- **Pumps for every job.** A pool uses pumps from a few millilitres an hour to hundreds of cubic metres an hour, a range of a hundred thousand times, because the jobs range that much: a dose of chemical, a sample, a sump, a spa, a heating circuit, a whole Olympic pool's water.
- **Two families.** Positive-displacement pumps (diaphragm, peristaltic) push a fixed amount each stroke or turn, almost whatever the pressure: that is why they dose. Centrifugal pumps throw water outwards with a spinning impeller: their flow depends on what they push against (their curve meeting the system's).
- **Power.** From a few watts to tens of kilowatts, and what that costs to run.

## The demonstration

It is just a demonstration of how quickly each pump fills the tank (the owner, 2026-10-28):

1. **Press a pump's RUN button** (a lit push button on its plinth; press again to stop it). It runs and the tank's level rises at that pump's rate: the big pumps visibly, the dosing pumps by a millimetre an hour.
2. **Its sign says how long it would take:** "At this rate it would take 20 days to fill the tank." The time is worked out from the pump's real delivery in the model (below), in friendly units (seconds, minutes, hours, days, weeks, rounded to two figures), and is fixed on the sign: it is the time from empty, not from now.
3. **One level, shared:** the tank's level is cumulative, whichever pumps have run: start another and it carries on from where the last left off.
4. **More than one at once: allowed.** Several pumps may run together; their deliveries add (the centrifugal pumps solved together on the shared inlet header, so two big pumps each give a little less than alone); the tank fills the faster. A visitor who starts the showpiece with a dosing pump running sees the point of the hall in one go.
5. **Full: every pump locks out.** When the level reaches the high-level float switch LSH1, every pump trips at once: its RUN lamp goes out, it stops, and it cannot run into a full tank. Pressing any RUN button then plays a little error noise, the piezo library's `error` (`PIEZO_ONE_SHOTS` in `src/toolkit/components/sound/logic/piezo-beeps.ts`, played by `playPiezo` in `src/toolkit/components/sound/audio/piezo-recordings.ts`, front centre, `src/toolkit/components/core/audio/front-centre.ts`), and does nothing else. A real overflow (a weir in the tank's side and a pipe to the ideal drain) is the backstop, so the tank cannot overfill even if the switch failed.
6. **RESET** (the RESET SIMULATION pedestal, and walking in): the drain valve opens and the tank empties to the ideal drain in a few seconds (shown, not instant), the trips clear, every pump stopped.

**The times are the model's, not the nameplate's:** each pump's delivery is computed from its curve against the system it pumps into (the lift to the tank's inlet and its fill line's losses, with the tank's level half full as the reference for the sign), so a centrifugal pump's time is longer than its nameplate's flow suggests, and a diaphragm pump's barely differs. Each pump's flow readout shows its delivery now.

## The schematic

A new pure model, `src/game/plant/museum-pumps.ts` (tested), on mission 106's pattern; the room code from the hall's number when the owner places it (provisional `MPU`); tags derived (as expected below; the derivation wins).

**Ideal source and sink:** CW1, an ideal clean-water reservoir at the floor's level (atmospheric, unlimited; `experimental-source.ts`'s pattern, as mission 106's ideal vessels); DR1, an ideal drain.

**The tank:** TK1, a 1,000-litre cylindrical tank (about 1.1 m across, 1.15 m to its overflow), real-looking (a GRP or polyethylene tank on a steel stand, `framed-chemical-tank.ts` or `createBundedTank` in `chemicals-storage.ts` as starting points, Grundflow-branded "test tank"), with LI1 a sight-tube level gauge on its side marked in litres, LT1 a level transmitter driving a big litres readout, LSH1 the high-level float switch, its overflow weir and pipe to DR1, and its drain valve M-TK1-V1 (motorised, normal shut, opened by RESET) to DR1.

**The pumps**, each drawing from CW1 through its own suction isolating valve (normal open) and delivering through its own non-return valve and discharge isolating valve (normal open) into TK1's inlet header; each with its RUN button (a lit push button on its plinth), its plaque and its flow readout (a small Grundflow LCD or, for the old ones, a rotameter or mag meter, as suits its size). Proposed, smallest to largest, from the game's own models:

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

**Instruments, all listed:** each pump's flow readout (FI1 to FI11), each big pump's suction and discharge gauges (PI), LI1, LT1 and its readout, LSH1 (its lamp, and its trip of every pump's starter), the wall clock.

## The showpiece

A large horizontal split-case pump (new component: after the Grundfos HS range or similar, its casing split along the shaft so the top half lifts off for maintenance, double-suction impeller, a 45 kW motor on a long baseplate with its coupling guard, suction and discharge on opposite sides at DN 250 or 300), on a plinth in the middle of the far wall, lit; its plaque: "This is the size of pump that keeps an Olympic pool moving: its whole 2,500 cubic metres through the filters every four hours." Its fill line enters the tank from above with a diffuser so the fill is dramatic but contained; it sounds like a big pump (`src/toolkit/components/core/audio/part-audio.ts` and the pumps' existing sounds, louder and lower).

## The mimic

A Penfold mimic of the hall (`createMimicBoard`, `checkMimic`): the ideal source, the eleven pumps in a row with their RUN lamps, their lines lit when flowing into the tank, the tank's level as a bar, LSH1's lamp and TANK FULL · PUMPS LOCKED OUT, the overflow and drain. Penfold's mark; the board itself in Grundflow's colours as the sponsor's.

## The museum panels (text outline)

- **Entrance panel**, Grundflow's: headline "Grundflow's Amazing World of Pumps: Pumps for every occasion". Big idea: "A swimming pool needs pumps of every size, from one that pushes out a few drops a minute to one that could empty a swimming pool in an afternoon. Press any pump's button and watch the tank. Each sign tells you how long that pump would take to fill it." Fact: "The biggest pump here moves water about three hundred thousand times faster than the smallest." When the tank is full, the pumps stop: press RESET to empty it. The RESET pedestal and its sign.
- **Each pump's plaque:** its name and number; what it is and how it works (two sentences: a diaphragm flexing, a roller squeezing a tube, an impeller spinning); what it is for in a pool; its power (W to kW) and its flow; **its fill time, "At this rate it would take … to fill the tank"**, from the model; and a Grundflow slogan ("Grundflow: we've got your back-pressure").
- **Two families** panel, by the tank: positive displacement against centrifugal, with a small diagram of each.

## Try it, with the expected results

The model's times, pinned in `museum-pumps.test.ts` and printed on the signs; the indicative ones are in the table above.

1. **The smallest:** run the DMX 1602: its sign says about 20 days; its flow readout 2.1 l/h (a fraction less against its line); the level creeps.
2. **The showpiece:** run it from empty: the tank fills in about six to eight seconds, then LSH1 trips every pump and the lamps go out; the overflow never runs.
3. **Full:** press any RUN button: the error bleep, front centre, and nothing else.
4. **Shared level:** RESET, run the spa pump for a while, stop it, then run the NKC: it carries on from the spa pump's level.
5. **Together:** run two big pumps at once: each reads a little less than alone, the tank fills faster than with either.
6. **Throttle a big pump** (its discharge valve a throttling butterfly, `createThrottleValve`): its flow falls as its curve says (a lesson from Hall 1, if seen); its sign keeps its fully open time.
7. **RESET SIMULATION** (and walking in): the tank drains to DR1 in a few seconds, the trips clear, every pump stopped.

## Reuses (paths checked 2026-10-28)

`src/toolkit/components/plant/logic/diaphragm-pump.ts` (`DIAPHRAGM_PUMPS`), `motor-dosing-pump.ts` (`DMH`), `metering-pump.ts` (`PERI_30`, `MeteringPump`), `diaphragm-head.ts`; `src/game/plant/dosing-pumps.ts`; views `src/toolkit/components/plant/views/diaphragm-pump.ts`, `motor-dosing-pump.ts`, `peristaltic-pump.ts`, `pumps-plant.ts` (`createEndSuctionPump`, `createPumpPair`, `createJetPump`), `boiler-plant.ts` (`createTwinHeadPump`), `chemical-handling-kit.ts` (`createTransferPumpSkid`), `spa-pack-parts.ts` (`createSpaPump`), `mag-flowmeter.ts`, `small-flowmeters.ts`, `throttle-valve.ts`, `framed-chemical-tank.ts`, `chemicals-storage.ts`; `src/game/sim/hydraulics.ts` (`solveNetwork`); `src/game/plant/circulation.ts` (`PUMP_CURVE`); dev51's `solveWithDeadEnds` (`src/game/plant/ideal-pool-plant.ts`); `src/game/plant/experimental-source.ts`; the brand (`grundflow` in `brands.ts`, `brand-livery.ts`); `createMimicBoard`; `src/toolkit/gallery/views/museum-exhibit.ts`.

**New:** the hall's model and its tests; the showpiece split-case pump (view and curve); the 1,000-litre test tank with its gauge, float switch, overflow and drain; the signs' fill times from the model (in friendly units); the lock-out of every pump on LSH1, with the error bleep; curves for the pumps the game has views of but no hydraulic model for (sump, spa, transfer), from their real counterparts.

## Acceptance

- The model's test: every pump fills the tank in the time its delivery against its system gives (the centrifugal ones at their operating points, the positive-displacement ones at their delivery against pressure); the level shared and cumulative; several pumps together adding as the network gives; LSH1 trips every pump at full, a press then plays `error` and nothing else, and the overflow catches a failed switch; RESET and entry identical; every fitting given and tagged, the plumber adding nothing.
- **Walking in from the hall before:** the hall at its start; walk on and back, and it is reset.
- Browser checks on high, medium and low: each pump run once and its sign checked against its flow, the tank filled to the lock-out, the error bleep heard; the pumps' sounds heard; screenshots and camera links recorded here.

## Performance budget

Eleven pumps and their lines, merged by material; only the running pumps animated (a diaphragm's stroke, a rotor's turn, a coupling's spin); displays redrawn on change; the signs drawn once; the tank's water level one mesh scaled; the network solved only when a pump starts, stops or is throttled, or the level passes a band (the positive-displacement pumps' delivery analytic over a step); real time only, so the model is cheap; within `DEFAULT_BUDGET`; at least 60 fps on medium and 50 on high through an archway.

## Open questions for the owner (one at a time, in this order)

1. **The pumps:** the eleven above, or fewer (the dosing four, two circulation and the showpiece), or more (a borehole pump, a fountain pump, a fire pump)?
2. **The showpiece:** a split-case pump (recommended: it looks like engineering), or the biggest end-suction?
3. **Grundflow's slogans:** as drafted, or yours?

## Research: what the hall holds

Researched 2026-10-28; the working, the curves and the sources are in [`doc/research/107j-pump-fill-times.md`](../research/107j-pump-fill-times.md). The system every pump pumps into: a lift of about 1.7 m from the ideal source to TK1's inlet above its top (0.17 bar), plus each line's own losses. _Indicative_ marks figures not confirmed against a maker's datasheet.

| No. | Pump                   | Real basis                                                         | Delivery into the tank                  | Fill time on the sign | Plaque fact or joke                                                                                                              |
| --- | ---------------------- | ------------------------------------------------------------------ | --------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | DMX 1602               | Grundfos DMX solenoid diaphragm class (repo spec)                  | 2.1 l/h (0.17 bar is nothing to it)     | about 20 days (476 h) | "Each click is one stroke, about a fifth of a millilitre. It would need about five million to fill the tank."                    |
| 2   | DDS 7.5-16             | Grundfos DDA/DDE stepper class (repo spec)                         | 7.5 l/h                                 | about 5½ days (133 h) | "Its stepper motor slows the push and speeds the return, so the chemical flows smoothly, not in spurts."                         |
| 3   | DMH 21-10              | ProMinent Sigma/1 S1Cb 12017 (repo)                                | 21 l/h                                  | about 2 days (48 h)   | "Built to push against 10 bar, ten times a car tyre; here it pushes against a sixth of a bar."                                   |
| 4   | PERI 30                | Watson-Marlow Qdos 30 (repo)                                       | 30 l/h                                  | about 33 hours        | "Nothing touches the chemical but the tube. Rollers squeeze it like toothpaste."                                                 |
| 5   | Transfer pump          | Iwaki MX magnetic-drive class, _indicative_                        | about 6 m³/h                            | about 10 minutes      | "No shaft seal: a magnet turns the impeller through a solid wall, so the chemical cannot leak out along the shaft."              |
| 6   | Sump pump              | Grundfos Unilift AP12 class (game's `PIT_PUMP` 1.5 kW)             | about 3 l/s, 10.8 m³/h                  | about 5½ minutes      | "It lives underwater and only wakes when its float says so."                                                                     |
| 7   | Spa pump               | Speck BADU Prime 7 (repo: 7 m³/h, 0.3 kW)                          | 7 m³/h                                  | about 8½ minutes      | "Self-priming: it can suck the air out of its own pipe to get started."                                                          |
| 8   | Twin-head circulator   | Grundfos MAGNA3 D 65-120 F (repo; plate 45 m³/h, 12 m)             | about 30 m³/h on one head, _indicative_ | about 2 minutes       | "Two pumps in one body: one works, one waits, and they swap so both wear evenly."                                                |
| 9   | NKC, the lounge's size | Grundfos NK end-suction (`PUMP_CURVE`: 160 m³/h at 9.6 m, 7.5 kW)  | 160 m³/h, set to duty                   | about 22 seconds      | "This one turns over a 25 m pool's water every few hours, all day, every day."                                                   |
| 10  | NKC 150-315            | Grundfos NK 150-315 (dev51: 300 m³/h at 18 m, 22 kW)               | 300 m³/h, set to duty                   | about 12 seconds      | "Its impeller is 315 mm across: the number in its name."                                                                         |
| 11  | Split-case showpiece   | Grundfos HS horizontal split case, 4-pole 45 kW, _indicative size_ | 625 m³/h at 20 m, set to duty           | about 6 seconds       | "This is the size of pump that keeps an Olympic pool moving: its whole 2,500 cubic metres through the filters every four hours." |

**The showpiece's numbers.** An Olympic pool, 50 × 25 m at 2 m deep, holds 2,500 m³; a four-hour turnover is 625 m³/h. At 20 m that is 34 kW of hydraulic power (ρgQH), about 40 kW at the shaft at 85 % efficiency: a 45 kW motor, as the brief says. Grundfos's HS range covers 10 to 2,500 m³/h, 5 to 148 m and 1.5 to 600 kW at 50 Hz, so the duty sits well inside it. Ratio, fastest to slowest: 625,000 ÷ 2.1 ≈ 300,000, as the entrance panel says.

### Research conflicts

- **"A centrifugal pump's time is longer than its nameplate suggests" is wrong for this tank.** A 1.7 m lift is far below every duty head, so on its own curve each pump runs out to the right, faster than its nameplate: the lounge NKC to about 231 m³/h (144 %), the NKC 150-315 to about 577 m³/h (192 %). Real pumps cannot run there (overload, cavitation). Recommended: a commissioning (double-regulating) valve in each centrifugal pump's fill line, in the schematic with its tag and normal state "set to duty", so the model puts each pump at its nameplate point and the signs read 1,000 L over the duty flow. The dosing pumps' times barely differ from nameplate, as the brief says.
- **Spa pump power:** the brief says 1.5 kW; the game's `createSpaPump` is after the BADU Prime 7, 0.3 kW (0.5 kW drawn), 7 m³/h.
- **Twin-head circulator:** the brief says 7 to 10 m³/h, 0.75 kW, 6 to 8 minutes; the game's `createTwinHeadPump` is a MAGNA3 D 65-120 F, plated 45 m³/h at 12 m, so about 30 m³/h and about 2 minutes. Either keep the view and its numbers, or choose a smaller circulator.
- **Sump pump power:** the brief says 0.5 kW; the game's pit pump draws 1.5 kW (`PIT_PUMP`, `site-intake.ts`). A Unilift AP12 is 0.4 to 1.1 kW; the sign should follow whichever the model uses.
- **Showpiece flow:** "about 600 m³/h" becomes 625 m³/h, the four-hour turnover exactly; the fill time stays about 6 seconds.

**Question for the owner:** the big centrifugal pumps run at their nameplate duty by a commissioning valve set in each fill line (recommended, so the signs match the plates), or free on their curves against the low lift (faster, but off the end of a real pump's curve)?

## Built (2026-10-28)

Placed by the owner as Hall 6 (room code M6). Model `src/game/plant/museum-6-pumps.ts` (tested), layout `src/toolkit/gallery/logic/museum-6-layout.ts` (voxel router, the plumber adds nothing, no clashes, sized from `hallInterior('museum6')`, so it follows the ring's resize to 15.4 × 20.4 m), mimic `museum-6-mimic.ts`, words `museum-6-placards.ts`, new views `src/toolkit/components/plant/views/museum-pump-parts.ts` (test tank, litres display, split-case pump, mag-drive pump, submersible pump, RUN stand), scene `src/toolkit/gallery/rooms/museum/hall-6-world-of-pumps.ts`.

- **Layout:** the reservoir CW1 is a trough along the street (east) wall; the eleven pumps stand in a row in front of it, smallest at the north (the way in) to the showpiece at the south end of the row (not in the middle of the far wall: the south wall's middle is the archway); each fill line rises to the overhead inlet header HD1, which feeds TK1 standing west of the route; drain and overflow fall to the gully DR1 at its foot. The mimic, Grundflow clock, entrance panel, RESET and the two-families panel are on the courtyard (west) wall. Each pump's RUN stand carries its plaque and its flow readout (FI1 to FI11 are also on the lines: rotameters on the small lines, mag meters on the big).
- **Research conflicts, resolved conservatively:** every centrifugal pump's fill line has a commissioning valve (V3, "set to duty"), so alone each runs at its rated duty and the signs match the plates; run together they share the header and each gives a little less. The spa pump is 0.3 kW (the game's BADU Prime 7); the sump pump 1.5 kW (the game's pit pump); the twin-head circulator one head at 30 m³/h (indicative); the showpiece 625 m³/h at 20 m, 45 kW.
- **Model, not `solveNetwork`:** like Hall 1, the hydraulics are closed form: each centrifugal pump's curve against the 1.7 m lift and its line, all solved together on the shared header by bisection; the displacement pumps' delivery their rating less 10 % slip at their rated pressure (indicative), not `stepDosingPumps`. The tank's level clamps at LSH1 (1,000 L) the instant it trips; the overflow (1,093 L) catches a failed switch (tested).
- **Signs' times (pinned):** P1 20 days, P2 5.6 days, P3 about 2 days, P4 33 hours, P5 10 minutes, P9 23 s, P10 12 s, P11 5.8 s. The friendly units run to days up to 30 days, so the DMX reads "20 days", not "2.8 weeks".
- **Deviations:** the sump pump stands in the reservoir and has no suction line or suction valve; the small pumps' isolating valves are drawn open and fixed (the hall's only worked valves are the big three's throttling butterflies, as Try it 6 asks); the dosing pumps' own keys are not worked (RUN is the hall's control); the transfer pump is a new simple view (the chemical skid's view carries its own model and valves); the level bar on the mimic is a column of five lamps; RESET drains through DN 300 by Torricelli in about ten seconds.
- **Still to do:** the browser walk-through on high, medium and low (every Try it step, sounds, the error bleep), frame-time measurement, and the component benchmark for the new displays (the litres display and RUN stand's LCD); screenshots.
- **Camera:** `?room=museum6&x=-3&y=1.7&z=0&yaw=90&pitch=-5&noclip=true` (west of the tank, looking east at the pump row).
- **Owner question, answered (the owner, 2026-10-28): nameplate.** The commissioning valves stay, each centrifugal pump running at its rated duty, so the signs match the plates.

**Subtitle (the owner, 2026-10-29):** "We Keep Water Moving" replaces "Pumps for every occasion" on the title card (`HALL_BRIEFS.museum6.subject`) and the entrance panel (`hall6Entrance`). Grundflow's brand tagline in `brands.ts` stays "Keep it moving" (already set; the new line would near-duplicate it).

**The tank is an IBC; plaques clear (the owner, 2026-10-29):** TK1 is now `createIbc` (the game's standard 1,000 L IBC, its constants in `logic/ibc.ts` widened to a real bottle's 1.13 × 0.95 × 0.94 m, 1,009 L brimful), turned so its outlet faces the gully; the model's `TANK` takes its plan and floor from `IBC`, LSH1 at 1,000 L, overflow at the brim, the fill's inlet on the top filler at 1.25 m, so `LIFT` is 1.25 m (derived) and every fill time follows. RESET's drain is the IBC's bottom outlet valve, a DN150 butterfly (Torricelli, about 45 s); the fill, overflow and drain are DN150. The plaques of P8 and P11, whose discharges leave toward the visitors, stand 0.6 m beside them; P3 and P7 stand 0.9 m clear of the column line; each stand's reading zone is a keep-clear region for the router, and `museum-6-layout.test.ts` checks every plaque's sight lines (straight on and ±0.6 m) against columns and pipes. Camera on the IBC: `?room=museum6&x=0.9&y=1.8&z=-0.6&yaw=250&pitch=-15&zoom=1`.
