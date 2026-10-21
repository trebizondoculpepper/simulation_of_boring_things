# Development Diary Entry - 2026-10-21

## Context

- **Date**: 2026-10-21, 12:00 to 15:30 UTC
- **Branch**: main
- **Commit**: (this commit)
- **Contributors**: Claude Code + User

## Problem Statement

Two threads. The owner kept developing the ring pool room (donut_pool_1): steel beams crossing through the column, bulkhead lights level with them, coves at every wall junction (now the default for new pool rooms), a floor deeper at the island than at the outer wall, four skylights with a low sun whose beam shadow is a feature, bare board-marked concrete above 4 m, a smaller pool, and a stainless trim where the tiles stop. Then, from photographs of an exposed office ceiling, they asked for a procedural services ceiling as background decoration: a demo room, every part reusable on its own, a table of specimens, the ceiling over dev3 (with wall lighting, since the ceiling is full) and over dev_pumps with a felt acoustic grid, flow arrows, smoke detectors on battens with red fire cable, and diffusers through the grid.

## Our Approach

The ring pool's new pieces are shared helpers where they will be reused: `room-coves.ts` (fillets, corner pieces, tile-edge trim) and `board-marked-concrete.ts` (Poly Haven's CC0 "Concrete Layers 02", credited in `CREDITS.md`). The sun angle for the beam shadow was found by a small search over directions rather than by hand.

The services ceiling is split into pure layout and views. `logic/service-ceiling.ts` lays out runs per system at its own height, rejects collisions within a layer, keeps clear of reserved areas, and places hangers and drops, all from a seed; it is tested. The views are a kit of separate parts (`service-parts.ts`) that sweep sections along runs (`service-sweep.ts`) into a sink merged by material, so each part can be built alone (`standalone`) and a ceiling costs a draw call a material. `AGENTS.md` gains a narrow exception allowing this ceiling as set decoration outside the leisure centre's plant rooms.

## Implementation

- donut_pool_1: `views/donut-pool.ts` (beams, bulkheads, sloped floor, skylights, shadow-casting sun, concrete, trim), `rooms/donut-pool-room.ts` (shadows on).
- Shared: `components/architectural/views/room-coves.ts`, `board-marked-concrete.ts`, `textures/concrete_layers_02_*`.
- Services ceiling: `components/site-dressing/logic/service-ceiling.ts` (+ test), `views/service-sweep.ts`, `service-materials.ts`, `service-parts.ts`, `service-ceiling.ts`, `service-specimens.ts`.
- Rooms: `ceiling_lab` (`views/ceiling-lab.ts`, `rooms/ceiling-lab-room.ts`; `?seed=`, `&density=`, `&acoustic=1`); dev3 raised to a 9 m deck with the ceiling, the specimen table and circuit-linked wall battens; dev_pumps under the ceiling with the felt grid, its clear height at least 4 m.

## Outcomes

- What worked: the part sink (one code path for a whole ceiling and for a single specimen); seeded layout with per-layer collision rejection, which reads as believable coordination; reserving the detector lines for the upper layers only.
- Bugs found and fixed: corner coves mirrored into place rendered black (a mirror flips a mesh inside out; they are now turned); a highly metallic trim with nothing to reflect read black; the first sun angle put the beam's shadow in the water, and the dark cross in the sunlit patch was the glazing bars.
- dev3's emergency-lighting test still passes with the deck at 9 m and the battens hung at 6.4 m.

## Next Steps

- One pipe-route system for the plant rooms and the ceiling: 3D routes with risers, spans, bore-sized elbows, and joints by material (flanges, solvent sockets, grooved couplings), tied to the plant model's connections.
- Tees and branches between runs; pipe identification labels; tile mapping round curved walls (a seam shows on the donut's island).
