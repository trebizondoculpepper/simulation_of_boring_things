import { Group } from 'three';
import { createMicroLabel } from './eighties-controls';
import type { PanelKit } from './eighties-controls';
import { SANS, tools } from './fitting-tools';

/**
 * Signage for rooms and exhibits: section boards, captions and marks.
 */

/** A wall-mounted title board for a section of dev8. */
export function createSectionBoard(
  kit: PanelKit,
  title: string,
  width: number,
) {
  const t = tools(kit);
  const group = new Group();
  const sign = t.printed(
    width,
    0.16,
    (c, w, h) => {
      c.fillStyle = '#20302b';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#e8e2cc';
      c.font = `bold ${h * 0.55}px ${SANS}`;
      c.textBaseline = 'middle';
      c.fillText(title, h * 0.3, h / 2);
    },
    Math.round(width * 600),
  );
  group.add(sign.mesh);
  return group;
}

/** A small engraved caption for a fitting. */
export function createCaption(kit: PanelKit, text: string) {
  return createMicroLabel(kit, text, { height: 0.016, ink: '#2a2a28' });
}

/** A printed position mark round a selector: small dark capitals. */
export function createMark(kit: PanelKit, text: string) {
  return createMicroLabel(kit, text, { height: 0.0026, ink: '#e8e8e2' });
}
