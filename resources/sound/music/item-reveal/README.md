# Skimmer item-reveal music

The suspense cue for Hall 5 comes from an ACE-Step 1.5 resynthesis of the opening of [Hari Sivan's piano rendition of Open Treasure Chest & Item Catch](https://www.youtube.com/watch?v=i3yV2xbJs6Q), chosen by the owner on 2026-10-29. The fanfare and optional big-item cue come from earlier resyntheses of [mrpianoman's piano cover](https://www.youtube.com/watch?v=Dq4uIlQI3A0). The deflated fanfare and skimmer-cleared cues remain original direct synthesis from `generate.py`. The source-conditioned cues retain musical material from _Ocarina of Time_ and are derivatives, not independent original compositions.

| File                          | Use                          | Duration |
| ----------------------------- | ---------------------------- | -------: |
| `reveal-suspense.mp3`         | Complete opening suspense    |   7.60 s |
| `reveal-big-item.mp3`         | Big-item reveal, optional    |   3.05 s |
| `reveal-fanfare.mp3`          | Triumphant item appearance   |   2.50 s |
| `reveal-fanfare-deflated.mp3` | Last find, more hair         |   2.50 s |
| `skimmer-cleared.mp3`         | Last find placed in the skip |   3.00 s |

All files are mono 48 kHz MP3, 128 kb/s, with decoded peaks around −7 dBFS. The musical brief is in `doc/prompts/music/item_reveal/item-reveal-prompts.md`; its originality condition applied to the first render and is superseded for the two source-conditioned cues by the owner's later request.

The selected suspense render is `work/projects/item-get-resynthesis/renders/chest-suspense-n070_1.wav` in the adjacent ACE-Step workspace. That workspace's `split_chest_piano.py` extracts the complete opening phrase, 0–7.60 seconds after the new video's 5.57-second opening silence; the phrase decays before the item catch begins at about 8.4 seconds in the trimmed source. The previous 4.00-second cut ended mid-phrase. The selected take scored 0.946 on the workspace's time-aligned chroma comparison with the piano source (the other scored 0.907); this checks pitch content, not listening quality. `split_piano_cover.py` reproduces the fanfare and optional big-item cue from the earlier reference. The old 1.10-second flourish is saved as `renders/small-item-fanfare-clip.mp3`. The downloaded sources, full takes and exact requests are kept in that workspace, which is not part of the game repository. `generate.py` regenerates the two directly synthesized cues.
