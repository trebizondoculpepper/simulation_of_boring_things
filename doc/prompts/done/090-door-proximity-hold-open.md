# 090: Keep an opened door open while the player is nearby

Status: mostly complete, checked 2026-10-27 against `ef0c221`. Implemented with focused logic tests; browser acceptance partly done (pool-to-plant door, hall side). Researched 2026-10-27 against `55229c1`; see the [research and change plan](../../research/090-door-proximity-hold-open.md).

Read the root AGENTS.md and this directory’s AGENTS.md before implementation. Markdown is one paragraph per line.

## The request

The owner, 2026-10-27: “An opened door should not close if you are standing near to it.”

An opened door must remain open while the player stands nearby, even when stationary, looking away or inspecting equipment. The player should not have to stand exactly in the doorway or repeatedly use the door to stop its closer. Once the player moves clear, the usual hold delay and self-closing behaviour resume.

## Research findings and implementation plan

The [source audit](../../research/090-door-proximity-hold-open.md) confirms a narrow threshold-only hold area, holds applied after animation, and a helper that freezes a closing door at its partial angle. Room handover sets plant/equipment doors directly to closing. Development spring doors have separate timing and arrival resets; the underneath room’s camera follows the player but its local walker is stale.

1. Add shared pure proximity geometry in the architectural components’ logic, independent of collision. Proposed entry/release clearances are 1.5/1.75 m from the player’s body to the doorway opening; validate them in play. Account for doorway width, rotation, player radius and compatible floor height.
2. Supply proximity to the plant-door step before it can close or latch. Reopen an unlatched closing leaf smoothly, including near the shut position; keep shut leaves shut. Preserve the distinct existing sibling-leaf timing helper and the ordinary dwell after departure.
3. Bind presence before door updates in the four principal room builders, the balance-tank hall and spring portals. Keep the narrow collision/transition tests unchanged. Remove hold side effects from collision queries and ensure stored presence clears on departure.
4. Give the arriving door presence/full dwell before its first destination update; do not start it closing immediately. Only the active walker supplies occupancy; follower rooms must not use their stale walker. Check selected-doorway identity for multiple connections and spring arrival `snapShut` separately.
5. Include the ladder gate’s shared controller while preserving its descent/sweep protections. Record exceptions for specialised doors and shutter controls.

A state-level reproduction confirms that a 0.7-radian closing door stays partly open after repeated holding, and that applying hold after the final closing step cannot prevent latching. Existing tests pass but do not cover the requested proximity and handover behaviour. No browser acceptance has been done. The report lists affected files and the required tests; no saved-world migration is expected.

## Required behaviour

- Use a shared, documented proximity rule in metres around the doorway, covering both approaches, the threshold and the leaf’s sweep. Proposed starting clearance: 1.5 m from the doorway opening, to be checked in the game; this distance is an implementation proposal, not an owner-specified value. Account for the player’s radius and differing doorway widths.
- Apply proximity continuously, independent of aiming, movement keys, pointer lock or repeated interaction. Looking away must not release the hold.
- While nearby, let an opening door finish opening and keep an already open door open. If the player returns while it is automatically closing, stop the closing and reopen smoothly using the existing opening behaviour; do not snap the leaf or push it through the player.
- Start a fresh normal closing delay only after the player leaves the hold zone. Use hysteresis or equivalent stability so standing on the boundary does not cause repeated opening/closing, sound chatter or tiny closing movements each frame.
- Keep the rule consistent on both sides of a room transition. Convert scene coordinates to metres correctly, and do not let an adjacent room’s independent animation or stale player position close the same visible doorway.
- Scope the change to automatic closing of pedestrian/access doors, including paired leaves. Inventory other self-closing access gates that use the same helper and record whether they need the same rule. Preserve explicit manual commands, existing opening permissions and specialised controls such as powered roller shutters; document any intentional exceptions.
- Put reusable proximity/state decisions in pure logic and bind them through the existing parts/control scheme. Avoid duplicating new distances and timing rules in each room.

## Validation

Add focused logic tests for remaining nearby beyond the normal delay, stationary and looking away, entering during closing, leaving and returning during the delay, leaving long enough for full closure, boundary stability and both sides of wide/paired doors. A shut door must retain its existing opening/permission rules.

In the browser, open a pool-to-plant door, stand near it outside its narrow threshold for longer than its usual timeout, and confirm it stays open. Repeat from the plant side and at a paired corridor/equipment doorway. Move away and confirm normal delayed closure; return during closing and confirm smooth recovery. Walk through in both directions and check that room handover, collision, neighbouring-room visibility and door sounds remain correct. Record representative room IDs and pin URLs with the result.

Run the project’s required typecheck, lint, formatting, tests and build checks before committing the implementation.

## Completion record

Checked 2026-10-27. Status: mostly complete. Implementation commit `ef0c221`.

Delivered:

- Shared pure proximity rule, `src/toolkit/components/architectural/logic/door-proximity.ts`: clearance from the walker's body edge (its 0.175 m radius taken off once) to the axis-aligned box of the doorway through its wall, so both approaches, the leaf's sweep and the doorway's width (single 1.03 m, pairs 1.8–1.92 m) are covered alike; entry within 1.5 m, release beyond 1.75 m, kept per physical doorway (`createDoorPresence`); a floor check (1 m rise) where a doorway gives its sill height (pool-hall plant and office doors, the tank-hall ladder gate); `doorActor` converts the scene's units to metres and returns no one while the room only follows another's eye. The distances are the research's provisional values, unchanged.
- Controllers: `stepPlantDoor(state, dt, nearby)` applies presence before stepping (`keepDoorOpen`): shut/latched stays shut, opening finishes, held at full open gets a fresh full hold, a closing or part-held leaf reopens from its angle at its opening speed (no snap, including below the old 0.05 rad guard), and no latch or shut sound can happen beside the player. `standDoorOpen` makes a handed-over door wait a full hold instead of starting to close. `holdDoorOpen` is kept for the sibling-leaf timing and the ladder descent hold. The spring door reopens in its current swing direction when held while closing, with a fresh dwell.
- Parts: `plantRoomDoor`, `equipmentDoors` (one presence per doorway, applied per leaf, so a shut leaf of a pair stays shut) and `ladderGate` gain `setNearby`; `holdOpen` is gone from the plant door and equipment doors.
- Rooms bind presence before their door parts update: `pool-hall-room.ts` (plant and office doors), `plant-room-shell-room.ts` (hall door, corridor and tank-hall pairs), `main-corridor-room.ts` and `shell-room.ts` (every pair, each doorway its own presence, including both wet-hall doorways), `tank-hall-room.ts` and the dev plant-room host via a new `LiveExhibit.sense` (`balance-tank-hall.ts`: doors and gate; the gate also keeps its sweep hold and the explicit descent hold; the collision query `solids` no longer holds anything), and `portals.ts` (spring portals, holds resolved before `parts.update`, with a `present` flag every caller passes as `!walk.following`). Narrow collision and threshold predicates are unchanged.
- Tests: `door-proximity.test.ts` (both sides, wide pairs, leaf sweep, other level, hysteresis edge stability, aim-independence, follower room, unit conversion), `plant-door.test.ts` (nearby beyond the hold, smooth reopen during closing, the final closing frame, leave-and-return within the hold, leaving long enough to latch once, shut door unaffected, handover hold), `spring-door.test.ts` (reopen both swing directions, shut stays shut) and `equipment-doors.test.ts` (one leaf open beside a shut one, both caught closing, handover hold). Full suite, typecheck, lint, format and build passed.
- Browser (dev server, `?room=pool_02&x=-31.9&z=17.0&yaw=322&pitch=0&slot=itest`, the Olympic's plant room door, hall side, about 1.1 m from its opening and outside the leaf strip): opened, it stayed fully open for over 20 s while standing still, including after turning away; stepping back about 3.5 m, it waited its hold and closed. The room drawn underneath (`pool_01`) reported no walker.

Intentional exceptions:

- Development corridor and courtyard (`dev-corridor-room.ts`, `plant-corridor-room.ts`): keep their narrow threshold holds, because their one-door-open trick snaps unseen doors shut; their spring doors still gain the reopen-while-held behaviour.
- The architectural room's specimen doors (plant door and equipment pair on the north wall, overhead-closer and rising-butt demonstrations): wall specimens rather than doorways, kept to show their closing cycles; the closer demonstrations keep their own narrow pre-step hold.
- Powered roller shutters and other specialised doors keep their own controls; no plant-door timing was imposed on them.

Remaining:

- Browser acceptance from the plant side, at a paired corridor/equipment doorway (`main_corridor` ↔ `wet_hall`, both doorways; `plant_pool_02` ↔ `tank_hall`), the tank-hall ladder gate and a development spring doorway; returning while a door closes (unit-tested, not seen in the browser); walking through both ways to check handover, collision, the room beyond and door sounds.
- Owner validation of the 1.5/1.75 m distances in play.

Follow-up (the owner, 2026-10-27): "when you get more than a certain distance away from a door, it should close more rapidly. So it's not so much on a timer, it's really based on your distance from the door. If you open a door and then walk away from it, it should close more or less immediately." Done: beyond the release distance a door's hold is cut to 0.3 s (`PLANT_DOOR.awayHold`) and its closer sweeps at about 1.6 rad/s (`awaySweep`), the same eased sweep run faster so it never jumps; presence is now three-valued (near, away, unknown), and a room drawn under another reports unknown, so its doors keep their ordinary hold. The development portals' spring doors are unchanged.
