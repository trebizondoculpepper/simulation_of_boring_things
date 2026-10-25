# Review: the port graph as the world's equipment contract

Claude (Opus 5.5, Claude Code), 2026-10-22 UTC. Answers `doc/prompts/done/014-port-graph-architecture-review.md`. Nothing in the production model was edited; `doc/prompts/done/013-minimal-multidomain-plant.md` was not run.

## Contents

1. Verdict
2. What was verified, and what is inferred
3. Required outcomes: current code, gap, check
4. Findings, most consequential first
5. Answers to the questions
6. A TypeScript contract sketch
7. The smallest migration slice, and rollback
8. Acceptance tests
9. Proposed edits to prompt 013
10. Requirements worth changing

## 1. Verdict

**Adapt.** A typed, hierarchical port graph should become the one contract for installed identity and topology, with the simulation, the catalogue and the rooms all keyed by it. But the contract should be a **small project-owned schema**: a kind registry with literal port maps, a typed builder and a project validator, grown from `src/game/plant/network/`, which is already a flat port graph with serials, proximal IDs, services, boundaries and tests. Do not adopt `@statelyai/graph` as the source of truth.

The library is a sound JSON container with compound nodes, graph algorithms and layout exporters (ELK, DOT). It is worth keeping as an _export_ for drawing schematics and for its traversal algorithms, if the owner wants the dependency at all. It contributes none of the contract's rules: its port data has one type for the whole graph, port names are plain strings, and its only checks are structural.

The biggest problem the review found is not a missing library. **The plant already has four overlapping identity schemes**, and two of them use the same tag for different things. Unifying identity is the first job, whatever the representation.

## 2. What was verified, and what is inferred

Verified against `@statelyai/graph` 2.6.0 as installed (its `.d.mts` declarations and source, and a throwaway headless test, since deleted):

- **Port data:** `GraphPort<TPortData>` has `name: string`, `direction: 'in' | 'out' | 'inout'` (default `inout` when omitted) and `data: TPortData`. `TPortData` is a single type parameter for the whole `Graph`, so ports cannot be typed per kind of node.
- **Edges:** `EdgeConfig.sourcePort` and `targetPort` are `string`. A misspelt port name compiles, and is caught only at runtime by `getGraphIssues` (`missing-source-port`).
- **What `getGraphIssues` checks:** its schema's shape, plus duplicate node, edge and port names, missing parents, parent cycles, dangling endpoints and missing ports. Nothing else.
- **What the throwaway test showed it accepts without an issue:**
  - an edge from one `in` port to another;
  - two edges on one port (it has no cardinality);
  - an edge from a parent's port into its own child's port, with no notion of delegating a boundary port to a child.
- **Indexing:** `getEdgesByPort` uses a per-node index (a `WeakMap` cache), then filters that node's edges by port name. The cache rebuilds when the `nodes` or `edges` array is replaced or changes length, but not after an in-place field change (`edge.targetId = …`), which needs `invalidateIndex`. The research note's "port adjacency queries are indexed" is true per node, not per port.
- **Compound nodes:** `parentId` is supported, with `getChildren`, `getAncestors` and `getLCA`.

Verified in this repository:

- **The existing spike** (`port-graph-spike.test.ts`) passes: 5 tests, run alongside the throwaway test above.
- **Its media and direction checks are the spike's own code** (`wiringProblems`), not the library's.

Inferred, not tested: the effort and risk figures in sections 7 and 9, and the scale cost (section 5) beyond the 152 nodes and 221 pipes measured today.

## 3. Required outcomes: current code, gap, check

| Outcome                                                                                  | Current code                                                                                                                                                                                                                                                                                                                                                                                             | Gap                                                                                                                                                                                                                               | Proposed check                                                                                                                                                                                   |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. One identity per visual; one catalogue entry; one placement                           | Four schemes: placed equipment `asset-0001`… (91, `installed-asset-ids.ts`); room valves `valve-0001`… (43, `installed-valves.ts`); feeders (14, `installed-feeders.ts`); the footbath's identified part tree (`identification.ts`, in `World.identifiedPlant`); and the network's serials and proximal IDs (152 nodes, `src/game/plant/network/`). Drawn items are keyed by `room\|key\|label` strings. | No join between them. Two tags collide with different meanings (finding F1). Panel controls (buttons, lamps, gauges) have no identity outside the footbath pilot.                                                                 | One registry of installed nodes (serial, proximal ID, kind, parent, room, visibility). Bijection test per room: placed views ↔ visible graph nodes. Orphan, duplicate and unbound lists, pinned. |
| 2. Every drawn port is a declared graph port; required ports connected; schema from kind | Drawn ports: `machine-ports.ts` (geometry, a service each, no stable ID). Network ports: per node in `pool-water.ts`, written by hand, not derived from a kind.                                                                                                                                                                                                                                          | The two disagree (a drawn filter has `inlet/outlet/drain`; the network filter has `top/bottom` and six valve nodes; one drawn `pump-pair` is two network pumps). No `required` flag.                                              | Kind registry declares ports once; a node's ports are its kind's. Each drawn port names its graph port. A validator lists unconnected required ports.                                            |
| 3. Typed connections: role, direction, cardinality, medium, ratings                      | `types.ts` `Service` on ports; `validate.ts` checks that a pipe's service equals both ends'.                                                                                                                                                                                                                                                                                                             | No direction or role: suction-to-suction passes (both `pool-water`). No cardinality, no ratings. No signal or control service, so "power to a signal input" cannot even be expressed.                                             | Compile time: literal port and medium types in the builder. Runtime: role and direction pairing, cardinality, rating compatibility. Negative fixtures for each.                                  |
| 4. Rooms as grouping; moves keep identity; explicit boundaries; finite stores            | `node.room` is a property, never connectivity. Serial register with `RETIRED` and rename-on-move (`serials.ts`). Town main and sewer are real boundaries.                                                                                                                                                                                                                                                | The hypochlorite and acid stores are infinite placeholder boundaries, though the world tracks chemical stock. There is no gas main, flue, outside air or electrical supply yet. Saved state is keyed by catalogue ID, not serial. | Boundary nodes may not be stores: a validator rule ties `kind: 'store'` to finite state. A move test: change `room`, keep the serial and the saved state.                                        |
| 5. Line domain, design rating vs live state                                              | The network holds hydraulic design losses and pump design points. Live water state (`NetworkState`, `solveWater`) is separate.                                                                                                                                                                                                                                                                           | Ratings have no quantity or unit types. No electrical, gas or thermal ratings. Live values are not yet world addresses.                                                                                                           | `Quantity<'A'>` and similar typed ratings, per port, by domain. Live addresses: `serial:field`. A test that no live field appears in graph metadata.                                             |
| 6. Controls and displays causally bound                                                  | Drawn valves dispatch `plant/valve` by `valve-NNNN`. The world stores the position, and only the valve's own view reads it back, so turning one changes no flow (F2). `WORLD_BINDINGS` is by kind, not by instance. Footbath pilot parts are addressable.                                                                                                                                                | No instance-level command→target or reading→source links. Indicators read ad hoc world fields.                                                                                                                                    | Control nodes declare `commands: target`; indicator nodes declare `reads: address`. A test operates each control headlessly and asserts the target's state and the indicator's snapshot follow.  |
| 7. Topology vs simulation; tests; cost                                                   | `network.test.ts` covers topology, line-ups and solved flows. The solver is separate (`water.ts` on `sim/hydraulics.ts`).                                                                                                                                                                                                                                                                                | No save-migration test for network state (it is not saved yet). Validation runs in tests only.                                                                                                                                    | Validation at build time in development and in tests; production loads a validated, frozen graph and skips it. Per-domain behaviour tests stay separate from topology tests.                     |

## 4. Findings, most consequential first

**F1. Identity is split four ways, and tags already collide.**

- `PL1-P1` is the whole duty/standby pump pair in `src/game/plant/installed-asset-ids.ts` (`asset-0002`), but pump 1 alone in the network (`pl1.p1`).
- `PL1-F1-BV1` is the backwash _waste_ valve in `src/game/plant/installed-valves.ts` (on the "Filter 1 backwash waste" run), but the backwash _supply_ valve in `src/game/plant/network/pool-water.ts`.
- The drawn filter drain is `PL1-F1-DV1`, where the naming rules (`doc/plans/part-naming.md` §4) reserve `DV` for a pump's discharge valve.

A player's procedure or a saved line-up naming `PL1-F1-BV1` would mean different valves to different parts of the code. **No representation choice fixes this by itself: one registry must own identity.** The network's serial register (`src/game/plant/network/serials.ts`, `serial-register.ts`) is the best candidate, because it already separates a permanent serial from a changeable proximal ID and is tested for reuse and retirement.

**F2. Controls change saved state but not the plant.**

- `World.installedValves` (`src/game/world.ts:103`, written at `:190`) is read only by the valve's own view (`src/toolkit/gallery/views/room-pipework.ts`), so a turned valve stays turned but no flow changes.
- The network's line-ups (`network.test.ts`) work, but nothing binds the drawn valves to the network's valves.

Outcome 6 needs instance bindings, and is the user-visible payoff. It is also exactly the step prompt 012 was about to take.

**F3. The library adds no contract rules; the spike's checks are hand-written.** Everything outcomes 2, 3 and 5 need sits outside `@statelyai/graph`: port typing per kind, direction pairing, cardinality, required ports, ratings and boundary-port delegation (verified, section 2). Its one structural check that matters, missing ports, comes at runtime, after a misspelling has compiled. A project schema of a few hundred lines gives compile-time port names and media, and keeps the runtime validator in one place. The library remains useful for ELK layout and DOT export of schematics.

**F4. Direction must mean installation, not flow.** In the network a filter's `top` and `bottom` swap roles in backwash, and a balance tank's make-up valve can see reverse pressure. Ports should carry a **role** (suction, discharge, supply, return, drain, inlet, outlet, signal-in, signal-out), and rules on which roles may meet. Signed live flow belongs to the solver: `solveWater` already returns signed flows, and the backwash test asserts a negative one.

**F5. Hierarchy needs delegation, not just `parentId`.** A packaged cabinet's boundary port (make-up in) must be declared as _exposing_ a specific child's port (its make-up valve's inlet). Otherwise an edge to the parent and an edge to the child both look valid, and a solver flattening the graph can't tell which internal node is meant. Neither the library nor the current network has this. The footbath's identified tree (`identification.ts`) has the parts, but no ports.

**F6. Finite stores are modelled as infinite boundaries.** `site.hypochlorite` and `site.acid` are placeholder boundaries in `src/game/plant/network/common.ts`, while `hypo_store` draws three bulk tanks and the world tracks chemical stock. They should be store nodes with state, joined by chemical lines to the dosing pumps.

**F7. Ratings have no units.** The spike's `Rating` has `unit: 'm3' | 'm3/h' | 'g/h' | 'A'` with a bare number, so a pressure rating could be compared with a flow rating. A discriminated quantity type per dimension is needed (section 6).

## 5. Answers to the questions

**What is the unit of identity for a composite cabinet?** One parent node, plus one child node for every part that is independently operated or observed: valves, buttons, switches, lamps, gauges, displays, sensors, fuses. Purely geometric sub-parts (hinges, bolts, decorative panels) are not nodes.

- **IDs and serials:** each child's proximal ID is its parent's plus a local key (`pl4.cab1.rv3`). Its tag is printed short (`RV3`), since the parent's plate gives the context. Every node, child included, has its own serial.
- **Ports:** the parent declares boundary ports, each delegated to exactly one child's port. Children connect to each other inside the parent only.
- **Labels:** a child's label comes from its kind's part declaration, as the naming rules already say (`doc/plans/part-naming.md` §5).

**Do the library's ports, `parentId`, metadata and issue checks support the contract?** Partly, as a container. Its missing operations and constraints, with evidence in section 2:

- per-kind port typing;
- port cardinality;
- direction and role rules;
- boundary-port delegation;
- typed ratings;
- compile-time port names;
- a port-level index.

A project-owned schema is clearer. The library can still serve as an export format.

**Incremental, or breaking?** Incremental. The network already has serials, so:

1. it becomes the identity registry;
2. the catalogue's `asset-NNNN` and `valve-NNNN` become aliases mapped to serials, in one table;
3. the drawn views bind through an adapter (serial → today's world address);
4. a later world version moves saved state to serial keys, with a migration from the alias table.

There's no big bang, and no save is lost.

**First narrow production slice:** the footbath, plant room `PL4` (section 7).

**What extra invariants are needed?**

- **Uniqueness:** of serials, proximal IDs and tags, aliases included.
- **Cardinality per port:** 1 for a machine port, n for a header or junction.
- **Ratings:** a connection's medium and rating fall within both ends' (voltage and phases equal; current at least the load's; a pressure class covering the source's maximum).
- **Electrical return and reference:** every load port reaches a source of the same system (voltage, phases, frequency) through protective devices. Its circuit edge carries line, neutral and earth together, an explicit approximation for the game.
- **Fluid mixing:** a medium changes only inside a node kind that declares the change (an injection point takes water and chemical and gives water; a boiler takes gas and gives flue gas). A heat exchanger keeps two separate circuits.
- **Control to target:** every control node names exactly one existing target and a command its kind accepts.
- **Instrument to reading:** every indicator names one live address of the right quantity.
- **Placement:** every visible node is placed exactly once.

**What can TypeScript reject, and what needs runtime validation?** TypeScript catches authored mistakes when ports and media are literal types in a kind registry, not plain strings: a misspelt port, the wrong medium, a port of the wrong role. Runtime is needed for whole-graph or numeric properties: cardinality, required ports left unconnected, ratings, uniqueness, reachability, bindings to things built dynamically, and anything loaded from data. Examples are in section 6.

**Does prompt 013 fairly test the architecture?** Not the contract. It is a good test of the _simulation_ (an energy ledger, finite fuel, a power cut). But its graph is about ten flat nodes, so it never meets the parts most likely to fail: hierarchy, visual and control bindings, cardinality, ratings and identity across a move. The smallest change that would expose a weakness is to make the boiler a composite with three children (a switch, a FLAME lamp, a temperature gauge), bound by graph ID, and to add the negative fixtures of section 9.

## 6. A TypeScript contract sketch

```ts
// Quantities: a number with its dimension in the type.
type Unit = 'V' | 'A' | 'Hz' | 'bar' | 'm3/h' | 'kg/h' | 'kW' | 'g/h';
interface Quantity<U extends Unit> {
  value: number;
  unit: U;
}

type Medium =
  | 'pool-water'
  | 'make-up'
  | 'drainage'
  | 'lthw'
  | 'natural-gas'
  | 'flue-gas'
  | 'hypochlorite'
  | 'acid'
  | 'ozone'
  | 'ac-400v-3ph'
  | 'ac-230v'
  | 'signal-24vdc'
  | 'air';
type Role =
  | 'suction'
  | 'discharge'
  | 'inlet'
  | 'outlet'
  | 'drain'
  | 'supply'
  | 'load'
  | 'command'
  | 'reading'
  | 'through';

interface PortSpec<M extends Medium = Medium, R extends Role = Role> {
  medium: M;
  role: R;
  required: boolean;
  /** How many connections it takes: 1 for a machine, 'many' for a header. */
  cardinality: 1 | 'many';
  rating?: Partial<
    Record<'voltage' | 'current' | 'flow' | 'pressure', Quantity<Unit>>
  >;
}

/** Each kind declared once; a node's ports are its kind's, never its own. */
const KINDS = {
  pump: {
    ports: {
      suction: {
        medium: 'pool-water',
        role: 'suction',
        required: true,
        cardinality: 1,
      },
      discharge: {
        medium: 'pool-water',
        role: 'discharge',
        required: true,
        cardinality: 1,
      },
      power: {
        medium: 'ac-400v-3ph',
        role: 'load',
        required: true,
        cardinality: 1,
        rating: { current: { value: 55, unit: 'A' } },
      },
    },
  },
  acidStore: {
    ports: {
      outlet: {
        medium: 'acid',
        role: 'outlet',
        required: true,
        cardinality: 'many',
      },
    },
    finite: true,
  },
  // …
} as const satisfies Record<
  string,
  { ports: Record<string, PortSpec>; finite?: boolean }
>;

type Kind = keyof typeof KINDS;
type PortName<K extends Kind> = keyof (typeof KINDS)[K]['ports'] & string;
type MediumOf<
  K extends Kind,
  P extends PortName<K>,
> = (typeof KINDS)[K]['ports'][P]['medium'];

interface NodeRef<K extends Kind> {
  serial: number;
  id: string;
  kind: K;
}

/** Join two ports: the second's medium must be the first's, in the types. */
declare function connect<
  A extends Kind,
  PA extends PortName<A>,
  B extends Kind,
  PB extends PortName<B>,
>(
  from: NodeRef<A>,
  fromPort: PA,
  to: NodeRef<B>,
  toPort: PB & (MediumOf<B, PB> extends MediumOf<A, PA> ? PB : never),
): void;

/** A composite's boundary port, delegated to one child's port. */
declare function expose<P extends Kind, C extends Kind>(
  parent: NodeRef<P>,
  port: PortName<P>,
  child: NodeRef<C>,
  childPort: PortName<C>,
): void;

/** A control commands a target; an indicator reads a live address. */
declare function commands(
  control: NodeRef<Kind>,
  target: NodeRef<Kind>,
  command: string,
): void;
declare function reads(
  indicator: NodeRef<Kind>,
  address: `${number}:${string}`,
): void;
```

**Rejected at compile time** (with literal kinds):

```ts
connect(p1, 'sucton', f1, 'inlet'); // 'sucton' is not a PortName<'pump'>
connect(acid1, 'outlet', p1, 'suction'); // 'acid' does not extend 'pool-water'
```

**Caught only by the runtime validator:**

```ts
connect(p1, 'discharge', f1, 'inlet');
connect(p2, 'discharge', f1, 'inlet'); // f1.inlet has cardinality 1: two connections
// and: a pump's power from a 230 V way (ratings are numbers); a required port left
// unconnected (a whole-graph property); a dosing pump built from data naming a store
// that does not exist.
```

Media as plain strings give no compile-time safety, as the prompt warns. These checks work only because each kind's ports are `as const` literals, and `connect` constrains them.

## 7. The smallest migration slice, and rollback

**Slice: the footbath (`PL4`).** It is the first operation the owner chose (drain and refill), it already has an identified part tree with world state (`identification.ts`, `World.identifiedPlant`), and it is small:

1. Declare the footbath cabinet's kind, with children (pump, suction valve, return valve RV, drain-down valve WV, make-up valve) and delegated boundary ports (pool supply and return, make-up, drain, power). Give every part a serial.
2. Replace the network's single packaged-set node `pl4.cab1` with that composite, so the drain-down line-up is solved through the cabinet's real valves. The network's existing tests must still pass.
3. Add an alias table from today's footbath part addresses and catalogue IDs to serials. Bind the drawn cabinet's controls through an adapter (serial → current world action), so the saved world is unchanged.
4. Bijection test for `PL4`: drawn controls and parts ↔ visible graph nodes. Then play the drain-and-refill procedure through the views' actions and assert the network's flows.

**Rollback:** steps 1 to 4 change no saved data, and only replace one network node and add an adapter. Reverting the commits restores today's behaviour exactly. The world's state moves to serial keys only in a later, separate step, with its own `WORLD_VERSION` and migration, once the slice has been played. Make the same change room by room after that, the Olympic plant room's 40 valves last.

## 8. Acceptance tests

1. **Identity:** serials, proximal IDs, tags and aliases are all unique. Each catalogue `asset-NNNN` and `valve-NNNN` resolves to exactly one serial, and no tag has two meanings. Today this fails on F1, which is the point.
2. **Bijection per room:** for `PL4`, every placed non-decorative view resolves to one visible node, and every visible node is placed once. Unbound, duplicate and orphan lists are pinned to zero for that room, and listed for the others.
3. **Ports:** each node's ports equal its kind's. Every required port is connected, and no port has more connections than its cardinality.
4. **Negative fixtures:** suction to suction; acid to pool water; power to a signal input; a 230 V load on a 400 V way; a doubly connected cardinality-1 port; an edge to a parent's port that delegates nothing. Each is rejected with its own message.
5. **Delegation:** an edge to `pl4.cab1.makeUp` flattens to the make-up valve's inlet. The drain-down line-up, played through child valves, empties the footbath at its rate.
6. **Control causality:** operating the drawn return valve's control (headless) shuts `pl4.cab1.rv1` in the network, the solved return flow falls to zero, and the cabinet's indicator snapshot shows it.
7. **Move:** changing a node's room keeps its serial and its saved state. A removed node's serial is retired and never reissued (already tested in `serial-register.test.ts`).
8. **Save:** a world saved before the slice loads after it, with the same footbath valve positions.

## 9. Proposed edits to prompt 013

Exact edits, to be made by the owner or with their approval:

1. In "Physical setup", after the first paragraph, add: "Make the boiler a composite node with three child parts of its own: an ON/OFF switch, a FLAME lamp and a flow-temperature gauge, each with its own serial and a hierarchical proximal ID (`bh.b1.sw1`, `bh.b1.l1`, `bh.b1.ti1`). The boiler's fuel, flue, water and power ports are boundary ports, each delegated to one child or internal port. Add one tee where two water flows of different temperatures meet."
2. In "Calculations", add: "At the tee, mix by mass-weighted energy (constant specific heat); do not average temperatures."
3. Replace the first sentence of "The topology validator must reject…" with: "Use a project-owned typed schema: a kind registry whose ports are literal types, and a typed `connect`, so that a misspelt port or a wrong medium fails to compile. `@statelyai/graph` may be used as an export, checked by `getGraphIssues`, but not as the source of the rules. The runtime validator must reject missing required ports, incompatible media, invalid role pairings (suction to suction), a cardinality-1 port connected twice, a load whose rated voltage differs from its supply's, an edge to a parent port that delegates nothing, and a finite store declared as a boundary."
4. In "Acceptance checks", add a check 6: "Operating the boiler's switch by its graph ID, headlessly, starts and stops the boiler in the simulation; the FLAME lamp's and the gauge's snapshots follow the world's state, not the switch's. Moving the boiler to another room keeps its serial and its state."
5. In check 4, after "Tests exercise topology errors", add: "(one fixture for each rejection listed in the validator paragraph, each with its own message)".

These keep 013 small, at about a dozen nodes, while making it test the contract's hard parts rather than only the energy ledger.

## 10. Requirements worth changing

- **Outcome 1** asks for "one graph identity and one catalogue entry". Better: the catalogue _is_ a view of the graph, generated from it, so there is nothing to keep in step.
- **Outcome 5's gas example** of "10 g/h" is a dosing-pump scale. A boiler's gas line is rated in standard m³/h (or kg/h) with a pressure class in mbar, which avoids a misleading unit in the reference design.
- **Outcome 3's "direction":** specify it as an installation role with pairing rules, and leave flow sign to the solver (F4).
- **Prompt 014's** "every graph node that should be visible is placed exactly once" should allow a node drawn in several places as views of one state, as mimic boards already are (`doc/plans/part-naming.md` §9). The rule should be one _primary_ placement in its room, plus any number of declared remote views.
