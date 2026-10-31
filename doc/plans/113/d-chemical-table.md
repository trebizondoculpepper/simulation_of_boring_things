# 113 (d): the chemical data table

## What and where

A pure table, `src/game/plant/museum-4-doses.ts` beside the tank definitions in `museum-4-lab.ts`, one entry per tank (CT1–CT9, FW1): its physical form (`liquid`, `solid`, `gas`), its unit (from the form: litres for liquids, kilograms for solids and for CO₂ as dispensed from a cylinder by weight, cubic metres for fresh water), its maximum single dose for Hall 4's 500 m³ pool (`VOLUME`), the source of that figure, and two short texts: what it does, and how pools commonly use it. Its five sizes are `max × 10^((i − 4)/2)` for i = 0…4, so Huge is the maximum, Tiny a hundredth, and each step √10 ≈ 3.16 times the last. Amounts are shown rounded to two significant figures, with one decimal place under 10 and none at or above 100 (`formatDose`).

## The maxima (500 m³) and their reasoning

Each figure is the largest single dose a pool operator would sensibly add at once, worked from the product's strength and a target change in the water, cited to PWTAG's Code of Practice and Swimming Pool Water (2017, technical notes TN on breakpoint, pH and alkalinity), HSG179 and suppliers' dosing charts. Where a figure is our own arithmetic from those, the source says so.

- CT1 sodium hypochlorite 14 %: a shock to about +10 mg/l free chlorine: 5,000 g ÷ 140 g/l ≈ 36 l; Huge 40 l (PWTAG superchlorination guidance; arithmetic).
- CT2 calcium hypochlorite 65 %: +10 mg/l: 5,000 g ÷ 650 g/kg ≈ 7.7 kg; Huge 8 kg.
- CT3 hydrochloric acid 10 %: enough to take about 50 mg/l of alkalinity: 500 m³ × 50 g/m³ as CaCO₃ × 0.73 g HCl/g ÷ 100 g/l ≈ 180 l; Huge 180 l (suppliers' acid charts; arithmetic). The model's 10 % strength is a museum simplification of the usual 33 %.
- CT4 sodium bisulphate: about 50 mg/l of alkalinity: 25 kg CaCO₃ × 2.4 ≈ 60 kg; Huge 60 kg.
- CT5 carbon dioxide: a pH trim of about 0.4 in 120 mg/l alkalinity water, around 25 kg; Huge 25 kg (CO₂ dosing suppliers' figures of 0.02–0.05 kg/m³ a day).
- CT6 sodium bicarbonate: +50 mg/l alkalinity: 25 kg × 1.68 ≈ 42 kg; Huge 40 kg (PWTAG: 1.5 kg per 100 m³ raises TA 10 mg/l → 37.5 kg for 50).
- CT7 soda ash: a pH lift of about 0.5: about 10 kg; Huge 10 kg (suppliers' charts).
- CT8 calcium chloride (anhydrous): +100 mg/l hardness: 50 kg CaCO₃ × 1.11 ≈ 55 kg; Huge 55 kg.
- CT9 sodium thiosulphate: to neutralise about 10 mg/l of chlorine: about 5 kg × 1.4 ≈ 7 kg (pentahydrate, at the common 1.4 g per g of chlorine for neutral water); Huge 7 kg.
- FW1 fresh water: a 20 % dilution: 100 m³; Huge 100 m³.

The task forbids pretending that the figures are more than reasoned estimates: the source field says "arithmetic from" where it is.

## The texts

Each description is two or three plain sentences: what the chemical does in the model's terms (taken from the tank's `purpose` and `sideEffects`, written out in full), and how pools commonly use it (hypochlorite the usual disinfectant fed continuously, acid trimmed by a controller, bicarbonate added by hand in bags, and so on).

## Tests

`museum-4-doses.test.ts`: every tank has exactly one entry; every unit matches its form (solid → kg, liquid → l, fresh water → m³, gas → kg); the unit equals the tank's own `unit` in `museum-4-lab.ts`; Huge is the stated maximum; each size is √10 times the last within rounding; every entry has a source and both texts; `formatDose` rounds as stated ("MEDIUM · 4.0 kg").

## Revision after Codex's critique

- Accepted: CT9's maximum was wrong for the model, which takes 5 g of thiosulphate a cubic metre for each 1 mg/l of chlorine removed (`pool-chemistry.ts`, and PWTAG TN23's working figure): 10 mg/l in 500 m³ is 25 kg. Huge is 25 kg.
- Accepted: the rounding is stated by range: under 1, two decimals; 1 to 10, one decimal; 10 and over, whole numbers (two significant figures throughout below 100); the model always gets the unrounded amount, and the ratio test uses unrounded amounts.
- Accepted: each maximum is a practical ceiling for one dose, rounded; CT1's 40 l is about +11 mg/l at the model's 140 g/l and the source says so; CO₂'s figure is a cylinder's practical single trim, its source a supplier's daily rate, said plainly.
- Accepted in part: units and names are checked against `TANKS` by a test (missing and extra ids both fail); the table keeps its own unit so the form-to-unit rule can be tested at all.
- Rejected for now: a specific URL per entry. The sources name the guide and the arithmetic; the owner may wish to tighten them when the PWTAG bands are confirmed.
