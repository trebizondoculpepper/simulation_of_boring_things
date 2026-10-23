# Prompt: component variants, port heights, and gas detectors

Written by Claude (Opus 5.5, Claude Code), 2026-10-23, for its own work. Read `AGENTS.md`, then prompts 017 (the room's layers), 020 (scorers, blocks) and 021 (the router).

## Component variants (the owner, 2026-10-23)

Some components come in variants, and the layout should be free to choose among them, the way it chooses a battery's make-up (`unit-blocks.ts`, `block-layout.ts`):

- **Kind of unit.** A pool heat exchanger can be shell-and-tube or plate:
  - shell-and-tube (`shell-tube-exchanger.ts`): pool water straight through its ends, heating on top;
  - plate: all four ports on the fixed frame, at its corners, and room to open its movable end.
- **Mounting.** A unit can stand on a plinth, a stand, a wall bracket, or straight on the floor. Each sets its ports' heights and its footprint.
- **Ports kept off the floor.** A port close to the ground limits routing, because a line can only leave it sideways or upwards through the machine's own clutter. The placement scorer prefers ports at a working height (about 0.5 to 1.8 m) and marks down any below about 0.3 m.

### How

- **Each kind may list variants.** Each variant has its own size, ports, withdrawal space, site and price. The price covers the unit and its mounting: a plinth is cheap (an estimate), a stand dearer, a wall bracket dearer still where it must carry the weight.
- **Placement tries the variants of each component** (all combinations, up to a limit), as `layoutWithBlocks` tries make-ups. The placement scorer picks.
- **A new placement-scorer dimension, port heights:** the share of ports, weighted by their pipe's price, at a working height.
- **The plumber and the simulation see the chosen variant's ports.** The model's port names stay the same across variants, so the graph does not change.

## Gas detectors (the owner, 2026-10-23)

A gas detector is a real working component: it reads the gas's concentration from the simulation, alarms, and reports on the control bus.

- **A chlorine detector** goes near each chlorine source:
  - a hypochlorite store, a dosing pump set, a chlorinator, or a chlorine gas store if there is one;
  - preferably fixed to a wall;
  - with its control bus stub (`control-bus.ts`).
- **An ozone detector** goes within a maximum distance of each ozone source (the ozone generator, its contact or deozonising vessel). It too is preferably on a wall, with a control bus stub.
- **Both near ground level.** Chlorine is about 2.5 times as dense as air and ozone about 1.7 times, so both gather low down. Mount them at about 0.3 to 0.5 m above the floor.
  - On a wall where a wall is within reach of the source.
  - Otherwise on a post beside the source.
- **Distances to confirm** against the detector makers' guidance and HSG179 before relying on them. Working figures until then:
  - within 2 m of a chlorine source;
  - within 3 m of an ozone source.
- **Placement rules:**
  - a detector is a wall item (`site: 'wall'`), tied to its source by a maximum distance;
  - placement's cost charges for distance beyond the limit as a breach;
  - with no wall within the limit, the detector becomes a post item beside the source.
- **The scorer gates on it:** every chlorine and ozone source has a detector within its limit, and every detector is on the control bus.

## Order of work

1. Variants: the data shape, the heat exchanger's two variants (shell-and-tube on a plinth, plate on the floor with its ports at its frame's corners), and placement trying them, scored by port heights. Dev19 picks one.
2. Detectors: the component (a real working detector), the rules, the gate. Tested where there are sources: the pool plant rooms and the chemical stores. Dev19 has none, unless its treatment cabinet counts.

## Checks and rules

As in prompts 017 to 021: pure tests beside the logic; the five checks before every commit; named files only; changelog; one paragraph per line.
