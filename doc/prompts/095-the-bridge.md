# 095: The bridge becomes the control room

Status: under way (2026-10-27): stage 1 done, the bridge a game room off the main corridor (`?room=bridge`), the old control room retired and kept by its URL (`?room=control_room`); next, the panels wired. Written 2026-10-27 from the owner's request.

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first, then missions [092](092-control-room-2010s.md) (the grand control room and its dev rooms dev45 and dev46) and [093](093-bridge-widget-kit.md) (the ui2d kit, the touch surfaces, dev47 and dev48's 69 panels reimagined), and [the Central Control research](../research/central-control-console.md). Markdown is one paragraph per line.

## The request

The owner, 2026-10-27, of dev48's reimagined panels: "These are cool. So do you think you can try and get some of them installed into the Star Trek Bridge dev room and try to wire them up now to the real world simulation model ... In fact, actually, why don't we wire this in as the real replacement control room? Let's back up the old control room, or just disconnect it, and we'll just call this room the bridge."

## The owner's rulings this carries

- The control room is replaced by **the bridge**: dev46's room (the 8 m stair, the heptagon, the stage, the starship finish) with the 24th-century touch panels, wired to the one world state. The touch screens are the bridge's own kind of interface (the archetype in `doc/design/control-interface-archetypes.md`); this is the owner's ruling for this room, the plant rooms keeping their single-purpose instruments.
- The old control room is kept, disconnected: no longer reached from the corridor, its layout and models kept (retired, as `retired-rooms.ts` keeps rooms, or reachable as a dev room by URL), so it can be restored.

## The work

1. **The room:** a game room `bridge`, built from dev46's geometry and finish (the shared builder), reached from the main corridor's door where `control_room` was (`CORRIDOR_DOORS` in `main-corridor.ts`, the room links, titles and signs), its stair hall's door being that doorway. The old `control_room` retired: its door gone from the corridor, its room kept as above. Saves: if anything in the world names the control room (the CCTV, alarms printer, mimics' copies), carry it over or migrate (`WORLD_VERSION` and a migration only if the world's shape changes).
2. **The panels, wired:** the control room's panels and mimics reimagined from dev48's specifications (`parody-specs.ts`), each now reading and acting on the world exactly as its original does (the same world reads and the same actions the original's view uses: the mimics' OPEN and SHUT and START and STOP, the annunciator's ACCEPT and RESET, the readings, the stocks), placed round the bridge's walls and at its system stations (circulation and filtration, chemical dosing, heating, air handling, power, building). Local-only controls (`CLAUDE.md`: mode selectors, trip resets) shown but refused here (a deny bleep and a "LOCAL CONTROL ONLY" message), as the control room's boards refuse them now.
3. **Central Control,** the operator's console, from the research's list as far as the model goes today: the time and whether open, water quality per pool, bathers per pool against the limit, the alarm summary with ACCEPT, the fire alarm's state, pumps and filters, power, chemical stocks; the items not yet modelled (pool emergency alarm, dosing stop, PA) shown as placeholders and listed in `TODO.md`.
4. **The main viewscreen:** a live overview from the world (an animated schematic of the main pool circuit, or the alarm list when an alarm is up) for now; the full modes are mission 093's stage 2.
5. **Checks:** the game's tests (world-in-model: every panel bound to the world or decorative), the layout tests, the corridor door and room handover, frame time in the room (redraw only on change), screenshots of the room and of a panel before and after a command that changes the world (a pump started from the bridge, seen running in its plant room).

## Acceptance

- The corridor's control room door leads up the stair to the bridge; the old control room is no longer reachable from the corridor but kept.
- The bridge's panels show the live world and their commands change it, local-only controls refused.
- Central Control shows what the model has; the gaps are in `TODO.md`.
