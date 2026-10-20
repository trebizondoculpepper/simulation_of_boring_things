# Fire safety provision

How the leisure centre's fire safety equipment is placed, which British standard each rule comes from, what has been assumed, and what still falls short. The placements are computed by rule in `src/game/fire-safety-plan.ts` and checked by `src/game/fire-safety-plan.test.ts`; `src/scene/fire-safety.ts` draws them with the toolkit's fire and general safety fittings. Written 2026-10-20 from general knowledge of the standards; the clause numbers and figures below should be checked against the current editions before anything here is relied on outside the game.

## Escape: Approved Document B, volume 2

| Rule                                                                                                                                                   | Applied                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Travel distance, assembly and recreation (purpose group 5): 18 m where there is one direction of escape, 45 m where there is more than one (table 2.1) | Every room is checked using direct distance at two thirds of the limit, as ADB allows where the room's layout is not yet fixed.   |
| Plant rooms: 9 m within the room in one direction, 35 m in more than one                                                                               | Every plant room has at least two ways out, one of them a fire exit door in its outside wall.                                     |
| Dead ends: 18 m                                                                                                                                        | The lower corridor has a stair near each end (west flight foot at x = 14, east at x = 86.6), leaving dead ends of 14 m and 9.4 m. |

Final exits added: three on the pool hall's south wall and one on its west wall, one at each end of the service corridor, and one in the outside wall of each large plant room (upper plant, chemical store, boiler room, air handling, switch room, stores, workshop), besides the street entrance. They are drawn as shut fire exit doors with push bars (BS EN 1125) and are not walked through.

## Detection and alarm: BS 5839-1

| Rule                                                                                                         | Applied                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Point smoke detectors: no point more than 7.5 m from a detector; point heat detectors: 5.3 m                 | A grid in each room with half its cell diagonal at most the radius.                                                                                                 |
| Ceiling height limits for point detectors: 10.5 m smoke, 7.5 m heat (general)                                | The 12 m pool hall uses optical beam detectors instead, four beams across its length, each covering 7.5 m either side, 0.6 m below the roof.                        |
| Detector type for the environment                                                                            | Heat detectors in the changing village (showers), staff kitchenette, boiler room, chemical store (corrosive fumes) and the humid pool plant rooms; smoke elsewhere. |
| Manual call points at every storey exit and final exit, and no one more than 45 m from one; mounted at 1.4 m | A call point by every final exit and at the foot of each stair, and more where needed to keep everywhere within 30 m direct.                                        |
| Sounders, and visual alarm devices where people may not hear (pool hall, changing)                           | A sounder-beacon in every room, one per 400 m².                                                                                                                     |
| Control panel at the fire service's point of entry                                                           | In reception, by the street entrance.                                                                                                                               |

## Emergency lighting: BS 5266-1 and BS EN 1838

| Rule                                                                                                                                             | Applied                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Points of emphasis: within 2 m of each exit door, each change of direction, each stair, each call point and each item of fire fighting equipment | A bulkhead beside every door on both sides, every final exit and every fire point and call point; downlights over each stair's top and foot.           |
| Escape routes: 1 lux on the centre line                                                                                                          | Downlights along both corridors, 9.6 m apart. The spacing is an assumption for a typical luminaire at 3 m; it has not been checked against photometry. |
| Open areas over 60 m² (anti-panic): 0.5 lux                                                                                                      | A grid of downlights, each point within 7 m of one.                                                                                                    |
| High-risk task areas (plant rooms): 10 % of normal lighting, at least 15 lux                                                                     | A closer grid, each point within 5.6 m.                                                                                                                |

## Escape signs: BS ISO 3864-1, BS EN ISO 7010 and BS 5499-4

| Rule                                                                                                    | Applied                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The emergency exit pictogram (E001 left, E002 right) with a directional arrow; FIRE EXIT at final exits | `createEscapeSign`: 400 × 200 mm, or 600 × 200 mm with FIRE EXIT; up arrow for straight on, horizontal for along a corridor, diagonal up for up a stair.   |
| Viewing distance: 200 × pictogram height for an internally lit sign                                     | 160 mm pictograms, legible at 32 m; every point is within 32 m of a sign in its room.                                                                      |
| A sign over every exit, and along routes where the exit is not in sight                                 | Over every final exit and every room's way out; along the corridor walls every 12 m pointing to the nearest final exit (downstairs, to the nearest stair). |
| FIRE DOOR KEEP SHUT on fire doors                                                                       | On every door between a service room and its neighbour.                                                                                                    |
| FIRST AID (E003)                                                                                        | On the first aid room's doors.                                                                                                                             |

## Portable extinguishers: BS 5306-8

| Rule                                                                                                                | Applied                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No one more than 30 m travel from an extinguisher                                                                   | Fire points placed so everywhere is within 20 m direct; freestanding fire point boards on the pool deck, which is too far from the walls.                                                                                                         |
| Class A rating at least 0.065 × floor area per storey, and at least 26A, with at least two extinguishers per storey | 13A for a 9 l water or 6 l foam extinguisher; foam extinguishers added at the largest rooms' fire points to make up the rating.                                                                                                                   |
| Type for the risk                                                                                                   | CO₂ only in the switch room and control centre; water in the chemical store (the hypochlorite is an oxidiser; to be confirmed against its safety data sheet); water and CO₂ in public areas; foam and CO₂ in service areas. Handles at about 1 m. |

## Known shortfalls and assumptions

- The stairs are open flights in the corridors. Approved Document B expects a basement escape stair to be protected (enclosed in fire-resisting construction); the lower level needs that, or the stairs need enclosing, before the layout could be called compliant.
- The service corridor is treated as a protected corridor whose doors are the rooms' exits, with final exits at both ends. Its middle is 48 m from either end.
- Travel distances use direct distance as a proxy; the pools in the hall lengthen real routes round them.
- Emergency lighting spacings are assumptions, not photometric design. Exit lighting outside each final exit, and lighting over the pool water for people leaving it, are not yet modelled.
- No refuges, disabled evacuation provision, fire blanket for the staff kitchenette, or fire fighting access (dry riser, fire service inlet) are modelled.
- Fire doors are not yet given self-closers or fire ratings in the model.
- The fittings do not work: nothing raises an alarm, and the emergency lights do not change with the supply.
