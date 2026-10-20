# Two realms: the pool rooms and the plant rooms

Recorded 2026-10-20, from the owner's description. This note records an idea only; the owner will explain how it is to be used in the game in a later message. Nothing here is a decision about implementation.

## The idea

The game is built on a contrast between two realms: the magical world of the pool rooms and the ultra-mundane world of the plant rooms.

The pool rooms should be a bit fantastical. They follow the "poolrooms" liminal aesthetic (see [the poolrooms look](../research/poolrooms-look.md)): implausible architecture, and things that would never be practical in a real building. A pool room that is too realistic is a bit boring.

The plant rooms stay ordinary: plausible, working, maintained engineering spaces, as the brief already describes them.

Each realm must be consistent with itself. Walking around the pool rooms should make sense within the pool rooms, and walking around the plant rooms should make sense within the plant rooms.

Doorways lead between the two realms, but the plant rooms do not necessarily exist in the same dimension as the pool rooms. The 3D space of one realm need not map onto the 3D space of the other. The connection between them, the seam made by the doorways, can be non-Euclidean.

For example, two adjacent doors in the plant rooms could open onto two completely different, distant parts of the pool rooms' world.

A doorway between the realms looks completely mundane: an "Authorised Personnel Only" door, like any other service door in a leisure centre. Nothing about it announces that it crosses between realms (the owner, 2026-10-20).

## What it means for the existing design

The current pool design follows a real-world design by human architects: the hall's high windows and barrel rooflights, and the district layout, are adapted from the Sport England reference drawings (see [daylight from architect plans](../research/daylight-from-architect-plans.md) and [the pool district layout](../planning/pool-district-layout.md)). That realism is what the owner now finds too plain for the pool rooms.

The plant rooms are being laid out by the plant model and the placement principles in [the plant model](../plant-model.md). Under this idea that work still holds: the plant must stay physically consistent within its own realm, so pipes and ducts continue across walls through shared sleeves from one plant room to the next.

## Open questions for the owner

These are questions, not decisions.

- How is a pipe or duct shown where it crosses a realm doorway, for example the pool's circulation mains leaving a plant room for a pool that, in the other realm, is somewhere else entirely?
- Does a given doorway always lead to the same place in the other realm, or can its destination change (with time, with the plant's state, or with the player's progress)?
- Can the pool rooms be infinite or looping, or are they a large but finite place?
- How is the player's sense of direction meant to feel: gently disorienting, plainly impossible, or something the player can learn to map?
- How does the leisure centre's existing facility plan (`src/game/facility-plan.ts`) relate to the pool realm: does it become the plant realm's plan, the pool realm's plan, or neither?

## Conflict with a current project rule

This idea conflicts with a current rule in `AGENTS.md`, quoted exactly:

> The building is one contiguous world in metres (one scene unit is one metre); rooms are rectangles in `src/game/facility-plan.ts` joined by doorways in shared walls. No portals.

A non-Euclidean seam between the realms needs something that rule forbids. The owner will need to decide how the rule changes, for example whether it continues to apply within each realm while the doorways between realms are allowed to be portals. The brief already allows that "impossible connections may later use fixed spatial portals". `AGENTS.md` has not been changed.
