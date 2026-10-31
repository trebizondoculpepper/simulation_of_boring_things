import type { Rect } from '../../../../ui2d/geometry';
import {
  AERO,
  drawAeroBackground,
  drawGlassPanel,
  drawGlossyButton,
  drawProgressBar,
  drawSegmented,
  drawText,
  drawTitleBar,
  drawDroplet,
} from '../../../../ui2d/aero/aero-widgets';
import { wrapLines } from '../../../../ui2d/aero/logic/aero-layout';
import { SCREEN } from '../../../../game/plant/aqualis-types';
import {
  DOCTOR,
  LAYOUT,
  SETTINGS,
  pumpRow,
  tabRects,
  targetListRow,
  waterTile,
} from '../logic/aqualis-display';
import type { DisplayModel } from '../logic/aqualis-display';

/**
 * The Aqualis cabinet's screen pages (mission 114), drawn from the display
 * model (`logic/aqualis-display.ts`) in the Aero kit's look, the period's
 * Dr Aqualis Trio's software. Immediate mode: the host draws a page when its
 * model's key (and, on Dr Aqualis's page, his pose's) changes. Dr Aqualis
 * himself is drawn by the host's `doctor` callback, so this file needs
 * nothing of his animation.
 */

type Ctx = CanvasRenderingContext2D;

export interface ScreenHooks {
  /** Draw Dr Aqualis in `box`; and his speech bubble, with its tail at his mouth. */
  doctor?(ctx: Ctx, box: Rect): void;
  bubble?(
    ctx: Ctx,
    text: string,
    box: Rect,
    tail: { x: number; y: number },
  ): void;
}

const press = (m: DisplayModel, id: string) =>
  m.pressed === id ? 'pressed' : 'normal';

export function drawAqualisScreen(
  ctx: Ctx,
  m: DisplayModel,
  hooks: ScreenHooks = {},
) {
  drawAeroBackground(ctx, { x: 0, y: 0, w: SCREEN.w, h: SCREEN.h }, 114);
  // Just the maker's name, leaving the strip to the page tabs (the owner,
  // 2026-10-31).
  drawTitleBar(ctx, LAYOUT.title, 'Aqualis', {
    mark: (c, x, y, r) => drawDroplet(c, x, y, r),
  });
  for (const t of tabRects())
    drawGlossyButton(ctx, t.rect, t.name, {
      state:
        m.pressed === `tab:${t.page}`
          ? 'pressed'
          : m.page === t.page
            ? 'selected'
            : 'normal',
      tint: 'grey',
      shape: 'rounded',
      size: 14,
    });
  if (m.page === 'pumps') drawPumps(ctx, m);
  else if (m.page === 'water') drawWater(ctx, m);
  else if (m.page === 'doctor') drawDoctor(ctx, m, hooks);
  else drawSettings(ctx, m);
  drawStatus(ctx, m);
}

function drawStatus(ctx: Ctx, m: DisplayModel) {
  const r = LAYOUT.status;
  drawGlassPanel(ctx, r, { radius: 0, tint: AERO.tints[m.status.tint][1] });
  const knob = { hand: 'HAND', off: 'OFF', auto: 'AUTO' }[m.selector];
  drawText(ctx, `Mode: ${knob}`, r.x + 14, r.y + r.h / 2, {
    size: 15,
    weight: 700,
  });
  drawText(ctx, m.status.text, r.x + 130, r.y + r.h / 2, {
    size: 15,
    weight: m.status.tint === 'green' ? 400 : 700,
    colour: m.status.tint === 'red' ? AERO.tints.red[3] : AERO.ink,
    maxWidth: r.w - 150,
  });
}

function drawPumps(ctx: Ctx, m: DisplayModel) {
  m.pumps.forEach((p, i) => {
    const { row, minus, plus } = pumpRow(i);
    drawGlassPanel(ctx, row);
    drawText(ctx, p.name, row.x + 16, row.y + 24, { size: 21, weight: 700 });
    drawText(ctx, p.device, row.x + 16, row.y + 50, {
      size: 14,
      colour: AERO.inkSoft,
    });
    const badge: Rect = {
      x: row.x + row.w - 264,
      y: row.y + 10,
      w: 252,
      h: 34,
    };
    drawGlossyButton(ctx, badge, p.badge.text, {
      tint: p.badge.tint,
      shape: 'rounded',
      size: 14,
    });
    const bar: Rect = {
      x: row.x + 16,
      y: row.y + 70,
      w: p.hand === null ? row.w - 32 : row.w - 170,
      h: 28,
    };
    drawProgressBar(
      ctx,
      bar,
      p.demand,
      `Asked ${p.asked}   ·   delivering ${p.delivering}`,
      p.badge.tint === 'red' ? 'amber' : 'aqua',
    );
    if (p.hand !== null && p.badge.text !== 'NOT CONNECTED') {
      drawGlossyButton(ctx, minus, '−', {
        state: press(m, `hand-:${p.id}`),
        size: 24,
      });
      drawGlossyButton(ctx, plus, '+', {
        state: press(m, `hand+:${p.id}`),
        size: 24,
      });
    }
  });
}

const BAND_TINT = { low: 'amber', ok: 'green', high: 'red' } as const;

function drawWater(ctx: Ctx, m: DisplayModel) {
  m.water.forEach((w, i) => {
    const r = waterTile(i);
    drawGlassPanel(ctx, r, {
      tint:
        w.band && w.band !== 'ok'
          ? AERO.tints[BAND_TINT[w.band]][1]
          : undefined,
    });
    drawText(ctx, w.name, r.x + 12, r.y + 18, {
      size: 14,
      colour: AERO.inkSoft,
    });
    drawText(ctx, w.value, r.x + 12, r.y + 46, { size: 28, weight: 700 });
    drawText(ctx, w.unit, r.x + 14 + measure(ctx, w.value, 28, 700), r.y + 50, {
      size: 14,
      colour: AERO.inkSoft,
    });
    if (w.along !== null)
      gauge(
        ctx,
        { x: r.x + r.w - 140, y: r.y + 38, w: 128, h: 16 },
        w.along,
        w.band,
      );
    else
      drawText(ctx, 'for the balance', r.x + r.w - 14, r.y + 46, {
        size: 13,
        colour: AERO.inkSoft,
        align: 'right',
      });
  });
}

/** A horizontal band gauge: amber below, green within, red above, a needle at `along`. */
function gauge(ctx: Ctx, r: Rect, along: number, band: string | null) {
  ctx.save();
  const g = ctx.createLinearGradient(r.x, 0, r.x + r.w, 0);
  g.addColorStop(0, AERO.tints.amber[1]);
  g.addColorStop(0.2, AERO.tints.amber[0]);
  g.addColorStop(0.21, AERO.tints.green[0]);
  g.addColorStop(0.5, AERO.tints.green[1]);
  g.addColorStop(0.79, AERO.tints.green[0]);
  g.addColorStop(0.8, AERO.tints.red[0]);
  g.addColorStop(1, AERO.tints.red[1]);
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, r.h / 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = AERO.glassEdge;
  ctx.lineWidth = 1;
  ctx.stroke();
  const x = r.x + along * r.w;
  ctx.beginPath();
  ctx.moveTo(x, r.y - 5);
  ctx.lineTo(x - 6, r.y - 12);
  ctx.lineTo(x + 6, r.y - 12);
  ctx.closePath();
  ctx.fillStyle = band === 'ok' ? AERO.ink : AERO.tints.red[3];
  ctx.fill();
  ctx.fillRect(x - 1, r.y - 5, 2, r.h + 5);
  ctx.restore();
}

function measure(ctx: Ctx, s: string, size: number, weight = 400) {
  ctx.save();
  ctx.font = `${weight} ${size}px ${AERO.font}`;
  const w = ctx.measureText(s).width;
  ctx.restore();
  return w;
}

function drawDoctor(ctx: Ctx, m: DisplayModel, hooks: ScreenHooks) {
  const d = m.doctor;
  hooks.doctor?.(ctx, DOCTOR.him);
  const a = d.advice;
  let text = a
    ? `${a.problem}\n${a.direction}`
    : 'Let me have a look at the water…';
  if (a && d.showDose && a.dose) text += `\n\nDose: ${a.dose.text}.`;
  const tail = { x: DOCTOR.him.x + DOCTOR.him.w * 0.8, y: DOCTOR.him.y + 70 };
  if (hooks.bubble) hooks.bubble(ctx, text, DOCTOR.bubble, tail);
  else {
    drawGlassPanel(ctx, DOCTOR.bubble, { radius: 22, strength: 1.6 });
    ctx.save();
    ctx.font = `400 19px ${AERO.font}`;
    const lines = wrapLines(
      text,
      DOCTOR.bubble.w - 40,
      (s) => ctx.measureText(s).width,
      10,
    );
    ctx.restore();
    lines.forEach((l, i) =>
      drawText(ctx, l, DOCTOR.bubble.x + 20, DOCTOR.bubble.y + 30 + i * 25, {
        size: 19,
      }),
    );
  }
  if (d.count > 1) {
    drawGlossyButton(ctx, DOCTOR.prev, '◀', {
      state: press(m, 'advice-'),
      size: 20,
    });
    drawGlossyButton(ctx, DOCTOR.next, '▶', {
      state: press(m, 'advice+'),
      size: 20,
    });
    drawText(
      ctx,
      `${d.index + 1} of ${d.count}`,
      (DOCTOR.prev.x + DOCTOR.prev.w + DOCTOR.next.x) / 2,
      DOCTOR.prev.y + DOCTOR.prev.h / 2,
      { size: 16, weight: 600, align: 'center', glow: true },
    );
  }
  drawGlossyButton(ctx, DOCTOR.dose, d.showDose ? 'Hide dose' : 'Show dose', {
    state: !a?.dose ? 'disabled' : press(m, 'show-dose'),
    tint: 'green',
    size: 18,
  });
}

function drawSettings(ctx: Ctx, m: DisplayModel) {
  drawSegmented(
    ctx,
    SETTINGS.tabs,
    ['Pool dynamics', 'Targets'],
    m.tab === 'dynamics' ? 0 : 1,
    m.pressed === 'stab:dynamics' ? 0 : m.pressed === 'stab:targets' ? 1 : null,
  );
  const s = m.settings;
  if (m.tab === 'dynamics') {
    const rows = [
      {
        key: 'volumeM3',
        name: 'Water in circulation',
        value: `${s.dynamics.volumeM3} m³`,
        note: 'pool and balance tank',
      },
      {
        key: 'flowM3h',
        name: 'Filtration rate',
        value: `${s.dynamics.flowM3h} m³/h`,
        note: `turnover ${Number.isFinite(s.dynamics.turnoverH) ? s.dynamics.turnoverH.toFixed(1) : '—'} h`,
      },
    ];
    rows.forEach((r, i) => {
      const d = SETTINGS.dynamics[i];
      drawGlassPanel(ctx, d.row);
      drawText(ctx, r.name, d.row.x + 16, d.row.y + 24, {
        size: 18,
        weight: 600,
      });
      drawText(ctx, r.note, d.row.x + 16, d.row.y + 56, {
        size: 14,
        colour: AERO.inkSoft,
      });
      drawText(ctx, r.value, d.minus.x - 24, d.row.y + d.row.h / 2, {
        size: 28,
        weight: 700,
        align: 'right',
      });
      drawGlossyButton(ctx, d.minus, '−', {
        state: press(m, `dyn-:${r.key}`),
        size: 26,
      });
      drawGlossyButton(ctx, d.plus, '+', {
        state: press(m, `dyn+:${r.key}`),
        size: 26,
      });
    });
    drawGlossyButton(ctx, SETTINGS.demo, '▶  Demonstration', {
      state: press(m, 'demo'),
      tint: 'green',
      size: 17,
    });
    drawGlossyButton(ctx, SETTINGS.restart, '⟳  Restart', {
      state: press(m, 'restart'),
      tint: 'grey',
      size: 17,
    });
    drawText(
      ctx,
      'Doses are worked out from these: enter them as the pool is built.',
      16,
      336,
      {
        size: 15,
        colour: AERO.inkSoft,
      },
    );
    return;
  }
  drawGlassPanel(ctx, SETTINGS.list);
  s.targets.forEach((t, i) => {
    const r = targetListRow(i);
    if (i === s.row)
      drawGlossyButton(ctx, r, '', { state: 'selected', shape: 'rounded' });
    drawText(ctx, t.name, r.x + 12, r.y + r.h / 2, {
      size: 15,
      weight: i === s.row ? 700 : 400,
      colour: i === s.row ? AERO.inkOnDark : AERO.ink,
    });
  });
  drawGlossyButton(ctx, SETTINGS.up, '▲', {
    state: press(m, 'row-'),
    size: 16,
  });
  drawGlossyButton(ctx, SETTINGS.down, '▼', {
    state: press(m, 'row+'),
    size: 16,
  });
  const t = s.targets[s.row];
  drawText(
    ctx,
    `${t.name}${t.unit ? ` (${t.unit})` : ''}`,
    SETTINGS.fields[0].row.x,
    122,
    {
      size: 18,
      weight: 700,
    },
  );
  const names = {
    set: 'Set point',
    low: 'Low limit',
    high: 'High limit',
  } as const;
  for (const f of SETTINGS.fields) {
    drawGlassPanel(ctx, f.row);
    drawText(ctx, names[f.field], f.row.x + 14, f.row.y + 22, {
      size: 14,
      colour: AERO.inkSoft,
    });
    const v = t.target[f.field];
    drawText(ctx, v.toFixed(t.decimals), f.row.x + 14, f.row.y + 52, {
      size: 26,
      weight: 700,
    });
    drawGlossyButton(ctx, f.minus, '−', {
      state: press(m, `tgt-:${f.field}`),
      size: 24,
    });
    drawGlossyButton(ctx, f.plus, '+', {
      state: press(m, `tgt+:${f.field}`),
      size: 24,
    });
  }
}

/**
 * The Trio's mark on its boot's splash and permission dialog: a glossy
 * blue water drop `size` tall, centred on (x, y).
 */
export function drawTrioMark(ctx: Ctx, x: number, y: number, size: number) {
  const k = size / 140;
  ctx.save();
  ctx.translate(x, y - 14 * k);
  ctx.scale(k, k);
  const drop = ctx.createRadialGradient(-12, 10, 4, 0, 18, 60);
  drop.addColorStop(0, '#e9f7ff');
  drop.addColorStop(0.35, '#5fc3ff');
  drop.addColorStop(1, '#0b6fc0');
  ctx.fillStyle = drop;
  ctx.beginPath();
  ctx.moveTo(0, -55);
  ctx.bezierCurveTo(30, -10, 48, 15, 48, 35);
  ctx.arc(0, 35, 48, 0, Math.PI, false);
  ctx.bezierCurveTo(-48, 15, -30, -10, 0, -55);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.ellipse(-18, 22, 8, 14, -0.4, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();
}
