import { createCrtSurface } from './crt-surface';
/** Ported from VX3 Simulator; original hardware geometry retained. */
import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  PlaneGeometry,
} from 'three';
import type {
  BufferGeometry,
  Material,
  MeshBasicMaterial,
  Texture,
} from 'three';
import { createPs1Material } from '../../core/parts/ps1-material';
import type { ScreenLine } from '../logic/bbc-micro';
import {
  createCanvasTexture,
  createLabelTexture,
} from '../../core/views/screens';

/** Mode 7 text as the BBC Micro's calibration program draws it. */
function createScreen() {
  const width = 640;
  const height = 500;
  const { context, texture } = createCanvasTexture(width, height);
  let shown: string | undefined;
  const draw = (lines: readonly ScreenLine[], cursor: boolean) => {
    const key = JSON.stringify([lines, cursor]);
    if (key === shown) return;
    shown = key;
    // The tube's rounded face, set in its black surround.
    context.fillStyle = '#0c0b0a';
    context.fillRect(0, 0, width, height);
    context.fillStyle = '#060807';
    context.beginPath();
    context.roundRect(4, 4, width - 8, height - 8, 22);
    context.fill();
    context.save();
    context.clip();
    // Mode 7's 40 columns × 25 rows, with its eight-colour text on black.
    context.font = 'bold 18px monospace';
    context.textBaseline = 'top';
    for (const [i, [text, ink]] of lines.entries()) {
      context.fillStyle = ink;
      if (i >= 25) break;
      for (const [column, character] of text.slice(0, 40).split('').entries())
        context.fillText(character, 8 + column * 15.6, 6 + i * 19.5, 15.6);
    }
    if (cursor && lines.length > 0 && lines.length < 25) {
      context.fillStyle = '#f2f2ee';
      context.fillRect(8, 6 + lines.length * 19.5 + 17, 14, 2.5);
    }
    // A faint reflection across the top left of the glass.
    const sheen = context.createLinearGradient(0, 0, width * 0.6, height * 0.6);
    sheen.addColorStop(0, 'rgba(255, 255, 255, 0.10)');
    sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = sheen;
    context.fillRect(0, 0, width, height);
    context.restore();
    texture.needsUpdate = true;
  };
  return { texture, draw };
}

/**
 * A Microvitec Cub 14-inch colour monitor, the BBC Micro's usual companion:
 * a plain cream steel box with louvred sides, a brown bezel round a black
 * surround and a round-cornered tube, the maker's badge on a black tab at
 * the bottom left and a red power indicator at the bottom right.
 * The screen shows the calibration program's Mode 7 text, including any
 * warnings, with a blinking cursor, and keeps glowing
 * when the room lights are off. Sizes are in metres; the group's origin is
 * the middle of its base and the screen faces +z.
 */
export function createCubMonitor(worldUnitsPerMetre: number) {
  const m = worldUnitsPerMetre;
  const group = new Group();
  group.name = 'MicrovitecCub';
  const materials: Material[] = [];
  const textures: Texture[] = [];
  const part = (
    geometry: BufferGeometry,
    color: string,
    x: number,
    y: number,
    z: number,
    glow = false,
  ) => {
    const material = createPs1Material({ color }, glow, glow);
    materials.push(material);
    const result = new Mesh(geometry, material);
    result.position.set(x * m, y * m, z * m);
    group.add(result);
    return result;
  };
  const box = (
    w: number,
    h: number,
    d: number,
    color: string,
    x: number,
    y: number,
    z: number,
    glow = false,
  ) => part(new BoxGeometry(w * m, h * m, d * m), color, x, y, z, glow);

  // Science Museum dimensions in H × W × D order, not W × H × D.
  const width = 0.352;
  const height = 0.3;
  const depth = 0.415;
  const front = depth / 2 - 0.02;
  const CASE = '#dcd2a9';
  const BEZEL = '#242724';
  const SLOT = '#5d5747';

  // Plain steel cabinet, its sides louvred near the front and split by a
  // seam a third of the way up.
  box(width, height, depth - 0.04, CASE, 0, height / 2, -0.02);
  for (const side of [-1, 1]) {
    const x = side * (width / 2 + 0.001);
    for (const y of [height * 0.86, height * 0.81])
      for (let k = 0; k < 4; k++)
        box(0.002, 0.005, 0.026, SLOT, x, y, front - 0.05 - k * 0.036);
    for (let row = 0; row < 4; row++)
      for (let k = 0; k < 2; k++)
        box(
          0.002,
          0.005,
          0.026,
          SLOT,
          x,
          height * 0.12 + row * 0.014,
          front - 0.05 - k * 0.036,
        );
    box(0.002, 0.003, depth - 0.04, '#b8ae88', x, height * 0.33, -0.02);
  }

  // Brown bezel, a little proud of the case, round a black surround that
  // holds the tube. The tube sits high, leaving a deeper lower rail.
  const screenY = height * 0.55;
  // Four actual bezel rails leave an opening: no solid panel over the CRT.
  box(0.028, height, 0.03, BEZEL, -0.162, height / 2, front - 0.005);
  box(0.02, height, 0.03, BEZEL, 0.166, height / 2, front - 0.005);
  box(0.304, 0.012, 0.03, BEZEL, 0.004, 0.294, front - 0.005);
  box(0.304, 0.042, 0.03, BEZEL, 0.004, 0.021, front - 0.005);
  const darkGlass = createPs1Material({ color: '#030605', roughness: 0.2 });
  materials.push(darkGlass);
  const tube = new Mesh(createCrtSurface(0.304, 0.246), darkGlass);
  tube.position.set(0.004 * m, screenY * m, (front + 0.006) * m);
  tube.geometry.scale(m, m, m);
  tube.name = 'Inset curved CRT glass';
  group.add(tube);
  const screen = createScreen();
  textures.push(screen.texture);
  const glass = createPs1Material(
    {
      map: screen.texture,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    },
    true,
    true,
  );
  materials.push(glass);
  // A 4:3 picture within the 14-inch tube's bezel.
  const screenW = 0.276;
  const screenH = screenW * 0.75;
  const face = new Mesh(createCrtSurface(screenW, screenH), glass);
  face.geometry.scale(m, m, m);
  const screenFaceZ = front + 0.0065;
  face.position.set(0.004 * m, screenY * m, screenFaceZ * m);
  group.add(face);
  // The badge on a black tab at the bottom left, and the bare red power
  // indicator at the bottom right, just under the tube.
  const badge = createLabelTexture('MICROVITEC', {
    ink: '#cfcabb',
    plate: '#151412',
    size: 12,
  });
  textures.push(badge.texture);
  const badgeMaterial = createPs1Material({ map: badge.texture }, true);
  materials.push(badgeMaterial);
  const tabW = 0.06;
  const tabX = -width / 2 + 0.03 + tabW / 2;
  box(tabW, 0.022, 0.014, '#151412', tabX, 0.012, front + 0.012);
  const badgeH = Math.min(0.012, (tabW - 0.008) * (badge.height / badge.width));
  const badgeMesh = new Mesh(
    new PlaneGeometry(badgeH * (badge.width / badge.height) * m, badgeH * m),
    badgeMaterial,
  );
  badgeMesh.position.set(tabX * m, 0.012 * m, (front + 0.0195) * m);
  group.add(badgeMesh);
  const lamp = part(
    new CylinderGeometry(0.004 * m, 0.004 * m, 0.004 * m, 8),
    '#ff2a1e',
    width / 2 - 0.045,
    screenY - height * 0.4 - 0.012,
    front + 0.012,
    true,
  );
  lamp.rotation.x = Math.PI / 2;

  const lampColour = (lamp.material as MeshBasicMaterial).color;
  return {
    group,
    /** The picture on the tube, for looking straight at it. */
    screen: face,
    /**
     * Switch the monitor on or off with the computer: off, its red power
     * lamp is dark and the tube shows nothing.
     */
    power(on: boolean) {
      lampColour.set(on ? '#ff2a1e' : '#3a1512');
      face.visible = on;
    },
    /** Redraw the text if it has changed, and blink the cursor about once a second. */
    update(seconds: number, lines: readonly ScreenLine[], showCursor = true) {
      screen.draw(lines, showCursor && seconds % 1.1 < 0.6);
    },
    dispose() {
      group.traverse((object) => {
        if (object instanceof Mesh) object.geometry.dispose();
      });
      for (const item of materials) item.dispose();
      for (const item of textures) item.dispose();
    },
  };
}
