# The Pool

**The Pool** is a first-person simulation of the boring things behind a swimming pool. Out front is a leisure centre of serene, impossible pool halls; behind its staff doors is the plant that keeps them running: pumps, sand filters, boilers, heat exchangers, chemical stores, dosing pumps, air handling, switchgear and the control rooms that watch it all. Every machine is a working model of a real kind of plant, with gauges that read, switches that switch, lamps that light and recorders that record, all joined into one simulated building whose water has to stay clean, warm and safe. It is a game for adults who like the quiet satisfaction of machinery.

- **Official release:** https://salimfadhley.itch.io/the-pool
- **Bleeding-edge release:** https://trebizondoculpepper.github.io/the_pool/ (follows every push to `main`)

Desktop builds for Linux (and the Steam Deck), macOS and Windows are described under [Desktop builds](#desktop-builds).

## How to play

Start a **New Game** from the title screen: the plant begins in nominal operation, every pool full, warm and correctly dosed. **Continue** picks up your saved game where you left it; the game saves in your browser as you play.

There is no single goal yet: the plant is the game. Walk the building, read its instruments, and keep the pools running. Plant drifts and things go wrong (filters clog, tanks run down, chemicals run low, pumps trip, alarms sound), and the control room is where you see it: its annunciators and mimic boards show every room's state. Putting a fault right usually means walking to the room concerned, since mode selectors (HAND · OFF · AUTO) and trip resets are local controls. Along the way there is a museum of pool plant to explore (PLANTROOMS, by the freight lift), with a pool-chemistry puzzle game in Hall 4, and a few secrets, such as what lies behind the control room doors when the CONTROL ROOM MODE knob is turned to NEW.

**Controls**

- **Walk** with WASD (or the arrow keys); hold Shift to run. **Click** the view to capture the mouse and look around; Esc frees the cursor again.
- **Use** whatever the crosshair or pointer is on with a click, E, a tap on the Use button, or a gamepad's A: buttons press, switches switch, valves turn, doors open, and things can be picked up and carried.
- **Knobs and selectors** turn anticlockwise when used on their left half and clockwise on their right (a gamepad's LB and RB turn them down and up); the crosshair shows an arrow for which way, green if it can turn and red at an end stop.
- **Ladders**: use one to get on it, then hold forward to climb or back to descend.
- **Torch**: F (the torch icon on touch, X on a gamepad) switches it on and off; it stays on from room to room.
- **Settings**: Esc (once the cursor is free), a gamepad's Start, or the gear button opens the Penfold settings panel, which works by mouse, touch, keyboard or gamepad and does not pause the game. Lighter graphics presets (LOW · MED · HIGH) help on slower machines.
- Touch screens get on-screen thumbsticks and buttons, and gamepads work throughout. The help line at the bottom of the screen always shows the controls for whatever you last used.

## How to build

You need Node.js (a current release) and npm.

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

The skimmer reveal film (Hall 5, `?room=museum5`, and its trial room dev53) can be started from the URL, for watching or capturing it: `?room=museum5&skimmer=reveal` plays it at once from where the walker stands (add a pose, such as `&x=0&y=1.6&z=-1.6&yaw=180&pitch=-18`), and `?room=dev53&skimmer=reveal` does the same in dev53. `&filmSpeed=0.25` runs it at a quarter speed, and `&filmFps=10` advances it exactly 1/10 s of film per frame drawn, whatever the clock says, so a headless browser captures it the same each time (`src/toolkit/gallery/logic/skimmer-film-url.ts`).

In a room, the key left of 1 (`on a UK or US keyboard, § on a UK Mac) drops down a Quake-style console ([prompt 058](doc/prompts/done/058-developer-console.md)). It logs every action done to the world and what the plant does by itself (pumps starting, stopping and tripping, alarms, lights). Type`help`for its commands, such as`room`, `goto pool_02`, `noclip on`, `valves PL1`, `close PL1-F1-IV1`, `starter P-201B hand`, `get pools.pool_02`, `act {...}`and`condump`. Game features not yet designed are stood in for by console commands (the owner, 2026-10-31): `dose pool_01 bicarbonate 18kg`tips a chemical into a pool's balance tank (or`pool`) by hand, `chemicals`lists what it knows, and`test_kit pool_01`reads the pool's water as a poolside test kit would. Any line that does not start with a command is run as JavaScript, with the commands as functions and`world`and`act`in scope. Tab completes, Up and Down recall,`;` separates commands, and the same key or Esc puts it away.

The proposed definition of a healthy New Game and its repeatable audit are in [Healthy New Game](doc/healthy-start.md); [mission 067](doc/prompts/done/067-healthy-new-game.md) plans the executable contract and its maintenance as the model evolves.

### Development rooms

New equipment and controls are modelled in the development rooms first. The [developers' panel](https://trebizondoculpepper.github.io/the_pool/?dev) (`?dev`) lists every room by its URL. The room-layout pipeline is described in [`doc/room-layout-guide.md`](doc/room-layout-guide.md), and the test scenarios in [`doc/prompts/scenarios.md`](doc/prompts/scenarios.md).

## Checks

`npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` and `npm run build`. CI (`.github/workflows/ci.yml`) runs the same five and deploys the build to GitHub Pages.

Slow tests (over about 1.5 s, or simulating long stretches of world time) live in `*.slow.test.ts` files beside their fast siblings. `npm test` runs everything and is run locally before every commit; on GitHub, where `CI` is set, `vite.config.ts` excludes the slow files so the checks stay quick. `npm run test:fast` runs the fast set alone locally.

## Desktop builds

Every release also carries the game as a desktop app (mission 111, `doc/prompts/111-desktop-builds.md`): the release's web build, unchanged, in Electron, from `desktop/`. The Release workflow's `desktop` job packages it on Linux, macOS and Windows and attaches the files to the GitHub release, with `SHA256SUMS.txt` and a build attestation for each (`gh attestation verify <file> --repo trebizondoculpepper/the_pool`). The names carry no version, so these links always fetch the newest:

- Linux and the Steam Deck: [The-Pool-linux-x86_64.AppImage](https://github.com/trebizondoculpepper/the_pool/releases/latest/download/The-Pool-linux-x86_64.AppImage) (or `The-Pool-linux-x64.tar.gz`). On the Deck, in Desktop Mode: download it, make it executable (Properties, Permissions, or `chmod +x`), then in Steam choose Add a Game, Add a Non-Steam Game, and pick it; it then starts from Gaming Mode.
- macOS (Apple silicon and Intel): [The-Pool-mac-universal.dmg](https://github.com/trebizondoculpepper/the_pool/releases/latest/download/The-Pool-mac-universal.dmg). Not yet signed: after copying it to Applications, run `xattr -cr "/Applications/The Pool.app"` once, or macOS calls it damaged.
- Windows: [The-Pool-windows-x64-setup.exe](https://github.com/trebizondoculpepper/the_pool/releases/latest/download/The-Pool-windows-x64-setup.exe) (or the portable `The-Pool-windows-x64.zip`). Not yet signed: SmartScreen asks first; choose More info, Run anyway.

To run or package it locally: `npm run build` at the root, then in `desktop/` `npm ci` once, `npm start` to run it, or `npm run package -- --linux` (or `--mac`, `--win`) to make the packages in `desktop/release/`. `desktop/` has its own `package.json` and lockfile, so Electron never touches the root's (and its `0.0.0` version is never changed: a release's packages take the tag's). The game is served on its own `app://game/` protocol, so its saves stay put between versions, and Sentry reports desktop runs as `desktop`. The Desktop check workflow (run by hand from the Actions tab) packages every platform from any branch into the run's artifacts, without a release.

## Contributing with an AI

Most of this project has been written with AI coding agents (Claude Code and OpenAI's Codex) working under the owner's direction, and the repository is set up so that an agent can pick up work safely.

1. **Instructions.** `AGENTS.md` is the project's instructions for any agent, and `CLAUDE.md` is a symlink to it, so Claude Code and Codex read the same rules. Read it first: it covers the building and plant model, the engineering standards (every engineering item is a real, working component; displays redraw only when what they show changes; all input goes through `src/toolkit/controls/`; `logic/` folders are pure and tested), UK spelling, Markdown written one paragraph per line, and the commit rules below. Folders such as `src/toolkit/` carry their own `CLAUDE.md` for their part of the code.
2. **Set up the agent.** Install [Claude Code](https://claude.com/claude-code) (or Codex) and start it in the repository's root, so it loads `AGENTS.md`/`CLAUDE.md`. Run `npm ci` and keep `npm run dev` running at http://127.0.0.1:5175/, which agents use to look at their work. For screenshots and in-browser checks, agents drive Chrome headlessly with `playwright-core`; screenshots belong in a scratch folder, not the repository.
3. **Find work.** `TODO.md` is the one to-do list. Larger pieces of work are missions: numbered briefs in `doc/prompts/` (finished ones in `doc/prompts/done/`), written with the owner before any code, often with plans and a second opinion from another model in `doc/plans/<number>/`. New equipment and controls are tried in the development rooms first (the `?dev` panel lists them).
4. **Work safely in a shared checkout.** Several agents often work in this checkout at once. Stage your own files by name, never with `git add -A`, `git add .` or `git add src`; commit through a private index (`GIT_INDEX_FILE=<somewhere private> git read-tree HEAD`, add your files, commit, then `git reset -- <files>`), so other sessions' staged work is untouched; then `git pull --rebase --autostash` and push. Do not create git worktrees unless the owner asks, and never commit `agent-mailbox.toml`, `agent-inbox.toml`, or `package.json`/`package-lock.json` outside a dependency change or a release.
5. **Before every commit** run the [checks](#checks), add a `CHANGELOG.md` entry under Unreleased with its Keep a Changelog heading (`### Added`, `### Changed`, `### Fixed`), and tick or add the `TODO.md` item. Releases are cut only when the owner asks.
6. **Ask, one question at a time.** Agents ask the owner one question at a time and record decisions in the mission brief or `AGENTS.md`, so the next agent inherits them.

## Versions and releases

Player-facing daily updates follow the [devlog workflow](doc/devlogs/README.md). Drafts are compiled on request in `doc/devlogs/`; publishing a devlog is a separate step from uploading a game build.

The game uses [semantic versioning](https://semver.org/) (mission 104; the owner, 2026-10-28): every push to `main` is the next patch, every release the next minor, and a major only when the owner asks. GitHub Pages follows every push to `main`, the bleeding edge; itch.io carries releases only, usually a few a day.

Only a release changes the version in `package.json`. Every other build derives its version, once, in `scripts/build.ts`: `package.json`'s with its patch moved on by the first-parent commits since the commit that last changed it (`scripts/versioning.ts`). So after `Release v0.2.0`, the twelfth commit on `main` builds as 0.2.12. A build writes no tracked file, so building never dirties the tree and parallel sessions never conflict on the package files; CI makes no commit of its own. In CI the build fails if it cannot read the history; locally, without git, it builds at `package.json`'s version. The development server shows `package.json`'s version, marked as a development build. The title screen's bottom-right corner shows the version, source commit and UTC build date, marks development builds and uncommitted changes, and links to the GitHub source. Below 1.0.0 the game is in development.

Never stage `package.json` or `package-lock.json` with ordinary work: only with a dependency change, or in a release. CI fails a push in which any commit other than a `Release vX.Y.Z` commit changes the version (`scripts/version-guard.ts`).

Every change goes under Unreleased in `CHANGELOG.md` as it is made. A release is cut only when the owner asks, on a clean `main` level with `origin/main`:

- `npm run release` releases the next minor (`npm run release -- major` only when the owner asks, or `-- x.y.z` for an exact version). It runs the typecheck, lint, format check and tests, bundles at the new version, and only then writes `package.json`, the lockfile and `CHANGELOG.md` (Unreleased becomes `## [x.y.z] - date`, with a fresh Unreleased above and the compare links updated), commits them as `Release vX.Y.Z`, makes the annotated tag `vX.Y.Z`, checks again that `origin/main` has not moved, and pushes the branch and tag together (`git push --atomic`). If any step fails it undoes what it did, leaving the tree as it was, so it can be run again.
- The tag starts the Release workflow (`.github/workflows/release.yml`). It checks that the tag is annotated, points at the commit it builds, is on `main`, and matches `package.json`, both of the lockfile's version fields and a changelog section; runs the checks; rebuilds at the tag's exact version (`npm run build -- --release`); publishes a GitHub release whose notes are that section's headlines sorted into Major features and Minor fixes, with a link to the full section (`scripts/release-notes.ts`; an entry under a `### Fixed` heading is a fix, under any other heading a feature, and under none a fix when its headline says so: fixed, no longer, bug, audit and the like; `node scripts/release-notes.ts --dry-run` prints Unreleased's notes), the same notes on the run's summary page for an itch.io devlog (itch.io takes no notes with a build); and uploads the build to itch.io with butler (`--userversion` the release's version).
- If the Release workflow fails after the tag is pushed, do not move, delete or remake the tag, and do not re-run the failed run (a re-run uses the workflow file at the tag's commit). Fix the cause on `main`, then publish the same tag again with main's workflow: `gh workflow run release.yml -f tag=vX.Y.Z` (watch it with `gh run watch`). It checks out that tag and makes every check the tag push makes; a GitHub release that already exists is kept, and the build goes on to itch.io.

## Error reporting

Every run sends its errors to Sentry (`src/toolkit/errors/error-reporting.ts`): uncaught errors, unhandled rejections and the errors the game catches itself. Each carries its release, `the-pool@` and the version (the build's derived version; on the dev server the same, worked out from git by `vite.config.ts`), and its environment, so runs are told apart: `prod` (releases on itch.io), `pre-release` (GitHub Pages), `desktop` (the desktop app) and `dev` (the dev server, or a build served anywhere else); and tags for its build (commit and date, marked if it had uncommitted changes), the room and the graphics preset. Errors only: no tracing, profiling or replays, no cookies and no personal data. `?dev` and automated browsers (`navigator.webdriver`, the headless checks) never report.

## Reused from the Encabulator

The build tooling (Vite+, TypeScript 7, Oxlint, Oxfmt) and the first-person control scheme come from the neighbouring `encabulator` project; see `doc/reuse-inventory.md`.

## Licence

The Pool is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. It is distributed in the hope that it will be useful, but without any warranty; see `LICENSE` for the full terms. As an additional permission under the GPL's section 7, it may be linked with game platform libraries, such as the Steamworks and Epic Online Services SDKs, without those libraries falling under the GPL (`LICENSE-EXCEPTION.md`). The recordings and textures it uses keep their own licences, listed in `CREDITS.md`.
