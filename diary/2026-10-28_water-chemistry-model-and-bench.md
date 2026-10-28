# Development Diary Entry - 2026-10-28

## Context

| Time      | Branch | Commit   | Task                                                             |
| --------- | ------ | -------- | ---------------------------------------------------------------- |
| 12:50 UTC | main   | 591cc669 | Survey water-chemistry models; write our own; test it in a bench |

## What we were asked to do

The owner wanted the water chemistry tested in the abstract before it goes into the game, and asked whether someone had already published a model that simulates it. During the work the owner chose to take an existing study and write our own version, to treat each circuit as at least two zones (balance tank and pool), and to test it by problem-and-treatment scenarios in three phases (steady, problem, treatment), with charts to look at. The owner also asked whether the full set of chemistry changes our complexity much, and whether a circuit can be one black box.

## What we did

Surveyed PHREEQC and its bindings and WASM builds, the EPA's chloramine simulators, EPANET-MSX, WaterTAP, Reaktoro, PyCO2SYS, pool calculators and the pool studies (Bristol, Keuten, Schmalz, Blatchley, Wojtowicz, Berg), checking every licence through the GitHub API and PyPI. Installed the MIT `phreeqc` Python bindings in a scratch virtual environment and ran PHREEQC 3.8.6 on pool waters; ported the EPA simulator's Jafvert & Valentine model to Python with SciPy; saved both as JSON fixtures. Wrote `src/game/water/pool-chemistry.ts` (17 species a zone, each process exact over the step), the bench `chemistry-bench.ts` with ten scenarios, one zone against two, and the game's four pools from the world's own data, the tests beside them, and an HTML report of charts. Wrote `doc/research/water-chemistry-models.md`.

## What came out

All 57 model tests and 40 scenario checks pass, the carbonate system within 0.03 pH of PHREEQC and the chloramines within 0.1 mg/l of J&V from an hour on. No constant was changed to make a scenario pass; three thresholds and two procedures that I had set wrongly were corrected and recorded. The bench found things the earlier notes had not: inorganic chloramine breaks point in minutes, so a pool's combined chlorine is organic and trichloramine; Wojtowicz's CO₂ loss drains alkalinity below PWTAG's 80; PWTAG's thiosulphate dose implies the tetrathionate product, which raises pH by over a unit after a shock; and dosing into the return keeps the pool above its sample. The full set costs about 1.1 µs a zone-step; its real cost is calibration.

## What we learned

Run the reference engines rather than reason about them: PHREEQC installed from PyPI in a minute, and the EPA's R code ported cleanly to SciPy, so the fixtures are real. A scenario that fails first is as often a wrong threshold or an incomplete procedure as a wrong model, and the difference has to be written down. Fluxes reported in kilograms instead of grams were caught at once by the exact mass-balance test, which is why that test exists.

## Next steps

The owner's seven questions in the note's §11, one at a time; then the installing mission (the note's §10): two zones a circuit in the world, hand dosing at every balance tank, dosing into the return, the `sampling.ts` controller, pumps sized by demand.
