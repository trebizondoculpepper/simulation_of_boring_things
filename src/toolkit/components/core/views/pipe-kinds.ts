import {
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three';
import type { BufferGeometry, Material } from 'three';
import type { Vec3 } from '../logic/pipe-route';
import { createFlexHose, createPipeRun, putPipeRun } from './pipe-route';
import type {
  Penetration,
  PipeEnd,
  PipeJoint,
  PipeMaterials,
} from './pipe-route';

/**
 * The kinds of pipe in the game, each as it is made and joined: the one
 * catalogue for real plant and decorative ceilings alike. A kind sets its
 * joint system (PVC is solvent-welded into socket fittings; copper takes
 * capillary fittings; steel is screwed, flanged, grooved or welded), its
 * bends, its finish and colour, the outside diameters it comes in, and
 * whether it is lagged or flexible. Any kind can be given another colour.
 * Metres; sizes are outside diameters, as the trade gives them for plastic
 * and copper (steel's are its nominal bore's outside diameter).
 */

export type PipeKindId =
  | 'pvc-pressure'
  | 'pvc-drain'
  | 'abs-chemical'
  | 'copper'
  | 'steel-screwed'
  | 'steel-flanged'
  | 'grooved-fire'
  | 'stainless'
  | 'lagged-heating'
  | 'chemical-tube'
  | 'pressure-hose'
  | 'flue'
  | 'twin-wall-flue';

export interface PipeKind {
  name: string;
  /** What it carries, in the game's plant. */
  carries: string;
  joint: PipeJoint;
  /** The pipe's colour and finish, and its fittings' and bolts' if different. */
  colour: string;
  roughness: number;
  metalness: number;
  fittingColour?: string;
  boltColour?: string;
  /** Outside diameters it comes in, m. */
  sizes: readonly number[];
  /** A bend's radius in diameters, if not its joint's usual. */
  bend?: number;
  /** The lengths it comes in, m, if not its joint's usual. */
  lengths?: number;
  /** Lagging: its thickness, m, and the cladding's colour. */
  insulation?: { thickness: number; colour: string };
  /** Flexible: drawn as a smooth hose through its points, not bent pipe. */
  flexible?: boolean;
}

export const PIPE_KINDS: Record<PipeKindId, PipeKind> = {
  'pvc-pressure': {
    name: 'PVC-U pressure pipe, solvent-welded',
    carries: 'pool water: circulation, filters, balance tanks',
    joint: 'socket',
    colour: '#8c9295',
    roughness: 0.45,
    metalness: 0,
    sizes: [
      0.032, 0.04, 0.05, 0.063, 0.075, 0.09, 0.11, 0.16, 0.2, 0.25, 0.315,
      0.355, 0.4,
    ],
  },
  'pvc-drain': {
    name: 'PVC-U soil and drainage pipe',
    carries: 'backwash, overflows and drains, by gravity',
    joint: 'socket',
    colour: '#a7aaa6',
    roughness: 0.5,
    metalness: 0,
    sizes: [0.11, 0.16, 0.2, 0.25, 0.315],
    bend: 1.5,
  },
  'abs-chemical': {
    name: 'ABS chemical pipe, solvent-welded',
    carries: 'dosing chemicals, rigid runs',
    joint: 'socket',
    colour: '#e8e4d6',
    roughness: 0.4,
    metalness: 0,
    sizes: [0.016, 0.02, 0.025, 0.032],
  },
  copper: {
    name: 'Copper tube, capillary fittings',
    carries: 'mains water, hot water, small heating',
    joint: 'solder',
    colour: '#b87333',
    roughness: 0.35,
    metalness: 0.85,
    sizes: [0.015, 0.022, 0.028, 0.035, 0.042, 0.054],
  },
  'steel-screwed': {
    name: 'Galvanised steel, screwed',
    carries: 'gas, compressed air, small high-pressure water',
    joint: 'thread',
    colour: '#a3a9ab',
    roughness: 0.4,
    metalness: 0.6,
    fittingColour: '#6f7476',
    sizes: [0.0213, 0.0269, 0.0337, 0.0424, 0.0483, 0.0603],
  },
  'steel-flanged': {
    name: 'Carbon steel, flanged',
    carries: 'large mains: boiler flow and return, heat exchangers',
    joint: 'flange',
    colour: '#4c5355',
    roughness: 0.5,
    metalness: 0.4,
    boltColour: '#a8a26c',
    sizes: [0.0603, 0.0889, 0.1143, 0.1683, 0.2191, 0.273],
  },
  'grooved-fire': {
    name: 'Grooved steel, mechanical couplings',
    carries: 'sprinkler and fire mains',
    joint: 'groove',
    colour: '#b0573a',
    roughness: 0.6,
    metalness: 0.1,
    fittingColour: '#d8352c',
    boltColour: '#d6b23a',
    sizes: [0.0337, 0.0483, 0.0603, 0.0889, 0.1143, 0.1683],
  },
  stainless: {
    name: 'Stainless steel, welded',
    carries: 'ozone and treated water, sample lines',
    joint: 'weld',
    colour: '#c9cdcf',
    roughness: 0.25,
    metalness: 0.9,
    sizes: [0.0213, 0.0337, 0.0483, 0.0603, 0.0889, 0.1143],
  },
  'lagged-heating': {
    name: 'Steel heating pipe, lagged and clad',
    carries: 'the heating ring (LTHW): hot, so insulated',
    joint: 'flange',
    colour: '#4c5355',
    roughness: 0.5,
    metalness: 0.4,
    sizes: [0.0337, 0.0483, 0.0603, 0.0889, 0.1143],
    insulation: { thickness: 0.04, colour: '#c8ccce' },
  },
  'chemical-tube': {
    name: 'Polyethylene dosing tube',
    carries: 'chemicals from dosing pumps to injection points',
    joint: 'none',
    colour: '#efe6cf',
    roughness: 0.5,
    metalness: 0,
    sizes: [0.006, 0.008, 0.01, 0.012],
    flexible: true,
  },
  flue: {
    name: 'Single-wall flue pipe',
    carries: 'boiler flue gases, inside the boiler house',
    joint: 'band',
    colour: '#2d3133',
    roughness: 0.35,
    metalness: 0.3,
    boltColour: '#c9cdcf',
    sizes: [0.13, 0.15, 0.2, 0.25, 0.3, 0.35],
    lengths: 1,
  },
  'twin-wall-flue': {
    name: 'Insulated twin-wall flue',
    carries: 'boiler flue gases up through floors and to the roof',
    joint: 'band',
    colour: '#dfe3e5',
    roughness: 0.3,
    metalness: 0.55,
    sizes: [0.2, 0.25, 0.3, 0.35, 0.45, 0.55],
    bend: 1.5,
    lengths: 1,
  },
  'pressure-hose': {
    name: 'Braided high-pressure hose',
    carries: 'flexible connections to pumps and machines',
    joint: 'none',
    colour: '#bfc4c6',
    roughness: 0.3,
    metalness: 0.7,
    sizes: [0.02, 0.025, 0.032, 0.04],
    flexible: true,
  },
};

const cache = new Map<string, MeshStandardMaterial>();
const paint = (colour: string, roughness: number, metalness: number) => {
  const key = `${colour}|${roughness}|${metalness}`;
  let m = cache.get(key);
  if (!m) {
    m = new MeshStandardMaterial({
      color: new Color(colour),
      roughness,
      metalness,
    });
    cache.set(key, m);
  }
  return m;
};

/** A kind's materials, its pipe in `colour` if given. Shared across runs. */
export function pipeKindMaterials(
  id: PipeKindId,
  colour?: string,
): PipeMaterials {
  const k = PIPE_KINDS[id];
  return {
    pipe: paint(colour ?? k.colour, k.roughness, k.metalness),
    fitting: paint(
      k.fittingColour ?? colour ?? k.colour,
      k.roughness,
      k.metalness,
    ),
    bolt: paint(k.boltColour ?? '#9aa0a2', 0.35, 0.7),
    cladding: k.insulation ? paint(k.insulation.colour, 0.35, 0.8) : undefined,
    seal: paint('#1c1e1f', 0.85, 0),
  };
}

/** The nearest size a kind comes in to `od`. */
export const nearestSize = (id: PipeKindId, od: number) =>
  PIPE_KINDS[id].sizes.reduce((best, s) =>
    Math.abs(s - od) < Math.abs(best - od) ? s : best,
  );

export interface PipeOptions {
  /** Another colour for the pipe (a service colour, a painted main). */
  colour?: string;
  /** The lengths it comes in, m, if not the usual (a joint between each). */
  lengths?: number;
  /**
   * A flexible kind laid in neat square runs and clipped, as dosing tube
   * is along a wall, instead of hanging in free curves.
   */
  laid?: boolean;
  /** The surfaces it passes through, each with its grommet, sleeve… */
  through?: readonly Penetration[];
  /** Each end's finish: open into a fitting, capped, or valved and capped. */
  ends?: readonly [PipeEnd, PipeEnd];
}

const style = (id: PipeKindId, od: number, options: PipeOptions) => {
  const k = PIPE_KINDS[id];
  return {
    od,
    joint: k.joint,
    bend: k.bend,
    insulation: k.insulation?.thickness,
    lengths: options.lengths ?? k.lengths,
    through: options.through,
    ends: options.ends,
  };
};

/** A run of `id` pipe of outside diameter `od` through `points`. */
export function createPipe(
  id: PipeKindId,
  od: number,
  points: readonly Vec3[],
  options: PipeOptions = {},
) {
  const materials = pipeKindMaterials(id, options.colour);
  if (PIPE_KINDS[id].flexible && !options.laid)
    return createFlexHose(points, materials.pipe, od);
  return createPipeRun(points, materials, style(id, od, options));
}

/** A visible three-way fitting centred where a branch meets a straight main. */
export function createPipeTee(
  id: PipeKindId,
  mainOd: number,
  branchOd: number,
  at: Vec3,
  mainDirection: Vec3,
  branchDirection: Vec3,
) {
  const main = new Vector3(...mainDirection).normalize();
  const branch = new Vector3(...branchDirection).normalize();
  if (Math.abs(main.dot(branch)) > 1e-6)
    throw new Error('A pipe tee branch must be perpendicular to its main');
  const materials = pipeKindMaterials(id);
  const fitting = materials.cladding ?? materials.fitting ?? materials.pipe;
  const group = new Group();
  group.name = `Pipe tee (${id}, ${Math.round(mainOd * 1000)} × ${Math.round(branchOd * 1000)} mm)`;
  group.position.set(...at);
  const sleeve = (
    od: number,
    length: number,
    direction: Vector3,
    offset: number,
  ) => {
    const radius = od / 2 + (PIPE_KINDS[id].insulation?.thickness ?? 0);
    const mesh = new Mesh(
      new CylinderGeometry(
        radius * 1.16,
        radius * 1.16,
        length,
        od > 0.15 ? 24 : 16,
      ),
      fitting,
    );
    mesh.position.copy(direction).multiplyScalar(offset);
    mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction);
    group.add(mesh);
  };
  sleeve(mainOd, mainOd * 2.2, main, 0);
  sleeve(branchOd, branchOd * 1.1, branch, branchOd * 0.55);
  return group;
}

/** The same run, put into a batch by material (a services ceiling's sink). */
export function putPipe(
  sink: { put(material: Material, geometry: BufferGeometry): void },
  id: PipeKindId,
  od: number,
  points: readonly Vec3[],
  options: PipeOptions = {},
) {
  putPipeRun(
    sink,
    points,
    pipeKindMaterials(id, options.colour),
    style(id, od, options),
  );
}
