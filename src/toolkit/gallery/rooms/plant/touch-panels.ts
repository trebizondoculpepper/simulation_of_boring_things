import type { PlantExhibit } from './exhibit';
import { WALL_FACE } from '../../logic/plant-room-layout';
import type {
  ExhibitPlace,
  ExhibitSize,
  PlantRoomLayout,
} from '../../logic/plant-room-layout';
import {
  bezellessStrip,
  curvedStrip,
  hexagonPanel,
  lPanel,
  lectern,
  rakedConsole,
  sidebarPanel,
  threeScreenPanel,
  trapeziumPanel,
} from '../../views/touch-panel-gallery';

/** What this room is for, printed on its title card. */
export const PURPOSE =
  'Touch panels: 2D controls laid out on 3D surfaces of every shape, from the ui2d kit (mission 093)';

/** A dim room, so the screens glow. */
export const FINISH = { wall: '#5d5a63', floor: '#3b3a40' };

/**
 * Dev47, the touch panels (mission 093; the owner, 2026-10-27): "a
 * variety of different controls on a variety of different shapes ... can
 * we lay out LCARS things in a 2D space in a 3D world?" Touch surfaces
 * (`touch-surface.ts`) of every outline the generic tools make, on its
 * walls and standing on its floor, each carrying `ui2d` widgets under
 * pool-flavoured nonsense that answer every touch. Nothing is bound to the
 * plant: a parody's test bed, not a control panel.
 */
export const EXHIBITS: readonly PlantExhibit[] = [
  {
    title: 'Sidebar frame, one screen',
    reference:
      'A 1.8 × 1.0 m screen in a 4 mm bezel: elbows, a sidebar of page buttons, three pages of gauges, read-outs, buttons, a trend and a list',
    size: { w: 1.9, d: 0.06, h: 1.1, mount: 'wall', y: 1.5 },
    build: sidebarPanel,
  },
  {
    title: 'Rounded frame, three screens',
    reference:
      'A 1.6 × 0.95 m rounded black frame holding three screens in a grid with 30 mm bezels: a banner strip, gauges, trends',
    size: { w: 1.7, d: 0.06, h: 1.05, mount: 'wall', y: 1.5 },
    build: threeScreenPanel,
  },
  {
    title: 'Trapezium, two screens',
    reference:
      'A frame narrowing from 1.4 m to 0.9 m: a HAND · OFF · AUTO selector above, a field of buttons and toggles below',
    size: { w: 1.5, d: 0.06, h: 1.0, mount: 'wall', y: 1.5 },
    build: trapeziumPanel,
  },
  {
    title: 'L-shaped frame (concave)',
    reference:
      'An L with its top right cut away: a tall paged screen and a low one with a touchable line diagram round the notch',
    size: { w: 1.7, d: 0.06, h: 1.1, mount: 'wall', y: 1.5 },
    build: lPanel,
  },
  {
    title: 'Bezel-less strip',
    reference:
      'A 2.4 × 0.32 m screen with no bezel: an elbow, bars and a flashing banner',
    size: { w: 2.5, d: 0.06, h: 0.4, mount: 'wall', y: 2.2 },
    build: bezellessStrip,
  },
  {
    title: 'Curved strip',
    reference:
      'A 2.2 × 0.6 m screen bent round the viewer on a 2 m radius, frame and screen together',
    size: { w: 2.3, d: 0.35, h: 0.7, mount: 'wall', y: 1.5 },
    build: curvedStrip,
  },
  {
    title: 'Hexagonal frame',
    reference:
      'A hexagon 1.1 m across its corners with one screen: a nonsense circuit whose pump and valves answer a touch',
    size: { w: 1.2, d: 0.06, h: 1.0, mount: 'wall', y: 1.5 },
    build: hexagonPanel,
  },
  {
    title: 'Raked console',
    reference:
      'A freestanding console, its trapezium top raked 25° toward the operator with two screens set in it',
    size: { w: 1.6, d: 0.8, h: 1.3, mount: 'floor' },
    build: rakedConsole,
  },
  {
    title: 'Lectern',
    reference:
      'A portrait screen on a post, tilted 20°: a keypad and a read-out',
    size: { w: 0.7, d: 0.6, h: 1.8, mount: 'floor' },
    build: lectern,
  },
];

/** Where each exhibit goes, by its index in `EXHIBITS`: a wall and a place along it, or the floor. */
const PLACES: readonly (
  | { wall: 'south' | 'north' | 'east' | 'west'; at: number }
  | { floor: [number, number] }
)[] = [
  { wall: 'south', at: -3.4 },
  { wall: 'south', at: -0.3 },
  { wall: 'west', at: -3.6 },
  { wall: 'south', at: 3.0 },
  { wall: 'north', at: -1.8 },
  { wall: 'north', at: 2.6 },
  { wall: 'west', at: -1.2 },
  { floor: [-1.4, -0.4] },
  { floor: [1.8, -0.4] },
];

/**
 * Its own layout: the panels round all four walls of a 12 × 10 m room
 * (the bezel-less strip high on the north wall),
 * the console and the lectern standing in the middle facing south.
 */
export function layoutRoom(sizes: readonly ExhibitSize[]): PlantRoomLayout {
  const halfX = 6;
  const halfZ = 5;
  const face = WALL_FACE;
  const solids: PlantRoomLayout['solids'] = [];
  const places = sizes.map((s, i): ExhibitPlace => {
    const p = PLACES[i] ?? { floor: [0, 0] };
    if ('floor' in p) {
      const [x, z] = p.floor;
      solids.push({
        minX: x - s.w / 2,
        maxX: x + s.w / 2,
        minZ: z - s.d / 2,
        maxZ: z + s.d / 2,
      });
      return { x, z, y: 0, yaw: 0 };
    }
    const y = s.y ?? 1.5;
    if (p.wall === 'south')
      return { x: p.at, z: halfZ - face, y, yaw: Math.PI };
    if (p.wall === 'north') return { x: p.at, z: -halfZ + face, y, yaw: 0 };
    if (p.wall === 'east')
      return { x: halfX - face, z: p.at, y, yaw: -Math.PI / 2 };
    return { x: -halfX + face, z: p.at, y, yaw: Math.PI / 2 };
  });
  return { halfX, halfZ, height: 4, places, solids };
}
