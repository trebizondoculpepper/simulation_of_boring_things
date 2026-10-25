# Equipment status and inspection

The equipment's own model is authoritative. The information overlay describes that equipment or part and what its displays, positions, lamps or locally perceptible operation reveal; it is an aid to seeing the plant, not access to hidden diagnostic knowledge. A state's existence in code does not by itself make its cause observable. This guide records the owner's rules and the conventions to use when adding equipment or improving its descriptions.

## Identity, description and state

Identify the smallest meaningful thing under the aim. A boiler casing and its tag belong to that boiler, not the pair beside it; a button, lamp or readout has its own description within its machine. Keep an assembly identity for its shared frame, enclosure or manifold. Each installed machine has its own registered identity and model binding; grouping machines for drawing or layout must not collapse their individual identities.

The equipment overlay's first line is `<id> (<brand if known> <model number if known> <equipment type>) - <current status>`, for example `B-503 (Hamwarmy Heating HW 300 boiler) - firing`. Brand and model come from recorded equipment metadata; never guess a model from its appearance. Omit an unknown brand or model; omit the dash and state when no reliable live state is available. The model identifier must agree with the machine’s actual rating plate. Individual controls without their own equipment id keep their typed button, lamp or reading descriptions.

The second line identifies type, place and purpose without repeating the state: “The only calorifier in the boiler house”, “The 3rd boiler in the boiler house”, or “The 2nd pump in Plant Room 1”. Keep technical acronyms such as UV and BMS capitalised. Tags retain their abbreviated location codes; prose uses the full location name. The overlay, inventory, manual and console use the shared description and state selectors; the overlay places live state in the heading, while callers of the full description can retain its live clause. An instrument’s reading is its heading status; its direction or installed path belongs below.

A control's command, the machine's actual state and the service delivered are separate facts. OPEN is a requested valve action; an actuator halfway through its stroke is part open. A boiler can be enabled and powered while waiting for heat demand. A pump can run without moving water. Never present a command as proof that the operation completed, or nominal design output as a live measurement.

## Categories

| Category                                                                  | What to describe                                                                                                       | Examples                                                                                               | What the words must not imply                                                                                                      |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Active equipment: boilers, pumps, AHUs and cabinets                       | Electrical supply, local enable/mode, automatic demand or hold, actual operating phase, modelled protection and output | Unpowered; switched off; standby; firing; pump run-on; locked out (ignition failure)                   | Powered does not mean running; enabled does not mean demand; running does not prove useful output                                  |
| Valves and isolators                                                      | Actual handle/contact/actuator position, movement where modelled, and the specific service or circuit controlled       | Open; shut; part open; opening; ON; OFF                                                                | Open does not prove flow; ON does not prove an upstream supply; missing actuator power does not prove a mechanical valve shut      |
| Instruments: flowmeters, ammeters, gauges and readouts                    | The instrument's own displayed reading, units, resolution, sign/direction and display state                            | 45 m³/h toward the pool; −34 m³/h in reverse; 0.0 A; over range; display off                           | Zero does not prove isolation; an unpowered digital display is not a zero reading; a mechanical gauge needs no electrical supply   |
| Passive process equipment: vessels, filters, heat exchangers and pipework | Its process condition where modelled and observable, or just its identity and purpose                                  | Tank 68 % full; filter differential pressure 0.34 bar; a thermometer reading                           | Do not assign ON/OFF or healthy/faulty to every vessel; no sensor means no invisible reading                                       |
| Architectural components                                                  | Their physical state and supported mechanism, with separate identities for worked parts                                | Door open, closed or ajar; lock engaged; door closer returning the leaf; blind position                | A static wall, stair, sign or pane does not need a fictional operating state; a shut door is not necessarily locked                |
| Safety equipment                                                          | Readiness where represented, alarm/test/acknowledgement/isolation states, protective action and retained faults        | Gas detector reading 0.00 ppm; alarm active; accepted alarm; emergency stop pressed; safety valve shut | Silence does not mean safe; acknowledgement is not reset; reset does not repair a continuing fault; power does not prove readiness |

A component can contain several categories. A filter vessel may be passive while its wash actuator is active and its differential-pressure gauge is an instrument. A cabinet's supply isolator, controller, pumps, lamps and meters must not all inherit “cabinet running”. A powered display on a passive tank does not make the tank itself an electrical load.

## Active equipment

Model and word these dimensions separately where the machine supports them:

- Supply: available, isolated or unpowered, with a cause named only where it can be established from that equipment or an observable local control.
- Control: switched off, enabled, HAND/AUTO or another real selector mode; local/remote only where that control actually exists.
- Operating phase: standby, starting, purging, igniting, firing/running, stopping or run-on, according to the machine's own sequence.
- Protection: a recoverable hold/block, or a latched trip/lockout with a recorded and observable cause.
- Delivered service: actual flow, heating, ventilation or dosing, measured or derived by the same model that drives the equipment and its instruments.

Use the machine's vocabulary rather than one universal On/Off rule. Distinguish switched off from standby: standby is enabled and waiting normally. Distinguish a block from a trip: a block can clear when the permit returns; a latched trip remains until the real reset conditions are met. “Operational” or “healthy” requires a model that can establish the relevant failures and permits. For something with only a modelled switch, On and Off are the honest vocabulary.

Choose a documented precedence for the short summary and preserve simultaneous facts in the model. Losing power can make “unpowered” the visible summary while a lockout remains stored and reappears when power returns; it must not erase that lockout. A known, observable lockout should not be replaced by generic standby just because demand is absent. Include a second condition when useful and visible, such as “standby, gas unavailable”. Do not recover a historical fault cause from counters that have already been reset.

### Boilers: implemented vocabulary

The individual boiler controller (`boiler-house.ts`) now supplies these descriptions. These are the states already modelled, not new simulated failure modes.

| Condition                         | Status                        | Recovery                                                               |
| --------------------------------- | ----------------------------- | ---------------------------------------------------------------------- |
| Electrical supply unavailable     | unpowered                     | Supply restored; stored controller faults are retained                 |
| Local switch off                  | switched off                  | Local switch on                                                        |
| Code 0, enabled and no lockout    | standby                       | Normal demand starts the sequence                                      |
| Code 1                            | purging                       | Sequence progresses or demand is withdrawn                             |
| Code 2                            | igniting                      | Flame proves or the controller retries and eventually locks out        |
| Code 3                            | firing                        | Modulates with demand and setpoint                                     |
| Code 7                            | pump run-on                   | Burner stopped; pump removes residual heat, then stops                 |
| Code 9                            | blocked (low water pressure)  | Clears automatically when pressure recovers; not a reset-required trip |
| Recorded ignition-failure lockout | locked out (ignition failure) | Correct the cause and RESET                                            |
| Recorded flame-loss lockout       | locked out (flame loss)       | Correct the cause and RESET                                            |
| Recorded overheat lockout         | locked out (overheat)         | Correct the cause and RESET                                            |

With no gas at the inlet, the controller displays GAS; the inspection adds “gas unavailable” to its non-lockout phase. Do not label every missing gas supply “gas fault”: a deliberately shut isolating valve or the common safety valve can explain the same condition. Likewise do not describe low water pressure as “tripped (water fault)” when this controller blocks and automatically recovers. Code 7 is pump run-on, not a modelled post-purge phase.

Power and local OFF take precedence in the short description, then a recorded lockout, then the actual phase. The cascade's aggregate heating demand is not evidence that every boiler is firing. Each B-501…B-506 reads its own controller. Their controller states currently remain in the boiler house's local model; moving them into the saved world is still mission 046, so an offline inventory/console query must not invent those live states.

## Valves and isolators

Use actual travel when available. A binary saved command is enough only for an instantaneous binary model. Opening, closing, spring return and percentages require the model to expose that motion or position. A manual handle can describe its position without electrical power; an actuator may remain open, spring shut or stop partway according to its actual fail behavior. Never assume a universal failure position.

An isolator describes its contacts or handle and the circuit it isolates. A downstream machine reports unpowered only when its supply path actually denies power. Isolation, overload trip and an emergency stop are different mechanisms. Where only handle position is observable, say ON/OFF and the circuit's identity; do not claim the contacts have been tested dead or healthy.

## Instruments and readouts

Read the same selector/value used to render the instrument. Apply its units, precision, range, direction and over-range behavior once and share the wording. Keep the last displayed value, a blank display and a true zero distinct. Report calibration, sensor failure or stale data only when the instrument models and indicates them. Do not add a status word such as faulty merely because a displayed process value is outside the desired operating band: an ammeter can be working correctly while showing excessive current.

Use the meter's own sign convention and arrow. A reversed flow can be correct during backwash. An ammeter reports current through its measured circuit, not a general “machine on” verdict. Analogue gauges should be read to a plausible scale resolution, not given more precision in the overlay than the instrument can show. Changing a readout's range or operating mode changes the inspected reading too.

## Passive and architectural components

Passive does not mean unmodelled decoration. A tank has water balance, a filter has resistance and dirt, and a heat exchanger has heat transfer. Bind those to their real process model. Name any observable state or reading through the sensor or physical indication that exposes it. Where no useful observable state exists, the component's name, location and purpose suffice; do not append a generic “normal”.

Architectural mechanisms use their own physical behavior: a door can be moving, closed, latched or locked; those conditions are distinct. A card reader, door actuator or alarmed exit is an active or safety component within the architectural assembly. Pure scenery has no invented engineering state. Keep the project's existing distinction between working building fittings and static services-ceiling/background decoration.

## Safety equipment

Show alarms and protective actions from their own models and visible indications. A gas detector's ppm display, A1/A2 indications, alarm acceptance and a supply failure are different facts. An accepted alarm can remain active; a sounder may stop while its beacon continues. An emergency stop's pressed/released position is not the same as the machine's trip state. A reset should clear a latch only under the device's real reset rules, not by changing the description.

Only say ready, isolated, disabled, testing or faulty where the equipment represents and exposes that state. A lamp-test indication proves that the lamp-test behavior ran; it does not certify a whole fire or gas system. For safety items not yet simulated, record the coverage limitation in the health documentation instead of labelling them healthy. The [healthy-start contract](healthy-start.md) evaluates facility health separately from an individual device's inspection wording.

## Implementation and maintenance

Use a pure selector beside the machine's logic to derive its state from the same controller data and inputs that drive its view. Define its vocabulary, precedence, units and observable evidence there. Preserve fault cause in the controller when needed; wording must not create new state or change the plant. Bind live scene inspection to that selector, and use world-backed selectors for other callers when the state is saved globally. Missing state means omit the live clause, not Off.

Existing seams are `equipment-kinds.ts` for kinds and shared status policies, `component-status.ts` for world resolution, `component-descriptions.ts` for prose, `part-inspection.ts` for typed controls/readings, and component identities for choosing a child before its enclosing assembly. Machine-local selectors such as `boilerStatus` may supply the existing live `status` callback; this is an adapter to the real controller, not a second simulation. Do not import game or gallery code into toolkit logic to construct these descriptions.

Keep a kind's identity, status selector, rendered state and coverage classification consistent. Add tests for real transitions and competing conditions: no supply, deliberate OFF, healthy standby, actual running, recoverable block, latched trip, reset refusal while a condition persists, and recovery. Also verify a child's casing/tag is picked separately from its assembly and that its controls retain their own descriptions. For meters, test zero, reverse flow, unavailable display and over range as applicable. Test only states the component actually models.

When new equipment or a new failure mode changes normal operation, update this guide, the relevant kind's vocabulary, tests and [mission 067's maintained healthy-start definition](healthy-start.md). [Prompt 069](prompts/069-machine-states.md) covers the broader remaining machine-state work. This guide establishes the conventions; it does not mean every existing family has already acquired the richer vocabulary.
