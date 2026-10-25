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

## Later the same day

The two gaps closed on main. A wash now uses the water balance's existing `toWaste`: the pump runs, nothing reaches the spa, its flow goes to drain from the tank and the float makes it up. Each pool carries its suspended solids (`src/game/water/solids.ts`): bathers bring 3 g an hour each, the filters keep what their beds catch, the spas' through the ideal filter's `bedPasses`, the big pools' through a fixed 90 % until their beds model it. The thermal tests then caught a real effect: a wash at the end of their 24-hour runs had just replaced half a cubic metre of the jacuzzi's water with cold make-up. The first wash now falls at 02:00, overnight, as a spa's programme would be set.

## The big pools' filters

The owner asked for plant one's and plant two's filters on the ideal filter, with a test of the full backwash on each. Their beds became `IdealFilterState`s stepped by `stepFilterBed`, fed by their pool's solids; their hydraulics keep their formulas, with their dirt scaled to the ideal bed's reference. Three findings: with bathers alone the pools cleared overnight to almost nothing, so a background load of dust per square metre went in; a never-backwashed Olympic battery now breaks through at capacity instead of choking indefinitely, so its pool clouds (the mains-off test asserts that now); and the Olympic face's backwash was under rate (133 m³/h, 19 m/h), enough to wash but not to heal fissures, so its waste main's resistance came down from 4e-4 to 7e-5 (about 180 m³/h). `ideal-backwash.test.ts` works a full cycle on each through its valves: loaded and fissured, backwash, rinse (the Olympic's V5; the lounge's settle in service), and back in service keeping the dirt.

## The cabinets' start-up

The owner asked for realism in the cabinets' power-up: stop at once on power loss with the valves springing shut, a few seconds' boot, a check of the inputs, the valves opening one after another, and a cheap beeper for coming online and for faults. `cabinet-boot.ts` is one controller for both cabinets, in the world; the jacuzzi's pump is held off through a new `ready` input rather than its supply, so its panel stays lit while it boots. Its jacuzzi tests now wait for the restart (about 9 s after a fault clears, 12 s from POWER on). The tank-drain test showed the pump hunting, tripping and restarting as the gutter's water ran back; it always had, but restarted instantly, so the test now counts trips over the run. Checked live through a new development-only console hook: off, the servos shut in 0.6 s; on, booting 3 s, checking 3 s, the four servos opening in turn, running at 13 s.

## Next Steps

The rest of the water's condition in the world (prompt 070). The trials' cabinets (dev38, dev32) have no start-up sequence yet: their benches run without one.
