import {
  AERO,
  drawAeroBackground,
  drawBanner,
  drawGlassPanel,
  drawGlossyButton,
  drawList,
  drawMakerStrip,
  drawScoreBar,
  drawScrollArrow,
  drawSegmented,
  drawText,
  drawTextBlock,
  drawTitleBar,
} from '../../../ui2d/aero';
import type { ButtonState, Tint } from '../../../ui2d/aero';
import { listWindow } from '../../../ui2d/aero/logic/aero-layout';
import { brandById } from '../../components/core/logic/brands';
import { drawBrandMark } from '../../components/core/views/brand-logo';
import { SIZES } from '../../../game/plant/museum-4-doses';
import {
  HOLD,
  LEVEL_NAME,
  labClock,
} from '../../../game/plant/museum-4-challenge';
import {
  CHEMICAL_LAYOUT,
  DOSE_LAYOUT,
  HOLD_STEP,
  LIST_ROWS,
  SCENARIO_LAYOUT,
  SCREEN,
} from '../logic/dosing-console';
import type {
  ChemicalScreen,
  DoseScreen,
  ScenarioScreen,
} from '../logic/dosing-console';

/**
 * Hall 4's dosing console's three screens drawn with the Aero kit
 * (mission 113, `doc/plans/113/c-screens-interaction.md`), each from its
 * view model alone, onto a 512 × 384 canvas. Its software is Aqualis
 * Interactive's ClearDose Studio (`brands.ts`).
 */

type Ctx = CanvasRenderingContext2D;

export const MAKER = brandById('aqualis');
export const PRODUCT = 'ClearDose Studio';

const FULL = { x: 0, y: 0, w: SCREEN.w, h: SCREEN.h };
const mark = (ctx: Ctx, x: number, y: number, r: number) =>
  drawBrandMark(ctx, MAKER, x, y, r);

const state = (pressed: string | null, id: string): ButtonState =>
  pressed === id ? 'pressed' : 'normal';

function button(
  ctx: Ctx,
  m: { pressed: string | null },
  id: string,
  r: { x: number; y: number; w: number; h: number },
  label: string,
  tint: Tint,
) {
  drawGlossyButton(ctx, r, label, { state: state(m.pressed, id), tint });
}

const arrow = (
  ctx: Ctx,
  r: { x: number; y: number; w: number },
  dir: 'up' | 'down' | 'left' | 'right',
  s: ButtonState,
) => drawScrollArrow(ctx, r.x + r.w / 2, r.y + r.w / 2, r.w / 2, dir, s);

const SMALL_PRINT = 'This laboratory runs 1,000 times faster than real life.';

export function drawScenarioScreen(ctx: Ctx, m: ScenarioScreen) {
  const L = SCENARIO_LAYOUT;
  drawAeroBackground(ctx, FULL, 1);
  drawMakerStrip(ctx, L.strip, 'aqualis', PRODUCT, mark);
  const v = m.view;
  if (v.kind === 'free') {
    drawText(ctx, 'Free play', 20, 74, { size: 24, weight: 600, glow: true });
    drawTextBlock(
      ctx,
      L.freeText,
      'No challenge loaded. Try any chemical and watch what happens, or choose a challenge below.',
      { size: 16 },
    );
    arrow(ctx, L.cardPrev, 'left', state(m.pressed, 'card-prev'));
    drawGlassPanel(ctx, L.cardBox, { radius: 10 });
    drawText(
      ctx,
      `Challenge ${m.pick + 1} of ${m.cards}: ${m.pickTitle}`,
      L.cardBox.x + L.cardBox.w / 2,
      L.cardBox.y + L.cardBox.h / 2 + 1,
      { size: 17, weight: 600, align: 'center', maxWidth: L.cardBox.w - 16 },
    );
    arrow(ctx, L.cardNext, 'right', state(m.pressed, 'card-next'));
    drawSegmented(
      ctx,
      [L.levelJourneyman, L.levelPro],
      [LEVEL_NAME.journeyman, LEVEL_NAME.pro],
      m.level === 'journeyman' ? 0 : 1,
      m.pressed === 'level-journeyman'
        ? 0
        : m.pressed === 'level-pro'
          ? 1
          : null,
    );
    button(ctx, m, 'start', L.start, 'START', 'green');
    button(ctx, m, 'reset', L.reset, 'RESET', 'grey');
  } else if (v.kind === 'challenge') {
    drawText(ctx, v.title, 20, 70, {
      size: 22,
      weight: 700,
      glow: true,
      maxWidth: 472,
    });
    drawText(
      ctx,
      `SWIMMERS ${v.swimmers} · LEVEL ${LEVEL_NAME[v.level]}`,
      20,
      94,
      { size: 14, weight: 600, colour: AERO.inkSoft },
    );
    drawTextBlock(ctx, L.problem, v.problem, { size: 15 });
    drawTextBlock(ctx, L.goal, v.goal, { size: 16, weight: 600 });
    drawText(ctx, `PAR ${v.par} · DOSES USED ${v.used}`, 20, 222, {
      size: 16,
      weight: 700,
    });
    const held =
      v.held === null ? null : Math.floor(v.held / HOLD_STEP) * HOLD_STEP;
    // How close the water is to balanced, red to green; what is still out, or the hold.
    drawScoreBar(
      ctx,
      L.progress,
      held === null ? (m.closeness ?? 0) : 1,
      held === null
        ? `OUT OF RANGE · ${v.out.join(', ')}`
        : `IN RANGE · HOLDING ${labClock(held)} / ${labClock(HOLD)}`,
    );
    button(ctx, m, 'reset', L.reset, 'RESET', 'grey');
    button(ctx, m, 'abandon', L.abandon, 'FREE PLAY', 'aqua');
  } else if (v.kind === 'won') {
    drawBanner(
      ctx,
      L.banner,
      'Well done',
      `The water is back to normal. You clearly understand pool chemistry. ${v.title}: ${v.used} ${v.used === 1 ? 'dose' : 'doses'}, par ${v.par}.`,
      'green',
    );
    button(ctx, m, 'continue', L.next, 'CONTINUE', 'green');
  } else {
    drawBanner(
      ctx,
      L.banner,
      'Out of doses',
      `Par was ${v.par}, and the water is still not right: ${v.out.join(', ') || 'it would not hold'} out of range. Try again, or carry on in free play.`,
      'red',
    );
    button(ctx, m, 'retry', L.retry, 'RETRY', 'aqua');
    button(ctx, m, 'free-play', L.freePlay, 'FREE PLAY', 'grey');
  }
  if (m.caption && !m.confirmReset) {
    ctx.fillStyle = '#e4f3fc';
    ctx.beginPath();
    ctx.roundRect(L.caption.x, L.caption.y, L.caption.w, L.caption.h, 12);
    ctx.fill();
    drawGlassPanel(ctx, L.caption, { radius: 12, strength: 1.5 });
    const head = {
      briefing: 'Briefing',
      clue: 'A clue',
      explanation: 'How it worked',
    }[m.caption.kind];
    drawText(ctx, `♪ ${head}`, L.caption.x + 14, L.caption.y + 18, {
      size: 15,
      weight: 700,
      colour: AERO.inkSoft,
    });
    drawTextBlock(
      ctx,
      {
        x: L.caption.x + 14,
        y: L.caption.y + 32,
        w: L.caption.w - 28,
        h: L.caption.h - 38,
      },
      m.caption.text,
      { size: 15 },
    );
  }
  if (m.confirmReset) {
    ctx.fillStyle = 'rgba(10,40,70,0.35)';
    ctx.fillRect(0, 0, SCREEN.w, SCREEN.h);
    ctx.fillStyle = '#e4f3fc';
    ctx.beginPath();
    ctx.roundRect(L.dialog.x, L.dialog.y, L.dialog.w, L.dialog.h, 14);
    ctx.fill();
    drawGlassPanel(ctx, L.dialog, { radius: 14, strength: 1.6 });
    drawTitleBar(
      ctx,
      { x: L.dialog.x, y: L.dialog.y, w: L.dialog.w, h: 34 },
      'Reset the lab?',
    );
    drawTextBlock(
      ctx,
      { x: L.dialog.x + 18, y: L.dialog.y + 44, w: L.dialog.w - 36, h: 96 },
      "The water goes back to balanced and any challenge ends. Don't worry: you cannot break anything here.",
      { size: 15 },
    );
    button(ctx, m, 'reset-yes', L.resetYes, 'RESET', 'red');
    button(ctx, m, 'reset-no', L.resetNo, 'CANCEL', 'grey');
  }
  drawText(ctx, SMALL_PRINT, L.smallPrint.x, L.smallPrint.y, {
    size: 11,
    align: 'center',
    colour: AERO.inkOnDark,
  });
}

export function drawChemicalScreen(ctx: Ctx, m: ChemicalScreen) {
  const L = CHEMICAL_LAYOUT;
  drawAeroBackground(ctx, FULL, 2);
  drawTitleBar(ctx, L.title, 'Chemical', { mark });
  const w = listWindow(m.rows.length, LIST_ROWS, m.top);
  drawList(ctx, L.list, m.rows, {
    shown: w.shown,
    selected: m.chemical,
    rowHeight: L.rowHeight,
    thumb: w.thumb,
    size: 16,
  });
  arrow(
    ctx,
    L.up,
    'up',
    m.chemical === 0 ? 'disabled' : state(m.pressed, 'chem-up'),
  );
  arrow(
    ctx,
    L.down,
    'down',
    m.chemical === m.rows.length - 1
      ? 'disabled'
      : state(m.pressed, 'chem-down'),
  );
  drawGlassPanel(ctx, L.describe, { radius: 10 });
  drawText(ctx, m.heading, L.describe.x + 12, L.describe.y + 16, {
    size: 16,
    weight: 700,
  });
  drawTextBlock(
    ctx,
    {
      x: L.describe.x + 12,
      y: L.describe.y + 30,
      w: L.describe.w - 24,
      h: L.describe.h - 34,
    },
    m.words,
    { size: 13, lineHeight: 16 },
  );
}

export function drawDoseScreen(ctx: Ctx, m: DoseScreen) {
  const L = DOSE_LAYOUT;
  drawAeroBackground(ctx, FULL, 3);
  drawTitleBar(ctx, L.title, 'Dose size', { mark });
  drawText(ctx, m.chemical, L.chemical.x, L.chemical.y, {
    size: 17,
    weight: 600,
    align: 'center',
    glow: true,
  });
  const pressedSegment =
    m.pressed && /^size-\d$/.test(m.pressed)
      ? Number(m.pressed.slice(5))
      : null;
  drawSegmented(ctx, L.segments, SIZES, m.size, pressedSegment);
  drawScrollArrow(
    ctx,
    L.less.x + L.less.w / 2,
    L.less.y + L.less.h / 2,
    L.less.w / 2,
    'left',
    m.size === 0 ? 'disabled' : state(m.pressed, 'size-down'),
  );
  drawScrollArrow(
    ctx,
    L.more.x + L.more.w / 2,
    L.more.y + L.more.h / 2,
    L.more.w / 2,
    'right',
    m.size === 4 ? 'disabled' : state(m.pressed, 'size-up'),
  );
  drawGlassPanel(ctx, { x: 72, y: 168, w: 368, h: 56 }, { radius: 14 });
  drawText(ctx, m.amount, L.amount.x, L.amount.y, {
    size: 30,
    weight: 700,
    align: 'center',
    glow: true,
  });
  if (m.left !== null)
    drawText(ctx, `Doses left ${m.left}`, L.left.x, L.left.y, {
      size: 16,
      weight: 700,
      align: 'center',
    });
  // The lower third: DOSE once a chemical and a size are picked, the hint till then.
  if (m.armed)
    drawGlossyButton(
      ctx,
      L.dose,
      !m.ready ? 'NO DOSES LEFT' : m.repeat ? 'REPEAT DOSE' : 'DOSE',
      {
        tint: m.ready ? 'green' : 'grey',
        state: !m.ready ? 'disabled' : state(m.pressed, 'dose'),
        size: !m.ready ? 22 : m.repeat ? 30 : 40,
      },
    );
  else
    drawText(
      ctx,
      m.ready ? 'Choose a chemical and a dose size.' : 'No doses left.',
      L.hint.x,
      L.hint.y,
      {
        size: 17,
        align: 'center',
        colour: m.ready ? AERO.ink : '#8f1d10',
        weight: 600,
      },
    );
  drawText(ctx, 'Each size is about three times the one before.', 256, 360, {
    size: 12,
    align: 'center',
    colour: AERO.inkOnDark,
  });
}
