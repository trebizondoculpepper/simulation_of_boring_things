# Development Diary Entry - 2026-10-22

## Context

- **Date**: 2026-10-22 01:00 UTC
- **Branch**: main
- **Commit**: after 9543847
- **Contributors**: Claude Code + User, and a second session working on room services, tees and the boiler house in the same checkout

## Problem Statement

The owner wanted every room's machines placed, with room to walk to and reach them all. Then they wanted the rooms piped and wired, starting with the simplest (the footbath and jacuzzi plant rooms) and working up to the Olympic plant room, the most complex in the game. The rules were that pipes may vanish into the floor or ceiling, and drains into a super-sewer. They also asked an experiment: shut off the water supply, and do the pools drain?

## Our Approach

- **Placing machines:** the layout is pure logic (`room-equipment.ts`). Most rooms pack their machines against walls, west wall first; the Olympic and footbath rooms are laid out by hand. Tests walk a 10 cm grid at a walker's width from the door to the front of every machine, panel, valve and isolator.
- **Ports:** machines show ports, not pipework. `machine-ports.ts` is the one source of truth, and the nozzles are drawn from it. Routing belongs to the room (`room-pipes.ts`, `cabinet-pipes.ts`), port to port, each service at its own height.
- **Clash tests:** tests check that runs are square, that no run meets another but at its tees, that none passes through a machine or a doorway below its head, and that the north and south rule holds. Clashes the tests missed were found in the owner's renders, and each became a test.

## Implementation

- **Machines in every room:**
  - the development rooms' working models where they fit;
  - a tank helper drawing real GRP sectional tanks at any panel count, and upright vessels;
  - a placeholder helper for anything without a model yet.
- **Rooms resized:**
  - the Olympic balance tank is taller and smaller in plan;
  - the large and medium plant rooms are 8 m tall;
  - the acid store is 5 × 5 m.
- **Cabinet rooms:**
  - the spa's water goes north; lagged heating and the supply come from the south;
  - the drain falls into a tundish on a floor gully;
  - a working isolator on the wall interlocks the cabinet's power;
  - fire collars or sleeves at every wall crossing, and BS 1710 bands and labels on every run.
- **Olympic room:** the whole water loop is piped.
  - suction from the tank's floor through a duct to the pumps' suction header; the pumps' discharge header;
  - the filter battery's inlet and outlet headers, branches and valves, with chain wheels on the out-of-reach inlet valves, and backwash into grated floor channels;
  - then the heat exchanger, the ozone contact tank, the UV and the return north;
  - heating, make-up, dosing and chemical supplies from the stores;
  - isolators on stands for the pumps, UV and ozone;
  - the tank's drain.
- **Pipe helpers:** pipe markings (`pipe-markers.ts`) and supports (`pipe-supports.ts`): hangers overhead, stands low down.
- **Switch room:** its switchgear stands flush to the walls, with 300 mm trunking into the walls.
- **The experiment** is a tested water-balance model (`src/game/water/water-balance.ts`).

## Outcomes

- **The experiment.** With the make-up shut off, the Olympic balance tank falls about 29 m³ a day, and the pumps trip on day 4. The main drains then run on into the tank by gravity and it overflows to waste. After 60 days the pool is 376 mm below its lip, and from then on it falls only by evaporation, about 3 mm a day.
- **Bugs the tests caught:**
  - a rounding error that sent filter branches sideways;
  - port data that ignored the exhibits' shifts (UV, heat exchanger, pumps);
  - nozzles floating off the curved shell;
  - a tank suction port in mid-air;
  - an isolator inside a wall.
- **Working with two sessions.** They collided several times on the same files. Reading each file immediately before editing it, and dividing the work, kept either from losing the other's.

## Next Steps

- Isolators to switch their machines through the services model's feeders.
- Tees drawn as tees once the pipe helper has them.
- The lounge plant room laid out by hand and piped like the Olympic.
- The water balance in the world state, so the make-up valve in the wet hall drives it.
- The independent review, `doc/prompts/004-machine-ports-check.md`.
