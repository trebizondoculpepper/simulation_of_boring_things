# 072: The Lidoluxe Wash-O-Tron, an automatic filter wash controller

Status: not started (written 2026-10-26; rewritten the same day as the Wash-O-Tron).

## The request

The owner, 2026-10-26, watching a filter washed by a script: "there needs to be an automatic washing program … controlled from one of the boards … a secondary board that was added later in the history of the swimming pool, and it controls the pumps and valves and gets them to do washing on a cycle." Then: "the Lido Lux Wash O-tron. It is a specific control system designed to automate the washing schedules of Lido Lux filter beds", "sort of like another mimic": a cluster of controls for each filter to set its state with a push button, a two-line LCD with a display mode button that toggles through its views, plus and minus to set parameters, and main controls. It is wanted in two places (the Olympic's plant room and the control room), so illuminated push buttons wherever possible, not switches or knobs, which imply purely local control.

## What there is now (checked 2026-10-26)

- **The Olympic's five filters** (`src/game/plant/olympic-battery.ts`), Lidoluxe vessels: each a five-valve filter (V1 inlet, V2 outlet, V3 backwash in, V4 backwash out, V5 rinse; `PL2-F<n>-V<k>`) and its vessel drain (DV1), each valve an installed valve in the world worked by `plant/valve`; the bed's dirt, fissuring and unsettledness in `world.olympic`. A wash is done by hand, valve by valve: backwash (V1, V2 shut; V3, V4 open) until clean, rinse (V3, V4 shut; V1, V5 open) until settled, filter (V5 shut; V2 open). A 161% bed takes about 4½ minutes' backwash to clean; a rinse about 3 minutes to settle.
- **The valves travel** at their actuators' speed and are heard doing so (32d1070), so a state change takes seconds, valve by valve.
- **The backwash pit's inhibit** (`wet-hall.ts`): at high-high its inlet shuts and every Olympic and lounge backwash and rinse stops, until it is below HIGH.
- **What shows a wash:** each filter's sight glass, its gauges, the pit's level and lamps.
- **Rules that apply:** every engineering item works and is modelled after a real product; new controls are tried on dev0's boards, assemblies in dev39; a board shown in two places is one world state (memory: mimic copies, one node); controls in the control room repeat what the plant room's board carries, but mode selectors and resets stay local (CLAUDE.md, 2026-10-25).

## The console

**The Lidoluxe Wash-O-Tron**: the filter maker's own retrofit controller, about 1996, fitted beside the battery; a beige powder-coated case, the Lidoluxe badge and a model plate (WASH-O-TRON 5 · 1996), surface conduit to the valves' actuators. It is Lidoluxe's product, not a Penfold board: an exception to the rule that every board carries Penfold's mark, for the owner to confirm. Laid out as a mimic.

- **The mimic band:** the five vessels as they stand, the inlet and outlet headers, the backwash main to the pit and the waste line; each valve a small lamp on its line, lit while open, whatever set it; PIT INHIBIT where the backwash main leaves for the wet hall.
- **A cluster under each vessel, five alike:**
  - illuminated state buttons FILTER, BACKWASH, RINSE, ISOLATE, DRAIN: exactly one lit, the state it is in; pressing another moves it there, its valves driving in order, the new state's lamp flashing until it arrives;
  - AUTO (illuminated): hands the filter to the programme; any state button takes it back to manual;
  - its bed's condition: a short LED bar of its pressure drop, a red WASH DUE LED at its top past the setpoint;
  - FAULT: a valve not reaching its position in time, or a step overrunning.
- **The controller section:**
  - the two-line LCD and MODE (illuminated push button), cycling its views: the programme ("AUTO · F3 BACKWASH 01:42/04:00"), the next wash ("NEXT F5 IN 03:12", or "F5 DUE (DP)"), the pit ("PIT 41% · INHIBIT OFF"), each setpoint in turn, and the last events;
  - − and + (push buttons) to change the setpoint shown (backwash, settle and rinse times; the pressure-drop trigger; the wash interval or the hour of the daily wash), held for fast travel, and ENTER to store it;
  - PROGRAMME (illuminated): held for three seconds to allow setpoints to be changed, lit while they may be, timing out by itself; no key switch, so both copies of the console show the same;
  - the programme's illuminated buttons: AUTO (run the programme), HOLD (pause mid-step, flashing), STEP (end the step now, as an operator watching the glass would), SKIP (pass this filter), WASH NOW (wash the filter on the display, out of turn);
  - an annunciator strip (STEP OVERRUN, VALVE FAULT, PIT INHIBIT, LOW CIRCULATION) with ACCEPT and RESET and a buzzer.

## The programme

One filter at a time, in turn or worst first by pressure drop; never taking a filter out while too few would be left filtering for the circulation. Each wash: BACKWASH → SETTLE (all shut, a short timer, the sand dropping back) → RINSE → FILTER, each step ended by its timer or earlier by what a real controller senses (the pressure drop; a turbidity cell on the backwash out, if one is fitted), never by the model's dirt directly. It waits while the pit is inhibited and resumes after. A valve worked by hand during a step puts it on HOLD with VALVE FAULT.

## Later, not now

- AIR SCOUR, once the plant has a blower and air valves.
- LOCKOUT: a filter held isolated against the programme while worked on.
- REFILL/VENT after a drain; SOAK for a chemical clean.
- The lounge's filters on a Wash-O-Tron of their own.

## Build

1. The programme and each filter's state machine, pure and tested in the world (`src/game/`), one world state, both consoles reading and commanding it.
2. The console tried on dev0's boards and assembled in dev39 (control assemblies), then fitted in the Olympic's plant room and repeated on the control room's board.

## Done when

- From the console alone, any filter can be set to each state and its valves follow; in AUTO a cycle washes all five in turn, each to clean and settled, the pit never spilling; tested in the world.
- Both consoles show the same state and work the same filters; seen in the game.
