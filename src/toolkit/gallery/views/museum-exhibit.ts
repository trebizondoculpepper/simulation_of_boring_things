import { Group } from 'three';
import { signal } from '@preact/signals-core';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createMicroLabel } from '../../components/core/views/eighties-controls';
import { SANS, tools } from '../../components/core/views/fitting-tools';
import { markComponent } from '../../components/core/views/component-identity';
import {
  createPartSet,
  pilotLight,
  pushButton,
} from '../../components/core/parts/parts';
import type { Placard, PlacardIcon } from '../logic/ideal-pool-plant-placards';

/**
 * The museum's framing round a working plant (dev51, mission 106): an
 * interpretation panel on an angled lectern at hip height by each station,
 * the entrance panel and the activity card on the walls, and the big RESET
 * SIMULATION button on its pedestal with its sign. The panels are set
 * decoration, printed once; the button is a real part, worked through the
 * control scheme, lit while it resets.
 */

const INK = '#16232b';
const ACCENT = '#e5631c';
const TEAL = '#0f6f7c';

/** Wrap `text` to `width` px in the context's font; returns the lines. */
function wrap(c: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (c.measureText(next).width > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** A paragraph from `y`, returning where it ends. */
function paragraph(
  c: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  size: number,
  font = '',
) {
  c.font = `${font} ${size}px ${SANS}`.trim();
  for (const l of wrap(c, text, width)) {
    c.fillText(l, x, y);
    y += size * 1.25;
  }
  return y;
}

/** A small pictogram of what a station is. */
function drawIcon(
  c: CanvasRenderingContext2D,
  icon: PlacardIcon,
  x: number,
  y: number,
  s: number,
) {
  c.save();
  c.translate(x, y);
  c.lineWidth = s * 0.07;
  c.strokeStyle = TEAL;
  c.fillStyle = TEAL;
  const water = () => {
    c.beginPath();
    for (let k = 0; k <= 8; k++) {
      const px = -s * 0.4 + (k / 8) * s * 0.8;
      const py = Math.sin(k * 1.4) * s * 0.03;
      if (k) c.lineTo(px, py);
      else c.moveTo(px, py);
    }
    c.stroke();
  };
  switch (icon) {
    case 'pool':
      c.strokeRect(-s * 0.45, -s * 0.15, s * 0.9, s * 0.45);
      c.translate(0, s * 0.02);
      water();
      break;
    case 'tank':
      c.strokeRect(-s * 0.3, -s * 0.35, s * 0.6, s * 0.7);
      c.translate(0, 0);
      water();
      break;
    case 'pump':
      c.beginPath();
      c.arc(0, 0, s * 0.32, 0, Math.PI * 2);
      c.stroke();
      c.beginPath();
      c.moveTo(-s * 0.15, -s * 0.18);
      c.lineTo(s * 0.22, 0);
      c.lineTo(-s * 0.15, s * 0.18);
      c.closePath();
      c.fill();
      break;
    case 'filter':
      c.beginPath();
      c.ellipse(0, 0, s * 0.25, s * 0.42, 0, 0, Math.PI * 2);
      c.stroke();
      for (let k = 0; k < 14; k++)
        c.fillRect(
          (((k * 37) % 30) / 100) * s - s * 0.15,
          s * 0.02 + (((k * 53) % 25) / 100) * s,
          s * 0.04,
          s * 0.04,
        );
      break;
    case 'hx':
      for (let k = 0; k < 5; k++)
        c.fillRect(-s * 0.3 + k * s * 0.14, -s * 0.35, s * 0.05, s * 0.7);
      c.strokeStyle = ACCENT;
      c.beginPath();
      c.moveTo(-s * 0.45, -s * 0.25);
      c.lineTo(s * 0.45, -s * 0.25);
      c.stroke();
      c.strokeStyle = TEAL;
      c.beginPath();
      c.moveTo(s * 0.45, s * 0.25);
      c.lineTo(-s * 0.45, s * 0.25);
      c.stroke();
      break;
    case 'heat':
      c.fillStyle = ACCENT;
      c.beginPath();
      c.moveTo(0, -s * 0.4);
      c.quadraticCurveTo(s * 0.35, 0, 0, s * 0.4);
      c.quadraticCurveTo(-s * 0.35, 0, 0, -s * 0.4);
      c.fill();
      break;
    case 'meter':
      c.beginPath();
      c.arc(0, s * 0.1, s * 0.35, Math.PI, 0);
      c.stroke();
      c.beginPath();
      c.moveTo(0, s * 0.1);
      c.lineTo(s * 0.22, -s * 0.15);
      c.stroke();
      break;
    case 'map':
      c.strokeRect(-s * 0.42, -s * 0.3, s * 0.84, s * 0.6);
      c.beginPath();
      c.moveTo(-s * 0.3, s * 0.15);
      c.lineTo(-s * 0.05, s * 0.15);
      c.lineTo(-s * 0.05, -s * 0.12);
      c.lineTo(s * 0.3, -s * 0.12);
      c.stroke();
      break;
  }
  c.restore();
}

/** Paint a placard's face: number, headline, title, words, fact and Try it. */
function paintPlacard(
  c: CanvasRenderingContext2D,
  p: Placard,
  w: number,
  h: number,
) {
  c.fillStyle = '#f6f4ec';
  c.fillRect(0, 0, w, h);
  c.fillStyle = TEAL;
  c.fillRect(0, 0, w, h * 0.018);
  const m = w * 0.045;
  // The station's number, or the signpost's icon alone.
  const disc = h * 0.11;
  if (p.station) {
    c.fillStyle = ACCENT;
    c.beginPath();
    c.arc(m + disc, m + disc, disc, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ffffff';
    c.font = `bold ${disc * 1.3}px ${SANS}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(String(p.station), m + disc, m + disc * 1.08);
  }
  drawIcon(c, p.icon, w - m - disc, m + disc, disc * 2);
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  const left = p.station ? m * 2 + disc * 2 : m;
  c.fillStyle = INK;
  c.font = `bold ${h * 0.075}px ${SANS}`;
  c.fillText(p.headline, left, m + disc * 0.9, w - left - m * 2 - disc * 2);
  c.fillStyle = '#5a666d';
  c.font = `${h * 0.036}px ${SANS}`;
  c.fillText(p.title, left, m + disc * 1.6, w - left - m * 2 - disc * 2);
  let y = m + disc * 2 + h * 0.06;
  c.fillStyle = INK;
  if (p.joins) {
    c.fillStyle = TEAL;
    y = paragraph(c, `${p.joins}.`, m, y, w - 2 * m, h * 0.036, 'bold');
    y += h * 0.01;
    c.fillStyle = INK;
  }
  y = paragraph(c, p.body, m, y, w - 2 * m, h * 0.042);
  y += h * 0.015;
  c.fillStyle = TEAL;
  y = paragraph(
    c,
    `Did you know? ${p.fact}`,
    m,
    y,
    w - 2 * m,
    h * 0.039,
    'italic',
  );
  // The Try it box, set apart in its colour.
  const boxTop = Math.max(y + h * 0.02, h * 0.74);
  c.fillStyle = ACCENT;
  c.fillRect(m * 0.6, boxTop, w - m * 1.2, h - boxTop - m * 0.6);
  c.fillStyle = '#ffffff';
  c.font = `bold ${h * 0.045}px ${SANS}`;
  c.fillText('TRY IT', m, boxTop + h * 0.06);
  paragraph(
    c,
    p.tryIt,
    m + w * 0.13,
    boxTop + h * 0.06,
    w - m * 2 - w * 0.13,
    h * 0.04,
    'bold',
  );
}

/**
 * A museum lectern: its panel tilted toward the reader at hip height on a
 * post and foot, `yaw` turning it; in its own frame the reader stands on
 * +z. Set decoration, marked as such.
 */
export function createLectern(kit: PanelKit, p: Placard) {
  const t = tools(kit);
  const group = new Group();
  group.name = `Placard: ${p.headline}`;
  const W = 0.9;
  const H = 0.62;
  const frame = t.paint('#2b3438', 0.5, 0.3);
  t.box(group, frame, 0.36, 0.03, 0.3, 0, 0.015, -0.05);
  t.box(group, frame, 0.07, 0.86, 0.07, 0, 0.45, -0.05);
  const head = new Group();
  head.position.set(0, 0.98, 0);
  head.rotation.x = -0.62;
  group.add(head);
  t.box(head, frame, W + 0.04, H + 0.04, 0.03, 0, 0, -0.016);
  const face = t.printed(W, H, (c, w, h) => paintPlacard(c, p, w, h), 1024);
  face.mesh.position.z = 0.0005;
  head.add(face.mesh);
  markComponent(group, { name: `Placard: ${p.headline}`, decorative: true });
  return group;
}

/** A printed wall panel, `w` × `h`, drawn by `draw`; its back in the wall at its origin, facing +z. */
export function createWallPanel(
  kit: PanelKit,
  name: string,
  w: number,
  h: number,
  draw: (c: CanvasRenderingContext2D, cw: number, ch: number) => void,
) {
  const t = tools(kit);
  const group = new Group();
  group.name = name;
  t.box(
    group,
    t.paint('#2b3438', 0.5, 0.3),
    w + 0.05,
    h + 0.05,
    0.025,
    0,
    0,
    0.0125,
  );
  const face = t.printed(w, h, draw, 1400);
  face.mesh.position.z = 0.026;
  group.add(face.mesh);
  markComponent(group, { name, decorative: true });
  return group;
}

/** The entrance panel's face. */
export function paintEntrance(
  panel: {
    title: string;
    subtitle: string;
    introduction: string;
    route: readonly { station: number; name: string; what: string }[];
    reset: string;
  },
  heading: string,
) {
  return (c: CanvasRenderingContext2D, w: number, h: number) => {
    c.fillStyle = '#f6f4ec';
    c.fillRect(0, 0, w, h);
    c.fillStyle = TEAL;
    c.fillRect(0, 0, w, h * 0.2);
    const m = w * 0.04;
    c.fillStyle = '#ffffff';
    c.font = `bold ${h * 0.034}px ${SANS}`;
    c.fillText(heading, m, h * 0.05);
    c.font = `bold ${h * 0.068}px ${SANS}`;
    c.fillText(panel.title, m, h * 0.125, w - 2 * m);
    c.font = `${h * 0.036}px ${SANS}`;
    c.fillText(panel.subtitle, m, h * 0.175);
    c.fillStyle = INK;
    let y = paragraph(c, panel.introduction, m, h * 0.26, w - 2 * m, h * 0.03);
    y += h * 0.02;
    c.fillStyle = TEAL;
    c.font = `bold ${h * 0.036}px ${SANS}`;
    c.fillText('FOLLOW THE WATER', m, y);
    y += h * 0.045;
    const r = h * 0.021;
    for (const s of panel.route) {
      c.fillStyle = ACCENT;
      c.beginPath();
      c.arc(m + r, y - r * 0.35, r, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#ffffff';
      c.textAlign = 'center';
      c.font = `bold ${r * 1.3}px ${SANS}`;
      c.fillText(String(s.station), m + r, y + r * 0.1);
      c.textAlign = 'left';
      c.fillStyle = INK;
      c.font = `bold ${h * 0.03}px ${SANS}`;
      c.fillText(`${s.name}`, m + r * 3, y);
      c.font = `${h * 0.028}px ${SANS}`;
      c.fillStyle = '#4c5a62';
      c.fillText(s.what, m + r * 3 + w * 0.38, y);
      y += r * 2.6;
    }
    c.fillStyle = '#b22a22';
    c.fillRect(m * 0.6, h * 0.915, w - m * 1.2, h * 0.065);
    c.fillStyle = '#ffffff';
    c.font = `bold ${h * 0.034}px ${SANS}`;
    c.fillText(panel.reset, m, h * 0.958, w - 2 * m);
  };
}

/** The activity card's face: a laminated card of numbered steps. */
export function paintActivity(card: {
  title: string;
  steps: readonly string[];
  reset: string;
}) {
  return (c: CanvasRenderingContext2D, w: number, h: number) => {
    c.fillStyle = '#fffdf3';
    c.fillRect(0, 0, w, h);
    c.fillStyle = ACCENT;
    c.fillRect(0, 0, w, h * 0.11);
    const m = w * 0.06;
    c.fillStyle = '#ffffff';
    c.font = `bold ${h * 0.065}px ${SANS}`;
    c.fillText(card.title, m, h * 0.078);
    c.font = `bold ${h * 0.024}px ${SANS}`;
    c.fillText('ACTIVITY CARD', w * 0.62, h * 0.07);
    let y = h * 0.17;
    card.steps.forEach((s, k) => {
      c.fillStyle = TEAL;
      c.font = `bold ${h * 0.034}px ${SANS}`;
      c.fillText(`${k + 1}`, m, y);
      c.fillStyle = INK;
      y = paragraph(c, s, m + w * 0.07, y, w - 2 * m - w * 0.07, h * 0.029);
      y += h * 0.02;
    });
    c.fillStyle = '#b22a22';
    const top = Math.max(y, h * 0.86);
    c.fillRect(m * 0.5, top - h * 0.035, w - m, h - top);
    c.fillStyle = '#ffffff';
    paragraph(c, card.reset, m, top + h * 0.005, w - 2 * m, h * 0.028, 'bold');
  };
}

/** The RESET sign's face. */
export function paintResetSign(sign: { headline: string; body: string }) {
  return (c: CanvasRenderingContext2D, w: number, h: number) => {
    c.fillStyle = '#fff6d6';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#b22a22';
    c.fillRect(0, 0, w, h * 0.06);
    const m = w * 0.06;
    c.fillStyle = INK;
    let y = paragraph(
      c,
      sign.headline,
      m,
      h * 0.24,
      w - 2 * m,
      h * 0.11,
      'bold',
    );
    y += h * 0.03;
    paragraph(c, sign.body, m, y, w - 2 * m, h * 0.075);
  };
}

/**
 * The big RESET SIMULATION button: a red illuminated push button, four
 * times a panel's, on a yellow pedestal at hand height, a PUSH tag beside
 * it; pressed, it calls `reset`, and its lamp stays lit while `lit` says.
 * In its own frame: on the floor, its button's face toward +z and up.
 */
export function createResetPedestal(
  kit: PanelKit,
  { reset, lit }: { reset: () => void; lit: () => boolean },
) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'RESET SIMULATION button';
  const yellow = t.paint('#f2c418', 0.5);
  const dark = t.paint('#22272a', 0.5);
  t.box(group, dark, 0.42, 0.04, 0.42, 0, 0.02, 0);
  t.box(group, yellow, 0.28, 0.7, 0.28, 0, 0.39, -0.03);
  const top = new Group();
  top.position.set(0, 0.92, 0.04);
  top.rotation.x = -0.5;
  group.add(top);
  t.box(top, yellow, 0.34, 0.26, 0.06, 0, 0, -0.03);
  const lamp = signal(false);
  const parts = createPartSet();
  const button = parts.add(
    pushButton(kit, {
      colour: 'red',
      head: 'illuminated',
      lamp,
      name: 'RESET SIMULATION',
      action: reset,
    }),
  );
  button.object.scale.setScalar(3.2);
  button.object.position.set(0, -0.01, 0.002);
  top.add(button.object);
  const legend = createMicroLabel(kit, 'RESET SIMULATION', {
    height: 0.034,
    ink: '#ffffff',
    plate: '#b22a22',
    maxWidth: 0.32,
  });
  legend.position.set(0, 0.1, 0.002);
  top.add(legend);
  const push = createMicroLabel(kit, 'PUSH', {
    height: 0.03,
    ink: '#111111',
    plate: '#ffffff',
  });
  push.position.set(0, -0.105, 0.002);
  top.add(push);
  return {
    group,
    parts,
    update(delta: number) {
      const on = lit();
      if (lamp.value !== on) lamp.value = on;
      parts.update(delta);
    },
  };
}

/** A local pump control station's push buttons and RUN lamp: START and STOP, worked through the room's actions. */
export function createPumpStation(
  kit: PanelKit,
  {
    tag,
    start,
    stop,
    running,
  }: {
    tag: string;
    start: () => void;
    stop: () => void;
    running: () => boolean;
  },
) {
  const t = tools(kit);
  const group = new Group();
  group.name = `${tag} local control station`;
  const grey = t.paint('#c9ccc6', 0.55);
  // A post and the station's enclosure on it, facing +z.
  t.box(group, t.paint('#55616a', 0.5), 0.06, 1.2, 0.06, 0, 0.6, -0.05);
  t.box(group, grey, 0.2, 0.32, 0.1, 0, 1.3, 0);
  const run = signal(running());
  const parts = createPartSet();
  const face = new Group();
  face.position.set(0, 1.3, 0.05);
  group.add(face);
  const lamp = parts.add(
    pilotLight(kit, {
      colour: 'green',
      legend: 'RUN',
      drive: run,
      name: `${tag} RUN lamp`,
    }),
  );
  lamp.object.position.set(0, 0.09, 0.002);
  face.add(lamp.object);
  const startButton = parts.add(
    pushButton(kit, {
      colour: 'green',
      legend: 'START',
      action: start,
      name: `${tag} START`,
    }),
  );
  startButton.object.position.set(0, 0.0, 0.002);
  face.add(startButton.object);
  const stopButton = parts.add(
    pushButton(kit, {
      colour: 'red',
      legend: 'STOP',
      action: stop,
      name: `${tag} STOP`,
    }),
  );
  stopButton.object.position.set(0, -0.09, 0.002);
  face.add(stopButton.object);
  const tagPlate = createMicroLabel(kit, `${tag}  CIRCULATION PUMP`, {
    height: 0.014,
    ink: '#16191b',
    plate: '#f4f3ee',
    maxWidth: 0.18,
  });
  tagPlate.position.set(0, 0.145, 0.052);
  face.add(tagPlate);
  const pushTag = createMicroLabel(kit, 'PUSH', {
    height: 0.022,
    ink: '#111111',
    plate: '#ffd21f',
  });
  pushTag.position.set(0.0, -0.19, 0.052);
  face.add(pushTag);
  return {
    group,
    parts,
    update(delta: number) {
      const on = running();
      if (run.value !== on) run.value = on;
      parts.update(delta);
    },
  };
}
