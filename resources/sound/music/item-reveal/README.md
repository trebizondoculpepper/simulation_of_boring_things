# Skimmer item-reveal music

Four instrumental cues for Hall 5. `reveal-suspense.mp3` and `reveal-fanfare.mp3` were cut from an ACE-Step 1.5 source-conditioned resynthesis of [mrpianoman's piano cover](https://www.youtube.com/watch?v=Dq4uIlQI3A0) on 2026-10-29, replacing an earlier resynthesis of the owner's `doc/reference/music/item_get/oot_item_get.mp3`. The two other cues remain original direct synthesis from `generate.py`. The piano cover and these resynthesized cues retain musical material from _Ocarina of Time_; they are derivatives, not independent original compositions.

| File                          | Use                               | Duration |
| ----------------------------- | --------------------------------- | -------: |
| `reveal-suspense.mp3`         | Rising, unresolved skimmer reveal |   3.05 s |
| `reveal-fanfare.mp3`          | Triumphant item appearance        |   2.50 s |
| `reveal-fanfare-deflated.mp3` | Last find, more hair              |   2.50 s |
| `skimmer-cleared.mp3`         | Last find placed in the skip      |   3.00 s |

All files are mono 48 kHz MP3, 128 kb/s, with decoded peaks around −7 dBFS. The musical brief is in `doc/prompts/music/item_reveal/item-reveal-prompts.md`; its originality condition applied to the first render and is superseded for the two source-conditioned cues by the owner's later request.

The selected full render is `work/projects/item-get-resynthesis/renders/piano-cover-n050_1.wav` in the adjacent ACE-Step workspace; `renders/piano-cover-selected.mp3` is a listening copy. The downloaded cover, trimmed source, other take and exact requests are kept there too. This local workspace is not part of the game repository. The selected take scored 0.903 on the workspace's time-aligned chroma comparison with the piano cover (the other scored 0.818); that score is a pitch-content proxy, not a listening verdict. `work/projects/item-get-resynthesis/split_piano_cover.py` cuts the last 3.05 s of the suspense phrase and condenses the fanfare to 2.50 s without raising pitch. The earlier `split-resynthesis.py` remains as the recipe for the owner's first reference. `generate.py` regenerates only the two directly synthesized cues.
