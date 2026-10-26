# Prompt: smallest working multi-system plant

## Review checkpoint — 2026-10-26

**Classification:** Mostly complete. **Filed:** `doc/prompts/done/013-minimal-multidomain-plant.md`.

**Delivered:** The original delivered implementation/report is recorded in the finished index.

**Still outstanding:** Write or explicitly waive the original Dev19/minimal-plant progress report; the implementation is delivered.

**Evidence:** Built as Dev19, `port-graph-demo.ts` and its tests, `fc89a7d` (2026-10-23); outcome in diary `2026-10-22_port-graph-physical-quantities.md`; the port graph adopted after 014 (018, 019). Its own report was never written. Moved 2026-10-25.. Reviewed against source `e5078c4`.

The original request and earlier implementation notes below are retained as history; this checkpoint supersedes any conflicting old completion claims. Outstanding work remains open in the root TODO.

> **Retired 2026-10-25.** The plant network this refers to (`src/game/plant/network/`, `PLANT_NETWORK`) was deleted: nothing in the game used it, and the owner ruled that each room's enhanced network (the plumber's expanded port graph) is the one source of truth. Git history keeps it.

Status: mostly complete (reviewed 2026-10-26, source `e5078c4`).

Read `AGENTS.md`, `doc/research/port-graph-physical-quantities.md`, `src/game/plant/network/port-graph-spike.test.ts`, and the existing world and plant network before editing. Build a headless, deterministic prototype that proves the port graph can describe a small coupled physical system. Keep the existing game network and saves unchanged until the prototype passes.

## Physical setup

Model a finite natural-gas store feeding a boiler. The boiler heats a larger, well-mixed water tank through a small closed circulation loop driven by an electric pump. The tank loses heat by conduction to outside air. A fixed-voltage electrical boundary supplies the pump and boiler controls; record its actual energy use. Outside air, drainage, and flue exhaust are explicit virtual graph boundaries, even though their external works are never drawn. Model electricity as one supply line with no visible phases or return. Give each machine and boundary a stable ID, typed ports, and explicit connections. The water loop may use a fixed design flow while the pump is powered; do not build a general hydraulic solver for this experiment.

Give the boiler a visible control, indicator, and reading as child parts with their own stable IDs. Bind each functional visual to a compatible simulation component or child part. An unbound visual is decorative and cannot expose functional ports. Changing the visible control must change the simulation state, and the indicator and reading must follow that state.

For later room routing, pool-bound pipes leave the plant room to the north and main-plant-bound pipes leave to the south. Choose exits and bends that clear the gantry, door openings, and staircases; route constraints belong to the placed connection geometry, not to the machine's port identity. An unseen sewer is reached by a downward drain, and an unseen exhaust sink by an upward flue.

Use a minimal world state: remaining fuel mass, water mass or volume, tank temperature or internal energy, pump and boiler state, cumulative electrical energy imported, cumulative fuel energy consumed, cumulative heat delivered to water, and cumulative heat lost to air. Keep the graph's installed metadata and live state separate. For every live reading, define its stable node, port, or connection address. The boiler must stop producing heat when fuel is exhausted; the pump must stop when electrical supply is unavailable. Make any boiler interlock on pump flow explicit.

## Calculations

Use declared constants with units: fuel lower heating value, boiler efficiency, boiler maximum fuel rate, pump electrical power or a voltage/current relation, boiler-control electrical power, water specific heat, tank volume or mass, tank heat-loss coefficient `UA`, ambient temperature, and a fixed timestep. Use plausible example numbers but mark them as prototype assumptions, not equipment specifications. Convert units at boundaries and use SI units internally.

For each step, cap gas consumed by the remaining store and rated burner flow. Compute fuel energy from consumed mass, useful boiler heat from efficiency, and tank heat loss as `UA × (T_tank − T_air) × Δt`; allow negative loss if the room is warmer than the tank. Update tank energy first, then derive temperature. Electrical power is the sum of energized loads; accumulate imported electrical energy as `P × Δt` and expose both joules and kWh. Track fuel energy separately from electrical energy and report a simple energy ledger. A displayed current should follow the chosen supply voltage and load power; current and power must be zero when the load is disconnected.

Use a project-owned typed kind registry and validator for port schemas, direction, media, required connections, and cardinality; a generic graph package may store the topology but is not the authority for these rules. The validator must reject missing required ports, incompatible media, invalid connection direction, and unconnected fuel, water, flue, thermal, or power ports. The one-line electrical supply is an intentional game abstraction, so do not require a phase or return circuit in this trial. Distinguish design ratings from live flows, pressures, potentials, temperatures, and energy counters. If pressure or voltage is shown, state the simple boundary or component law used to obtain it; never derive it from graph reachability alone.

## Acceptance checks

1. The graph contains one installed object per ID, derives its required ports from its kind, and connects every required port to a compatible port. Outside air, electrical supply, and flue stack are explicit boundary nodes; the fuel store is finite.
2. With pump, power, fuel, and boiler available, tank temperature and electrical energy used increase; fuel decreases. The per-step and cumulative energy ledgers balance within a stated numerical tolerance.
3. With the boiler off, the tank approaches ambient temperature through heat loss. With fuel exhausted or power disconnected, delivered heat stops. When all electrical loads stop, cumulative electrical energy stops increasing.
4. Results are deterministic across repeated fixed-timestep runs. Tests exercise topology errors, fuel exhaustion, cooling, no power, and the electrical energy counter. No Three.js, DOM, browser clock, or visual equipment is required.
5. Add a short report with the initial values, time series or checkpoint table, units, simplifications, and what would need replacing before this model drives the full plant. Run the repository checks and keep the prototype isolated from existing saved games.
6. The dev-room visual objects have one-to-one installed IDs and typed simulation bindings. Their child controls and indicators have stable addresses, and a command from the visual control changes the deterministic model. Report any visual object or required port that cannot be bound.

## Return path

After the architecture review in prompt 014, return the prototype code and report paths, the graph-validation result, the energy and fuel ledger results, the commands and tests run, and any requirements the trial could not satisfy. State clearly whether the result supports adopting, adapting, or rejecting the port graph for the installed world. Keep the production network unchanged until the owner decides on migration.
