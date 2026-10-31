# Mission 116: the crosshair says what picking up and putting down will do

Research and plan only, 2026-10-31, revised the same day after Codex's review (`codex-critique.md` beside this file; what was taken and what was not is in section 7). Nothing here is built. It follows mission 115 (`doc/prompts/115-knob-turn-crosshair.md`) and its second part (`doc/plans/115/push-pull-cue.md`, with its answered questions), which turn the crosshair into a context-sensitive cue: a turn arrow over knobs, push and pull arrows over buttons, green when a use will work and red when it will do nothing.

## The owner's request

The owner, 2026-10-31: cues on the crosshair for picking things up and putting them down, "inspired by the works of Sierra and LucasArts, because they had a sort of context sensitive icon system". It is the answer to question 8 of the push-pull plan: "the plain ring for now; later, pick-up and put-down cues of their own". Today anything that can be picked up turns the ring amber (green once the push-pull work lands); while carrying, the ring turns green over a place the part fits and becomes a red × over one it does not (`handling.targetFeedback`).

### How I have read it

- The cue should say, before the click, what a click will do with a thing you can carry: lift it, put it back in its place, set it down here, drop it in a bin or a carton, fit it into a socket, or nothing (red).
- It is one family with the turn, push and pull arrows: the same tapered, faded, dark-edged style, the same green and red, drawn by the same code, decided by the same pure rule.
- "Inspired by" means the principles, not the art. Every icon below is original.

## 1. The originals, and what carries over

### Sierra (SCI, 1988 to 1995)

- **An icon bar and a cursor that is the verb.** From _King's Quest V_ (1990) Sierra replaced the text parser with an icon bar hidden along the top of the screen: walk, look (an eye), hand (use: "push, pull, interact with and pick up"), talk (a head), and the inventory ([StrategyWiki, KQ5](https://strategywiki.org/wiki/King%27s_Quest_V:_Absence_Makes_the_Heart_Go_Yonder!/Gameplay); [KQ5 manual](https://www.mocagh.org/sierra/kq5-manual.pdf)). The cursor took the shape of the chosen verb, and the right button cycled through them ([StrategyWiki, KQ6 controls](https://strategywiki.org/wiki/King%27s_Quest_VI:_Heir_Today,_Gone_Tomorrow/Controls)).
- **The inventory item became the cursor.** "Choose the Inventory icon, move the arrow to the item ... the cursor will change to look like the item you have selected", and an Item icon on the bar kept the last one chosen ([KQ5 manual](https://www.mocagh.org/sierra/kq5-manual.pdf); [Sierra manual](https://www.mocagh.org/sierra/sierra-manual.pdf)). Using an item on the world was simply clicking with it.
- **The cursor did not know the world.** SCI's cursors were "dumb": the player chose the verb and the game said afterwards, in text, whether it worked ("That doesn't work"). _Gabriel Knight_ (1993) split the hand into pick up, open/close, operate and move, and reviewers found the crowd of similar verbs hard to tell apart ([Wikipedia, GK1](https://en.wikipedia.org/wiki/Gabriel_Knight:_Sins_of_the_Fathers); [Hardcore Gaming 101](https://www.hardcoregaming101.net/gabriel-knight-sins-of-the-fathers/)); its sequel moved to a single context-sensitive cursor. "Can't" was told after the click, never shown before it.

### LucasArts (SCUMM, 1987 to 1998)

- **Verbs on screen, a highlighted default, a sentence line.** _Monkey Island 2_ (1991) had nine verbs under the scene and a sentence line that built the command as the pointer moved ("Pick up sign"); the verb that suited the object under the pointer was highlighted, and the right button used it ([MI2 manual](https://mocagh.org/lucasfilm/mi2-manual.pdf)). Walk to was the default, the quiet verb that needs no saying.
- **The verb coin.** _Full Throttle_ (1995) put the verbs on the object: hold the button over a hot spot and a coin opens there, a gang-emblem skull whose eyes look, whose tongue talks or tastes, a fist to use, grab or hit, and a boot to kick; release over one to do it ([Wikipedia, Full Throttle](<https://en.wikipedia.org/wiki/Full_Throttle_(1995_video_game)>); [Giant Bomb](https://www.giantbomb.com/games/3030-21174/)). _The Curse of Monkey Island_ (1997) kept it as a hand, a skull and a parrot, and its crosshair cursor changed colour over anything interactive ([Lucasfilm Wiki](https://lucasfilm.fandom.com/wiki/The_Curse_of_Monkey_Island); [AGS wiki, verb coin](https://www.adventuregamestudio.co.uk/wiki/Verb_coin)). An inventory item, once taken from the chest, was the cursor until put away. Wikipedia's SCUMM article traces the shrinking of the verbs from a panel to the coin at the cursor, and then to Humongous's cursor that simply fills in over something usable ([Wikipedia, SCUMM](https://en.wikipedia.org/wiki/SCUMM)).
- **The world as cursor.** _Grim Fandango_ (1998) had no pointer: Manny turned his head towards what he could use. Praised for immersion, it was criticised because, with things close together or far away, it was hard to tell which he meant, and the remaster added a pointer back ([sentex review](https://www.sentex.ca/~datanguayh/games/grim_rev.html); [PC Gamer](https://pcgamer.com/grim-fandango-remastered-review)).

### Later single cursors

- _**Broken Sword**_ (Revolution, 1996): one cursor that changes over a hot spot to show what a click will do, a click for the action and the other button to look, a pointing hand over an exit ([StrategyWiki](https://strategywiki.org/wiki/Broken_Sword:_The_Shadow_of_the_Templars); fans describe it as the cursor "switching automatically to the suggested action", [Thimbleweed Park forum](https://forums.thimbleweedpark.com/t/favorite-adventure-game-interface-style/317)).
- _**The Longest Journey**_ (Funcom, 1999) kept a single cursor that marks a hot spot, and on a held click offered a small set of verbs (look, use, talk) in the manner of the coin. I found no primary source for its icons, so I rely on the principle only.

### What made them read well

1. **One glyph, one meaning, a small set.** Five or so verbs; the trouble came when there were more (GK1's four kinds of hand).
2. **The cursor is the verb.** Its shape says what a click will do; nothing else on screen needs reading.
3. **The default is quiet.** Walk to needed no glyph; the cursor only changed when something more was on offer.
4. **The held thing is the cursor.** You carry it to where it goes and click.
5. **The game decides the verb (from _Broken Sword_ on).** The player is told what will happen, not asked to choose.
6. **Silhouettes, not pictures.** Each icon read at 16 to 32 pixels because it was a bold outline with one idea in it.
7. **"Can't" came late.** Sierra said it in words after the click; LucasArts mostly by not highlighting. Neither showed a refusal before the click; that is something this game can do better, and mission 115 already does (red).

### What carries over to a first-person crosshair

- **The single context-sensitive cursor, not the coin.** The game has one use input (click, E, A, the Use button), and the rule already decides what it does; a coin would need a hold and a menu, which the control scheme gives to the use's hold (`currentUseHold`). The cue is _Broken Sword_'s, with _Monkey Island 2_'s highlighted default: say the one thing a click will do.
- **The held item as cursor is already true in first person.** The thing carried is drawn in the player's hands, below and to the right of the crosshair (`object-handling.ts`, `held.grab` eases to 0.18, −0.18, −0.65 m). A silhouette beside the ring would repeat what is on screen. What is not on screen is its name; that goes in the help line (below).
- **Shape language**: an arrow says where the thing goes (up from its place, down into another); a mark under the ring says what kind of place (a surface, its own outline, a bin, a socket). This keeps the family to one arrow and four marks, the "small set" rule.
- **The quiet default**: carrying with nowhere in particular aimed at, a click drops the thing. That is the walk-to of carrying: the plain ring.
- **"Can't", before the click**: the same glyph in red, as 115 does.

## 2. Picking up and putting down in the game today

### The mechanism (`src/toolkit/controls/input/object-handling.ts`)

- **Portable**: an object with `userData.portable` (`makeBoardPortable`, `core/parts/portable-board.ts`, only for `attachment: 'detachable'`). Its component has a phase (`installed`, `held`, `falling`, `settled`) and `canPickUp`, a computed `detachable && !locked`.
- **Picking up**: `use(x, y)` raycasts the room's `objects`; the first visible hit within 3.2 m, walked up to its portable, is taken if `canPickUp` and the room's `allowPickup` agree. Otherwise `use` returns false and the room's own `use` runs instead (`first-person.ts`, `if (!handling?.use(x, y)) options.use(x, y)`).
- **Carrying**: held in front of the eye, kept out of `carrySolids`. Holding X (mouse), INSPECT (touch) or Y (pad) turns it with the look input ("hold X while carrying, move mouse: turn object", `logic/controls.ts`).
- **Releasing**, in this order:
  1. `useWhileHolding` (the room's): a control is worked instead and the thing stays in the hands (dev0, dev4, dev5; the door latch and rear cover parts mark themselves `useWhileCarrying`).
  2. `heldAction` (the room's): it may seat the thing, return it, or `'refuse'`, when nothing happens.
  3. A `placementTarget` or `placementSurface` aimed at within its reach: placed if it `accepts`, otherwise nothing happens and the thing stays held.
  4. `divert` (the room's, usually `createBinTossing`): within 2 m of a bin, tossed in.
  5. Otherwise **dropped**: it falls forward out of the hands and settles by its drop profile.
- **The cue now**: `targetFeedback(x, y)` (the room's custom one first, then a placement target, then `nearbyTargetFeedback`) gives `accept`, `reject` or null; the crosshair draws a larger green ring, a red ×, or the plain ring. Not carrying, `aimed()` is true over something `canPickUp`, and the ring is amber.

### Every situation

| Where                                                                                                             | What is carried                                                           | Picked up when                                                                             | Put where                                                                                                                                                             | Feedback now                                         |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **Engineer's office** (game room, `shell-room.ts`, `room-equipment.ts`, `engineers-desk.ts`, `logic/put-back.ts`) | seven boxed software titles                                               | `put-back.ts`: not while something resting on it is home; from the carton only the top one | aimed at the Gateway 3000 carton: **into it**; anywhere else: **back to its own place**, exactly; `'refuse'` if its support (the box under it) is away                | none: plain ring                                     |
| Engineer's office, the two storage cupboards (`engineer-storage-cupboard.ts`)                                     | drawer items (bulbs, fuses, O-rings, gaskets)                             | the doors fully open and the drawer pulled out (`canRemove`)                               | aimed at **its own drawer**: back in; anywhere else: **dropped**                                                                                                      | none                                                 |
| dev1, racks room                                                                                                  | the same cupboard items                                                   | as above                                                                                   | as above                                                                                                                                                              | none                                                 |
| **Museum Hall 5**, What's in the Skimmer? (`hall-5-day-in-the-life.ts`)                                           | the skimmer's finds, handed over (`hands.give`)                           | not during the film                                                                        | the skip (`takes` finds only), or **dropped** on the deck                                                                                                             | the skip's nearby accept (green ring)                |
| Museum halls in general (`exhibit-carrying.ts`, `museum-hall-room.ts`)                                            | an exhibit's portable parts, its own `placementTarget`s                   | the hall active, not a neighbouring copy                                                   | the exhibit's targets, or dropped                                                                                                                                     | through the target's `accepts`                       |
| dev0, controls room (`machine-gallery.ts`, `plant-gallery.ts`)                                                    | machine-gallery components and their loose parts (cards, fuse cartridges) | **locked** until the plinth's LOCK / RELEASE button (`canPickUp` false)                    | **on any plinth deck** (`placementSurface`, placed neatly), or dropped; RESET / RETURN puts every part back                                                           | none                                                 |
| dev4, repair room (`repair-room.ts`, `logic/repair-socket.ts`, `repair-fuse.ts`)                                  | PLC cards, a blown and a new 2 A fuse                                     | always (pulled live: a spark)                                                              | **into a socket** of its kind (`heldAction`), the scrap skip, or dropped; refused when the slot is occupied or the part is the wrong kind (SLOT OCCUPIED, WRONG PART) | green ring / red × at a socket; skip's nearby accept |
| dev5, bin room                                                                                                    | one board per plinth                                                      | always                                                                                     | a plinth deck, the skip, or dropped                                                                                                                                   | skip's nearby accept                                 |
| dev53, skimmer reveal                                                                                             | each film's find, handed over                                             | not during the film                                                                        | the skip, or dropped                                                                                                                                                  | skip's nearby accept                                 |
| dev6, settling room                                                                                               | nothing (rubbish thrown in loses `portable`)                              |                                                                                            |                                                                                                                                                                       |                                                      |
| `machine-components.ts`, `replaceable-fuse.ts`                                                                    | backplane cards and fuse cartridges                                       |                                                                                            | a slot of their kind, not occupied                                                                                                                                    | through the room                                     |

Rooms passing `objects: scene` with no hooks (four rendering rooms and some gallery rooms: co2-cage, fires, dosing-console, architectural, truck-yard, aqualis-controller, brands) are to be checked for detachable parts during the work; any found get the generic cues for free.

### Kinds of put-down the game already has

- **Drop**: let go, it falls (everywhere).
- **Put down here**: set neatly on a surface aimed at (`placementSurface`, dev0 and dev5 plinths).
- **Put back**: into its own place (the cupboard's drawer, aimed at; the software box, anywhere but the carton).
- **Put in**: a bin or carton (the bin-tossing skips by nearness; the desk's carton by aim).
- **Fit**: into a socket or slot that checks kind and occupancy (dev4, backplanes, fuse holders, exhibits).

### Things found on the way

- **Per-frame raycasts.** While the crosshair shows, `handling.aimed()` and `handling.targetFeedback()` each raycast the room's objects every frame (the ring's colour is worked out in the animation loop). Mission 094's rule wants the probe at 10 Hz; this mission moves both onto the cue's probe.
- **The engineer's office gives no feedback at all.** A box will go back wherever you aim except the carton, so a player cannot tell that aiming at the carton does something else until it has.
- **Inconsistent defaults.** A software box released anywhere goes home; a cupboard item released anywhere but its drawer falls on the floor. The cues will make this visible; question 2 asks whether to make them agree.
- **Hall 5's comments are stale**: they say the skimmer's lid is portable and its seat takes it back (`hall-5-day-in-the-life.ts`, around lines 125 and 849); the lid is only animated. A `TODO.md` item.

### The owner's planned features this must leave room for

- **Chemicals carried to a balance tank** (`TODO.md`, "Hand dosing at every balance tank"; `doc/prompts/114-aqualis-dosing-controller.md`: "the player picks up containers of chemicals into an inventory, carries them, and adds them to a balance tank or straight into a pool"; `doc/research/pool-dosing-and-water-chemistry.md`: weighed on a scale, carried, added at the tank's hatch, `pool/hand-dose`; 107h: "an enamel bucket of bleach and a measuring jug, tipped into the balance tank").
- **Test kits** (`doc/plans/114/plausible-trio.md`: a DPD comparator, a titration kit, a photometer, used on a sample, results typed in).
- These add verbs the hands do with what they hold, not where they put it: **pour** (tip a jug into the hatch), **weigh** (set on the scale: a put-down whose place reads a value), **fill** and **dip** (a sample tube). The vocabulary below is open for them (a destination names its own action), and an inventory of more than one thing would bring back Sierra's question of which item is "the cursor" (section 3, the held thing).

## 3. The design

### Fitting mission 115

The use cue is being built as:

- `markUsable(object, at => { gesture, direction?, possible })` (`input/use-marking.ts`), asked by the probe of whatever marked thing it finds under the aim;
- the pure rule in `logic/use-cue.ts` (`turn-cue.ts` renamed), with `useCue(answer, pad)` and `useCueKey`;
- the glyphs as inline SVG in `input/use-cue-markup.ts`, drawn over the ring by `first-person.ts`, rebuilt only when the key changes, the probe at most every `INSPECT_EVERY_MS` (100 ms).

Picking up and putting down are not marked one by one: the controls layer owns carrying, so it answers for them itself. The rule is that **the cue and the click are decided by the same code, in the same order** (Codex's first and second points): `createObjectHandling` gains one resolver, `resolve(x, y)`, which returns what a use at that point would do as a plain answer and, separately, the step that does it; `use` and `release` become "resolve, then run", and the probe calls `resolve` and never runs. The order is the code's as it is today:

```
carrying?
  yes → 1. the room's useWhileHolding would take it   → the room's use cue (marked, or the plain green ring)
        2. the room's targetFeedback answers           → its answer (it describes the room's heldAction)
        3. (2 null) a useWhileCarrying part aimed at   → that part's own use cue
        4. a placement target or surface aimed at      → fit / put down / put back / put in, or refused
        5. a bin near enough (divert)                  → put in
        6. otherwise                                   → drop: the plain ring
  no  → 7. a portable thing under the aim, in reach
          can be picked up                             → pick up (green)
          cannot, and nothing else takes the click     → pick up (red)
        8. otherwise                                   → the use cue (mission 115)
```

- **Step 1** is `first-person.ts`'s `use`, which offers the click to the room's `useWhileHolding` before anything else. That hook acts, so it gets a query twin, `useWhileHoldingAt?(x, y): boolean` (whether it would take the click), in the options. Of the three rooms that pass one, dev5's takes any click its `usableAt(x, y)` finds (its `aimed()` is `Boolean(usableAt(0, 0))`, which, given a point, is the twin); dev4's the same, except when a socket is aimed at (`repair-room.ts`, `useWhileHolding`); dev0's hands the click to its `use` (`controls-room.ts`), which finds its hit among its uses and passages before acting, so its twin is that lookup without the call (dev0 passes no `aimed()` today). A room that passes `useWhileHolding` without its twin shows no carrying glyph at all, only the plain ring, because the cue cannot know who has first refusal (Codex's first point, its second option).
- **Step 2** keeps the code's odd but real rule (`object-handling.ts`, `use`): a room's custom `targetFeedback` that answers stops a `useWhileCarrying` part from taking the click, and the release then goes to `heldAction`. So a room's `targetFeedback` is defined, from now on, as "what my `heldAction` will do here", and each room that has both is tested so that they agree (dev4's sockets; the engineer's office, below). It is the only room hook the cue needs for a release; no separate `heldCue`.
- **Steps 4 to 6** are inside `release`, already in this order: `heldAction`, then `placementAt` (an aimed target that refuses stops the release there, without trying a bin), then `divert`. The resolver keeps that: a wrong-kind bin aimed at (Hall 5's skip takes finds only, `takes`) is a refused put-in, even though a bin within two metres would otherwise be a toss (Codex's fourth point).
- **Step 7, red**: when a pick-up is refused, `handling.use` returns false and the room's own `use` runs. So the red lift is shown only when nothing else will take the click: at the centre, when the room's `aimed()` is false and no marked use is under the aim. With a free cursor (where `aimed()`, which only looks at the centre, cannot say) a refused pick-up shows the plain ring, not red (Codex's fifth point). Red then truly means "a click here does nothing".

### The vocabulary: one arrow and four marks

Every glyph is drawn in the reticle's style: a tapered body that fades towards its tail and a full-colour head, with a half-pixel dark edge (`CUE_EDGE`, `#182327`), green `#44df70` when the click will work and red `#f04b43` when it will not. Carrying glyphs are drawn centred on the ring, in a 34 × 46 box whose centre (17, 23) is the ring's (radius about 7 px at scale 1), so the arrow can stand above the ring and the mark below it; the ring itself is never covered.

- **The arrow** says which way the thing goes: **up** out of the ring for lifting it, **down** into the ring for letting it go somewhere.
- **The mark under the ring** says what kind of place: a **line** (a surface), **corner brackets** (its own outline), a **bin** (an open container), **snap ticks** round the ring (a socket).

At the HUD's real size (the ring is 10 px, 18 px when a socket is aimed at; `--overlay-scale` enlarges both) the marks are strokes of 2.5 px over a 4.5 px dark under-stroke, not hairlines, so they read on cream tile and in a dark plant room alike; the half-pixel edge is only round the filled arrow, as on the turn arrow. Whether the four marks are told apart at that size is checked with screenshots in dev0 before any room is changed (order of work, step 4), and the owner is shown them (question 1). If they are not, the fallback is Codex's simpler set: the lift, the fit ring, and one down arrow for every other put (seventh point).

**Pick up**: an up arrow rising from the top of the ring, its tail thin and faint at the ring and its head bold above, and two short curved grips either side of the ring, closing on it like fingers. The grips are what tell it from the push-pull plan's slide-up glyph (a bar across the tail), which is not being built now (toggles, doors and slides were left out, the push-pull plan's questions 2, 4 and 7); if slides come, they must keep the bar and never the grips.

```
        ▲
        █
        ▌
    (  ( o )  )
    grips closing; the thing rises
```

```svg
<svg width="34" height="46" viewBox="0 0 34 46">
  <!-- the lift arrow: tail faint at the ring, head bold above -->
  <polygon points="16.6,15 17.4,15 18.6,7 15.4,7" fill="url(#fade-up)" stroke="#182327" stroke-width="0.5"/>
  <polygon points="17,0 12,7 22,7" fill="#44df70" stroke="#182327" stroke-width="0.5"/>
  <!-- the grips: a dark under-stroke, then the colour -->
  <path d="M7,17 Q3.5,23 7,29 M27,17 Q30.5,23 27,29" fill="none" stroke="#182327" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M7,17 Q3.5,23 7,29 M27,17 Q30.5,23 27,29" fill="none" stroke="#44df70" stroke-width="2.5" stroke-linecap="round"/>
</svg>
```

**Put down here** (a surface, placed neatly): a down arrow above the ring, its head touching the ring's top, and a flat line under the ring.

```
        █
        ▌
        ▼
      ( o )
    ─────────
    set down on this
```

```svg
<svg width="34" height="46" viewBox="0 0 34 46">
  <polygon points="15.4,1 18.6,1 17.4,9 16.6,9" fill="url(#fade-down)" stroke="#182327" stroke-width="0.5"/>
  <polygon points="12,9 22,9 17,15.5" fill="#44df70" stroke="#182327" stroke-width="0.5"/>
  <path d="M6,34 H28" stroke="#182327" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M6,34 H28" stroke="#44df70" stroke-width="2.5" stroke-linecap="round"/>
</svg>
```

(The down arrow's tail fades upwards, away from the ring: the opposite of the lift.)

**Put back** (its own place): the same down arrow, and two corner brackets under the ring, the bottom corners of an outline: the thing's own place, as a shadow left on a shelf.

```
        █
        ▼
      ( o )
    └─     ─┘
    back where it was
```

```svg
<path d="M6,29 V35 H11 M28,29 V35 H23" fill="none" stroke="#182327" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M6,29 V35 H11 M28,29 V35 H23" fill="none" stroke="#44df70" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
```

**Put in** (a bin, a carton, a drawer that is not its home, later a tank's hatch): the same down arrow, and an open bin round the ring's lower half, its sides flaring up past the ring's middle, so the ring sits inside it.

```
        █
        ▼
    \ ( o ) /
     \_____/
    into this
```

```svg
<path d="M5,22 L8.5,37 H25.5 L29,22" fill="none" stroke="#182327" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M5,22 L8.5,37 H25.5 L29,22" fill="none" stroke="#44df70" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
```

**Fit** (a socket or slot that takes it): today's larger green ring, kept (the owner knows it), with four short ticks pointing in at the diagonals, a reticle closing on its seat. No arrow: the click seats it where the ring is.

```
     ↘     ↙
       (O)
     ↗     ↖
    fits here
```

```svg
<!-- the ring is the crosshair's own, enlarged to 18 px; the ticks at radius 11 to 15 -->
<path d="M6.4,12.4 L9.2,15.2 M27.6,12.4 L24.8,15.2 M6.4,33.6 L9.2,30.8 M27.6,33.6 L24.8,30.8" stroke="#182327" stroke-width="4" stroke-linecap="round"/>
<path d="M6.4,12.4 L9.2,15.2 M27.6,12.4 L24.8,15.2 M6.4,33.6 L9.2,30.8 M27.6,33.6 L24.8,30.8" stroke="#44df70" stroke-width="2" stroke-linecap="round"/>
```

**Drop** (carrying, nowhere in particular): the plain ring, light, as now. The default is quiet.

**Can't**: the same glyph in red, and the ring red. Two kinds, kept apart as the code keeps them apart:

- **The click does nothing and you keep what you have**, because the place refuses it (a socket occupied, the wrong part, a box whose support is away): the glyph in red and, inside the ring, today's red × (the ring's border then transparent, as now), so the established "does not fit here" keeps its meaning.
- **The thing cannot be lifted now** (dev0's parts while locked; a software box with another resting on it; a cupboard item while its doors are shut; a find during the film): the red lift arrow and grips, no ×, and only where nothing else takes the click (step 7).
- A thing that is never portable (`attachment: 'fixed'`) shows no pick-up cue at all; otherwise every installed part in the game would be red.

**Inspect**: no eye. Looking is passive here: the help line already names what is aimed at (prompt 061) without a click, so Sierra's look cursor has no job. Turning a held thing over (hold X) is a separate input, not what a click does, so it is not a glyph either: it goes in the help line while carrying (below).

### The held thing ("inventory item as cursor")

- **No silhouette by the ring.** The thing is already drawn in the hands; a second picture of it beside the ring costs a render to a texture (or a hand-drawn icon for every portable kind), would have to be redrawn as it turns, and says nothing the screen does not.
- **Its name in the help line**, which is empty while carrying today: for example "10 A fuse cartridge · hold X: turn it over", the hint by input from `logic/controls.ts`'s `inspect` binding ("hold X", "hold INSPECT", "hold Y"). The name is the portable's component name (its `markComponent` title, else the object's `name`); a thing with none shows only the hint. This is the _Monkey Island_ sentence line, cut to what is not already visible. The help line's text is chosen afresh every frame from one expression (flying, then the ladder, then inspection, then seated, then the menu hint; `first-person.ts`) and written only when it differs, so the carrying line joins that expression where inspection would be (inspection is off while carrying), not set from outside it, or the next frame would clear it (Codex's eighth point). The held name is worked out when the held object changes and kept.
- **Later, with an inventory of several things**, the selected one is the cursor in Sierra's sense; its name (and, then, perhaps a small icon) belongs in the same line. Not now.

### Gamepad, touch, free cursor

- **Gamepad**: the crosshair is at the centre; the same glyphs, with **A** under them, as the push-pull plan gives every one-way gesture (the label below the box, in the turn arrow's label style). While carrying, a second small label **Y: turn** is not added; that is the help line's.
- **Touch**: no crosshair until something is carried, and a tap uses where the finger lands, so there is no pick-up cue (as 115 decided for its cues). While carrying, the crosshair already shows at the centre, and the Use button uses the centre: the carrying glyphs show there, as the green ring and × do today. A tap elsewhere releases at its own point, which the cue at the centre cannot speak for: the cue describes the Use button, as the green ring and × already do, and both paths are tested (Codex's eighth point). A cue at the finger's first point while it is held is the same follow-up 115 left for touch.
- **Free cursor** (mouse, pointer not locked): the probe follows the cursor as 115's does; carrying already draws the crosshair at the cursor (`cursorAim`), so the glyphs follow it. Not carrying, the pick-up glyph stands over the cursor, centred on the cursor's point.

### Colour rules

- **Green** `#44df70`: the click will do what the glyph shows.
- **Red** `#f04b43`: the click will do nothing (the thing stays where it is, or stays in the hands).
- **Light** `#f5f1df` ring: carrying, a click will drop it; or nothing usable.
- No amber anywhere once the push-pull work's plain green ring has landed.
- A glyph and its ring always agree.

### The rule, pure (`logic/use-cue.ts`)

The use cue's gesture list gains the carrying gestures:

```ts
export type CarryGesture =
  | 'pick-up'
  | 'put-down'
  | 'put-back'
  | 'put-in'
  | 'fit';
// Gesture (mission 115) = 'turn' | 'push' | 'pull' | … | 'use' | CarryGesture

/** What the hands would do, answered by the carrying code. */
export interface CarryAnswer {
  gesture: CarryGesture;
  possible: boolean;
  /** A release the place refuses: the × in the ring. */
  refused?: boolean;
}

/**
 * The cue, from the hands' resolver (which keeps the use's own order):
 * a carrying answer, unless it is a refused lift and something else takes
 * the click; else the marked use; else nothing (the plain ring).
 */
export function handsCue(input: {
  carrying: boolean;
  /** What the hands' resolver says: a carrying answer, or defer to the use cue, or nothing (a drop). */
  hands: CarryAnswer | 'use' | null;
  /** Whether anything else would take the click (the room's aimed(), or a marked use), for a red lift. */
  otherwiseUsed: boolean;
  use: UseAnswer | null; // the mission 115 probe
}): UseAnswer | CarryAnswer | null;
```

Then `useCue(answer, pad)` and `useCueKey` (115) carry it to the drawing unchanged: a carrying gesture is one-way, so a pad gets one glyph labelled A, and the key is `gesture:possible:refused`.

### Where each answer comes from (input layer)

- **`createObjectHandling`** gains `resolve(x, y)`: one raycast of the room's objects, then the steps above, returning `{ answer, run }`, where `answer` is a `CarryAnswer`, a use cue to defer to, or null (drop, or nothing), and `run` does it. `use` becomes `resolve(x, y).run()`; `aimed()` and `targetFeedback()` stay for compatibility, implemented on `resolve` without running it. Asking must change nothing: no phase, parent, pose, lock, sound or notice (tested).
- **Room hooks must be pure where they are asked.** The resolver asks `allowPickup`, `targetFeedback`, `nearbyTargetFeedback`, a target's `inRange` and `accepts`, and the new `useWhileHoldingAt`; it never calls `heldAction`, `divert`, `place` or `useWhileHolding`. Audited (Codex's third point): the engineer's office's `canRemove`, dev1's, dev53's (`!film`) and the museum halls' `allowPickup` are pure; **dev4's is not**: it fires a spark and the PULLED LIVE notice when a live part is pulled (`repair-room.ts`, `allowPickup`), which polling ten times a second would set off before any pick-up. That effect moves to the pick-up itself (the portable's `pick-up` carry event, or a new `onPickUp` hook), and `allowPickup` is documented as a pure question. The bin-tossing targets' `accepts` and `inRange` (`bin-tossing.ts`) and `surfaceTarget`'s `accepts` (`plinthOccupied`, bounds) are pure; each other target is checked as it is given a cue kind.
- **`PlacementTarget`** gains `cue?: 'fit' | 'put-back' | 'put-in' | 'put-down'` (default `'fit'`, which is what accept meant). `surfaceTarget` (plinth decks) says `'put-down'`; `createBinTossing`'s targets say `'put-in'`; exhibits' and sockets' targets keep `'fit'`. The controls layer owns the type, so nothing it imports changes (`layering.test.ts`).
- **`targetFeedback`** may return a `CarryAnswer` as well as `'accept'` (fit, possible) and `'reject'` (fit, refused), so every room keeps working unchanged.
  - **Engineer's office**: its `heldAction` (`shell-room.ts`) gains its twin as `targetFeedback`, built from new pure queries beside the actions: the desk's `cue(object, target)` (aimed at the carton, `put-in`; anywhere else, `put-back`, refused if `put-back.ts`'s new `canPutBack(key)` says its support is away) and the cupboard's `cue(item, target)` (its own drawer, the drawers open: `put-back`; else null, a drop), chained in `room-equipment.ts` as `release` and `returnItem` are. The room has no `useWhileCarrying` parts, so answering everywhere a box is held changes no click.
  - **dev4**: its `targetFeedback` already answers sockets; it returns `fit`, refused, for SLOT OCCUPIED and WRONG PART (the reason can go in the help line later).
- **The probe** (`first-person.ts`, 115's): every 100 ms, only while a cue could be shown, it calls `handling.resolve` (carrying, or for the pick-up) and 115's use probe, and `handsCue` picks between them; the ring's colour and the glyph come from the one result. The per-frame `aimed()` and `targetFeedback()` calls in the animation loop go. **No hit is cached**: a drawer, a door, a held thing or a target can move while the camera is still, so each probe raycasts again (Codex's sixth point); ten raycasts a second against one room's objects is cheaper than today's two every frame.
- **The help line**: while carrying, the held thing's name and the turn-it-over hint, in the per-frame expression (above).

### Performance

- At most one probe every 100 ms, and only while the crosshair or free cursor is over a shown canvas, not flying, not on a ladder (as 115).
- The probe's raycasts: the resolver's one against the room's objects (the room's `objects` root: the scene in most rooms, `machines.group` in the engineer's office), plus whatever the room's own queries do (dev4's `aimedSocket`), plus 115's scene raycast when the resolver defers to the use cue. They are shared only where the roots are the same; the count per probe is measured, not assumed, and recorded in the bench run. Today's two raycasts every frame (and the room's `aimed()` every frame) go, so this is cheaper than now.
- The SVG is rebuilt only when `useCueKey` changes; the glyphs' path strings are built once, as `TURN_ARROW` is.
- No animation; nothing for reduced motion.
- The engineer's office and dev4 run through the component benchmark before and after, and the frame time while carrying is compared.

## 4. Order of work

0. **Prerequisite**: the push-pull work (`use-cue.ts`, `markUsable`, the one-raycast probe, `use-cue-markup.ts`, the plain green ring) has landed. If not, this mission waits, or builds on `turn-cue.ts` and renames with it.
1. **The rule.** `CarryGesture`, `CarryAnswer` and `handsCue` in `logic/use-cue.ts`; the key and the pad label for carrying gestures. Tested.
2. **dev4's spark** moved from `allowPickup` to the pick-up, and `allowPickup` documented pure. Tried in dev4: pulling a live card still sparks, aiming at one does not.
3. **The resolver.** `resolve(x, y)` on `createObjectHandling`, with `use`, `release`, `aimed` and `targetFeedback` built on it; `useWhileHoldingAt` in the options and in dev0, dev4 and dev5; `PlacementTarget.cue`; `surfaceTarget` and `createBinTossing` saying theirs; `targetFeedback` widened, `'accept'` and `'reject'` kept. Every existing carrying test passes unchanged before any new one is added. Tested in `object-handling.test.ts`.
4. **The probe.** In `first-person.ts`, the carrying answers asked on 115's probe; the per-frame calls removed; the ring's colour from the one answer.
5. **The glyphs.** Lift, put down, put back, put in, fit, in `use-cue-markup.ts`, centred on the ring; red variants; the × inside the ring for a refused release; A under each on a pad. Tried in dev0 (put down on a plinth; red lift while locked) and dev5 (put in the skip), and screenshotted at scale 1 on light and dark backgrounds; shown to the owner (question 1) before the rooms below. If the marks do not read, the simpler set (lift, fit, one down arrow).
6. **The engineer's office.** `canPutBack` in `put-back.ts`; `cue` on the desk's and the cupboard's handling; `heldCue` in `shell-room.ts`. Tested that the office's `targetFeedback` and `heldAction` agree for every box, aim and state. Tried in the office: put back, into the carton, red with a box whose support is away, red lift with a box under another.
7. **dev4.** Its sockets' answers with `refused`; the scrap skip.
8. **The help line.** The held thing's name and the hint, by input.
9. **The rest.** Museum halls (Hall 5's skip and finds, exhibits' targets), dev1, dev53; check the rooms passing `objects: scene` for detachable parts.
10. **Screenshots and the bench**: each glyph green and red, pointer and pad, in the rooms above; the office and dev4 through the benchmark.
11. **TODO.md, CHANGELOG, the controls guide** (`src/toolkit/controls/CLAUDE.md`, "Carrying": the cues), and the loose ends: Hall 5's stale lid comments; the pour, weigh, fill and dip verbs for the chemistry missions; touch.

## 5. Tests

- `use-cue.test.ts`: `handsCue`: a carrying answer is shown; `'use'` defers to the use cue; a refused lift gives way to `otherwiseUsed`; nothing gives null (the plain ring). Keys change with gesture, possible and refused, not otherwise; a pad gets one glyph labelled A.
- `object-handling.test.ts` (Three.js objects, as now), the resolver's order, each against what `use` then actually does: the room's `useWhileHoldingAt` first; a room `targetFeedback` answer ahead of a `useWhileCarrying` part, and the part ahead of a placement when the room says nothing; an aimed target ahead of a nearby bin; an aimed wrong-kind bin refused though another bin is near; a nearby bin a put-in; nothing a drop. Not carrying: green for a detachable part in reach, red when locked or `allowPickup` refuses, null for a fixed part, beyond 3.2 m, hidden or behind something. A room passing `useWhileHolding` without its twin gets no carrying glyph. **Asking changes nothing**: after a thousand `resolve` calls, phases, parents, poses and locks are unchanged and no hook but the pure ones was called (spies on `heldAction`, `divert`, `place`, `useWhileHolding`). The old `targetFeedback` and `aimed` unchanged.
- `put-back.test.ts`: `canPutBack` agrees with `putBack` (support away refused), and changes nothing.
- The desk's and cupboard's `cue`: carton `put-in`; elsewhere `put-back`; refused with the support away; the cupboard's own drawer `put-back` only when accessible, else null.
- The probe: re-asked with the camera still (dev0's part unlocked turns the red lift green; a drawer pulled out under a still aim changes the answer); nothing while flying, on a ladder or with the room hidden; carrying with the free cursor follows the cursor; on touch, the cue matches what the Use button does.
- dev4: aiming at a live card does not spark; pulling it does.

## 6. Acceptance

- Not carrying, aiming at something that can be picked up shows the green lift; something portable that cannot be lifted now, where a click does nothing else, shows it red; fixed parts show their use cue or the plain ring, never a lift.
- Carrying, the cue shows where the thing will go: put down on a plinth, put back in its place, into a bin or the carton, fit into a socket; red, with the × in the ring, where the place refuses it; the plain ring where it will be dropped; a control worked while carrying shows that control's cue.
- The engineer's office says, before the click, whether a box will go back or into the carton.
- The help line names what is carried and how to turn it over.
- Every room that works today works unchanged (`'accept'` and `'reject'` still honoured).
- The cue and the click come from the same resolver; asking it changes nothing (no spark, no sound, no notice).
- No per-frame raycast for the cue; the probe at most ten times a second; the SVG rebuilt only on change.
- Typecheck, lint, format, tests and build pass.

## 7. Codex's review: what I took and what I did not

Codex (`codex exec`, read-only) reviewed the first draft; its critique is `codex-critique.md` beside this file. In its order of importance:

1. **The room's own first refusal** (`useWhileHolding` runs before anything): taken. A query twin, `useWhileHoldingAt`, wired in the three rooms that have the hook; a room without it shows no carrying glyph. The first draft had hoped a marked use under the aim would stand in for it, which Codex rightly called unproven.
2. **One resolved action, the same for the cue and the click**: taken, as `resolve(x, y)` returning the answer and the step that does it. I did not take a separate `heldCue` hook: the code already treats a room's `targetFeedback` as the description of its `heldAction` (dev4), so that is made the rule and tested room by room.
3. **`allowPickup` is not pure in dev4** (a spark and notice): taken, and checked; the spark moves to the pick-up. Every hook the resolver asks is audited and tested for no side effects.
4. **An aimed bin that refuses is not a nearby toss**: taken; tested separately.
5. **A red lift can lie when the room's own use takes the click**: taken; red only where nothing else takes it (centre, `aimed()` false, no marked use), and no red with a free cursor.
6. **No cached hits; count the raycasts; keep the layering**: taken. The cache from the push-pull plan is not used for carrying; the raycast count is measured. The controls layer owns every new type, so layering is unchanged.
7. **A simpler first set of glyphs**: taken in part. The full set (one arrow, four marks) stays the proposal, because the owner asked for put back to be told from put down and from a bin, and the code has all of them; but it is tried in dev0 and shown to the owner at real size before any room is changed, with Codex's three-glyph set (lift, fit, one down arrow) as the fallback. I did not take its worry that the half-pixel edge is too thin: the marks are 2.5 px strokes on a 4.5 px dark under-stroke; only the filled arrows have the half-pixel edge, as the turn arrow has. The slide glyphs it feared confusion with are not being built.
8. **Touch, and the help line**: taken. The cue on touch describes the Use button, tested; the carrying line joins the help line's per-frame expression, by input.

On the questions: Codex suggested asking about the drawing with a mock-up in the game rather than a description, which I took (question 1 now follows the dev0 screenshots), and that the software box and cupboard question is gameplay and need not block the cues, which I also took (question 2 is marked so).

## 8. Questions for the owner, to ask one at a time

1. (With the dev0 screenshots in front of you.) Is one arrow, up to lift and down to let go, with a mark under the ring for the kind of place (a line for a surface, corner brackets for its own place, a bin, ticks round the ring for a socket), the drawing you want, or the simpler set: a lift, the socket ring, and one down arrow for everything else?
2. (Gameplay, not blocking the cues.) A software box let go anywhere goes back to its shelf, but a cupboard item let go anywhere but its drawer falls on the floor: should they agree, and which way?
3. Should the help line, while you carry something, name it and say how to turn it over ("10 A fuse cartridge · hold X: turn it over")?
