# 103: Step clear of a swinging door

Status: planned 2026-10-28. Research: [door swing clearance](../research/103-door-swing-clearance.md). No runtime code has been changed for this mission.

Read the root `AGENTS.md`, `README.md` and the owner's project brief before implementation. Keep `src/game/` and every `logic/` folder pure, and run the five project checks before committing. Markdown is one paragraph per line.

## The request

The owner, 2026-10-28: “If you try to open a door and you are in the path of the door swing, the game will move the walker to a safe position that won't get you moved by the swing of the door. … The goal is to avoid getting trapped by the opening door geometry.”

Opening a pedestrian door while standing where its leaf will sweep should feel like stepping clear before the door opens. The walker must finish outside the moving leaf's path, remain on reachable floor on the same side of the doorway, and retain control and view direction. If the space is boxed in, the door waits and the player can step away manually. The same guarantee applies when a partly closing door automatically reopens beside the walker under mission 090.

## Findings that shape the plan

The current collision set contains a thin shut-door footprint, not the visible leaf at every angle (`gallery/logic/doorway.ts`), while `plant-door.ts` and `equipment-doors.ts` animate the hinge. The walker radius is 0.175 m (`controls/input/first-person.ts`). The mission 090 proximity test asks whether the walker is near the opening; it does not test whether the leaf will hit them. Research found other games stopping or reversing blocked doors, or changing a door's swing; no sourced precedent for prepositioning the player was found. See the research note for the primary sources and limits.

## Work plan

1. **Inventory and reproduce.** List every pedestrian leaf and its room binding: pool-to-plant single doors, corridor/plant equipment pairs, the tank-hall doors and gate, and development spring doors. Record which use the shared plant-door controller and which swing in either direction. In the browser, reproduce a trap from the pull side at a single door and a paired door; record room and pin URLs, exact starting pose, and whether the walker is truly stuck or only visually intersected. Keep the current mission 090 browser follow-ups visible.
2. **Model the sweep in pure logic.** For each leaf, derive its hinge and closed orientation in the room's metre frame, its width, thickness, opening sign and current/target angles. Test the walker's circle against the remaining angular sweep, with a small clearance margin and compatible floor height. The result must distinguish a genuine sweep overlap from simply being near the doorway. Cover 90-degree single leaves and each leaf of a pair, both wall orientations and both swing signs, partial angles and a threshold-position walker.
3. **Find a reachable safe step.** Generate short candidates on the walker's current side of the wall around the leaf's swept boundary, ranked by path length and by how little they obstruct normal entry. Validate the entire route with the walk collision geometry plus the fixed door leaf and other moving leaves, keeping the walker radius and a small margin. Reject a candidate across a wall, through the closed doorway, off a floor or into equipment. Return an explicit no-route result. Keep this solver deterministic and bounded so a crowded room cannot stall a frame.
4. **Bind the interaction once.** Route Use through the one control scheme, with the door part/room requesting clearance before `workDoor` changes state. Hold the door at its current angle while the active walker makes a brief guided step; begin the existing animation only after the walker is clear. Preserve yaw, pitch, camera height, sounds, card-reader behaviour and ordinary movement. Cancel the guided step on manual movement, room transition or a different door request; never start an unsafe queued opening. Apply the same guard before mission 090 reopens a closing leaf. Keep the mechanism in the active room; a follower room must not reposition its stale walker.
5. **Fail safely and verify.** With no safe route, leave the door still and give a brief “Step clear of door” hint; trying again after moving should work. Test position and whole path, not merely the final angle. Verify in a browser from both sides of a single door and at both leaves of an equipment pair, beside a wall/equipment obstacle, at raised sills and the tank-hall level change, with a large frame delta, while moving into the sweep, and across room handover. Confirm a walker already clear is never moved. Document intentional exceptions for spring doors, ladder gates and powered shutters after the inventory rather than silently giving them the wrong rule.

## Acceptance criteria

- A door requested from outside its remaining swing opens as before; the walker does not move.
- A door requested from inside that swing remains still until the walker has reached a collision-checked safe position, then opens normally. The move is short, visually continuous, stays on the same reachable floor and side of the doorway, and does not change view direction.
- At every frame of the opening, the walker circle stays clear of the leaf; the step cannot cross a wall, the closed doorway, another leaf, equipment or a floor edge.
- When no safe position is reachable, neither the door nor the walker is forced through geometry. The player is prompted to step clear and can retry.
- One moving leaf of a pair clears only its own sweep; the other leaf's state and the existing sibling timing remain correct.
- The proximity hold/reopen behaviour of mission 090, door sounds, reader indications, visibility through the doorway and handover in both directions still work.

## Likely code seams

Pure geometry and candidate selection belong beside `src/toolkit/components/architectural/logic/door-proximity.ts`, with tests beside them. `src/toolkit/controls/logic/walk-collision.ts` supplies collision primitives; any reusable path check belongs there with its own tests. The active walker and its placement/movement are in `src/toolkit/controls/input/first-person.ts`; a narrow clearance request API there is preferable to letting each door room set camera coordinates directly. Door requests originate in `architectural/parts/plant-door.ts` and `equipment-doors.ts`; their room bindings in `gallery/rooms/pool-hall-room.ts`, `plant-room-shell-room.ts`, `main-corridor-room.ts` and `shell-room.ts` supply the local leaf geometry and obstacle set. Audit `gallery/rooms/plant/balance-tank-hall.ts` and development spring portals before deciding their integration. No world save migration is expected.

## Decision to settle in play

Start with a brief guided sidestep before opening, while preserving manual control and cancelling on player movement. Tune its length, speed and clearance in the browser. If this feels too intrusive, retain the same safe-position solver and use a held door with a “Step clear” hint instead; the geometry and tests remain useful. The owner has specified the outcome, not a particular animation time.
