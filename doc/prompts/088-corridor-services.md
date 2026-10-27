# 088: Services through the corridors, as decoration

Status: to do (written 2026-10-27 from the owner's request). Stage 1, the research, started the same day; its findings go to `doc/research/corridor-services.md`. Stage 2, the plumbing, waits on it.

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first; its rules apply. Markdown is one paragraph per line.

## The request

The owner, 2026-10-27: put in the pipes that run between the wet hall (the main plant room) and the plant rooms, and the stores, through the corridors. A decorative layer: no valves up there, nothing worked, but the numbers, quantities and sizes of the pipes plausible given what the game world already establishes. The building does not exist in one consistent three-dimensional space (the pool loop, `CLAUDE.md`), so where a pipe leaves one room and enters the next can only be approximately right; the aim is the impression of realism. A detail for realism, to be updated now and then as the plant grows.

## Ring mains

The owner, 2026-10-27: the ring corridor carries ring mains, so not every service is routed point to point. A heating flow and return ring round the corridor from the boiler house, each plant room teeing off it nearest; an electrical ring (a busbar or cable tray ring) from the switch room, likewise; and more where they make sense (a make-up water ring, a compressed air or control cable ring, say). This explains why the rooms' heating and power do not each run their own line all the way. Still decorative: no valves or state on the rings, but each tee-off where a room takes its supply, and each ring plausibly sized for what it serves.

## Stage 1: research (what runs where)

From the game's own model, list every service that must pass between rooms through the corridors, and say, approximately, in which corridor segments each runs. For each: what it carries, from where to where, its material and size (from what the rooms already draw at their walls: the wet hall's plumber `wet-hall-plumbing.ts` and its boundary stubs, the stores' `store-plumbing.ts`, the plant rooms' `day-tank-plumbing.ts`, `room-pipes.ts`, `olympic-plumbing.ts`, the schematics' boundary nodes in `schematics.ts` and `schematic-parts.ts`, and the electrical model's feeders), its direction of flow, whether it is double-contained, and what marking it carries (BS 1710 and the Safety Signs Regulations, as `pipe-marker.ts` already draws for chemicals; water, heating, make-up, drainage, gas and electrical identification likewise). Decide which services are ring mains and which run point to point, and size each ring for everything it feeds. Include at least: the hypochlorite and acid mains from the stores to the wet hall and the eight branches from the selectors to the four plant rooms (plan 085); the boosted make-up main and the backwash main between the wet hall and the plant rooms; heating flow and return from the boiler house; power feeders from the switch room; anything else the model shows leaving a room. Then the corridors: their segments (`facility-plan.ts`, the corridor kit, the main ring corridor, the pool loop's corridors), and for each segment which services pass along it, in what order on its brackets or tray (high on one wall, heavier and wetter lower, electrical apart from wet services, chemicals below and away from electrics), at what heights, and where they turn into or out of a room's wall, approximately. Note the signage the corridors need: pipe markers and flow arrows at intervals and at every wall penetration, fire-stopping collars where plastic pipes pass through walls, and any warning signs (chemical lines overhead). Write it as `doc/research/corridor-services.md`, with a table per corridor segment. Flag every guess as a guess.

## Stage 2: decorative plumbing

Lay the pipes the research lists along the corridors as a static set-decoration layer (as `CLAUDE.md` allows the services ceiling to be): straight runs on brackets or a tray at the researched heights, turning up into the ceiling or into a wall where the research says they leave, each to its size and colour, each marked to its service with its flow arrows and fire collars at walls. No valves, no state, nothing bound to the plant model: mark it decorative (`markComponent(..., { decorative: true })` or as the services ceiling does), so the world-in-model checks pass. Keep walkways clear (nothing below headroom across a walk), and keep it cheap to draw (merged geometry). A pure layout function (`logic/`, tested) that turns the research's table into runs per corridor segment, and a view that draws them; tests that every service listed appears in the segments the research names, and that no run drops below headroom.

## Acceptance

- `doc/research/corridor-services.md` exists, lists every inter-room service from the model with its route, size, material, flow and marking, and every guess is flagged.
- The corridors show those services, plausibly sized, marked and fire-collared, never below headroom, all decorative.
- `TODO.md`'s entry for 088 is ticked off stage by stage.
