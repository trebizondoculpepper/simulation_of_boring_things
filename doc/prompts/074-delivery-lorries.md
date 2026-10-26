# 074: Delivery lorries that come and go

Status: incomplete, for planning (opened 2026-10-26 with the owner, from [073](073-loading-dock-layout.md)). Not ready to start: the questions below are to be settled with the owner first.

## The idea

The lorries in the loading dock are not always there (the owner, 2026-10-26): the chemical tanker comes only when chemicals are ordered, and the generator lorry only when there is a power failure. Each lorry is a movable component, present or absent in the world, backing up to its bay from the goods yard, only its rear end at the building (073), and leaving again. 073 put rough placeholder blocks at both bays; this mission makes the lorries real and their comings and goings part of the world state.

## To settle

- What brings a lorry and what sends it away, before ordering (078) and a mains failure (079) exist: a console command, a dev switch?
- How a lorry arrives: seen reversing in, or simply there when the player comes to the dock?
- How detailed the lorries become, and their makers (the brands rule).
- Other deliveries (engineering supplies, pallets) by other vehicles in the left lane?
- What the world saves of a lorry, and the save migration.

## A second opinion (Codex, 2026-10-26; not yet adopted)

- Choose a specific tanker and generator-transport configuration: length, width, height, hose or cable side, reversing envelope in the yard. Wheel chocks or a vehicle restraint, and a driver-safe state before any transfer (HSG136: drive-away and vehicle creep).
- In the world: presence, bay, moving or parked, chocked, what it carries. Refuse arrival at a closed shutter, and departure while a hose, cable or leveller is still engaged; check after reload.
- A developer control until 078 and 079 supply the triggers, then the same arrival action from them; arriving between visits is smaller than animated reversing.
- Question: acid and hypochlorite by separate dedicated tankers, or separate compartments of one (HSG179 requires effective segregation)?
