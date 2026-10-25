# Time acceleration

Research for speeding up the game's clock (the owner, 2026-10-25): time skipped in exponentially increasing steps from 1× up to perhaps 10,000×, without changing how fast things animate or the pitch of any sound. Measured 2026-10-25 against the code as it stands (the world at version 25 and later). Anything marked **(inferred)** is reasoning, not a measurement.

## What exists now

- **The clock.** The player's world is advanced by `world-store.ts`: every `STEP` (0.1 s) of real time a timer calls `advance(world, elapsed, STEP)` (`world.ts`), which runs `stepWorld` in fixed 0.1 s steps over the real seconds that passed. Pausing (`paused`, and the console's `clockStopped`) skips the tick. A reload catches up on the time the game was closed, up to `CATCH_UP_LIMIT` (an hour), the same way.
- **A placeholder button.** The HUD already shows `▶▶ 1×` at the top left (`first-person.ts`, "Simulation speed (not yet working)"); it does nothing.
- **Animation and sound already run on real time.** Rooms animate on each frame's real `delta`; held sounds (`partAudio.hold`, `machineTone`) are loops whose pitch is set by a part's own rate signal, never by the world's clock, and their run-up and run-down follow the audio context's time. So speeding the world does not, by itself, change any animation's speed or any sound's pitch. What changes is how often the world's state changes under them.

## Measurements

**Cost of a step.** `stepWorld` costs about 33 µs a step, whatever the step's length (0.1 s: 33 µs; 1 s: 31 µs; 10 s: 35 µs; 100 s: 50 µs). At 10,000× in today's 0.1 s steps the world would need 100,000 steps for every real second: about 3.3 s of work a second, so it cannot be done that way. The step must grow with the speed.

**Accuracy of longer steps.** The same world advanced through the same span in steps of 0.1, 1, 10 and 60 s:

| Case                                                                                                                         | 0.1 s steps                                  | 10 s steps                           | 60 s steps                           |
| ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------ | ------------------------------------ |
| An hour, plant at rest: lounge temperature, level, tank, chlorine; jacuzzi temperature                                       | 29.958 °C, 0.0165 m, 0.680, 1.400, 36.959 °C | 29.957, 0.0165, 0.681, 1.400, 36.959 | 29.957, 0.0165, 0.681, 1.400, 36.959 |
| 10 minutes, busy (the jacuzzi's tank drain open, the footbath drained down): jacuzzi tank, jacuzzi tub level, footbath level | 0.247, −0.116 m, −0.149 m                    | 0.248, −0.118, −0.150                | 0.248, −0.118, −0.150                |
| 14 hours, the same                                                                                                           | 0.036, −0.626, −0.150                        | 0.036, −0.626, −0.150                | 0.036, −0.626, −0.150                |
| The bathers, three days: arrivals at one pool                                                                                | 678                                          | 826                                  | 624 (300 s steps: 740)               |

The water, heat and chemistry agree to within a few millimetres and hundredths of a degree at 60 s steps. The bathers' totals scatter (624 to 826) because each step size draws the random generator a different number of times, so each run takes a different random path; they show no lean one way or the other at any step size, but one run each is not proof, and a test should check their mean (below).

**Time taken.** Fourteen simulated hours took 15.5 s in 0.1 s steps, 1.6 s in 1 s steps, 0.16 s in 10 s steps and 0.03 s in 60 s steps.

## How fast it can go

With the step lengthened as the speed rises, holding the world's work to about 100 steps per 0.1 s tick (3 to 5 ms a tick, comfortably inside a frame):

| Speed    | Simulated time per tick | Step  | Steps per tick | Work per real second |
| -------- | ----------------------- | ----- | -------------- | -------------------- |
| 1×       | 0.1 s                   | 0.1 s | 1              | 0.3 ms               |
| 100×     | 10 s                    | 0.1 s | 100            | 33 ms                |
| 1,000×   | 100 s                   | 1 s   | 100            | 33 ms                |
| 10,000×  | 1,000 s                 | 10 s  | 100            | 35 ms                |
| 100,000× | 10,000 s                | 60 s  | 167            | 80 ms                |

So **10,000× is safe**: its 10 s steps are within what was measured to agree with 0.1 s steps, at about 3.5 % of one core. **100,000× is possible** at 60 s steps (also measured to agree), at about 8 %. Beyond that the steps would pass a few minutes, which nothing has been measured at, and the plant's quickest events (a valve's 4 to 6 s stroke, a trip, a flow switch) would all happen inside single steps **(inferred)**. 10,000× is about 2.8 simulated hours a real second, a day in 8.6 s, a week in a minute.

**What a long step changes.** A step of 10 s holds several of the plant's fast events at once: a valve completes its stroke within it, a pump starts and trips within it. The end states agree (the measurements above), but the order of events within one step is the model's order, not the clock's, and the event log's watchers (`diffWorld`, which compares the world before and after each step) see one change where there were two (a trip and its reset in one step would be missed). For the log this is acceptable at high speed; for the auto-drop below it matters, so the watchers should be the trigger.

## What would not speed up

These rooms hold models of their own, stepped with the frame's real `delta`, so they would run at real time while the world raced: `boiler.ts` (the six boilers' controllers, as recorded in the boiler house's open items), `pool-heating.ts`, `pool-amenities.ts` (the jacuzzi tub's effects), `shell-room.ts`, `room-equipment.ts` (heat availability), `cabinet-services.ts` (the spa cabinets' valve travel, view-local), and the dev rooms' own rigs (`balance-tank-hall.ts`, `solenoid-valves.ts`, `jacuzzi-cabinet-trial.ts`, `port-graph-demo.ts`, `test-boards.ts`). The wiring audit's prompts 045 to 053 already move the plant rooms' remaining models into the world; time acceleration is one more reason to finish that first. Until then a room can be given the world's elapsed time beside the frame's, for the models it holds.

## Sound

Held sounds keep their pitch by construction. Two effects of speed need handling:

- **Chatter.** One-shot sounds fired on state changes (a contactor's clunk, a relay's click, a valve's end stop, an alarm's chime; about 24 `partAudio.play` sites and the parts' `voice` events) would fire as fast as the world changes: at 10,000× a valve cycling on a timer would click many times a second. Above some speed (perhaps 30×) one-shot plant sounds should be thinned (no more than one per source per second) or muted, keeping the alarms.
- **Loops that flicker.** A machine that runs for 5 simulated seconds runs for 0.5 ms of real time at 10,000×: its loop would start and stop at once. Loops could be held for a minimum real time once started **(inferred)**.

## Prior art (from general knowledge, not checked against sources)

Kerbal Space Program's time warp is the closest model: exponential steps (1×, 5×, 10×, 50×, 100×, 1,000×, 10,000×, 100,000×), the faster ones only when nothing delicate is happening, and warp dropping back to 1× on its own before events that need attention. Management games (Cities: Skylines, RollerCoaster Tycoon, Oxygen Not Included) offer two or three speeds and a pause, and keep animation and sound at normal speed while the simulation runs faster. Factorio's `game.speed` instead speeds everything, animation and sound included, which is what the owner does not want here.

## Recommendation

- **Speeds.** 1×, 3×, 10×, 30×, 100×, 300×, 1,000×, 3,000×, 10,000×: each about √10 times the last, so every two steps is ten times. Nine speeds; 100,000× could follow if wanted.
- **Where it lives.** Pure logic in `src/game/time-warp.ts`: the speeds, the next and previous speed, and the step for a speed (`max(STEP, speed × 0.1 s ÷ 100)`, so at most about 100 steps a tick). The world store multiplies each tick's elapsed time by the speed and advances in that step. The speed is a session setting, not world state: not saved, starting at 1× on load (and the reload's catch-up stays in 0.1 s steps). The attract sequence's scenario stores keep real time.
- **Controls.** Through the one control scheme (`src/toolkit/controls/`), for every input at once: two keys (perhaps `,` and `.`, or `[` and `]`) to step down and up, and on gamepad and touch the HUD's existing `▶▶ 1×` button, which shows the speed and steps it up, wrapping to 1×, with its own step-down. Pause stays as it is.
- **Dropping back.** As Kerbal does, return to 1× when the event log records something that needs the player: a trip, an alarm, a pool tripping at low-low, the gas safety valve shutting. A setting can turn it off.
- **Sound.** Above 30×, thin one-shot plant sounds to one per source per second, alarms excepted; hold a started loop for at least a short real time.
- **Tests.** That a speed's step keeps the work per tick bounded; that advancing a set of scenarios (a drain-down, a backwash, a trip and reset, a day of bathers averaged over several seeds) in 0.1 s steps and in the largest speed's step agrees within stated tolerances; that the log still records a trip at speed; that pause stops the clock at any speed.
- **Before it ships.** Move the view-held models above into the world, or give their rooms the world's elapsed time.

## Open questions for the owner

- Should 10,000× be the top, or should 100,000× follow (60 s steps, measured to agree, about 8 % of a core)?
- Should speed fall back to 1× on alarms by default?
- Should the speed survive a reload, or always start at 1×?
