# Chemical storage: where every pool chemical belongs

The owner's guidance, 2026-10-30, recorded with what the game holds today and what would have to change to meet it. UK practice throughout: HSG179 (managing health and safety in swimming pools), the PWTAG Code of Practice, COSHH, HSG71 (chemical warehousing) and, for gases, the BCGA codes of practice (CP 44 on gas cylinder storage).

## The rule behind it

Acids and hypochlorite never meet: mixed, they release chlorine gas. Each therefore has its own store, its own bund, its own extract and its own labelled fill point at the loading bay, each with a coupling unique to its chemical so a tanker cannot connect to the wrong one. Everything else is placed by what it would do if it met one of those two.

## The game's rooms today

The two chemical stores open off the loading bay's side walls, the whole bay between them, so they share no wall and no drain, their doors facing each other across the bay (`src/toolkit/gallery/logic/shell-rooms.ts`, the owner, 2026-10-26):

- **Acid store** (`acid_store`, code AS): off the loading bay's **west** wall, 6 × 6 m. One framed 4,000 l tank of 10 % hydrochloric acid and its transfer pump (plan 085), a safety shower and eyewash, a spill kit, a PPE cabinet, an extract with chlorine detection, and store signs (`room-equipment.ts`).
- **Sodium hypochlorite store** (`hypo_store`, code HS): off the loading bay's **east** wall, 6 × 9 m. Three framed 4,000 l tanks of 14 % sodium hypochlorite and the transfer pump, with the same shower and eyewash, spill kit, PPE cabinet, extract with chlorine detection and signs.
- **Loading bay** (`loading_bay`, LB): two lorry bays in its north wall; one delivery fill cabinet on its west wall (the acid store's side, by the left bay where the tanker stands) holding both inlets on incompatible couplings; the generator connection cabinet on its east wall.
- **Wet hall** (`wet_hall`, WH): the game's wet room. It holds the make-up break tank, booster set, water meter and backwash pit, and carries the chemical mains through it, double-contained (mission 085). It stores no chemical.
- **Day tanks**: in each pool's plant room (PL1 to PL4), one for hypochlorite and one for acid each (`DAY_TANKS` in `src/game/plant/chemical-distribution.ts`: 300/60 l Lounge, 1,000/500 l Olympic, 60/30 l Jacuzzi, 30/15 l Footbath), filled by the stores' transfer pumps.
- **Engineer's office** (`engineers_office`, EO): a desk, a parts cupboard, a test equipment cupboard and the scenario simulator. No reagents or data sheets are modelled.

Only two chemicals are stocked and used up in the world (`src/game/plant/chemicals.ts`): sodium hypochlorite and hydrochloric acid. The chemistry bench (`src/game/water/chemistry-bench.ts`) also doses sodium bicarbonate, soda ash, calcium chloride and sodium thiosulphate by hand in its scenarios, but none of them has a store or a stock. There is no CO₂ dosing, no sodium bisulphate, no flocculant, no calcium hypochlorite and no stabilised chlorine. The world's toxic gas detection (`src/game/plant/gas.ts`) watches both stores for chlorine and the Lounge and Olympic plant rooms for ozone.

## Where each chemical belongs

| Chemical                                   | Use                                                | Location                                                                                                                   | Reason                                                                                                |
| ------------------------------------------ | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Hydrochloric acid (10–33 %)                | pH reduction                                       | Acid store, bulk tank on its bund                                                                                          | An acid; must never meet hypochlorite (chlorine gas).                                                 |
| Sodium bisulphate (dry acid)               | pH reduction, small pools                          | Acid store, dry shelving or pallet apart from the liquid acid                                                              | An acid; dry and kept off the liquid's bund so a spill does not wet it.                               |
| Descaling acids (sulphamic, phosphoric)    | Descaling heat exchangers, showers, fittings       | Acid store, in a chemical cabinet                                                                                          | Acids; small containers belong in a cabinet, not loose.                                               |
| PAC or aluminium sulphate                  | Flocculant ahead of the filters                    | Acid store, on its own bund                                                                                                | Acidic in solution, so kept with the acids, but on a bund of its own so it never mixes with them.     |
| Mild algaecides and clarifiers             | Occasional treatment                               | Acid store, in a cabinet                                                                                                   | Compatible with the acids, never with hypochlorite (most are organic).                                |
| Sodium hypochlorite (14–15 %)              | Disinfection                                       | Oxidiser and alkali store, bulk tanks on their bunds                                                                       | The oxidiser; never with acid.                                                                        |
| Calcium hypochlorite (granules or tablets) | Disinfection, shock dosing                         | Oxidiser and alkali store, dry and raised off the floor, away from organics and from stabilised chlorine                   | A strong solid oxidiser: with organics it can ignite, with trichlor or dichlor it can explode.        |
| Caustic soda or soda ash                   | pH increase                                        | Oxidiser and alkali store, on its own bund                                                                                 | An alkali, compatible with hypochlorite; its own bund keeps a spill from reaching the hypochlorite's. |
| Trichlor or dichlor (stabilised chlorine)  | Disinfection, outdoor pools                        | Only if used: a third, segregated area                                                                                     | Reacts violently with calcium hypochlorite and gives off chlorine with acid; rare indoors in the UK.  |
| Sodium bicarbonate                         | Alkalinity increase                                | Either store, or general stores; kept dry                                                                                  | Benign.                                                                                               |
| Calcium chloride                           | Calcium hardness increase                          | Either store, or general stores; kept dry                                                                                  | Benign, though it heats as it dissolves.                                                              |
| Sodium thiosulphate                        | Dechlorination after a shock, spill neutralisation | Near where spills are handled (by the spill kit outside the acid store, or in the oxidiser store); never in the acid store | Acid turns it into sulphur dioxide.                                                                   |
| CO₂ (gas cylinders)                        | pH reduction                                       | Never in either store: an outdoor cylinder compound (mission 109)                                                          | A compressed gas; an asphyxiant heavier than air; cylinders are stored outside under BCGA CP 44.      |
| Day tanks of acid and hypochlorite         | The day's dose                                     | Each plant room (or the wet room), bunded, acid and hypochlorite apart                                                     | Small working quantities only; no bulk stock outside the stores.                                      |
| Test reagents (DPD and the like)           | Water testing                                      | Engineer's office (or a test room)                                                                                         | Small quantities, low hazard.                                                                         |
| Safety data sheets and COSHH assessments   | Reference                                          | Engineer's office, and a copy at each store                                                                                | COSHH requires them to hand.                                                                          |

## What every store has

An eyewash station or a safety shower; a spill kit matched to its chemicals (acid neutraliser in the acid store, absorbent and thiosulphate for the oxidiser store); hazard signage (ISO 7010 and CLP pictograms, the chemical's name, "never mix"); a chlorine detector; a locked door; and a chemical-resistant floor that drains only into the store's bund, never to a building drain.

## The game against this guidance

What already agrees:

- Acid and hypochlorite each have their own store, on opposite sides of the loading bay, with no shared wall or drain.
- Each store has a safety shower and eyewash, a spill kit, a PPE cabinet, signs, an extract and chlorine detection, and the detection is in the world (`gas.ts`).
- Day tanks in the plant rooms are bunded and small; there is no bulk stock outside the stores. The wet hall holds no chemical.

What would have to move or be added:

1. **Separate fill points.** The loading bay has one fill cabinet with both inlets, on the acid store's wall. The guidance wants each chemical's fill point labelled and on its own: the acid's on the west wall by the acid store, the hypochlorite's on the east wall by the hypochlorite store (the generator connection cabinet already there would need its own place, or the hypochlorite fill point a separate cabinet beside it). The uniquely coupled inlets stay.
2. **Rename and widen the hypochlorite store** to the oxidiser and alkali store, and give it a raised, dry shelf or pallet for calcium hypochlorite and a separately bunded place for caustic soda or soda ash, if those chemicals join the game.
3. **Fit the acid store out for its other chemicals**: a dry pallet for sodium bisulphate off the liquid's bund, a chemical cabinet for descalers, algaecides and clarifiers, and a separately bunded place for PAC or aluminium sulphate, if those join the game.
4. **Store the hand-dosed chemicals the bench already uses**: sodium bicarbonate and calcium chloride dry in either store or in general stores; soda ash in the oxidiser and alkali store; sodium thiosulphate beside a spill kit, never in the acid store.
5. **Matched spill kits**: today both stores carry the same "Chemical spill kit"; the acid store's should be an acid neutraliser kit and the hypochlorite store's an oxidiser kit.
6. **Locks and floors**: lockable store doors (shown, or modelled as a key in the game) and chemical-resistant floors falling to each bund are not yet represented.
7. **The engineer's office**: a reagent shelf (DPD tablets, phenol red, alkalinity and hardness test kits) and a rack of safety data sheets and COSHH assessments.
8. **CO₂**: none today. If CO₂ dosing joins the game, its cylinders go in an outdoor compound, never in either store (mission 109).
9. **Stabilised chlorine**: none, and none needed indoors; a third segregated area only if the owner ever wants it.
