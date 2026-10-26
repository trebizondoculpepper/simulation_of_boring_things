# 074: Delivery lorries that come and go

Status: incomplete, for planning (opened 2026-10-26 with the owner, from [073](073-loading-dock-layout.md)). Not ready to start: the questions below are to be settled with the owner first.

## The idea

The lorries in the loading dock are not always there (the owner, 2026-10-26): the chemical tanker comes only when chemicals are ordered, and the generator lorry only when there is a power failure. Each lorry is a movable component, present or absent in the world, reversing into its lane through its open shutter and leaving again. 073 put rough placeholder blocks in both lanes; this mission makes the lorries real and their comings and goings part of the world state.

## To settle

- What brings a lorry and what sends it away, before ordering (078) and a mains failure (079) exist: a console command, a dev switch?
- How a lorry arrives: seen reversing in, or simply there when the player comes to the dock?
- How detailed the lorries become, and their makers (the brands rule).
- Other deliveries (engineering supplies, pallets) by other vehicles in the left lane?
- What the world saves of a lorry, and the save migration.
