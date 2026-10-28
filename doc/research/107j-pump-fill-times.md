# 107j research: the pumps' fill times, worked

Working notes for `doc/prompts/107j-world-of-pumps.md` ("Research: what the hall holds"). Researched 2026-10-28. Figures marked _indicative_ were not confirmed against a maker's datasheet.

## The system every pump pumps into

The ideal source CW1 is at floor level (open, atmospheric). TK1 stands on a stand about 0.4 m high and is 1.15 m to its overflow, so its fill inlet, entering from above, is about 1.7 m above the source. That 1.7 m is the static lift for every pump (the half-full reference level changes nothing, since the inlet is above the water). Tank: 1,000 L over π × 0.55² ≈ 0.95 m², so about 1.05 mm of level per litre.

## Positive-displacement pumps

1.7 m is 0.17 bar, against ratings of 10 to 16 bar: their delivery against it is their nameplate within a percent or so. Fill time = 1,000 L ÷ rate.

| Pump       | Rate    | 1,000 L ÷ rate | Sign           |
| ---------- | ------- | -------------- | -------------- |
| DMX 1602   | 2.1 l/h | 476 h          | about 20 days  |
| DDS 7.5-16 | 7.5 l/h | 133 h          | about 5½ days  |
| DMH 21-10  | 21 l/h  | 47.6 h         | about 2 days   |
| PERI 30    | 30 l/h  | 33.3 h         | about 33 hours |

## Centrifugal pumps: the curve meets the system

The game's curves are H = H₀ − kQ². A 1.7 m lift is far below every pump's duty head, so left alone each runs out to the right of its curve, faster than its nameplate, not slower:

- Lounge NKC (`PUMP_CURVE`, H₀ 15 m, 9.6 m at 160 m³/h, so k = 2.11 × 10⁻⁴): with a DN150 fill line losing about 1 m at 160 m³/h (r ≈ 3.9 × 10⁻⁵), 15 − 2.11e-4 Q² = 1.7 + 3.9e-5 Q² gives Q ≈ 231 m³/h, 144 % of duty.
- NKC 150-315 (dev51, H₀ 22 m, 18 m at 300 m³/h, k = 4.44 × 10⁻⁵): with a DN200 line losing about 1.5 m at 300 m³/h, Q ≈ 577 m³/h, 192 % of duty.

A real end-suction pump cannot run there: its curve ends at roughly 120 to 130 % of best-efficiency flow, its motor overloads and it cavitates. Real practice (a commissioning, double-regulating valve on the discharge, set at commissioning) throttles each pump back to its duty. Recommended: each centrifugal pump's fill line carries its own commissioning valve, a fitting of the schematic with its tag, set (normal state "set to duty") so the line's resistance puts the pump at its nameplate point. Then each sign's time is 1,000 L over its duty flow, and the model gives it honestly.

Hydraulic power check (P = ρgQH, η assumed):

- Lounge NKC: 1000 × 9.81 × (160/3600) × 9.6 = 4.2 kW; at η 0.75, 5.6 kW shaft: a 7.5 kW motor. Consistent.
- NKC 150-315: 300 m³/h at 18 m = 14.7 kW; at η 0.80, 18.4 kW: a 22 kW motor. Consistent.
- Showpiece: 625 m³/h at 20 m = 34.1 kW; at η 0.85, 40 kW: a 45 kW motor. Consistent.

| Pump                                                              | Duty                                                            | Fill time        |
| ----------------------------------------------------------------- | --------------------------------------------------------------- | ---------------- |
| Transfer pump (Iwaki MX class), _indicative_                      | about 6 m³/h (100 l/min) at about 10 m                          | about 10 minutes |
| Sump pump (Unilift AP12 class)                                    | about 3 l/s, 10.8 m³/h (Grundfos's sizing flyer's 3.0 l/s line) | about 5½ minutes |
| Spa pump (repo: BADU Prime 7)                                     | 7 m³/h                                                          | about 8½ minutes |
| Twin-head circulator (repo: MAGNA3 D 65-120 F), _indicative duty_ | about 30 m³/h at about 8 m (one head)                           | about 2 minutes  |
| Lounge NKC                                                        | 160 m³/h                                                        | 22.5 seconds     |
| NKC 150-315                                                       | 300 m³/h                                                        | 12 seconds       |
| Split-case showpiece                                              | 625 m³/h                                                        | 5.8 seconds      |

## The Olympic showpiece's basis

An Olympic pool is 50 m × 25 m; at the 2 m minimum depth that is 2,500 m³ (3,750 m³ at the 3 m depth World Aquatics recommends). Turned over in four hours: 625 m³/h. A Grundfos HS (horizontal split case: axially split casing, double-suction impeller) covers 10 to 2,500 m³/h, 5 to 148 m, 1.5 to 600 kW at 50 Hz, so 625 m³/h at 20 m on a 4-pole 45 kW motor (1,480 rpm) sits well inside the range; the exact HS size was not confirmed (_indicative_).

## Sources

- Grundfos HS brochure and data booklet: <https://api.grundfos.com/literature/Grundfosliterature-6142401.pdf>, <https://www.motralec.com/public/fichiers/docs/grundfos-hs-.pdf>, <https://www.lavastica.com/pumps-valves/pumps/centrifugal-pumps/Grundfos-HS/>
- Grundfos Unilift AP12: <https://www.pumpa.eu/en/grundfos-unilift-ap12/>, <https://pumpsonline.co.nz/products/grundfos-unilift-ap-series>, <https://digitalassets.reecegroup.com.au/m/bc1c8f9bb6e34067/original/Flyer-Grundfos-UNILIFT-AP12.pdf>
- Iwaki MX series range (90 to 800 l/min): <https://technology.bibus.com/ua-en/products/itm/magnetic-centrifugal-pumps-mx-series-plastic/>
- The repo: `src/game/plant/circulation.ts` (`PUMP_CURVE`), `src/game/plant/ideal-pool-plant.ts` (NKC 150-315, shutoff 22 m), `src/toolkit/components/plant/logic/diaphragm-pump.ts`, `motor-dosing-pump.ts` (DMH after ProMinent Sigma/1), `metering-pump.ts` (PERI 30 after Qdos 30), `views/spa-pack-parts.ts` (BADU Prime 7: 7 m³/h, 0.3 kW), `views/boiler-plant.ts` (MAGNA3 D 65-120 F, plate 45 m³/h 12 m), `views/chemical-handling-kit.ts` (Iwaki MX class), `src/game/plant/site-intake.ts` (`PIT_PUMP` 1.5 kW).
