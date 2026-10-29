/**
 * The title logo (timing and ripple in `logic/title-logo.ts`; its art made
 * by `scripts/title-logo.ts`): the roundel of pool water over its plant
 * draws in, then the title "The Pool" appears over its top, feet dipping
 * into the water, white with a blue outline and a black drop shadow,
 * reflected in the water beneath it; the water and the reflection ripple,
 * the filter vessel's sight glass shows its water swirling over sand, and
 * the gauges' needles tremble. The logo is the vector drawing
 * `the-pool-logo.svg`, drawn sharp at twice the art's size.
 * Two canvases, redrawn only when the ripple's frame changes (at most
 * 10 Hz); each appears by unblurring as it fades in, a CSS animation of its
 * canvas, so it runs smoothly on the compositor. The title is live text,
 * drawn with the canvas's own lettering (and kept as a hidden heading for
 * screen readers).
 */

import logoUrl from '../../../resources/images/title/the-pool-logo.svg?url';
import {
  GAUGES,
  LOGO_ART,
  LOGO_REVEAL_AT_S,
  LOGO_REVEAL_S,
  REVEAL_BLUR_PX,
  TITLE_AT_S,
  TITLE_FADE_S,
  SIGHT_GLASS,
  TITLE_TEXT,
  rippleFrame,
  rippleShift,
  gaugeNeedle,
  sightGlassView,
} from './logic/title-logo';

/** The lettering, Antonio, declared under this name in `main.css`. */
const FONT_FAMILY = '"The Pool Title", "Arial Narrow", sans-serif';
/** The title canvas's resolution over the art's, for crisp lettering. */
const TEXT_SCALE = 2;
const WHITE = '#ffffff';
const OUTLINE = '#0d47a1';
/** The logo's own line colour, for the sight glass and the gauges. */
const LINE = '#02213a';
/** The art canvas's resolution over the art's, the vector drawn sharp. */
const ART_SCALE = 2;
/** The height of a ripple strip, in pixels of the canvas drawn into. */
const STRIP = 2;

export function createTitleLogo() {
  const { width: W, height: H } = LOGO_ART;
  const root = document.createElement('div');
  root.className = 'title-logo';
  const art = document.createElement('canvas');
  art.className = 'title-logo-art';
  art.width = W * ART_SCALE;
  art.height = H * ART_SCALE;
  const lettering = document.createElement('canvas');
  lettering.className = 'title-logo-lettering';
  lettering.width = W * TEXT_SCALE;
  lettering.height = H * TEXT_SCALE;
  const name = document.createElement('h1');
  name.className = 'title-name';
  name.textContent = 'The Pool';
  root.append(art, lettering, name);

  const still =
    typeof matchMedia === 'function' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches;

  // The vector logo (`resources/images/title/the-pool-logo.svg`, made by
  // `scripts/title-logo.ts`), drawn once at the art canvas's resolution,
  // the source its ripple strips are cut from.
  const image = new Image();
  const source = document.createElement('canvas');
  source.width = W * ART_SCALE;
  source.height = H * ART_SCALE;
  let imageReady = false;
  image.decoding = 'async';
  image.addEventListener('load', () => {
    source
      .getContext('2d')!
      .drawImage(image, 0, 0, W * ART_SCALE, H * ART_SCALE);
    imageReady = true;
    lastArt = -1;
  });
  image.src = logoUrl;

  // The title and its reflection, drawn once the lettering's font is in.
  let title: HTMLCanvasElement | null = null;
  let reflection: HTMLCanvasElement | null = null;
  const S = TEXT_SCALE;
  const reflectTop = TITLE_TEXT.baselineY + TITLE_TEXT.reflectionGapPx;
  const reflectDepth = TITLE_TEXT.sizePx * TITLE_TEXT.reflectionScale;
  const letter = (ctx: CanvasRenderingContext2D, shadow: boolean) => {
    ctx.font = `700 ${TITLE_TEXT.sizePx * S}px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 11 * S;
    ctx.strokeStyle = OUTLINE;
    ctx.fillStyle = WHITE;
    if (shadow) {
      ctx.shadowColor = '#000000';
      ctx.shadowOffsetX = 3 * S;
      ctx.shadowOffsetY = 5 * S;
      ctx.shadowBlur = 7 * S;
    }
    ctx.strokeText('The Pool', 0, 0);
    ctx.shadowColor = 'transparent';
    ctx.fillText('The Pool', 0, 0);
  };
  const buildLettering = () => {
    const make = () => {
      const c = document.createElement('canvas');
      c.width = W * S;
      c.height = H * S;
      return c;
    };
    title = make();
    const t = title.getContext('2d')!;
    t.translate(LOGO_ART.centreX * S, TITLE_TEXT.baselineY * S);
    letter(t, true);

    reflection = make();
    const r = reflection.getContext('2d')!;
    r.save();
    r.translate(LOGO_ART.centreX * S, reflectTop * S);
    r.scale(1, -TITLE_TEXT.reflectionScale);
    letter(r, false);
    r.restore();
    // Darkened into the water, and fading away below.
    r.globalCompositeOperation = 'source-atop';
    r.fillStyle = 'rgba(6, 40, 80, 0.45)';
    r.fillRect(0, 0, W * S, H * S);
    r.globalCompositeOperation = 'destination-in';
    const fade = r.createLinearGradient(
      0,
      reflectTop * S,
      0,
      (reflectTop + reflectDepth) * S,
    );
    fade.addColorStop(0, 'rgba(0,0,0,1)');
    fade.addColorStop(1, 'rgba(0,0,0,0)');
    r.fillStyle = fade;
    r.fillRect(0, 0, W * S, H * S);
    lastText = -1;
  };
  const font = `700 ${TITLE_TEXT.sizePx}px ${FONT_FAMILY}`;
  void (document.fonts?.load(font) ?? Promise.resolve())
    .catch(() => undefined)
    .then(buildLettering);

  const clipToRoundel = (ctx: CanvasRenderingContext2D, scale: number) => {
    ctx.beginPath();
    ctx.arc(
      LOGO_ART.centreX * scale,
      LOGO_ART.centreY * scale,
      LOGO_ART.innerRadius * scale,
      0,
      Math.PI * 2,
    );
    ctx.clip();
  };

  // The filter's sight glass, drawn on its vessel in the logo's flat style:
  // a white bezel with dark lines and bolts, and through the glass the
  // water swirling a few grains over a stirring bed of sand.
  const drawSightGlass = (ctx: CanvasRenderingContext2D, frame: number) => {
    const { x, y, radius: r } = SIGHT_GLASS;
    const view = sightGlassView(frame);
    const ring = (radius: number) => {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
    };
    ctx.save();
    ring(r + 4);
    ctx.fillStyle = '#f4f7f9';
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = LINE;
    ctx.stroke();
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + (k * Math.PI) / 2;
      ctx.beginPath();
      ctx.arc(
        x + (r + 2) * Math.cos(a),
        y + (r + 2) * Math.sin(a),
        1.1,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = LINE;
      ctx.fill();
    }
    ring(r);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#7fd6ef';
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    ctx.beginPath();
    ctx.moveTo(x - r, y + view.sandY - view.sandTilt / 2);
    ctx.lineTo(x + r, y + view.sandY + view.sandTilt / 2);
    ctx.lineTo(x + r, y + r);
    ctx.lineTo(x - r, y + r);
    ctx.closePath();
    ctx.fillStyle = '#e8c46d';
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#b8923e';
    ctx.stroke();
    ctx.fillStyle = '#f6e4a8';
    for (const g of view.grains) {
      ctx.beginPath();
      ctx.arc(x + g.dx, y + g.dy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // A glint on the glass.
    ctx.beginPath();
    ctx.arc(x, y, r * 0.72, Math.PI * 1.08, Math.PI * 1.42);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.stroke();
    ctx.restore();
    ring(r);
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = LINE;
    ctx.stroke();
    ctx.restore();
  };

  // The pressure gauges' faces, redrawn over the logo's with their needles
  // trembling about their readings.
  const drawGauges = (ctx: CanvasRenderingContext2D, frame: number) => {
    GAUGES.forEach((g, k) => {
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.r - 1.6, 0, Math.PI * 2);
      ctx.fillStyle = WHITE;
      ctx.fill();
      ctx.beginPath();
      for (let n = 0; n <= 8; n++) {
        const a = ((-225 + n * 33.75) * Math.PI) / 180;
        ctx.moveTo(
          g.x + Math.cos(a) * (g.r - 5),
          g.y + Math.sin(a) * (g.r - 5),
        );
        ctx.lineTo(
          g.x + Math.cos(a) * (g.r - 2.5),
          g.y + Math.sin(a) * (g.r - 2.5),
        );
      }
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = LINE;
      ctx.stroke();
      const a = (gaugeNeedle(k, frame) * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y);
      ctx.lineTo(g.x + Math.cos(a) * (g.r - 4), g.y + Math.sin(a) * (g.r - 4));
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(g.x, g.y, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = LINE;
      ctx.fill();
    });
  };

  const artCtx = art.getContext('2d')!;
  const drawArt = (frame: number) => {
    const A = ART_SCALE;
    artCtx.setTransform(1, 0, 0, 1, 0, 0);
    artCtx.clearRect(0, 0, W * A, H * A);
    artCtx.drawImage(source, 0, 0);
    artCtx.setTransform(A, 0, 0, A, 0, 0);
    artCtx.save();
    clipToRoundel(artCtx, 1);
    for (let y = LOGO_ART.waterTop; y < LOGO_ART.waterBottom; y += STRIP) {
      const dx = rippleShift(y + STRIP / 2, frame);
      if (Math.abs(dx) < 0.02) continue;
      artCtx.drawImage(source, 0, y * A, W * A, STRIP * A, dx, y, W, STRIP);
    }
    artCtx.restore();
    drawSightGlass(artCtx, frame);
    drawGauges(artCtx, frame);
  };

  const textCtx = lettering.getContext('2d')!;
  const drawText = (frame: number) => {
    if (!title || !reflection) return;
    textCtx.clearRect(0, 0, W * S, H * S);
    textCtx.save();
    clipToRoundel(textCtx, S);
    textCtx.globalAlpha = TITLE_TEXT.reflectionAlpha;
    const top = reflectTop * S;
    // The reflection stays on the water, above the tiled edge.
    const bottom =
      Math.min(reflectTop + reflectDepth, LOGO_ART.waterBottom) * S;
    for (let y = top; y < bottom; y += STRIP) {
      const dx =
        rippleShift(
          (y + STRIP / 2) / S,
          frame,
          reflectTop,
          reflectTop + reflectDepth,
        ) *
        S *
        1.6;
      textCtx.drawImage(reflection, 0, y, W * S, STRIP, dx, y, W * S, STRIP);
    }
    textCtx.restore();
    textCtx.drawImage(title, 0, 0);
  };

  let running = false;
  let started = 0;
  let lastArt = -1;
  let lastText = -1;
  const tick = (now: number) => {
    if (!running) return;
    requestAnimationFrame(tick);
    const frame = still ? 0 : rippleFrame((now - started) / 1000);
    if (imageReady && frame !== lastArt) {
      drawArt(frame);
      lastArt = frame;
    }
    if (title && frame !== lastText) {
      drawText(frame);
      lastText = frame;
    }
  };

  // Each layer appears by unblurring as it fades in, both over the same
  // seconds: the logo at 4 s, the title at 6 s.
  const appear = (el: HTMLElement, atSeconds: number, seconds: number) =>
    el.animate(
      [
        { filter: `blur(${REVEAL_BLUR_PX}px)`, opacity: 0 },
        { filter: 'blur(0px)', opacity: 1 },
      ],
      {
        delay: atSeconds * 1000,
        duration: seconds * 1000,
        easing: 'ease-out',
        fill: 'both',
      },
    );
  const reveal = () => {
    for (const el of [art, lettering])
      for (const a of el.getAnimations()) a.cancel();
    appear(art, LOGO_REVEAL_AT_S, LOGO_REVEAL_S);
    appear(lettering, TITLE_AT_S, TITLE_FADE_S);
  };

  return {
    element: root,
    /** Begin the sequence afresh: the logo at 4 s, the title at 6 s. */
    start() {
      started = performance.now();
      reveal();
      if (running) return;
      running = true;
      lastArt = lastText = -1;
      requestAnimationFrame(tick);
    },
    stop() {
      running = false;
    },
  };
}
