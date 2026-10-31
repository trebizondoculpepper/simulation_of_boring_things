# 114: when the Dr Aqualis Trio crashes

The owner, 2026-10-31: one of the game's failure modes is the Trio's operating system crashing. It runs on a Vista-like embedded OS (the boot sequences' `gui` family) because that OS was notoriously unreliable. When it crashes, the controller goes offline and its dosing outputs lock: on, or off, either is possible. The screen shows the crash: a blue screen of death, or a total glitch, the LCD full of binary gibberish as though a buffer overflow were writing into the display's registers. This plan sets out how; nothing is built yet.

## The owner's rulings (2026-10-31)

- **It never crashes on its own.** Crashing belongs to a game mode of scenarios in which specific things go wrong, designed later; a scenario makes it crash. There is no uptime hazard, so the "How often" section below is superseded.
- **Two failure modes in dev58**, each forced from its crash board:
  - **Blue screen**: the stop screen; the outputs **hold** whatever they were sending when it crashed. Bad, but predictable.
  - **Glitch**: the buffer-overflow screen; the outputs go **random**, each channel's signal jumping to new values as the glitch's bursts come, so pumps lurch between stopped and flat out. Much the worse.
- **The watchdog is the trigger's choice** (a heartbeat monitor that does not always work): each forced crash, blue screen or glitch, is triggered with the watchdog either working (it drops the release contacts, so nothing doses, and lights CONTROLLER FAULT on the annunciator) or not (the outputs hold or go random, and the annunciator says nothing). dev58's crash board has a WATCHDOG WORKS / FAILS switch beside its two crash buttons; scenarios set it as they need.
- The freeze and the reboot loop, and the off, full and mixed behaviours below, stay ideas on file for later scenarios.

## What crashes, and what the plant sees

The cabinet's computer has four states: off, booting (the boot sequence), running, and crashed. Crashed has a kind and an output behaviour, chosen when it crashes (seeded, so a given crash replays the same).

| Kind                              | The screen                                                                                                                                                                                                                                        | How it ends                                                                                                                                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Stop screen** (the blue screen) | The parody OS's blue stop screen: a technical STOP code, a stuck driver's name (`AQDOSE.SYS`, `CLRDOSE_USB.SYS`, `DRAQUALIS_ANIM.DLL`), "Collecting data for crash dump…" with a percentage that counts up, then sometimes stops.                 | Some reboot on their own after the dump (the boot sequence again, then the parody "Windows did not shut down successfully" choice and a disk check); some hang on the blue screen until power-cycled. |
| **Glitch** (the buffer overflow)  | The panel's contents wrecked: rows of hex and binary, smeared fragments of the last good page repeated and offset, broken glyphs, colour bars, stuck stripes; it changes in bursts, as though something were still writing into the frame buffer. | Hangs until power-cycled.                                                                                                                                                                             |
| **Freeze**                        | The last good frame, frozen: Dr Aqualis stopped mid-blink, the clock stopped, the touch screen dead. The subtlest: everything looks fine until the player notices nothing changes.                                                                | Hangs until power-cycled.                                                                                                                                                                             |
| **Reboot loop**                   | The boot sequence over and over, failing at the same point.                                                                                                                                                                                       | Until power-cycled at the right moment, or until its cause is cleared (a later mission may give it one).                                                                                              |

What the dosing systems see, through the control ports agreed earlier (4–20 mA and a release contact per port, the pump's fault and mode wired back):

- **Held**: each output frozen at its last value. A pump that was dosing keeps dosing at that rate, however the water changes. The commonest real failure, and the most dangerous: chlorine climbs, or pH falls, unchecked.
- **Off**: outputs drop to 4 mA and the release contacts open. Nothing doses; the water drifts slowly (chlorine falls under the bathers' load, pH rises).
- **Full**: outputs driven to 20 mA (a register overwritten with all ones). Every connected pump runs flat out. Rare, dramatic, and the reason pools have independent high-chlorine and low-pH interlocks.
- **Mixed**: each channel independently held, off or full, as a glitch scatters bits.

The cabinet's watchdog relay should drop the release contacts when the computer stops answering; in this OS's world it sometimes does (the outputs go off, and a CONTROLLER FAULT window lights on the annunciator) and sometimes does not (held, full or mixed, and nothing tells the control room).

## What the player sees and does

- **Clues:** the screen itself, if anyone looks; the pumps' own displays still show their state (running at a fixed rate, or stopped); the water drifting on the poolside readings and the chart recorders; the annunciator's chlorine and pH windows once the water goes out (but not the cabinet's own alarms, which died with it, unless the watchdog worked).
- **Making it safe:** at each pump, its own selector to OFF or MANUAL (a local control, so it means going there); the CO₂ valve's isolator.
- **Restarting:** the cabinet's power isolator, off and on, then the long boot. There is no software reset: the touch screen is dead.
- **Afterwards:** the parody "did not shut down successfully" screen, Dr Aqualis's apology ("Terribly sorry: I seem to have had a funny turn."), and his advice for the water the crash left.

## How often (superseded: see the owner's rulings)

A failure mode, not a constant nuisance. Proposed: a hazard that grows with uptime (a memory leak, the joke being that it needs restarting every few days), set so a cabinet left alone crashes about once every few game days; scenarios and dev58 can force one. Uptime is reset by any restart, so a careful operator who reboots it on the weekly schedule rarely sees it. The rates are for the owner to set.

## The model (pure)

- `aqualis-os.ts`: the computer's state (phase, uptime, crash kind, output behaviour, its seed) and its step: booting into running, the hazard, crashing, a stop screen's dump and reboot, power off and on. Tested.
- The controller's demands pass through it: running, the controller's own; booting, none (the inhibit the boot work already holds); crashed, the latched, zero, full or mixed outputs. The watchdog's result decides whether the alarm output reports CONTROLLER FAULT.
- In the plant it lives in the world state (`WORLD_VERSION` bumped, a migration) when the Trio is installed; in dev58 in its host, with a CRASH board: one button per kind and per output behaviour, and the isolator.

## The screens

- **Stop screen:** a drawer for the parody OS's blue screen at 640 × 480, its text from data, its percentage the only thing that moves (redrawn as it changes, about once a second).
- **Glitch:** the buffer-overflow art. Its design is given to Codex (the owner asked): a drawer taking the last good frame's canvas and a seed, painting the wreckage; and a burst schedule, so it changes a few times a second during a burst and holds still between bursts, within the bench's budget.
- **Freeze:** no drawing at all: the gate simply stops. Free.
- **Reboot loop:** the boot sequence's drawers, failing at a set step.

## Questions for the owner, one at a time

- The crash rate, and whether a weekly restart should keep it away.
- Whether the watchdog should work more often than not.
- Whether the full-output crash belongs (it is dramatic and real, but a pool would usually have interlocks the game does not model yet).
