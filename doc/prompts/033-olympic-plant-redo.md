# 033: The Olympic plant room's redo

Status: stage 1 (the empty building) done 2026-10-23; stage 2 begun with a 2D plan (`src/toolkit/gallery/logic/olympic-plan.ts`, drawn as `doc/plans/olympic-plant-room.svg` by `olympic-plan-svg.ts`); stage 3 to do.

The owner, 2026-10-23, once the balance tank had its own hall (Dev28, prompt 032): keep the large plant room, clear it out, and reinstall what the new equipment needs, laid out with the pipeline (sizer, placement, plumber, router, scorer: `doc/room-layout-guide.md`). The original room was laid out by hand two days before those tools existed; it is kept as `retired0`, so it need not be compared or preserved.

## The walls' roles (the plant rooms' new default)

Each wall of a pool's plant room is the way to one place, and every line leaves by the wall of the place it goes to:

- **North: the pool.** The plant room door at deck level onto the landing; the treated water's return to the pool. (The pool's overflow and main drains now fall straight to the balance tank hall, not through the plant room.)
- **South: the main plant (the hub).** The equipment doors; the heating flow and return, backwash and drainage to waste, the make-up main, the dosing chemicals.
- **West: the balance tank hall.** The equipment doors, in the north half of the wall, just south of the filter battery's strip; the pumps' suctions from the tank, and the make-up out to it.
- **East: power and control.** The supply and the control bus come in by the east wall.

## The stages

1. **The building (done).** `plant_pool_02` is an empty large hall (22 m square, two storeys) with its three doorways: north to the Olympic pool, west to the balance tank hall (the standard equipment doors, `plantRoomPlan(size, { tankHall: true })`, moved south of the filter battery's strip once the owner chose that arrangement), south to the main plant. Its hand placement and pipework, its 21 registered valves and its 15 machine asset IDs are removed; an old save's states for those valves fall away on loading (`fillDefaults`). Until the balance tank hall is part of the building, its doors open onto a dark lobby.
2. **Placement and routing.** The owner's arrangement (2026-10-23): the five 3 m round filters kept, in one line along the north wall as a battery, facing south, on common inlet, outlet and backwash headers along its front (each with its five-valve face pipework, Dev26); the west doors moved south, just clear of the battery's strip (`NORTH_BATTERY`), so the line runs from near the west wall to the stair with 0.6 m between the filters; all the pumps against the west wall beside the doors, their suctions short through it into the balance tank. Treatment (ozone contact, UV, heat exchanger) in the middle and east, back out north to the pool; backwash and drainage south to the main plant in a floor channel. In general: The Olympic's machines without the tank (duty and standby pumps, five 3 m sand filters, the ozone contact tank and generator, the UV unit, the heat exchanger, the local control panel, the dosing), placed by the pipeline in the room's real box. The owner: all the pumps against the west wall, with short runs through it into the balance tank. Then the schematic, the plumber's fittings and the router's pipes, each line ending at its wall by the roles above; scored, every gate passed.
3. **Installation.** The machines and pipes drawn in the room, with new permanent valve and asset identities; the supply wall moved east (`SUPPLY_WALLS`).
