# 100: A library of piezo beeps, by pitch, meaning and reverb

Status: built 2026-10-28 (written the same day from the research in [piezo-beeper-sounds](../research/piezo-beeper-sounds.md); its prototype heard by the owner first): the library, the typed lookup and dev7's piezo test set are done; the cadences await the owner's ear, and which candidates switch (work step 4) is the owner's to choose.

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first; its rules apply, above all that `logic/` folders are pure and tested beside them, that all sound goes through the part audio, and that Markdown is one paragraph per line. Read the research note [doc/research/piezo-beeper-sounds.md](../research/piezo-beeper-sounds.md) before starting: it explains why a cheap piezo sounds as it does and gives the synthesis method and its parameters.

## The request

The owner, 2026-10-28: "Can you model and synthesize basically beep noises as if coming out of a piezoelectric speaker? Beeps of, let's say, three different pitches. Some beeps will indicate entry, some errors, and also with different amounts of [reverb]. … the idea is to get that sound that you get from a particularly poor quality speaker, which means that you're not listening to a clean signal. So the job is to research how do we get that piezoelectric beeper sound and then create a selection of beeps and warning tones that we can reuse, and then we can select a version by tone, meaning, and the amount of reverb pre-rendered into it, so we can have an appropriate noise for almost any scenario."

Every sound is synthesised from scratch by the generator. No recording, sample or copyrighted sound is used, analysed or imitated; `resources/sound/effects/science_fiction_bleeps/` must never be used or referenced.

## The library's axes

Every combination of the three axes is one file.

**Pitch** (`PiezoPitch`), the frequency the sounder is driven at. One sounder throughout, an externally driven 27 mm bender whose plate resonates at 3.9 kHz in a housing whose port resonates at 2.65 kHz, so the three sound like one device played three ways, not three devices:

| Pitch  | Drive   | Character                                                                      |
| ------ | ------- | ------------------------------------------------------------------------------ |
| `low`  | 1.3 kHz | Off resonance; its third harmonic lands on the plate's mode: nasal, buzzy      |
| `mid`  | 2.4 kHz | Between the port and the plate: fuller, a little rough                         |
| `high` | 3.9 kHz | On resonance: the loudest, nearly pure, piercing (a self-drive buzzer's sound) |

For a cadence that moves between two frequencies (the warble), the second is the pitch times 0.84.

**Meaning** (`PiezoMeaning`), the cadence. Start from these, tune by ear with the owner, and record the final timings in the generator and the index:

| Meaning           | Cadence                                                                                   | For                                                                                         |
| ----------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `entry`           | One 35 ms chirp                                                                           | A key pressed, a card presented                                                             |
| `confirm`         | Two 70 ms beeps, 50 ms apart                                                              | A value stored, a command accepted, a card read and accepted                                |
| `done`            | One 0.3 s beep                                                                            | A longer action finished, an arming or a mode change completed                              |
| `error`           | Three 90 ms beeps, 60 ms apart                                                            | A key not allowed now, a limit reached                                                      |
| `deny`            | One 0.55 s tone                                                                           | A wrong code, a card refused, LOCAL CONTROL ONLY                                            |
| `ready`           | One 0.15 s beep after 50 ms of silence                                                    | A controller coming online after its self-test                                              |
| `fault`           | Three 0.15 s beeps, 0.15 s apart                                                          | A controller's fault on power-up or in running                                              |
| `countdown`       | One 60 ms beep a second (a 1 s loop)                                                      | An entry or exit delay, a timed action running                                              |
| `hurry`           | One 60 ms beep every 0.25 s (a 1 s loop)                                                  | The last seconds of a countdown                                                             |
| `warning`         | 0.25 s on, 0.25 s off (a 1 s loop)                                                        | A condition needing attention, until acknowledged                                           |
| `alarm`           | A warble: 62.5 ms at the pitch, 62.5 ms at 0.84 of it (a 0.25 s loop)                     | An alarm sounding until silenced (an annunciator's horn, a leak detector, a panel's buzzer) |
| `priority-high`   | Ten 0.1 s pulses: three, two, (a gap), three, two, as IEC 60601-1-8's high-priority burst | A grave alarm, repeated by the caller                                                       |
| `priority-medium` | Three 0.2 s pulses                                                                        | A caution, repeated by the caller                                                           |

The loops (`countdown`, `hurry`, `warning`, `alarm`) are rendered as seamless loops for `partAudio.hold`: whole cycles, with the reverb's tail wrapped round onto the start (render several cycles and keep a steady-state one), so held they neither click nor lose their tail. No temporal-three (the evacuation signal belongs to the fire alarm, which has its own sounder).

**Reverb** (`PiezoRoom`), rendered in (method and parameters in the note):

| Amount  | RT60   | Where it suits                                              |
| ------- | ------ | ----------------------------------------------------------- |
| `dry`   | none   | Close to the device, a soft room, a test                    |
| `small` | 0.35 s | A small plant room, a cubicle, the control room, a corridor |
| `large` | 2.2 s  | A big tiled plant room, a pool hall, the loading bay        |

The amount follows the room the device stands in.

## Naming and where the files live

- Files: `resources/sound/effects/piezo/piezo_<meaning>_<pitch>_<room>.mp3`, meaning names with a hyphen as given (`piezo_priority-high_mid_large.mp3`). 13 meanings × 3 pitches × 3 rooms = 117 files, about 1.6 MB.
- The generator beside them: `resources/sound/effects/piezo/generate.py`, Python 3 with numpy and scipy only, ffmpeg for encoding (MP3, LAME VBR `-q:a 2`, mono, 48 kHz), rerun as `python3 -I generate.py .` from that folder, deterministic (a fixed random seed per file, from its name, so rerunning changes nothing).
- `resources/sound/effects/piezo/index.md`: the method in a paragraph (pointing to the note), the parameters, the cadences, and a table of every file with its meaning, pitch, room, seconds, loudness and peak, written by the generator.
- `resources/sound/effects/piezo/manifest.json`, written by the generator: for each file its axes, seconds, whether it loops, its loop length, its measured loudness and peak. The game's TypeScript reads nothing at run time from it; it is for the tests.

## The generator

Follow the note's chain: a band-limited pulse-wave drive (duty 0.46, pulling in to pitch over 4 ms, 1 ms gated edges); the transducer as three parallel resonances (3900 Hz Q 10, 2650 Hz Q 4 at 0.45, 9800 Hz Q 7 at 0.3, with 6 % direct); a soft clip (`tanh`, +9 dB, asymmetry 0.18); the fascia (a 0.18 ms comb at 0.45, a level-following rattle, 4 % of 100 Hz ripple); a 700 Hz high-pass and 9.5 kHz low-pass; then each room's synthesised impulse response by convolution. Start from the prototype (`piezo.py` in the research session's scratchpad: the note gives its whole method; rewrite it cleanly rather than copy it if it is gone). After encoding, decode each file with ffmpeg and check: the sound starts within 2 ms of the file's start; the peak is at most −1 dBFS; a loop's last and first 5 ms join without a step. Fail loudly if not.

## Loudness

Each dry one-shot is brought to one level, K-weighted RMS (ITU-R BS.1770 weighting) over its sounding part only, chosen so that the loudest file peaks at −1 dBFS (about −10 dB on the prototype's measure). A loop is measured over one cycle's sounding part. Each `small` and `large` version keeps its dry version's gain, so the beep is equally loud in every room and the tail is added. So all 117 files need no per-file balancing table in the game (unlike `console-sounds.ts`'s `LOUDNESS`); the caller gives the level of its event.

## How code selects one

A pure logic file, `src/toolkit/components/sound/logic/piezo-beeps.ts`: the three axes as union types and `as const` arrays (`PIEZO_PITCHES`, `PIEZO_MEANINGS`, `PIEZO_ROOMS`), which meanings loop and their cycle lengths, `piezoFile(meaning, pitch, room)` (the file name), and the levels for the game's events (`PIEZO_LEVELS`: a key softer than an alarm, tuned in the game). An audio file, `src/toolkit/components/sound/audio/piezo-recordings.ts`: the URLs for every file (by `import.meta.glob('../../../../../resources/sound/effects/piezo/*.mp3', { eager: true, query: '?url', import: 'default' })` or a written-out map, whichever the build handles cleanly), and

```ts
/** A piezo beep as a one-shot recipe (`partAudio.play`). */
export function piezoBeep(
  meaning: PiezoOneShot,
  options?: { pitch?: PiezoPitch; room?: PiezoRoom; level?: number },
): SoundRecipe;

/** A looping piezo cadence, for `partAudio.hold` while its condition lasts. */
export function piezoLoop(
  meaning: PiezoLoopMeaning,
  options?: { pitch?: PiezoPitch; room?: PiezoRoom; level?: number },
): LoopRecipe;
```

defaults `pitch: 'high'`, `room: 'dry'`. Typed so that a loop meaning cannot be played as a one-shot or the reverse. `piezoLoop` needs a looping recorded `LoopRecipe`; see whether `core/audio/recorded-loop.ts` already gives one and use it. A device's pitch and room are its own, set where it is built (a keypad's `{ pitch: 'high', room: 'small' }`), and the meaning comes from its event.

## How to use it

For a device with its own sounder (a keypad, a pump's fascia, a terminal), from `src/toolkit/components/sound/audio/piezo-recordings.ts`:

```ts
import { piezoSounder } from '../../sound/audio/piezo-recordings';

// Once, where the device is built: its pitch, and the room it stands in
// (dry close up or in a soft room, small for a plant room, cubicle or
// corridor, large for a big tiled plant room or a pool hall).
const sounder = piezoSounder({ pitch: 'high', room: 'small' }, fascia);

sounder.key(); // every key press: the 35 ms entry chirp
sounder.play('error'); // a key not allowed now, a limit reached
sounder.play('confirm'); // a value stored
part.holdWhile(alarmed, sounder.loop('alarm')); // held while alarmed
```

Or as recipes, for `a.voice(component, { press: piezoBeep('entry', voice) })` or `partAudio.play`: `piezoBeep(meaning, { pitch, room, level })` gives a one-shot `SoundRecipe`, `piezoLoop(meaning, ...)` a seamless `LoopRecipe` for `partAudio.hold`; defaults `pitch: 'high'`, `room: 'dry'`, and the meaning's level from `PIEZO_LEVELS` (`sound/logic/piezo-beeps.ts`: a key 0.12, an alarm 0.24; about as loud as the old `BEEP` at 0.12). `playPiezo(meaning, voice, from)` plays one from where `from` stands. The one-shot meanings are `entry`, `confirm`, `done`, `error`, `deny`, `ready`, `fault`, `priority-high`, `priority-medium`; the loops `countdown`, `hurry`, `warning`, `alarm`; TypeScript refuses a loop meaning to `piezoBeep` and the reverse. To hear any of them in the game: dev7's piezo test set, `?room=dev7&view=piezo` (the console has `devTones.piezo.set({ meaning, pitch, room })` and `devTones.piezo.test()`).

To change a cadence or the sounder, edit `resources/sound/effects/piezo/generate.py` and rerun `python3 -I generate.py .` from that folder; `piezo-beeps.ts` names the meanings and loop cycles, and its test checks them against the new `manifest.json`.

## Which sounds might switch to it

For the owner to choose; do not switch any without the owner's say. Today's beeps are plain oscillators (`tone` recipes) or the bridge's resynthesised console sounds:

- **The Chlorella OT-216 terminals** (`industrial-control/views/ot216-terminal.ts`): `bootBeep(2600)` on a value stored and a command done (candidate `confirm`); nothing on LIMIT or a refused key (candidate `error`); keys silent (candidate `entry`).
- **The access door keypads** (`architectural/parts/building-parts.ts`, `accessDoor`): `BEEP` on each key (candidate `entry`), `LOCKED` and `ERROR` refused (candidate `deny`).
- **Card readers** (`architectural/parts/card-reader.ts`, `equipment-doors.ts`, the plant doors' and the main corridor's): `BEEP` as each goes green (candidate `confirm`), nothing on a refusal (candidate `deny`). The bridge's doors use the console recording `correct_entry` (the owner's ruling for the bridge: its own sounds; probably keep).
- **The fire panel** (`fire/parts/fire-parts.ts`, `firePanel`): `BEEP` and `ERROR` on its keys (candidates `entry`, `deny`), its internal buzzer `ALARM_BUZZER` (candidate `alarm` or `warning`).
- **The intercom** (`intercom`, `CHIME`): candidate `confirm` or keep its chime.
- **The location annunciators' horns** (`gallery/views/location-annunciator.ts`, `ALARM_BUZZER`): candidate `alarm`; the annunciator horn may want to stay a louder, harsher horn than a piezo.
- **The leak detector** (`plant/views/leak-detection.ts`) and **the accessible toilet's alarm** (`general-safety/parts/safety-parts.ts`), both `ALARM_BUZZER`: candidates `alarm` or `warning`.
- **Controllers' ready and fault beeps**: the spa pack's controller (`ONLINE_BEEP`, `FAULT_BEEP`, already called "a piezo sounder on its board", `gallery/rooms/plant/spa-pack.ts`), the cabinet boot beeps (`game/plant/cabinet-boot.ts`, `gallery/views/cabinet-services.ts`) and dev0's displays' ready beeps (`gallery/rooms/test-boards.ts`, `bootBeep`): candidates `ready` and `fault`.
- **Diaphragm and peristaltic dosing pumps' keys and the chemical control box** (`plant/views/diaphragm-pump.ts`, `chem-control-box.ts`): silent keys now; candidates `entry` and `error`.
- Not candidates: the fire and gas alarms' sounders (invented deliberately unlike real alarms), the bridge's touch screens and consoles (their own sounds by the owner's ruling), the touch panels' bleeps (`touch-bleeps.ts`, a touch screen's own interface) unless the owner asks.

## The work

1. **Write the generator** and render the library; listen to every file, and adjust cadences and the drive's parameters with the owner before wiring anything. Send the owner the index (a page with players, as the research prototype's `index.html`).
2. **The logic and audio files** above, with tests.
3. **A listening place**: dev7, the machine tones room (`gallery/rooms/tones-room.ts`), or dev0, gets a small piezo board: a real, working thing per the rules, a sounder on a bench controller with three selector switches (pitch, meaning, room) and a TEST button, so the whole library can be heard in the game, placed and panned as in play.
4. **Ask the owner** which of the candidates switch, one at a time; switch those, each device given its pitch and room.
5. `doc/reuse-inventory.md` needs nothing (nothing copied); `CHANGELOG.md` under Unreleased; tick the TODO entry.

## Tests

- `piezo-beeps.test.ts`: every axis combination has a file name, unique, of the scheme; loop meanings and one-shot meanings partition the meanings; levels within 0 to 1.
- A test (beside the audio file, or reading `manifest.json` as text by `import.meta.glob` with `?raw`) that every file the logic names exists in the manifest and the reverse, so a meaning added to one and not the other fails.
- From the manifest: every dry file's loudness within 0.5 dB of the target; each `small` and `large` file's direct part as loud as its dry one (the generator records the gain used); every peak at most −1 dBFS; loops' lengths whole cycles.
- The generator's own checks (onset, peak, loop join) pass, and a second run leaves every file byte-identical.

## Acceptance

- 117 files in `resources/sound/effects/piezo/`, synthesised from scratch by `generate.py`, with `index.md` and `manifest.json`; nothing derived from any recording.
- They sound like one cheap piezo sounder behind a panel: the low pitch buzzy, the high piercing, none clean; the reverbs plainly small and large rooms.
- `piezoBeep` and `piezoLoop` give any of them by meaning, pitch and room, typed; tested as above.
- Every file equally loud while sounding (to 0.5 dB); the reverb versions no louder than the dry.
- A piezo test board where the library can be heard in the game.
- The candidates put to the owner and those chosen switched; the checks (`npm run typecheck`, `lint`, `format:check`, `test`, `build`) pass.
