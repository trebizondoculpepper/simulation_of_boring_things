# 090: Keep an opened door open while the player is nearby

Status: researched 2026-10-27 against `55229c1`; ready for implementation with proximity distances provisional. Implementation and browser acceptance remain outstanding. See the [research and change plan](../research/090-door-proximity-hold-open.md).

Read the root AGENTS.md and this directory’s AGENTS.md before implementation. Markdown is one paragraph per line.

## The request

The owner, 2026-10-27: “An opened door should not close if you are standing near to it.”

An opened door must remain open while the player stands nearby, even when stationary, looking away or inspecting equipment. The player should not have to stand exactly in the doorway or repeatedly use the door to stop its closer. Once the player moves clear, the usual hold delay and self-closing behaviour resume.

## Research findings and implementation plan

The [source audit](../research/090-door-proximity-hold-open.md) confirms a narrow threshold-only hold area, holds applied after animation, and a helper that freezes a closing door at its partial angle. Room handover sets plant/equipment doors directly to closing. Development spring doors have separate timing and arrival resets; the underneath room’s camera follows the player but its local walker is stale.

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

Delivered: this prompt, the linked root TODO entry and the dated source audit/change plan. Existing targeted tests and direct state reproductions were run. No door behaviour has changed yet.

Outstanding: implementation, new focused tests, proximity tuning and browser acceptance above. Record the eventual implementation commit, checked door families, chosen proximity/delay and any remaining exceptions here. Keep remaining delivery work unchecked in root TODO.md; when mostly complete, file this prompt under done/ with its actual completion status.
