# 107f: PLANTROOMS, "What's in the Skimmer?": a game of emptying a skimmer

Status: planned 2026-10-28, not started. A sub-prompt of mission 107 (`doc/prompts/107-pool-science-museum.md`), after 107-0 (`doc/prompts/107-0-exhibit-groundwork.md`), which gives a hall its exhibit hook and reset on entry. It is one of the owner's themes for Halls 5 to 12, **not yet given a hall number**: the owner will place it. It is a separate hall from "Gutters You Can Trust" (pool edges through the ages), which may become a hall of its own; the owner is deciding.

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first and follow it, above all: all input goes through the one control scheme in `src/toolkit/controls/` (read its `AGENTS.md`), and rooms bind no keys of their own; `logic/` is pure and tested; displays redraw only when they change. Then read mission 107 (Hall 0's painted pool), 107-0, and dev5, "Putting Things in the Bin" (`src/toolkit/gallery/rooms/bin-room.ts`), which already carries objects to a skip.

## The owner's request

The owner, 2026-10-28: "a room that has a simulated poolside, which is obviously dry and made of paint, with a skimmer that you can open up and reach into. Within the skimmer, you can pull out objects and then place them in a nearby skip that is waiting for you for exactly this purpose … The object of the game is to remove all of the objects from the skimmer. You just basically open the skimmer up, put its lid to one side, and then click on the skimmer to remove an object, and then walk over to the skip to place it in there. That's literally all the game will be."

And, of narration: "Anytime you pull out an object, I might actually do some voiced sections for this."

The objects: those commonly found in pool skimmers, historical and sometimes disgusting, for children: disgusting, but not obscene.

## Rules for every hall (the owner, 2026-10-28)

1. **Every hall starts from its reset state the moment you step into it.** Its time is set to now, the visitor's real local time, and its exhibit is put in its reset condition. Walking in is the same as pressing its RESET button. No hall's state carries over from an earlier visit. Here: the lid back on, the skimmer full again, the skip empty, nothing in the visitor's hands.
2. **Time.** A hall's simulated time starts at now. If the visitor speeds it up, the hall's time display follows. Halls may show time in different ways. **This hall has nothing that runs in time**, so it needs no speed buttons: a Poolguard pool clock (`createPoolClock`) on the poolside wall, as every poolside has, shows the visitor's local time at ×1, and that is all.
3. **Halls start empty.** The hall begins with set decoration only; this sub-prompt builds its exhibit.

## What the hall teaches, and what it builds on

**Assumes:** only Hall 0's joke, that the water is paint. It stands on its own wherever it is placed, a breather between the plant halls.

**Teaches, lightly:** a pool's surface carries most of its dirt (hair, skin, sun cream, leaves, insects all float), so pools skim it: a skimmer draws off the top of the water and its basket catches the big things before they reach the pump; emptying the baskets is one of the first jobs of a pool's day. (Hall 2's deck-level pool does the same job by overflowing all round its edge into the balance tank; the panel says so if Hall 2 comes before it on the route.)

**Mostly:** a small, satisfying game for children, with a lot of disgusting things in it.

## The room

- **A dry poolside, like Hall 0's** (`PAINTED_POOL` in `src/toolkit/gallery/logic/museum-plan.ts`, its floor painted once as one drawn texture in `src/toolkit/gallery/views/museum-hall.ts`): the water painted on the floor, its blues and its light's ripples, flat; a tiled deck, a tiled edge and coping; here the edge is a skimmer pool's (the water's painted surface a little below the coping, drawn as paint on a stepped tile face), not Hall 0's deck-level gutter. Reuse Hall 0's painting code with a skimmer edge as its variant, rather than a second painter.
- **One wall skimmer** set into the edge, real-looking (new, Certikind, who make "pool fittings: drains, inlets, gratings, skimmers"; `createSkimmer` in `src/toolkit/components/pool/views/pool-fittings.ts` is the spa's small skimmer and its starting point): its round deck lid in the coping, its throat in the tiled wall with the weir flap, and, under the lid, its basket, full. The lid is lifted off and set aside; with it off, the basket is seen, and clicking into the skimmer takes out the next object.
- **A small skip** a few metres along the deck, waiting (`createSkip` in `src/toolkit/components/site-dressing/views/skip.ts`, a builder's mini skip, its hirer's lettering by `letterSkip`), with a museum sign: "For things found in the skimmer".
- **Set decoration:** a lifeguard's chair, a poolside bench, the pool clock, a "No running" sign; the safety layer as every hall.

## The game, exactly as the owner describes it

1. **Open the lid and put it to one side.** The lid is a portable object: pick it up (it lifts off its seat), carry it, set it down anywhere on the deck. The skimmer can be reached into only while its lid is off.
2. **Click the skimmer to take out one object.** The next object comes into the visitor's hands; they hold one at a time (clicking again while holding does nothing, or says "Your hands are full").
3. **Walk to the skip and put it in.** Let go within reach of the skip and it goes in.
4. **Repeat until the skimmer is empty.** Then the "skimmer cleared" moment: a cheerful chime, the skip's sign lights "SKIMMER CLEARED!" with the count ("You took out 14 things. Lovely."), and its voice clip if recorded.
5. **RESET** (a RESET SIMULATION pedestal, as every hall's, with its sign), **and walking in**, refill it: the lid on, the objects back in the basket in a fresh order, the skip empty.

Dropped anywhere but the skip, an object falls to the deck as carried things do and can be picked up again; it does not count until it is in the skip. The lid tossed at the skip does not go in: it drops beside it (the skip takes only the skimmer's finds).

## Carrying: the mechanic exists, in the control scheme

`src/toolkit/controls/` already has picking up, carrying and dropping, with the fall simulated (`src/toolkit/controls/input/object-handling.ts`, `createObjectHandling`, `PortableObject`; drop profiles in `logic/drop-profile.ts`; the carried object's phases in `logic/portable-board.ts`: installed, held, falling, settled), and a room's chance to take a released object itself, `divert`, which is how dev5's skip works (`src/toolkit/components/site-dressing/parts/bin-tossing.ts`, `createBinTossing`, its rule in `site-dressing/logic/bin-toss.ts`: released within reach of a bin's opening, the object flies in a parabola into it and lands with a clang). Use them; no room-specific input. What is new, and goes in the control scheme, not the room:

- **Taking something into the hands from a container:** today the visitor picks up an object that is already lying in the world. The skimmer hands one over: a `give(object, portable)` (or a container's `take()` returning the next portable) in `object-handling.ts`, putting a new portable object straight into the held phase, with the pick-up sound. Tested beside it.
- **A portable that is not a board.** `PortableObject.component` is a `createPortableBoard`; check that a small prop (a frog, a coin) can use it as it is (it is generic in its phases and drop profile, despite its name), and give each object a drop profile (a coin rings and rolls, the hair clump flops, the rubber duck bounces).
- **The divert's filter:** `createBinTossing` takes anything released near it; it needs to accept only the skimmer's finds (a predicate), so the lid drops beside the skip.

## The schematic

The skimmer is a pool fitting, real and working in what it does here (its lid lifts, its basket holds things), but it is connected to nothing: the poolside is dry. A one-node schematic (`src/game/plant/museum-skimmer.ts` or with the hall's model) gives it its derived tag for the overlay (the skimmer SK1, its lid and basket as its parts), with its suction line shown capped below the deck on the cut-away panel; the room code follows the hall's number when the owner places it. No valves, no instruments.

**The game's state is pure logic** (`src/toolkit/gallery/logic/museum-skimmer-game.ts`, tested): the objects in the basket (in order), the one held, those in the skip, those dropped elsewhere, the lid's place (on, held, set down); `take`, `binned`, `dropped`, `cleared`; `reset(seed)` with a fresh order and the rare finds drawn by chance.

## The mimic

No mimic: there is no plant to map. In its place, a cut-away panel of a skimmer (lid, weir flap, basket, the suction line to the pump), drawn as a museum diagram.

## The objects

Each a small modelled prop (a few hundred triangles, its own drop profile), with a short caption card when picked up (one line, plain and friendly, shown in the inspection overlay's style through `src/toolkit/controls/logic/hud-policy.ts`, for a few seconds or until the next). Family-friendly: disgusting, never obscene. Proposed, each with its id (also its voice clip's name):

| Id               | Object                      | Caption                                                                                       |
| ---------------- | --------------------------- | --------------------------------------------------------------------------------------------- |
| `hair-clump`     | a hair clump                | "A clump of hair. Hair floats, so the skimmer catches lots of it. Yuck."                      |
| `hair-bobble`    | a hair bobble               | "A hair bobble. Somebody's ponytail came undone."                                             |
| `hair-grips`     | hair grips                  | "Hair grips. Thousands of these go into pools every year."                                    |
| `plaster`        | a sticking plaster          | "A plaster. Warm water makes them peel off. Ew."                                              |
| `verruca-sock`   | a verruca sock              | "A verruca sock. Only ever one: where do the other ones go?"                                  |
| `leaves`         | a handful of leaves         | "Leaves, blown in through the doors."                                                         |
| `bee`            | a drowned bee               | "A bee. Insects land on the water and can't climb out."                                       |
| `frog`           | a frog                      | "A frog! They hop in from the grass outside. Lifeguards put them back in the garden."         |
| `earring`        | an earring                  | "An earring. Lost property will be pleased."                                                  |
| `coins`          | a few coins                 | "Coins: 47p. Nobody knows why people swim with money."                                        |
| `sixpence`       | a pre-1971 sixpence         | "An old sixpence, from before 1971. This has been down here a long time."                     |
| `wedding-ring`   | a wedding ring              | "A wedding ring! Cold water shrinks fingers and rings slip off. Somebody will be very happy." |
| `goggle-lens`    | a goggle lens               | "Half a pair of goggles."                                                                     |
| `nose-clip`      | a nose clip                 | "A nose clip, for synchronised swimmers and people who hate water up their nose."             |
| `earplug`        | an earplug                  | "An earplug. It's been in someone's ear."                                                     |
| `swimming-badge` | a cloth swimming badge      | "A 25 metres badge, sewn on and come off. Well done, whoever you are."                        |
| `dummy`          | a baby's dummy              | "A dummy. Somebody small is very upset about this."                                           |
| `dinosaur`       | a toy dinosaur              | "A toy dinosaur. It's extinct now."                                                           |
| `rubber-duck`    | a rubber duck               | "A rubber duck, where it belongs, nearly."                                                    |
| `crisp-packet`   | a crisp packet              | "A crisp packet. No eating on the poolside!"                                                  |
| `contact-lens`   | a contact lens              | "A contact lens. Very hard to spot. Well found!"                                              |
| `false-teeth`    | false teeth (the rare find) | "FALSE TEETH! The rarest find of all. Somebody laughed too hard on the flume."                |

A fill is proposed as twelve to fifteen of them in a random order, the false teeth in about one fill in five (question 1), the hair clump always first, on top, because it always is.

## Narration hooks

- **Where the clips live:** `resources/sound/voice/skimmer/<id>.mp3` (the ids above), plus `resources/sound/voice/skimmer/cleared.mp3` and `.../intro.mp3` (optional, played on the first click of the lid). A short `index.md` there lists every id, its caption as the script, and whether it is recorded, so the owner can record them in one sitting.
- **Loading:** by `import.meta.glob('../../../../resources/sound/voice/skimmer/*.mp3')` (Vite resolves only the files that exist), so a missing clip is simply absent: no 404s, no errors, the caption alone is shown. The game is complete without a single clip.
- **Playing:** front centre (`markFrontCentre` and the front-centre bus in `src/toolkit/components/core/audio/front-centre.ts`), one at a time (a new pick-up stops the last clip), the caption card showing its text for as long as the clip plays (or its usual few seconds), under the master volume, and counted as one sound by mission 098's limit on how many sounds play at once, if that is built by then.

## The museum panels (text outline)

- **Entrance panel.** Headline "What's in the Skimmer?". Big idea: "Most of a pool's dirt floats. The skimmer takes the top of the water, and its basket catches the big things. Somebody has to empty it. Today, that's you." Try it: "Lift the lid and put it to one side. Click the skimmer to take something out. Put it in the skip. Empty the skimmer!" RESET pedestal and sign beside it.
- **Why skimmers matter** (by the cut-away): "Hair, skin, sun cream, leaves and insects all float, so most of the dirt is at the surface. A skimmer draws off the top few millimetres of water; its basket stops the big things before they reach the pump and the filter." Fact: "Emptying the skimmer baskets is one of the first jobs on a pool's morning checklist."

## Reuses (paths checked 2026-10-28)

`src/toolkit/controls/input/object-handling.ts` (`createObjectHandling`, `PortableObject`, `divert`), `src/toolkit/controls/logic/portable-board.ts`, `drop-profile.ts`, `hud-policy.ts`; `src/toolkit/components/site-dressing/parts/bin-tossing.ts` (`createBinTossing`), `site-dressing/logic/bin-toss.ts`, `site-dressing/views/skip.ts` (`createSkip`, `letterSkip`), `site-dressing/logic/skip-dressing.ts`; dev5's room `src/toolkit/gallery/rooms/bin-room.ts` (the pattern); `src/toolkit/components/pool/views/pool-fittings.ts` (`createSkimmer`); Hall 0's painted pool (`PAINTED_POOL`, `museum-hall.ts`); `src/toolkit/components/architectural/views/pool-clock.ts`; `src/toolkit/components/core/audio/front-centre.ts`; `src/toolkit/gallery/views/museum-exhibit.ts` (RESET pedestal, panels).

**New:** the wall skimmer with its liftable lid and basket; the objects and their drop profiles; the game's pure logic; `give` (or a container's `take`) in the control scheme and the bin's filter; the caption card; the voice clip folder and its loader; the skimmer-edge variant of the painted poolside; the cut-away panel.

## Acceptance

- The game's logic test: the skimmer cannot be reached into with the lid on; one object at a time; an object counts only in the skip; the lid never goes in the skip; "cleared" exactly when the last find lands in it; RESET and walking in give a full skimmer, lid on, empty skip, empty hands; the false teeth appear at their chance over many seeded fills.
- The control scheme's tests for `give` and the bin filter, beside the existing `object-handling.test.ts` and `bin-tossing.test.ts`.
- With no clips the game is complete and silent but for its sounds; with one test clip in the folder it plays front centre on its object's pick-up (the test clip not committed).
- **Walking in from the hall before** (whichever the owner places it after): the hall at its reset state; walk on and back, and it is reset again.
- Browser checks on high, medium and low: the whole skimmer emptied once, an object dropped on the deck and picked up again, the lid set aside and put back by RESET; screenshots and camera links recorded here.

## Performance budget

Tiny: the props small and few (about fifteen meshes, only the held and falling ones moving), the painted poolside one texture, the skip and skimmer merged by material; captions redrawn only when they change; within `DEFAULT_BUDGET`, nothing in `KNOWN_OVER_BUDGET`; at least 60 fps on medium and 50 on high through an archway.

## Before a hall number

Until the owner places it, build and try it in the next free development room (dev52, unless taken by then), as CLAUDE.md asks for new equipment, then move the exhibit into its hall through 107-0's hook.

## Open questions for the owner (one at a time, in this order)

1. **How many finds a fill:** a random dozen or so from the list, the false teeth one fill in five (recommended), or all of them every time?
2. **The list:** anything to add or take out (the frog, for instance: real, or a toy frog)?
3. **The caption card:** a line on the screen (recommended), or a little printed label that pops up beside the object in the world?
4. **The narration:** one clip per object, the cleared moment and an introduction, as listed, recorded by you; any you would like scripted differently from the captions?

## Research: what the hall holds

Researched 2026-10-28 by web search. Anything not traced to a source below is marked _indicative_: plausible from general trade knowledge, not verified.

### The skimmer to model

Base the Certikind wall skimmer on the common concrete-pool skimmer of the AstralPool and Hayward kind, which is what a skimmer pool of the plant's period would carry:

- **Body:** a moulded ABS box set into the pool wall, about 17.5 litres, rated about 7.5 m³/h; the maker recommends one skimmer for every 25 m² of water surface (AstralPool listing). So a real 25 m pool would have several along one side; ours shows one.
- **Deck lid:** round or square, about 250 mm across (Hayward sells 10 in square lids for its SP1082 series), sitting in a collar with about 38 mm of height adjustment and a spacer ring that lets it be turned to line up with the coping (Hayward, AstralPool listings). Use a round lid, Certikind-marked, with two finger holes to lift it by.
- **Throat:** a rectangular mouth in the tiled wall, about 200 mm wide by 150 mm tall (_indicative_), the painted water line at its middle.
- **Weir flap:** a hinged, floating flap across the throat that rises and falls with the water (Hayward's snap-in weir follows about 115 mm of level change); dry here, so it hangs at rest.
- **Basket:** a round perforated plastic basket with a carrying handle, about 165 to 190 mm across and 125 mm deep (Hayward SP1082 basket listings, which disagree by a few millimetres), sitting on a ledge over the suction port. It is what the visitor reaches into.
- **Suction port:** a 50 mm (2 in) threaded port in the bottom, to the pump (Hayward SP1082); capped on the cut-away panel.

### The skip

Keep `createSkip` (a mini skip), hired from a made-up local firm by `letterSkip`. The real job empties baskets into a bucket or bin bag, not a skip, which is part of the joke; the museum sign says so: "In real life, a bin bag. Here, a skip, because there's so much of it."

### The room dressing

As the brief lists, plus, all static set decoration: a long-handled leaf net and a skimmer-basket hook on the wall (pool technicians use a hook rather than a hand, after the snake stories below); a pair of rubber gloves on the bench; a lost-property box beside the lifeguard's chair (for the ring, earring and keys, though the game bins them: the caption may say "to lost property, really"); a laminated "Opening checks" sheet on the wall with "Empty skimmer baskets" ticked.

### The finds

About twenty, keeping the brief's ids and adding a few. A plausible basis is given for each.

| Id               | Find                        | Caption                                                                                       | Basis                                                                                                                                   |
| ---------------- | --------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `hair-clump`     | a hair clump                | "A clump of hair. Hair floats, so the skimmer catches lots of it. Yuck."                      | the brief's teaching point; _indicative_ trade knowledge                                                                                |
| `hair-bobble`    | a hair bobble               | "A hair bobble. Somebody's ponytail came undone."                                             | _indicative_                                                                                                                            |
| `hair-grips`     | hair grips                  | "Hair grips. They sink, rust and stain the tiles, so we're glad to catch these."              | _indicative_; the brief's "thousands every year" is unverified                                                                          |
| `plaster`        | a sticking plaster          | "A plaster. Warm water makes them peel off. Ew."                                              | _indicative_                                                                                                                            |
| `verruca-sock`   | a verruca sock              | "A verruca sock. Only ever one: where do the other ones go?"                                  | UK swimming-baths staple, _indicative_                                                                                                  |
| `leaves`         | a handful of leaves         | "Leaves, blown in through the doors."                                                         | leaves are the commonest basket load (Aqua Magazine; the copperhead story)                                                              |
| `bee`            | a drowned bee               | "A bee. Insects land on the water and can't climb out."                                       | _indicative_                                                                                                                            |
| `frog`           | a frog                      | "A frog! Lifeguards put them back in the garden."                                             | lifeguards report frogs and rats in strainer baskets (Mental Floss)                                                                     |
| `earring`        | an earring                  | "An earring. Lost property will be pleased."                                                  | _indicative_                                                                                                                            |
| `coins`          | a few coins                 | "Coins: 47p. Nobody knows why people swim with money."                                        | _indicative_                                                                                                                            |
| `sixpence`       | an old sixpence             | "An old sixpence. They stopped making these over fifty years ago."                            | see conflicts                                                                                                                           |
| `wedding-ring`   | a wedding ring              | "A wedding ring! Cold water shrinks fingers and rings slip off. Somebody will be very happy." | _indicative_                                                                                                                            |
| `car-key`        | a locker key on a wristband | "A locker key. Somebody is standing in a towel, waiting."                                     | a technician found a homeowner's car keys in a basket after a week's search (Aqua Magazine); a locker key is the leisure-centre version |
| `goggle-lens`    | a goggle lens               | "Half a pair of goggles."                                                                     | _indicative_                                                                                                                            |
| `nose-clip`      | a nose clip                 | "A nose clip, for synchronised swimmers and people who hate water up their nose."             | _indicative_                                                                                                                            |
| `earplug`        | an earplug                  | "An earplug. It's been in someone's ear."                                                     | _indicative_                                                                                                                            |
| `swimming-badge` | a cloth swimming badge      | "A 25 metres badge, sewn on and come off. Well done, whoever you are."                        | _indicative_                                                                                                                            |
| `dummy`          | a baby's dummy              | "A dummy. Somebody small is very upset about this."                                           | _indicative_                                                                                                                            |
| `dinosaur`       | a toy dinosaur              | "A toy dinosaur. It's extinct now."                                                           | _indicative_                                                                                                                            |
| `rubber-duck`    | a rubber duck               | "A rubber duck, where it belongs, nearly."                                                    | _indicative_                                                                                                                            |
| `grapes`         | a bunch of grapes           | "Grapes. Somebody brought a picnic into the pool."                                            | a bag of grapes seen in a pool (Swimming World)                                                                                         |
| `crisp-packet`   | a crisp packet              | "A crisp packet. No eating on the poolside!"                                                  | _indicative_                                                                                                                            |
| `contact-lens`   | a contact lens              | "A contact lens. Very hard to spot. Well found!"                                              | _indicative_                                                                                                                            |
| `false-teeth`    | false teeth (the rare find) | "FALSE TEETH! The rarest find of all. Somebody laughed too hard on the flume."                | _indicative_ (a classic of pool lore, not sourced)                                                                                      |

Left out on purpose: the snakes, skunk and drowned squirrels of the American stories (too frightening or too sad for children), and anything bodily beyond hair and plasters.

### Research conflicts

- **The frog's caption** says frogs "hop in from the grass outside". An indoor leisure-centre hall has no grass at its doors; the sources are outdoor pools. Proposed above: "Lifeguards put them back in the garden", or the owner's question 2 (a toy frog) settles it.
- **The sixpence.** "From before 1971" is true but loose: pre-decimal sixpences were last minted for circulation in 1967 and stayed legal tender (as 2½p) until 1980 (_indicative_, from general numismatic knowledge, not checked against the Royal Mint). The caption above avoids the date.
- **Hair grips:** "thousands every year" has no source; reworded above.

### Sources

- AstralPool 17.5 L square-lid skimmer listing (flow, one per 25 m², spacer ring): https://quimidev.lineagrafica.es/en/14556-skimmer-astralpool-square-lid-175-l.html
- Hayward SP1082/SP10821 auto-skim (snap-in weir, collar adjustment, 2 in ports, 75 US gal/min): https://lesliespool.com/above-ground-pool-skimmer/6e5107e1-c5e9-4305-bdba-ac69ff475444.html and https://tst-shop.pool360.com/Product/pool-hay-25-1641
- Hayward basket sizes: https://www.ebay.com/itm/335932620285 and https://inyopools.com/Products/14801352067247.htm
- Aqua Magazine, "I Spy With My Little Eye" (car keys, copperhead in leaves, baby skunk on the weir): https://www.aquamagazine.com/service/article/15122937/i-spy-with-my-little-eye
- Mental Floss, lifeguards' secrets (frogs and rats in strainer baskets): https://www.mentalfloss.com/culture/jobs/15-behind-scenes-secrets-pool-lifeguards
- Swimming World, "13 Weird Objects Found in the Pool" (grapes): https://swimmingworldmagazine.com/news/13-weird-objects-found-in-the-pool
- Skimmer community thread on strangest basket finds: https://thepooldeck.getskimmer.com/life-on-the-road-36/what-s-the-strangest-thing-you-ve-found-in-a-skimmer-basket-231
