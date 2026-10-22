# Changelog

All notable changes to Pool Plant are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the game uses [semantic versioning](https://semver.org/spec/v2.0.0.html): see "Versions and releases" in the README for what each kind of change means here. Add each change under Unreleased as it is made; a release moves those entries under its own version and date.

## [Unreleased]

### Added

- Pools can be drained down: each has drain-down and make-up valves in the world (`pool/drain-down`, `pool/make-up`); draining, its pumps take its water to the foul sewer at the site's consented 10 m³/h (shared with the backwash's discharge) down to its floor, and it closes to bathers once 15 cm down. Emptying one at a time: the Lounge about 14 hours, the Olympic about 11 days, the jacuzzi 18 minutes, the footbath 7.
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
