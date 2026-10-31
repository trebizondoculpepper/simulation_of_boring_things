# Piezo beeps

A library of beeps from one cheap piezo sounder behind a panel, by pitch, meaning and reverb (mission 100, `doc/prompts/100-piezo-beeper-library.md`). Every file is synthesised from scratch by `generate.py` in this folder; nothing is recorded, sampled or derived from any recording. Rerun with `python3 -I generate.py .` from this folder (Python 3, numpy, scipy, ffmpeg); it is deterministic, so a rerun changes nothing. This file and `manifest.json` are written by it.

Method (the research note `doc/research/piezo-beeper-sounds.md` explains it): a band-limited pulse-wave drive (duty 0.46, starting 2.5 % flat and pulling in to pitch over 4 ms, gated with 1 ms edges) into a modal model of an externally driven 27 mm bender in its housing (three parallel two-pole resonances: the plate at 3900 Hz Q 10, the housing's port at 2650 Hz Q 4 at 0.45, a higher plate mode at 9800 Hz Q 7 at 0.3, with 6 % of the drive straight through); a soft clip (`tanh`, +9 dB, asymmetry 0.18); the fascia (a 0.18 ms comb at 0.45, a level-following rattle of 3 to 7 kHz noise at 0.05, 4 % of 100 Hz ripple); a 700 Hz high-pass and a 9.5 kHz low-pass; then, for `small` and `large`, convolution with a synthesised impulse response (early reflections and two-band exponentially decaying noise), added to the dry beep at the room's wet gain. Mono, 48 kHz, MP3 (LAME VBR `-q:a 2`).

Loudness: every dry beep is brought to -7.68 dB K-weighted RMS (ITU-R BS.1770 weighting) over its sounding part only (a loop over one cycle's), the one level chosen so that the loudest file in the library peaks at -1 dBFS once decoded. Each `small` and `large` file keeps its dry file's gain, so the beep is as loud in every room and only the tail is added; its `loudness` is its direct part's, `soundingLoudness` (in `manifest.json`) the whole file's over the same sounding part. The game's caller gives each event its level.

Loops (`countdown`, `hurry`, `warning`, `alarm`) are exactly one cycle long, cut from the steady state of many cycles, so the reverb's tail is wrapped round onto the start and the loop joins without a click when held.

Checks, run on every file after decoding: it sounds within 2 ms of its first beep (`ready` begins with 50 ms of silence by design); it peaks at most -1 dBFS; a loop's end runs into its start without a step.

## Pitches

| Pitch  | Drive   | Character                                                                 |
| ------ | ------- | ------------------------------------------------------------------------- |
| `low`  | 1.3 kHz | Off resonance; its third harmonic lands on the plate's mode: nasal, buzzy |
| `mid`  | 2.4 kHz | Between the port and the plate: fuller, a little rough                    |
| `high` | 3.9 kHz | On resonance: the loudest, nearly pure, piercing                          |

A two-tone cadence's second tone is the pitch times 0.84.

## Meanings

| Meaning           | Cadence                                                                                                                        | For                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `entry`           | 1 beep of 35 ms at 0 ms                                                                                                        | A key pressed, a card presented                                             |
| `confirm`         | 2 beeps of 70 ms at 0, 120 ms                                                                                                  | A value stored, a command accepted, a card read and accepted                |
| `done`            | 1 beep of 300 ms at 0 ms                                                                                                       | A longer action finished, an arming or a mode change completed              |
| `error`           | 3 beeps of 90 ms at 0, 150, 300 ms                                                                                             | A key not allowed now, a limit reached                                      |
| `deny`            | 1 beep of 550 ms at 0 ms                                                                                                       | A wrong code, a card refused, LOCAL CONTROL ONLY                            |
| `ready`           | 1 beep of 150 ms at 50 ms                                                                                                      | A controller coming online after its self-test                              |
| `fault`           | 3 beeps of 150 ms at 0, 300, 600 ms                                                                                            | A controller's fault on power-up or in running                              |
| `priority-high`   | 10 beeps of 100 ms at 0, 175, 350, 700, 875, 1475, 1650, 1825, 2175, 2350 ms                                                   | A grave alarm, repeated by the caller                                       |
| `priority-medium` | 3 beeps of 200 ms at 0, 350, 700 ms                                                                                            | A caution, repeated by the caller                                           |
| `countdown`       | 1 beep of 60 ms at 0 ms, a 1 s loop                                                                                            | An entry or exit delay, a timed action running                              |
| `hurry`           | 4 beeps of 60 ms at 0, 250, 500, 750 ms, a 1 s loop                                                                            | The last seconds of a countdown                                             |
| `warning`         | 2 beeps of 250 ms at 0, 500 ms, a 1 s loop                                                                                     | A condition needing attention, until acknowledged                           |
| `buffer-full`     | 11 beeps of 70 ms at 0, 90.909, 181.818, 272.727, 363.636, 454.545, 545.455, 636.364, 727.273, 818.182, 909.091 ms, a 1 s loop | A key held too long, the keyboard buffer full: a crashed computer's beeping |
| `alarm`           | 4 beeps of 62.5 ms at 0, 62.5 (x0.84), 125, 187.5 (x0.84) ms, a 0.25 s loop                                                    | An alarm sounding until silenced                                            |

## Rooms

| Room    | RT60   | Predelay | Early spread | Wet  |
| ------- | ------ | -------- | ------------ | ---- |
| `dry`   | none   |          |              |      |
| `small` | 0.35 s | 3 ms     | 12 ms        | 0.35 |
| `large` | 2.2 s  | 22 ms    | 60 ms        | 0.55 |

## Files

| File                                                                         | Meaning         | Pitch | Room  | Seconds | Loop   | Loudness dB | Peak dBFS |
| ---------------------------------------------------------------------------- | --------------- | ----- | ----- | ------- | ------ | ----------- | --------- |
| [piezo_entry_low_dry.mp3](piezo_entry_low_dry.mp3)                           | entry           | low   | dry   | 0.09    |        | -7.68       | -4.96     |
| [piezo_entry_low_small.mp3](piezo_entry_low_small.mp3)                       | entry           | low   | small | 0.30    |        | -7.68       | -5.33     |
| [piezo_entry_low_large.mp3](piezo_entry_low_large.mp3)                       | entry           | low   | large | 1.65    |        | -7.68       | -5.06     |
| [piezo_entry_mid_dry.mp3](piezo_entry_mid_dry.mp3)                           | entry           | mid   | dry   | 0.09    |        | -7.68       | -4.75     |
| [piezo_entry_mid_small.mp3](piezo_entry_mid_small.mp3)                       | entry           | mid   | small | 0.35    |        | -7.68       | -4.41     |
| [piezo_entry_mid_large.mp3](piezo_entry_mid_large.mp3)                       | entry           | mid   | large | 1.82    |        | -7.68       | -4.70     |
| [piezo_entry_high_dry.mp3](piezo_entry_high_dry.mp3)                         | entry           | high  | dry   | 0.09    |        | -7.68       | -7.43     |
| [piezo_entry_high_small.mp3](piezo_entry_high_small.mp3)                     | entry           | high  | small | 0.28    |        | -7.68       | -7.78     |
| [piezo_entry_high_large.mp3](piezo_entry_high_large.mp3)                     | entry           | high  | large | 1.56    |        | -7.68       | -7.41     |
| [piezo_confirm_low_dry.mp3](piezo_confirm_low_dry.mp3)                       | confirm         | low   | dry   | 0.24    |        | -7.68       | -4.88     |
| [piezo_confirm_low_small.mp3](piezo_confirm_low_small.mp3)                   | confirm         | low   | small | 0.44    |        | -7.68       | -5.31     |
| [piezo_confirm_low_large.mp3](piezo_confirm_low_large.mp3)                   | confirm         | low   | large | 1.99    |        | -7.68       | -4.67     |
| [piezo_confirm_mid_dry.mp3](piezo_confirm_mid_dry.mp3)                       | confirm         | mid   | dry   | 0.24    |        | -7.68       | -4.71     |
| [piezo_confirm_mid_small.mp3](piezo_confirm_mid_small.mp3)                   | confirm         | mid   | small | 0.51    |        | -7.68       | -4.29     |
| [piezo_confirm_mid_large.mp3](piezo_confirm_mid_large.mp3)                   | confirm         | mid   | large | 2.12    |        | -7.68       | -3.96     |
| [piezo_confirm_high_dry.mp3](piezo_confirm_high_dry.mp3)                     | confirm         | high  | dry   | 0.24    |        | -7.68       | -7.43     |
| [piezo_confirm_high_small.mp3](piezo_confirm_high_small.mp3)                 | confirm         | high  | small | 0.43    |        | -7.68       | -7.74     |
| [piezo_confirm_high_large.mp3](piezo_confirm_high_large.mp3)                 | confirm         | high  | large | 1.74    |        | -7.68       | -6.18     |
| [piezo_done_low_dry.mp3](piezo_done_low_dry.mp3)                             | done            | low   | dry   | 0.35    |        | -7.68       | -4.95     |
| [piezo_done_low_small.mp3](piezo_done_low_small.mp3)                         | done            | low   | small | 0.55    |        | -7.68       | -5.45     |
| [piezo_done_low_large.mp3](piezo_done_low_large.mp3)                         | done            | low   | large | 2.04    |        | -7.68       | -4.02     |
| [piezo_done_mid_dry.mp3](piezo_done_mid_dry.mp3)                             | done            | mid   | dry   | 0.35    |        | -7.68       | -4.70     |
| [piezo_done_mid_small.mp3](piezo_done_mid_small.mp3)                         | done            | mid   | small | 0.62    |        | -7.68       | -4.31     |
| [piezo_done_mid_large.mp3](piezo_done_mid_large.mp3)                         | done            | mid   | large | 2.26    |        | -7.68       | -3.65     |
| [piezo_done_high_dry.mp3](piezo_done_high_dry.mp3)                           | done            | high  | dry   | 0.35    |        | -7.68       | -7.43     |
| [piezo_done_high_small.mp3](piezo_done_high_small.mp3)                       | done            | high  | small | 0.57    |        | -7.68       | -7.97     |
| [piezo_done_high_large.mp3](piezo_done_high_large.mp3)                       | done            | high  | large | 1.84    |        | -7.68       | -5.50     |
| [piezo_error_low_dry.mp3](piezo_error_low_dry.mp3)                           | error           | low   | dry   | 0.44    |        | -7.68       | -4.86     |
| [piezo_error_low_small.mp3](piezo_error_low_small.mp3)                       | error           | low   | small | 0.64    |        | -7.68       | -5.14     |
| [piezo_error_low_large.mp3](piezo_error_low_large.mp3)                       | error           | low   | large | 2.01    |        | -7.68       | -4.28     |
| [piezo_error_mid_dry.mp3](piezo_error_mid_dry.mp3)                           | error           | mid   | dry   | 0.44    |        | -7.68       | -4.70     |
| [piezo_error_mid_small.mp3](piezo_error_mid_small.mp3)                       | error           | mid   | small | 0.71    |        | -7.68       | -4.12     |
| [piezo_error_mid_large.mp3](piezo_error_mid_large.mp3)                       | error           | mid   | large | 2.41    |        | -7.68       | -3.98     |
| [piezo_error_high_dry.mp3](piezo_error_high_dry.mp3)                         | error           | high  | dry   | 0.44    |        | -7.68       | -7.44     |
| [piezo_error_high_small.mp3](piezo_error_high_small.mp3)                     | error           | high  | small | 0.63    |        | -7.68       | -7.77     |
| [piezo_error_high_large.mp3](piezo_error_high_large.mp3)                     | error           | high  | large | 2.01    |        | -7.68       | -6.04     |
| [piezo_deny_low_dry.mp3](piezo_deny_low_dry.mp3)                             | deny            | low   | dry   | 0.60    |        | -7.68       | -4.98     |
| [piezo_deny_low_small.mp3](piezo_deny_low_small.mp3)                         | deny            | low   | small | 0.80    |        | -7.68       | -5.32     |
| [piezo_deny_low_large.mp3](piezo_deny_low_large.mp3)                         | deny            | low   | large | 2.28    |        | -7.68       | -4.14     |
| [piezo_deny_mid_dry.mp3](piezo_deny_mid_dry.mp3)                             | deny            | mid   | dry   | 0.60    |        | -7.68       | -4.60     |
| [piezo_deny_mid_small.mp3](piezo_deny_mid_small.mp3)                         | deny            | mid   | small | 0.86    |        | -7.68       | -4.22     |
| [piezo_deny_mid_large.mp3](piezo_deny_mid_large.mp3)                         | deny            | mid   | large | 2.51    |        | -7.68       | -3.48     |
| [piezo_deny_high_dry.mp3](piezo_deny_high_dry.mp3)                           | deny            | high  | dry   | 0.60    |        | -7.68       | -7.42     |
| [piezo_deny_high_small.mp3](piezo_deny_high_small.mp3)                       | deny            | high  | small | 0.82    |        | -7.68       | -7.77     |
| [piezo_deny_high_large.mp3](piezo_deny_high_large.mp3)                       | deny            | high  | large | 2.09    |        | -7.68       | -5.47     |
| [piezo_ready_low_dry.mp3](piezo_ready_low_dry.mp3)                           | ready           | low   | dry   | 0.25    |        | -7.68       | -5.02     |
| [piezo_ready_low_small.mp3](piezo_ready_low_small.mp3)                       | ready           | low   | small | 0.45    |        | -7.68       | -5.28     |
| [piezo_ready_low_large.mp3](piezo_ready_low_large.mp3)                       | ready           | low   | large | 1.80    |        | -7.68       | -4.23     |
| [piezo_ready_mid_dry.mp3](piezo_ready_mid_dry.mp3)                           | ready           | mid   | dry   | 0.25    |        | -7.68       | -4.77     |
| [piezo_ready_mid_small.mp3](piezo_ready_mid_small.mp3)                       | ready           | mid   | small | 0.52    |        | -7.68       | -4.39     |
| [piezo_ready_mid_large.mp3](piezo_ready_mid_large.mp3)                       | ready           | mid   | large | 2.15    |        | -7.68       | -4.09     |
| [piezo_ready_high_dry.mp3](piezo_ready_high_dry.mp3)                         | ready           | high  | dry   | 0.25    |        | -7.68       | -7.48     |
| [piezo_ready_high_small.mp3](piezo_ready_high_small.mp3)                     | ready           | high  | small | 0.47    |        | -7.68       | -7.94     |
| [piezo_ready_high_large.mp3](piezo_ready_high_large.mp3)                     | ready           | high  | large | 1.73    |        | -7.68       | -5.54     |
| [piezo_fault_low_dry.mp3](piezo_fault_low_dry.mp3)                           | fault           | low   | dry   | 0.80    |        | -7.68       | -4.99     |
| [piezo_fault_low_small.mp3](piezo_fault_low_small.mp3)                       | fault           | low   | small | 1.00    |        | -7.68       | -5.24     |
| [piezo_fault_low_large.mp3](piezo_fault_low_large.mp3)                       | fault           | low   | large | 2.55    |        | -7.68       | -4.10     |
| [piezo_fault_mid_dry.mp3](piezo_fault_mid_dry.mp3)                           | fault           | mid   | dry   | 0.80    |        | -7.68       | -4.71     |
| [piezo_fault_mid_small.mp3](piezo_fault_mid_small.mp3)                       | fault           | mid   | small | 1.06    |        | -7.68       | -4.30     |
| [piezo_fault_mid_large.mp3](piezo_fault_mid_large.mp3)                       | fault           | mid   | large | 2.73    |        | -7.68       | -4.11     |
| [piezo_fault_high_dry.mp3](piezo_fault_high_dry.mp3)                         | fault           | high  | dry   | 0.80    |        | -7.68       | -7.44     |
| [piezo_fault_high_small.mp3](piezo_fault_high_small.mp3)                     | fault           | high  | small | 1.02    |        | -7.68       | -7.87     |
| [piezo_fault_high_large.mp3](piezo_fault_high_large.mp3)                     | fault           | high  | large | 2.28    |        | -7.68       | -5.57     |
| [piezo_priority-high_low_dry.mp3](piezo_priority-high_low_dry.mp3)           | priority-high   | low   | dry   | 2.50    |        | -7.68       | -4.83     |
| [piezo_priority-high_low_small.mp3](piezo_priority-high_low_small.mp3)       | priority-high   | low   | small | 2.70    |        | -7.68       | -5.30     |
| [piezo_priority-high_low_large.mp3](piezo_priority-high_low_large.mp3)       | priority-high   | low   | large | 4.13    |        | -7.68       | -3.55     |
| [piezo_priority-high_mid_dry.mp3](piezo_priority-high_mid_dry.mp3)           | priority-high   | mid   | dry   | 2.50    |        | -7.68       | -4.66     |
| [piezo_priority-high_mid_small.mp3](piezo_priority-high_mid_small.mp3)       | priority-high   | mid   | small | 2.76    |        | -7.68       | -4.10     |
| [piezo_priority-high_mid_large.mp3](piezo_priority-high_mid_large.mp3)       | priority-high   | mid   | large | 4.43    |        | -7.68       | -3.90     |
| [piezo_priority-high_high_dry.mp3](piezo_priority-high_high_dry.mp3)         | priority-high   | high  | dry   | 2.50    |        | -7.68       | -7.35     |
| [piezo_priority-high_high_small.mp3](piezo_priority-high_high_small.mp3)     | priority-high   | high  | small | 2.70    |        | -7.68       | -7.54     |
| [piezo_priority-high_high_large.mp3](piezo_priority-high_high_large.mp3)     | priority-high   | high  | large | 4.10    |        | -7.68       | -5.69     |
| [piezo_priority-medium_low_dry.mp3](piezo_priority-medium_low_dry.mp3)       | priority-medium | low   | dry   | 0.95    |        | -7.68       | -4.85     |
| [piezo_priority-medium_low_small.mp3](piezo_priority-medium_low_small.mp3)   | priority-medium | low   | small | 1.15    |        | -7.68       | -5.23     |
| [piezo_priority-medium_low_large.mp3](piezo_priority-medium_low_large.mp3)   | priority-medium | low   | large | 2.70    |        | -7.68       | -4.08     |
| [piezo_priority-medium_mid_dry.mp3](piezo_priority-medium_mid_dry.mp3)       | priority-medium | mid   | dry   | 0.95    |        | -7.68       | -4.51     |
| [piezo_priority-medium_mid_small.mp3](piezo_priority-medium_mid_small.mp3)   | priority-medium | mid   | small | 1.20    |        | -7.68       | -4.12     |
| [piezo_priority-medium_mid_large.mp3](piezo_priority-medium_mid_large.mp3)   | priority-medium | mid   | large | 2.85    |        | -7.68       | -3.72     |
| [piezo_priority-medium_high_dry.mp3](piezo_priority-medium_high_dry.mp3)     | priority-medium | high  | dry   | 0.95    |        | -7.68       | -7.32     |
| [piezo_priority-medium_high_small.mp3](piezo_priority-medium_high_small.mp3) | priority-medium | high  | small | 1.17    |        | -7.68       | -7.79     |
| [piezo_priority-medium_high_large.mp3](piezo_priority-medium_high_large.mp3) | priority-medium | high  | large | 2.46    |        | -7.68       | -5.48     |
| [piezo_countdown_low_dry.mp3](piezo_countdown_low_dry.mp3)                   | countdown       | low   | dry   | 1.00    | 1 s    | -7.68       | -5.06     |
| [piezo_countdown_low_small.mp3](piezo_countdown_low_small.mp3)               | countdown       | low   | small | 1.00    | 1 s    | -7.68       | -5.35     |
| [piezo_countdown_low_large.mp3](piezo_countdown_low_large.mp3)               | countdown       | low   | large | 1.00    | 1 s    | -7.68       | -5.24     |
| [piezo_countdown_mid_dry.mp3](piezo_countdown_mid_dry.mp3)                   | countdown       | mid   | dry   | 1.00    | 1 s    | -7.68       | -4.76     |
| [piezo_countdown_mid_small.mp3](piezo_countdown_mid_small.mp3)               | countdown       | mid   | small | 1.00    | 1 s    | -7.68       | -4.20     |
| [piezo_countdown_mid_large.mp3](piezo_countdown_mid_large.mp3)               | countdown       | mid   | large | 1.00    | 1 s    | -7.68       | -4.61     |
| [piezo_countdown_high_dry.mp3](piezo_countdown_high_dry.mp3)                 | countdown       | high  | dry   | 1.00    | 1 s    | -7.68       | -7.37     |
| [piezo_countdown_high_small.mp3](piezo_countdown_high_small.mp3)             | countdown       | high  | small | 1.00    | 1 s    | -7.68       | -7.90     |
| [piezo_countdown_high_large.mp3](piezo_countdown_high_large.mp3)             | countdown       | high  | large | 1.00    | 1 s    | -7.68       | -7.35     |
| [piezo_hurry_low_dry.mp3](piezo_hurry_low_dry.mp3)                           | hurry           | low   | dry   | 1.00    | 1 s    | -7.68       | -4.86     |
| [piezo_hurry_low_small.mp3](piezo_hurry_low_small.mp3)                       | hurry           | low   | small | 1.00    | 1 s    | -7.68       | -5.20     |
| [piezo_hurry_low_large.mp3](piezo_hurry_low_large.mp3)                       | hurry           | low   | large | 1.00    | 1 s    | -7.68       | -4.84     |
| [piezo_hurry_mid_dry.mp3](piezo_hurry_mid_dry.mp3)                           | hurry           | mid   | dry   | 1.00    | 1 s    | -7.68       | -4.56     |
| [piezo_hurry_mid_small.mp3](piezo_hurry_mid_small.mp3)                       | hurry           | mid   | small | 1.00    | 1 s    | -7.68       | -4.23     |
| [piezo_hurry_mid_large.mp3](piezo_hurry_mid_large.mp3)                       | hurry           | mid   | large | 1.00    | 1 s    | -7.68       | -4.30     |
| [piezo_hurry_high_dry.mp3](piezo_hurry_high_dry.mp3)                         | hurry           | high  | dry   | 1.00    | 1 s    | -7.68       | -7.36     |
| [piezo_hurry_high_small.mp3](piezo_hurry_high_small.mp3)                     | hurry           | high  | small | 1.00    | 1 s    | -7.68       | -7.74     |
| [piezo_hurry_high_large.mp3](piezo_hurry_high_large.mp3)                     | hurry           | high  | large | 1.00    | 1 s    | -7.68       | -7.52     |
| [piezo_warning_low_dry.mp3](piezo_warning_low_dry.mp3)                       | warning         | low   | dry   | 1.00    | 1 s    | -7.68       | -4.76     |
| [piezo_warning_low_small.mp3](piezo_warning_low_small.mp3)                   | warning         | low   | small | 1.00    | 1 s    | -7.68       | -5.39     |
| [piezo_warning_low_large.mp3](piezo_warning_low_large.mp3)                   | warning         | low   | large | 1.00    | 1 s    | -7.68       | -4.12     |
| [piezo_warning_mid_dry.mp3](piezo_warning_mid_dry.mp3)                       | warning         | mid   | dry   | 1.00    | 1 s    | -7.68       | -4.69     |
| [piezo_warning_mid_small.mp3](piezo_warning_mid_small.mp3)                   | warning         | mid   | small | 1.00    | 1 s    | -7.68       | -4.16     |
| [piezo_warning_mid_large.mp3](piezo_warning_mid_large.mp3)                   | warning         | mid   | large | 1.00    | 1 s    | -7.68       | -3.88     |
| [piezo_warning_high_dry.mp3](piezo_warning_high_dry.mp3)                     | warning         | high  | dry   | 1.00    | 1 s    | -7.68       | -7.38     |
| [piezo_warning_high_small.mp3](piezo_warning_high_small.mp3)                 | warning         | high  | small | 1.00    | 1 s    | -7.68       | -7.90     |
| [piezo_warning_high_large.mp3](piezo_warning_high_large.mp3)                 | warning         | high  | large | 1.00    | 1 s    | -7.68       | -5.41     |
| [piezo_buffer-full_low_dry.mp3](piezo_buffer-full_low_dry.mp3)               | buffer-full     | low   | dry   | 1.00    | 1 s    | -7.68       | -4.79     |
| [piezo_buffer-full_low_small.mp3](piezo_buffer-full_low_small.mp3)           | buffer-full     | low   | small | 1.00    | 1 s    | -7.68       | -4.57     |
| [piezo_buffer-full_low_large.mp3](piezo_buffer-full_low_large.mp3)           | buffer-full     | low   | large | 1.00    | 1 s    | -7.68       | -4.66     |
| [piezo_buffer-full_mid_dry.mp3](piezo_buffer-full_mid_dry.mp3)               | buffer-full     | mid   | dry   | 1.00    | 1 s    | -7.68       | -4.45     |
| [piezo_buffer-full_mid_small.mp3](piezo_buffer-full_mid_small.mp3)           | buffer-full     | mid   | small | 1.00    | 1 s    | -7.68       | -3.98     |
| [piezo_buffer-full_mid_large.mp3](piezo_buffer-full_mid_large.mp3)           | buffer-full     | mid   | large | 1.00    | 1 s    | -7.68       | -5.00     |
| [piezo_buffer-full_high_dry.mp3](piezo_buffer-full_high_dry.mp3)             | buffer-full     | high  | dry   | 1.00    | 1 s    | -7.68       | -7.39     |
| [piezo_buffer-full_high_small.mp3](piezo_buffer-full_high_small.mp3)         | buffer-full     | high  | small | 1.00    | 1 s    | -7.68       | -7.49     |
| [piezo_buffer-full_high_large.mp3](piezo_buffer-full_high_large.mp3)         | buffer-full     | high  | large | 1.00    | 1 s    | -7.68       | -7.81     |
| [piezo_alarm_low_dry.mp3](piezo_alarm_low_dry.mp3)                           | alarm           | low   | dry   | 0.25    | 0.25 s | -7.68       | -2.98     |
| [piezo_alarm_low_small.mp3](piezo_alarm_low_small.mp3)                       | alarm           | low   | small | 0.25    | 0.25 s | -7.68       | -2.56     |
| [piezo_alarm_low_large.mp3](piezo_alarm_low_large.mp3)                       | alarm           | low   | large | 0.25    | 0.25 s | -7.68       | -1.07     |
| [piezo_alarm_mid_dry.mp3](piezo_alarm_mid_dry.mp3)                           | alarm           | mid   | dry   | 0.25    | 0.25 s | -7.68       | -4.50     |
| [piezo_alarm_mid_small.mp3](piezo_alarm_mid_small.mp3)                       | alarm           | mid   | small | 0.25    | 0.25 s | -7.68       | -3.50     |
| [piezo_alarm_mid_large.mp3](piezo_alarm_mid_large.mp3)                       | alarm           | mid   | large | 0.25    | 0.25 s | -7.68       | -2.80     |
| [piezo_alarm_high_dry.mp3](piezo_alarm_high_dry.mp3)                         | alarm           | high  | dry   | 0.25    | 0.25 s | -7.68       | -5.09     |
| [piezo_alarm_high_small.mp3](piezo_alarm_high_small.mp3)                     | alarm           | high  | small | 0.25    | 0.25 s | -7.68       | -4.77     |
| [piezo_alarm_high_large.mp3](piezo_alarm_high_large.mp3)                     | alarm           | high  | large | 0.25    | 0.25 s | -7.68       | -3.30     |
