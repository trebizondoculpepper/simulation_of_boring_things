# Pool water when it goes wrong: how it looks, and how the shader could show it

Researched 2026-10-22. The owner wants the water to look wrong when its chemistry or biology goes wrong: green, blue-green, yellow, brown, milky, stained, slimy, foamy or hazy. This note gathers what each fault looks like, where it shows, how fast it comes on and why; the optical numbers a shader can use; prior work on murky water; and a recommended mapping from the plant model's state to shader parameters. Nothing has been changed in the code. Where a number is my own estimate or a guess, it says so.

## Contents

1. How the water is drawn now
2. The optics, in brief
3. Each condition
4. Summary table
5. Recommended mapping from model state to shader
6. Prior art and licences
7. What is a guess
8. Sources

## 1. How the water is drawn now

- `src/toolkit/components/pool/logic/water-optics.ts` defines the water as Beer–Lambert absorption per colour, `ABSORPTION = [0.5, 0.1, 0.04]` m⁻¹ (red, green, blue, after Pope and Fry, rounded up), and a scattered glow `SCATTER = [0.02, 0.2, 0.26]` that the water gives back in proportion to what it took. A tile at depth d is seen as `tile · e^(−σL) + SCATTER · (1 − e^(−σL))`, with L the light's path down to the tile and back up the refracted line of sight.
- `src/toolkit/components/pool/views/pool-surfaces.ts` bakes those two constants into the tile shader as literals (`glslVec(ABSORPTION)`), so at present they cannot change at run time. Caustics are faded by depth (`causticFocus`).
- The vendored Evan Wallace / Yong Su water (`src/toolkit/vendor/threejs-water/shaders/WaterAbove.frag` and friends) has its own fixed tints, `abovewaterColor = (0.25, 1.0, 1.25)` and `underwaterColor = (0.4, 0.9, 1.0)`.
- The poolrooms room (`src/toolkit/gallery/rooms/pool-room.ts`) has an air haze, a `FogExp2` of density 0.007 per metre, switchable.

The model already has the right shape: absorption plus an in-scattered glow. Everything below extends it by (a) turning the constants into per-pool uniforms computed from the world state, (b) adding a scattering (turbidity) term that blurs and washes out the floor, and (c) adding surface layers for growths, stains and foam that the water body alone cannot show.

## 2. The optics, in brief

**Absorption and scattering.** Light in water is lost to absorption (coefficient a, per metre) and scattering (b); the beam attenuation is c = a + b. Absorption sets the colour; scattering sets the murk, washing the view toward the water's own colour and blurring detail. Game and CG writers separate the two the same way: absorption is "more like a gradient of opacity", scattering gives the foggy look ([Blender Artists](https://blenderartists.org/t/principled-volume-broken-in-3-2/1388317); [Unknown Worlds forum](https://forums.unknownworlds.com/discussion/comment/2181519)). Monzon et al. argue that underwater, unlike in air, absorption often dominates and is strongly wavelength-dependent, so per-colour coefficients matter ([Monzon et al. 2022](https://diglib.eg.org/items/988aed77-31ee-4f91-9fe6-5706389c1a37/full)); Akkaynak and Treibitz show that the coefficients governing backscatter differ from those for direct transmission, so one "fog colour" is not enough ([Akkaynak and Treibitz 2018](https://openaccess.thecvf.com/content_cvpr_2018/papers/Akkaynak_A_Revised_Underwater_CVPR_2018_paper.pdf)).

**Turbidity (NTU) and scattering.** NTU is a 90° scattering measurement (ISO 7027), not an attenuation, so there is no universal conversion to b ([AFNOR, ISO 7027-1](https://www.boutique.afnor.org/en-gb/standard/iso-702712016/water-quality-determination-of-turbidity-part-1-quantitative-methods/xs027191/126888); [Durham / White Rose](https://eprints.whiterose.ac.uk/123243)). Kirk found b correlates very closely with NTU in Australian waters ([Kirk 1981](https://publish.csiro.au/mf/MF9810533)), and a Murray–Darling Basin study found b in m⁻¹ roughly numerically equal to turbidity in NTU, with much scatter ([CSIRO MF9900581](https://www.publish.csiro.au/MF/MF9900581)). For a game, **b ≈ 1 m⁻¹ per NTU** is a defensible rule of thumb.

**Pool clarity limits.** PWTAG: "0.5 NTU is a useful guideline for clarity; above this, water will be unacceptable", and "it should be possible to see clearly from the pool surround the detail of the bottom of the pool at its deepest point"; a pool failing either should be closed for investigation ([PWTAG cloudy water technical note](https://www.pwtag.org/cloudy-water-technical-note/)). PWTAG does not, in what I could read, mention the main drain; the "main drain visible" test is from US codes, e.g. Washington State: main drain and bottom visible at all times, 0.5 NTU with a 1.0 NTU peak that must return to 0.5 within six hours ([WAC 246-260](https://lawfilesext.leg.wa.gov/law/WACArchive/2023/htm/WAC%20246%20%20TITLE/WAC%20246%20-260%20%20CHAPTER/WAC%20246%20-260%20-999.htm)). One industry article says a pool at 0.6 NTU is visibly turbid ([Pool Operation Management](https://pooloperationmanagement.com/pool-service-technician-water-clarity/)). For comparison, turbidity in a glass of drinking water becomes noticeable at about 4–5 NTU ([Palintest](https://www.palintest.com/a-focus-on-turbidity-2/); [Wikipedia: Turbidity](https://en.wikipedia.org/wiki/Turbidity)): a pool shows it far sooner because the path is metres, not centimetres.

**Visibility.** Horizontal visibility of a black target is about 4.8 / c, c being the photopic beam attenuation, within 10% across coastal and inland waters ([Zaneveld and Pegau 2003](https://misclab.umeoce.maine.edu/ftp/classes/OO2017/readings/Zaneveld_visibility_OX2003.pdf); [Ocean Optics Web Book](https://oceanopticsbook.info/view/photometry-and-visibility/level-2/contrast/pdf)). Worked through for a pool (my arithmetic): clean water at 0.5 NTU has c ≈ 0.1 (green absorption) + 0.5 = 0.6 m⁻¹, a visibility of about 8 m, which is about the slant distance from the surround to the deep end's floor. At 2 NTU it falls to about 2.3 m and the deep floor goes; at 10 NTU to about 0.5 m. The PWTAG limit and the physics agree well enough for a game. Secchi depth relates to the diffuse attenuation Kd as Z_SD ≈ 1.4–1.7 / Kd, and more properly to 1/(c + Kd) ([UNCW](https://people.uncw.edu/cahoon/Secchi.htm); [Lee lecture, IOCCG](https://ioccg.org/wp-content/uploads/2024/12/zhongping-lee_lecture-3_iops-appl.pdf); [Frontiers 2024](https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2024.1265382/epub)). Empirical Secchi–NTU fits are site-specific, e.g. Secchi (ft) = 11.123 × turbidity^−0.637 on the Willamette ([USGS](https://or.water.usgs.gov/will_morrison/secchi_depth_model.html)).

**Water colour scale (Forel–Ule).** The 21-step Forel–Ule scale runs from indigo blue (FU1) to cola brown (FU21): oligotrophic water FU1–4, mesotrophic FU5–9, eutrophic FU10–14, hypereutrophic FU15–18, humic (brown, tannin) FU19–21 ([Wernand and van der Woerd 2010](https://research.vu.nl/ws/files/2796870/253567.pdf)). HydroLight's simulations of case-1 water give FU1 at 0.05 mg m⁻³ chlorophyll, FU3 at 0.5, FU6 at 5, FU11 at 50; adding coloured dissolved organic matter (CDOM) to 50 mg m⁻³ chlorophyll with a_CDOM(440) = 1, 2 and 10 m⁻¹ gives FU17, 19 and 21 ([Mobley, HydroLight Technical Note 8](https://misclab.umeoce.maine.edu/ftp/classes/OO2013/Dropbox_backup_Aug13/Documents/HTN8_Forel-Ule.pdf)). Hue angles for each class (FU1 229.45° to FU21 20.98°) are listed in [Sencast's documentation](https://sencast.readthedocs.io/en/latest/processors/forelule.html), after Novoa et al. 2013.

The table below converts Wernand and van der Woerd's CIE 1931 (x, y) chromaticities for each tube to sRGB (my conversion: Y = 1, standard XYZ→linear sRGB matrix, scaled so the brightest channel is 1). These are **hues only, at full brightness**: real water reflects only a few per cent of the light falling on it, so in the shader they are the hue of the deep-water glow, and they must be darkened a great deal. Darkened, the "yellow" classes read as olive, khaki and brown.

| FU  | x     | y     | linear sRGB (max 1) | hex at full brightness |
| --- | ----- | ----- | ------------------- | ---------------------- |
| 1   | 0.189 | 0.161 | 0.06, 0.22, 1.00    | #4681ff                |
| 3   | 0.213 | 0.255 | 0.06, 0.56, 1.00    | #47c6ff                |
| 5   | 0.242 | 0.331 | 0.15, 1.00, 0.98    | #6efffd                |
| 7   | 0.290 | 0.415 | 0.30, 1.00, 0.48    | #96ffb8                |
| 9   | 0.337 | 0.463 | 0.51, 1.00, 0.25    | #bdff88                |
| 11  | 0.388 | 0.490 | 0.81, 1.00, 0.09    | #e8ff56                |
| 13  | 0.397 | 0.486 | 0.90, 1.00, 0.09    | #f4ff54                |
| 15  | 0.410 | 0.478 | 1.00, 0.94, 0.08    | #fff850                |
| 17  | 0.427 | 0.466 | 1.00, 0.76, 0.07    | #ffe24a                |
| 19  | 0.453 | 0.448 | 1.00, 0.56, 0.05    | #ffc541                |
| 21  | 0.473 | 0.429 | 1.00, 0.43, 0.05    | #ffae40                |

**A bio-optical model to borrow (case-1 water).** The Ocean Optics Web Book's "new case-1" model ([oceanopticsbook.info](https://oceanopticsbook.info/view/optical-constituents-of-the-ocean/level-2/new-iop-model-case-1-water)) gives everything as a function of chlorophyll concentration Chl (mg m⁻³):

- phytoplankton absorption a_ph(λ) = A(λ) · Chl^E(λ) (Bricaud et al.), with E below 1, so absorption grows a little less than in proportion to concentration;
- CDOM absorption a_y(λ) = a_y(440) · e^(−S(λ − 440)), S = 0.014 nm⁻¹ by default (0.007–0.026 in nature), with a_y(440) = 0.2 · a_ph(440) when CDOM simply follows the algae ([Ocean Optics Web Book, CDOM](https://oceanopticsbook.info/view/optical-constituents-of-the-ocean/colored-dissolved-organic-matter)); measured a_CDOM(440) spans near 0 to 10 m⁻¹ ([Oceanologia 2002](https://doaj.org/article/bee814ae4cc9418ba2a9095debc47c5e));
- particle beam attenuation c_p(660) = 0.407 · Chl^0.795 m⁻¹ (Loisel and Morel), b_p = c_p − a_p, and a backscattered fraction of about 0.018 (Petzold average; 0.014 for small particles, 0.0019 for large).

I averaged Bricaud's A(λ) (the [OMLC data file](https://omlc.org/spectra/water/data/bricaud95.txt), whose value 0.0403 m⁻¹ at 440 nm matches a_ph for 1 mg m⁻³; the file does not say so, that is my reading) and the CDOM exponential over three bands, R 600–690, G 500–570, B 430–490 nm:

| per unit                         | R     | G     | B     |
| -------------------------------- | ----- | ----- | ----- |
| a_ph at Chl = 1 mg m⁻³ (m⁻¹)     | 0.010 | 0.012 | 0.035 |
| CDOM shape, relative to a_y(440) | 0.061 | 0.275 | 0.779 |

**Remote-sensing reflectance (the water's own colour).** Lee's quasi-analytical algorithm uses r_rs = g0·u + g1·u², u = b_b / (a + b_b), g0 = 0.089, g1 = 0.1245 ([IOCCG QAA v6](https://ioccg.org/wp-content/uploads/2020/11/qaa_v6_202011.pdf); [Lee et al. 2002](https://misclab.umeoce.maine.edu/ftp/classes/OO2011/Readings/Lee-2002-AO.pdf)). Per colour channel this is the colour of infinitely deep water, and it is what the existing `SCATTER` constant stands for. It is the single most useful formula here: feed it per-channel a and b_b and it returns a plausible hue for any mix of algae, CDOM, minerals and pure water.

**Cyanobacteria.** Their marker pigment phycocyanin absorbs near 620 nm (orange-red), the band remote sensing uses to find blooms ([IUPUI thesis](https://scholarworks.indianapolis.iu.edu/server/api/core/bitstreams/d2786fbc-d51d-43c9-8cb2-12723174637b/content); [MDPI Remote Sensing 11/15/1764](https://www.mdpi.com/2072-4292/11/15/1764)). Its specific absorption a*PC(620) varies widely (0.002–0.027 m² mg⁻¹), settling near 0.007–0.008 in eutrophic inland waters (per a 2015 L&O Methods study summarised in search results; I could not open it). Absorbing orange-red as well as chlorophyll's blue and red, cyanobacterial water looks bluer-green than green-algal water: my inference, which I did not find stated outright.

## 3. Each condition

### Green algae (planktonic, Chlorophyta)

- **Look.** The whole water body: first a dullness and slight cloudiness with a faint green cast, and slippery walls; then clearly green and cloudy; finally opaque "pea soup" with no floor visible. Green algae both tint and cloud the water ([Dreame](https://www.dreametech.com/blogs/blog/pool-algae-101-identification-removal-prevention); [Aiper](https://aiper.com/blogs/how-to-get-rid-of-algae-in-pool/); [Pool Operation Management](https://pooloperationmanagement.com/types-of-pool-algae-the-ultimate-comparison-guide/)). Optically: chlorophyll absorbs blue and red, the cells scatter, and the floor fades to a green glow; HydroLight puts 5 mg m⁻³ at FU6 (blue-green) and 50 at FU11 (yellow-green).
- **Causes.** Free chlorine below about 1 mg/l, high pH (above 8 chlorine is largely ineffective), poor circulation and filtration, phosphate (below 100 ppb ideal, above 300 ppb strongly encourages growth, per one retailer), warmth and light ([NIT Trichy pool maintenance](https://Www.Nitt.Edu/home/students/facilitiesnservices/sportscenter/swimmingpool/SwimmingPoolMaintenance.pdf); [iopool](https://iopool.com/blogs/pool-advices/green-pool-despite-chlorine-why-its-not-working-and-how-to-actually-fix-it)). PWTAG: any pool can get algae, outdoor ones especially, sunlight promotes it, and phosphates come from detergents, cleaners and some mains supplies dosed against plumbosolvency ([PWTAG TN18](https://www.pwtag.org/preventing-and-dealing-with-algae-in-pools-march-2014/), members-only beyond the first paragraphs). An indoor hall with rooflights gets daylight: plausible, not confirmed by PWTAG's visible text.
- **Timescale.** Retail guides say "overnight" once chlorine fails. Lab Chlorella doubles in about 11.5 h at its optimum (30 °C, strong light), about 25.6 h otherwise; Chlorella vulgaris grows at 0.75 day⁻¹ at 25–30 °C, 5 times faster than at 10 °C ([SLIIT](https://rda.sliit.lk/entities/publication/e140db78-96d7-46ba-a99c-e198388da89c/full); [Biodiversitas](https://smujo.id/biodiv/article/download/9647/5329/52945)). My arithmetic: from an invisible 0.1 mg m⁻³ to an obviously green 50 mg m⁻³ is about nine doublings, so 4–9 days of growth, but only the last two or three doublings (a day or two) are visible, which is why it seems overnight. Pool water at 28–30 °C is near Chlorella's optimum.

### Mustard (yellow) algae

- **Look.** Flat, powdery, yellow to brownish patches on shaded walls, step treads, behind ladders and on the floor in low-circulation spots; the water stays clear. Brushed, it lifts in a faint cloud and re-forms in the same footprint in about 12–24 h. Often mistaken for dirt, pollen or a stain ([Aiper, mustard](https://aiper.com/blogs/how-to-get-rid-of-mustard-algae-in-pool/); [Swim University](https://www.swimuniversity.com/mustard-algae-pool/); [Aqua Magazine](https://aquamagazine.com/features/abcs-of-algae.html)).
- **Causes.** Shade, poor circulation, chlorine resistance: survives 1–3 mg/l; high cyanuric acid makes it worse outdoors.
- **Timescale.** Days to establish; returns within a day after brushing unless chlorine is high.

### Black algae (in fact cyanobacteria)

- **Look.** Dark blue-black or blue-green raised spots, typically in grout, rough plaster and shaded or poorly circulated corners; it roots into the surface. The water stays clear ([Pool Operation Management](https://pooloperationmanagement.com/types-of-pool-algae-the-ultimate-comparison-guide/); [Aiper, black algae](https://aiper.com/blogs/how-to-get-rid-of-black-algae-in-pool/), naming Phormidium retzii).
- **Causes.** Chronic low sanitiser, shade, porous surfaces, poor brushing.
- **Timescale.** Weeks to establish (my estimate; not sourced); very persistent; regrows from the same spots.
- **Note on "blue-green water".** In a chlorinated indoor pool, cyanobacteria appear as these surface colonies, not as a blue-green water bloom; I found no pool source describing a planktonic cyanobacterial bloom. A blue-green whole-water tint would be artistic licence, or the outcome of a long-neglected, unchlorinated, sunlit pool. The optics above (phycocyanin) say how it would look if wanted.

### Pink slime

- **Look.** Pink to orange-pink slimy streaks and spots at the waterline, in corners, on light fittings, ladders, skimmer throats, return fittings and inside PVC pipework, where water moves slowly ([Wikipedia: Pink algae](https://en.wikipedia.org/wiki/Pink_algae); [Swim University](https://www.swimuniversity.com/pink-slime-white-water-mold-pool/); [Aiper, pink slime](https://blogs.aiper.com/us/what-is-pink-slime-in-pool/)).
- **What it is.** A bacterium, not an alga: Methylobacterium per Wikipedia, Serratia marcescens per several pool sources (pink from prodigiosin); it has an affinity for PVC and often rides on a layer of white water mould. It sits in biofilm that shields it from chlorine.
- **Causes.** Biofilm, slow water, low sanitiser, lack of brushing.
- **Timescale.** Days to weeks (estimate).

### White water mould

- **Look.** White or greyish slimy clumps like wet tissue paper, sometimes cloudy threads; found in skimmer baskets, filters, pipework, and as flecks shed from the returns into the water ([Aiper, white water mould](https://blogs.aiper.com/us/how-to-get-rid-of-white-water-mold-in-pools/); [Hunker](https://www.hunker.com/13417990/how-to-get-rid-of-white-floating-stuff-on-top-of-pool-water/); [Trouble Free Pool](https://www.troublefreepool.com/threads/white-mold.65139)).
- **What it is.** An oomycete (water mould, e.g. Saprolegnia), not a true fungus; usually alongside pink slime.
- **Causes.** Poor circulation, low sanitiser, dirty filters and pipes. Needs repeated heavy shocking and cleaning, over several days.

### Brown or tea-coloured water: tannins, iron, manganese

- **Tannins (organic, CDOM).** Tea-coloured but clear water, and yellow-brown stains where leaves lay, from decaying plant matter ([Orenda](https://blog.orendatech.com/tannins-and-organic-staining-in-pools); [Pool & Spa Marketing](https://poolspamarketing.com/trade/differentiating-stains-and-determining-treatment/print)). A glass of tannin water stays tea-coloured standing; sediment settles ([Webbs](https://webbsonline.com/Article/How-To-How-to-Treat-Tea-Colored-Pond-Water)). Optically pure CDOM: a_y(440) of 1–10 m⁻¹ takes water to FU17–21. Unlikely indoors unless leaves blow in or a source water is peaty.
- **Iron.** Rusty brown or red-brown water, often after shocking fill water from a borehole: chlorine oxidises dissolved iron to coloured ferric particles, so the water turns brown or rust and cloudy, then stains the surfaces brown ([Leslie's](https://lesliespool.com/blog/how-to-manage-metals-in-a-pool.html); [Aiper, green not algae](https://aiper.com/blogs/green-pool-water-not-algae/); [Aqua Magazine](https://aquamagazine.com/retail/identify-before-you-treat.html)). Metals under 0.2 ppm are generally fine (Leslie's).
- **Manganese.** Black, grey or purple water, black-purple stains ([HTH](https://hthpools.com/blogs/pools/discolored-water); [Leslie's](https://lesliespool.com/blog/how-to-manage-metals-in-a-pool.html)); manganese dioxide is soluble only to about 0.1 ppm at pH 7.0 and 0.3 at 8.4, per a forum citing a paper ([Trouble Free Pool](https://www.troublefreepool.com/goto/post?id=910010)).
- **Bacteria.** I found no pool source for brown water caused by bacteria; iron bacteria are a borehole and pipework phenomenon. Treat as unsupported.
- **Timescale.** Metals: minutes to hours after a shock dose or a fill. Tannins: days.

### Copper: blue-green, green and purple

- **Look.** Clear water with a green or blue-green cast that darkens straight after shocking (where algae would clear); blue-green to black stains on surfaces, green hair ([Aqua Magazine](https://aquamagazine.com/retail/identify-before-you-treat.html); [Aiper](https://aiper.com/blogs/green-pool-water-not-algae/); [Orenda](https://blog.orendatech.com/pool-turned-green-from-copper)). Purple water is copper cyanurate, needing cyanuric acid above about 100 ppm, so it belongs to stabilised outdoor pools ([Pool & Spa News](https://www.poolspanews.com/?p=26351); [Aqua Magazine](https://aquamagazine.com/retail/identify-before-you-treat.html)).
- **Causes.** Corroding heat exchangers and pipework when the water is aggressive (low pH, negative saturation index), copper algaecides, copper/silver ionisers.
- **A caution on strength.** Dissolved Cu²⁺ is a weak absorber (about 10 M⁻¹ cm⁻¹ near 800 nm, from general chemistry, not verified). At 1 mg/l that is roughly 0.04 m⁻¹ in the deep red: almost invisible in a pool. The visible effects are the stains and the colloidal or complexed copper after oxidation. So copper should mainly drive surface stains, with only a mild clear blue-green tint.

### Milky or cloudy water: filtration, scale, air

- **Look.** White, neutral cloudiness over the whole body; the floor's detail fades, then the floor itself; little change of hue. PWTAG's causes: low free chlorine, circulation pump failure, high pH, excess air (a failed strainer seal or unvented filter; clears on standing), hardness scale precipitated by local high pH from hand-dosing alkali or sudden temperature change, excessive hardness (calcium hypochlorite in hard water), undissolved chemicals, incompatible cleaning materials destroying flocculation, algae, inadequate filtration (channelling filter beds, damaged laterals, wrong backwash rate, undersized filters) and long turnover periods ([PWTAG](https://www.pwtag.org/cloudy-water-technical-note/)).
- **Scale.** A positive Langelier saturation index (high pH, calcium, alkalinity, temperature) precipitates calcium carbonate: cloudy water, deposits on surfaces and in filters ([Aqua Magazine](https://aquamagazine.com/features/water-balance-indexes.html); [Poolonomics](https://poolonomics.com/langelier-saturation-index/)). Optically: strong scattering, almost no absorption, so a white haze. Scale also roughens and dulls tiles and grout (white crust at the waterline).
- **Timescale.** Air and local scale: minutes. Filtration failure: hours to a day as the bather load's particles accumulate (estimate).

### Foam

- **Look.** White foam patches on the surface, gathering where the water's flow pushes it (against walls, at skimmers or the overflow channel), worse after busy sessions and persisting for days.
- **Causes.** Bather load (sunscreen, lotions, hair products), overdosed or layered quaternary-ammonium algaecides (surfactants; foam within hours of overdosing), low calcium hardness, air drawn into the plumbing ([Beatbot](https://beatbot.com/blogs/pool-care-solutions/swimming-pool-foam-causes-fixes); [Engineer Fix](https://engineerfix.com/what-causes-foam-in-a-pool-and-how-to-get-rid-of-it/); retailer-grade sources).

### Chloramines and the air

- **Chemistry.** PWTAG sets combined chlorine at no more than 1 mg/l; above it, the irritant chloramines volatilise from the water ([PWTAG technical note, 2020](https://www.pwtag.org/?p=1302)). The strong "chlorine" smell of a poorly run pool is chloramines, not free chlorine ([NSW Health](https://www.health.nsw.gov.au/environment/factsheets/Pages/chloramines.aspx)); trichloramine in pool air rises with the number of bathers, and more than half of 20 Italian indoor pools exceeded the suggested 500 µg/m³ ([Eawag](https://www.eawag.ch/en/info/portal/news/news-detail/trichloramine-or-pathogens-in-pool-water); [Unimore](https://unimore.unifind.cineca.it/resource/item/43897)).
- **Is it visible?** I found no source saying chloramine is visible. Trichloramine is a gas; the haze seen in a bad pool hall is condensation and mist from humid, poorly ventilated air (my inference). Recommendation: drive an air haze from the air plant's state (humidity, fresh-air rate) and show chloramines by smell cues, staff and bather complaints, the DPD test's combined chlorine, and perhaps a faint haze that grows with both, flagged as artistic.

## 4. Summary table

Tints and turbidities marked † are my estimates for a game, not measured values. "Path" means the light's path in the water, a few metres in a pool.

| Condition                         | Cause                                                          | Appearance and where                                                | Approximate tint / turbidity                                  | Timescale                                 |
| --------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------- |
| Healthy water                     | FAC 1–3 mg/l, pH 7.0–7.4, filtered                             | Clear, pale turquoise deepening with depth                          | ≤ 0.5 NTU, b ≈ 0.5 m⁻¹; FU1–3 hue                             | —                                         |
| Slight haze                       | Filtration fault, high bather load, slow turnover              | Floor detail at the deep end softens                                | 0.5–1 NTU; neutral                                            | Hours                                     |
| Milky / cloudy                    | Filter failure, scale (LSI > 0), air, undissolved chemical     | White haze, whole body; floor lost                                  | 2–10+ NTU†; b ≈ NTU, almost no absorption, b_b/b ≈ 0.02–0.03† | Minutes (air, scale) to a day             |
| Green algae, early                | FAC < 1, high pH, phosphate, light, warmth                     | Dull, faint green, slippery walls                                   | Chl ≈ 2–10 mg m⁻³†, FU5–7, ≈ 1–3 NTU†                         | 2–5 days after chlorine fails             |
| Green algae, bloom                | As above, uncorrected                                          | Green, cloudy; floor gone at the deep end                           | Chl ≈ 20–100†, FU9–11, c_p ≈ 4–16 m⁻¹                         | 1–2 days more                             |
| Green algae, "swamp"              | Neglect                                                        | Opaque dark green, nothing visible below 0.3 m                      | Chl > 100†, FU12–15                                           | Days                                      |
| Blue-green (cyanobacterial) water | Neglect, light, no chlorine (rare in pools)                    | Blue-green whole-body tint                                          | Chl + phycocyanin, a*PC(620) ≈ 0.007 m² mg⁻¹                  | Days to weeks                             |
| Mustard algae                     | Shade, poor flow, chlorine-resistant                           | Yellow-brown powdery patches on shaded walls and floor; water clear | Surface layer, ≈ #b5a24a† at full coverage                    | Days; re-forms in 12–24 h                 |
| Black algae                       | Chronic low FAC, porous grout, shade                           | Blue-black raised spots, 1–10 mm†, in grout and corners             | Surface spots ≈ #1c2422†                                      | Weeks†                                    |
| Pink slime                        | Biofilm, slow water, PVC                                       | Pink-orange streaks at waterline, corners, fittings, ladders, pipes | Surface ≈ #e0a0a0†, streaky                                   | Days to weeks†                            |
| White water mould                 | Poor circulation, dirty filters/pipes                          | Grey-white tissue-like clumps in skimmers, flecks from returns      | Floating flecks, surface clumps                               | Days to weeks†                            |
| Tannins                           | Leaves, peaty water                                            | Clear tea colour; brown leaf-shaped stains                          | a_CDOM(440) 0.5–10 m⁻¹, FU17–21                               | Days                                      |
| Iron                              | Borehole fill, corrosion, shock oxidises it                    | Rusty brown and cloudy; brown stains                                | a(440) ≈ 1 m⁻¹ per mg/l Fe†, ≈ 1–2 NTU per mg/l†              | Minutes–hours after shock                 |
| Manganese                         | Fill water, oxidised                                           | Brown-black or purple; black stains                                 | Grey-purple absorption†                                       | Minutes–hours after shock                 |
| Copper                            | Corrosion (low pH), copper algaecide, ioniser                  | Clear blue-green/green cast after shock; blue-green/black stains    | Dissolved: negligible tint (calculated); stains dominate      | Hours (tint), weeks (stains)              |
| Purple (copper cyanurate)         | Copper + CYA > 100 ppm (outdoor)                               | Purple-tinted water and stains                                      | Not quantified                                                | Days                                      |
| Foam                              | Bather load, quat algaecide overdose, low hardness, air        | White foam at walls, skimmers, overflow                             | Surface coverage 0–1                                          | Hours (algaecide); next morning (bathers) |
| Chloramines                       | Combined chlorine > 1 mg/l, bather pollution, poor ventilation | Smell, sore eyes; any visible haze is mist†                         | Air fog density, artistic†                                    | Hours                                     |

## 5. Recommended mapping from model state to shader

Fits the project's rules: the water quality of each pool lives in the world state (`src/game/world.ts`); a pure function in a `logic/` folder (tested beside it) turns it into shader inputs; the views only upload uniforms. Per-pool uniforms replace the baked `ABSORPTION` and `SCATTER` literals.

### Model state (per pool)

- `chlorophyll` mg m⁻³ (green algae biomass), `phycocyanin` mg m⁻³ (cyanobacteria, optional);
- `mineralNtu`: non-algal turbidity from the filter's performance, scale and air (NTU);
- `cdom440` m⁻¹ (tannins), `iron`, `manganese`, `copper` mg/l (dissolved, and an oxidised fraction for iron and manganese);
- `foam` 0–1; surface growth fields (below);
- the derived `turbidityNtu` = mineralNtu + algal contribution, which is what the plant's turbidimeter (if any) and the PWTAG visual test should read.

### Inherent optical properties per channel (R, G, B)

```
a  = a_water                                   // existing ABSORPTION, (0.5, 0.1, 0.04)
   + A_ph · chl^0.75                           // A_ph = (0.010, 0.012, 0.035); exponent 0.75 a simplification of Bricaud's E(λ)†
   + A_pc · pc                                 // A_pc ≈ (0.004, 0.001, 0.0005)† (phycocyanin, 620 nm peak spread over the red band)
   + cdom440 · (0.061, 0.275, 0.779)           // CDOM exponential, S = 0.014
   + fe_ox · (0.06, 0.28, 0.78) · 1.0†         // ferric colloid treated as a steep CDOM, per mg/l
   + mn_ox · (0.25, 0.35, 0.30)†               // grey-brown/purple, per mg/l
b  = mineralNtu · (1, 1, 1)                    // b ≈ NTU (Kirk; Murray–Darling)
   + 0.407 · chl^0.795 · (0.9, 1.0, 1.1)       // algal particles (case-1 c_p), slight blue bias†
   + fe_ox · 1.5†
bb = 0.018 · b_algae + f_min · b_mineral       // f_min ≈ 0.02, up to 0.03 for scale†
```

### Shading a tile seen through the water

Keep today's structure, and add the forward-scattered (blurred) light, which is what makes murky water lose the tiles' pattern before it loses their brightness:

```
K     = a + bb                     // diffuse attenuation, approximately
c     = a + b                      // beam attenuation
u     = bb / (a + bb)
Rinf  = gain · (0.089·u + 0.1245·u²)   // the deep water's own colour (QAA)
sharp = tile     · exp(-c · L)          // unscattered: the tile's detail
soft  = tileMean · (exp(-K · L) - exp(-c · L))  // scattered forward: the tile's light, blurred
seen  = sharp + soft + Rinf · (1 - exp(-K · L))
```

`tileMean` is the tile's average colour with grout blended in (the shader already has this as the far-distance tile blend), so as turbidity rises the grid fades to a flat colour, then to the water's own glow. With b = 0 it reduces exactly to the current formula, `SCATTER` becoming `Rinf`. Choose `gain` once so the healthy-water state reproduces the current `SCATTER = (0.02, 0.2, 0.26)`; then every fault moves away from the look already approved rather than changing the baseline. Caustics: multiply their strength by `exp(-c · depth)` as well (scattering smears the focus; murky pools have no caustics), and by `exp(-K · depth)` for dimming.

Worked check (my arithmetic, healthy versus a bloom, 3 m path): at chl = 100, `a ≈ (0.83, 0.48, 1.14)`, transmittance ≈ (0.08, 0.24, 0.03): green dominates, as it should; `c_p ≈ 16 m⁻¹`, so the floor's detail is gone within 0.3 m.

### The surface above (vendored `WaterAbove.frag`)

Replace the constant `abovewaterColor` and `underwaterColor` with uniforms derived from the same `exp(-K)` per metre, and mix the refracted colour toward `Rinf` by `1 - exp(-c · L)` along the refracted ray's length (it already ray-traces to the pool's box, so L is to hand). Add `foam` as a surface mask: noise thresholded by coverage, advected by the flow map (`poolFlowMap`) so it piles against walls and at the skimmers or overflow.

### Surface growths and stains

These are not in the water and need their own layer in the tile shader: one or two RGBA growth masks per pool (a low-resolution texture over the pool's tile coordinates, or procedural noise with per-condition coverage uniforms), each with a colour, a placement rule and a coverage 0–1 from the model:

- **pink slime**: band within ±5 cm of the waterline, plus corners and around fittings; streaky noise;
- **black algae**: sparse spots in grout lines (the shader knows where grout is), favouring shaded and low-flow cells;
- **mustard**: broad soft patches on shaded walls and floor, recovering in 12–24 h after brushing;
- **metal stains**: brown (iron), blue-green/black (copper), black-purple (manganese), concentrated near inlets and on the floor under them;
- **scale**: white crust at the waterline and roughened, duller glaze (raise roughness) below it;
- **green film**: on walls and floor as chlorophyll stays high, so the pool looks dirty even after the water is cleared, until brushed.

Low-flow and shaded areas can come from the flow map the pool already has and from the rooflights' layout, so growth appears where the plant model says circulation is poor.

### Air

Tie `scene.fog` density to the air plant (humidity, ventilation), with a small artistic contribution from combined chlorine if wanted, and keep the instruments (DPD combined chlorine, an air-quality meter) as the true indicators.

## 6. Prior art and licences

- **Evan Wallace's WebGL Water / Yong Su's ThreeJS Water** (already vendored, MIT): fixed tint constants; the place to add the uniforms ([repository](https://github.com/jeantimex/threejs-water)).
- **Monzon, Gutierrez, Akkaynak and Muñoz, "Real-Time Underwater Spectral Rendering", Computer Graphics Forum 43(2), 2024**: an analytic approximation of radiative transfer driven by measured Kd for different water types, real time, close to Monte Carlo; code and demo on [Shadertoy 4cVGD3](https://www.shadertoy.com/view/4cVGD3) ([project page](https://graphics.unizar.es/projects/EG24Underwater/); [paper](https://diglib.eg.org/handle/10.1111/cgf15009)). The project page states no licence; Shadertoy's default, as far as I know, is CC BY-NC-SA 3.0 unless the author says otherwise, which would not suit copying into a GPL-3 game. Use as a reference for the method; ask the authors if code is wanted.
- **Monzon et al. 2022, multiple scattering approximation** ([Eurographics STAG poster](https://diglib.eg.org/items/988aed77-31ee-4f91-9fe6-5706389c1a37/full)): results across Jerlov water types.
- **Akkaynak and Treibitz 2017 and 2018** ([CVPR 2018](https://openaccess.thecvf.com/content_cvpr_2018/papers/Akkaynak_A_Revised_Underwater_CVPR_2018_paper.pdf); [space of RGB attenuation coefficients, 2017](https://csms.haifa.ac.il/profiles/tTreibitz/webfiles/Akkaynak_et_al_2017_SpaceOfAttenuationCoefficients.pdf)): the physically valid range of RGB attenuation coefficients for Jerlov water types, useful to sanity-check our per-channel numbers. Papers, not code.
- **Catlike Coding, "Looking through Water"** (Unity): depth fog `fogFactor = exp2(-density · depthDifference)`, `lerp(fogColour, background, fogFactor)`, density 0.15, colour #4E83A9 ([tutorial](https://catlikecoding.com/unity/tutorials/flow/looking-through-water/)). The simplest one-colour version of what we already have; no licence stated on the page.
- **Godot**: [Absorption Based Stylized Water](https://godotshaders.com/shader/absorption-based-stylized-water/) (per-colour absorption by depth; licence not checked), [marcelb/GodotSSRWater](https://godotengine.org/asset-library/asset/2152) (MIT) and [fire/godot-realistic-water](https://godotshaders.com/shader/realistic-water/) (MIT): neither models turbidity or algae.
- **Unity Boat Attack** ([repository](https://github.com/Unity-Technologies/BoatAttack)) and **Crest** ([docs](https://crest.readthedocs.io/en/4.20/about/introduction.html)): ocean systems with absorption and scattering colours; licence not confirmed in my search, and neither targets three.js.
- **Subnautica**: players and developers discuss physically based underwater fog with separate absorption and particle colour ([Unknown Worlds forum](https://forums.unknownworlds.com/discussion/comment/2181519)).

I found no game, paper or shader that renders pool algae, pool turbidity or pool biofilms specifically. The ocean-colour literature (case-1 model, CDOM, QAA, Forel–Ule) is the best quantitative base, and it is formulas, free to implement.

## 7. What is a guess

- b ≈ 1 m⁻¹ per NTU: a rough empirical equivalence with much scatter.
- The exponent 0.75 for chlorophyll absorption: a single-number stand-in for Bricaud's wavelength-dependent E(λ).
- The case-1 relations are for ocean phytoplankton; pool algae (Chlorella-like greens, filamentous forms) differ in pigment packaging and scattering. Treat chlorophyll values for each stage as calibrated to look right, not measured in pools.
- Phycocyanin band coefficients, iron and manganese per-mg/l absorptions and scattering, scale's backscatter fraction, surface-growth colours, spot sizes and the establishment times for black algae, pink slime and white water mould: my estimates, labelled † above.
- Copper's weak solution colour: from a general-chemistry figure I did not verify.
- That chloramine is invisible and the haze is mist: inference, no source found either way.
- The sRGB values for the Forel–Ule classes: my conversion of published CIE chromaticities, hue only.
- The "4–9 days, of which the last day or two visible" algae timescale: arithmetic from lab growth rates, not observed in pools.

## 8. Sources

- PWTAG, cloudy water technical note: https://www.pwtag.org/cloudy-water-technical-note/
- PWTAG, combined chlorine technical note (December 2020): https://www.pwtag.org/?p=1302
- PWTAG, TN18 algae: https://www.pwtag.org/preventing-and-dealing-with-algae-in-pools-march-2014/
- Washington State WAC 246-260: https://lawfilesext.leg.wa.gov/law/WACArchive/2023/htm/WAC%20246%20%20TITLE/WAC%20246%20-260%20%20CHAPTER/WAC%20246%20-260%20-999.htm
- Pool Operation Management, water clarity: https://pooloperationmanagement.com/pool-service-technician-water-clarity/
- Pool Operation Management, algae comparison: https://pooloperationmanagement.com/types-of-pool-algae-the-ultimate-comparison-guide/
- Palintest, turbidity: https://www.palintest.com/a-focus-on-turbidity-2/
- Wikipedia, Turbidity: https://en.wikipedia.org/wiki/Turbidity
- ISO 7027-1 (AFNOR listing): https://www.boutique.afnor.org/en-gb/standard/iso-702712016/water-quality-determination-of-turbidity-part-1-quantitative-methods/xs027191/126888
- Durham / White Rose, turbidity units proposal: https://eprints.whiterose.ac.uk/123243
- Kirk 1981, scattering coefficient: https://publish.csiro.au/mf/MF9810533
- Murray–Darling Basin optical properties: https://www.publish.csiro.au/MF/MF9900581
- Zaneveld and Pegau 2003: https://misclab.umeoce.maine.edu/ftp/classes/OO2017/readings/Zaneveld_visibility_OX2003.pdf
- Ocean Optics Web Book, contrast: https://oceanopticsbook.info/view/photometry-and-visibility/level-2/contrast/pdf
- Ocean Optics Web Book, new case-1 IOP model: https://oceanopticsbook.info/view/optical-constituents-of-the-ocean/level-2/new-iop-model-case-1-water
- Ocean Optics Web Book, CDOM: https://oceanopticsbook.info/view/optical-constituents-of-the-ocean/colored-dissolved-organic-matter
- Oceanologia 2002, CDOM slopes: https://doaj.org/article/bee814ae4cc9418ba2a9095debc47c5e
- OMLC, Bricaud et al. 1995 data: https://omlc.org/spectra/water/data/bricaud95.txt
- UNCW, Secchi: https://people.uncw.edu/cahoon/Secchi.htm
- Lee, IOCCG lecture 3: https://ioccg.org/wp-content/uploads/2024/12/zhongping-lee_lecture-3_iops-appl.pdf
- Frontiers in Marine Science 2024, Kd from Secchi: https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2024.1265382/epub
- USGS Willamette Secchi model: https://or.water.usgs.gov/will_morrison/secchi_depth_model.html
- IOCCG QAA v6: https://ioccg.org/wp-content/uploads/2020/11/qaa_v6_202011.pdf
- Lee, Carder and Arnone 2002: https://misclab.umeoce.maine.edu/ftp/classes/OO2011/Readings/Lee-2002-AO.pdf
- Wernand and van der Woerd 2010, Forel–Ule spectra: https://research.vu.nl/ws/files/2796870/253567.pdf
- Mobley, HydroLight Technical Note 8: https://misclab.umeoce.maine.edu/ftp/classes/OO2013/Dropbox_backup_Aug13/Documents/HTN8_Forel-Ule.pdf
- Sencast, Forel–Ule hue angles: https://sencast.readthedocs.io/en/latest/processors/forelule.html
- Phycocyanin at 620 nm: https://scholarworks.indianapolis.iu.edu/server/api/core/bitstreams/d2786fbc-d51d-43c9-8cb2-12723174637b/content and https://www.mdpi.com/2072-4292/11/15/1764
- Carlson trophic state index: https://en.wikipedia.org/wiki/Trophic_state_index and https://www.nalms.org/secchidipin/monitoring-methods/trophic-state-equations/
- Chlorella growth: https://rda.sliit.lk/entities/publication/e140db78-96d7-46ba-a99c-e198388da89c/full and https://smujo.id/biodiv/article/download/9647/5329/52945
- Dreame, algae: https://www.dreametech.com/blogs/blog/pool-algae-101-identification-removal-prevention
- Aiper, algae: https://aiper.com/blogs/how-to-get-rid-of-algae-in-pool/
- Aiper, mustard: https://aiper.com/blogs/how-to-get-rid-of-mustard-algae-in-pool/
- Aiper, black algae: https://aiper.com/blogs/how-to-get-rid-of-black-algae-in-pool/
- Aiper, pink slime: https://blogs.aiper.com/us/what-is-pink-slime-in-pool/
- Aiper, white water mould: https://blogs.aiper.com/us/how-to-get-rid-of-white-water-mold-in-pools/
- Aiper, green water that is not algae: https://aiper.com/blogs/green-pool-water-not-algae/
- Swim University, mustard: https://www.swimuniversity.com/mustard-algae-pool/
- Swim University, pink slime and white water mould: https://www.swimuniversity.com/pink-slime-white-water-mold-pool/
- Aqua Magazine, ABCs of algae: https://aquamagazine.com/features/abcs-of-algae.html
- Aqua Magazine, stains: https://aquamagazine.com/retail/identify-before-you-treat.html
- Aqua Magazine, water balance indexes: https://aquamagazine.com/features/water-balance-indexes.html
- Poolonomics, LSI: https://poolonomics.com/langelier-saturation-index/
- Wikipedia, Pink algae: https://en.wikipedia.org/wiki/Pink_algae
- Hunker, white water mould: https://www.hunker.com/13417990/how-to-get-rid-of-white-floating-stuff-on-top-of-pool-water/
- Trouble Free Pool, white mould: https://www.troublefreepool.com/threads/white-mold.65139
- Trouble Free Pool, manganese: https://www.troublefreepool.com/goto/post?id=910010
- NIT Trichy pool maintenance: https://Www.Nitt.Edu/home/students/facilitiesnservices/sportscenter/swimmingpool/SwimmingPoolMaintenance.pdf
- iopool, green despite chlorine: https://iopool.com/blogs/pool-advices/green-pool-despite-chlorine-why-its-not-working-and-how-to-actually-fix-it
- Leslie's, metals: https://lesliespool.com/blog/how-to-manage-metals-in-a-pool.html
- HTH, discoloured water: https://hthpools.com/blogs/pools/discolored-water
- Pool & Spa News, purple pools: https://www.poolspanews.com/?p=26351
- Orenda, copper: https://blog.orendatech.com/pool-turned-green-from-copper
- Orenda, tannins: https://blog.orendatech.com/tannins-and-organic-staining-in-pools
- Pool & Spa Marketing, stains: https://poolspamarketing.com/trade/differentiating-stains-and-determining-treatment/print
- Webbs, tea-coloured water: https://webbsonline.com/Article/How-To-How-to-Treat-Tea-Colored-Pond-Water
- Beatbot, foam: https://beatbot.com/blogs/pool-care-solutions/swimming-pool-foam-causes-fixes
- Engineer Fix, foam: https://engineerfix.com/what-causes-foam-in-a-pool-and-how-to-get-rid-of-it/
- NSW Health, chloramines: https://www.health.nsw.gov.au/environment/factsheets/Pages/chloramines.aspx
- Eawag, trichloramine: https://www.eawag.ch/en/info/portal/news/news-detail/trichloramine-or-pathogens-in-pool-water
- Unimore, trichloramine in Italian pools: https://unimore.unifind.cineca.it/resource/item/43897
- Monzon et al. 2024: https://graphics.unizar.es/projects/EG24Underwater/ and https://diglib.eg.org/handle/10.1111/cgf15009 and https://www.shadertoy.com/view/4cVGD3
- Monzon et al. 2022: https://diglib.eg.org/items/988aed77-31ee-4f91-9fe6-5706389c1a37/full
- Akkaynak and Treibitz 2018: https://openaccess.thecvf.com/content_cvpr_2018/papers/Akkaynak_A_Revised_Underwater_CVPR_2018_paper.pdf
- Akkaynak et al. 2017: https://csms.haifa.ac.il/profiles/tTreibitz/webfiles/Akkaynak_et_al_2017_SpaceOfAttenuationCoefficients.pdf
- Catlike Coding: https://catlikecoding.com/unity/tutorials/flow/looking-through-water/
- Godot shaders: https://godotshaders.com/shader/absorption-based-stylized-water/ , https://godotengine.org/asset-library/asset/2152 , https://godotshaders.com/shader/realistic-water/
- Unity Boat Attack: https://github.com/Unity-Technologies/BoatAttack
- Crest: https://crest.readthedocs.io/en/4.20/about/introduction.html
- Unknown Worlds forum: https://forums.unknownworlds.com/discussion/comment/2181519
- Blender Artists, volume absorption and scatter: https://blenderartists.org/t/principled-volume-broken-in-3-2/1388317
- Yong Su, ThreeJS Water: https://github.com/jeantimex/threejs-water
