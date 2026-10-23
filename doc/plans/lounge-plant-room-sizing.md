# Lounge pool plant room: sizing study

Status: the 12 × 11 × 8 m first trial is built, 2026-10-23. The shell, machine placement bounds, stair and pipe wall endpoints now use the same rectangle; all twelve machine access points and every valve are reachable in the layout tests. This is a trial of the existing hand-placed plant, not a search result from the new placement and voxel-routing pipeline. That pipeline's full clash-free scoring gate remains for a later iteration.

## Boundaries and inventory

The lounge pool is to the north of Plant Room 1 and the shared halls are to its south. Keep a deck-level entrance from the pool on the north wall and equipment access to the shared plant on the south wall. The existing room has those two wall roles, but its shell is a 12 × 12 m square and its hand-placed contents must be replanned for a rectangular shell.

`roomEquipment('plant_pool_01')` currently specifies nine floor machines and three wall-mounted dosing devices. The floor machines are a 3.1 × 2.9 m balance tank (including its ladder allowance), a 3.2 × 2.4 m duty/standby pump set, two 1.8 × 2.0 m filter envelopes, a 1.7 × 1.6 m UV unit, a 2.7 × 0.6 m local panel, a 1.5 × 0.7 m heat exchanger, a 1.6 × 0.5 m ozone generator and a 2.0 × 2.0 m contact tank. The wall devices are the 1.0 × 0.25 m dosing controller, 1.2 × 0.3 m hypochlorite pumps and 0.7 × 0.35 m acid pump. These are the game's placement envelopes, which include fittings around some machines; they differ from the bare product sizes in `doc/plans/plant-sizing.md`.

## Sizer result

Using `sizeRoom` on all twelve current items with two storeys, two doors and a gantry gives 34.9 m² of bare machine footprints; 76.7 m² with the sizer's machine gaps and working access; 26.9 m² for circulation; 4.8 m² for two door approaches; and 8.0 m² for the gantry stair and its foot. Total calculated floor is **116.4 m²**. The sizer's half-metre rounding produces an 11 × 11 m square (121 m²), a **12 × 10 m rectangle (120 m²)** at 1.2:1 aspect, or a 13 × 9 m rectangle (117 m²) at 1.5:1 aspect. The sizer gives **8 m overall height** for two storeys, including the service zone; the current medium shell is already 8 m from plant floor to roof soffit.

The former sizing table's 8.5 × 13.5 m, 3.9 m high, single-storey lounge room predates the game's two-storey landing, stair, gantry and current component envelopes. It is useful as a comparison, not the current shell specification.

## Trial envelope

Use **12 × 11 × 8 m** for the first placement and routing trial: 132 m², twelve square metres below the current 12 × 12 m shell. Then test **12 × 10 × 8 m** as the compact candidate: 120 m², a 24 m² or 17% reduction from the current shell. The 12 × 10 m candidate has only 3.6 m² over the sizer's calculated floor, so the hard score gates and a visual access check must decide whether it is viable. The 13 × 9 m candidate is more constrained in depth between the north pool approach, tank and pumps, southern treatment and equipment doors, so it is lower priority.

The generic `reserveRegions` calculation reports no abstract fit problem for 12 × 10 m with north and south doors and an east-wall gantry. Its automatic stair orientation, however, puts the stair foot across the north door approach. The actual plan must connect the north pool doorway to the upper landing and run the stair away from it, as the current room does. A zero-problem result from the generic reserver is therefore only a dimensional check, not placement approval.

The 12 × 11 m room is now the live first trial. Its equipment and pipework stay within the smaller shell and the north/south wall roles are retained. The old hand-routed filter inlets still cross their outlets in two places, so the full scorer would fail its no-clash gate; this trial is not yet an optimized final layout. The 12 × 10 m candidate still requires a separate placement and routing trial.
