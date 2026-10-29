# Skimmer item-reveal music

Four instrumental cues for Hall 5. `reveal-suspense.mp3` and `reveal-fanfare.mp3` were cut from an ACE-Step 1.5 source-conditioned resynthesis of the owner's `doc/reference/music/item_get/oot_item_get.mp3` on 2026-10-29. The two other cues remain original direct synthesis from `generate.py`. The reference is a recording of the _Ocarina of Time_ item-get music; the resynthesized cues retain its musical material and should be treated as derivatives, not independent original compositions.

| File                          | Use                               | Duration |
| ----------------------------- | --------------------------------- | -------: |
| `reveal-suspense.mp3`         | Rising, unresolved skimmer reveal |   3.05 s |
| `reveal-fanfare.mp3`          | Triumphant item appearance        |   2.50 s |
| `reveal-fanfare-deflated.mp3` | Last find, more hair              |   2.50 s |
| `skimmer-cleared.mp3`         | Last find placed in the skip      |   3.00 s |

All files are mono 48 kHz MP3, 128 kb/s, with decoded peaks around −7 dBFS. The musical brief is in `doc/prompts/music/item_reveal/item-reveal-prompts.md`; its originality condition applied to the first render and is superseded for the two source-conditioned cues by the owner's later request.

The full selected ACE-Step render is `work/projects/item-get-resynthesis/renders/source-cover_2.wav` in the adjacent ACE-Step workspace, with the trimmed reference in `source/`, exact request in `logs/source-cover.json`, and both takes in `renders/`. This local workspace is not part of the game repository. The selected take scored 0.816 on the workspace's time-aligned chroma comparison with the source (the other scored 0.791); that score is a pitch-content proxy, not a listening verdict. `split-resynthesis.py` cuts the selected WAV from 3.85–6.90 s for suspense, starting 0.55 s earlier to include more of the arpeggio (the owner's 2026-10-29 revision), and from 7.92–10.42 s for the fanfare. Run it with the selected WAV path as its argument. `generate.py` regenerates only the two directly synthesized cues.
