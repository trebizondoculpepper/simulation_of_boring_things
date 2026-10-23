import {
  BoxGeometry,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  PointLight,
} from 'three';
import type { Material, Points } from 'three';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import { createMicroLabel } from '../../../components/core/views/eighties-controls';
import {
  createPartSet,
  potentiometer,
} from '../../../components/core/parts/parts';
import type { Part } from '../../../components/core/parts/parts';
import { createPs1Material } from '../../../components/core/parts/ps1-material';
import { createBrandBadge } from '../../../components/core/views/brand-badge';
import { METRE } from '../../../components/core/logic/units';
import {
  dimmerOutput,
  fadeToward,
} from '../../../components/architectural/logic/architectural-lighting';

/**
 * Dev30's booths (lighting styles): the shell each style is shown in, a
 * stretch of wall and ceiling open to the front, on its own Lumenhaus
 * dimmer; and the small helpers its fittings are made with. Metres.
 */

/** A booth: its width, depth and ceiling height, metres. */
export const W = 3.2;
export const D = 2.6;
export const H = 3.0;
/** The booth's ceiling's underside. */
export const CEIL = H - 0.1;
/** Its front piers, where its controls are worked from outside. */
export const PIER = 0.16;

/** Each exhibit's own copy: the room places exhibits by their sizes, one each. */
export const SIZE = { w: W, d: D, h: H, mount: 'floor' } as const;

/** A light's intensity and reach in the room's units (its parents scale metres up). */
export const lamp = (colour: string, intensity: number, reach: number) =>
  new PointLight(colour, intensity * METRE * METRE, reach * METRE, 2);

export interface Booth {
  object: Group;
  parts: ReturnType<typeof createPartSet>;
  /** Its dimmer's output, 0 to 1, faded as a lamp follows it. */
  level: () => number;
  /** Step its dimmer's fade. */
  step(delta: number): void;
  /** Paint its ceiling's or back wall's underside. */
  ceiling: Mesh;
  back: Mesh;
}

/**
 * A booth's shell: a back wall, a ceiling, thin side walls and two front
 * piers, open to the front; on its right pier a Lumenhaus dimmer plate,
 * reached from outside, and any other controls given.
 */
export function booth(
  kit: PanelKit,
  title: string,
  {
    back,
    ceiling,
    sides,
    controls = [],
    initial = 0.8,
  }: {
    back?: Material;
    ceiling?: Material;
    sides?: Material;
    /** More controls on its pier, under its dimmer: each part and its legend. */
    controls?: { part: Part; text: string }[];
    initial?: number;
  } = {},
): Booth {
  const object = new Group();
  object.name = `${title} booth`;
  const plaster = createPs1Material({ color: '#d6d8d3', roughness: 0.92 });
  kit.materials.push(plaster);
  const add = (
    m: Material,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    object.add(mesh);
    return mesh;
  };
  const backWall = add(back ?? plaster, W, H, 0.1, 0, H / 2, -D / 2 + 0.05);
  const ceil = add(ceiling ?? plaster, W, 0.1, D, 0, H - 0.05, 0);
  for (const s of [-1, 1]) {
    add(sides ?? plaster, 0.06, H, D, s * (W / 2 - 0.03), H / 2, 0);
    add(
      plaster,
      PIER,
      H,
      PIER,
      s * (W / 2 - PIER / 2),
      H / 2,
      D / 2 - PIER / 2,
    );
  }
  // The dimmer plate, on the right pier's front face.
  const parts = createPartSet();
  const plate = new Group();
  plate.position.set(W / 2 - PIER / 2, 1.25, D / 2 + 0.002);
  object.add(plate);
  const face = new Mesh(
    new BoxGeometry(0.14, 0.2 + 0.09 * controls.length, 0.012),
    plaster,
  );
  face.position.set(0, -0.045 * controls.length, 0.006);
  plate.add(face);
  const dimmer = potentiometer(kit, {
    initial,
    steps: 20,
    name: `${title} dimmer`,
  });
  dimmer.object.position.set(0, 0.03, 0.013);
  plate.add(dimmer.object);
  parts.add(dimmer);
  const badge = createBrandBadge(kit, 'lumenhaus', { height: 0.014 });
  badge.position.set(0, 0.075, 0.013);
  plate.add(badge);
  const mark = (text: string, y: number) => {
    const label = createMicroLabel(kit, text, {
      height: 0.009,
      ink: '#2b2d2b',
      maxWidth: 0.13,
    });
    label.position.set(0, y, 0.013);
    plate.add(label);
  };
  mark('DIMMER', -0.035);
  controls.forEach(({ part, text }, i) => {
    const y = -0.1 - i * 0.09;
    part.object.position.set(0, y, 0.013);
    plate.add(part.object);
    parts.add(part);
    mark(text, y - 0.035);
  });
  // A title over the booth's front.
  const card = createMicroLabel(kit, title.toUpperCase(), {
    height: 0.05,
    ink: '#e9e4d6',
    plate: '#1d2022',
    maxWidth: W - 0.6,
  });
  card.position.set(0, H + 0.08, D / 2 - 0.05);
  object.add(card);
  let level = 0;
  return {
    object,
    parts,
    level: () => level,
    step(delta) {
      level = fadeToward(level, dimmerOutput(dimmer.share.value), delta);
    },
    ceiling: ceil,
    back: backWall,
  };
}

/** A glowing surface: unlit, its colour scaled by its level. */
export function glow(kit: PanelKit, colour: string) {
  const base = new Color(colour);
  const material = new MeshBasicMaterial({ color: base.clone() });
  kit.materials.push(material);
  return {
    material,
    set(level: number) {
      // A source seen directly reads bright through most of its range.
      material.color.copy(base).multiplyScalar(0.06 + 0.94 * Math.sqrt(level));
    },
  };
}

/** A mesh that changes as the light does: kept out of the room's still geometry. */
export const live = <T extends Mesh | Points>(m: T) => {
  m.userData.live = true;
  return m;
};
