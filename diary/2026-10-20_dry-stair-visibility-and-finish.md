# Dry stair visibility and finish

The new `CR_A_UP` room draws its own dry stair shell while `PR_A` is visible through the opening. The pool renderer now follows the stair camera whenever the view faces the opening, regardless of distance along the corridor; the earlier distance cutoff left a stale pool image behind the stair canvas.

The passage gained a 7 m ceiling and a corridor-side lintel lining, so the outside face of the pool wall is hidden without closing the portal. The corridor and the pool-side preview share the glazed ceramic tile shader with water and caustics disabled for the dry shell. The corridor renderer now uses ACES tone mapping and a pool-side fill light, while its local lights track the rising floor to stay above the treads.

The owner found a visible one-step change at the room boundary. Matching the two independent renderers' settings still left a lighting jump, so the active corridor now has its own controller and room identity while PR_A's renderer draws the shared stair geometry from that controller's camera. When looking away from PR_A, the wet geometry and refraction pass are disabled. The dry renderer's own frame is skipped during this shared view; its canvas remains present for movement and the copy-location control. A browser walk from PR_A across the threshold confirmed the URL changes to `CR_A_UP` while the stair image keeps the same finish.

Typecheck, lint, 675 tests, and build passed. The repo-wide format check still reports the pre-existing `.firecrawl/wall-luminaire.json`; the changed source files pass formatting.
