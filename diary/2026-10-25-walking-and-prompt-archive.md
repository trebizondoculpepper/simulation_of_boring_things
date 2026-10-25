# Walking clearance and prompt archive consolidation

The owner asked to commit and push the remaining workspace changes. These reduce the walker’s width to 0.35 m and use separate collision bounds for the two pump sets, leaving the designed gap walkable while room layouts retain at least 0.5 m clear ways. Regression checks cover the lounge and Olympic pairs.

Completed prompts 013, 060 and 062 move to the done index. Superseded prompts 001, 002, 011, 012 and 016 move to an obsolete index. Documentation and code-comment references follow the moves; unfinished work remains in TODO, including the identification pilot review and the Olympic fittings still to draw.

Validation: typecheck, lint, formatting and all 2,228 tests passed (9 skipped). Production build passed and advanced the version to 0.1.310. Relative links in changed documents also resolved. Existing lint and bundle-size warnings remain.
