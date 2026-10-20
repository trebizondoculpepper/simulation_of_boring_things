# The mall entrance

Design notes for what lies outside the reception glazing. Written 2026-10-20.

## The brief

The owner: "Because we operate in the world of liminal spaces, outside of the reception I don't want a park or what looks like English countryside. The pool should actually be accessible through a shopping mall. The player shouldn't be allowed to go in there because it's not part of our game, but make it look like the entrance to our pool complex is via a shopping mall."

This replaces the earlier exterior (grass, paving, road, trees and neighbouring buildings from `src/scene/exterior.ts`, now deleted).

## References for the look

The target is the "dead mall": an enclosed shopping centre still open and lit but nearly empty, with most units shuttered or vacant. It is a well-documented strand of the liminal-space aesthetic.

- **Dead malls as a subject.** The long-running deadmalls.com site (Peter Blackbird, from 2000) and Dan Bell's _Dead Mall Series_ videos walk empty concourses: wide polished floors, rows of roller shutters, unlit fascias, planters, benches nobody uses, and a few surviving tenants. Seph Lawless's photographs (_Black Friday: The Collapse of the American Shopping Mall_, 2014) show the same spaces fully abandoned. The game wants the earlier, still-maintained stage: clean, lit, empty, not ruined.
- **Liminal spaces.** The online "liminal space" genre leans on transitional public interiors seen with nobody in them: corridors, atriums, food courts, escalators. What makes them uncanny is familiarity plus absence, even soft light, repetition, and spaces that carry on out of sight.
- **The British covered shopping centre.** The 1970s–80s town-centre mall: a concourse 15–25 m wide, terrazzo or large-format tile floors, a flat suspended ceiling over the shop fronts with a central glazed barrel vault or ridge rooflight, cladding pilasters between units, fascia signs over full-height glazing or roller shutters, a directory board, and a dry or switched-off fountain. Leisure centres and swimming pools attached to such centres, entered from the mall, are a common pattern in British towns, which makes the arrangement believable.

## What was built

Pure layout in `src/game/mall-plan.ts` (tested in `mall-plan.test.ts`); geometry in `src/scene/mall-concourse.ts`.

- **Concourse.** 24 m wide, running 170 m north–south past the reception's east wall (`x` 112–136, `z` −60 to 110). Polished terrazzo in 1.2 m slabs, lay-in ceiling tiles over the shop fronts at 6 m, and a 12 m wide glazed barrel vault (springing at 8 m, crown 10.5 m) on ribs every 5 m, through which the overcast sky lights the space.
- **Side court.** A 16 × 20 m court south of reception, so the reception's south glazing also looks into the mall. Its west wall carries a backlit centre directory with a "You are here" dot.
- **Shop units.** About 38 units of roughly 8 m: most behind roller shutters, some dark behind black glazing, some whitewashed and "To Let". Invented generic names on fascia signs (all one canvas atlas); on some signs a letter has fallen off, leaving its ghost. A dark passage opposite the pool entrance is signed for the toilets, car park and lifts and runs off into darkness.
- **The pool's own frontage.** A dark teal fascia over the reception glazing, facing both concourse and court, carrying the only lit shop sign in the mall: "Linden Court Leisure Pool" (the name lives in `POOL_SIGN` in `mall-plan.ts`; the mall is "Linden Court Shopping Centre", both invented).
- **Furniture.** Four concrete planters of plastic plants down the centre line, each with two benches and a bin; a dry three-tier fountain; and, in the far north, a stopped pair of escalators rising to a glass-balustraded bridge across the vault.
- **Fading into dimness.** Every vertex carries a brightness from `dimming(z)`: full within 30 m of the pool entrance, easing to 14 % by 80 m. Recessed ceiling lights are lit only within 40 m of the entrance; beyond, the panels are dead. No fog, so the building's own rooms are unaffected.
- **Back of house.** The changing village's south windows, the boiler room's north window and the engineer's office's east window now look into windowless painted service bays. Each bay is a box drawn from inside (`BackSide`), so its face on the window is never drawn. The pool hall's clerestory windows and rooflights still see the overcast sky: the hall is read as rising above the mall roof.

## Keeping the player out

- The street-entrance door (`door:entrance`) is in `LOCKED_PORTALS`: the frame loop never advances it, so it never opens and its leaf stays in the collision set.
- `MALL_SOLIDS` adds a solid 0.5 m slab just outside the door, spanning the whole opening and 0.3 m beyond each side, so the player cannot leave even if the door were opened. A test checks it covers the reception's east opening.
- On the mall side, a belt barrier, an entrance mat and an A-board say "No access: shopping centre closed to pool users"; the same notice is on the inside of the doors.
- The `?at=outside` start is removed. The console handle `facility.place()` can still put a developer in the mall for inspection.

## Cost

Everything is static and merged into one mesh per material (about thirty draws, with no lights added). Textures are small canvases: terrazzo, ceiling tile, shutter slats, one sign atlas, the pool sign, the notice and the directory.

## Not done

There is no headless browser in the repository and the shared browser was in use, so the mall has not been checked visually; it was verified by typecheck, lint, tests, build and a construction smoke test in Node with a stubbed canvas. Proportions, sign legibility and the strength of the fade should be judged in the browser.
