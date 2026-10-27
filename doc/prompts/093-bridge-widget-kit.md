# 093: A starship-bridge widget kit, for swimming pools

Status: stage 1 under way (2026-10-27). Built: the kit as its own generic layer, `src/ui2d/` (the owner: separate and reusable, depending on nothing in the game; its API in its `README.md`), tested; the generic touch surface (`src/toolkit/components/industrial-control/{logic,views}/touch-surface.ts`): a black backing frame of any outline with ui2d screens set coplanar into it inside a bezel, uses routed to the tree at the touched pixel, bleeps on its sounds; dev47 (`?room=dev47`), touch panels of every shape. Next: the dev0 board, then the later stages below. Written 2026-10-27 from the owner's request.

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first, `doc/design/control-interface-archetypes.md` (the starship bridge touch station) and mission 092. Markdown is one paragraph per line.

## The request

The owner, 2026-10-27: "Can you see if someone has made a two-dimensional LCARS style widget library that we can use to create the Star Trek style interfaces? It would be really funny if we could create, let's say, the main forward viewing screen could be used to display a variety of different things depending on what instructions are put to it. Like, it could show security camera footage, it could show an animated schematic in the LCARS style." Then, on the libraries found: "if those libraries are legal, we can probably create our own two-dimensional widget library that uses design elements of those, since they're MIT licensed. We are not copying the exact ... existing control panel designs ... We're copying the design language ... We can take the 2D library and turn it into something that works in 3D, and then use that in our parody by making it about swimming pools rather than spaceships."

## What exists (checked 2026-10-27)

| Library                                                                                     | What                                                                   | Licence                                         | Last pushed |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------- | ----------- |
| [joernweissenborn/lcars](https://github.com/joernweissenborn/lcars)                         | CSS/HTML framework: elbows, bars, pill buttons, colour palette, layout | MIT (© 2014 Garrett, © 2020 Jörn Weißenborn)    | 2021        |
| [agent-P/LCARS-Javascript-Framework](https://github.com/agent-P/LCARS-Javascript-Framework) | JavaScript building SVG components (screen, button, keypad, clock)     | MIT (© 2019 Perry Spagnola)                     | 2019        |
| [louh/lcars](https://github.com/louh/lcars)                                                 | Vue responsive layout                                                  | GPL-3.0 (do not use: it would bind the project) | 2026        |
| [crstmkt/LCARS-SDK](https://github.com/crstmkt/LCARS-SDK)                                   | CSS plus JS API, Illustrator mock-ups                                  | none stated (do not use)                        | 2021        |

## The decision (the owner, 2026-10-27)

Build the game's own 2D widget kit taking its design language from the two MIT libraries: their shapes and proportions (elbows joining bars, rounded end caps, pill buttons, bar-and-block frames, the colour-blocked palette, condensed capitals), adapted to draw on a canvas texture in 3D. Where code, CSS values or geometry are taken from them, keep their MIT notices (in `CREDITS.md`, with the files and what was adapted recorded in `doc/reuse-inventory.md`, as the project does for the Encabulator). Copy no existing on-screen panel designs from the show, and no Star Trek names, logos or Paramount artwork; the panels are about swimming pools ("FILTRATION", "BACKWASH SEQUENCE", "CHLORINE RESIDUAL"). Lettering in a free condensed face (for example Antonio, SIL Open Font Licence), not the show's own fonts.

## How it draws

Not HTML in the scene: the browser cannot draw the DOM into a WebGL texture, and a CSS3D overlay would not be lit, occluded or post-processed and would sit outside the one control scheme. So the kit draws with Canvas 2D onto a `CanvasTexture`, as the game's dot-matrix, LCD and seven-segment displays do: pure layout and state in a `logic/` module (tested), a view that paints it, redrawn only when what it shows changes (`doc/research/display-only-updates.md`). Touches come through the control scheme (`src/toolkit/controls/`) as uses on the panel's parts, mapped from the hit point on the surface to the widget under it; each touch answers with a bleep (the game's own synthesised sounds, a family of short tones).

## Stages

1. The kit: elbows, bars, frames, pill buttons (pressed and lit states), labels, numeric read-outs, bar gauges, a small trend, an alarm banner that flashes; a layout of a frame with sidebar buttons and a content area; page switching; hit-testing a touch to its widget. Tried on a dev0 board first (a touch panel showing a pool's readings with a few working buttons and bleeps).
2. The main viewscreen as a component with modes, chosen from a station (or the operator's console): the CCTV feed (the game's existing cameras, `cctv` monitors); an animated schematic of a system, drawn from its room's enhanced network, water moving and levels changing as the world does; trends; the alarm list; and a full-screen alert when something trips. On trial in dev46 first, on its full-height front wall.
3. The six system stations in dev46 (circulation and filtration, chemical dosing, heating, air handling, power, building), each a sloping touch panel built from the kit, showing and working its system through the world as the mimics do; local-only controls stay in the plant rooms (`CLAUDE.md`).

## Acceptance

- The kit's logic tested (layout, hit-testing, page state); the dev0 board works by touch with bleeps; screenshots.
- The viewscreen switches modes and shows live world state in dev46; screenshots of each mode.
- `CREDITS.md` and `doc/reuse-inventory.md` record what came from which MIT library; nothing GPL or unlicensed used; no Star Trek names, logos or fonts.

## The owner's refinements (2026-10-27, during stage 1)

- **A separate layer:** "keep the 2D widget kit as a distinctly separate, generic user-interface components layer that could be lifted out and reused in another project." So `src/ui2d/`: no imports from Three.js, the game or the toolkit; a component tree that lays itself out in a pixel rectangle, paints to a canvas context, says when it needs painting, takes presses in its own pixels and answers with an action and a sound for the host to play; one theme among possible others. The game's side holds the adapters.
- **Generic tools for 2D controls in 3D:** a touch surface: a black backing frame of any outline (rectangles, rounded rectangles, trapezia, raked console tops, concave outlines, curved strips), one or more ui2d screens inset in it with a bezel (4 mm a side by default, 0 allowed), coplanar with the frame and drawn over it by render order and polygon offset rather than nudged forward; a 3D hit mapped to the screen's pixel; its pure parts tested.
- **The dev room's scope:** "I just want to see a variety of different controls on a variety of different shapes. It just doesn't matter if any of it makes any sense. The question is, can we lay out things? Can we lay out LCARS things in a 2D space in a 3D world?" So dev47 shows touch surfaces of many shapes with an assortment of widgets under pool-flavoured nonsense, answering every touch, bound to nothing. Re-imagining the game's real panels and mimics on touch screens (the pump panel, WH-CP1, a mimic, the annunciator, the changeover switch, the readings), each working on a trial state, is deferred, with the viewscreen's modes, to the later stages.
