# Museum corridor decals: brief and prompts

Decorative decals for the ten corridors that join the museum's halls round the ring (`LAYOUT_CORRIDORS` in `src/toolkit/gallery/logic/museum-layout.ts`; corridor _n_ joins Hall _n_ to Hall _n_+1, and the tenth joins Hall 9 back to Hall 0). Two per corridor, the last corridor's second split into four. They hang in the game (2026-10-31): placed by `src/toolkit/gallery/logic/museum-corridor-decals.ts`, drawn by `src/toolkit/gallery/views/museum-corridor-decals.ts`, from the game copies in `game/` (WebP; the cut-outs at most 1024 px, the framed pictures and posters at their full 1536 px), made from these PNGs with ImageMagick (`magick <png> -resize '1024x1024>' -quality 85 game/<name>.webp`).

## The owner's brief (2026-10-31)

These are decorative PVC vinyl wall decals that depict pool things, not instructional diagrams. So, as a rule: no text, keys, numbers, callouts, arrows, charts, axes, grids, legends, borders or backgrounds; each is an attractive picture of pool equipment or a pool scene. There are two kinds:

- **Cut-out** (most of the set): a die-cut vinyl sticker of one object or exploded assembly. Transparent PNG; the outline follows the drawing's own silhouette, with a thin white die-cut margin all round, as real vinyl decals have. Only the object remains: no flow arrows or other annotation graphics. Exploded views follow the real order of disassembly.
- **Framed picture**: a pictorial scene for which a silhouette makes no sense. A rectangular image, the drawing edge to edge, with no title, caption, border or drawn frame, because it hangs in a real picture frame.

Exceptions the owner kept exactly as first made, with their text and layout (rectangular posters): `c89-1-pipe-colour-chart.png`, `c89-2-valve-specimens.png` and `c90-1-pool-architectural.png`.

## The family look

- Drawn as the game's logo is drawn (`resources/images/title/the-pool-logo.svg`): flat vector, even deep navy (`#02213a`) outlines, flat fills in pool blue (`#1dabcd`), a paler blue and white, safety yellow (`#f2c230`) as the one accent (handwheels, levers); other colours only where the subject needs them (a flame, sand, a chemical drum).
- Adult and engineering-minded; no people, mascots, splashes or beach imagery; no real brands.
- Each corridor's pair looks back at the hall it leaves and forward to the one it leads to (Hall 0 Welcome, 1 Warm water, 2 Clean water, 3 Safe water, 4 The chemistry of pools, 5 A Day in the Life, 6 Grundflow's Amazing World of Pumps, 7 Grout, 8 Never again, 9 The whole plant).
- Sizes: generated at 1536 × 1024 (landscape) or 1024 × 1536 (portrait) px; on the wall about 1.0–1.5 m across, below the corridor's window sills.

## How they were made

Claude wrote the brief and prompts and ran Codex (`codex exec`, model `gpt-6-sol` as configured in `~/.codex/config.toml`), which drew each image with its built-in image generation tool. A first round (rectangular posters with titles and keys) was rejected by the owner except the three exceptions above; where the owner liked a first-round drawing, it was given back to Codex as a reference image (`-i`) to keep the drawing while losing everything else. Cut-outs were drawn on a flat pure green (`#00ff00`) ground; Claude then keyed the green out with ImageMagick (`magick`, fuzz 25 %), trimmed, and added the white die-cut margin by dilating the alpha (a disc of 10 px), leaving a transparent PNG; every PNG's alpha channel was checked. Claude reviewed each at full size for technical sense and asked Codex to redraw failures; notes are under each decal. They are raster only: no SVG was made (image generation produces PNG; tracing to SVG would lose the shading).

Style block appended to every cut-out prompt:

```text
Style: a single object drawn as a flat vector illustration, like the art for a die-cut vinyl sticker. Clean deep navy (#02213a) outlines of even weight; flat fills in pool blue (#1dabcd), a paler blue, white and light grey; safety yellow (#f2c230) as the one accent. The object alone, centred, filling most of the frame, with nothing else: no text, letters, numbers, labels, callouts, leader lines, arrows, keys, frames, borders, ground shadow, floor or plinth. Background: one flat, pure, uniform chroma green (#00ff00) everywhere outside the object, with no gradient or texture, and no green anywhere in the object. Technically plausible engineering.
```

Style block appended to every framed-picture prompt:

```text
Style: a flat vector illustration with clean deep navy (#02213a) outlines; pool blue (#1dabcd), paler blue, white and cream fills; safety yellow (#f2c230) accents. The picture runs to every edge of the image: no title, caption, text, border, margin or drawn frame. No people.
```

## The decals

### c01-1-victorian-baths

- **Kind:** framed. **Corridor:** c01, Hall 0 (Welcome) to Hall 1 (Warm water). Landscape.
- **Reference:** the first-round drawing.

```text
Landscape. Redraw the reference picture of a Victorian municipal baths (the arched cast-iron and glass roof, galleries, changing cubicles, clock, pool) as it is, but remove its title, its caption and its border, so the scene fills the whole image edge to edge.
```

### c01-2-boiler-cutaway

- **Kind:** cut-out. **Corridor:** c01. Landscape.
- **Reference:** the first-round drawing.

```text
Landscape. Redraw only the boiler from the reference: the gas-fired fire-tube boiler cut away to show its burner, flame, combustion chamber and tubes, with its flue, gauge, base frame and short stubs of flow and return pipe with yellow handwheel valves. Remove the title, key, numbers, leader lines and every arrow, and the background and border.
```

### c12-1-plate-heat-exchanger

- **Kind:** cut-out. **Corridor:** c12, Hall 1 (Warm water) to Hall 2 (Clean water). Landscape.
- **Reference:** the first-round drawing.

```text
Landscape. Redraw only the exploded plate heat exchanger from the reference: frame plate with its nozzles, the corrugated plates and black gaskets drawn apart along the bars, the pressure plate and the tie bolts. Remove all text, labels, leader lines, flow arrows and coloured flows, the caption, background and border.
```

### c12-2-sand-filter

- **Kind:** cut-out. **Corridor:** c12. Portrait.
- **Reference:** the first-round drawing (its left-hand vessel).

```text
Portrait. Only one sand filter: the left-hand vessel of the reference, a vertical pressure sand filter on legs, cut away to show the distributor, the banded bed of fine sand, coarse sand and gravel, and the laterals at the base, with its pressure gauge and sight glass and short pipe stubs. No arrows, labels, text, title, background or border.
```

### c23-1-uv-reactor

- **Kind:** cut-out. **Corridor:** c23, Hall 2 (Clean water) to Hall 3 (Safe water). Landscape.
- **Reference:** the first-round drawing.

```text
Landscape. Redraw only the ultraviolet reactor from the reference: the stainless chamber cut away to show the violet-glowing lamp in its quartz sleeve and the yellow wiper ring, its control box, sensor, feet and flanged inlet and outlet stubs. Remove the labels, leader lines, arrows, caption, title, background and border; the blank control box display stays blank.
```

### c23-2-balance-tank

- **Kind:** cut-out. **Corridor:** c23. Landscape. (Replaces the water-circuit map, a chart.)

```text
Landscape. A cutaway of a swimming pool balance tank: a rectangular concrete tank, its near wall cut away, partly full of pool-blue water with a gentle surface; an overflow pipe entering high on one side, an outlet pipe with a yellow-handled valve leaving low on the other, a float switch on a cable, a ladder of step irons down the inside wall and a square access hatch on the top slab.
```

### c34-1-test-kit

- **Kind:** cut-out. **Corridor:** c34, Hall 3 (Safe water) to Hall 4 (The chemistry of pools). Landscape. (Replaces the chlorine and pH chart.)

```text
Landscape. A pool water test kit laid out: an open hinged plastic case; a comparator block holding two small glass test tubes, one of water tinted pale pink (the chlorine test) and one tinted yellow-orange (the pH test), each beside its strip of colour-matching discs; a little foil strip of tablets and a stirring rod. Neat, friendly, flat vector.
```

### c34-2-dosing-pump

- **Kind:** cut-out. **Corridor:** c34. Portrait. (Replaces the water-balance seesaw.)

```text
Portrait. A chemical dosing set: a white plastic chemical drum with a screw cap and a blank yellow hazard diamond, on a small black bunded spill tray; a compact diaphragm dosing pump on a wall bracket above it, blue housing with a small round dial; a thin suction tube with a foot valve dropping into the drum and a discharge tube looping away.
```

### c45-1-secchi-disc

- **Kind:** cut-out. **Corridor:** c45, Hall 4 (The chemistry of pools) to Hall 5 (A Day in the Life). Portrait.

```text
Portrait. A Secchi disc: a round flat disc painted in four quarters, alternately black and white, with a small weight beneath, hanging from a yellow marked rope, seen at a slight angle from above so its quarters read clearly; a coil of the rope at the top.
```

### c45-2-exploded-skimmer

- **Kind:** cut-out. **Corridor:** c45. Portrait.
- **Reference:** the first-round drawing; the order of parts corrected (the owner: the basket is lifted out upwards, so it is above the collar).

```text
Portrait. An exploded view of a pool wall skimmer, parts stacked vertically and drawn apart in the order they come off: at the top the round lid; below it the basket (holding a few leaves), which lifts out upwards through the collar; then the collar; then the skimmer body with its mouth and the hinged weir flap; then at the bottom the short elbow of outlet pipe. Thin dashed assembly lines between parts are not wanted: leave plain gaps. Just the parts, without the pool wall or water.
```

### c56-1-below-the-waterline

- **Kind:** framed. **Corridor:** c56, Hall 5 (A Day in the Life) to Hall 6 (Grundflow's Amazing World of Pumps). Landscape.
- **Reference:** the first-round drawing.

```text
Landscape. Redraw the reference scene (the pool water and tiled edge above, the plant room of filter, strainer, pump, heat exchanger and pipework below) as it is, without its title, the flow arrow on the pipe, or its border, so the scene fills the whole image edge to edge.
```

### c56-2-centrifugal-pump

- **Kind:** cut-out. **Corridor:** c56. Landscape.
- **Reference:** the first-round drawing (its Fig. 1).

```text
Landscape. Only the sectioned end-suction centrifugal pump of the reference's upper figure: the volute casing, impeller with curved vanes, the suction and discharge flanges, shaft, seal, bearing housing and its foot. In the reference's fine-line patent style with hatched cut surfaces. No numbers, leader lines, arrows, titles, second figure, key, signature, background or border.
```

### c67-1-split-case-pump

- **Kind:** cut-out. **Corridor:** c67, Hall 6 (Pumps) to Hall 7 (Grout). Landscape. (Replaces the pump curve, a chart.)

```text
Landscape. A large horizontal split-case pump set on its baseplate: the double-volute casing split along the shaft line with a bolted flange, suction and discharge branches pointing down to either side, a flexible coupling under a yellow guard, and a big electric motor with cooling fins. Seen in three-quarter view.
```

### c67-2-waterproofing-layers

- **Kind:** cut-out. **Corridor:** c67. Landscape.
- **Reference:** the first-round drawing.

```text
Landscape. Redraw only the stepped cutaway block from the reference, the corner of a tiled pool tank whose layers are cut back in steps (reinforced concrete, tanking, screed, yellow membrane, adhesive, tiles and grout) with pool-blue water in it. Remove the title, labels, leader lines, background and border.
```

### c78-1-tiling-tools

- **Kind:** cut-out. **Corridor:** c78, Hall 7 (Grout) to Hall 8 (Never again). Landscape. (Replaces the tile setting-out plan, a chart.)

```text
Landscape. A tiler's still life: a small stack of square white pool tiles and a few deep blue ones, a notched steel adhesive trowel with a wooden handle, a rubber grout float, a few plastic tile spacers and a squat bucket of grout with a little grout on its rim.
```

### c78-2-overflow-grating

- **Kind:** cut-out. **Corridor:** c78. Landscape.

```text
Landscape. A short section of deck-level overflow channel taken out of the floor and seen in three-quarter view: the white tiled U-shaped channel with a rounded tiled pool edge on one side, a length of white plastic slatted grating lying in it, one end lifted to show the channel beneath, and a short drain outlet stub below.
```

### c89-1-pipe-colour-chart

- **Kind:** kept poster (the owner's exception). **Corridor:** c89, Hall 8 (Never again) to Hall 9 (The whole plant). Portrait.
- First round, kept as made: a plant-room chart of BS 1710 identification colours (Water green, Steam silver grey, Oils brown, Gases yellow ochre, Acids and alkalis violet, Air light blue, Other fluids black, Electrical services orange), titled KNOW YOUR PIPES, with the footer "Know what is in the pipe before you open it." Its safety bands are decorative, not to the standard.

### c89-2-valve-specimens

- **Kind:** kept poster (the owner's exception). **Corridor:** c89. Portrait.
- First round, kept as made: VALVES OF THE PLANT ROOM, Plate IV, a natural-history specimen plate of eight valves (gate, globe, butterfly, ball, check, diaphragm, pressure relief, multiport).

### c90-1-pool-architectural

- **Kind:** kept poster (the owner's exception). **Corridor:** c90, Hall 9 (The whole plant) to Hall 0 (Welcome). Landscape.
- First round, kept as made: A 25-METRE POOL, an architect's sheet with a plan, an end view and a long section (0.9 m to 2.0 m, balance tank and plant beneath), and a title block (THE POOL, Drawing 001, Scale 1:200). Its "end elevation" is drawn in perspective rather than as a true elevation.

### c90-2a-pump, c90-2b-filter, c90-2c-strainer, c90-2d-valve

- **Kind:** cut-outs, four, split from the first-round "The parts of a pool" (the owner). **Corridor:** c90. Each square-ish landscape.
- **Reference:** the first-round drawing, one component each, in its isometric view, without its plinth or label.

```text
c90-2a-pump: Only the end-suction pump and motor of the reference (the leftmost object), on its own steel baseplate, in the same isometric view, without the concrete plinth or label.
```

```text
c90-2b-filter: Only the vertical sand filter vessel with its top-mounted multiport valve and lever of the reference (second from left), on its own feet, in the same isometric view, without the concrete plinth or label.
```

```text
c90-2c-strainer: Only the strainer pot with its clear bolted lid and basket of the reference (third from left), in the same isometric view, without the concrete plinth or label.
```

```text
c90-2d-valve: Only the flanged butterfly valve with its yellow lever of the reference (rightmost), in the same isometric view, without the concrete plinth or label.
```
