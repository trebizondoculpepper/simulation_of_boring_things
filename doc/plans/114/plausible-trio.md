# 114: a more plausible Trio, measuring only what a probe can

The owner, 2026-10-31, after hearing what real machines did (plant-room controllers like Depolox, Dulcomarin and BECSys, which sample continuously and dose; pool-shop analysers like BioGuard's ALEX and LaMotte's WaterLink Spin Touch, which test one sample for many readings and recommend a dose): we could imagine a more plausible Trio, which measures continuously only what can be measured continuously, and periodically asks for the rest from a test kit through a data-entry screen, then works out its recommendation. This is the decision the brief left for when test kits arrive (its "Analysis (deliberate science fiction)" bullet). Nothing is built; the questions at the end are for the owner.

## What it measures, and what it asks for

| Reading                                 | How                                                           | On the Trio                                             |
| --------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------- |
| Free chlorine                           | Amperometric probe in the flow cell                           | Continuous                                              |
| pH                                      | Glass electrode                                               | Continuous                                              |
| Redox (ORP)                             | Platinum electrode                                            | Continuous (new: a reading the water status page gains) |
| Temperature                             | Probe                                                         | Continuous                                              |
| Conductivity, and TDS estimated from it | Conductivity cell                                             | Continuous (TDS shown as an estimate)                   |
| Combined and total chlorine             | DPD 1 and DPD 3 tablets, a comparator or photometer           | Asked for: daily                                        |
| Total alkalinity                        | Titration or photometer                                       | Asked for: weekly                                       |
| Calcium hardness                        | Titration or photometer                                       | Asked for: weekly                                       |
| Sulphate                                | Turbidimetric tablet                                          | Asked for: monthly                                      |
| Balance (LSI)                           | Worked out from pH, temperature, TDS, alkalinity and hardness | Calculated, only as fresh as its oldest entered reading |

## The data-entry screen

- A **Manual tests** page (its own tab, or reached from Dr Aqualis): each asked-for reading with its last value, when it was entered, and when it is next due; an on-screen numeric keypad in the Aero style; OK and Cancel.
- On OK it "computes" (a short progress bar, Dr Aqualis consulting his clipboard), then gives his diagnosis and recommendation with the new values.
- **Staleness:** a reading past its due date is shown amber, then red; Dr Aqualis nags ("I haven't seen an alkalinity for nine days. Would you test it for me?"); the balance is marked as estimated while any input is stale.
- **Garbage in, garbage out:** the Trio believes what it is told. A mistyped or misread entry (12 for 120) gives confident, wrong advice and a wrong Show dose: a fault to find, and the reason a careful operator double-checks.

## How it fits the rest

- **The models:** the sampler splits into continuous probes (with drift and fouling, as `sampling.ts` already models) and the entered readings (value, time entered); the advisor takes both, with each reading's age, and says when its advice rests on a stale reading. The controller is unchanged: it only ever needed free chlorine and pH.
- **The test kits:** when the hand-dosing game brings test kits as items, the player tests the water with one (a DPD comparator, a titration kit, a photometer) and types the results in. Until then, dev58 can offer a "test kit" stand-in that reads the rig's water (with a small reading error) for the player to enter.
- **The Post-it:** this Trio has less to apologise for; the developer's note could move to the science-fiction version, or say something else.

## Questions for the owner, one at a time

1. Does the plausible version replace the science-fiction analyser, or sit beside it (a setting, a model in the series, or a scenario choice)? Recommended: it becomes the Trio, and the science-fiction analyser is kept only as a setting for play before test kits exist.
2. The test intervals (daily, weekly, monthly as proposed, after PWTAG's routine).
3. Whether the Trio should refuse to recommend a hand dose from a stale reading, or recommend it with a warning.
