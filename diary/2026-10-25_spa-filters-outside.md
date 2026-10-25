# Development Diary Entry - 2026-10-25

## Context
- **Date**: 2026-10-25
- **Branch**: feature/spa-filter-world-state (after 7c02e8e and 7c905b6 on main)
- **Contributors**: Claude Code + User

## Problem Statement
The owner asked for the parts in the jacuzzi and foot spa cabinets that did nothing to be taken out, then for the sand filters to stand outside both cabinets, keeping the cabinets small (controls, pump, UV, heat exchanger, dosing, blower), and for the redesign of both plant rooms to be finished.

## Our Approach
Take out the jacuzzi's disconnected surge vessel and the old cartridge filter; put each filter in its room's schematic (a node, three links, two hand isolating valves) so the drawing follows the model; give the filter one geometry shared by its drawing and its ports; route its pipes with the cabinet's rules; then move the filters' state into the world so the plant rooms' filters work, not only the dev trials'.

## Implementation
Main: the jacuzzi's suction now runs low to its pump (7c02e8e); the filters stand outside (7c905b6), the jacuzzi's Ø0.6 m in the room's south-west corner facing north, the foot spa's Ø0.5 m north of its cabinet. On the branch: `spaFilters` in the world (version 29), stepped by the spa's circulation or the wash's own pump flow; a wash holds back the spa's flow; world bindings for the cabinets' displays and MODE, and for the standing filters' gauge, sight glass and servo; a world scenario test.

## Outcomes
The first placement put the jacuzzi's filter on top of its balance tank, which is not a layout item; the corner placement then faced its inlet into a wall and the router could not reach it, so it was turned to face north. Filter runs had to clear the heating lanes and each other: lanes beyond the heating's, the nearer union's run inside and lower.

## Next Steps
The wash's water is not yet taken from the spa's water balance; the filter's dirt does not yet come from the water's condition (prompt 070's world stage).
