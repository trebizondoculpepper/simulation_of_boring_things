import { Box3, BoxGeometry, Group, Mesh, Vector3 } from 'three';
import type { Object3D } from 'three';
import { ARCHITECTURAL_FITTINGS } from '../../components/architectural/logic/architectural-fittings';
import type { ArchitecturalKind } from '../../components/architectural/logic/architectural-fittings';
import type { ArchitecturalServices } from '../../components/architectural/logic/warehouse-services';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import {
  createMicroLabel,
  kitPaint,
} from '../../components/core/views/eighties-controls';
import { architecturalPart } from '../../components/architectural/parts/architectural-parts';
import type { PartSet } from '../../components/core/parts/parts';

/**
 * The fire safety fittings in the architectural catalogue, for dev2: the
 * active systems (alarm, detection, sprinklers, extinguishers) and, shown
 * in both rooms, the emergency lighting and exit signs (`SHARED_KINDS`).
 */
export const FIRE_KINDS: readonly ArchitecturalKind[] = [
  'callpoint',
  'sounder',
  'detector',
  'firepanel',
  'sprinkler',
  'valves',
  'testvalve',
  'bell',
  'water',
  'co2',
  'emergency',
  'bulkhead',
  'exit',
  'pipe',
];

/**
 * Lighting belongs with the building fittings too: the emergency light and
 * exit sign are shown in dev3 as well as dev2.
 */
export const SHARED_KINDS: readonly ArchitecturalKind[] = [
  'emergency',
  'bulkhead',
  'exit',
];

/**
 * A place for a specimen: on a wall (its centre line at x, z), facing
 * into the room, a board's middle at height y; `tall` if a tall fitting
 * may stand on the floor there instead.
 */
export interface SpecimenPlace {
  x: number;
  z: number;
  facing: number;
  y: number;
  tall?: boolean;
  /** Its board's width, metres, if not the usual 2.6. */
  width?: number;
}

/** Each specimen's board, metres, and how far it stands off the wall line. */
const BOARD = { w: 2.6, h: 0.9 };
const OFF = 0.15 + 0.04;

/** A label plate: a fitting's name and the product it copies. */
export function fittingCaption(
  kit: PanelKit,
  parent: Object3D,
  kind: ArchitecturalKind,
  x: number,
  y: number,
  width: number,
) {
  const spec = ARCHITECTURAL_FITTINGS[kind];
  const mesh = createMicroLabel(kit, `${spec.title}\n${spec.reference}`, {
    height: 0.03,
    ink: '#253a42',
    plate: '#eef0ea',
    maxWidth: width,
  });
  mesh.position.set(x, y, 0.03);
  parent.add(mesh);
  return mesh;
}

/**
 * Show catalogue fittings (`src/toolkit/components/architectural/logic/architectural-fittings.ts`) as
 * numbered specimens, each the same working part the warehouse installs
 * (`architecturalPart`): each measured, so a small one sits in the middle
 * of a board at eye level and a tall one (an extinguisher, a riser) stands
 * on the floor at a place marked `tall`, its label above it; numbered in
 * the order of `places`. Returns the kinds in their numbered order.
 */
export function showSpecimens(
  kit: PanelKit,
  room: Object3D,
  parts: PartSet,
  services: ArchitecturalServices,
  kinds: readonly ArchitecturalKind[],
  places: readonly SpecimenPlace[],
) {
  const backing = kitPaint(kit, '#c9cec4');
  const made = kinds.map((kind) => {
    const part = parts.add(
      architecturalPart(kit, kind, services, {
        testers: kind === 'socket',
        fallDistance: 1.5,
        length: 1.2,
      }),
    );
    part.object.updateMatrixWorld(true);
    const box = new Box3().setFromObject(part.object);
    return { kind, part, box, tall: box.max.y - box.min.y > 0.85 };
  });
  const tallPlaces = places.filter((p) => p.tall);
  const tall = made.filter((s) => s.tall);
  const small = made.filter((s) => !s.tall);
  const placed = [
    ...tall.map((s, i) => ({ ...s, place: tallPlaces[i] })),
    ...small.map((s, i) => ({
      ...s,
      place: places.filter(
        (p) => !tallPlaces.slice(0, tall.length).includes(p),
      )[i],
    })),
  ]
    .filter((s) => s.place)
    .sort((a, b) => places.indexOf(a.place) - places.indexOf(b.place));
  placed.forEach(({ kind, part, box, tall: standing, place }, i) => {
    const board = new Group();
    board.name = `Specimen: ${kind}`;
    board.position.set(
      place.x + Math.sin(place.facing) * OFF,
      place.y,
      place.z + Math.cos(place.facing) * OFF,
    );
    board.rotation.y = place.facing;
    room.add(board);
    const middle = box.getCenter(new Vector3());
    const height = box.max.y - box.min.y;
    // Its front against the board, centred on it; a tall one on the floor.
    part.object.position.set(
      part.object.position.x - middle.x,
      standing
        ? part.object.position.y - box.min.y - place.y
        : part.object.position.y - middle.y + 0.05,
      part.object.position.z - box.min.z + 0.04,
    );
    board.add(part.object);
    const top = standing ? height - place.y : BOARD.h / 2;
    const width = place.width ?? BOARD.w;
    if (!standing)
      board.add(new Mesh(new BoxGeometry(width, BOARD.h, 0.035), backing));
    fittingCaption(
      kit,
      board,
      kind,
      0,
      standing ? top + 0.2 : -BOARD.h / 2 - 0.1,
      width,
    );
    const number = createMicroLabel(kit, String(i + 1), {
      height: 0.1,
      ink: '#f5f5f5',
      plate: '#141414',
    });
    number.position.set(
      -width / 2 + 0.1,
      standing ? top + 0.2 : BOARD.h / 2 - 0.08,
      0.025,
    );
    board.add(number);
  });
  return placed.map((s) => s.kind);
}
