# Prompt: review of the plant identification pilot, and what to do next

You built the footbath pilot of the plant identification system: `src/game/plant/identification.ts` and its tests, the world's `identifiedPlant` tree (save version 14), the `plant/valve` and `plant/switch` actions, the footbath's valve-driven drain-down in `src/game/plant/pools.ts`, the bound and labelled valves in `src/toolkit/gallery/views/cabinet-services.ts`, and the `?manual` bill of parts (`src/toolkit/manual/plant-manual.ts`). It was committed in `4ec31b5`, and `6f4d8e3` raised the footbath's make-up main overhead and gave its valve a chain wheel. This is a review of that work against the agreed design, and a request to close the gaps.

Read first:

- `doc/plans/part-naming.md`, the final naming proposal (it wins where documents disagree);
- `doc/reports/plant-identification-review.md`, the technical review it folds in;
- `doc/plans/plant-identification.md`, the owner's design;
- `CLAUDE.md`, the project rules.

## What is good

Keep all of this.

- Kinds declare their parts once (`PartManifest`: code, class, name, purpose, normal), and instances carry only state.
- One recursive walk (`walkIdentified`) checks codes, uniqueness, documentation and normal states, and rejects undeclared children.
- Valve and switch state lives in the persisted world, changed only through actions, with a save migration from version 13.
- Draining the footbath depends on the actual valve line-up. A wrong line-up (return and drain both open) does not drain, and a test proves it. This is the negative case the review asked for.
- The cabinet's POWER switch is now world state, so the model and the cabinet agree.
- The bill of parts is generated from the live tree, with each part's current state.

## What is missing or differs from the agreed design

Each item has an acceptance check. Do them in this order. Commit each as its own checkpoint.

### 1. Permanent asset IDs (the review's R1; the proposal's sections 1–2)

The tag (`PL4-PW1-RV1`) is currently the key in saves, actions and procedures. Moving equipment or correcting a code would change the key and need a migration, and procedures would point at the wrong thing.

- Give every catalogued part an immutable, function-based asset ID (lowercase dotted, for example `footbath.return.rv`), declared by hand, never derived from order or position.
- Make the room-first tag a declared display property with an `aliases` list for former tags.
- Make actions, the save tree and procedures use asset IDs. Views, legends, charts and the manual show tags.
- Give a tag-to-ID lookup that resolves aliases.

**Done when:** a test renames a tag (old tag kept as an alias), and an old save, an action naming the old tag, and the footbath drain-down test all still work unchanged.

### 2. Codes as the proposal fixes them (the proposal's section 4)

| Now                                  | Should be    | Why                                                                                                                                                           |
| ------------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PW1`, `MU1`                         | `PW`, `MU`   | A room has one pipework parent per service; it is not numbered.                                                                                               |
| `DV1`, drain-down                    | `WV1`        | `DV` is a pump's discharge valve; drain to waste is `WV`.                                                                                                     |
| `DP1`, dosing                        | `DS1`        | The proposal's dosing set code.                                                                                                                               |
| `LCV1`, used as the make-up isolator | `IV1`        | An operator shuts an isolating valve by hand. A float valve (`LCV`) is self-acting, so model one separately where it belongs (in the cabinet's surge vessel). |
| `class: 'non-plant'`                 | `'facility'` | The proposal's class names.                                                                                                                                   |

Keep the old tags as aliases (item 1), and add a save migration for the stored tree.

**Done when:** the walk's vocabularies are the proposal's tables, defined once as data (not three hand-written regular expressions), and a test checks every code against them.

### 3. Roles, and normal states per operating mode (the proposal's sections 7–8)

- Add `role: 'operable' | 'indicator' | 'passive'` to every plant and facility part.
- Give every operable part a normal state for each operating mode: `running`, `shutdown`, `drain-down`, and later `backwash`.
- The footbath's valve chart is then: in `running`, `RV` open, `WV` shut, `IV` open; in `drain-down`, `RV` shut, `WV` open, `IV` shut.

**Done when:** a test sets each mode's line-up from the catalogue alone and the model behaves as that mode says (drain-down empties the footbath; running holds it full). A new world starts in `running`.

### 4. Catalogued but unmodelled parts

`P1`, `F1`, `UV1`, `HX1` and `DP1` are `machine` blocks with empty state. Either:

- give each the role it really has (`passive`, or `indicator` with a reading bound to the model), or
- bind it to the model's state (the pump running, the UV on), so the bill of parts' Current column is true.

**Done when:** no catalogued part shows a blank current state unless its role is `passive`.

### 5. An index built once, and validation outside the game loop (the review's R12 and catch 11)

`identifiedPart`, `partOpen` and `partOn` each re-walk and re-validate the whole tree. Every bound valve calls them every frame, and `footbathLineup` calls them several times per world step (`advance` steps every 0.1 s, so a one-hour skip is 36,000 steps). `walkIdentified` also throws on a bad entry, so a catalogue error crashes the game loop instead of failing a test.

- Validate once, when the catalogue is built, and in a test.
- Build an ID-to-address index once.
- Make the lookups O(1).
- Never throw from the world step for a catalogue error.

**Done when:** a test proves an hour's `advance` with the footbath does not call the full walk, and a deliberately broken catalogue fails a test rather than the runtime.

### 6. Out of the special case

The footbath is wired into `pools.ts` with `id === 'pool_04'` branches and boolean rules. That is acceptable for the pilot, but it does not generalise. Write down, in `doc/plans/plant-identification.md`, how the next circuit (the Olympic, with a backwash by valve line-up) will be brought in. Say whether line-ups stay boolean or move to the hydraulic network (`src/game/sim/hydraulics.ts`) as the review's R2–R3 recommend, and how the per-pool branches will go.

**Done when:** the plan has that section, with no code change required yet.

### 7. Development rooms (the proposal's section 9)

Any dev-room exhibit that is catalogued uses the `dev.` ID namespace and `DEV` tags, and never appears in the installed plant's bill of parts.

**Done when:** a test checks the namespace.

### 8. Housekeeping

- Add the pilot to `CHANGELOG.md` under Unreleased.
- Write a diary entry in `diary/`.
- Update `doc/plans/plant-identification.md` to say what the pilot built and how it differs from the plan.

## Rules for this work

- Follow `CLAUDE.md`. Before every commit run `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` and `npm run build`. **Commit only when all pass.**
- **Another agent works in this same checkout.** Commit only the files you changed (name them in `git add`, never `git add -A`), and leave everyone else's uncommitted files alone. If a file you need is modified by someone else, stop and say so in your report rather than editing it.
- Change the world's shape only by bumping `WORLD_VERSION` with a migration and a migration test.
- Markdown is one paragraph per line, never hard-wrapped.

## Return path

1. After each checkpoint, commit with the message `identification(<item number>): <what changed>` and push. If the push fails because `main` moved, rebase and push again; never force-push.
2. When you finish, or if you stop early, write `doc/reports/identification-pilot-progress.md`. Start with a line naming yourself (model and tool) and the UTC date. Then give each item 1–8 a line: done, partly done, or not done, with the commit hashes. End with any question only the owner can decide, one per line.
3. Commit that report with the message `report(identification): <one-line summary>` and push. It will be found with `git log --grep='identification('`.
