# 077: The generator hook-up: cabling the power lorry to the connection cabinet

Status: incomplete, for planning (opened 2026-10-26 with the owner, from [073](done/073-loading-dock-layout.md)). Not ready to start: the questions below are to be settled with the owner first.

## Review checkpoint — 2026-10-26

**Classification:** Active / planned. **Filed:** `doc/prompts/077-generator-hook-up.md`.

**Delivered:** incomplete, for planning (opened 2026-10-26 with the owner, from [073](done/073-loading-dock-layout.md)). Not ready to start: the questions below are to be settled with the owner first.

**Still outstanding:** Retain the prompt’s required work and current root TODO entries.

**Evidence:** Current prompt, its Remaining section and source check. Reviewed against source `e5078c4`.

The original request and earlier implementation notes below are retained as history; this checkpoint supersedes any conflicting old completion claims. Outstanding work remains open in the root TODO.

## The idea

When the generator lorry stands at the right bay, its containerised set is cabled, in the yard, to the heavy connection cabinet's terminals (three phases and earth), and the building is changed over to it. External power is delivered by a containerised generator on a lorry (the owner, 2026-10-26), so this is how the game simulates it.

## To settle

- The terminals: single-pole connectors of the Powerlock kind, L1 L2 L3 and earth, and whether there is a neutral.
- The changeover: where it is (the main switchboard?), manual or automatic, and its interlocks so mains and generator are never paralleled.
- The generator itself: its controller, starting it, its fuel, its load, what is heard.
- What the building runs on generator, and what it sheds.

## A second opinion (Codex, 2026-10-26; not yet adopted)

- Settle the electrical design first: the site's earthing, the generator's neutral, three- or four-pole changeover, neutral-earth reference, protection, cable rating, testing (BS 7671 Part 551; IET temporary-power guidance). Three phases and earth may omit a neutral that single-phase loads need.
- An interlocked, break-before-make changeover at the switchboard with an OFF position and each source's availability shown. The cabinet: connector covers, isolation, earthing, the cable protected from lorries and walkers. The set sized for the chosen essential load and motor starting.
- The generator runs in the open on its lorry (073: rear ends only); still state its exhaust, air, fuel and noise.
- Acceptance: an unconnected or unverified generator cannot energise the site; the two sources never close together; only the chosen loads transfer; a trip or empty tank drops that supply while emergency lighting stays independent.
