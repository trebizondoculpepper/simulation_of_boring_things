# Healthy New Game: the maintained definition

Status: proposed operating contract, researched 2026-10-25; implement and maintain through [mission 067](prompts/067-healthy-new-game.md). This is the game's definition of normal operation, not real-world commissioning advice. The [initial audit](reports/healthy-start/2026-10-25-initial-audit.md) records what the current model actually does.

## What “steady state” means here

New Game should put the player in a centre already in normal service, with healthy water, working treatment and usable facilities, without requiring repair or a commissioning sequence. Healthy means the required service is being delivered and its controls can respond. It does not mean every machine is running or every number has stopped changing.

A duty pump runs while its standby is ready in AUTO; heaters and make-up cycle to maintain their bands; a timer-controlled attraction can wait for START; protective stops, gas alarms and trips are clear. Chemical stock decreases and filters acquire dirt during ordinary operation. These changes are expected, provided the centre remains within its operating envelope for the stated handover period. Normal play may subsequently require maintenance and deliveries.

## The operating contract to implement

| Area                    | Healthy start and normal operation                                                                                                                                             | Evidence to use                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Pools                   | All four bodies full to their modelled operating levels, no drain-down requested, no low-water trip, and positive treatment flow through the intended circuit                  | Pool state plus actual calculated paths, outlet flows and interlocks; nominal displayed flow alone is insufficient             |
| Water temperature       | At each pool's configured target on entry; a proposed normal band of ±0.5 °C over the first hour                                                                               | `POOL_TARGET`, setpoints and thermal output; investigate capacity or control faults before changing the band                   |
| Water quality           | Configured normal chemistry, available chemical supply, permitted dosing and UV/ozone treatment where fitted                                                                   | Chemical controls and water state; use the model's limits and record their source and units                                    |
| Tanks and drainage      | Working reserve above each tank's own low/low-low limits, room for surge and return water, normal float/make-up control, drains and backwash routes shut in filtration service | Each tank's geometry and switches, valve roles and current network; never one universal tank-fill percentage                   |
| Motors and valves       | Required duty circuits open and running; standby available in AUTO; maintenance overrides, resets and trips clear                                                              | Actual starter modes, commands, positions and model connectivity; do not infer open/closed from tag spelling                   |
| Heating and ventilation | Supplies and permits available, pool and hall heat controllable, occupied halls ventilated and humidity within the model's band                                                | Boiler gas permits, heating output, AHUs, hall conditions and controls; an idle satisfied heater is healthy                    |
| Water and chemicals     | Break tank and booster ready, no low-water trip or waste overflow, chemical stocks adequate for the handover period                                                            | Wet-hall controls, capacities, stocks and measured demand; automatic booster operation is normal                               |
| Safety and electrics    | Normal feeds and local supplies available, no emergency stops, leaks, gas alarms, latched trips or simulated failures                                                          | Service graph, gas zones, starter and cabinet states, lighting supplies and installed safety equipment                         |
| Public facilities       | Required lighting and powered facilities usable; door/access behavior intentional; timed jets/air start and stop correctly when requested                                      | World state plus browser checks of installed controls; distinguish available, running, intentionally idle and not yet modelled |
| Displays and identity   | Instruments, local panels, control-room boards and inspection report the same model state and units                                                                            | Shared readings and scene bindings; no display-only patch to conceal a fault                                                   |
| Session                 | New Game creates a fresh healthy playable world; Continue preserves the saved one; title scenarios cannot affect it                                                            | New Game/reset/save/Continue integration and independent title-world checks                                                    |

The current constructors set temperatures to 30/28/37/34 °C and nominal treatment flows to 90/620/24/12 m³/h for lounge/Olympic/jacuzzi/footbath. Initial chemistry is pH 7.4, free chlorine 1.4 mg/l and combined chlorine 0.12 mg/l. These are current model inputs, not immutable requirements: a model change must rejustify and update them. See the audit for the measured trajectory and the source of current alarm limits.

## Observation periods

Check the first frame and first simulation steps, then the first minute, 10 minutes and one hour without intervention. Observe the trajectory, including transient trips and limit crossings between checkpoints. New Game must be healthy at handover; running it for ten minutes before examining it must not conceal an initial fault.

Also run an extended audit through opening, occupied operation, closing and a full model day. This characterises normal cycling, demand, resource use and maintenance horizons; it does not promise permanent unattended equilibrium. A first-hour failure is a release defect against this contract. A longer-term problem must be classified as intended maintenance, a modelling defect or an unresolved policy choice, with its first occurrence and cause recorded.

The existing world starts Monday at 00:00 and bathers arrive only from 08:00. For an already-operating public centre, the recommended playable start is a defined occupied/open session, such as Monday 09:00. This is a proposal for mission 067, not a change already made. Check timetable, lighting, thermal state, bathers and timers together; do not change only the clock field on an inconsistent state.

## Normal activity and actual faults

Classify indications by meaning. `makeup-running` currently appears in `PlantReading.alarms`, but an automatic booster meeting ordinary demand is healthy activity. Standby stopped, a satisfied heater off and jets awaiting a timed START are also legitimate. Faults include starved or tripped circulation, an unavailable required service, sustained unsafe/model-out-of-range readings, waste overflow and gas detection. Record a reason for any accepted indication, rather than ignoring the whole annunciator or forcing its lamps off.

Healthy bands should sit inside protective limits with room for ordinary cycling. Where there is no established band, record a proposed value and its engineering/model rationale; do not copy a measured bad value into the expected result or widen limits merely to make a check pass. Derive configured targets and valve roles from the current model while keeping independent checks that the delivered service actually exists.

## One record, repeated runs

Keep this file as the current definition. Each execution of mission 067 adds a dated report under `doc/reports/healthy-start/` with commit, world/save version, model changes since the previous audit, method, checkpoints, first violations, measured ranges and classification. Keep previous reports so a change can be compared with its predecessor. Record what was changed, why, and what remains unverified.

The existing observational audit can be rerun now:

```sh
AUDIT_HEALTHY_START=1 npx vp test run scripts/healthy-start-audit.test.ts
```

It writes `build/research/healthy-start.json`, records source commit and dirty files, samples the unmodified `newWorld()` through a day, and records first annunciator indications at every simulation step. It is opt-in and read-only with respect to the world and browser saves. A passing research script means the observations were generated, not that the centre passed the proposed contract. It currently does not certify room-local equipment, all safety systems, intermediate numeric bounds, save/Continue, or browser behavior; mission 067 must add those checks.

Rerun after changes to topology, equipment, valve roles, sizing, flow calculations, control logic, limits, loads, initialisers, time/timetables or save migrations. Also rerun after a reported unhealthy fresh game, and before declaring a changed normal preset healthy. Keep the repeatable mission available after its first delivery; update its run history instead of treating it as a one-time task.
