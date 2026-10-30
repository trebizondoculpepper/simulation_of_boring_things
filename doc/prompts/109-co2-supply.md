# 109: the CO₂ supply

The owner, 2026-10-30: the CO₂ bottles are installed outside, in a cage, and a supply line comes through an inlet port in the building wall and is piped to the plant rooms that dose CO₂ for pH, where the CO₂ is introduced into the water. Later the same day: CO₂ is the next major game system, and its first stage is the visual elements: the cage beside the existing gas cage in the goods yard, the cylinders, the regulator and changeover manifold, and the connection to the low-pressure system at the wall inlet.

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first; its rules apply, above all that the plant is a model first (`doc/plant-model.md`), that the enhanced network is the one source of truth (every valve in the schematic before anything is drawn, tags derived, never written), that everything engineering is a real, working component after a real product, that the world state lives in `src/game/world.ts` with a migration for any change of shape, that `logic/` folders are pure and tested beside them, that some controls are only local, and that every new warning shows on both control rooms. The storage rules this mission follows are in `doc/reports/chemical-storage.md`: CO₂ cylinders never go in either chemical store.

## Why CO₂

Carbon dioxide lowers pH without adding chloride or sulphate and without a liquid acid's handling hazards; it is the usual alternative to hydrochloric acid on larger UK pools (PWTAG Code of Practice). It also keeps alkalinity up (dissolved CO₂ adds carbonate, not acid), so a pool dosed with hypochlorite and CO₂ drifts towards high alkalinity and may need some acid from time to time, a real operating trade-off the chemistry model already supports (`src/game/water/pool-chemistry.ts` carries total carbonate and CO₂ loss to air). It suits a large, still pool: in an aerated pool (a spa) the CO₂ is stripped out as fast as it is added.

## The water chemistry already there

The chemistry model already handles CO₂ (`src/game/water/pool-chemistry.ts`): `dose(water, { co2: grams }, volume, temperature)` adds the CO₂ to total carbonate without changing alkalinity and lowers pH (tested in `pool-chemistry.test.ts`, "carbon dioxide adds carbonate, not alkalinity, and lowers pH"), and each step loses CO₂ to the hall's air (`co2ToAir`, `co2LossConstant`, after Wojtowicz), checked against PHREEQC. What is missing is only the wiring: no pool's controller or dosing (`dosing-pumps.ts`, `water-treatment.ts`) has a CO₂ output, so nothing yet feeds `co2` into a pool's `added` doses.

## Which rooms take CO₂

Today none: every pool's pH is held with 10 % hydrochloric acid from the acid store (`src/game/plant/chemicals.ts`, `DAY_TANKS` in `chemical-distribution.ts`), and nothing in the game models CO₂ dosing. The recommendation:

- **The Olympic plant room (`plant_pool_02`, PL2)**: CO₂ for pH. The largest pool and the largest acid user (a 500 l acid day tank); the more automated pool, whose modern multi-channel controller (mission 105, after the ProMinent DULCOMARIN 3) has a CO₂ output in its real counterpart. A bit of everything: the Olympic doses CO₂, the others acid.
- **The Lounge (`plant_pool_01`, PL1)** keeps acid: the period, hands-on pool.
- **The Jacuzzi (`plant_pool_03`, PL3)** keeps acid: its air blowers strip CO₂.
- **The Footbath (`plant_pool_04`, PL4)** keeps acid: too small to justify a gas line.

The distribution is laid out to take more rooms later (a capped tee per plant room on the corridor's main), so the Lounge can be converted if the owner wants it.

## The real installation it follows

A UK leisure centre buying CO₂ from an industrial gas supplier (BOC, or Air Liquide or Air Products) on cylinder rental, with a packaged pool CO₂ dosing system (after the Lutz-Jesco or ProMinent CO₂ dosing panels, or a pool contractor's own), installed under BCGA CP 4 (gas supply and distribution systems) and stored under BCGA CP 44 (the storage of gas cylinders), with detection under EH40's workplace exposure limits for CO₂ (5,000 ppm over eight hours, 15,000 ppm over 15 minutes).

Brands are the game's own (`src/toolkit/components/core/logic/brands.ts`): no real company's name or mark. A new gas supplier brand is needed (its cylinders, cage plates and rental labels, and its lorry, a Haulmark rigid with a tail lift); the dosing panel and solenoids from Chlorella Chemicals (who make the dosing kit already); the gas detection from whoever makes the stores' chlorine detectors; every panel by Penfold Controls with its mark.

## The cylinder compound

- **Where**: outside, in the goods yard, against the building's wall beside the existing gas cage (the forklift propane cage, `lpg` in `YARD_DRESSING`, `src/toolkit/gallery/logic/dock-yard.ts`; the owner calls it the butane cage), east of it past the grit bin, where a lorry can reach it to drop full cylinders and collect empties; clear of the bays' swept path, drains and cellar openings (CO₂ sinks), and of the chemical stores' fill points.
- **What**: a galvanised steel mesh cage with a mesh roof or a weather canopy, open to the air on its sides for ventilation, on a level concrete base, with a locked gate. Signs on the gate: compressed gas (GHS04), asphyxiant, no smoking, the supplier's emergency number, the cylinders' contents.
- **Cylinders**: upright and chained (or held by a restraint bar) in rows, full and empty kept apart and labelled (FULL, IN USE, EMPTY tags), each a black-bodied cylinder with a grey shoulder (BS EN 1089-3 for CO₂).
- **Size**: cylinders of about 34 kg CO₂ each, the largest single cylinder a supplier rents, connected by flexible pigtails to the manifold. Manifolded cylinder packs are an alternative (open question 3).

## The manifold and pressure reduction

- **A two-bank automatic changeover manifold** (after the BOC or Gas Arc changeover manifolds), wall-mounted in the cage: a duty bank and a standby bank, each of several cylinders. When the duty bank's pressure falls below its changeover point the manifold switches to the standby bank, and a **flag** on the manifold turns red and a **lamp** lights (and a volt-free contact sends BANK EMPTY to both control rooms). A lever selects which bank is duty, so after the empties are swapped the operator turns it to make the full bank standby again.
- **Heating**: a CO₂ cylinder's liquid boils to feed the gas, and the gas cools as its pressure drops; at a pool's flow the first-stage regulator needs an electric heater (or the banks enough cylinders) not to freeze. The heater is a load on a circuit from the switch room.
- **Pressure is reduced at the compound.** Cylinder pressure is about 57 bar at 20 °C; the manifold's regulator brings it down to a few bar (about 4 bar) before the line leaves the cage, and a relief valve on the low-pressure side vents outside. Inside the building the gas runs only at that low pressure, never as a high-pressure line, because a leak or a broken pipe indoors then releases far less gas, at a rate the extract and the detectors can deal with, and the full contents of the bank stay outside in the open air.

## Into the building

- **The wall inlet port**: the line, copper or stainless, enters through a sleeved, sealed penetration in the loading bay's external wall, labelled CO₂ (BS 1710 identification, light grey band with "CO₂").
- **An emergency isolation valve at the wall**: a lever ball valve just outside or just inside the wall where it can be reached from the yard, its handle red, a sign beside it (CO₂ EMERGENCY ISOLATION); and a normally closed **master solenoid valve** just inside, which the gas detection shuts on alarm.
- **Distribution**: a low-pressure main through the loading bay and along the corridor (as the chemical mains run, `corridor-services.ts`, until those runs are derived from the schematics' boundary links) to the Olympic plant room, with a capped, valved tee for each plant room that might take CO₂ later. Every valve is in a schematic first.

## In each plant room that doses CO₂

- **A local isolating valve and a second-stage regulator** with its gauge, setting the dosing panel's inlet (about 1–2 bar).
- **A solenoid valve**, opened by the pool's pH controller (pulsed or proportional), shut when circulation stops (the same interlock as the dosing pumps).
- **A flowmeter**, a glass-tube rotameter with a needle valve, reading kg/h (or a mass-flow meter on the modern Olympic, showing its reading on its own display).
- **The injection point**: a side stream taken from the circulation's return after the filters and heater, a small booster pump, and an injection cone or a diffuser in a short contact pipe, the gas dissolved under pressure before the side stream rejoins the main flow; a non-return valve on the gas line before the injection. All of it in the room's schematic, each part a node or fitting, tags derived (PL2-…).
- **The pH controller** (mission 105) drives the solenoid in place of the acid pump; the acid day tank's fate is open question 1.

## Gas detection

- CO₂ is heavier than air, so each detector's sensing head is low, about 0.3 m above the floor, near the line's lowest joints, in every room the gas is piped into or through: the loading bay (the wall inlet), the corridor's stretch if it has joints, and each dosing plant room.
- A real fixed CO₂ detector (NDIR), two alarm levels at EH40's limits (5,000 ppm low, 15,000 ppm high), a beacon and sounder at each room's door, an alarm panel by the wall inlet.
- On alarm the master solenoid shuts and the room's extract runs at high speed; the alarm shows on the old control room and on the bridge (`alarms-on-both-control-rooms`), and the CO₂ supply's mimic shows it.
- In the world's gas detection (`src/game/plant/gas.ts`): a `CO2` gas's parameters beside `CHLORINE` and `OZONE` in `general-safety/logic/gas-detection.ts`, and the rooms as new zones.

## Gameplay

- **Use**: the Olympic's controller opens the solenoid; the duty bank empties at the rate the pool needs.
- **Bank empty**: the manifold changes over, its flag goes red, BANK EMPTY shows on both control rooms. The player goes out to the cage (with its key), shuts each empty cylinder's valve, unscrews its pigtail, chains it in the EMPTY row and tags it, chains a full one into its place, connects and opens it, checks for leaks (leak-detection spray; a hissing joint is a fault), and turns the lever to make it the standby bank, resetting the flag.
- **Delivery**: full cylinders run out in the cage unless ordered; the supplier's lorry comes on a set day (or when called), drops fulls and takes empties, and the cage's stock changes accordingly. A delivery note or rental record shows what is on site.
- **Faults to put right**: both banks empty (pH rises, the controller in alarm); a frozen regulator (the heater off, a fuse in the switch room); a leaking pigtail; a closed cylinder valve after a swap; a stuck solenoid; a CO₂ alarm in a plant room that has shut the master solenoid and must be reset at the panel after the leak is found (a local control, as trip resets are).

## Consumption and the cage, roughly

An indoor pool dosed with CO₂ uses something like 1 kg a day for every 100 to 200 m³ of water, more with a heavy bathing load or a high hypochlorite dose. The Olympic (`poolVolume('pool_02')`, about 2,500 m³ for a 50 m pool) would use roughly 15 kg a day, half a 34 kg cylinder; a bank of four cylinders (136 kg) lasts about nine days. With two banks of four connected, four or more full cylinders held spare and room for the empties, the cage holds about 16 cylinders, a little over 3 m by 1.5 m inside, and a weekly or fortnightly delivery keeps it going. These are estimates to tune against the chemistry model once the CO₂ dose is in it (the dose to hold pH depends on alkalinity and on CO₂ lost to air, both modelled).

## Model first

- The supply is a schematic of its own (the compound: cylinders, pigtails, manifold, regulator, heater, relief, the line out) and a link through the loading bay's wall into the building's CO₂ main, with every valve (cylinder valves, the manifold's bank valves, the emergency isolation valve, the master solenoid, each room's isolator, solenoid, needle valve and non-return valve) in the schematics before anything is drawn, each with its function, normal state and tag.
- The cylinders' contents, the duty bank, the flag, the stock in the cage, the master solenoid's state and the detectors' states live in the world (`WORLD_VERSION` bumped, with a migration); the CO₂ dose enters the Olympic's water through the chemistry model as added total carbonate.
- The cage is outside, in the goods yard the loading bay's room already shows and the walker reaches through its fire exit; how the yard joins the plant model is open question 2.

## Order of work

1. **Stage 1, the visual elements** (the owner, 2026-10-30), each a real working component though the system does not yet run: the CO₂ cage beside the gas cage in the goods yard; tall bulk-delivery cylinders, black with the grey shoulder of BS EN 1089-3 and their supplier's labels, each holding its contents; the regulator with the two-bank changeover manifold, its gauges reading each bank's and the outlet's pressure and its flags and lever showing which bank is in use; and the low-pressure line from the regulator to the wall inlet port with its emergency isolation valve. Tried in a dev room first, then placed in the yard.
2. The CO₂ supply's logic, pure and tested: cylinders and banks, the changeover, pressures, the regulator's heater and freezing, flow, the solenoid and its interlocks; the CO₂ dose in the chemistry model; detection's `CO2` gas.
3. The schematics: the compound, the wall inlet and main, the Olympic's side stream and injection, in the enhanced network, valves and tags derived.
4. The rest of the components in a dev room: the manifold with its flag, lamp and lever, a cylinder with its valve and pigtail, the rotameter, the solenoid, the detector and its panel, the emergency isolation valve (on dev0's boards for any new kind of control).
5. The world: state, migration, the Olympic's controller switched to CO₂, alarms on both control rooms, the CO₂ mimic.
6. The line through the loading bay and the corridor to the Olympic plant room.
7. Swap-out and delivery as gameplay; the faults.
8. Changelog, TODO and the storage report updated.

## Open questions for the owner

1. Does the Olympic give up hydrochloric acid entirely, or keep its acid day tank as a standby and for trimming alkalinity (as real CO₂ pools often do)?
2. The cage stands in the goods yard (settled: beside the gas cage), but the yard is today only set decoration of the loading bay's room: should the yard gain a schematic of its own (a room in the plant model) so the cage's cylinders, manifold and valves bind to the enhanced network like every other machine?
3. Single 34 kg cylinders on a manifold (more swapping, more gameplay) or manifolded cylinder packs (fewer, heavier swaps by the supplier's driver)?
4. Should the Lounge also take CO₂ (contrary to its manual, period character), or stay on acid?
5. What is the new gas supplier brand called, and does the supplier's lorry come on a schedule or only when the player orders?
