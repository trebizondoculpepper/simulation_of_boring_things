# Physical quantities on the plant port graph

The graph describes installed equipment, its ports, and the connections between ports. It does not solve the physics. Its node and port metadata describe stable facts such as medium, phase, nominal voltage, rated current, design flow, pressure class, brand, room, and capacity. Live pressure, voltage, flow, current, temperature, and accumulated energy belong to the world simulation and are addressed by stable node, port, or connection IDs.

## Variables by domain

| Domain        | At a connection point (potential or effort)                                 | Through a connection (flow)                                                 | Carried or stored property                                                                      |
| ------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Electrical    | Voltage relative to a reference; voltage _difference_ across two terminals  | Signed current in amperes                                                   | Energy in joules or kWh; power is voltage difference × current                                  |
| Fluid         | Pressure at a junction; pressure _difference_ across a pipe, valve, or pump | Signed mass flow in kg/s, or volumetric flow in m³/s with density specified | Specific enthalpy and composition move with the fluid; tank mass and internal energy are stored |
| Heat transfer | Temperature at a thermal contact                                            | Heat rate in watts                                                          | Thermal energy stored in the tank and its water                                                 |

At an ideal electrical junction, terminal potentials agree and signed currents sum to zero. At an ideal fluid junction, pressure agrees and signed mass flows sum to zero. These are connection rules, while voltage drop, pressure loss, pump head, and boiler heat output are component or link laws. Modelica uses this potential/flow distinction for both electrical and fluid connectors. [Modelica connector guide](https://doc.modelica.org/om/Modelica.UsersGuide.Connectors.html), [Modelica connector specification](https://specification.modelica.org/master/connectors-and-connections.html).

Temperature needs care: simply averaging incoming temperatures at a tee loses energy when flows differ. Modelica's fluid connector carries specific enthalpy and composition as stream properties, with mixing weighted by mass flow; temperature is derived from the resulting fluid state. We can use a simpler constant-heat-capacity approximation for this game, but preserve the mass-weighted energy balance. [Modelica fluid connector guide](https://doc.modelica.org/om/Modelica.Fluid.UsersGuide.ComponentDefinition.FluidConnectors.html), [stream connector specification](https://specification.modelica.org/master/stream-connectors.html).

The graph's `in` and `out` directions describe allowed _connection orientation_ or intended normal flow. They are not a claim that actual flow can never reverse. The live solver should use signed flow and report reversal where the component permits it. A real electrical installation needs a reference, return, and phase or circuit identity to solve voltage. This game deliberately models electrical service as one supply line: a rated source provides a fixed voltage, loads determine current, and the graph does not claim to represent phase balance or protective conductors.

## Proposed representation

- Equipment definition: stable asset ID, kind, brand, room, capacity, and a port schema derived from kind.
- Port definition: medium, role, connection direction, physical domain, rated limits and units, and whether connection is required. Gas, fresh water, hypochlorite, acid, flue gas, and AC power are different media or service types.
- Connection definition: stable ID, endpoints, physical length and resistance/loss where relevant, and conduit or pipe type. Tees are junction nodes when several flows meet.
- Live world state: per-node storage (fuel mass, tank energy), per-port potential and stream state, per-link signed flow, and accumulated import/export energy. Instruments are separate observations of those values, including their errors.
- External supply or sink: ordinary boundary nodes with declared port schemas and boundary conditions, such as mains voltage, fresh-water pressure, sewer pressure, outside-air temperature, or stack back-pressure. A finite fuel store is a storage node, not an inexhaustible boundary.

Drainage and exhaust are intentionally virtual after they leave the visible room. A drain pipe routes downward to an unseen sewer boundary; a flue routes upward to an unseen exhaust boundary. The graph retains each endpoint and its medium, but the world does not draw underground drains or smoke stacks. Pool-bound plant pipes exit north and main-plant-bound pipes exit south; placed routes must avoid the gantry, doors, and stairs. Those directions and clearances constrain physical placement rather than changing port identity or flow equations.

Ratings are constraints, not instantaneous readings: `400 A` is a maximum current, while `30 g/h` is a dosing capacity. Each numerical field needs a quantity and unit; do not reuse one generic `rating` for pressure, current, volume, and flow without discriminating its dimension. Energy accumulation uses `E_next = E_now + P × Δt`, with seconds-to-hours conversion when displayed in kWh. Keep imported electrical energy distinct from chemical fuel energy, delivered heat, and heat lost to atmosphere.

## Trial result

`src/game/plant/network/port-graph-spike.test.ts` imports the existing network into `@statelyai/graph`, preserves endpoint IDs, attaches room and typed port data, derives ports from equipment kind, and models outside gas, fresh-water, sewer, and flue boundaries. The package checks graph references and port existence. Project-specific validation still has to enforce media compatibility, allowable direction, required connections, ratings, and physical conservation. Use its graph editing API rather than mutating edge arrays directly, because port adjacency queries are indexed.

This is a feasibility trial, not a replacement for the running hydraulic network. The production solver stays the source of physical readings until an incremental migration can preserve its existing behavior.

The independent architecture review in `doc/reports/port-graph-architecture-review.md` recommends adapting the approach: a project-owned kind registry and validator should own the port contract, while a graph package can supply storage and traversal. It also identifies conflicting existing IDs and visual controls that do not yet affect network flow. Production migration therefore needs an ID reconciliation table and an explicit functional visual-to-simulation binding before treating the graph as the installed-world authority.
