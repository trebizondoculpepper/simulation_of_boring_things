# Development Diary Entry - 2026-10-21

## Context

- **Date**: 2026-10-21 18:05 UTC
- **Branch**: main
- **Commit**: after 3c97863
- **Contributors**: Claude Code + User

## Problem Statement

The owner wanted to stop elaborating the original poolrooms and build the game's version-one pools as new rooms: a lounge pool, an Olympic pool, a jacuzzi and a footbath, each of the right size and function, in the pool rooms' whimsical brutalist style. They were to be joined into an endless loop by short corridors built from one standard corridor kit. Along the way they asked for a plant sizing program, a piping helper, the spa set and its parts, a shower, a jacuzzi controller, waterproof buttons and the jacuzzi's sounds, each modelled in a development room before use.

## Our Approach

The pools are specified as data (`src/toolkit/gallery/logic/pool-halls.ts`), with pure floor, collision and volume functions, and one view builds all four halls from that data. The plant configuration (`src/game/plant-sizing/pools.config.ts`) is tested against the rooms, so the plant is sized from the pools as built. Corridors became a kit: a corridor is a list of pieces (straights, left and right turns, stairs up or down), laid out by pure logic that also gives its walls and stepped floor, and drawn by one run builder. The loop joins the halls in sequence with two random pieces per leg, never two straights. The owner chose this deliberately: the loop makes no three-dimensional sense, and each corridor hands the walker into the next room's scene, where the same corridor carries on.

## Implementation

- **Pool halls**: POOL-01 lounge (free-form, shallow and warm, with islands, shelves, a deep well, columns standing in the water and a tiled arch across its waist); POOL-02 Olympic (50 m, ten lanes, ropes and blocks, a roof sloping at 20 degrees, and an underwater viewing gallery with round windows); POOL-03 jacuzzi; POOL-04 footbath, a walk-through channel from wall to wall. Every hall has skylights or high windows and a hard, unseen 33-degree sun.
- **Development rooms**: dev12 gained the push-button shower, a cut-away footbath, a jacuzzi on a stepped plinth and its wall control plate. dev0 gained a WET CONTROLS board for the piezo switch (`wet-parts.ts`). dev7 was widened for the spa blower and the jet pump. `corridor_lab` shows the corridor kit, and Pipes'n Dreams shows every pipe kind.
- **Rules recorded**: the corridor template and the pool loop's exception to "no portals" are in `AGENTS.md`; the attraction plant rooms' north-south plan is in `doc/plant-model.md`.
- **Removed**: the red corridor (`red_bendy_1`), with PR_A's north wall closed and its cove made whole.

## Outcomes

- **Testing**: a logic test walks every leg of the loop, from inside a room, through its corridor and the hand-over, and into the next room. It checks that no wall is in the way and no step is taller than a riser. It caught a real fault: corridors that start with a turn never reached the original hand-over threshold.
- **Rendering**: headless renders of the Olympic hall take several minutes in the software renderer. The URL's `yaw` is in degrees, and this cost several wasted renders.
- **Lesson**: keeping the rooms as pure data and logic, with thin views, made the late changes cheap: the sloping roof, the gallery and the doorways were each a few lines of specification plus one view change.

## Next Steps

- Bubbly-water foam for the running jacuzzi, as recommended in `doc/research/bubbly-water.md`.
- The jacuzzi and the shower in the halls, bound to their controllers and to the world state.
- Depth markings, step-edge contrast and slip-resistant deck tiles in the pools.
