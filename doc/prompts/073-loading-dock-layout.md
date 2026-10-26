# 073: The loading dock, laid out

Status: not started (written 2026-10-26 with the owner). Takes in [010](obsolete/010-loading-bay-two-lorries.md). The first of a series: [074](074-delivery-lorries.md) the lorries, [075](075-roller-shutters.md) the shutters, [076](076-chemical-delivery.md) chemical deliveries, [077](077-generator-hook-up.md) the generator hook-up, [078](078-splashonomics-ordering.md) ordering, [079](079-mains-failure.md) a mains failure.

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first; its rules apply.

## The request

The owner, 2026-10-26: the loading bay is one of the most neglected rooms in the game. It is where deliveries come and go: two lorries pulled up in two bays, chemicals by tanker on the left, external power by a containerised generator on a lorry on the right. This mission lays the room out only; what moves and what works comes in later missions. Keep everything rough: blocking-out components that scope the space and can be refined later, not detailed models.

## What there is now (checked 2026-10-26)

- **The bay** (`loading_bay`, `src/toolkit/gallery/logic/shell-rooms.ts`): 7.5 × 12 m, 7 m high, a closed shell off the main corridor (`main-corridor.ts`), with doorways east to `hypo_store` and west to `acid_store`. In it (`room-equipment.ts`): a tanker stand painted on the floor against the north wall, and two delivery fill cabinets, hypochlorite on the east wall and acid on the west.
- **The stores:** `acid_store` (5 × 5 m, an IBC on a spill pallet) to the west, `hypo_store` (5 × 8 m, three bulk tanks) to the east, each with its safety shower, spill kit, PPE cabinet and extract.
- **The generator connection** (`generator-point`) is in the switch room, on its south wall, a passive box (`world-bindings.ts`: "a connection box for a hired generator"); no external power is modelled.
- **The sky:** `src/scene/sky-dome.ts` (one shader: gradient, sun, clouds, stars) with the skies of `src/game/skies.ts`, overcast the default; used only by the dev courtyard.
- **Elsewhere:** `src/scene/loading-bay.ts` is an older model of a two-bay covered dock, from an earlier part of the code; check whether anything still uses it before building beside it.
- **Prompt 010** asked for the bay about 10.5 m wide, DELIVERIES and GENERATOR stands, and the generator point moved to the bay keeping its asset ID; taken in here.

## The room

- **A covered dock.** The lorries reverse in through two roller shutters in the outside wall and stand inside the building, under its roof, in two lanes at road level. A raised dock deck runs across the back of the lanes at lorry-bed height, so one walks from the deck straight onto a flatbed or into a container. The room is sized for this: two lanes, the deck, and the walkways to the stores and the corridor.
- **The left lane is chemicals; the right lane is power** (looking out through the shutters). The acid store stays on the left and the hypochlorite store on the right, as now.
- **Outside:** the standard sky dome, plain overcast only (time of day and the other skies are a mission of their own); tarmac as far as the eye can see; no buildings.

## What goes in it

- **Roller shutters, one per lane, drawn open and fixed:** insulated steel shutters after the UK goods-yard type (Bolton Gate's insulated shutter, HAG Armourguard, Hörmann SB Decotherm): about 3 m wide by 4.5 m high, a barrel box over the opening, guide channels each side, a bottom rail, a geared motor on one end plate and a hand chain. Rough. They are made to work in [075](075-roller-shutters.md), under a fictional maker's brand.
- **Dock fittings at each bay, rough components to refine later:** a dock leveller (a hinged plate and lip bridging the deck to the lorry bed), dock buffers, and a dock shelter round the opening.
- **Placeholder lorries, both in place:** a chemical tanker in the left lane, and a flatbed with a containerised generator in the right, each a rough block of a lorry's shape whose bed or container floor meets the deck. They are movable components: the room must read correctly with either lane empty. They come and go in [074](074-delivery-lorries.md).
- **One chemical fill cabinet,** on the left by the chemical lane, replacing the two fill cabinets: a lockable cabinet holding both inlets, acid and hypochlorite, on couplings of different types and sizes so neither hose fits the other's inlet, each colour-coded and labelled. The acid line runs to the left store; the hypochlorite line runs overhead across the bay, double-contained, to the right store, clear of the lorries and the shutters. Every line is one of the schematic's connections (the plant-model rules apply). Worked in [076](076-chemical-delivery.md).
- **One generator connection cabinet,** on the right by the power lane, replacing the switch room's `generator-point` and keeping its permanent asset ID: a heavy steel cabinet with a door that opens, inside it terminals for the three phases and earth (a neutral to be settled in 077), its cable route back to the switch room drawn but not connected. Worked in [077](077-generator-hook-up.md).
- **Deliveries waiting to be put away:** in one or two corners, beside the doors into the building, a few stacks of palletised goods, rough shrink-wrapped boxes on pallets, each labelled simply with what it is: cleaning supplies, catering goods for the café, replacement fittings and plumbing parts, paper towels and toilet roll, lane ropes, the kind of thing a large leisure centre orders. Set decoration, so static; clear of the lanes, the deck edge and the ways to the stores.

## Not in this mission

The lorries arriving and leaving (074); the shutters' controller and motion (075); connecting a tanker and filling a store (076); connecting the generator and changing over (077); ordering through Splashonomics (078); a mains failure (079); time of day and other skies.

## Done when

- The bay is a covered two-lane dock with its deck, both shutters open, tarmac and overcast sky outside, both placeholder lorries in place and the room still correct with them taken away.
- The one chemical fill cabinet and its two lines, the overhead hypochlorite line among them, and the generator connection cabinet with its cable route are in the model and drawn from it; the switch room no longer has a generator connection.
- The pallets of deliveries stand by the doors.
- Checked in the game; the five checks pass.
