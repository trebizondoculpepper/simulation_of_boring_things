# Pool Plant

A first-person engineering game set in a leisure centre: walk the public pool hall and the plant rooms behind its staff doors, and keep the pools running. The design brief is `/Users/salimfadhley/Downloads/Pool-Plant-Project-Brief.md`.

**[Play it here](https://trebizondoculpepper.github.io/the_pool/).** Every push to `main` that passes CI is deployed there.

The development rooms can be opened directly, among them the modelling demonstrations:

- [Dev19: a plant room laid out, plumbed and scored by the room-layout pipeline](https://trebizondoculpepper.github.io/the_pool/?room=dev19)
- [Dev20: experimental sources and sinks of every substance](https://trebizondoculpepper.github.io/the_pool/?room=dev20)
- [Dev21: each source plumbed to its sink, valves closed](https://trebizondoculpepper.github.io/the_pool/?room=dev21)
- [Dev22: a pump on a battery-backed supply](https://trebizondoculpepper.github.io/the_pool/?room=dev22)
- [Dev36: jacuzzi music-effects prototype](?room=dev36)
- [Dev37: valve test rig, an electric spring-return butterfly valve with its panel and a throw switch to fail its power](?room=dev37)
- [Duty manager’s office](?room=duty_managers_office)
- [Dev35: isolated jacuzzi water-effects prototype](?room=dev35)
- [Dev23: draining a jacuzzi by gravity](https://trebizondoculpepper.github.io/the_pool/?room=dev23)
- [Dev24: duty and standby pumps](https://trebizondoculpepper.github.io/the_pool/?room=dev24)
- [Dev25: a tank filled and drained through one port](https://trebizondoculpepper.github.io/the_pool/?room=dev25)
- [Dev26: an Olympic filter on its five-valve battery](https://trebizondoculpepper.github.io/the_pool/?room=dev26)
- [Dev27: heat exchange from a gas boiler, with its mimic board](https://trebizondoculpepper.github.io/the_pool/?room=dev27)

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

The front page is the title screen. New Game resets the simulation to nominal operation: all pools full, temperatures at their design settings, normal water chemistry and working plant, starting in the footbath. Continue preserves the saved simulation and restores your last room and view. The playable rooms and development demonstrations currently share the `dev` save slot, so New Game resets that shared simulation. The title loops Treblo's Suspended Circulation after your first click or key press, using the master volume setting, and stops it when you enter a room. `?dev` is the developers' panel, a list of every room by its URL; it is a tool, not part of the game. Use `?room=PR_A&x=2.5&z=7.75&yaw=0` to launch at a specific position and heading. Coordinates are metres; `y` sets camera height, while `yaw` and `pitch` are degrees. The Copy location button in each room copies the current coordinates and a shareable URL.

For a less powerful machine, start the game with lighter graphics from the address ([087](doc/prompts/087-resolution-url-setting.md)). `?graphics=low`, `?graphics=medium` or `?graphics=high` chooses a graphics preset: High is the full look; Medium draws at render quality 3, at most 1.25 pixels per CSS pixel, without ambient occlusion or antialiasing, with half-size bloom and shadow maps no larger than 1024 px; Low draws at render quality 6, one pixel per CSS pixel, and also turns off shadows, bloom, film grain and the pool's refraction. A preset sets the menu's individual graphics choices, which can then be changed one by one. `?resolution=N` sets the render quality alone, 0 (full resolution) to 10 (lowest; level 6 draws 0.46 of each side, about a fifth of the pixels), over the preset's own level when both are given, as in `?graphics=low&resolution=8`. Both work with `room=` and the other parameters, are applied before the first frame, and are saved like a change in the menu, so the next visit keeps them without the parameter; the settings panel's GRAPHICS selector (LOW · MED · HIGH) and RENDER QUALITY knob change them again. Out-of-range levels are clamped, unreadable values ignored. Screenshots are still taken at full resolution.

When adding connected rooms, follow the [open-threshold rendering guide](doc/design/room-transition-rendering.md) so shared geometry keeps the same appearance as the player crosses between room IDs.

The default reception view faces into the building. `?at=<room id>` starts in a given room (for example `?at=boiler`). In the browser console, `facility.goTo('pumps')` jumps to a room and `facility.rooms()` lists the ids.

Ctrl+C (Cmd+C on Mac) copies the highlighted component’s tag, or its name when untagged. Ctrl+P (Cmd+P) copies the current pin URL, including the camera pose and roll in noclip. Copy results and their values appear in the developer console. These shortcuts leave text fields and selected text copying alone.

Ctrl+Shift+K on PC or Cmd+Shift+K on Mac (or the older Ctrl+Alt+S / Cmd+Option+S) copies a best-quality PNG of the game view, with no interface over it, on the title screen too. The ▣ button beside the view pin does the same, where a browser keeps the chord for itself (Firefox's Web Console on Windows and Linux). The shot is drawn again at full resolution, whatever the graphics quality setting, at twice the screen's pixel ratio, at most 3840 pixels wide, within the graphics device's limits and a 16-megapixel budget; then the normal rendering is put back. Where the browser refuses the clipboard, the same PNG downloads instead (`pool-plant-<room>-<date-time>.png`).

Walk with WASD, run with Shift, click to capture the mouse and look, Esc to free the cursor. The title has a simple text menu; the settings menu is the Penfold SP-1 panel, opened in a room by Esc (once the cursor is free), a gamepad's Start or the gear. The title's choices work by mouse, touch, arrow keys and Enter, or a gamepad's d-pad and A. The settings panel works by mouse or touch on its parts, or by keyboard and gamepad: the arrows, d-pad or left stick move an amber focus ring between the controls (Left and Right, or LB and RB, turn a focused knob or selector; Tab cycles), Enter, Space or A press, and Esc or B back out. The settings panel does not pause the game. `?menu=plain` gives the plain settings menu instead, which is also used where WebGL 2 is missing. At a pool ladder, press Use (E, the on-screen Use button or gamepad A) to mount it; hold forward to climb or back to descend. Movement returns to normal at either end. Doors open as you approach and close after you leave. Touch and gamepad also work.

For title-shot authoring, open the Esc menu and turn the **NOCLIP** key (the plain menu's **Noclip free camera**), then Resume. WASD flies along the view; Space rises, Shift descends and Ctrl accelerates. Gamepad A/B rises/descends, and touch has UP/DOWN buttons. You can pass through equipment while staying inside the room envelope; controls and automatic room transitions are disabled. The view shows live coordinates, and **VIEW LINK** (the plain menu's **Copy Camera Link**) copies a reusable shot URL. Turning noclip off returns to the walking position; flight does not overwrite the Continue bookmark and is off after a reload. Q and E roll the view (LB/RB on a gamepad, ⟲/⟳ on touch) and R levels it; camera links carry the roll. The later attract sequence is specified in [prompt 054](doc/prompts/done/054-title-attract-sequence.md).

In a room, the key left of 1 (`on a UK or US keyboard, § on a UK Mac) drops down a Quake-style console ([prompt 058](doc/prompts/done/058-developer-console.md)). It logs every action done to the world and what the plant does by itself (pumps starting, stopping and tripping, alarms, lights). Type`help`for its commands, such as`room`, `goto pool_02`, `noclip on`, `valves PL1`, `close PL1-F1-IV1`, `starter P-201B hand`, `get pools.pool_02`, `act {...}`and`condump`. Any line that does not start with a command is run as JavaScript, with the commands as functions and `world`and`act`in scope. Tab completes, Up and Down recall,`;` separates commands, and the same key or Esc puts it away.

The proposed definition of a healthy New Game and its repeatable audit are in [Healthy New Game](doc/healthy-start.md); [mission 067](doc/prompts/done/067-healthy-new-game.md) plans the executable contract and its maintenance as the model evolves.

## Checks

`npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` and `npm run build`. CI (`.github/workflows/ci.yml`) runs the same five and deploys the build to GitHub Pages.

Slow tests (over about 1.5 s, or simulating long stretches of world time) live in `*.slow.test.ts` files beside their fast siblings. `npm test` runs everything and is run locally before every commit; on GitHub, where `CI` is set, `vite.config.ts` excludes the slow files so the checks stay quick. `npm run test:fast` runs the fast set alone locally.

## Versions and releases

Player-facing daily updates follow the [devlog workflow](doc/devlogs/README.md). Drafts are compiled on request in `doc/devlogs/`; publishing a devlog is a separate step from uploading a game build.

The game uses [semantic versioning](https://semver.org/). Every successful `npm run build` advances the patch version in `package.json` and the two root version fields in `package-lock.json`. The bundler uses that next version, and the files are updated only after bundling succeeds; a failed build leaves them unchanged. For example, a successful build at 0.1.241 becomes 0.1.242. The development server shows the current package version without incrementing it. The title screen's bottom-right corner shows the version, source commit and UTC build date, marks development builds and uncommitted changes, and links to the GitHub source.

CI runs the same build command and commits successful version updates on `main` as `Build vX.Y.Z [skip ci]`, so the next build starts from the persisted version without triggering another build for the version commit. GitHub Pages and itch.io receive the same built version. Local builds leave the version updates in the working tree for the owner's next commit. Automatic build numbering does not create release tags or GitHub releases. Below 1.0.0 the game is in development.

The levels below guide deliberate releases, which move `package.json` to a new MAJOR or MINOR (or a deliberate PATCH) and tag it. The Release workflow uses `npm run build -- --release` to rebuild at the tag's exact version, without advancing it.

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
