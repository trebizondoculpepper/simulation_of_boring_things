# 110: a desktop release, for Steam

The owner, 2026-10-30: what would it take to make a binary desktop release of the game, which could later go on the Steam store? The owner presumes Electron; this brief compares it with the alternatives, says how each part of the game would have to change, sets out the build and release pipeline, lists what Steam requires and what it costs, and recommends a staged path. It is research: nothing here has been built yet, and every stage waits for the owner to ask for it.

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first; its rules apply, above all the versioning rules (README, "Versions and releases", mission 104): a build never changes the version, `package.json` and the lockfile are staged only with a dependency change or a release, and only a release reaches a store.

## Contents

- [Where the game is today](#where-the-game-is-today)
- [Choosing a wrapper](#choosing-a-wrapper)
- [Fit with the game](#fit-with-the-game)
- [Build and release pipeline](#build-and-release-pipeline)
- [Steam requirements and costs](#steam-requirements-and-costs)
- [Recommended path](#recommended-path)
- [Decisions for the owner](#decisions-for-the-owner)
- [Sources](#sources)

## Where the game is today

- A Vite (vite-plus) build of TypeScript and Three.js 0.186, `base: './'` (`vite.config.ts`), so `dist/` already loads from relative paths and will load from a `file://` or custom-protocol origin with little or no change.
- The version is worked out once in `scripts/build.ts` and passed to the bundle as `VITE_VERSION`, with `VITE_BUILD` (commit and date); a release (`npm run release`, tag `vX.Y.Z`) builds at exactly the tag's version (`npm run build -- --release`).
- `.github/workflows/release.yml` runs on the tag: checks the tag against `main`, `package.json`, the lockfile and `CHANGELOG.md`; runs typecheck, lint, format check and tests; builds; publishes a GitHub release; and pushes `dist` to itch.io with butler (`salimfadhley/the-pool:html5`, `--userversion`). GitHub Pages follows every push to `main`.
- The world is saved in the browser's localStorage (`src/game/save.ts`, `src/toolkit/save/world-store.ts`), as are settings (`src/toolkit/settings/settings-store.ts`).
- Input goes through the one control scheme (`src/toolkit/controls/`), which takes pointer lock (`first-person.ts`); fullscreen is requested from the page.
- Errors go to Sentry (`@sentry/browser`), each run under an environment chosen by host in `src/toolkit/errors/logic/error-reporting.ts`: `prod` (itch.io), `pre-release` (`*.github.io`) or `dev`.
- The licence is GPL-3.0-or-later (`package.json`); see the decisions below.

## Choosing a wrapper

### The candidates

| Wrapper                                                       | Engine                                                                       | Steamworks                                                                                          | Download (approx.)                                 | Notes                                                                                                                               |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Electron                                                      | Bundled Chromium, same on every OS                                           | steamworks.js (maintained, Rust/napi), overlay helper; greenworks (best-effort maintenance)         | 80 to 120 MB installed per platform, plus the game | The usual choice for web games on Steam; one renderer to test                                                                       |
| NW.js                                                         | Bundled Chromium                                                             | greenworks (originally written for NW.js)                                                           | Similar to Electron                                | Used by CrossCode and RPG Maker MV/MZ games; smaller community, fewer packaging tools                                               |
| Tauri 2                                                       | The system webview: WebView2 (Windows), WKWebView (macOS), WebKitGTK (Linux) | No official binding; call the Steamworks SDK from Rust (the `steamworks` crate) and expose commands | A few MB plus the game                             | Three renderers to test; WebKitGTK's WebGL is the weak point on Linux and the Steam Deck; the overlay hooks a system webview poorly |
| Neutralinojs, Wails                                           | System webview                                                               | None                                                                                                | Very small                                         | The same webview problems as Tauri, with less tooling; not credible for a Steam game                                                |
| A Chromium Embedded Framework host, or a Steam-specific shell | Bundled Chromium                                                             | Write it yourself                                                                                   | Like Electron                                      | Much more work for no gain here                                                                                                     |

### WebGL, WebGPU and the GPU

Electron and NW.js carry the same Chromium, so the game renders exactly as it does in Chrome today: the WebGL 2 path the game uses, and WebGPU (on by default in current Chromium on Windows and macOS, still behind flags on some Linux drivers). Chromium blocks the GPU on some old or unusual drivers; a game should launch with `app.commandLine.appendSwitch('ignore-gpu-blocklist')` and request the discrete GPU (`powerPreference: 'high-performance'` on the WebGL context; on Windows laptops, Electron's `force_high_performance_gpu` switch). Background throttling should be off (`backgroundThrottling: false`) so the world keeps stepping when the window loses focus, if the owner wants that. Tauri inherits whatever the system webview does: Safari's WebGL on macOS, WebView2 (Chromium) on Windows, and WebKitGTK on Linux, whose WebGL performance and feature coverage lag Chromium and vary by distribution; the Steam Deck in desktop or game mode would be the worst case.

### Bundle size

Electron's cost is a Chromium per platform, roughly 80 to 120 MB installed; Steam compresses and delta-patches depots, so the cost is paid once and updates are small. Tauri's few megabytes matter on a web download page but little on Steam. For this game size is not a deciding factor.

### Auto-update

On Steam, Steam updates the game; no updater is needed or wanted. Outside Steam (a direct download or itch.io's app), electron-updater (with electron-builder) or Electron's own update service serve signed updates, and the itch app updates through butler channels. The recommendation is to rely on Steam and itch.io and not ship an updater.

### Steamworks

- **steamworks.js** (ceifa): a napi binding of the Steamworks SDK for Node and Electron. It covers initialisation with the app ID, achievements, stats, Steam Cloud (remote storage), the overlay, rich presence, input, workshop and more. It runs in the main process (or a preload with context isolation); the renderer reaches it through IPC. `electronEnableSteamOverlay()` turns on the overlay for Electron windows; the overlay in Chromium is known to be fragile (it needs Chromium's GPU compositing kept in process and can flicker or fail to draw on some systems), so it must be tested on each platform, Shift+Tab, in a packaged build launched from Steam.
- **greenworks** (Greenheart Games): the older binding, written for NW.js, works with Electron too; its maintainers describe it as best-effort maintenance, so new projects use steamworks.js.
- **Steam Cloud without code**: Steam Auto-Cloud syncs files under a path set in the Steamworks partner site (for example the app's user-data folder) with no API calls, which is the simplest way to put saves in the cloud.
- **Achievements**: defined in the partner site, unlocked through the binding. The game has none yet; they are a game-design decision, not a wrapper one.

### macOS, Windows, Linux and the Steam Deck

Electron and steamworks.js build for Windows x64, macOS (Apple silicon and Intel, or a universal build) and Linux x64. For the Steam Deck the choice is a native Linux depot (Electron's Linux build, run in the Steam Linux Runtime) or the Windows build under Proton. Both work for Electron games; Proton is often the less troublesome (one fewer build to support, and Valve tests Deck compatibility against what the Deck runs), while native Linux serves desktop Linux players. A sensible start is Windows and macOS depots, with the Deck on Proton, adding a native Linux depot once it has been tested on a Deck.

### Recommendation

Electron, with electron-builder and steamworks.js. It is the owner's presumption and the evidence agrees: one known renderer (the game's own, Chromium), the best-maintained Steamworks binding, the most precedent for web games on Steam, and mature packaging, signing and CI tooling. Tauri's size advantage does not pay for three renderers and a hand-made Steam bridge; NW.js is viable but offers nothing Electron lacks.

## Fit with the game

### Wrapping the Vite build

A new folder, `desktop/`, holding the Electron main process (`main.ts`), a preload (`preload.ts`) exposing a small typed bridge (`window.desktop`: save, load, Steam calls, environment), the electron-builder config and the icons. The game's `dist/` is copied in unchanged. Serve it through a custom protocol (`protocol.handle('app', …)`) rather than `file://`, so the origin is stable, fetch and modules behave as on the web, and localStorage (for settings) lives under one origin. Electron and its packaging tools are dev dependencies of a separate `desktop/package.json`, or of the root (a dependency change, so `package.json` may be staged with it). The web build stays as it is: no game code may depend on Electron, only on the bridge when it is present.

### Saving

Today the world is saved in localStorage. In the desktop build the store (`world-store.ts`) should write to files in the app's user-data folder (`app.getPath('userData')/saves/…`) through the bridge, atomically (write a temporary file, then rename) and with a backup of the previous save, falling back to localStorage on the web. Steam Cloud then syncs that folder by Auto-Cloud (configured on the partner site, no code), or through steamworks.js's remote storage if finer control is wanted. The world's shape, `WORLD_VERSION` and its migrations stay as they are; only the storage changes. The settings may stay in localStorage, or move with the saves so they follow the player between machines.

### Fullscreen, pointer lock and the controls

Pointer lock works in Electron as in Chrome, without the browser's "press Esc to exit" banner, and the Esc-releases-the-pointer behaviour stays. Fullscreen should be the window's own (`BrowserWindow.setFullScreen`), started fullscreen by default with a settings choice (windowed, borderless fullscreen), and the menus' existing settings drive it through the bridge. The Steam Deck needs the controls tried with its gamepad and trackpads (Steam Input can map them to mouse and keyboard; a Deck-verified game must be playable without a keyboard, and its on-screen keyboard is needed for any text entry such as the console).

### Audio autoplay

Electron can lift the autoplay rule (`autoplayPolicy: 'no-user-gesture-required'` in the window's web preferences), so the title sequence's music can start at once instead of waiting for the first click.

### Sentry

Add an environment, `steam` (or `desktop`, with a `store` tag of `steam`, `itch` or `direct`), chosen not by host but by the bridge: `reportingEnvironment` takes a flag from the preload and returns `steam` when it is present. Report the platform (`win32`, `darwin`, `linux`, and whether under Proton), the Electron and Chromium versions, and the GPU (`app.getGPUInfo`). `@sentry/electron` could also catch main-process crashes and native minidumps; that is a dependency the owner should approve.

### The version in the build

The desktop build wraps the same `dist/` built at the release's version, so `VITE_VERSION` and `VITE_BUILD` need nothing new. electron-builder takes the app version from `desktop/package.json`; set it from the tag in CI (`--config.extraMetadata.version=${TAG#v}`) rather than committing it, so the version rule holds. SteamPipe's build description should carry the same version.

## Build and release pipeline

### Packaging

electron-builder is the better fit than Electron Forge here: one config produces a Windows NSIS installer and a plain unpacked folder, a macOS `.app` (and `.dmg`), and Linux AppImage and an unpacked folder, and it signs and notarises. For Steam the depots are the unpacked folders (Steam installs files, not installers). Forge is Electron's own and also works; it is a matter of taste.

### macOS signing and notarisation

Apple Developer Program: US$99 a year (£79 in the UK). Sign with a Developer ID Application certificate and notarise with `notarytool` (electron-builder does both from CI with an App Store Connect API key). Steam does not strictly require it, but an unsigned, un-notarised app is blocked by Gatekeeper, so a macOS release should be signed. steamworks.js's native module and the Steam API library must be signed inside the bundle, with the hardened runtime's entitlements for JIT (`com.apple.security.cs.allow-jit`) and unsigned executable memory.

### Windows signing

Steam does not require a signed executable, but SmartScreen and antivirus treat unsigned ones with suspicion. The options: Microsoft's Artifact Signing (formerly Trusted Signing), from about US$9.99 a month, signing from CI with no hardware token, but open to individuals only in the US and Canada (organisations in the UK and EU are eligible, so a UK limited company could use it); an OV certificate from a certificate authority (about £150 to £400 a year, since 2023 kept on a hardware token or a cloud HSM, which makes CI signing harder or dearer); or no signature at first, accepting SmartScreen warnings for anyone who downloads outside Steam.

### GitHub Actions

A new job (or workflow) on the release tag, after the existing checks and the web build: a matrix of `windows-latest`, `macos-latest` and `ubuntu-latest` runners, each downloading the built `dist/` as an artifact, packaging the Electron app for its platform, signing (and, on macOS, notarising), and uploading the result as an artifact. A final job uploads to Steam and, optionally, to itch.io as desktop channels (`butler push … salimfadhley/the-pool:windows`, `:mac`, `:linux`) beside the existing `:html5`. The existing rules carry over: only a release tag builds a store upload, and a failed release is published again with `gh workflow run release.yml -f tag=vX.Y.Z`.

### Uploading to Steam

SteamPipe takes an app build script (VDF) naming the app ID, a depot per platform and its content folder, and a branch. From CI, `game-ci/steam-deploy@v3` runs steamcmd in Docker with the app and depot paths. Steam Guard's two-factor login is the hurdle: log in once with steamcmd on a trusted machine, base64-encode its `config/config.vdf` and store it as a secret (it expires and must be refreshed from time to time), or generate the code with a TOTP action from the shared secret. Valve recommends a dedicated builder account with only the "edit app metadata" and "publish app changes to Steam" permissions. Upload to a beta branch (or the default branch without setting it live) and set builds live by hand from the partner site, at least until the pipeline is trusted.

## Steam requirements and costs

### Joining Steamworks

- Sign up as a Steamworks partner (free), naming the legal entity (the owner as an individual, or a company): the legal name and address, bank details for payouts, and tax forms: a UK individual or company completes the US tax interview (W-8BEN for an individual, W-8BEN-E for a company), claiming the UK–US treaty's 0 % withholding on royalties. Identity is verified.
- The Steam Direct app fee: US$100 per game (the app credit), paid once, recouped to the developer once the game has made US$1,000 gross in Steam store and in-app sales.
- Valve's revenue share: 30 % of sales, falling to 25 % after US$10 million and 20 % after US$50 million.
- After the first payment there is a 30-day wait before the first game can be released.

### The store page and its assets

The store page needs a description, tags, system requirements, supported languages, a trailer (recommended) and at least five screenshots (1920 × 1080 or larger, 16:9). The graphical assets (current Steamworks sizes, check the partner site's own template before making them):

| Asset                      | Size (px)                                    |
| -------------------------- | -------------------------------------------- |
| Header capsule             | 920 × 430                                    |
| Small capsule              | 462 × 174                                    |
| Main capsule               | 1232 × 706                                   |
| Vertical capsule           | 748 × 896                                    |
| Page background (optional) | 1438 × 810                                   |
| Library capsule            | 600 × 900                                    |
| Library header             | 920 × 430                                    |
| Library hero               | 3840 × 1240                                  |
| Library logo               | 1280 × 720 (transparent PNG)                 |
| Client and shortcut icons  | 32 × 32 `.jpg` and a 256 × 256 `.ico`/`.png` |

Capsules must show the game's logo and art, without review quotes, award badges or discount text. The game's title sequence tools (TODO.md, "Now: title sequence tools") and camera URLs can supply the stills.

### Review and the coming-soon page

Valve reviews the store page and, separately, the build, each typically within a few working days (allow a week or more each; rejected items go back and forth). The store page must be public as "coming soon" for at least two weeks before release, which is also when wishlists gather; most indies keep it up for months. The build review checks the game launches, matches the store page and does nothing harmful.

### Steam Deck compatibility

Valve tests games itself and rates them Verified, Playable, Unsupported or Unknown; developers do not apply but can ask for a review once the game is on sale (and Valve usually tests popular games unprompted). Verified needs: full controller support with the right glyphs, a default 1280 × 800 (or 16:10) resolution, text legible at that size, the on-screen keyboard for text entry, no launcher, and good performance on default settings. The game already lists 1280 × 800 among its resolutions; the controls on a gamepad are the real work.

### Content descriptors and the adult audience

The content survey asks about violence, gore, sexual content, nudity, drugs and general mature content, and builds the store's mature content description. The game, an engineering simulation for adults, likely has none of these; being aimed at adults is not itself a descriptor. An age gate and the "adults only" flag are for sexual content, not for an adult audience; the owner should answer the survey truthfully and add an adult-audience note to the description if wanted. Ratings boards (PEGI, the IARC questionnaire offered in Steamworks) are optional on Steam except where a country requires them.

### AI-generated content

Since January 2024 every game answers an AI section of the content survey, and Valve rewrote the rules in January 2026. The developer must disclose AI-generated content the player sees or hears, in two kinds: pre-generated (made with AI during development and shipped, such as art, music, voices, text) and live-generated (made while the game runs, for which Valve asks what guardrails stop illegal content). Tools used only to make the game, which leave nothing generated in front of the player (code assistants, among them), no longer need disclosing. The disclosure appears on the store page. For this game: AI-generated art and music must be disclosed as pre-generated content, saying what it is and that the developer owns the rights to it; AI-written code need not be (though the owner may mention it). Valve holds the developer responsible for AI content as for any other: it must not infringe copyright or misrepresent the game.

### Costs at a glance

| Item                    | Cost                                                                                                  | When                               |
| ----------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Steam Direct app credit | US$100 once, recouped after US$1,000 in sales                                                         | Before the store page              |
| Apple Developer Program | US$99 (£79) a year                                                                                    | For a signed macOS build           |
| Windows signing         | Artifact Signing about US$10 a month (if eligible), or an OV certificate £150 to £400 a year, or none | Optional, recommended              |
| Steam Deck for testing  | £349 upward (LCD or OLED)                                                                             | Optional, recommended for Verified |
| GitHub Actions          | Free for a public repository; macOS minutes cost ten times Linux's on a private one                   | Ongoing                            |

## Recommended path

Each stage is a separate request from the owner, and each ends with the game still deploying to GitHub Pages and itch.io as it does now.

1. **Electron prototype, unsigned, local** (about 1 to 2 days): `desktop/` with the main process, preload, custom protocol and electron-builder config; the release `dist/` wrapped; fullscreen, pointer lock, audio autoplay and GPU switches; run first as a Linux AppImage on the owner's Steam Deck (added as a non-Steam game), then on the owner's Mac and a Windows machine. Check frame rates against Chrome in each plant room and the museum.
2. **Desktop adaptations in the game** (about 2 to 3 days): the bridge; saves to files with atomic writes and a backup, behind `world-store.ts` (tested in `logic/`, as every store is); Sentry's `steam`/desktop environment and platform tags; windowed and fullscreen settings; a quit item in the menu. All of it inert on the web.
3. **CI packaging** (about 2 days): a matrix on the release tag building Windows, macOS and Linux packages as release artifacts and, optionally, itch.io desktop channels; still unsigned.
4. **Signing** (about 1 to 2 days, after the accounts exist): macOS Developer ID and notarisation; Windows signing by whichever route the owner chooses.
5. **Steamworks partner and app** (the owner's paperwork, a few hours over a week or two of verification): sign-up, tax and bank forms, the US$100 credit, the app ID; the depots and a builder account.
6. **Steam integration** (about 2 to 3 days): steamworks.js initialised with the app ID (and `steam_appid.txt` for development), the overlay tried on each platform, Steam Cloud by Auto-Cloud, SteamPipe upload from CI to a beta branch with `game-ci/steam-deploy`.
7. **Store page** (about 3 to 5 days, much of it the owner's): capsules and screenshots at the sizes above, a trailer, the description, content survey and AI disclosure; submitted for review and made public as coming soon (at least two weeks before release, ideally months).
8. **Steam Deck and controllers** (about 3 to 5 days): gamepad play through the control scheme (Steam Input configuration, glyphs, the on-screen keyboard for the console), legibility at 1280 × 800, testing under Proton; a native Linux depot if it proves better.
9. **Release** (a day): the build review, then release on the owner's word; the first `npm run release` that also reaches Steam.

In all, about three to four weeks of work, and several weeks of calendar time for verification, review and the coming-soon period. Stages 1 to 3 need no accounts or money and answer whether the game runs well as a desktop app; nothing is spent until stage 4.

## Decisions for the owner

1. **Which platforms first**: decided (the owner, 2026-10-30): all platforms in time (Windows, macOS, Linux), but the Steam Deck first. The first target is a native Linux build (an AppImage for side-loading as a non-Steam game, then a Steam depot run under the Steam Linux Runtime), tested on the owner's Deck; the Windows build under Proton is kept as the fallback if the native build misbehaves. Stage 1's prototype is therefore built for Linux and tried on the Deck before the Mac and Windows builds.
2. **Individual or company**: decided (the owner, 2026-10-30): published through the owner's company, Team Rocket Limited (UK). The Steamworks partner is the company, its tax form is the W-8BEN-E, and Microsoft's Artifact Signing is open to it for Windows.
3. **Windows signing**: Artifact Signing (via a company), an OV certificate, or unsigned at first.
4. **The GPL and Steam's SDK**: decided (the owner, 2026-10-30): a GPLv3 section 7 linking exception for game platform libraries (Steamworks, Epic Online Services, GOG Galaxy and their bindings), in `LICENSE-EXCEPTION.md`; the rest of the game stays GPL for everyone else.
5. **Price, or free**: the price (or free to play), regional pricing, and whether the web version stays free on GitHub Pages and itch.io alongside a paid Steam version.
6. **Achievements and Steam features**: whether to have achievements, rich presence or cloud saves at launch, or only cloud saves.
7. **Sentry naming**: one `steam` environment, or `desktop` with a store tag; and whether to add `@sentry/electron` for native crash reports.
8. **Updates outside Steam**: none (Steam and itch.io update the game), or an electron-updater for direct downloads.

## Sources

- steamworks.js, Steamworks bindings for Node and Electron: <https://github.com/ceifa/steamworks.js>
- three.js games on Steam, and how to ship one as a desktop app (Summer Engine, 2026; on Electron, Tauri, NW.js and greenworks): <https://www.summerengine.com/make-great-games/threejs-game-on-steam>
- Steam Direct (the fee and the two-week coming-soon page): <https://partner.steamgames.com/steamdirect>
- Steamworks documentation, the app fee: <https://partner.steamgames.com/doc/gettingstarted/appfee>
- Steamworks documentation, store graphical assets: <https://partner.steamgames.com/doc/store/assets>
- Steamworks documentation, Steam Cloud and Auto-Cloud: <https://partner.steamgames.com/doc/features/cloud>
- Steamworks documentation, SteamPipe uploading: <https://partner.steamgames.com/doc/sdk/uploading>
- Steamworks documentation, Steam Deck compatibility: <https://partner.steamgames.com/doc/steamdeck/compat>
- game-ci/steam-deploy, the GitHub Action: <https://github.com/game-ci/steam-deploy>
- Valve rewrites Steam's AI disclosure rules (VGC, January 2026): <https://videogameschronicle.com/news/valve-has-significantly-rewritten-steams-rules-for-how-developers-much-disclose-ai-use>
- Valve tweaks and clarifies AI disclosure rules (Game Developer): <https://gamedeveloper.com/business/valve-tweaks-and-clarifies-ai-disclosure-rules-for-steam>
- Steam updates its AI disclosure form (Notebookcheck): <https://www.notebookcheck.net/Steam-updates-AI-disclosure-form-requiring-developers-to-report-visible-and-in-game-AI-but-not-background-tools.1206103.0.html>
- Azure Artifact Signing pricing: <https://azure.microsoft.com/pricing/details/artifact-signing/>
- Windows code signing costs in CI, 2026 (eligibility and prices): <https://codenote.net/en/posts/windows-code-signing-ci-cost-per-signing-volume-2026/>
- Apple Developer Program: <https://developer.apple.com/programs/>
- electron-builder (packaging, signing, notarisation): <https://www.electron.build/>

Figures not confirmed by a 2026 source in this research (the Steam revenue tiers, the 30-day wait, the asset sizes, certificate prices) are from Steamworks' documentation as last known; check each on the partner site before relying on it.
