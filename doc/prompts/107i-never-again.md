# 107i: PLANTROOMS, "Never again: putting safety first": the chlorination disaster that nearly was (sponsored by Chlorella)

Status: planned 2026-10-28, not started. A sub-prompt of mission 107 (`doc/prompts/107-pool-science-museum.md`), after 107-0 (`doc/prompts/107-0-exhibit-groundwork.md`). One of the owner's themes for Halls 5 to 12, **not yet given a hall number**: the owner will place it.

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first and follow it. Then read mission 107 (the PLANTROOMS brand and its joke), 107-0, missions 085 and 086 (`doc/prompts/085-chemical-distribution.md`, `doc/prompts/086-chemical-handling-dev-room.md`: the game's chemical deliveries, the fill cabinet and its couplings) and the memory note that all safety signage is current UK style.

## The owner's request

The owner, 2026-10-28: "The Hindenburg of aquatics centres": a mainly photo-based exhibit about a chlorination disaster: how the unsafe handling of swimming pool fluids almost led to a costly and life-threatening disaster in a British leisure centre. Caption: **"Never again: putting safety first"**, sponsored by Chlorella. The joke is that it is the chemical supplier sponsoring the safety exhibit, an echo of PLANTROOMS cashing in on a meme. The incident is fictional; the way it happens is true, researched from real UK incidents. A dark-walled gallery, a change of mood after the white halls, with large framed "photographs" and press "clippings" in a timeline (the delivery, the mix-up, the gas, the evacuation, the inquiry, the changes); a central case with the two fill points that were confused, in our own fill cabinet with its now incompatible couplings; Chlorella's sponsor panel and the lessons at the end. Non-interactive, but perhaps for a button that plays a short narrated account, in the owner's narration slots like the skimmer's (107f).

## Rules for every hall (the owner, 2026-10-28)

1. **Every hall starts from its reset state the moment you step into it.** Its time is set to now, the visitor's real local time, and its exhibit is put in its reset condition. Walking in is the same as pressing its RESET button. No hall's state carries over from an earlier visit. Here the only state is the narration: walking in stops it, and nothing else changes. No RESET pedestal is needed (the hall is static).
2. **Time.** A hall's simulated time starts at now. Halls may show time in different ways. **This hall shows time as the incident's own timeline:** the clippings and photographs in order round the walls, each with its time of day on the fateful morning ("07:42 · The tanker arrives"), and a station clock in one photograph stopped at the moment the gas alarm sounded. No running clock, no speed buttons.
3. **Halls start empty.** The hall begins with set decoration only; this sub-prompt builds its exhibit.

## What the hall teaches, and what it builds on

**Assumes:** that pools are dosed with sodium hypochlorite and with acid (Hall 3, if seen; otherwise the first panel says it), and that both are delivered by tanker into bulk tanks.

**Teaches:** sodium hypochlorite and acid must never meet: mixed, they give off chlorine gas, which is heavier than air, choking, and can kill. The commonest way it happens is a delivery into the wrong tank. Every defence a modern plant room has (fill points that cannot be confused, labels, supervised deliveries, separate bunded stores, gas detection, an evacuation plan) is there because of incidents like this one.

## The real incidents (research summary)

The fiction must be truthful about how it happens. From UK reports and prosecutions (secondary sources, to be checked against the HSE's own notices and recorded with their links in `doc/research/pool-chlorine-releases.md` before any panel's wording is final):

- **The commonest cause.** An HSE inspector, on the 2023 prosecution below: the accidental addition of acid to hypochlorite is the commonest cause of chlorine release incidents in pool buildings.
- **Wells, Somerset, 1989:** a tanker driver connected the wrong pipe and discharged hydrochloric acid into a sodium hypochlorite tank; eight people were treated for chlorine inhalation (from an incident review in a Hong Kong environmental impact assessment, Annex D, listing historical incidents; a secondary source).
- **Hednesford, Staffordshire, 2009 (prosecuted 2012):** at a health club's pool, a maintenance contractor's engineer mixed sodium bisulphate (dry acid) and sodium hypochlorite in the plant room; eight or nine people were taken to hospital; the club operator and the maintenance contractor were each fined £45,000 with about £14,750 costs each; the council's officer found both firms' risk assessments insufficient and outdated (Express & Star, 18 October 2012; accounts differ on which chemical went into which).
- **Basingstoke, Hampshire, 2021 (prosecuted 2023):** at a clinic's hydrotherapy pool an engineer, asked to lower the pH, added sodium bisulphate to the sodium hypochlorite tank; three workers were treated; the operator had no trained staff for the pool plant and the engineer had not been fully trained in dosing or chemical storage; fined £160,000 with £12,520 costs (HSE press release; PWTAG's notice).
- **Sheffield, 2016:** a leisure centre evacuated after technicians mixed two chemicals while working on the filtration; the operator fined £7,000 with £5,500 costs (SHP).
- **Edinburgh:** a health club's operator fined £20,000 after chemicals were mixed in a maintenance cupboard and gas released (Edinburgh Evening News; the council enforcing).
- **London, 23 March 2022:** a gas release during the delivery of pool chemicals to a large public aquatics centre; about 200 evacuated, 77 treated, 29 taken to hospital; the fire brigade reported "a chemical reaction" releasing a high quantity of chlorine (national news reports; the chemicals not confirmed in the reports found).
- **St Andrews, Fife, 2015:** not a mix but a failed, unsuitable bulk hypochlorite tank (poor welds, an unsuitable support, a room too small to inspect it, a neglected bund, long-standing crystalline deposits unnoticed); 19 people treated; the council moved its pools off bulk hypochlorite (The Courier, 5 July 2016).

**The typical failure modes**, which the fiction uses: fill points side by side with the same coupling, so either hose fits either; worn, missing or confusing labels; a delivery made unsupervised, early or late, by a driver unfamiliar with the site; no check of the delivery note against the tank before connecting; contractors and untrained staff handling chemicals; stores of acid and hypochlorite sharing a room or a bund; no gas detection, or a detector disconnected; no evacuation plan, or one never rehearsed; poor tank inspection and bund maintenance.

**The lessons:** fill points that cannot be confused (different couplings by chemical, colour-coded and labelled, in separate lockable cabinets, the keys held by trained staff); every delivery supervised by a trained member of staff who checks the delivery note, the chemical and the tank before anything is connected; separate, bunded stores, one chemical each; chlorine gas detection in the plant room and stores, with alarm and ventilation; a written, rehearsed emergency and evacuation plan; trained staff and competent contractors (HSE's HSG179, "Health and safety in swimming pools", and PWTAG's guidance, both to be cited from their texts, not from summaries).

## The incident, fictional

Everything about the incident is invented, and plainly part of the game's fiction:

- **The place:** a fictional municipal pool, proposed "Pellingford Baths and Leisure Centre" in a fictional town, Pellingford (check that no real UK leisure centre, town or newspaper has the name before using it).
- **The paper:** a fictional local evening paper, proposed "The Pellingford Evening Lamp", with its own invented masthead in its own typeface; it imitates no real newspaper's masthead, layout, typeface or name.
- **The date:** a fictional weekday morning in spring 1997, when the game's plant was young.
- **The people:** no real people, victims or officials; the people in photographs are the game's own anonymous figures, unidentifiable; quoted "witnesses" are invented and generic ("a swimmer", "a lifeguard").
- **Nobody dies.** It is the disaster that nearly was: people treated for breathing difficulties, a hall evacuated, the building shut for weeks; "it could have been so much worse" is the point.

**The story, in six chapters round the walls:**

1. **The delivery** (07:42): a tanker arrives early, before the duty technician's shift; the driver is new to the site; the fill points are two identical couplings side by side in an open recess, their labels faded.
2. **The mix-up** (07:51): the acid hose is connected to the hypochlorite fill; four hundred litres of acid go into the bulk hypochlorite tank.
3. **The gas** (07:58): chlorine rises from the tank's vent into the plant room and, through the air handling's intake, towards the pool hall; the plant room's gas detector had been disconnected after false alarms.
4. **The evacuation** (08:05): the early swimmers and staff out into the car park, swimmers in foil blankets, fire crews in gas-tight suits, the tanker standing at the loading bay.
5. **The inquiry** (weeks later): the inspectors' findings, the court's fine (fictional figures, of the order of the real ones), the centre shut for six weeks.
6. **The changes:** the fill cabinet redesigned, incompatible couplings, separate stores, gas detection with alarm and ventilation, supervised deliveries, the emergency plan rehearsed: the plant room the visitor has just walked through.

A small line on the opening panel and on the sponsor's panel: "A dramatisation based on real incidents. The people, places and newspaper are fictional."

## The photographs and clippings

- **Photographs:** our own scenes, rendered in the game's engine from its own rooms and props (the loading bay and a delivery tanker, mission 097's trucks; the plant room's fill point; a pool hall emptied; fire crews in gas-tight suits as new, simple figures; swimmers in foil blankets outside the building), each captured once into a texture by a small offline script and styled as period press photographs (black and white or faded colour, film grain, halftone, a little blur, white borders, a caption beneath). Committed as images with the script that made them, so they can be remade. No real photograph, and nothing traced from one.
- **Clippings:** our own front pages and inside pages of the fictional paper, drawn on canvases from text in a data file (headline, standfirst, body copy, a photograph from the set, the date and price), yellowed, pinned in frames. Our own headlines, clearly fiction: "GAS ALERT AT THE BATHS", "'IT CAME UP LIKE A GREEN FOG'", "BATHS SHUT FOR SIX WEEKS", "WHO CHECKED THE TANKER?", "NEW SAFETY RULES AFTER BATHS SCARE".
- **The timeline:** six large framed photographs, one per chapter, with their clippings beside them, round the walls in order; each chapter's plaque gives its time and what went wrong at that step, and the real-world lesson in one line.

## The central case

A museum case in the middle of the hall (PLANTROOMS' make), lit from above, holding **the two fill points**, before and after:

- **Before (1997):** two identical couplings side by side in an open recess, their faded labels, "how the hose could go on either".
- **After (now):** the game's own fill cabinet (`createFillCabinet`, `src/toolkit/components/plant/views/chemicals-storage.ts`), its hypochlorite port a 2-inch brass camlock and its acid port a 1½-inch polypropylene Guillemin, colour-coded and labelled ("SODIUM HYPOCHLORITE · 2" CAMLOCK", "HYDROCHLORIC ACID · 1½" GUILLEMIN"), with the matching hose ends beside each: the acid's hose cannot couple to the hypochlorite's port. A plaque: "The fix: make the mistake impossible."

The case ties to the game: the loading bay's fill points and the wet hall's never-mix notices (`'never-mix'` in `src/toolkit/gallery/logic/building-signs.ts`) are the same design, and a sign says so ("You will find these in the leisure centre's own loading bay").

## The sponsor's panel and the lessons

The hall ends with **Chlorella's sponsor panel** (Chlorella Chemicals, in `brands.ts`: founded 1956, "Clear water, clear conscience", who make sodium hypochlorite and pH correction and deliver them in bulk by their own tankers): "**Never again: putting safety first.** Chlorella is proud to support this exhibition." Beneath it, the lessons as a numbered list, each a sentence, and the dramatisation line. The joke is left to the visitor: the tanker in chapter 1's photograph wears a livery that might, if you look closely, be Chlorella's green (question 2).

## The narration

A single museum push button by the first chapter, "HEAR WHAT HAPPENED", plays a short narrated account (about two minutes) front centre, the chapters lighting in turn as it goes; pressing again stops it. Clips in the owner's narration slots, as the skimmer's: `resources/sound/voice/never-again/account.mp3`, and optionally a clip per chapter (`chapter-1.mp3` … `chapter-6.mp3`), loaded by `import.meta.glob` so that missing clips are simply absent; with no clip, the button lights the chapters in turn with their plaque text and is silent. A script in `resources/sound/voice/never-again/index.md` for the owner to record.

## The schematic

None: the hall shows no working plant. The fill cabinet in the case is a specimen, its couplings real in form but connected to nothing (CLAUDE.md allows static set decoration for what is not plant; the case is labelled as a museum specimen). The narration button is the hall's only control.

## The mimic

None.

## The museum panels (text outline)

- **Opening panel** (by the way in, on the dark wall): headline "Never again: putting safety first"; the big idea: "Two of the chemicals that keep a pool safe must never meet. Mixed, they make chlorine gas. This is the story of a morning when they did." The memorable fact: "The commonest cause of chlorine gas in a pool building is acid getting into hypochlorite: usually by accident, usually at a delivery." The dramatisation line. Sponsored by Chlorella.
- **Six chapter plaques** (above).
- **The case's plaque** (above).
- **The sponsor's panel and the lessons** (above).

## Try it

"Press HEAR WHAT HAPPENED and follow the story round the walls. Then look in the case: could you connect the wrong hose?"

## Reuses (paths checked 2026-10-28)

`src/toolkit/components/plant/views/chemicals-storage.ts` (`createFillCabinet`, `createIbc`, `createBundedTank`), the delivery trucks of mission 097 (`doc/prompts/097-delivery-trucks-dev-room.md`), `src/toolkit/components/core/logic/brands.ts` (`chlorella`, `haulmark`) and `src/toolkit/components/core/views/brand-livery.ts`, `src/toolkit/gallery/logic/building-signs.ts` (`never-mix`), the loading bay and wet hall rooms as photograph sets, `src/toolkit/components/core/audio/front-centre.ts`, `src/toolkit/gallery/views/museum-exhibit.ts` (panels, lecterns), the control-part kit's `pushButton`.

**New:** the research note `doc/research/pool-chlorine-releases.md`; the fictional incident's data (places, times, headlines, copy); the offline photograph script and its images; the clippings' canvas drawing and the paper's masthead; the "before" fill point; the case; the dark gallery finish (walls, picture lighting); the gas-tight-suited and foil-blanketed figures; the narration button and its clip loader.

## Acceptance

- Every real-world statement on any panel traceable to `doc/research/pool-chlorine-releases.md` and its primary sources; no real newspaper, person, victim or named real leisure centre anywhere in the exhibit (a review check); the dramatisation line on the opening and sponsor's panels.
- The narration button works with no clips (chapters lit in turn, silently) and with a test clip (front centre; the test clip not committed); walking in stops it.
- **Walking in from the hall before:** the change of mood from white to dark, the chapters in order along the route; walk on and back.
- Browser checks on high, medium and low; screenshots and camera links recorded here.

## Performance budget

Static: photographs and clippings as textures drawn once (sized for legibility at two metres, not more: mind the texture memory of a dozen large frames), frames and case merged by material, picture lights as a few spot lights or baked pools of light; within `DEFAULT_BUDGET`; at least 60 fps on medium and 50 on high through an archway.

## Open questions for the owner (one at a time, in this order)

1. **The hall's title:** "Never again: putting safety first" as its title, with "The Hindenburg of aquatics centres" kept as our working description, or a title of its own on the wall (for instance "The Pellingford Incident")?
2. **Whose tanker:** Chlorella's own green livery on the tanker in the photographs (the sponsor's joke made sharper, never mentioned on its panel), or a haulier's?
3. **The names:** Pellingford and the Evening Lamp, or names of your own?
4. **The narration:** one account, or a clip per chapter as well?
