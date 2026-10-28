# 107k: PLANTROOMS, "Grout: The Unsung Hero of the Aquatics World"

Status: planned 2026-10-28, not started. A sub-prompt of mission 107 (`doc/prompts/107-pool-science-museum.md`), after 107-0 (`doc/prompts/107-0-exhibit-groundwork.md`). One of the owner's themes for Halls 5 to 12, **not yet given a hall number**: the owner will place it.

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first and follow it. Then read mission 107 (the PLANTROOMS brand: earnest exhibitions with a light touch of humour) and 107-0.

## The owner's request

The owner, 2026-10-28: "Grout: The Unsung Hero of the Aquatics World": a very reverent, non-interactive exhibition about the real importance of grout in swimming pool construction, and grout through the ages. A row of plinths, each holding a tiled specimen panel, and every panel looks exactly the same: the same model, the same white tiles, the same grey grout; the one exception is the 1970s coloured grout, which is coloured, in a properly regrettable 1970s shade. Each plinth has a museum-style plaque: the kind of grout, the years it was used in pools, its benefits and drawbacks in pool construction, from the real history, written truthfully: the reverence is in the tone, not in false claims. Reverent gallery lighting, a spotlight on each plinth, a hushed, chapel-like feel, and a title wall that takes grout entirely seriously. Cheap: one shared specimen model, instanced, with the coloured one as a material variant.

## Rules for every hall (the owner, 2026-10-28)

1. **Every hall starts from its reset state the moment you step into it.** Its time is set to now, the visitor's real local time, and its exhibit is put in its reset condition. Walking in is the same as pressing its RESET button. No hall's state carries over from an earlier visit. Here the reset changes nothing: the hall has no state, and no RESET pedestal (a small card where it would stand: "There is nothing to reset. Grout endures.").
2. **Time.** A hall's simulated time starts at now. Halls may show time in different ways. **This hall shows time as the ages of grout:** the plinths in date order, each plaque's years, and a thin bronze timeline set into the floor along the row, 1840 to today. No clock.
3. **Halls start empty.** The hall begins with set decoration only; this sub-prompt builds its exhibit.

## What the hall teaches, and what it builds on

**Assumes:** nothing. (If the chemistry lab, 107d, comes before it: water with a negative balance index dissolves cement, and that means the grout; one plaque says so.)

**Teaches, gravely:** a pool is a tank of water held in by thousands of tiles and the grout between them. The tiles get the credit; the grout does the work: it fills every joint, keeps water out of the bed and the structure behind, takes the swimmers' feet and the cleaners' brushes, resists the pool's chemistry and must not harbour germs. Over a century and a half it changed from lime to cement to polymer and resin, because pool water, chlorine and acid cleaners attack the simpler ones.

## The hall

- **The row:** ten plinths (proposed below) down the middle of the hall in date order, each a tall, plain plinth in dark stone-grey, a spotlight from above on its specimen, a plaque on an angled bronze lectern before it. A rope barrier on brass posts along both sides (do not touch the grout).
- **The specimen:** one model, a 450 × 450 mm panel of white 150 × 150 mm glazed ceramic tiles, nine of them, with 3 mm grey grout joints, slightly concave as tooled, set on a stone base; shown upright on its plinth like a relic. **Every specimen is the same model and the same material** but one.
- **The exception:** the 1970s coloured cement grout, its joints in **avocado** (the UK's emblematic 1970s bathroom colour; harvest gold the alternative, question 1), the only colour in the hall, its spotlight the same as the others'.
- **The title wall:** at the way in, in large, serif, gilt lettering on a dark ground: "**Perhaps no substance is more important to a swimming pool than grout.**" Beneath, smaller: "Grout: The Unsung Hero of the Aquatics World." The PLANTROOMS mark, small, as on every hall's panels.
- **The mood:** the hall's walls dark (a deep blue-grey), the gallery lights off but for the plinths' spots and a soft wash on the title wall; quiet: the museum's room tone lowered here (and, if the owner wants it, a faint, slow organ-like drone of our own synthesis, question 3); a bench at the end, facing back along the row, for contemplation.

## The plinths and their plaques

The history must be researched and written truthfully before the plaques are final, into `doc/research/grout-history.md`, each fact with its source (The Tile Association's guidance, BS EN 13888 on grouts' classes (CG1, CG2 and its W and A suffixes, and RG for reaction-resin grouts), BS 5385 on tiling and its guidance for swimming pools, manufacturers' technical literature, and histories of Victorian public baths and of Portland cement). Proposed, in date order, with what the plaques are expected to say (to be corrected from the sources):

1. **Lime mortar** (the Victorian public baths, from the Baths and Washhouses Act of 1846 into the late nineteenth century): lime and sand, laid in thick joints. Benefits: available, workable, forgiving of movement. Drawbacks: soft, slow to harden, and dissolved by water that is not in balance; it needed renewing.
2. **Early Portland cement grout** (the late nineteenth century to the mid twentieth): Portland cement (patented 1824) and fine sand, the baths' standard for decades. Benefits: hard, durable, cheap. Drawbacks: porous, brittle, slowly etched by soft or acid water, stained by everything.
3. **Sanded cement grout** (twentieth century to today, joints of about 3 mm and up): cement and graded sand. Benefits: strong in wide joints, resists shrinkage cracking. Drawbacks: coarse, porous, absorbs water and dirt.
4. **Unsanded cement grout** (twentieth century to today, fine joints under about 3 mm): cement without sand, for the thin joints of glazed tiles and mosaics. Benefits: fills fine joints smoothly. Drawbacks: shrinks and cracks in wide joints; porous.
5. **Coloured cement grout, 1970s** (pigmented cement grouts in the fashionable colours of the decade): Benefits: it matched the bathroom suite. Drawbacks: as any cement grout, and the colour fades unevenly, and it is avocado. (The only coloured specimen: the plaque stays solemn: "The museum presents this specimen without comment.")
6. **Latex- and polymer-modified cement grout** (from the 1960s and 70s on): cement grout with a latex or polymer additive. Benefits: more flexible, better adhesion, less water absorption. Drawbacks: still cement; attacked by aggressive water and acid cleaners over time.
7. **Furan resin grout** (industrial floors, dairies and some pools): a reaction-resin grout, chemically very resistant to acids and solvents. Drawbacks: difficult to apply, and in truth generally black. (The plaque: "Furan grouts are generally black. The museum regrets that its specimen is not." The one place the deadpan row admits it is a joke, honestly.)
8. **Epoxy grout** (from about the 1960s; the standard for swimming pools today): a two-part reaction-resin grout (class RG). Benefits: impervious, hard-wearing, resistant to pool chemicals and acid cleaners, easy to keep clean and hygienic. Drawbacks: costly, quick to set, unforgiving to lay.
9. **Modern rapid-setting, anti-microbial cement grout** (today: class CG2, often WA, water-repellent and abrasion-resistant): Benefits: quick to return to service, less water absorption, mould inhibitors. Drawbacks: still cement where the water is aggressive; epoxy remains the pool's choice in the water.
10. **Coda: the movement joint** (not grout at all): a flexible sealant (silicone, polysulphide or polyurethane) in the joints that must move, at corners, changes of plane and across the structure's joints. Its plaque: "Not grout. But grout could not do its work without it." Its specimen the same panel, one joint drawn as sealant (the same grey: the deadpan holds).

## Research: what the hall holds

Researched 2026-10-28 into `doc/research/grout-history.md` (sources S1 to S11 there). Every specimen remains the same panel (white 150 mm tiles, 3 mm grey joints) except plinth 5. Dates marked indicative are not yet confirmed from a primary source and the plaques should hedge them ("by the …", "from about …").

1. **Lime mortar and lime putty**, about 1840 to 1900 (indicative). Specimen: the standard panel. Plaque: lime and sand, setting slowly as it takes up carbon dioxide; workable and forgiving; soft, and dissolved by soft or acid water, so it needed renewing. Joints in Victorian glazed tiling were generally fine, not thick (see conflicts). Reverence: "It was there first."
2. **Early Portland cement grout**, about 1850 to 1950 (indicative). Plaque: Aspdin's patent of 1824, the hotter-burned cement of the 1840s, neat cement or cement and fine sand; hard, cheap, durable; porous, brittle, leached by water low in calcium or with a negative saturation index (S9, S10).
3. **Sanded cement grout**, twentieth century to today. Plaque: graded sand for wider joints (about 3 mm and up, a trade rule of thumb), resisting shrinkage cracking; porous and absorbent (S4).
4. **Unsanded cement grout**, twentieth century to today. Plaque: for fine joints of glazed tiles and mosaic (BS 5385 guidance of about 2 mm on walls, S2); smooth; shrinks and cracks if used too wide; porous.
5. **Coloured cement grout, the 1970s** (the one avocado specimen). Plaque: pigmented to match the coloured bathroom suites of the decade; as any cement grout, and pigment can set patchy or fade (indicative). "The museum presents this specimen without comment."
6. **Latex- and polymer-modified cement grout**, from about the 1960s (indicative). Plaque: latex admixture in place of water, later factory premixed, now the most popular type (S4); denser, less absorbent, better bond; still cement, so still attacked by aggressive water and acid cleaners (S2).
7. **Furan resin grout**, from the 1940s (S5). Plaque: chemically resistant reaction resin for dairies, chemical plants and some pools; hard to apply, and generally black (indicative). "Furan grouts are generally black. The museum regrets that its specimen is not."
8. **Epoxy grout**, epoxy emulsions from the 1940s (S5), true epoxy grouts in general use by the 1960s and 70s (indicative); class RG under BS EN 13888 (S1); the pool's choice where water is soft or aggressive (S2), some rated for seawater (S7). Drawbacks: costly, two-part, short pot life, unforgiving (S6). Fill the pool no sooner than 21 days after (S8).
9. **Modern CG2WA cement grout**, today. Plaque: improved cementitious grout, reduced water absorption (W), abrasion-resistant (A) (S1, S3), often with mould inhibitors and rapid setting; suits pools with balanced hard water and the surrounds, not aggressive water (S2); the pool waits three weeks to fill (BS 5385-4, S3).
10. **Coda: the movement joint**. Plaque: flexible sealant (silicone, polysulphide, polyurethane) at perimeters, changes of plane and structural joints, to BS 5385-4 (S2). "Not grout. But grout could not do its work without it."

**The title wall's basis:** the line is an opinion, held reverently, and needs no source. The introduction's fact is computed in the research: a 25 × 12.5 × 1.5 m tank is 425 m² of tile, 13.3 m of joint per m² of 150 mm tiles, about 5.7 km of grout joint ("nearly six kilometres" holds). The standards to name on the wall: BS EN 13888 (classes) and BS 5385-4 (pools).

### Research conflicts

- Plinth 1 says lime was "laid in thick joints"; Victorian glazed tiling was usually close-jointed (indicative). Suggest dropping "thick".
- Plinth 2 says "Portland cement (patented 1824)": true of the name and patent, but Aspdin's product was not modern Portland cement; the plaque should say the cement that resembles today's dates from the 1840s.
- Plinth 8 says epoxy is "from about the 1960s"; epoxy emulsion grouts date from the 1940s (S5). Suggest "from the 1940s, in pools from about the 1960s (indicative)".

## The schematic and the mimic

None: no plant, no simulation, no controls. The hall is set decoration (CLAUDE.md allows static set decoration for what is not plant).

## The museum panels (text outline)

- **The title wall** (above).
- **The introduction**, beside it: "A swimming pool is held together by its grout. Every tile is set in it; every joint is filled with it; every day it is soaked, scrubbed, chlorinated and stood on. Here, for the first time, grout takes its rightful place in the history of aquatics." A memorable fact (sourced): how many metres of grout joint a 25 m pool's tiling has (worked from a 25 × 12.5 × 1.5 m pool's floor and walls, about 425 m², in 150 mm tiles at about 13 m of joint a square metre: nearly six kilometres for the tank alone, before the deck; computed and checked before it goes on the wall).
- **Ten plaques** (above): the kind, the years, two benefits, two drawbacks, one sentence of reverence ("It asked for nothing.").
- **The closing card**, by the bench: "Next time you swim, look down. The grout is looking after you."

## Try it

"Walk slowly. Look closely. Can you tell them apart?" (Nothing to press.)

## Reuses (paths checked 2026-10-28)

The tiles (`createTileMaterial` in `src/toolkit/components/pool/views/pool-surfaces.ts`, and Hall 0's small white tiles in `src/toolkit/gallery/views/museum-hall.ts`); `createLectern` and `createWallPanel` (`src/toolkit/gallery/views/museum-exhibit.ts`); the merging helpers (`src/toolkit/components/core/views/merge-static.ts`); the gallery's track lighting (`museum-hall.ts`).

**New:** the specimen panel model (one geometry, one tile material and one grout material, with the avocado grout as a second material variant), drawn as an instanced mesh (`InstancedMesh`) of ten, the coloured one a second instance group; the plinths, rope posts and bronze timeline, merged; the dark gallery finish and the spotlights; the plaques' data; the research document.

## Acceptance

- Every plaque's claims traceable to `doc/research/grout-history.md`; nothing false (a review check); the furan plaque's admission present.
- Exactly one specimen coloured; the others identical (one geometry, one material, instanced: a test of the specimen's build).
- **Walking in from the hall before:** the change of mood, the row in date order along the route; walk on and back; nothing changes, as rule 1 allows.
- Browser checks on high, medium and low; screenshots and camera links recorded here.

## Performance budget

Very cheap: the ten specimens two draw calls (two instance groups), the plinths and posts merged into a few, ten spotlights cut to cheap ones (no shadows; on low, a baked pool of light on the floor and an emissive top on each plinth instead), the plaques drawn once; within `DEFAULT_BUDGET`; at least 60 fps on medium and 50 on high through an archway.

## Open questions for the owner (one at a time, in this order)

1. **The shade:** avocado (recommended) or harvest gold?
2. **The plinths:** the ten above, or fewer?
3. **The hush:** silence and the lowered room tone, or a faint organ-like drone of our own?
