import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import type {
  BufferGeometry,
  Material,
  MeshBasicMaterial,
  Object3D,
  Texture,
} from 'three';
import { brandById } from '../../core/logic/brands';
import type { BrandId } from '../../core/logic/brands';
import { createPs1Material } from '../../core/parts/ps1-material';
import { drawBrandMark, wordmarkFont } from '../../core/views/brand-logo';
import {
  createMicroLabel,
  kitGlow,
  kitPaint,
} from '../../core/views/eighties-controls';
import type { PanelKit } from '../../core/views/eighties-controls';

/**
 * Nineteen-inch rack equipment of an American plant in the 1990s:
 * enclosed cabinets with branded headers, a bayed suite sharing one
 * header, an open two-post relay rack, and rack-mount units of every kind
 * (blanking plates, vented panels, handled chassis, units with little
 * doors, drawers, fan trays, drive bays, patch panels, shelves of
 * half-width units, and panels to take controls). Real size in metres; a
 * unit's front is at z = 0 and its bottom at y = 0, a cabinet stands on
 * the floor at y = 0 facing +z. Views only: doors and drawers are worked
 * by components in the room.
 */

// Dimensions follow EIA-310 and published catalogues; see
// doc/research/rack-dimensions.md for the figures and their sources.

/** One rack unit: 1.75 in. */
export const U = 0.04445;
/** A front panel is 1/32 in short of its units, for clearance. */
export const PANEL_CLEARANCE = 0.00079;
/** The width of a 19-inch front panel. */
export const PANEL_WIDTH = 0.4826;
/** A chassis must pass the rails' 450 mm opening; most are 17 in. */
export const CHASSIS_WIDTH = 0.4318;
/** The rails' hole centres are 18 5/16 in (465.1 mm) apart. */
const RAIL_X = 0.46511 / 2;
/** A half-rack chassis, 8.5 in, two to a shelf. */
export const HALF_WIDTH = 0.2159;
/** Typical chassis depths, metres. */
export const DEPTHS = {
  /** A patch panel: a plate and its jacks. */
  patch: 0.1,
  /** A 1U fan tray. */
  fans: 0.254,
  /** An instrument or controller, 15 in. */
  instrument: 0.381,
  /** A utility drawer: 14.5 in inside (Middle Atlantic UD2). */
  drawer: 0.368,
  /** A cantilever shelf. */
  shelf: 0.356,
  /** A drive array, 20 in. */
  drives: 0.508,
  /** A deep server-style chassis, 26 in. */
  deep: 0.66,
} as const;

const add = (
  parent: Object3D,
  geometry: BufferGeometry,
  material: Material | Material[],
  x = 0,
  y = 0,
  z = 0,
) => {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
const box = (
  parent: Object3D,
  w: number,
  h: number,
  d: number,
  material: Material | Material[],
  x = 0,
  y = 0,
  z = 0,
) => add(parent, new BoxGeometry(w, h, d), material, x, y, z);

/** A repeating pattern drawn once on a small canvas, for perforations and rails. */
function pattern(
  kit: PanelKit,
  size: number,
  draw: (c: CanvasRenderingContext2D, size: number) => void,
) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d')!, size);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  kit.textures.push(texture);
  return texture;
}
const perforation = (kit: PanelKit, colour: string) =>
  pattern(kit, 16, (c, s) => {
    c.fillStyle = colour;
    c.fillRect(0, 0, s, s);
    c.fillStyle = '#0b0b0c';
    c.beginPath();
    c.arc(s / 2, s / 2, s * 0.28, 0, Math.PI * 2);
    c.fill();
  });
/** A material with a texture tiled `rx` by `ry` times. */
function tiled(kit: PanelKit, texture: Texture, rx: number, ry: number) {
  const map = texture.clone();
  map.repeat.set(rx, ry);
  map.needsUpdate = true;
  kit.textures.push(map);
  const material = createPs1Material({ map });
  kit.materials.push(material);
  return material as MeshBasicMaterial;
}

/** The finishes of rack equipment. */
export const RACK_COLOURS = {
  putty: '#cfc8b4',
  beige: '#d9cfb3',
  grey: '#8f9493',
  charcoal: '#3a3c3e',
  black: '#1d1e20',
  blue: '#2f5d8f',
  navy: '#22324f',
  olive: '#6b6e4a',
  green: '#4f6f5a',
  red: '#8e2a22',
  white: '#e7e6df',
} as const;
export type RackColour = keyof typeof RACK_COLOURS;

export type UnitStyle =
  | 'blank'
  | 'vented'
  | 'handles'
  | 'door'
  | 'drawer'
  | 'fans'
  | 'drives'
  | 'patch'
  | 'shelf'
  | 'controls'
  | 'display';

export interface RackUnitOptions {
  /** Height in rack units. */
  u: number;
  style: UnitStyle;
  colour?: RackColour;
  /** How far the chassis goes back, metres. */
  depth?: number;
  /** A door or drawer posed open. */
  open?: boolean;
  /** The maker's or model's name printed on the panel. */
  label?: string;
  /** Half-width units for a shelf, as colours; ignored for other styles. */
  halves?: RackColour[];
}

export interface RackUnitView {
  group: Group;
  u: number;
  depth: number;
  /** Where controls go on the panel, and how much room there is, metres. */
  face: Group;
  faceWidth: number;
}

export type RackStatus = 'off' | 'starting' | 'running' | 'fault';

/** One rectangular lens on a rack front, shared by its three status colours. */
export function createRackStatusIndicator(kit: PanelKit) {
  const group = new Group();
  group.name = 'Rack status indicator';
  box(group, 0.049, 0.022, 0.003, kitPaint(kit, '#101214'), 0, 0, 0);
  const materials = {
    off: kitPaint(kit, '#252a26'),
    amber: kitGlow(kit, '#d58b22'),
    green: kitGlow(kit, '#42b65a'),
    red: kitGlow(kit, '#c6372d'),
  };
  const lens = add(
    group,
    new PlaneGeometry(0.038, 0.012),
    materials.off,
    0,
    0,
    0.002,
  );
  lens.name = 'Rack status lens';
  // Lit by changing its paint: not merged with the still parts.
  lens.userData.live = true;
  return {
    group,
    set(state: RackStatus, seconds: number) {
      const lit =
        state === 'running' ||
        (state === 'starting' && Math.floor(seconds * 2.5) % 2 === 0) ||
        (state === 'fault' && Math.floor(seconds * 4) % 2 === 0);
      lens.material = lit
        ? materials[
            state === 'starting' ? 'amber' : state === 'fault' ? 'red' : 'green'
          ]
        : materials.off;
      lens.userData.status = state;
      lens.userData.lit = lit;
    },
  };
}

/**
 * A rack-mount unit: a front panel with ears and their screws, a chassis
 * behind it, and a face to suit its style.
 */
export function createRackUnit(
  kit: PanelKit,
  {
    u,
    style,
    colour = 'grey',
    depth = DEPTHS.instrument,
    label,
    halves,
    open = false,
  }: RackUnitOptions,
): RackUnitView {
  const group = new Group();
  group.name = `${u}U ${style} unit`;
  const height = u * U - PANEL_CLEARANCE;
  const paint = kitPaint(kit, RACK_COLOURS[colour], 0.1);
  const dark = kitPaint(kit, '#141415');
  const screw = kitPaint(kit, '#c3c6c7', 0.7);
  // Blanking plates are 1/8 in aluminium; chassis panels 3/16 in.
  const panelDepth = style === 'blank' ? 0.0032 : 0.0048;
  const chassisDepth =
    style === 'blank' ? 0 : style === 'shelf' ? depth : depth;
  // The panel and its ears.
  const panel = box(
    group,
    PANEL_WIDTH,
    height,
    panelDepth,
    paint,
    0,
    height / 2,
    -panelDepth / 2,
  );
  panel.name = `${style} panel`;
  for (const side of [-1, 1])
    for (let k = 0; k < Math.max(1, Math.min(2, u)); k++) {
      const y = u === 1 ? height / 2 : k === 0 ? U / 2 : height - U / 2;
      add(
        group,
        new CylinderGeometry(0.0035, 0.0035, 0.002, 8),
        screw,
        side * RAIL_X,
        y,
        0.001,
      ).rotation.x = Math.PI / 2;
    }
  // The chassis.
  if (chassisDepth > 0 && style !== 'shelf')
    box(
      group,
      CHASSIS_WIDTH,
      height - 0.002,
      chassisDepth,
      paint,
      0,
      height / 2,
      -panelDepth - chassisDepth / 2,
    );
  const face = new Group();
  face.position.set(0, height / 2, 0.0005);
  group.add(face);
  const faceWidth = PANEL_WIDTH - 0.07;
  const title = (text: string, x: number, y: number, ink = '#f1eee4') => {
    const mark = createMicroLabel(kit, text, {
      height: Math.min(0.006, height * 0.18),
      ink,
    });
    mark.position.set(x, y, 0.001);
    face.add(mark);
  };
  const ink = ['white', 'putty', 'beige'].includes(colour)
    ? '#25241f'
    : '#ece8dc';
  /** Pose a door or drawer: 0 shut, 1 open. */
  let pose: (amount: number) => void = () => {};

  switch (style) {
    case 'blank':
      break;
    case 'vented': {
      const grille = tiled(
        kit,
        perforation(kit, RACK_COLOURS[colour]),
        40,
        Math.round(8 * u),
      );
      add(
        face,
        new PlaneGeometry(faceWidth, height * 0.75),
        grille,
        0,
        0,
        0.0002,
      );
      break;
    }
    case 'handles': {
      for (const side of [-1, 1]) {
        const handle = new Group();
        handle.position.set(side * (PANEL_WIDTH / 2 - 0.045), 0, 0);
        face.add(handle);
        const bar = Math.max(0.03, height - 0.02);
        box(handle, 0.008, bar, 0.008, screw, 0, 0, 0.03);
        for (const end of [-1, 1])
          box(handle, 0.008, 0.008, 0.03, screw, 0, (end * bar) / 2, 0.015);
      }
      title(label ?? 'MODEL 2400', -0.1, height / 2 - 0.012, ink);
      add(
        face,
        new CylinderGeometry(0.003, 0.003, 0.002, 8),
        kitGlow(kit, '#4bff5a'),
        0.12,
        height / 2 - 0.012,
        0.001,
      ).rotation.x = Math.PI / 2;
      break;
    }
    case 'door': {
      // A little hinged door over the middle of the panel, with a knurled latch.
      const doorWidth = faceWidth * 0.62;
      const doorHeight = height - 0.012;
      const hinge = new Group();
      hinge.position.set(-doorWidth / 2, 0, 0.001);
      face.add(hinge);
      box(
        hinge,
        doorWidth,
        doorHeight,
        0.004,
        kitPaint(kit, RACK_COLOURS[colour], 0.15),
        doorWidth / 2,
        0,
        0.002,
      );
      add(
        hinge,
        new CylinderGeometry(0.004, 0.004, 0.006, 10),
        screw,
        doorWidth - 0.012,
        0,
        0.007,
      ).rotation.x = Math.PI / 2;
      const mark = createMicroLabel(kit, label ?? 'ACCESS', {
        height: 0.005,
        ink,
      });
      mark.position.set(doorWidth / 2, 0, 0.0042);
      hinge.add(mark);
      // Behind it, a recess with a fuse and a few switches.
      box(
        face,
        doorWidth - 0.004,
        doorHeight - 0.004,
        0.0005,
        dark,
        0,
        0,
        0.0002,
      );
      for (let i = 0; i < 3; i++)
        box(
          face,
          0.006,
          0.012,
          0.008,
          kitPaint(kit, '#c9c4ad'),
          -doorWidth / 3 + i * 0.02,
          0,
          0.004,
        );
      pose = (a) => (hinge.rotation.y = -1.7 * a);
      title(
        label ? '' : 'MODEL 610',
        faceWidth / 2 - 0.035,
        height / 2 - 0.01,
        ink,
      );
      break;
    }
    case 'drawer': {
      const drawer = new Group();
      group.add(drawer);
      box(
        drawer,
        PANEL_WIDTH - 0.004,
        height - 0.004,
        0.006,
        paint,
        0,
        height / 2,
        0.003,
      );
      box(
        drawer,
        CHASSIS_WIDTH - 0.01,
        height - 0.012,
        0.35,
        dark,
        0,
        height / 2,
        -0.175,
      );
      const pull = new Group();
      pull.position.set(0, height / 2, 0.006);
      drawer.add(pull);
      box(pull, 0.12, 0.012, 0.016, screw, 0, 0, 0.012);
      title(label ?? 'DRAWER', 0, height / 2 - 0.012, ink);
      pose = (a) => (drawer.position.z = 0.3 * a);
      break;
    }
    case 'fans': {
      const fans = Math.max(2, Math.min(4, u + 1));
      const grille = kitPaint(kit, '#202122');
      for (let i = 0; i < fans; i++) {
        const x = (i - (fans - 1) / 2) * (faceWidth / fans);
        const radius = Math.min(height * 0.42, faceWidth / fans / 2.4);
        add(
          face,
          new CylinderGeometry(radius, radius, 0.002, 20),
          grille,
          x,
          0,
          0.001,
        ).rotation.x = Math.PI / 2;
        for (let r = 1; r <= 3; r++)
          add(
            face,
            new CylinderGeometry(
              radius * (r / 3.4),
              radius * (r / 3.4),
              0.0006,
              20,
              1,
              true,
            ),
            screw,
            x,
            0,
            0.0025,
          ).rotation.x = Math.PI / 2;
      }
      break;
    }
    case 'drives': {
      // Drive bays: sleds with their activity lights.
      const bays = 4;
      const bayWidth = (faceWidth - 0.02) / bays;
      for (let i = 0; i < bays; i++) {
        const x = (i - (bays - 1) / 2) * bayWidth;
        box(
          face,
          bayWidth - 0.006,
          height - 0.016,
          0.006,
          kitPaint(kit, '#b8b2a0'),
          x,
          0,
          0.003,
        );
        box(
          face,
          bayWidth * 0.5,
          0.004,
          0.004,
          dark,
          x,
          -height / 2 + 0.016,
          0.007,
        );
        const light = add(
          face,
          new CylinderGeometry(0.002, 0.002, 0.002, 8),
          kitGlow(kit, i % 2 ? '#ffb43a' : '#4bff5a'),
          x + bayWidth * 0.32,
          height / 2 - 0.016,
          0.007,
        );
        light.rotation.x = Math.PI / 2;
        // Named, so a room can flicker it as the drive is busy.
        light.name = 'Drive activity light';
      }
      break;
    }
    case 'patch': {
      const sockets = 16;
      const jack = kitPaint(kit, '#c7c9ca', 0.7);
      for (let row = 0; row < Math.min(2, u); row++)
        for (let i = 0; i < sockets; i++) {
          const x = (i - (sockets - 1) / 2) * (faceWidth / sockets);
          const y = u === 1 ? 0 : row === 0 ? height * 0.2 : -height * 0.2;
          add(
            face,
            new CylinderGeometry(0.0045, 0.0045, 0.006, 10),
            jack,
            x,
            y,
            0.003,
          ).rotation.x = Math.PI / 2;
          add(
            face,
            new CylinderGeometry(0.002, 0.002, 0.007, 8),
            dark,
            x,
            y,
            0.0035,
          ).rotation.x = Math.PI / 2;
        }
      break;
    }
    case 'shelf': {
      // A cantilever shelf, and half-width units standing on it.
      const shelf = kitPaint(kit, RACK_COLOURS[colour], 0.2);
      box(group, CHASSIS_WIDTH, 0.003, depth, shelf, 0, 0.0015, -depth / 2);
      box(group, CHASSIS_WIDTH, 0.03, 0.003, shelf, 0, 0.015, 0.0015);
      const halfWidth = HALF_WIDTH;
      (halves ?? ['putty', 'black']).forEach((c, i) => {
        const x = (i === 0 ? -1 : 1) * (halfWidth / 2 + 0.002);
        const h = height - 0.01;
        const unit = new Group();
        unit.position.set(x, 0.003, -0.005);
        group.add(unit);
        const body = kitPaint(kit, RACK_COLOURS[c], 0.1);
        box(unit, halfWidth, h, depth * 0.8, body, 0, h / 2, -depth * 0.4);
        box(
          unit,
          halfWidth,
          h,
          0.004,
          kitPaint(kit, RACK_COLOURS[c], 0.25),
          0,
          h / 2,
          0.002,
        );
        const name = createMicroLabel(kit, i === 0 ? 'HALF RACK' : 'MODEL 9½', {
          height: 0.005,
          ink: ['white', 'putty', 'beige'].includes(c) ? '#25241f' : '#ece8dc',
        });
        name.position.set(0, h - 0.012, 0.0045);
        unit.add(name);
        add(
          unit,
          new CylinderGeometry(0.003, 0.003, 0.002, 8),
          kitGlow(kit, '#ff4a2e'),
          halfWidth / 2 - 0.015,
          h - 0.012,
          0.0045,
        ).rotation.x = Math.PI / 2;
      });
      panel.visible = false;
      break;
    }
    case 'controls':
      title(label ?? 'CONTROL PANEL', 0, height / 2 - 0.01, ink);
      break;
    case 'display':
      // A recessed black window for a readout, fitted by the room.
      box(
        face,
        faceWidth * 0.55,
        height * 0.6,
        0.001,
        dark,
        -0.04,
        -0.004,
        0.0002,
      );
      break;
  }

  pose(open ? 1 : 0);
  return { group, u, depth: chassisDepth, face, faceWidth };
}

/**
 * A canvas header for a cabinet: its maker's mark and name (from the
 * brand's one definition, `src/toolkit/components/core/logic/brands.ts`) over a stripe in the
 * maker's colour.
 */
function headerArt(kit: PanelKit, id: BrandId, colour: string, width: number) {
  const brand = brandById(id);
  const px = Math.round(width * 800);
  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = 48;
  const c = canvas.getContext('2d')!;
  c.fillStyle = colour;
  c.fillRect(0, 0, px, 48);
  c.fillStyle = brand.colours[0];
  c.fillRect(0, 38, px, 4);
  drawBrandMark(c, brand, 26, 20, 14);
  // A light name on a dark header, the maker's own ink on a light one.
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(colour.slice(i, i + 2), 16));
  c.fillStyle =
    0.299 * r + 0.587 * g + 0.114 * b > 140 ? brand.colours[2] : '#f3f0e6';
  c.font = wordmarkFont(brand, 19);
  c.textAlign = 'left';
  c.textBaseline = 'middle';
  c.fillText(brand.wordmark ?? brand.name, 46, 21, px - 54);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  kit.textures.push(texture);
  const material = createPs1Material({ map: texture });
  kit.materials.push(material);
  return material;
}

export interface CabinetOptions {
  /** Its height in rack units. */
  units: number;
  width?: number;
  depth?: number;
  colour?: RackColour;
  /** The maker, named on the header. */
  brand: BrandId;
  door?: 'none' | 'glass' | 'perforated' | 'solid';
  /** Leave off the side panels, for a cabinet bayed to its neighbours. */
  sides?: { left: boolean; right: boolean };
  /** No header of its own: a suite's header spans it. */
  header?: boolean;
  /**
   * What it stands on: a 100 mm plinth (an industrial enclosure), castors
   * or levelling feet within its base frame (a server cabinet).
   */
  feet?: 'plinth' | 'castors' | 'levellers';
  /** The door posed open. */
  doorOpen?: boolean;
  /** A glass door's tint: blue-green, or dark smoked perspex. */
  glass?: 'tinted' | 'smoke';
}

export interface CabinetView {
  group: Group;
  units: number;
  width: number;
  depth: number;
  /** Fit a unit with its bottom at rack unit `at`, counting from 1 at the bottom. */
  mount(unit: RackUnitView, at: number): void;
  /**
   * Its door, for a part to work: the hinge to swing (open about -1.9),
   * the swing handle and lock, the leaf's width and the height of its
   * middle. Null without a door.
   */
  door: {
    hinge: Group;
    handle: Object3D;
    lock: Object3D;
    width: number;
    middle: number;
  } | null;
}

/**
 * A cabinet's frame below and above its rails, metres: a 42U APC
 * NetShelter SX stands 1991 mm and a 24U 1198 mm, which is the bay plus
 * about 125 mm. The branded header fills the top frame. An industrial
 * enclosure stands on a further 100 mm plinth (Rittal TS 8).
 */
export const BASE_FRAME = 0.055;
export const HEADER = 0.07;
export const PLINTH = 0.1;
/** A cabinet's whole height for `units`, metres. */
export const cabinetHeight = (units: number, plinth = false) =>
  (plinth ? PLINTH : 0) + BASE_FRAME + units * U + HEADER;

/**
 * An enclosed rack cabinet: a welded frame on a plinth or castors, side
 * and rear panels, front rails punched with square holes and numbered by
 * the unit, a roof, a branded header across the top of the front, and a
 * front door (tinted glass in a frame, perforated steel or solid) hinged
 * on the left with a swing handle.
 */
export function createRackCabinet(
  kit: PanelKit,
  options: CabinetOptions,
): CabinetView {
  const {
    units,
    width = 0.6,
    depth = 0.8,
    colour = 'grey',
    brand,
    door = 'none',
    sides = { left: true, right: true },
    header = true,
    feet = 'levellers',
    doorOpen = false,
    glass: tint = 'tinted',
  } = options;
  const group = new Group();
  group.name = `${units}U ${brand} cabinet`;
  const paint = kitPaint(kit, RACK_COLOURS[colour], 0.15);
  const frame = kitPaint(
    kit,
    RACK_COLOURS[colour === 'black' ? 'charcoal' : colour],
    0.2,
  );
  const black = kitPaint(kit, '#18191a');
  const bay = units * U;
  const floor = feet === 'plinth' ? PLINTH : 0;
  const bottom = floor + BASE_FRAME;
  const top = bottom + bay;
  const height = top + HEADER;
  // What it stands on.
  if (feet === 'plinth') {
    box(group, width, PLINTH, depth, black, 0, PLINTH / 2, -depth / 2);
    // The plinth's corner pieces, in the frame's colour.
    for (const sx of [-1, 1])
      box(
        group,
        0.06,
        PLINTH,
        0.004,
        frame,
        sx * (width / 2 - 0.03),
        PLINTH / 2,
        0.002,
      );
  } else
    for (const sx of [-1, 1])
      for (const sz of [0.06, depth - 0.06]) {
        if (feet === 'castors')
          add(
            group,
            new CylinderGeometry(0.025, 0.025, 0.02, 12),
            black,
            sx * (width / 2 - 0.06),
            0.025,
            -sz,
          ).rotation.z = Math.PI / 2;
        else
          add(
            group,
            new CylinderGeometry(0.02, 0.024, 0.02, 12),
            black,
            sx * (width / 2 - 0.06),
            0.01,
            -sz,
          );
      }
  // The base frame, closed in.
  box(
    group,
    width,
    BASE_FRAME - 0.02,
    depth - 0.02,
    paint,
    0,
    floor + 0.02 + (BASE_FRAME - 0.02) / 2,
    -depth / 2,
  );
  // The frame's corner posts and its top and bottom rings.
  const post = 0.03;
  for (const sx of [-1, 1])
    for (const sz of [post / 2, depth - post / 2])
      box(
        group,
        post,
        height - bottom,
        post,
        frame,
        sx * (width / 2 - post / 2),
        (bottom + height) / 2,
        -sz,
      );
  for (const y of [bottom + 0.01, height - 0.01]) {
    for (const sz of [post / 2, depth - post / 2])
      box(group, width, 0.02, post, frame, 0, y, -sz);
    for (const sx of [-1, 1])
      box(
        group,
        post,
        0.02,
        depth,
        frame,
        sx * (width / 2 - post / 2),
        y,
        -depth / 2,
      );
  }
  // Roof, rear and sides.
  box(group, width, 0.012, depth, paint, 0, height - 0.006, -depth / 2);
  box(
    group,
    width - 0.02,
    height - bottom,
    0.008,
    paint,
    0,
    (bottom + height) / 2,
    -depth + 0.004,
  );
  if (sides.left)
    box(
      group,
      0.01,
      height - bottom - 0.01,
      depth - 0.02,
      paint,
      -width / 2 + 0.005,
      (bottom + height) / 2,
      -depth / 2,
    );
  if (sides.right)
    box(
      group,
      0.01,
      height - bottom - 0.01,
      depth - 0.02,
      paint,
      width / 2 - 0.005,
      (bottom + height) / 2,
      -depth / 2,
    );
  // The rails, set back from the front, with their holes and numbers.
  const railZ = -0.08;
  // Square 3/8 in cage-nut holes, three to a unit: their centres 1/4 in,
  // 7/8 in and 1 1/2 in above the unit's bottom (1/2-5/8-5/8 in spacing).
  const holes = pattern(kit, 56, (c, s) => {
    c.fillStyle = '#9da1a2';
    c.fillRect(0, 0, s, s);
    c.fillStyle = '#121212';
    const size = (0.375 / 1.75) * s;
    for (const at of [0.25, 0.875, 1.5]) {
      const y = s - (at / 1.75) * s;
      c.fillRect((s - size) / 2, y - size / 2, size, size);
    }
  });
  const railMaterial = tiled(kit, holes, 1, units);
  for (const sx of [-1, 1]) {
    const rail = box(
      group,
      0.016,
      bay,
      0.002,
      railMaterial,
      sx * RAIL_X,
      bottom + bay / 2,
      railZ,
    );
    rail.material = railMaterial;
    box(
      group,
      0.002,
      bay,
      0.04,
      frame,
      sx * (RAIL_X + 0.009),
      bottom + bay / 2,
      railZ - 0.02,
    );
  }
  for (let k = 1; k <= units; k += 1) {
    if (k % 2 === 0 && units > 16) continue;
    const n = createMicroLabel(kit, String(k), {
      height: 0.004,
      ink: '#e9e6dc',
    });
    n.position.set(-RAIL_X - 0.017, bottom + (k - 0.5) * U, railZ + 0.002);
    group.add(n);
  }
  // A dark interior, so empty space reads as space.
  box(
    group,
    width - 0.06,
    bay,
    0.002,
    black,
    0,
    bottom + bay / 2,
    -depth + 0.012,
  );
  // The header.
  if (header) {
    const art = headerArt(
      kit,
      brand,
      RACK_COLOURS[colour === 'white' ? 'charcoal' : colour],
      width,
    );
    box(
      group,
      width,
      HEADER,
      0.02,
      [paint, paint, paint, paint, art, paint],
      0,
      top + HEADER / 2,
      0.0,
    );
  } else box(group, width, HEADER, 0.02, paint, 0, top + HEADER / 2, 0);
  // The door.
  let doorLeaf: Object3D;
  let doorParts: CabinetView['door'] = null;
  const hinge = new Group();
  hinge.position.set(-width / 2 + 0.01, 0, 0.022);
  group.add(hinge);
  if (door !== 'none') {
    const w = width - 0.02;
    const h = bay + 0.01;
    const y = bottom + bay / 2;
    if (door === 'glass') {
      const glass = createPs1Material({
        color: tint === 'smoke' ? '#1e2326' : '#4f6a72',
        transparent: true,
        opacity: tint === 'smoke' ? 0.55 : 0.35,
        side: DoubleSide,
      });
      kit.materials.push(glass);
      doorLeaf = box(hinge, w - 0.06, h - 0.06, 0.004, glass, w / 2, y, 0);
      for (const [fw, fh, fx, fy] of [
        [w, 0.03, w / 2, y + h / 2 - 0.015],
        [w, 0.03, w / 2, y - h / 2 + 0.015],
        [0.03, h, 0.015, y],
        [0.03, h, w - 0.015, y],
      ] as const)
        box(hinge, fw, fh, 0.016, paint, fx, fy, 0);
    } else if (door === 'perforated') {
      const material = tiled(
        kit,
        perforation(kit, RACK_COLOURS[colour]),
        Math.round(w * 90),
        Math.round(h * 90),
      );
      doorLeaf = box(hinge, w, h, 0.006, material, w / 2, y, 0);
    } else doorLeaf = box(hinge, w, h, 0.012, paint, w / 2, y, 0);
    doorLeaf.name = 'Cabinet door';
    // The swing handle and its lock.
    const handle = box(hinge, 0.025, 0.14, 0.02, black, w - 0.04, y, 0.014);
    handle.name = 'Cabinet door handle';
    const lock = add(
      hinge,
      new CylinderGeometry(0.007, 0.007, 0.006, 10),
      kitPaint(kit, '#c3c6c7', 0.7),
      w - 0.04,
      y + 0.09,
      0.014,
    );
    lock.rotation.x = Math.PI / 2;
    lock.name = 'Cabinet door lock';
    doorParts = { hinge, handle, lock, width: w, middle: y };
  }
  hinge.rotation.y = doorOpen ? -1.9 : 0;
  return {
    group,
    units,
    width,
    depth,
    mount(unit, at) {
      unit.group.position.set(0, bottom + (at - 1) * U, railZ + 0.002);
      group.add(unit.group);
    },
    door: doorParts,
  };
}

/**
 * Cabinets bayed into a suite: stood side by side with the sides between
 * them left off, under one long header with the maker's name.
 */
export function createCabinetSuite(
  kit: PanelKit,
  cabinets: Omit<CabinetOptions, 'brand' | 'sides' | 'header'>[],
  {
    brand,
    colour = 'grey' as RackColour,
  }: { brand: BrandId; colour?: RackColour },
) {
  const group = new Group();
  group.name = `${brand} suite`;
  const views: CabinetView[] = [];
  const total = cabinets.reduce((sum, c) => sum + (c.width ?? 0.6), 0);
  let x = -total / 2;
  cabinets.forEach((options, i) => {
    const view = createRackCabinet(kit, {
      ...options,
      colour,
      brand,
      header: false,
      sides: { left: i === 0, right: i === cabinets.length - 1 },
    });
    const w = view.width;
    view.group.position.x = x + w / 2;
    x += w;
    group.add(view.group);
    views.push(view);
  });
  const tallest = Math.max(...cabinets.map((c) => c.units));
  const onPlinth = cabinets.some((c) => c.feet === 'plinth');
  const art = headerArt(kit, brand, RACK_COLOURS[colour], total);
  const paint = kitPaint(kit, RACK_COLOURS[colour], 0.15);
  box(
    group,
    total + 0.002,
    HEADER,
    0.024,
    [paint, paint, paint, paint, art, paint],
    0,
    cabinetHeight(tallest, onPlinth) - HEADER / 2,
    0.002,
  );
  return { group, cabinets: views };
}

export interface RelayRackView {
  group: Group;
  units: number;
  mount(unit: RackUnitView, at: number): void;
}

/**
 * An open two-post relay rack, after the Chatsworth 55053-503: 84 in tall,
 * 45 units, two 3 in deep channel uprights on a 20.3 in by 15 in base,
 * tied by a top angle that carries the maker's name. Units hang on the
 * uprights by their ears.
 */
export function createRelayRack(
  kit: PanelKit,
  {
    units = 45,
    colour = 'black' as RackColour,
    brand,
  }: { units?: number; colour?: RackColour; brand: BrandId },
): RelayRackView {
  const group = new Group();
  group.name = `${units}U relay rack`;
  const paint = kitPaint(kit, RACK_COLOURS[colour], 0.2);
  const inch = 0.0254;
  const base = 3.5 * inch;
  const bay = units * U;
  const channel = 1.25 * inch;
  const channelDepth = 3 * inch;
  const uprightX = RAIL_X + channel / 2 - 0.006;
  // The base: two angle feet joined by a cross member.
  for (const sx of [-1, 1])
    box(
      group,
      2 * inch,
      base,
      15 * inch,
      paint,
      sx * (10.15 * inch - inch),
      base / 2,
      -channelDepth / 2,
    );
  box(
    group,
    20.3 * inch,
    1.5 * inch,
    2 * inch,
    paint,
    0,
    0.75 * inch,
    -channelDepth / 2,
  );
  for (const sx of [-1, 1]) {
    // A channel: a face with the holes, and two flanges back.
    box(
      group,
      channel,
      bay + 0.5 * inch,
      0.003,
      paint,
      sx * uprightX,
      base + bay / 2,
      -0.0015,
    );
    for (const fx of [-1, 1])
      box(
        group,
        0.003,
        bay + 0.5 * inch,
        channelDepth,
        paint,
        sx * uprightX + (fx * channel) / 2,
        base + bay / 2,
        -channelDepth / 2,
      );
  }
  const top = 84 * inch - base - bay;
  const art = headerArt(kit, brand, RACK_COLOURS[colour], 20.3 * inch);
  box(
    group,
    20.3 * inch,
    top,
    channelDepth,
    [paint, paint, paint, paint, art, paint],
    0,
    base + bay + top / 2,
    -channelDepth / 2,
  );
  return {
    group,
    units,
    mount(unit, at) {
      unit.group.position.set(0, base + (at - 1) * U, 0.006);
      group.add(unit.group);
    },
  };
}
