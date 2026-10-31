# Toolkit: controls

How inputs work. This is the one control scheme every room in every game built on the toolkit uses, and the basic simulation mechanics that go with being a person in a room: walking, looking, bumping into things, picking things up and putting them down. `CLAUDE.md` is a symlink to this file; the toolkit as a whole is described in `../README.md` and the game's own guide is the repository's `AGENTS.md`.

## What goes here

- **The input scheme**: what each input does, for keyboard and mouse, trackpad, touch (dual stick) and gamepad, and the help line that follows the last input used. A new thing a player must be able to do is added here, for every input and every room at once, or not at all. No room or component binds a key, button, gesture or stick of its own.
- **Moving the player**: walking, running, looking, zoom, crouch and eye height, and holding the player still while a scene plays.
- **The torch**: the player's own light, held in the right hand as Half-Life's flashlight is, switched on and off by its one control in every room and kept on from room to room, its beam easing after the eye a moment late.
- **Collision**: walkable footprints, sliding along walls, solid things that cannot be walked through.
- **What a use means**: the click, E, tap or A that uses whatever is aimed at, and knob-turning (a use on a knob's left or right half, or a gamepad's LB and RB, turns it down or up). Components ask which way to turn (`knobDirection`); they never read an input themselves. Every use is also a held input (prompt 091, 2026-10-28): held until the mouse button, E, the pad's A, the touch Use button or a finger held still (`TOUCH_HOLD_DELAY`, after which it uses at once) is let go; a component that repeats while held asks for the use's hold as it is used (`currentUseHold`) and watches it.
- **Carrying**: picking up, holding, dropping and letting go, the fall and settling of a dropped object (its drop profile: shape, bounce, friction, roll), and the state of a carried object (installed, held, falling, settled). A component only says that it is portable and how it falls.
- **Perception helpers**: where to put something so it appears without being seen to appear (`hidden-spot`).

## What does not

- Anything a player works or looks at (a button, a meter, a skip): that is a component, in `../components/`.
- What a use does to a particular thing: the component defines that; this layer only delivers the use to it.
- Sounds, and anything about a particular room: rooms are the gallery's or the game's.

## Rules

- This layer imports nothing else of ours (`../layering.test.ts`). The components and the gallery may import it.
- `logic/` is pure logic, no DOM or Three.js, tested beside it. `input/` turns the browser's inputs into those actions and moves the camera.

## Files

- `logic/controls.ts`: the scheme itself, every binding for every input, and the help text.
- `logic/walk-collision.ts`: footprints and sliding collision.
- `logic/drop-profile.ts`, `logic/portable-board.ts`: how carried objects fall, and a carried object's state and events.
- `logic/hidden-spot.ts`: places out of the player's view.
- `input/first-person.ts`: the scheme implemented once, for every room.
- `input/object-handling.ts`: picking up, carrying and dropping, with the fall simulated.
- `input/knob-turning.ts`: which way a use turns a knob, and `markTurnable` for a knob's cue.
- `logic/use-cue.ts`, `input/use-marking.ts`, `input/use-cue-markup.ts`: the crosshair's use cue (prompt 115, `doc/plans/115/push-pull-cue.md`): a component marks what a use on it does (`markUsable`, or a part's `a.cue`: turn, push, pull, or some other way) and whether it will have any consequence now; the controls find the mark by one raycast of the scene a few times a second and draw a turn arrow, a perspective push or pull arrow, or the plain ring, green or red. Anything the room says is aimed at but unmarked gets the plain green ring.
- `logic/use-hold.ts`, `input/use-holding.ts`: a use's hold, from its press until its source is let go, for a component that repeats while held.
- `logic/torch.ts`, `input/torch.ts`: the torch, its beam's lag, and its light in a room's scene.
- `input/touch-sticks.ts`: the on-screen thumbsticks and CROUCH button for touch.
- `logic/menu-navigation.ts`, `input/menu-input.ts`: menus on every input: what keys and pad buttons mean to a menu, spatial focus movement, and the one reader that hands them to whichever menu takes them (mission 096). No menu reads a key or polls a pad of its own.
- `logic/menu-open.ts`: whether a menu panel has the controls, which holds the walker still without pausing the world.
