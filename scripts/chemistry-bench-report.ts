/**
 * The water-chemistry bench's report for the owner: one self-contained HTML
 * page of small-multiple line charts (inline SVG, one measure a panel, at
 * most three series a panel, no second axes), each scenario's three phases
 * shaded and its events marked, its checks tabled, with a hover readout.
 * Built by `chemistry-bench-report.test.ts`; nothing here ships in the game.
 */

export interface Series {
  name: string;
  /** Categorical slot, 1 to 3. */
  slot: 1 | 2 | 3;
  points: readonly [number, number][];
  dashed?: boolean;
}

export interface Panel {
  title: string;
  unit: string;
  series: Series[];
  /** Reference lines: PWTAG limits and the like. */
  rules?: { y: number; label: string }[];
}

export interface Band {
  from: number;
  to: number;
  label: string;
  shade: 0 | 1 | 2;
}

export interface Marker {
  at: number;
  n: number;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Round tick steps. */
function ticks(lo: number, hi: number, n = 4): number[] {
  const span = hi - lo || 1;
  const raw = span / n;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step =
    [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= n) ??
    10 * mag;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step)
    out.push(+v.toFixed(10));
  return out;
}

let chartId = 0;

/** One panel as an SVG line chart, hours along the bottom. */
export function panelSvg(
  p: Panel,
  bands: Band[],
  markers: Marker[],
  xLabel = 'hours',
): string {
  const W = 340;
  const H = 170;
  const m = { l: 44, r: 10, t: 22, b: 26 };
  const all = p.series.flatMap((s) => s.points);
  const xs = all.map((q) => q[0]);
  const ys = [...all.map((q) => q[1]), ...(p.rules ?? []).map((r) => r.y)];
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  let y0 = Math.min(...ys);
  let y1 = Math.max(...ys);
  if (y1 - y0 < 1e-6) {
    y0 -= 0.5;
    y1 += 0.5;
  }
  const pad = (y1 - y0) * 0.08;
  y0 = y0 >= 0 && y0 - pad < 0 ? 0 : y0 - pad;
  y1 += pad;
  const X = (x: number) => m.l + ((x - x0) / (x1 - x0 || 1)) * (W - m.l - m.r);
  const Y = (y: number) => H - m.b - ((y - y0) / (y1 - y0)) * (H - m.t - m.b);
  const id = `c${chartId++}`;
  const parts: string[] = [];
  parts.push(
    `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(p.title)}" class="chart" data-id="${id}">`,
  );
  for (const b of bands)
    parts.push(
      `<rect class="band b${b.shade}" x="${X(Math.max(x0, b.from)).toFixed(1)}" y="${m.t}" width="${(X(Math.min(x1, b.to)) - X(Math.max(x0, b.from))).toFixed(1)}" height="${H - m.t - m.b}"/>`,
    );
  for (const t of ticks(y0, y1))
    parts.push(
      `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${Y(t).toFixed(1)}" y2="${Y(t).toFixed(1)}"/><text class="tick" x="${m.l - 4}" y="${(Y(t) + 3).toFixed(1)}" text-anchor="end">${+t.toPrecision(4)}</text>`,
    );
  for (const t of ticks(x0, x1, 6))
    parts.push(
      `<text class="tick" x="${X(t).toFixed(1)}" y="${H - m.b + 12}" text-anchor="middle">${+t.toPrecision(4)}</text>`,
    );
  parts.push(
    `<text class="tick" x="${W - m.r}" y="${H - 2}" text-anchor="end">${xLabel}</text>`,
  );
  for (const r of p.rules ?? [])
    parts.push(
      `<line class="rule" x1="${m.l}" x2="${W - m.r}" y1="${Y(r.y).toFixed(1)}" y2="${Y(r.y).toFixed(1)}"/><text class="rulelabel" x="${W - m.r - 2}" y="${(Y(r.y) - 3).toFixed(1)}" text-anchor="end">${esc(r.label)}</text>`,
    );
  for (const k of markers)
    parts.push(
      `<line class="marker" x1="${X(k.at).toFixed(1)}" x2="${X(k.at).toFixed(1)}" y1="${m.t}" y2="${H - m.b}"/><text class="markerlabel" x="${(X(k.at) + 2).toFixed(1)}" y="${m.t + 9}">${k.n}</text>`,
    );
  for (const s of p.series) {
    const d = s.points
      .map(
        (q, i) => `${i ? 'L' : 'M'}${X(q[0]).toFixed(1)},${Y(q[1]).toFixed(1)}`,
      )
      .join('');
    parts.push(
      `<path class="line s${s.slot}${s.dashed ? ' dashed' : ''}" d="${d}"/>`,
    );
  }
  parts.push(
    `<line class="cross" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}" visibility="hidden"/>`,
  );
  parts.push(
    `<rect class="hit" x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${H - m.t - m.b}" data-x0="${x0}" data-x1="${x1}" data-l="${m.l}" data-w="${W - m.l - m.r}"/>`,
  );
  parts.push('</svg>');
  const legend =
    p.series.length > 1
      ? `<div class="legend">${p.series.map((s) => `<span><i class="sw s${s.slot}${s.dashed ? ' dashed' : ''}"></i>${esc(s.name)}</span>`).join('')}</div>`
      : '';
  const data = JSON.stringify({
    unit: p.unit,
    series: p.series.map((s) => ({
      name: s.name,
      pts: s.points.map((q) => [+q[0].toFixed(3), +q[1].toPrecision(4)]),
    })),
  });
  return `<figure class="panel"><figcaption>${esc(p.title)} <span class="unit">${esc(p.unit)}</span></figcaption>${legend}${parts.join('')}<script type="application/json" data-for="${id}">${data}</script><div class="tip" data-tip="${id}" hidden></div></figure>`;
}

export function table(head: string[], rows: string[][], cls = ''): string {
  return `<div class="tablewrap"><table class="${cls}"><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

export { esc };

const STYLE = `
:root{color-scheme:light;--surface:#fcfcfb;--panel:#ffffff;--text:#0b0b0b;--text2:#52514e;--muted:#8a8984;--grid:#e6e5e1;--band0:#f2f1ee;--band1:#ebe8e1;--band2:#e4e9ee;--s1:#2a78d6;--s2:#eb6834;--s3:#1baf7a;--pass:#1f7a3a;--fail:#b3261e;--border:#dddcd7}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){color-scheme:dark;--surface:#1a1a19;--panel:#222221;--text:#f0efec;--text2:#c3c2b7;--muted:#8f8e86;--grid:#33332f;--band0:#262624;--band1:#2e2c28;--band2:#262b30;--s1:#3987e5;--s2:#d95926;--s3:#199e70;--pass:#5cc27a;--fail:#f08a80;--border:#3a3a36}}
:root[data-theme="dark"]{color-scheme:dark;--surface:#1a1a19;--panel:#222221;--text:#f0efec;--text2:#c3c2b7;--muted:#8f8e86;--grid:#33332f;--band0:#262624;--band1:#2e2c28;--band2:#262b30;--s1:#3987e5;--s2:#d95926;--s3:#199e70;--pass:#5cc27a;--fail:#f08a80;--border:#3a3a36}
*{box-sizing:border-box}body{margin:0;background:var(--surface);color:var(--text);font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}
main{max-width:1180px;margin:0 auto;padding:24px 16px 64px}h1{font-size:26px;margin:0 0 4px}h2{font-size:20px;margin:40px 0 6px;border-top:1px solid var(--border);padding-top:20px}h3{font-size:16px;margin:18px 0 6px}
p,li{color:var(--text2);max-width:80ch}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px}
.panel{margin:0;background:var(--panel);border:1px solid var(--border);border-radius:8px;padding:8px;position:relative}figcaption{font-size:13px;font-weight:600}.unit{color:var(--muted);font-weight:400}
.legend{display:flex;gap:12px;flex-wrap:wrap;font-size:12px;color:var(--text2)}.sw{display:inline-block;width:14px;height:0;border-top:2px solid;margin-right:4px;vertical-align:middle}.sw.dashed{border-top-style:dashed}
.sw.s1{border-color:var(--s1)}.sw.s2{border-color:var(--s2)}.sw.s3{border-color:var(--s3)}
svg.chart{width:100%;height:auto;display:block}.band.b0{fill:var(--band0)}.band.b1{fill:var(--band1)}.band.b2{fill:var(--band2)}
.grid{}line.grid{stroke:var(--grid);stroke-width:1}.tick{fill:var(--muted);font-size:9px}.line{fill:none;stroke-width:2;stroke-linejoin:round}.line.dashed{stroke-dasharray:5 3}
.line.s1{stroke:var(--s1)}.line.s2{stroke:var(--s2)}.line.s3{stroke:var(--s3)}.rule{stroke:var(--muted);stroke-dasharray:2 3}.rulelabel{fill:var(--muted);font-size:8.5px}
.marker{stroke:var(--text2);stroke-width:1;stroke-dasharray:1 2}.markerlabel{fill:var(--text2);font-size:9px;font-weight:600}.cross{stroke:var(--text2);stroke-width:1}.hit{fill:transparent;cursor:crosshair}
.tip{position:absolute;top:28px;right:10px;background:var(--panel);border:1px solid var(--border);border-radius:6px;padding:4px 8px;font-size:12px;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,.12)}
.tablewrap{overflow-x:auto}table{border-collapse:collapse;font-size:13px;margin:8px 0;width:100%}th,td{text-align:left;padding:5px 8px;border-bottom:1px solid var(--border);vertical-align:top}th{color:var(--text2);font-weight:600}
.pass{color:var(--pass);font-weight:600}.fail{color:var(--fail);font-weight:600}.events{font-size:13px;color:var(--text2);padding-left:20px}.phases{font-size:12px;color:var(--muted)}
.key{display:inline-block;width:12px;height:12px;border-radius:2px;vertical-align:middle;margin:0 4px 0 10px;border:1px solid var(--border)}
`;

const SCRIPT = `
document.querySelectorAll('svg.chart').forEach(function(svg){
  var id=svg.dataset.id, data=JSON.parse(document.querySelector('script[data-for="'+id+'"]').textContent);
  var tip=document.querySelector('[data-tip="'+id+'"]'), hit=svg.querySelector('.hit'), cross=svg.querySelector('.cross');
  var x0=+hit.dataset.x0,x1=+hit.dataset.x1,l=+hit.dataset.l,w=+hit.dataset.w;
  function show(ev){var pt=svg.createSVGPoint();pt.x=ev.clientX;pt.y=ev.clientY;var p=pt.matrixTransform(svg.getScreenCTM().inverse());
    var x=x0+(p.x-l)/w*(x1-x0);var rows=data.series.map(function(s){var best=s.pts[0];for(var i=0;i<s.pts.length;i++){if(Math.abs(s.pts[i][0]-x)<Math.abs(best[0]-x))best=s.pts[i];}return [s.name,best];});
    cross.setAttribute('x1',p.x);cross.setAttribute('x2',p.x);cross.setAttribute('visibility','visible');
    tip.hidden=false;tip.innerHTML='<b>'+rows[0][1][0].toFixed(2)+' h</b><br>'+rows.map(function(r){return r[0]+': '+r[1][1]+' '+data.unit;}).join('<br>');}
  hit.addEventListener('pointermove',show);hit.addEventListener('pointerleave',function(){tip.hidden=true;cross.setAttribute('visibility','hidden');});
});
`;

export function page(title: string, description: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><style>${STYLE}</style></head><body><main>${body}</main><script>${SCRIPT}</script></body></html>\n`;
}
