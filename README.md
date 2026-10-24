# Pool Plant

A first-person engineering game set in a leisure centre: walk the public pool hall and the plant rooms behind its staff doors, and keep the pools running. The design brief is `/Users/salimfadhley/Downloads/Pool-Plant-Project-Brief.md`.

**[Play it here](https://trebizondoculpepper.github.io/simulation_of_boring_things/).** Every push to `main` that passes CI is deployed there.

The development rooms can be opened directly, among them the modelling demonstrations:

- [Dev19: a plant room laid out, plumbed and scored by the room-layout pipeline](https://trebizondoculpepper.github.io/simulation_of_boring_things/?room=dev19)
- [Dev20: experimental sources and sinks of every substance](https://trebizondoculpepper.github.io/simulation_of_boring_things/?room=dev20)
- [Dev21: each source plumbed to its sink, valves closed](https://trebizondoculpepper.github.io/simulation_of_boring_things/?room=dev21)
- [Dev22: a pump on a battery-backed supply](https://trebizondoculpepper.github.io/simulation_of_boring_things/?room=dev22)
- [Dev35: isolated jacuzzi water-effects prototype](?room=dev35)
- [Dev23: draining a jacuzzi by gravity](https://trebizondoculpepper.github.io/simulation_of_boring_things/?room=dev23)
- [Dev24: duty and standby pumps](https://trebizondoculpepper.github.io/simulation_of_boring_things/?room=dev24)
- [Dev25: a tank filled and drained through one port](https://trebizondoculpepper.github.io/simulation_of_boring_things/?room=dev25)
- [Dev26: an Olympic filter on its five-valve battery](https://trebizondoculpepper.github.io/simulation_of_boring_things/?room=dev26)
- [Dev27: heat exchange from a gas boiler, with its mimic board](https://trebizondoculpepper.github.io/simulation_of_boring_things/?room=dev27)

The room-layout pipeline is described in [`doc/room-layout-guide.md`](doc/room-layout-guide.md), and the test scenarios in [`doc/prompts/scenarios.md`](doc/prompts/scenarios.md).

## Current state

The building is laid out as separate room components in one continuous world. Each doorway has a self-closing door that opens on approach. The reception-to-changing entrance has sliding frosted-glass leaves; that adjacent room stays rendered to give the glass a blurred view. Other neighbours load only behind open doors. The pool hall contains three empty tiled basins, overflow gullies and two ladders. Suspended LED battens light public rooms, while service rooms have spotlights. High pool-hall windows and four shallow barrel rooflights follow the [architectural daylight references](doc/research/daylight-from-architect-plans.md). The glazed reception opens onto the concourse of an empty shopping mall (`src/scene/mall-concourse.ts`, laid out in `src/game/mall-plan.ts`): shuttered units, plastic planters, a dry fountain and a barrel-vault rooflight, fading into dimness at both ends. It is scenery only; the entrance doors stay locked and a solid outside them keeps the player in the leisure centre. The low windows elsewhere look into windowless back-of-house bays. See the [mall entrance notes](doc/research/mall-entrance.md). The service rooms use the Encabulator corridor’s painted blockwork, concrete, dark skirting, route stripes and high cable trays. The other rooms remain named shells:

- Public: Reception, Changing Village, Main Pool Hall (50 m pool, learner pool and spa pool, with space reserved for rapids), First Aid Room.
- Back of house, off the Service Corridor behind two staff doors in the pool hall: Pump and Filtration Room, Balance Tank Room, Chemical Store, Boiler Room, Air Handling Plant, Electrical Switch Room, Duty Manager's Office, Plant Control Centre, Engineer’s Office, Stores, Maintenance Workshop, Janitorial Store, Staff Room.

The east reception entrance, at `x=112, z=25`, is the locked door to the mall. The building plan is data in `src/game/facility-plan.ts`; its tests check that rooms do not overlap, that every doorway lies in a shared wall and that every room can be reached from reception. The basin footprints and depths are in `src/game/pool-layout.ts`. `src/scene/facility.ts` builds each room model separately and assembles them at their plan coordinates. The water treatment rooms now occupy a lower level below an Upper Plant Room. An enclosed side stair from the Service Corridor reaches the Lower Plant Landing; movement, walls and room labels use the player’s current elevation. This is a first spatial test of the split-level arrangement in the planning sketch. The [fitting research notes](doc/research/pool-architectural-fittings.md) identify references for the temporary pool edges, ladders and lights.

## Running

```sh
npm ci
npm run dev   # http://127.0.0.1:5175/
```

The front page is the title screen. `?dev` is the developers' panel, a list of every room by its URL; it is a tool, not part of the game. Use `?room=PR_A&x=2.5&z=7.75&yaw=0` to launch at a specific position and heading. Coordinates are metres; `y` sets camera height, while `yaw` and `pitch` are degrees. The Copy location button in each room copies the current coordinates and a shareable URL.

When adding connected rooms, follow the [open-threshold rendering guide](doc/design/room-transition-rendering.md) so shared geometry keeps the same appearance as the player crosses between room IDs.

The default reception view faces into the building. `?at=<room id>` starts in a given room (for example `?at=boiler`). In the browser console, `facility.goTo('pumps')` jumps to a room and `facility.rooms()` lists the ids.

Walk with WASD, run with Shift, click to capture the mouse and look, Esc to free the cursor. At a pool ladder, press Use (E, the on-screen Use button or gamepad A) to mount it; hold forward to climb or back to descend. Movement returns to normal at either end. Doors open as you approach and close after you leave. Touch and gamepad also work.

## Checks

`npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` and `npm run build`. CI (`.github/workflows/ci.yml`) runs the same five and deploys the build to GitHub Pages.

## Versions and releases

The game uses [semantic versioning](https://semver.org/). Every build of `main` is its own version: CI (`.github/workflows/ci.yml`) takes the version in `package.json` and advances its patch by the number of commits since that version's tag, so with `package.json` at 0.1.0 and 74 commits since `v0.1.0`, the build is 0.1.74, and the next push 0.1.75. Nothing is committed back to `main`; the number comes from git. The game reads it in `src/game/version.ts` (falling back to `package.json`'s off CI), and the title screen shows it with the build's commit and date, marked as a development build on the dev server. Below 1.0.0 it is in development.

The levels below say when to cut a release by hand, which moves `package.json` to a new MAJOR or MINOR (or a deliberate PATCH) and tags it; the per-build count then starts again from that tag.

- **MAJOR:** a save that can no longer be carried forward (a migration dropped from `src/game/save.ts`), or a change that breaks how the game is played or packaged.
- **MINOR:** new rooms, machines, systems or features, including a new save version with its migration (`WORLD_VERSION`, which counts the save's shape, not releases).
- **PATCH:** fixes, performance and wording only.

Every change goes under Unreleased in `CHANGELOG.md` as it is made. To release, on a clean, up-to-date `main`:

1. In `CHANGELOG.md`, rename Unreleased to the new version and date (`## [0.2.0] - 2026-11-01`), add a fresh empty Unreleased above it, and commit.
2. Run `npm run release:patch`, `release:minor` or `release:major`: it bumps `package.json` and `package-lock.json`, commits "Release vX.Y.Z" and tags `vX.Y.Z`.
3. Push with `git push --follow-tags`. The Release workflow (`.github/workflows/release.yml`) checks that the tag matches `package.json` and has its changelog section, runs the checks and publishes a GitHub release with that section as its notes. CI deploys the site from `main` as usual.

## Reused from the Encabulator

The build tooling (Vite+, TypeScript 7, Oxlint, Oxfmt) and the first-person control scheme come from the neighbouring `encabulator` project; see `doc/reuse-inventory.md`.

## Licence

Pool Plant is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. It is distributed in the hope that it will be useful, but without any warranty; see `LICENSE` for the full terms. The recordings and textures it uses keep their own licences, listed in `CREDITS.md`.
