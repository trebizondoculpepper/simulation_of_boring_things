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
 * The main corridor's wayfinding signs (prompt 082): a flat aluminium
 * panel in dark blue, white sans-serif lettering, a white arrow along its
 * side of the ring, the rooms that way nearest first, then smaller, the
 * rooms round the next corner. Set decoration.
 */

const BLUE = '#14365c';
const WIDTH = 0.6;
const PX = 1000; // canvas pixels per metre

/** A room's name as the signs give it: the wet hall's shortened, the dash spaced. */
const nameOf = (room: string) =>
  (DEV_ROOM_NAMES[room as RoomId] ?? room.toUpperCase()).replace(
    /^WET HALL · .*/,
    'WET HALL',
  );

function drawSign(s: WayfindingSign) {
  const line = 62;
  const small = 44;
  const top = 160;
  const height =
    top + s.along.length * line + 40 + 40 + s.then.length * small + 50;
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH * PX;
  canvas.height = height;
  const g = canvas.getContext('2d')!;
  g.fillStyle = BLUE;
  g.fillRect(0, 0, canvas.width, height);
  g.fillStyle = '#ffffff';
  // The arrow, big, at the top, pointing along the ring.
  const ay = 75;
  const left = s.arrow === 'left';
  g.save();
  g.translate(canvas.width / 2, ay);
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
  // The rooms that way.
  g.textAlign = left ? 'left' : 'left';
  g.font = `bold ${line * 0.62}px sans-serif`;
  s.along.forEach((room, i) =>
    g.fillText(nameOf(room), 36, top + i * line + line * 0.6),
  );
  // Then, round the corner.
  let y = top + s.along.length * line + 40;
  g.fillStyle = '#9fb8d6';
  g.fillRect(36, y - 22, canvas.width - 72, 3);
  g.font = `italic ${small * 0.62}px sans-serif`;
  g.fillText('then, round the corner:', 36, y + 14);
  y += 40;
  g.font = `${small * 0.62}px sans-serif`;
  s.then.forEach((room, i) =>
    g.fillText(nameOf(room), 36, y + i * small + small * 0.5),
  );
  return { canvas, height: height / PX };
}

export function createCorridorWayfinding(kit: PanelKit) {
  const group = new Group();
  group.name = 'Wayfinding signs';
  const walls = corridorWalls();
  const edge = new MeshStandardMaterial({
    color: '#c9cdd0',
    roughness: 0.35,
    metalness: 0.8,
  });
  kit.materials.push(edge);
  for (const s of wayfindingSigns()) {
    const { canvas, height } = drawSign(s);
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    map.anisotropy = 4;
    kit.textures.push(map);
    const face = new MeshStandardMaterial({ map, roughness: 0.6 });
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
    // The panel's edge, and its printed face on the front.
    const panel = new Mesh(
      new BoxGeometry(WIDTH + 0.01, height + 0.01, 0.012),
      edge,
    );
    sign.add(panel);
    const front = new Mesh(new BoxGeometry(WIDTH, height, 0.002), face);
    front.position.z = 0.007;
    sign.add(front);
    group.add(sign);
  }
  markComponent(group, { decorative: true });
  return group;
}
