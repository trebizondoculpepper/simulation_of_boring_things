# The bridge reveal

What happens when the walker comes into the bridge from the main corridor (the CONTROL ROOM MODE knob at NEW). Each step's time is seconds after the previous step starts, as (mean, standard deviation); a standard deviation of 0 means fixed. The first is from crossing the threshold. Each display has its own start, drawn once per entrance; its later steps follow from it, so the displays stay scattered through the whole sequence. The owner asked for this sequence on 2026-10-27; edit the times here and they will be carried into the code.

Before the walker comes in, as seen through the corridor's open doors (and after the plate's RESET): the room is dark but for the emergency glow under the consoles; every display is black.

First view only:

When viewed from outside, all we can see is the emergency glow under the consoles.

Our initial view of the control room is just dark, indistinct emergency lighting, the bottom of the desks and nothing else

We walk into the room, and the intro sequence triggers as soon as the doors close behind us. This used to be triggered when we cross the threshold, but now I want the user to walk into a mysterious space for a bit.

As soon as the doors close, he emergency glow under the consoles is on but immediately fades to black (duration 1s) and then returns after 5s of black.

Meanwhile, 2s after the doors close, the monitors start to boot
displays start to boot up, the sequence is this:
(4, 0.6) - black
(7, 2) - the emblem
(2, 0.5) - black again
and then LCARS boots up

And then, main lights come on 2s after all the monitors have booted up

Arriving any other way (a reload or a link straight onto the bridge), the displays are simply on and the lights as their switches say.

On any subsequent visit:

- Emergency lighting is on, monitors start on
- Main lights come on after 2s in the room

Where the numbers live: `src/ui2d/boot.ts` (`BOOT_TIMING`), `src/toolkit/gallery/logic/bridge-lights-up.ts` (`ENTRANCE_BOOT`, `ENTRANCE_GLOW`, `LIGHTS_UP`), `src/toolkit/gallery/rooms/bridge-room.ts` (`AUTO_LIGHTS_ON_MS`, the theme's fade).

## Implemented as

Added by the implementation (2026-10-27); the owner's text above stands as written.

- Which entrance: `entranceKind` (`src/toolkit/gallery/logic/bridge-lights-up.ts`): walked in from the corridor, `'first'` while `bridgeThemeHeard` is false (a first visit, or after the CONTROL ROOM MODE plate's RESET, `bridge/first-visit-reset`), `'again'` once it is true; a reload or a link straight onto the bridge, none (`playsEntrance`): the displays simply on, the lights as their switches say.
- The first view's start (t = 0): the corridor doors shut behind the walker, not the threshold (the owner, 2026-10-27). Until then the room is held as seen from outside: displays black, the glow alone, main lights dark (`createBridgeLightsUp`'s `enter('held')`). The trigger is `stepReveal` (`revealWaiting`, `REVEAL_DOORS`), stepped each frame in `startTheBridge` with the bridge's own corridor doors (`startBridgeRoom`'s `onDoors`, shut when their `angle()` is under 0.001 rad): it starts once the doors, seen open as the walker comes through, are shut, or, if never seen open, once shut after 2 s. Leaving before the doors shut starts nothing and keeps the first view for the next visit (the theme is marked heard only at t = 0). Every time below in the first view is from t = 0.
- The emergency glow in the first view: `firstViewGlow` and `ENTRANCE_GLOW` (`out` 1 s, `black` 5 s, `back` 1 s): on as the doors shut, faded to black by 1 s, black to 6 s, faded back up over 1 s, full again at 7 s. In every entrance it fades over `ENTRANCE_GLOW.fade` (1.5 s) once the main lights are full, unless EMERGENCY LIGHTS is on (`entranceGlow`).
- The displays in the first view: `ENTRANCE_BOOT` (a `BootSpec`, `src/ui2d/boot.ts`): from 2 s, each display draws its own durations (`sampleBoot`, `sampleSpread`: normal, floored): black (4, 0.6), the emblem (7, 2) its 0.3 s fade-in included (`BOOT_TIMING.emblemIn`), at least 0.5 s, black again (2, 0.5) its 0.5 s fade from the emblem included (`BOOT_TIMING.fade`), at least 0.5 s, then the 1 s draw-in (`BOOT_TIMING.draw`). `BootGroup.bootEach` boots them and returns when the last will be operational (`readyAt`); about 16 s with every part at its mean (`entranceBootMean`), later in practice, the last of many draws.
- The main lights in the first view: `LIGHTS_UP.afterBoot`, 2 s after the last display is operational (the owner's decision: a beat with every screen glowing in the dark), `entranceLightsAt`; then the staged rise as before (`LIGHTS_UP.starts`, `rise`: rings, dome, walls, aft; full 3.5 s later), `lightsUpLevels(t, at)`. The bridge never throws its own MAIN LIGHTS switch in the first view.
- The theme in the first view: `THEME_AT`, 1 s after the doors shut, as the glow finishes fading out and the room is wholly black (the owner's decision); not begun if the walker leaves first. Played at once on a first visit made any other way.
- A later visit: the glow on, the displays on, the main lights 2 s in (`LIGHTS_UP.again`); found with MAIN LIGHTS off, the bridge switches them on at 2 s (`AUTO_LIGHTS_ON_MS`, 3 s, applies only to arrivals any other way).
- Leaving (the owner, 2026-10-27): the theme, if still playing, fades out over 3 s (`THEME_FADE`, `src/toolkit/gallery/rooms/bridge-room.ts`); the main lights go out over `LIGHTS_UP.out` (2 s); the displays stay on (any still booting are put on) and the glow under the consoles stays on (presentation, `createBridgeLightsUp`'s `glow`, not the EMERGENCY LIGHTS switch), so the room is seen from the corridor with its monitors and emergency glow. After RESET, back to the first view: displays black, glow only.
- After RESET, seen from the corridor: a bridge built while the theme is unheard starts with its displays black however the page was opened; each touch screen repaints the moment it is booted or skipped (`BootScreen.onChange`); and the displays are put on when the bridge is suspended only if the walker was inside and the first view had begun (`displaysOnLeaving`), since the bridge is also suspended when merely drawn beyond the corridor's doors, which used to put them on.
- Tested in `src/toolkit/gallery/logic/bridge-lights-up.test.ts` and `src/ui2d/boot.test.ts`.
