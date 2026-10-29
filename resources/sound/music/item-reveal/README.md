# Skimmer item-reveal music

Four original instrumental cues for Hall 5, synthesised from additive oscillators and seeded noise by `generate.py` on 2026-10-29. No recording, sample, melody or reference audio was used. The source score, timings and instruments are in that script; run it with NumPy and FFmpeg to regenerate the MP3s.

| File                          | Use                               | Duration |
| ----------------------------- | --------------------------------- | -------: |
| `reveal-suspense.mp3`         | Rising, unresolved skimmer reveal |   2.50 s |
| `reveal-fanfare.mp3`          | Triumphant item appearance        |   2.50 s |
| `reveal-fanfare-deflated.mp3` | Last find, more hair              |   2.50 s |
| `skimmer-cleared.mp3`         | Last find placed in the skip      |   3.00 s |

All files are mono 48 kHz MP3, 128 kb/s, with decoded peaks about −6.9 dBFS. The shared fanfare pickup uses one score so the two versions start alike. The musical brief is in `doc/prompts/music/item_reveal/item-reveal-prompts.md`.
