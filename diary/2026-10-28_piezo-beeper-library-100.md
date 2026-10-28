# Development Diary Entry - 2026-10-28

## Context

- **Date**: 2026-10-28 14:30 UTC
- **Branch**: main
- **Commit**: see `git log --grep "100:"`
- **Contributors**: Claude Code + the owner

## Problem Statement

The owner asked "can we give button pushes a credible piezo bleep", and mission 100 set out how: a library of beeps from one cheap piezo sounder, selectable by pitch, meaning and reverb, synthesised from scratch, with a typed lookup in code and a place to hear them in the game. Another agent (mission 102) was working on the dosing pumps at the same time and will wire their key bleeps itself, so the API had to be easy to call from a key press and the pumps' files left alone.

## Our Approach

Start from the research prototype (`piezo.py`, which the owner had heard) and rewrite it as the library's generator, `resources/sound/effects/piezo/generate.py`: the same chain (band-limited pulse drive, three resonances, soft clip, fascia, band limit, convolution with a synthesised room), every cadence the prompt lists, all three pitches and rooms, loudness matched over the sounding part only, and checks on the decoded MP3s. Pre-render rather than synthesise at run time, so the existing `recording` recipe and `recordedLoop` play them.

## Implementation

- `generate.py` renders 13 meanings x 3 pitches x 3 rooms = 117 MP3s (1.8 MB), `index.md`, `index.html` (players) and `manifest.json`. One library gain puts the loudest file (the low alarm in the large room, whose warble builds up its reverb) at -1 dBFS after decoding, giving -7.68 dB K-weighted for every dry beep. Loops are cut from the steady state of an exactly periodic render (one cycle's drive and rattle noise tiled), so the reverb's tail is wrapped onto the start and the join is seamless; Chrome decodes the 0.25 s alarm to exactly 12,000 samples, so LAME's gapless tag is honoured. ffmpeg's bitexact flags make a rerun byte-identical.
- `sound/logic/piezo-beeps.ts` (axes, loops and their cycles, file names, levels) and `sound/audio/piezo-recordings.ts` (`piezoBeep`, `piezoLoop`, `playPiezo`, `piezoSounder`), the files found by `import.meta.glob`, with tests that check the logic against `manifest.json` (loudness within 0.5 dB, peaks, onsets, whole-cycle loops) and against the bundled files.
- `gallery/views/piezo-test-set.ts` and `sound/logic/piezo-test-set.ts`: a PZ-27 sounder on a Penfold bench controller in the middle of dev7, with PITCH, MEANING (13 detents) and ROOM selectors, a two-line readout and a lit TEST button; a loop is held until TEST is pressed again, following PITCH and ROOM as they are turned.

## Outcomes

- The spectra came out as the research predicted: the low beep's third harmonic, on the plate's mode, is 12 dB above its fundamental; the high beep is nearly pure.
- `ready` begins with 50 ms of silence by the prompt's design, so its onset check allows for that.
- A room's version keeps its dry gain, so its direct part is exactly as loud; over the sounding part the whole file is up to about 0.4 dB louder with its reverb, and the continuous low alarm in the large room 0.9 dB.
- Formatting must use `vp fmt` (single quotes), not a bare `prettier`.

## Next Steps

The owner to tune the cadences by ear and choose, one at a time, which candidate devices switch to the library (TODO.md). The pump agent wires the dosing pumps' keys.
