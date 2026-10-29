# Performance pass, 2026-10-29

The owner (2026-10-29): "check the performance of everything". Ten museum halls and many new components had been built that day and none had been benchmarked or frame-timed.

## Contents

- [How it was measured](#how-it-was-measured)
- [Components over budget](#components-over-budget)
- [The museum halls' exhibits](#the-museum-halls-exhibits)
- [Rooms × presets](#rooms--presets)
- [Fixes](#fixes)
- [What is left](#whats-left)

## How it was measured

Everything was run in Chrome 150 on an Apple M3 Max (ANGLE Metal), against the dev server. The machine was busy: its load average was 3.3–8.6 during the component run and 3.3–6.6 during the room runs, and another session's game tab stayed open. Treat small differences as noise. Only large differences that came out the same on repeated runs are reported as findings.

- **Components:** `bench.html?bench=components` ran in full (421 components, 1.2 s a phase). The halls' exhibits are now registered as `exhibit:museum1` … `exhibit:museum9`, each hall's whole exhibit built and reset. The over-budget ones were then re-run with `only=`.
- **Rooms:** each room was loaded with `?room=<id>&graphics=<preset>` at its default spawn (a hall's entrance, looking in) and left to settle for 8 s. It was then sampled for 5 s in the page. Three numbers were taken:
  - the interval between `requestAnimationFrame` calls (capped at 16.7 ms by vsync);
  - the time spent inside the page's own animation-frame callbacks ("frame work", which includes WebGL submission and any stalls);
  - `draw*` calls per frame, counted on the WebGL2 prototype (the median frame).

  `renderer.info` was not reachable, because each room keeps its renderer private. The draw-call counts stand in for it.

## Components over budget

| Component                                  | Before (full run)                                         | After                                               |
| ------------------------------------------ | --------------------------------------------------------- | --------------------------------------------------- |
| Hall 1's exhibit                           | 2.0M texels/s idle, 2.5M running; 704×320 ×10, 528×240 ×1 | 92k idle, 383k running (352×160 ×2); known, flagged |
| dev44 dosing controller trial (CX-7, DC-1) | 2.7M idle, 4.5M running, 14 uploads/s                     | unchanged; dev rig, known, flagged                  |
| dev44 hypochlorite pump trial              | 490k idle and running                                     | unchanged; dev rig, known, flagged                  |
| Make-up water recorder                     | 1.1M running (800×176 ×9)                                 | 578k on re-run; real chart advance, known, flagged  |
| Operator's desk, POOLMON                   | 267k idle (640×500 ×1/s)                                  | 266k; just over, known, flagged                     |
| CCTV monitor                               | 327k idle                                                 | 165k on re-run, passes (load noise)                 |

The full run's headline: 156.7 ms a frame if every component the rooms use were drawn at once, unweighted.

## The museum halls' exhibits

These figures come from one copy of each hall's exhibit, measured alone. "Unit ms" is the bench's cost per frame where the exhibit is used.

| Exhibit | Unit ms     | Draw calls | Triangles | Texels/s idle · running  |
| ------- | ----------- | ---------- | --------- | ------------------------ |
| museum9 | 5.55        | 1,358      | 157k      | 0 · 72k                  |
| museum6 | 4.87        | 1,179      | 127k      | 0 · 0                    |
| museum2 | 4.54        | 1,088      | 125k      | 0 · 0                    |
| museum1 | 3.59 → 3.28 | 948        | 83k       | 2.0M · 2.5M → 92k · 383k |
| museum3 | 3.16        | 795        | —         | 0 · 72k                  |
| museum4 | 3.03        | 814        | —         | 0 · 0                    |
| museum5 | 1.09        | 172        | —         | 0 · 0                    |
| museum7 | 1.02        | 156        | —         | 0 · 0                    |
| museum8 | 0.97        | 115        | —         | 0 · 0                    |

The display work is now clean everywhere except Hall 1's sped-up mimic readouts. An audit of every hall's `update` found no canvas texture redrawn without a guard. The cost that remains is draw calls. The exhibits' static parts are not merged, and each hall also draws both neighbours' exhibits in full.

## Rooms × presets

Each cell gives the frame interval as mean / p95, then the frame work as mean / p95, both in ms, then the draw calls. The room table was taken after the component fixes. Those fixes change uploads, not draws, so the table stands as "before" for the room-level work, which is left for a later pass.

| Room          | High                           | Medium                           | Low                           |
| ------------- | ------------------------------ | -------------------------------- | ----------------------------- |
| museum0       | 16.7/17.3 · 3.9/4.4 · 361      | 20.4/33.4 · 18.3/26.2 · 191      | 16.9/17.7 · 3.5/4.0 · 165     |
| museum1       | 84.4/100.1 · 81.2/93.8 · 3,731 | 69.7/85.0 · 66.0/83.7 · 1,877    | 16.7/17.4 · 10.1/10.5 · 1,851 |
| museum2       | 16.7/16.8 · 10.8/12.1 · 1,099  | 37.0/65.0 · 34.2/51.6 · 561      | 16.7/17.1 · 7.5/8.1 · 535     |
| museum3       | 16.7/17.8 · 16.0/17.1 · 3,092  | 62.9/99.8 · 58.3/81.8 · 1,556    | 16.7/17.3 · 8.1/8.8 · 1,530   |
| museum4       | 16.7/16.9 · 10.9/11.5 · 1,988  | 16.7/16.8 · 7.4/9.6 · 1,004      | 16.7/17.7 · 7.6/8.9 · 978     |
| museum5       | 16.9/18.3 · 8.4/9.4 · 878      | 16.7/16.8 · 5.7/6.1 · 449        | 16.7/16.8 · 4.2/4.6 · 423     |
| museum6       | 17.8/32.1 · 9.0/10.2 · 1,993   | 16.7/17.4 · 6.3/6.8 · 1,007      | 32.3/49.6 · 30.0/37.1 · 981   |
| museum7       | 16.7/16.8 · 5.5/5.9 · 525      | 16.7/16.8 · 3.4/3.8 · 273        | 17.9/33.3 · 15.9/20.8 · 247   |
| museum8       | 20.2/33.4 · 19.8/26.4 · 3,334  | 16.7/17.7 · 7.2/7.9 · 1,677      | 16.7/17.0 · 7.7/8.4 · 1,651   |
| museum9       | 18.7/33.4 · 18.1/34.1 · 2,505  | 16.7/17.5 · 6.9/8.7 · 1,263      | 41.2/50.1 · 38.7/43.9 · 1,237 |
| main_corridor | 16.7/17.5 · 4.4/4.9 · 2,157    | 16.7/17.4 · 4.5/4.9 · 1,086      | 26.7/34.9 · 24.9/30.8 · 1,072 |
| plant_pool_01 | 16.7/17.5 · 5.0/5.7 · 1,639    | 16.7/17.1 · 5.9/6.5 · 825        | 29.5/35.1 · 27.9/32.2 · 811   |
| plant_pool_02 | 19.1/33.4 · 18.9/19.9 · 6,315  | 106.6/149.9 · 99.9/143.5 · 3,163 | 75.6/99.9 · 72.1/85.2 · 3,149 |
| bridge        | 16.7/17.2 · 5.9/8.6 · 1,537    | 30.6/50.0 · 27.6/41.0 · 774      | 23.0/34.9 · 20.6/33.6 · 760   |

Several cells contradict their own row (Low slower than High in museum6, museum9, main_corridor and plant_pool_01). That is the loaded machine: a later re-run of museum3 on High managed only 13 frames a second. Two findings held on repeated runs:

- **Hall 1 on High and Medium is slow:** 84 ms on High (three runs, 81–104 ms) and 70 ms on Medium, against 10 ms on Low. A profile of its GL calls found about 20 ms a frame of them on High: 3,719 `bindVertexArray`, 5,441 `uniformMatrix4fv`, 2,738 `drawElements` and 989 `drawArrays` per frame. The rest is not yet explained.
- **Draw calls double from Low to High in every room,** because of the ambient-occlusion normal pass. A hall with full neighbours issues 1,000–3,700 draws, and plant_pool_02 issues 6,315.

## Fixes

- **Hall 1's mimic readouts** (`withHeldReadouts`, `museum-1-mimic.ts`, tested): the lamps and chasers still follow the hall at 4 Hz, but the four-digit readouts take a reading once a second. Before, their last digits flickered and each change re-uploaded a 704×320 texture.
- **Every mimic board's readouts** use a board's texel density (`createSevenSegment`'s new `texelsPerMm`, 3 for boards). That is 352×160 in place of 704×320, a quarter of the texels on every change, in the control room and plant rooms too.
- **Hall 1's gas-burn digits** (864×320) and **pipe thermometers** take a reading once a second. Before, a modulating burner changed the digits every frame.
- **Hall 9's water-panel LCD** compares the rounded numbers before it builds any text. **Halls 3 and 9's balance-tank legend** is shown once at build, not every frame. **Hall 4's readout board** refills one values record instead of building a new one each frame.
- **Sight lines** (tested with `sightBlockers`): Hall 3's lecterns now sit in a `LECTERNS` table in `museum-3-layout.ts`. Lectern 2 had stood inside the column at x = 0 and lectern 7 inside the one at x = −6, both on the lecterns' own line; they move to −0.95 and −5.0, and lectern 6 moves to −2.1 to make room. Hall 9's fault pedestal stood directly behind the column at (−6, 3.35) as seen from the visitors' floor. It moves 1.35 m east, to x = −4.8.

## What's left

All of these are flagged in `TODO.md` under "Performance pass leftovers":

1. Find what High and Medium add in Hall 1.
2. Merge the halls' static exhibit geometry.
3. Revisit the halls' real-time lights: four point lights per hall, five spots in Hall 7, and the showcase spot.
4. Find out why Medium is slower than High in some rooms.
5. Investigate plant_pool_02's 6,315 draws.
6. Deal with the five components left over budget, now listed in `KNOWN_OVER_BUDGET`.
7. Re-take the room table on a quiet machine.

The `graphics=` URL parameter writes the player's saved preset, so the last value set in this pass, Low, may have stayed in that browser's settings.
