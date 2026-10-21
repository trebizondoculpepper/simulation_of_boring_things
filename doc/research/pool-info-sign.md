# Poolside information sign

The sign in `src/toolkit/components/pool/views/pool-info-sign.ts` (model in `../logic/pool-info-sign.ts`) is modelled on the water-treatment boards hung poolside in public pools. It is our own design under our own maker (Kessler-Moody Instruments, from `brands.ts`), in English; no product photograph is used in the game.

## References

The photographs were downloaded for modelling reference only and are kept out of the repository (`reference/` is gitignored, as the repository deploys publicly). On the machine they were downloaded to they are in `reference/pool-info-sign/`, with their source URLs in `SOURCES.txt` there.

- Eltin, Swimming Pool Display Board with Water Treatment Level: https://eltin.com.pl/en/swimming-pool-display-board-with-water-treatment-level/ — the functional reference. Its tall portrait board has a clock at the top, the hall's air temperature and humidity, then a coloured band per pool (pool, jacuzzi) with water temperature, pH, free chlorine, combined chlorine and redox under each. Light grey printed face, black lettering, red seven-segment digits in black windows, units printed after the digits. Values are partly keyed in by infrared remote. Photographs used: `basenowa-052-2016.jpg` (the board straight on), `tablica_basen_przyklad_temperatura.jpg` (a board in a pool hall, for scale), `Image1.jpg` (a blue-digit variant with the same rows).
- Bodet, Pool Aquastyle: https://www.bodet-sport.com/products/scoreboard/indoor-scoreboards/pool-aquastyle-display.html — the reference for the case: a shallow anodised case with a narrow bezel; its drawing gives 1035 × 620 mm for a three-row board. Photographs used: `aquastyle-perspective-en-500x500.png` (the case's depth), `aquastyle-dimensions-en.png.webp` (the drawing), `aquastyle-etanche.jpg.webp` (in a pool hall).

## What the model takes from them

- Layout after Eltin's: the clock, then air temperature and humidity, then the pool's name on a red band and its five readings. One pool, not two.
- Case after Bodet's: an anodised case with a narrow bezel, four security screws, and a cable gland underneath.
- Two mountings: on the wall (two hanging lugs behind), and clamped to a 76 mm galvanised post on a base plate.

## Estimated dimensions

No dimensions are published for the Eltin board. Its proportions were scaled from the photographs against the digit height, taking the reading digits as 60 mm (Bodet's smallest are about 100 mm, on a board read from further off).

- Case 620 × 1300 × 75 mm, bezel 22 mm.
- Clock digits 90 mm, reading digits 60 mm.
- On the post, the case's middle 1.9 m above the floor; on the wall, the same.

## Display conventions

- A reading not to hand shows dashes (`--.-`), never zero.
- A reading older than its field allows (five minutes for the online readings, 26 hours for combined chlorine, which is keyed in after the daily DPD test) keeps its value but flashes.
- A value the digits cannot hold shows `Err`.
- Power off: everything dark; the printed face and name band still show.
- Segment test: every segment and point lit.
