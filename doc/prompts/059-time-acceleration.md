# 059: Time acceleration

Status: not started (checked 2026-10-26): nothing is built, and the owner's three choices (top speed, dropping back to 1× on alarms by default, whether the speed survives a reload) are still to settle.

## The request

The owner, 2026-10-25: "Time acceleration. The time should be skipped in exponentially increasing steps, starting at 1×, and perhaps going up to 10000×. It shouldn't affect animation speeds and the pitch of sound effects."

## What to build

**Speeds.** 1×, 3×, 10×, 30×, 100×, 300×, 1,000×, 3,000×, 10,000×: each about √10 times the one before, so every second step is ten times. Pause stays as it is (the pause menu, the console's `pause`), and stands still at any speed.

**The clock, pure.** A new `src/game/time-warp.ts`: the speeds; the next and previous speed; and the step for a speed, `max(STEP, speed × 0.1 s ÷ 100)`, so a tick's work stays at about 100 steps (10 s steps at 10,000×). Tested beside it.

**The world store.** `world-store.ts` multiplies each tick's elapsed real time by the speed and advances the world in that speed's step, the event log's watchers still seeing every step. The speed is a session setting, not world state: not saved, 1× after a reload, and the reload's catch-up stays in 0.1 s steps. The attract sequence's scenario stores keep real time.

**Real time stays real.** Animation runs on each frame's real delta and held sounds keep their pitch, as now; nothing about them changes with the speed. The rooms that still step models of their own on the frame's delta (`boiler.ts`, `pool-heating.ts`, `pool-amenities.ts`, `shell-room.ts`, `room-equipment.ts`, `cabinet-services.ts`'s valve travel; the dev rooms' rigs) are moved into the world first (prompts 045 to 053), or given the world's elapsed time beside the frame's, so they keep pace with it.

**Controls.** Through the one control scheme (`src/toolkit/controls/`), for every input at once: two keys to step the speed down and up, and the HUD's `▶▶ 1×` button (now a placeholder in `first-person.ts`) showing the speed, stepping it up and wrapping to 1×, with a way down on touch and gamepad. The help line names the keys.

**Dropping back.** As Kerbal Space Program's time warp does, the speed returns to 1× when the event log records something that needs the player: a motor's trip, a gas alarm, a pool tripping at low-low, the gas safety valve shutting, the jacuzzi cabinet's trip. A setting turns it off.

**Sound at speed.** Above 30×, one-shot plant sounds (a contactor's clunk, a relay's click, a valve's end stop) are thinned to one per source per second, alarms excepted; a held loop, once started, plays for at least a short real time, so a machine that runs for a few simulated seconds is heard as a blip, not nothing.

## Tests

- `time-warp.ts`: the speeds rise by √10, step up and down within them, and a speed's step holds a tick to about 100 steps.
- Step-size agreement: a set of scenarios (a drain-down, a backwash, the jacuzzi's tank drained, a trip and its reset, a day of bathers averaged over several seeds) advanced in 0.1 s steps and in the 10,000× step agree within stated tolerances.
- At speed the log still records a trip, and the speed drops to 1× on it.
- Pause stops the clock at any speed; the speed is not saved.

## Acceptance

At 10,000× a simulated day passes in under nine real seconds with the frame rate unchanged; walking, animation and the pitch of every sound are as at 1×; an alarm brings the speed back to 1×; the plant's state after a day at speed matches a day at 1× within the tests' tolerances.

## The owner's choices (to settle before building)

- The top speed: 10,000× (10 s steps, measured to agree), or on to 100,000× (60 s steps, measured to agree, about 8 % of a core).
- Whether dropping back to 1× on alarms is on by default.
- Whether the speed survives a reload.

## Remaining (checked 2026-10-26)

- The owner's three choices: the top speed (10,000× or 100,000×), whether dropping back on alarms is on by default, whether the speed survives a reload.
- `src/game/time-warp.ts`: the speeds, next and previous, the step for each, with tests.
- `world-store.ts` advancing the world at the speed's step, the speed a session setting.
- Controls through the control scheme, the HUD's `▶▶ 1×` button and the help line.
- Dropping back to 1× when the event log records something that needs the player, with a setting to turn it off.
- One-shot sounds thinned above 30×, and a minimum real play time for held loops.
- The rooms' own frame-delta models moved into the world first, or given the world's elapsed time.
- Step-size agreement tests and the 10,000×-day acceptance run.
