# 079: A mains failure

Status: incomplete, for planning (opened 2026-10-26 with the owner, from [073](done/073-loading-dock-layout.md)). Not ready to start: the questions below are to be settled with the owner first.

## Review checkpoint — 2026-10-26

**Classification:** Active / planned. **Filed:** `doc/prompts/079-mains-failure.md`.

**Delivered:** incomplete, for planning (opened 2026-10-26 with the owner, from [073](done/073-loading-dock-layout.md)). Not ready to start: the questions below are to be settled with the owner first.

**Still outstanding:** Retain the prompt’s required work and current root TODO entries.

**Evidence:** Current prompt, its Remaining section and source check. Reviewed against source `e5078c4`.

The original request and earlier implementation notes below are retained as history; this checkpoint supersedes any conflicting old completion claims. Outstanding work remains open in the root TODO.

## The idea

The generator lorry comes only when there is some kind of power failure (the owner, 2026-10-26). The site's supply failing, what the building does without it (emergency lighting and its central battery, plant tripping, the pools' circulation stopping), and getting power back by hired generator (077) and then mains.

## To settle

- What causes a failure and how long it lasts.
- What fails and what carries on; the order things are restarted in.
- How the generator lorry is called (078, or a phone call), and how long it takes to come.
- How it ties to the emergency-power prompt ([052](done/052-emergency-power.md)).

## A second opinion (Codex, 2026-10-26; not yet adopted)

- Distinguish a failure of the supply upstream from the main switch opened or a feeder tripped; for each, what changes: sources, alarms, lights, pumps, dosing, ventilation, controls.
- Reconcile with [052](done/052-emergency-power.md): the central battery has its state, emergency fittings are outstanding; escape lighting through the wait and the changeover (a hired set is never immediate).
- A safe recovery sequence: failure seen, plant stops and alarms, generator called and arrives, 077's checks and transfer, loads restarted in stages, mains back, transfer back, generator cooled, disconnected, gone; the water's condition and closing the pool considered.
- Questions: scripted, random or both; can it happen with the centre open?
- Acceptance: failure before and after the generator, battery exhausted, generator trip, mains restored, reload at every stage; no two sources together and no unexplained restart.
