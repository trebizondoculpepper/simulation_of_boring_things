import {
  BoxGeometry,
  CanvasTexture,
  Mesh,
  MeshStandardMaterial,
  SRGBColorSpace,
} from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';

/**
 * Engraved laminate signs (the owner, 2026-10-26: the style for all the
 * plant side's internal signs): the kind cut on an engraving machine, a
 * white face over a black core, the lettering cut through to the black and
 * very slightly recessed; bevelled edges and rounded corners showing the
 * core; four countersunk screws on a sign large enough for them.
 */

/** Pixels per metre the face is drawn at. */
const PX = 1000;

export interface EngravedLine {
  text: string;
  /** Cap height as a share of the sign's height. */
  size: number;
  /** Its baseline's height from the top, as a share of the sign's height. */
  y: number;
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center';
}

/** A context's drawing engraved: a pale lip below, a shadow above, the black core. */
export function engrave(g: CanvasRenderingContext2D, draw: () => void) {
  const k = g.canvas.height / 300;
  g.save();
  g.translate(0, 2 * k);
  g.fillStyle = '#ffffff';
  draw();
  g.restore();
  g.save();
  g.translate(0, -1.5 * k);
  g.fillStyle = '#6b6b6b';
  draw();
  g.restore();
  g.fillStyle = '#141414';
  draw();
}

/**
 * The laminate's face, `w` by `h` metres: its white face and sheen, its
 * bevel, its rounded corners cut away, its screws; `cut` engraves onto it.
 */
export function engravedFace(
  w: number,
  h: number,
  cut: (g: CanvasRenderingContext2D, W: number, H: number) => void,
  { screws = w >= 0.4 && h >= 0.2 } = {},
) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * PX);
  canvas.height = Math.round(h * PX);
  const g = canvas.getContext('2d')!;
  const W = canvas.width;
  const H = canvas.height;
  const r = Math.min(28, H * 0.12);
  const rounded = (inset: number) => {
    g.beginPath();
    g.roundRect(
      inset,
      inset,
      W - 2 * inset,
      H - 2 * inset,
      Math.max(1, r - inset),
    );
  };
  rounded(0);
  g.fillStyle = '#2a2a2a';
  g.fill();
  rounded(Math.max(3, H * 0.02));
  const sheen = g.createLinearGradient(0, 0, W, H);
  sheen.addColorStop(0, '#fbfbf8');
  sheen.addColorStop(0.5, '#efefeb');
  sheen.addColorStop(1, '#f7f7f3');
  g.fillStyle = sheen;
  g.fill();
  cut(g, W, H);
  if (screws) {
    const s = Math.min(26, H * 0.09);
    for (const [x, y] of [
      [s, s],
      [W - s, s],
      [s, H - s],
      [W - s, H - s],
    ]) {
      const rad = s * 0.38;
      const shine = g.createRadialGradient(
        x - rad * 0.3,
        y - rad * 0.3,
        1,
        x,
        y,
        rad,
      );
      shine.addColorStop(0, '#e8e9ea');
      shine.addColorStop(1, '#7c8084');
      g.fillStyle = shine;
      g.beginPath();
      g.arc(x, y, rad, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#4a4d50';
      g.lineWidth = rad * 0.25;
      g.beginPath();
      g.moveTo(x - rad * 0.6, y);
      g.lineTo(x + rad * 0.6, y);
      g.moveTo(x, y - rad * 0.6);
      g.lineTo(x, y + rad * 0.6);
      g.stroke();
    }
  }
  return canvas;
}

/** Engraves `lines` onto a face, each squeezed to fit between its margins. */
export function cutLines(lines: readonly EngravedLine[]) {
  return (g: CanvasRenderingContext2D, W: number, H: number) => {
    for (const l of lines) {
      g.font = `${l.italic ? 'italic ' : ''}${l.bold ? 'bold ' : ''}${H * l.size}px Arial, Helvetica, sans-serif`;
      const align = l.align ?? 'center';
      g.textAlign = align;
      g.textBaseline = 'middle';
      const margin = Math.max(W * 0.04, H * 0.12);
      const room = W - 2 * margin;
      const x = align === 'center' ? W / 2 : margin;
      const width = g.measureText(l.text).width;
      engrave(g, () =>
        g.fillText(l.text, x, H * l.y, width > room ? room : undefined),
      );
    }
  };
}

/**
 * An engraved laminate sign `w` by `h` metres, 3 mm thick: its face toward
 * +z, its back at z = 0, its middle at the origin.
 */
export function createEngravedSign(
  kit: PanelKit,
  w: number,
  h: number,
  cut: (g: CanvasRenderingContext2D, W: number, H: number) => void,
  options?: { screws?: boolean },
) {
  const map = new CanvasTexture(engravedFace(w, h, cut, options));
  map.colorSpace = SRGBColorSpace;
  map.anisotropy = 4;
  kit.textures.push(map);
  // A smooth, slightly glossy plastic; its corners cut away by alpha.
  const face = new MeshStandardMaterial({
    map,
    roughness: 0.32,
    alphaTest: 0.5,
  });
  const core = new MeshStandardMaterial({ color: '#141414', roughness: 0.5 });
  kit.materials.push(face, core);
  const sign = new Mesh(new BoxGeometry(w, h, 0.003), [
    core,
    core,
    core,
    core,
    face,
    core,
  ]);
  sign.geometry.translate(0, 0, 0.0015);
  sign.name = 'Engraved laminate sign';
  return sign;
}

/** A sign of one name, as over a door: bold, centred. */
export function createEngravedNameSign(
  kit: PanelKit,
  w: number,
  h: number,
  name: string,
) {
  return createEngravedSign(
    kit,
    w,
    h,
    cutLines([{ text: name, size: 0.46, y: 0.53, bold: true }]),
  );
}
