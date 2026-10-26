# 083: The utilities area in the goods yard

Status: mostly complete (reviewed 2026-10-26, source `e5078c4`).

## Review checkpoint — 2026-10-26

**Classification:** Mostly complete. **Filed:** `doc/prompts/done/083-outside-utilities.md`.

**Delivered:** The outside water/gas/power intake, independent saved shut-offs, integrated meters, inspection/physical fittings and yard dressing are implemented.

**Still outstanding:** Complete the full ordered-path, isolation/reload/meter acceptance matrix and yard collision/feedback walk-through. The owner’s later requirement that building-side shut-offs stay supersedes the earlier acceptance sentence saying all inside shut-offs disappear.

**Evidence:** 25bf3d0, adc9cd1, efb3821, 1242a8c; src/game/plant/site-intake.test.ts. Reviewed against source `e5078c4`.

The original request and earlier implementation notes below are retained as history; this checkpoint supersedes any conflicting old completion claims. Outstanding work remains open in the root TODO.

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

No migration needed (the owner, 2026-10-26): bump `WORLD_VERSION` 43 → 44 and let older saves reset to a new world (a migration step that returns an empty world, as 26 → 27 does); test it.

## Done when

- Bins and dressing in the yard; the three services out of the building's side, each through its sealed sleeve to its meter and shut-off, each working, read on inspection, its lever shutting off its service to the facility, seen in the game.
- The wet hall, the boiler house and the switch room no longer hold the meters or the master shut-offs; the plant model, the world and the drawing agree; tests cover each shut-off's effect; the five checks pass.

## Adopted from a second opinion (Codex, 2026-10-26; the owner adopted all of it)

- **Three ordered supply paths**, each with separate outside and inside devices and separate saved states:
  - **water**: water main → boundary stop tap and the water company's revenue meter (outside) → the customer's stop valve → the wet hall's own flowmeter and recorder (which stay) → the Category 5 break tank (its air gap kept in the model);
  - **gas**: gas service → the **emergency control valve (ECV)** at the meter, outside, reachable by the site's responsible person → the primary meter and regulator → into the building → the boiler house's own isolation and its automatic SSOV → the boilers. The boiler house's existing `ecvOpen` is renamed: it is the internal isolation, not a second ECV;
  - **electricity**: the network's service and sealed **cut-out** (the network operator's, fused, not worked like a switch; shown, never a lever) → the meter operator's meter → a **customer-side outside isolator** (the lever) → the switch room's main switch, which stays → the LV board.
- **Direction**: drawn as the services arrive: underground to their outside intake positions, then their metered connections into the building through sealed sleeves.
- **Gas meter housing**: a commercial gas meter stands in a modest, accessible, ventilated housing, not bare (IGEM/GM/8); the wooden privacy fence later is scenery. The intake positions protected from vehicles (bollards) and clear of the steps, the channels, drainage and loading.
- **Model and world**: the yard has its own intake graph (or enhanced network) with cross-room ports to the wet hall, the boiler house and the switch room; every visible working fitting is one model asset and one world state, its tag and inspection text derived from it. The world holds each outside and inside position independently, and an **effective supply** for each service from both; closing either of a pair stops the service without moving the other's handle. Closing the water stops new inflow (the break tank's stored water stays usable until drawn down); closing the gas stops firing (residual heat cools over time); losing the power stops mains-fed consumers, the emergency battery feeding only its own loads. The general `serviceAvailable` rule distinguishes a service's physical availability from powered equipment.
- **Meters that move**: the electricity meter sums the actual electrical input of running consumers (motors, feeders and isolators, lighting zones, controls, battery charging; electric heat, not gas heat) and integrates kW × hours once per world step into a cumulative kWh register, starting at a plausible nonzero reading; the gas meter totals the boilers' actual gas flow; the water revenue meter totals the water taken. A meter whose display loses power keeps its count.
- **Tests and acceptance**: each intake's ordered path documented; outdoor and indoor isolators independently operable and surviving save and reload, both orders of closure and reopening tested; outside water stops break-tank inflow and the meter while the tank's water stays usable; the outside ECV or the internal isolation stops the boilers, the SSOV trip still latching until its reset, neither moving the other's handle; either electrical isolator removes mains power, the battery's emergency lighting following its own discharge; fixed-step tests of the kWh integration (known loads, zero when isolated, additive consumers, the same totals across save and reload, no double counting across room changes); a yard walk-through of inspection, handle feedback, access and collision.
- **Yard dressing** (Codex's list, rough, set decoration unless working): 1100 L general waste and mixed recycling bins in a marked waste bay; a strapped stack of flattened cardboard; weathered pallets and a pile of broken offcuts; an empty roll cage; returned plastic crates; traffic cones; bay-number signs over the openings; a fire exit keep-clear sign on the pier door's yard side; a vehicle-height warning sign; galvanised crash bollards protecting the meters and corners; a yellow grit bin by the steps; a wall cigarette bin at a staff smoking spot well away from the gas; a boot scraper and mat by the steps. Later, if wanted and then working: a yard drain gully, a used cooking-oil container, a spill kit, a hose reel, an outside security light, CCTV.
