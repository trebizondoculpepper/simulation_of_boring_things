# The plant model, and putting it in the rooms

The game is about the model: how the pool's systems work and interact. The 3D plant rooms show that model and let the player act on it; they do not hold any of it. This note sets out how the model is built and the principles for placing machinery in the rooms around it. Written 2026-10-20.

## A bit of everything

A design goal, from the owner: this plant should have a bit of everything. Where a real pool of the period might choose one technology, the game's plant may carry several side by side (UV and ozone; hypochlorite and the remains of an older system; analogue gauges beside digital controllers; a cubicle from one decade next to one from another), so that the plant rooms show the full range of what pool engineering involves. Each item is still real and working, and the plant as a whole still has to make sense: everything is connected, and it all has to be maintained.

The same goes for time. The plant spans some forty years of pool technology: most of it is of around 2000, but older and newer machines sit beside it, and an anachronism is welcome (the dosing room's touch-screen controller after a controller of the 2020s stays). What the plant must not do is hand everything to one PC or SCADA screen: the game's fun is in the many different kinds of interface, from dial gauges and annunciators to code displays and touch screens. Every interface must be one the game can simulate (the owner, 2026-10-20).

## 1. Model first, then machines

The order is: write the model's skeleton, place the machines and bind them to it, then deepen the model room by room.

- **The skeleton** is executable code, tested before anything is built: the schematic (which machines exist, which pipe joins which port on which machine, the valves on each pipe, the direction of flow), the facts placement needs (each port's position and size on its machine, each machine's footprint and maintenance envelope, any height rule such as "below the balance tank's water line"), and just enough behaviour to be live (steady-state flows and pressures, so every pipe carries a flow and every gauge has a reading).
- **Placing the machines** binds the dev rooms' models to the skeleton's blocks: gauges read it, valves and switches change it, pipes are generated from its connections.
- **Deepening it** adds what makes each room worth visiting: filters clogging and backwashing, chemical levels drifting, boilers firing against demand, faults and wear. Each addition shows at once on machines already in place.

Nothing in the plant is decoration: every pipe is one of the schematic's connections and carries the flow the model computes, so a pipe leaving a room must continue in the next.

## 2. Blocks within blocks

The model is made of blocks (`src/game/sim/blocks.ts`). A block is one thing in the plant, of a reusable kind (a pump set, a boiler, a valve), with its own state and, if it is made of smaller things, its child blocks: a pump set holds its pump, motor, strainer and valves; a boiler holds its controller, burner and heat exchanger. Every boiler is the same kind of block, told apart by its address.

Every block has an address: the names from the root down, joined by `/` (`boilerHouse/B-501/controller`), and a field of its state after a `:` (`circulation/P-101/motor:running`). Everything outside the model binds to addresses: the boiler panel's display reads `boilerHouse/B-501/controller:display`, its RESET key writes `boilerHouse/B-501/controller:reset`, a gas valve's handle drives `gasHouse/isolator-1:open`. The model never knows what is bound to it, and one block can be bound to a dev-room exhibit, a plant-room machine and a control-room mimic at once.

### Three layers: rooms, machines, components

The owner's reading of it (2026-10-20): the plant has three layers. A room is a component full of machines (panels, processing machines, pumps, furnaces); each machine is an assembly of smaller, atomic components (buttons, gauges, lamps, valves). The same three layers run through both the model and the views. In the model, the ozone room's plant is a composite (`OZONE_PLANT`), its machines are blocks within it (the generator, the dryer), and a machine may itself be a composite of smaller blocks. In the views, a room lays out its exhibits, each machine view (`createOzoneGenerator`) is built of parts (`pushButton`, `createDialGauge`, `pilotLight`), and the room's logic (`ozone-room.ts`) binds the parts to the machines' ports. Nesting is allowed to go deeper where it helps, but these three are the layers a player meets.

### The pools: the plant's outputs

The pools are the simplest blocks in the model and the reason for all the others: their inputs are what the plant delivers (water returned at a flow, a temperature and a chemistry), and their state is what the pool rooms show, few things and plain ones: the water's level, its temperature, its cleanliness (clarity, free and combined chlorine, pH). Bathers and the weather act on them as loads. Everything else in the model exists to keep those few values right (`doc/design/two-realms.md`).

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

## How the plant rooms are arranged

The plant rooms are a dense, three-dimensional warren behind the pool rooms, and their arrangement follows two axes, set down as rules in `src/game/plant/placement.ts` and checked by its tests (the result is tabled in `plant-inventory.md`).

**Across, from the middle to the edge, by what a room serves.** A room whose services reach every attraction (the boiler house, the electrical switch room, the chemical store, the balance-tank hall, the control room) is central, the core of the warren. A room that serves one attraction (each attraction's own plant room) is peripheral, out at the edge beside its pool room, so that its pipes are short. A room that must reach the outside world (the loading bay for deliveries, the gas and mains water coming in, the air plant drawing fresh air) stands on the outer edge whatever it serves.

**Down, from the roof to the basement, by physics.**

- **Roof:** the air handling plant, which takes fresh air in and lets stale air out.
- **Surface:** the loading bay, where deliveries arrive by road; the chemical store beside it, never in a basement, because chlorine is heavier than air and would pool there; the electrical switch room, kept above the wet plant, out of the way of leaks and floods; the gas intake and the make-up water's break tank, where those supplies come in; the control room and the office, where the staff work.
- **Treatment, just below the pools:** each attraction's plant room, and the balance-tank hall, because pools overflow into their balance tanks by gravity (every tank lower than the water it collects), and the circulation pumps draw from the tanks at their own level; the service corridor that joins them.
- **Basement:** the boiler house, whose heat rises to everything it serves and whose flue climbs past everything to the roof; and the backwash holding and drainage, lowest of all, because everything drains to it.

Stairs and ladders join every level (ladders down into tanks and pits); a hoist or goods lift from the loading bay reaches every room that takes deliveries, so a replacement pump or ozone generator can be brought to where it is needed.

### One plan for every attraction's plant room

Each attraction's own plant room (the lounge pool's, the Olympic pool's, the jacuzzi's, the footbath's) is roughly rectangular, as big as it needs to be, and laid out on the same north–south plan, so that every one of them can be designed to the same general layout:

- **North end:** the door from the attraction it serves, the plant room door, at deck level; the pipes and services that run the attraction pass through the north wall.
- **South end:** the doors to the central facility, the shared plant at the core of the warren, at the plant floor.
- **West wall first:** cabinets and machinery fill the west wall by default; equipment goes on the east wall only when more space is needed.

This is recorded for when those rooms are modelled; none is built to it yet.

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

## 4. Systems to come: ozone and the sampling bypass

Two systems join the main pool's circulation next, both researched (`doc/research/ozone-plant.md`, `doc/research/water-sampling.md`) and both in keeping with a bit of everything: ozone alongside the UV unit, and the water-quality controller's sampling bypass reaching across three rooms.

### The circulation's order with them

Balance tank → duty and standby pumps (the sample tapping on their outlet main) → filters → ozone injection → contact tank → deozoniser (activated carbon) → heat exchanger → UV unit → chlorine and pH dosing (injected on the return, after the ozone stage, which would destroy chlorine) → pool. The pool overflows back to the balance tank, where the sample returns too.

### Ozone

Full-flow ozonation after PWTAG's code: at least two minutes' contact at 1 g of ozone per m³ of flow (three minutes at 1.2–1.5 g/m³ above 32 °C), a deozonising carbon filter before the water goes on, and a chlorine residual (about 0.5–1 mg/l) still kept in the pool, since ozone leaves none. At our 160 m³/h that is 160 g/h, which ProMinent's Bono Zon BONa 2D (160 g/h, 1600 × 1950 × 500 mm) gives exactly; it is the model for our generator.

As a block made of blocks (`sim/composite.ts`): the **air dryer** (dew point to −60 °C; wet air cuts output and makes nitric acid), the **corona-discharge generator** (about 12 kV, water cooled, about 18 Wh per gram), the **booster pump and venturi injector**, the **contact tank**, the **carbon deozoniser** (whose exhaustion lets ozone through toward the pool), the **off-gas destructor** (heated or catalytic) and the **ozone-in-air monitor** (set low, as ozone is heavier than air; the UK limit is 0.2 ppm over 15 minutes). Outside: circulation flow in, power and cooling water in, the ozone dose (g/h) and residual ozone after the deozoniser (mg/l) out, and its alarms. Its interlocks follow PWTAG's list: no circulation flow, cooling-water failure, dryer failure, loss of vacuum, its cabinet door, and gas detected in the room, each stopping it; after a leak it does not restart until someone has found it.

Rooms (proposed): the generator, its dryer and the room's ozone monitor in a small ozone room of their own, ventilated and alarmed, as the guidance expects (a new dev room); the booster, injector, contact tank and deozoniser beside the filters in the pump room.

### The sampling bypass and the water-quality controller

A tapping on the pump outlet main, before the filters and before any dosing point, so the probes read water as it comes back from the pool, not freshly dosed water; a short small-bore sample line (a booster pump if pressure is low); the flow cell (about 33 l/h, its flow switch alarming below about 21 l/h) with its free-chlorine (amperometric), pH, redox and temperature probes; and the controller above it, driving the hypochlorite and acid dosing pumps in proportion to how far each reading is from its setpoint. The sample returns to the balance tank. Combined chlorine is not measured automatically: the staff find it with the daily manual DPD test, against which the controller is checked (recalibrated if out by more than 0.2 pH or 15% chlorine) and the result logged.

The controller is its own small system with its own controls and indicators: it is the local panel. The dosing room's touch-screen controller (after ProMinent's DULCOMARIN 3, a deliberate anachronism) stays, its menus and readings a state machine in its block. Its interlocks inhibit dosing on lost sample flow (after a delay), on circulation failure, on an empty chemical tank, and when a pump has dosed too long without effect.

As blocks: the **sample tapping** (on the circulation network: a small branch whose flow follows the outlet main's pressure), an optional **sample booster pump**, the **flow cell** with its **flow switch** and **probes** (each with drift and fouling, and a calibration offset set by the daily check), and the **controller** (setpoints, proportional dosing demands, alarms, the inhibit). Outside: sample flow in, the water's chlorine, pH and temperature in (from the chemistry carried along the circulation), readings, dosing demands and alarms out.

Rooms: the tapping in the pump room, the flow cell and controller in the dosing room (beside the pumps they drive, apart from the chemical store), the return visible at the balance tank.

What the rest of the plant shows: the main pool mimic gains a sample take-off symbol on the pump outlet line, a SAMPLE FLOW lamp and a DOSING INHIBITED lamp (it already has the dosing lamp and free chlorine and pH readouts); the annunciator gains SAMPLE FLOW LOW beside its chlorine, pH and dosing windows; the chart recorders trace chlorine and pH from the controller's outputs.

Failures worth playing: a blocked or air-locked sample line, which freezes the readings so that the mimic and recorders look fine while the pool drifts out of balance (the tell-tales are the SAMPLE FLOW lamp out and a dead-flat trace on the recorder); a flow switch fooled into showing flow; probes drifting and fouling until the daily check catches them; and a tapping placed after a dosing point, which reads the dose rather than the pool.

## 5. Where it stands

- `src/game/sim/blocks.ts`: blocks within blocks, addresses, reading and writing by address.
- `src/game/sim/hydraulics.ts`: the water network solver (pipes and fittings by the square law, non-return valves, pumps on their curves, shut valves), Newton's method on the junction heads.
- `src/game/plant/circulation.ts`: the main pool's circulation as blocks and a schematic: balance tank, duty and standby pump sets (each a pump, motor, strainer, non-return valve and two isolating valves), four filter sets (filter and its valves), heat exchanger, UV unit, pool. One pump gives its design 160 m³/h; the tests cover both pumps, a tripped or dead-headed pump, an isolated filter, clogging filters and a fouled strainer.

Next: the boiler and heat circuit as blocks (wrapping the boiler controller already written), the temperature step, then placement data for the first plant room.
