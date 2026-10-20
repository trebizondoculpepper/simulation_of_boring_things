import { BackSide, Group } from 'three';
import { plantTools } from '../../../components/plant/views/plant-tools';
import { METRE } from '../../../components/core/logic/units';
import {
  createPoolUniforms,
  createTileMaterial,
} from '../../../components/pool/views/pool-surfaces';
import {
  EDGE_PROFILES,
  SECTION,
} from '../../../components/pool/logic/edge-profiles';
import { bandOutline } from '../../../components/pool/logic/plan-path';
import type { EdgeProfile } from '../../../components/pool/logic/edge-profiles';
import {
  STEPPED,
  createPoolEdge,
} from '../../../components/pool/views/pool-edges';
import { createPartSet, selector } from '../../../components/core/parts/parts';
import { panelMakerMark } from '../../../components/core/views/panel-maker-mark';
import { PENFOLD_GREY } from '../../../components/industrial-control/views/control-cubicle';
import type { LiveExhibit, PlantExhibit } from './exhibit';

/**
 * dev17: pool edges through the decades, each a full-size stepped run (an
 * edge, a concave corner, a convex corner) sunk into the floor, the
 * deck at the floor's level, with the water at its level (`edge-profiles.ts`): the roll-out
 * gutter of the 1940s, the recessed scum trough of the 1960s, the
 * deck-level overflow of the 1980s and today's deck-level grated channel.
 */
export const PURPOSE =
  'How the water meets the deck: roll-out gutter, scum trough, deck-level overflow, grated channel';

/** Where the section sits about its exhibit's origin, metres in x. */
const SHIFT = -0.5;

/**
 * The plan of each section, which the room cuts out of its floor: the
 * band of the stepped run from the pool's far side to the deck's end.
 */
const PIT = bandOutline(STEPPED, -SECTION.pool, SECTION.deck).map(
  ([x, z]) => [x + SHIFT, z] as const,
);

const REFERENCES: Record<EdgeProfile['id'], string> = {
  rollout:
    'The edge is the gutter: a rounded lip at the water line and a trough in the coping behind it',
  'scum-trough':
    'A glazed channel let into the wall under an overhanging handhold coping, water 240 mm below the deck',
  'deck-overflow':
    'Water spills over a tiled nosing and down a short slope into a channel under a ceramic finger grating',
  'grated-channel':
    'Water flush with the deck, straight into an edge channel under a flush polypropylene grating',
};

const exhibit = (profile: EdgeProfile): PlantExhibit => ({
  title: `${profile.era}: ${profile.name.toLowerCase()}`,
  reference: `${REFERENCES[profile.id]}; a concave and a convex corner`,
  size: { w: 4.1, d: 3.3, h: 0.3, mount: 'floor', pit: PIT },
  build(kit): LiveExhibit {
    const uniforms = createPoolUniforms(METRE, -100, []);
    uniforms.caustics.value = uniforms.reflected.value = 0;
    const tile = createTileMaterial(uniforms);
    kit.materials.push(tile);
    const group = new Group();
    // A stepped run sunk into the floor, its deck the floor's level; a
    // dark pit lining round it, under the floor, closes the cut ends.
    const section = createPoolEdge(kit, profile, tile, STEPPED);
    section.position.x = SHIFT;
    group.add(section);
    const t = plantTools(kit);
    const lining = t.paint('#25292b', 0.9);
    lining.side = BackSide;
    const depth = SECTION.depth + SECTION.slab + 0.05;
    t.box(group, lining, 4.1, depth, 3.3, 0, -depth / 2, 0);
    // The pool's level, set from a small Penfold stand on the deck: FULL
    // (its overflow running) or DRAWN DOWN just below it.
    const parts = createPartSet();
    const stand = new Group();
    stand.position.set(0.15, 0, 1.15);
    group.add(stand);
    const grey = t.paint(PENFOLD_GREY, 0.55);
    t.box(stand, grey, 0.08, 0.95, 0.08, 0, 0.475, 0);
    const head = new Group();
    head.position.set(0, 1.0, 0.02);
    head.rotation.x = -0.5;
    stand.add(head);
    t.box(head, grey, 0.22, 0.16, 0.06, 0, 0, -0.03);
    const level = parts.add(
      selector(kit, {
        positions: 2,
        initial: 1,
        legend: 'DRAWN DOWN · FULL',
        name: 'Pool level',
      }),
    );
    level.object.position.set(0, -0.02, 0);
    head.add(level.object);
    panelMakerMark(kit, head, {
      width: 0.22,
      height: 0.16,
      z: 0,
      corner: 'bottom-right',
      size: 0.01,
      inset: 0.01,
    });
    return {
      object: group,
      parts,
      update(delta) {
        section.setFull(level.position.value === 1);
        section.update(delta);
      },
    };
  },
});

export const EXHIBITS: readonly PlantExhibit[] = EDGE_PROFILES.map(exhibit);
