# Skimmer item-reveal music

Four instrumental cues for Hall 5. `reveal-suspense.mp3` and `reveal-fanfare.mp3` were cut from an ACE-Step 1.5 source-conditioned resynthesis of [mrpianoman's piano cover](https://www.youtube.com/watch?v=Dq4uIlQI3A0) on 2026-10-29, replacing an earlier resynthesis of the owner's `doc/reference/music/item_get/oot_item_get.mp3`. The two other cues remain original direct synthesis from `generate.py`. The piano cover and these resynthesized cues retain musical material from _Ocarina of Time_; they are derivatives, not independent original compositions.

| File                          | Use                               | Duration |
| ----------------------------- | --------------------------------- | -------: |
| `reveal-suspense.mp3`         | Rising, unresolved skimmer reveal |   3.05 s |
| `reveal-fanfare.mp3`          | Triumphant item appearance        |   2.50 s |
| `reveal-fanfare-deflated.mp3` | Last find, more hair              |   2.50 s |
| `skimmer-cleared.mp3`         | Last find placed in the skip      |   3.00 s |

All files are mono 48 kHz MP3, 128 kb/s, with decoded peaks around −7 dBFS. The musical brief is in `doc/prompts/music/item_reveal/item-reveal-prompts.md`; its originality condition applied to the first render and is superseded for the two source-conditioned cues by the owner's later request.

The game suspense comes from `work/projects/item-get-resynthesis/renders/piano-cover-suspense-n070_1.wav` in the adjacent ACE-Step workspace; `renders/piano-cover-suspense-selected.mp3` is its 3.05-second listening copy. The fanfare retains the earlier `renders/piano-cover-n050_1.wav` take. The downloaded cover, trimmed source, other takes and exact requests are kept there too. This local workspace is not part of the game repository. Raising melody retention from 0.50 to 0.70 increased the suspense excerpt's time-aligned chroma similarity to the piano reference from 0.888 to 0.941; that score checks pitch content, not listening quality. `work/projects/item-get-resynthesis/split_piano_cover.py` cuts the suspense phrase and condenses the fanfare to 2.50 seconds without raising pitch. The earlier `split-resynthesis.py` remains as the recipe for the owner's first reference. `generate.py` regenerates only the two directly synthesized cues.
