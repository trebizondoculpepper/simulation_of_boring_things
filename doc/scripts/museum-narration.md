# The museum's narration: every voice line to record

This is the recording script for the museum (rooms `museum0` to `museum9`): every line the game will play in a voice, hall by hall, with the file name the code looks for, so a finished recording can simply be dropped in. It was gathered from the code on 2026-10-29. The words are a copy: the game shows the same text on its caption cards and plaques from the code (sources named under each hall), so an edit made here must be carried back there too. The museum's written words are in `doc/scripts/museum.md`.

## How to deliver the files

- Format: mono MP3, 44.1 kHz, about 96 kb/s, normalised to about -16 LUFS, with a short fade in and out and no more than a quarter of a second of silence at either end.
- Name each file exactly as in the File column and put it in the folder named for its hall. Nothing else needs changing: the game finds the files when it is built.
- Any line may be left unrecorded. A missing file is simply absent: the game shows the words on screen and stays silent.
- Every clip plays front centre, close to the listener, so record close to the microphone, in a dry room, with no music or effects.
- Status: none of these lines is recorded yet. A line marked **new** has no words in the game yet; the words here are proposed and should be added to the code when recorded.

## Halls with no voice lines

Halls 0 (Welcome), 1 (Warm water), 2 (Clean water), 3 (Safe water), 4 (The chemistry of pools), 6 (World of pumps) and 9 (The whole plant) play no recorded voice. Their words are read on panels and placards only.

## Hall 5: A Day in the Life, What's in the Skimmer?

Folder: `resources/sound/voice/skimmer/`. Source of the words: `src/toolkit/gallery/logic/museum-5-skimmer.ts` (`FINDS`, `CLEARED_LINE`); played by `src/toolkit/gallery/rooms/museum/hall-5-day-in-the-life.ts` (`speak`).

Direction: deadpan and dry, a weary pool attendant who has seen it all, never shocked. The game is for adults: play the rude finds absolutely straight. A beat of pause after the first sentence of each, which names the find; each line about 4 to 7 seconds.

| File                  | When it plays                                                    | Words                                                                                                  |
| --------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `intro.mp3` (**new**) | The first time the visitor lifts the skimmer's lid               | Right. Let's see what the pool's been hiding today.                                                    |
| `hair-clump.mp3`      | The visitor takes the clump of hair out of the basket (1st find) | A clump of hair. Hair floats, so the skimmer catches lots of it. Yuck.                                 |
| `leaves.mp3`          | Takes the rotting leaves (2nd)                                   | Leaves, blown in through the doors and left to stew. They smell of pond.                               |
| `dead-rat.mp3`        | Takes the dead rat (3rd)                                         | A dead rat. It came up through the drains, and the drains won. Hold it by the tail.                    |
| `dildo.mp3`           | Takes the dildo (4th)                                            | A dildo. Waterproof, as advertised. Nobody has asked at lost property.                                 |
| `butt-plug.mp3`       | Takes the butt plug (5th)                                        | A butt plug. How it got into the skimmer is a question for the CCTV, and nobody wants to ask the CCTV. |
| `more-hair.mp3`       | Takes the last find (6th)                                        | More hair. There is always more hair.                                                                  |
| `cleared.mp3`         | The last find lands in the bin, after the fanfare                | Skimmer cleared! You took out six things. Lovely. (Bright on "Skimmer cleared!", then flat again.)     |

Optional, for later: six further finds are being tried in dev53 (`src/toolkit/gallery/logic/skimmer-extras.ts`, `EXTRA_FINDS`) and are not in the hall yet, so the game does not play them. If they join the skimmer, these are their lines, in the same folder:

| File               | Words                                                                             |
| ------------------ | --------------------------------------------------------------------------------- |
| `dead-frog.mp3`    | A frog. It came in for a swim and the chlorine won. Nobody kissed it.             |
| `plaster.mp3`      | A plaster, used. Somewhere in the changing rooms a verruca walks free.            |
| `earring.mp3`      | A pair of hoop earrings, still hooked together. Somebody swam home lighter.       |
| `bottle-cap.mp3`   | A bottle cap. No glass on poolside, so somebody smuggled it. The bottle got away. |
| `goggles.mp3`      | Swimming goggles, the strap snapped. Lost property has had them twice already.    |
| `crisp-packet.mp3` | A crisp packet, ready salted, empty. No eating on poolside, and yet.              |

## Hall 7: Grout, the Unsung Hero of the Aquatics World

Folder: `resources/sound/voice/grout/`. Source of the facts: `src/toolkit/gallery/logic/museum-7-grout.ts` (`PLINTHS`, `TITLE_WALL`, `CLOSING_CARD`); the plaques there carry the same history in writing. All of these lines are **new** (the owner, 2026-10-29): the game does not play them yet; wiring them in follows when they are recorded (TODO.md).

When they play: `enter` as the visitor steps into the hall; `exit` as they leave it by either archway, once they have heard at least one plinth; each plinth's line the first time the visitor comes to that plinth's lectern (the same nearest-lectern choice that lights its spotlight), once per visit, never again until the hall is re-entered. A plinth's line waits for one already playing to finish, and is skipped if the visitor has moved on before it can start. The era music under each plinth (`doc/prompts/art/grout-music.md`) dips while a line plays.

Direction: a hushed, reverent cathedral audio guide, speaking of grout as others speak of saints; absolutely sincere, never winking. The joke is the reverence, so it must never be played for laughs. Slow, warm, low, with room to breathe; about 10 to 15 seconds a plinth. Where a line ends on the plaque's own closing sentence (in italics on the plaques), a small pause before it. Dates as spoken: "eighteen-forty", "the nineteen-seventies". Standards as letters and numbers: "B S five three eight five", "B S E N thirteen eight eight eight", "C G two W A".

| File            | When it plays                                                 | Words                                                                                                                                                                                                                                                                                                 |
| --------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enter.mp3`     | Stepping into the hall                                        | Welcome. Please, lower your voice. You are standing in the presence of grout. Every tile in every swimming pool you have ever loved has been held in place, quietly, faithfully, by the substance you are about to meet. Take your time. Grout has.                                                   |
| `plinth-1.mp3`  | First at plinth 1: lime mortar and lime putty                 | Lime and sand. From about eighteen-forty, the Victorians set their glazed tiles close, with the finest of joints, and lime filled them, setting slowly as it drew carbon dioxide from the very air. It was there first.                                                                               |
| `plinth-2.mp3`  | First at plinth 2: early Portland cement grout                | In eighteen twenty-four, Joseph Aspdin patented Portland cement. By the eighteen-forties it was burned hotter, and became the cement we would know. For a century it held the public baths of Britain together. It set the standard. And then, it set.                                                |
| `plinth-3.mp3`  | First at plinth 3: sanded cement grout                        | Where the joints grew wider, three millimetres and more, cement took sand into its keeping, and went where finer grouts could not. It filled the gaps others could not.                                                                                                                               |
| `plinth-4.mp3`  | First at plinth 4: unsanded cement grout                      | For the finest joints, the glazed tile and the mosaic, about two millimetres on a wall, cement was used alone, unsanded, unadorned. It asked for nothing.                                                                                                                                             |
| `plinth-5.mp3`  | First at plinth 5: coloured cement grout, under the oil wheel | The nineteen-seventies. Britain chose its bathroom suites in colours, and grout was pigmented to match them. Avocado was among the decade's defining shades. (A long pause.) The museum presents this specimen without comment.                                                                       |
| `plinth-6.mp3`  | First at plinth 6: latex- and polymer-modified cement grout   | From about the nineteen-sixties, installers mixed their grout with a latex admixture in place of water. In time it came ready mixed from the factory, and today it is the most popular grout of all. It made cement better, and did not pretend otherwise.                                            |
| `plinth-7.mp3`  | First at plinth 7: furan resin grout                          | Furan resin. From the nineteen-forties, a grout of great chemical resistance, trusted in dairies, in chemical plants, and in some pools. Furan grouts are generally black. (A pause.) The museum regrets that its specimen is not.                                                                    |
| `plinth-8.mp3`  | First at plinth 8: epoxy grout                                | Epoxy. Its emulsions came in the nineteen-forties; true epoxy grouts were in general use by the sixties and seventies. Class R G, under B S E N thirteen eight eight eight: the pool's choice where the water is soft, or aggressive. Some are rated even for the sea. It is what the water deserves. |
| `plinth-9.mp3`  | First at plinth 9: improved cement grout, CG2WA               | Today. Class C G two W A: improved cement, absorbing less water, resisting the scrub of brush and foot, often guarding itself against mould. The old way, made as good as it can be.                                                                                                                  |
| `plinth-10.mp3` | First at plinth 10: the coda, the movement joint              | And finally, a confession. This is not grout. It is a movement joint: a flexible sealant where the pool must be allowed to move, at its edges and over its structure's own joints. Not grout. But grout could not do its work without it.                                                             |
| `exit.mp3`      | Leaving by either archway, after at least one plinth          | Thank you for visiting. As you go back out into the world, and into the water, spare a thought for the joints between the tiles. They never ask to be noticed. That is why we notice them.                                                                                                            |

## Hall 8: Never again, putting safety first

Folder: `resources/sound/voice/never-again/`. Source of the words: `src/toolkit/gallery/logic/museum-8-incident.ts` (`CHAPTERS`, each chapter's `narration`); played by `src/toolkit/gallery/rooms/museum/hall-8-never-again.ts`.

When they play: the visitor presses the green HEAR WHAT HAPPENED button on the lectern before a photograph, and hears that chapter; that photograph's picture light stays up while the others dim, until the clip ends. Pressing again stops it. Each chapter stands alone, so each clip must make sense heard on its own, in any order.

Direction: a sober documentary narrator, unhurried, about 20 seconds a chapter. Present tense for the morning itself (chapters 1 to 4), plainly; quieter and slower for chapter 4's "Nobody dies." The last two words of chapter 6, "Never again.", are the exhibit's title: a pause before them, and no flourish. Numbers as written: "seventeen minutes to eight", "four hundred litres", "forty thousand pounds".

| File            | Photograph                                                 | Words                                                                                                                                                                                                                                                                                                                          |
| --------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `chapter-1.mp3` | 1 · 07:42 · The delivery (south wall, by the way in)       | Pellingford Baths, a spring morning in 1997. At seventeen minutes to eight a chemical tanker pulls into the loading bay. It is early. The duty technician has not yet started his shift, and the driver has never been here before. Nobody comes out to meet him.                                                              |
| `chapter-2.mp3` | 2 · 07:51 · The mix-up (south wall, middle)                | Two fill points stand side by side in an open recess: one for acid, one for sodium hypochlorite. They have the same coupling, and their labels faded long ago. The driver connects his acid hose to the hypochlorite fill. Four hundred litres of acid go into the bulk hypochlorite tank.                                     |
| `chapter-3.mp3` | 3 · 07:58 · The gas (south wall, far end)                  | Mixed, acid and hypochlorite give off chlorine: a choking, yellow-green gas, heavier than air. It rises from the tank's vent into the plant room, and the air handling draws it towards the pool hall. The plant room's gas detector should have raised the alarm. It had been disconnected, weeks before, after false alarms. |
| `chapter-4.mp3` | 4 · 08:05 · The evacuation (north wall, far end)           | A lifeguard clears the pool. Swimmers and staff stand in the car park in foil blankets while fire crews in gas-tight suits go in. A handful are treated for breathing difficulties. Nobody dies. But there was no plan, and nobody had practised one.                                                                          |
| `chapter-5.mp3` | 5 · Weeks later · The inquiry (north wall, middle)         | Weeks later, the inspectors report. There was no risk assessment for deliveries. The staff had not been trained to handle the chemicals. Nobody had checked the contractor. The council is fined forty thousand pounds, and the baths are shut for six weeks.                                                                  |
| `chapter-6.mp3` | 6 · The changes · Never again (north wall, by the way out) | Pellingford Baths reopened with its fill points rebuilt: a different coupling for each chemical, each in its own locked cabinet, clearly labelled. Every delivery is met. The gas detector works, and the stores are apart. The fix is to make the mistake impossible. Never again.                                            |

The earlier single recording of the whole account (`account.mp3`) is no longer used: each lectern's button plays its own chapter.

## Checklist for the session

Hall 5: `intro`, `hair-clump`, `leaves`, `dead-rat`, `dildo`, `butt-plug`, `more-hair`, `cleared` (8 clips), and optionally the six further finds. Hall 7: `enter`, `plinth-1` to `plinth-10`, `exit` (12 clips, all new). Hall 8: `chapter-1` to `chapter-6` (6 clips). Twenty-six clips in all, about six minutes of finished audio.
