# 081: How acid is supplied

Status: incomplete, for planning (opened 2026-10-26 with the owner, from Codex's review of [076](076-chemical-delivery.md)). Decided: bulk tanker delivery (below); the rest to settle.

## Review checkpoint — 2026-10-26

**Classification:** Active / planned. **Filed:** `doc/prompts/081-acid-supply.md`.

**Delivered:** incomplete, for planning (opened 2026-10-26 with the owner, from Codex's review of [076](076-chemical-delivery.md)). Decided: bulk tanker delivery (below); the rest to settle.

**Still outstanding:** Retain the prompt’s required work and current root TODO entries.

**Evidence:** Current prompt, its Remaining section and source check. Reviewed against source `e5078c4`.

The original request and earlier implementation notes below are retained as history; this checkpoint supersedes any conflicting old completion claims. Outstanding work remains open in the root TODO.

## The idea

The acid store holds one 1,000 L IBC on a spill pallet (`chemicals.ts`), while hypochlorite is 12,000 L in three bulk tanks. A tanker delivering acid through the yard's fill cabinet ([080](done/080-goods-yard.md), [076](076-chemical-delivery.md)) needs somewhere to pump it: so either the acid store gains a fixed bulk tank, filled from the yard, or acid keeps arriving as IBCs, delivered on a pallet and moved into the store, and the yard's acid inlet goes.

## Decided (the owner, 2026-10-26)

**Both chemicals by bulk tanker**: the tanker's hose connected to the chemical's own specially sized port in the yard's fill cabinet, and it fills that chemical's fixed tank; no IBCs, drums or carboys to move. So the acid store gains a fixed, bunded bulk tank, as the hypochlorite store has. Research (2026-10-26) supports it: bulk sodium hypochlorite by tanker is well established at large UK pools (some sites have gone back to containers after a tank failure, East Sands Leisure Centre, St Andrews); bulk acid is plausible, sulphuric in UK council pool tenders (a 1,250 L GRP bulk tank), hydrochloric also used. The gameplay is in the safeguards: incompatible couplings (different sizes and types, Guillemin, camlock, Storz), lockable fill cabinets, drip trays, a high-level alarm seen from the fill point, a member of staff attending each delivery, fill pipes draining back to their own bunded tank; and the danger they guard against, acid into the hypochlorite tank giving chlorine gas (Wells, 1989: eight treated). PWTAG: every tank in a sealed bund sized for it, a written delivery procedure with an emergency plan, no dosing straight from a bulk tank without an intermediate day tank unless a risk assessment supports it.

## To settle

- Which acid (sulphuric or hydrochloric) and what strength.
- The tank: its size, material, bund, level and high-level alarm, vent and fume scrubbing, its place in the acid store (5 × 5 m), the line from the yard.
- How the dosing in the plant rooms draws on it, and what the world saves.
