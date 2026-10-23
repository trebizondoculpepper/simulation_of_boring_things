import { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { SANS, tools } from '../../core/views/fitting-tools';

/**
 * A staff gauge, after the vitreous enamelled level boards used on
 * reservoirs and tanks: plates 1 m long and 100 mm wide, screwed to the
 * wall one above another, each marked in the "E" pattern (a black block
 * every 10 mm, an E every 50 mm), its metres in red at every decimetre.
 * Read by eye against the water, the check on every instrument.
 *
 * Its own frame: its zero at the origin, rising `length` metres up the
 * wall, its face toward +z.
 */
export function createStaffGauge(kit: PanelKit, length = 4.5) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'Staff gauge';
  const W = 0.1;
  for (let m = 0; m < length; m++) {
    const h = Math.min(1, length - m);
    const plate = t.printed(
      W,
      h,
      (c, cw, ch) => {
        c.fillStyle = '#f5f3ea';
        c.fillRect(0, 0, cw, ch);
        const px = ch / h;
        // Each centimetre from the plate's foot.
        for (let cm = 0; cm < Math.round(h * 100); cm++) {
          const y = ch - (cm + 1) * (px / 100);
          const inFive = cm % 10;
          // The E: its spine on the left, its arms every other centimetre.
          if (inFive < 5 && inFive % 2 === 0)
            c.fillStyle = (cm / 10) % 2 < 1 ? '#151515' : '#c41b1b';
          else continue;
          c.fillRect(cw * 0.08, y, cw * 0.42, px / 100);
        }
        for (let dm = 0; dm < Math.round(h * 10); dm += 1) {
          const yTop = ch - (dm + 1) * (px / 10);
          c.fillStyle = dm % 2 === 0 ? '#151515' : '#c41b1b';
          c.fillRect(cw * 0.08, yTop + px / 20, cw * 0.1, px / 20);
          // The metre and decimetre, as the boards print them.
          c.fillStyle = '#c41b1b';
          c.font = `bold ${cw * 0.26}px ${SANS}`;
          c.textAlign = 'right';
          c.textBaseline = 'middle';
          if (dm % 2 === 0)
            c.fillText(`${m}.${dm}`, cw * 0.95, ch - dm * (px / 10) - px / 40);
        }
        c.strokeStyle = '#8a8a86';
        c.lineWidth = cw * 0.02;
        c.strokeRect(0, 0, cw, ch);
      },
      128,
    );
    plate.mesh.position.set(0, m + h / 2, 0);
    group.add(plate.mesh);
  }
  return group;
}
