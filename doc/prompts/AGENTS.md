# Mission prompt maintenance

Numbered files in this directory are the project’s missions. Apply this guidance to the active prompts and the `done/` and `obsolete/` archives, alongside the project’s root instructions.

## Status and completion evidence

Review the prompt’s requested scope and acceptance criteria against the current code, reports, tests, diary and git history. A status heading or a tick in TODO.md alone does not prove that every requirement is delivered. For a research or review mission, the requested report can be the completed deliverable; do not confuse that with implementation of its recommendations.

Record the completion status in the mission prompt itself. Include the date checked, an evidence commit or report, what has been delivered and what remains. When a mission is mostly done, say “mostly complete” or “partially implemented”, identify its completed parts and list the specific remaining requirements. File mostly completed missions under `doc/prompts/done/`, as the owner explicitly requested on 2026-10-26. Keep their remaining work visible in both the prompt and root TODO.md; filing does not mean every requirement is complete. Update the corresponding root TODO.md entry so both records agree; the prompt holds scope-specific detail, not a separate project backlog.

## Completed missions

When a mission is complete or mostly complete, move the prompt to `doc/prompts/done/`, keeping its original filename and number. Preserve the request and useful historical context, and record a dated completion summary with implementation/report evidence in the prompt. Add or update its entry in `done/README.md` and reconcile the root TODO.md entry, including its completion date and commit.

For a mostly completed mission, record required validation or required deliverables that remain unfinished, and label the archive entry “mostly complete”, not “complete”. Keep specific remaining tasks unchecked in root TODO.md. A mission with only preparatory work delivered stays active; do not treat “specified” or “researched for implementation” as mostly implemented. Research/review missions can themselves be complete when their requested report is delivered.

## Obsolete or superseded missions

Move a mission to `doc/prompts/obsolete/` only when an explicit replacement, owner decision or removal/rebuild makes its original work inapplicable. Keep the original filename and number, and put a dated status near the title explaining why it is obsolete, what replaced it and the evidence. Add or update its entry in `obsolete/README.md`.

Do not delete an obsolete prompt or label it completed. Preserve useful research and decisions. Transfer any still-relevant unfinished work to a named active mission or root TODO.md entry before archiving, and link that destination from the old prompt. Age alone is not evidence of obsolescence.

## Links and review procedure

Before moving files, classify the numbered prompts as complete, mostly complete/partial, active, obsolete or needing verification. Review existing archives as well as the active directory; correct stale or unsupported status summaries instead of assuming the archives are accurate.

After moves, fix inbound links and any relative links inside the moved documents, including links in TODO.md, README.md, plans, reports, research and archive indexes. Keep historical commit references and original mission numbers; never reuse a retired number. Treat `scenarios.md`, README files and this AGENTS.md as supporting documents rather than numbered missions.

Verify all affected local Markdown links and ensure every archived mission has an index entry. Record uncertain completion evidence and remaining verification in its prompt and TODO.md; do not invent a completion date, commit or delivered feature. Record a significant review in `diary/` and add a short audit report where it helps make the classifications checkable.
