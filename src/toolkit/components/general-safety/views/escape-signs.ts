import { Group } from 'three';
import { createSafetySign } from './safety-signs';
import type { PanelKit } from '../../core/views/eighties-controls';
import { SANS, tools } from '../../core/views/fitting-tools';

/**
 * Safety signs, each built in metres facing +z, its back on the wall at
 * z = 0:
 *
 * - escape route signs: the emergency exit pictogram of BS EN ISO 7010
 *   (E001, the running figure leaving left; E002, leaving right) with a
 *   directional arrow as BS 5499-4 uses them (up: straight on; left or
 *   right; diagonally up: up the stairs that way), and FIRE EXIT where it
 *   marks a final exit, white on safety green, internally lit;
 * - FIRE DOOR KEEP SHUT, white on mandatory blue;
 * - FIRST AID (E003), a white cross on green.
 */

export type EscapeArrow = 'up' | 'left' | 'right' | 'up-left' | 'up-right';

const GREEN = '#00894a';

/** The running figure and the doorway, filling a square `s` at (x, y), leaving `way`. */
function drawExit(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  way: 'left' | 'right',
) {
  c.save();
  c.translate(x, y);
  if (way === 'right') {
    c.translate(s, 0);
    c.scale(-1, 1);
  }
  const u = s / 10;
  c.strokeStyle = c.fillStyle = '#ffffff';
  // The doorway, behind the figure, on the far side from where it runs.
  c.lineWidth = u * 0.7;
  c.strokeRect(u * 6.2, u * 0.8, u * 3.2, u * 8.6);
  c.fillStyle = GREEN;
  c.fillRect(u * 5.8, u * 2.5, u * 1, u * 7.2);
  c.fillStyle = '#ffffff';
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.lineWidth = u * 1.1;
  c.beginPath();
  c.arc(u * 4.6, u * 1.6, u * 1.0, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  // Body, legs and arms, running left.
  c.moveTo(u * 4.2, u * 3.2);
  c.lineTo(u * 4.8, u * 6.0);
  c.lineTo(u * 2.8, u * 7.2);
  c.lineTo(u * 2.2, u * 9.0);
  c.moveTo(u * 4.8, u * 6.0);
  c.lineTo(u * 6.4, u * 7.4);
  c.lineTo(u * 6.9, u * 9.2);
  c.moveTo(u * 4.4, u * 3.8);
  c.lineTo(u * 2.4, u * 4.4);
  c.lineTo(u * 1.4, u * 5.8);
  c.moveTo(u * 4.6, u * 3.8);
  c.lineTo(u * 6.0, u * 5.0);
  c.lineTo(u * 7.4, u * 4.6);
  c.stroke();
  c.restore();
}

/** A directional arrow in a square `s` at (x, y). */
function drawArrow(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  arrow: EscapeArrow,
) {
  const angle = {
    up: -Math.PI / 2,
    right: 0,
    left: Math.PI,
    'up-right': -Math.PI / 4,
    'up-left': (-3 * Math.PI) / 4,
  }[arrow];
  c.save();
  c.translate(x + s / 2, y + s / 2);
  c.rotate(angle);
  const u = s / 10;
  c.fillStyle = '#ffffff';
  c.fillRect(-u * 3.6, -u * 0.9, u * 4.6, u * 1.8);
  c.beginPath();
  c.moveTo(u * 4, 0);
  c.lineTo(u * 0.6, -u * 3.2);
  c.lineTo(u * 0.6, u * 3.2);
  c.closePath();
  c.fill();
  c.restore();
}

/**
 * An internally lit escape route sign, 400 × 200 mm, or 600 × 200 mm
 * with FIRE EXIT at a final exit (its pictogram 160 mm high, legible at
 * 32 m): the arrow on the side it points, the figure
 * running that way.
 */
export function createEscapeSign(
  kit: PanelKit,
  arrow: EscapeArrow,
  finalExit = false,
) {
  const t = tools(kit);
  const group = new Group();
  // A final exit's sign is 600 × 200 mm, to carry FIRE EXIT as well.
  const width = finalExit ? 0.6 : 0.4;
  t.box(group, t.paint('#eeeee9', 0.4), width, 0.2, 0.05, 0, 0, 0.025);
  const leftward = arrow === 'left' || arrow === 'up-left';
  const face = t.printed(
    width - 0.02,
    0.18,
    (c, w, h) => {
      c.fillStyle = GREEN;
      c.fillRect(0, 0, w, h);
      const s = h * 0.82;
      const m = (h - s) / 2;
      const way = leftward ? 'left' : 'right';
      // Arrow, figure, then the words, reading away from the arrow.
      const arrowX = leftward ? m : w - m - s;
      const figureX = leftward ? m + s * 1.05 : w - m - s * 2.05;
      drawArrow(c, arrowX, m, s, arrow);
      drawExit(c, figureX, m, s, way);
      if (finalExit) {
        c.fillStyle = '#ffffff';
        c.font = `bold ${h * 0.3}px ${SANS}`;
        c.textBaseline = 'middle';
        c.textAlign = 'center';
        const textX = leftward ? (figureX + s + w) / 2 : figureX / 2;
        c.fillText('FIRE', textX, h * 0.36);
        c.fillText('EXIT', textX, h * 0.66);
      }
    },
    512,
    true,
  );
  face.mesh.position.z = 0.0505;
  group.add(face.mesh);
  return group;
}

/** FIRE DOOR KEEP SHUT (`safety-signs.ts`), 150 × 200 mm, on a door's face. */
export function createFireDoorSign(kit: PanelKit) {
  const group = new Group();
  const sign = createSafetySign(
    kit,
    ['door-shut'],
    ['FIRE DOOR', 'KEEP SHUT'],
    'portrait',
    0.15,
    0.2,
  );
  sign.position.z = 0.002;
  group.add(sign);
  return group;
}

/** FIRST AID (`safety-signs.ts`, E003): 200 × 250 mm. */
export function createFirstAidSign(kit: PanelKit) {
  const group = new Group();
  const sign = createSafetySign(
    kit,
    ['first-aid'],
    ['First aid'],
    'portrait',
    0.2,
    0.25,
  );
  sign.position.z = 0.003;
  group.add(sign);
  return group;
}
