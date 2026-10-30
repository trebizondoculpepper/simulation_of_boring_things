# 111: desktop builds on every release

The owner, 2026-10-30: build the game as an Electron app for Linux, macOS and Windows on every release, in CI, and make the builds downloadable from GitHub; the Linux AppImage first, to try on the owner's Steam Deck as a non-Steam game. This is stages 1 and 3 of mission 110 (`doc/prompts/110-desktop-release.md`, the research and the reasons for Electron and electron-builder); signing (stage 4), the game's desktop adaptations (stage 2) and Steam (stages 5 onward) are later missions.

You are working on "The Pool", a browser game in TypeScript and Three.js (this repository). Read `CLAUDE.md` first; its rules apply, above all the versioning rules (README, "Versions and releases", mission 104): a build never changes the version, the root `package.json` and lockfile are staged only with a dependency change or a release, and only a release reaches a store.

## Where the builds are downloaded

- **Every release**, on its GitHub release page (`https://github.com/trebizondoculpepper/the_pool/releases`), as assets beside the source archives: public, no sign-in, kept for good. The files are named without the version (the release already carries it), so a stable link always fetches the newest: `https://github.com/trebizondoculpepper/the_pool/releases/latest/download/The-Pool-linux-x86_64.AppImage`. The README and the itch.io page can link to these.
- **itch.io**, optionally, as desktop channels beside `html5` (`butler push … salimfadhley/the-pool:linux`, `:mac`, `:windows`), so the itch app installs and updates them.
- Not on every push to `main` (the owner, 2026-10-30): releases only.

## What each release carries

| Platform    | Files                                                         | Notes                                                                                                                                                                                                      |
| ----------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Linux x64   | `The-Pool-linux-x86_64.AppImage`, `The-Pool-linux-x64.tar.gz` | The AppImage runs on the Steam Deck (desktop mode, then "Add a Non-Steam Game"); the folder in the tarball is what a Steam depot will hold                                                                 |
| macOS       | `The-Pool-mac-universal.dmg`, `The-Pool-mac-universal.zip`    | Apple silicon and Intel in one; unsigned until stage 4, so a downloaded copy is refused as "damaged" until the quarantine is cleared (`xattr -cr "/Applications/The Pool.app"`), said in the release notes |
| Windows x64 | `The-Pool-windows-x64-setup.exe`, `The-Pool-windows-x64.zip`  | Unsigned until stage 4: SmartScreen asks "Run anyway"; the zip is portable, and its folder is what a Steam depot will hold                                                                                 |
| All         | `SHA256SUMS.txt`                                              | Checksums of every file above                                                                                                                                                                              |

Each file also gets a GitHub build attestation (`actions/attest-build-provenance`), so anyone can check with `gh attestation verify` that it was built by this repository's release workflow from the tagged commit. It is free, works for unsigned files, and stays useful after signing.

## Part 1: the Electron app, run locally

A new folder, `desktop/`, the only place Electron appears; no game code imports it.

- `desktop/package.json`: its own, `private`, with `electron` and `electron-builder` as dev dependencies and its own lockfile, so the root `package.json` and lockfile do not change (the version rule) and the web build installs nothing new. Its `version` stays `0.0.0` in the file; the build is given the real one (below).
- `desktop/src/main.ts`, the main process:
  - Serves the release's `dist/` through a custom protocol (`protocol.handle('app', …)`, scheme registered as standard and secure) rather than `file://`, so the origin is stable (`app://game/`), modules and fetch behave as on the web, and localStorage (the saves and settings, unchanged for now) lives under one origin for good.
  - One `BrowserWindow`: fullscreen by default, `backgroundThrottling: false`, `autoplayPolicy: 'no-user-gesture-required'` (the title music starts at once), `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, no menu bar.
  - `app.commandLine.appendSwitch('ignore-gpu-blocklist')` and, on Windows, `force_high_performance_gpu`.
  - Links leaving the game (the credits, GitHub) open in the system browser (`shell.openExternal`), never in the game's window.
  - One instance only (`requestSingleInstanceLock`).
- `desktop/src/logic/app-path.ts`: the pure mapping from an `app://game/…` URL to a file under `dist/`, refusing anything that escapes it (`..`, encoded or not) and answering `index.html` for `/`; tested beside it (`app-path.test.ts`), as every `logic/` module is.
- `desktop/electron-builder.yml`: `appId` `uk.co.teamrocket.thepool` (to confirm), `productName` "The Pool", the targets in the table above, `artifactName` patterns giving those file names, the icons (from `resources/images/icons/meta/`, a 512 px PNG for Linux, an `.icns` and an `.ico` made from it), `dist/` copied in as `extraResources` or `files`, `asar: true`, `publish: null` (CI uploads, not electron-builder).
- The main process is TypeScript, compiled to `desktop/build/` with `tsc` (its own `tsconfig.json`).
- Scripts in `desktop/package.json`: `start` (run against the root's `dist/`), `package` (electron-builder for the current platform). No root script: the root `package.json` changes only with a dependency or a release.
- Sentry: the game picks its environment by host (`src/toolkit/errors/logic/error-reporting.ts`); `game` under `app://` is unknown to it and reports as `dev`. Add a `desktop` environment for the `app:` protocol now (one line and a test), so desktop runs are told apart from the start; the bridge, platform tags and `@sentry/electron` stay for stage 2.
- Try it: build the AppImage on the Mac (`electron-builder --linux` cross-builds an AppImage) or in CI, copy it to the Deck, add it as a non-Steam game, and play from Gaming Mode; then the Mac and Windows builds. Compare frame rates with Chrome in a plant room and the museum.

## Part 2: CI on every release

In `.github/workflows/release.yml`, after the existing `release` job (checks, web build, GitHub release, itch.io):

1. The `release` job uploads the built `dist/` as a workflow artifact (`actions/upload-artifact`, `dist`), so every platform packages exactly the build the web release shipped.
2. A new job, `desktop`, `needs: release`, a matrix of `ubuntu-latest`, `macos-latest` and `windows-latest`:
   - checks out the tag, sets up Node from `.node-version`, `npm ci` in `desktop/`;
   - downloads `dist`;
   - runs electron-builder for its platform with the version from the tag: `--config.extraMetadata.version=${TAG#v}`, never committed;
   - makes the checksums of its files;
   - attests them (`actions/attest-build-provenance`; the job needs `id-token: write` and `attestations: write`);
   - uploads them to the release: `gh release upload "$TAG" <files> --clobber`, so publishing a failed release again (`gh workflow run release.yml -f tag=vX.Y.Z`) replaces rather than fails.
3. A last job, `checksums`, `needs: desktop`, gathers the three platforms' checksums into one `SHA256SUMS.txt` on the release.
4. If itch.io's desktop channels are wanted (a decision below), the `desktop` job also pushes its unpacked folder with butler.

A failure in `desktop` does not undo the release: the web build is already on GitHub Pages and itch.io; the release is published again by hand once the cause is fixed on `main`, as today.

The repository is public, so the runners (macOS included) cost nothing. Each platform takes about five to ten minutes; the release stays visible while its desktop files are added.

## Docs and checks

- README: a "Desktop builds" section: where to download, how to run on the Steam Deck, the unsigned warnings and how to get past them, and how to build locally.
- `CHANGELOG.md` under Unreleased; `TODO.md` ticked and the follow-ups added (stage 2's adaptations, stage 4's signing, Steam).
- The root `npm run typecheck`, `lint`, `format:check`, `test` and `build` cover `desktop/src/` too (or `desktop/` gets its own `typecheck` and `test`, run in CI's `desktop` job), so a broken main process fails before a release.
- A workflow run by hand (`workflow_dispatch` on a branch, uploading to the run's artifacts instead of a release) to prove the packaging without cutting a release.

## Decisions for the owner

1. **Builds between releases**: decided (the owner, 2026-10-30): releases only. Every push to `main` keeps deploying the web game to GitHub Pages and nothing more.
2. **itch.io desktop channels**: push the Linux, Mac and Windows builds to itch.io beside `html5`, or keep itch.io browser-only for now.
3. **The app ID**: `uk.co.teamrocket.thepool`, or another reverse-domain name the company owns (it is fixed once a signed macOS build ships).
4. **Linux on Arm**: x64 only (the Deck is x64), or an `arm64` AppImage too.

## Estimate

Part 1 about a day to a day and a half, part 2 about a day, with a run by hand on a branch (above) to prove the packaging before the next real release carries it.
