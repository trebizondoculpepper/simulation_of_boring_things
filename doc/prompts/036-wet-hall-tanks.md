# 036: The wet hall's tanks, as built

Status: planning started 2026-10-26; construction and installation not started. Prompt 035 is a construction and model-binding reference, not a prerequisite.

The proposed layout and implementation method are in [the wet hall tanks plan](../plans/036-wet-hall-tanks.md) and its [scaled 2D drawing](../plans/036-wet-hall-tanks.svg). The wet hall will have two principal tanks: a protected sectional GRP clean make-up break tank and a below-floor concrete dirty backwash tank. Keep the existing west ramp, east stair and central aisle clear.

## Readiness check (2026-10-26)

**Decision: ready to implement, starting with the 2D footprint and dev-room prototype.** The unfinished items in prompt 035 do not block this work. The Olympic concrete tank hall and its world binding already provide the parts and approach needed for the new tanks.

**Available foundations:** the Olympic concrete tank hall (`src/toolkit/gallery/rooms/plant/balance-tank-hall.ts`) and its world binding provide a pattern; the wet hall already has a schematic (`src/game/plant/wet-hall-schematic.ts`), a 13.2 m³ break tank and 29.5 m³ backwash holding volume in its simulation (`src/game/plant/wet-hall.ts`), and working equipment registration. These make a dev-room prototype feasible without changing the live rooms.

**Scope of this start:** replace the wet hall's currently sectional 3 × 2 × 2 m backwash tank view with a concrete pit, keeping its pump, level instruments, ports, valves and mimic tied to the same world state. The plan proposes 40 m³ usable storage because one Olympic backwash is described as roughly 30 m³, more than the model's current 29.5 m³ capacity; verify the event size before changing the model. Keep the break tank sectional GRP, in a protected clean make-up bay. The Lounge pool's currently sectional GRP balance tank is a separate follow-on hall connected to its plant room and existing pool balance state. Keep the spa and footbath packaged tanks. Prototype the two wet-hall tanks in a dev room first, then verify installed geometry, access, registration and live readings against the schematic and world state.

**Regulatory check:** current England/Wales sources do not identify a blanket ban on these two tanks sharing a hall. This is an inference, not formal approval. The design must prevent contamination, include fluid-category-5 backflow protection at the mains connection, break the backwash discharge from the wastewater system, and meet the water and sewerage undertakers' requirements. The [plan's source table](../plans/036-wet-hall-tanks.md#uk-regulatory-check-and-design-safeguards) distinguishes law from guidance. The protected clean bay is a conservative safeguard, not a claim that a partition is explicitly prescribed by law.

The owner, 2026-10-23: each pool was given its own balance tank, as steel or fibreglass upstanding tanks, before the Olympic's cast concrete tank hall (prompt 032) showed what a large pool's tank usually is. Where there is room, as there is, the wet hall core and the other pools should have their tanks built as a real leisure centre's would be.

## What each tank should be

- **The break tank (make-up): stays sectional GRP.** The mains feeds it across a fluid-category-5 air gap; its stored water supplies pool-process make-up and should not be presented as a drinking-water outlet. Its covered, insulated, inspectable and cleanable construction limits contamination and stagnation.
- **The backwash holding tank: cast concrete, below ground.** It takes the filters' dirty backwash water quickly and lets it out to the sewer slowly, at the consented rate (the Olympic alone sends about 30 m³ to drain per backwash). A concrete pit with a settlement sump, a discharge pump, a gantry, a ladder and level instruments, built from the balance tank hall's components (Dev28: board-marked concrete, gratings, the stainless ladder, float switches, the ultrasonic level transmitter, the staff gauge, the lifebuoy).
- **The Lounge (learner) pool's balance tank: cast concrete.** At 90 m³/h a concrete tank under the surround is usual: a smaller hall of the Olympic's pattern, entered from its plant room.
- **The spa's and the footbath's: packaged GRP or steel, as now.**

Each pool keeps its own tank, as the owner first designed it: that is standard practice, the pools running at different temperatures and treatment.

## Order of work

Follow [the plan](../plans/036-wet-hall-tanks.md): make the footprint and access rules executable first, model the two wet-hall tanks and their safeguards in a dev room, then install them in the wet hall and bind them to its existing world model. Treat the Lounge balance-tank hall as a distinct follow-on after the two-tank wet-hall layout works.

## Remaining (checked 2026-10-26)

- In a dev room: a concrete backwash holding pit sized from the largest backwash event (40 m³ usable proposed), with its sump, discharge pump, gantry, guarded ladder access and level instruments, bound to the wet hall's world state.
- In the wet hall: install the two tanks from the 2D plan, checking geometry, access, registration and live readings against the schematic. The break tank stays GRP; the spa and footbath tanks stay as they are.
- Separately, prototype and install the Lounge pool's concrete balance-tank hall beside its plant room, bound to that pool's balance state.
