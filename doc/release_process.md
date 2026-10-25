# Release process

How Pool Plant gets from `main` to the places it is played: GitHub Pages and itch.io. Versioning and tagged releases are in the README ("Versions and releases"); this page covers where each build goes and how to get it there by hand when CI cannot.

Daily player-facing notes follow the [devlog workflow](devlogs/README.md), compiled on request and published separately through itch.io's devlog editor. Butler uploads builds; its current command set does not publish devlog posts. Keeping main's build deployments does not require a release branch for daily notes.

## Where builds go

| Destination                                                | What goes there                                                 | When                                   | Done by                                    |
| ---------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------- | ------------------------------------------ |
| GitHub Pages                                               | The built site (`dist/`)                                        | Every push to `main` whose checks pass | `deploy` job in `.github/workflows/ci.yml` |
| itch.io, [The Pool](https://salimfadhley.itch.io/the-pool) | The same `dist/`, as channel `html5` of `salimfadhley/the-pool` | Every push to `main` whose checks pass | `itch` job in `.github/workflows/ci.yml`   |
| GitHub release                                             | Notes from the version's `CHANGELOG.md` section                 | A pushed tag `vX.Y.Z` (owner only)     | `.github/workflows/release.yml`            |

Both destinations carry the same successful build version, recorded in `package.json` and `package-lock.json` (for example 0.1.242). Every successful `npm run build` advances the patch after bundling succeeds; CI commits the version update with `[skip ci]` so it does not trigger another build. The itch.io upload is labelled with it (`--userversion`), so the itch.io dashboard and the game's title screen agree.

## The itch.io job

After the `check` job passes on `main`, it uploads `dist/` as the artifact `site` and publishes the version as its output. The `itch` job then:

1. downloads `site` into `dist/`;
2. installs butler, itch.io's uploader, from `https://broth.itch.zone/butler/linux-amd64/LATEST/archive/default`;
3. runs `butler push dist salimfadhley/the-pool:html5 --userversion <version>`, logged in by the `BUTLER_API_KEY` environment variable.

It has its own concurrency group (`itch`), so uploads queue one after another and never hold up the Pages deploy. butler sends only what changed since the last build, so a push is a few megabytes at most.

## Secrets

`BUTLER_API_KEY` is a repository secret (Settings → Secrets and variables → Actions). It is an itch.io API key; butler needs no other kind. To make a new one:

- **Through butler (preferred):** in a real terminal, run `butler login` and approve it in the browser. butler saves the key in `~/Library/Application Support/itch/butler_creds` (macOS). Store it in GitHub straight from that file, so it is never typed or pasted: `tr -d '[:space:]' < "$HOME/Library/Application Support/itch/butler_creds" | gh secret set BUTLER_API_KEY`.
- **On the website:** itch.io → Settings → [API keys](https://itch.io/user/settings/api-keys) → Generate new API key, then `gh secret set BUTLER_API_KEY` and paste it at the prompt.

A key made by `butler login` is scoped to uploads ("wharf") only: it works with butler but not with itch.io's other API calls (`/my-games` refuses it). To retire a key, revoke it on the API keys page; `butler logout` only forgets it locally.

Never paste a key into a chat, an issue or a commit. If one is exposed, generate a new key, replace the secret and revoke the old one.

## Pushing to itch.io by hand

When CI cannot run (for example, a workflow change waiting to be pushed), upload from a Mac. Build only committed code: a working tree with other people's unfinished changes may not compile, so build a clean worktree of `HEAD`.

```sh
# butler for macOS (Intel build; runs under Rosetta on Apple silicon). Not on Homebrew:
# Homebrew's "butler" cask is an unrelated app.
curl -L -o butler.zip https://broth.itch.zone/butler/darwin-amd64/LATEST/archive/default
unzip butler.zip -d ~/.local/share/butler
xattr -dr com.apple.quarantine ~/.local/share/butler
ln -sf ~/.local/share/butler/butler ~/.local/bin/butler   # keep 7z.so and libc7zip.dylib beside it
butler login

# A clean build of HEAD, numbered as CI numbers it.
# The symlink uses the current checkout path, even if its directory was not renamed.
pool_checkout=$(pwd)
git worktree add --detach ../pool-release HEAD
cd ../pool-release
ln -s "$pool_checkout/node_modules" node_modules
npm run build
version=$(node -p "require('./package.json').version")

butler push dist salimfadhley/the-pool:html5 --userversion "$version"
butler status salimfadhley/the-pool:html5   # a minute or so until the build shows ✓

cd - && git worktree remove --force ../pool-release
```

## The itch.io page

The upload alone does not make the game playable. These are set once, on the game's [edit page](https://itch.io/game/edit/5222210), and kept by every later push to the same channel:

- **Kind of project:** HTML.
- **Uploads:** on the `html5` upload, tick "This file will be played in the browser".
- **Embed options:** the viewport size (the game fills what it is given), "Mobile friendly" off (it needs a keyboard and mouse), and the fullscreen button on. Leave "Automatically start on page load" off, so the game does not start until the player clicks it, as its pointer lock needs.
- **Visibility:** Draft until the owner chooses Public (or Restricted for testers).

## Limits

itch.io's limits for an HTML game are 1,000 files, 500 MB extracted and 200 MB for any one file. The build is about 250 files and 16 MB. Asset paths are relative (Vite's `base: './'`), which itch.io's sandboxed iframe needs; keep links relative too. Saves use the browser's storage, which itch.io's game domain (`html-classic.itch.zone`) keeps apart from GitHub Pages', so a player's save does not carry between the two.

## Troubleshooting

- **`refusing to allow an OAuth App to create or update workflow … without workflow scope`:** the `gh` login cannot push changes to `.github/workflows/`. Run `gh auth refresh -h github.com -s workflow` once, then push again.
- **`No credentials and stdin is not a terminal`:** `butler login` was run without a terminal (from a script or an agent). Run it in a real terminal, or set `BUTLER_API_KEY`.
- **`No channel html5 found` straight after a push:** itch.io is still processing the build; `butler status` shows it within a minute or two.
- **The page shows a download instead of the game:** the upload is not marked "played in the browser" (see "The itch.io page").
