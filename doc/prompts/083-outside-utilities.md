# 083: The utilities area in the goods yard

Status: not started (written 2026-10-26 with the owner).

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first; its rules apply.

## The request

The owner, 2026-10-26: in the goods yard outside the loading dock ([073](073-loading-dock-layout.md), [080](080-goods-yard.md)), put what one finds outside a building: industrial wheelie bins and the like. And move the facility's incoming services out there, to a small utilities area to one side, where a utility company's reader can reach the meters without going deep into the plant: the water main and its meter, the gas main, the gas supplier's meter and the facility's main gas shut-off, and the electricity supply and its meter. Then the meters and the master shut-offs are not inside the building at all: to switch off water, gas and electricity, one turns three levers outside.

This is how real sites are laid out: the gas meter and its emergency control valve in an outside meter housing the supplier can reach; the electricity supplier's cut-out and meter often in an outside meter cabinet; the water meter in a boundary chamber or kiosk.

## What there is now (checked 2026-10-26)

- **Water**: the town main enters the wet hall's make-up bay (`src/game/plant/wet-hall-schematic.ts`: the `town-main` machine, "Town main to the meter", its stop valve `townMainStop`, the make-up water meter that reads and records), feeding the break tank and the booster set. The owner placed the main's master valve before the meter and asked for the meter's numbers to work and read on inspection.
- **Gas**: the boiler house's gas safety panel (`gas-safety`) and its safety shut-off valve (`world.boilerGas.ssovOpen`, `src/game/plant/boiler-gas.ts`, tested in `boiler-gas.test.ts`), struck shut by its emergency stop.
- **Electricity**: the main incoming switch (`main-switch`, Voltara) in the switch room, isolating the whole site (`room-equipment.ts`); the LV switchboard after it.
- **The yard**: its walkable tarmac, steps and 50 m limit, and the two hookup cabinets either side of the pier door (073, 080).

## What to build

- **Dressing**: industrial wheelie bins (1100 L four-wheeled steel bins, a general waste and a recycling one), and what else a service yard holds; set decoration, clear of the lorries' bays and the steps.
- **A utilities area** to one side of the yard, against the building's outside wall, clear of the bays: three outside housings in a row, each a real product's kind, each with its maker under the brands rule:
  - **water**: the incoming main rising from the ground into a meter kiosk, its stop valve with a lever (or a key-operated boundary stop tap beside it), its meter reading and recording as the make-up meter does now;
  - **gas**: a meter housing on the wall, the supplier's meter (its index read on inspection), and before it the emergency control valve with its lever, a yellow handle, its "GAS EMERGENCY CONTROL" label; the gas main then entering the building toward the boiler house;
  - **electricity**: a meter cabinet with the supplier's cut-out and meter, and the main switch with its rotary handle; the incoming cable then running to the switch room.
- **What moves**: the water main's stop valve and meter out of the wet hall; the gas emergency control out of the boiler house (its safety panel and SSOV stay there, the SSOV still shutting on its emergency stop); the main incoming switch out of the switch room. Each in the plant model (its node and its links moved, its tag and permanent asset ID kept), in the world (its state kept, so a saved game keeps whether it is open or on), and drawn from the model; the rooms they leave lose them.
- **Three levers, three shut-offs**: turning any one shuts off that service to the whole facility, through the world: no water to the break tank, no gas to the boilers, no power anywhere (the emergency lighting then on its battery).

## To settle with the owner before building

- Which side of the yard the utilities area stands on, and whether it is open or behind a small fence and gate.
- Whether the gas emergency control is separate from the boiler house's SSOV in the world (two valves in series) or the same valve moved.
- Whether the electricity meter is modelled (reading kWh from the site's load) or only shown.
- Save migration: a new `WORLD_VERSION` if the world's shape changes.

## Done when

- Bins and dressing in the yard; the utilities area with its three housings, each working, read on inspection, its lever shutting off its service to the facility, seen in the game.
- The wet hall, the boiler house and the switch room no longer hold the meters or the master shut-offs; the plant model, the world and the drawing agree; tests cover each shut-off's effect; the five checks pass.
