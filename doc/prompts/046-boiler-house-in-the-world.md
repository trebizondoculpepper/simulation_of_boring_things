# 046: The boiler house in the world

Status: partly done (checked 2026-10-26): the boiler gas safety (ECV, emergency stop, detector, SSOV) is in the world and cuts the heating; the boilers, combustion, pressure and calorifier are not.

## Now

The boiler house's model (`src/toolkit/gallery/rooms/plant/boiler.ts`, `house`: six boilers, the gas house with its ECV and emergency stop, combustion with its fan and flue temperatures, fouling) is a module-level object in a view: unsaved, stepped only while the room is shown, and of no effect. The world's heat is a flag (`sources.heat` and the boiler house's feeder, `services.ts`). The boilers fire because the pools draw heat (`boilersFiring` from the pools' heating), not the reverse. The LTHW circulator follows the Olympic plant room's heat service. The pressurisation unit, calorifier, low-loss header and dosing pot are static; system pressure is a constant 2.4 bar. The boiler house's natural-gas safety is a page system apart from the world's gas detection. The control room's heating mimic is constants and a sine.

## To do

- **State into the world** (a new version and migration), on the pattern of `game/plant/air-handling.ts`: the boilers (`BoilerState`, `stepBoiler` from `components/plant/logic/boiler-house.ts`), the gas house (meter, ECV, SSOV, each boiler's gas isolator, the emergency stop latched, TEST, GAS RESET), combustion (the fan's HAND-OFF-AUTO, flue temperatures, CO, its reset), fouling, and system pressure. Actions for every control on the boiler house's panels. The views show and work it; nothing in a view's module.
- **Heat from the boilers.** The LTHW circuit's flow temperature and the heat it can give follow the cascade: the boilers firing (gas reaching them, combustion permitted, not locked out, their power on), the circulator running (P-501A/B on starters, as 044 has them: a panel in the boiler house), and the system's pressure. The pools' and halls' heating take their heat from the circuit, limited by what the cascade gives; the boilers' demand is the pools' and halls' thermostats calling, through the low-loss header. With every boiler locked out, the pools and halls cool.
- **The pressurisation unit** holds the system's pressure, loses it to a leak or a drain valve, refills from the cold water; low pressure locks the boilers out. **The calorifier** heats stored hot water (for the showers) from the circuit, its temperature a reading.
- **The boiler house's gas detection** joins the world's gas zones (`game/plant/gas.ts`): one model of gas safety, not two.
- **The control room's heating mimic and readings** (`pool-mimics.ts` `heatingState`, `world-reading.ts` `lthw`, the boilers' amps) from the world's boiler house.
- The boiler house's gas and LTHW valves in its pipework drive the model (049 covers the rest of the valves).

## Acceptance

Locking out the boilers (gas emergency stop, ECV shut, power off, combustion fan off) stops the pools' and halls' heating, seen in their temperatures falling; restoring and resetting brings it back. The boiler house runs and is saved whichever room the player is in. Every boiler house mimic and the control room's heating mimic agree with it. Tests for each part; typecheck, lint, format, tests and build pass.

## Remaining (checked 2026-10-26)

- The boilers' state, combustion (fan HAND · OFF · AUTO, flue temperatures, CO, reset) and fouling in the world, with a new version and migration.
- Heat from the cascade: the heating circuit's flow temperature and heat available follow the boilers firing, the circulator and the system pressure; demand from the thermostats through the low-loss header.
- P-501A/B on starters, with a boiler house panel (with [044](044-plant-room-motor-panels.md)).
- The pressurisation unit (a leak or drain, refill, low-pressure lockout) and the calorifier's stored-water temperature.
- The boiler house's gas detection made one with `gas.ts`.
- The control room's heating state, LTHW reading and boiler amps from the world.
- The boiler house's gas and heating valves read by the model.
