# Development Diary Entry - 2026-10-21

## Context

- **Date**: 2026-10-21, 10:00 to 11:55 UTC
- **Branch**: main
- **Commit**: (this commit)
- **Contributors**: Claude Code + User

## Problem Statement

Two requests. First, a new scene: a white-tiled room 15 m square and 7 m high with a 2 m column in the middle, a ring-shaped pool round it (2.75 m across inside, first 9 m and then 12 m outside, 1.2 m deep), four sconces on the column at 4 m, and then gutters, drains and filling jets. Second, a poolside information sign showing the pool's conditions, in the style of Eltin's water-treatment board but in English, in two versions (on a wall and on a floor-standing post), working, with development controls, tried in dev0 and dev13.

## Our Approach

The ring pool is a room of its own (`donut_pool_1`) on the pattern of red_bendy_1: a geometry builder scaled to metres and a room file with its own renderer and walker. It reuses the tile shader, the rippling water and the pool fittings PR_A already has.

For the sign, product pages and photographs were researched first (Eltin for the function and layout, Bodet for the case), kept out of the repository. The sign keeps its display state in pure logic, with tests, apart from its geometry. It reuses the existing seven-segment readout, micro-labels, the maker's badge, and the panel parts (selectors, potentiometers, push buttons) for its test panel. The panel is labelled as development data, so nothing suggests its values come from the chemistry simulation.

## Implementation

- `src/toolkit/gallery/views/donut-pool.ts`, `rooms/donut-pool-room.ts`: the ring pool, deck-level with grated overflow gutters at both edges, a pair of main drains, two rings of floor inlets, eyeball wall jets on both walls, deck gullies in the corners, a ladder, and opal sconces on brass brackets. It is registered in `dev-room-links.ts` and `main.ts`, and has no doors yet.
- `src/toolkit/components/pool/logic/pool-info-sign.ts` (and test): the sign's fields, precision, dash/stale/Err conventions, clock, and a development data source.
- `src/toolkit/components/pool/views/pool-info-sign.ts`: the sign, wall or post, made by Kessler-Moody Instruments.
- `src/toolkit/gallery/rooms/plant/pool-sign-demo.ts`: the sign with its test panel, as dev13 exhibits; dev0 places the same pair on its south wall.
- `src/toolkit/gallery/rooms/plant-room.ts`: a position link (`x`, `z`, `yaw` …) into a plant development room now takes effect. The room used to put the walker back at its spawn once its exhibits had built.
- `doc/research/pool-info-sign.md`: references, estimated dimensions and conventions. `reference/` is gitignored for the downloaded photographs.

## Outcomes

- Both pieces render and work in the game. Screenshots were taken with Playwright's cached headless Chromium (SwiftShader), which needs no Playwright package.
- The owner's mid-course corrections shaped the sign: the Eltin look (light face, red band, red digits) rather than a black face, and the board's full set of readouts (clock, air temperature, humidity, redox) rather than four.
- Learned: position links into dev13 had silently not worked; a room that builds asynchronously must re-apply the link's pose itself.

## Next Steps

- In the game, bind the sign to the sample flow cell's readings and to a keyed-in combined chlorine; redox, air temperature and humidity have no simulation yet.
- An empty pool: the sign should show dashes (no sample flow, no reading), not zero or `Err`.
- Doors into donut_pool_1, and real flow through its jets and drains.
