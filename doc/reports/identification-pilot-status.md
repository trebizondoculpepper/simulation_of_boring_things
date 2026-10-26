# Identification pilot: status

Claude Opus 5.5 (Claude Code), 2026-10-22, about 18:55 UTC. A status check on the plant identification pilot, against the eight items in `doc/prompts/obsolete/007-identification-pilot-review.md`, written at the owner's request while the other agent is still at work.

## Since the review prompt

One commit from the other agent: `fbe89e3`, _Add identified footbath schedule to PDF manual_. It adds a "Footbath plant identification" chapter to the PDF manual (`src/manual/logic/manual.ts`): an equipment and control schedule (identifier, name, purpose, normal state) and an alphabetical index. Both are generated from `walkIdentified(newIdentifiedPlant())`, and a test checks they list exactly the catalogue's parts. It is a sound step: the PDF manual and the web bill of parts (`?manual`) now come from the same catalogue, as the plan intends.

It continues the plan's manual work rather than any of the review prompt's items, so the prompt had probably not reached the agent when it was made.

## Main is failing CI

`fbe89e3` was committed without running the format check. `src/manual/logic/manual.ts` and `src/manual/logic/manual.test.ts` need formatting (`npx vp fmt`). Typecheck, lint, all 1,323 tests and the build pass, but CI runs `format:check` and will fail, so the commit will not deploy. The fix is to format the two files. Nothing else in the working tree is uncommitted (apart from `.firecrawl/`), so formatting them would not disturb work in progress.

## The review prompt's eight items

| Item                                                               | Status      | Notes                                                                                                                                      |
| ------------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Permanent asset IDs behind the tags                             | Not started | Saves, actions and now both manuals key on the tag (`PL4-PW1-RV1`). Each new place that uses the tag as the key raises the cost of item 1. |
| 2. The proposal's codes (`PW`, `MU`, `WV`, `DS`, `IV`, `facility`) | Not started | The new manual chapter prints the current codes, so they would change in print too.                                                        |
| 3. Roles, and normal states per operating mode                     | Not started | The schedule prints a single Normal column.                                                                                                |
| 4. Catalogued but unmodelled parts                                 | Not started | The pump, filter, UV, heat exchanger and dosing set still have empty state.                                                                |
| 5. An index built once; validation outside the game loop           | Not started | `walkIdentified` still runs on every lookup, now also when the manual is built (fine there).                                               |
| 6. A plan for leaving the footbath special case                    | Not started |                                                                                                                                            |
| 7. The dev-room namespace                                          | Not started |                                                                                                                                            |
| 8. Changelog, diary, plan update                                   | Not started | No changelog entry for the pilot or the manual chapter yet.                                                                                |

## Recommendation

Format the two files now so CI passes. Then start with item 1, before more code keys on the tags. The manual chapter shows how fast those uses multiply.
