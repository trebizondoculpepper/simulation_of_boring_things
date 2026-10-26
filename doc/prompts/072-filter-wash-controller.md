# 072: An automatic filter wash controller, fitted later

Status: not started (written 2026-10-26).

## The request

The owner, 2026-10-26, watching a filter washed by a script: "there needs to be an automatic washing program … controlled from one of the boards. Perhaps we'd make it look like it was a secondary board that was added later in the history of the swimming pool, and it controls the pumps and valves and gets them to do washing on a cycle."

## What there is now (checked 2026-10-26)

- **The Olympic's five filters** (`src/game/plant/olympic-battery.ts`): each a five-valve filter (V1 inlet, V2 outlet, V3 backwash in, V4 backwash out, V5 rinse; `PL2-F<n>-V<k>`), each valve an installed valve in the world worked by `plant/valve`, the bed's dirt, fissuring and unsettledness in `world.olympic`. A wash is done by hand, valve by valve: backwash (V1, V2 shut; V3, V4 open) until the bed is clean, rinse (V3, V4 shut; V1, V5 open) until it settles, service (V5 shut; V2 open).
- **The lounge's filters** (`lounge-valves.ts`, worked from their mimic `lounge-filter-mimic.ts`), and the **spa cabinets' filters**, which already wash themselves on their own programme (`spa-filter.ts`).
- **The backwash pit's inhibit** (`wet-hall.ts`): at its high-high level it shuts its inlet and every Olympic and lounge backwash and rinse stops; it releases below HIGH.
- **What shows a wash:** each filter's sight glass (bed lifted and churning, water clouded, then settling), its gauges, the pit's level, depth display and floats.

## What to build

1. **The wash programme, in the world** (pure logic, tested): a sequencer that takes one filter at a time through backwash, rinse and service by commanding its valves, each step ended by what a real controller can sense (a timer, and the bed's pressure drop or a turbidity reading at the backwash out, not the model's dirt directly); filters washed in turn, on a cycle (a time of day, or when a filter's pressure drop passes its setpoint). It waits while the pit is inhibited and resumes after; it never washes two filters at once, and never takes a filter out while too few are left in service for the circulation.
2. **Its board, retrofitted:** a Penfold "backwash controller" plainly added later than the original plant (a different enclosure and finish, surface conduit to the valves' actuators, a mid-1990s PLC with a small text display), with each filter's step on lamps, per-filter enable switches, START, HOLD, SKIP and RESET, and its alarms (a step overrunning its time, the pit inhibited). Tried first on dev0's boards and in dev39 (control assemblies), as the project's rules ask, then fitted in the Olympic's plant room (and its repeat on the control room's board if it is given one).
3. **Hand still works:** a valve worked by hand during a programme puts the controller on HOLD with an alarm; the operator's valves and the programme's are the same valves.
4. **Later:** the lounge's filters on the same controller, or one of their own.

## Done when

- A cycle washes all five Olympic filters in turn, each to clean and settled, without a human touching a valve, and the pit never spills; tested in the world.
- Its board shows each filter's step and the programme's state, and its controls work; seen in the game.
