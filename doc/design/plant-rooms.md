# The plant rooms, room by room

The owner's descriptions of particular plant rooms, as they are given, with what each implies for building it. The rules for where rooms go are in `plant-model.md` ("How the plant rooms are arranged") and `src/game/plant/placement.ts`; what is in each room is in `plant-inventory.md`.

## The roof: the air handling plant

You reach the roof by a staircase that ends at a hatch: you lift the hatch and climb out onto the roof of the building, where the air handling plant stands. You are on a platform built on top of the roof and cordoned off by steel railings. All round you, an infinite sea of roof stretches away, set with skylights just a short way below the platform; you cannot get to it, because the railings hold you in. The sky is a solid, featureless white. In front of you stand the air handling system's gigantic external units.

What it implies:

- **The way up:** a stair from the surface level rising to a roof hatch (a counterbalanced steel hatch in a kerbed upstand, with a ladder or the stair's top flight under it), opened as a part the player works; the hatch is the room's door.
- **The platform:** a steel plant deck on the roof, its edges railed (toe-boards, handrails, intermediate rails), the walker kept on it; walkways and short steps between the units.
- **The view:** the roof beyond the railings, flat and endless, a field of skylights a little below the deck receding to the horizon, under a flat white sky (background, no sun disc). Geometry repeats as far as the eye goes; nothing beyond the railings can be reached.
- **The machines:** the air handling plant's external units, gigantic: one unit per hall from the inventory (`ahu-…`), each a real, working machine (supply and extract fans, dampers, filters, the heating coil off the boilers' loop, heat recovery, its dehumidifying), with its control panel, its louvred intakes and exhausts, and its ducts dropping through the roof towards its hall. They hum, their fans turn, their dampers move, their panels show what they are doing.
- **The view down:** each skylight looks down into a pool room 30 to 50 metres below, blurred and hazy: soft shapes of blue water, white tile and columns, never in detail. Built by interior mapping (a shader on each flat pane that gives a room behind it, with real parallax as the walker moves), from a few simple pool-room scenes rendered once from above into textures, blurred and hazed, varied by rotating and mirroring them per skylight so the field never visibly repeats; farther skylights blur more and fade into the white. The pool rooms seen are fakes, not the real ones: the two realms are not coplanar.
- **Its realm:** it is a plant room; the pool rooms glimpsed below are the other realm, out of reach.

## The loading bay: the edge of the world

The loading bay should feel like the edge of the world. It is a pair of raised dock platforms where container lorries or soft-sided curtain-siders can reverse in and unload; but beyond the docks nothing is rendered, not the road, not the sky, not any surroundings: only pure white. A few containers stand about, one of them sealed, and some palletised goods. This is where the things the plant needs arrive: the place objects spawn into the game.

What it implies:

- **The docks:** two loading docks at dock height (about 1.2 m above the yard that is not there), each with its roller-shutter door, a dock leveller that swings down to bridge the gap to a lorry's bed, a dock shelter or seal round the opening, rubber bumpers, and the red and green dock lights that tell a driver when to back in and when to pull away. Real, working parts: the shutters roll, the levellers rise and fall, the lights change.
- **The edge:** through the open shutters, white: no yard, no road, no horizon, the white of the roof's sky, so that the world simply stops at the dock's lip. No lorry is ever seen (the owner, 2026-10-20): the docks wait for vehicles that never come.
- **A boundary:** the loading bay is a boundary zone, like the realm doors: the interface between the plant rooms and the roadways (`two-realms.md`), a third realm, beyond the white, that the game does not enter.
- **What lies about:** a few shipping containers, one sealed (its bolt seal on the door bars), pallets of goods wrapped in film, intermediate bulk containers (the 1,000-litre caged tanks chemicals come in) and drums, a pallet truck, a delivery log and order book on a lectern, the spares cage.
- **Where things arrive:** the inventory's deliveries made physical. Chemicals arrive here (hypochlorite in IBCs, acid in drums, CO₂ in cylinders) for the chemical store next door; spares and replacements (a pump, a filter's nozzles, an ozone generator, UV lamps) arrive here for the plant rooms, by the goods lift or hoist. When something is ordered, it simply materialises on a dock, palletised and labelled, with no lorry and no one to bring it: the place the game spawns objects. The order book records what was ordered and when; the delivery is found there, on a pallet, the next time the bay is looked at.
