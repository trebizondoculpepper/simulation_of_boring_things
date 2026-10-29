# Music prompts: the grout hall's era loops

The owner's brief (2026-10-29): in Hall 7, "Grout: The Unsung Hero of the Aquatics World", approaching a plinth lights it (the approach light) and, once the music exists, plays a loop of music of that grout's era. One loop for each of the ten plinths, about a minute long, as Ogg Vorbis, to live in `resources/sound/music/grout/` as `<n>-<short-name>.ogg`. Nothing plays them yet: wiring them to the approach light follows when the files exist (TODO.md).

## What every loop must be

- About 60 seconds, looping seamlessly (the end flows into the start with no gap or click: same tempo, key and texture at both ends; no fade in or out).
- Instrumental only: no vocals, no lyrics, no spoken words.
- Original: in the style of its era, never a recognisable existing tune or a sound-alike of a real recording.
- Quiet and reverent in mood, as befits the hall's chapel-like hush: it is background to reading a plaque, never loud or busy. Mixed to sit low (about −20 LUFS integrated), mono or narrow stereo.
- Ogg Vorbis, 44.1 kHz, quality 5 or so; under about 1 MB each.

## The ten loops

1. **Lime mortar and lime putty (about 1840 to 1900):** a Victorian parlour piece: a solo upright piano, gentle and hymn-like, in a minor-to-major lilt, like an amateur playing after Sunday dinner. `1-lime.ogg`
2. **Early Portland cement grout (about 1850 to 1950):** a small Edwardian string ensemble or a municipal brass band heard from across a park, stately and civic, the age of public baths. `2-portland.ogg`
3. **Sanded cement grout (the twentieth century):** 1930s light orchestral, a gentle foxtrot from a bandstand or a wireless set, slightly distant, with a hint of shellac crackle. `3-sanded.ogg`
4. **Unsanded cement grout (the twentieth century):** 1950s easy listening: vibraphone, brushed drums and a soft upright bass, a lido café on a quiet afternoon. `4-unsanded.ogg`
5. **Coloured cement grout (the 1970s, avocado):** 1970s easy-listening or library music: a warm Rhodes electric piano, wah guitar and a lazy, slightly kitsch groove, like a home-improvement programme's theme. The one loop allowed a little cheek. `5-coloured.ogg`
6. **Latex- and polymer-modified cement grout (from about the 1960s):** 1960s space-age bachelor-pad lounge: bossa nova rhythm, flute and organ, optimistic about materials science. `6-polymer.ogg`
7. **Furan resin grout (from the 1940s):** 1940s industrial-film music: a small orchestra, purposeful and earnest, the sound of a wartime documentary about chemistry. `7-furan.ogg`
8. **Epoxy grout (from the 1940s; in pools from about the 1960s):** early 1980s synthesiser: an analogue synth pad and arpeggio, clean and technical, like a corporate training video about adhesives. `8-epoxy.ogg`
9. **Improved cement grout, CG2WA (today):** contemporary ambient: soft piano over a warm, slow electronic pad, calm and modern, a spa reception. `9-cg2wa.ogg`
10. **Coda: the movement joint (wherever a pool must move):** a slow, sustained chamber organ or string drone, reverent and unresolved, as for the end of a service. `10-movement-joint.ogg`

## Prompt template (for a music model)

> An original instrumental loop, exactly 60 seconds, seamless (no intro, no ending, the last bar leading straight back into the first), [ERA DESCRIPTION FROM ABOVE]. Quiet, reverent, unobtrusive background for a museum gallery. No vocals. Not based on any existing song.
