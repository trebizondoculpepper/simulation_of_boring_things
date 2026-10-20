# Toolkit: components

The simulated things: everything a player can work, read, carry or look at, built to behave as the real thing would. `CLAUDE.md` is a symlink to this file; the toolkit as a whole is described in `../README.md` and the game's own guide is the repository's `AGENTS.md`.

## How a component is made

A component is usually three files of the same name in three folders of its category:

- `logic/`: its behaviour as pure logic, no DOM or Three.js, tested beside it (an annunciator's flash-acknowledge sequence, a drive keypad's menus, a building's services).
- `views/`: how it looks, drawing only, built in metres at true size, facing +z, its mounting face at z = 0.
- `parts/`: the working part: the view, bound to its behaviour and to the world, with what a use on it does and its own sounds beside it. A room adds parts to a `PartSet` and never wires a click or a sound by hand.

Its sounds go in `audio/` and its recordings in `audio/assets/`, credited in the game's `CREDITS.md`.

Model each thing on a real catalogue part at true size (a Schneider datasheet, a C-TEC panel, a Hager board), under a maker's name of our own, and never scale a part to fit. Give it a maker's mark only if a real one would carry one, small and where its maker would put it (`createBrandBadge`), and never on switches, push buttons, small fittings or most building fittings.

## Where things go

- **`core/`**: what every category is built from, and nothing that is itself a thing in the world.
  - The parts system (`parts/parts.ts`, which also holds the operator-control parts every category uses: push buttons, selectors, pilot lights, knobs, key switches) and the world graph and component behaviours (`logic/world/`).
  - The panel kit, micro labels, nameplates, canvas textures and screens, materials and the render style.
  - Wear and damage: worn paint, lens damage, shorting, glows, sparks and smoke.
  - Positional part audio, recorded loops, impacts and door sounds, and the shared recordings.
  - Brands and their logos and badges (`logic/brands.ts` is the one definition every logo is drawn from), signage, and the shared drawing and sound tools for building fittings.
- **`industrial-control/`**: what machines are controlled and watched with.
  - Operator controls: push buttons, mushroom stops, selectors, potentiometers, the 22 mm XB4 series, pushbutton and control stations, 1980s toggles, rockers and keypads, flange, throw and rotary handles, and the 2010s short-travel studio switches.
  - Indicators and displays: pilot lamps, stack lights, LEDs, seven-segment and bar graphs, panel meters, round gauges, LCDs, VFDs, LED matrices, jewel lamps, hour meters, message displays, annunciators, power monitors, CRT monitors, chart recorders, operator terminals, drive keypads and boot screens.
  - Power and motor control: motor control units, contactors, overload relays, fuses, breakers, isolators, soft starters, capacitor boards, motors.
  - Electronics: PLC cards and their backplane and slots, PCB textures, capacitors, heatsinks, jacks.
  - Enclosures: motor-control-centre doors, louvres and viewing windows, rack cabinets, suites, relay racks and rack units; and the teleprinter.
- **`fire/`**: active fire safety only. Detection and alarm (call points, detectors, sounder-beacons, alarm panels, the voice alarm and its messages), suppression (sprinklers, their valve set and bell, extinguishers), doors the alarm drives (held fire doors), and fire itself (flames, embers). Follow present-day UK practice (BS 5839).
- **`general-safety/`**: safety that is not fighting a fire. Emergency lighting and its test key, exit signs, floor safety markings (keep-clear zones, walkway and hazard tape), warning signs and notices, welfare alarms (the accessible WC's pull cord, reset and over-door light), skip lamps.
- **`architectural/`**: what a building is fitted with. Doors and ironmongery (handles, panic bars, access-controlled doors), the electrical installation (distribution boards, sockets, spurs, floor boxes, conduit), switching and lighting, climate (air conditioning, thermostats, radiators, heaters, grilles, extract fans, windows), communications (intercoms), the catalogue of warehouse fittings, and the models of a building's services. Sanitary fittings (toilets, sinks) belong here when they come.
- **`sound/`**: synthesised sound libraries not tied to one part: machine tones (hums, fans, pumps, room noise), computer cues (beeps and bloops) and the boot beep.
- **`site-dressing/`**: props that make a place feel lived in: skips and their hire firms, graffiti, chair stacks, warehouse props, and throwing things into bins.

When a thing could go in two categories, put it where its owner would buy it from, and let the gallery show it in both rooms (emergency lighting is general safety, and is shown in the fire room and the building fittings room).

## What does not go here

- Inputs: `../controls/`. A component never reads a key, button or stick; it only says what a use on it does.
- Exhibition rooms and their furniture: `../gallery/`.
- Anything only one game needs, such as the Encabulator line-up, its failures and its story: that stays in the game.

## Rules

- Components may import `../controls/` and each other, never `../gallery/` or the game (`../layering.test.ts`).
- Categories may use one another (the warehouse catalogue in `architectural/` installs `fire/` parts), but `core/` should not depend on a category; it may use `sound/`.
