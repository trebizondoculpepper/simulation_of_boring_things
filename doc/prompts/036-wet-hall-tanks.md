# 036: The wet hall's tanks, as built

Status: planned for the later wet hall redesign; not started. Prompt 035 is a reference for the tank hall's construction and world binding, not a prerequisite.

## Readiness check (2026-10-26)

**Decision: ready for design and dev-room prototypes; live installation is deferred until the owner redesigns the wet hall.** The unfinished items in prompt 035 do not block this work. The Olympic concrete tank hall and its world binding already provide the parts and approach needed for the new tanks.

**Available foundations:** the Olympic concrete tank hall (`src/toolkit/gallery/rooms/plant/balance-tank-hall.ts`) and its world binding provide a pattern; the wet hall already has a schematic (`src/game/plant/wet-hall-schematic.ts`), a 13.2 m³ break tank and 29.5 m³ backwash holding volume in its simulation (`src/game/plant/wet-hall.ts`), and working equipment registration. These make a dev-room prototype feasible without changing the live rooms.

**Work to include in that redesign:** replace the wet hall's currently sectional 3 × 2 × 2 m backwash tank view with a concrete pit sized to its 29.5 m³ model, keeping its pump, level instruments, ports, valves and mimic tied to the same world state. Keep the Category 5 break tank sectional GRP. Replace the Lounge pool's currently sectional GRP balance tank with a smaller concrete hall connected to its plant room and existing pool balance state. Keep the spa and footbath packaged tanks. Prototype each new construction in a dev room first, then verify the installed geometry, access, registration and live readings against its schematic and world state.

The owner, 2026-10-23: each pool was given its own balance tank, as steel or fibreglass upstanding tanks, before the Olympic's cast concrete tank hall (prompt 032) showed what a large pool's tank usually is. Where there is room, as there is, the wet hall core and the other pools should have their tanks built as a real leisure centre's would be.

## What each tank should be

- **The break tank (make-up): stays sectional GRP.** It holds mains drinking water behind the Category 5 air gap, so it must be of approved materials, sealed, insulated, inspectable and cleanable (the water regulations, Legionella control): not concrete.
- **The backwash holding tank: cast concrete, below ground.** It takes the filters' dirty backwash water quickly and lets it out to the sewer slowly, at the consented rate (the Olympic alone sends about 30 m³ to drain per backwash). A concrete pit with a settlement sump, a discharge pump, a gantry, a ladder and level instruments, built from the balance tank hall's components (Dev28: board-marked concrete, gratings, the stainless ladder, float switches, the ultrasonic level transmitter, the staff gauge, the lifebuoy).
- **The Lounge (learner) pool's balance tank: cast concrete.** At 90 m³/h a concrete tank under the surround is usual: a smaller hall of the Olympic's pattern, entered from its plant room.
- **The spa's and the footbath's: packaged GRP or steel, as now.**

Each pool keeps its own tank, as the owner first designed it: that is standard practice, the pools running at different temperatures and treatment.

## Order of work

Model each new tank in a dev room first. Install the tanks when the owner takes up the wet hall redesign, joined to the world's water model as the Olympic's tank is (prompt 035, item 2).
