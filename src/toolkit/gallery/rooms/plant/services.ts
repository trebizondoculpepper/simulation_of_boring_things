import { Group } from 'three';
import type { PlantExhibit } from './exhibit';
import {
  PIPE_SIZE_RACK_WIDTH,
  createInsulatedPipe,
  createPipeIdBoard,
  createPipeSizeRack,
  createPipeSupport,
  createValveRun,
} from '../../../components/plant/views/pipework';
import {
  createDampers,
  createGrilleBoard,
  createInsulatedDuct,
  createRectangularDuct,
  createSpiralDuct,
} from '../../../components/plant/views/ductwork';
import {
  createFloorSurfaces,
  createGuardRail,
} from '../../../components/plant/views/railings';
import { createHumanLadder } from '../../../components/architectural/views/human-ladder';
import { tools } from '../../../components/core/views/fitting-tools';

/** What the room is for, on its title card. */
export const PURPOSE =
  'The standard pipework, ductwork, railings and access every plant room uses';

/** Dev10's specimens, in the order they are shown. */
export const EXHIBITS: readonly PlantExhibit[] = [
  {
    title: 'PVC-U pressure pipe sizes',
    reference: 'DN50–DN300, PN16 flanges to EN 1092-1',
    size: { w: PIPE_SIZE_RACK_WIDTH, d: 0.6, h: 1.4, mount: 'floor' },
    build: createPipeSizeRack,
  },
  {
    title: 'Valves',
    reference: 'Butterfly, gate, dual-plate check, ball',
    size: { w: 4.3, d: 0.5, h: 1.4, mount: 'floor' },
    build: createValveRun,
  },
  {
    title: 'Pipe supports',
    reference: '41 × 41 slotted channel trapeze, M10 drop rods',
    size: { w: 1.5, d: 1.8, h: 2.7, mount: 'floor' },
    build: createPipeSupport,
  },
  {
    title: 'Insulated heating pipe',
    reference: 'DN80 steel, 40 mm insulation, aluminium cladding',
    size: { w: 2.1, d: 0.4, h: 1.2, mount: 'floor' },
    build: createInsulatedPipe,
  },
  {
    title: 'Rectangular ductwork',
    reference: 'Galvanised, flanged joints, after DW/144',
    size: { w: 3.2, d: 0.7, h: 2.0, mount: 'floor' },
    build: createRectangularDuct,
  },
  {
    title: 'Spiral ductwork',
    reference: 'Ø315 and Ø500 galvanised',
    size: { w: 2.4, d: 1.3, h: 1.3, mount: 'floor' },
    build: createSpiralDuct,
  },
  {
    title: 'Insulated supply duct',
    reference: '600 × 400, 50 mm foil-faced insulation',
    size: { w: 2.4, d: 0.8, h: 1.2, mount: 'floor' },
    build: createInsulatedDuct,
  },
  {
    title: 'Dampers',
    reference: 'Fire damper (BS EN 15650), volume control damper',
    size: { w: 2.8, d: 0.7, h: 1.3, mount: 'floor' },
    build: createDampers,
  },
  {
    title: 'Guard rail, galvanised',
    reference: '42.4 mm key-clamp tube, BS EN ISO 14122-3',
    size: { w: 3.0, d: 0.2, h: 1.1, mount: 'floor' },
    build: (kit) => createGuardRail(kit, { length: 3, finish: 'galvanised' }),
  },
  {
    title: 'Guard rail, aluminium',
    reference: '42.4 mm aluminium tube, BS EN ISO 14122-3',
    size: { w: 3.0, d: 0.2, h: 1.1, mount: 'floor' },
    build: (kit) => createGuardRail(kit, { length: 3, finish: 'aluminium' }),
  },
  {
    title: 'Fixed ladder with cage',
    reference: 'BS EN ISO 14122-4, 300 mm rungs, hoops from 2.4 m',
    size: { w: 1.0, d: 1.0, h: 4.6, mount: 'floor' },
    build: (kit) => {
      // The ladder against its own piece of wall.
      const group = new Group();
      const t = tools(kit);
      t.box(group, t.paint('#cfd2c8', 0.85), 1.0, 4.6, 0.1, 0, 2.3, -0.45);
      const ladder = createHumanLadder('caged', 3.5, {
        kit,
        topExit: [0, 3.5, 0.6],
      }).group;
      ladder.position.z = -0.4;
      group.add(ladder);
      return group;
    },
  },
  {
    title: 'Floor and platform surfaces',
    reference: 'Steel grating, chequer plate, GRP grating',
    size: { w: 3.7, d: 1.1, h: 0.3, mount: 'floor' },
    build: createFloorSurfaces,
  },
  {
    title: 'Pipe identification',
    reference: 'BS 1710 basic colours and code bands',
    size: { w: 1.6, d: 0.2, h: 2.0, mount: 'wall', y: 1.6 },
    build: createPipeIdBoard,
  },
  {
    title: 'Grilles and diffusers',
    reference: 'Supply, extract, square and swirl, 600 mm modules',
    size: { w: 2.8, d: 0.1, h: 1.0, mount: 'wall', y: 1.6 },
    build: createGrilleBoard,
  },
];
