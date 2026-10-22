# Changelog

All notable changes to Pool Plant are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the game uses [semantic versioning](https://semver.org/spec/v2.0.0.html): see "Versions and releases" in the README for what each kind of change means here. Add each change under Unreleased as it is made; a release moves those entries under its own version and date.

## [Unreleased]

The game's first release, 0.1.0, is not yet cut. So far:

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
