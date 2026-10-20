import { Group } from 'three';
import { METRE } from '../../../components/core/logic/units';
import { plantTools } from '../../../components/plant/views/plant-tools';
import {
  createPoolUniforms,
  createTileMaterial,
} from '../../../components/pool/views/pool-surfaces';
import {
  EDGE_PROFILES,
  SECTION,
} from '../../../components/pool/logic/edge-profiles';
import type { EdgeProfile } from '../../../components/pool/logic/edge-profiles';
import {
  EDGE_SPAN,
  createPoolEdge,
} from '../../../components/pool/views/pool-edges';
import type { PlantExhibit } from './exhibit';

/**
 * dev17: pool edges through the decades, each a full-size cut-away on a
 * plinth with the water at its level (`edge-profiles.ts`): the roll-out
 * gutter of the 1940s, the recessed scum trough of the 1960s, the
 * deck-level overflow of the 1980s and today's deck-level grated channel.
 */
export const PURPOSE =
  'How the water meets the deck: roll-out gutter, scum trough, deck-level overflow, grated channel';

/** The deck's height above the floor, so the cut faces are at eye level. */
const DECK_HEIGHT = 0.95;

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
  reference: REFERENCES[profile.id],
  size: { w: 2.5, d: 1.6, h: DECK_HEIGHT + 0.1, mount: 'floor' },
  build(kit) {
    const t = plantTools(kit);
    const uniforms = createPoolUniforms(METRE, -100, []);
    uniforms.caustics.value = uniforms.reflected.value = 0;
    const tile = createTileMaterial(uniforms);
    kit.materials.push(tile);
    const group = new Group();
    const section = createPoolEdge(kit, profile, tile);
    // Centred over its plinth, the deck at DECK_HEIGHT.
    section.position.set(-(EDGE_SPAN.from + EDGE_SPAN.to) / 2, DECK_HEIGHT, 0);
    group.add(section);
    const bottom = DECK_HEIGHT - SECTION.depth - SECTION.slab;
    t.box(
      group,
      t.paint('#3a3d40', 0.8),
      EDGE_SPAN.to - EDGE_SPAN.from + 0.1,
      bottom,
      1.5,
      0,
      bottom / 2,
      0,
    );
    return group;
  },
});

export const EXHIBITS: readonly PlantExhibit[] = EDGE_PROFILES.map(exhibit);
