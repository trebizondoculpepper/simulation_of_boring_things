# 107g: PLANTROOMS, "Gutters You Can Trust": a century of pool edges, in cut-away

Status: planned 2026-10-28, not started. A sub-prompt of mission 107 (`doc/prompts/107-pool-science-museum.md`), after 107-0 (`doc/prompts/107-0-exhibit-groundwork.md`). One of the owner's themes for Halls 5 to 12, **not yet given a hall number**: the owner will place it. It is a separate hall from "What's in the Skimmer?" (107f).

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first and follow it. Then read mission 107 (Hall 0's painted pool), 107-0, and dev17, pool edges through the decades (`src/toolkit/gallery/rooms/plant/pool-edges.ts`, its profiles in `src/toolkit/components/pool/logic/edge-profiles.ts`), which already builds four edges as full-size sections: this hall grows from it.

## The owner's request

The owner, 2026-10-28: "Gutters You Can Trust": a non-interactive hall showing how swimming pool edge guttering and water return systems evolved, from the designs of the 1920s to the modern day, with "a little bit of signage showing how guttering has improved over a century of pool design". As briefed: a row of full-size cut-away edge sections in date order, made from our own components, with real pool and plant history (scum troughs and freeboard pools of the 1920s and 30s; skimmer pools; deck-level edges, Wiesbaden, Zurich and Finnish; modern grated channels and the balance tank return; an infinity edge as a coda); each section with a plaque giving its date, how it worked, its problem and what replaced it; a timeline along the wall; static, with no interaction and no simulation; painted water, matching Hall 0's dry style, is fine.

## Rules for every hall (the owner, 2026-10-28)

1. **Every hall starts from its reset state the moment you step into it.** Its time is set to now, the visitor's real local time, and its exhibit is put in its reset condition. Walking in is the same as pressing its RESET button. No hall's state carries over from an earlier visit. Here there is no state: the hall is static, so it needs no RESET pedestal (the only hall without one; its entrance panel says so: "Nothing to reset here: just look").
2. **Time.** A hall's simulated time starts at now. Halls may show time in different ways. **This hall shows time as history:** the timeline along the wall, 1920 to today, is its time display. No clock and no speed buttons (nothing runs).
3. **Halls start empty.** The hall begins with set decoration only; this sub-prompt builds its exhibit.

## What the hall teaches, and what it builds on

**Assumes:** that a pool's water goes round a plant (Hall 2, if it comes before; otherwise the entrance panel says it in a sentence), and that the dirt floats (the skimmer hall, 107f, if seen).

**Teaches:** the edge of a pool is where the plant meets the water. Over a century, edges changed to skim more of the surface, return more of the water to the plant instead of to the drain, calm the waves for racing, and make getting out easier and safer; the water's return to the pool changed with them, from inlets at one end to inlets in the floor.

## Water: painted (chosen)

The water is painted, in Hall 0's dry style: on each section's cut face, the water is a flat painted blue with its surface line, the overflow's film and the gutter's shallow run drawn as paint (the profiles' `water` and `spill` outlines, filled flat); in front of each section, a strip of painted pool on the floor running out from its edge. No transparent or animated water, so the hall costs almost nothing to draw and keeps the museum's joke: "Look for the water. There is none: it is paint."

## The sections, in date order

Each is a full-size cut-away: a run of pool edge about 2.4 m long, cut square at one end so its section shows (the structure in its materials, its gutter and pipe in section, the water painted), raised on a low plinth so its pool floor is at the visitor's knee, with its plaque on a lectern before it (date, how it worked, its problem, what replaced it). Built from the game's own components: the edge profiles (`EDGE_PROFILES`), `createPoolEdge` (`src/toolkit/components/pool/views/pool-edges.ts`) and `sweepProfile` (`profile-sweep.ts`), the tiles (`createTileMaterial`, `pool-surfaces.ts`), and the pool fittings (`createSkimmer`, `createOverflowGrating`, `gratingStrip`, `createWallInlet`, `createFloorInlet`, `createMainDrain`, `createDeckGully` in `pool-fittings.ts`). Every section also shows its **water return**: the inlets of its period on the wall or floor beside it, a pipe in section going to the plant, and a small arrow diagram on its plaque.

Proposed sections (the existing profiles' dates differ from the brief's; the history must be checked against sources before the plaques are written, see "The history, sourced"):

1. **Before the plant: fill and empty** (to about 1910s; the timeline's start, a plaque only, no section): pools emptied and refilled every few days, the water dirtier each day; circulation and filtration began to replace them.
2. **Freeboard pool with a scum trough** (1920s–30s, and the British public baths' edge for decades after): the water about 200–300 mm below the deck, a glazed scum channel let into the wall at the water's line under an overhanging coping that is also the handhold (`scum-trough`, today dated 1960s in the code: re-date it from the sources). Return: wall inlets at the deep end, the water drawn off at the shallow end. Problem: the level had to be held exactly at the trough's lip, much of the skimmed water went to waste, the trough was hard to clean, waves rebounded off the wall, and the end-to-end flow left dead spots. Replaced by: skimmers in smaller pools, deck-level edges in public ones.
3. **Roll-out gutter** (1940s, `rollout`): the edge itself the gutter, a rounded lip at the water's line, a trough behind it in the coping, so a swimmer rolls out over it. Include if the sources support it as a step in British or European practice; otherwise drop it to the timeline.
4. **Skimmer pool** (from the 1950s, above all private, hotel and small pools): the water below the coping, skimmer openings in the wall every so many square metres of surface, each with its weir flap and basket (`createSkimmer`; the skimmer hall's fitting, 107f), a main drain. Problem: only the water near each skimmer is skimmed, and a busy public pool's surface outruns them; UK guidance for public pools now looks for most of the circulation to come off the surface all round (check the figure). Replaced, for public pools, by deck-level edges.
5. **Deck-level edges** (from the 1960s and 70s), three in a row, each its own section: the **Wiesbaden** (after the Agrob Buchtal Wiesbaden edge system, already cited in `doc/research/pool-architectural-fittings.md`), the **Zurich** and the **Finnish**: the water brought up to the deck and overflowing all round into a channel. Their differences (where the channel sits, the overflow nosing's shape, the grating, whether the channel is at the wall or set back in the deck) are to be taken from sources and drawn exactly; do not invent them. Return: floor inlets, the water rising evenly. The existing `deck-overflow` profile (1980s, a tiled nosing, an overflow slope, a ceramic finger grating) is probably one of these: name it from the sources.
6. **Modern grated channel and the balance tank** (contemporary, `grated-channel`): the water flush with the deck, a slim edge tile, a channel under a flush polypropylene grating (`createOverflowGrating`), the channel's pipe in section falling to a balance tank, shown cut away below the plinth (painted water in it, its level line, the pump's suction), and floor inlets returning the water: the whole circulation skimmed. Problem: needs a balance tank big enough to take the water the swimmers displace, and a careful level. What replaced it: nothing yet.
7. **Coda: the infinity edge** (hotels and spas, the late twentieth century on): the water spills over a weir into a catch channel or basin below, so the pool seems to run off into the view; a joke on its plaque ("for when you would rather look at the view than the deep end"), and its truth: it is a deck-level overflow on one side, with a balance tank, made beautiful.

## The timeline

Along the hall's long wall, 1920 to today, a printed band (one canvas per few metres, drawn once): the decades marked, each section's dates as bars above, and short dated notes beneath from the sources (the first public pool filtration, the chlorination of pools, standards and guidance as they came, the Olympics' move to deck-level racing pools with wave-quelling lane ropes, the first UK guidance on surface draw-off). Every note sourced; none invented.

## The schematic

Static set pieces of pool construction, connected to nothing: no plant model, no tags beyond the hall's set decoration (CLAUDE.md allows static set decoration for what is not plant; the sections are architecture, and no instrument or control is shown). The overlay names each section and its date, from the same data as the plaques.

## The mimic

None: there is no plant to map. Each plaque carries its section's small flow diagram (where the surface water goes, where it comes back), drawn from the profile's data.

## The museum panels (text outline)

- **Entrance panel.** Headline "Gutters You Can Trust". Big idea: "The edge of a pool is where the plant meets the water. For a hundred years, engineers have been finding better ways to take the dirty top of the water away and bring clean water back." Fact (to be sourced): how much of a modern public pool's circulation comes off its surface. "Nothing to reset here: just look." The route: the sections in date order.
- **Each section's plaque:** its name and date; how it worked (two sentences); its problem (one); what replaced it (one); its water return in a small diagram.
- **The closing plaque** (by the infinity edge): "A hundred years on, the best gutter is the one you never notice."

## Try it

Nothing to press: "Walk the row from 1920 to today. Crouch at each cut-away to see where the water goes." (The stance keys, `changeStance`, through the control scheme; the sections at knee height reward it.)

## The history, sourced

Before the plaques are written, research the history into `doc/research/pool-edges-history.md`: sources on British and European pool edges and circulation from the 1920s (the baths' own histories, Historic England's pool and baths reports, the Amateur Swimming Association's and PWTAG's guidance and its history, Sport England's design guidance, the edge systems' makers' literature for Wiesbaden, Zurich and Finnish edges, FINA's pool requirements for racing edges), each fact with its source. Correct the dates in `edge-profiles.ts` where the sources differ (and dev17's plaques with them). Where the sources do not settle something, the plaque says less rather than inventing.

## Reuses (paths checked 2026-10-28)

`src/toolkit/components/pool/logic/edge-profiles.ts` (`EDGE_PROFILES`, `SECTION`, `selfIntersects`), `src/toolkit/components/pool/views/pool-edges.ts` (`createPoolEdge`), `profile-sweep.ts` (`sweepProfile`), `pool-surfaces.ts` (`createTileMaterial`), `pool-fittings.ts` (`createSkimmer`, `createOverflowGrating`, `gratingStrip`, `createWallInlet`, `createFloorInlet`, `createMainDrain`, `createDeckGully`); dev17's room, `src/toolkit/gallery/rooms/plant/pool-edges.ts`; Hall 0's painted water (`museum-hall.ts`); `createLectern` and `createWallPanel` (`src/toolkit/gallery/views/museum-exhibit.ts`); `doc/research/pool-architectural-fittings.md`.

**New:** the profiles for the freeboard pool, the skimmer pool, the Wiesbaden, Zurich and Finnish edges and the infinity edge (pure data beside the four, tested by `selfIntersects` and their test); the cut-away treatment (a cut face, the section's pipe and the balance tank in section); the painted-water fill of a profile; the plaques and the timeline; the research document.

## Acceptance

- Every profile's outline closed and not self-intersecting (the existing test extended); every plaque's dates and claims traceable to `doc/research/pool-edges-history.md`.
- **Walking in from the hall before** (wherever the owner places it): the row seen in date order along the route's direction; walk on and back.
- Browser checks on high, medium and low: each section legible at a crouch, the plaques readable at a couple of metres; screenshots and camera links recorded here.

## Performance budget

Static: every section merged by material (tile, grout, concrete, grating, paint), no displays, no updates; a handful of draw calls a section; the timeline a few canvases drawn once; at least 60 fps on medium and 50 on high through an archway.

## Open questions for the owner (one at a time, in this order)

1. **The sections:** the seven above (with the roll-out gutter if the sources support it), or fewer and larger?
2. **The water:** painted, as chosen, or the dev17 sections' style if they differ?
3. **Racing:** a note on wave-quelling (deck-level edges and lane ropes) on the timeline, or a section of its own?

## Research: what the hall holds

Researched 2026-10-28 into `doc/research/pool-edges-history.md` (sources S1 to S15 there). Dimensions marked indicative are drawing figures, not quoted from a standard; plaques must not state them as fact.

1. **Before the plant: fill and empty** (plaque only). Facts: before the Ministry of Health's 1925 report on swimming-bath water, most British baths were emptied and refilled weekly, dirtier each day [S1]; Liverpool filtered continuously from 1909 [S1]; filtration and chlorination spread in the late 1920s and 1930s [S1].
2. **Freeboard pool with a scum channel** (1930s on; plaque "by the 1930s"). Profile (indicative): water 200 mm below deck; glazed channel 150 mm wide × 120 mm deep in the wall, lip at water line, under a 60 mm overhanging coping handhold. Return: inlets at the deep end, surface to the channel (often to waste: indicative), draw-off at the shallow end. Plaque facts: West Bromwich's 1934 pool had a tiled scum channel and a new filter plant [S2]; at St Annes the filtered water came in at the bottom and pushed the surface into the channel [S3]; gutters flooded in surges and washed scum back [S15].
3. **Roll-out gutter**: no British or European source; timeline note only ("American practice", indicative) unless the owner wants it kept.
4. **Skimmer pool** (mid-century, private pools; date indicative). Profile: water 150 mm below the coping; skimmer mouth 300 × 150 mm with floating weir and basket [S8, S11]; main drain. Return: wall inlets. Plaque: few skimmers take less of the surface than a weir all round [S8].
5. **Deck-level: Finnish** — sloping beach-like edge with handhold, water raised to it, covered channel with coved gutter tile, edge tiles 150 and 119 mm [S5, S6, S7]; low wave rebound. **Zurich** — a raised overflow edge that is itself the handhold, channel behind with coved gutter tile [S5, S7]. **Wiesbaden** — one large gutter stone combining handhold and channel at the pool's edge, under a cover grating [S5]. Return for all: gravity to a balance tank, pumped through filters, back by floor inlets [S8, S9]. Channel sizes indicative (about 200 mm wide × 150 mm deep). Dates not sourced: plaque says "late twentieth century" or nothing. The existing `deck-overflow` profile (tiled nosing, slope, ceramic grating) best matches the **Wiesbaden Style** (ceramic cover grating, [S5]): indicative.
6. **Grated channel and balance tank** (contemporary). Profile: water flush with deck, slot/grating, gutter below [S8]. Balance tank cut-away: top level just below the channel's base, surge at 80 litres a bather for half the bathing load, minimum level for backwash without the pumps drawing air [S9, S10]. Plaque: "ten swimmers push out about 750 litres" [S8].
7. **Infinity edge** coda: John Lautner's Silvertop, Los Angeles, late 1950s (dates vary 1956–63) [S12, S13, S14]; popular from the late 1980s [S14]; a deck-level overflow on one side with a balance tank.

**Timeline notes (sourced):** 1909 Liverpool's first continuous filter plant; 1925 Ministry of Health report; 1931–36 Liverpool installs 17 plants; 1934 West Bromwich purification plant and scum channel; late 1940s breakpoint chlorination [S1]; late 1950s Silvertop; 1971 "Diamonds Are Forever" vanishing edge; late 1980s infinity edges spread; PWTAG Technical Note 32 on balance tanks [S10]. Still unsourced (leave off): the UK surface draw-off percentage for the entrance panel, FINA racing-edge rules, the deck-level systems' dates.

### Research conflicts

- **dev17 `scum-trough` dated "1960s"** (`edge-profiles.ts`, and the room's header comment): wrong as a date of origin; scum channels were in British baths by 1934 [S2, S3]. The brief's "1920s–30s, and for decades after" stands, safest as "1930s".
- **dev17 `rollout` dated "1940s"**: unverified; no source puts it in British or European practice.
- **dev17 `deck-overflow` dated "1980s"**: unsourced; neither confirmed nor refuted.
- **Entrance panel fact** (share of circulation off the surface): not found for the UK; US codes range 50–80 %, not usable for a British pool.
