# 072: The Lidoluxe Wash-O-Tron, an automatic filter wash controller

Status: not started (written 2026-10-26; rewritten the same day as the Wash-O-Tron; a second opinion from Codex adopted the same day, below).

## The request

The owner, 2026-10-26, watching a filter washed by a script: "there needs to be an automatic washing program … controlled from one of the boards … a secondary board that was added later in the history of the swimming pool, and it controls the pumps and valves and gets them to do washing on a cycle." Then: "the Lido Lux Wash O-tron. It is a specific control system designed to automate the washing schedules of Lido Lux filter beds", "sort of like another mimic": a cluster of controls for each filter to set its state with a push button, a two-line LCD with a display mode button that toggles through its views, plus and minus to set parameters, and main controls. It is wanted in two places (the Olympic's plant room and the control room), so illuminated push buttons wherever possible, not switches or knobs, which imply purely local control.

## What there is now (checked 2026-10-26)

- **The Olympic's five filters** (`src/game/plant/olympic-battery.ts`), Lidoluxe vessels: each a five-valve filter (V1 inlet, V2 outlet, V3 backwash in, V4 backwash out, V5 rinse; `PL2-F<n>-V<k>`) and its vessel drain (DV1), each valve an installed valve in the world worked by `plant/valve`; the bed's dirt, fissuring and unsettledness in `world.olympic`. A wash is done by hand, valve by valve: backwash (V1, V2 shut; V3, V4 open) until clean, rinse (V3, V4 shut; V1, V5 open) until settled, filter (V5 shut; V2 open). A 161% bed takes about 4½ minutes' backwash to clean; a rinse about 3 minutes to settle.
- **The valves travel** at their actuators' speed and are heard doing so (32d1070), so a state change takes seconds, valve by valve.
- **The backwash pit's inhibit** (`wet-hall.ts`): at high-high its inlet shuts and every Olympic and lounge backwash and rinse stops, until it is below HIGH.
- **What shows a wash:** each filter's sight glass, its gauges, the pit's level and lamps.
- **Rules that apply:** every engineering item works and is modelled after a real product; new controls are tried on dev0's boards, assemblies in dev39; a board shown in two places is one world state (memory: mimic copies, one node); controls in the control room repeat what the plant room's board carries, but mode selectors and resets stay local (CLAUDE.md, 2026-10-25).

## The console

**The Lidoluxe Wash-O-Tron**: the filter maker's own retrofit controller, about 1996, fitted beside the battery; a beige powder-coated case, the Lidoluxe badge and a model plate (WASH-O-TRON 5 · 1996), surface conduit to the valves' actuators. Lidoluxe's badge on the controller, Penfold's panel-builder's mark on the panel (adopted below). Laid out as a mimic.

- **The mimic band:** the five vessels as they stand, the inlet and outlet headers, the backwash main to the pit and the waste line; each valve a small lamp on its line, lit while open, whatever set it; PIT INHIBIT where the backwash main leaves for the wet hall.
- **A cluster under each vessel, five alike:**
  - illuminated state buttons FILTER, BACKWASH, RINSE, ISOLATE, DRAIN: exactly one lit, the state it is in; pressing another moves it there, its valves driving in order, the new state's lamp flashing until it arrives;
  - AUTO (illuminated): hands the filter to the programme; any state button takes it back to manual;
  - AIR SCOUR: its place in the cluster, but blanked with a plug and a small NOT FITTED legend (the owner, 2026-10-26: the console is made for air scour, this site has not fitted it);
  - its bed's condition: a short LED bar of its pressure drop, a red WASH DUE LED at its top past the setpoint;
  - FAULT: a valve not reaching its position in time, or a step overrunning.
- **The controller section:**
  - the two-line LCD and MODE (illuminated push button), cycling its views: the programme ("AUTO · F3 BACKWASH 01:42/04:00"), the next wash ("NEXT F5 IN 03:12", or "F5 DUE (DP)"), the pit ("PIT 41% · INHIBIT OFF"), each setpoint in turn, and the last events;
  - − and + (push buttons) to change the setpoint shown (backwash, settle and rinse times; the pressure-drop trigger; the wash interval or the hour of the daily wash), held for fast travel, and ENTER to store it;
  - PROGRAMME (illuminated): held for three seconds to allow setpoints to be changed, lit while they may be, timing out by itself; no key switch, so both copies of the console show the same;
  - the programme's illuminated buttons: AUTO (run the programme), HOLD (pause mid-step, flashing), STEP (end the step now, as an operator watching the glass would), SKIP (pass this filter), WASH NOW (wash the filter on the display, out of turn);
  - an annunciator strip (STEP OVERRUN, VALVE FAULT, PIT INHIBIT, LOW CIRCULATION) with ACCEPT and RESET and a buzzer.

## The programme

One filter at a time, in turn or worst first by pressure drop; never taking a filter out while too few would be left filtering for the circulation. Each wash: [AIR SCOUR →] BACKWASH → SETTLE (all shut, a short timer, the sand dropping back) → RINSE → FILTER; the air scour step is in the programme but configured off here, its setpoint showing AIR SCOUR: NOT FITTED on the display, and nothing of it in the world (no blower, no air valves) until it is fitted; each step ended by its timer or earlier by what a real controller senses (the pressure drop; a turbidity cell on the backwash out, if one is fitted), never by the model's dirt directly. It waits while the pit is inhibited and resumes after. A valve worked by hand during a step puts it on HOLD with VALVE FAULT.

## Later, not now

- AIR SCOUR in use: a blower and an air valve per filter in the world, the cluster's blank replaced by its illuminated button, and the programme's step switched on (2 to 3 minutes before each backwash, shortening it). The console is ready for it.
- LOCKOUT: a filter held isolated against the programme while worked on.
- REFILL/VENT after a drain; SOAK for a chemical clean.
- The lounge's filters on a Wash-O-Tron of their own.

## Build

1. The programme and each filter's state machine, pure and tested in the world (`src/game/`), one world state, both consoles reading and commanding it.
2. The console tried on dev0's boards and assembled in dev39 (control assemblies), then fitted in the Olympic's plant room and repeated on the control room's board.

## Done when

- From the console alone, any filter can be set to each state and its valves follow; in AUTO a cycle washes all five in turn, each to clean and settled, the pit never spilling; tested in the world.
- Both consoles show the same state and work the same filters; seen in the game.

## Adopted from a second opinion (Codex, 2026-10-26; the owner adopted all of it)

- **Proved steps.** Each change of state is a sequence: shut the present path, prove the valves have reached position (a command is not proof of travel), set the new path, then admit water; a step's timer starts only once its valves are proved and the pump runs with real wash flow. Flow is stopped while valve paths change.
- **DRAIN is a procedure:** isolate, relieve and vent, then open DV1; a drained filter is never restarted by the programme. **LOCKOUT is in the first version** (a filter held isolated against the programme while worked on), with DRAIN.
- **Interlocks:** never two washes at once, the Olympic's and the lounge's together; a wash only while the rest can carry the circulation (four of five Olympic filters available, checked against the actual total and per-filter flow).
- **Admission, not interruption:** before starting a wash the programme checks the pit has room for the whole of it (backwash, settle and rinse, at about 180 m³/h: some 15 m³ backwash alone) and waits otherwise, showing PIT CAPACITY; the high-high inhibit is the last resort, not the plan.
- **Triggers:** scheduled opportunities, plus WASH DUE from the pressure drop at comparable flow, plus a longest time since the last wash. Steps end on their timers (backwash up to 5 min, settle 1, rinse 3: to be checked against the model's flows and the sight glass), with a minimum effective backwash; no turbidity cell for now (deferred), and no worst-first ordering (a due queue).
- **Lamps say more:** each state's lamp shows requested, valves moving, proved, or faulted, distinctly; the display says why a wash waits (PIT CAPACITY, LOW FLOW, FILTER UNAVAILABLE).
- **HOLD, STEP and SKIP defined:** HOLD leaves the filter in a safe valve state; STEP never bypasses a proof, the flow or the pit's admission; SKIP leaves the filter still due.
- **Local only:** setpoint editing (PROGRAMME, − / +, ENTER), RESET and LOCKOUT work on the plant room's console alone; the control room's repeat shows everything and can request WASH NOW (consistent with the rule that mode changes and resets stay local). PROGRAMME is an editing gesture, not access control.
- **Makers:** the Lidoluxe product badge on the controller, Penfold's discreet panel-builder's mark on the panel it is built into, keeping the panel-maker rule.
- **Fix first, separately:** the pit can break its sewer consent (both pumps in HAND give 20 m³/h; the gravity discharge valve WH-DR1-DV1 adds 40 m³/h; consent 10 m³/h). No schedule can be guaranteed compliant until that is reconciled.
