# Development Diary Entry - 2026-10-25

## Context

- **Date**: 2026-10-25 01:55 to 02:50 UTC
- **Branch**: main
- **Commits**: 3faa794 (devlogs folder renamed), 1886f49 (prompt 060), 5bd25b3 (prompt 061 stage 1), 77e6a53 (063 renumbered), 4b17b50 (descriptions from the enhanced network only), and a last commit of small fixes
- **Contributors**: Claude Code + the owner (answering overnight)

## Problem Statement

The owner, going to bed, asked for the misspelled `doc/dvevlogs` to be renamed, and for missions 060 (inferred component descriptions) and 061 (the component information overlay) to be read, checked and implemented, with anything left over written up as a remediation mission.

## Our Approach

Mission 060 first, as the data layer: one description per component for the inventory, the manual and the console's `status`; then 061's stage 1, the overlay naming what the player aims at, on dev0 and in the plant rooms. The one question asked up front was how to settle the lounge's BV1 conflict between the drawing and the legacy plant network (the owner chose to change the network).

## Implementation

- Descriptions (`component-descriptions.ts`, `component-status.ts`, `equipment-kinds.ts`): a valve "Isolates … flowing from … to …", a switch-fuse "Isolates power for …", other equipment "1st Pump in PL2, currently Off", status from the world, ordinals per room and kind, one finite list of kinds with their wording.
- The overlay: pure timing in `controls/logic/inspection.ts`; `first-person.ts` asks an `inspect(x, y)` option ten times a second; scene builders mark components (`component-identity.ts`); `inspect-pick.ts` picks the first surface and its nearest marked owner; `component-inspection.ts` gives the two lines.
- Picking first took 11 ms a pick in the Olympic plant room, nearly all of it the services ceiling's few merged meshes of 20,000 to 61,000 triangles, whose bounding spheres the aim always crosses. Culling by bounding box entered within reach brought it to about 3 ms.
- The lounge's pump set printed the Olympic's pump tags; it now prints its own.

## Outcomes

- The first build of 060 recorded each valve's ends by hand in its register, with an endpoint table and a cross-check against the legacy network. While it was running the owner ruled, in a series of messages, that the model is the source of truth; that the model is the plumber's enhanced network, the port graph of the world, which nothing may exist outside; that nothing may be hand-written or worked out by an LLM; and that tags are hierarchical (PL2-P1-P1). The hand-recorded ends, the endpoint table, the cross-check and the change to the legacy network were all removed again. Valve routes now come from the Olympic plant room's enhanced network, the only room built through the plumber, their words derived from its nodes ("from the filters and the heat exchanger to the ozone contact tank"). Every other room's valves show their tag and name only until their rooms are built through the plumber.
- Verified in Chrome: PL2-F1-V1's derived line, PL3-BT1's live level, P-101A going Off and On under a still pointer, walls clearing the line, dev0's controls by name.
- Another agent was working in the same checkout (the engineers' office), so every commit staged only this session's files and hunks; one rebase's autostash had to be put back by hand.
- Prompt 062 had been taken minutes earlier (the HUD declutter), so the remediation mission is 063.

## What we learned

- Ask what "the model" is before building on one: this codebase has several (the legacy `PLANT_NETWORK`, the identified block tree, the world state, the plumber's expansions), and the owner's answer was the plumber's enhanced network.
- A raycast's cost is in the few huge merged meshes, not in the number of meshes.

## Next Steps

Prompt 063: build the jacuzzi plant room (then the lounge, footbath, wet hall and boiler house) through the plumber; put the Olympic's pump discharge valves and regulating valve on its enhanced network and derive its tags; decide what persists when the registers are derived; decide the legacy network's fate; the remaining browser checks for 061's stage 1, then stage 2.
