# Display technologies, 1980 to the present, and how the game should model them

Status: research only (2026-10-31, for the owner). Nothing implemented; no code changed. Written against `370c692e`. Figures are from the datasheets and references linked inline; anything marked **(est.)** is reasoning or a rule of thumb, not a measured or published figure. Another session is changing the `'lcd'` kind (a per-fragment off-angle wash and an optional backlight) as this is written; this note describes what each kind should do and does not assume either way about that work.

## Contents

- [The question](#the-question)
- [Short answer](#short-answer)
- [How the game sees a display now](#how-the-game-sees-a-display-now)
- [Terms](#terms)
- [Legibility: how far a display can be read](#legibility-how-far-a-display-can-be-read)
- [The technologies](#the-technologies)
  - [Raster CRTs, monochrome and colour](#raster-crts-monochrome-and-colour)
  - [Vector and storage CRTs](#vector-and-storage-crts)
  - [LED seven-segment, dot-matrix and bar-graph readouts](#led-seven-segment-dot-matrix-and-bar-graph-readouts)
  - [Giant LED matrix boards](#giant-led-matrix-boards)
  - [Vacuum fluorescent displays](#vacuum-fluorescent-displays)
  - [Nixie tubes](#nixie-tubes)
  - [Gas-discharge (plasma) panels](#gas-discharge-plasma-panels)
  - [Electroluminescent panels](#electroluminescent-panels)
  - [Reflective TN segment LCDs](#reflective-tn-segment-lcds)
  - [STN and DSTN character and graphic LCDs](#stn-and-dstn-character-and-graphic-lcds)
  - [Passive-matrix colour LCDs (CSTN)](#passive-matrix-colour-lcds-cstn)
  - [TN TFT colour LCDs](#tn-tft-colour-lcds)
  - [IPS and VA panels](#ips-and-va-panels)
  - [Backlights: LED, EL and CCFL](#backlights-led-el-and-ccfl)
  - [E-paper](#e-paper)
  - [OLED](#oled)
  - [Touch: resistive and capacitive](#touch-resistive-and-capacitive)
  - [Others worth knowing](#others-worth-knowing)
- [Comparison tables](#comparison-tables)
- [Typical sizes and resolutions by era](#typical-sizes-and-resolutions-by-era)
- [Recommendations for the game](#recommendations-for-the-game)
  - [Kinds](#kinds)
  - [A profile for each kind](#a-profile-for-each-kind)
  - [Implementation](#implementation)
  - [Priorities](#priorities)
  - [For the owner](#for-the-owner)
- [Sources](#sources)

## The question

The plant rooms carry displays from the early 1980s to the late 2020s, side by side, and the rule is that every interface is a real, working one the game can simulate. The game already gives each display a kind (`DisplayKind` in `src/toolkit/components/core/logic/display-reach.ts`), which sets how far away it is drawn, how far off its face it can be read, and how often it may show a new picture. The question: for each display technology of the period, what does it really look like from different angles and distances, in each of its states (off, on with nothing to show, showing, standby), as power fails, as it updates, and as it ages and breaks; and how should the game model each one, realistically but within its redraw budget?

## Short answer

- **The biggest realism gap is that every kind has one round, symmetric viewing cone and fades to one target, its own average colour.** Real displays differ most in exactly those two respects. A TN LCD or TFT is far narrower vertically than horizontally, and is asymmetric up and down: from its good side it washes out towards its background or backlight; from its bad side it darkens and its grey levels invert. Emissive displays (CRT, LED, VFD, plasma, EL, OLED) barely fade at all; seen very obliquely they get dimmer, towards their unlit face, never towards a wash. IPS, VA and OLED panels hardly change. The fix is cheap: split the cone into a horizontal half-angle and separate up and down half-angles, give each kind a fade target (`background`, `dark`, `invert`, `mean`) and a floor (how far it fades at worst), and keep the four-step fade.
- **The game has no shared vocabulary for a display's states.** Each technology has a distinctive off look (a CRT's grey-green glass, a VFD's black filter with its fine filament wires, an LCD's pale grey with no segments, a black OLED), and a distinctive "on but nothing to show" look (an HD44780 module's row of black boxes before it is initialised, a monitor's floating "No signal" box, a TN panel's full white when its controller fails, a VFD's or LED meter's all-segments lamp test at power-on). A shared display power state (off, starting, no signal, standby, on, failing) with a per-kind look for each would make a switched-off plant visibly different from a quiet one, at no running cost: each look is drawn once, when the state changes.
- **Power transitions can be done with no redraws at all.** A CRT's picture collapsing to a line and a dot, its afterglow, an LCD's slow fade, a CCFL's dim pink warm-up: all are a mesh's scale and a material's colour changing over a second or so, not a canvas being redrawn or a texture uploaded.
- **The `touch` kind is a category error.** Touch is an overlay on a panel, not a display technology: a 2003 Siemens TP177 is a blue STN under a resistive film; a 2024 HMI is an IPS TFT under glass. Replace `touch` with the panel's own kind and a touch-overlay option, which changes the surface (matte film or glossy glass) and the input's behaviour (drift and recalibration for resistive; ghost touches from water for capacitive, which matters in a pool building).
- **Proposed kinds:** `crt` (with a phosphor and a scan mode: raster, vector or storage), `led`, `giant-led`, `vfd`, `nixie`, `plasma` (orange monochrome or colour), `el`, `lcd` (passive monochrome: TN segment and STN character and graphic, with a mode and an optional backlight), `cstn`, `tft` (TN active matrix), `ips` (IPS, VA and anything modern), `oled`, `epaper`, plus the existing `printed`, `lcars` and `ui`. Flip-disc boards are worth a kind if the owner wants one.
- **Ranked priorities:** (1) asymmetric cones and per-kind fade targets; (2) the shared power state and its off and no-signal looks; (3) power-off and power-on transitions by scale and colour; (4) `touch` replaced by panel kinds and an overlay; (5) reflective displays lit by the room, so a reflective LCD reads by torchlight in a power cut and a dead CCFL's picture can still just be seen; (6) the cheap failures (dead segments, a lost ribbon or zebra contact fixed by pressing the bezel, a dead or pink backlight, STN contrast and its knob, a TN panel gone white); (7) new kinds as their components arrive; (8) burn-in overlays and the costlier effects.

## How the game sees a display now

Read from `src/toolkit/components/core/logic/display-reach.ts` and its view, `src/toolkit/components/core/views/display-reach.ts` (`watchDisplay`, called by `createCanvasTexture` in `views/screens.ts`):

- **Every canvas texture is watched.** It is drawn in full only within its kind's `reach` (8 m; 30 m for `giant-led`), when it subtends more than `minSubtended` (1°), and when seen from in front of its face. Beyond reach it is a flat canvas of its own average colour (`meanColour`), and its redraws are held back.
- **The off-angle fade is one cone.** `sighting` measures one angle, between the face's normal and the eye. `displayVisibility` fades the display from flat at `maxOffNormal` to full at `fullOffNormal`, in four steps (`DISPLAY_FADE_STEPS`), each one upload. `lcd` fades between 70° and 65°; most others between 85° and 80°; `printed` 90° to 88°. There is no difference between horizontal and vertical, nor between above and below.
- **The fade has one target for every kind:** the display's own average colour, laid over it at `1 − level` (`compose`). That suits a TN LCD seen from its washing-out side, but not an emissive display, which goes dimmer, nor a TN panel from its inverting side.
- **`maxHz` throttles new pictures:** `lcd` 5, `crt` 25, `plasma` 30, `vfd` 10, `led` 10, `giant-led` 10, `nixie` 5, `touch` 30, `lcars` 30. A redraw sooner waits for its turn (`mayRefresh`).
- **Static signs** are handled separately and better: their lettering is drawn only once it covers `SIGN_MIN_PIXELS` (5) on the screen, seen as it is (`smallestReadable`), which accounts for distance, field of view, zoom, screen height and obliquity. Displays do not yet use that rule; they use the whole display's subtended angle.
- **Kinds in use** (by a rough count of literal uses outside the module): `touch` about 43, `led` 6, `lcd` 5, `vfd` 5, `lcars` 4, `crt` 3, `giant-led` 2, `nixie` 1, `plasma` none. `touch` is evidently the default for anything modern-looking, which is why splitting it matters.
- **Power and states** are each component's own business: `createNixieScreen` and `createScopeScreen` take an `on` flag and draw a dim version when it is false; there is no shared notion of standby, no-signal or a transition.

## Terms

- **Viewing angle.** Datasheets give the angle off the normal, in each direction, at which the contrast ratio (CR) falls to a threshold, usually CR ≥ 10 for TFTs and CR ≥ 2 or 5 for passive LCDs. So "±30° at CR ≥ 2" is a much worse panel than "±30° at CR ≥ 10". A display is still faintly readable well beyond its rated angle; the rated angle is where it stops being comfortable.
- **Up, down, left, right.** "Up" in a datasheet means the viewer is above the normal, looking down at the screen; "down" means the viewer is below, looking up.
- **Clock direction.** Passive and TN LCDs are made with a preferred viewing direction, given as a clock position: a "6 o'clock" panel is best seen by a viewer below its normal, looking up at it (a panel on a desk or a low cabinet seen by someone standing is the other way round, which is why such kit is often ordered as 12 o'clock). Grey-scale inversion sits on the opposite side to the preferred direction ([Topway, LCD viewing angle](https://www.topwaydisplay.com/blog/lcd-viewing-angle); [SLW, grayscale inversion](https://www.slw-ele.com/deep-dive-grayscale-inversion-and-why-your-industrial-display-loses-color-accuracy.html)).
- **Positive and negative mode.** Positive: dark characters on a light background (reflective LCDs, yellow-green STN, FSTN). Negative: light characters on a dark background, which needs a backlight (blue-mode STN, FSTN negative).
- **Persistence.** For a phosphor, the time for its light to fall to 10 % after excitation stops.
- **Multiplexing.** Driving a display a row, digit or grid at a time, fast enough that the eye sees them all lit ([Wikipedia, multiplexed display](https://en.wikipedia.org/wiki/Multiplexed_display)).

## Legibility: how far a display can be read

Human-factors standards for screens (ISO 9241-3, ANSI/HFES 100) prefer characters subtending 20 to 22 minutes of arc, with 16 as the minimum for comfortable work; about 10 arcmin can still be read with effort, and 5 arcmin is near the limit of normal acuity **(est., from those standards' figures and the usual acuity limit)**. As distances, a character of height h is comfortable to about 170 h, readable to about 340 h, and at the limit at about 690 h. On the game's screen the pixel is coarser than the eye: at 1080 lines and a 60° vertical field, one pixel is about 3.3 arcmin, so the game's 5-pixel rule for signs (`SIGN_MIN_PIXELS`) is about 17 arcmin, close to the standards' comfortable figure.

| Display                                                                                           | Character height | Comfortable (170 h) | Readable (340 h) | Limit (690 h) |
| ------------------------------------------------------------------------------------------------- | ---------------- | ------------------- | ---------------- | ------------- |
| HD44780 16 × 2, standard ([Winstar WH1602B](https://www.texim-europe.com/getfile.ashx?id=142004)) | 5.55 mm          | 0.9 m               | 1.9 m            | 3.8 m         |
| HD44780 20 × 4, standard                                                                          | 4.75 mm          | 0.8 m               | 1.6 m            | 3.3 m         |
| 16 × 2, large-character                                                                           | about 9.7 mm     | 1.6 m               | 3.3 m            | 6.7 m         |
| 3½-digit LCD panel meter                                                                          | 10 to 13 mm      | 2 m                 | 4 m              | 8 m           |
| LED seven-segment, 0.56 in                                                                        | 14.2 mm          | 2.4 m               | 4.8 m            | 9.8 m         |
| LED seven-segment, 1 in                                                                           | 25 mm            | 4.3 m               | 8.5 m            | 17 m          |
| VFD 5 × 7 character module                                                                        | about 5 to 9 mm  | 0.9 to 1.5 m        | 1.7 to 3 m       | 3.5 to 6 m    |
| Nixie IN-12 / IN-14                                                                               | 18 mm            | 3 m                 | 6 m              | 12 m          |
| Nixie IN-18                                                                                       | 40 mm            | 7 m                 | 14 m             | 28 m          |
| 12 in terminal CRT, 80 × 24                                                                       | about 5 mm       | 0.9 m               | 1.7 m            | 3.5 m         |
| Pool timing board, 4 in digits                                                                    | 100 mm           | 17 m                | 34 m             | 69 m          |

The point for the game: a two-line character LCD is not really readable beyond 2 m, a large LED readout to 5 to 8 m, and a hall board across the hall. The 8 m reach is generous for small text, which is fine (it is a rendering budget, not a legibility rule), but the per-display cut-off should come from character height, as signs' does, rather than from the whole display's subtended angle.

## The technologies

### Raster CRTs, monochrome and colour

**What and when.** The cathode-ray tube ([Wikipedia](https://en.wikipedia.org/wiki/Cathode-ray_tube)) was the display of the 1980s and 1990s: monochrome monitors and terminals, colour monitors, CCTV monitors (still CRT in many buildings into the 2000s), and SCADA workstations. Monochrome phosphors ([Wikipedia, phosphor](https://en.wikipedia.org/wiki/Phosphor)): P1 green (peak about 525 nm, medium persistence, about 20 ms to 10 %), P3 amber or yellow (about 602 nm, about 13 ms), P4 white (black-and-white TV, short), P31 green (short, the oscilloscope and later monochrome green), P39 green (long persistence, for slow-scan and radar-like displays), P134 amber in later amber monitors ([phosphor research compilation](https://bunkerofdoom.com/tubes/crt/old%20and%20support/crt_phosphor_research_20091220.pdf); [Helsinki lecture notes](https://www.cs.helsinki.fi/group/goa/hardware/output/lect2a1.html)). Sources disagree on exact persistence; the figures are good to a factor of two.

**Viewing angles.** Effectively the whole hemisphere: the phosphor emits roughly evenly, and the image is on the inside of the glass. At very oblique angles the image foreshortens, the glass's thickness (10 mm and more on the faceplate) shows as a slight parallax, and reflections of the room in the curved or flat glass dominate. Colour does not shift and nothing inverts. Model as symmetric, about 85° each way, fading towards the tube's dark face only at the very edge.

**Distance.** Text on a 12 to 14 in monitor at 80 × 24 or 80 × 25 is about 4 to 6 mm high: comfortable at a desk, readable to about 2 m.

**States.**

- _Off:_ the faceplate's own colour. Monochrome tubes are greyish (P4), grey-green (P1 or P31) or brownish grey (amber); colour tubes are dark grey to near black (tinted glass over a black matrix). Under room light the unlit phosphor is visibly lighter than the black of a lit tube's dark areas would suggest.
- _Starting:_ 5 to 15 s of warm-up as the cathode heats: black, then the picture fades up from dim, often a little defocused at first. Colour monitors and TVs degauss at power-on: a "thunk" and a second or so of wobbling colour (the degaussing coil's decaying field) ([Wikipedia, degaussing](https://en.wikipedia.org/wiki/Degaussing)).
- _No signal:_ a TV shows snow (analogue) or a blue screen (VCRs and later TVs); a computer monitor of the mid-1990s on shows black with a floating "No signal" or "Check signal cable" box from its on-screen display, sometimes a self-test pattern, and then goes to standby. A terminal shows a cursor or a "ready" line. A monochrome monitor with a signal but no picture content shows a faint raster (visible scan lines) if its brightness is turned up.
- _Standby:_ from 1993, VESA DPMS ([Wikipedia](https://en.wikipedia.org/wiki/VESA_Display_Power_Management_Signaling)): screen black, power lamp amber or blinking green, the heater kept warm so the picture returns in a second or two rather than 10.
- _Showing:_ the picture, with a faint visible line structure up close (PAL TV 625 lines, monitors more).

**Switch-off.** Two classic looks. Older sets and cheap monitors without a working spot-killer: the picture collapses vertically to a bright horizontal line, then horizontally to a bright dot in the centre, which fades over a second or so, because the deflection fails before the beam does; repeated, it burns a spot in the phosphor ([US 5677730, spot elimination circuit](https://patents.google.com/patent/US5677730); [US 4340910, spot suppression](https://patents.google.com/patent/US4340910)). Better sets cut the beam first, so the picture simply fades to black over a fraction of a second. Either way, a short afterglow follows: tens of milliseconds for P1 and P3, and on long-persistence phosphors a faint image of the last frame visible for a second or more in a dim room. A crackle of static from the glass is a nice sound cue.

**Refresh.** 50 Hz interlaced for PAL TV and CCTV, 60 Hz for NTSC; computer monitors 60 to 85 Hz progressive. 50 Hz flicker is visible in peripheral vision, especially on white backgrounds. The game cannot show refresh flicker meaningfully and should not try; the owner's 25 Hz for `crt` is a good choice (half PAL's field rate, its frame rate). What a CRT shows usually changes much more slowly than that: an industrial terminal or SCADA screen of the period redrew its values once or twice a second, often line by line visibly at 9600 baud.

**Sizes.** 9, 12 and 14 in monochrome (80 × 24 or 80 × 25 text, 640 × 200 to 720 × 350); 14 in colour (CGA, EGA, VGA 640 × 480), 15 and 17 in by the mid-1990s (800 × 600 to 1280 × 1024), 19 and 21 in for SCADA and CAD. CCTV monitors 9, 12 and 14 in, often monochrome. Sizes are diagonal of the tube; the visible picture is about an inch less.

**Look under plant-room light.** Bright fluorescent light lifts a CRT's blacks to the faceplate's grey and adds reflections; contrast falls but the image stays readable. Green and amber monochrome are notably more legible in a bright room than colour.

**Failures worth simulating.**

- _Burn-in:_ a static screen (a mimic's lines and headings, a menu bar) left for years etches into the phosphor; visible as a faint permanent ghost, even when off ([Wikipedia, screen burn-in](https://en.wikipedia.org/wiki/Screen_burn-in)). Very characteristic of control rooms.
- _Purity and convergence:_ magnetised shadow masks give coloured blotches, cured by degaussing (a front-panel button on many monitors); misconvergence shows as colour fringes, worst in the corners. Geometry drift: tilt, pincushion, a picture narrower or shifted.
- _Vertical collapse:_ the vertical deflection fails and the screen shows one bright horizontal line. Classic and unmistakable.
- _Worn tube:_ dim, soft, needs the brightness turned right up.
- _Flyback whine_ at 15.6 kHz (PAL line rate) is a sound cue, louder when failing.

### Vector and storage CRTs

**What.** A vector display draws lines directly with the beam rather than scanning a raster ([Wikipedia, vector monitor](https://en.wikipedia.org/wiki/Vector_monitor)): oscilloscopes, X-Y displays, early CAD, radar plan displays. A storage tube ([Wikipedia](https://en.wikipedia.org/wiki/Storage_tube)), such as the Tektronix 4010 family's ([Wikipedia](https://en.wikipedia.org/wiki/Tektronix_4010)), holds what is drawn on it without refresh until erased, which is done by flashing the whole screen bright green and then dark.

**Look.** Thin, very bright lines on black, brightest where the beam moves slowly (line ends, the slow parts of a waveform) and dimmer where it sweeps fast. Oscilloscopes use P31 (short, green) or P7 (blue flash, long yellow-green afterglow) for slow sweeps. A storage tube's stored image is a dimmer, slightly blooming green on a faint green background that brightens with age of the image.

**Refresh.** An oscilloscope traces at its sweep rate (often far above any frame rate), so a repetitive signal looks static; a slow sweep (tens of milliseconds per division and slower) shows the moving dot with its persistence tail. Storage tubes need no refresh; the erase flash takes about half a second.

**States and switch-off.** As raster CRTs. An oscilloscope with no signal shows a free-running flat line (auto trigger) or nothing (normal trigger); with no deflection it shows a dot in the centre, which a real user turns down at once.

**For the game.** The existing `createScopeScreen` is a vector display. A storage tube would be a fine anachronism for a chart-like history display, with an ERASE button and its flash. Vector and storage are scan modes of `crt`, not separate kinds.

### LED seven-segment, dot-matrix and bar-graph readouts

**What and when.** Discrete LED readouts ([Wikipedia, seven-segment display](https://en.wikipedia.org/wiki/Seven-segment_display); [dot-matrix display](https://en.wikipedia.org/wiki/Dot-matrix_display)): seven- and sixteen-segment digits, 5 × 7 dot-matrix characters, bar graphs. Ubiquitous on controllers, panel meters, timers and pump drives throughout the period. Colours by era: standard red GaAsP (about 655 nm, dim) from the 1970s; high-efficiency red (about 635 nm), orange, yellow (about 585 nm) and yellow-green (about 565 nm) through the 1980s; bright blue and true green (InGaN) only from the mid-1990s, and white later still, so a blue LED readout is anachronistic before about 1995 ([Wikipedia, LED](https://en.wikipedia.org/wiki/Light-emitting_diode)).

**Viewing angles.** Wide and symmetric: diffused segments typically hold half their brightness to about ±40 to 60°, and, being emissive against a dark face, stay readable nearly to the edge, getting dimmer. They do not wash out, invert or shift colour. Most sit behind a tinted filter (red or smoked), which hides the unlit segments.

**States.**

- _Off:_ without a filter, the unlit segments show as pale grey or pinkish shapes on a dark grey face, and an "8" can be read in strong light. With a red filter, a uniform dark red window.
- _Power-on:_ many instruments light every segment for a second as a lamp test ("8.8.8.8."), then show a model number or software version, then the reading.
- _No data:_ dashes ("- - - -"), or a blinking reading, or "Err", "----", "OL" (over-range) on panel meters.
- _Standby:_ a single dot or a dimmed display.

**Switch-off.** Instant: an LED's light stops within microseconds. A supply capacitor may hold a dim reading for a fraction of a second.

**Refresh.** Multi-digit LED readouts are multiplexed, a digit at a time, typically at 100 Hz to 1 kHz per digit; invisible to the eye, but they band on cameras. What they show changes at the instrument's own rate: the ICL7106 and ICL7107 converters behind most 3½-digit panel meters take about three readings a second at their standard 48 kHz clock (one conversion is 16,000 oscillator periods, 333 ms) ([ICL7107 datasheet](https://www.komponenten.es.aau.dk/fileadmin/komponenten/Data_Sheet/ADC_DAC/ICL7107.pdf)), or 2.5 a second at 40 kHz, chosen to reject both 50 and 60 Hz hum. A microcontroller-based controller typically updates its readout 2 to 5 times a second so the last digit does not flicker unreadably.

**Sizes.** Digit heights 0.3 in (7.6 mm), 0.39, 0.5, 0.56 in (14.2 mm, the commonest), 0.8, 1, 1.8, 2.3 and 4 in; 5 × 7 matrices from 0.7 in. Panel meters are DIN 96 × 48 or 72 × 36 mm bezels with 4 or 5 digits.

**Look under plant-room light.** Very good: emissive, high contrast behind a filter. Red is the classic; green and yellow-green look older, blue and white newer.

**Failures.** A dead segment (driver or bond wire), which turns an 8 into a 0 or a 9 into a 3: a misreading the player could fall for. A whole digit dark (its common line failed). A segment stuck lit. Faint ghosting of neighbouring segments in a badly designed multiplex. Old GaAsP digits dim unevenly. All are cheap to draw.

### Giant LED matrix boards

**What and when.** Large boards built of LED modules: moving-message signs (the 1990s BetaBrite and its kind, 7 × 80 pixels in red, green and amber), scoreboards, pool timing and lane boards, information boards. Modules are typically 16 × 16 or 32 × 16 pixels, with a pixel pitch from about 20 mm (old outdoor) through 10 mm ("P10") to 4 to 6 mm indoors and under 2 mm for modern video walls.

**Viewing angles.** Asymmetric: the LEDs are chosen with a wide horizontal and a narrower vertical beam, typically about 140° horizontally and 60 to 120° vertically (older oval through-hole LEDs narrowest), and boards are often aimed slightly down at their audience. Off-angle the board dims, sometimes with a colour shift where red, green and blue chips have different beams; it does not wash out.

**Distance.** Pitch sets the nearest comfortable distance; rules of thumb range from 1 m per millimetre of pitch to three times that, and manufacturers disagree ([Daktronics](https://www.daktronics.com/en-us/support/kb/000030569); [sixteen-nine, the rules of thumb are all over the place](https://www.sixteen-nine.net/?p=15497)). Character height sets the farthest: a board's 7-pixel text on 10 mm pitch is 70 mm high, readable at about 25 to 50 m.

**States.** Off: a black face with visible dots, often behind black louvres. No data: black, a clock, or a default message. Power-on: a test pattern or a firmware banner. Standby: black, or a dim clock.

**Refresh.** Rows are scanned (1/4, 1/8 or 1/16 duty) at hundreds of hertz to kilohertz; cheap boards flicker on camera. The controller sends frames at 25 to 60 Hz, but most content changes rarely; scrolling text moves a pixel at a time, 10 to 30 pixels a second. The existing `giant-led` maxHz of 10 is fine for static text and a little low for smooth scrolling (a scroll at 10 Hz looks steppy, which is honest for an old moving-message sign).

**Failures.** A dead module (a dark rectangle), one colour of a module failed (a block gone cyan or magenta), a dead row driver (a dark line across a module or the whole board), dead pixels, and uneven brightness where modules have been replaced ("patchwork"). All cheap: a mask on the drawing.

### Vacuum fluorescent displays

**What and when.** A VFD ([Wikipedia](https://en.wikipedia.org/wiki/Vacuum_fluorescent_display)) is a flat vacuum tube: fine, directly heated filaments (the cathode) run across the face, a mesh grid over each digit or character, and phosphor-coated anode segments behind. Everywhere from the late 1970s to the 2010s: VCRs, tills, car dashboards, lab instruments, and the industrial character modules of Futaba and Noritake (1 × 20, 2 × 20, 2 × 40, 4 × 20; graphic 128 × 64 and 256 × 64), often a drop-in for an HD44780 LCD.

**Look.** The phosphor (zinc oxide) gives the classic blue-green, peak about 505 nm, very bright (Futaba modules 500 to 1,000 cd/m² typical) ([Futaba module specifications](https://www.mouser.com/catalog/specsheets/Futaba-06-11-2019-Futaba%20VFD%20Modules.pdf); [Futaba GP9002A application note](https://cdn-shop.adafruit.com/datasheets/GP9002A%20Appnote.pdf)); other colours (amber, red, white, blue) come from other phosphors or a filter over blue-green. Up close you see the fine filament wires as faint horizontal lines across the face and the grid mesh over each character, a little in front of the glowing segments. The unlit segments are just visible as pale grey-white shapes under a clear window, invisible behind a tinted one.

**Viewing angles.** Wide (typically over 120° in all directions) and symmetric. Because the grid stands slightly in front of the segments, at oblique angles the mesh shades them, and the display gets dimmer and slightly grainy; it does not wash out or shift colour.

**States.** Off: dark tinted glass, wires barely visible. Power-on: near instant; appliances and many instruments light all segments for a second. Filament on but nothing driven: nothing visible in normal light (the filaments run below visible glow); a faint uniform haze at most. Standby: often a dimmed clock (Futaba modules have brightness steps, typically 25, 50, 75 and 100 %).

**Switch-off.** Instant (the phosphor's decay is milliseconds).

**Refresh.** Multiplexed grid by grid, 100 to 200 Hz typically. Module firmware accepts characters over a parallel or serial bus at a high rate; the visible update rate is set by the host, usually a few times a second. 10 Hz is right.

**Ageing and failures.** Brightness falls with hours, to half after 30,000 to 50,000 hours for blue-green (red and other phosphors much shorter) ([Wikipedia](https://en.wikipedia.org/wiki/Vacuum_fluorescent_display)), and unevenly: segments lit all the time (a colon, an icon, a fixed legend) dim more than the rest, a soft burn-in. A failing filament gives a display dim at one end, or with a dark horizontal band. A cracked envelope loses its vacuum and the display goes dead, sometimes with a white haze inside.

### Nixie tubes

**What and when.** Cold-cathode neon tubes with ten stacked wire cathodes shaped as digits, each glowing orange when selected ([Wikipedia](https://en.wikipedia.org/wiki/Nixie_tube)). Mainly 1955 to the mid-1970s; Soviet production into the 1990s. In a 1980s-onwards plant they are legacy kit (an old frequency counter, a totaliser on a long-lived panel), which is exactly the kind of anachronism the brief welcomes.

**Look.** Warm orange-red neon glow (about 585 to 640 nm lines) around the lit digit, with the unlit digits visible as grey wire shapes stacked in front and behind. The lit digit sits at its own depth in the stack, so digits appear at slightly different depths.

**Viewing angles.** Side-view tubes (IN-12 and IN-14 are end-view and side-view respectively; IN-18 is large side-view) read well to about ±40 to 50°, after which the stacked cathodes overlap and the lit digit is hidden behind the unlit ones. Model as a narrower cone than other emissive kinds, fading to a muddle (`mean`) rather than to dark.

**States.** Off: grey wire cages in glass. Power-on: instant, with a little flicker as the gas strikes; clocks and counters often run a "slot machine" through every digit. No data: blank tubes or all zeros.

**Switch-off.** Instant.

**Refresh.** Driven directly (one driver per tube, the 74141) or multiplexed in later clocks. Counters update at their gate time (0.1, 1 or 10 s); 5 Hz is right.

**Failures.** Cathode poisoning: digits rarely lit develop dark patches or light only partly, because sputtered metal from the active digits coats them ([Dalibor Farny, nixie tube health](https://docs.daliborfarny.com/zen-nixie-clock/1/en/topic/nixie-tube-health)). An air leak turns the glow violet or pink and then the tube fails to strike. A digit "bleeding" into its neighbour. A failing tube flickers. Cathode poisoning is a nice, cheap, period-true effect for a counter whose high digits are rarely used.

### Gas-discharge (plasma) panels

**What and when.** Monochrome gas-discharge panels glow the orange of neon ([Wikipedia, plasma display](https://en.wikipedia.org/wiki/Plasma_display)). Burroughs Self-Scan character panels from 1971, "bright neon-orange characters on a dark background", readable at up to 20 ft ([Burroughs displays catalogue, 1970](https://bitsavers.mirrorservice.org/components/burroughs/1061K_Displays_Catalog_197012.pdf); [lampes-et-tubes, Self-Scan](https://lampes-et-tubes.info/cd/cd122.php?l=e)); gas-plasma seven-segment and dot-matrix readouts on 1970s and 1980s instruments, tills and petrol pumps; 640 × 400 and 640 × 480 orange graphic panels on 1980s portables ([Toshiba T3100](https://en.wikipedia.org/wiki/Toshiba_T3100), 1986) and on industrial terminals and test sets. Colour plasma TVs and information screens (42 to 65 in, 2000s to about 2014) are a different, phosphor-based technology with the same name.

**Viewing angles.** Very wide, about 160° and more, symmetric; emissive, dims only at the very edge.

**Look.** Monochrome: orange dots, slightly soft-edged, on a dark red-brown or black face, about 0.3 to 0.4 mm pitch on graphic panels, with a faint orange "keep-alive" glow in some panels' margins. Very legible in a bright room. Colour PDP: deep blacks for its day, bright, a visible cell structure close up, and a faint buzz.

**States.** Monochrome: off is a dark brownish glass; on is instant. Colour PDP: as a TV, with a red standby lamp, a few seconds' start-up and a maker's logo, and a "No signal" box.

**Switch-off.** Instant.

**Refresh.** Monochrome panels are refreshed (DC) or self-sustaining (AC, the cells hold their state); updates are as fast as the host sends them. Colour PDPs run at 50 or 60 Hz with sub-field dithering (false contours on moving edges). 10 Hz for a monochrome panel's data, 25 for a colour one.

**Failures.** Burn-in (both kinds, notoriously on colour PDPs); a dead row or column from a failed driver, a line across the panel; individual cells flickering or failing to fire on an old panel; dimming as the gas wears.

### Electroluminescent panels

**What and when.** Thin-film electroluminescent (TFEL) panels ([Wikipedia, electroluminescent display](https://en.wikipedia.org/wiki/Electroluminescent_display)), above all Planar's (later Lumineq's): a phosphor layer (ZnS:Mn, yellow-amber) between electrodes, lit pixel by pixel. From the early 1980s on medical equipment, military kit, test instruments and industrial terminals and HMIs; still made for harsh environments. Typical panels: 640 × 200, 640 × 400, 512 × 256, 640 × 480 at 9.1 in (Planar EL640.480), 320 × 240 at 5.7 in (EL320.240.36).

**Look.** Crisp amber-yellow pixels on near-black, very sharp edges, even brightness; distinctively "military".

**Viewing angles.** 160° minimum in the datasheet ([Planar EL320.240.36](https://www.slw-ele.com/datasheets/EL320.240.36.pdf)), symmetric; emissive, dims only at the edges.

**Temperature.** Rated −40 to +65 °C or wider; response is under a millisecond and does not slow in the cold, which is why it was chosen where LCDs failed.

**States.** Off: dark grey-green glass, the electrode pattern faintly visible. On: instant. No data: blank black.

**Switch-off.** Instant.

**Refresh.** Driven at 60 Hz and more by its own controller; data as fast as the host sends. 25 Hz is honest.

**Failures.** Differential ageing: pixels lit for years become dimmer than the rest, so static legends burn in as darker ghosts on a lit area (the opposite of a CRT's burn-in, which shows as a ghost on dark). Dimming overall. A dead row or column from a driver.

EL lamps (a sheet of EL phosphor, not a pixelated display) were also used as LCD backlights: see [Backlights](#backlights-led-el-and-ccfl).

### Reflective TN segment LCDs

**What and when.** The twisted-nematic LCD ([Wikipedia, twisted nematic field effect](https://en.wikipedia.org/wiki/Twisted_nematic_field_effect); [Wikipedia, LCD](https://en.wikipedia.org/wiki/Liquid-crystal_display)): black segments on a pale silvery-grey reflective background, the display of every calculator, panel meter, timer, thermostat, gas meter and controller since the 1970s. Reflective (a mirror-like or diffuse reflector behind the rear polariser, needing room light), transflective (readable by room light or a backlight), or transmissive with a backlight.

**Viewing angles.** Narrow and asymmetric. A typical TN segment glass is comfortable within about ±30 to 40° horizontally, and vertically about 20° to one side and 40° to the other (the preferred clock direction). Beyond that the contrast falls steadily: the black segments go grey and then nearly vanish into the background from the good side; from the bad side the background darkens and the segments may appear lighter than it (inversion). Reflective displays also show a double image (the segment's shadow on the reflector) at an angle. Nothing shifts hue much; a monochrome TN glass is grey on grey. Fade target: the background colour, with an inversion from the bad side.

**Distance.** Panel-meter digits 10 to 13 mm; thermostat and timer digits 6 to 20 mm; readable at a few metres in good light.

**States.**

- _Off:_ identical to on-and-blank: a plain grey background, no segments. This is the most important thing about a TN LCD for the game: you cannot tell a dead one from a blank one, so instruments show a fixed legend, a colon or a dash to prove they are alive.
- _Power-on:_ many instruments light every segment and annunciator for a second or two (a lamp test); the segments appear over 100 to 200 ms, not instantly.
- _No data:_ dashes, "----", "Err", "OL", a blinking reading.
- _Standby:_ blank or a clock; no visible difference from off unless a symbol is shown.

**Switch-off.** The segments fade out over about 100 to 300 ms as the drive collapses and the liquid crystal relaxes (seconds in the cold). A backlight, if any, goes at once (LED) or in tens of milliseconds (CCFL).

**Temperature.** Response slows sharply in the cold: tens of milliseconds at room temperature becomes seconds well below zero, and the display fades as the contrast shifts. Above the fluid's clearing point (60 to 80 °C for standard fluids, more for wide-temperature ones) the whole display goes black (or blank) and recovers as it cools: an LCD in direct sun, or on a panel by the boiler flue, "blacks out" ([EDN, LCD works from −20 to 80 °C](https://edn.com/lcd-works-from-20-degrees-to-80-degreesc/)).

**Refresh.** Segment glasses are driven statically (up to about four digits) or multiplexed at 1/2 to 1/4 duty, at a frame rate of 30 to 100 Hz. What they show changes at the instrument's measuring rate: three readings a second for an ICL7106 panel meter ([ICL7107 datasheet](https://www.komponenten.es.aau.dk/fileadmin/komponenten/Data_Sheet/ADC_DAC/ICL7107.pdf), the 7106 being its LCD twin), less for a thermostat. The liquid crystal itself limits visible change to a few times a second at room temperature.

**Look under plant-room light.** Excellent, better than any emissive display in bright light, and useless in the dark without a backlight. Reflective LCDs are lit by the room; the game should render them with a lit material, not an emissive one.

**Failures worth simulating.**

- _Missing segments or digits from a failed contact._ Segment glasses connect to their board through an elastomeric "zebra" strip or a heat-seal flex; when it ages or the bezel loosens, segments or whole digits drop out, often intermittently, and come back when the bezel is pressed. A real, common, interactive fault.
- _Polariser damage:_ heat, humidity and UV yellow or brown the polariser and make it bubble or delaminate, giving dark or rainbowed patches; very common on old panel meters.
- _Leaking fluid:_ a cracked glass shows a spreading black or rainbow stain.
- _Heat blackout_ and _cold slowness_, above.

### STN and DSTN character and graphic LCDs

**What and when.** Supertwisted nematic ([Wikipedia](https://en.wikipedia.org/wiki/Super-twisted_nematic_display)) gives the higher multiplex ratios a dot-matrix needs. Character modules on the Hitachi HD44780 controller ([Wikipedia](https://en.wikipedia.org/wiki/Hitachi_HD44780_LCD_controller)) and its clones (KS0066, ST7066U, SPLC780) from the late 1980s to now: 8 × 1 to 40 × 4, with 16 × 2, 20 × 2, 20 × 4 and 40 × 2 the commonest. Graphic modules: 122 × 32, 128 × 64 (KS0108 controller), 240 × 64 and 240 × 128 (Toshiba T6963C), 320 × 240 at 5.7 in (Epson SED1335); 640 × 480 DSTN at 9.4 to 10.4 in on 1990s laptops and some HMIs. HMIs of the late 1990s and 2000s used 5.7 in 320 × 240 blue-mode STN with resistive touch, for example Siemens's TP170 and TP177 ([TP177A listing](https://adjditec.com/en/products/6av6642-0aa11-0ax1-siemens); [TP170B listing](https://plc-direct.com/en-de/products/6av6-545-0bb15-2ax0)).

**Modes and colours.**

- _Yellow-green_ (positive): dark blue-black pixels on a yellow-green background; with a yellow-green LED backlight the classic 1990s module.
- _Grey_ (positive): dark blue on grey, no backlight or a white one.
- _Blue mode_ (negative): white or pale blue-white pixels on a deep blue background, needing a backlight (white LED, CCFL or EL); the classic HMI and later hobby look.
- _FSTN_ (film-compensated, positive): near-black on white or grey, from the mid-1990s; _FSTN negative_: white on black.
- Unlit pixels are faintly visible as a slightly different shade (the "grid" of character cells is visible), especially at an angle and with the contrast high.

**Viewing angles.** Narrow and asymmetric, like TN. A Winstar 16 × 2 datasheet gives about ±30° horizontally and 20° up, 40° down (CR ≥ 2) ([Winstar WH1602B, Farnell](https://www.farnell.com/datasheets/2723615.pdf); [Texim](https://www.texim-europe.com/getfile.ashx?id=142004)); better variants reach 40° in three directions at CR ≥ 10. Off-angle the contrast falls and the background and pixels converge; STN also shifts colour noticeably off-axis (yellow-green goes more yellow or more blue), and from the bad side the image inverts (light pixels on dark).

**The contrast knob.** Every HD44780 module has a contrast voltage (V0), set by a trimmer on the board or a knob or menu on the instrument. Too low and nothing shows; too high and every cell shows as a dark box, characters barely distinguished. STN contrast is strongly temperature dependent, so a module set up in a warm workshop looks faint in a cold plant room and shows grey boxes in a hot one; better modules have temperature compensation. A real, simulable control.

**States.**

- _Off:_ the background colour, no pixels (yellow-green or grey); a blue-mode module off is a dull blue-grey.
- _Powered but not initialised:_ the HD44780's famous look: the first line (or the first and third, on a 20 × 4) shows a row of solid dark boxes, the second line blank. This is what a module shows when its host has crashed or not started. Excellent for the game: it says "the electronics are alive but the software is not".
- _No data:_ a fixed banner, "----", or the last screen.
- _Standby:_ backlight off, text still shown (readable in room light on positive modes, nearly invisible on blue mode).

**Switch-off.** Backlight off at once (LED) or quickly (CCFL); the image fades over a few hundred milliseconds; at power-on, garbage or boxes for a moment until initialised.

**Refresh and update.** The HD44780 executes most instructions in 37 µs and a clear in 1.52 ms at its nominal 270 kHz clock ([Wikipedia, HD44780](https://en.wikipedia.org/wiki/Hitachi_HD44780_LCD_controller)), so rewriting all 32 characters of a 16 × 2 takes about 1.3 ms on the parallel bus; even over a slow I²C backpack (a PCF8574 at 100 kHz, four bus writes per character in 4-bit mode) a whole screen takes tens of milliseconds. The bus does not limit what you see. The liquid crystal does: STN switching (rise plus fall) is about 150 to 300 ms at room temperature, so a value changing faster than 3 to 5 times a second smears into an unreadable grey, scrolling text is a blur, and a cursor "submarines" (vanishes while moving). In the cold it gets far worse: response that is fine at 25 °C stretches to seconds below −20 °C, and modules may be fitted with heaters ([EP 1291842](https://data.epo.org/publication-server/rest/v1.0/publication-dates/20030312/patents/EP1291842NWA1/document.html); [Orient Display, LCD heater](https://www.orientdisplay.com/wp-content/uploads/2018/07/LCD-Heater.pdf)). Firmware typically rewrites the screen 2 to 10 times a second. The owner's 5 Hz for `lcd` is exactly right; a cold module should drop to 1 to 2 Hz and ghost.

**DSTN.** Dual-scan STN drives the top and bottom halves separately, doubling the duty: a visible seam across the middle, sometimes with a contrast difference; crosstalk shadows (faint streaks extending horizontally and vertically from dark areas); slow response (300 ms and more), so mouse pointers and moving bars smear badly.

**Sizes.** 16 × 2: module 80 × 36 mm, viewing area 66 × 16 mm, characters 2.95 × 5.55 mm on a 3.55 × 5.95 mm pitch ([Texim, WH1602B](https://www.texim-europe.com/getfile.ashx?id=142004)); 20 × 4: 98 × 60 mm, characters about 2.95 × 4.75 mm; 40 × 4: about 190 × 54 mm. 240 × 128 graphic: about 144 × 104 mm module, 0.5 mm dots. 320 × 240: 5.7 in diagonal, about 0.36 mm dots.

**Failures.** A missing row of characters or pixels, or a half of the display, from a failed heat-seal or ribbon (a 16 × 1 module is wired as 8 × 2, so its right half dropping out is a classic). Faint vertical or horizontal lines from a driver fault. Contrast drift with temperature and age. Polariser damage. A dead backlight, with the image still faintly readable in room light on a positive-mode module and nearly invisible on blue mode.

### Passive-matrix colour LCDs (CSTN)

**What and when.** Colour STN, mid-1990s to mid-2000s: 5.7 in 320 × 240 HMIs and handhelds with 8 to 4,096 colours, early colour mobile phones, some 10.4 in 640 × 480 panels.

**Look.** Washed-out, low-saturation colours, modest contrast (about 20 to 50:1), visible crosstalk and smearing, a slight overall tint; always backlit (usually CCFL).

**Viewing angles.** Narrow, about ±40 to 50° horizontally and less vertically, with colours shifting and inverting off-axis. Worse than TN TFT.

**Response.** Slow, 150 to 300 ms; moving content smears. 5 Hz.

**For the game.** A distinct and characterful look for a late-1990s colour HMI: muted palette, low contrast, narrow cone. Cheap to do as a palette and a profile.

### TN TFT colour LCDs

**What and when.** Active-matrix TN LCDs ([Wikipedia, TFT LCD](https://en.wikipedia.org/wiki/Thin-film-transistor_liquid-crystal_display)): from the early 1990s in laptops and industrial panels, dominant in HMIs and desktop monitors through the 2000s, and still in cheap panels. Industrial staples: Sharp's 10.4 in 640 × 480 (LQ10D, LQ104V1DG family) and 800 × 600 (LQ104S1), NEC's 10.4 and 12.1 in, 5.7 in 320 × 240 QVGA, 12.1 in 800 × 600 SVGA and 1024 × 768 XGA, 15 in 1024 × 768.

**Viewing angles.** Wide horizontally, narrow and asymmetric vertically. Sharp's LQ104V1DG11 gives 140° horizontal and 110° vertical ([Sharp LQ104V1DG11](https://www.phys.szote.u-szeged.hu/bbalazs/bb/lcd/lq104v1dg11.pdf)); its later siblings 70° left, 70° right, 50° up and 60° down at CR ≥ 10, with an optimum viewing direction of 6 o'clock ([SLW, LQ104V1DG21](https://slw-ele.com/lq104v1dg21.html)). 2000s desktop TN monitors quote 160° / 160° or 170° / 160°, but at CR ≥ 5 and with obvious colour and gamma shift well inside that. Off-angle behaviour:

- _Horizontally:_ contrast falls slowly, colours desaturate and pick up a slight yellow or blue cast; still readable at 60 to 70°.
- _From the good vertical side:_ the image washes out, going pale and grey towards the backlight's white.
- _From the bad vertical side:_ the image darkens, mid-greys invert (dark tones turn light and light turn dark), and colours shift sharply; beyond about 50 to 70° it is a dark, inverted negative ([Riverdi, TN TFT theory](https://riverdi.com/?p=100910); [SLW, grayscale inversion](https://www.slw-ele.com/deep-dive-grayscale-inversion-and-why-your-industrial-display-loses-color-accuracy.html)). On most desktop monitors the bad side is below (looking up at the screen); on 6 o'clock industrial modules it is above.
- Colour shifts first, then contrast, then (from the bad side) the image inverts; from the good side it washes out to the backlight colour.

**States.**

- _Off:_ a dark grey, slightly greenish or bluish matte or semi-gloss surface; reflections of the room.
- _Backlight on, no data:_ depends on how the panel is made. TN panels are normally white: an undriven pixel transmits, so a TN panel whose controller or cable has failed shows full white (the "white screen"). A monitor with no input shows black with a floating "No signal" box, then goes to standby after a few seconds.
- _Standby:_ backlight off, power lamp amber or blinking.
- _Power-on:_ backlight first (CCFL dim and warming; LED instant), then the image; some show a maker's logo.

**Switch-off.** The backlight goes (LED instantly, CCFL within tens of milliseconds); the image may leave a fading grey ghost for a second as the pixels' charge leaks, or flash white briefly on a TN panel with no discharge circuit.

**Response and refresh.** Panels refresh at 60 Hz. 1990s TN TFTs took 30 to 50 ms to switch (rise plus fall), so moving content smeared; 2000s panels 16 ms, then 8, then a few milliseconds grey-to-grey with overdrive. Most industrial panels are 6-bit with dithering (262,144 colours). 25 Hz is honest for content.

**Failures.** Dead (black) or stuck (bright, one colour) pixels; a vertical or horizontal line, or a band, from a failed column or row driver or its flex; the white screen from a lost controller; image retention of static screens (temporary); a dead backlight, with the image visible by torchlight; CCFL ageing (pink, dim, slow to start, see below); a pressure mark or cracked glass from a knock.

### IPS and VA panels

**What and when.** In-plane switching ([Wikipedia, IPS panel](https://en.wikipedia.org/wiki/IPS_panel)), from Hitachi in 1996, expensive until the late 2000s, and now usual in good HMIs, tablets and monitors; vertical alignment (VA), from Fujitsu in the late 1990s, common in monitors and TVs.

**Viewing angles.** Both quote 178° / 178° at CR ≥ 10: effectively unlimited. Off-angle:

- _IPS:_ colours hold; contrast falls slowly; dark areas glow (a pale, often violet or warm grey sheen on black, "IPS glow"), so a dark screen seen obliquely looks hazy. No inversion.
- _VA:_ deep blacks head-on; off-axis the gamma shifts (shadows lift, colours wash), with some colour shift. No inversion.

**States.** IPS and VA panels are normally black: an undriven panel is black, so a failed controller shows black with the backlight glowing through, not white. Off: deep grey-black. Otherwise as TN TFT.

**Response.** Early IPS 25 to 40 ms; modern panels a few milliseconds. VA panels are slow on dark transitions (black smearing behind moving objects).

**Failures.** As TN TFT, plus IPS's backlight bleed at the edges and corners (clouding), visible on a dark screen.

### Backlights: LED, EL and CCFL

**LED backlights.** For character and small graphic modules from the 1980s: an array of yellow-green LEDs behind the glass (bulky, warm, about 100 to 500 mA), later edge-lit light guides; amber and red also; white LEDs from the late 1990s. For TFTs, white LED edge lighting replaced CCFL from about 2008 on monitors and earlier on laptops and small modules. Instant on and off, no warm-up, colour stable; dimmed by PWM, which can flicker on camera; ageing slow (half brightness at 50,000 hours and more), with the phosphor of white LEDs slowly yellowing. Edge-lit panels show brighter patches near the LEDs and bleed at the edges.

**EL backlights.** A sheet of EL phosphor: thin and even, aqua blue-green (unfiltered) or filtered white; used on 1990s handhelds, watches and some HMIs and modules, especially blue-mode STN. Driven by an inverter at a few hundred hertz to a few kilohertz, which whines audibly (a good sound cue). Short life: half brightness after a few thousand hours, faster when driven hard; ageing makes them dim and uneven.

**CCFL.** Cold-cathode fluorescent lamps ([Wikipedia](https://en.wikipedia.org/wiki/Cold-cathode_fluorescent_lamp)) lit almost every colour STN, CSTN and TFT from the early 1990s to about 2010. White, slightly cool or slightly warm. Behaviour worth modelling:

- _Warm-up:_ a CCFL starts dim and a little pink or orange, and comes to full brightness over tens of seconds to a few minutes, much slower in the cold, because mercury vapour pressure is low until the lamp warms ([Pacific Display, understanding CCFLs](https://www.pacificdisplay.com/ics_app%20notes/ccfl-elp/understanding_ccfls.pdf)).
- _Ageing:_ rated life is typically 20,000 to 50,000 hours to half brightness ([Pacific Display](https://www.pacificdisplay.com/ics_app%20notes/ccfl-elp/understanding_ccfls.pdf); [US 7903198](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/7903198)). As it ages it dims and its colour moves towards red: once the mercury is used up, the argon and neon fill's pink discharge dominates ([lamptech, fluorescent lamp life](https://www.lamptech.co.uk/Documents/FL%20Life.htm); [TekWiki, TDS3000 repairs](https://w140.com/tekwiki/wiki/TDS3000/Repairs)). End of life: a pink, dim, reddish screen; flickering; then the lamp fails to strike, or the inverter strikes it, sees a fault and shuts down after a second, so the screen lights briefly and goes dark. The image is still there, readable by torchlight.
- _Inverter:_ a high-voltage inverter at 30 to 80 kHz, normally inaudible; failing ones squeal or buzz.

### E-paper

**What and when.** Electrophoretic displays ([Wikipedia, electronic paper](https://en.wikipedia.org/wiki/Electronic_paper)), E Ink above all: commercially from 2004 (Sony Librie), widespread on e-readers from 2007, electronic shelf labels and signage in the 2010s, and on modern instruments and building-services kit (room panels, meters, door signs) since. Panel sizes: 1.54 in 200 × 200, 2.13 in 250 × 122, 2.9 in 296 × 128, 4.2 in 400 × 300, 7.5 in 800 × 480, 13.3 in 1600 × 1200. Black and white with 2 to 16 greys; three-colour (black, white, red or yellow) for labels; full colour (Kaleido, Gallery) recently.

**Look.** Matte, paper-like, grey-white rather than white (about 40 % reflectance), black-grey ink; lit only by the room (some have a front light). Excellent in bright light, invisible in the dark.

**Viewing angles.** Nearly 180°, like paper. No fade, no shift; treat like `printed`.

**States.** Bistable: the image stays with no power at all, indefinitely. So off, standby and on can look identical; a powered-off e-paper display shows whatever it showed last, unless its software cleared it to white or drew a "sleeping" image on the way down. That makes a stale, wrong reading on a dead e-paper display a lovely realistic hazard, and well-designed devices show a timestamp or a "last updated" line for exactly this reason.

**Update.** A full refresh flashes the panel: black, white, inverted image, then the new image, over 0.3 to 5 s depending on panel and mode; a partial refresh changes only what changed, in about 0.3 to 0.4 s, without flashing, but leaves faint ghosts of the old image, so firmware does a full refresh every 5 to 10 partial updates or once an hour ([Waveshare 4.2 in panel](https://uk.robotshop.com/products/waveshare-400x300-42-e-ink-raw-display); [Waveshare e-paper guide](https://docs.waveshare.com/ESP32-Peripheral-Tutorials/Display/E-Paper); [Microchip, ePaper fundamentals](https://developerhelp.microchip.com/xwiki/bin/view/software-tools/mgs/dev-kits/epd-ug/fundamentals/)). Three-colour panels take 10 to 20 s. Below 0 °C the particles slow and most panels are not rated to work ([Waveshare guide](https://docs.waveshare.com/ESP32-Peripheral-Tutorials/Display/E-Paper)). Devices update rarely: once a minute to once a day. A maxHz of about 2 (a partial update) is generous.

**Failures.** Ghosting from too many partial updates; a frozen image when the controller fails; greys going uneven with age; cold slowness.

### OLED

**What and when.** Organic LEDs ([Wikipedia, OLED](https://en.wikipedia.org/wiki/OLED)). Passive-matrix monochrome modules from the 2000s, very common since about 2012 on small instruments and hobby kit: 0.96 in 128 × 64 (SSD1306) in white, blue, or the split yellow-top (16 rows) and blue-bottom; 1.3 in 128 × 64 (SH1106); 1.5 in 128 × 128; character OLEDs that are HD44780-compatible drop-ins (Winstar's 16 × 2 and 20 × 4). Active-matrix colour OLED on phones from about 2010, rarely on industrial kit; increasingly on premium appliances.

**Look.** True black, crisp, very high contrast; small modules are bright for their size but small. Up close, PMOLED pixels are distinct squares with dark gaps.

**Viewing angles.** About 160 to 180°, symmetric; emissive. AMOLED whites tint slightly (blue, green or pink) at angle; PMOLED monochrome barely changes.

**States.** Off: black (indistinguishable from on-and-blank, like a TN LCD's grey, so devices show something to prove life). Most firmware dims or blanks the display after a timeout to save its life ("press any key to wake").

**Switch-off.** Instant.

**Refresh.** Microsecond response; PMOLED modules refresh at about 100 Hz; the bus (I²C at 400 kHz takes about 25 ms for a full 128 × 64 frame; SPI much less) sets a ceiling of a few tens of frames a second, but firmware updates a few times a second. 10 Hz for content is honest for small modules; 30 for colour.

**Ageing.** Brightness halves after roughly 10,000 to 50,000 hours, depending on colour and drive (blue worst, green best), and much sooner at full brightness; differential ageing burns in static elements as darker ghosts within weeks to months on hard-driven hobby modules ([DisplayModule, PMOLED lifespan](https://www.displaymodule.com/blogs/knowledge/extending-pmoled-lifespan-screen-savers-current-control-storage); [Vishay OLED datasheet](https://wwwlegacy.vishay.com/docs/37971/oled064o032alpp3n00000.pdf); [Arduino forum, serious burn-in](https://forum.arduino.cc/t/oled-display-and-serious-burn-in/605031)). Worth simulating on a small OLED that shows the same screen all day.

### Touch: resistive and capacitive

**Resistive** ([Wikipedia](https://en.wikipedia.org/wiki/Resistive_touchscreen)): two conductive films separated by spacer dots; pressure brings them together. 4-wire, 5-wire and 8-wire. On industrial HMIs from the 1990s to the mid-2010s (Siemens TP170 and TP177 had analogue resistive touch). Visible: a slightly matte, hazy plastic film over the display (transmission typically 75 to 85 %, so a resistive screen looks a little dimmer and lower in contrast), sometimes Newton's rings, a film that dimples when pressed. Works with gloves, a stylus or a fingernail; one touch at a time; a firm press needed. Drifts out of calibration and needs recalibrating (the classic five-crosshair calibration screen) ([US 8619043](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/8619043)); a panel that has begun to delaminate drifts again however often it is recalibrated ([Eurotech support forum](https://support.eurotech-inc.com/forums/topic.asp%3FTOPIC_ID=674.html)); 5-wire panels last longer than 4-wire ([DisplayModule, resistive touch](https://www.displaymodule.com/blogs/knowledge/touch-screen-on-graphic-lcds-resistive-touch-rtp-calibration-durability)). Worn spots (where the same button is pressed for years) become dead or misplaced.

**Projected capacitive (PCAP):** a grid of electrodes behind glass sensing a finger's capacitance. On phones from 2007, on industrial HMIs from the 2010s. Visible: a glossy glass front with strong reflections (often optically bonded, so a deeper black); no film. Multi-touch, light touch; does not work with ordinary gloves (industrial versions can be tuned for thin gloves); water droplets or a wet cloth cause false touches or block touches, a real problem in a pool building, and industrial controllers add water rejection.

**For the game.** Touch is not a display kind. It is an overlay that changes the surface (matte film or glossy glass, its reflection and haze) and the input's behaviour (resistive drift and a calibration screen; PCAP refusing gloves and misbehaving when wet). The touch fault is gameplay, not rendering, and nearly free.

### Others worth knowing

- **Flip-disc boards** ([Wikipedia](https://en.wikipedia.org/wiki/Flip-disc_display)): electromagnetic discs, black one side and fluorescent yellow the other, on bus destination boards, station and stadium boards from the 1970s to the 2000s. Bistable like e-paper (keeps its image with no power), reflective (needs light), and audibly clatters as it updates, column by column, over a second or so. A strong candidate for a pool hall or reception board.
- **Split-flap displays** ([Wikipedia](https://en.wikipedia.org/wiki/Split-flap_display)): station departure boards; mechanical, bistable, a rattling update.
- **Incandescent seven-segment (Numitron):** filament segments in a small tube, warm white-yellow, 1970s; wide angle; a slight warm-up and fade (thermal, about 50 to 100 ms).
- **LED bar graphs and moving-coil meters with LED scales**: as LEDs.
- **Mechanical counters** on meters and totalisers: printed digits on drums; a `printed` kind that moves.

## Comparison tables

### Viewing and off-angle behaviour

Half-angles are to where the display stops being comfortable (about CR 10 for TFTs, CR 2 to 5 for passive LCDs); "up" is a viewer above the normal. Figures are typical, from the sections above.

| Technology               | Horizontal | Up        | Down                  | Off-angle, in order                                                             | Fades towards                                   |
| ------------------------ | ---------- | --------- | --------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------- |
| CRT (any)                | 85°        | 85°       | 85°                   | reflections, foreshortening, slight dimming                                     | dark face                                       |
| LED readout              | 60 to 75°  | 60 to 75° | 60 to 75°             | dims                                                                            | unlit face                                      |
| Giant LED board          | 70°        | 30 to 45° | 45 to 60°             | dims, some colour shift                                                         | dark face                                       |
| VFD                      | 60 to 70°  | 60°       | 60°                   | grid shades, dims                                                               | dark glass                                      |
| Nixie (side view)        | 45°        | 45°       | 45°                   | digits overlap, hidden                                                          | a muddle                                        |
| Plasma (mono, colour)    | 80°        | 80°       | 80°                   | dims at the edge                                                                | dark face                                       |
| EL (TFEL)                | 80°        | 80°       | 80°                   | dims at the edge                                                                | dark face                                       |
| TN segment LCD           | 35 to 40°  | 20 to 40° | 40°                   | contrast falls; inverts from bad side                                           | background                                      |
| STN character or graphic | 30 to 40°  | 20 to 35° | 40°                   | colour shifts, contrast falls, inverts from bad side                            | background                                      |
| CSTN                     | 40 to 50°  | 30°       | 40°                   | colour shifts, inverts                                                          | background, washed                              |
| TN TFT                   | 70°        | 45 to 50° | 60° (6 o'clock panel) | colour, then contrast; washes from good side, darkens and inverts from bad side | backlight (good side), dark negative (bad side) |
| IPS                      | 89°        | 89°       | 89°                   | dark areas glow                                                                 | slight pale haze                                |
| VA                       | 89°        | 89°       | 89°                   | gamma shift, washes a little                                                    | slight wash                                     |
| OLED                     | 85°        | 85°       | 85°                   | slight tint (AMOLED)                                                            | barely changes                                  |
| E-paper                  | 88°        | 88°       | 88°                   | none                                                                            | none (paper)                                    |
| Flip-disc                | 75°        | 75°       | 75°                   | discs foreshorten                                                               | the board's black                               |

### States and power transitions

| Technology     | Off                                                 | On, no signal or not ready                          | Standby                   | Power-on                                     | Switch-off                                         |
| -------------- | --------------------------------------------------- | --------------------------------------------------- | ------------------------- | -------------------------------------------- | -------------------------------------------------- |
| CRT            | grey to grey-green glass (mono), dark grey (colour) | snow, blue screen, "No signal" box, or faint raster | black, amber lamp         | 5 to 15 s warm-up; colour degauss wobble     | collapse to line and dot, or quick fade; afterglow |
| LED readout    | grey segments, or dark filter                       | dashes, "Err", blinking                             | a dot or dim              | lamp test "8.8.8.8."                         | instant                                            |
| Giant LED      | black with dots                                     | black, clock, default text                          | dim clock                 | test pattern                                 | instant                                            |
| VFD            | dark glass, wires faint                             | blank or banner                                     | dimmed                    | all segments briefly                         | instant                                            |
| Nixie          | grey wire cages                                     | zeros or blank                                      | blank                     | strike flicker, digit cycle                  | instant                                            |
| Plasma, mono   | dark brown glass                                    | blank                                               | blank                     | instant                                      | instant                                            |
| Plasma, colour | black glass                                         | "No signal"                                         | red lamp                  | logo, a few seconds                          | quick fade                                         |
| EL             | dark grey-green glass                               | blank                                               | blank                     | instant                                      | instant                                            |
| TN segment LCD | blank background, same as on and empty              | dashes, "Err"                                       | blank or a symbol         | segments appear over 0.1 to 0.2 s, lamp test | segments fade over 0.1 to 0.3 s                    |
| STN module     | background, no pixels                               | first-line black boxes (not initialised)            | backlight off, text dim   | garbage or boxes, then text                  | backlight off; text fades over 0.2 to 0.5 s        |
| TN TFT         | dark grey                                           | white (controller lost), "No signal" box (monitor)  | backlight off, amber lamp | backlight then image; CCFL warm-up           | backlight off; brief white or grey ghost           |
| IPS, VA        | deep grey-black                                     | black with backlight glow, "No signal"              | as TFT                    | as TFT                                       | as TFT                                             |
| OLED           | black                                               | black                                               | blanked after timeout     | instant                                      | instant                                            |
| E-paper        | last image                                          | last image, or "no data" drawn                      | last image                | full refresh flash                           | last image stays                                   |
| Flip-disc      | last image                                          | last image                                          | last image                | a full clear, clattering                     | last image stays                                   |

## Typical sizes and resolutions by era

So that future machines keep to real sizes. Sizes are diagonals unless given as module sizes.

| Era   | Character and segment                                                                                                                                                                            | Small graphic                                                                                                                           | Industrial panel and HMI                                                                                                                                                            | Monitor and screen                                                                                                                                            |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1980s | LED digits 0.3 to 1 in, 4 to 8 digits; TN segment glasses; HD44780 modules from about 1987: 16 × 1, 16 × 2, 20 × 2, 40 × 2; VFD 1 × 20, 2 × 20; gas-plasma digits and Self-Scan character panels | EL 640 × 200 and 512 × 256; orange plasma 640 × 400 (about 10 in)                                                                       | Hard-wired panels with LED and VFD readouts; monochrome terminals                                                                                                                   | 9 and 12 in mono CRT (green P1 or P39, amber P3 or P134), 80 × 24 or 80 × 25 text; 14 in colour CGA and EGA 640 × 200 and 640 × 350; 9 to 14 in CCTV monitors |
| 1990s | 16 × 2, 20 × 4, 40 × 4 STN, yellow-green LED backlight; VFD 2 × 20, 2 × 40, 4 × 20 modules                                                                                                       | 128 × 64, 240 × 64, 240 × 128 STN; 320 × 240 at 5.7 in, blue mode or FSTN; EL 320 × 240 and 640 × 480; DSTN 640 × 480 at 9.4 to 10.4 in | 4 × 20 and 8 × 40 keypad operator panels; 5.7 in 320 × 240 STN and CSTN touch panels; 10.4 in 640 × 480 TN TFT (Sharp LQ10D)                                                        | 14, 15 and 17 in colour CRT, 640 × 480 to 1280 × 1024; 19 and 21 in for SCADA                                                                                 |
| 2000s | Same, white LED backlights, FSTN; character OLED late                                                                                                                                            | 128 × 64 and 240 × 128 FSTN with white LED; first PMOLED                                                                                | 5.7 in 320 × 240 STN and TFT (Siemens TP177); 7 in 800 × 480; 10.4 in 640 × 480 and 800 × 600; 12.1 in 800 × 600 and 1024 × 768; 15 in 1024 × 768; CCFL backlights, resistive touch | 15 in 1024 × 768 and 17 and 19 in 1280 × 1024 TN LCDs; 42 in colour plasma and 32 to 40 in LCD information screens                                            |
| 2010s | 16 × 2 and 20 × 4 still, often with I²C backpacks; OLED 0.96 in 128 × 64                                                                                                                         | 128 × 64 OLED; 1.8 to 3.5 in 160 × 128 to 480 × 320 TFT modules; e-paper 1.54 to 7.5 in                                                 | 4.3 in 480 × 272, 7 in 800 × 480, 9 in 800 × 480, 12 in 1280 × 800 widescreen TFT HMIs (Siemens KTP Basic, Comfort); LED backlights; PCAP on the better ones                        | 22 and 24 in 1920 × 1080; 46 to 55 in LCD signage                                                                                                             |
| 2020s | As 2010s; character OLED, e-paper labels                                                                                                                                                         | E-paper and small IPS and OLED on appliances and room controllers                                                                       | 7, 10.1, 12.1, 15.6 and 21.5 in IPS PCAP HMIs at 1024 × 600 to 1920 × 1080                                                                                                          | 24 to 32 in 1920 × 1080 to 3840 × 2160; fine-pitch LED walls                                                                                                  |

## Recommendations for the game

### Kinds

Kinds should differ where the optics, states or update rate differ; variants within a kind (a phosphor, a mode, a backlight colour) are options on the kind, not new kinds. Proposed set:

| Kind        | Covers                                                                   | Change from today                                                                                                                                                                                    |
| ----------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `crt`       | raster CRTs, mono and colour; vector and storage as a scan mode          | add `phosphor` (`p1`, `p3`, `p4`, `p31`, `p39`, `colour`) and `scan` (`raster`, `vector`, `storage`) options                                                                                         |
| `led`       | seven-segment, dot-matrix and bar-graph LEDs                             | add `filter` (none, red, smoked)                                                                                                                                                                     |
| `giant-led` | LED boards                                                               | keep; asymmetric cone                                                                                                                                                                                |
| `vfd`       | VFD digits, character and graphic modules                                | keep                                                                                                                                                                                                 |
| `nixie`     | Nixie tubes                                                              | keep; narrower cone                                                                                                                                                                                  |
| `plasma`    | orange gas plasma; colour PDP                                            | add `variant` (`orange`, `colour`)                                                                                                                                                                   |
| `el`        | TFEL panels                                                              | new                                                                                                                                                                                                  |
| `lcd`       | passive monochrome: TN segment, STN and FSTN character and graphic, DSTN | keep (being reworked); add `mode` (`reflective`, `yellow-green`, `grey`, `blue`, `fstn`, `fstn-negative`) and `backlight` (none, `led-yellow-green`, `led-white`, `led-amber`, `el`, `ccfl`) options |
| `cstn`      | passive colour                                                           | new (or an `lcd` mode, if the shader can carry its palette)                                                                                                                                          |
| `tft`       | TN active matrix                                                         | new, replacing most of `touch` for 1990s and 2000s panels                                                                                                                                            |
| `ips`       | IPS, VA, anything modern and wide-angle                                  | new, replacing the rest of `touch`                                                                                                                                                                   |
| `oled`      | PMOLED and AMOLED                                                        | new                                                                                                                                                                                                  |
| `epaper`    | electrophoretic                                                          | new                                                                                                                                                                                                  |
| `flip-disc` | flip-disc boards                                                         | new, only if the owner wants one                                                                                                                                                                     |
| `printed`   | not a screen                                                             | keep                                                                                                                                                                                                 |
| `lcars`     | the bridge's screens                                                     | keep; fiction, as is                                                                                                                                                                                 |
| `ui`        | the game's own panels                                                    | keep                                                                                                                                                                                                 |
| `touch`     |                                                                          | retire: a panel kind plus a `touch` overlay option (`resistive`, `pcap`)                                                                                                                             |

### A profile for each kind

The profile would grow from one cone to an elliptical one with asymmetric vertical halves, plus a fade target and floor, the state looks, the transition, and a glyph height for legibility. In outline (names illustrative):

```ts
interface DisplayOptics {
  /** Half-angles, degrees off the normal, to the edge of comfortable reading. */
  horizontal: number;
  up: number; // viewer above the normal
  down: number; // viewer below
  /** Degrees past the edge over which it fades to its floor. */
  falloff: number;
  /** What it fades towards: its background or backlight, its unlit face, a dark inverted negative, its average. */
  towards: 'background' | 'dark' | 'invert' | 'mean';
  /** Which vertical side inverts, if any (TN, STN). */
  inverts?: 'up' | 'down';
  /** The least it fades to at worst (0 flat, 1 never fades). */
  floor: number;
}
```

`sighting` would resolve the eye's direction into the face's own axes, a horizontal angle `atan2(x, z)` and a vertical one `atan2(y, z)`, and combine them as an ellipse (`r = √((h/H)² + (v/V)²)`, with V the up or down half-angle by the sign of y); the level falls from 1 at r = 1 to `floor` at the falloff, still in four steps. That is a few more arithmetic operations per watched mesh at five checks a second, which costs nothing.

| Kind        | H / up / down                         | Falloff | Fades towards (floor)                                                             | Off                                                  | No signal or not ready                              | Standby                   | Power transition                                                                                          | maxHz                                                | Reach             | Typical sizes                                                                         |
| ----------- | ------------------------------------- | ------- | --------------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------- |
| `crt`       | 80 / 80 / 80                          | 8°      | dark (0)                                                                          | faceplate grey, grey-green or dark grey, by phosphor | snow, blue screen, "No signal" box, or faint raster | black, amber lamp         | on: 5 to 10 s fade-up (colour: 1 s degauss wobble); off: line, dot, afterglow, or quick fade              | 25 (vector 25, storage 10 plus erase flash)          | 8 m               | 9 to 21 in; 640 × 480 to 1280 × 1024                                                  |
| `led`       | 70 / 70 / 70                          | 15°     | dark (0.2)                                                                        | grey segments, or filter colour                      | dashes, "Err"                                       | dot                       | on: 1 s lamp test; off: instant                                                                           | 10 (meters show a new reading 2 to 3 times a second) | from glyph height | digits 7.6 to 100 mm                                                                  |
| `giant-led` | 70 / 35 / 55                          | 15°     | dark (0.2)                                                                        | black with dots                                      | clock or blank                                      | dim                       | on: test pattern; off: instant                                                                            | 10                                                   | 30 m              | pitch 4 to 20 mm; text 50 to 150 mm                                                   |
| `vfd`       | 65 / 60 / 60                          | 15°     | dark (0.2)                                                                        | dark glass, faint wires                              | blank                                               | dimmed (25 %)             | on: all segments 1 s; off: instant                                                                        | 10                                                   | from glyph height | 2 × 20, 4 × 20, 256 × 64                                                              |
| `nixie`     | 45 / 45 / 45                          | 10°     | mean (0)                                                                          | grey cages                                           | zeros                                               | blank                     | on: strike flicker and digit cycle; off: instant                                                          | 5                                                    | from glyph height | IN-12 18 mm to IN-18 40 mm                                                            |
| `plasma`    | 80 / 80 / 80                          | 8°      | dark (0)                                                                          | brown-black (orange), black (colour)                 | blank, or "No signal" (colour)                      | blank, red lamp           | orange: instant; colour: logo, a few seconds                                                              | 10 (orange), 25 (colour)                             | 8 m               | 640 × 400 at 10 in; 42 in colour                                                      |
| `el`        | 80 / 80 / 80                          | 8°      | dark (0)                                                                          | dark grey-green glass                                | blank                                               | blank                     | instant                                                                                                   | 25                                                   | 8 m               | 320 × 240 at 5.7 in, 640 × 480 at 9.1 in                                              |
| `lcd`       | 35 / 25 / 40 (6 o'clock; flip for 12) | 15°     | background (0); inverts on the bad side                                           | background, no pixels (reflective: same as blank)    | STN: first-line boxes; segment: dashes              | backlight off             | on: segments appear over 0.15 s; off: backlight at once, image fades over 0.2 to 0.5 s (slower when cold) | 5 (1 to 2 when cold)                                 | from glyph height | 16 × 2, 20 × 4, 128 × 64, 240 × 128, 320 × 240 at 5.7 in                              |
| `cstn`      | 45 / 30 / 40                          | 15°     | background (0); inverts                                                           | dark grey                                            | white or black                                      | backlight off             | CCFL warm-up                                                                                              | 5                                                    | 8 m               | 320 × 240 at 5.7 in                                                                   |
| `tft`       | 70 / 50 / 60 (6 o'clock)              | 20°     | background (0.1) on the good side and sides; invert then dark (0) on the bad side | dark grey                                            | white (lost controller), "No signal" box (monitor)  | backlight off, amber lamp | on: backlight (CCFL warm-up or LED at once) then image; off: backlight at once, brief grey ghost          | 25                                                   | 8 m               | 5.7 in 320 × 240, 10.4 in 640 × 480 or 800 × 600, 12.1 in 800 × 600, 15 in 1024 × 768 |
| `ips`       | 85 / 85 / 85                          | 5°      | background (0.7: a pale haze on dark content)                                     | deep grey-black                                      | black with backlight glow, "No signal"              | backlight off             | LED: instant                                                                                              | 30                                                   | 8 m               | 7 in 800 × 480 to 21.5 in 1920 × 1080                                                 |
| `oled`      | 85 / 85 / 85                          | 5°      | dark (0.8)                                                                        | black                                                | black                                               | blanked after timeout     | instant                                                                                                   | 10 (small mono), 30 (colour)                         | from glyph height | 0.96 in 128 × 64 to 1.5 in 128 × 128; 16 × 2 character                                |
| `epaper`    | 88 / 88 / 88                          | 2°      | none (1)                                                                          | last image                                           | last image or a drawn "no data"                     | last image                | update: partial 0.3 s, full flash 1 to 3 s; power loss: image stays                                       | 2                                                    | from glyph height | 1.54 in 200 × 200 to 7.5 in 800 × 480                                                 |
| `flip-disc` | 75 / 75 / 75                          | 10°     | mean (0)                                                                          | last image                                           | last image                                          | last image                | update: column by column over about 1 s, with clatter                                                     | 1                                                    | 30 m              | 7 × 28 to 16 × 112 discs                                                              |
| `printed`   | 90 / 90 / 90                          | 2°      | mean                                                                              | n/a                                                  | n/a                                                 | n/a                       | n/a                                                                                                       | ∞                                                    | 8 m               | n/a                                                                                   |

Notes on the table:

- **Reach "from glyph height":** for kinds whose legibility is set by their characters, give the display its glyph height (in metres on its face) and flatten it once its glyphs would cover fewer than `SIGN_MIN_PIXELS`, by the same `smallestReadable` the signs use, instead of by a 1° subtended angle. The 8 m reach stays as an outer limit for the budget.
- **Reflective kinds** (`lcd` in reflective or positive modes, `epaper`, `flip-disc`, `printed`) should be lit by the room, not emissive: they read in daylight and vanish in the dark. Backlit and emissive kinds add their light. A backlit LCD is both: its background reflects the room, and its backlight adds. When the backlight fails, the image should still be just readable by a torch.
- **Tinted floors:** `towards: 'background'` should use the kind's background or backlight colour (yellow-green, blue, white, the CCFL's current tint), not the canvas's average, so a TN LCD fades to its grey and a blue-mode STN to its blue.
- **No-signal looks** are drawn once when the state changes, so they cost one upload each.

### Implementation

**Cheap: worth doing, within the redraw budget.**

- _Asymmetric cones and fade targets._ Logic in `display-reach.ts` (the ellipse, the target, the floor) and a few lines in `sighting`. The fade stays four steps, each one upload as now, but `compose` fills with the target colour (background, unlit face, or an inverted copy drawn with the canvas's `difference` composite) instead of the average. Inversion is the only one that draws more than a fill, and only on the bad side, a few times while passing through the fade. If the other session's per-fragment wash for `lcd` lands, `tft` and `cstn` should use the same shader with their own parameters (a hue shift and a bad-side inversion term), and `ips` a mild haze term; that is better than the canvas compose, since it varies across the face for free.
- _A shared display power state._ A small pure-logic module (say `core/logic/display-power.ts`): `off`, `starting`, `no-signal`, `standby`, `on`, `failing`, with each kind's look for each. The component still draws what it shows; the state's looks are drawn once per change (in keeping with "redraw only when what it shows changes"). Components with an `on` flag already (`createNixieScreen`, `createScopeScreen`) are the first to move.
- _Power transitions without redraws._ Draw the picture on a mesh just in front of a static plane showing the off look (the glass). A CRT's switch-off is then the picture mesh's `scale.y` going to about 0.01 in 50 ms with its colour brightened, `scale.x` to about 0.01 in the next 100 ms, then the dot's colour fading over about a second; the afterglow is the material's colour multiplier decaying. A CRT's power-on is the multiplier rising over 5 to 10 s. An LCD's fade is a colour lerp towards its background; a CCFL's warm-up is a backlight tint (pink to white) and intensity rising over 30 s to a minute. None of this touches the canvas or uploads a texture: it is a transform and a material uniform. A degauss wobble is a small UV offset (`texture.offset`, a uniform, not an upload) jittering for a second.
- _Palettes._ Phosphor colours (P1 about #33ff66 on #0c1a10; P3 about #ffb000; P4 a slightly blue white; P39 a yellower green), VFD #2fffd0 or so on near-black, LED reds (#ff2010 classic, #ff4020 high-efficiency), greens (#80ff20 yellow-green, #00ff60 true green), blues (#3060ff, 1995 on), yellow-green STN (#b8c860 background, #203040 pixels), blue mode (#2030c0 background, #e0f0ff pixels), FSTN (#d0d4d0 and #101418), EL amber (#ffb020), orange plasma (#ff6a10), e-paper (#c8c8c0 and #202020). Exact values are a matter for the owner's eye; the point is one table per kind and mode, not ad hoc colours in each component.
- _The touch overlay._ A matte, faintly hazy plane (resistive) or a glossy one (PCAP) over the panel; resistive drift as an offset in the hit-test, recalibrated by a calibration screen; PCAP false touches when the panel is wet (the world could carry a wetness for it). Logic and one material: free.
- _Cheap failures._ Dead segments and pixels, a missing row or half, a dead module, a stuck segment: masks the component applies when it draws, so they cost nothing per frame. A lost zebra or ribbon contact that comes back when the bezel is pressed: a state and an interaction. A dead backlight (multiplier to zero, image left lit by the room). A TN panel gone white. STN contrast as a value with a knob and a temperature drift, applied in the palette. An LCD blacking out above its clearing point (near the boiler flue, in sun through a window). An e-paper's stale image. CCFL ageing as a tint and a dimmer multiplier from the world's hours. Cathode poisoning on a Nixie's rarely used digits.

**Moderate: worth it for a few showpieces.**

- _Burn-in._ An extra, static texture per affected screen (the ghost of its usual layout, at a few per cent), drawn once from the component's own static layout and added in the material: a CRT mimic in the old control room, a VFD's always-lit legend, an EL panel's darker ghost, a small OLED. One more texture and a material term; no per-frame drawing.
- _STN cold ghosting._ When a module is cold, blend each new picture over the last (keep the previous canvas, draw it at 60 to 80 %, draw the new at the rest) at the module's reduced maxHz. One extra draw per redraw, only when cold.
- _E-paper's full refresh flash._ A short sequence of three or four whole-panel fills before the new image; at its 1 to 2 Hz it is within the 10 Hz animation rule, and it happens rarely.
- _Flip-disc's column-by-column update._ Redraw a few columns per step over a second; at 10 Hz, 10 uploads per update, and boards update rarely.
- _CRT purity blotches and convergence._ A static coloured overlay (blotches) and a two-pixel offset of the red and blue channels near the corners, in a shader; worth it for one colour monitor that needs degaussing.

**Not worth it.**

- Multiplex, PWM and refresh flicker: the game's frame rate cannot show it honestly, and it would only look like a bug.
- Scan lines, shadow masks, sub-pixels and moiré drawn per pixel: costly, mostly invisible at game distances; a scan-line texture at most, in close-ups.
- Real phosphor persistence on raster CRTs (trails behind moving content): content barely moves; the scope's persistence tail is already the right place for it.
- Physical models of contrast versus ambient light: the lit-versus-emissive choice gets most of it.
- Geometry drift, focus and grey-to-grey response curves.

### Priorities

1. **Asymmetric cones and per-kind fade targets and floors** (logic in `display-reach.ts`, a few lines in `sighting`, and `compose`'s fill). It touches every display and is cheap. Tests beside it, as the module has now.
2. **The shared display power state and each kind's off, no-signal and standby looks**, starting with the components that already take an `on` flag. It makes power loss, a crashed controller and a quiet plant visibly different.
3. **Power transitions by scale and material colour**: the CRT collapse and afterglow, the LCD's fade, the CCFL's warm-up. No uploads.
4. **Retire `touch`**: audit its 40-odd uses and give each its panel kind (`tft` for 1990s and 2000s HMIs, `ips` for modern ones, `lcd` with `mode: 'blue'` for a 5.7 in STN), plus the touch overlay with resistive drift and PCAP wetness.
5. **Lit reflective displays and separate backlights**: reflective LCDs, e-paper and flip-disc lit by the room; a backlight term that can fail, age (CCFL tint) and warm up.
6. **The cheap failures**: dead segments and pixels, the pressable zebra contact, the dead or pink backlight, the TN white screen, STN contrast and its knob, heat blackout, e-paper's stale image, Nixie cathode poisoning.
7. **Glyph-height reach**: flatten displays by their characters' pixel size, as signs are, keeping 8 m as the budget limit.
8. **New kinds as their components arrive** (`el`, `oled`, `epaper`, `cstn`, and `flip-disc` if wanted), each tried on dev0's boards first and run through the component bench.
9. **Burn-in overlays, STN cold ghosting, the e-paper flash, CRT purity and degauss**, for a few showpieces.

### For the owner

Questions this raises, to be asked one at a time:

- Do power transitions that change only a mesh's scale and a material's colour (no canvas redraw, no upload) count as a display animating on its own under the 10 Hz rule? A CRT's collapse lasts about 150 ms and would be lost at 10 Hz; at the frame rate it costs nothing measurable.
- Should `tft` default to a 6 o'clock panel (bad side above, as industrial modules are) or a 12 o'clock one (bad side below, as desktop monitors look), or should each machine say, by how it is mounted?
- Is a flip-disc board wanted, for a pool hall or reception?

## Sources

All linked inline. The main ones:

- Wikipedia: [cathode-ray tube](https://en.wikipedia.org/wiki/Cathode-ray_tube), [phosphor](https://en.wikipedia.org/wiki/Phosphor), [vector monitor](https://en.wikipedia.org/wiki/Vector_monitor), [storage tube](https://en.wikipedia.org/wiki/Storage_tube), [Tektronix 4010](https://en.wikipedia.org/wiki/Tektronix_4010), [degaussing](https://en.wikipedia.org/wiki/Degaussing), [screen burn-in](https://en.wikipedia.org/wiki/Screen_burn-in), [VESA DPMS](https://en.wikipedia.org/wiki/VESA_Display_Power_Management_Signaling), [seven-segment display](https://en.wikipedia.org/wiki/Seven-segment_display), [dot-matrix display](https://en.wikipedia.org/wiki/Dot-matrix_display), [multiplexed display](https://en.wikipedia.org/wiki/Multiplexed_display), [light-emitting diode](https://en.wikipedia.org/wiki/Light-emitting_diode), [vacuum fluorescent display](https://en.wikipedia.org/wiki/Vacuum_fluorescent_display), [Nixie tube](https://en.wikipedia.org/wiki/Nixie_tube), [plasma display](https://en.wikipedia.org/wiki/Plasma_display), [Toshiba T3100](https://en.wikipedia.org/wiki/Toshiba_T3100), [electroluminescent display](https://en.wikipedia.org/wiki/Electroluminescent_display), [liquid-crystal display](https://en.wikipedia.org/wiki/Liquid-crystal_display), [twisted nematic field effect](https://en.wikipedia.org/wiki/Twisted_nematic_field_effect), [super-twisted nematic display](https://en.wikipedia.org/wiki/Super-twisted_nematic_display), [Hitachi HD44780](https://en.wikipedia.org/wiki/Hitachi_HD44780_LCD_controller), [TFT LCD](https://en.wikipedia.org/wiki/Thin-film-transistor_liquid-crystal_display), [IPS panel](https://en.wikipedia.org/wiki/IPS_panel), [cold-cathode fluorescent lamp](https://en.wikipedia.org/wiki/Cold-cathode_fluorescent_lamp), [electronic paper](https://en.wikipedia.org/wiki/Electronic_paper), [OLED](https://en.wikipedia.org/wiki/OLED), [resistive touchscreen](https://en.wikipedia.org/wiki/Resistive_touchscreen), [flip-disc display](https://en.wikipedia.org/wiki/Flip-disc_display), [split-flap display](https://en.wikipedia.org/wiki/Split-flap_display).
- Datasheets and makers' notes: [Winstar WH1602B (Texim)](https://www.texim-europe.com/getfile.ashx?id=142004), [Winstar WH1602B (Farnell)](https://www.farnell.com/datasheets/2723615.pdf), [ICL7107](https://www.komponenten.es.aau.dk/fileadmin/komponenten/Data_Sheet/ADC_DAC/ICL7107.pdf), [Futaba VFD modules](https://www.mouser.com/catalog/specsheets/Futaba-06-11-2019-Futaba%20VFD%20Modules.pdf), [Futaba GP9002A](https://cdn-shop.adafruit.com/datasheets/GP9002A%20Appnote.pdf), [Planar EL320.240.36](https://www.slw-ele.com/datasheets/EL320.240.36.pdf), [Sharp LQ104V1DG11](https://www.phys.szote.u-szeged.hu/bbalazs/bb/lcd/lq104v1dg11.pdf), [SLW, LQ104V1DG21](https://slw-ele.com/lq104v1dg21.html), [Pacific Display, understanding CCFLs](https://www.pacificdisplay.com/ics_app%20notes/ccfl-elp/understanding_ccfls.pdf), [Vishay OLED](https://wwwlegacy.vishay.com/docs/37971/oled064o032alpp3n00000.pdf), [Burroughs displays catalogue, 1970](https://bitsavers.mirrorservice.org/components/burroughs/1061K_Displays_Catalog_197012.pdf), [Waveshare e-paper guide](https://docs.waveshare.com/ESP32-Peripheral-Tutorials/Display/E-Paper), [Microchip, ePaper fundamentals](https://developerhelp.microchip.com/xwiki/bin/view/software-tools/mgs/dev-kits/epd-ug/fundamentals/), [Orient Display, LCD heater](https://www.orientdisplay.com/wp-content/uploads/2018/07/LCD-Heater.pdf).
- Industry explainers: [Topway, LCD viewing angle](https://www.topwaydisplay.com/blog/lcd-viewing-angle), [SLW, grayscale inversion](https://www.slw-ele.com/deep-dive-grayscale-inversion-and-why-your-industrial-display-loses-color-accuracy.html), [Riverdi, TN TFT theory](https://riverdi.com/?p=100910), [EDN, LCD works from −20 to 80 °C](https://edn.com/lcd-works-from-20-degrees-to-80-degreesc/), [Daktronics, LED viewing distance](https://www.daktronics.com/en-us/support/kb/000030569), [sixteen-nine, LED viewing-distance rules](https://www.sixteen-nine.net/?p=15497), [DisplayModule, PMOLED lifespan](https://www.displaymodule.com/blogs/knowledge/extending-pmoled-lifespan-screen-savers-current-control-storage), [DisplayModule, resistive touch](https://www.displaymodule.com/blogs/knowledge/touch-screen-on-graphic-lcds-resistive-touch-rtp-calibration-durability), [Dalibor Farny, Nixie tube health](https://docs.daliborfarny.com/zen-nixie-clock/1/en/topic/nixie-tube-health), [lamptech, fluorescent lamp life](https://www.lamptech.co.uk/Documents/FL%20Life.htm).
- Patents: [US 5677730, CRT spot elimination](https://patents.google.com/patent/US5677730), [US 4340910, CRT spot suppression](https://patents.google.com/patent/US4340910), [EP 1291842, LCD at low temperature](https://data.epo.org/publication-server/rest/v1.0/publication-dates/20030312/patents/EP1291842NWA1/document.html), [US 7903198, LED backlight (CCFL half-life)](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/7903198), [US 8619043, touch-screen calibration](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/8619043).
- Phosphor tables: [CRT phosphor research compilation](https://bunkerofdoom.com/tubes/crt/old%20and%20support/crt_phosphor_research_20091220.pdf), [Helsinki lecture notes](https://www.cs.helsinki.fi/group/goa/hardware/output/lect2a1.html).
- HMI listings (resellers; check against Siemens documentation before relying on them): [TP177A](https://adjditec.com/en/products/6av6642-0aa11-0ax1-siemens), [TP170B](https://plc-direct.com/en-de/products/6av6-545-0bb15-2ax0).
