import { drawBootScreen } from './boot-screen';
import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  ExtrudeGeometry,
  Mesh,
  PlaneGeometry,
  Shape,
} from 'three';
import type {
  BufferGeometry,
  Material,
  MeshBasicMaterial,
  Object3D,
  Texture,
} from 'three';
import { createPs1Material } from '../../core/parts/ps1-material';
import {
  createMicroLabel,
  createSevenSegment,
  kitGlow,
  kitPaint,
} from '../../core/views/eighties-controls';
import { createBrandBadge } from '../../core/views/brand-badge';
import type { SoftStarterLamps } from '../logic/soft-starter';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createLegendPlate, createPushButton } from './industrial-controls';
import type { OperatorColour, PushButtonView } from './industrial-controls';
import { createCanvasTexture } from '../../core/views/screens';

/**
 * Fittings for the doors of a 1990s motor control centre that the other
 * view files lack: a door-mounted industrial LCD panel, a strip-chart recorder,
 * an alarm annunciator, a pushbutton station, a flange-mounted disconnect
 * handle, a soft starter's front, a digital power monitor, pressed
 * louvres and a viewing window. Each is shown first on the CABINET
 * FITTINGS board in dev0 and then used on the Retro Encabulator (dev6),
 * so improving one here improves both. Real size in metres, facing +z,
 * mounted on the surface at z = 0. Views only: each shows what it is given.
 */

const add = (
  parent: Object3D,
  geometry: BufferGeometry,
  material: Material | Material[],
  x = 0,
  y = 0,
  z = 0,
) => {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};

/** A canvas drawn on and shown self-lit, like a screen. */
const screen = (kit: PanelKit, width: number, height: number) => {
  const art = createCanvasTexture(width, height);
  kit.textures.push(art.texture);
  const material = createPs1Material(
    { map: art.texture },
    true,
    true,
  ) as MeshBasicMaterial;
  kit.materials.push(material);
  return { ...art, material };
};

/** Smooth wandering signals, the same for every viewer: sums of sines. */
const wander = (t: number, seed: number) =>
  0.5 +
  0.22 * Math.sin(t * 0.31 + seed * 1.7) +
  0.12 * Math.sin(t * 0.83 + seed * 3.1) +
  0.06 * Math.sin(t * 2.3 + seed * 5.3);

/** Words for screens, from the Retro Encabulator's own vocabulary. */
const JARGON = [
  'PANENDERMIC SEMIBOLOID',
  'DINGLE ARM REDUCTANCE',
  'MODIAL INTERACTION',
  'LOTUS-O-DELTA WINDING',
  'SPURVING BEARING TEMP',
  'MARZLEVANE ALIGNMENT',
  'HYDROCOPTIC PUMP',
  'CARDINAL GRAMMETER',
  'SINUSOIDAL REPLETION',
  'DRAWN REACTANCE',
  'MAGNETO-REDUCTANCE',
  'PREFABULATED AMULITE',
  'MALLEABLE LOGARITHMIC',
  'NOVERTRUNNION',
  'SIDE FUMBLING',
];

export type LcdMode = 'trend' | 'mimic' | 'log' | 'vector';
export type LcdFailure = 'corrupt' | 'banding' | 'stuck' | 'backlight';
export const LCD_MODES: readonly LcdMode[] = [
  'trend',
  'mimic',
  'log',
  'vector',
];

/**
 * Values a room binds an LCD's picture to, instead of its own wandering
 * demonstration readings: the trend's three pens (0 to 1), the vector
 * trace's phase (radians) and size (0 to 1), and a line of text under it.
 */
export interface LcdSignals {
  trend?: readonly number[];
  vectorPhase?: number;
  vectorGain?: number;
  caption?: string;
}

/** A picture a room draws itself, `seconds` its own clock. */
export type LcdPicture = (
  c: CanvasRenderingContext2D,
  w: number,
  h: number,
  seconds: number,
) => void;

export interface LcdMonitorView {
  group: Group;
  setMode(mode: LcdMode): void;
  /** Bind its picture to the room's values; null for its own readings. */
  setSignals(signals: LcdSignals | null): void;
  /** Draw a picture of the room's own in place of the mode's; null to stop. */
  setPicture(picture: LcdPicture | null): void;
  setOn(on: boolean): void;
  /** Distinct KAPUT behaviour; null restores the normal instrument picture. */
  setFailure(kind: LcdFailure | null, seconds?: number): void;
  /** null restores the normal instrument picture. */
  setBoot(lines: readonly string[] | null): void;
  /** Advance its picture; `seconds` is the clock it draws from. */
  update(delta: number): void;
}

/**
 * A shallow door-mounted industrial LCD panel: a charcoal bezel round a
 * 4:3 display, protective glass, a badge, two adjustment wheels and a
 * power lamp. It shows a green trend, a process mimic, an alarm log or a
 * vector display. `width` is the bezel's width.
 */
export function createLcdMonitor(
  kit: PanelKit,
  {
    width = 0.3,
    mode: initial = 'trend' as LcdMode,
    seed = 0,
    title = 'ENCABULATOR SYSTEMS',
  } = {},
): LcdMonitorView {
  const group = new Group();
  const sw = width * 0.8;
  const sh = sw * 0.75;
  const height = sh + width * 0.24;
  const sy = height / 2 - width * 0.07 - sh / 2;
  const bezel = kitPaint(kit, '#2a2c2e', 0.2);
  add(group, new BoxGeometry(width, height, 0.03), bezel, 0, 0, 0.015);
  // The recess round the tube, then the tube itself.
  add(
    group,
    new BoxGeometry(sw + 0.018, sh + 0.018, 0.004),
    kitPaint(kit, '#0c0d0e'),
    0,
    sy,
    0.031,
  );
  const px = 320;
  const art = screen(kit, px, Math.round(px * 0.75));
  add(group, new PlaneGeometry(sw, sh), art.material, 0, sy, 0.0335);
  const glass = createPs1Material({
    color: '#b8c8cc',
    transparent: true,
    opacity: 0.1,
    roughness: 0.05,
    metalness: 0,
  });
  glass.depthWrite = false;
  kit.materials.push(glass);
  add(group, new PlaneGeometry(sw, sh), glass, 0, sy, 0.0345);
  const below = -height / 2 + width * 0.06;
  const badge = createMicroLabel(kit, title, {
    height: width * 0.017,
    ink: '#b9bcbe',
  });
  badge.position.set(-width * 0.18, below, 0.0302);
  group.add(badge);
  // Its maker's name, small, in the bezel's top corner.
  const maker = createBrandBadge(kit, 'kessler-moody', {
    form: 'wordmark',
    height: width * 0.03,
    ink: '#8e9295',
  });
  maker.position.set(
    -sw / 2 + width * 0.06,
    height / 2 - width * 0.035,
    0.0302,
  );
  group.add(maker);
  for (const dx of [0.2, 0.27]) {
    const wheel = add(
      group,
      new CylinderGeometry(width * 0.018, width * 0.018, 0.006, 16),
      kitPaint(kit, '#1a1b1c'),
      width * dx,
      below,
      0.032,
    );
    wheel.rotation.x = Math.PI / 2;
  }
  const lampOn = kitGlow(kit, '#4cff6a');
  const lampOff = kitPaint(kit, '#1d3b22');
  const lamp = add(
    group,
    new BoxGeometry(width * 0.02, width * 0.012, 0.004),
    lampOn,
    width * 0.36,
    below,
    0.031,
  );
  // Lit by changing its paint: not merged with the still parts.
  lamp.userData.live = true;

  let mode = initial;
  let signals: LcdSignals | null = null;
  let picture: LcdPicture | null = null;
  let on = true;
  let bootLines: readonly string[] | null = null;
  let failure: LcdFailure | null = null;
  let failureTime = 0;
  let clock = seed * 37;
  let since = 1;
  const trend: number[][] = [[], [], []];
  const log: string[] = [];
  let logTimer = 0;
  const c = art.context;
  const W = art.canvas.width;
  const H = art.canvas.height;
  const frozen = document.createElement('canvas');
  frozen.width = W;
  frozen.height = H;
  const frozenContext = frozen.getContext('2d')!;

  const finish = () => {
    // Faint LCD pixel rows and a little backlight falloff at the corners.
    c.fillStyle = 'rgba(0,0,0,0.08)';
    for (let y = 0; y < H; y += 3) c.fillRect(0, y, W, 1);
    const v = c.createRadialGradient(
      W / 2,
      H / 2,
      H * 0.35,
      W / 2,
      H / 2,
      W * 0.72,
    );
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.25)');
    c.fillStyle = v;
    c.fillRect(0, 0, W, H);
    art.texture.needsUpdate = true;
  };
  const stamp = (t: number) => {
    const s = Math.floor(t) % 86400;
    const two = (n: number) => String(n).padStart(2, '0');
    return `${two(Math.floor(s / 3600) % 24)}:${two(Math.floor(s / 60) % 60)}:${two(s % 60)}`;
  };

  const drawTrend = () => {
    const ink = '#6dff8a';
    const plotTop = 34;
    const plotBottom = H - 38;
    c.fillStyle = '#031006';
    c.fillRect(0, 0, W, H);
    c.strokeStyle = '#0f3a19';
    c.lineWidth = 1;
    c.beginPath();
    for (let x = 20; x < W; x += 30) {
      c.moveTo(x + 0.5, plotTop);
      c.lineTo(x + 0.5, plotBottom);
    }
    for (let y = plotTop; y <= plotBottom; y += 26) {
      c.moveTo(20, y + 0.5);
      c.lineTo(W - 10, y + 0.5);
    }
    c.stroke();
    c.font = 'bold 15px "Courier New", monospace';
    c.fillStyle = ink;
    c.fillText(`${JARGON[seed % JARGON.length]}`, 10, 18);
    c.fillText(stamp(clock + 43200), W - 92, 18);
    const styles = [ink, '#c8ffd0', '#38c35a'];
    trend.forEach((series, k) => {
      series.push(signals?.trend?.[k] ?? wander(clock, seed + k * 2.3));
      if (series.length > 70) series.shift();
      c.strokeStyle = styles[k];
      c.lineWidth = k === 0 ? 2 : 1.5;
      c.beginPath();
      series.forEach((value, i) => {
        const x = W - 10 - (series.length - 1 - i) * 4.2;
        const y = plotTop + (1 - value) * (plotBottom - plotTop);
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      });
      c.stroke();
    });
    c.fillStyle = ink;
    c.font = '13px "Courier New", monospace';
    c.fillText(
      signals?.caption ??
        `PV ${(wander(clock, seed) * 100).toFixed(1)}%   SP 50.0%`,
      10,
      H - 13,
    );
  };

  const drawMimic = () => {
    c.fillStyle = '#05070f';
    c.fillRect(0, 0, W, H);
    c.fillStyle = '#1d3a8a';
    c.fillRect(0, 0, W, 22);
    c.font = 'bold 14px "Courier New", monospace';
    c.fillStyle = '#ffffff';
    c.fillText('HYDROCOPTIC MARZLEVANE', 8, 16);
    // Two tanks, a pump between them, a valve on the line out.
    const level = [wander(clock, seed), wander(clock, seed + 4)];
    const tank = (x: number, k: number) => {
      c.strokeStyle = '#c8c8c8';
      c.lineWidth = 2;
      c.strokeRect(x, 50, 60, 120);
      c.fillStyle = '#1f7fd8';
      const h = level[k] * 116;
      c.fillRect(x + 2, 168 - h, 56, h);
      c.fillStyle = '#ffe14a';
      c.font = '13px "Courier New", monospace';
      c.fillText(`${(level[k] * 100).toFixed(0)}%`, x + 14, 190);
    };
    tank(20, 0);
    tank(236, 1);
    c.strokeStyle = '#9aa0a8';
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(80, 150);
    c.lineTo(236, 150);
    c.stroke();
    c.strokeStyle = '#7dff9a';
    c.lineWidth = 2;
    c.setLineDash([8, 8]);
    c.lineDashOffset = -clock * 30;
    c.beginPath();
    c.moveTo(80, 150);
    c.lineTo(236, 150);
    c.stroke();
    c.setLineDash([]);
    // The pump, green and turning.
    c.fillStyle = '#18a840';
    c.beginPath();
    c.arc(140, 150, 18, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#ffffff';
    c.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      const a = clock * 6 + (k * Math.PI * 2) / 3;
      c.beginPath();
      c.moveTo(140, 150);
      c.lineTo(140 + Math.cos(a) * 14, 150 + Math.sin(a) * 14);
      c.stroke();
    }
    // A valve: a bow tie, red when shut.
    const open = Math.sin(clock * 0.2 + seed) > -0.6;
    c.fillStyle = open ? '#18a840' : '#d82a1e';
    c.beginPath();
    c.moveTo(190, 138);
    c.lineTo(214, 162);
    c.lineTo(214, 138);
    c.lineTo(190, 162);
    c.closePath();
    c.fill();
    c.fillStyle = '#ffe14a';
    c.font = '13px "Courier New", monospace';
    c.fillText(
      `FT-101 ${(wander(clock, seed + 9) * 340).toFixed(0)} GPM`,
      96,
      120,
    );
    c.fillStyle = '#c8c8c8';
    c.fillText('P-101 RUN', 108, 186);
    c.fillText(open ? 'XV-7 OPEN' : 'XV-7 SHUT', 172, 212);
  };

  const drawLog = () => {
    const ink = '#ffb21e';
    c.fillStyle = '#100800';
    c.fillRect(0, 0, W, H);
    c.fillStyle = ink;
    c.fillRect(0, 0, W, 20);
    c.fillStyle = '#100800';
    c.font = 'bold 14px "Courier New", monospace';
    c.fillText(`ALARM SUMMARY        ${stamp(clock + 43200)}`, 6, 15);
    c.font = '13px "Courier New", monospace';
    c.fillStyle = ink;
    log.forEach((line, i) => c.fillText(line, 6, 40 + i * 19));
    // The cursor blinks on the last line.
    if (Math.floor(clock * 2) % 2)
      c.fillRect(6, 40 + log.length * 19 - 12, 9, 14);
  };

  const drawVector = () => {
    // Fade the old trace as a deliberate persistence effect in the display.
    c.fillStyle = 'rgba(2,10,4,0.35)';
    c.fillRect(0, 0, W, H);
    const cx = W / 2;
    const cy = H / 2;
    const r = H * 0.42;
    c.strokeStyle = '#124a20';
    c.lineWidth = 1;
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.moveTo(cx - r, cy);
    c.lineTo(cx + r, cy);
    c.moveTo(cx, cy - r);
    c.lineTo(cx, cy + r);
    c.stroke();
    c.strokeStyle = '#8dffa0';
    c.lineWidth = 2;
    c.beginPath();
    const a = 3;
    const b = 2;
    const phase = signals?.vectorPhase ?? clock * 0.7 + seed;
    const gain = (signals?.vectorGain ?? 1) * 0.85;
    for (let i = 0; i <= 200; i++) {
      const t = (i / 200) * Math.PI * 2;
      const x = cx + Math.sin(a * t + phase) * r * gain;
      const y = cy + Math.sin(b * t) * r * gain;
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.stroke();
    if (signals?.caption) {
      c.fillStyle = '#020a04';
      c.fillRect(0, H - 24, W, 24);
      c.fillStyle = '#8dffa0';
      c.font = 'bold 14px "Courier New", monospace';
      c.fillText(signals.caption, 8, H - 7);
    }
  };

  const draw = () => {
    if (!on) {
      c.fillStyle = '#0a0c0c';
      c.fillRect(0, 0, W, H);
      art.texture.needsUpdate = true;
      return;
    }
    // A stuck LCD holds the last rendered image; its controller is no longer
    // updating pixels, even while the backlight remains powered.
    if (failure === 'banding') {
      c.drawImage(frozen, 0, 0);
    } else if (failure === 'corrupt') {
      c.fillStyle = '#031006';
      c.fillRect(0, 0, W, H);
    } else if (failure !== 'stuck' || failureTime < 1.3) {
      if (bootLines) drawBootScreen(c, W, H, bootLines);
      else if (picture) picture(c, W, H, clock);
      else if (mode === 'trend') drawTrend();
      else if (mode === 'mimic') drawMimic();
      else if (mode === 'log') drawLog();
      else drawVector();
    }
    if (failure) {
      const t = failureTime;
      if (failure === 'corrupt') {
        // The display buffer is full of changing bytes rather than readings.
        // Advance it in coarse steps so each corrupt frame hangs briefly.
        const frame = Math.floor(t * 9);
        const glyphs = '0123456789ABCDEF#$%?@';
        c.font = '13px "Courier New", monospace';
        for (let row = 0; row < 13; row++) {
          let line = '';
          for (let col = 0; col < 28; col++) {
            const noise =
              Math.sin((row * 67 + col * 37 + frame * 71 + seed * 19) * 1.73) *
              43758.5453;
            line +=
              glyphs[Math.floor((noise - Math.floor(noise)) * glyphs.length)];
          }
          c.fillStyle = row % 5 === frame % 5 ? '#b6ffba' : '#4dc76a';
          c.fillText(line, 7, 19 + row * 17);
        }
        c.fillStyle = 'rgba(2,20,6,0.85)';
        c.fillRect(0, (frame * 37) % H, W, 3);
      } else if (failure === 'banding') {
        // The image is frozen, but a damaged column driver pulses and shifts
        // narrow bands across it as its contacts intermittently reconnect.
        for (let i = 0; i < 9; i++) {
          const x =
            (i * 47 + seed * 13 + Math.round(Math.sin(t * 2.2 + i) * 4)) % W;
          const pulse = 0.45 + 0.35 * Math.sin(t * 5 + i * 1.7) ** 2;
          c.fillStyle =
            i % 3 === 0
              ? `rgba(215,240,215,${pulse})`
              : `rgba(0,3,1,${pulse + 0.15})`;
          c.fillRect(x, 0, 3 + (i % 4) * 4, H);
        }
      } else if (failure === 'stuck') {
        // Bright and dead pixel clusters remain in the frozen image.
        for (let i = 0; i < 90; i++) {
          const x = (i * 83 + seed * 29) % W;
          const y = (i * 47 + seed * 17) % H;
          c.fillStyle = i % 4 === 0 ? '#d7ffd7' : '#020402';
          c.fillRect(x, y, 2 + (i % 3), 2 + (i % 3));
        }
      }
      const fade =
        failure === 'backlight'
          ? Math.min(1, t / 5.8 + (Math.sin(t * 24) > 0.8 ? 0.25 : 0))
          : failure === 'banding'
            ? Math.max(0, (t - 12) / 2)
            : Math.max(0, (t - 5.8) / 1.8);
      if (fade > 0) {
        c.fillStyle = `rgba(0,0,0,${fade})`;
        c.fillRect(0, 0, W, H);
      }
    }
    finish();
  };

  return {
    group,
    setMode(next) {
      if (next === mode) return;
      mode = next;
      if (mode === 'vector') {
        c.fillStyle = '#020a04';
        c.fillRect(0, 0, W, H);
      }
      since = 1;
    },
    setSignals(next) {
      signals = next;
    },
    setPicture(next) {
      if (next === picture) return;
      picture = next;
      since = 1;
    },
    setBoot(lines) {
      if (lines?.join('\n') === bootLines?.join('\n')) return;
      bootLines = lines;
      since = 1;
    },
    setFailure(kind, seconds = 0) {
      if (failure === kind && failureTime === seconds) return;
      if (kind === 'banding' && failure !== 'banding') {
        frozenContext.drawImage(art.canvas, 0, 0);
      }
      if (failure !== kind) since = 1;
      failure = kind;
      failureTime = seconds;
    },
    setOn(next) {
      if (next === on) return;
      on = next;
      lamp.material = on ? lampOn : lampOff;
      since = 1;
    },
    update(delta) {
      clock += delta;
      since += delta;
      logTimer -= delta;
      if (logTimer <= 0) {
        logTimer = 2 + (Math.sin(clock * 1.3 + seed) + 1) * 1.5;
        const word = JARGON[Math.floor(clock * 7 + seed * 3) % JARGON.length];
        const what = ['HI', 'LO', 'DEV', 'ACK', 'RTN', 'HIHI'][
          Math.floor(clock * 3) % 6
        ];
        log.push(`${stamp(clock + 43200)} ${word.slice(0, 18)} ${what}`);
        if (log.length > 9) log.shift();
      }
      // About twelve pictures a second is enough for a panel in a door.
      if (since < 1 / 12) return;
      since = 0;
      draw();
    },
  };
}

export interface ChartRecorderView {
  group: Group;
  /** Pens' positions, 0 to 1 across the chart. */
  set(values: readonly number[]): void;
  update(delta: number): void;
}

/**
 * A strip-chart recorder: a black bezel round a glass door, white chart
 * paper ruled in green creeping down past coloured pens that write as
 * their values change, and a scale strip over the paper.
 */
export function createChartRecorder(
  kit: PanelKit,
  {
    pens = ['#c4211b', '#1c48b8', '#1b8a3c'] as readonly string[],
    title = 'MODIAL FLUX',
  } = {},
): ChartRecorderView {
  const group = new Group();
  const width = 0.18;
  const height = 0.2;
  add(
    group,
    new BoxGeometry(width, height, 0.03),
    kitPaint(kit, '#26272a', 0.15),
    0,
    0,
    0.015,
  );
  const pw = 0.13;
  const ph = 0.13;
  const py = 0.012;
  // The paper is lit by the recorder's own lamp: drawn unlit.
  const art = screen(kit, 160, 160);
  add(group, new PlaneGeometry(pw, ph), art.material, 0, py, 0.0302);
  const glass = createPs1Material({
    color: '#c9d4d6',
    transparent: true,
    opacity: 0.12,
    roughness: 0.05,
  });
  glass.depthWrite = false;
  kit.materials.push(glass);
  add(group, new PlaneGeometry(pw + 0.01, ph + 0.01), glass, 0, py, 0.033);
  // The scale strip and the pens riding over the top of the paper.
  const strip = createMicroLabel(kit, '0    25    50    75   100', {
    height: 0.0045,
    ink: '#202020',
    plate: '#e8e4d6',
  });
  strip.position.set(0, py + ph / 2 - 0.006, 0.0312);
  group.add(strip);
  const penMeshes = pens.map((colour) => {
    const pen = add(
      group,
      new BoxGeometry(0.005, 0.012, 0.006),
      kitPaint(kit, colour),
      0,
      py + ph / 2 - 0.02,
      0.033,
    );
    // The pens move: not to be merged with the still parts (`mergeStatic`).
    pen.userData.live = true;
    return pen;
  });
  const badge = createMicroLabel(kit, title, {
    height: 0.006,
    ink: '#c9cbcd',
  });
  badge.position.set(-0.03, -height / 2 + 0.017, 0.0302);
  group.add(badge);
  const maker = createBrandBadge(kit, 'kessler-moody', {
    form: 'wordmark',
    height: 0.008,
    ink: '#9a9da0',
  });
  maker.position.set(0, height / 2 - 0.011, 0.0302);
  group.add(maker);
  for (const dx of [0.035, 0.055, 0.075])
    add(
      group,
      new BoxGeometry(0.014, 0.009, 0.004),
      kitPaint(kit, '#4a4d50'),
      dx,
      -height / 2 + 0.017,
      0.031,
    );

  const values = pens.map(() => 0.5);
  const history: number[][] = pens.map(() => []);
  const c = art.context;
  const S = art.canvas.width;
  let scroll = 0;
  let since = 1;
  const draw = () => {
    c.fillStyle = '#f4f1e6';
    c.fillRect(0, 0, S, S);
    c.strokeStyle = '#9cc7a4';
    c.lineWidth = 1;
    c.beginPath();
    for (let x = 0; x <= S; x += 16) {
      c.moveTo(x + 0.5, 0);
      c.lineTo(x + 0.5, S);
    }
    for (let y = (scroll * 4) % 16; y < S; y += 16) {
      c.moveTo(0, y + 0.5);
      c.lineTo(S, y + 0.5);
    }
    c.stroke();
    // The pens write at the top; older ink has crept down the paper.
    history.forEach((series, k) => {
      c.strokeStyle = pens[k];
      c.lineWidth = 1.6;
      c.beginPath();
      series.forEach((value, i) => {
        const x = value * S;
        const y = 14 + (series.length - 1 - i) * 4;
        if (i === series.length - 1) c.moveTo(x, y);
        else c.lineTo(x, y);
      });
      c.stroke();
    });
    art.texture.needsUpdate = true;
  };
  return {
    group,
    set(next) {
      next.forEach((value, k) => {
        if (k < values.length) values[k] = Math.max(0, Math.min(1, value));
      });
    },
    update(delta) {
      since += delta;
      penMeshes.forEach((pen, k) => {
        pen.position.x += ((values[k] - 0.5) * pw - pen.position.x) * 0.3;
      });
      if (since < 0.25) return;
      since = 0;
      scroll += 1;
      history.forEach((series, k) => {
        series.push(values[k]);
        if (series.length > 38) series.shift();
      });
      draw();
    },
  };
}

export interface AnnunciatorView {
  group: Group;
  /** Each window's lens, for clicks. */
  windows: Mesh[];
  /** Light each window, in its own colour. */
  set(lit: readonly boolean[]): void;
  /** Light each window in a colour of its own choosing, or leave it dark (null). */
  show(colours: readonly (string | null)[]): void;
}

/**
 * An alarm annunciator: a grid of engraved windows in a black frame, each
 * glowing its colour when its alarm is in and dark milky white when not.
 * The sequence (flash, acknowledge, steady) is `src/toolkit/components/industrial-control/logic/annunciator.ts`.
 */
export function createAnnunciatorPanel(
  kit: PanelKit,
  labels: readonly string[],
  { columns = 4, cell = 0.045, colours = [] as readonly string[] } = {},
): AnnunciatorView {
  const group = new Group();
  const rows = Math.ceil(labels.length / columns);
  const cw = cell;
  const ch = cell * 0.7;
  const width = columns * cw + 0.012;
  const height = rows * ch + 0.012;
  add(
    group,
    new BoxGeometry(width, height, 0.03),
    kitPaint(kit, '#18191a', 0.1),
    0,
    0,
    0.015,
  );
  const windows: Mesh[] = [];
  const looks: {
    off: Material;
    on: Material;
    map: Texture;
    tints: Map<string, Material>;
  }[] = [];
  labels.forEach((label, i) => {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const colour = colours[i] ?? (row === 0 ? '#ff4a30' : '#ffb12a');
    const art = createCanvasTexture(128, 90);
    kit.textures.push(art.texture);
    const c = art.context;
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 128, 90);
    c.fillStyle = '#1a1a1a';
    c.font = 'bold 19px Arial, Helvetica, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const words = label.split('\n');
    words.forEach((word, k) =>
      c.fillText(word, 64, 45 + (k - (words.length - 1) / 2) * 22),
    );
    art.texture.needsUpdate = true;
    const off = createPs1Material({
      map: art.texture,
      color: '#8e8a80',
      roughness: 0.3,
    });
    const on = createPs1Material(
      { map: art.texture, color: colour },
      true,
      true,
    );
    kit.materials.push(off, on);
    looks.push({ off, on, map: art.texture, tints: new Map() });
    const x = -width / 2 + 0.006 + cw * (col + 0.5);
    const y = height / 2 - 0.006 - ch * (row + 0.5);
    const window = add(
      group,
      new PlaneGeometry(cw - 0.005, ch - 0.005),
      off,
      x,
      y,
      0.0305,
    );
    window.name = `Annunciator ${label.replace('-\n', '-').replace('\n', ' ')}`;
    window.userData.alarmColour = colour;
    windows.push(window);
  });
  return {
    group,
    windows,
    set(lit) {
      windows.forEach((window, i) => {
        window.material = lit[i] ? looks[i].on : looks[i].off;
      });
    },
    show(colours) {
      windows.forEach((window, i) => {
        const colour = colours[i];
        const look = looks[i];
        // What it shows, for a reader of the scene (a test, say).
        window.userData.shown = colour ?? null;
        if (!colour) {
          window.material = look.off;
          return;
        }
        let tint = look.tints.get(colour);
        if (!tint) {
          tint = createPs1Material(
            { map: look.map, color: colour },
            true,
            true,
          );
          kit.materials.push(tint);
          look.tints.set(colour, tint);
        }
        window.material = tint;
      });
    },
  };
}

export interface PushbuttonStationView {
  group: Group;
  buttons: PushButtonView[];
  update(delta: number): void;
}

/**
 * A pushbutton station: a raised grey plate on the door with 30 mm
 * buttons stacked one above another, each under its legend plate, as on
 * the units in the Retro Encabulator film.
 */
export function createPushbuttonStation(
  kit: PanelKit,
  specs: readonly { colour: OperatorColour; legend: string }[],
  { plate = '#9da3a6' } = {},
): PushbuttonStationView {
  const group = new Group();
  const pitch = 0.064;
  const height = specs.length * pitch + 0.024;
  const depth = 0.022;
  add(
    group,
    new BoxGeometry(0.078, height, depth),
    kitPaint(kit, plate, 0.15),
    0,
    0,
    depth / 2,
  );
  add(
    group,
    new BoxGeometry(0.084, height + 0.006, 0.004),
    kitPaint(kit, '#2a2b2d'),
    0,
    0,
    0.002,
  );
  const buttons = specs.map((spec, i) => {
    const y = height / 2 - 0.012 - pitch * (i + 0.5) - 0.006;
    const button = createPushButton(kit, spec.colour, {
      head: spec.colour === 'red' ? 'extended' : 'flush',
    });
    button.group.position.set(0, y, depth);
    group.add(button.group);
    const legend = createLegendPlate(kit, spec.legend, {
      width: 0.05,
      height: 0.012,
    });
    legend.position.set(0, y + 0.029, depth);
    group.add(legend);
    return button;
  });
  return {
    group,
    buttons,
    update(delta) {
      for (const button of buttons) button.update(delta);
    },
  };
}

export interface FlangeHandleView {
  group: Group;
  /** The lever, which takes a click. */
  lever: Object3D;
  set(on: boolean): void;
  update(delta: number): void;
}

/**
 * A flange-mounted disconnect handle: a tall escutcheon on the door with
 * ON at the top and OFF at the bottom, and a lever on a boss that swings
 * up for ON and down for OFF, with a padlock hasp at OFF. Black, as on
 * the film's units, or red.
 */
export function createFlangeHandle(
  kit: PanelKit,
  { colour = 'black' as 'black' | 'red', on: initial = true } = {},
): FlangeHandleView {
  const group = new Group();
  const plate = kitPaint(kit, '#1d1e20', 0.2);
  add(group, new BoxGeometry(0.07, 0.24, 0.012), plate, 0, 0, 0.006);
  const legend = (text: string, y: number) => {
    const label = createMicroLabel(kit, text, {
      height: 0.008,
      ink: '#eceae2',
    });
    label.position.set(-0.022, y, 0.0125);
    group.add(label);
  };
  legend('ON', 0.095);
  legend('OFF', -0.095);
  // The hasp the lockout padlock goes through, at OFF.
  add(
    group,
    new BoxGeometry(0.014, 0.022, 0.012),
    kitPaint(kit, '#8a8c8e', 0.6),
    0.022,
    -0.1,
    0.018,
  );
  const boss = add(
    group,
    new CylinderGeometry(0.02, 0.022, 0.018, 20),
    plate,
    0,
    0,
    0.021,
  );
  boss.rotation.x = Math.PI / 2;
  const pivot = new Group();
  pivot.position.set(0, 0, 0.03);
  group.add(pivot);
  // It turns: not to be merged with the still parts (`mergeStatic`).
  pivot.userData.live = true;
  // Flat painted-metal arm and a squared insulating sleeve, after the
  // 1494F-M1 operator. The 141.3 mm pivot-to-tip reach follows its drawing.
  const steel = kitPaint(kit, '#686b6d', 0.5);
  const grip = kitPaint(kit, colour === 'red' ? '#b8231b' : '#16171a', 0.2);
  const profile = (points: [number, number][]) => {
    const shape = new Shape();
    shape.moveTo(...points[0]);
    for (const point of points.slice(1)) shape.lineTo(...point);
    shape.closePath();
    return shape;
  };
  const arm = profile([
    [-0.009, 0.008],
    [-0.009, 0.078],
    [-0.014, 0.087],
    [-0.014, 0.136],
    [-0.009, 0.1413],
    [0.009, 0.1413],
    [0.014, 0.136],
    [0.014, 0.087],
    [0.009, 0.078],
    [0.009, 0.008],
  ]);
  const lever = add(
    pivot,
    new ExtrudeGeometry(arm, {
      depth: 0.007,
      bevelEnabled: true,
      bevelThickness: 0.0006,
      bevelSize: 0.0006,
      bevelSegments: 1,
      steps: 1,
    }),
    steel,
  );
  lever.name = 'Flat disconnect operating arm';
  // The sleeve has straight sides and clipped corners, never a bulbous end.
  const sleeve = profile([
    [-0.014, 0.084],
    [-0.017, 0.088],
    [-0.017, 0.135],
    [-0.012, 0.14],
    [0.012, 0.14],
    [0.017, 0.135],
    [0.017, 0.088],
    [0.014, 0.084],
  ]);
  add(
    lever,
    new ExtrudeGeometry(sleeve, {
      depth: 0.024,
      bevelEnabled: true,
      bevelThickness: 0.001,
      bevelSize: 0.001,
      bevelSegments: 1,
      steps: 1,
    }),
    grip,
  );
  const grooves = kitPaint(kit, colour === 'red' ? '#81251d' : '#0d0e10');
  for (const y of [0.102, 0.11, 0.118, 0.126])
    add(lever, new BoxGeometry(0.028, 0.0012, 0.001), grooves, 0, y, 0.025);
  // Flat end cap and visible rivets make the arm's construction readable.
  add(lever, new BoxGeometry(0.024, 0.003, 0.025), steel, 0, 0.138, 0.012);
  for (const y of [0.018, 0.131]) {
    const rivet = add(
      lever,
      new CylinderGeometry(0.0024, 0.0024, 0.0015, 10),
      kitPaint(kit, '#afb2b2', 0.6),
      0,
      y,
      y > 0.1 ? 0.026 : 0.009,
    );
    rivet.rotation.x = Math.PI / 2;
  }
  // Positive X rotation sends +Y toward +Z (out of the cabinet). Both
  // throws, and the entire sweep between them, must stay in front.
  const stop = (13.5 * Math.PI) / 180;
  const angle = (on: boolean) => (on ? stop : Math.PI - stop);
  let target = angle(initial);
  pivot.rotation.x = target;
  return {
    group,
    lever,
    set(on) {
      target = angle(on);
    },
    update(delta) {
      pivot.rotation.x += (target - pivot.rotation.x) * Math.min(1, delta * 9);
    },
  };
}

/** Lever operator based on the Allen-Bradley 1494F-M2 800 A frame handle. */
export function createHeavyDutyThrowHandle(
  kit: PanelKit,
  { on: initial = true } = {},
): FlangeHandleView {
  const group = new Group();
  const housing = kitPaint(kit, '#777a7c', 0.48);
  const edge = kitPaint(kit, '#55585a', 0.48);
  const dark = kitPaint(kit, '#151719', 0.32);
  const red = kitPaint(kit, '#b72a24', 0.32);
  const steel = kitPaint(kit, '#aeb0af', 0.55);
  // The manufacturer's large handle has a roughly 7½-inch base. The
  // escutcheon is tall and narrow, with a shallow circular pivot cover.
  add(group, new BoxGeometry(0.065, 0.19, 0.014), housing, 0, 0, 0.007);
  add(group, new BoxGeometry(0.053, 0.172, 0.003), edge, 0, 0, 0.0155);
  add(
    group,
    new CylinderGeometry(0.032, 0.032, 0.005, 32),
    housing,
    0,
    -0.032,
    0.019,
  ).rotation.x = Math.PI / 2;
  for (const [word, y] of [
    ['ON', 0.071],
    ['OFF', -0.077],
  ] as const) {
    const mark = createMicroLabel(kit, word, { height: 0.007, ink: '#f3f1e8' });
    mark.position.set(-0.02, y, 0.018);
    group.add(mark);
  }
  const pivot = new Group();
  pivot.position.set(0, -0.032, 0.032);
  group.add(pivot);
  // It turns: not to be merged with the still parts (`mergeStatic`).
  pivot.userData.live = true;
  add(
    pivot,
    new CylinderGeometry(0.019, 0.019, 0.012, 24),
    steel,
    0,
    0,
    0.006,
  ).rotation.x = Math.PI / 2;
  const lever = add(
    pivot,
    new BoxGeometry(0.029, 0.106, 0.024),
    dark,
    0,
    0.064,
    0.02,
  );
  add(pivot, new BoxGeometry(0.033, 0.012, 0.026), red, 0, 0.122, 0.021);
  // The lever throws between upper ON and lower OFF. Its pivot and grip
  // remain ahead of the plate throughout the arc.
  const angle = (on: boolean) => (on ? 0 : Math.PI);
  let target = angle(initial);
  pivot.rotation.z = target;
  return {
    group,
    lever,
    set(on) {
      target = angle(on);
    },
    update(delta) {
      pivot.rotation.z += (target - pivot.rotation.z) * Math.min(1, delta * 9);
    },
  };
}

/**
 * The rotary handle of an enclosed main switch, after Eaton's P3-100/I5
 * (SVB): a red pistol grip on a round yellow locking ring, turned a
 * quarter turn clockwise from 0 (OFF, the grip pointing left) to I (ON,
 * pointing up), with a padlock tab on the ring at OFF. It faces +z, its
 * centre on the axis.
 */
export function createRotaryIsolatorHandle(
  kit: PanelKit,
  { on: initial = false } = {},
): FlangeHandleView {
  const group = new Group();
  const yellow = kitPaint(kit, '#efbd0f', 0);
  const red = kitPaint(kit, '#c1221b', 0);
  const ink = '#141414';
  const ring = add(
    group,
    new CylinderGeometry(0.043, 0.045, 0.008, 40),
    yellow,
    0,
    0,
    0.004,
  );
  ring.rotation.x = Math.PI / 2;
  // The padlock tab, at OFF.
  add(
    group,
    new BoxGeometry(0.018, 0.022, 0.004),
    yellow,
    -0.052,
    -0.012,
    0.004,
  );
  for (const [word, x, y] of [
    ['0', -0.034, 0.021],
    ['I', 0.0, 0.036],
  ] as const) {
    const mark = createMicroLabel(kit, word, { height: 0.007, ink });
    mark.position.set(x, y, 0.0085);
    group.add(mark);
  }
  const pivot = new Group();
  pivot.position.z = 0.008;
  group.add(pivot);
  // It turns: not to be merged with the still parts (`mergeStatic`).
  pivot.userData.live = true;
  add(
    pivot,
    new CylinderGeometry(0.02, 0.022, 0.016, 28),
    red,
    0,
    0,
    0.008,
  ).rotation.x = Math.PI / 2;
  // The grip, broad at the hub and narrowing to its tip.
  const lever = add(
    pivot,
    new BoxGeometry(0.03, 0.05, 0.022),
    red,
    0,
    0.03,
    0.012,
  );
  add(pivot, new BoxGeometry(0.022, 0.036, 0.02), red, 0, 0.068, 0.012);
  // ON points the grip up; OFF a quarter turn anticlockwise, to the left.
  const angle = (on: boolean) => (on ? 0 : Math.PI / 2);
  let target = angle(initial);
  pivot.rotation.z = target;
  return {
    group,
    lever,
    set(on) {
      target = angle(on);
    },
    update(delta) {
      pivot.rotation.z += (target - pivot.rotation.z) * Math.min(1, delta * 14);
    },
  };
}

export interface SoftStarterView {
  group: Group;
  /** Show its lamps, bar and current (`../logic/soft-starter.ts`). */
  set(lamps: SoftStarterLamps): void;
}

/**
 * A soft starter's front: a dark module with its badge, RUN, UP TO SPEED
 * and FAULT lamps, a row of LEDs that fills as the motor's voltage ramps
 * up, and a red LED readout of the motor's current.
 */
export function createSoftStarter(
  kit: PanelKit,
  { badge = 'SMC PLUS' } = {},
): SoftStarterView {
  const group = new Group();
  add(
    group,
    new BoxGeometry(0.21, 0.085, 0.026),
    kitPaint(kit, '#2c2f33', 0.2),
    0,
    0,
    0.013,
  );
  const name = createMicroLabel(kit, badge, {
    height: 0.0065,
    ink: '#d9dbd6',
  });
  name.position.set(-0.07, 0.025, 0.0262);
  group.add(name);
  const maker = createBrandBadge(kit, 'torvald', {
    height: 0.009,
    ink: '#d9dbd6',
  });
  maker.position.set(-0.07, 0.036, 0.0262);
  group.add(maker);
  const lamp = (colour: string, x: number, y: number, text: string) => {
    const on = kitGlow(kit, colour);
    const off = kitPaint(kit, '#3a3c3e');
    const mesh = add(
      group,
      new CylinderGeometry(0.004, 0.004, 0.004, 12),
      off,
      x,
      y,
      0.027,
    );
    mesh.rotation.x = Math.PI / 2;
    const label = createMicroLabel(kit, text, {
      height: 0.0032,
      ink: '#b8bab5',
      align: 'left',
    });
    label.position.set(x + 0.022, y, 0.0262);
    group.add(label);
    // Lit by changing its paint: not merged with the still parts.
    mesh.userData.live = true;
    return (lit: boolean) => (mesh.material = lit ? on : off);
  };
  const run = lamp('#4cff6a', 0.03, 0.03, 'RUN');
  const full = lamp('#4cff6a', 0.03, 0.012, 'UP TO SPEED');
  const fault = lamp('#ff3a24', 0.03, -0.006, 'FAULT');
  const segOn = kitGlow(kit, '#ffb22a');
  const segOff = kitPaint(kit, '#3a3226');
  const bar = Array.from({ length: 10 }, (_, i) =>
    add(
      group,
      new BoxGeometry(0.006, 0.01, 0.003),
      segOff,
      -0.093 + i * 0.0085,
      0.006,
      0.0275,
    ),
  );
  // Lit by changing their paint: not merged with the still parts.
  for (const seg of bar) seg.userData.live = true;
  const rampLabel = createMicroLabel(kit, 'RAMP', {
    height: 0.003,
    ink: '#b8bab5',
  });
  rampLabel.position.set(-0.055, -0.006, 0.0262);
  group.add(rampLabel);
  const amps = createSevenSegment(kit, 4, { digitHeight: 0.012 });
  amps.group.position.set(-0.05, -0.026, 0.026);
  group.add(amps.group);
  const unit = createMicroLabel(kit, 'A', { height: 0.005, ink: '#b8bab5' });
  unit.position.set(-0.012, -0.026, 0.0262);
  group.add(unit);
  return {
    group,
    set(lamps) {
      // What it shows, for a reader of the scene (a test, say).
      group.userData.shown = lamps;
      run(lamps.run);
      full(lamps.upToSpeed);
      fault(lamps.fault);
      bar.forEach((seg, i) => {
        seg.material = i < lamps.blocks ? segOn : segOff;
      });
      amps.show(lamps.speed > 0 ? lamps.amps.toFixed(1) : '');
    },
  };
}

export interface PowerMonitorView {
  group: Group;
  show(volts: number, amps: number, kilowatts: number, powered?: boolean): void;
}

/**
 * A digital power monitor of the 1990s: a square black bezel, three rows
 * of red LED digits (volts, amps, kilowatts) with their units, a phase
 * lamp row and four small keys under them.
 */
export function createPowerMonitor(kit: PanelKit): PowerMonitorView {
  const group = new Group();
  add(
    group,
    new BoxGeometry(0.096, 0.096, 0.02),
    kitPaint(kit, '#1b1c1e', 0.1),
    0,
    0,
    0.01,
  );
  const rows = [0.021, 0, -0.021].map((y, i) => {
    const digits = createSevenSegment(kit, 4, { digitHeight: 0.011 });
    digits.group.position.set(-0.01, y, 0.0202);
    group.add(digits.group);
    const unit = createMicroLabel(kit, ['V', 'A', 'kW'][i], {
      height: 0.005,
      ink: '#d7d8d2',
    });
    unit.position.set(0.033, y, 0.0202);
    group.add(unit);
    return digits;
  });
  for (let k = 0; k < 4; k++)
    add(
      group,
      new BoxGeometry(0.012, 0.007, 0.004),
      kitPaint(kit, '#5b5e61'),
      -0.03 + k * 0.02,
      -0.042,
      0.021,
    );
  const brand = createBrandBadge(kit, 'kessler-moody', {
    form: 'wordmark',
    height: 0.006,
    ink: '#8d9091',
  });
  brand.position.set(0, 0.0415, 0.0202);
  group.add(brand);
  return {
    group,
    show(volts, amps, kilowatts, powered = true) {
      // Four digits, the decimal point taking one: a tenth only below 100.
      const fit = (n: number) => (n >= 99.95 ? n.toFixed(0) : n.toFixed(1));
      rows[0].show(powered ? volts.toFixed(0) : '');
      rows[1].show(powered ? fit(amps) : '');
      rows[2].show(powered ? fit(kilowatts) : '');
    },
  };
}

/**
 * Pressed louvres in a door: rows of slats lipped out of the sheet over
 * a dark opening, in the door's own paint.
 */
export function createLouvres(
  kit: PanelKit,
  width: number,
  height: number,
  paint: Material,
): Group {
  const group = new Group();
  add(
    group,
    new PlaneGeometry(width, height),
    kitPaint(kit, '#0e0f10'),
    0,
    0,
    0.0005,
  );
  const pitch = 0.018;
  const count = Math.max(1, Math.floor(height / pitch));
  for (let i = 0; i < count; i++) {
    const slat = add(
      group,
      new BoxGeometry(width, 0.014, 0.0015),
      paint,
      0,
      height / 2 - pitch * (i + 0.5),
      0.004,
    );
    slat.rotation.x = -0.6;
  }
  return group;
}

/**
 * A viewing window: a black rubber gasket round a pane of slightly
 * smoked glass. Set it over an opening in the door so what is behind
 * shows through.
 */
export function createViewingWindow(
  kit: PanelKit,
  width: number,
  height: number,
): Group {
  const group = new Group();
  const rubber = kitPaint(kit, '#141516');
  const t = 0.012;
  add(
    group,
    new BoxGeometry(width + 2 * t, t, 0.01),
    rubber,
    0,
    height / 2 + t / 2,
    0.005,
  );
  add(
    group,
    new BoxGeometry(width + 2 * t, t, 0.01),
    rubber,
    0,
    -height / 2 - t / 2,
    0.005,
  );
  add(
    group,
    new BoxGeometry(t, height, 0.01),
    rubber,
    -width / 2 - t / 2,
    0,
    0.005,
  );
  add(
    group,
    new BoxGeometry(t, height, 0.01),
    rubber,
    width / 2 + t / 2,
    0,
    0.005,
  );
  const glass = createPs1Material({
    color: '#7f9399',
    transparent: true,
    opacity: 0.22,
    roughness: 0.04,
  });
  glass.depthWrite = false;
  kit.materials.push(glass);
  add(group, new PlaneGeometry(width, height), glass, 0, 0, 0.004);
  return group;
}

/**
 * A door leaf of folded sheet steel, `width` by `height`, its back at
 * z = 0, optionally with an opening for a viewing window (centred at
 * `opening.x`, `opening.y` from the leaf's centre). Returns the leaf's
 * pieces, which all take the door's paint.
 */
export function createDoorLeaf(
  width: number,
  height: number,
  depth: number,
  paint: Material,
  opening: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null = null,
): Group {
  const group = new Group();
  if (!opening) {
    add(group, new BoxGeometry(width, height, depth), paint, 0, 0, depth / 2);
    return group;
  }
  const left = opening.x - opening.width / 2 + width / 2;
  const right = width / 2 - (opening.x + opening.width / 2);
  const top = height / 2 - (opening.y + opening.height / 2);
  const bottom = opening.y - opening.height / 2 + height / 2;
  add(
    group,
    new BoxGeometry(width, top, depth),
    paint,
    0,
    height / 2 - top / 2,
    depth / 2,
  );
  add(
    group,
    new BoxGeometry(width, bottom, depth),
    paint,
    0,
    -height / 2 + bottom / 2,
    depth / 2,
  );
  add(
    group,
    new BoxGeometry(left, opening.height, depth),
    paint,
    -width / 2 + left / 2,
    opening.y,
    depth / 2,
  );
  add(
    group,
    new BoxGeometry(right, opening.height, depth),
    paint,
    width / 2 - right / 2,
    opening.y,
    depth / 2,
  );
  return group;
}

/** Protective rear skin of an instrument door, with ventilation louvres. */
export function createDoorRearCover(
  kit: PanelKit,
  layout: {
    width: number;
    height: number;
    panWidth: number;
    panHeight: number;
    panX: number;
    flangeDepth: number;
    panDepth: number;
    opening: { x: number; y: number; width: number; height: number } | null;
  },
  paint: Material,
) {
  const group = new Group();
  const {
    width,
    height,
    panWidth,
    panHeight,
    panX,
    flangeDepth,
    panDepth,
    opening,
  } = layout;
  const rim = createDoorLeaf(width, height, 0.0006, paint, {
    x: panX,
    y: 0,
    width: panWidth,
    height: panHeight,
  });
  rim.position.z = -flangeDepth / 2 - 0.0007;
  group.add(rim);
  const pan = createDoorLeaf(
    panWidth,
    panHeight,
    0.0006,
    paint,
    opening && { ...opening, x: opening.x - panX },
  );
  pan.position.set(panX, 0, -flangeDepth / 2 - panDepth - 0.0007);
  group.add(pan);
  // Keep the PLC viewing aperture clear; its upper cover still has vents.
  const ventHeight = Math.min(0.072, panHeight * 0.22);
  const ventWidth = Math.min(0.24, panWidth - 0.04);
  for (const y of opening
    ? [panHeight / 2 - ventHeight / 2 - 0.02]
    : [
        -panHeight / 2 + ventHeight / 2 + 0.018,
        panHeight / 2 - ventHeight / 2 - 0.018,
      ]) {
    const vent = createLouvres(kit, ventWidth, ventHeight, paint);
    vent.name = 'Door rear ventilation';
    vent.rotation.y = Math.PI;
    vent.position.set(panX, y, -flangeDepth / 2 - panDepth - 0.001);
    group.add(vent);
  }
  return group;
}
