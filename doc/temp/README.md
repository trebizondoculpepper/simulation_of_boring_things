# Museum floor plan, for redesign

The museum as it stands (2026-10-30), exported from `src/toolkit/gallery/logic/museum-plan.ts` for the owner to rearrange in a CAD or drawing program. The staggered archways and screen walls tried that day were reverted; this is the layout before them.

Each room (Halls 0 to 9 and the courtyard) is one object, drawn about its own middle, so it can be dragged and placed whole. No doorways are drawn: they will be inferred from where the rearranged rooms meet.

- `museum-floor-plan.dxf`: DXF R12, ASCII. Each room is a block (`HALL_0` … `HALL_9`, `COURTYARD`) inserted once at its middle; move a room by moving its insert. Opens in LibreCAD, QCAD, FreeCAD, AutoCAD, Inkscape and Blender (File › Import › AutoCAD DXF). One drawing unit is one metre.
- `museum-floor-plan.svg`: the same, each room a group (`<g id="HALL_3">`) placed by a translate, for Inkscape, Figma or a browser.

North is up (the plan's z runs south, so the drawing's y is −z). The origin is the middle of the building. The street is to the south.

What each room holds:

- `WALLS`: the 0.6 m brick wall's outer and inner faces.
- `WALL_LINES`: the middle of its walls (dashed), the line two rooms share when they meet.
- `COLUMNS`: the cast-iron columns' bases (0.44 m square), where it has them.
- `LABELS`: its number, title and size.

Hand back the edited file and the plan module will be rebuilt from where each room's insert (or group) ends up, and any rooms resized.

## Layout C (2026-10-30)

The owner's layout B (`museum-floor-plan_B.dxf`: the halls pulled apart round the ring, Halls 3 and 9 turned to stand long north–south, the joins sketched) made formal, in `museum-floor-plan_C.dxf` (and `.svg`, `.png`). Each hall is a block, and the corridors are ten placements of one block. The courtyard is gone: it was never a space, only the middle of the ring.

The rules:

- Neighbours round the ring are staggered by 5 m: along each side the halls alternate between standing out and standing in, so between any two neighbours one stands 5 m further out than the other.
- Every pair of neighbours is joined by one L-shaped corridor with a single 90° bend, and every corridor runs round the outside of the ring (north of the top row, east of the right column, south of the bottom row, west of the left). It leaves the hall that stands in through its outside wall, goes out 1.8 m, turns, and runs along into the side wall of the hall that stands out, in the part of it that stands proud.
- Every corridor is the same object, one block (`CORRIDOR`): from its door it runs 2.4 m out to the bend (to the corridor's middle line), turns, and runs 5.4 m into the next hall's wall. Drawn as a right turn; the left turns are the same block mirrored (an x scale of −1), and each is placed by its door and a rotation.
- Corridors follow the corridor template: 1.2 m clear, walls 0.3 m. Halls keep their sizes and 0.6 m walls; doorways are 1.2 m, each 1.8 m from its wall's corner.
- Halls stand 3 m apart, outer face to outer face.

Why no hall can see another: a straight line through an L-shaped corridor must cut its inside corner unless the product of its two legs (measured from the inside corner) is at most the square of its width. Here the legs are 1.8 m and 4.8 m (8.6 against 1.44), so every view from one hall into the next is blocked by the bend, and halls have no other openings. The script checks this for every corridor, and checks that no corridor crosses a hall or another corridor.

The whole is 82.8 × 61.2 m (wall lines). The ring runs in the halls' order, 0 to 9 (layout B had Halls 3 and 4 the other way round; the owner, 2026-10-30: put them back). Hall 3 stands out at the top, as in layout B, and Hall 0, the welcome, stands out onto the street; so Hall 9 stands in, reaching into the middle of the ring. (Which halls stand out is a choice of two: the other has Hall 3 standing in and Hall 9 out. Not both, with ten halls alternating round the ring.) Four corridors are right turns and six left.

`plan_c_layout.py` works out the layout and checks it (`python3 plan_c_layout.py plan.json`); `plan_c_draw.py plan` (run beside its `plan.json`) draws the DXF and SVG. Change `DELTA`, `GAP`, `W` or `LEG` at the top of the first to try other proportions.
