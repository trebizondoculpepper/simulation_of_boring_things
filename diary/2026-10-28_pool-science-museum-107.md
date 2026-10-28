# Development Diary Entry - 2026-10-28

## Context

- **Date**: 2026-10-28 UTC
- **Branch**: main
- **Mission**: 107, the pool science museum
- **Contributors**: Claude Code + the owner

## Problem Statement

The owner asked for a series of science-museum exhibits on how a swimming pool works: five halls from basic to advanced, each its own room, walked through one after another through open archways with no doors, with dev51 reused as one of them. The first step was brought forward to today: define the mission, then build the spaces only (interlinked halls with museum signage and a "coming soon" panel in each), the test being that you can walk between them. The owner then gave the look: a converted warehouse in an industrial quarter, painted brick, polished concrete, cast-iron and steel left showing, the services ceiling overhead, factory windows, archways knocked through old walls, track lighting and benches.

## Our Approach

Each hall is its own room and scene, joined to the next by the machinery the pool loop already uses (`door-joins.ts` and `handOver` in `src/main.ts`): a lazy joint at each archway, always open but drawn one at a time, the visitor handed over on crossing the shared wall's middle line. Rather than fix perspective jumps afterwards, the halls are laid out so there is nothing to jump: all five centred on one line, each shared wall built by both halls from the same function at the same width, and the floor's saw-cut bays laid from the museum's own origin, so both scenes draw the archway identically (the lesson of `8656cf1`).

## Implementation

- `museum-plan.ts`, pure and tested: halls, provisional sizes (one constant), briefs, archway frames, the museum origin, walking solids with a stop at each archway's middle until the hall beyond is drawn through it, the hand-over line, and which archway to see through.
- `museum-brand.ts`: the working brand, "Making a Splash" at The Dyehouse, in one place.
- `museum-hall.ts`: canvas-textured painted and bare brick (the knocked-through reveals bare), polished concrete, merged cast-iron columns, the services ceiling with its beams at ±w/4, obscured windows with glazing bars, track lights, benches and all the signs. `museum-hall-room.ts`: the scene, lights, passes following the preset, walker, joints and hand-over.
- The mission prompt `doc/prompts/107-pool-science-museum.md` with the brand options, the architecture, every hall's schematic, instruments, mimic, panels, reuse, new work and acceptance, the staged delivery and the owner's questions.

## Outcomes

- The logic test holds the hand-over geometry exactly: every archway's two frames at one museum point, facing, and any pose carried through to the same museum point both ways.
- In the browser the walk from Museum 1 to Museum 5 and back hands over at each archway without a jump in zoom or framing.
- A gotcha: a hall built after a key went down never hears that keydown, so a walker handed into it stands still until the key repeats. Real keyboards repeat, so players are unaffected, but a scripted walk must resend keydown.
- Another: the archway to see through first switched only 4 m clear of the last one, leaving the far archway on its stand-in for a long time; the zone is now just the archway's own depth plus a step.

## Later the same day: the courtyard, PLANTROOMS and Hall 0

The owner asked for the halls round a square with a central courtyard, chose the brand (PLANTROOMS, "The real backrooms of the Poolrooms", a museum marketing department chasing a meme), and added Hall 0, a dry tiled pool hall where the visit starts. The row became a pinwheel: each side one long hall running past its corner, so every turn is an archway in one hall's end wall opening into the next hall's side; the street side split between Museum 1 and Museum 5, so the route closes its loop back into Museum 1; Hall 0 on the street in front of Museum 1. The decisive simplification was not to turn any room: each room's coordinates are the museum's, moved to its middle, so a heading carries through every corner unchanged and every wall can be built in the museum's coordinates, identical whichever room builds it. The courtyard is drawn in every hall's scene but only through that hall's own windows, by a stencil the window openings write, because otherwise it would show through the walls of a neighbouring hall seen through an archway (the room on top always wins, whatever the depth). Walked the whole route from Hall 0 round the ring and back into Museum 1 in the browser.

## Next Steps

The owner's brand choice, then dev51 moved into Museum 2 (once mission 106's session is done with its files), then the exhibits of Museums 1, 3 and 4 in parallel, and the finale.
