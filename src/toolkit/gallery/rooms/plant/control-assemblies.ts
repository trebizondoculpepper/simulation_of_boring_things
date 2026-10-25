import type { LiveExhibit, PlantExhibit } from './exhibit';
import type { MimicSpec } from '../../../components/industrial-control/logic/mimic';
import type { FlowState } from '../../../components/industrial-control/logic/mimic-chaser';
import { createMimicBoard } from '../../../components/industrial-control/views/mimic-board';

/** What this room is for, printed on its title card. */
export const PURPOSE =
  'Control panels and assemblies: mimics, control boards and other built-up panels, tried here before the plant uses them';

/**
 * Dev39, the room for control panels and other assemblies (the owner,
 * 2026-10-25): dev0 tries single components (a button, a lamp, a
 * meter); this room tries what is built from many of them, a mimic, a
 * control board, a cubicle's fascia, before the plant rooms carry it.
 * First, the mimic's LED chaser (prompt 066).
 */

/** The chaser trial: one line chasing forward, one back, one still, one changing. */
const CHASER_MIMIC: MimicSpec = {
  title: 'MIMIC LED CHASER TRIAL',
  width: 1.2,
  height: 0.7,
  lines: [
    {
      colour: '#2a5f9e',
      points: [
        [-0.45, 0.18],
        [0.45, 0.18],
      ],
      flow: { id: 'forward' },
    },
    {
      colour: '#2a5f9e',
      points: [
        [-0.45, 0.06],
        [0.45, 0.06],
      ],
      flow: { id: 'back' },
    },
    {
      colour: '#2a5f9e',
      points: [
        [-0.45, -0.06],
        [0.45, -0.06],
      ],
      flow: { id: 'still' },
    },
    {
      colour: '#7a5a2a',
      points: [
        [-0.45, -0.18],
        [0, -0.18],
        [0, -0.1],
        [0.45, -0.1],
      ],
      flow: { id: 'cycle', amber: true },
    },
  ],
  shapes: [],
  labels: [
    { text: 'FORWARD', at: [-0.53, 0.18], size: 0.6 },
    { text: 'BACK', at: [-0.53, 0.06], size: 0.6 },
    { text: 'STILL', at: [-0.53, -0.06], size: 0.6 },
    { text: 'CYCLE', at: [-0.53, -0.18], size: 0.6 },
  ],
  lamps: [],
  readouts: [],
  modes: [],
};

/** The changing line's state at `seconds`: forward, still, back, still, four seconds each. */
const cycle = (seconds: number): FlowState =>
  (['forward', 'still', 'back', 'still'] as const)[Math.floor(seconds / 4) % 4];

export const EXHIBITS: readonly PlantExhibit[] = [
  {
    title: 'Mimic LED chaser',
    reference:
      'A Penfold mimic board, 1.2 × 0.7 m, with LED chasers (6 mm LEDs at 25 mm, one in four lit, stepping every 0.12 s) along its lines',
    size: { w: 1.3, d: 0.08, h: 0.8, mount: 'wall', y: 1.5 },
    build(kit): LiveExhibit {
      const mimic = createMimicBoard(kit, CHASER_MIMIC);
      return {
        object: mimic.group,
        parts: mimic.parts,
        update(delta) {
          mimic.parts.update(delta);
          mimic.show({
            lamps: {},
            readouts: {},
            flows: {
              forward: 'forward',
              back: 'back',
              still: 'still',
              cycle: cycle(performance.now() / 1000),
            },
          });
        },
      };
    },
  },
];
