# Pool refraction and larger lectern

Added a screen-space refraction pass to dev11. It reuses the scene colour and a depth texture from the existing render pass instead of rendering the room a second time. Reconstructed underwater positions are shifted by the water's shared moving ripple slopes, with displacement increasing with depth. Dry foreground pixels are rejected and the effect fades near pool boundaries. This is an image-space approximation, including the composited water, rather than physical ray-traced refraction.

Added REFRACTION, RIPPLE SIZE and RIPPLE SPEED knobs and included them in Copy settings. Ripple size and speed affect both surface reflections and the refraction pattern. The refraction strength can be reduced to zero, and the console ingredient can disable the pass. Enlarged the lectern fascia to 1.35 × 0.85 m, spaced its nine knobs in three rows, made the fascia light metallic grey with dark title text and a Penfold maker's mark, and updated its collision footprint. Raised the deck gullies an additional 1 mm, to 2 mm above the tiles, at the owner's request. No Encabulator files were copied.

Chrome reported no shader errors with the new pass active. The owner accepted the current appearance for now and requested a commit and push.

Pre-commit validation: typecheck, lint (existing warnings only), repository format check, all 529 tests and production build passed. Build retains the existing large-chunk advisory.
