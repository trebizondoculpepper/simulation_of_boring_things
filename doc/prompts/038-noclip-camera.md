# 038: Noclip, a free camera

Status: implemented 2026-10-24 in `bfc8521`; the first tool for authoring the title sequence, before attract mode (054).

## Why

The owner, 2026-10-23: to set up and work out the camera angles for the title's attract sequence, a mode that moves the view freely in all three directions, as Minecraft's noclip (its spectator flight) does.

## What it is

- **A toggle on the escape screen:** NOCLIP, on or off, from the menu the Esc key opens. Off by default, and off again on a reload.
- **Free movement, in all three directions:** forward, back and sideways as walking is, but along where the view looks, with no gravity and no floor; and straight up and down. The keys are Minecraft's for flying: **Space** to rise, **Shift** to sink; walking's Shift-to-run moves to **Ctrl** while noclip is on (Minecraft's sprint), for faster flight. The on-screen arrows (for touch) gain an up and a down.
- **Every input:** gamepad left/right sticks move/look as usual, A rises and B descends, and the left-stick click accelerates. Touch retains its movement/look sticks and gains held UP/DOWN buttons. Zoom remains available. The controls help describes these bindings while flying.
- **Through everything inside the room, but not out of it:** machines, pipes, railings, gantries and doors do not stop it; the room's own walls, floor and ceiling do, so the camera stays within the room's bounds (a tank hall's bounds reach down into its tank, so the camera can look at the water from just above it, or from below the gantry).
- **No hand-over through doorways** while it is on: the camera stays in its room.
- **Using it:** the room's machines can still be looked at, but not worked or picked up while flying (no accidental presses while framing a shot).

## For the attract sequence

What the owner needs from it is the shot, so noclip should make the shot easy to keep: a small readout of the camera's place and heading while it is on (x, y, z in metres, yaw and pitch in degrees), and a key or a button on the escape screen to copy the room's address with them (`?room=…&x=…&y=…&z=…&yaw=…&pitch=…`, which the game already opens at), so a framed shot can be written down, shared and returned to.

## Rules it must keep

All input goes through the one control scheme in `src/toolkit/controls/`; rooms do not bind their own keys. The bounds and the movement are pure logic in a `logic/` folder, tested beside it.

## Order of work

Try it in one dev room and one real room (the Olympic plant room, for its height and its gantry), then make it the escape screen's for every room. Turning it off restores the pre-flight walking position, avoiding a landing inside equipment. It is temporary camera state, never saved as a world setting; do not replace the player's Continue position with an airborne scouting position.

## Acceptance

Verify free ascent/descent, movement along the view's pitch, passing through equipment, staying inside the room envelope, disabled apparatus/pickup interactions, no automatic doorway handover, pause/resume, normal walking restored on exit, and default-off after a reload. Show live x/y/z and yaw/pitch while flying, and verify that Copy Camera Link opens at the same view. Keep movement/bounds logic pure and test it, and exercise the shared controller in a browser in a development room and the Olympic plant room.
