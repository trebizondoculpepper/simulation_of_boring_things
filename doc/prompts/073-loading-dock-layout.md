# 073: The loading dock, laid out

Status: not started (written 2026-10-26 with the owner; revised the same day after a second opinion from Codex, and the yard moved out to [080](080-goods-yard.md)). Takes in [010](obsolete/010-loading-bay-two-lorries.md). The first of a series: [074](074-delivery-lorries.md) the lorries, [075](075-roller-shutters.md) the shutters, [076](076-chemical-delivery.md) chemical deliveries, [077](077-generator-hook-up.md) the generator hook-up, [078](078-splashonomics-ordering.md) ordering, [079](079-mains-failure.md) a mains failure, [080](080-goods-yard.md) the goods yard, [081](081-acid-supply.md) how acid is supplied.

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first; its rules apply.

## The request

The owner, 2026-10-26: the loading bay is one of the most neglected rooms in the game. It is where deliveries come and go: two lorries backed up to two bays, chemicals by tanker on the left, external power by a containerised generator on a lorry on the right. This mission lays the dock and its yard out only; what moves and what works comes in later missions. Keep everything rough: blocking-out components that scope the space and can be refined later, not detailed models.

## What there is now (checked 2026-10-26)

- **The bay** (`loading_bay`, `src/toolkit/gallery/logic/shell-rooms.ts`): 7.5 × 12 m, 7 m high, a closed shell off the main corridor (`main-corridor.ts`), with doorways east to `hypo_store` and west to `acid_store`. In it (`room-equipment.ts`): a tanker stand painted on the floor against the north wall, and two delivery fill cabinets, hypochlorite on the east wall and acid on the west. 7.5 m is too narrow for two lorry openings and their piers (Codex).
- **The stores:** `acid_store` (5 × 5 m, a 1,000 L IBC on a spill pallet) to the west, `hypo_store` (5 × 8 m, three bulk tanks, 12,000 L) to the east, each with its safety shower, spill kit, PPE cabinet and extract.
- **The generator connection** (`generator-point`) is in the switch room, on its south wall (`switch-room-schematic.ts`), a passive box (`world-bindings.ts`: "a connection box for a hired generator"); no external power is modelled. The fill cabinets and the generator point have permanent asset IDs in `installed-asset-ids.ts`.
- **The sky:** `src/scene/sky-dome.ts` (one shader: gradient, sun, clouds, stars) with the skies of `src/game/skies.ts`, overcast the default; used only by the dev courtyard.
- **An older dock model,** `src/scene/loading-bay.ts`, is still used by a separate development corridor scene (`src/rendering/plant-corridor-room.ts`). Decide whether to reuse its parts or retire that duplicate; do not build a third.

## The dock

- **Rear ends only** (the owner, 2026-10-26): the lorries back up to the dock from the yard outside; only their rear ends meet the building, their cabs stay in the open. The dock is a room inside the building's outside wall; the wall has two lorry openings, each with its roller shutter, and a pier between them.
- **Levels:** the dock's floor is the building's, at 0 m, level with the corridor and the stores; the yard's tarmac is about 1.2 m lower, so a lorry's bed meets the dock floor at its leveller (the exact height set against the chosen lorry beds and the leveller's travel). State the levels in the plan.
- **Size:** wide enough for two openings of about 3.5 m clear, the pier between them with its door, and solid wall at each end: start the study at about 12 to 14 m wide (Codex). Deep enough for the deck's working space and the walkways to the stores and the corridor; the lorries do not come in, so it need not be deep. Draw a dimensioned plan before building.
- **Left bay chemicals, right bay power** (looking out). The acid store stays on the left and the hypochlorite store on the right, their doors and the corridor's landing on the dock floor clear of the openings, the levellers and the pallets.

## The yard, next

The goods yard outside, its steps, its limit, the two hookup cabinets and the lorries standing in it are [080](080-goods-yard.md) (the owner, 2026-10-26). This mission builds the pier door, shut, and leaves the openings looking out on what 080 will build: until then the sky dome (plain overcast) and a plain tarmac plane are seen through them, nothing walkable.

## What goes in it

- **Roller shutters, one per bay, drawn open and fixed:** insulated steel shutters after the UK goods-yard type (Bolton Gate's insulated shutter, HAG Armourguard, Hörmann SB Decotherm): about 3.5 m wide by 4 to 4.5 m high, a barrel box over the opening, guide channels each side, a bottom rail, a geared motor on one end plate and a hand chain. Rough. They are made to work in [075](075-roller-shutters.md), under a fictional maker's brand.
- **Dock fittings at each bay, rough components to refine later:** a dock leveller (a hinged plate and lip bridging the dock floor to the lorry bed), dock buffers, and a dock shelter round the opening on the outside wall.
- **Placeholder lorries:** [080](080-goods-yard.md); not in this mission.
- **The lines and the cable to the outside wall,** for the hookup cabinets [080](080-goods-yard.md) puts outside either side of the pier door: the acid line from the left of the pier to the acid store, the hypochlorite line overhead across the dock, double-contained, to the hypochlorite store, at a stated clearance above the shutters' barrels and anything else; and the generator cable from the right of the pier back to the switch room, drawn but not connected. Every line is one of the schematic's connections (the plant-model rules apply). The dock's two fill cabinets and the switch room's `generator-point` go, their asset IDs carried to 080's cabinets.
- **The pier door,** a small personnel door in the pier between the shutters, shut; 080 opens it onto its steps.
- **Deliveries waiting to be put away:** in one or two corners of the dock, beside the doors into the building, a few stacks of palletised goods, rough shrink-wrapped boxes on pallets, each labelled simply with what it is: cleaning supplies, catering goods for the café, replacement fittings and plumbing parts, paper towels and toilet roll, lane ropes, the kind of thing a large leisure centre orders. Set decoration, so static; clear of the openings, the levellers and the ways to the stores.

## Not in this mission

The goods yard, its hookup cabinets and the placeholder lorries (080); the lorries arriving and leaving (074); the shutters' controller and motion (075); connecting a tanker and filling a store (076); connecting the generator and changing over (077); ordering through Splashonomics (078); a mains failure (079); time of day and other skies.

## Done when

- A dimensioned plan of the dock, with its levels and the yard's below it, is in the prompt's plan or `doc/`.
- The dock has two open shutters in its outside wall and the shut pier door between them; tarmac and overcast sky are seen through the openings; nothing overlaps the openings or the overhead line.
- The acid and hypochlorite lines, the overhead one among them, and the generator cable route run to the outside wall, in the model and drawn from it; the dock's fill cabinets and the switch room's generator connection are gone.
- The pallets of deliveries stand by the doors; every door and cabinet can be reached on foot at its own level.
- Checked in the game; the five checks pass.
