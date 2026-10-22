import { Group } from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import { plantTools } from '../../../components/plant/views/plant-tools';
import { createSafetySign } from '../../../components/general-safety/views/safety-signs';
import type {
  Pictogram,
  SignLayout,
} from '../../../components/general-safety/views/safety-signs';
import {
  createDepthSign,
  createElectricShockPoster,
  createFireActionNotice,
  createFirstAidNotice,
  createGasEmergencyNotice,
  createInsuranceCertificate,
  createLawPoster,
  createNeverMixNotice,
  createPoolRules,
  createSpaRules,
  createSpillageNotice,
} from '../../../components/general-safety/views/safety-notices';
import type { PlantExhibit } from './exhibit';

/**
 * The building's signs and notices, modern UK practice
 * (`doc/research/mandatory-safety-posters.md`), on boards, tried here
 * before they go up in the leisure centre: the safety signs by category,
 * the fire point, the staff noticeboard's statutory notices, the plant's
 * procedures, and the poolside's.
 */

type Tools = ReturnType<typeof plantTools>;

/** A board, `w` × `h`, its face at z = 0.02. */
function board(
  t: Tools,
  parent: Object3D,
  w: number,
  h: number,
  colour = '#c9ccc4',
) {
  t.box(parent, t.paint(colour, 0.85), w, h, 0.02, 0, 0, 0.01);
}

/** `item` on the board at (x, y), just off its face. */
const at = (parent: Object3D, item: Object3D, x: number, y: number) => {
  item.position.set(x, y, 0.022);
  parent.add(item);
  return item;
};

/** A sign as the library makes it. */
const sign = (
  kit: PanelKit,
  pictograms: readonly Pictogram[],
  lines: readonly string[],
  layout: SignLayout = 'portrait',
) => createSafetySign(kit, pictograms, lines, layout);

/** A board of signs in a row, each `pitch` apart, centred. */
function row(
  parent: Object3D,
  items: readonly Object3D[],
  y: number,
  pitch: number,
) {
  items.forEach((item, i) =>
    at(parent, item, (i - (items.length - 1) / 2) * pitch, y),
  );
}

export const SAFETY_EXHIBITS: readonly PlantExhibit[] = [
  {
    title: 'Prohibition and warning signs',
    reference:
      'ISO 7010 signs, rigid PVC, 200 × 300 mm: no smoking (the smoke-free law’s wording), no naked flames, authorised only, electricity, hot surfaces, corrosive, automatic start, confined space, wet floor',
    size: { w: 2.4, d: 0.06, h: 0.8, mount: 'wall', y: 1.6 },
    build(kit) {
      const t = plantTools(kit);
      const group = new Group();
      board(t, group, 2.4, 0.8);
      row(
        group,
        [
          sign(
            kit,
            ['no-smoking'],
            ['NO SMOKING', 'It is against the law', 'to smoke here'],
          ),
          sign(kit, ['no-flames'], ['NO NAKED', 'FLAMES']),
          sign(kit, ['no-entry'], ['AUTHORISED', 'PERSONNEL ONLY']),
          sign(kit, ['electricity'], ['DANGER', '400 VOLTS']),
          sign(kit, ['hot-surface'], ['CAUTION', 'Hot surfaces']),
          sign(kit, ['corrosive'], ['DANGER', 'Corrosive substances']),
          sign(
            kit,
            ['automatic-start'],
            ['CAUTION', 'Pumps start', 'automatically'],
          ),
          sign(
            kit,
            ['confined'],
            ['DANGER', 'Confined space', 'Entry by permit only'],
          ),
          sign(kit, ['slippery'], ['CAUTION', 'Wet floor']),
        ],
        0,
        0.26,
      );
      return group;
    },
  },
  {
    title: 'Mandatory and safe condition signs',
    reference:
      'ISO 7010: hearing protection zone, eye protection, chemical PPE, fire door keep shut, fire exit keep clear; first aid, eyewash, safety shower, fire exit',
    size: { w: 2.6, d: 0.06, h: 0.8, mount: 'wall', y: 1.6 },
    build(kit) {
      const t = plantTools(kit);
      const group = new Group();
      board(t, group, 2.6, 0.8);
      row(
        group,
        [
          sign(
            kit,
            ['ear'],
            ['HEARING PROTECTION ZONE', 'Ear protection', 'must be worn'],
          ),
          sign(kit, ['eye'], ['Eye protection', 'must be worn']),
          createSafetySign(
            kit,
            ['gloves', 'face-shield', 'apron', 'boots'],
            ['CHEMICAL PPE', 'must be worn'],
            'landscape',
            0.36,
            0.15,
          ),
          sign(kit, ['door-shut'], ['FIRE DOOR', 'KEEP SHUT']),
          sign(kit, ['mandatory'], ['FIRE EXIT', 'KEEP CLEAR']),
          sign(kit, ['first-aid'], ['First aid']),
          sign(kit, ['eyewash'], ['Eyewash']),
          sign(kit, ['shower'], ['Safety shower']),
          createSafetySign(
            kit,
            ['exit'],
            ['Fire exit'],
            'landscape',
            0.3,
            0.15,
          ),
        ],
        0,
        0.29,
      );
      return group;
    },
  },
  {
    title: 'Fire point',
    reference:
      'A fire point beside a call point: the call point’s and extinguisher’s ISO 7010 signs over the fire action notice (A4)',
    size: { w: 0.7, d: 0.06, h: 0.9, mount: 'wall', y: 1.5 },
    build(kit) {
      const t = plantTools(kit);
      const group = new Group();
      board(t, group, 0.7, 0.9, '#b8231d');
      at(
        group,
        createSafetySign(
          kit,
          ['call-point'],
          ['Fire alarm', 'call point'],
          'portrait',
          0.15,
          0.22,
        ),
        -0.17,
        0.27,
      );
      at(
        group,
        createSafetySign(
          kit,
          ['extinguisher'],
          ['Fire', 'extinguisher'],
          'portrait',
          0.15,
          0.22,
        ),
        0.17,
        0.27,
      );
      at(group, createFireActionNotice(kit), 0, -0.17);
      return group;
    },
  },
  {
    title: 'Staff noticeboard',
    reference:
      'The statutory notices: the health and safety law poster (A3), the employer’s liability insurance certificate and the first-aid notice (A4), on a cork board',
    size: { w: 1.1, d: 0.06, h: 0.7, mount: 'wall', y: 1.5 },
    build(kit) {
      const t = plantTools(kit);
      const group = new Group();
      board(t, group, 1.1, 0.7, '#a9835a');
      at(group, createLawPoster(kit), -0.35, 0);
      at(group, createInsuranceCertificate(kit), 0.04, 0.12);
      at(group, createFirstAidNotice(kit), 0.32, 0.05);
      return group;
    },
  },
  {
    title: 'Plant procedures',
    reference:
      'Gas emergency (by the gas emergency control valve), electric shock treatment (switch room, A3), chemical spillage and never mix (chemical stores)',
    size: { w: 1.4, d: 0.06, h: 0.6, mount: 'wall', y: 1.5 },
    build(kit) {
      const t = plantTools(kit);
      const group = new Group();
      board(t, group, 1.4, 0.6);
      at(group, createGasEmergencyNotice(kit), -0.55, 0);
      at(group, createElectricShockPoster(kit), -0.23, 0);
      at(group, createSpillageNotice(kit), 0.1, 0);
      at(group, createNeverMixNotice(kit), 0.48, 0.1);
      return group;
    },
  },
  {
    title: 'Poolside signs',
    reference:
      'Pool rules and the spa’s rules (HSG282), depth markings, and no diving (ISO 20712)',
    size: { w: 1.6, d: 0.06, h: 0.75, mount: 'wall', y: 1.5 },
    build(kit) {
      const t = plantTools(kit);
      const group = new Group();
      board(t, group, 1.6, 0.75, '#dfe7e8');
      at(group, createPoolRules(kit, 'Lounge Pool'), -0.5, 0);
      at(group, createSpaRules(kit), -0.05, 0.08);
      at(group, createDepthSign(kit, 0.9), 0.35, 0.22);
      at(group, createDepthSign(kit, 2.0), 0.35, 0.03);
      at(group, sign(kit, ['no-diving'], ['NO DIVING']), 0.62, 0.05);
      return group;
    },
  },
];
