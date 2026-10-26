# 076: Chemical deliveries: connecting the tanker and filling the stores

Status: incomplete, for planning (opened 2026-10-26 with the owner, from [073](done/073-loading-dock-layout.md)). Not ready to start: the questions below are to be settled with the owner first.

## Review checkpoint — 2026-10-26

**Classification:** Active / planned. **Filed:** `doc/prompts/076-chemical-delivery.md`.

**Delivered:** incomplete, for planning (opened 2026-10-26 with the owner, from [073](done/073-loading-dock-layout.md)). Not ready to start: the questions below are to be settled with the owner first.

**Still outstanding:** Retain the prompt’s required work and current root TODO entries.

**Evidence:** Current prompt, its Remaining section and source check. Reviewed against source `e5078c4`.

The original request and earlier implementation notes below are retained as history; this checkpoint supersedes any conflicting old completion claims. Outstanding work remains open in the root TODO.

## The idea

When the chemical tanker stands at the left bay, its hose is connected, in the yard, to the one fill cabinet on the outside wall, acid or hypochlorite, and the store fills. The two inlets take incompatible couplings (the owner, 2026-10-26), so an acid hose cannot go on the hypochlorite line: the mechanic should make that physical.

## To settle

- Who connects the hose: the driver, the player, both? What the player does at the cabinet (unlock it, check the store's level, open the inlet's valve, sign the delivery note)?
- What a wrong connection attempt does, and whether any mistake is possible at all.
- The fill's rate, the store's high level and overfill protection, what is heard and seen.
- How it ties to the stores' contents in the world (`chemicals.ts`) and to the order (078).

## A second opinion (Codex, 2026-10-26; not yet adopted)

- Acid is now a 1,000 L IBC (`chemicals.ts`), hypochlorite 12,000 L in three tanks: decide whether acid comes as replacement IBCs or is pumped into a new fixed bulk tank (changing the store, its bund and the delivery). PWTAG: separate, product-specific, locked fill points.
- Each chemical its own path in the schematic: isolation, non-return as fits, level, high-level alarm, independent overfill stop, bund. The procedure: product and label checks, room in the store, supervision, emergency stop, disconnection, the delivery record. Incompatible couplings prevent a wrong connection; a wrongly labelled product remains a real, detectable risk.
- Replace the instant top-up (`plant/delivery`) with a timed transfer that never silently discards litres at capacity; spills of the two never meet or reach a drain.
- Question: which acid, what strength, delivered how?
- Acceptance: a correct delivery raises only its store by measured litres; full, no hose, wrong coupling or product, valve shut and emergency stop each prevent or end the transfer, visibly, and are saved.
