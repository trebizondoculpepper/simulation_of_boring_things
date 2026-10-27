# The bridge reveal

What happens when the walker comes into the bridge from the main corridor (the CONTROL ROOM MODE knob at NEW). Each step's time is seconds after the previous step starts, as (mean, standard deviation); a standard deviation of 0 means fixed. The first is from crossing the threshold. Each display has its own start, drawn once per entrance; its later steps follow from it, so the displays stay scattered through the whole sequence. The owner asked for this sequence on 2026-10-27; edit the times here and they will be carried into the code.

Before the walker comes in, as seen through the corridor's open doors (and after the plate's RESET): the room is dark but for the emergency glow under the consoles; every display is black.

First view only:

When viewed from outside, all we can see is the emergency glow under the onsoles.

- 0. the walker crosses the1. (0.0, 0) - The walker crosses the threshold. The emergency glow under the consoles is on; every display is black. On a first visit (or after RESET) the theme, "Boldly Into the Deep End", begins.

2. (2.7, 0.29) - A display's start: it begins to show the emblem (uniform over 2.2–3.2 s, so the displays come up in a scattered wave). `ENTRANCE_BOOT.first` 2.2, `spread` 1.0.
3. (0.3, 0) - The emblem has faded in. `BOOT_TIMING.emblemIn` 0.3.
4. (4.7, 0) - The emblem, shown 5 s in all (its fade-in included), begins to fade to black. `ENTRANCE_BOOT.emblem` 5.0 (`BOOT_TIMING.emblem` 5.0 in the galleries).
5. (0.5, 0) - The display is black again. `BOOT_TIMING.fade` 0.5.
6. (0.15, 0) - Its interface begins to draw in: elbows and bars sweep out, then its panels appear in turn. `BOOT_TIMING.gap` 0.15.
7. (1.0, 0) - Its interface is fully drawn and operational (touches work). `BOOT_TIMING.draw` 1.0. (The last display is up about 0.5 s after the average one.)
8. (2.5, 0.29) - Two seconds after the last display is up, the main lights come on (MAIN LIGHTS is on; the reveal has kept them dark until now): the cove rings first. `LIGHTS_UP.dark` 11.85 from the threshold.
9. (0.6, 0) - The dome begins to come up. `LIGHTS_UP.starts.dome` 0.6.
10. (0.6, 0) - The wall coves and ribs begin to come up. `LIGHTS_UP.starts.walls` 1.2.
11. (0.5, 0) - The strip over the aft consoles begins to come up. `LIGHTS_UP.starts.aft` 1.7.
12. (1.8, 0) - Every stage is full (each rises over 1.8 s). `LIGHTS_UP.rise` 1.8.
13. (1.5, 0) - The emergency glow has faded out, unless EMERGENCY LIGHTS is switched on. `ENTRANCE_GLOW.fade` 1.5.
14. (13.15, 0) - The theme ends, 30 s from the threshold (it fades out over 3 s if the walker leaves first).ds (it fades out over 3 s if the walker leaves first).

Arriving any other way (a reload or a link straight onto the bridge), the displays are simply on and the lights as their switches say.

Where the numbers live: `src/ui2d/boot.ts` (`BOOT_TIMING`), `src/toolkit/gallery/logic/bridge-lights-up.ts` (`ENTRANCE_BOOT`, `ENTRANCE_GLOW`, `LIGHTS_UP`), `src/toolkit/gallery/rooms/bridge-room.ts` (`AUTO_LIGHTS_ON_MS`, the theme's fade).
