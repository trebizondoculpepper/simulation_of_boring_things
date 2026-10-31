# Frutiger Aero interface sounds for Hall 4

Sounds for the Hall 4 dosing console's three touch screens (mission 113, `doc/prompts/113-hall-4-dosing-console.md`), whose look is Frutiger Aero: glossy, glassy and watery. Every file here is from Kenney's [Interface Sounds](https://kenney.nl/assets/interface-sounds) pack (version 1.0, 2020), copied unchanged on 2026-10-31 and renamed after the button or moment it suits. The pack is CC0, so no credit is required, but it is credited in `CREDITS.md` all the same; its licence is in `KENNEY-LICENSE.txt`. The pack is general-purpose rather than Aero as such: the glass, drop, select and confirmation sounds were chosen because they have the glassy, watery feel the screens need.

The files are Ogg Vorbis, as Kenney supplies them. Chrome, Firefox and the desktop build play them; convert them to MP3 or WAV if Safari has to.

## Suggested use in Hall 4

| File                                          | Kenney original                          | Suggested use                                                                                                                                           |
| --------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `touch-1.ogg`, `touch-2.ogg`, `touch-3.ogg`   | `select_001`, `select_002`, `select_005` | Any touch the console takes: a chemical in the list, a dose size, the card arrows. One of the three, chosen at random, so repeated touches don't drone. |
| `tick-1.ogg`, `tick-2.ogg`, `tick-3.ogg`      | `tick_001`, `tick_002`, `tick_004`       | Quieter alternatives for the most frequent touches, such as stepping the dose size up and down with its arrows.                                         |
| `click-1.ogg`, `click-2.ogg`                  | `click_001`, `click_003`                 | Spare clicks, for buttons that need to sound firmer than a touch (START's confirmation, RETRY).                                                         |
| `list-scroll-1.ogg`, `list-scroll-2.ogg`      | `scroll_001`, `scroll_002`               | The chemical screen's up and down arrows, when the list scrolls.                                                                                        |
| `level-switch-on.ogg`, `level-switch-off.ogg` | `toggle_001`, `toggle_002`               | The level switch: POOL PRO and JOURNEYMAN.                                                                                                              |
| `touch-refused-1.ogg`, `touch-refused-2.ogg`  | `back_001`, `error_001`                  | A touch on something greyed out, or an arrow at the end of its list.                                                                                    |
| `start-1.ogg`, `start-2.ogg`                  | `maximize_001`, `question_001`           | START: a challenge card loads its water and swimmers and its briefing begins.                                                                           |
| `dose-1.ogg` to `dose-4.ogg`                  | `drop_001` to `drop_004`                 | DOSE taken: the chemical goes in. Water drops, so they suit the pool; one at random.                                                                    |
| `dose-refused-1.ogg`, `dose-refused-2.ogg`    | `error_003`, `error_006`                 | DOSE refused: no doses left, or the console not ready.                                                                                                  |
| `accept-1.ogg` to `accept-4.ogg`              | `confirmation_001` to `confirmation_004` | A general "yes": RESET confirmed, CONTINUE, RETRY.                                                                                                      |
| `reset-ask.ogg`                               | `question_003`                           | RESET pressed: the "are you sure?" question comes up.                                                                                                   |
| `dialog-open.ogg`, `dialog-close.ogg`         | `open_001`, `close_001`                  | Any panel or dialog opening or closing; `dialog-close` for RESET's NO.                                                                                  |
| `in-range-1.ogg` to `in-range-3.ogg`          | `glass_001`, `glass_002`, `glass_004`    | The water comes into range and the hour's hold begins. A glassy ping, rising if the three are played in order as more readings come in.                 |
| `out-of-range.ogg`                            | `bong_001`                               | A reading drifts out of range and the hold starts again.                                                                                                |
| `won-1.ogg`, `won-2.ogg`                      | `glass_006`, `maximize_006`              | Challenge won. These are small for the moment; a longer chime from Freesound may suit better (below).                                                   |
| `lost-1.ogg`, `lost-2.ogg`                    | `pluck_002`, `minimize_001`              | Challenge lost: out of doses with the water still wrong. Soft, so a visitor tries again.                                                                |

## Wiring them in

The console already has a sound hook: `ConsoleHost.sound('touch' | 'dose' | 'deny')` in `src/toolkit/gallery/views/dosing-console.ts`, called on every touch, on DOSE taken and on DOSE refused. Hall 4 does not pass it yet (`createDosingConsole` in `src/toolkit/gallery/rooms/museum/hall-4-chemistry.ts`). The other moments need hooks of their own: START, RESET's question and answers, the level switch, the list scrolling, the hold starting and breaking, won and lost. The challenge engine (`src/game/plant/museum-4-challenge.ts`) has `heldSince` and `outcome` for the last four. Recordings play through `recording(url, level)` in `src/toolkit/components/core/audio/part-audio.ts`.

## Other candidates

For the bigger moments, where Kenney's sounds are small, there is a shortlist of other CC0 sounds from Freesound (achievement chimes, a vibraphone sting, a pipette dripping into a jar) on the owner's audition page of 2026-10-31. Each file added from there needs its own row in `CREDITS.md`.
