# itch.io page art

Art for the game's itch.io page (https://salimfadhley.itch.io/the-pool), made 2026-10-31 from the game's logo (`resources/images/title/`) and the museum's decal cut-outs (`resources/images/museum_decals/`), over a rendered pool-caustics floor, in the logo's palette.

| File                                         | Where it goes on itch.io                                                                                                                                                            |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `the-pool-banner-1920x640.png`               | Edit theme, Banner. itch shows banners at 960 wide, so the 2× file stays sharp; `the-pool-banner-960x320.png` is the 1× version.                                                    |
| `the-pool-background-caustics-2560x1600.jpg` | Edit theme, Background image: no repeat, centred or fixed, with the background colour below for the edges.                                                                          |
| `the-pool-embed-800x600.png`                 | Edit game, embed options: the HTML5 game's background image before launch, for itch's 4:3 embed: the titled logo on the caustics. `the-pool-embed-1600x1200.png` is the 2× version. |

Theme colours to match: background `#02213a` (navy), text `#ffffff`, links `#1dabcd` (pool blue), buttons `#f6c324` (yellow) with navy text, embed background `#02213a`.

## Remaking them

`source/` holds the pages the images were rendered from and their render scripts (playwright-core and Chrome). To re-render, put beside the pages: `the-pool-logo.svg` and `the-pool-logo-titled.svg` from `resources/images/title/`, `Antonio-Variable.ttf` from `src/toolkit/components/core/assets/fonts/`, and the decal PNGs the pages name from `resources/images/museum_decals/`. Run `node render2.mjs <dir>` for the caustics (from `caustics.html`, a Worley-noise web in two warped layers), then `node render3.mjs <dir>` for the banner and `node render5.mjs <dir>` for the embed (from `embed800.html`).
