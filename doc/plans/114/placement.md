# 114: where the Dr Aqualis cabinets stand, and what the model gains

A plan only: nothing here is built. It places the Dr Aqualis cabinets in the plant rooms and sets out what the schematics, the network, the world and the control rooms must gain to make them real. Brief: `doc/prompts/114-aqualis-dosing-controller.md`; the work split: `doc/plans/114/README.md`. Written by Claude (Opus 5.5, Claude Code), 2026-10-31, against commit `43b88391` (PL1-CP3 moved west of the door).

The owner's rulings this plan follows (2026-10-31, through the lead):

- The Olympic and the Lounge plant rooms each get a **Dr Aqualis Trio**, not a Duo or a Consultant. The CO₂ channel stays unconnected until CO₂ dosing exists (below).
- In the Olympic room the Trio **replaces PL2-CP2**, the "Olympic pool dosing controller and sample cells" (asset-0103), in its place.
- The old controller's pipes are nothing like the Trio's, so **re-plumb from scratch** to the Trio's own ports. Nothing of PL2-CP2's pipework is reused.
- **Graph first.** Every new connection goes into the room's schematic and network before anything is routed or drawn. The order of work is: graph and schematic, then tests that the graph is right, then the plumber's routing, then the scene binding.
- For the other plant rooms this plan only recommends. Nothing there is decided.

Coordinates are in each room's own frame: metres, the room's middle at x = z = 0, x east, z south, y up from the plant floor. They are read from `layoutRoom(room)` (`src/toolkit/gallery/logic/room-equipment.ts`) and `roomPipes(room)` (`room-pipes.ts`) at that commit, through a scratch test that was not committed.

## The cabinet, as placement sees it

From `src/toolkit/components/plant/logic/aqualis-cabinet.ts`:

- **Size:** 0.6 m wide, 0.3 m deep and 1.8 m tall, on an 0.08 m plinth.
- **Placement kind:** it stands on the floor with its back to a wall. Nothing on it is serviced from behind.
- **Sample ports:** the inlet (0.2 m up) and the outlet (0.12 m up) leave its left side as one faces it, 0.1 m off its back. The inlet's ball valve sits 0.09 m beyond that side.
- **Glands:** on its top at 1.8 m: NaOCl, HCl, CO₂ and ALM.
- **Lower door:** hinged on its right edge as one faces it, swinging 1.9 rad (109°). Its sweep is a quarter disc 0.6 m in front of the cabinet that reaches 0.2 m past its right side. Nothing standing proud of the cabinet's front may be within that.
- **Screen:** it tilts up 30° for an eye about 0.6 m from the door, so standing room is about 0.8 m in front, more than the door's sweep.
- **On a wall it needs about 1.05 m:** 0.2 m on its left for the valve and the pipe drop, its 0.6 m, and 0.25 m on its right for the door. It also needs about 0.9 m clear in front.

**Gap in the cabinet's ports:** `PORTS` has no mains entry. Every other room device has a power drop and isolator, so a mains gland (`power`, on top beside ALM) has to be added before the cabinet can be a node with a supply.

## Plant room by plant room

### Which rooms dose automatically

All four do today. `water-treatment.ts` runs the same unseen PI controller (`CONTROLLER`, `stepControl`) for `pool_01` to `pool_04`, and `dosing-pumps.ts` gives the spas ideal peristaltic heads inside their packaged cabinets (0.5 l/h and 0.1 l/h). So the brief's "each plant room that doses automatically" literally takes in PL3 and PL4 as well. For those two this plan recommends nothing for now; the reasons are under PL3 and PL4 below.

| Room                            | Decision or recommendation                                           | Why                                                                                                                                    |
| ------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| PL1, Lounge (`plant_pool_01`)   | **Trio** (the owner's decision)                                      | Hypochlorite and acid dosing pumps, their day tanks and injection quills; the brief names it.                                          |
| PL2, Olympic (`plant_pool_02`)  | **Trio**, replacing PL2-CP2 in place (the owner's decision)          | As above, and the plant the brief expects to live in AUTO.                                                                             |
| PL3, Jacuzzi (`plant_pool_03`)  | **Nothing** (recommended); a Consultant later if the owner wants one | Its dosing is inside the packaged Jacuzzi cabinet (PL3-CAB1), as a real spa pack's is. A second controller would fight the pack's own. |
| PL4, Footbath (`plant_pool_04`) | **Nothing**                                                          | It is the 5 × 5 m one-storey room, and its packaged set (PL4-CAB1) does its own dosing. There is no wall left for a 1.05 m cabinet.    |

### The CO₂ channel until CO₂ exists

Both Trios have the CO₂ channel, and in both it stays unconnected:

- **In the model:** the cabinet node declares its `co2` control port, and no link joins it.
- **In the world:** `ChannelPorts.co2` is `null`, so the pump status screen shows CO₂ NOT CONNECTED and the controller corrects pH with acid alone.
- **On the cabinet:** the CO₂ gland carries a blanking plug, as an installer leaves a spare gland, and its engraving stays.
- **Tested:** a test asserts that the port exists and is unlinked.

When CO₂ dosing arrives, one link is added from that port to the CO₂ valve controller's control input. The cabinet then needs no change.

### PL2, the Olympic: in PL2-CP2's place

**Where PL2-CP2 is now:** on the south wall at x 1.53 to 2.53 (centre 2.03), its back on the wall at z 7.0 and its face at z 6.75. It is a wall unit 1.0 wide, 0.25 deep and 1.4 tall, fixed at 1.35 m (`olympic-plan.ts`: `SIZE.controller`, `WALL_HEIGHT.controller`). On its west are DP1, the hypochlorite board (x −0.07 to 1.13), and DP2, the acid pump (x −1.17 to −0.47). On its east is the stair's foot (kept clear, x 3.13 to 4.33), with the stair rising east above it to the landing and the pool door.

**The Trio in its place:**

- **Footprint:** centre (2.03, 6.80), x 1.73 to 2.33, z 6.65 to 6.95. Its back is 0.05 m off the south wall and it faces north (yaw π).
- **Size difference:** it is 0.4 m narrower than PL2-CP2 and 0.05 m deeper. It stands on the floor and reaches 1.8 m, where PL2-CP2 hung from about 0.65 m to 2.05 m. Its face is in line with DP2's (z 6.65).
- **Sample ports:** on its east side, at (2.33, 0.12 or 0.2, 6.85). The inlet valve is at x 2.42, and there is 0.8 m of wall before the stair foot's kept-clear space, which is room for the drop.
- **Lower door:** hinged on its west edge, it sweeps x 1.53 to 2.33, z 6.06 to 6.65. That is clear of DP1, whose face is at z 6.70, behind the door's sweep.
- **Standing room:** keep x 1.53 to 2.53, z 5.55 to 6.65 clear. It is clear today, with open floor north to the contact tank at z 2.65.
- **Walking:** it stands 0.35 m out from the wall, as DP2 does, so the way along the south wall is no narrower than it is now.

**Distances:** DP1's board is about 1.5 m away along the wall and DP2's about 2.9 m. With the drops from the glands, each control cable is about 3 to 4 m. The sample comes from the pumps (about 9 m west) and returns to the balance tank hall through the west wall (about 13 m).

**Seen on entering:** from the stair, coming down westwards, the Trio stands ahead and to the left, side-on, about 1 m beyond the foot. Its face, looking north, is read once one has stepped off and turned. From the equipment doors under the landing it is side-on along the south wall. The screen cannot face either way in without leaving the wall.

**What it inherits from PL2-CP2:**

- **The node:** id `controller` in `OLYMPIC_ANNEX`, kind `dosing-controller` (equipment code CP).
- **The tag, PL2-CP2:** the tag is the place and function in the plant, so it stays. Only the asset changes: a new asset id (the next free, asset-0155) replaces asset-0103 in `installed-asset-ids.ts`, under the Trio's derived name.
- **The bridge panel** in `bridge-bindings.ts` (`code: 'PL2-CP2'`, `model: { room: 'plant_pool_02', node: 'controller' }`): its tie to the node stays, and its contents are rebuilt to show the Trio (below).
- **The bus tap-off convention:** its power drop is `power-controller.tap-off`, like the room's other devices.

Nothing of its pipework is inherited.

**What is retired with PL2-CP2:**

- The wall unit's item: `SIZE.controller` and `WALL_HEIGHT.controller` in `olympic-plan.ts`.
- Its exhibit binding in the plant rooms: `MODELS['dosing-controller']` and `createControllerPanel` in `views/room-equipment.ts`. Whether the "Controller and sample cells" exhibit stays in its own dev room is the lead's call.
- Its one `sample` port in `machine-ports.ts`.
- The rule-laid "Sample line" in `olympic-plumbing.ts`. It ran from pump B's discharge at 2.35 m along the south wall and dropped to the old unit's face at (2.03, 1.35, 6.75).
- The annex link `sample` (`pumps.discharge` to `controller.sample`).
- The old bridge contents: readouts straight from `world.pools.pool_02`, stroke-rate gauges at fixed rates, and the CALIBRATE and SET POINTS rows.
- asset-0103 in the register.

The retired layout `retired0.json` is frozen and stays as it is.

**Alternatives weighed for the Olympic:**

- **South wall west of DP2 (x about −2):** nearer the UV unit's dosing spool. But the return main doubles back low along this wall, and it is further from the stair. Rejected.
- **West wall by the pumps:** the shortest sample and return (about 2 m). But 9 to 10 m of control cable to the boards, and the controller would stand apart from the dosing it shows. Rejected.
- **East wall by PL2-CP1:** power and control come in there. But it is 10 m from the boards and 17 m from the tapping. Rejected.
- **Freestanding in the open floor:** the screen could face the stair. But panels and cabinets go against walls (the owner's ruling) and it would stand in the walkway. Rejected.

In-place wins on every criterion except being seen from the doors, and the owner has ruled for it.

```
PL2 Olympic, 22 × 14 m. Each character is 0.5 m across, each line 0.5 m. North at the top.
+--------------------------------------------+
|11111111 222222223333333344444444 5555555:::|
|11111111 222222223333333344444444 5555555:::|
|11111111 222222223333333344444444 5555555:::|
|11111111 222222223333333344444444 5555555:::|
|11111111 222222223333333344444444 5555555:::|
|11111111 222222223333333344444444 5555555:::|
|11111111 222222223333333344444444 5555555:::|
|11111111 222222223333333344444444 5555555:::|
|                                         :::|
|b                                        :::|
|b                                        :::|
|b...                                     :::|
|....           XXXX        CCCCCCCC      :KK|
|....           XXXX        CCCCCCCC      :KK|
|....                       CCCCCCCC      :KK|
|....                       CCCCCCCC      :KK|
|....                       CCCCCCCC      :KK|
|  PPPPPPP                  CCCCCCCC      :KK|
|  PPPPPPP                  CCCCCCCC      :OO|
|  PPPPPPP                  CCCCCCCC      :OO|
|  PPPPPPP                                :OO|
|  PPPPPPP                         AAA    :OO|
|  PPPPPPP                         AAA    :::|
|             UUUU                 AAA ::::::|
|     HHHH    UUUU                     ::::::|
|     HHHH    UUUU        ~~~          ::::::|
|     HHHH    UUUU        ~~~...SSSSSSS......|
|     HHHH          aahhhhQQ~...SSSSSSS......|
+--------------------------------------------+
1-5 sand filters   P pumps (PL2-P1)   b balance tank panel   . kept clear (tank hall doors W, stair foot, equipment doors S)
C contact tank   X heat exchanger   U UV unit   K local panel PL2-CP1   O ozone generator   : gantry and landing (deck level)
S stair   H hypochlorite day tank   A acid day tank   h DP1   a DP2   Q the Trio (PL2-CP2)   ~ its door sweep and standing room
```

### PL1, the Lounge: south wall east of the door (recommended), or in PL1-CP2's place

The Lounge also has a "dosing controller and sample cells", PL1-CP2 (asset-0010). It is on the east wall at x 5.75 to 6.00, z 0.87 to 1.87, just south of the stair's foot (`room-equipment.ts`, the `plant_pool_01` placer, about line 1782). The owner has just moved PL1-CP3, the annunciator, to just west of the door (now at x −1.51 to −0.61) "to clear floor east of the door for the Dr Aqualis Trio" (`43b88391`). Both options:

**Option S, recommended: south wall, east of the door.**

- **Footprint:** centre (1.80, 5.30), x 1.50 to 2.10, z 5.15 to 5.45. Its back is 0.05 m off the south wall and it faces north (yaw π). PL1-CP2 leaves the east wall.
- **Lower door:** hinged on its west edge, it sweeps x 1.30 to 2.10, z 4.56 to 5.13. That ends at the edge of the doorway's kept-clear space (x ≤ 1.30), which is why the cabinet stands no further west.
- **Sample ports:** on its east side at (2.10, 0.12 or 0.2, 5.35). The inlet valve is at x 2.19, and there is 0.6 m of wall before DP2's board (x 2.80) and DP2's dose riser at x 2.85.
- **No pipe in the way below 2.5 m:** the heating flow and return to the heat exchanger cross the south wall further east (x 3.52 and 3.87), and the acid riser is at x 2.85.
- **Standing room:** there is 0.73 m between its face and the back of the heat exchanger (z 4.40, from x 1.90 east). An operator stands squarely in front of its west half, about 0.55 m out. That is tight but workable, and the heat exchanger is below eye height.
- **Distances, very short:** DP2's board is about 1 m away, DP1's about 3 m, PL1-CP3 about 3 m across the door, and the acid day tank about 2.7 m. The sample from the pump discharge main is about 6 m in plan, plus its rise into the services ceiling and back down.
- **Seen on entering:** coming down the stair southwards, its face looks back at you across the room, about 5 m off. Through the equipment door it is beside you, 1.3 m east.

**Option E: in PL1-CP2's place on the east wall.**

- **Footprint:** centre (5.80, 1.30), x 5.65 to 5.95, z 1.00 to 1.60, facing west (yaw 3π/2).
- **Clearances:** its sample ports are on its north side, toward the stair foot, with the valve at z 0.91 and the stair's kept-clear space ending at z 0.57. Its door hinges on the south side and sweeps to z 1.80, 0.2 m short of PL1-CP1, the local panel, at z 2.00.
- **For it:** its face is read from the equipment door across the room. It inherits PL1-CP2's slot, with nothing else moved.
- **Against it:** the control cables are 7 to 10 m (round over the panel to DP1, DP2 and PL1-CP3). One steps off the stair onto its side. The owner has just cleared the south wall for it.

**Recommendation for the Lounge:** option S. It is beside its pumps and day tanks with the shortest cables, it is where the owner cleared floor, and it is readable from the stair. It also settles the older TODO item, "a dosing controller between PL1's dosing boards" (2026-10-28), in spirit: that 0.7 m gap between DP2 and DP1 is crossed low by the 114 mm heating flow and return (x 3.52 and 3.87, at 0.22 m and 0.88 m), so a floor cabinet cannot stand there. That item should be corrected when this is built.

**What it inherits from PL1-CP2, under either option:**

- **The node:** id `dosing` in `LOUNGE_SCHEMATIC`, kind `dosing-controller`.
- **The tag, PL1-CP2:** it stays, and the asset changes to asset-0156, replacing asset-0010.

Its two hand-laid sample runs in `room-pipes.ts` ("Sample line from the filtered main" and "…, its point") are retired, not reused. So are its `wall('dosing-controller', …)` item in `poolPlant` and the east-wall placement.

**Alternatives also weighed for the Lounge:**

- **Between DP2 and DP1:** blocked by the heating pipes, as above.
- **South-east corner:** PL1-CP1 fills it.
- **By the pumps and balance tank:** short sample, long cables, and apart from the dosing.
- **Freestanding:** against the panels-on-walls rule.

```
PL1 Lounge, 12 × 11 m. Each character is 0.25 m across, each line 0.5 m. North at the top.
+------------------------------------------------+
|                                         :::::::|
|                  CCCCCCCCC  OOOOOOO     :::::::|
|   TTTTTTTTTTTTT  CCCCCCCCC              ::SSSSS|
|   TTTTTTTTTTTTT  CCCCCCCCC                SSSSS|
|   TTTTTTTTTTTTT  CCCCCCCCC         HHHHH  SSSSS|
|   TTTTTTTTTTTTT                    HHHHH  SSSSS|
|   TTTTTTTTTTTTT                    HHHHH  SSSSS|
|   TTTTTTTTTTTTT                           SSSSS|
|   TTTTTTTTTTTTT                           SSSSS|
|                                          ......|
|   PPPPPPPPPPPPP       UUUUUUUU           ......|
|   PPPPPPPPPPPPP       UUUUUUUU           ......|
|   PPPPPPPPPPPPP       UUUUUUUU           .....e|
|   PPPPPPPPPPPPP       UUUUUUUU                e|
|   PPPPPPPPPPPPP                               e|
|                                AAA          KKK|
|                                AAA          KKK|
|  FFFFFFFF FFFFFFFF                          KKK|
|  FFFFFFFF FFFFFFFF            XXXXXXX       KKK|
|  FFFFFFFF FFFFFFFF  ......    XXXXXX===     KKK|
|  FFFFFFFF FFFFFFFF  ......  ~~~~    ===     KKK|
|                 nnnn......   QQQ  aa===hhhhhh  |
+------------------------------------------------+
T balance tank (PL1-T1)   P pumps   F sand filters   C contact tank   O ozone generator   U UV unit   X heat exchanger
H hypochlorite day tank   A acid day tank   a DP2   h DP1   n annunciator PL1-CP3   K local panel PL1-CP1
: landing   S stair   . kept clear (equipment door S, stair foot)   = heating flow and return through the south wall
e PL1-CP2 today (option E's place)   Q the Trio, option S   ~ its door sweep and standing room
```

### PL3, the Jacuzzi, and PL4, the Footbath

Recommended: no Aqualis cabinet. Each packaged cabinet (PL3-CAB1, PL4-CAB1) is its own circulation, filtration, heating and dosing, and its dosing controller belongs inside it. Until each cabinet's own controller is modelled, `water-treatment.ts`'s `stepControl` goes on dosing `pool_03` and `pool_04`.

If the owner wants the Jacuzzi's water shown, a Consultant (no control ports, alarms only) could stand on PL3's west wall north of the cabinet (about x −3.8, z −3.5 to −1.5, not yet checked against its pipes). PL4 has no room.

## What has to change, in order

In the order the owner set: graph and schematic first, then tests that the graph is right, then routing, then binding. Tags follow `model-valves.ts`: room, then the node the fitting serves, then IV, NRV or IS, then a number in turn. The numbers below assume nothing else is numbered against those nodes, which the tests confirm.

### Step 1: the graph and schematic

**Nodes, for each room (PL1, and PL2 in `OLYMPIC_ANNEX`):**

- **The cabinet.** The existing controller node (`dosing` in PL1, `controller` in PL2) is kept, with code CP2. Its name derives to "Lounge pool dosing controller, Dr Aqualis Trio" and "Olympic pool dosing controller, Dr Aqualis Trio", and its asset key is re-keyed. The model `trio` goes on the node, or a kind `aqualis-cabinet` with code CP (open question 6). Its ports are `sampleIn`, `sampleOut`, `hypochlorite`, `acid`, `co2`, `alarm` and the new `power`.
- **The sample point.** A new node, kind `sample-tapping`, code SP1: **PL1-SP1** and **PL2-SP1**. It is the saddle and its stub on the main. The plant model lists the tapping as a block of its own, and without it the tapping valve would serve a header with no code and be tagged `…-X-IV1`.

**Links, for each room:**

| Link                              | From → to                                                                                                                                                                   | Medium  | Fittings and their tags                                                                                                                                                                                                                           |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sample tapping                    | the main → `sample-point.in`                                                                                                                                                | water   | none (the saddle)                                                                                                                                                                                                                                 |
| Sample line                       | `sample-point.out` → cabinet `sampleIn`                                                                                                                                     | water   | tapping isolating valve at its source, **PLn-SP1-IV1**, normally open; the cabinet's inlet ball valve at its target, **PLn-CP2-IV1**, normally open (the valve the cabinet's view already draws at `SAMPLE_VALVE_AT`, now a fitting of the model) |
| Sample return to the balance tank | cabinet `sampleOut` → the balance tank's new `sample-return` port                                                                                                           | water   | return isolating valve at its source, **PLn-CP2-IV2**, normally open (no non-return valve: it discharges open, above the tank's water)                                                                                                            |
| Hypochlorite dosing control       | cabinet `hypochlorite` → DP1's new `control` port                                                                                                                           | control | none                                                                                                                                                                                                                                              |
| Acid dosing control               | cabinet `acid` → DP2's new `control` port                                                                                                                                   | control | none                                                                                                                                                                                                                                              |
| Dosing controller alarms          | cabinet `alarm` → PL1-CP3's new input (PL1); PL2-CP1's alarm input (PL2, which has no annunciator in the room, so its board in the control room is reached through PL2-CP1) | control | none                                                                                                                                                                                                                                              |
| Dosing controller power           | PL1's switch-fuse → cabinet `power`; PL2's busbar tap-off `power-controller.tap-off` → cabinet `power`                                                                      | power   | PL1's power isolator, **PL1-CP2-IS1**; PL2's tap-off, as its room's others                                                                                                                                                                        |
| CO₂ dosing control                | cabinet `co2` → nothing yet                                                                                                                                                 | —       | no link (the blanked gland)                                                                                                                                                                                                                       |

**Where each room taps and returns:**

- **PL1:** the tapping goes on the "Pump discharge main" (`discharge-header` to `inlet-header`), before the filters and every dosing point, as the brief and `doc/plant-model.md` ask. Today it is on the filtered main (prompt 089, 2026-10-27: after the filters, though still before dosing), so this is open question 2. The return goes to PL1-T1.
- **PL2:** the tapping goes on the pump discharge manifold (`manifold`). Today it is on pump B's own discharge, which depends on B's valves when A is duty and B is isolated (open question 4). The return goes to the balance tank in the tank hall, through a sleeve in the west wall beside the pumps' suctions. The tank node and its port are added to the annex.

**Machine ports:** `machine-ports.ts` replaces the `dosing-controller` kind's single `sample` port with the Trio's ports (from `portsOf('trio')`, turned to the room). It adds a `control` port to `hypo-pumps` and `acid-pump`: a gland on the board's top edge, beside its supply.

**The plumber adds nothing:** every fitting is given in the schematic (`given`).

### Step 2: tests that the graph is right, before anything is routed

Beside `lounge-schematic.ts`, `olympic-chemical-schematic.ts` and `olympic-annex.ts`:

- every port of the Trio is linked except `co2`, which is declared and unlinked;
- the sample point is upstream of the filters and of every injection quill and dosing spool, which is a path test on the graph;
- the return ends at the balance tank;
- each control link ends at its own pump;
- the derived tags are as in the table above, with no `-X-` tag;
- the plumber's expansion adds no fitting, which is the sign the schematic is complete;
- `world-in-model.test.ts` still finds every drawn thing in the model.

### Step 3: the plumber routes the lines from the graph

- **PL2:** `olympic-plumbing.ts` lays the sample line and the return by rule, as a pair. Each rises from the main at the manifold to over headroom (2.35 m and 2.45 m), runs south to the wall and along it, and drops on the Trio's east side at x 2.42 into the valve and the ports. Both are `chemical-tube`, 12 mm. The control cables (`control` gets a pipe kind of its own, a small conduit) drop from the glands at 1.8 m into a run along the wall at about 2.2 m to each board's gland. The alarm cable goes up into the room's cable route to the east wall's PL2-CP1. The voxel router takes whatever the rules leave.
- **PL1:** the Lounge is still laid by hand in `room-pipes.ts`. Its runs are written from the schematic's links, one run per link, named for it, in the room's own style: each line up into the services ceiling (`INTO_CEILING`) and down to its far end. The sample comes down to the Trio's east side, the return goes down to PL1-T1's top, and the cables run to DP2, DP1 and across the door's head to PL1-CP3.

### Step 4: the scene binds to the network

- **The cabinet:** in each room the dosing-controller node is drawn as the Aqualis cabinet (`views/aqualis-cabinet.ts`, model `trio`), bound to the world's cabinet state for its pool.
- **Its inlet valve:** bound to the fitting **PLn-CP2-IV1**.
- **The tapping and return valves:** drawn on their lines, as every valve is.
- **Placement items:** `olympic-plan.ts` and `room-equipment.ts` get the Trio's floor item (0.6 × 0.3 × 1.8, back to the wall, its access and door sweep kept clear), in place of the wall units.

### `water-treatment.ts`: what the Trio takes over

For `pool_01` and `pool_02` only:

- `stepControl`, `DosingControl` and `CONTROLLER` stop deciding those pools' doses. The Trio's controller (`aqualis-controller.ts`) decides them from its sampler's readings, its knob, its settings and its channels' feedback.
- The sample stays what it is now, `circuit.tank`, the water the pumps draw. Its flow now depends on the circulation running and on PLn-SP1-IV1, PLn-CP2-IV1 and PLn-CP2-IV2 being open. Losing it, after `SAMPLE_LOSS_DELAY`, inhibits dosing and raises SAMPLE FLOW LOW. The analyser then holds its last values: the frozen-sample failure in `doc/plant-model.md`.
- `pumpRates` takes each pump's ask from its channel's demand (4–20 mA and a release). It no longer takes `control.hypochlorite` or `control.acid` times the pump's most.
- `dosing-pumps.ts` gains each board's mode (remote, manual, off) and reports `ChannelFeedback`: mode, power, running, fault, `meanLh` as delivering, and its most.
- The pH lockout gives way to the Trio's own inhibits.
- The set points move to the Trio's targets (PWTAG: free chlorine 1.2 mg/l in 1.0 to 1.5; pH 7.3 in 7.2 to 7.4). The old set point was 1.3 at the sample, so the pools will run about 0.1 mg/l lower. That is open question 13.
- Pool dynamics come set up correctly: the Lounge 150 m³ (138.9 in the pool and 11.1 in the tank) at 90 m³/h; the Olympic 2,716 m³ (2,500 and 216) at 620 m³/h.
- The spas keep `stepControl`.
- `sampling.ts` is retired once nothing borrows from it.
- `health.ts` (`'dosing-controller'`) and `world-bindings.ts` (`'dosing-controller'`) are reworded for the Trio.

### Alarms, mimics and both control rooms

**Annunciator windows:** the Trio's alarm output (`alarms()` in `aqualis-advisor.ts`) drives them. The water windows (chlorine and pH) are rebound from the pool's true water to the Trio's readings, so a frozen sample hides drift, as it should.

- **PL1, the Lounge (16 windows, 4 columns), grows to 24 (4 × 6):** it adds CONTROLLER FAULT, SAMPLE FLOW LOW, DOSING INHIBITED, DOSING OFFLINE (a channel in its own manual mode, tripped or not delivering), COMBINED Cl HIGH and WATER BALANCE (aggressive or scaling), and keeps two spares. The board grows taller on the wall west of the door and in the control room.
- **PL2, the Olympic (24 windows, 6 columns, one spare), grows to 30 (6 × 5):** it adds CONTROLLER FAULT (in the old spare), SAMPLE FLOW LOW, DOSING OFFLINE, COMBINED Cl HIGH and WATER BALANCE, and keeps two spares. DOSING INHIBITED already exists; it is rebound to the Trio's inhibit.
- **Behaviour:** the shared ACCEPT and RESET state is unchanged (`location-annunciators.ts`). CONTROLLER FAULT follows the watchdog rule in `crash-modes.md`.

**Mimics:** each pool's mimic gains these, as `doc/plant-model.md` plans:

- on its own room's panel (PL1-CP1, PL2-CP1) and on the old control room's pool mimic;
- a sample take-off symbol on the pump discharge line, with a SAMPLE FLOW lamp;
- a DOSING INHIBITED lamp;
- the Trio's mode as AUTO, HAND and OFF lamps (shown, not worked).

Its free-chlorine and pH readouts and its dosing lamp read the Trio.

**The bridge:**

- PL2-CP2's panel is rebuilt to show the Trio: the analyser's readings, each channel's status and demand, the mode, and its alarms.
- A matching PL1-CP2 panel is added.
- Every button on them stays `local(…)`: the knob, the touch screen and the power switch are on the cabinet only (the local-only rule). Neither control room gets a dosing START or STOP; the bridge's are `unmodelled` now.

### The world and saves

The world's shape changes, so `WORLD_VERSION` goes from 60 to 61, with a migration. The world gains, for `pool_01` and `pool_02`:

- the cabinet's state: model, power, selector, settings, sampler, controller, its OS (crash state) and its lower door;
- the three new valves, open;
- each dosing pump's mode, remote.

The migration seeds each sampler's cell, and the controller's chlorine integral, from the old `circuits[id].control`, so dosing carries on without a jump. The project rule allows throwing saves away when the network changes, but a migration here is cheap, so this plan recommends it (open question 14).

## Risks

- **The Lounge's standing room in option S is tight:** 0.73 m from the Trio's face to the back of the heat exchanger. Check it with the walker before settling.
- **The Olympic's tapping on pump B's discharge** loses its sample when B's discharge valve is shut, unless the tapping moves to the manifold.
- **Changing `dosing-pumps.ts`** (mode and mA input) touches the metering-pump family shared with Halls 3 and 9. Those halls must keep their own controllers' behaviour.
- **The tuned dosing behaviour may move:** retuned set points and a new controller mean `water-treatment` tests (slow ones included) and mission 101's Olympic shortfall (its undersized DMX, kept on purpose) all need running again. In AUTO the Trio will show the shortfall plainly, with demand above delivery.
- **The Lounge's sample and return go through the services ceiling** (about 6 m up and down each). With the sample pump's flow, the transport lag is on the order of 2 minutes. That is fine for a controller with its own cell lag, but it should be in the sampler's input.
- **The Trio has no mains port** in `aqualis-cabinet.ts` yet.
- **Mission 105's controllers:** they were designed for exactly these two rooms (the Chlorella CX-7 for the Olympic, the DC-1 pair for the Lounge) and are not yet installed. The Trio would take their places.

## Questions for the owner, one at a time

1. ~~In the Lounge, should the Trio stand on the south wall just east of the door (recommended), or in PL1-CP2's place on the east wall?~~ Answered (the owner, 2026-10-31): where the annunciator used to be, on the south wall just east of the door (on the left, facing the door from inside).
2. Should the Lounge's sample tapping move from the filtered main (where prompt 089 put it) to the pump discharge main, before the filters, as the brief says?
3. Should each sample return go to its balance tank (the Olympic's through the west wall into the tank hall), or to the pumps' suction, which is shorter?
4. Should the Olympic's sample tapping move from pump B's discharge to the common discharge manifold, so it never depends on one pump's valves?
5. Is the Trio's CO₂ gland blanked off, its port unlinked and showing NOT CONNECTED until CO₂ dosing exists, right?
6. Does each cabinet keep its tag (PL1-CP2, PL2-CP2) under the kind `dosing-controller`, with only the asset id new, or should it get a kind and code of its own?
7. Is SP1 the right code for the new sample point node (PL1-SP1, PL2-SP1)?
8. Should the Lounge's Trio start in AUTO, like the Olympic's, or in HAND?
9. May the Lounge's annunciator grow to 24 windows and the Olympic's to 30, with the windows listed above?
10. Should the annunciators' chlorine and pH windows read the Trio's analyser rather than the pool's true water, so a frozen sample hides drift?
11. Do the Trios supersede mission 105's CX-7 and DC-1 pair for these two rooms, leaving those in dev44 and the museum halls?
12. Should the Jacuzzi and the Footbath have no Aqualis cabinet, their packaged cabinets keeping their own dosing, or would you like a Consultant in the Jacuzzi's room?
13. Should the Trio's PWTAG targets (1.2 mg/l in 1.0 to 1.5, pH 7.3 in 7.2 to 7.4) replace `water-treatment.ts`'s 1.3 at the sample, so the pools run a little lower?
14. Should saves be migrated to the new world (recommended), or thrown away as the network changes?
