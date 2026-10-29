# The museum's narration: every voice line to record

This is the recording script for the museum (rooms `museum0` to `museum9`): every line the game will play in a voice, hall by hall, with the file name the code looks for, so a finished recording can simply be dropped in. It was gathered from the code on 2026-10-29. The words are a copy: the game shows the same text on its caption cards and plaques from the code (sources named under each hall), so an edit made here must be carried back there too. The museum's written words are in `doc/scripts/museum.md`.

## How to deliver the files

- Format: mono MP3, 44.1 kHz, about 96 kb/s, normalised to about -16 LUFS, with a short fade in and out and no more than a quarter of a second of silence at either end.
- Name each file exactly as in the File column and put it in the folder named for its hall. Nothing else needs changing: the game finds the files when it is built.
- Any line may be left unrecorded. A missing file is simply absent: the game shows the words on screen and stays silent.
- Every clip plays front centre, close to the listener, so record close to the microphone, in a dry room, with no music or effects.
- Status: none of these lines is recorded yet. A line marked **new** has no words in the game yet; the words here are proposed and should be added to the code when recorded.

## Halls with no voice lines

Halls 0 (Welcome), 1 (Warm water), 2 (Clean water), 3 (Safe water), 4 (The chemistry of pools), 6 (World of pumps), 7 (Grout) and 9 (The whole plant) play no recorded voice. Their words are read on panels and placards only.

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

## Hall 8: Never again, putting safety first

Folder: `resources/sound/voice/never-again/`. Source of the words: `src/toolkit/gallery/logic/museum-8-incident.ts` (`CHAPTERS`, each chapter's `narration`); played by `src/toolkit/gallery/rooms/museum/hall-8-never-again.ts`.

When they play: the visitor presses the green HEAR WHAT HAPPENED button, and hears the chapter whose photograph they are standing nearest; that photograph's picture light stays up while the others dim, until the clip ends. Pressing again stops it. Each chapter stands alone, so each clip must make sense heard on its own, in any order.

Direction: a sober documentary narrator, unhurried, about 20 seconds a chapter. Present tense for the morning itself (chapters 1 to 4), plainly; quieter and slower for chapter 4's "Nobody dies." The last two words of chapter 6, "Never again.", are the exhibit's title: a pause before them, and no flourish. Numbers as written: "seventeen minutes to eight", "four hundred litres", "forty thousand pounds".

| File            | Photograph                                                 | Words                                                                                                                                                                                                                                                                                                                          |
| --------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `chapter-1.mp3` | 1 · 07:42 · The delivery (south wall, by the way in)       | Pellingford Baths, a spring morning in 1997. At seventeen minutes to eight a chemical tanker pulls into the loading bay. It is early. The duty technician has not yet started his shift, and the driver has never been here before. Nobody comes out to meet him.                                                              |
| `chapter-2.mp3` | 2 · 07:51 · The mix-up (south wall, middle)                | Two fill points stand side by side in an open recess: one for acid, one for sodium hypochlorite. They have the same coupling, and their labels faded long ago. The driver connects his acid hose to the hypochlorite fill. Four hundred litres of acid go into the bulk hypochlorite tank.                                     |
| `chapter-3.mp3` | 3 · 07:58 · The gas (south wall, far end)                  | Mixed, acid and hypochlorite give off chlorine: a choking, yellow-green gas, heavier than air. It rises from the tank's vent into the plant room, and the air handling draws it towards the pool hall. The plant room's gas detector should have raised the alarm. It had been disconnected, weeks before, after false alarms. |
| `chapter-4.mp3` | 4 · 08:05 · The evacuation (north wall, far end)           | A lifeguard clears the pool. Swimmers and staff stand in the car park in foil blankets while fire crews in gas-tight suits go in. A handful are treated for breathing difficulties. Nobody dies. But there was no plan, and nobody had practised one.                                                                          |
| `chapter-5.mp3` | 5 · Weeks later · The inquiry (north wall, middle)         | Weeks later, the inspectors report. There was no risk assessment for deliveries. The staff had not been trained to handle the chemicals. Nobody had checked the contractor. The council is fined forty thousand pounds, and the baths are shut for six weeks.                                                                  |
| `chapter-6.mp3` | 6 · The changes · Never again (north wall, by the way out) | Pellingford Baths reopened with its fill points rebuilt: a different coupling for each chemical, each in its own locked cabinet, clearly labelled. Every delivery is met. The gas detector works, and the stores are apart. The fix is to make the mistake impossible. Never again.                                            |

The earlier single recording of the whole account (`account.mp3`) is no longer used: the button now plays one chapter at a time.

## Checklist for the session

Hall 5: `intro`, `hair-clump`, `leaves`, `dead-rat`, `dildo`, `butt-plug`, `more-hair`, `cleared` (8 clips), and optionally the six further finds. Hall 8: `chapter-1` to `chapter-6` (6 clips). Fourteen clips in all, about three minutes of finished audio.
