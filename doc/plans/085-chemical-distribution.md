# 085: Chemical distribution: the plan

Status: plan (written 2026-10-26 with the owner), for [prompt 085](../prompts/085-chemical-distribution.md); its equipment is prototyped in dev44 ([086](../prompts/086-chemical-handling-dev-room.md)).

## The decisions

- Both chemicals come by bulk tanker into the stores off the loading bay ([081](../prompts/081-acid-supply.md)): sodium hypochlorite 14% and hydrochloric acid 10% (the owner: better suited to bulk storage).
- Bulk and day tanks are framed rectangular black HDPE tanks with galvanised lattice frames (after DENIOS's), with no sight glasses. Each tank's level is read by a non-contact transmitter on a local display, and the day tanks also carry a float indicator through the lid.
- One transfer pump per chemical, in its store: a sealless magnetic-drive pump, not a duty and standby pair (the owner: light work, and a failed pump is soon swapped). The duty and standby set is kept as a model for later.
- One main per chemical from its store to the wet hall's dirty side, to a transfer selector manifold, one per chemical, kept well apart. From each manifold a branch runs to each plant room's day tank. The manifolds are six-way, with spare outlets blanked for the two pools to come.
- Day tanks are sized to each pool's use; the jacuzzi's and footbath's are small.
- The distribution is controlled from a panel in the wet hall, repeated on the control room's mimic. The transfer pumps' HAND · OFF · AUTO stays in each store (local controls stay local).

## The building

The building is a fantasy and need not make geometrical sense (the owner, 2026-10-26): pipes leave each space roughly toward where the next one lies, north, south, east or west, and their exact runs do not matter for the game. The positions and lengths below are only for orientation.

The ring corridor is 28 × 28 m around the sunken wet hall (20 × 20 m, its floor 1.75 m down). Positions are along the corridor's walls, metres from its north-west corner:

| Space                                                    | Where                                                                                                                                                 |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading bay                                              | Off the west wall at 7.4 (its corridor door); the hypochlorite store off its east side wall, the acid store off its west, doors facing across the bay |
| Wet hall                                                 | West door and trolley ramp on the inner west wall at 6, straight across the corridor from the loading bay's; stair door on the inner east wall at 14  |
| Wet hall, inside (its own frame, +x east, +z south, ±10) | Make-up bay (clean, partitioned) to the north, z < −2.9, x > −4.8; aisle east to west; backwash pit and its gratings to the south (the dirty side)    |
| PL1 Lounge                                               | Off the south wall at 6.2                                                                                                                             |
| PL2 Olympic                                              | Off the north wall at 11.2                                                                                                                            |
| PL3 Jacuzzi                                              | Off the west wall at 23.95                                                                                                                            |
| PL4 Footbath                                             | Off the west wall at 17.25                                                                                                                            |

## What goes in each room

### Loading bay (LB)

- **Fill cabinet** in the yard wall, with two ports of incompatible couplings, caps, drip trays and labels. At each port: an isolating valve, the bulk tank's contents display, its high-level beacon and sounder, and a delivery emergency stop.
- **Two fill lines** from the cabinet into the bay, double-contained, each with a non-return valve, falling to its own store and running high along opposite side walls.
- Already there: the cabinet, the tanker channel, the stores' doors facing each other.

### Hypochlorite store (HS, 5 × 8 m)

- **Bulk tanks:** framed 4,000 L HDPE (`framed-chemical-tank.ts`), three as now, on a common bunded floor with a 0.25 m kerb, a sump and a bund leak detector. Each tank has an ultrasonic transmitter, a local display, a high-high switch, a fill valve, an outlet valve and a vent.
- **Fill line** in at high level, with its actuated overfill valve (shut by any tank's high-high).
- **Transfer pump** on its bunded skid by the door wall, drawing from a common outlet header of the three tanks, each tank isolable. Its local station: HAND · OFF · AUTO, RUN, TRIP, trip reset.
- **Hypochlorite main** out through the bay's wall at high level.
- Kept: extract and chlorine detection, signs; eyewash and PPE (decoration).

### Acid store (AS, 5 × 5 m)

- **Bulk tank:** one framed 4,000 L tank for 10% HCl, in place of the IBC, with radar transmitter, display, high-high switch, valves, and a vent through a carbon vent filter. In its own bund with leak detector and sump.
- **Fill line** with its actuated overfill valve.
- **Transfer pump** on its bunded skid, as hypochlorite's.
- **Acid main** out at high level.

### Loading bay and corridor: the mains

- Each main leaves its store at about 5 m and crosses the loading bay high on its own side, the hypochlorite on the east and the acid on the west, never sharing a bracket.
- Both pass over the bay's corridor doors, cross the corridor's west arm at high level (about 6 m, over the 7 m corridor), and enter the wet hall's inner west wall high above its trolley ramp door at 6.
- They are double-contained throughout, with leak detection at each low point. Labels give chemical and flow direction at every wall and every 6 m.
- Corridor run: about 4 m each. Bay runs: about 8 m. In the hall: about 12 m down to the dirty side. **Roughly 25–30 m per main.**

### Wet hall, dirty side (south)

- **Acid manifold** in the south-west corner, **hypochlorite manifold** in the south-east corner, about 15 m apart across the pit, each clear of the gratings on solid floor.
- Each manifold:
  - a six-way transfer selector (`createTransferSelector`) on its galvanised frame, in its own bund tray with leak detector;
  - a header fed from its main;
  - per live outlet: a manual isolating valve, an actuated ball valve with position dome, and a plate.
  - Spares are blanked and tagged.
- **Outlets.** Hypochlorite: 1 Lounge, 2 Olympic, 3 Jacuzzi, 4 Footbath, 5–6 spare. Acid: 1 Lounge, 2 Olympic, 3 Jacuzzi, 4–6 spare (the footbath doses no acid).
- **Each manifold's safety:** eyewash on the wall by it, a never-mix notice, its chemical's hazard signs.
- **The chemical distribution panel** (Penfold) on the aisle side between them; see Control below.
- The mains come down the west wall at high level and along the south wall at about 5 m, the acid's ending at the south-west manifold and the hypochlorite's continuing round to the south-east one. The branches rise from each manifold's outlets back up to high level.

### Branch routing from the wet hall

Approximate, by compass direction only.

All branches are double-contained, at high level, the two chemicals on separate brackets.

| Branch       | Route                                                                                                                       | Approx. length              |
| ------------ | --------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| PL1 Lounge   | Out the hall's south wall near x −7.8, across the corridor's south arm into PL1                                             | 8–12 m                      |
| PL2 Olympic  | Up and over the make-up bay's partition (3.6 m) at about 5 m, out the north wall near x −2.8, across the north arm into PL2 | 20–25 m                     |
| PL3 Jacuzzi  | Out the west wall near z +10, south along the corridor's west arm, into PL3                                                 | 12–18 m                     |
| PL4 Footbath | Out the west wall near z +3, across the west arm into PL4                                                                   | 10–15 m (hypochlorite only) |

### The plant rooms

Each gets a chemical corner near its dosing pumps:

- the hypochlorite and acid day tanks in **separate bunds**, on different walls or at least 2 m apart;
- each tank's inlet riser from its branch with an actuated inlet valve;
- the outlet to the dosing pumps already there, re-pointed from the stores' stand-ins;
- an eyewash station by them;
- a day tank panel (see Control).

The exact spot in each room is found by the room's layout tools (`doc/room-layout-guide.md`) once the tanks are in its schematic; the corners below are the aim.

| Room         | Hypochlorite day tank                                       | Acid day tank | Notes                                                                        |
| ------------ | ----------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------- |
| PL2 Olympic  | 1,000 L framed, about 1.3 × 0.85 × 1.1 m, bund about 1.1 m³ | 500 L framed  | The biggest use (roughly 50–150 L/day of hypochlorite): about a week's stock |
| PL1 Lounge   | 300 L framed (as dev44's)                                   | 200 L framed  |                                                                              |
| PL3 Jacuzzi  | 60 L drum-size bunded tank                                  | 30 L          | Feeds the packaged spa cabinet's own dosing, re-pointed                      |
| PL4 Footbath | 30 L                                                        | none          | Hypochlorite only                                                            |

Use differs by orders of magnitude, so the same 20 L/min transfer fills the footbath's tank in about a minute and the Olympic's in about an hour. Each fill is ended by the tank's high switch whatever its size.

## Showing the flow

- **Every tank shows its contents:**
  - the bulk and day tanks on their displays, in litres with a bar;
  - the day tanks also on their float indicators (a red rod in a clear tube against E · ¼ · ½ · ¾ · F).
- **Hovering over a tank** says what it holds, how full it is, and whether it is filling or draining and how fast ("Hydrochloric acid day tank, about 62% full, filling slowly"), from the level's actual change. This is done in dev44 and tested.
- **Flow is shown by its effects:**
  - the transfer pump's RUN lamp and gauge;
  - the open branch's valve pointer and lit destination button;
  - the receiving day tank's level rising and the bulk tank's falling, the same litres.

  The model conserves the litres, so one goes up as the other comes down.

## Control

- **In each store (local):**
  - the transfer pump's HAND · OFF · AUTO, RUN and TRIP lamps, and trip reset;
  - the store's annunciator panel: high level, overfill, bund leak, pipe leak, pump trip, gas.

  These stay at the store, so a tripped pump means a walk to the store.

- **In the wet hall: the chemical distribution panel** (Penfold Controls, period instruments), one panel with a section per chemical:
  - each bulk tank's level and each day tank's level, on moving-coil meters (or LED bargraphs where there are many);
  - each selector's HAND · AUTO, its six lit destination buttons (spares dark), and each branch's OPEN and SHUT lamps;
  - the transfer pump's REMOTE START and STOP, which only work while the pump is in AUTO at its store, its RUN and TRIP lamps, and an IN AUTO lamp so you can see when the store has taken it local;
  - an annunciator: day tank low, day tank high-high, branch valve failed to open, main leak, manifold bund leak, pump not in auto.
- **In each plant room: the day tank panel** (written in dev44, `createDayTankPanel`):
  - its tanks' levels;
  - FILLING and LOW lamps;
  - the inlet valve's OPEN and SHUT;
  - CIRCULATION PROVEN, which dosing waits on;
  - a dosing inhibit key.
- **Control room:** a mimic page of the whole chemical path, with every level, the pumps, the valves and the alarms. It shows and accepts alarms, but does not select or reset.
- **Behaviour** (already in `chemical-transfer-demo.ts`, tested):
  - a day tank calls at its low switch and stops calling at high;
  - the selector in AUTO serves the calling tanks one at a time in turn;
  - the pump runs while a branch is open;
  - high-high anywhere trips the pump and shuts every branch until reset.
- **Added for the building:**
  - a bulk tank at low level stops its transfer;
  - a day tank whose circulation isn't proven still fills, but does not dose.

## The model

- **Schematics first:**
  - the loading bay's fill ports and lines;
  - each store's tanks, overfill valve, pump and main;
  - the wet hall's two manifolds with their valves;
  - each plant room's day tanks, inlet valves and the dosing pumps' new suction;

  each with function, normal state and tag (HS-T1, HS-P1, WH-HM-XV2, PL2-HDT…). The plumber routes the pipes, double-contained where they cross rooms, and the scene binds to them.

- **World state** (`WORLD_VERSION` bumped, with a migration):
  - each bulk tank's and day tank's litres;
  - each pump's selector, running and trip;
  - each selector's mode, pick and serving outlet;
  - each branch valve's position;
  - the leak and level alarms.

  `chemical-transfer-demo.ts` is the start: it becomes the world's chemical distribution, with one trial per chemical and its tanks the plant rooms'.

- **The flows:**
  - deliveries fill the bulk tanks (076);
  - transfer moves litres from bulk to day tank;
  - dosing draws the day tanks down at each pool's real rate (from its bather load and chlorine demand, where the pools model gives them).

## The order of work

1. **Now: place the new tanks in each room and get them working on the model:**
   - the day tanks into the four plant rooms' schematics and scenes;
   - the stores' framed bulk tanks and transfer pumps;
   - the two manifolds in the wet hall;

   with the world state for their levels, the transfer and selector logic running across the building, and the levels shown on every tank.

2. The mains and branches: schematic connections, plumber routing, double-contained pipe kind.
3. The control: the wet hall's distribution panel, the store panels, the day tank panels, the control room mimic.
4. Deliveries into the bulk tanks (076), and dosing rates from the pools model.
