# Development Diary Entry - 2026-10-20

## Context

| Time      | Branch | Commit        | Task                                                                   |
| --------- | ------ | ------------- | ---------------------------------------------------------------------- |
| 17:00 UTC | main   | after 9d5661e | Panel branding, flue and combustion panel, water prototype, pool edges |

## What we were asked to do

The owner asked for every mimic and control panel to carry a discreet Penfold Controls mark, and for Hamwarmy's logo to be a warm, happy pig. Looking at the boiler cascade, the owner asked whether its flue should really be an inverted Y and whether exhaust would be monitored; we agreed a header with 45° branches and a Penfold combustion and ventilation panel with permanently installed flue thermometers (no portable analyser). On the front of house, the owner asked whether Yong Su's three.js water, three.js caustics and Šime Bugarija's Blender poolrooms course could be used, and whether lighting could be pre-rendered, then for a prototype, and for a dev room of pool edges through the decades.

## What we did

Added `panel-maker-mark.ts` and put Penfold's mark on the mimics, the annunciator, recorder and readout panels, the cubicles, the gas safety board and the dev14/15 stations; drew Hamwarmy's pig. Rebuilt the cascade flue: 45° swept branches, a non-return flap and test point on each riser, a header rising 3° to a reducer, a condensate drain and trap at its low end. Wrote `combustion.ts` (flue temperatures with fouling, fan proving, CO build-up and alarm, the boilers' permit) and the combustion panel, and fitted dial thermometers to the risers and header. Researched the water and baking options (`doc/research/pool-water-and-baked-light.md`), vendored Yong Su's MIT library with small marked adaptations into `src/toolkit/vendor/threejs-water/`, and built dev16 around it. Built dev17: four full-size cut-aways of pool edges from data in `edge-profiles.ts`.

## Outcome

All five checks pass (496 tests). In the browser, turning the combustion air fan OFF inhibits the boilers; dev16 runs at 60 fps with convincing refraction, but its caustics do not form webs at a 20 m scale; dev17 shows the four edges.

## What we learned

Evan Wallace's water is built for a 2 m pool: its surface and refraction scale well, its caustics do not, so a real-size pool wants either our projected caustics or a small repeating simulation patch. Condensing boiler flues matter for flow, backflow and condensate rather than heat. Continuous emissions monitoring is for large combustion plant; a 600 kW boiler house watches flue temperature and CO instead.
