# Development Diary Entry - 2026-10-27

## Context

| Time      | Branch | Commit        | Task                                               |
| --------- | ------ | ------------- | -------------------------------------------------- |
| 19:20 UTC | main   | (this commit) | Mission 095: a synthesised ambience for the bridge |

## What we were asked to do

The owner asked us to "find the Star Trek bridge noise and see if we can resynthesize something that sounds similar": an original, procedural room tone for the bridge in the spirit of the Next Generation bridge's background, with variants to compare in a dev room and a hook the bridge can call, without sampling anything from the show or uploads of it. While it was being built the owner reported hearing a starship ambience in the main corridor with the control room doors shut, and asked that it be heard only in the bridge.

## What steps we took

We read the game's audio (`part-audio.ts`'s held sounds, the spa's synthesised loops, the touch bleeps) and searched for descriptions of the TNG bridge's sound: a low engine hum, said to be a heavily processed airliner in flight, soft air, and occasional quiet console chirps; Diboz's CC0 "control_room.wav" was read about, not downloaded. We put the pure part in `components/sound/logic/bridge-ambience.ts`: three variants, the drone's partials (pairs a fraction of a hertz apart, beating slowly), slow swell rates none a simple multiple of another, a seeded chirp field (exponential gaps with a least gap and a cap, five kinds of chirp on a pentatonic set) and a peak budget, all tested. The Web Audio generator in `components/sound/audio/bridge-ambience.ts` builds four layers (drone, rumble and body, air, chirps with a short echo) under a fader and a level, from two long seeded noise loops, scheduling chirps a second ahead with a timer; `createBridgeAmbience` wraps it as a controller. Dev47 got a small BRIDGE AMBIENCE plate with QUIET, STANDARD and BUSY lit buttons.

For the owner's report: nothing had been hooked into the bridge yet. The sound they heard was almost certainly our own test tab in dev47 (BUSY pressed, after which the tab's renderer stopped answering, shared with the owner's tabs on the same origin, so it played on); the tab was closed. A throwaway test with a fake audio context showed the scheduler runs ten simulated minutes and a long jump in time without hanging, so the freeze was not the generator's loop. Even so, we added the rule the owner asked for: `ambienceGain` and `createAmbienceGate` (tested) give full level only inside the bridge, nothing for a room built, prefetched or only following another's eye, and from the corridor at most 15% and only while the doors are open; the controller's `setPresence` starts and stops it by that rule.

## What the outcome was

Rendered offline, the standard variant peaks at about 0.08 with an RMS of about −34 dBFS, most of it under 150 Hz; the body layer was raised so laptop speakers carry some of it. Dev47 plays it; the bridge's hook is documented in mission 095 (two lines in `startTheBridge`), left for the agent editing the bridge's files.

## What we learned

Browser tabs on the same dev origin can share a renderer: a test tab left playing a held sound can be heard while the owner walks elsewhere, so close test tabs and mute them while testing. Room tones in this game should be gated on presence from the start, not only started on entry.
