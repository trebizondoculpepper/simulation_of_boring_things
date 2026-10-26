# Prompt: scorers at each stage, and what pipework costs

## Review checkpoint — 2026-10-26

**Classification:** Complete. **Filed:** `doc/prompts/done/020-scorers-and-pipe-costs.md`.

**Delivered:** The original delivered implementation/report is recorded in the finished index.

**Still outstanding:** None newly identified within the archived scope.

**Evidence:** `pipe-costs.ts`, `placement-scorer.ts`, `room-scorer.ts`, `unit-blocks.ts`; `5e67ab6` (2026-10-23).. Reviewed against source `e5078c4`.

The original request and earlier implementation notes below are retained as history; this checkpoint supersedes any conflicting old completion claims. Outstanding work remains open in the root TODO.

Written by Claude (Opus 5.5, Claude Code) for its own work, 2026-10-23. Read `AGENTS.md`, then prompts 017 (the room's layers) and 018 (the plumber). This adds a scorer to the end of each stage, and prices the pipework.

## What the owner wants

- **A scorer.** It judges a finished room on several dimensions and gives one number, so one room can be said to be better or worse than another, and how far it is from good. Like a travelling-salesman or packing problem, there is no direct way to the best room. The scorer lets a search get most of the way and shows what is left to fiddle with. (Done in `room-scorer.ts`, commit 5f51366, after Codex's advice: gates first, then a weighted score.)
- **Scorers at more than one level.** One comes straight after placement, before any plumbing, so that a poor layout is caught, and searched past, before the dearer stages run on it.
- **Pipework priced.** An approximate installed cost per metre for each kind and size of pipe, conduit and duct, from a hard-coded table. Heavier costs more than lighter, steel more than PVC, lagged more than bare. A cheaper solution is the more desirable one, rather than merely a shorter one.
- **Identical machines grouped** (tested with three sand filters). Machines of the same kind stand together as a battery, in one band, side by side where it fits. (Done: `PlaceItem.group`, in `machine-placement.ts`.)

## The design

### The stage scorers

Each stage's scorer judges only what that stage decides, against baselines the candidate cannot choose (Codex's point: a search must not be able to improve its own yardstick). Each reports gates first, then dimensions from 0 to 1, each with its raw measures and a reason.

1. **Placement scorer** (`placement-scorer.ts`), after placement and with no routing:
   - **gates:** every machine's access reachable on foot; no placing rule broken;
   - **sites honoured:** corner machines in corners, wall machines on walls, freestanding machines in the island;
   - **batteries kept together:** each group in one band, with nothing between its members;
   - **estimated pipework cost:** each link's square length, lead to lead, at its pipe's price per metre, against every link at 1.5 m;
   - **room area:** against what the sizer says the contents need.
2. **Plumbing and final scorer** (`room-scorer.ts`):
   - **gates:** fittings installed and reachable; no clashes; no run through a reserved region;
   - **installed cost of the runs:** against the same pipes run the shortest square way, end to end. This replaces "route economy", which counted metres.
   - the placement scorer's own dimensions carried through, so the final number covers the whole room.

The search can then place many candidates, keep the best few by the placement score, and plumb and fully score only those.

### Pipe costs (`pipe-costs.ts`)

An approximate installed cost per metre: materials, supports and fixing, and labour. Each kind has a price at a reference size and grows with size. These are working estimates for comparing designs, not quotations, and the table says so. Conduit carrying cables is priced as conduit plus cable, not as screwed pipe. Lagged pipe is its steel plus its insulation. Fittings (valves, isolators) have a price each.

### Parallel units: pre-assembled blocks and shared headers (the owner, 2026-10-23)

Identical units that work in parallel (filters, duty and standby pumps) stand together because they share a function, and so share headers: one inlet manifold feeds them all, one outlet manifold collects from them. Filters do not connect to filters, so a placement pulled only by links scatters them. Two parts:

- **Pre-assembled candidate blocks.** Before placement, each group of identical parallel units is made up into candidate blocks that reach its number. For four: a row of 4, a 2 × 2 square, two pairs, a row of 3 and a single, a pair and two singles, or four singles.
  - A row stands in any band, every unit facing the walkway.
  - A square is two rows back to back, so it stands only in the island, across both its faces, so that each row faces a walkway. In a wall band its back row would face the wall.

  Each block is one item for placement, as wide as its units and their gaps, with their ports. After placement it expands back into its units' places, so a block is side by side and aligned by construction.

- **Fewer placements is better, at the placement level.** The placement scorer rewards a group made up in fewer blocks. Placement tries each candidate make-up, and the placement scorer picks.
- **Headers** are added by the plumber's expansion where it finds identical units in parallel, the way it adds isolators: an inlet and an outlet header, each unit on a short branch with its isolators, and the header routed along the battery like a bus.

### Process layout practice (the owner, 2026-10-23)

From N. S. Nandagopal's _Practical Process Plant Layout and Piping Design_ (IDC Technologies, Rev 5.1, 2009), three rules for placement, each measured by the placement scorer:

- **Process order:** sequence equipment according to the process flow diagram. Each link runs source to target, and the process goes one way round the room; going against the way most of it goes costs as its arc.
- **Short pump suctions:** a suction link's pull counts double.
- **Withdrawal space:** room to take parts out beside a machine (a pump's motor, a plate exchanger's pack) or over it (a filter's internals). It is kept in the band packing, so no neighbour stands in it.

## Order of work

1. `pipe-costs.ts`, tested: dearer by size; steel above PVC; lagged above bare.
2. The final scorer prices runs instead of counting metres; Dev19's links pull machines together by their pipe's price, not its diameter.
3. `placement-scorer.ts`, tested. `searchDev19` places, keeps the best by placement score, then plumbs and scores those.
4. Re-run the search, update Dev19c's seed, and report all the scores again.

## Checks and rules

As in prompts 017 and 018: pure tests beside the logic; the five checks before every commit; named files only; changelog; one paragraph per line.
