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
