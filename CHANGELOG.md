# Changelog

All notable changes to Pool Plant are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the game uses [semantic versioning](https://semver.org/spec/v2.0.0.html): see "Versions and releases" in the README for what each kind of change means here. Add each change under Unreleased as it is made; a release moves those entries under its own version and date.

## [Unreleased]

### Fixed

- The underwater gallery's door to the engineer's office stands on a 0.25 m sill above the corridor's fillet, which now runs unbroken beneath it (the office's floor meets the sill, as plant rooms do).
- The Olympic pool has one lane rope, the middle one, instead of one between every pair of lanes.
- The short (1 m) corridor straights at the pool halls' doors have no ceiling lamps.
- The corridor between the Jacuzzi and the footbath is now a short straight, the rotunda, and a short straight.
- Every room's supply is switched by a Voltara switch-fuse on the wall by its entrance (side handle, padlockable OFF, SUPPLY ON neon, ROOM SUPPLY legend), replacing a placeholder of plain blocks; its conduit now comes down into its gland. Modelled first in the electrical dev room.
- Conduits end on the cable glands of the isolators they feed, instead of 2 cm above their boxes: the enclosures' sizes and glands are now one source (`enclosures.ts`) for their views and the routes to them.
- The footbath's make-up main runs overhead at 3.4 m, clear of head height and the equipment doorway, its valve worked from the floor by a chain wheel (shared now with the plant rooms' overhead valves).
- Lever-operated butterfly valves no longer flicker where the lever meets the stem: the stem runs up into a round boss at the lever's head, so no faces coincide.
- The MAIN PLANT sign over each pair of equipment doors stands above the concrete lintel instead of half behind it.
- The Jacuzzi's and the footbath's packaged cabinets start in service, their POWER on, so switching off their isolators is seen to stop them; the Jacuzzi plant room's mimic shows the world's circulation, water temperature and flow instead of fixed values.
- Electrical conduits in the rooms outside the pool plant are routed tidily: one distribution conduit round the walls on saddles, each panel's drop down the wall face into the top of the panel as drawn, chosen clear of the panels it would pass and of the other drops; a machine on the floor gets an outlet box on the wall above it and a flexible cable down to it.
- The control room's alarm annunciator hangs on the west wall toward the operator's desk, beside the pool mimic and over the water-test kit, in view and within reach (a wall panel marked `over` may now hang clear above a machine shallow enough to reach across).
- The control room's air-handling mimic no longer runs into the corner, and its title card, hidden behind the mimics, is gone.

### Added

- Pools can be drained down: each has drain-down and make-up valves in the world (`pool/drain-down`, `pool/make-up`); draining, its pumps take its water to the foul sewer at the site's consented 10 m³/h (shared with the backwash's discharge) down to its floor, and it closes to bathers once 15 cm down. Each hall's water shows the model's level: its surface, the tiles' waterline and caustics, the lane ropes and the gallery's view all go down as it drains, to a dry floor. The `drain-pool_0N` and `fill-pool_0N` scenarios (with `skip-N`) show it. Emptying one at a time: the Lounge about 14 hours, the Olympic about 11 days, the jacuzzi 18 minutes, the footbath 7.
- Behind the title screen, the Olympic hall live from 12 m up, at a quarter of the resolution and blurred, the camera in a slow 1° harmonic orbit about the hall's middle every 10 seconds; the game pauses underneath.
- A title screen on the front page: Boring Simulations Presents: The Pool, with New game (into the footbath), Continue (greyed out until the game has its own save), Settings and Instructions (the pause menu's tabs), worked by mouse, keys or gamepad, and the version and build in the corner. The developers' room list moves to `?dev`; Quit to Title returns to the title. The title is the default page: no arguments, or a room that does not exist, lands there (no longer the dev corridor).
- A 55-inch display as a component of its own (`display-screen.ts`): portrait or landscape, a slideshow cropped to fill its picture, and a red status lamp in its bottom right-hand corner; the rotunda's two displays use it, each fed from a switched fused spur mounted above it (the spur now a component of its own: logic, view with an engraved legend, and a working part), which switches the display off and on.
- A pause menu, opened by Esc once the mouse is free, a gamepad's Start, or the gear among each room's view tools: tabs for Game (Resume, Save, Quit to Title), Graphics, Audio and Controls (with the key and button list), worked by mouse, keys (Q and E switch tabs) or gamepad (d-pad, A, B, shoulder buttons). The world pauses while it is open; saving is continuous, Minecraft's way, and in a tab that only follows another with the game open, Save is greyed out and the menu says why. Its settings: master volume, look sensitivity and invert up and down (mouse, touch and gamepad), field of view, render quality (a 0 to 10 slider drawing 1 / ln(e + level) of full resolution, 1:1 at 0, applied at once, post-processing included) and on-screen controls, kept in the browser.
- The operator's manual, generated from the game's model (`npm run manual`): a LuaLaTeX PDF in the fiction's voice, from Bramhall Fenwick Engineering to Ashworth Borough Council, with Rowland Fenwick's foreword and a first chapter on the boiler house (its equipment plan and schedule, boiler settings, gas house schematic, supplies, start-up, gas emergency and signs).

### Removed

- The unused fluorescent ballast start-up recording, which was not cleared for distribution (the tubes' sounds are synthesised).

## [0.1.0] - 2026-10-22

The first release. It has no operator's manual yet: that comes in a later release (`doc/plans/operators-manual.md`).

### Added

- The leisure centre as one walkable building: four pool halls joined in a loop by tiled corridors, the plant rooms behind them, a main corridor, the switch room, boiler house, air handling plant, wet hall, chemical stores, loading bay, control room and engineer's office.
- A saved world state that runs the plant whichever room the player is in: water circulation and treatment, chemical dosing and stores, the wet hall's tanks and booster set, heating and the pools' thermal model against an outside temperature, lighting by zone, bathers who come and go by the timetable and the water's quality, and toxic gas detection for chlorine and ozone.
- Working machines and controls throughout, modelled on real products: switchboards, isolators, mimics, an annunciator, gauges, recorders, a scenario simulator, gas detectors and sounder-beacons.
- Modern safety signs and notices in place across the building.
- The development rooms, including dev2 Safety Systems and the corridor kit's rotunda in `corridor_lab`.
- Semantic versioning, this changelog and a release workflow.

### Fixed

- Walking from one room to the next no longer recompiles every shader of the room arrived in.
- The corridor posters load on the published site.

[Unreleased]: https://github.com/trebizondoculpepper/simulation_of_boring_things/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/trebizondoculpepper/simulation_of_boring_things/releases/tag/v0.1.0
