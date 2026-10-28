import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { it } from 'vite-plus/test';
import {
  GAME_PLANTS,
  GAME_POOLS,
  PLANT,
  SCENARIOS,
  compareCircuits,
  handDoseThroughTank,
  mean,
  runBench,
  runScenario,
  setpointStep,
  warmedUp as warm,
  within,
} from '../src/game/water/chemistry-bench';
import type { Run, Sample } from '../src/game/water/chemistry-bench';
import {
  CHEMISTRY,
  dose,
  equilibrateWithAir,
  mixWaters,
  stepChemistry,
  waterFrom,
} from '../src/game/water/pool-chemistry';
import jv from '../src/game/water/fixtures/jafvert-valentine.json';
import phreeqc from '../src/game/water/fixtures/phreeqc-carbonate.json';
import { esc, page, panelSvg, table } from './chemistry-bench-report';
import type { Band, Marker, Panel } from './chemistry-bench-report';

/**
 * Writes the bench's HTML report (the owner, 2026-10-28): every scenario's
 * three phases charted, its checks tabled; one zone against two; the
 * game's pools; the model against PHREEQC and Jafvert & Valentine. Run with
 *
 *     CHEM_REPORT=1 npx vp test run scripts/chemistry-bench-report.test.ts
 *
 * to `build/reports/water-chemistry-bench.html`, or to `CHEM_REPORT_OUT`.
 */
it.skipIf(process.env.CHEM_REPORT !== '1')(
  'writes the water-chemistry bench report',
  () => {
    const out =
      process.env.CHEM_REPORT_OUT ?? 'build/reports/water-chemistry-bench.html';
    const parts: string[] = [];
    const pts = (r: Run, k: keyof Sample) =>
      r.samples.map((x) => [x.t, x[k] as number] as [number, number]);
    const fmt = (x: number, d = 2) => x.toFixed(d);

    parts.push(
      `<h1>Water-chemistry bench</h1><p>The pool chemistry model (<code>src/game/water/pool-chemistry.ts</code>) run on abstract pools before it goes into the game, as the owner asked on 2026-10-28. Each scenario runs in three phases: two days of a steady normal day (checked to be steady), a problem a real pool has, and the treatment PWTAG or standard practice recommends. The circuit is two zones, the pool and its balance tank (the owner's decision); dosing enters the pool's return, hand doses the balance tank. A 25 m community pool: 470 m³ and a 30 m³ tank, 167 m³/h (a three-hour turnover), 600 bathers a day, UV on, 28 °C. Written ${new Date().toISOString().slice(0, 10)} by <code>scripts/chemistry-bench-report.test.ts</code>; the findings are discussed in <code>doc/research/water-chemistry-models.md</code>.</p>`,
      `<p class="phases">Shading: <span class="key" style="background:var(--band0)"></span>steady <span class="key" style="background:var(--band1)"></span>problem <span class="key" style="background:var(--band2)"></span>treatment. Numbered dotted lines are the events listed under each chart. Hover a chart for its values.</p>`,
    );

    // ---- Scenarios
    const summary: string[][] = [];
    const sections: string[] = [];
    for (const sc of SCENARIOS) {
      const r = runScenario(sc);
      const run = r.run;
      const end = run.samples[run.samples.length - 1].t;
      const prob = run.events.find((e) => e.phase === 'problem')?.at ?? 48;
      const treat = run.events.find((e) => e.phase === 'treatment')?.at ?? end;
      const bands: Band[] = [
        { from: 0, to: prob, label: 'steady', shade: 0 },
        { from: prob, to: treat, label: 'problem', shade: 1 },
        { from: treat, to: end, label: 'treatment', shade: 2 },
      ];
      // Number events, merging repeats of the same label.
      const seen = new Map<string, number>();
      const markers: Marker[] = [];
      const eventItems: string[] = [];
      for (const e of run.events) {
        let n = seen.get(e.label);
        if (n === undefined) {
          n = seen.size + 1;
          seen.set(e.label, n);
          eventItems.push(
            `<li value="${n}">${esc(e.label)} (at ${fmt(e.at, 1)} h${''})</li>`,
          );
        }
        markers.push({ at: e.at, n });
      }
      const panels: Panel[] = [
        {
          title: 'Chlorine',
          unit: 'mg/l as Cl₂',
          series: [
            { name: 'free', slot: 1, points: pts(run, 'freeChlorine') },
            { name: 'combined', slot: 2, points: pts(run, 'combined') },
            {
              name: 'trichloramine',
              slot: 3,
              points: pts(run, 'trichloramine'),
              dashed: true,
            },
          ],
          rules: [{ y: 1, label: 'combined limit 1' }],
        },
        {
          title: 'pH',
          unit: '',
          series: [{ name: 'pH', slot: 1, points: pts(run, 'ph') }],
          rules: [
            { y: 7.4, label: '7.4' },
            { y: 7.2, label: '7.2' },
          ],
        },
        {
          title: 'Alkalinity and hardness',
          unit: 'mg/l as CaCO₃',
          series: [
            { name: 'alkalinity', slot: 1, points: pts(run, 'alkalinity') },
            { name: 'calcium hardness', slot: 2, points: pts(run, 'hardness') },
          ],
          rules: [{ y: 80, label: 'alkalinity min 80' }],
        },
        {
          title: 'Langelier index',
          unit: '',
          series: [{ name: 'LSI', slot: 1, points: pts(run, 'langelier') }],
          rules: [{ y: 0, label: 'balanced' }],
        },
        {
          title: 'Dissolved solids',
          unit: 'mg/l',
          series: [{ name: 'TDS', slot: 1, points: pts(run, 'tds') }],
        },
        {
          title: 'Dosing pumps',
          unit: 'output 0–1',
          series: [
            { name: 'hypochlorite', slot: 1, points: pts(run, 'hypoOut') },
            { name: 'acid', slot: 2, points: pts(run, 'acidOut') },
          ],
        },
      ];
      if (sc.id === 'dechlorination' || sc.id === 'faecal-incident')
        panels.push({
          title: 'Thiosulphate and sulphate',
          unit: 'mg/l',
          series: [
            {
              name: 'thiosulphate (pentahydrate)',
              slot: 1,
              points: pts(run, 'thiosulphate'),
            },
            { name: 'sulphate', slot: 2, points: pts(run, 'sulphate') },
          ],
        });
      const passed = r.checks.every((c) => c.pass);
      summary.push([
        `<a href="#${sc.id}">${esc(sc.title)}</a>`,
        `${r.checks.filter((c) => c.pass).length} of ${r.checks.length}`,
        passed
          ? '<span class="pass">pass</span>'
          : '<span class="fail">fail</span>',
      ]);
      sections.push(
        `<h2 id="${sc.id}">${esc(sc.title)}</h2><div class="grid">${panels.map((p) => panelSvg(p, bands, markers)).join('')}</div><ol class="events">${eventItems.join('')}</ol>` +
          table(
            [
              'Check',
              'Expected, and its source',
              'Threshold',
              'Measured',
              'Result',
            ],
            r.checks.map((c) => [
              esc(c.name),
              `${esc(c.expected)}<br><small>${esc(c.source)}</small>`,
              esc(c.threshold),
              esc(c.measured),
              c.pass
                ? '<span class="pass">pass</span>'
                : '<span class="fail">fail</span>',
            ]),
          ),
      );
    }
    parts.push(
      '<h2>Scenarios at a glance</h2>',
      table(['Scenario', 'Checks', 'Result'], summary),
    );
    parts.push(...sections);

    // ---- One zone against two
    const hd = handDoseThroughTank();
    const sp = setpointStep();
    const tankPts = (r: Run, k: 'tankFreeChlorine' | 'tankPh') =>
      r.samples.map((x) => [x.t, (x[k] ?? NaN) as number] as [number, number]);
    const alkTank = (r: Run) =>
      r.samples.map((x) => [x.t, x.alkalinity] as [number, number]);
    parts.push(
      `<h2 id="zones">One volume against two zones</h2><p>The owner decided the circuit is at least two zones, the balance tank and the pool. These runs show what the second zone changes: a hand dose put into the balance tank now reaches the pool over the tank's residence time rather than at once, and the dosing loop, sampling the tank's water after the pool's, sees its dose later and overshoots more.</p>`,
      `<div class="grid">${panelSvg(
        {
          title: 'Bicarbonate into the balance tank: the pool’s alkalinity',
          unit: 'mg/l as CaCO₃',
          series: [
            { name: 'two zones: pool', slot: 1, points: alkTank(hd.two) },
            {
              name: 'one volume',
              slot: 2,
              points: alkTank(hd.one),
              dashed: true,
            },
          ],
        },
        [],
        [{ at: 1, n: 1 }],
      )}${panelSvg(
        {
          title: 'Chlorine setpoint 1.5 → 2.0 mg/l',
          unit: 'mg/l',
          series: [
            {
              name: 'two zones: pool',
              slot: 1,
              points: pts(sp.two, 'freeChlorine'),
            },
            {
              name: 'two zones: balance tank (sampled)',
              slot: 3,
              points: tankPts(sp.two, 'tankFreeChlorine'),
            },
            {
              name: 'one volume',
              slot: 2,
              points: pts(sp.one, 'freeChlorine'),
              dashed: true,
            },
          ],
        },
        [],
        [{ at: 1, n: 1 }],
      )}</div>`,
    );
    const cmp = SCENARIOS.map(compareCircuits);
    parts.push(
      '<h3>Each scenario both ways: the largest difference between the pool zone and the single volume</h3>',
      table(
        [
          'Scenario',
          'Free chlorine, mg/l',
          'pH',
          'Combined, mg/l',
          'Alkalinity, mg/l',
          'Checks passed: one / two',
        ],
        cmp.map((c) => [
          esc(c.title),
          fmt(c.freeChlorine),
          fmt(c.ph),
          fmt(c.combined),
          fmt(c.alkalinity, 1),
          `${c.passOne} / ${c.passTwo} of ${c.of}`,
        ]),
      ),
    );

    // ---- The game's pools
    const rows: string[][] = [];
    for (const [id, pool] of Object.entries(GAME_POOLS)) {
      const plant = { ...PLANT, ...GAME_PLANTS[id] };
      const run = runBench(warm(pool, plant), pool, 48);
      const day = within(run.samples, 24, 48);
      const m = (k: keyof Sample) => mean(day.map((x) => x[k] as number));
      const last = run.samples[run.samples.length - 1];
      const first = day[0];
      rows.push([
        esc(pool.name),
        `${fmt(pool.volume, 1)} + ${fmt(pool.balanceTank, 1)}`,
        fmt(pool.circulation, 0),
        `${pool.bathersPerDay}`,
        fmt(m('freeChlorine')),
        fmt(m('combined')),
        fmt(m('ph')),
        fmt(m('alkalinity'), 0),
        fmt(m('hardness'), 0),
        fmt(m('tds'), 0),
        fmt(m('chlorate'), 1),
        fmt(m('langelier')),
        fmt(last.hypoLitres - first.hypoLitres, 1),
        fmt(last.acidLitres - first.acidLitres, 1),
      ]);
    }
    parts.push(
      `<h2 id="game-pools">The game’s four pools at their steady state</h2><p>Each pool's own volume, balance tank, circulation and temperature, read from the world's data; bathers from the earlier note; 120 days from first fill. Hypochlorite 140 g/l, acid 10 %.</p>`,
      table(
        [
          'Pool',
          'Pool + tank, m³',
          'Flow, m³/h',
          'Bathers a day',
          'FC',
          'CC',
          'pH',
          'TA',
          'CH',
          'TDS',
          'Chlorate',
          'LSI',
          'Hypochlorite, l/day',
          'Acid, l/day',
        ],
        rows,
      ),
    );

    // ---- Against the references
    const pq = Object.entries(phreeqc.changes).map(([name, c]) => {
      const spec = (w: (typeof phreeqc.waters)['nominal']) => ({
        ph: w.input.ph,
        alkalinity: w.input.alkalinity,
        hardness: w.input.hardness,
        temperature: w.input.temperature,
        tds: w.tds,
      });
      const base = waterFrom(spec(phreeqc.waters.nominal));
      const w =
        'added' in c
          ? dose(base, c.added, 1, 28)
          : 'airCo2' in c
            ? equilibrateWithAir(base, c.airCo2, 28)
            : mixWaters(
                [
                  { water: base, volume: 2 },
                  { water: waterFrom(spec(phreeqc.waters.mains)), volume: 1 },
                ],
                28,
              );
      return [esc(name), fmt(c.ph, 3), fmt(w.ph, 3), fmt(w.ph - c.ph, 3)];
    });
    parts.push(
      `<h2 id="references">Against the references</h2><h3>The carbonate system against PHREEQC 3.8.6 (USGS)</h3><p>The nominal pool water (pH 7.4, alkalinity 120, hardness 200, 28 °C) changed as named; the pH each gives.</p>`,
      table(['Change', 'PHREEQC pH', 'Model pH', 'Difference'], pq),
    );
    const K = {
      ...CHEMISTRY,
      chlorineDecay: 0,
      trichloramineToAirStill: 0,
      trichloramineToAirRough: 0,
    };
    const jvPanels: string[] = [];
    for (const name of [
      'pool-light',
      'pool-heavy',
      'superchlorination',
    ] as const) {
      const c = jv.cases[name];
      const inp = c.input;
      let w = {
        ...waterFrom({
          ph: inp.ph,
          alkalinity: inp.alkalinity,
          hardness: 200,
          tds: 0,
          temperature: inp.temperature,
        }),
        freeChlorine: inp.free,
        ammonia: inp.ammonia,
      };
      const fc: [number, number][] = [[0, inp.free]];
      const cc: [number, number][] = [[0, 0]];
      for (let n = 1; n <= 4 * 720; n++) {
        w = {
          ...stepChemistry(
            w,
            {
              volume: 100,
              temperature: inp.temperature,
              surface: 0,
              circulation: 0,
            },
            5,
            K,
          ).water,
          ph: inp.ph,
        };
        if (n % 12 === 0) {
          fc.push([(n * 5) / 3600, w.freeChlorine]);
          cc.push([(n * 5) / 3600, w.chloramine + w.trichloramine]);
        }
      }
      const ref = (k: 'free' | 'combined') =>
        c.hours
          .filter((h) => h <= 4)
          .map((h, i) => [h, c[k][i]] as [number, number]);
      jvPanels.push(
        panelSvg(
          {
            title: `${name}: ${inp.free} mg/l chlorine, ${inp.ammonia} mg/l N, pH ${inp.ph}, ${inp.temperature} °C`,
            unit: 'mg/l as Cl₂',
            series: [
              { name: 'model free', slot: 1, points: fc },
              { name: 'model combined', slot: 2, points: cc },
              { name: 'J&V free', slot: 1, points: ref('free'), dashed: true },
              {
                name: 'J&V combined',
                slot: 2,
                points: ref('combined'),
                dashed: true,
              },
            ],
          },
          [],
          [],
        ),
      );
    }
    parts.push(
      `<h3>Chloramines against Jafvert &amp; Valentine (the EPA simulator's scheme)</h3><p>Ammonia added to chlorinated water at time 0, pH held. The model's reduced scheme against the full fourteen-reaction scheme (points from the fixture, joined). The reduced scheme is slower in the first quarter-hour and agrees from about an hour on.</p><div class="grid">${jvPanels.join('')}</div>`,
    );

    const html = page(
      'Water-chemistry bench',
      'The pool chemistry model on abstract pools: scenarios, zones, the game’s pools and the references.',
      parts.join('\n'),
    );
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, html);
  },
  600_000,
);
