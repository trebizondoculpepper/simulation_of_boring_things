# The CO₂ system: supply, distribution, dosing and detection

The owner, 2026-10-31: CO₂ is dosed through a valve controller, not a pump (`doc/prompts/114-aqualis-dosing-controller.md`); the cylinders and the master valve go in the loading bay; the gas is carried through the building to a CO₂ port in the wall of each plant room that doses it, the route between not modelled pipe by pipe; in each such plant room a CO₂ valve controller doses it into the circulation, driven by the room's Dr Aqualis Trio. This note records the pure logic built for it, what it follows in the real world, its sizes, how it will be drawn later, and what is left for the owner. It builds on mission 109 (`doc/prompts/109-co2-supply.md`), whose stage 1 already made the cylinder supply's logic and its drawing.

Nothing here touches the world state, `world.ts`, the Trio's world integration, the schematics or any visuals. The seam for the world is `co2-plant.ts`: a `Co2Plant` state the world can hold, and `stepCo2Plant`, which takes each room's Trio demand and whether its water is moving and returns the grams of CO₂ for each pool's `Additions.co2`.

## What already existed (mission 109, stage 1)

- `src/toolkit/components/plant/logic/co2-supply.ts`: banks of 34 kg cylinders (four a bank), a two-bank automatic changeover manifold with its lever and flags, the cylinders standing at CO₂'s vapour pressure (NIST: 57.3 bar absolute at 20 °C) until their liquid is gone, then falling with the gas left, changeover below 10 bar, the regulator to the 4 bar low-pressure line, and the line's emergency isolation valve at the wall. Kept where it is, in the toolkit's `plant/logic`: it is pure, it is shared by the dev room's part and the world, and `src/game/plant/gas.ts` already imports toolkit logic the same way.
- Its drawing: `plant/parts/co2-supply.ts` and `plant/views/co2-cage.ts` (a galvanised mesh cage after BCGA CP 44, two banks of four tall cylinders on pigtails, the changeover manifold and regulator), built with the shared welded-mesh cage (`architectural/views/mesh-cage.ts`, its logic and part beside it) and the cylinder builder (`plant/views/gas-cylinder.ts`), as the loading dock's LPG cage (`loading-dock/parts/lpg-cage.ts`) is; tried in dev55 and stood in the goods yard at `YARD_CO2` (`dock-yard.ts`).

## What was added

- `co2-supply.ts` (toolkit), extended: `co2SupplyAlarms`, the manifold's volt-free contacts, BANK EMPTY, CHANGE CYLINDERS while either bank's flag is red and SUPPLY EXHAUSTED when both are.
- `src/game/plant/co2-distribution.ts`: the master valve, the building line and the wall ports, around the existing supply.
- `src/game/plant/co2-dosing.ts`: each plant room's CO₂ valve controller, its `ChannelFeedback` adapter for the Trio, and the Trio's 4–20 mA and release signal.
- `src/game/plant/co2-detection.ts`: the rooms' CO₂ and their detectors, alarms and interlocks.
- `src/game/plant/co2-plant.ts`: the three wired together, the world's seam.
- Tests beside each, and `co2-loop.test.ts`, the whole system closed round the Trio's controller on the Aqualis test rig.

## The master valve and the building line (`co2-distribution.ts`)

- **The master valve**: a normally closed solenoid valve just inside the loading bay's wall, after the emergency isolation valve (mission 109's design; the gas-industry master shut-off solenoids a detection panel drives). Open only while switched on at its panel, powered (24 V) and not tripped. The detection's high alarm trips it, and it is reset at its panel in the loading bay (a local control), not while a detector still holds it.
- **The line**: one volume of gas, 12 litres (about 80 m of 15 mm copper, 13.6 mm bore), at one pressure, by the ideal gas law (about 88 g above atmospheric at 4 bar). Each step the regulator gives what is drawn and tops the line up to its outlet (4 bar, or less on a bank nearly spent), up to 10 kg/h, while the master valve passes. With the supply stopped, the dosing valves still drawing bring it down in a minute or two to their inlet pressure switches, where they stop and it holds; a leak empties it. A line nobody draws on holds its pressure (the regulator locks up).
- **The wall ports**: one for the Lounge (`plant_pool_01`) and one for the Olympic (`plant_pool_02`), each with its isolating ball valve; open, the room sees the line's pressure; shut, nothing (the gas trapped behind it is neglected).
- **Leaks**: a leaking joint on the room side of a port (g/h at 4 bar, scaled by the absolute pressure) gives its gas into that room's air; a leaking pigtail at the manifold gives the cylinders' gas into the loading bay, master valve or no.
- **Alarms**: BANK EMPTY, SUPPLY EXHAUSTED, MASTER VALVE TRIPPED, and LINE PRESSURE LOW (below 2.5 bar with the master valve switched on).

## The CO₂ valve controller (`co2-dosing.ts`)

A packaged pool CO₂ dosing panel on the wall beside the room's wall port, after the commercial CO₂ feed systems (Blue-White's, with its flow meter and stainless solenoid valve; Neptune Benson's and Chemtrol's, a normally closed solenoid, a rate-of-flow meter, and an injection nozzle or diffuser with its check valve) and the European gas dosing panels of Lutz-Jesco and ProMinent. Each has an inlet pressure switch, its own second-stage regulator (2 bar working, needing 0.3 bar above it), a dosing valve, a flow meter, a non-return valve, and the gas line to the injection point, whose back pressure is the booster line's water (1 bar). Two kinds, a bit of everything:

- **'solenoid'**, the Lounge's, the period's panel: a normally closed solenoid valve, a glass-tube rotameter with a needle valve setting the flow while it is open (300 g/h), and a limit contact on the float that proves the flow. The Trio's 4–20 mA is turned into time-proportional opening on a 60 s cycle, so the average is demand × the needle valve's setting.
- **'mass-flow'**, the Olympic's, the modern panel: a thermal mass flow controller, its proportional valve and meter in one body (after Bronkhorst's EL-FLOW and Brooks's SLA series, which take a 4–20 mA set point and give back the measured flow), range 2 kg/h, holding demand × its range whatever the inlet pressure, while it can.

Both take, from the Trio's CO₂ port, its 4–20 mA (4 mA nothing, 20 its most; below 3.6 mA a broken loop, NAMUR NE 43) and its release contact (closed while it asks for anything), as the brief's ports are; and give back its mode, power, fault relay and metered flow in g/h, which is `ChannelFeedback` exactly (`co2Feedback`; null with the control cable not connected). `trioSignal(demand, connected)` is the cable the other way.

- **Its selector**, REMOTE · MANUAL · OFF, a local control on the panel, as `ChannelFeedback.mode`: REMOTE doses as the Trio asks while its release is closed; MANUAL at its own rate (g/h), ignoring the Trio; OFF nothing.
- **Power**: off, its valve closes (normally closed); the Trio sees `no-power`.
- **Faults**, each shutting its valve and opening its error relay with the fault named (the Trio shows OFFLINE, fault, with the words): CO₂ GAS ALARM (the room's detector's interlock), NO SUPPLY PRESSURE (inlet below 2 bar, set where the valve still passes most of its flow, so a falling supply is called as what it is), NO WATER FLOW (the injection's booster not running), SIGNAL LOST (a broken loop, in REMOTE only); and two it latches until RESET at the panel: FLOW NOT PROVED (asked to dose and the meter showing under half of it for 30 s of open time) and VALVE STUCK (the meter showing flow it was not told to give for 30 s).
- **Injected faults**: its valve stuck shut (FLOW NOT PROVED follows) or stuck open (it doses its most whatever it is told, VALVE STUCK is called, and only shutting the wall port or the master valve stops it).
- **Output**: grams of CO₂ each step, for the pool's `Additions.co2`, and the same grams drawn from its wall port.

### Sizes

The Trio's pH channel asks, at full scale, for 1.5 g of HCl an hour for each m³ entered (`ACID_G_PER_M3`), and shares it CO₂ first, at `CO2_PER_HCL` (44.01 / 36.46, 1.21 g of CO₂ a gram of HCl), up to the CO₂ valve's most, acid taking the rest.

- **The Lounge**: 139 m³ and its tank, about 150 m³: 270 g/h at full scale, so the 300 g/h rotameter takes all of it, the same as the rig's ideal valve (`RIG_DEVICE_MOST.co2`).
- **The Olympic**: 2,500 m³ (not the 150–600 m³ of the brief: `poolVolume('pool_02')`), about 4.9 kg/h at full scale but some 15 kg a day, 0.6 kg/h, on average (mission 109's estimate); the 2 kg/h mass flow controller carries the base load three times over and acid trims the peaks, as the Trio's sharing intends. At 2 kg/h flat out one bank of four lasts some 64 hours before it changes over.

## Gas detection (`co2-detection.ts`)

CO₂ is an asphyxiant and heavier than air, so each room it is piped into (the loading bay and each dosing plant room) has a fixed infrared (NDIR) CO₂ detector, after Crowcon's Xgard IQ or Dräger's Polytron 2 IR, 0–5 % volume, T90 30 s, its head 0.3 m off the floor. The model follows the toxic gas detection's pattern (`general-safety/logic/gas-detection.ts`): one well-mixed room whose air changes carry the gas off toward where the leak alone would hold it, a detector lagging the air, alarms latched until reset with the air clear, ACCEPT silencing the sounder. It differs where CO₂ does: the air already holds some (420 ppm outdoors, 500 in a plant room), and its alarms are EH40's workplace exposure limits for CO₂ as well as the instantaneous levels, the averages kept as such detectors keep them, in buckets (fifteen one-minute means, thirty-two quarter-hour means).

- **A1 (low)**: the reading at 5,000 ppm, or its 8-hour average at 5,000. The beacon flashes, and the room's dosing valve shuts (`dosingInterlock`).
- **A2 (high)**: the reading at 15,000 ppm, or its 15-minute average at 15,000. The sounder sounds, the extract purges, and the master valve trips (`masterInterlock`), stopping the gas to the whole building.
- **Rooms** (estimates): the loading bay 320 m³ at 3 air changes; the Lounge plant room 600 m³ and the Olympic's 2,250 m³, at 4, purging at 10, 0.3 with the extract stopped. With the extract running a joint leaking 2 kg/h only lifts the Lounge plant room by some 450 ppm; with it stopped, the same leak reaches A1 in a few hours, and a broken joint at the regulator's 10 kg/h reaches A2 in about three.

## Tests

- `co2-supply.test.ts` (toolkit): the manifold's alarms.
- `co2-distribution.test.ts`: the line's starting pressure and gas; ports given what they draw from the bank in use; pressure held with the master shut and nothing drawn; falling within two minutes when the master shuts and dosing goes on, and refilling; the same through the emergency isolation valve, an unpowered master or a tripped one; the trip held until reset; a shut port; cylinders emptying, changing over and calling BANK EMPTY, the line unaffected; both banks spent, SUPPLY EXHAUSTED; port and manifold leaks.
- `co2-dosing.test.ts`: the 4–20 mA and release; the sizes against the Trio's channel; each kind in REMOTE, MANUAL, OFF and unpowered; the solenoid's time-proportional average on fine and coarse steps; every fault, latched and not; the feedback as `ChannelFeedback` and the Trio's `channelStatus` for every OFFLINE reason; and the panel on `stepController`'s `ports.co2`, dosing what it asks in g/h, and shown OFFLINE, still asked, when switched off.
- `co2-detection.test.ts`: the background; a leak settling under ventilation; A1 with the extract stopped and its interlock; A2 on a burst, ACCEPT; the averages; the 8-hour and 15-minute alarms; latching and reset.
- `co2-plant.test.ts`: both rooms dosed from the cylinders; the master shut, both panels on NO SUPPLY PRESSURE; a leak's A1 shutting that room's dosing only; a burst's A2 tripping the master for the building; one panel off, the other dosing.
- `co2-loop.test.ts`: the Aqualis rig at the Lounge's size on its 'ph-high' scenario, its acid pump and ideal CO₂ valve unplugged and the Lounge's real panel on the Trio's CO₂ port, fed from the cylinders: in twelve hours of AUTO the pH comes down from 7.9 to within 0.05 of its band (7.2–7.4) with CO₂ alone, the alkalinity unchanged; with the master valve shut it stays high and the Trio shows the channel OFFLINE, NO SUPPLY PRESSURE.

## How it will be drawn

All of it from the model, each piece a node or fitting of a schematic first.

**The supply, at the loading bay.** The existing cage (`co2-cage.ts`, with its mesh cage, cylinders on pigtails, manifold, flags, lever and regulator) stays as it is drawn; where it stands is the first question below. The line leaves the regulator in copper with a BS 1710 light-grey band and "CO₂", runs to a sleeved, sealed wall inlet in the loading bay's external wall with the emergency isolation valve (a red-handled lever ball valve and its sign) beside it, and inside, the **master valve**: a normally closed solenoid valve on the line, with its own small Penfold Controls panel (ON/OFF, a TRIPPED lamp, RESET) and the loading bay's CO₂ detector panel beside it. A pressure gauge on the line reads the building line's pressure. The line then goes into the wall, not drawn beyond it.

**In each plant room.** The **wall port**: a stainless or copper stub through the wall at about 1.5 m, its grey band and "CO₂", a lever isolating ball valve and a gauge reading the line's pressure. The **valve controller**: a wall-mounted dosing panel (a white or grey backboard, its maker's badge, Chlorella Chemicals after mission 109's brand note) carrying, top to bottom, the inlet pressure switch and the second-stage regulator with its gauge, the dosing valve (a solenoid coil with its lamp on the Lounge's; a mass flow controller with its own LED readout of g/h on the Olympic's), the flow meter (on the Lounge's, a glass-tube rotameter with its float, needle valve and limit contact; the Olympic's flow is on the controller's readout), the non-return valve, and a small control box with the REMOTE · MANUAL · OFF selector, the manual rate (a ten-turn potentiometer on the Lounge's, push buttons on the Olympic's), lamps for each fault and RESET, and the cable gland to the Trio. The **injection point**: a booster side stream off the circulation's return after the filters and heater, its small pump, and an injection cone or diffuser in a short contact pipe, with a non-return valve on the gas line before it, routed by the plumber. The room's **CO₂ detector**: an NDIR head 0.3 m off the floor near the panel, its display, beacon and sounder at the door. The shared helpers serve where they fit: the cylinder builder is for the cylinders only; the mesh cage has no place in the plant rooms, but a mesh guard over the injection booster could use it.

## Not modelled

The regulator's heater and freezing at high draw (mission 109, stage 2), the gas trapped behind a shut wall port, the corridor's stretch of the line and its detector, the cylinder deliveries and the swap-out as gameplay, the detection's own faults, and any building line pipe by pipe.

## Questions for the owner

1. Mission 109 stood the cylinder cage outside in the goods yard, beside the gas cage, with the line coming in through the loading bay's wall (BCGA CP 44 prefers cylinders outdoors); is "the cylinders in the loading bay" that, the cage in the yard at the loading bay's wall, or should the cage move indoors into the loading bay?
2. Does the Lounge take CO₂ (this brief), though mission 109 recommended it keep acid for its manual, period character?
3. Does the Lounge get the period's solenoid and rotameter panel and the Olympic the modern mass flow controller, as built, or should both be one kind?
4. Is 2 kg/h right for the Olympic's panel, a base load with acid trimming the peaks, or should it be sized for the Trio's whole full scale, about 5 kg/h, which a bank of four cylinders could not give without a heater?
5. Should the 8-hour average's alarm, which can hold a room in alarm for hours after a long low leak, block the reset as built, or should RESET clear it once the reading is clear?
6. Should a low alarm in one plant room shut only that room's dosing, as built, or the master valve for every room?
