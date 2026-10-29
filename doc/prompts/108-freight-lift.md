# 108: the freight lift

The owner, 2026-10-29: a freight lift from the plant room corridor to the building's other floors. Its real job is to let new locations join the game by adding a button to its panel, without fitting them into the building's geometry: the car travels nowhere real; each floor is a room and a landing in it.

## The floors

| Floor | Destination                               | Landing                                                                                                                                                                                                                                                           |
| ----- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B2    | The plant room corridor (`main_corridor`) | Its north wall, in the free stretch x 12.2–23.6 between the Olympic plant room's and the engineers' office's doors (the owner chose the north wall). The owner: "B2, maybe B1 given how steep some of our staircases are": the label is data, one line to change. |
| G     | Reception                                 | Not built yet: no button until it exists (or a button that does nothing, its lamp unlit; implementer's choice, noted).                                                                                                                                            |
| 4     | The museum                                | A new lift landing in the Welcome hall (`museum0`), on its east wall, which the museum's safety layer already kept clear for a lift (TODO.md, mission 107): the museum's first way in that is not a URL.                                                          |

More floors later, each one entry in a list: its label, its button's legend, its destination room id and its landing (where in that room the landing doors stand, which way they face, where the walker arrives).

## The car

- A room of its own (`freight_lift`): a heavy steel goods lift car, about 2.0 m wide, 2.8 m deep, 2.4 m clear, chequer-plate floor, steel walls with buffer rails, a fluorescent light; its maker's brand (`brands.ts`; a real-product-style goods lift, period around 2000, as the plant).
- **Doors: vertical bi-parting** (the owner): two steel leaves parting up and down, a striped safety edge on the meeting edges, a heavy clank at each end of travel; a car gate inside (a vertical mesh gate) as freight lifts have. Landing doors the same on every floor.
- **The car panel**: a lit push button per floor (illuminated push buttons, as the plant's boards; the current floor's lit), DOOR OPEN, DOOR CLOSE, an ALARM button (a bell), a key switch for an independent service (seen, not worked, unless trivial), a seven-segment floor indicator over the doors, a rated-load plate (e.g. 2000 kg, 26 persons) and the inspection certificate.
- **The landing**: a call button (lit while called) and a floor indicator over the doors, on each floor.

## How it works

1. The walker calls the lift at a landing (or it is already there); the doors open.
2. Inside, after a few seconds with nobody in the doorway, the doors close (DOOR CLOSE closes them at once; DOOR OPEN or someone in the doorway reopens them).
3. The walker presses a floor: the motor runs (a hum and a gear whine, a slight judder at start and stop), the indicator counts through the floors between, a chime or a clunk on arrival.
4. The doors open onto that floor's landing; the walker steps out into that room (a hand-over through the doorway, as the corridor's doors hand over, so the room beyond is seen through the open doors before stepping out).
5. Pressing the current floor's button opens the doors.

All input through the one control scheme (`src/toolkit/controls/`). Displays redraw only on change (the floor indicator steps; no free-running animation over 10 Hz).

## State

The car's floor, its doors and its calls in the world state (`src/game/world.ts`), as the control room mode knob is (`controlRoomMode`): a `lift` field (floor, doors, a call queue), actions such as `lift/call`, `lift/press`; `WORLD_VERSION` bumped with a migration. The lift's timing (door dwell, travel seconds per floor) and its floor list are pure logic in a `logic/` module with tests.

## Order of work

1. The floor list, the lift's state machine and its timings: pure, tested.
2. The car and a landing tried in a dev room (a new dev room with two landings and the car, as other components are tried first), the panel on dev0's boards if it is a new kind of control.
3. Installed: the B2 landing in `main_corridor`'s north wall, the 4 landing in `museum0`, the car room joining them.
4. The museum's way in: from the lift, not only the URL; the dev panel lists the lift.

## Open questions for the owner

- G (reception): an unlit dead button until reception exists, or no button?
- The car's maker and rated load.
- Is the lift a place to linger (the alarm, a service key, an inspection certificate to read), or a quick hop?
