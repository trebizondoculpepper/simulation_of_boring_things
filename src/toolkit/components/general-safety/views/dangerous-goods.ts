import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';

type Ctx = CanvasRenderingContext2D;

/**
 * The marks a vehicle carrying dangerous goods by road shows (prompt 097):
 * the ADR class 8 (corrosive) placard, the orange plate, and the UK's
 * Hazchem plate, which a tanker carrying within the UK shows on its sides
 * and rear in their place (the Carriage of Dangerous Goods Regulations):
 * its Emergency Action Code for the fire service, its UN number, its
 * hazard diamond, a number for specialist advice, and whose load it is.
 * The telephone numbers are in Ofcom's range kept for drama (01632 960),
 * so none is anyone's.
 */

/** What a Hazchem plate says of one load. */
export interface HazchemLoad {
  /** The Emergency Action Code: 2X for sodium hypochlorite, 2R for hydrochloric acid. */
  eac: string;
  un: string;
  /** The specialist advice number. */
  phone: string;
  /** Whose load: the consignor's name, as it is printed. */
  company: string;
}

/**
 * The ADR class 8 placard, centred at (x, y), `s` corner to corner: a
 * diamond, its top half white over two test tubes dripping onto a bar
 * and a hand, its lower half black with a white 8, a black line in from
 * its edge.
 */
export function drawClass8(c: Ctx, x: number, y: number, s: number) {
  const h = s / 2;
  const diamond = () => {
    c.beginPath();
    c.moveTo(x, y - h);
    c.lineTo(x + h, y);
    c.lineTo(x, y + h);
    c.lineTo(x - h, y);
    c.closePath();
  };
  c.save();
  diamond();
  c.fillStyle = '#ffffff';
  c.fill();
  c.clip();
  c.fillStyle = '#111111';
  c.fillRect(x - h, y, s, h);
  const u = s / 20;
  for (const [dx, a] of [
    [-3.2, 0.55],
    [2.4, -0.55],
  ] as const) {
    c.save();
    c.translate(x + dx * u, y - 4.6 * u);
    c.rotate(a);
    c.fillRect(-0.9 * u, -3 * u, 1.8 * u, 4.6 * u);
    c.restore();
    c.beginPath();
    c.arc(x + dx * u * 0.75, y - 1.1 * u, 0.55 * u, 0, Math.PI * 2);
    c.fill();
  }
  // Onto a bar (left) and a hand (right), at the halves' meeting.
  c.fillRect(x - 6.4 * u, y - 0.6 * u, 5.2 * u, 0.9 * u);
  c.fillRect(x + 0.6 * u, y - 0.9 * u, 5 * u, 1.2 * u);
  c.restore();
  c.save();
  // The line in from its edge.
  const inset = s * 0.045;
  c.beginPath();
  c.moveTo(x, y - h + inset);
  c.lineTo(x + h - inset, y);
  c.lineTo(x, y + h - inset);
  c.lineTo(x - h + inset, y);
  c.closePath();
  c.lineWidth = s * 0.012;
  c.strokeStyle = '#ffffff';
  c.stroke();
  c.beginPath();
  c.moveTo(x, y - h + inset);
  c.lineTo(x + h - inset, y);
  c.moveTo(x - h + inset, y);
  c.lineTo(x, y - h + inset);
  c.strokeStyle = '#111111';
  c.stroke();
  c.fillStyle = '#ffffff';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = `700 ${s * 0.17}px "Helvetica Neue", Arial, sans-serif`;
  c.fillText('8', x, y + s * 0.3);
  c.restore();
}

/** The orange plate, `w` × `h`: the hazard number over the UN number, or plain. */
export function drawOrangePlate(
  c: Ctx,
  w: number,
  h: number,
  numbers?: { hazard: string; un: string },
) {
  c.fillStyle = '#ef7d1a';
  c.fillRect(0, 0, w, h);
  c.strokeStyle = '#111';
  c.lineWidth = h * 0.05;
  c.strokeRect(h * 0.025, h * 0.025, w - h * 0.05, h - h * 0.05);
  if (!numbers) return;
  c.beginPath();
  c.moveTo(0, h / 2);
  c.lineTo(w, h / 2);
  c.stroke();
  c.fillStyle = '#111';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = `700 ${h * 0.34}px "Helvetica Neue", Arial, sans-serif`;
  c.fillText(numbers.hazard, w / 2, h * 0.27);
  c.fillText(numbers.un, w / 2, h * 0.76);
}

/**
 * The UK Hazchem plate, `w` × `h` (800 × 500 mm): on its left, on orange,
 * the Emergency Action Code over the UN number, each in its box; on its
 * right, on white, the class's diamond; across its foot, on white,
 * SPECIALIST ADVICE and its number, and the company's name; a black
 * border and black lines between.
 */
export function drawHazchemPlate(
  c: Ctx,
  w: number,
  h: number,
  load: HazchemLoad,
) {
  const line = h * 0.02;
  const split = w * 0.55;
  const foot = h * 0.74;
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#ef7d1a';
  c.fillRect(0, 0, split, foot);
  c.strokeStyle = '#111';
  c.lineWidth = line;
  c.strokeRect(line / 2, line / 2, w - line, h - line);
  c.beginPath();
  c.moveTo(split, 0);
  c.lineTo(split, foot);
  c.moveTo(0, foot);
  c.lineTo(w, foot);
  c.moveTo(0, foot * 0.5);
  c.lineTo(split, foot * 0.5);
  c.stroke();
  c.fillStyle = '#111';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  // The Emergency Action Code: its number and its letter; S, T, Y and Z
  // are reversed out of black (breathing apparatus for a fire only).
  const eacY = foot * 0.25;
  const size = foot * 0.36;
  c.font = `700 ${size}px "Helvetica Neue", Arial, sans-serif`;
  const digits = load.eac.replace(/[A-Z]$/, '');
  const letter = load.eac.slice(digits.length);
  const dw = c.measureText(digits).width;
  const lw = c.measureText(letter).width;
  const left = split / 2 - (dw + lw + size * 0.15) / 2;
  c.textAlign = 'left';
  c.fillText(digits, left, eacY);
  if (letter && 'STYZ'.includes(letter)) {
    const lx = left + dw + size * 0.15;
    c.fillRect(
      lx - size * 0.06,
      eacY - size * 0.48,
      lw + size * 0.12,
      size * 0.96,
    );
    c.fillStyle = '#ffffff';
    c.fillText(letter, lx, eacY + size * 0.02);
    c.fillStyle = '#111';
  } else if (letter) c.fillText(letter, left + dw + size * 0.15, eacY);
  c.textAlign = 'center';
  c.fillText(load.un, split / 2, foot * 0.75);
  drawClass8(
    c,
    split + (w - split) / 2,
    foot / 2,
    Math.min(w - split, foot) * 0.88,
  );
  c.font = `700 ${h * 0.075}px "Helvetica Neue", Arial, sans-serif`;
  c.fillText(
    `SPECIALIST ADVICE  ${load.phone}`,
    w / 2,
    foot + (h - foot) * 0.32,
    w * 0.94,
  );
  c.font = `600 ${h * 0.065}px "Helvetica Neue", Arial, sans-serif`;
  c.fillText(
    load.company.toUpperCase(),
    w / 2,
    foot + (h - foot) * 0.72,
    w * 0.94,
  );
}

/** A 250 mm class 8 placard on its own plate, facing +z. */
export function createClass8Placard(kit: PanelKit, size = 0.25) {
  const t = tools(kit);
  const p = t.printed(size, size, (c, cw) => {
    c.clearRect(0, 0, cw, cw);
    drawClass8(c, cw / 2, cw / 2, cw * 0.98);
  });
  (p.mesh.material as { transparent: boolean }).transparent = true;
  return p.mesh;
}

/** A 400 × 300 mm orange plate, numbered or plain, facing +z. */
export function createOrangePlate(
  kit: PanelKit,
  numbers?: { hazard: string; un: string },
) {
  const t = tools(kit);
  return t.printed(0.4, 0.3, (c, cw, ch) => drawOrangePlate(c, cw, ch, numbers))
    .mesh;
}

/** A Hazchem plate, `w` metres wide (0.8 by default) and 5/8 of that high, facing +z. */
export function createHazchemPlate(kit: PanelKit, load: HazchemLoad, w = 0.8) {
  const t = tools(kit);
  return t.printed(
    w,
    w * 0.625,
    (c, cw, ch) => drawHazchemPlate(c, cw, ch, load),
    512,
  ).mesh;
}
