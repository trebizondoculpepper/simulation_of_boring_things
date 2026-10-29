# Museum model costs (2026-10-29)

Which models in the museum (halls `museum0` to `museum9`) cost the most draw calls, to choose candidates for an auto-generated far version (static meshes merged per material, small parts dropped, canvas displays frozen).

## Method

Each hall was loaded headless (Playwright, Chrome, the dev server, `?room=museumN`, default graphics) and left 10 s to build its exhibit and both neighbour copies. The hall's three.js `Scene` was caught by an init script that traps the `isScene` flag three.js sets in the `Scene` constructor. In the scene, the group named after the hall (`museumN`) holds the hall shell, the hall's exhibit (`buildHallExhibit`'s object) and the two neighbour copies (child groups named `museumM`). A "model" is a direct child of the exhibit object; unnamed groups are labelled in brackets with the first two named descendants. For the lobby (`museum0`, no exhibit) the hall group's own children were used.

For each model, over visible descendants only: meshes (meshes, lines and points, roughly one draw call each), triangles, distinct material objects, distinct material signatures (type, colours, roughness, metalness, opacity, side and texture maps; what a merge per material would actually need, since most meshes carry their own material clone), CanvasTextures (live displays) and moving meshes (world matrix or visibility changed over 1.5 s; this misses displays that only redraw their canvas). Figures are a snapshot at the spawn point; neighbour copies hidden by `neighbourDraw` there count zero, which is why copy counts are asymmetric. The script is kept outside the repository (scratchpad `costs-measure.mjs`).

## Top 25 models by mesh count

"Saved" is the estimated draw calls saved by a far version of one draw per material signature, with moving meshes left as they are: meshes − signatures − moving.

| #   | Hall    | Model                                                                | Meshes | Triangles | Materials | Signatures | Canvases | Moving | Saved |
| --- | ------- | -------------------------------------------------------------------- | -----: | --------: | --------: | ---------: | -------: | -----: | ----: |
| 1   | museum9 | [Merged / Desk fascia: water panel and station clock] (control desk) |    198 |     24580 |       190 |        103 |       80 |      0 |    95 |
| 2   | museum4 | Analyser readout board                                               |    184 |      2458 |       114 |         42 |       34 |     10 |   132 |
| 3   | museum4 | [Pump base channel / Pump base channel]                              |    147 |      6014 |        33 |         26 |       10 |      4 |   117 |
| 4   | museum4 | Dosing desk                                                          |    140 |     19436 |       132 |         81 |       63 |      0 |    59 |
| 5   | museum1 | [Label FIRING / Label LOCKOUT] (boiler panel)                        |    136 |     10548 |       124 |         65 |       47 |      0 |    71 |
| 6   | museum2 | [Label P1 RUN / Label P1 TRIP] (pump panel)                          |    130 |     14886 |       120 |         61 |       44 |      0 |    69 |
| 7   | museum2 | Ozone generator                                                      |    103 |      6066 |        94 |         67 |       25 |      4 |    32 |
| 8   | museum3 | [Label DP1 STROKE / Label DP1 FAULT] (dosing panel)                  |    102 |     15562 |        95 |         52 |       36 |      0 |    50 |
| 9   | museum6 | [P3 dosing pump]                                                     |     99 |      6384 |        68 |         46 |       22 |      0 |    53 |
| 10  | museum3 | DC1 Chlorella DC-1 pair                                              |     87 |      6728 |        81 |         32 |       18 |      0 |    55 |
| 11  | museum3 | [SC1 sample cell panel]                                              |     79 |      3034 |        46 |         43 |       19 |      0 |    36 |
| 12  | museum9 | [SC1 sample cell panel]                                              |     79 |      3034 |        46 |         43 |       19 |      0 |    36 |
| 13  | museum1 | [Losses board]                                                       |     76 |      1092 |        48 |         26 |       13 |      4 |    46 |
| 14  | museum0 | [Painted pool floor / Floor arrow stickers] (lobby dressing)         |     71 |      5044 |        67 |         57 |       26 |      0 |    14 |
| 15  | museum6 | [START push button / Label START]                                    |     68 |      5524 |        50 |         34 |       12 |      0 |    34 |
| 16  | museum1 | [Condensing boiler / Merged]                                         |     66 |      2162 |        63 |         51 |       22 |      2 |    13 |
| 17  | museum6 | [P1 dosing pump]                                                     |     66 |      4502 |        47 |         31 |       11 |      0 |    35 |
| 18  | museum6 | [P2 dosing pump]                                                     |     66 |      4502 |        47 |         31 |       11 |      0 |    35 |
| 19  | museum3 | [DP1 dosing pump / Pipe run (none, 12 mm)]                           |     64 |      5054 |        44 |         32 |       11 |      0 |    32 |
| 20  | museum3 | [DP2 dosing pump / Pipe run (none, 12 mm)]                           |     64 |      5094 |        44 |         32 |       11 |      0 |    32 |
| 21  | museum9 | [DP1 dosing pump]                                                    |     62 |      4454 |        43 |         31 |       11 |      0 |    31 |
| 22  | museum9 | [DP2 dosing pump]                                                    |     62 |      4454 |        43 |         31 |       11 |      0 |    31 |
| 23  | museum4 | [Label GROUP / Label P1 RUN] (pump group panel)                      |     61 |     11842 |        58 |         31 |       16 |      0 |    30 |
| 24  | museum8 | The two fill points, before and after                                |     59 |      2604 |        46 |         43 |       15 |      0 |    16 |
| 25  | museum6 | [Label RUN / Label RUN] (pump panel)                                 |     57 |     16166 |        56 |         36 |       22 |      0 |    21 |

## Per hall

Own = hall shell plus the hall's exhibit; copies = visible meshes of the two neighbour copies (their shells and exhibits) at the spawn point. "Exhibit signatures" is how many draws the whole exhibit would need if merged per material signature in one piece.

| Hall    | Exhibit                                    | Exhibit meshes | Shell meshes |  Own |     Copies (neighbours) | Total | Exhibit signatures |
| ------- | ------------------------------------------ | -------------: | -----------: | ---: | ----------------------: | ----: | -----------------: |
| museum0 | (lobby, no exhibit)                        |             71 |           38 |  109 | 1040 (museum9, museum1) |  1149 |                  - |
| museum1 | Hall 1: Warm water                         |            948 |          107 | 1055 |   94 (museum0, museum2) |  1149 |                335 |
| museum2 | Hall 2: Clean water                        |           1085 |           95 | 1180 | 1040 (museum1, museum3) |  2220 |                364 |
| museum3 | Hall 3: Safe water                         |            795 |          115 |  910 | 1158 (museum2, museum4) |  2068 |                315 |
| museum4 | Hall 4: The chemistry of pools             |            814 |           95 |  909 |  888 (museum3, museum5) |  1797 |                286 |
| museum5 | Hall 5: A Day in the Life                  |            172 |          109 |  281 |  887 (museum4, museum6) |  1168 |                 52 |
| museum6 | Hall 6: Grundflow’s Amazing World of Pumps |           1179 |           98 | 1277 |  259 (museum5, museum7) |  1536 |                353 |
| museum7 | Hall 7: Grout                              |            151 |          111 |  262 | 1255 (museum6, museum8) |  1517 |                 43 |
| museum8 | Hall 8: Never again                        |            115 |           96 |  211 |  240 (museum7, museum9) |   451 |                 72 |
| museum9 | Hall 9: The whole plant                    |           1358 |          111 | 1469 |  189 (museum8, museum0) |  1658 |                495 |

## Estimate of draw calls saved

The top 25 models hold 2326 meshes; a far version of each at one draw per material signature (moving meshes kept) would save about 1175 draws, roughly half. The 90 models with 20 meshes or more hold 4398 meshes and would save about 2230. The cost is spread: the big halls (1, 2, 3, 4, 6, 9) have 46 to 115 models each, mostly 10 to 70 meshes apiece, so per-model far versions only pay if applied widely, not just to the top few.

The bigger win is the neighbour copies, which are seen only at a distance through archways: a hall-wide merge per signature would take Hall 9's exhibit from 1358 to about 495 draws, Hall 6's from 1179 to 353 and Hall 2's from 1085 to 364 (about 65 to 70 % fewer). Since a hall at the spawn point often draws more copy meshes than its own (museum7: 262 own, 1255 copy; museum0: 109 own, 1040 copy), giving the copies a far version of the whole exhibit would save some 600 to 800 draws in the worst-placed halls.

Signatures are kept high by canvases: every live display is its own texture, so its own draw (Hall 9's exhibit has 289 canvases). Frozen and packed into an atlas in the far version, they would fold into a handful of materials, bringing each model down to a few draws and the savings close to the full mesh count.
