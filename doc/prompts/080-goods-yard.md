# 080: The goods yard

Status: not started (written 2026-10-26 with the owner; moved out of [073](073-loading-dock-layout.md), which it follows).

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first; its rules apply.

## The request

The owner, 2026-10-26: outside the loading dock, a new zone, the goods yard, where the delivery lorries back up to the dock (rear ends only) and where both hookup points stand at ground level: a tanker discharges by hose at ground level, and a generator's cables need never enter the building. Keep it rough, as 073: blocking-out components to refine later.

## What goes in it

- **Its own room in the plan,** joined to the dock by the small personnel door 073 puts in the pier between the two shutters; the door opens onto steps with a handrail down to the tarmac, about 1.2 m below the dock floor (the levels as 073's plan states them).
- **Tarmac as far as the eye can see,** under the standard sky dome, plain overcast only (time of day and the other skies are a mission of their own). No buildings.
- **The end of the universe:** the walker may go no further than a circle about 50 m across centred on the foot of the steps. In the pool rooms' fiction the roadways beyond are another plane of existence entirely.
- **Both hookup points on the outside wall, at yard level,** either side of the pier door, where each driver stands beside the lorry, never between lorry and wall:
  - **one chemical fill cabinet** to the left of the door, by the chemical lorry, keeping one of the dock's old fill cabinets' asset IDs (say which): lockable, holding both inlets, acid and hypochlorite, on couplings of different types and sizes so neither hose fits the other's inlet, each colour-coded and labelled; the two kept segregated within it, each with its own spill containment and no shared drain (HSG179). Its lines are 073's, through the wall. Worked in [076](076-chemical-delivery.md).
  - **one generator connection cabinet** to the right of the door, by the power lorry, keeping the switch room's old `generator-point` asset ID (its model node moved from the switch-room schematic): a heavy steel cabinet with a door that opens, inside it terminals for the three phases and earth (a neutral to be settled in 077); its cable is 073's, through the wall. Worked in [077](077-generator-hook-up.md).
- **Placeholder lorries, both in place, backed up at their bays:** a chemical tanker at the left bay and a flatbed with a containerised generator at the right, each a rough block of a lorry's shape, its rear at its bay's leveller. Movable components: the yard and the dock must read correctly with either bay empty. They come and go in [074](074-delivery-lorries.md).

## Not in this mission

The lorries arriving and leaving (074); connecting and filling (076); connecting the generator (077); yard lighting, markings and the like, later.

## Done when

- Through the pier door, down the steps, into the yard: tarmac and overcast sky, the walker held within the 50 m circle, and back up into the dock.
- Both cabinets stand either side of the door, in the model and drawn from it, their doors opening; the dock's old fill cabinets and the switch room's generator connection are gone, their asset IDs carried here.
- Both placeholder lorries stand at their bays; the yard and dock are still correct with them taken away.
- Checked in the game; the five checks pass.
