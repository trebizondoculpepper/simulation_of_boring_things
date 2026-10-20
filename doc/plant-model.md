# The plant model, and putting it in the rooms

The game is about the model: how the pool's systems work and interact. The 3D plant rooms show that model and let the player act on it; they do not hold any of it. This note sets out how the model is built and the principles for placing machinery in the rooms around it. Written 2026-10-20.

## A bit of everything

A design goal, from the owner: this plant should have a bit of everything. Where a real pool of the period might choose one technology, the game's plant may carry several side by side (UV and ozone; hypochlorite and the remains of an older system; analogue gauges beside digital controllers; a cubicle from one decade next to one from another), so that the plant rooms show the full range of what pool engineering involves. Each item is still real and working, and the plant as a whole still has to make sense: everything is connected, and it all has to be maintained.

## 1. Model first, then machines

The order is: write the model's skeleton, place the machines and bind them to it, then deepen the model room by room.

- **The skeleton** is executable code, tested before anything is built: the schematic (which machines exist, which pipe joins which port on which machine, the valves on each pipe, the direction of flow), the facts placement needs (each port's position and size on its machine, each machine's footprint and maintenance envelope, any height rule such as "below the balance tank's water line"), and just enough behaviour to be live (steady-state flows and pressures, so every pipe carries a flow and every gauge has a reading).
- **Placing the machines** binds the dev rooms' models to the skeleton's blocks: gauges read it, valves and switches change it, pipes are generated from its connections.
- **Deepening it** adds what makes each room worth visiting: filters clogging and backwashing, chemical levels drifting, boilers firing against demand, faults and wear. Each addition shows at once on machines already in place.

Nothing in the plant is decoration: every pipe is one of the schematic's connections and carries the flow the model computes, so a pipe leaving a room must continue in the next.

## 2. Blocks within blocks

The model is made of blocks (`src/game/sim/blocks.ts`). A block is one thing in the plant, of a reusable kind (a pump set, a boiler, a valve), with its own state and, if it is made of smaller things, its child blocks: a pump set holds its pump, motor, strainer and valves; a boiler holds its controller, burner and heat exchanger. Every boiler is the same kind of block, told apart by its address.

Every block has an address: the names from the root down, joined by `/` (`boilerHouse/B-501/controller`), and a field of its state after a `:` (`circulation/P-101/motor:running`). Everything outside the model binds to addresses: the boiler panel's display reads `boilerHouse/B-501/controller:display`, its RESET key writes `boilerHouse/B-501/controller:reset`, a gas valve's handle drives `gasHouse/isolator-1:open`. The model never knows what is bound to it, and one block can be bound to a dev-room exhibit, a plant-room machine and a control-room mimic at once.

### Ports: what the rest of the world sees

A block shows the world only its ports, never its insides. Each port carries a kind of exchange: water (its flow, pressure and temperature), gas, electricity, heat, or a signal (a demand, a fault, a reading). The rest of the model cares only about what crosses a block's ports: the plant does not care which state the boiler's controller is in, only what comes out of its flow port (how much water, how hot), how much gas goes in, and what its fault signal says. What happens inside is the block's own business, decided by its state and its children.

So a boiler, seen from outside, is: water in (flow and temperature, set by the rest of the circuit), gas in (available or not), a demand signal in; water out (the same flow, hotter by what it burnt), gas burnt, status and fault signals out. Inside, its controller (the state machine with the code display, `components/plant/logic/boiler-house.ts`) decides whether and how hard to fire from those inputs, including the conditions the user named: no flow, or too little water pressure across it, and it will not light (real boilers have a flow switch or a differential-pressure switch for exactly this, and block or lock out on it).

### The block interface, after FMI

Each kind of block (`src/game/sim/block-kind.ts`) declares, after the Functional Mock-up Interface: its inputs and outputs (named, with units), its parameters (fixed once made), its state (its own, unseen by anything else), and one step function from state and inputs to new state and outputs. A system (`src/game/sim/system.ts`) wires outputs to inputs, refusing any wire to an undeclared port, and steps its blocks in order each tick, each seeing what its sources hold now (co-simulation's Gauss–Seidel order, which also breaks loops such as boiler → load → boiler).

**Sleeping: not calculating everything all the time.** A block that finds itself steady says so, with what would disturb it: how far each input may drift, the ranges inputs must stay within (a boiler's return limit, its flow switch's minimum), and the time of its next scheduled change (a purge ending). Until one of those happens the system does not step it. Woken, it is given all the time it slept to catch up, which its promise covered; whatever woke it happened within the last tick. A block that changes slowly but never quite stops (a mass of water) promises instead to drift no more than a set amount before a time it works out from its present rate, sleeps that long, then catches up exactly.

**Direct feedthrough.** An output that depends on present inputs, not only on state (water leaving a boiler is the water arriving plus the heat put in, so a boiler that is off passes its return straight through), is given by the kind's cheap `read`, which the system evaluates every tick, asleep or not. Sleep skips only the costly part, the state's update. Without it a sleeping block's stale output can fool the next into thinking itself settled, and a loop of them stalls: the first test of the experiment below did exactly that.

**What it buys, and costs** (`src/game/plant/heat-loop.test.ts`): a boiler heating a load through a pump settles where its heat equals the load's loss; once steady, over 95% of block steps are skipped; asleep and fully stepped runs agree within half a kelvin for under a third of the work. A boiler heating a tank on a closed loop switches off when its return has been over its limit for its confirmation time, woken by the limit itself, within 3% of the time of a fully stepped run (the tank's allowed drift, on a climb of 0.0006 K/s, adds up to minutes), and starts again once the tank has cooled its differential below. A failed ignition locks it out until RESET; a lost flow stops it at once, asleep or not.

### Blocks made of blocks

A composite (`src/game/sim/composite.ts`) is a block kind whose state is a small system of blocks of its own. It declares its own ports, each mapped onto its parts' ports, and outside it is a block like any other. It sleeps when every part inside it is asleep, promising what they promised, and checks each part's promise against what its inputs are now inside it, so a part stirred by another part wakes it. The gas house (ECV, meter and governor, safety shut-off valve, gas detector, emergency stop) and the motor control centre (pump motors, fans, busbar) are composites (`src/game/plant/gas-house.ts`, `electrical.ts`).

### Lessons the tests taught, now rules of the system

- **A woken block catches up on what it was promised.** It is stepped over the time it slept with its inputs as they were when it fell asleep (a number that stayed within its tolerance taken at its midpoint), then over the last tick with the inputs that woke it. Whatever woke it happened in that tick and must not be applied to the time before: a motor control centre that had slept through a power cut must not "start" its motors in the dark.
- **Readings are never stale.** A block whose outputs follow its state through time (a tank of water) gives them for the present time through `read`, even asleep; a stale reading passed round a loop as a block's own input starves it.
- **Judged steady, a block settles exactly** on what it was approaching, so no small shortfall is frozen in while it sleeps.
- **Sleeping costs a bounded error**, which the tests measure: a composite and its parts laid out flat agree exactly before anything sleeps and within a hundredth of a kelvin after.

### Scenarios

The tests exercise each domain with blocks and composites together:

- **Heat** (`heat-loop.test.ts`): a boiler heating a load through a pump; a boiler heating a tank on a closed loop until its return passes its limit and it switches off, then starts again as the tank cools.
- **Water and controls** (`boiler-bench.test.ts`): a boiler between an endless supply and an endless drain, the flow set by pressure across its own resistance, its controls worked one by one: demand, setpoint (followed, and run flat out when beyond its power), a throttled valve (its flow switch), low water pressure, lost gas (flame failure, RESET) and overheat.
- **Gas** (`scenarios.test.ts`): the gas house feeding two boilers: the meter registering what they burn, consistent with their heat; pressure falling with flow; a weak governor stopping both on their low-pressure switches until mended; gas detected or the emergency stop shutting the safety valve, the gas house needing its reset and the boilers restarting by themselves.
- **Electricity** (`scenarios.test.ts`, `rcd.test.ts`): an incomer carrying the motor control centre's summed currents; everything started at once tripping it on the cluster's inrush, stopping the pumps and so the boilers' flow (electricity to water to heat); reset refused until cool, re-tripping if everything is still selected, holding if started in turn. And the simplest circuit, a supply, an RCD and a heater: current flowing until an earth fault trips the RCD within its standard's limits (300 ms at its rating, 40 ms at five times), staying off until reset, re-tripping on a fault still there, and tripping on its TEST button.

### One step of the model

Each step the model is evaluated in a fixed order, so every block sees consistent inputs:

1. **The water network** is solved (`src/game/sim/hydraulics.ts`): each block puts its links into the network between its ports (a running pump adds head along its curve, a shut valve is closed, a clogged filter resists more, a boiler's heat exchanger is a resistance), the schematic's pipes join the ports, and the solver finds every flow and every pressure.
2. **Each block steps**, given what arrived at its ports: the boiler's controller sees its flow and differential pressure, its return temperature, gas and demand, and decides; its outlet temperature is its inlet's plus the heat it put in over the flow it had (ΔT = P / (ρ·c·Q)), so with no flow it heats nothing and trips on overheat or flow fault.
3. **Temperatures and chemistry are carried** along the flows: what leaves one block's port arrives at the next, mixing where flows join (and, in the pool and tanks, mixing into their volume over time).
4. **Controllers and instruments read** the result: gauges, readouts, mimics, alarms.

The network is solved for its steady state each step; the plant's slower processes (temperatures, levels, clogging, chemistry) change step by step around it.

## 3. Principles for placing machinery

1. **Start from the process, not the room.** The schematic decides the layout; rooms realise it.
2. **Let physics fix the first positions.** The balance tank lowest, beside the pool, below deck level; the pumps below its water line so they are always flooded, with short straight suction lines; the filters straight after the pumps; boilers where the flue can get out; the gas meter and electrical intake at an outside wall; the chemical store at an outside wall with its own access, acid and hypochlorite kept apart, each bunded.
3. **Every machine has a maintenance envelope, not just a footprint:** room to lift a pump's motor off, to dig out a filter's media at its manway, to draw out a heat exchanger's tube bundle (its own length again), a clear metre in front of a boiler and of every electrical panel.
4. **Wall or island follows from the envelope.** Against a wall: panels, cubicles, wall controllers, chemical tanks, anything serviced only from the front. In the open: pumps on plinths, filters piped front and back, boilers in cascade.
5. **Reserve the routes before the details.** Pipework runs in defined corridors: high-level runs along walls at 2.4–3 m dropping to each machine, floor trenches for the big pool mains, ducts at the top of the air plant. Reserve them when a room is laid out; nothing crosses a walkway below 2.1 m headroom.
6. **Rooms meet at wall penetrations.** Each pipe or duct crossing a wall goes through a sleeve at a fixed point, held as shared data on that wall, and the run in the next room starts from the same sleeve. The building's layout belongs to the other agent working on the leisure centre, so these are agreed with it.
7. **Keep a route through every room:** a clear walkway about 1 m wide from the door to every machine and every valve that is operated, an escape route, and a way to bring the largest machine in and out through a door.
8. **Make the rules testable.** Each room's layout is data with pure tests: envelopes do not overlap, every schematic connection has a route, headroom and walkways are kept, the largest item fits through the door. A plan view in a dev room shows envelopes, corridors and sleeves before anything is modelled.

Order of work: schematic; the physics-placed items; envelopes, corridors and walkways per room; the wall sleeves, agreed; the remaining machines; the pipework generated along the corridors; then the dressing (lagging, labels, brackets, wear).

## 4. Where it stands

- `src/game/sim/blocks.ts`: blocks within blocks, addresses, reading and writing by address.
- `src/game/sim/hydraulics.ts`: the water network solver (pipes and fittings by the square law, non-return valves, pumps on their curves, shut valves), Newton's method on the junction heads.
- `src/game/plant/circulation.ts`: the main pool's circulation as blocks and a schematic: balance tank, duty and standby pump sets (each a pump, motor, strainer, non-return valve and two isolating valves), four filter sets (filter and its valves), heat exchanger, UV unit, pool. One pump gives its design 160 m³/h; the tests cover both pumps, a tripped or dead-headed pump, an isolated filter, clogging filters and a fouled strainer.

Next: the boiler and heat circuit as blocks (wrapping the boiler controller already written), the temperature step, then placement data for the first plant room.
