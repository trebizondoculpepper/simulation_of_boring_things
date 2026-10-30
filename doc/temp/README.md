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
