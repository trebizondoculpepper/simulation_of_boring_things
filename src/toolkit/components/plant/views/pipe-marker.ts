import {
  CanvasTexture,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SRGBColorSpace,
} from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { drawGhs } from './chemicals-signs';

export type MarkedChemical = 'hypochlorite' | 'acid';

/** BS 1710's basic identification colour for acids and alkalis (BS 4800 22 C 37), and the safety yellow (08 E 51). */
const VIOLET = '#6b4c8a';
const YELLOW = '#f2c500';

const LEGEND: Record<
  MarkedChemical,
  { name: string; ghs: ('corrosive' | 'environment' | 'exclamation')[] }
> = {
  hypochlorite: {
    name: 'SODIUM HYPOCHLORITE 14%',
    ghs: ['corrosive', 'environment'],
  },
  acid: { name: 'HYDROCHLORIC ACID 10%', ghs: ['corrosive', 'exclamation'] },
};

/**
 * A chemical line's identification marker (BS 1710 and the Safety Signs
 * and Signals Regulations, as researched 2026-10-27): round the pipe, in
 * order along it, a violet band, a yellow and black hazard band, a white
 * legend panel (the substance and its strength, its CLP pictograms, DO NOT
 * MIX – CHLORINE GAS, and a black arrow with the flow) and another violet
 * band; on a double-contained line its outer pipe is marked and its legend
 * says so. The legend is printed twice round the pipe so it reads from
 * either side.
 *
 * Along x, centred on the origin, round a pipe of radius `r`; `flow` +1
 * runs toward +x. Its length is `length` (metres).
 */
export function createPipeMarker(
  kit: PanelKit,
  {
    r,
    chemical,
    flow = 1,
    contained = false,
  }: {
    r: number;
    chemical: MarkedChemical;
    flow?: 1 | -1;
    contained?: boolean;
  },
) {
  const group = new Group();
  // Band widths grow with the pipe, within reason.
  const k = Math.min(1.6, Math.max(0.6, r / 0.03));
  const violet = 0.06 * k;
  const hazard = 0.04 * k;
  const legend = 0.2 * k;
  const R = r + 0.0015;
  const sleeve = (len: number, material: MeshStandardMaterial, x: number) => {
    const m = new Mesh(new CylinderGeometry(R, R, len, 32, 1, true), material);
    m.rotation.z = Math.PI / 2;
    m.position.x = x;
    group.add(m);
    return m;
  };
  const textured = (
    w: number,
    h: number,
    draw: (c: CanvasRenderingContext2D, w: number, h: number) => void,
  ) => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    draw(canvas.getContext('2d')!, w, h);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;
    const m = new MeshStandardMaterial({ map: texture, roughness: 0.55 });
    kit.materials.push(m);
    return m;
  };
  const plain = (colour: string) => {
    const m = new MeshStandardMaterial({ color: colour, roughness: 0.55 });
    kit.materials.push(m);
    return m;
  };
  const total = 2 * violet + hazard + legend;
  let x = -total / 2;
  const place = (len: number, m: MeshStandardMaterial) => {
    sleeve(len, m, x + len / 2);
    x += len;
  };
  place(violet, plain(VIOLET));
  place(
    hazard,
    textured(256, 64, (c, w, h) => {
      c.fillStyle = YELLOW;
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#111111';
      for (let i = -h; i < w + h; i += 32) {
        c.beginPath();
        c.moveTo(i, 0);
        c.lineTo(i + 16, 0);
        c.lineTo(i + 16 - h, h);
        c.lineTo(i - h, h);
        c.closePath();
        c.fill();
      }
    }),
  );
  // The legend: the cylinder's u runs round the pipe, v along it (the
  // sleeve turned to lie along x), so the canvas is drawn turned: its width
  // round the pipe, its height along it.
  const { name, ghs } = LEGEND[chemical];
  place(
    legend,
    textured(1024, 256, (c, w, h) => {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, w, h);
      // Centred on the front (u 0, wrapping) and the back (u ½).
      for (const half of [0, 1, 2]) {
        c.save();
        c.translate(half * (w / 2), h / 2);
        c.rotate(Math.PI / 2);
        // Now drawing along the pipe: x along, y round.
        const along = h;
        c.fillStyle = '#111111';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = `bold ${w * 0.03}px sans-serif`;
        c.fillText(name, 0, -w * 0.07, along * 0.95);
        c.font = `${w * 0.018}px sans-serif`;
        c.fillText(
          contained
            ? 'DOUBLE CONTAINED · DO NOT MIX – CHLORINE GAS'
            : 'DO NOT MIX – CHLORINE GAS',
          0,
          -w * 0.035,
          along * 0.95,
        );
        ghs.forEach((g, i) =>
          drawGhs(c, (i - 0.5) * w * 0.06 - along * 0.2, w * 0.03, w * 0.05, g),
        );
        // The arrow, with the flow (mirrored for a line running back).
        c.translate(along * 0.25, 0);
        c.scale(flow, 1);
        c.translate(-along * 0.25, 0);
        c.beginPath();
        c.moveTo(along * 0.05, w * 0.02);
        c.lineTo(along * 0.32, w * 0.02);
        c.lineTo(along * 0.32, w * 0.0);
        c.lineTo(along * 0.45, w * 0.035);
        c.lineTo(along * 0.32, w * 0.07);
        c.lineTo(along * 0.32, w * 0.05);
        c.lineTo(along * 0.05, w * 0.05);
        c.closePath();
        c.fill();
        c.restore();
      }
    }),
  );
  place(violet, plain(VIOLET));
  return { object: group, length: total };
}
