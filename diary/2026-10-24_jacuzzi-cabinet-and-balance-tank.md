# Development Diary Entry - 2026-10-24

## Context

| Time      | Branch | Commit        | Task                                                                                |
| --------- | ------ | ------------- | ----------------------------------------------------------------------------------- |
| 18:15 UTC | main   | (this commit) | The jacuzzi's cabinet controller, its balance tank, a trial room and the replumbing |

## What we were asked to do

The owner found that the jacuzzi cabinet did not stop with its valves shut, that cutting the room's power stopped its drain, and asked for the cabinet's control and behaviour to be rebuilt and tested: a latched no-flow trip, a temperature warning when the heat fails, a two-line character display, and tests with the plant room's mimic and the waterproof wall plate. Looking at the cabinet's small surge vessel, the owner asked whether the balance tank was big enough, decided that without a proper one the system could never work, and asked for the cabinet to work with either its own vessel or an external tank, for a trial cabinet with idealised pools, sources and tanks and a test panel, and then for the tank to be installed in the plant room and the jacuzzi replumbed.

## What we did

The cabinet got a pure controller in the world (`jacuzzi-cabinet.ts`): POWER, a no-flow trip after 5 s latched until RESET, a self-resetting TANK LOW, NO HEAT and TEMP LOW, and a 16 × 2 display; the plant room's mimic and the wall plate read it, and `jacuzzi-systems.test.ts` tests them together. The drain became gravity. The balance tank was sized for a spa by what it must absorb (`spa-balance-tank.ts`, 1.3 m³), and the cabinet takes its tank as an input, internal or external but never both (`CabinetPlumbing`). Dev38 runs the real cabinet against a trial model (`jacuzzi-trial.ts`) through a binding, with a Penfold console. Finally the tank component (`components/plant/views/spa-balance-tank.ts`) was placed in the plant room's north-west corner and the cabinet's runs redrawn: the spa's overflow into the tank, a new suction valve IV8 from it, its make-up and its overflow to a new gully.

## Outcome

Every check passes, and the room was looked at in a browser through view URLs (`?room=…&x=…&z=…&yaw=…&pitch=…`). The trial showed two design faults before the room did: the float first sat too high to take the gutter's water draining back with every seat taken, and with an external tank the gutter valve should not trip the pump but back the gutter up while the tank runs down.

## What we learned

Trying the model in an idealised rig before installing it caught real sizing and control mistakes cheaply. A signal must hold any state a computed lamp reads, or the lamp never changes. Markdown tables must go through the formatter before committing (CI caught one). `git stash pop` after a failed `git stash push` pops someone else's old stash: check that the push created one.
