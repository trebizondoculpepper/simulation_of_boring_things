import {
  BoxGeometry,
  CanvasTexture,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from 'three';
import { createServiceMaterials } from './service-materials';
import type { ServiceMaterials } from './service-materials';
import {
  cableLadder,
  cableTray,
  acousticGrid,
  cellularBeam,
  detectorBatten,
  flowArrow,
  laggedDuct,
  metalDeck,
  pipeClip,
  pipeRun,
  spiralDuct,
  sprinklerHead,
  sprinklerPipe,
  standalone,
  strutTrapeze,
  swirlDiffuser,
  threadedRod,
  wireBasket,
} from './service-parts';
import type { PartSink } from './service-parts';
import type { Point } from './service-sweep';

/**
 * A specimen table: one of each part of the services ceiling
 * (`service-parts.ts`), each built on its own, laid out in a grid on a
 * long workshop table with a printed label, to be looked at close up.
 * Each specimen is a short run with one bend where the part bends.
 * Origin on the floor at the table's middle; its long side along x.
 */

export const SPECIMEN_TABLE = { w: 7.5, d: 1.6, top: 0.9, cell: 0.85 } as const;

interface Specimen {
  label: string;
  /** Build it about the cell's middle at (0, 0), on a table top at y = 0. */
  make(sink: PartSink, m: ServiceMaterials): void;
}

/** An L-shaped run in a cell: along x, then a bend and along z. */
const ell = (a = 0.32): Point[] => [
  [-a, -0.22],
  [0.12, -0.22],
  [0.12, a],
];
const straight = (a = 0.34): Point[] => [
  [-a, 0],
  [a, 0],
];

const SPECIMENS: readonly Specimen[] = [
  {
    label: 'Metal deck',
    make: (s, m) =>
      metalDeck(s, m, {
        minX: -0.35,
        maxX: 0.35,
        minZ: -0.3,
        maxZ: 0.3,
        y: 0.02,
      }),
  },
  {
    label: 'Cellular beam',
    make: (s, m) =>
      cellularBeam(s, m, {
        x: 0,
        minZ: -0.38,
        maxZ: 0.38,
        top: 0.47,
        depth: 0.45,
      }),
  },
  {
    label: 'Cable tray',
    make: (s, m) =>
      cableTray(s, m, { points: ell(), y: 0.035, width: 0.2, bend: 0.15 }),
  },
  {
    label: 'Wire basket',
    make: (s, m) =>
      wireBasket(s, m, { points: ell(), y: 0.04, width: 0.15, bend: 0.12 }),
  },
  {
    label: 'Cable ladder',
    make: (s, m) =>
      cableLadder(s, m, {
        points: ell(0.3),
        y: 0.05,
        width: 0.3,
        bend: 0.2,
        cables: 4,
      }),
  },
  {
    label: 'Spiral duct',
    make: (s, m) =>
      spiralDuct(s, m, { points: ell(), y: 0.13, diameter: 0.25, bend: 0.2 }),
  },
  {
    label: 'Lagged duct',
    make: (s, m) =>
      laggedDuct(s, m, { points: ell(), y: 0.15, diameter: 0.3, bend: 0.22 }),
  },
  {
    label: 'Swirl diffuser',
    make: (s, m) => {
      spiralDuct(s, m, { points: straight(0.3), y: 0.6, diameter: 0.25 });
      swirlDiffuser(s, m, 0, 0.6, 0, { drop: 0.45, radius: 0.25 });
    },
  },
  {
    label: 'Sprinkler pipe',
    make: (s, m) =>
      sprinklerPipe(s, m, {
        points: ell(),
        y: 0.3,
        lengths: 0.45,
        heads: [[0.12, 0.15]],
      }),
  },
  {
    label: 'Grooved coupling',
    make: (s) => {
      // Two short lengths, a coupling between them.
      pipeRun(s, 'grooved-fire', {
        points: straight(0.3),
        y: 0.07,
        diameter: 0.09,
        lengths: 0.3,
      });
    },
  },
  {
    label: 'Sprinkler head',
    make: (s, m) => {
      pipeRun(s, 'grooved-fire', {
        points: straight(0.15),
        y: 0.32,
        diameter: 0.09,
      });
      sprinklerHead(s, m, 0, 0.32, 0);
    },
  },
  {
    label: 'Pipe',
    make: (s) =>
      pipeRun(s, 'steel-screwed', {
        points: ell(),
        y: 0.035,
        diameter: 0.07,
        colour: '#9a4a2c',
      }),
  },
  {
    label: 'Conduit',
    make: (s) =>
      pipeRun(s, 'steel-screwed', { points: ell(), y: 0.015, diameter: 0.03 }),
  },
  {
    label: 'Strut trapeze',
    make: (s, m) => {
      strutTrapeze(s, m, 0, 0.1, 0, [1, 0], 0.3, 0.55);
      cableTray(s, m, {
        points: straight(0.3),
        y: 0.135,
        width: 0.3,
        cables: 3,
      });
    },
  },
  {
    label: 'Pipe clip',
    make: (s, m) => {
      pipeRun(s, 'steel-screwed', {
        points: straight(0.3),
        y: 0.1,
        diameter: 0.07,
        colour: '#9a4a2c',
      });
      pipeClip(s, m, 0, 0.1, 0, [1, 0], 0.07, 0.55);
    },
  },
  {
    label: 'Flow arrow',
    make: (s, m) => {
      spiralDuct(s, m, { points: straight(0.32), y: 0.13, diameter: 0.25 });
      // On top here, to be seen on the table: the ceiling's are underneath.
      flowArrow(s, m, 0, 0.26 + 0.006, 0, [1, 0], 0.2);
    },
  },
  {
    label: 'Smoke detector',
    make: (s, m) =>
      detectorBatten(s, m, {
        minX: -0.34,
        maxX: 0.34,
        z: 0,
        y: 0.15,
        detectors: [0.05],
      }),
  },
  {
    label: 'Acoustic grid',
    make: (s, m) =>
      acousticGrid(s, m, {
        minX: -0.34,
        maxX: 0.34,
        minZ: -0.3,
        maxZ: 0.3,
        bottom: 0,
        cell: 0.3,
        depth: 0.12,
        thickness: 0.03,
      }),
  },
  {
    label: 'Threaded rod',
    make: (s, m) => threadedRod(s, m, 0, 0, 0.55, 0),
  },
];

/** A printed label, `w` × `h` m, lying on the table, readable from +z. */
function label(text: string, w: number, h: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = Math.round((512 * h) / w);
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#f1efe6';
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.fillStyle = '#1d2125';
  c.font = `bold ${Math.round(canvas.height * 0.5)}px Arial, Helvetica, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(
    text.toUpperCase(),
    canvas.width / 2,
    canvas.height / 2,
    canvas.width * 0.92,
  );
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const mesh = new Mesh(
    new PlaneGeometry(w, h),
    new MeshBasicMaterial({ map: texture }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.name = `Label ${text}`;
  return mesh;
}

export function createServiceSpecimenTable(
  materials: ServiceMaterials = createServiceMaterials(),
) {
  const t = SPECIMEN_TABLE;
  const group = new Group();
  group.name = 'Services ceiling specimen table';
  const steel = new MeshStandardMaterial({ color: '#33373a', roughness: 0.6 });
  const board = new MeshStandardMaterial({ color: '#b8b9b2', roughness: 0.8 });
  const top = new Mesh(new BoxGeometry(t.w, 0.04, t.d), board);
  top.position.y = t.top - 0.02;
  group.add(top);
  for (const x of [-1, 1])
    for (const z of [-1, 1]) {
      const leg = new Mesh(new BoxGeometry(0.05, t.top - 0.04, 0.05), steel);
      leg.position.set(
        x * (t.w / 2 - 0.08),
        (t.top - 0.04) / 2,
        z * (t.d / 2 - 0.08),
      );
      group.add(leg);
    }
  // Two rows of cells, eight to a row, a label in front of each.
  const perRow = Math.ceil(SPECIMENS.length / 2);
  const cellW = t.w / perRow;
  SPECIMENS.forEach((specimen, i) => {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const x = -t.w / 2 + cellW * (col + 0.5);
    const z = row === 0 ? -t.d / 4 : t.d / 4;
    const part = standalone(specimen.label, (sink) =>
      specimen.make(sink, materials),
    );
    part.scale.setScalar(Math.min(1, (cellW * 0.95) / t.cell));
    part.position.set(x, t.top, z - 0.04);
    group.add(part);
    const tag = label(specimen.label, cellW * 0.85, 0.07);
    tag.position.set(x, t.top + 0.002, z + t.d / 4 - 0.06);
    group.add(tag);
  });
  return group;
}

/** The table's footprint about its origin, for walking collision. */
export const specimenTableFootprint = (x: number, z: number) => ({
  minX: x - SPECIMEN_TABLE.w / 2,
  maxX: x + SPECIMEN_TABLE.w / 2,
  minZ: z - SPECIMEN_TABLE.d / 2,
  maxZ: z + SPECIMEN_TABLE.d / 2,
});
