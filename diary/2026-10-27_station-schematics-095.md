# Development Diary Entry - 2026-10-27

## Context
- **Date**: 2026-10-27 UTC
- **Branch**: main
- **Commit**: see git log (095: schematic screens …)
- **Contributors**: Claude Code + User

## Problem Statement
The owner asked for LCARS-style schematic displays suited to each bridge station, more designs than there are screens, the screen switching between them every so often. Then, of dev48's OLYMPIC HYDRODYNAMIC OVERVIEW, schematics in that style for every pool and circuit, selectable on any console; then all of them in the touch-screen galleries; then, once the bridge agent had finished, mounted on the bridge.

## Our Approach
Generic pieces in `src/ui2d/schematic.ts` (flow network, vessel, ring gauges, sweep, matrix, strip, reticle, rotator, browser), each repainting only on change and animating at most 10 Hz. On the game side, the overviews are declared as stages of model node ids and traced through the room models by tests, so the drawing is the model's topology; each station's other designs read the world directly.

## Implementation
`logic/schematic-overviews.ts` (thirteen overviews, their layout and world reads), `logic/station-schematics.ts` (each station's designs), `views/station-schematics.ts` (building them, the browser, touch surfaces), `rooms/plant/schematic-gallery.ts` (dev48's new screens), `rooms/plant/station-schematics.ts` (dev49), and the bridge's places and mounting (`logic/control-room-prototype.ts`, `rooms/bridge-room.ts`, `views/bridge-viewscreen.ts`).

## Outcomes
- Tracing the overviews through the models caught that the Olympic's model has no link from the pool to its balance tank (the hall's overflow channels), so its loop begins at the tank and says why.
- The world does not say which boiler fires; the screens stage the six on the heat demand and say so.
- Tall capsules needed their own path (`pillPath` rounds only the ends of a lying pill).
- Screenshots were easiest as a 2D overlay of the trees painted straight to canvases on the dev server's page.
- Another agent committed shared registration hunks (dev49 in `dev-room-links.ts`) along with its own: harmless here, but a reminder to stage by name and check.

## Next Steps
Door and CCTV designs when the world models them; tidier labels in the crowded banks; a Main Engineering room for the engineering stations (the owner's idea).
