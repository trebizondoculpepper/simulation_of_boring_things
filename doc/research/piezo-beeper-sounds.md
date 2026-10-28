# Piezo beeper sounds

Research note, 2026-10-28. The owner: "Can you model and synthesize basically beep noises as if coming out of a piezoelectric speaker? Beeps of, let's say, three different pitches. Some beeps will indicate entry, some errors, and also with different amounts of [reverb]. … the idea is to get that sound that you get from a particularly poor quality speaker, which means that you're not listening to a clean signal." The question: what makes a cheap piezo beeper sound as it does, how to synthesise that from scratch, and how to make a library of beeps selectable by pitch, meaning and reverb for the game's keypads, terminals, card readers and alarms. The mission that builds it is [100](../prompts/100-piezo-beeper-library.md).

Every sound here is synthesised from scratch. No recording, sample or copyrighted sound is used or referred to; in particular nothing in `resources/sound/effects/science_fiction_bleeps/` is used, analysed or imitated.

## Contents

- [How a piezo beeper sounds, and why](#how-a-piezo-beeper-sounds-and-why)
- [What real equipment does with it](#what-real-equipment-does-with-it)
- [How to synthesise it](#how-to-synthesise-it)
- [Reverb, rendered in](#reverb-rendered-in)
- [Loudness](#loudness)
- [The game's sound system now](#the-games-sound-system-now)
- [Pre-render or synthesise at run time](#pre-render-or-synthesise-at-run-time)
- [The prototype](#the-prototype)
- [Sources](#sources)

## How a piezo beeper sounds, and why

**Transducers.** Two kinds are sold as buzzers. A _piezo_ sounder is a bender: a thin disc of piezoelectric ceramic bonded to a brass or stainless steel plate; a voltage across the ceramic makes it expand or shrink radially, bending the plate one way or the other, and an alternating voltage flexes it back and forth ([PZT application manual](https://www.framboise314.fr/wp-content/uploads/2018/02/PZT_Application_note.pdf)). Electrically it is a capacitor, driven by voltage, with high sound pressure for very little current. A _magnetic_ (electromagnetic) buzzer is a coil and a steel diaphragm over a magnet, driven by current like a tiny loudspeaker; it is louder at low voltage but its output falls quickly as the drive falls, where a piezo's tracks its drive voltage fairly linearly ([Same Sky, buzzer basics](https://th.element14.com/site/binaries/content/assets/common/storefront-pdfs/same-sky/buzzer-basics-tecnologies-tones-and-drive-circuits.pdf); [EEVblog, piezo vs magnetic](https://www.eevblog.com/forum/beginners/piezo-buzzers-vs-magnetic-buzzers/)). Both are driven with square waves. The two sound alike to most ears; the magnetic one is a little lower and buzzier, the piezo shriller.

**Self-drive and external drive.** An _externally driven_ sounder (a "transducer") has two electrodes and is driven by the equipment's own oscillator, a microcontroller's pin or timer: it can be played at any frequency, which is how keypads give different pitches and warbles, though it is loudest only at its resonance. A _self-drive_ sounder (an "indicator") has a third, feedback electrode, and a built-in or nearby transistor oscillator locks to the element's own resonance: apply DC and it gives one loud tone, its own, and nothing else ([PZT application manual](https://www.framboise314.fr/wp-content/uploads/2018/02/PZT_Application_note.pdf); [US 11361644, duty cycle tuning in a self-resonant piezo buzzer](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11361644)). A self-drive buzzer, switched on and off, is the cheapest beeper there is: one pitch, any cadence. It takes a few milliseconds to pull in to its pitch as its oscillator starts.

**The strong resonance.** The plate's first bending mode is the sounder's resonance, typically 2 to 4.5 kHz for the 12 to 35 mm elements in equipment; datasheets rate SPL at that one frequency (for example 3670 Hz, 80 dB at 10 cm, 9 V peak-to-peak square wave, for an external-drive part; [DAU, LF-PE30P25A](https://dau-components.co.uk/product-catalogue/components/sounders-and-buzzers/buzzer/lf-pe30p25a-15a-piezoelectric-buzzer-for-external-drive/)) and "any other frequency will produce a lower SPL" ([PZT application manual](https://www.framboise314.fr/wp-content/uploads/2018/02/PZT_Application_note.pdf)). How the disc is held shapes the peak: held at its nodal circle it is loudest but narrow; held at its edge, wider and quieter ([PUI Audio, Helmholtz chamber design](https://puiaudio.com/wp-content/uploads/2022/08/DesignOfAHelmholtzChamber.pdf); [DB Unlimited, bender cavity](https://www.mouser.com/pdfDocs/db_unlimited_bender_cavity_article_121514.pdf)). Higher plate modes sit several kilohertz above, giving the shrill edge.

**Square-wave drive and its harmonics.** The drive is a logic-level square wave (or a push-pull pair of them, doubling the voltage swing). A symmetric square wave has only odd harmonics, each at 1/n of the fundamental's amplitude; a duty a little off 50 % adds weak even harmonics. The application manual: a square wave gives more sound than a sine (its fast edges), and "pulse and square waves will cause an increase in harmonic levels"; a capacitor across the element reduces them ([PZT application manual](https://www.framboise314.fr/wp-content/uploads/2018/02/PZT_Application_note.pdf)). So the sound is a square wave's harmonic series filtered by a few sharp resonances. Driven at its resonance, the fundamental dominates and the tone is fairly pure and very penetrating. Driven well below, a harmonic may land on the resonance instead: at a third of the resonance the third harmonic is louder than the fundamental, and the tone turns nasal and buzzy. That is why one keypad's "low" beep sounds so different from its "high" one, and it is the main thing a convincing model must get right.

**Poor frequency response.** There is no bass at all: below about 1 kHz a small disc moves almost no air. Above the resonance the response is ragged, a few peaks and dips from the plate's higher modes and the housing. Overall: a steep rise to one or two peaks between 2 and 4 kHz, a ragged shelf to about 10 kHz, little beyond.

**Attack and ring-down.** A resonance of quality Q at frequency f rings with a time constant of about Q/(πf): for Q 10 at 3.9 kHz, under a millisecond; the housing's softer cavity resonance a little longer. So a beep starts with a click (the drive's first edge exciting every mode at once) and a swell over a few cycles, and ends with a short ring and, on a loose fascia, a faint rattle. The drive is switched by a transistor or a pin, with no envelope shaping, so edges are hard. A self-drive part also wobbles in pitch as it starts.

**Distortion and clipping.** The element is driven hard for loudness. The ceramic and its bond are not linear at large deflections, the plate's stiffness changes with deflection, and a cheap driver's output saturates at the rails; in a magnetic buzzer the diaphragm can touch the pole piece. The result is soft clipping, with some asymmetry (even harmonics), on top of the square wave's own.

**Enclosure and Helmholtz port.** The disc sits in a plastic housing with a small sound hole: a Helmholtz resonator, cavity volume V, port of area A and effective length L (with end corrections), resonating at f ≈ (c/2π)·√(A/(V·L)). Designers tune it to the plate's resonance for maximum SPL ([PZT application manual](https://www.framboise314.fr/wp-content/uploads/2018/02/PZT_Application_note.pdf); [PUI Audio](https://puiaudio.com/wp-content/uploads/2022/08/DesignOfAHelmholtzChamber.pdf)), and the resonance moves with the speed of sound, so with temperature ([US 8908889, temperature compensated piezo buzzer](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/8908889)); in a cheap part it is often a little off, giving a second, broader peak a few hundred hertz to a kilohertz from the plate's. One worked patent example: a 7.55 cm³ chamber with a 3.6 mm radius port 1.6 mm long resonated near 1440 Hz ([US 4142186](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/4142186)); buzzer housings of a few tenths of a cubic centimetre sit near 2 to 4 kHz.

**One cheap speaker under a membrane fascia.** In a keypad, access controller or instrument the sounder is soldered to the board behind the front panel, its sound coming out through a pinhole in the membrane overlay or not at all. That adds: a short reflection between board and fascia (a comb filter, notches every few kilohertz); muffling of the top end; a membrane or a loose panel that buzzes on loud beeps; and, in a mains unit, a little 100 Hz ripple on the drive. An enthusiast forum's finding that a piezo rated 85 dB was much quieter in its enclosure without a sound hole ([EEVblog](https://www.eevblog.com/forum/beginners/piezo-buzzers-vs-magnetic-buzzers/)) is the everyday version of this.

## What real equipment does with it

The meaning is in the cadence, not the pitch: most equipment has one sounder, and an externally driven one is often played at only one or two frequencies.

- **Keypad entry.** One short chirp per key, 20 to 50 ms, often at the sounder's resonance. Each digit of a code beeps ([DSC PC500 user manual](https://manualmachine.com/dsc/pc500/9661297-user-manual/)).
- **Confirm or accept.** Two or three short beeps, or one longer one (0.2 to 0.5 s); some panels give a burst (a DSC panel gives six beeps when arming succeeds; [DSC PC500](https://manualmachine.com/dsc/pc500/9661297-user-manual/)).
- **Error or reject.** A wrong code is often one long tone (DSC: "a single long tone"; [DSC PC500](https://manualmachine.com/dsc/pc500/9661297-user-manual/)); others give three fast beeps, or a buzz at a lower pitch. Bosch lists an "invalid button buzz" for an invalid key or sequence ([Bosch B930 data sheet](https://www.a1securitycameras.com/content/product_documents/13617/bosch-B930_datasheet_Data_sheet_enUS_10683751435-A1.pdf)).
- **Entry and exit delay.** An intermittent beep through the countdown, speeding up in its last 5 to 10 s ([Alarm Grid, Honeywell 6160](https://www.alarmgrid.com/faq/how-do-i-set-the-timer-on-a-honeywell-6160-keypad); [Bosch B930](https://www.a1securitycameras.com/content/product_documents/13617/bosch-B930_datasheet_Data_sheet_enUS_10683751435-A1.pdf)).
- **Warning.** A slow on-off pulse, a quarter to half a second on and off, repeated until acknowledged.
- **Alarm.** A fast pulse (4 to 8 Hz) or a warble between two frequencies (the second about a fifth to a minor third away), continuous until silenced.
- **Medical alarm priorities (IEC 60601-1-8, as a reference for cadence).** The 2006 edition's familiar patterns: high priority a burst of ten pulses (three, a pause, two; three, a pause, two), medium three pulses, low one or two, each burst repeated at intervals of seconds; the alarm's fundamental between 150 and 1000 Hz with at least four harmonics between 150 and 4000 Hz within 15 dB of each other, deliberately unlike a pure piezo tone so that it can be located and heard by people with high-frequency loss ([Same Sky, a guide to IEC 60601-1-8](https://www.sameskydevices.com/blog/a-guide-to-iec-60601-1-8-and-medical-alarm-systems); [Mallory Sonalert IEC 60601-1-8 sounder data sheet](https://www.farnell.com/datasheets/4425559.pdf)). The 2020 amendment replaces melodies with auditory icons and "auditory pointers" whose pulse lengths code priority (25 to 75 ms high, 90 to 200 ms medium, 400 to 600 ms low; [PUI Audio, IEC 60601-1-8 updates](https://puiaudio.com/news/key-updates-to-iec-60601-1-8-what-engineers-need-to-know)). The game borrows the cadences, not the spectrum: its beepers are cheap piezos, and a 60601-compliant sounder would not sound like one.
- **Workplace danger and evacuation (ISO 7731, ISO 8201).** ISO 7731 sets a danger signal's level (about 15 dB over the ambient), its spectrum (mainly 500 to 1500 Hz) and its temporal pattern, preferring a sweep or intermittent or alternating tones ([Pfannenberg, ISO 7731](https://products.pfannenberg.com/de-en/Signaling-Technologies/Audible-Signaling/Loudness-is-not-everything/)); ISO 8201's evacuation signal is the temporal-three: 0.5 s on, 0.5 s off, three times, then 1.5 s off ([ISO 8201:2017](https://iteh.es/catalog/standards/iso/3eab1df5-4d44-4710-b3cb-1760a11314f2/iso-8201-2017); [Firewize, T3](https://firewize.com/learn/t3-temporal-evacuation-tone)). The fire and gas alarms already have their own invented sounders (`fire/audio/fire-alarm.ts`, `general-safety/audio/gas-alarms.ts`), deliberately unlike real ones; a piezo beeper should not imitate an evacuation signal either, so the library has no temporal-three.

## How to synthesise it

The method, as the prototype does it (`piezo.py`, below), each stage a few lines of numpy and scipy at 48 kHz:

1. **Drive.** A band-limited pulse wave: the Fourier series of a pulse of duty d, Σ (2/(kπ))·sin(kπd)·cos(2πk·f·t) for every k with k·f under 0.95 of Nyquist, so nothing aliases (a naive square wave at 3.9 kHz aliases badly at 48 kHz). Duty 0.46: mostly odd harmonics, faint even ones. The phase is integrated from a frequency that starts 2.5 % low and settles with a 4 ms time constant (a sounder pulling in). Each beep is gated by an envelope with 1 ms edges, as a pin switches it.
2. **Transducer: a modal model.** The drive into three parallel two-pole band-pass resonators (the RBJ constant-peak band-pass; [Audio EQ Cookbook](https://www.w3.org/TR/audio-eq-cookbook/)), summed, plus 6 % of the drive passed straight through:

   | Mode                          | Hz   | Q   | Gain |
   | ----------------------------- | ---- | --- | ---- |
   | Diaphragm's bending resonance | 3900 | 10  | 1.0  |
   | Housing's Helmholtz resonance | 2650 | 4   | 0.45 |
   | A higher plate mode           | 9800 | 7   | 0.3  |

   The filters' own tails are the ring-down; a 30 ms tail is rendered after each beep. A different sounder is a different set of modes: a smaller, shriller one has its plate mode at 4.5 kHz and its port tuned to it; a magnetic buzzer's at 2.3 kHz with a lower Q and more of the drive straight through.

3. **Soft clip.** Normalise, then y = tanh(g·(x + a·x²))/tanh(g), the mean removed, with g = +9 dB and a = 0.18: an element and driver run into saturation, with asymmetry for even harmonics.
4. **Fascia.** A feed-forward comb (the signal plus 0.45 of itself 0.18 ms later: the board-to-panel reflection); a rattle (band-passed noise, 3 to 7 kHz, at 0.05, multiplied by the signal's own magnitude and the gate, so it buzzes only while loud); and 4 % of 100 Hz amplitude ripple.
5. **Band limit.** A fourth-order Butterworth high-pass at 700 Hz (no bass) and low-pass at 9.5 kHz.

Checked on the prototype's decoded MP3s: the mid beep (2.4 kHz) has its fundamental strongest, second harmonic 14 dB down and third 10 dB down; the low beep (1.3 kHz) has its _third_ harmonic (3.9 kHz) strongest, its fundamental 10 dB under it and harmonics out to 11.7 kHz within 25 dB, buzzy as a real one; the high (3.9 kHz, on resonance) is nearly a pure tone with a weak 11.7 kHz third harmonic. That is the behaviour described above.

Alternatives considered: a physical plate model (a few finite-difference or modal plate equations) is more than is audible here; a single resonant filter misses the second peak and the buzz; additive synthesis of a target spectrum would not give the pitch-dependent character for free. The modal model gives it, because the same three modes shape every drive frequency.

## Reverb, rendered in

The owner wants reverb "pre-rendered into it". Each beep is convolved with a synthesised impulse response, nothing recorded ([J. A. Moorer, "About this reverberation business", 1979](https://www.jstor.org/stable/3679838) describes the exponentially decaying noise tail that this follows). The IR: a predelay; sparse early reflections (random taps of 0.2 to 0.6, random sign, spread over the first part); then white noise split at 2 kHz, each band decaying exponentially (60 dB in RT60 for the lows, 0.6 of that for the highs, as tiles and air absorb the highs faster), its density ramping in over the early spread; normalised to unit energy. The result is the dry beep plus the convolution times a wet gain, trimmed once 60 dB down, with a 3 ms fade.

| Amount | Where                                                       | RT60   | Predelay | Early spread | Wet  |
| ------ | ----------------------------------------------------------- | ------ | -------- | ------------ | ---- |
| dry    | Close to the device, or a soft room                         | none   |          |              |      |
| small  | A small plant room, a cubicle, the control room, a corridor | 0.35 s | 3 ms     | 12 ms        | 0.35 |
| large  | A big tiled plant room, a pool hall, the loading bay        | 2.2 s  | 22 ms    | 60 ms        | 0.55 |

An algorithmic reverb (Schroeder or a feedback delay network) would do as well; convolution with a synthesised IR is simpler to get right offline and needs no tuning against ringing. The output is mono: the game places each one-shot through a `PannerNode`, which wants mono.

A caveat: the reverb then travels with the source and is panned and attenuated with it, which a real room's reverb is not (it arrives from everywhere and falls off less with distance). For short beeps this is not noticeable; the library's choice of amount should follow the room the device is in, not the listener's.

## Loudness

The prototype brings every dry beep to one level: −20 dB K-weighted RMS (the ITU-R BS.1770 pre-filter and RLB weighting at 48 kHz; [ITU-R BS.1770-5](https://www.itu.int/rec/R-REC-BS.1770)) measured only over its sounding part (where the gate is on), so a 35 ms chirp and a 1.5 s alarm are equally loud _while sounding_, not averaged over their silences. Integrated LUFS (400 ms gated blocks) is wrong for such short sounds. The reverb versions keep the dry version's gain: the beep is as loud in every room and the tail is only added, so changing the amount does not change the loudness of the beep itself. Peaks came out between −19.4 and −15.8 dBFS, so the library can sit 10 dB higher and keep 1 dB of headroom. In-game levels (a keypad softer than an alarm) are then the caller's, as the console sounds' `LEVELS` are now.

## The game's sound system now

Checked 2026-10-28.

- **One audio output.** `src/toolkit/components/core/audio/part-audio.ts`: parts play one-shot `SoundRecipe`s (`partAudio.play(recipe, from)`) and hold loops (`partAudio.hold`, `LoopRecipe`). A recipe is `{ recording: URL, level }` (decoded once and cached), a synthesised `click`, a `tone` (`{ hz, seconds, level, type, repeat }`, a plain Web Audio oscillator, no filtering) or `tones`. Every one-shot from a part goes through a mono `PannerNode`.
- **Recorded sets.** The bridge's console sounds are MP3s resynthesised by a Python script kept beside them (`resources/sound/effects/resynthesized_bloops/resynth.py`, its `index.md` describing the method and listing each file): the precedent for Python-rendered assets. `src/toolkit/components/sound/logic/console-sounds.ts` (pure) names them as a union type, lists each one's measured loudness (`LOUDNESS`, mean and peak dBFS) and balances them (`balanced`); `audio/console-recordings.ts` maps each name to a `new URL(…, import.meta.url)` and makes a `recording`. Other assets sit in `src/toolkit/components/sound/audio/assets/` (with a README of sources) and `resources/sound/music/`.
- **Beeps there are now**, all plain oscillators, none sounding like a piezo: `BEEP` (2700 Hz sine, 80 ms, `core/parts/building-part-tools.ts`), `ERROR` (420 Hz sawtooth, 0.25 s), `CHIME` (880 Hz sine twice); `bootBeep(hz)` (square, 0.11 s, `sound/audio/boot-beep.ts`); the spa pack's controller's `ONLINE_BEEP` and `FAULT_BEEP` (2700 Hz, `gallery/rooms/plant/spa-pack.ts`, already called "a piezo sounder on its board"); `ALARM_BUZZER` (a 2400 Hz square gated at 2 Hz, `core/audio/part-loops.ts`); the touch panels' sine and triangle bleeps (`sound/audio/touch-bleeps.ts`). Where they are used is listed in the mission.

## Pre-render or synthesise at run time

Pre-render, as MP3, by a Python generator kept beside the files:

- The owner asked for the reverb pre-rendered and for a library to choose from by tone, meaning and reverb: files are that library, listenable outside the game.
- Convolution per beep at run time would need a `ConvolverNode` per room and the modal filters, clipper and fascia built per play; the files cost nothing to play, and the existing `recording` recipe already plays them.
- The precedent (`resynth.py`) is Python-rendered MP3s with an index; the same toolchain (numpy, scipy, ffmpeg) is all that is needed.
- MP3 latency: LAME writes an encoder-delay tag, which ffmpeg and the browsers honour; the prototype's decoded onsets were within 0.4 ms of the start. The generator should check each file's onset after encoding, and the files should start with no silence of their own. A keypress beep that starts late feels broken.
- Size: the prototype's 36 files total about 480 kB; a full library of some 120 is about 1.6 MB, small beside the music.

The run-time `tone` recipe stays for sounds that need a computed pitch (a tone room, a test).

## The prototype

`piezo.py` in the session's scratchpad (`/private/tmp/claude-501/-Users-salimfadhley-workspace-simulation-of-boring-things/b0f9f0bc-b843-4537-8731-dd0855641dbe/scratchpad/piezo/`) rendered 36 MP3s for the owner to listen to, with `index.html` (players) and `index.md`: entry, confirm and error at low (1.3 kHz), mid (2.4 kHz) and high (3.9 kHz), and deny, warning and alarm at mid, each dry, small and large. They are not committed; the mission makes the real set. Cadences tried: entry one 35 ms chirp; confirm two 70 ms beeps 50 ms apart; error three 90 ms beeps 60 ms apart; deny one 0.55 s tone; warning 0.25 s on, 0.25 s off, four times; alarm a warble, 62.5 ms at the pitch and at 0.84 of it, for 1.5 s.

## Sources

- Murata, _PZT Application Manual_, "Piezoelectric sound components" (mirror): <https://www.framboise314.fr/wp-content/uploads/2018/02/PZT_Application_note.pdf>
- Same Sky (CUI Devices), _Buzzer basics: technologies, tones and drive circuits_: <https://th.element14.com/site/binaries/content/assets/common/storefront-pdfs/same-sky/buzzer-basics-tecnologies-tones-and-drive-circuits.pdf>
- PUI Audio, _Design of a Helmholtz chamber_: <https://puiaudio.com/wp-content/uploads/2022/08/DesignOfAHelmholtzChamber.pdf>
- DB Unlimited, _Bender cavity design_: <https://www.mouser.com/pdfDocs/db_unlimited_bender_cavity_article_121514.pdf>
- US 8908889, temperature compensated piezoelectric buzzer: <https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/8908889>
- US 11361644, duty cycle tuning in a self-resonant piezo buzzer: <https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11361644>
- US 4142186, improving the electroacoustical properties of a buzzer: <https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/4142186>
- DAU Components, LF-PE30P25A external-drive piezo buzzer: <https://dau-components.co.uk/product-catalogue/components/sounders-and-buzzers/buzzer/lf-pe30p25a-15a-piezoelectric-buzzer-for-external-drive/>
- EEVblog forum, piezo buzzers vs magnetic buzzers: <https://www.eevblog.com/forum/beginners/piezo-buzzers-vs-magnetic-buzzers/>
- Same Sky, _A guide to IEC 60601-1-8 and medical alarm systems_: <https://www.sameskydevices.com/blog/a-guide-to-iec-60601-1-8-and-medical-alarm-systems>
- PUI Audio, _Key updates to IEC 60601-1-8_: <https://puiaudio.com/news/key-updates-to-iec-60601-1-8-what-engineers-need-to-know>
- Mallory Sonalert, IEC 60601-1-8 sounder data sheet: <https://www.farnell.com/datasheets/4425559.pdf>
- Pfannenberg, _Loudness is not everything: the importance of ISO 7731_: <https://products.pfannenberg.com/de-en/Signaling-Technologies/Audible-Signaling/Loudness-is-not-everything/>
- ISO 8201:2017, audible emergency evacuation signal: <https://iteh.es/catalog/standards/iso/3eab1df5-4d44-4710-b3cb-1760a11314f2/iso-8201-2017>; Firewize, the T3 temporal evacuation tone: <https://firewize.com/learn/t3-temporal-evacuation-tone>
- DSC PC500 user manual (keypad beeps): <https://manualmachine.com/dsc/pc500/9661297-user-manual/>
- Bosch B930 keypad data sheet: <https://www.a1securitycameras.com/content/product_documents/13617/bosch-B930_datasheet_Data_sheet_enUS_10683751435-A1.pdf>
- Alarm Grid, Honeywell 6160 keypad timers: <https://www.alarmgrid.com/faq/how-do-i-set-the-timer-on-a-honeywell-6160-keypad>
- W3C, _Audio EQ Cookbook_ (R. Bristow-Johnson's biquads): <https://www.w3.org/TR/audio-eq-cookbook/>
- ITU-R BS.1770, loudness measurement: <https://www.itu.int/rec/R-REC-BS.1770>
- J. A. Moorer, "About this reverberation business", _Computer Music Journal_ 3(2), 1979: <https://www.jstor.org/stable/3679838>
