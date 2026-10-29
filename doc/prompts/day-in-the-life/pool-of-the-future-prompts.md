# Prompts: "The Pool of the Future?"

Prompts for the last bay of Hall 5's photograph gallery ([107l](../107l-a-day-in-the-life.md); the captions are `FUTURE` in `src/toolkit/gallery/logic/museum-5-gallery.ts`). The decades' prompts, and the rules every image follows, are in [midjourney-prompts.md](midjourney-prompts.md).

The hall's last wall (the owner, 2026-10-29): "the Pool of the Future?", three photographs of a future Reg, the same poolman in each. Generated 2026-10-29 by Codex's built-in image generator: three variants (`_a`, `_b`, `_c`) of each scene are saved as `future-<n>_<variant>.png` in `doc/gens/day-in-the-life/`. Future 1 provided the visual reference for Reg in the other two scenes; each variant's Reg follows the corresponding Future 1. The `_b` set was selected, resized to 900 × 600, and installed as `resources/images/day-in-the-life/future-<n>.jpg`, with low-resolution copies in `lo/`. This image task is done. The prompts used for the first variants were (flags dropped, the same prefix and ending):

## Future 1: the augmented poolman (`future-1`)

```
Reg, a cybernetically augmented pool technician of the future, middle-aged, a chrome prosthetic arm and a glowing implant at his temple, wearing sleek VR goggles and a navy technician's jumpsuit with hi-vis piping, standing calmly in the foreground of an impossible Escher-like swimming baths: pools on the walls and ceiling, staircases and diving boards at every angle, water flowing upward and sideways defying gravity, white tiles and blue lane lines in every direction, clean soft daylight, sharp modern digital photograph, cinematic, wide angle, no text, no logos --ar 3:2 --style raw --v 7
```

## Future 2: the poolman in cyberspace (`future-2`)

```
the same augmented pool technician Reg, VR goggles, chrome arm, navy jumpsuit, standing inside cyberspace: a vast dark digital void with a faint glowing grid floor, giant cubic voxel blocks of clear blue pool water floating in mid-air like a blocky Minecraft-style world, water cubes casting wobbling caustic light, small floating cubes drifting, he reaches out to touch one, glowing cyan rim light, sharp digital render look, no text, no logos --ar 3:2 --style raw --v 7
```

## Future 3: some things never change (`future-3`)

```
the same augmented pool technician Reg, VR goggles pushed up on his forehead, chrome arm, navy jumpsuit, kneeling on the deck of a gleaming futuristic swimming baths with curved white surfaces, holographic lane markers and floating light panels, reaching into an ordinary old-fashioned wall skimmer and pulling out a dripping handful of hair, a plaster and a hair grip with a weary expression, some things never change, bright clean daylight, sharp modern digital photograph, gently humorous, no text, no logos --ar 3:2 --style raw --v 7
```
