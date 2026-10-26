# Prompt: the plant as one connected network, model first

## Review checkpoint — 2026-10-26

**Classification:** Obsolete. **Filed:** `doc/prompts/obsolete/012-plant-network.md`.

**Delivered:** Preserved historical request; replacement recorded in the obsolete index.

**Still outstanding:** Any retained scope stays in the linked active mission or TODO.md.

**Evidence:** Existing supersession record. Reviewed against source `e5078c4`.

The original request and earlier implementation notes below are retained as history; this checkpoint supersedes any conflicting old completion claims. Outstanding work remains open in the root TODO.

Superseded (2026-10-25) by each room's enhanced network: the plumber's expanded port graph ([018](../done/018-plumber-valves-and-isolators.md), [064](../done/064-jacuzzi-from-the-model.md)), which the owner ruled the one source of truth. The network built here (steps 1 and 2) was deleted, used by nothing, in `96ae999`.

> **Retired 2026-10-25.** The plant network this refers to (`src/game/plant/network/`, `PLANT_NETWORK`) was deleted: nothing in the game used it, and the owner ruled that each room's enhanced network (the plumber's expanded port graph) is the one source of truth. Git history keeps it.

Written by Claude (Opus 5.5, Claude Code) for itself, 2026-10-22, from the owner's direction. Read `CLAUDE.md` first; its rules apply.

## Why

The owner's highest priority: every large item of plant (pumps, tanks, filters, boilers, generators) must be plumbed in, and every valve and pipe between them must work and do something useful, starting with the noisy machines (pumps, ozone generators), because watching them respond is the most satisfying thing in the game. Today they are not: the 43 drawn valves are saved in the world but change nothing; the one hydraulic schematic (`src/game/plant/circulation.ts`) is for a generic pool, has four filters where the Olympic room has five, and is used by nothing; pumps, gauges and the ozone generator read shortcuts (`plantReadingOf`).

The owner's rule: **build the model first, then draw from it.** There must be a one-to-one mapping between every drawn valve and machine and a node in the model; pipes are just the links between them. Where something cannot be simulated yet, the model holds a **placeholder** for it, which can be detected, so the gaps in the model are listed, not remembered.

## Step zero: done (2026-10-22)

The rooms already hold what the plant sizing (`src/game/plant-sizing/sizing.ts`) estimates, near enough, so the existing inventory stands and nothing is relaid now:

- **The lounge and Olympic plant rooms** match: balance tank, duty and standby pumps, filters (2 and 5), heat exchanger, UV, ozone generator and contact tank, dosing.
- **Elsewhere:** the jacuzzi and footbath have packaged sets, and the wet hall, chemical stores and air plant all match.
- **The boiler house** has six boilers where the sizing says 5 × 300 kW. That is close enough, so keep the six.
- **The circulation flows differ:** the sizing gives 55.6, 714, 28 and 9 m³/h, the world 90, 620, 24 and 12. The network uses the world's figures (`POOL_TARGET`), since the world already runs on them.

## The plan

1. **The network** (`src/game/plant/network/`, pure, tested beside it). Every machine and every valve is a node, with a permanent asset ID, a tag (`doc/plans/part-naming.md`), a name, a kind, its room, and typed ports by service. Pipes are links between ports, nothing more. Valves come from each kind's template (a sand filter's inlet, outlet, backwash in and out, rinse and drain valves; a pump set's suction valve, strainer, non-return valve and discharge valve), because the sizing does not list them. Boundaries are nodes too: the town main, the gas main, the sewer, the pools, the chemical stores, the outside air.
2. **Simulated, or a placeholder.** Each node and link declares, aspect by aspect (hydraulics, heat, chemistry, ozone, electrics), whether it is modelled or a placeholder, with the reason. A placeholder passes its flow through, so the network around it still solves.
3. **The gaps, detected.** A generated report (`doc/reports/model-gaps.md`) lists every placeholder grouped by what is missing, and a test pins their count so it only shrinks.
4. **Checked as a network,** by tests:
   - every port is connected, to ports of its own service;
   - every pool's circuit runs from its tank back to it;
   - every drain reaches the drainage boundary;
   - the solved flows meet each pool's design;
   - line-ups work: standby changeover, filter isolation, backwash, balance tank drain, pool drain-down.
5. **The world runs it.** Its state (valve openings, pumps running, levels) lives in the world. `advance` solves it, and machines, pump sounds, gauges and the ozone generator read it, replacing the shortcuts.
6. **The visuals follow it.** The rooms place its nodes, and their pipes are drawn from its links. A test proves every drawn machine and valve is exactly one model node, and the reverse.

Build it a system at a time, each committed before the next:

1. the pool water circuits;
2. make-up and drainage;
3. heating;
4. gas;
5. chemicals and ozone;
6. electrics.

Systems not yet built are placeholder boundaries in the meantime: for example, the balance tank's make-up comes from a placeholder "make-up main", and a filter's backwash goes to a placeholder "drainage".

## Design for step 1: the pool water circuits

- **Order of the large pools' circuit**, as `doc/plant-model.md` sets it: balance tank → suction header → duty and standby pump sets → discharge header (the sample tapping here) → filters in parallel → filtered header → ozone contact tank → heat exchanger → UV unit → hypochlorite and acid injection → pool inlets. The pool returns to the tank over its overflow and through its main drain.
- **A sand filter** has a top port and a bottom port, and its bed resists between them:
  - in service, water enters by the inlet valve (IV1) and leaves by the outlet valve (IV2);
  - backwash shuts both and opens the backwash supply (BV1, discharge header into the bottom) and the backwash waste (BV2, top to drainage);
  - rinse (RNV1) runs bottom to drainage, and drain (WV1) empties the vessel.
- **The balance tank** has its float valve (LCV1) from the make-up, and its drain (WV1).
- **The pool** has its main drain valve (IV1) to the tank and its drain-down valve (WV1) to drainage.
- **The jacuzzi and footbath** are each one packaged-set node (an equivalent pump), their internals a placeholder for now.
- **The overflow over the pool's edge** is a placeholder link (weir flow needs level dynamics, step 5). The pressurised side and the main drains are solved by `src/game/sim/hydraulics.ts`, with each connected circuit solved on its own.
- **Not part of the water solve yet, each a placeholder:** chemical, sample, ozone, heating and power ports, which link to placeholder boundaries (the stores, the LTHW ring, the switch room).
- **Two identities** (the owner, 2026-10-22): a **serial number**, the order a thing was added, permanent and never reused, recorded in an append-only register (`serials.ts`, new entries from `scripts/assign-serials.test.ts`), never computed from build order; and a **proximal ID**, what and where (`pl2.f3.bv2`), the plate's tag in lowercase (`PL2-F3-BV2`). The world's saved network state is keyed by serial (step 5).

## Rules

- Commit only my own files, named explicitly; another agent works in this checkout. Verify in a scratch copy, run all five checks, and commit only when they pass. Push after each step.
- Leave `CHANGELOG.md` alone while someone else has uncommitted edits in it.
- Markdown is one paragraph per line.
- Record the session in `diary/`.
- Ask the owner one question at a time, and only when a decision is genuinely theirs.

## Return path

After each step, write and commit `doc/reports/plant-network-progress.md`: what is built, the commit hashes, the gap count, and what's next.
