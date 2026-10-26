# 070: The water's condition, carried through the plant

Status: partly done (checked 2026-10-26): the condition record and its rules, the dev40 filter rig and the dev41 bench (filter, boiler, dosing, UV) are built, and the world's pools carry suspended solids through ideal filters on every pool; the rest of the condition is not yet in the world.

## Review checkpoint — 2026-10-26

**Classification:** Partial / active. **Filed:** `doc/prompts/070-water-condition.md`.

**Delivered:** partly done

**Still outstanding:** Retain the prompt’s required work and current root TODO entries.

**Evidence:** Current prompt, its Remaining section and source check. Reviewed against source `e5078c4`.

The original request and earlier implementation notes below are retained as history; this checkpoint supersedes any conflicting old completion claims. Outstanding work remains open in the root TODO.

## The request

The owner, 2026-10-25: besides its volume, and its pressure and temperature, water has a condition: "it could contain chlorine, ozone, it could contain dirt." For now every water source should carry "just the core values", and each machine should be a black box that adjusts them: a filter "would reduce the amount of … suspended particulates, maybe reduce the temperature ever so slightly towards ambient"; a boiler "would be a machine that updates the temperature of water". "A lot of things in our game follow from being able to simulate different kinds of water conditions."

## What there is now (checked 2026-10-25)

- **Pools** (`src/game/plant/pools.ts`) keep temperature, pH, free chlorine, combined chlorine and redox, each its own stand-in: free chlorine and pH approach fixed targets while dosing runs, combined chlorine drifts up or (with UV) down at fixed rates. There is no mass balance, no bather load, and nothing travels with the water: a pool's condition is not carried to its balance tank, its filters, its plant or its drains.
- **Dirt** exists only inside the filter models (`five-valve-filter.ts`, `multiport-filter.ts`, `lounge-filters.ts`) and the ideal filter (`ideal-filter.ts`, dev40), as a fixed concentration in the water they see. The ideal filter's rig is the only place water carries a dirt concentration from a source through a machine to a sink.
- **Temperature** is a pool's and its hall's (`thermal.ts`), heated by an abstract heat service; the heat exchangers, boilers and calorifier carry no water temperature of their own.
- **Bathers** (`bathers.ts`) are counted per pool and hour, but nothing in the plant reads them (the CCTV research, `doc/research/2026-10-25-cctv-ghost-bathers.md`).

## The owner's ruling: chemistry only where it matters (2026-10-25)

Water chemistry is not simulated for every water. The heating loop (LTHW), the domestic hot water and the chilled water carry their temperature alone (`ThermalWater`), since their chemistry does not matter to normal operations; so may other parts of the simulation where it does not. The full condition is for the treated waters: the pools', the mains', the drains'.

## The owner's ruling: packaged cabinets are black boxes (2026-10-25)

The jacuzzi's and the foot spa's cabinets are modelled as black boxes: their internal components (pump, filter, valve, heater, UV, dosing) are not separate parts of the model. Each cabinet's physics and chemistry are driven by its own internal state (its programme, its filter's bed, its water's condition) and its inputs. The two are the same product at two sizes, with one control panel; the jacuzzi adds an auxiliary panel for its jets and blower.

## The design

1. **One value: the water's condition.** A small immutable record carried by every body of water and every flow:

   | Quantity          | Unit                               | Notes                                                                                       |
   | ----------------- | ---------------------------------- | ------------------------------------------------------------------------------------------- |
   | Temperature       | °C                                 |                                                                                             |
   | Suspended solids  | g/m³                               | What a sand filter removes; turbidity (NTU) is derived from it, for instruments and the eye |
   | Free chlorine     | mg/l                               | Hypochlorous acid and hypochlorite, the disinfectant                                        |
   | Combined chlorine | mg/l                               | Chloramines: chlorine bound to bathers' pollution, the "pool smell"                         |
   | pH                | –                                  |                                                                                             |
   | Organic load      | mg/l (as a bather-pollution index) | Sweat, urine, skin: what uses up free chlorine and forms combined chlorine                  |

   Pressure and flow are not the water's: they belong to the pipe network and its solver, as now. Redox (ORP) and turbidity are not carried: they are derived where an instrument reads them.

2. **Volumes hold a condition; flows carry their source's.** A pool, a balance tank, a filter's vessel, a contact tank: each holds one well-mixed condition. A flow leaving a volume carries that volume's condition. Where flows meet (a header, a tank), conditions mix in proportion to flow (into a volume, in proportion to the volumes). Temperature mixes the same way, taking every water's heat capacity as equal. pH does not truly mix linearly (it mixes through alkalinity); the core model mixes it linearly and says so, until water balance (alkalinity) is added.

3. **Machines are black boxes on a flow:** each takes the condition in, its own state and the step, and gives the condition out and its next state. The first set:

   | Machine                          | What it does to the water                                                                                                                                                                                         |
   | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | Ideal filter (sand)              | Removes suspended solids by its capture (`ideal-filter.ts`); passes dissolved things through untouched (a sand filter does not remove what is dissolved); loses a little heat to its room by its vessel's surface |
   | Heater: boiler or heat exchanger | Raises temperature by its delivered heat over flow (ΔT = P / (ρ c Q)), up to its primary's temperature                                                                                                            |
   | UV unit                          | Breaks down combined chlorine (and some organic load) by its dose, while lit                                                                                                                                      |
   | Ozone and contact tank           | Oxidise organic load and combined chlorine; an ozone residual is for the hazards tier                                                                                                                             |
   | Hypochlorite dosing              | Adds free chlorine (and raises pH slightly) by the volume dosed                                                                                                                                                   |
   | Acid dosing                      | Lowers pH                                                                                                                                                                                                         |
   | Pool                             | Bathers add organic load, solids and a little heat; free chlorine reacts with organic load, forming combined chlorine; water evaporates and loses heat to the hall                                                |
   | Pipes, valves, pumps             | Nothing (a pump's heat is negligible)                                                                                                                                                                             |

4. **Sources and sinks.** Every source has a condition: an ideal source's set on its rig; the town's main cold, clean and unchlorinated; a dosing pump's its chemical's. Sinks (waste, sewer) take what comes.

5. **Instruments read the condition, and say only what they show** (the owner's rule, 2026-10-25): a turbidity meter shows NTU, a chlorine analyser free and combined chlorine, a thermometer temperature, a redox probe mV derived from free chlorine and pH. None peeks at anything else.

6. **Reactions are mass balances,** not targets: dosing adds a measured amount, bathers a measured load, reactions consume what they use. The healthy New Game (067) must still hold under them: that is the calibration.

## Stages

1. **The value and its rules:** the condition record, mixing (two flows, a flow into a volume), and the reactions as pure functions, tested against hand calculations.
2. **The ideal filter rig carries it** (dev40): its sources each with a whole condition, the filter as a black box on it (solids out, a little heat lost), its panel and vessels showing temperature and turbidity besides dirt.
3. **Ideal rigs for the other machines,** each in a dev room first: an ideal heater (a boiler or heat exchanger on a flow), dosing, UV and ozone.
4. **The world:** each pool, balance tank and plant flow carries its condition; the pools' stand-in chemistry is replaced by the mass balances; the Olympic's and the lounge's filters move onto the ideal filter; bathers load the water. `WORLD_VERSION` is bumped (the owner allows throwing old saves away when the model changes); mission 067 is rerun, and its bands must hold.

## Out of scope for now

Water balance (alkalinity, calcium hardness, dissolved solids; scale and corrosion), hazards (ozone residual, _Cryptosporidium_), by-products, bromine and stabiliser, and the closed heating circuit's inhibitor. Each is a later tier, added to the same record.

## Questions for the owner (one at a time when reviewed)

1. Bather load: one organic-load index, or separate ammonia-like and organic carbon-like loads (chloramine formation differs)?
2. Temperature: should heat losses on the way (pipes, filter vessels) be modelled at all, or only the pools' and halls'?
3. The town's main: a fixed condition, or one that varies (cold in winter, harder in some areas)?
4. Should the stand-in chemistry be kept for comparison while the new model is checked, or replaced outright?

## Remaining (checked 2026-10-26)

- The owner's four questions: the bather-load model, heat losses on the way, the town main's condition, whether to keep the stand-in chemistry for comparison.
- Stage 3: an ozone and contact-tank rig and an acid-dosing line on the bench, each in a dev room first.
- Stage 4: each pool, balance tank and plant flow carrying a whole `WaterCondition`; the pools' own temperature, free and combined chlorine and pH fields replaced by mass balances, the water loaded with bathers' organic matter.
- Instruments (turbidity, chlorine analyser, redox) reading the condition and showing only what they display.
- `WORLD_VERSION` bumped, mission [067](done/067-healthy-new-game.md) rerun, its bands confirmed.
