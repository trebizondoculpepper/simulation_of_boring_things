import {
  BoxGeometry,
  CanvasTexture,
  Group,
  Mesh,
  MeshStandardMaterial,
  SRGBColorSpace,
} from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { markComponent } from '../../components/core/views/component-identity';
import { corridorWalls } from '../logic/main-corridor';
import { wayfindingSigns } from '../logic/corridor-wayfinding';
import type { WayfindingSign } from '../logic/corridor-wayfinding';
import { DEV_ROOM_NAMES } from '../logic/dev-room-links';
import type { RoomId } from '../logic/dev-room-links';

/**
 * The main corridor's wayfinding signs (prompt 082): engraved laminate
 * (the owner, 2026-10-26), the kind cut on an engraving machine, a white
 * face over a black core, the lettering and arrow cut through to the
 * black; bevelled edges showing the core, rounded corners, four screws.
 * An arrow along its side of the ring, the rooms that way nearest first,
 * then smaller, the rooms round the next corner. Set decoration.
 */

const WIDTH = 0.6;
const PX = 1000; // canvas pixels per metre

/** A room's name as the signs give it: the wet hall's and the plant rooms' shortened, the freight lift the service lift. */
const nameOf = (room: string) =>
  (room === 'bridge'
    ? 'CONTROL ROOM'
    : room === 'freight_lift'
      ? 'SERVICE LIFT'
      : (DEV_ROOM_NAMES[room as RoomId] ?? room.toUpperCase())
  )
    .replace(/^WET HALL · .*/, 'WET HALL')
    // Plant rooms by number alone (the owner, 2026-10-26).
    .replace(/^(PLANT ROOM \d+) – .*/, '$1');

function drawSign(s: WayfindingSign) {
  const line = 62;
  const small = 44;
  const top = 160;
  const height =
    top + s.along.length * line + 40 + 40 + s.then.length * small + 60;
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH * PX;
  canvas.height = height;
  const g = canvas.getContext('2d')!;
  const W = canvas.width;
  // The laminate's white face, a faint sheen across it, its bevelled edge
  // cut through to the black core, its corners rounded.
  const r = 28;
  const rounded = (inset: number) => {
    g.beginPath();
    g.roundRect(inset, inset, W - 2 * inset, height - 2 * inset, r - inset);
  };
  // Outside its rounded corners, nothing (cut away by the alpha test).
  rounded(0);
  g.fillStyle = '#2a2a2a';
  g.fill();
  rounded(6);
  const sheen = g.createLinearGradient(0, 0, W, height);
  sheen.addColorStop(0, '#fbfbf8');
  sheen.addColorStop(0.5, '#efefeb');
  sheen.addColorStop(1, '#f7f7f3');
  g.fillStyle = sheen;
  g.fill();
  // Engraved through the white to the black: each cut drawn first as a
  // pale lip a pixel or two below, then a dark shadow above, then the
  // black of the core, so it reads as cut into the face.
  const engrave = (draw: () => void) => {
    g.save();
    g.translate(0, 2);
    g.fillStyle = '#ffffff';
    draw();
    g.restore();
    g.save();
    g.translate(0, -1.5);
    g.fillStyle = '#6b6b6b';
    draw();
    g.restore();
    g.fillStyle = '#141414';
    draw();
  };
  // The arrow, pointing along the ring.
  const left = s.arrow === 'left';
  engrave(() => {
    g.save();
    g.translate(W / 2, 80);
    if (left) g.scale(-1, 1);
    g.beginPath();
    g.moveTo(-180, -16);
    g.lineTo(90, -16);
    g.lineTo(90, -48);
    g.lineTo(170, 0);
    g.lineTo(90, 48);
    g.lineTo(90, 16);
    g.lineTo(-180, 16);
    g.closePath();
    g.fill();
    g.restore();
  });
  g.textAlign = 'left';
  const text = (t: string, x: number, y: number, font: string) => {
    g.font = font;
    // Squeezed, as an engraver would, to fit between the margins.
    const room = W - 2 * x;
    const width = g.measureText(t).width;
    engrave(() => g.fillText(t, x, y, width > room ? room : undefined));
  };
  s.along.forEach((room, i) =>
    text(
      nameOf(room),
      40,
      top + i * line + line * 0.6,
      `bold ${line * 0.62}px sans-serif`,
    ),
  );
  let y = top + s.along.length * line + 40;
  engrave(() => g.fillRect(40, y - 22, W - 80, 3));
  text(
    'then, round the corner:',
    40,
    y + 14,
    `italic ${small * 0.62}px sans-serif`,
  );
  y += 40;
  s.then.forEach((room, i) =>
    text(
      nameOf(room),
      40,
      y + i * small + small * 0.5,
      `${small * 0.62}px sans-serif`,
    ),
  );
  // Four countersunk screws, a corner each.
  for (const [x, yy] of [
    [26, 26],
    [W - 26, 26],
    [26, height - 26],
    [W - 26, height - 26],
  ]) {
    const screw = g.createRadialGradient(x - 3, yy - 3, 1, x, yy, 10);
    screw.addColorStop(0, '#e8e9ea');
    screw.addColorStop(1, '#7c8084');
    g.fillStyle = screw;
    g.beginPath();
    g.arc(x, yy, 10, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#4a4d50';
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(x - 6, yy);
    g.lineTo(x + 6, yy);
    g.moveTo(x, yy - 6);
    g.lineTo(x, yy + 6);
    g.stroke();
  }
  return { canvas, height: height / PX };
}

export function createCorridorWayfinding(kit: PanelKit) {
  const group = new Group();
  group.name = 'Wayfinding signs';
  const walls = corridorWalls();
  // The laminate's black core, seen at its edges.
  const edge = new MeshStandardMaterial({ color: '#141414', roughness: 0.5 });
  kit.materials.push(edge);
  for (const s of wayfindingSigns()) {
    const { canvas, height } = drawSign(s);
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    map.anisotropy = 4;
    kit.textures.push(map);
    // A smooth, slightly glossy plastic face.
    const face = new MeshStandardMaterial({
      map,
      roughness: 0.32,
      alphaTest: 0.5,
    });
    kit.materials.push(face);
    const w = walls[s.wall];
    const sign = new Group();
    sign.name = `Wayfinding sign, ${s.corner} corner, ${s.wall} wall`;
    // Its middle 1.75 m up, its face 1.5 cm proud of the wall.
    sign.position.set(
      w.alongX ? s.at : w.line + w.into[0] * 0.015,
      1.75,
      w.alongX ? w.line + w.into[1] * 0.015 : s.at,
    );
    sign.rotation.y = Math.atan2(w.into[0], w.into[1]);
    // The laminate, 3 mm thick, its face engraved, its edges the core.
    const front = new Mesh(new BoxGeometry(WIDTH, height, 0.003), [
      edge,
      edge,
      edge,
      edge,
      face,
      edge,
    ]);
    front.position.z = 0.0015;
    sign.add(front);
    group.add(sign);
  }
  markComponent(group, { decorative: true });
  return group;
}
