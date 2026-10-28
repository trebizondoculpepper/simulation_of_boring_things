import { Group, SpotLight } from 'three';
import type { PlantExhibit } from './exhibit';
import type { RoomFinish } from '../plant-room';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import type { PlantRoomLayout } from '../../logic/plant-room-layout';
import { METRE } from '../../../components/core/logic/units';
import { createFillCabinet } from '../../../components/plant/views/chemicals-storage';
import { createFillPointsCase } from '../../views/fill-points-case';
import { createMuseumShowcase } from '../../views/museum-showcase';

/** What this room is for, printed on its title card. */
export const PURPOSE =
  'The museum’s showcases, tried in the dark before they go into the halls';

/** The owner, 2026-10-28: "90% black walls, minimal lighting". */
export const FINISH: RoomFinish = {
  ownLights: true,
  wall: '#1a1a1a',
  floor: '#141414',
  stripe: null,
};

/**
 * Dev52, museum stuff (the owner, 2026-10-28: "Can you make a devroom
 * called museum stuff, 90% black walls, minimal lighting. Let's model and
 * improve the museum cabinet there"): a dark room, its walls a 10% grey,
 * lit by little more than the showcases' own lights and a gallery spot
 * over each. In it, Hall 8's case of the two fill points
 * (`fill-points-case.ts`), as the hall has it, and the same showcase
 * (`museum-showcase.ts`) sized round the fill cabinet alone, its door shut.
 */
export const EXHIBITS: readonly PlantExhibit[] = [
  {
    title: 'Museum showcase: the two fill points (Hall 8)',
    reference:
      'After a free-standing table vitrine: plinth with recessed kick plate, 10 mm low-iron glass hood bonded at the corners in a bronze-black channel, lighting attic with LED strips and a spot',
    size: { w: 2.4, d: 1.7, h: 2.15, mount: 'floor' },
    build(kit) {
      return createFillPointsCase(kit).object;
    },
  },
  {
    title: 'Museum showcase: one object',
    reference:
      'The same vitrine sized round the fill cabinet (700 × 900 × 300 mm), its deck set by the eye-line rule',
    size: { w: 1.2, d: 0.8, h: 2.2, mount: 'floor' },
    build(kit) {
      const showcase = createMuseumShowcase(kit, {
        name: 'Museum showcase: the delivery fill cabinet',
        contents: { w: 0.78, d: 0.42, h: 1.0 },
        label: {
          title: 'Delivery fill cabinet',
          body: 'Stainless steel, lockable\nPLANTROOMS specimen',
        },
      });
      const cabinet = createFillCabinet(kit);
      cabinet.position.set(0, 0.45, -0.15);
      showcase.deck.add(cabinet);
      return showcase.object;
    },
  },
];

/** A gallery spot over each case from the ceiling, warm and narrow, no shadows. */
export function buildRoomServices(_kit: PanelKit, layout: PlantRoomLayout) {
  const group = new Group();
  group.name = 'Gallery spots';
  for (const place of layout.places) {
    const spot = new SpotLight('#ffe2b8', 6 * METRE * METRE, 0, 0.35, 0.8, 2);
    // Hung in front of the case, over the visitor, aimed at its middle.
    const out = 1.6;
    spot.position.set(
      place.x + Math.sin(place.yaw) * out,
      layout.height - 0.2,
      place.z + Math.cos(place.yaw) * out,
    );
    spot.target.position.set(place.x, 1.0, place.z);
    group.add(spot, spot.target);
  }
  return group;
}
