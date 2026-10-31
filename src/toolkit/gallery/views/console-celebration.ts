import {
  AERO,
  drawBubble,
  drawDroplet,
  drawLeaf,
  drawText,
} from '../../../ui2d/aero';
import {
  CELEBRATION_SECONDS,
  fireworks,
  raindrops,
} from '../logic/console-celebration';
import type { CelebrationFrame } from '../logic/console-celebration';
import { SCREEN } from '../logic/dosing-console';

/**
 * The dosing console's celebration and commiseration drawn over a screen
 * (`logic/console-celebration`): glossy, bubbly Frutiger Aero artwork drawn
 * on the canvas. Won: fireworks on every screen, a smiling face on the
 * scenario screen, a thumbs up on the chemical screen, two more smiles and
 * stars on the dose screen. Lost: a rain cloud, a thumbs down, and a sad face
 * beside a wilted leaf and a burst bubble.
 */

type Ctx = CanvasRenderingContext2D;
const W = SCREEN.w;
const H = SCREEN.h;

/** A gentle bob, s → px. */
const bob = (t: number, phase = 0, px = 6) =>
  Math.sin(t * 2 * Math.PI * 0.8 + phase) * px;

/** A glossy sphere: a radial body and a white crescent of light on top. */
function sphere(
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  c: readonly string[],
) {
  const g = ctx.createRadialGradient(
    x - r * 0.3,
    y - r * 0.4,
    r * 0.1,
    x,
    y,
    r,
  );
  g.addColorStop(0, c[0]);
  g.addColorStop(0.6, c[1]);
  g.addColorStop(1, c[2]);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = c[3];
  ctx.lineWidth = Math.max(1.5, r * 0.04);
  ctx.stroke();
  const h = ctx.createLinearGradient(0, y - r * 0.95, 0, y - r * 0.1);
  h.addColorStop(0, 'rgba(255,255,255,0.9)');
  h.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = h;
  ctx.beginPath();
  ctx.ellipse(x, y - r * 0.5, r * 0.68, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
}

const SUN = ['#fff9c8', '#ffd83a', '#e89b0c', '#a8680a'] as const;
const GLUM = ['#e8f2fa', '#9cc3df', '#5b8db3', '#3b6585'] as const;

/** A face: happy (a broad smile) or sad (a frown and a tear). */
function face(ctx: Ctx, x: number, y: number, r: number, happy: boolean) {
  sphere(ctx, x, y, r, happy ? SUN : GLUM);
  ctx.fillStyle = AERO.ink;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(
      x + s * r * 0.32,
      y - r * 0.12,
      r * 0.09,
      r * 0.15,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.strokeStyle = AERO.ink;
  ctx.lineCap = 'round';
  ctx.lineWidth = r * 0.09;
  ctx.beginPath();
  if (happy) ctx.arc(x, y + r * 0.08, r * 0.5, 0.15 * Math.PI, 0.85 * Math.PI);
  else ctx.arc(x, y + r * 0.62, r * 0.38, 1.2 * Math.PI, 1.8 * Math.PI);
  ctx.stroke();
  if (happy) {
    ctx.fillStyle = 'rgba(240,112,92,0.45)';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(
        x + s * r * 0.58,
        y + r * 0.22,
        r * 0.14,
        r * 0.09,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  } else drawDroplet(ctx, x + r * 0.38, y + r * 0.22, r * 0.1);
}

/** A glossy thumb, up (green) or down (red), its fist at (x, y). */
function thumb(ctx: Ctx, x: number, y: number, s: number, up: boolean) {
  const c = up ? AERO.tints.green : AERO.tints.red;
  ctx.save();
  ctx.translate(x, y);
  if (!up) ctx.rotate(Math.PI);
  const body = (path: () => void) => {
    const g = ctx.createLinearGradient(-s, -s, s, s);
    g.addColorStop(0, c[0]);
    g.addColorStop(0.5, c[1]);
    g.addColorStop(1, c[2]);
    ctx.fillStyle = g;
    ctx.beginPath();
    path();
    ctx.fill();
    ctx.strokeStyle = c[3];
    ctx.lineWidth = s * 0.05;
    ctx.stroke();
  };
  // The thumb, then the fist and its cuff.
  body(() => ctx.roundRect(-s * 0.42, -s * 1.15, s * 0.42, s * 0.95, s * 0.21));
  body(() => ctx.roundRect(-s * 0.55, -s * 0.35, s * 1.1, s * 0.95, s * 0.22));
  ctx.strokeStyle = c[3];
  ctx.lineWidth = s * 0.04;
  for (let k = 1; k < 4; k++) {
    const yy = -s * 0.35 + (k * s * 0.95) / 4;
    ctx.beginPath();
    ctx.moveTo(s * 0.15, yy);
    ctx.lineTo(s * 0.5, yy);
    ctx.stroke();
  }
  body(() => ctx.roundRect(-s * 0.62, s * 0.6, s * 1.24, s * 0.3, s * 0.08));
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(-s * 0.21, -s * 0.9, s * 0.1, s * 0.22, 0, 0, Math.PI * 2);
  ctx.ellipse(-s * 0.15, -s * 0.18, s * 0.3, s * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A four-pointed sparkle. */
function star(ctx: Ctx, x: number, y: number, r: number) {
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4 - Math.PI / 2;
    const rr = k % 2 ? r * 0.25 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.fill();
}

/** A soft grey rain cloud of glossy puffs. */
function cloud(ctx: Ctx, x: number, y: number, s: number) {
  const puffs = [
    [-0.6, 0.1, 0.42],
    [-0.15, -0.2, 0.55],
    [0.4, -0.05, 0.48],
    [0.75, 0.18, 0.32],
  ];
  for (const [dx, dy, r] of puffs)
    sphere(ctx, x + dx * s, y + dy * s, r * s, [
      '#f8fbfd',
      '#c9d3da',
      '#8d9aa5',
      'rgba(95,108,118,0.4)',
    ]);
}

/** A bubble burst: its broken ring and flecks flying off. */
function burst(ctx: Ctx, x: number, y: number, r: number, t: number) {
  const spread = 1 + Math.min(1, t) * 0.6;
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 2;
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3 + 0.3;
    ctx.beginPath();
    ctx.arc(x, y, r * spread, a, a + 0.5);
    ctx.stroke();
    drawBubble(
      ctx,
      x + Math.cos(a + 0.25) * r * spread * 1.3,
      y + Math.sin(a + 0.25) * r * spread * 1.3,
      4,
    );
  }
}

/** The headline, a glossy word across the screen's top. */
function headline(ctx: Ctx, text: string, y: number, colour: string) {
  drawText(ctx, text, W / 2, y, {
    size: 38,
    weight: 800,
    align: 'center',
    colour,
    glow: true,
  });
}

/** Draws frame `f` of the celebration over screen `screen` (0 scenario, 1 chemical, 2 dose). */
export function drawCelebration(ctx: Ctx, screen: number, f: CelebrationFrame) {
  const { t } = f;
  ctx.save();
  ctx.globalAlpha = f.alpha;
  const won = f.kind === 'won';
  // A wash over the screen beneath: sky-bright for a win, grey for a loss.
  const g = ctx.createLinearGradient(0, 0, 0, H);
  if (won) {
    g.addColorStop(0, 'rgba(8,40,96,0.95)');
    g.addColorStop(1, 'rgba(24,120,186,0.93)');
  } else {
    g.addColorStop(0, 'rgba(60,72,84,0.95)');
    g.addColorStop(1, 'rgba(105,122,136,0.93)');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  if (won) {
    for (const s of fireworks(screen, t, W, H, CELEBRATION_SECONDS.won)) {
      ctx.globalAlpha = f.alpha * s.alpha;
      ctx.fillStyle = `hsl(${s.hue} 95% 70%)`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(s.x - s.r * 0.3, s.y - s.r * 0.3, s.r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = f.alpha;
    for (let k = 0; k < 6; k++) {
      const tw = 0.5 + 0.5 * Math.sin(t * 6 + k * 1.7 + screen);
      star(
        ctx,
        40 + ((k * 89 + screen * 37) % 440),
        40 + ((k * 61 + screen * 23) % 300),
        5 + 7 * tw,
      );
    }
    if (screen === 0) {
      headline(ctx, 'Challenge won!', 52, '#fff6b0');
      face(ctx, W / 2, 210 + bob(t), 96, true);
    } else if (screen === 1) {
      headline(ctx, 'Brilliant!', 52, '#d8f5b3');
      const tilt = Math.sin(t * 2 * Math.PI * 0.8) * 0.08;
      ctx.save();
      ctx.translate(W / 2, 240);
      ctx.rotate(tilt);
      thumb(ctx, 0, 0, 120, true);
      ctx.restore();
    } else {
      headline(ctx, 'Perfect water', 52, '#bfe9ff');
      face(ctx, 150, 220 + bob(t, 0), 70, true);
      face(ctx, 362, 220 + bob(t, Math.PI), 70, true);
    }
  } else {
    if (screen === 0) {
      headline(ctx, 'Not this time…', 52, '#f4f7f9');
      cloud(ctx, W / 2, 150 + bob(t, 0, 3), 120);
      for (const d of raindrops(t, 140, 372, 210, 360, 14))
        drawDroplet(ctx, d.x, d.y, 6);
    } else if (screen === 1) {
      headline(ctx, 'Oh dear', 52, '#ffd0c8');
      thumb(ctx, W / 2, 210 + Math.min(1, t) * 20, 115, false);
    } else {
      headline(ctx, 'Have another go', 52, '#f4f7f9');
      face(ctx, 190, 220 + bob(t, 0, 3), 78, false);
      // The leaf droops further as it plays.
      // A wilting leaf: its stalk bends and the leaf droops as it plays.
      const wilt = Math.min(1, t / 2);
      ctx.strokeStyle = '#6f8f3a';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(350, 330);
      ctx.quadraticCurveTo(350, 200, 350 + 40 * wilt, 190 + 20 * wilt);
      ctx.stroke();
      drawLeaf(
        ctx,
        350 + 40 * wilt + 40 * Math.cos(0.2 + 1.1 * wilt),
        190 + 20 * wilt + 40 * Math.sin(0.2 + 1.1 * wilt),
        42,
        0.2 + 1.1 * wilt,
      );
      burst(ctx, 400, 300, 22, t);
    }
  }
  ctx.restore();
}
