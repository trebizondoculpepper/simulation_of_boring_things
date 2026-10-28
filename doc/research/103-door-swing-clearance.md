# 103 research: clearing the walker before a door swings

Checked 2026-10-28 against `c37c7c75`. This is research and a proposed interaction, not an implemented change. [Mission 103](../prompts/103-door-swing-clearance.md) turns it into acceptance criteria.

## The question

The owner wants a walker who tries to open a door while standing in its swing path moved to a safe position before the leaf moves, so the leaf cannot trap them against the doorway or nearby geometry. The intended result is a predictable step clear of the door, not the existing collision solver pushing the walker after an overlap.

## What other games do

| Game or engine                                                                                                   | Documented behaviour                                                                                                                                                      | What it suggests here                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [The Dark Mod](https://wiki.thedarkmod.com/index.php?title=Doors#Doors_Collision/Push_Behaviour)                 | Its doors stop when blocked; by default they do not push the player. A mapper may opt in to pushing the player or make a blocked door resume when the obstruction leaves. | Stopping is a proven fallback when there is no safe place to put the walker. Pushing the player is a separate, optional choice in that game.                                 |
| [Half-Life](https://github.com/ValveSoftware/halflife/blob/master/dlls/doors.cpp)                                | The published `CBaseDoor::Blocked` code reverses a blocked door when its wait permits it; grouped leaves reverse together.                                                | Collision recovery can prevent a jam, but reversal happens only once the door meets a blocker.                                                                               |
| [Source SDK 2013](https://github.com/ValveSoftware/source-sdk-2013/blob/master/src/game/server/doors.cpp)        | `CBaseDoor::DoorGoUp` chooses a rotating door's direction from the activator's position when the door is not marked one-way, explicitly to move away from the player.     | A different swing direction can reduce obstruction where the physical door allows it; Pool Plant's installed doors have specified swings, so this cannot be a universal fix. |
| [Godot 3.1](https://docs.godotengine.org/en/3.1/classes/class_kinematicbody.html) (engine reference, not a game) | A moving body can push another body; its movement can also be tested without moving it.                                                                                   | A candidate displacement should be tested against collision before applying it. This describes a technique, not evidence that a shipped game uses the proposed interaction.  |

These primary sources document stopping, reversing, choosing a swing, or physical pushing. None establishes that a shipped game prepositions the player in a safe spot before animating a door. That absence is a limit of this search, not a claim that no game does it. The proposed step-clear interaction is therefore a Pool Plant design decision informed by those alternatives.

## Repository finding

The walker is a 0.175 m radius circle in `src/toolkit/controls/input/first-person.ts`, moved by `slide` against axis-aligned floor footprints in `src/toolkit/controls/logic/walk-collision.ts`. Its `slide` deliberately allows movement out of a footprint already overlapped. The door controller in `architectural/logic/plant-door.ts` animates an angle to 90 degrees; the plant and equipment door parts rotate their visible leaves, but their room collision uses `doorwayStops` (`src/toolkit/gallery/logic/doorway.ts`), which represents only a thin near-shut leaf across the opening. It does not represent the rotated leaf's swept volume. Thus a door can visually swing into the walker without the walking solver finding a corresponding moving obstacle. The broad proximity rule from mission 090 prevents automatic closing near the walker and reopens a partly closing leaf, but it does not clear the walker before an intentional opening or that recovery swing.

The geometry is available from the single plant door and paired equipment doors: each leaf has a hinge, width, thickness, direction and current angle. Some instances are turned into the room's coordinate frame and some have raised sills or a different floor. A shared calculation should use metres and the actual leaf transform, not a generic 1.5 m proximity circle; proximity is intentionally broader than the dangerous sweep.

## Recommended interaction

On an opening request, compute the remaining swept area of the relevant leaf from its current angle to full open, expanded by the walker radius and a small visible clearance. If the walker is outside, open immediately. If inside, keep the leaf still, choose the nearest reachable position on the same side of the doorway, and guide the walker there along a collision-checked path before beginning the normal door animation. Prefer a short sideways/backward step over crossing the threshold; preserve camera heading and height and let the player's own movement cancel the guided step. Test the entire path against walls, equipment, other doors, floor boundaries and the destination leaf; checking only the destination would permit a move through a solid. If there is no reachable safe position, leave the door shut/paused and tell the player to step clear. Do not teleport the walker through walls or force the door through them. Recheck when a partly closing door reopens under mission 090's proximity rule.

This is a proposed policy to validate in the browser. The exact clearance margin, duration and size of a guided step should be tuned in play and kept as shared constants. No saved-world change appears necessary: a pending clearance step belongs to the active room's transient walker/door interaction, not the plant state.

## Risks to test

- A wall or machine may occupy the obvious step-aside point; the search needs a reachable alternative and a no-route result.
- A pair may have only one leaf opening. Calculate from the moving leaf or leaves, not the pair's whole rectangular opening; keep the shut sibling shut.
- Room handover, a raised plant-door sill, stairs and the tank-hall pit must not move the walker to another room or floor.
- A slow frame can advance the door through the walker unless clearance is resolved before the first angle update.
- Repeated Use, a second door nearby, manual movement during the guided step and the existing reopen-while-near rule must not cause oscillation or a forced reposition on every frame.
- The title, dev rooms and specialised powered shutters are outside this pedestrian swing rule unless an inventory finds a matching trap.
