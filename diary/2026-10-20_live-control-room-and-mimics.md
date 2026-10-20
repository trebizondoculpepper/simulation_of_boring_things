# Development Diary Entry - 2026-10-20

## Context

| Time      | Branch | Commit        | Task                                                |
| --------- | ------ | ------------- | --------------------------------------------------- |
| 09:30 UTC | main   | after c973207 | Live control room, period instruments, mimic boards |

## What we were asked to do

The owner set the control systems' aesthetic: about 25 years obsolete, many single-purpose instruments rather than one screen, so that the player moves round the plant; the control room is where problems are diagnosed, but fixing them means going to the room concerned. Every engineering item must be a real, working component, and new controls are tried in dev0 first. The BBC Micro and Cub monitor were to be the go-to simple display, the VX3 line printer the alarm printer, and the mimic board became a reusable kind of panel with inset LEDs, readouts and mode buttons.

## What we did

Recorded those rules in `AGENTS.md`. Let plant development rooms hold working exhibits (`LiveExhibit`: parts that take clicks, an update each frame). Copied the BBC Micro, Cub monitor, disk drive and workstation, and the teleprinter, from the Encabulator. Wrote a scripted plant scenario (`control-room-demo.ts`) to feed the instruments until the plant is simulated, and rebuilt dev_control from live parts: the BBC running POOLMON pages, the line printer logging every alarm with its room, an ISA sequence M annunciator with working buttons, strip and circular chart recorders, LED readouts and ammeters, and a CRT for the CCTV. Made the mimic board data-driven (`logic/mimic.ts`, `views/mimic-board.ts`), tried it on a new dev0 MIMIC PANEL board beside a PERIOD INSTRUMENTS board, and gave the control room boards for the main pool, heating and air handling (`pool-mimics.ts`). Gave the seven-segment display a real decimal point.

## Outcome

All five checks pass (459 tests); every board and instrument was checked in the browser. Still static in dev_control: the outstation cabinet, chemical controller display, fire repeater, poolside alarm and test kit; the other equipment rooms' gauges and controls are not yet live. The mimic boards' LCD legends and button labels are too small to read from a normal distance.

## What we learned

A data-driven board (layout plus a state function per display mode) makes each new system's panel a small, testable piece of data rather than new drawing code. Reusing the Encabulator's period hardware (BBC, Cub, teleprinter) was quicker and more in keeping than new models.
