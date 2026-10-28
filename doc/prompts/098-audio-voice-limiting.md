# 098: Voice limiting: only the loudest running sounds are heard

Status: designed 2026-10-28 with the owner; not started.

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first; its rules apply (pure logic in `logic/` folders with tests, all audio through the part audio). Markdown is one paragraph per line.

## The request

The owner, 2026-10-28, after a dosing pump's sound carried across a plant room: "I wonder if there's an algorithm that basically says, don't bother rendering anything but the 5 noisiest things in a room. There's no way that the noise from a diaphragm pump would be audible even 10 m away from a big pump." The dosing pumps were made a tenth as loud the same day (`a3b1b04`); this is the general answer: voice limiting with a masking threshold, as games do.

## What there is now (checked 2026-10-28)

- Every running sound a machine holds goes through `partAudio.hold(owner, recipe, from, options)` in `src/toolkit/components/core/audio/part-audio.ts`: a gain node (faded in over 0.08 s) into a `PannerNode` (`placed`, the `inverse` distance model, `refDistance` 1.2 m, `rolloffFactor` 1, so about −18 dB at 10 m), the recipe's sources built into it; held per owner in `holds`, replaced or released by the next call. One-off sounds (`partAudio.play`) and title or front-centre sounds take other paths.
- Nothing limits how many held sounds play: a plant room may hold every pump, fan, dosing pump, servo and hum at once, each audible to its distance alone, so a quiet machine is never masked by a loud one.

## Design

1. **Measure each held sound's level**: a small `AnalyserNode` (fftSize 256) tapped off each hold's gain node, its RMS read every 200 ms (not every frame), smoothed.
2. **What reaches the ear**: that level times the panner's own distance gain for its distance from the listener (`inverse`: `ref / (ref + rolloff·(d − ref))`), in dB. Pure arithmetic in a `logic/` file: `audibleLevel(rms, distance, model)`, and `chooseVoices(levels, { keep: 5, within: 20 })`.
3. **Choose**: keep the loudest 5 at the listener, and also any within 20 dB of the loudest (so two similar pumps never flicker in and out); everything else is masked. Hysteresis: a masked sound returns only when it is 3 dB above the line, so a sound near the line does not chatter.
4. **Mask**: a masked hold's gain fades to 0 over 0.3 s, and back over 0.3 s when chosen again. After 2 s masked, its sources are stopped and its recipe kept, to be built afresh when it returns (saving the audio thread's work; recipes are already rebuilt by `hold`).
5. **Never masked**: one-off sounds (`play`), anything marked as a warning in its hold options (alarms, sounders, beepers, alarm beeps: a new `HoldOptions.always`), title and front-centre sounds. Alarms must always be heard.
6. **Per listener**: measured against the camera `listen` already receives each frame; a room seen through a doorway (which does not hear) is unchanged.
7. **Development aid**: `?audio=voices` lists in the console, once a second, each held sound's name, level at the ear and whether it is heard, to tune the numbers.

## Checks

- Pure tests of `audibleLevel` and `chooseVoices`: the loudest kept, the within-20 dB rule, ties, hysteresis, `always` sounds never masked.
- In the lounge plant room (plant_pool_01), beside the circulation pumps: the dosing pumps masked; standing at the dosing boards with the pumps far away: heard. In the Olympic plant room, the count of active held voices (from the development aid) at most 5 plus the near-equals.
- An alarm (the ozone station's sounder, a chemical store's gas alarm) heard however loud the room.
- No audible clicks as sounds are masked and return; no change in rooms with few sounds.
