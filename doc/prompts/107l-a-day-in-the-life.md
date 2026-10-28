# 107l: PLANTROOMS, "A Day in the Life": a poolman's duties, through the decades, with the skimmer to clean

Status: themed 2026-10-28, dropped and restored the same day with What's in the Skimmer? folded in (the owner, 2026-10-28: "Skimmer could be part of A Day in the Life. It's an exhibit about a poolman's duties, which includes cleaning the skimmers"); not yet planned in detail. A sub-prompt of mission 107 ([107](107-pool-science-museum.md)); it replaces 107h, "Controls from the 1920s to the Present Day, and Beyond", as one of the themed halls (the owner, 2026-10-28: "let's replace Controls through the ages with 'A Day in the Life', a photo exhibit of pool maintenance through the decades"). 107h's brief and research are kept, parked, for a later hall or the development rooms.

## The idea

A photographic exhibition: a day in the life of a pool's plant and its staff, decade by decade, from the early twentieth century to the present. Each decade a wall or bay of framed photographs with captions: the opening checks, emptying the skimmer baskets, testing the water (the yellow orthotolidine comparator, then the pink DPD), backwashing, chemical deliveries, the plant room's instruments and controls of the day, closing up at night.

## The skimmer, the hall's hands-on duty

[107f, What's in the Skimmer?](107f-whats-in-the-skimmer.md) is no longer a hall of its own: it is this hall's interactive, the one duty the visitor does themselves. A stretch of the dry painted poolside with its wall skimmer and skip, placed among the photographs at the point in the day where the baskets are emptied (the opening checks, early morning); everything 107f specifies (the skimmer, the finds and their captions, the voice clips, pick-up, carry and `give`) is kept and built here. The photographs round it show the same job in each decade.

## To plan before building

- **The pictures are our own.** Rendered in the game's own engine or made for it, in each decade's photographic look (sepia, black and white, faded colour, early digital); no real archive photographs are copied, and no real people or firms are shown. The research behind each scene (what the job looked like in that decade) is sourced, reusing 107h's research (`doc/prompts/107h-controls-through-the-ages.md`, its "Research" section) and 107g's history of pool edges.
- **Static, as a gallery:** frames, captions, a timeline rail, gallery lighting; per the hall rules, its time display, reset on entry and the left-to-right order (earliest decade on the left as the visitor walks).
- Which hall it takes, and its sizes, follow the owner's choice of Halls 5 to 8.

## Built

Built 2026-10-28 as Hall 5 (`museum5`). Files: `src/toolkit/gallery/rooms/museum/hall-5-day-in-the-life.ts` (the hall), `hall-5-finds.ts` (the finds' props), `src/toolkit/gallery/logic/museum-5-skimmer.ts` (the game, pure, tested), `museum-5-gallery.ts` (decades, scenes, places, words, tested), `resources/sound/voice/skimmer/index.md` (the clip list, none recorded).

- **Gallery:** ten decades (1920s, 1930s, 1950s to 2020s), each a bay of three placeholder photographs (Morning, Midday, Night) drawn on canvas in the decade's photographic look, each with its decade and a caption of the scene (from 107h's research: the yellow orthotolidine comparator, then pink DPD, then cells on the controller). 1920s–1970s along the north wall west to east, 1980s–2020s down the east wall north to south: earliest on the left as the visitor walks from the west archway to the south one. A brass timeline rail under them; picture lights as decoration only.
- **Skimmer:** a dry painted poolside in the middle of the floor, the Certikind skimmer (M5-SK1) in its north coping, a mini skip with its sign ("For things found in the skimmer", then SKIMMER CLEARED! with the count), the cut-away panel, the opening checks sheet, a placard lectern, lifeguard's chair, bench with gloves, leaf net and hook, lost property box, No running sign, Poolguard clock (local time ×1), entrance panel and RESET pedestal. 27 finds, including a rubber frog and the adult items (a tampon, a small pink vibrator, an empty condom wrapper) as plain props with deadpan captions; a fill is the hair clump then 12–15 in a random order, the false teeth one fill in five. Walking in and RESET refill it.

Deviations:

- **Superseded 2026-10-28:** carrying now uses the control scheme's pick-up, carry, drop and `give` through the exhibit hook (see 107f, "Carrying wired in"). Formerly: **carrying was the hall's own, through clicks**, not `createObjectHandling`: the museum hall room gives an exhibit only its clicks and no object handling, and wiring it in would change the shared `museum-hall-room.ts`. Click the lid to lift it; click the deck to set it down (or the skimmer to put it back); click the skimmer to take a find; click the skip (or the deck within reach of it) to put it in, or elsewhere on the deck to drop it; click a dropped find to pick it up. The held thing is drawn before the eye (the camera read as the poolside is drawn). No `give` added to the control scheme; no falls, finds lie where dropped; finds fly into the skip on `binArc`.
- **The painted poolside is its own painter** in the hall file, not a skimmer variant of Hall 0's in `museum-hall.ts` (a shared file); the skimmer edge's stepped tile face is painted flat.
- **The caption card** is a dark card before the eye (a few seconds or until the next), drawn in the hall, not through `hud-policy.ts`.
- **The skimmer is placed in the middle of the floor**, not among the morning photographs on a wall; every bay's first photograph is its morning, and the 1950s, 1980s, 1990s and 2020s mornings show the skimmer job.
- No schematic node in `src/game/plant/`: the skimmer's tags (M5-SK1, -L, -B) are derived from the hall's room code in the game logic.

Still to do: a walkthrough emptying the skimmer on high, medium and low; frame-time measurement and the component benchmark; choose, resize and install the 30 original generated photographs ([image prompts and completion record](day-in-the-life/midjourney-prompts.md), `doc/gens/day-in-the-life/`); voice clips.

Camera: `?room=museum5&x=-1&y=1.6&z=-3&yaw=150&pitch=-30&noclip=true` (the skimmer and skip); the gallery `?room=museum5&x=1&y=1.6&z=0&yaw=30&pitch=0&noclip=true`.
