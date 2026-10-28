# Development Diary Entry - 2026-10-28

## Context

- **Date**: 2026-10-28 15:40 UTC
- **Branch**: main
- **Commit**: (this commit)
- **Contributors**: Claude Code + User

## Problem Statement

The owner asked for a demo plant room for Reddit: a working three-dimensional schematic of an idealised pool's circulation, filtration and heating, with ideal sources for the pool, tank and hot water, real pipes and components, manual valves and a working mimic; then flow meters on every stream, signposts by every machine, a museum's framing (entrance panel, numbered stations, lecterns, activity card) and a RESET SIMULATION button.

## Our Approach

Model first: one schematic module holding every machine, link, valve, meter and instrument, the tags derived from it, the physics on the plant's own network solver and the exchanger's ε–NTU; then a hand-placed room in the water's order with the pipes routed by the voxel router; then the mimic, the words and the views, each binding to the model. Mission 106 (103 to 105 were taken by the time the work was ready).

## Implementation

`src/game/plant/ideal-pool-plant.ts` (schematic, tags, solver, heat, actions, reset), `src/toolkit/gallery/logic/ideal-pool-plant-{layout,mimic,placards}.ts`, the room `src/toolkit/gallery/rooms/plant/ideal-pool-plant.ts`, new views (throttle valve, small flowmeters, ideal vessel, the museum's pieces), and dev51 registered with the inspection overlay switched on in `plant-room.ts`.

## Outcomes

- The network solver does not converge on a branch a shut valve leaves fed from one side (a known problem); `solveWithDeadEnds` prunes such branches before solving and carries the still water's head into them, which also gives honest readings: a dead-headed pump shows its shut-off head, a stopped pump's non-return valve holds back the pool.
- The voxel router laid every line first time once the heat source and return were moved behind the exchanger; facing ports joined by a straight run are now given to it as fixed runs, which removed two odd humps.
- An instrument drawn along x faces x × y; turning horizontal instruments to face the visitors needed that cross product, not its negative (the first try put the dial thermometers' backs to the room).
- Wall panels must stand at the wall's inner face (half its thickness in), not at the room's bound.

## Next Steps

The owner's review of the framings, and the four open questions in the prompt.

## Second round, the same afternoon

The owner answered the four questions (trip yes, interlock yes, keep the layout, add ×3600) and then asked for a pool clock, backwash and a heat meter. The dead-head trip became its own pure model (`pump-deadhead.ts`); the interlock a motorised valve in the schematic; backwash used the ideal filter's own bed model, solved twice as its rig does (settled, then lifted if the upflow is enough). Two lessons: Vite's hot reload resets the room's module state, so a browser check must not straddle an edit (one trip test was silently voided that way); and the network solver will happily return small circulating flows in a loop joined to only one reservoir, so `solveWithDeadEnds` now keeps only the parts of the network joining two reservoirs or more. Canvas text scales with a panel's height, so a card that overflows needs width, not height.
