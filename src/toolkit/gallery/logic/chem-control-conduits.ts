import { CHEMICALS } from '../../../game/plant/chemicals';
import { layoutRoom } from './room-equipment';
import { placedPort } from './machine-ports';
import type { Point3, ServiceRoute } from './room-services';

/**
 * The wet hall's chemical transfer control's data conduits (prompt 091):
 * each OT-216 terminal's serial cable, a link of the hall's schematic
 * (`<chemical> terminal's data link to the control box`), in its own
 * steel conduit from the terminal's gland on the south wall down and back
 * to the wall, along it under the terminals, up short of the hypochlorite
 * selector's manifold and over it, to the corner and along the east wall
 * over the acid selector's, then
 * down the wall beside the control box, under it and up into its gland. Each line at its own
 * height, so the two never share a run. Pure: metres, the hall's frame.
 */

/** Its conduit: 20 mm steel, as a fitter would run a data cable. */
const OD = 0.0213;
/** Off the wall's face, on its saddles. */
const OFF = 0.035;
/**
 * Each line's own heights and places: along the south wall under the
 * terminals, up just short of the hypochlorite manifold (from x 5.85),
 * over the manifolds (2 m, and their outlets' risers), and down the east
 * wall beside the box; chosen so that the two never cross.
 */
const LINE = {
  hypochlorite: { low: 1.28, rise: 5.62, run: 2.42, beside: 0.07, under: 0.09 },
  acid: { low: 1.2, rise: 5.7, run: 2.34, beside: 0.12, under: 0.13 },
} as const;

export function chemControlConduits(room: string): ServiceRoute[] {
  if (room !== 'wet_hall') return [];
  const layout = layoutRoom(room);
  if (!layout) return [];
  const { box, placed } = layout;
  const boxAt = placed.find((p) => p.item.key === 'chem-control-box');
  if (!boxAt) return [];
  const south = box.d / 2 - OFF;
  const east = box.w / 2 - OFF;
  return CHEMICALS.flatMap((c): ServiceRoute[] => {
    const term = placed.find((p) => p.item.key === `chem-terminal:${c}`);
    if (!term) return [];
    const from = placedPort(term, 'data').at;
    const to = placedPort(boxAt, `data-${c}`).at;
    const l = LINE[c];
    const beside = boxAt.z + boxAt.item.w / 2 + l.beside;
    const under = to[1] - l.under;
    const points: Point3[] = [
      // From the gland's conduit, which runs down the wall's face on its
      // saddles (the terminal is 60 mm deep, its gland 30 mm out).
      [from[0], from[1], from[2]],
      [from[0], l.low, south],
      [l.rise, l.low, south],
      [l.rise, l.run, south],
      [east, l.run, south],
      [east, l.run, beside],
      [east, under, beside],
      [east, under, to[2]],
      [to[0], under, to[2]],
      [to[0], to[1], to[2]],
    ];
    return [
      {
        name: `${c === 'acid' ? 'Acid' : 'Hypochlorite'} terminal's data link to the control box`,
        utility: 'control',
        kind: 'steel-screwed',
        od: OD,
        points,
        to: 'chem-control-box',
      },
    ];
  });
}
