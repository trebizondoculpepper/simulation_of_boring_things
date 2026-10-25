# 069: Each machine's own states, from its own internal state

Status: specified 2026-10-25 from a discussion with the owner; reviewed by Codex the same day ([review](../reviews/2026-10-25-codex-review-069.md)), its findings below; for the owner's review before implementation. It refines how the information overlay ([061](061-component-information-overlay.md), [068](068-inspect-component-parts.md)) words a machine's current state.

## The request

The owner, 2026-10-25: "For something like a pump, we might say that it is operational, tripped, unpowered … something could be powered but switched off, and something like a boiler can be running, can be off, it can be unpowered. So there's probably a lot of difference. We might have to have a think about what kinds of states are sensible for each machine … the machine's own internal state will inform the description of what its current state is."

And the ruling before it: On and Off are the right words for anything with no fault model; operational, tripped, faulty and the like only for things whose failure modes the world actually models.

## What there is now (checked 2026-10-25)

- Each kind in `src/game/plant/equipment-kinds.ts` has one `status` policy (`motor`, `level`, `pump-set`, `cabinet`, `booster`, `switch`, `gas`, `uv`, or `none`), resolved from the world in `component-status.ts` and worded in `formatStatus` (`component-descriptions.ts`).
- The words are few and shared: a motor is `On`, `Off` or `Tripped`. A stopped pump reads `Off` whether it was stopped from its panel, lost its supply, had its isolator opened, was put in OFF, or is held by the emergency stop. The jacuzzi cabinet alone already distinguishes its causes (`Off, no power`, `Running, no flow`, `Tripped`).
- Much of the cause is in the world already, unused by the wording:
  - **Motor starters** (`motor-starters.ts`): `mode` (HAND, OFF, AUTO), `command`, `running`, `tripped`, `starved`; the starter is `permitted` only with its room's power, its local isolator and its pool's tank above low-low; `stopped[pool]` is the emergency stop.
  - **Air handling units** (`air-handling.ts`, `pool-ahu.ts`): `isolator`, `mode`, the hall's time programme (`occupied`), `speed`, `dampers`, `heatPump`, `filterPa`, and `tripped` on blocked filters.
  - **Boiler house** (`boiler-gas.ts`): the gas safety chain (`ecvOpen`, `stopPressed`, `gasDetected`, `ssovOpen`) and the heat source; the individual boiler controllers' state (`boiler-house.ts`'s `BoilerState`) lives on their panels, not in the world.
  - **Booster set** (`wet-hall.ts`): `boosterRunning`, `boosterTripped` (low break-tank level, latched).
  - **Jacuzzi cabinet** (`jacuzzi-cabinet.ts`): `power`, `trip` (`no-flow`), and its panel's derived `supplied`, `flowing`, `pumpRun`.
  - **UV units** (`uv.ts`): on while the pool circulates and the isolator is closed; no fault modelled.
  - **Gas detectors** (`gas.ts`): reading, and latched alarms A1 and A2.

## The owner's rules on what the overlay may say (2026-10-25)

- **Only what is shown, or what a person there would sense.** The overlay is an aid for players whose screens cannot show every display legibly, never a peek into the model: it says what a machine's own displays, lamps and positions show, and what someone standing beside it would see, hear or feel that a game cannot convey (a pump's hum, vibration and warmth). A state's words may therefore name a cause only where that cause is itself visible or sensible there (an isolator's handle at OFF, a selector at HAND, a lamp lit); a cause known only to the model (why a starter tripped, what the controls want) is not said.
- **On and Off for things with no fault model**; operational, tripped, faulty only for things whose failure modes the world models.

## Codex's review, in brief

- The world holds no ozone-generator or boiler-controller state: both live privately on their panels. Their rows cannot be world-backed until that state is moved into the world (the ozone generator's own block has a full vocabulary: off, tripped with its cause, blocked by no flow, running, standby).
- Missing states: a pump held off by its balance tank's low-low level (not a trip: it clears itself), a pump running starved, an AHU starting or running down, the jacuzzi's tank low-low hold, a solenoid valve spring-returning or unable to open without power, a gas alarm accepted.
- A trip's cause cannot be recovered after the fact (`starved` resets), so "tripped (starved)" is not provable; nor is a boiler "firing" from the aggregate heat.
- One first-match status loses facts that hold together (tripped and isolated); the table should say what its single status serves and keep the rest for inspection.
- A defect it found, fixed 2026-10-25: the lounge's actuated valves were described by their command, not their actual travel.

## The proposal

1. **Each machine kind declares its state vocabulary**: the states it can be in, in order of precedence, each with the world condition that proves it. The first state whose condition holds is the one shown. A kind with no failure modes in the world has no failure states; its vocabulary may be as small as On and Off.
2. **States come from the machine's own internal state and its supplies**, never from what its panel shows or from guesswork. Where the world cannot tell two causes apart, the vocabulary does not claim to: the wording stops at what can be proved.
3. **The words carry the cause where it is known**, so the overlay helps diagnosis: "Off: its isolator is open" rather than "Off".
4. **One table per kind, in code**, as data beside the kind (not prose in a second table): its states, their precedence and their conditions. The overlay's words, any lamp that shows the same state, and any test read the same table.

### Proposed vocabularies (for review)

| Kind | States, highest precedence first | Evidence in the world |
|---|---|---|
| Pump (motor starter) | Tripped (starved / low-low tank); Stopped by the emergency stop; Unpowered (room supply off); Isolated (local isolator open); Off (selector at OFF); Running in HAND; Running; Stopped (AUTO, commanded STOP or not wanted, e.g. a standby) | `tripped`, `starved`, `pools[pool].tripped`, `stopped[pool]`, `serviceAvailable(..., 'power')`, `isolators`, `mode`, `running`, `command` |
| Pump set | Each pump's state as above, the duty first | as above |
| Air handling unit | Tripped (blocked filters); Unpowered; Isolated; Off (selector); Running in HAND; Running, heat pump on/off; Idle (AUTO, hall unoccupied) | `tripped`, power, `isolator`, `mode`, `occupied`, `heatPump`, `speed` |
| Boiler cascade | Locked out (gas safety tripped: SSOV shut); No gas (ECV shut, emergency stop); Unpowered; Firing; Standing by (no heat demand) | `boilerGas`, heat source, power; firing from the heat delivered. The controllers' own modes are not world state today; whether they should be is a question for the owner |
| Booster set | Tripped (break tank low); Unpowered; Running; Standing by | `boosterTripped`, power, `boosterRunning` |
| Jacuzzi cabinet | Tripped (no flow); Off, no power; Off (POWER switch); Running, no flow; Circulating | as today |
| UV unit | Unpowered (if its supply is modelled); On; Off | `uvLampOn`, power |
| Ozone generator | to be checked against its world state | — |
| Gas detector | In alarm (A2); Warning (A1); Reading n ppm | `gas[zone].state` |
| Valve (solenoid, lounge) | Open; Shut; Opening; Shutting; Spring-shut (no power) | `loungeValvePositions`, commands, power |
| Valve (manual) | Open; Shut | `installedValves` |

## Questions for the owner (one at a time when this is reviewed)

1. Is the precedence right? For example, a pump that is both isolated and in OFF: which does the player most need told?
2. Should the boiler controllers' modes (their on/off switch, MODE, MANUAL) become world state, so a boiler's state can say "switched off at its controller"? Today they live on their panels only.
3. "Stopped" versus "Off": is it worth keeping a pump that is wanted off in AUTO (a standby, say) distinct from one switched to OFF?

## Implementation (after review)

- A pure `machineState(kind, world, subject)` returning the state id and its words, from each kind's table; `formatStatus` uses it, and the old fixed policies are retired kind by kind.
- Tests per kind: each state reached from a world set up to prove it, and precedence when several hold.
- No state may be shown that the world cannot prove; a kind without a table keeps saying nothing rather than guessing.
