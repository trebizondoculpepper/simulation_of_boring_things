# 083: The utilities area in the goods yard

Status: not started (written 2026-10-26 with the owner; refined the same day).

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
- **The services out of the building's side** (the owner, 2026-10-26): to one side of the yard, clear of the bays and the steps, the three services come out through the building's outside wall, each through a wall sleeve sealed against the weather (a collar and flashing round it, as for a pipe or cable through an outside wall), each in its proper colour (gas yellow, water blue, the electricity supply a black armoured cable), and go down into the ground through an appropriate meter and shut-off:
  - **water**: the main, blue, its stop valve with a lever and its meter, reading and recording as the make-up meter does now;
  - **gas**: yellow, the supplier's meter (its index read on inspection) and before it the emergency control valve with its yellow lever and its GAS EMERGENCY CONTROL label;
  - **electricity**: the supply cable to the supplier's cut-out, its meter and a main switch with its rotary handle. The meter measures (the owner, 2026-10-26): kilowatt-hours from the site's actual load, read on inspection and recorded as the water meter's are.
    Each a real product's kind, each with its maker under the brands rule. No housing or fence for now: later, a little wooden privacy fence round them (a later item).
- **The building's own shut-offs stay** (the owner, 2026-10-26): the outside ones are new, the utility company's, upstream of the building's own; the boiler house's gas shut-off is demoted to the internal one; the switch room keeps its main switch, the building's own isolator, not the utility's; the wet hall keeps its stop valve and its make-up meter. Each service then has two shut-offs in series, the utility's outside and the building's inside, each in the plant model and the world, each working.
- **Yellow hatching** (the owner, 2026-10-26): the ground before the three services painted with yellow hatching, a zone no vehicle may enter or stand in, as the yard's KEEP CLEAR box at the steps' foot.
- **Three levers outside**: turning any one shuts off that service to the whole facility, through the world: no water to the break tank, no gas to the boilers, no power anywhere (the emergency lighting then on its battery).

- **The site's electrical load** (needed by the meter; there is none yet, checked 2026-10-26): each consumer's draw in kW while it runs, from its rating (the pumps' motors from the plant sizing, the boosters, the fans and air handling units, the lighting zones, heaters, the dosing and controls), summed in the world each step; the meter integrates it to kWh. Zero when the utility's switch or the building's main switch is off; the emergency lighting then draws on its battery, not the meter.

## Saved games

No migration needed (the owner, 2026-10-26): bump `WORLD_VERSION` and let older saves reset to a new world (a migration step that returns an empty world, as 26 → 27 does).

## Done when

- Bins and dressing in the yard; the three services out of the building's side, each through its sealed sleeve to its meter and shut-off, each working, read on inspection, its lever shutting off its service to the facility, seen in the game.
- The wet hall, the boiler house and the switch room no longer hold the meters or the master shut-offs; the plant model, the world and the drawing agree; tests cover each shut-off's effect; the five checks pass.
