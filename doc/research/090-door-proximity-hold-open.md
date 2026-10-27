# 090 research: keep opened doors open near the player

Checked 2026-10-27 against `55229c1`. This is repository research; no runtime code changed. [Mission 090](../prompts/done/090-door-proximity-hold-open.md) was implemented in `39ea689` (mostly complete; remaining browser checks are listed in its completion record).

## Finding

This is feasible without a new door model or a saved-world migration. The existing controllers already have opening, dwell and closing behaviour. The missing piece is a shared proximity input, applied before stepping the controller, plus explicit recovery from automatic closing. Increasing the existing hold timeout alone will not meet the request: a stationary player would still eventually have the door close beside them.

## Confirmed causes

1. **The hold area is the threshold, not the vicinity.** `shell-room.ts`, `main-corridor-room.ts`, `plant-room-shell-room.ts` and `pool-hall-room.ts` use doorway leaf footprints expanded by `WALKER_RADIUS_METRES`. That is appropriate for collision safety, but a player standing just outside this narrow strip no longer holds the door. These checks already run continuously and do not depend on aim; there is no need to add mouse-over logic or bind more controls.
2. **Catching a closing plant door freezes its partial angle.** `holdDoorOpen` in `architectural/logic/plant-door.ts` changes the phase to `held` and resets the 2.5 s timer, retaining the current angle. It does not reopen it. The existing test deliberately accepts this. Its `angle <= 0.05` guard also ignores almost-shut doors.
3. **Presence is applied too late.** The room loops above advance door parts before calling `holdOpen()`. A door can take a closing step, update its visible hinge, or even latch and play its closing sound before presence is considered. Reordering is necessary, but insufficient without widening the area and fixing recovery.
4. **Handover starts a plant door closing.** `main.ts:handOver` copies the outgoing angle through `Joint.swingTo(-angle)` after placing the destination walker. Both plant-door and equipment-door `swingTo` implementations install a non-zero angle as `phase: 'closing'`, timer 0. Without a pre-step presence check, the receiving leaf immediately begins closing beside the arriving player.
5. **Follower cameras are not local walkers.** `main.ts:startSeeing` makes the underneath room follow a pose transformed through the doorway. `first-person.ts:update` updates the camera in this mode and returns without moving `walk.walker`. Applying proximity to that stale walker can hold unrelated hidden doors. The active room should own presence; the underneath room must not infer an occupant from its parked walker.
6. **The spring-door route has separate behaviour.** `architectural/logic/spring-door.ts` already accepts `step(dt, held)` and resets its 1.2 s dwell while held, but catches a closing door at its current angle. `gallery/views/portals.ts:update` computes the narrow hold after `parts.update`. Its arrival routine also snaps all doors shut. This needs its own integration, not just a change to the plant-door helper.

## Small reproductions

Ran the existing pure functions directly with Node, without modifying them. An unlatched plant door closing at 0.7 radians remains at 0.7 after `holdDoorOpen`, including five seconds of repeated holding; fully open is 1.5707963268 radians. A closing state 0.01 s before its latch, advanced 0.05 s before applying the hold, reports `latchedNow: true` and remains shut after the hold. These reproduce the state and update-order gaps; they do not establish how frequently a player encounters the final-frame race in the browser.

## Affected routes

| Family                                                                    | Controller and binding                                                                                                    | Required integration                                                                                                                                                                                             |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single plant doors, pool-to-plant and office doors                        | `architectural/logic/plant-door.ts`, `architectural/parts/plant-door.ts`; `pool-hall-room.ts`, `plant-room-shell-room.ts` | Pre-step presence; reopen during closing; preserve existing Use opening.                                                                                                                                         |
| Paired equipment and corridor doors                                       | `architectural/parts/equipment-doors.ts`; `shell-room.ts`, `main-corridor-room.ts`, `plant-room-shell-room.ts`            | One presence decision per doorway supplied to both leaves; only already opened leaves recover. Keep the existing sibling timing coordination.                                                                    |
| Tank-hall equipment doors                                                 | `rooms/plant/balance-tank-hall.ts`, `rooms/tank-hall-room.ts`                                                             | Remove hold side effects from `solids(walker)` and supply proximity before `hall.parts.update`. Leave narrow collision footprints intact.                                                                        |
| Tank-hall ladder gate                                                     | `architectural/parts/ladder-gate.ts`, balance-tank hall bindings                                                          | Migrate the shared controller input while preserving the explicit hold during descent and the gate-sweep collision protection. Do not let a player on a different level hold a deck gate just because x/z match. |
| Development-room spring doors                                             | `architectural/logic/spring-door.ts`, `architectural/parts/building-parts.ts`, `gallery/views/portals.ts`                 | Pre-step presence; resume opening in the current swing direction when returning during closing; inspect arrival `snapShut` so it cannot defeat a genuine through-door handover.                                  |
| Closer demonstrations, fire-held doors, roller shutters and sliding doors | Other controllers/controls                                                                                                | Audit and record exceptions; do not replace their distinct operating rules with plant-door timing.                                                                                                               |

The generic `plant-room.ts` exhibition room receives its spring doors through `portals.update`; it is not another missing `holdOpen` call site. The ordinary equipment-door part is also used in the architectural development room, so component tests must continue to cover it there.

## Recommended change

### 1. Separate proximity from collision

Add a pure helper under `components/architectural/logic/` for doorway presence, using plain geometry and actor data. Components must not import `gallery/logic/doorway.ts`. Pass doorway centre, yaw, opening width and floor/vertical eligibility, plus player position/radius, all in metres. Transform into the doorway’s local frame and measure distance to its opening segment, so both approaches and wide paired openings behave alike. Check the actual leaf-sweep envelope when choosing the area. Do not measure from the moving leaf or camera aim.

Proposed initial tuning: enter within 1.5 m clearance from the player’s body to the opening and remain present until beyond 1.75 m. These are recommendations to validate, not owner-approved measurements. Define clearly whether the radius is included; do not add it twice. Keep hysteresis state per physical doorway, not per room or leaf. Keep the existing narrow `inWay` predicates for collision and threshold crossing: enlarging those would wrongly bypass closed-door collision or trigger premature room travel. Require compatible floor/height, especially at the tank pit and stairs.

### 2. Make presence an input to the controller step

A suitable interface is an optional presence input to `stepPlantDoor`, defaulting to absent, with a part setter such as `setNearby(boolean)` used before each update. Apply the input before closing/latch detection. A shut/latched door stays shut; an opening door finishes; a held door stays fully open with a fresh normal dwell (an older partially held state should finish opening); a closing, still-unlatched door returns to opening from its current angle, including below the old 0.05-radian guard. On departure it retains the full ordinary dwell before closing. Proximity does not play the manual-use/card-reader beep on every frame.

Keep the existing `holdDoorOpen` timing utility distinct unless its other callers are deliberately migrated: equipment-door sibling coordination currently uses it to catch the older leaf at a partial angle, and its tests assert that behaviour. Blindly making that helper reopen every caught door changes more than player proximity. The explicit presence input can provide the requested recovery without changing sibling coordination. Apply presence separately to each leaf so holding a pair never opens its previously shut leaf.

Mirror proximity recovery in the spring controller, preserving its swing sign, opening speed and existing dwell. `held = true` must not open a shut spring door. Keep special forced closure, locks and specialised machinery controls explicit; the ordinary plant-door Use action currently opens rather than toggles shut.

### 3. Apply presence before animation in every room

Order active-room work as: update player pose; resolve presence for each door; supply presence to parts; advance door parts; evaluate reader/visibility/handover state; render. For portals, resolve all holds before `parts.update`, then evaluate travel. Separate balance-tank collision queries from door-control side effects. Ensure absence is supplied on departure too, so a stored true flag does not hold a door forever.

### 4. Preserve handover continuity

Use the active walker for presence. Underneath/follower rooms supply no independent proximity from their stale walker. On handover, place the receiving walker and establish its presence before the next door step. Preserve the transferred angle and give the receiving open door a held/opening state or full dwell rather than an unconditional immediate closing sweep. A small explicit arrival operation, or a backward-compatible extension of the joint transfer, is sufficient; a permanent global map of every door and a WORLD_VERSION change are not required by this fix.

Keep the existing doorway-selection policy for the two wet-hall entrances. Verify an arrival only affects its selected doorway, and opening one nearby door does not hold another because of a shared boolean. Check the spring portal arrival snap separately: the ordinary reset of unrelated doors can remain, but the doorway just crossed must obey the new proximity requirement.

## Checks and acceptance still needed

Ran the existing plant-door, spring-door, equipment-door, doorway and door-join test files; all 18 tests across the five files pass. Passing them does not prove the requested behaviour: the plant-door test explicitly permits a partly open held angle, and there are no proximity/handover tests covering the new request. No browser reproduction or implementation acceptance has been performed.

Add focused tests for the new geometry/hysteresis, both approaches and rotations, non-unit scene scaling, wide doors, differing floors, stationary/looking-away presence, the final closing frame, departure dwell, return during closing, a pair with one shut leaf, follower-room stale positions and handover. Check spring swing direction and arrival reset, existing equipment sibling timing, and ladder descent protection.

Browser acceptance should use `pool_02` ↔ `plant_pool_02`, `main_corridor` ↔ `wet_hall` (both doorways), `plant_pool_02` ↔ `tank_hall`, the tank-hall ladder gate, and a development-room spring doorway. Record exact pin URLs during implementation rather than inventing coordinates now. Stand outside the narrow threshold beyond the normal delay, look away, leave, return during closing, then traverse in both directions. Check collision, sounds, readers and the visible room beyond throughout.

Implementation is ready to start with the tuning values above treated as provisional. Keep mission 090 active until its main implementation is delivered; archive it as mostly complete only after delivery, retaining any unfinished browser checks in the prompt and root TODO.
