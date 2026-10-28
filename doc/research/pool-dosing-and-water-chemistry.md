# Pool dosing and water chemistry: what to simulate, and how

Researched 2026-10-28 for the owner: "I think we need to find out how we can simulate dosing and control of dosing. We'll probably end up having to add some kind of sensors, and that will alter the game. I think the research should also figure out what the basic chemistry is. Also, swimming pool technicians often add by hand other specific chemicals to control the properties of the water." It follows the owner's questions of the same day: whether panels could show litres, kg or moles; whether the system copes with a delivery over or under strength; and how the closed-loop dosing feedback works. This note is the basis for a new mission; it does not write the mission and changes no game code.

It builds on two earlier notes and does not repeat them: `doc/research/pool-water-chemistry-and-biology.md` (2026-10-22: chlorine speciation, the chloramine scheme, bather load, carbon dioxide loss, redox, microbes, UK action levels) and `doc/research/water-sampling.md` (2026-10-20: the sample line, flow cell, probes, makers, which room). Where a fact is already sourced there, this note points to it.

Conventions, as in the earlier notes: statements carry their source as a link. _(derived)_ marks arithmetic I did from sourced numbers (stoichiometry, unit conversion, a fit); _(inferred)_ marks my reasoning from the sources; _(invented)_ marks a number the game would have to make up. Where a source was read only through a search-engine summary, it says so. The PWTAG Code of Practice (July 2021) was read in full from the Guernsey government's copy; the Wallace & Tiernan (Evoqua, now Xylem) DEPOLOX Pool Compact operating manual was read in full. UK rules apply throughout.

## Contents

1. Summary and recommendation
2. The chemistry, quantitatively
3. How dosing is controlled in real plants
4. Strength: deliveries, tanks and the owner's question
5. Chemicals added by hand, and the routine hand tests
6. What the game has now (checked against the code)
7. A proposed model
8. Gameplay
9. Rules to keep
10. Cost, pacing and time acceleration
11. Decisions for the owner
12. Sources

## 1. Summary and recommendation

**The chemistry joins up through moles.** Everything the player can add or measure converts to a handful of quantities in the water: free chlorine (as mg/l Cl₂), combined chlorine, ammoniacal and urea nitrogen, total alkalinity (as mg/l CaCO₃), total carbonate, calcium hardness (as CaCO₃), dissolved solids, and temperature. pH is not a state of its own but follows from alkalinity, carbonate and temperature. Each chemical's effect is a fixed number of equivalents per kilogram (§2.1): sodium hypochlorite adds free chlorine and a little alkalinity; hydrochloric acid removes alkalinity and adds chloride; carbon dioxide adds carbonate without touching alkalinity; sodium bicarbonate adds both; calcium chloride adds hardness and chloride. Carbon dioxide leaving the water is what drives pH up day by day, more than the hypochlorite (earlier note, §3.4).

**Real plants control two things, free chlorine and pH, and nothing else automatically.** A sample of the circulating water runs through a flow cell holding an amperometric free-chlorine probe, a pH glass electrode, a redox probe and a temperature probe; a controller compares each reading with its setpoint and drives a metering pump in proportion, chlorine usually with proportional-plus-integral (PI) control and pH with proportional control (§3.2). It stops all dosing when the sample flow or the circulation fails, when a chemical tank is empty, when a pump has run at 100 % for longer than a set time, and (an option) stops chlorine when pH is too far from its setpoint (§3.3). Alkalinity, hardness, combined chlorine and dissolved solids are never controlled automatically: staff test for them by hand and correct them by hand or by dilution (§5).

**The answer to the owner's question about strength.** A closed loop copes with a weak or strong delivery by itself: it doses by what it measures in the water, not by volume, so a delivery at 10 % instead of 14 % simply makes the pump run 40 % longer and the tanks empty 40 % faster. The first symptom is consumption: litres used per day climbing while the bathing load has not changed. The dosing-time alarm comes last, only if the weak chemical can no longer keep up at the pump's full output. The hydrometer at the fill point catches a watered-down load, but not an aged one: hypochlorite decomposing in store leaves its density almost unchanged, because the salts it becomes weigh what it weighed (§4).

**Recommended model, in five parts (§7):**

1. **Per pool, the water's species as state variables**, stepped by a pure function from what was dosed, what the bathers added, what left (dilution, carbon dioxide, UV) and what reacted; pH solved from alkalinity and carbonate each step. This replaces the targets in `pools.ts` and reuses the mass-balance style of `water-condition.ts`.
2. **Per tank, strength as well as litres** (grams of available chlorine per litre, or per cent w/w for acid), mixed by mass when a delivery or transfer arrives, hypochlorite decaying by its second-order law with its temperature, its chlorate building up.
3. **Per delivery, a strength and a certificate**, and a hydrometer at the fill point that reads its density.
4. **Per pool, a controller with sensors of their own state**: the existing but unused `src/game/plant/sampling.ts` panel, wired to the world, given PI control, pH lockout and sensors whose drift, fouling and failure are state; its outputs become the real pumps' rates in l/h, and what reaches the water is the rate times the tank's strength.
5. **Hand-dosed chemicals as items** the player carries from the store and adds to a balance tank, with the routine hand tests (DPD 1 and 3, phenol red, alkalinity, calcium hardness, TDS) as working instruments.

Every display that today reads the pool's true chlorine and pH (`world-reading.ts`, `lounge-annunciator.ts`, the control room's controller panel, the station schematics) would read the controller's sensor readings instead (§7.6). That is the change that "will alter the game": the instruments can be wrong, and finding out when is the player's job.

## 2. The chemistry, quantitatively

### 2.1 Units, and the moles that join it all up

Concentrations are mg/l, which is g/m³. Three conventions matter:

- **Available chlorine.** Hypochlorite strength and free chlorine are both expressed as the mass of Cl₂ that would do the same oxidising: one mole of NaOCl (74.44 g) or of HOCl (52.46 g) counts as one mole of Cl₂ (70.90 g). So "1 mg/l free chlorine" is 1.41 × 10⁻⁵ mol/l of HOCl plus OCl⁻ _(derived)_.
- **As CaCO₃.** Alkalinity and hardness are given as the mass of calcium carbonate with the same equivalents: 50.04 mg per milliequivalent for alkalinity, 100.09 mg per millimole for calcium hardness ([PWTAG CoP §9.9 and §9.10](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0) give both "as CaCO₃").
- **Strength of a product.** PWTAG gives sodium hypochlorite as supplied "with a maximum strength of 15% weight for weight as available chlorine" ([CoP §6.1](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)). The trade also uses "trade per cent", grams of available chlorine per 100 ml, which is weight per cent times specific gravity ([TroubleFreePool, forum source, via search summary](https://troublefreepool.com/threads/15-sodium-hypochlorite.93570)). They differ by about a fifth: 14 % w/w at a specific gravity of 1.22 is about 171 g/l, 17 trade per cent _(derived)_. The game's "14 %" and the earlier note's "about 140 g/l" are trade per cent; PWTAG's TN23 dosing table implies 128 g/l for its "14 %" sodium hypochlorite (0.156 ml/l for 20 mg/l, below), which looks like a product already somewhat decayed _(derived; inferred)_. Grams of available chlorine per litre is the one unambiguous measure and the one the model should hold (§11, question 3).

**What each chemical does, per gram** _(derived from molar masses and the reactions in §2.2 to §2.6)_:

| Chemical (as added)                        | Formula, g/mol          | Per gram added to 1 m³ (mg/l change)                                                                                  | Notes                                                                       |
| ------------------------------------------ | ----------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Sodium hypochlorite, as available chlorine | NaOCl 74.44 (Cl₂ 70.90) | free chlorine +1.00 (per g Cl₂); alkalinity +0.71 while it is OCl⁻, returned as it reacts; once used, NaCl +0.82 TDS  | the product's excess sodium hydroxide adds a little more alkalinity (below) |
| Hydrochloric acid, as HCl                  | 36.46                   | alkalinity −1.37; chloride +0.97 (TDS)                                                                                | 0.73 g HCl lowers alkalinity by 1 mg/l                                      |
| Carbon dioxide                             | 44.01                   | total carbonate +0.0227 mmol/l; alkalinity 0                                                                          | lowers pH without lowering alkalinity                                       |
| Sodium bisulphate (dry acid)               | NaHSO₄ 120.06           | alkalinity −0.42; sulphate +0.80                                                                                      | 2.4 g lowers alkalinity by 1 mg/l and adds 1.9 mg/l sulphate                |
| Sodium bicarbonate                         | NaHCO₃ 84.01            | alkalinity +0.60; total carbonate +0.0119 mmol/l                                                                      | 1.68 g raises alkalinity by 1 mg/l                                          |
| Sodium carbonate (soda ash)                | Na₂CO₃ 105.99           | alkalinity +0.94; total carbonate +0.0094 mmol/l                                                                      | 1.06 g raises alkalinity by 1 mg/l, and pH sharply                          |
| Calcium chloride, anhydrous / dihydrate    | CaCl₂ 110.98 / 147.01   | hardness +0.90 / +0.68; chloride +0.64 / +0.48                                                                        | 1.11 g (anhydrous) or 1.47 g (dihydrate) raises hardness by 1 mg/l          |
| Sodium thiosulphate pentahydrate           | Na₂S₂O₃·5H₂O 248.18     | free chlorine −1.1 (to sulphate) to −0.14 (to tetrathionate); PWTAG's working figure −0.2 (5 g per mg/l per m³, §5.4) | releases acid as it reacts, so pH and alkalinity fall                       |
| Polyaluminium chloride (as supplied)       | varies                  | not a water-balance chemical: it removes colloids and particles into the filter                                       | dosed continuously, about 0.1 ml/m³ of circulation (§5.5)                   |

**The excess caustic in hypochlorite.** A UK 14–15 % product's specification allows sodium hydroxide up to 1.0 % and sodium carbonate up to 1.5 % ([Molekula technical data sheet, via search summary](https://molekula.com/specification/90028436.pdf)); a US 12.5 % product gives free alkali typically 0.6 % ([search summary of a supplier's certificate](https://www.fpcusa.com/content/uploads/2021/06/Bleach12.5.pdf)). At 0.6 % w/w NaOH, a litre of product (1.22 kg) carries 7.3 g NaOH, 9.2 g of alkalinity as CaCO₃; dosing 1 mg/l of free chlorine from a 171 g/l product therefore adds about 0.05 mg/l of alkalinity _(derived)_. Small, but it never goes away, which is why pools dosed with hypochlorite and carbon dioxide alone see their alkalinity creep up over weeks ([PWTAG CoP §6](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0): "It may be difficult to achieve and maintain a pH of 7.0 with carbon dioxide … and use of a supplementary acid may be necessary") _(inferred)_.

### 2.2 Hypochlorite in water

Sodium hypochlorite dissociates completely: NaOCl → Na⁺ + OCl⁻. The hypochlorite ion takes up a proton to an equilibrium, OCl⁻ + H⁺ ⇌ HOCl, with pKa about 7.5 at pool temperatures. The fraction as HOCl is `α = 1 / (1 + 10^(pH − pKa(T)))`, with `pKa(T) = 1.18×10⁻⁴·T² − 7.86×10⁻²·T + 20.5` (T in kelvin): 7.53 at 28 °C, 7.47 at 37 °C. The earlier note gives the table (α 0.58 at pH 7.4 and 28 °C, 0.25 at pH 8.0) and sources it to the EPA simulator and Morris (earlier note §3.1). PWTAG puts it plainly: "Each 0.5 increase in pH value roughly doubles the chlorine residual needed … At pH 7.5 a free chlorine of 1.0 mg/l is 50% effective" ([CoP §6](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)).

**Free, combined and total.** Free chlorine is HOCl plus OCl⁻ (DPD 1 reads it). Combined chlorine is chlorine bound to nitrogen: mono-, di- and trichloramine and organic chloramines. Total chlorine is free plus combined (DPD 3 reads it); combined chlorine is total minus free ([CoP §9.2](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0), earlier note §3.3). Automatic controllers do not measure combined chlorine (same).

### 2.3 Chloramines, breakpoint and by-products

The earlier note (§3.3) gives the full 14-reaction scheme and a four-variable reduced form. The numbers the dosing model needs from it:

- Ammonia meeting free chlorine becomes monochloramine almost at once (4.2 × 10⁶ M⁻¹s⁻¹ at 25 °C), at **5.07 mg Cl₂ per mg N**.
- Excess free chlorine destroys it over hours (breakpoint): 2 NH₂Cl + HOCl → N₂ + 3 HCl + H₂O, a further 0.5 mg free chlorine per mg combined, **7.6 mg Cl₂ per mg N** in all. Counting hypochlorite as dosed, 2 NH₄⁺ + 3 OCl⁻ → N₂ + 3 Cl⁻ + 3 H₂O + 2 H⁺: it releases acid, about **3.6 mg alkalinity per mg N** oxidised.
- Urea is slow: Bristol's `k_urea = 778.8 M⁻¹h⁻¹` gives a half-life of about 63 hours at 1 mg/l HOCl ([Davis & Bullock 2002](https://www.swimming.org/library/documents/3893/download)).
- Bather demand: 2.8 to 11 g Cl₂ per bather, about two thirds exerted within the first hour (earlier note §3.2).

**Trihalomethanes.** Chlorine reacting with organic matter (bathers' and humic acid in the mains) forms trihalomethanes, chloroform above all; PWTAG names them as "unwelcome", lists humic acid as "a significant precursor", and relies on coagulation, filtration and dilution to keep their precursors down ([CoP §3.2 and §5.5](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)). The CoP sets no numeric THM limit. Elsewhere 100 µg/l total THM is a common benchmark for pool water (Portugal, Poland; [Polish review, via search summary](https://agro.icm.edu.pl/agro/element/bwmeta1.element.agro-b5bd32cd-442d-421f-bb5e-80c9cf013a2f/c/RPZH_2017_Vol_68_No_4_pp._331-337.pdf)). The Bristol model pool reached a steady state in THMs after 200 to 500 hours (earlier note §3.3). For the game THMs are a slow, dilution-limited by-product with no instrument: a laboratory result, if anything _(inferred)_.

### 2.4 Acids, alkalinity and pH

**Carbonate chemistry.** Pool water's pH is set by its carbonate system. With total carbonate C_T (mol/l) and the temperature-dependent constants of the earlier note (pK₁ ≈ 6.35, pK₂ ≈ 10.33, pKw ≈ 13.8 at 28 °C), the alkalinity in equivalents per litre is

`TA = C_T·(α₁ + 2α₂) + Kw/[H⁺] − [H⁺] + FC_OCl·αOCl`

with `α₁ = K₁[H⁺]/D`, `α₂ = K₁K₂/D`, `D = [H⁺]² + K₁[H⁺] + K₁K₂`, and the last term the small part that hypochlorite ion contributes ([EPA CBCS `app.R`](https://github.com/USEPA/Chlorine_Breakpoint_Curve_Simulator), as in the earlier note §3.3). The model holds TA and C_T and solves this for [H⁺], which is monotonic and solves in a few Newton or bisection steps _(derived)_. At our nominal water (pH 7.4, alkalinity 120 mg/l, 28 °C), C_T is 2.6 mmol/l and dissolved CO₂ is about 9 mg/l; in equilibrium with indoor air the same water would head for pH 8.5 _(derived, with Wojtowicz's Henry's-law constant)_: that is the pH the pool drifts towards without acid.

**How each corrector acts:**

- **Hydrochloric acid** (HCl + HCO₃⁻ → H₂O + CO₂ + Cl⁻) removes alkalinity one equivalent per mole and leaves C_T unchanged until the CO₂ it makes escapes. Bringing our nominal water from pH 7.6 back to 7.4 takes 0.073 meq/l, 3.7 mg/l of alkalinity: 2.7 g HCl per m³, or 2.6 litres of 10 % acid per 100 m³ _(derived)_. PWTAG wants it below 18 % "to prevent corrosion in the plant room" ([CoP §6](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)).
- **Carbon dioxide** dissolves as carbonic acid: it raises C_T, leaves alkalinity unchanged, and lowers pH; PWTAG prefers it in soft water (alkalinity up to 150, hardness up to 300 mg/l) and says it is unsuitable above that (same). Because the CO₂ it adds is the same CO₂ that escapes, a CO₂-dosed pool is in a slow tug of war with its own surface _(inferred from Wojtowicz, earlier note §3.4)_.
- **Sodium bisulphate** acts like HCl but adds sulphate, which above 360 mg/l attacks cementitious grout; PWTAG prefers HCl or CO₂ ([CoP §9.12](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)).
- **Sodium hypochlorite** raises pH while it is dosed (OCl⁻ is a base), but as it is consumed it gives the acid back: overall, chlorine dosed and used is close to pH-neutral, and its net push is the excess caustic (§2.1). Breakpoint of ammonia is net acid (§2.3). The rise seen in practice is mostly carbon dioxide loss (Wojtowicz, earlier note §3.4).

**Buffering.** Alkalinity is what resists a change of pH: the same 0.073 meq/l of acid moves water of alkalinity 60 mg/l about twice as far as water of 120 _(derived from the equation above)_. PWTAG's 80 to 200 mg/l is "to ensure effective coagulation and a stable pH" ([CoP §9.9](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)). Low alkalinity makes the pH loop hunt; high alkalinity makes it sluggish and costs acid _(inferred)_. Every litre of acid that holds pH against CO₂ loss also removes alkalinity, so a well-controlled pool's alkalinity falls week by week and is restored by hand with bicarbonate or by the alkalinity of the make-up water (§5.1) _(inferred)_.

### 2.5 Water balance: scale and corrosion

PWTAG: calcium hardness ideally 80 to 200 mg/l as CaCO₃, scale possible above 300 "with sudden changes in temperature and pH"; "The Langelier index is a formula that brings together all these factors. If used calculate Langelier weekly when measuring alkalinity, calcium hardness and TDS"; and pH and free chlorine "take precedence over other factors" ([CoP §9.10, §9.13](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)). The Langelier saturation index is ([Lenntech, via search summary](https://www.lenntech.com/ro/index/langelier-explanation.htm)):

`LSI = pH − pHs`, `pHs = (9.3 + A + B) − (C + D)`, `A = (log₁₀ TDS − 1)/10`, `B = −13.12·log₁₀(T + 273) + 34.55`, `C = log₁₀ CH − 0.4`, `D = log₁₀ TA`

(TDS mg/l, T in °C, CH and TA in mg/l as CaCO₃). Positive tends to deposit scale, zero is in balance, negative tends to dissolve calcium from grout and attack metals. For the game's waters _(derived)_:

| Water                                             | LSI   | Meaning                                   |
| ------------------------------------------------- | ----- | ----------------------------------------- |
| Nominal: pH 7.4, TDS 1,000, 28 °C, CH 200, TA 120 | −0.15 | balanced                                  |
| Same water in the jacuzzi at 37 °C                | +0.02 | balanced; warmer water scales sooner      |
| Soft: pH 7.2, TDS 1,000, CH 100, TA 80            | −0.83 | aggressive: grout etching                 |
| Neglected: pH 7.0, TDS 500, CH 60, TA 60          | −1.34 | strongly aggressive                       |
| Hard and high: pH 7.8, TDS 1,500, CH 350, TA 180  | +0.65 | scale-forming, cloudy water, heater scale |

The TroubleFreePool calcium saturation index (earlier note §3.4) gives almost the same answer and is the better formula if cyanuric acid ever appears. Either is cheap to compute on demand; it need not be stepped _(inferred)_.

### 2.6 Dissolved solids and dilution

TDS "should not be allowed to rise more than 1,000mg/l above the level in the source water"; it is measured weekly with a calibrated electronic meter, and reduced by dilution ([CoP §9.11](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)). Every chemical adds to it (§2.1 table): each mg/l of chlorine consumed leaves 0.82 mg/l of sodium chloride; each mg/l of alkalinity removed by HCl adds 0.71 mg/l of chloride; bathers add salts too _(derived)_. Dilution: PWTAG asks for fresh water "at a rate of 30 litres per bather", backwash water counting towards it ([CoP §3.6](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)). For any species the dilution law is exponential: `C(t) = C_mains + (C₀ − C_mains)·e^(−Q·t/V)`, Q the fresh-water rate _(derived)_. The Olympic pool (2,500 m³) at 1,500 bathers a day takes 45 m³ a day, 1.8 % a day, a time constant of 56 days _(derived)_: dilution is the slow, only cure for TDS, chlorate, sulphate and THM precursors, and it is the main lever on combined chlorine beyond UV.

### 2.7 Chlorine lost to light

Indoor pools lose little to sunlight (glazing stops most ultraviolet) _(inferred)_; PWTAG's reason for cyanuric acid is outdoor sunlight ([CoP §6](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)). The plant's own UV lamps do consume free chlorine: free chlorine absorbs below 350 nm, and medium-pressure lamps reduce it noticeably while low-pressure lamps barely do ([Orenda blog, via search summary](https://blog.orendatech.com/uv-rays-cloudy-days)); a vendor's field tests found 28 % lower free chlorine across medium-pressure chambers on average, over 40 % at one site ([Rec Management, via search summary](https://recmanagement.com/articles/152175/aquatics-latest-surprising-news-uv-technology); vendor figures). PWTAG wants pool UV "medium pressure, 60mJ/cm²" ([CoP §8](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)) and says dosing is "always after the secondary treatment" because UV and ozone "remove or reduce residual chlorine" ([CoP §12.12](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)). For the game: a UV pass removes a fraction of free chlorine (say 10 to 30 %, _invented_ within the vendor range) as well as combined chlorine, which raises the hypochlorite consumption of the pools with UV.

### 2.8 Hypochlorite in storage

Sodium hypochlorite decomposes in the tank, mainly by disproportionation, 3 OCl⁻ → 2 Cl⁻ + ClO₃⁻, with a little oxygen; the rate is second order in hypochlorite, faster when stronger, warmer, contaminated with nickel, cobalt, copper or iron, or in light; "diluting 12.5 wt. % bleach by 50% will reduce the decomposition rate of bleach by a factor of four"; the rate rises 2 to 4 times for every 10 °C ([Bleach Storage Guidelines for End Users, The Chlorine Institute's member guidance as published by TCI](https://assets.noviams.com/novi-file-uploads/tci/pdfs-and-documents/Bleach_Storage_Guidelines_for_End_Users-ed6f4a1b.docx)); "a factor of 3.5 with every 10°C" ([Hill Brothers, via search summary](https://hillbrothers.com/pdf/Product-Profiles/Sodium-Hypochlorite-Stability.pdf)). A 12.5 % solution reaches its half-life in about 180 days at 25 °C and 48 days at 35 °C ([Aqua Magazine](https://www.aquamagazine.com/retail/article/15122551/sodium-hypochlorite-aka-liquid-chlorine)). PWTAG wants it stored cool, out of sunlight, in vented containers, and dosed "under flooded suction with some means of removing any oxygen gas that has collected through degradation" ([CoP §12.9, §12.12](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)).

**A rate law for the game** _(derived)_: `dS/dt = −k(T)·S²`, S in per cent, with `k(25 °C) = 1/(12.5 × 180) = 4.44 × 10⁻⁴` per per-cent-day (from Aqua Magazine's half-life) and `k(T) = k(25 °C)·3.5^((T − 25)/10)` (Hill Brothers). Its exact solution, `S(t) = S₀/(1 + k·S₀·t)`, can be applied over any step. The Aqua Magazine pair (180 and 48 days, a factor of 3.75 over 10 °C) agrees with the 3.5 rule.

| Tank at | 14 %: half-life | after 30 days | after 90 days | 10 %: half-life | after 30 days |
| ------- | --------------- | ------------- | ------------- | --------------- | ------------- |
| 10 °C   | 1,050 days      | 13.6 %        | 12.9 %        | 1,470 days      | 9.8 %         |
| 15 °C   | 560 days        | 13.3 %        | 12.1 %        | 790 days        | 9.6 %         |
| 20 °C   | 300 days        | 12.7 %        | 10.8 %        | 420 days        | 9.3 %         |
| 25 °C   | 160 days        | 11.8 %        | 9.0 %         | 225 days        | 8.8 %         |
| 30 °C   | 86 days         | 10.4 %        | 6.8 %         | 120 days        | 8.0 %         |

So a cool bulk store loses half a point a month, and a day tank in a warm plant room loses a point or two a month; at the game's turnover of days (the day tanks) to weeks (the bulk tanks) the loss is real but small, unless a tank sits warm and unused _(derived; inferred)_. Other published calculators disagree by a factor of two or more (two give 11.4 % and 13.3 % for 16 % bleach after a week at 35 °C; [TroubleFreePool, forum source](https://www.troublefreepool.com/posts/512405)); the game's constant is a choice within that spread.

**Chlorate.** Each gram of available chlorine lost to disproportionation makes 0.39 g of chlorate ion _(derived: 83.45 / (3 × 70.90))_. A tank decayed from 14 % to 11.8 % (22 g/l lost) carries about 8.6 g/l of chlorate, so each mg/l of free chlorine dosed from it brings 0.07 mg/l of chlorate, which only dilution removes _(derived)_. High ionic strength favours chlorate formation ([Teagasc slides citing Gordon et al., JAWWA 1993, via search summary](https://teagasc.ie/wp-content/uploads/media/website/animals/dairy/Chlorates---Karl-Mc-Carthy,-Biocel-Ltd.pdf)). The CoP sets no chlorate limit; it is a laboratory result for the game, a long-term consequence of stale stock and low dilution _(inferred)_.

### 2.9 UK target ranges at a glance

| Parameter         | Target (pools)                                                                                     | Action                                                               | Measured                               | Source                                                                    |
| ----------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------- |
| Free chlorine     | ≤ 1 mg/l (min 0.75) at pH 7.0 to 7.2; 2.0 mg/l at pH 7.2 to 7.4                                    | > 3 reduce dosing; 5 stop chlorination, stop bathing if still rising | controller continuously; DPD 1 by hand | [CoP §9.5](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)            |
| Combined chlorine | as low as possible; < ½ free and ≤ 1 mg/l                                                          | dilution, UV, superchlorination                                      | DPD 3 minus DPD 1 by hand              | [CoP §9.7](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)            |
| pH                | 7.0 to 7.4, ideally 7.0 to 7.2                                                                     | free chlorine raised if higher                                       | controller; phenol red by hand         | [CoP §9.8](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)            |
| Total alkalinity  | 80 to 200 mg/l as CaCO₃                                                                            | lower by dilution or dilute acid; raise with bicarbonate             | weekly, by tablet test                 | [CoP §9.9](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)            |
| Calcium hardness  | ideally 80 to 200 mg/l as CaCO₃                                                                    | > 300 risk of scale                                                  | weekly, by tablet test                 | [CoP §9.10](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)           |
| TDS               | ≤ 1,000 mg/l above the mains                                                                       | dilution                                                             | weekly, calibrated meter               | [CoP §9.11](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)           |
| Sulphate          | ≤ 360 mg/l (cementitious grout)                                                                    | prefer HCl or CO₂                                                    | laboratory, or within TDS              | [CoP §9.12](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)           |
| Langelier index   | about −0.5 to +0.5 _(common practice; the CoP gives no band)_                                      | adjust pH, alkalinity, hardness                                      | weekly, calculated                     | [CoP §9.13](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)           |
| Cyanuric acid     | none (hypochlorite pools); ≤ 100 mg/l with 5 mg/l free chlorine where chloroisocyanurates are used | dilution                                                             | by tablet test if suspected            | [CoP §9.6](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)            |
| Turbidity         | ≤ 0.5 NTU, bottom visible                                                                          |                                                                      | by eye; optional meter                 | earlier note §8                                                           |
| Jacuzzi           | free chlorine 3 to 5 mg/l, pH 7.0 to 7.6                                                           | shock 50 mg/l on failures                                            |                                        | [HSG282](https://www.hse.gov.uk/pubns/priced/hsg282.pdf), earlier note §8 |

## 3. How dosing is controlled in real plants

### 3.1 Measurement, calibration and drift

The sample line, flow cell, its 33 l/h flow and its flow switch are in `water-sampling.md` §1 to §2. What the controller sees from each sensor:

- **Free chlorine, amperometric.** The current is proportional to hypochlorous acid, not to free chlorine as a whole: in the membrane type "the hypochlorous acid (HOCl) … diffuses through the sensor membrane and is reduced to chloride ions", and OCl⁻ does not pass ([Endress+Hauser, via search summary](https://go.endress.com/ch/desinfektion-wasser/en/desinfektion-amperometrisch-technologie)). So the reading depends on pH, by as much as 20 % per pH unit, unless the controller corrects it with the pH reading or the sensor buffers its sample ([WWD, via search summary](https://www.wwdmag.com/chlorinechloramines/dealing-ph-dependence)). W&T's grit-cleaned cell needs pH below 8 to calibrate, and fails its slope check if chlorine stabiliser (chloroisocyanurate) is in the water ([DEPOLOX Pool Compact manual, fault table](https://www.trility.com.au/wp-content/uploads/Depolox-Pool-Compact-OM-Manual.pdf)). Calibration is two points: a zero (with the sample flow stopped; the manual rejects a zero current beyond ±5 µA as dirty electrodes or a leaking valve) and a span against a DPD 1 reading of the sample-cell water (same; [TN39 via `water-sampling.md`](https://www.pwtag.org/residual-control-september-2018/)).
- **pH, glass electrode.** About 59 mV per pH unit at 25 °C (the Nernst slope, RT·ln10/F) _(derived)_. W&T's calibration rejects an electrode whose pH 7 offset is outside −100 to +100 mV or whose slope is outside 46 to 70 mV per pH ([manual, fault table](https://www.trility.com.au/wp-content/uploads/Depolox-Pool-Compact-OM-Manual.pdf)); general practice is an offset within ±30 mV and a slope of 85 to 105 % of theory, the electrode replaced below 85 %, a life of one to two years at room temperature ([Hanna troubleshooting guide](https://pages.hannainst.com/hubfs/006-finished-content/pH_Guides/ph-electrode-troubleshooting-guide--hanna-instruments.pdf), [Yokogawa](https://yokogawa.com/us/library/documents-downloads/technical-information/performing-a-calibration-on-the-ph202)). PWTAG asks for two buffers, normally pH 4 and 9.2, never one ([CoP §9.2](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)).
- **Redox.** Responds to any oxidant and to pH; inferential only (`water-sampling.md` §2; curve in earlier note §3.5). W&T checks it in a calibration solution every 4 to 6 weeks ([manual §7.1](https://www.trility.com.au/wp-content/uploads/Depolox-Pool-Compact-OM-Manual.pdf)).
- **Temperature.** A Pt1000, used for compensation; it barely drifts (`water-sampling.md` §2).
- **Sample flow switch.** A float or vane on the cell; the controller stops dosing after its delay (§3.3).

**Checking and drift.** PWTAG: controller readouts "checked daily against the results from manual tests of the sample cell"; recalibrate pH if the difference exceeds 0.2, chlorine if it exceeds 15 % after a confirming test; log every calibration ([CoP §9.2](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)). W&T's maintenance intervals: flow cell checked for leaks daily, cleaning sand checked weekly and replaced every six months, wear parts in kits for one and four years ([manual §7.1](https://www.trility.com.au/wp-content/uploads/Depolox-Pool-Compact-OM-Manual.pdf)). No source gives drift as a rate in mV or mg/l a day; the game's figures must be _invented_ so that a sensor left alone drifts out of PWTAG's tolerance in about a week to a month:

| Sensor                      | What goes wrong                                      | Suggested game drift _(invented)_                                   | Check, by PWTAG or maker                                |
| --------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------- |
| Free chlorine, grit-cleaned | sensitivity falls as electrodes foul; sand wears out | span −1 to −3 % a day, faster with worn sand; zero ±0.01 mg/l a day | daily DPD comparison; sand weekly, replaced six-monthly |
| Free chlorine, membrane     | electrolyte used, membrane fouled                    | span −0.5 to −1 % a day; dead when electrolyte exhausted (months)   | daily DPD comparison; electrolyte and membrane by maker |
| pH glass electrode          | offset creeps; slope falls with age; junction blocks | offset ±0.005 pH a day; slope −2 % a month; life 1 to 2 years       | daily comparison (0.2); two-buffer calibration          |
| Redox                       | coating, poisoning                                   | −1 to −2 mV a day                                                   | calibration solution every 4 to 6 weeks                 |
| Temperature                 | almost none                                          | none                                                                | occasional                                              |

The existing `sampling.ts` probes already drift linearly in time since fitting (chlorine: 0.002 mg/l and 0.2 % sensitivity an hour; pH 0.001 an hour); those rates are at the fast end (chlorine sensitivity −4.8 % a day) and a day's drift of 0.024 pH is near the table's top _(derived)_.

### 3.2 Controllers

**Control actions.** W&T's DEPOLOX Pool Compact holds chlorine "using PI single feedback closed-loop control" and pH "using proportional control" ([manual §3.6.3](https://www.trility.com.au/wp-content/uploads/Depolox-Pool-Compact-OM-Manual.pdf)); ProMinent's DULCOMETER D1C offers P/PID control with two pulse-frequency outputs for metering pumps ([ProMinent product page](https://prominent.com/en/Products/Products/Measuring-Control-and-Sensor-Technology/Controllers/p-dulcometer-d1cb-d1cc.html)). On/off control exists too, as W&T's "dosing contact" for electrolysis cells, with a hysteresis (e.g. 0.20 mg/l) and minimum on and off times (same manual).

**The parameters** (DEPOLOX Pool Compact, [manual §3.6.4](https://www.trility.com.au/wp-content/uploads/Depolox-Pool-Compact-OM-Manual.pdf)):

| Parameter       | What it is                                                                     | Range                                            |
| --------------- | ------------------------------------------------------------------------------ | ------------------------------------------------ |
| Setpoint        | the value held                                                                 | the measuring range                              |
| Xp              | proportional band, as a percentage: gain = (1/Xp) × 100 %                      | 1 % (gain 100) to 1,000 % (gain 0.1)             |
| Tn              | integral action time; 0 makes it pure P, which "may not … reach the setpoint"  | 0 to 100 min                                     |
| Tp              | cycle period of a pulse-duration output (relay on for Yout × Tp)               | 10 to 180 s; 120 s for slow pumps, 15 s for fast |
| Max. pulses/min | a solenoid pump's full rate (each pulse 0.3 s, pauses 0.2 to 60 s)             | 100, 120, 140, 160 or 180                        |
| Xsh             | neutral zone of a three-point (acid and alkali) pH controller                  | 1 to 5 % of range                                |
| Tu, Ts          | loop dead time and rise time, found by auto-tune, from which Xp and Tn are set | Tu 1 to 60 min; Ts 1 to 480 min                  |

With Xp as a percentage of the measuring range, a chlorine range of 0 to 2 mg/l and Xp = 10 % gives full output 0.2 mg/l below setpoint: the same as `sampling.ts`'s `chlorineBand: 0.2` _(derived)_. The controller's output Yout (0 to 100 %) becomes pulses per minute on a solenoid pump (120 pulses/min at 100 %, 60 at 50 %, 12 at 10 %, the manual's table), a relay duty cycle on a motor pump, or 0/4–20 mA on an analogue pump. The pump's litres per hour are its stroke volume times its stroke rate: the DMX 1602 the game has, 0.19 ml × 180/min, is 2.1 l/h (`diaphragm-pump.ts`).

**Why PI for chlorine and P for pH** _(inferred)_: chlorine demand is a steady load (bathers, UV, decay), so a pure P controller settles below setpoint by the band times the fraction of full output needed; the integral removes that offset. pH's load (CO₂ loss) is slow and the band can be narrow, so P alone holds it close enough.

**Period fit.** The DEPOLOX Pool Compact (2019) is the newest; around 2000 the same functions came in DULCOMETER D1C-style controllers with segment displays (`water-sampling.md` §3). The existing controller exhibit is after DULCOMARIN with its touch screen kept "as a deliberate anachronism" (`sampling.ts`).

### 3.3 Interlocks, limits and failures

From the DEPOLOX Pool Compact ([manual §3.6.7, §3.6.8, §7.2, §7.3](https://www.trility.com.au/wp-content/uploads/Depolox-Pool-Compact-OM-Manual.pdf)) unless stated:

- **Sample water monitoring**, input DI 1, fixed: while its delay runs (0 to 10 min) the pumps "continue dosing at the same rate"; after it, both pumps stop. "Never disable the sample water monitoring – even temporarily, e.g. by bridging the signal input."
- **Circulation monitoring**: "Chemical dosing must switch off if the circulation is switched off or the circulation rate is too low"; wired as Controller Stop, immediate. PWTAG: dosing pumps "should be designed to fail safe and shut themselves off if the circulation system fails" ([CoP §12.12](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)).
- **Tank empty**: suction lance contacts; at minimum level a message, at empty both chlorine and pH dosing stop.
- **Maximum dosing time**, 0 to 10 h: how long an output may run at 100 % before it is switched off, latched, "Maximum dosing time?" ("Determine the cause, e.g. chemical tank empty. Check the dosing pump."). This is the overfeed alarm: a pump at full for hours means the chemical is not reaching the water or not doing what it should.
- **Cl₂ feed lockout on pH** (the "pH priority"): chlorine dosing stops if pH leaves setpoint ± a switch-off range of 0.2 to 1.5 (the example: setpoint 7.20, range 0.40, lockout above 7.60 or below 6.80).
- **Feed delay**, 0 to 60 min, after power-up, a mode change or a stop: dosing waits while the sample settles.
- **Limit alarms**, two minimum and two maximum per measurement, freely set; the measured value flashes when out of range.
- **Calibration faults**: zero current beyond ±5 µA, slope too low, pH offset or slope out of range (§3.1): the calibration is refused, the old one kept.

**Why the flow interlock matters: chlorine gas.** Acid meeting hypochlorite makes chlorine: HOCl + H⁺ + Cl⁻ → Cl₂ + H₂O. PWTAG: "The accidental addition of acid to hypochlorite is the commonest cause of chlorine release incidents in pool buildings. PAC added to hypochlorite has a similar effect" ([CoP §12.10](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)). If the main stops but the pumps keep running, acid and hypochlorite collect at their injection points in standing water, react, and the chlorine is pushed into the pool on restart, as in the investigated hotel incident where the flow switch did not see the stopped main ([Processing magazine](https://www.processingmagazine.com/process-control-automation/instrumentation/flow-measurement/article/55346918/part-l-the-swimming-pool-case), `water-sampling.md` §5). Without the sample-flow interlock, a cell with no flow reads its stale water, its chlorine falls as it is consumed, and the controller calls for more chlorine without limit (`water-sampling.md` §5).

**Sensor failure, and what each does to the water** _(inferred from the control law; these are the playable faults)_:

| Fault                                     | What the controller sees   | What it does                           | What happens to the pool                                                                      | How the player finds out                                                        |
| ----------------------------------------- | -------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Chlorine probe fouled (reads low)         | chlorine below setpoint    | doses more                             | free chlorine high, hall smells, bathers complain; >3 mg/l breaks PWTAG                       | DPD 1 at the pool higher than the controller; daily check > 15 %                |
| Chlorine probe shorted or zero drift high | chlorine above setpoint    | stops dosing                           | free chlorine falls to zero; combined stops forming, bacteria rise                            | DPD 1 low; redox falling while the chlorine reading holds                       |
| pH electrode reads low (offset)           | pH below setpoint          | stops acid                             | pH climbs; HOCl fraction falls; chlorine reading (HOCl-based) falls, so chlorine dosing rises | phenol red higher than the controller; rising hypochlorite use                  |
| pH electrode reads high                   | pH above setpoint          | doses acid, maybe at full              | pH falls, alkalinity drains, corrosion; the maximum dosing time may trip                      | phenol red lower; acid use up; alkalinity test low                              |
| Sample flow lost                          | frozen readings            | doses on for the delay, then stops all | nothing is dosed; chlorine falls over hours                                                   | SAMPLE FLOW LOW, DOSING INHIBITED; the cell's float down                        |
| Sample flow switch bridged or fooled      | frozen readings, flow "OK" | doses without limit                    | chlorine and acid overdose                                                                    | the maximum dosing time trips; DPD at the pool                                  |
| Weak or decayed hypochlorite              | chlorine slow to respond   | doses longer                           | normal, while the pump can keep up                                                            | consumption up per bather; pump output higher; at worst the maximum dosing time |
| Pump lost prime, or a gas lock            | chlorine below setpoint    | full output                            | chlorine falls                                                                                | pump running but day tank level not falling; maximum dosing time                |

### 3.4 Pumps and injection

**Kinds.** Solenoid diaphragm pumps deliver a stroke per pulse (ProMinent gamma, the game's DMX 1602: 2.1 l/h); stepper-motor diaphragm pumps (Grundfos DDA, the game's DDS 7.5-16: 7.5 l/h) take an analogue or pulse signal and smooth their discharge; peristaltic pumps suit small flows and PAC, which PWTAG asks to be dosed by "a peristaltic dosing pump … capable of dosing accurately the small quantities required" ([CoP §5.5](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)). Hypochlorite is best pumped "under flooded suction with some means of removing any oxygen gas" ([CoP §12.12](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)): its decay gives off oxygen, which gas-locks a diaphragm pump, hence the degassing heads and bleed valves the game's pumps already draw.

**Sizing** _(inferred; no UK source gives a rule)_: by the water's demand, not by the tank. Peak demand in litres per hour = peak bathers per hour × chlorine demand per bather (g) ÷ strength (g/l), plus the background (UV, decay); the pump's output should cover it with margin (say 1.5 to 2 times) at the weakest strength the plant expects, while its turndown still meters the night-time minimum. The game's present daily doses (`DOSE_PER_M3_DAY`) convert to these average flows _(derived)_:

| Pool               | Volume, m³ | Hypochlorite, l/h average | Acid, l/h average | Pump shown in the room                                 | Note                                                          |
| ------------------ | ---------- | ------------------------- | ----------------- | ------------------------------------------------------ | ------------------------------------------------------------- |
| Lounge (pool_01)   | 138.9      | 0.35                      | 0.14              | DMX 1602, 2.1 l/h; DDS 7.5, 7.5 l/h                    | comfortable                                                   |
| Olympic (pool_02)  | 2,500      | 6.25                      | 2.5               | DMX 1602, 2.1 l/h (`olympic-plumbing.ts` `hypo-pumps`) | the model draws three times what the pump shown could deliver |
| Jacuzzi (pool_03)  | 2.83       | 0.007                     | 0.003             | DoseCell heads                                         | millilitres an hour                                           |
| Footbath (pool_04) | 0.9        | 0.002                     | 0.001             | DoseCell heads                                         | millilitres an hour                                           |

The Olympic's daily dose (150 litres) is generous for its bathers (earlier note §3.2: 1.8 to 3.5 mg/l a day of demand, against 8.4 mg/l a day dosed), so a demand-driven model would bring it nearer 50 to 75 l/day; even so it needs a bigger pump than a DMX 1602, or two _(derived; inferred)_.

**Injection points and their order.** PWTAG ([CoP §5.5, §12.12](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)): the sample point first, on the pump outlet before anything is dosed; PAC "as far upstream of the filters as possible, but after the chemical controller's sample point", with at least 10 s of contact before the filter ([CoP §8](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)); "pH adjusting chemicals are best dosed downstream from the filters – where possible, after the heat exchanger"; disinfectant before the filter keeps it apart from the acid, but with UV or ozone "dosing is always after the secondary treatment"; chemicals "well mixed with the water at the point of dosing". So on a pool with UV: sample → PAC → filters → heater → UV → hypochlorite → acid (or the reverse, but well apart) → pool _(inferred order; each step sourced)_. Day tanks "reduce the amount of chemical that can be incorrectly dosed into the system should there be a failure" (same).

## 4. Strength: deliveries, tanks and the owner's question

**Does the system cope with a delivery over or under strength?** In real plants, yes, within limits, because the loop is closed on the water (§1). Worked through for the Olympic at today's average (6.25 l/h of 140 g/l, 875 g/h of chlorine) _(derived)_:

| Delivery                  | Pump flow needed | On a 7.5 l/h pump | On a 12.5 l/h pump (2 × average) | What the player sees                                                                                            |
| ------------------------- | ---------------- | ----------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 140 g/l, as ordered       | 6.25 l/h         | 83 % of full      | 50 %                             | normal                                                                                                          |
| 120 g/l (decayed or weak) | 7.3 l/h          | 97 %              | 58 %                             | consumption up 17 %; the pump nearer full at peaks                                                              |
| 100 g/l (watered down)    | 8.75 l/h         | cannot keep up    | 70 %                             | on the small pump: chlorine sags, CHLORINE LOW, then the maximum dosing time; on the big pump: only consumption |
| 160 g/l (strong)          | 5.5 l/h          | 73 %              | 44 %                             | consumption down; slightly more overshoot after a step, more hunting with a tight band                          |

For acid the hazard of over-strength is different: a 32 % acid (specific gravity 1.159) delivered into a system set up for 10 % (1.048) is three and a half times as strong ([Anton Paar density table after the CRC Handbook](https://wiki.anton-paar.com/cn-cn/density-and-density-measurement/hydrochloric-acid-density/)): the loop still holds pH, at a third of the pump flow, but each stroke moves the pH further, so it overshoots and hunts, and the fumes corrode the plant room, which is why PWTAG keeps it under 18 % _(inferred; the 18 % from [CoP §6](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0))_. A wrong product is the serious case: acid into a hypochlorite tank, or the reverse, releases chlorine at once ([CoP §12.10](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)); hence dedicated, different-size couplings, locked and labelled fill points, and a supervisor who checks "that the correct product is being delivered and that the quantity supplied corresponds to that ordered and the identification marking on the tank" ([CoP §12.9](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)). The game already has the fill cabinet with incompatible couplings and a chlorine gas zone with a `misdeliver` action (`gas.ts`).

**The certificate and the hydrometer.** A delivery comes with its paperwork: product, quantity and, from the supplier, a certificate of analysis giving its strength and density _(inferred from supplier practice; PWTAG names only the identification marking and quantity)_. A hydrometer reads specific gravity (one made for 1.000 to 1.250 in 0.005 divisions "covers hypochlorite solutions up to 15%", [USA BlueBook, via search summary](https://www.usabluebook.com/hydrometer-1-000-1-250-0-005-div-160-mm-long-40119)). For sodium hypochlorite, specific gravity rises about 0.0165 per per cent w/w: 5.25 % reads about 1.088, 12.5 % about 1.19 to 1.21, so 14 % about 1.23 and 10 % about 1.17 _(derived fit through [Alliance Chemical](https://alliancechemical.com/cdn/shop/files/sodium-hypochlorite-5-25_3f2878a3-22af-4065-8eb5-e792c0b9c58c.pdf) and [FPC](https://www.fpcusa.com/content/uploads/2021/06/Bleach12.5.pdf) specification sheets, via search summaries; specifications allow ±0.05)_. For hydrochloric acid density is a clean measure of strength (10 % 1.048, 32 % 1.159, Anton Paar above).

**What the hydrometer cannot see.** Decomposition, 3 NaOCl → 2 NaCl + NaClO₃, turns 223.3 g of hypochlorite into 223.3 g of salts: the solution's mass, and so very nearly its density, is unchanged _(derived)_. A watered-down load reads light; a stale or overheated load reads as new. Only a strength test finds it: an iodometric titration with thiosulphate, or a diluted DPD test (1 ml of product in 50 litres of chlorine-free water reads 2.8 mg/l at 140 g/l, in the DPD 1 range) _(derived; method inferred)_. That gives the player two different checks with two different blind spots, which is good gameplay.

**Tanks mixed by mass.** A tank holding V₁ litres at strength S₁ (g/l) topped up with V₂ at S₂ holds (V₁S₁ + V₂S₂)/(V₁ + V₂); its chlorate, salt and density mix the same way _(derived)_. Bleach makers advise emptying a tank before refilling, so new stock is not contaminated by the old one's salts and chlorate; mixing old and new "will not affect the rate of decomposition" ([TCI guidance](https://assets.noviams.com/novi-file-uploads/tci/pdfs-and-documents/Bleach_Storage_Guidelines_for_End_Users-ed6f4a1b.docx)), which the second-order law gives anyway.

## 5. Chemicals added by hand, and the routine hand tests

PWTAG's starting point: "Hand dosing (i.e. putting chemicals directly into the pool) is rarely justified in pools. (Dichloroisocyanurate – and rapid-dissolving calcium hypochlorite can be exceptions.)"; "Trying to compensate for inadequacies in treatment by shock dosing is bad practice"; "Coagulants should not be dosed by hand (unless specifically designed for this purpose) or via the strainer box" ([CoP §12.12, §5.5](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)). What remains is occasional correction of water balance, the planned superchlorination and dechlorination of TN23, and dilution. In UK plant rooms balance chemicals are usually pre-dissolved in a bucket of water and added to the balance tank, where the circulation carries them through the filters before the pool _(inferred: PWTAG says chemicals are diluted "by adding the chemical to water, not the other way round", CoP §12.10, and TN23 dilutes in buckets; I found no source naming the balance tank)_.

| Chemical                                | Why and when                                                                                         | Amount per m³ _(derived unless stated)_                                                                                     | How added                                                        | Hazards and incompatibilities                                                                                                                                                                  | Effect on the water model                                                      |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Sodium bicarbonate                      | alkalinity below 80, after weeks of acid dosing; soft-water areas                                    | 1.68 g per mg/l: 17 g/m³ for +10 mg/l; 1.7 kg per 100 m³                                                                    | pre-dissolved, into the balance tank, in portions                | low hazard; dust                                                                                                                                                                               | TA +0.60, C_T +0.012 mmol/l per g/m³; pH rises slightly                        |
| Sodium carbonate (soda ash)             | pH too low (acid overdose), where alkalinity is also low                                             | 1.06 g per mg/l alkalinity; a little goes a long way in pH                                                                  | pre-dissolved, slowly, into the balance tank                     | irritant; heat on dissolving; clouds hard water (scale)                                                                                                                                        | TA +0.94 and C_T +0.009 mmol/l per g/m³; pH rises sharply                      |
| Calcium chloride                        | hardness below 80 in soft-water areas, to protect grout                                              | 1.47 g dihydrate (1.11 g anhydrous) per mg/l: 15 g/m³ for +10 mg/l                                                          | pre-dissolved (exothermic), into the balance tank                | irritant; heats strongly on dissolving; never in a hard-water area (§2.5)                                                                                                                      | CH +0.68 (dihydrate) per g/m³; chloride and TDS up                             |
| Sodium thiosulphate pentahydrate        | dechlorination after superchlorination; neutralising spilt hypochlorite                              | PWTAG TN23: 5 g per m³ per mg/l; stoichiometry 0.9 to 7 g; "always slightly under-dose"                                     | dissolved, spread, the free chlorine tested after                | spilt hypochlorite "diluted by about 10 times and then neutralised with sodium thiosulphate pentahydrate. Heat is generated" ([CoP §12.5](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)) | FC down; acid released: pH and TA down; sulphate and TDS up                    |
| Polyaluminium chloride (PAC)            | coagulation, continuously, not by hand                                                               | about 0.1 ml/m³ of circulation flow, as aluminium ([CoP §5.5, §7](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0))      | peristaltic pump from its delivery container, before the filters | with hypochlorite releases chlorine, as acid does ([CoP §12.10](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0))                                                                           | filter capture up (solids, Cryptosporidium 99 %); slight acid                  |
| Polyelectrolyte coagulant ("clarifier") | hand-dosed only in an incident where coagulation is not the norm (high-rate filters, faecal release) | "following manufacturers' instructions" ([CoP §8](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0))                      | by hand in that case only                                        | maker's data                                                                                                                                                                                   | filter capture up for a while                                                  |
| Sodium hypochlorite (superchlorination) | corrective only: diarrhoea, algae, failed bacteriology (§5.3)                                        | 0.039 ml/l (5 mg/l) to 0.39 ml/l (50 mg/l) of 14 % (TN23)                                                                   | diluted in buckets, spread round the pool, circulation on        | acid nearby: chlorine gas; the plant's seals and valves must "withstand superchlorination"                                                                                                     | FC up; pH up (acid to 7.5 or lower); combined broken down; UV off and bypassed |
| Calcium hypochlorite (65–78 %)          | the exception PWTAG allows for hand dosing (rapid-dissolving)                                        | 5 mg/l needs 7.7 g/m³ of 65 % (TN23)                                                                                        | dissolved, or broadcast if rapid-dissolving                      | violent with organics, acids and chloroisocyanurates; dust; heat releases chlorine ([CoP §6.2](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0))                                            | FC up; CH up 0.46 mg/l per g/m³ of 65 % product (as CaCO₃); pH up              |
| Sodium bisulphate (dry acid)            | pH down by hand where no acid pump; small pools                                                      | 2.4 g per mg/l alkalinity                                                                                                   | pre-dissolved                                                    | acid: never with hypochlorite; sulphate attack above 360 mg/l                                                                                                                                  | TA −0.42, sulphate +0.80 per g/m³                                              |
| Fresh water (dilution)                  | the main tool against TDS, combined chlorine, chlorate, THM precursors, cyanuric acid                | 30 litres per bather ([CoP §3.6](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)); more by backwashing or partial drain | the balance tank's make-up; a partial drain-down                 | none chemical; costs heat and water                                                                                                                                                            | every species relaxes to the mains' values, e^(−Qt/V)                          |

### 5.1 Raising alkalinity and pH

Sodium bicarbonate raises alkalinity with little change of pH (its own pH is about 8.3); soda ash raises both. In a hypochlorite-and-acid pool the usual job is bicarbonate after weeks of acid have drained the alkalinity; soda ash is for recovering from an acid overdose ([CoP glossary 80 and 82](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0) define them for these uses; the chemistry is §2.4) _(inferred)_. Large amounts are added in portions over a day, testing between, so as not to cloud the water by overshooting the saturation index _(inferred from §2.5)_.

### 5.2 Calcium hardness

Calcium chloride raises hardness; nothing practical lowers it but dilution with softer water. PWTAG: in hard-water areas, treatment chemicals must not "further enhance the calcium hardness content over and above that in the hard water make up supply" ([CoP §9.10](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)). So whether calcium chloride appears in the game depends on the mains water we choose: in a soft-water town (much of the north and west of Britain) it is a routine weekly correction; in a hard-water town (the south-east) never _(inferred)_.

### 5.3 Superchlorination

PWTAG Technical Note 23 ([TN23](https://www.pwtag.org/?p=732)) treats it as corrective, never routine. Its table:

| Reason                               | Free chlorine | Contact time | Sodium hypochlorite (14 %) | Calcium hypochlorite (65 %)               |
| ------------------------------------ | ------------- | ------------ | -------------------------- | ----------------------------------------- |
| Diarrhoea (possible Cryptosporidium) | 20 mg/l       | 13 h         | 0.156 ml/l                 | 0.033 g/l                                 |
| Algal growth                         | 10 mg/l       | 24 h         | 0.078 ml/l                 | 0.0155 g/l (the page's 0.00155 is a slip) |
| Legionella (spas)                    | 50 mg/l       | 16 h         | 0.39 ml/l                  | 0.0775 g/l                                |
| Coliforms, E. coli, colony counts    | 5 mg/l        | 1 h          | 0.039 ml/l                 | 0.0077 g/l                                |
| Raised P. aeruginosa                 | 5 mg/l        | 12 h         | 0.039 ml/l                 | 0.0077 g/l                                |

The procedure (same): close the pool and any sharing its plant; "isolate automatic dosing controllers to protect their sensors"; dilute the hypochlorite in buckets and spread it round the pool; keep the filters running; test at 15 minutes with a dilution pot; check every two hours and re-dose; bring pH down to 7.5 or lower with acid; at the end backwash thoroughly to waste, then dechlorinate. The CoP adds that 20 mg/l for 13 hours (or 50 mg/l for 5 hours) is the high-rate-filter route after a diarrhoeal release, that "any UV (or ozone) plant should be switched off and by-passed", and that operators should be confident the plant "will withstand superchlorination" ([CoP §8](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)). For the Olympic, 20 mg/l is 390 litres of 14 % hypochlorite _(derived: 0.156 ml/l × 2,500 m³)_, two fifths of its 1,000-litre day tank: a big job, and the game's standard dosing cannot do it (PWTAG: "many pools would find achieving and maintaining such residuals difficult with standard dosing equipment").

### 5.4 Dechlorination

TN23: "5 g sodium thiosulphate pentahydrate removes 1 mg/l free chlorine per 1,000 L"; always slightly under-dose; reopen only when free chlorine and pH are back in range ([TN23](https://www.pwtag.org/?p=732), via a summary of the page). The stoichiometry runs from 0.88 g (thiosulphate oxidised to sulphate, chlorine in excess) to 7.0 g (to tetrathionate) per m³ per mg/l _(derived)_, so PWTAG's 5 g is a practical figure near the mild end. Taking 20 mg/l in the Olympic down to 2 mg/l is 18 × 5 g × 2,500 = 225 kg of thiosulphate _(derived)_, which is why dilution, or simply waiting for the chlorine to be consumed, is often preferred in a big pool. Overdosing thiosulphate leaves a demand in the water that eats the next day's chlorine _(inferred)_.

### 5.5 Coagulants and clarifiers

PWTAG recommends continuous low-level PAC for all pools (not membrane plants), about 0.1 ml/m³ of the circulation rate, dosed by peristaltic pump from its delivery container, before the filters and after the sample point, never by hand or into the strainer box ([CoP §5.5](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)). It is the main protection against Cryptosporidium (medium-rate filters with coagulation remove some 99 % a pass, without it as little as 10 %, [CoP §8](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)). For the Olympic at its 620 m³/h of circulation (`POOL_TARGET`) that is 62 ml/h, 1.5 litres a day _(derived)_. "Clarifiers" sold for domestic pools are polyelectrolytes; in a UK public pool they appear only as the hand-dosed polyelectrolyte kept for an incident where coagulation is not the norm (same) _(inferred)_. The game has no coagulant yet: it would be a third dosing chemical, a third pump and a third store, and the first thing a Cryptosporidium scenario needs.

### 5.6 Algaecides

Rare in UK indoor public pools: the CoP defines "algicide" in its glossary but gives it no place in treatment, and TN23's answer to algal growth is superchlorination to 10 mg/l for 24 hours ([CoP glossary 4](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0), [TN23](https://www.pwtag.org/?p=732)). Quaternary ammonium algaecides foam; copper ones stain and discolour ([pooldial glossary, via search summary](https://pooldial.com/resources/articles/glossary/polyquat-algaecide)). Indoors, with chlorine held at 1 mg/l and little light, algae mean the treatment has failed, and the fix is the treatment _(inferred)_. For the game: no algaecide item.

### 5.7 Cyanuric acid: why not

Cyanuric acid (stabiliser) binds free chlorine so that sunlight breaks it down less; PWTAG mentions it for "less demanding pools and outdoor pools" ([CoP §6](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)). In an indoor public pool there is no sunlight to protect against, and it does harm: it lowers the HOCl available at a given free chlorine, so pools on chloroisocyanurates must hold 5 mg/l free chlorine (§2.9); it accumulates ("for every mg of chlorine released almost as much cyanuric acid is added", removed only by dilution); and "some automatic controllers may not be accurate in the presence of cyanuric acid" ([CoP §6.3, §9.6](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)); W&T's chlorine cell fails its calibration with it in the water ([manual, fault table](https://www.trility.com.au/wp-content/uploads/Depolox-Pool-Compact-OM-Manual.pdf)). For the game: none, except as a failure (a wrong delivery, or a member of staff topping up with stabilised granules) whose sign is a controller that will not calibrate and a free chlorine that reads right but does not disinfect _(inferred)_.

### 5.8 Anything else

- **Calcium hypochlorite and dichlor** for small hand-dosed jobs: the two hand-dosing exceptions PWTAG allows; both strong oxidisers, dangerous with acids, organics and each other (mixing them "will produce nitrogen trichloride gas – with potentially explosive results", [CoP §12.12](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)).
- **Sodium bicarbonate or carbonate solution for cleaning** waterlines and surfaces ([CoP §13](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)): set decoration more than chemistry.
- **Hydrochloric acid by hand**: dilute acid by hand is one of PWTAG's two ways of lowering alkalinity ([CoP §9.9](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)), into the balance tank, adding acid to water.

### 5.9 The routine hand tests

PWTAG asks for manual tests of the pool itself, from 100 to 300 mm deep at the deep end away from the inlets, "not from the sampling cell", before opening, every two hours while open (at least three times a day with automatic control) and after closing; and a daily manual test of the sample cell to check the controller ([CoP §9.2 to §9.4](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)). The Palintest Pooltest 25 (already in the control room, as set decoration) runs these by tablet and photometer ([Palintest pool and spa brochure](https://palintest.com/wp-content/uploads/2025/01/2116388-Palintest-Ltd-Pool-and-spa-brochure-update-V3.pdf)); the ranges below are from Palintest's other kits where the brochure did not give them ([search summaries of Palintest listings](https://quimidev.lineagrafica.es/en/6682-lumiso-pooltest-3-photometer.html)):

| Test                      | Reagent, method                                                                         | Range (typical)            | How often (PWTAG)                                                             |
| ------------------------- | --------------------------------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------- |
| Free chlorine             | DPD 1 tablet; magenta read by photometer or comparator                                  | 0 to 5 mg/l; dilute above  | pool: opening, two-hourly, closing; sample cell: daily against the controller |
| Total chlorine (combined) | DPD 3 tablet added to the DPD 1 sample; combined = total − free                         | 0 to 5 mg/l                | with the free chlorine; more often if chloramines are a problem               |
| pH                        | Phenol Red tablet                                                                       | pH 6.8 to 8.4              | with the chlorine                                                             |
| Total alkalinity          | Alkaphot tablet (photometer)                                                            | 0 to 500 mg/l as CaCO₃     | weekly                                                                        |
| Calcium hardness          | Calcicol tablets (photometer)                                                           | 0 to 500 mg/l as CaCO₃     | weekly                                                                        |
| TDS                       | conductivity meter, calibrated against a standard                                       | 0 to several thousand mg/l | weekly, compared with the mains                                               |
| Cyanuric acid             | turbidimetric tablet                                                                    | 0 to 150 or 200 mg/l       | only where chloroisocyanurates are used                                       |
| Langelier index           | calculated from pH, temperature, hardness, alkalinity, TDS (the Pooltest calculates it) | —                          | weekly                                                                        |
| Microbiology              | laboratory: colony count, coliforms, E. coli, P. aeruginosa                             | —                          | monthly (earlier note §8)                                                     |

PWTAG's cautions are gameplay too: reagent shelf life, labelled cells kept apart, a second diluted test if the first is at the top of the range, high calcium giving false high readings and cleaning chemicals false low ones, colour standards to check the photometer ([CoP §9.1](https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0)).

## 6. What the game has now (checked against the code, 2026-10-28)

- **`src/game/plant/pools.ts`, `stepPoolsWater` (lines 619 to 692).** Free chlorine eases towards 1.4 mg/l at 0.001 per second (a time constant of about 17 minutes) while hypochlorite is dosed, and falls at 0.0001 mg/l a second (0.36 mg/l an hour) when not, whatever the bathers. pH approaches `phTarget` (`chemicals.ts`: 7.4 with both chemicals, 8.2 hypochlorite alone, 6.5 acid alone, 7.9 neither). Combined chlorine rises 0.022 mg/l an hour without UV and falls 0.0072 with it, independent of chlorine and bathers. Redox is `620 + 72·FC − 45·(pH − 7.4)`. "Dosing" is a boolean per chemical (circulating, room's chemical service on, in stock). No sensor, setpoint, controller or pump rate: the pool's true values are the readings.
- **`src/game/plant/chemicals.ts`.** Stores in litres (hypochlorite 12,000, acid 4,000), the strengths 14 % and 10 % only in comments; `DOSE_PER_M3_DAY` fixes 60 ml of hypochlorite and 24 ml of acid per m³ per day; `deliver` adds litres, capped.
- **`src/game/plant/chemical-distribution.ts`.** Day tanks in litres with low and high levels; `doseDraw` takes the fixed daily dose per m³ from a pool's day tank whenever it is dosing: consumption is the same whatever the water needs, so a weak delivery would change nothing, and a strong one nothing either.
- **`src/game/plant/pool-dosing.ts`.** Dosing on or off by day-tank stock and the open path (outlet, cabinet and quill isolating valves); feed faults and LOW for the spa cabinets' displays.
- **`src/game/water/water-condition.ts`.** A mass-balance model (`doseHypochlorite` in mg/l, `react` with an organic load and a simplified breakpoint, `irradiate`, `ozonate`, `redox` logarithmic in HOCl), used only by the water bench (`src/toolkit/gallery/logic/water-bench.ts`, dev41). `doseAcid` lowers pH by a given drop and `doseHypochlorite` raises it 0.02 per mg/l: pH is not yet tied to alkalinity, and `mix` averages pH linearly, as its comment says.
- **`src/game/plant/sampling.ts`.** Already a complete set of blocks: the sample tapping (√pressure, regulated to 33 l/h), booster, flow cell (lag, standing water consumed, the `fooled` flag), probes with zero drift and fouling trimmed by a calibrate button against a manual test's value, and a controller (proportional, setpoints 1.0 mg/l and 7.4, bands 0.2; alarms; 120 s flow delay; 1,800 s dosing-time limit, latched until reset; a four-page screen), composed into `WATER_QUALITY_PANEL`. **Nothing outside its test imports it.** It lacks integral action, the pH lockout, the feed delay, a pH-dependent chlorine probe and probe failure states, and its probes drift from the time they were fitted rather than from their own state.
- **The rooms.** The controller panel (`dosing-controller`) shows `world().pools[pool]`, the true water. The hypochlorite board (two DMX 1602 solenoid pumps, 2.1 l/h) and acid board (DDS 7.5-16, 7.5 l/h) are asked for a fixed 1.24 and 0.62 l/h in every room, running while `world().chemicals[chemical] > 0` (the bulk store, not the room's day tank) (`src/toolkit/gallery/views/room-equipment.ts`); the Olympic's model meanwhile draws 6.25 l/h of hypochlorite (§3.4). The DoseCell heads on the spa bottles are told from the model (`pool-dosing.ts`). The diaphragm pumps' own keys (STOP, MANUAL, rate) are still view-local (TODO, from prompt 089).
- **Alarms and displays reading the truth.** `world-reading.ts` (`cl-low`, `cl-high`, `ph-range`, `dosing-inhibit`), `lounge-annunciator.ts` (`chlorine`, `ph`), `station-schematics.ts`, `schematic-overviews.ts` and the bridge (`bridge-bindings.ts`) all read `world.pools[id].freeChlorine` and `.ph` directly.
- **The water-test kit** (`createWaterTestKit`, `control-room.ts`) is set decoration (`health.ts`: "set decoration for now"), though it is an instrument by the project's rules.
- **What can be built on.** The bathers exist and are counted per pool (`world.bathers.pools[id].now`, `bathers.ts`), so a bather-driven demand is available; the chlorine gas zones have `misdeliver` (`gas.ts`); the delivery fill cabinet has incompatible couplings; the OT-216 terminals show the day tanks in litres (prompt 091); dev41 (water bench) and prompt 028 (scenario 5, the IBC-fed probe-controlled rig, not built) are the natural places to try the model first.

## 7. A proposed model

### 7.1 Per pool: the water

State, all plain numbers, saved with the world (a `WORLD_VERSION` bump and a migration that fills nominal values):

```ts
interface PoolChemistry {
  freeChlorine: number; // mg/l as Cl2 (HOCl + OCl-)
  combinedChlorine: number; // mg/l as Cl2
  ammonia: number; // mg/l as N, not yet chlorinated
  urea: number; // mg/l as N
  demand: number; // other organic chlorine demand, mg/l as Cl2
  alkalinity: number; // mg/l as CaCO3
  carbonate: number; // total carbonate C_T, mmol/l
  hardness: number; // calcium, mg/l as CaCO3
  tds: number; // mg/l
  sulphate: number; // mg/l
  chlorate: number; // mg/l
  cyanuric: number; // mg/l, 0 unless a wrong chemical
  thiosulphate: number; // mg/l of unreacted dechlorinator
}
```

Temperature and solids are already in `PoolWaterState`; pH and redox stay on it but become derived each step (pH from alkalinity, carbonate and temperature by §2.4; redox by the earlier note's §3.5 curve). Microbes, from the earlier note's §6, can follow later without changing this.

The step, `stepPoolChemistry(c, inputs, dt)`, pure, in this order _(design)_:

1. **Additions** this step, each from its source in grams: hypochlorite from the pump (litres × the day tank's g/l → free chlorine, its excess caustic → alkalinity, its chlorate and salt → chlorate, TDS); acid (→ alkalinity −, chloride → TDS); CO₂ (→ carbonate); hand-dosed items arriving from the balance tank (§7.5); bathers (`bathers.now` × per-bather nitrogen, urea and demand, spread over a visit); make-up water at the mains' values with dilution out at the same flow (exponential, §2.6).
2. **Fast reaction, algebraic:** ammonia to combined chlorine, `x = min(NH, FC/5.07)`.
3. **Slow reactions, each first or second order, integrated exactly over dt:** breakpoint (`k_bp·HOCl·CC`, with its acid), urea, organic demand, background loss, UV (per pass, so as a rate `Q/V × fraction` while lit), CO₂ loss (Wojtowicz's second-order law), thiosulphate with chlorine (fast; algebraic like ammonia).
4. **Solve pH** from alkalinity and carbonate (Newton from last step's value, three or four iterations), then HOCl = α·FC, then redox.

Constants from the earlier note (§3.3, §6), to be fitted off-line against the EPA scheme in a test harness, not run live.

### 7.2 Per tank: strength, mixed by mass, decaying

```ts
interface ChemicalBatch {
  litres: number;
  strength: number; // g/l available chlorine (hypochlorite) or g/l HCl (acid)
  chlorate: number; // g/l (hypochlorite only)
  density: number; // kg/l, what a hydrometer reads
}
```

Every store and day tank holds one. A transfer moves litres at the source's composition; arriving, it mixes by mass (§4). Each step, a hypochlorite batch decays by `S(t) = S₀/(1 + k(T)·S₀·t)` with the room's temperature (§2.8), its lost chlorine becoming chlorate (0.39 g per g) and salt, its density unchanged. Acid does not decay. The existing `distribution` and `chemicals` state change from litres to batches; `deliver` takes a batch.

### 7.3 Per delivery: strength, certificate, hydrometer

A delivery is `{ chemical, litres, strength, density, certificate: { strength, density, batch } }`: normally the certificate matches; a scenario can make the load weak (water added: strength and density both low), stale (strength low, density as new, chlorate high), strong (acid at 32 %) or wrong (the other chemical, or stabilised chlorine). The fill point gets a hydrometer jar the player fills and reads (SG to 0.005), and the delivery is accepted, or refused, at the fill cabinet; whatever is accepted goes into the tank and mixes. The supervisor's checks of PWTAG §12.9 become the player's routine.

### 7.4 Per pool: controller, sensors, pumps

Wire `sampling.ts`'s `waterQualityPanel` into the world per pool (one per pool with automatic dosing; the spa cabinets keep their packaged controllers, which can use the same blocks), its cell fed from the pool's water through the sample line's lag. Extend it:

- **Controller:** PI for chlorine (Xp, Tn), P for pH; the pH lockout (switch-off range); the feed delay; two limit alarms each; manual mode with a fixed output; the maximum dosing time already there.
- **Sensors with state, not age:** each probe holds its offset, span, and a condition (good, fouled, failing, dead) that changes by rates (§3.1 table) and by events (sand worn out, electrolyte exhausted, a scenario); the chlorine probe reads HOCl (so its reading falls with rising pH, unless compensated, a property of the model chosen); calibration as now, against the player's own DPD reading, refused when out of the maker's limits.
- **Outputs:** the controller's Yout (0 to 1) drives the pump in the room: litres per hour = Yout × the pump's rating (DMX 1602 2.1 l/h, DDS 7.5 l/h, peristaltic as its spec), and the pumps' own STOP, MANUAL and rate (the TODO from prompt 089) are honoured, so stopping a pump at its keys stops its dosing. What reaches the water is litres × the day tank's strength. `doseDraw` and `DOSE_PER_M3_DAY` go.
- **Interlocks** as §3.3, each with its own window or lamp.

### 7.5 Hand-dosed chemicals as items

Sacks and cans in the chemical store (`inventory.ts` already lists equipment): sodium bicarbonate (25 kg), calcium chloride flakes (25 kg), sodium thiosulphate (25 kg), soda ash (25 kg), and for superchlorination the hypochlorite itself drawn into 10-litre buckets. The player weighs or measures a portion (a scale and a bucket by the balance tank), carries it, and adds it at a balance tank's hatch; the world action is `{ type: 'pool/hand-dose', pool, chemical, kg }`, logged. It enters the water over the time the circulation takes to carry it through (an exponential release with the balance tank's residence time, minutes to an hour), so a test straight after shows little _(design)_. Each item's effect is its row in §2.1. Over-adding is possible and has its consequences (cloudy water from soda ash in hard water, a thiosulphate demand eating tomorrow's chlorine).

### 7.6 What reads what

| Display                                                                                 | Reads now                | Would read                                                                                                                       |
| --------------------------------------------------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Water-quality controller panels (plant rooms, `dosing-controller`), control-room copy   | the pool's true FC, pH   | the controller's outputs: sensor readings, setpoints, % output, alarms, its screen                                               |
| Olympic, lounge and wet hall annunciators (`world-reading.ts`, `lounge-annunciator.ts`) | true FC, pH              | the controller's alarm outputs: CHLORINE LOW, CHLORINE HIGH, PH HIGH, PH LOW, SAMPLE FLOW LOW, DOSING INHIBITED, MAX DOSING TIME |
| Station schematics, overviews, the bridge                                               | true FC, pH, redox       | the controllers' readings (they are repeats of the controllers' 4–20 mA, `water-sampling.md` §4)                                 |
| Dosing pumps' displays                                                                  | a fixed 1.24 / 0.62 l/h  | their own rate from the controller's output and their keys                                                                       |
| DoseCell heads (spas)                                                                   | the model's dose         | the same, from the packaged controller's output                                                                                  |
| OT-216 terminals                                                                        | day tanks in litres      | the same, with a units option (§7.7)                                                                                             |
| Water-test kit                                                                          | nothing (set decoration) | the pool's (or sample cell's) true values at the moment of sampling, through the test's own resolution and range                 |
| Pool information sign                                                                   | keyed-in DPD results     | the same                                                                                                                         |
| Bathers' appeal, health checks                                                          | true water               | true water (they are the world, not an instrument)                                                                               |

### 7.7 Units on a chemical terminal: litres, kg or mol

With strength and density held per tank, each is a conversion _(derived)_:

- **kg of solution** = litres × density (1,000 l of 14 % hypochlorite at 1.23 → 1,230 kg; 1,000 l of 10 % acid at 1.048 → 1,048 kg).
- **kg of active** = litres × strength (1,000 l at 140 g/l → 140 kg available chlorine; 1,000 l of 10 % acid → 104.8 kg HCl).
- **mol** = kg of active ÷ molar mass: 140 kg ÷ 70.90 g/mol = 1,975 mol of available chlorine (the same number of moles of NaOCl); 104.8 kg ÷ 36.46 = 2,874 mol HCl.

On a 16-character OT-216 line: `PL2 1000L 20%` becomes `PL2 1230KG` or `PL2 1975MOL`, needing a unit word that fits (`KG`, `KG CL2`, `MOL`). What it needs: the tank's strength and density in the model (§7.2), a unit setting kept by the control box like its levels (a SET item, so behind the access key), and a decision whether kg means solution or active (§11, question 5). A real terminal of 2000 would show litres or per cent from a level transmitter; kg from a level needs a density entered by hand, and mol is anachronistic for any plant terminal (a chemist's unit, not an operator's) _(inferred)_: it is the kind of deliberate oddity the owner's period rule allows, and the owner's choice.

## 8. Gameplay

What the player sees and does, each with the instrument it uses and the rule it follows _(design; inferred from §3 to §5)_:

- **The morning round.** Before opening: DPD 1, DPD 3 and phenol red from each pool (the kit, now working), written in the log; compare with each controller; a pool out of range is not opened. Through the day, every two hours or at least three times, the same.
- **Calibrating against a DPD test.** Daily: a sample from the cell's tap, DPD 1 and phenol red, then the controller's CAL pages: chlorine zero (sample flow stopped) and span (entering the DPD value), pH with two buffers. A probe that has drifted more than 15 % (chlorine) or 0.2 (pH) is recalibrated; one the controller refuses needs cleaning, new sand or replacement.
- **A probe drifting.** Over days a fouled chlorine probe reads low; the controller doses more; the pool's own DPD climbs to 2, 3 mg/l; bathers complain of the smell; the daily comparison shows 30 % apart. Cleaning and recalibrating cures it; ignoring it ends at CHLORINE HIGH on the pool test, not on the controller.
- **Diagnosing a weak delivery.** A week after a tanker, hypochlorite use per day is up a third with no rise in bathers (the OT-216's litres, or a log the player keeps); the controller's output sits higher; at the evening peak the Olympic's chlorine sags below setpoint and the controller holds 100 % for an hour, then trips MAXIMUM DOSING TIME. The hydrometer said the delivery was right, so it was stale, not watered: a diluted DPD strength test proves it. The fix is a fresh delivery, a stronger or second pump, or accepting it and watching.
- **Sample flow lost.** The cell's strainer chokes; SAMPLE FLOW LOW after two minutes; dosing stops; chlorine falls over hours. The player clears the strainer and the feed delay holds dosing while the cell settles.
- **pH probe failing high.** The controller doses acid at full; the pool's phenol red reads 6.8; alkalinity, tested weekly, has fallen to 50. The player stops the acid pump, replaces the electrode, and rebuilds the alkalinity with bicarbonate into the balance tank over a day.
- **Balancing the water by hand.** Weekly: alkalinity, hardness and TDS tests, the Langelier index; bicarbonate or calcium chloride weighed out and added in portions, re-tested next day; TDS high, so more backwashing to waste or a partial drain.
- **Superchlorination and dechlorination.** After a diarrhoeal incident in the lounge pool: close it, UV off and bypassed, controllers isolated, buckets of hypochlorite to 20 mg/l, two-hourly tests with the dilution tube for 13 hours, acid to keep pH at 7.5, backwash, thiosulphate (under-dosed) to bring it down, reopen when in range.
- **The wrong delivery.** The tanker driver connects to the wrong inlet, or a load is acid: the couplings prevent it unless the player overrides; if acid meets hypochlorite the gas zone's detector alarms and the room is evacuated.

## 9. Rules to keep

- **Status words need a failure model** (memory, 2026-10-25). The new windows and words (SAMPLE FLOW LOW, MAX DOSING TIME, PROBE FAULT, CALIBRATION REFUSED, OVERFEED) are each backed by a modelled fault; a probe says FAULTY only because its condition is modelled. Things still without one keep On and Off.
- **Overlay: no peeking** (memory, 2026-10-25). The inspection overlay says what each instrument shows: the controller its displayed reading with its precision, never the pool's true value; a pump its displayed rate; the hydrometer its scale reading; the test kit the result it displays, after the test is done. It never says "this probe has drifted" or "this delivery is weak": those are for the player to find. A pump's running may be said (it hums), a day tank's level only if it has a gauge or sight tube.
- **Mimic copies, one node** (memory). The control-room copy of a controller shows the same node; no LOCAL/REMOTE logic.
- **Some controls only local** (CLAUDE.md, the owner, 2026-10-25). Calibration, the maximum-dosing-time reset, a pump's MANUAL, setpoint changes and probe maintenance stay at the plant room's panel; the control room sees readings and alarms, so putting a fault right means going there.
- **Illuminated push buttons** on boards shown twice (memory).
- **Enhanced network as truth.** The sample line, flow cell, probes, controller, pumps, injection points and any new coagulant line are nodes and links of each room's schematic, tagged from the model, before anything is drawn.
- **Everything made by someone.** The controller's maker (Penfold Controls builds panels; the controller unit itself a maker's of its own, after ProMinent or W&T), the probes', the test kit's (the existing Chlorella-branded kit and plates), the hydrometer's, the sacks' supplier (Chlorella Chemicals).

## 10. Cost, pacing and time acceleration

**Cost.** Per pool per step: about 15 multiplications and exponentials for the reactions and a three-iteration Newton solve for pH: well under a microsecond each, against today's 33 µs per world step for everything ([`time-acceleration.md`](time-acceleration.md)) _(inferred)_. The controller blocks already sleep between changes (`sampling.ts`), which keeps them cheap.

**Time scales** _(derived from the constants above and the earlier note)_:

| Process                                           | Time scale                      | Treatment                                                |
| ------------------------------------------------- | ------------------------------- | -------------------------------------------------------- |
| Ammonia to chloramine; thiosulphate with chlorine | under a second                  | algebraic, each step                                     |
| Sample cell lag; pulse dosing                     | a minute or so; pulses averaged | exact exponential; the dose as a mean rate over the step |
| Controller loop dead time (injection to sample)   | minutes                         | P and I terms on the reading at the step's start         |
| Pool mixing, turnover                             | 2.5 to 4 h (the lounge less)    | well-mixed volume                                        |
| Bather chlorine demand                            | an hour                         | first-order                                              |
| Breakpoint, urea, CO₂ loss                        | hours to days                   | exact first/second-order solutions                       |
| Hypochlorite decay in store                       | weeks to years                  | exact second-order solution                              |
| Dilution of TDS, chlorate                         | weeks                           | exact exponential                                        |

**Stable at speed.** Mission 059 plans steps of up to 10 s at 10,000× (60 s at 100,000×). Every chemical process above is either algebraic or integrated exactly over the step, so the water does not blow up at long steps; the remaining risk is the control loop, which reads the sensor at the start of a step and doses for the whole step. With dead time of minutes and a band of 0.2 mg/l, a 60 s step overshoots by at most the dose of one step, `Yout × pump rate × strength × dt / V`: for the lounge at full output, 2.1 l/h × 140 g/l × 60 s / 139 m³ ≈ 0.035 mg/l, a sixth of the band _(derived)_; for the jacuzzi (2.83 m³) the same step at its cabinet's rate is comparable, so its controller should be sub-stepped to 5 s as its water already is (`pools.ts` sub-steps at 5 s). A test should check that a day at 10 s and at 60 s steps ends within a stated tolerance of 0.1 s steps, as `time-acceleration.md` recommends for the rest. Alarms that matter (MAX DOSING TIME, SAMPLE FLOW LOW, CHLORINE HIGH) should drop the speed back to 1×, as mission 059 plans for trips.

**Pacing.** Chemistry is slow: a weak delivery shows over days, alkalinity over weeks, TDS over a month. At 1× the player sees only the controller and the bathers; the slow problems need time acceleration to be playable, and a log (the controller's history, or the player's test log) to be noticed _(inferred)_.

## 11. Decisions for the owner

To be asked one at a time, in this order:

1. **Should the pools' displays and alarms read the controllers' sensors instead of the true water?** This is the change that lets an instrument be wrong (§7.6), and makes the test kit the player's only truth.
2. **How much chemistry should the first mission carry?** The full set of §7.1 (alkalinity, carbonate, hardness, TDS, chlorate) or only free and combined chlorine, ammonia and pH from alkalinity first, with hardness, TDS and the Langelier index after.
3. **Which unit should hypochlorite strength be held and shown in?** Grams of available chlorine per litre (unambiguous), weight per cent (PWTAG's), or trade per cent (the game's present "14 %").
4. **Should the water-test kit become a working instrument now?** DPD 1 and 3, phenol red, and later alkalinity, hardness and TDS, with its log sheet; without it the player cannot calibrate or diagnose.
5. **On the OT-216 units option, what should kg and mol mean?** kg of solution or kg of active chemical, and mol of available chlorine (for hypochlorite) and HCl; and should mol be offered at all, being a chemist's unit no plant terminal of the period would show.
6. **Should deliveries vary in strength, and how often?** A certificate and a hydrometer check at the fill cabinet, with occasional weak, stale or over-strength loads as scenarios, or only when a scenario asks.
7. **Should hypochlorite decay in the tanks?** With the temperatures of the rooms (§2.8), so that warm, slow-moving stock goes weak, or not at all.
8. **Should the controller be the existing touch-screen anachronism, or a period controller with segment displays (DULCOMETER D1C style) in the plant rooms and the touch screen kept for the bridge?**
9. **Should the Olympic get a bigger hypochlorite pump?** The model's daily dose needs about three times what a DMX 1602 delivers; or should the daily dose come down to what its bathers need (§3.4)?
10. **Which hand-dosed chemicals should the store hold?** Bicarbonate, calcium chloride (only if the mains are soft), thiosulphate and soda ash, and buckets for superchlorination; and which mains water: soft or hard?
11. **Should coagulant (PAC) be added as a third dosing chemical?** With its own peristaltic pump and container: the basis of a Cryptosporidium scenario.
12. **Should bathers drive chlorine demand** from `world.bathers` (busy evenings use more), replacing the fixed daily dose?

### The owner's answers (2026-10-28)

1. **Sensors read the true water, for now** ("For now, let's cheat"): the controllers' sensors and every display and alarm reflect the true water state; drift, fouling and failure are left for later.
2. **The full chemistry set, built and tested in the abstract first** ("take an existing study and then write our own version of the model and test it in the abstract"): our own pure model, after a published study's scheme and constants, run on a headless bench of scripted scenarios before it is installed in the world ([water-chemistry-models](water-chemistry-models.md)).

## 12. Sources

- Pool Water Treatment Advisory Group, _Code of Practice_, July 2021 (the Guernsey government's copy): https://www.gov.gg/CHttpHandler.ashx?id=191649&p=0 (read in full).
- PWTAG Technical Note 23, Superchlorination: https://www.pwtag.org/?p=732 (read through a summary of the page).
- PWTAG Technical Note 39, Residual control: https://www.pwtag.org/residual-control-september-2018/ (via `water-sampling.md`).
- HSE, HSG282, _The control of legionella and other infectious agents in spa-pool systems_: https://www.hse.gov.uk/pubns/priced/hsg282.pdf (via the earlier note).
- Evoqua (Wallace & Tiernan), DEPOLOX Pool Compact operating manual WT.050.500.000.DE.IM.0817: https://www.trility.com.au/wp-content/uploads/Depolox-Pool-Compact-OM-Manual.pdf (read in full).
- ProMinent, DULCOMETER D1Cb/D1Cc product page: https://prominent.com/en/Products/Products/Measuring-Control-and-Sensor-Technology/Controllers/p-dulcometer-d1cb-d1cc.html (via search summary).
- USEPA, Chlorine Breakpoint Curve Simulator (`app.R`, MIT): https://github.com/USEPA/Chlorine_Breakpoint_Curve_Simulator (via the earlier note).
- Davis & Bullock 2002, pool chloramine modelling for PWTAG: https://www.swimming.org/library/documents/3893/download (via the earlier note).
- Bleach Storage Guidelines for End Users (TCI): https://assets.noviams.com/novi-file-uploads/tci/pdfs-and-documents/Bleach_Storage_Guidelines_for_End_Users-ed6f4a1b.docx (read in full).
- Hill Brothers, Sodium Hypochlorite Stability: https://hillbrothers.com/pdf/Product-Profiles/Sodium-Hypochlorite-Stability.pdf (via search summary).
- Aqua Magazine, "Sodium Hypochlorite, AKA Liquid Chlorine": https://www.aquamagazine.com/retail/article/15122551/sodium-hypochlorite-aka-liquid-chlorine (via search summary).
- TroubleFreePool, bleach breakdown calculators (forum source): https://www.troublefreepool.com/posts/512405 ; trade per cent: https://troublefreepool.com/threads/15-sodium-hypochlorite.93570 (via search summaries).
- Teagasc, Chlorates (citing Gordon et al., JAWWA 1993): https://teagasc.ie/wp-content/uploads/media/website/animals/dairy/Chlorates---Karl-Mc-Carthy,-Biocel-Ltd.pdf (via search summary).
- Molekula, sodium hypochlorite 14–15 % technical data sheet: https://molekula.com/specification/90028436.pdf (via search summary).
- FPC, sodium hypochlorite 12.5 % specification: https://www.fpcusa.com/content/uploads/2021/06/Bleach12.5.pdf ; Alliance Chemical 5.25 % sheet: https://alliancechemical.com/cdn/shop/files/sodium-hypochlorite-5-25_3f2878a3-22af-4065-8eb5-e792c0b9c58c.pdf (via search summaries).
- USA BlueBook hydrometer 1.000–1.250: https://www.usabluebook.com/hydrometer-1-000-1-250-0-005-div-160-mm-long-40119 (via search summary).
- Anton Paar, hydrochloric acid density (after the CRC Handbook): https://wiki.anton-paar.com/cn-cn/density-and-density-measurement/hydrochloric-acid-density/ (via search summary).
- Lenntech, Langelier saturation index: https://www.lenntech.com/ro/index/langelier-explanation.htm (via search summary).
- Hanna Instruments, pH electrode troubleshooting guide: https://pages.hannainst.com/hubfs/006-finished-content/pH_Guides/ph-electrode-troubleshooting-guide--hanna-instruments.pdf ; Yokogawa, PH202 calibration: https://yokogawa.com/us/library/documents-downloads/technical-information/performing-a-calibration-on-the-ph202 (via search summaries).
- Endress+Hauser, amperometric technology: https://go.endress.com/ch/desinfektion-wasser/en/desinfektion-amperometrisch-technologie ; WWD, "Dealing with pH Dependence": https://www.wwdmag.com/chlorinechloramines/dealing-ph-dependence (via search summaries).
- Orenda, UV and chlorine: https://blog.orendatech.com/uv-rays-cloudy-days ; Recreation Management, UV and free chlorine: https://recmanagement.com/articles/152175/aquatics-latest-surprising-news-uv-technology (via search summaries; vendor sources).
- Processing magazine, "The swimming pool case": https://www.processingmagazine.com/process-control-automation/instrumentation/flow-measurement/article/55346918/part-l-the-swimming-pool-case (via `water-sampling.md`).
- Palintest, pool and spa brochure: https://palintest.com/wp-content/uploads/2025/01/2116388-Palintest-Ltd-Pool-and-spa-brochure-update-V3.pdf (read; ranges not extracted); Lumiso Pooltest 3 listing: https://quimidev.lineagrafica.es/en/6682-lumiso-pooltest-3-photometer.html (via search summary).
- Pooldial glossary, polyquat algaecide: https://pooldial.com/resources/articles/glossary/polyquat-algaecide (via search summary).
- Review of THMs in Polish pools, RPZH 2017: https://agro.icm.edu.pl/agro/element/bwmeta1.element.agro-b5bd32cd-442d-421f-bb5e-80c9cf013a2f/c/RPZH_2017_Vol_68_No_4_pp._331-337.pdf (via search summary).
- BS EN chemical standards for swimming-pool water (titles only, via national catalogues; not read): EN 15077 sodium hypochlorite, EN 15514 hydrochloric acid, EN 15362 sodium carbonate, EN 15075 sodium hydrogen carbonate (as listed), EN 15076 sodium hydroxide, EN 15078 sulphuric acid (as listed), EN 15072 and EN 15073 sodium dichloroisocyanurate, EN 15363 chlorine, EN 16401 sodium chloride for electrochlorination: https://www.evs.ee/et/evs-en-15363-2014 , https://www.armstandard.am/en/standart/6542 . The designations should be checked against BSI before a mission cites them.
