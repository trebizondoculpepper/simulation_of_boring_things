# 113 (a): the Frutiger Aero widget kit

Mission 113 (`doc/prompts/113-hall-4-dosing-console.md`) gives Hall 4 three touch screens in the Frutiger Aero style of the mid-2000s: glossy translucent glass, soft gradients, aqua, sky blue and fresh green, water droplets, bubbles and leaves, rounded shapes with gentle highlights. The owner (2026-10-31) asked for it to look as if it might run on a widget set of that era, without copying anyone's assets or naming any real operating system. This plan is the kit those screens are drawn with.

## Where it lives

The kit sits beside the existing ui2d kit as `src/ui2d/aero/`, framework-free as ui2d is (Canvas 2D and plain TypeScript, no Three.js, no game code). Its pure layout and state logic is `src/ui2d/aero/logic/aero-layout.ts` with `aero-layout.test.ts` beside it; its drawing is `src/ui2d/aero/aero-widgets.ts`; its palette is `src/ui2d/aero/aero-theme.ts`. ui2d's own retained-mode `UiNode` tree is not used: the dosing screens are small, fixed layouts, so the kit is immediate mode (a screen is a function of its state, drawn whole when that state's key changes), which keeps the redraw-on-change rule trivially true and the hit-testing a pure function of the same layout.

## The look, widget by widget

- Theme (`AERO_THEME`): sky `#bfe6fb` to aqua `#3fa9d8` backgrounds, glass white at 35–60 % opacity, ink `#0d2f4a`, selection blue `#9fd4f6`→`#4aa3e0`, fresh green `#7ccf3a`→`#3e9a1e` for go and success, amber for holding, a soft red for failure; the font a Segoe-like system sans stack (`"Segoe UI", "Selawik", "Open Sans", "Helvetica Neue", Arial, sans-serif`), a family name only, never a product name in the game's text.
- Background (`drawAeroBackground`): a vertical sky-to-aqua gradient, a broad pale swoosh of light across it, a few soft-edged bubbles with a bright rim and a crescent highlight, two stylised leaves and a scatter of droplets; static, seeded so every screen of a console differs slightly but each always draws the same.
- Glass panel (`drawGlassPanel`): a rounded rectangle (radius 10–14 px) filled with a white-to-clear vertical gradient at reduced opacity, a bright 1 px inner top highlight line, a darker 1 px outline, and the upper 45 % overlaid with a second, brighter gloss gradient, so it reads as glass in front of the background.
- Title bar (`drawTitleBar`): a glass strip with a stronger gloss, its title in semibold sans with a faint white glow, an optional small mark at the left (the maker's).
- Glossy button (`drawGlossyButton`): pill or rounded rectangle; a two-tone body (lighter upper half, a sharp gloss edge at mid-height, deeper lower half), an outer outline and an inner highlight; states `normal`, `hover` (a soft cyan outer glow), `pressed` (darker, the gloss inverted, the label nudged down 1 px), `selected` (the selection-blue body), `disabled` (desaturated, half opacity); tints `aqua`, `green`, `red`, `grey`.
- Scroll arrow (`drawScrollArrow`): a round glassy button with a chevron, up or down, the same states.
- List (`drawList`): a glass panel holding rows; the selected row a soft blue vertical gradient with a 1 px lighter outline and rounded ends; alternate rows faintly banded; a round scroll arrow above and below at the right; a thin scroll track showing the window's place.
- Text block (`drawTextBlock`): word-wrapped text in a rectangle, by the pure `wrapLines`, with an ellipsis if it overflows the lines allowed.
- Segmented selector (`drawSegmented`): n glossy segments in one rounded pill, the chosen one in selection blue and slightly raised; for the dose screen, five.
- Progress bar (`drawProgressBar`): a recessed glass track, a glossy fill (green, or amber while holding) and a label centred over it.
- Banner (`drawBanner`): a big rounded glass slab, tinted green (success), red (failure) or blue (information), its headline large and a line or two beneath.
- Splash or title strip (`drawMakerStrip`): the console maker's wordmark and the product's name on a glossy band, with its mark drawn by the brand logo code.

## Logic (pure, tested)

`aero-layout.ts` holds: `Rect` and `contains` (re-exported from ui2d's geometry so there is one rectangle type); `rows(rect, n, gap)` and `columns(rect, n, gap)`; `listWindow(count, visible, top, selected)` giving the rows shown, whether each arrow is enabled and the scroll thumb's place; `scrollTo(top, selected, visible, count)` keeping the selection in view; `wrapLines(text, width, measure, maxLines)` with an injected measure function so it tests without a canvas; `hitRegion(regions, x, y)` returning the id of the topmost region under a point; `formatClock(seconds)` for h:mm; and `RedrawGate`, which holds the last drawn key and says whether a new key needs drawing.

## Redraw rule and performance

Each screen is drawn from a state object; its key is a compact string of everything shown (the selection, the scroll, the size, the scenario view's words and the hold clock rounded to the lab minute). The host draws and sets `texture.needsUpdate` only when the key changes. Nothing animates by itself; a pressed button's glow is part of the state and clears on release, so a press costs two redraws. Canvases are 512 × 384 px, so even one redraw a second is 197 k texels, inside the benchmark's 300 k a second.

## Tests

`aero-layout.test.ts`: rows and columns tile their rectangle; the list window's arrows disable at the ends and the selection is kept in view; `wrapLines` wraps at the width, breaks a word longer than the line and ellipsises past `maxLines`; `hitRegion` finds the topmost and nothing outside; `RedrawGate` asks once per changed key and never for an unchanged one; `formatClock` pads minutes.

## Revision after Codex's critique

- Accepted: the hold clock keyed to the lab minute would redraw at about 17 Hz at 1,000×. The scenario screen's key now rounds the hold to 15 lab minutes (0.9 real seconds), so a hold redraws the screen five times in its 3.6 real seconds, and the progress fill moves in quarters; the benchmark measures the whole console, all three screens.
- Accepted: each screen has a typed view model and its key is built from that model alone (`screenKey`), so nothing painted can be missing from the key; the view model is derived once per step.
- Accepted: the maker strip takes the brand record from `brands.ts` and draws its mark with `drawBrandMark`, no hand-drawn maker artwork.
- Accepted in part: a host test checks that UV to pixel mapping hits the same regions the widgets draw (the regions are one table, used by both drawing and hit-testing); a visual check is made by screenshots at the desk's real size. Wrapping is tested with an injected measure; the real font is checked by eye in the screenshots.
- Rejected: reusing `touch-surface.ts` and the `UiNode` tree. That host is built for retained-mode ui2d trees with their own press timing; the Aero screens are immediate-mode functions of a small state, which keeps the redraw rule exact. The console takes the same input path (the walker's `use`, a raycast, the hit's UV to canvas pixels), so all input still goes through `src/toolkit/controls`.
