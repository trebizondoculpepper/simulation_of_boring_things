# 037: Sound between rooms

Status: planned 2026-10-23; not to be implemented yet (the owner).

## The principle

You do not have to be in a room to hear the room's noises (the owner, 2026-10-23). A room's sound reaches the next room through the doorway between them, by how far the door stands open, not by which room the player is in. Moving from one room into another changes nothing by itself: the room behind is heard as long as its door is open.

## The rule, by how far the door stands open

- **Opening.** In room A, opening the door to room B: by the time the door is about 20 % open, B is heard at more or less its full volume, from the doorway.
- **Walking through.** Walking from A into B, A is still heard through the open door behind, as B was from A.
- **Closing.** As the door closes behind, A's sound holds at full until the door comes back to about 20 % open (20 % open, not 20 % closed), and attenuates from there: at about 5 % open it is down about 20 dB; shut, it is inaudible.
- **Shut.** Once the door is shut and the room beyond inaudible, that room's sound effects are stopped altogether, so nothing is spent on what cannot be heard.

The same curve both ways and for every door: attenuation as a function of the door's opening alone (full above about 20 % open, about −20 dB at 5 %, silent at 0), applied to everything the room beyond is sounding.

## What it changes

Today a room's held sounds (`partAudio.hold`) start with the room and stop when it goes (the pumps, the falling water's pour, the alarms), and the room the player has left falls silent at the hand-over through its doorway (`door-joins.ts`, `main.ts`). Under this principle a neighbouring room's sounds play while its door is open, heard from its doorway, through a gain set by the door's opening; and a room's sounds are stopped when the last door to it shuts, not when the player leaves it.

## Order of work

Not now. When it is taken up: try it on a pair of dev rooms joined by a door first, with something loud in one of them (the tank hall's returns pouring, or a pump set), then fit it to every joined doorway.
